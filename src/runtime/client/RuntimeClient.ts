import {
  DEFAULT_RUNTIME_LIMITS,
  PROTOCOL_VERSION,
  isWorkerToMainMessage,
  type ASTValidationReport,
  type ASTValidationRules,
  type FunctionTestSpec,
  type LoadStepWorkerMessage,
  type MainToWorkerMessage,
  type RunEndWorkerEvent,
  type RunEvent,
  type RuntimeLimits,
  type ScenarioSpec,
  type SyntaxResultWorkerEvent,
  type WorkerToMainMessage,
} from '../protocol.js';

export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(type: 'message', listener: (ev: MessageEvent<unknown>) => void): void;
  addEventListener(type: 'error', listener: (ev: ErrorEvent) => void): void;
  removeEventListener(type: 'message', listener: (ev: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'error', listener: (ev: ErrorEvent) => void): void;
}

export interface RuntimeClientOptions {
  pyodideBase?: string;
  crossOriginIsolated?: boolean;
  workerFactory?: () => WorkerLike;
  onProgress?: (phase: string, pct: number) => void;
  onReady?: (info: { pyodideVersion: string; isolated: boolean; heapBytes: number }) => void;
  onEvents?: (runId: string, batch: RunEvent[]) => void;
  onInputRequest?: (runId: string, prompt: string) => void;
  onFatal?: (message: string) => void;
  onRecycle?: (reason: 'memory_exceeded' | 'stopped' | 'watchdog' | 'manual' | 'fatal') => void;
}

export interface RunCodeOptions {
  runId?: string;
  code: string;
  traceLevel?: 'full' | 'none';
  inputAnswers?: string[];
  visibleScenarioIndex?: number;
  onEvents?: (batch: RunEvent[]) => void;
  onInputRequest?: (prompt: string) => void;
  onNeedInputQueue?: (info: { count: number; unknownCount: boolean }) => Promise<string[] | null>;
}

interface PendingRun {
  runId: string;
  resolve: (result: RunEndWorkerEvent) => void;
  reject: (err: Error) => void;
  onEvents?: (batch: RunEvent[]) => void;
  onInputRequest?: (prompt: string) => void;
  watchdogTimer: ReturnType<typeof setTimeout> | null;
  stopFallbackTimer: ReturnType<typeof setTimeout> | null;
  timeoutMs: number;
  pausedForInput: boolean;
  elapsedBeforePauseMs: number;
  lastResumeAt: number;
}

const INPUT_DATA_SAB_BYTES = 4096;

export function scanInputCallsStatic(code: string): {
  inputCalls: number;
  hasInputInLoop: boolean;
} {
  let inputCalls = 0;
  let hasInputInLoop = false;
  const lines = code.split(/\r?\n/);
  let loopIndent: number | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = rawLine.length - rawLine.trimStart().length;

    if (loopIndent !== null && indent <= loopIndent && !/^(for|while)\b/.test(trimmed)) {
      loopIndent = null;
    }
    if (/^(for|while)\b/.test(trimmed)) {
      loopIndent = indent;
    }

    // Strip string literals and trailing comments roughly for static fallback scan
    const noStrings = trimmed
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .split('#')[0] ?? '';

    const matches = noStrings.match(/\binput\s*\(/g);
    if (matches) {
      inputCalls += matches.length;
      if (loopIndent !== null) {
        hasInputInLoop = true;
      }
    }
  }

  return { inputCalls, hasInputInLoop };
}

function defaultWorkerFactory(): WorkerLike {
  return new Worker(new URL('../worker/python.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function makeEmptyAstReport(): ASTValidationReport {
  return {
    ok: false,
    comments: [],
    mixedTabsSpaces: false,
    constructCounts: { For: 0, While: 0, If: 0, FunctionDef: 0, Return: 0 },
    statementLines: 0,
    printCalls: 0,
    inputCalls: 0,
    hasInputInLoop: false,
    definedFunctions: [],
    traps: [],
    ruleFailures: [],
  };
}

export class RuntimeClient {
  private options: RuntimeClientOptions;
  private worker: WorkerLike | null = null;
  private initPromise: Promise<{ pyodideVersion: string; isolated: boolean; heapBytes: number }> | null =
    null;
  private readyInfo: { pyodideVersion: string; isolated: boolean; heapBytes: number } | null = null;
  private isolated: boolean;
  private interruptSAB: SharedArrayBuffer | null = null;
  private interruptView: Int32Array | null = null;
  private inputMetaSAB: SharedArrayBuffer | null = null;
  private inputMetaView: Int32Array | null = null;
  private inputDataSAB: SharedArrayBuffer | null = null;
  private inputDataView: Uint8Array | null = null;

  private loadedStep: Omit<LoadStepWorkerMessage, 'v' | 'type'> | null = null;
  private pendingSyntax = new Map<
    string,
    { resolve: (res: SyntaxResultWorkerEvent) => void; reject: (err: Error) => void }
  >();
  private pendingRun: PendingRun | null = null;
  private runSeq = 0;
  private syntaxSeq = 0;
  private disposed = false;

  private onMessageBound = (ev: MessageEvent<unknown>) => this.handleWorkerMessage(ev.data);
  private onErrorBound = (ev: ErrorEvent) => this.handleWorkerError(ev);

  constructor(options: RuntimeClientOptions = {}) {
    this.options = options;
    const globalIsolated =
      typeof globalThis !== 'undefined' && Boolean((globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated);
    this.isolated =
      (options.crossOriginIsolated ?? globalIsolated) &&
      typeof SharedArrayBuffer !== 'undefined';
  }

  isReady(): boolean {
    return this.readyInfo !== null;
  }

  isCrossOriginIsolated(): boolean {
    return this.isolated;
  }

  getActiveRunId(): string | null {
    return this.pendingRun?.runId ?? null;
  }

  spawnWhenIdle(): void {
    if (this.disposed || this.initPromise || this.readyInfo) return;
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { connection?: { saveData?: boolean } }) : undefined;
    if (nav?.connection?.saveData) {
      return;
    }
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback;
    if (typeof ric === 'function') {
      ric(() => {
        void this.ensureReady().catch(() => {
          // Errors are surfaced via onFatal or subsequent run()
        });
      }, { timeout: 2500 });
    } else {
      setTimeout(() => {
        void this.ensureReady().catch(() => {});
      }, 50);
    }
  }

  async ensureReady(): Promise<{ pyodideVersion: string; isolated: boolean; heapBytes: number }> {
    if (this.disposed) {
      throw new Error('RuntimeClient has been disposed');
    }
    if (this.readyInfo) {
      return this.readyInfo;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.spawnAndInitWorker();
    try {
      const info = await this.initPromise;
      return info;
    } catch (err) {
      this.initPromise = null;
      throw err;
    }
  }

  private async spawnAndInitWorker(): Promise<{
    pyodideVersion: string;
    isolated: boolean;
    heapBytes: number;
  }> {
    this.detachWorker();

    const factory = this.options.workerFactory ?? defaultWorkerFactory;
    const worker = factory();
    this.worker = worker;
    worker.addEventListener('message', this.onMessageBound);
    worker.addEventListener('error', this.onErrorBound);

    if (this.isolated && typeof SharedArrayBuffer !== 'undefined') {
      this.interruptSAB = new SharedArrayBuffer(4);
      this.interruptView = new Int32Array(this.interruptSAB);
      this.inputMetaSAB = new SharedArrayBuffer(16);
      this.inputMetaView = new Int32Array(this.inputMetaSAB);
      this.inputDataSAB = new SharedArrayBuffer(INPUT_DATA_SAB_BYTES);
      this.inputDataView = new Uint8Array(this.inputDataSAB);
    } else {
      this.interruptSAB = null;
      this.interruptView = null;
      this.inputMetaSAB = null;
      this.inputMetaView = null;
      this.inputDataSAB = null;
      this.inputDataView = null;
    }

    const ready = await new Promise<{
      pyodideVersion: string;
      isolated: boolean;
      heapBytes: number;
    }>((resolve, reject) => {
      const onReadyOrFatal = (ev: MessageEvent<unknown>) => {
        if (!isWorkerToMainMessage(ev.data)) return;
        if (ev.data.type === 'ready') {
          worker.removeEventListener('message', onReadyOrFatal);
          resolve({
            pyodideVersion: ev.data.pyodideVersion,
            isolated: ev.data.isolated,
            heapBytes: ev.data.heapBytes,
          });
        } else if (ev.data.type === 'fatal') {
          worker.removeEventListener('message', onReadyOrFatal);
          reject(new Error(ev.data.message));
        }
      };
      worker.addEventListener('message', onReadyOrFatal);

      this.postToWorker({
        v: PROTOCOL_VERSION,
        type: 'init',
        pyodideBase: this.options.pyodideBase ?? '/pyodide',
        ...(this.interruptSAB ? { interruptSAB: this.interruptSAB } : {}),
        ...(this.inputMetaSAB ? { inputMetaSAB: this.inputMetaSAB } : {}),
        ...(this.inputDataSAB ? { inputDataSAB: this.inputDataSAB } : {}),
      });
    });

    this.readyInfo = ready;
    if (this.loadedStep) {
      this.postToWorker({
        v: PROTOCOL_VERSION,
        type: 'loadStep',
        ...this.loadedStep,
      });
    }
    this.options.onReady?.(ready);
    return ready;
  }

  async loadStep(step: {
    stepId: string;
    capabilities: string[];
    scenarios: ScenarioSpec[];
    limits?: Partial<RuntimeLimits>;
    astRules?: ASTValidationRules;
    functionTests?: FunctionTestSpec[];
  }): Promise<void> {
    this.loadedStep = {
      stepId: step.stepId,
      capabilities: [...step.capabilities],
      scenarios: step.scenarios,
      ...(step.limits ? { limits: step.limits } : {}),
      ...(step.astRules ? { astRules: step.astRules } : {}),
      ...(step.functionTests ? { functionTests: step.functionTests } : {}),
    };
    await this.ensureReady();
    this.postToWorker({
      v: PROTOCOL_VERSION,
      type: 'loadStep',
      ...this.loadedStep,
    });
  }

  async checkSyntax(
    code: string,
    astRules?: ASTValidationRules,
  ): Promise<SyntaxResultWorkerEvent> {
    await this.ensureReady();
    const reqId = `syn_${++this.syntaxSeq}`;
    return new Promise<SyntaxResultWorkerEvent>((resolve, reject) => {
      this.pendingSyntax.set(reqId, { resolve, reject });
      this.postToWorker({
        v: PROTOCOL_VERSION,
        type: 'checkSyntax',
        reqId,
        code,
        ...(astRules ? { astRules } : {}),
      });
    });
  }

  async run(options: RunCodeOptions): Promise<RunEndWorkerEvent> {
    if (this.pendingRun) {
      throw new Error('Another Python run is already active');
    }

    const runId = options.runId ?? `run_${++this.runSeq}`;
    const limits: RuntimeLimits = {
      ...DEFAULT_RUNTIME_LIMITS,
      ...(this.loadedStep?.limits ?? {}),
    };

    const codeBytes = new TextEncoder().encode(options.code).byteLength;
    if (codeBytes > limits.maxCodeBytes) {
      return {
        v: PROTOCOL_VERSION,
        type: 'runEnd',
        runId,
        status: 'error',
        error: {
          type: 'SyntaxError',
          msg: `Kode terlalu panjang (${codeBytes} byte; maksimal ${limits.maxCodeBytes} byte).`,
          line: 1,
          col: 0,
          tracebackUser: [],
        },
        scenarioResults: [],
        astReport: makeEmptyAstReport(),
        functionTests: [],
        finalStateHash: '',
        heapBytes: 0,
        memoryExceeded: false,
      };
    }

    await this.ensureReady();

    let inputAnswers = options.inputAnswers;
    if (!this.isolated && inputAnswers === undefined && options.onNeedInputQueue) {
      let inputCalls = 0;
      let hasInputInLoop = false;
      try {
        const syn = await this.checkSyntax(options.code, this.loadedStep?.astRules);
        inputCalls = syn.report?.inputCalls ?? 0;
        hasInputInLoop = syn.report?.hasInputInLoop ?? false;
      } catch {
        const fallback = scanInputCallsStatic(options.code);
        inputCalls = fallback.inputCalls;
        hasInputInLoop = fallback.hasInputInLoop;
      }
      if (inputCalls > 0 || hasInputInLoop) {
        const collected = await options.onNeedInputQueue({
          count: inputCalls,
          unknownCount: hasInputInLoop,
        });
        if (collected === null) {
          return {
            v: PROTOCOL_VERSION,
            type: 'runEnd',
            runId,
            status: 'stopped',
            scenarioResults: [],
            astReport: makeEmptyAstReport(),
            functionTests: [],
            finalStateHash: '',
            heapBytes: 0,
            memoryExceeded: false,
          };
        }
        inputAnswers = collected;
      }
    }

    if (this.interruptView) {
      Atomics.store(this.interruptView, 0, 0);
    }
    if (this.inputMetaView) {
      Atomics.store(this.inputMetaView, 0, 0);
    }

    const totalWatchdogMs = limits.timeoutMs + 2_000;

    return new Promise<RunEndWorkerEvent>((resolve, reject) => {
      const pending: PendingRun = {
        runId,
        resolve,
        reject,
        onEvents: options.onEvents,
        onInputRequest: options.onInputRequest,
        watchdogTimer: null,
        stopFallbackTimer: null,
        timeoutMs: totalWatchdogMs,
        pausedForInput: false,
        elapsedBeforePauseMs: 0,
        lastResumeAt: Date.now(),
      };

      this.pendingRun = pending;
      this.armWatchdog(pending);

      this.postToWorker({
        v: PROTOCOL_VERSION,
        type: 'run',
        runId,
        code: options.code,
        traceLevel: options.traceLevel ?? 'full',
        ...(inputAnswers !== undefined ? { inputAnswers } : {}),
        ...(options.visibleScenarioIndex !== undefined
          ? { visibleScenarioIndex: options.visibleScenarioIndex }
          : {}),
      });
    });
  }

  provideInputAnswer(answer: string): void {
    if (this.inputMetaView && this.inputDataView) {
      const encoded = new TextEncoder().encode(answer);
      const len = Math.min(encoded.byteLength, this.inputDataView.byteLength);
      this.inputDataView.set(encoded.subarray(0, len), 0);
      Atomics.store(this.inputMetaView, 1, len);
      Atomics.store(this.inputMetaView, 0, 2);
      Atomics.notify(this.inputMetaView, 0, 1);
    } else if (this.pendingRun) {
      this.postToWorker({
        v: PROTOCOL_VERSION,
        type: 'inputReply',
        runId: this.pendingRun.runId,
        answer,
      });
    }

    if (this.pendingRun && this.pendingRun.pausedForInput) {
      this.pendingRun.pausedForInput = false;
      this.pendingRun.lastResumeAt = Date.now();
      this.armWatchdog(this.pendingRun);
    }
  }

  stop(runId?: string): void {
    const pending = this.pendingRun;
    if (!pending) return;
    if (runId && pending.runId !== runId) return;

    if (this.isolated && this.interruptView) {
      Atomics.store(this.interruptView, 0, 2);
      if (this.inputMetaView) {
        Atomics.store(this.inputMetaView, 0, 3);
        Atomics.notify(this.inputMetaView, 0, 1);
      }
      this.postToWorker({
        v: PROTOCOL_VERSION,
        type: 'stop',
        runId: pending.runId,
      });

      if (!pending.stopFallbackTimer) {
        pending.stopFallbackTimer = setTimeout(() => {
          if (this.pendingRun === pending) {
            void this.forceTerminateAndRespawn(pending, 'stopped', 'stopped');
          }
        }, 1_000);
      }
      return;
    }

    // Non-isolated: terminate immediately and respawn in background (<800 ms target)
    void this.forceTerminateAndRespawn(pending, 'stopped', 'stopped');
  }

  async restartPython(): Promise<void> {
    if (this.pendingRun) {
      const pending = this.pendingRun;
      this.clearPendingTimers(pending);
      this.pendingRun = null;
      pending.resolve(this.makeStoppedRunEnd(pending.runId, 'stopped'));
    }
    await this.recycleWorker('manual');
  }

  dispose(): void {
    this.disposed = true;
    if (this.pendingRun) {
      const pending = this.pendingRun;
      this.clearPendingTimers(pending);
      this.pendingRun = null;
      pending.resolve(this.makeStoppedRunEnd(pending.runId, 'stopped'));
    }
    for (const [, p] of this.pendingSyntax) {
      p.reject(new Error('RuntimeClient disposed'));
    }
    this.pendingSyntax.clear();
    if (this.worker) {
      try {
        this.postToWorker({ v: PROTOCOL_VERSION, type: 'dispose' });
      } catch {
        // ignore
      }
      this.worker.terminate();
      this.detachWorker();
    }
    this.readyInfo = null;
    this.initPromise = null;
  }

  private armWatchdog(pending: PendingRun): void {
    if (pending.watchdogTimer) {
      clearTimeout(pending.watchdogTimer);
      pending.watchdogTimer = null;
    }
    if (pending.pausedForInput) return;
    const remaining = Math.max(50, pending.timeoutMs - pending.elapsedBeforePauseMs);
    pending.watchdogTimer = setTimeout(() => {
      if (this.pendingRun === pending) {
        void this.forceTerminateAndRespawn(pending, 'limit', 'watchdog');
      }
    }, remaining);
  }

  private clearPendingTimers(pending: PendingRun): void {
    if (pending.watchdogTimer) {
      clearTimeout(pending.watchdogTimer);
      pending.watchdogTimer = null;
    }
    if (pending.stopFallbackTimer) {
      clearTimeout(pending.stopFallbackTimer);
      pending.stopFallbackTimer = null;
    }
  }

  private async forceTerminateAndRespawn(
    pending: PendingRun,
    status: 'stopped' | 'limit',
    recycleReason: 'stopped' | 'watchdog',
  ): Promise<void> {
    if (this.pendingRun !== pending) return;
    this.clearPendingTimers(pending);
    this.pendingRun = null;

    const result = this.makeStoppedRunEnd(pending.runId, status);
    if (status === 'limit') {
      result.error = {
        type: 'TimeoutError',
        msg: 'Program dihentikan oleh watchdog karena melewati batas waktu.',
        line: 1,
        col: 0,
        tracebackUser: [],
      };
    }

    pending.resolve(result);
    await this.recycleWorker(recycleReason);
  }

  private makeStoppedRunEnd(runId: string, status: 'stopped' | 'limit'): RunEndWorkerEvent {
    return {
      v: PROTOCOL_VERSION,
      type: 'runEnd',
      runId,
      status,
      scenarioResults: [],
      astReport: makeEmptyAstReport(),
      functionTests: [],
      finalStateHash: '',
      heapBytes: 0,
      memoryExceeded: false,
    };
  }

  private async recycleWorker(
    reason: 'memory_exceeded' | 'stopped' | 'watchdog' | 'manual' | 'fatal',
  ): Promise<void> {
    if (this.disposed) return;
    this.options.onRecycle?.(reason);
    if (this.worker) {
      this.worker.terminate();
      this.detachWorker();
    }
    this.readyInfo = null;
    this.initPromise = null;
    for (const [, p] of this.pendingSyntax) {
      p.reject(new Error(`Worker recycled (${reason})`));
    }
    this.pendingSyntax.clear();
    try {
      await this.ensureReady();
    } catch {
      // Surfacing handled by onFatal / next ensureReady call
    }
  }

  private detachWorker(): void {
    if (!this.worker) return;
    this.worker.removeEventListener('message', this.onMessageBound);
    this.worker.removeEventListener('error', this.onErrorBound);
    this.worker = null;
  }

  private postToWorker(msg: MainToWorkerMessage): void {
    if (!this.worker) {
      throw new Error('Worker is not running');
    }
    this.worker.postMessage(msg);
  }

  private handleWorkerMessage(raw: unknown): void {
    if (!isWorkerToMainMessage(raw)) {
      return;
    }

    const msg: WorkerToMainMessage = raw;
    switch (msg.type) {
      case 'progress':
        this.options.onProgress?.(msg.phase, msg.pct);
        break;

      case 'ready':
        // Initial handshake listener handles promise resolution
        break;

      case 'events':
        if (this.pendingRun && this.pendingRun.runId === msg.runId) {
          this.pendingRun.onEvents?.(msg.batch);
        }
        this.options.onEvents?.(msg.runId, msg.batch);
        break;

      case 'inputRequest':
        if (this.pendingRun && this.pendingRun.runId === msg.runId) {
          if (!this.pendingRun.pausedForInput) {
            this.pendingRun.pausedForInput = true;
            this.pendingRun.elapsedBeforePauseMs +=
              Date.now() - this.pendingRun.lastResumeAt;
            if (this.pendingRun.watchdogTimer) {
              clearTimeout(this.pendingRun.watchdogTimer);
              this.pendingRun.watchdogTimer = null;
            }
          }
          this.pendingRun.onInputRequest?.(msg.prompt);
        }
        this.options.onInputRequest?.(msg.runId, msg.prompt);
        break;

      case 'syntaxResult': {
        const pending = this.pendingSyntax.get(msg.reqId);
        if (pending) {
          this.pendingSyntax.delete(msg.reqId);
          pending.resolve(msg);
        }
        break;
      }

      case 'runEnd': {
        const pending = this.pendingRun;
        if (pending && pending.runId === msg.runId) {
          this.clearPendingTimers(pending);
          this.pendingRun = null;
          pending.resolve(msg);
        }
        if (msg.memoryExceeded) {
          void this.recycleWorker('memory_exceeded');
        }
        break;
      }

      case 'fatal':
        this.options.onFatal?.(msg.message);
        if (this.pendingRun) {
          const pending = this.pendingRun;
          this.clearPendingTimers(pending);
          this.pendingRun = null;
          pending.reject(new Error(msg.message));
        }
        void this.recycleWorker('fatal');
        break;
    }
  }

  private handleWorkerError(ev: ErrorEvent): void {
    const message = ev.message || 'Python Worker crashed';
    this.options.onFatal?.(message);
    if (this.pendingRun) {
      const pending = this.pendingRun;
      this.clearPendingTimers(pending);
      this.pendingRun = null;
      pending.reject(new Error(message));
    }
    void this.recycleWorker('fatal');
  }
}
