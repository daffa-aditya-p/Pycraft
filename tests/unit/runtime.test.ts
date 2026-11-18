import { describe, expect, it, vi } from 'vitest';
import {
  PROTOCOL_VERSION,
  RuntimeClient,
  adaptVisiblePredicatesForInput,
  isMainToWorkerMessage,
  isRunEvent,
  isRunEventBatch,
  isWorkerToMainMessage,
  scanInputCallsStatic,
  type RunEvent,
  type WorkerLike,
  type WorkerToMainMessage,
} from '@/runtime/index';
import { ActionPlayer, TimelineIndex } from '@/playback/index';
import { WorldSim, evaluateScenarioPredicates } from '@/sim/index';
import { getStepById } from '@/content';
import type { WorldSimInit } from '@/sim/types';

function makeBasicInit(overrides: Partial<WorldSimInit> = {}): WorldSimInit {
  return {
    width: 8,
    height: 4,
    seed: 42,
    robot: { x: 1, y: 1, facing: 'east' },
    ...overrides,
  };
}

class MockWorker implements WorkerLike {
  posted: unknown[] = [];
  terminated = false;
  private msgListeners = new Set<(ev: MessageEvent<unknown>) => void>();
  private errListeners = new Set<(ev: ErrorEvent) => void>();
  autoReady = true;

  postMessage(message: unknown): void {
    this.posted.push(message);
    const m = message as { type?: string; reqId?: string; runId?: string };
    if (m.type === 'init' && this.autoReady) {
      queueMicrotask(() => {
        this.emitMessage({
          v: PROTOCOL_VERSION,
          type: 'ready',
          pyodideVersion: '0.27.5',
          isolated: false,
          heapBytes: 32 * 1024 * 1024,
        });
      });
    }
  }

  terminate(): void {
    this.terminated = true;
  }

  addEventListener(type: 'message' | 'error', listener: (ev: never) => void): void {
    if (type === 'message') {
      this.msgListeners.add(listener as (ev: MessageEvent<unknown>) => void);
    } else {
      this.errListeners.add(listener as (ev: ErrorEvent) => void);
    }
  }

  removeEventListener(type: 'message' | 'error', listener: (ev: never) => void): void {
    if (type === 'message') {
      this.msgListeners.delete(listener as (ev: MessageEvent<unknown>) => void);
    } else {
      this.errListeners.delete(listener as (ev: ErrorEvent) => void);
    }
  }

  emitMessage(msg: unknown): void {
    const ev = { data: msg } as MessageEvent<unknown>;
    for (const l of [...this.msgListeners]) l(ev);
  }

  emitError(message: string): void {
    const ev = { message } as ErrorEvent;
    for (const l of [...this.errListeners]) l(ev);
  }
}

describe('runtime protocol guards', () => {
  it('validates valid WorkerToMain and MainToWorker messages and rejects malformed ones', () => {
    const validReady: WorkerToMainMessage = {
      v: 1,
      type: 'ready',
      pyodideVersion: '0.27.5',
      isolated: true,
      heapBytes: 32_000_000,
    };
    expect(isWorkerToMainMessage(validReady)).toBe(true);
    expect(isWorkerToMainMessage({ v: 2, type: 'ready' })).toBe(false);
    expect(isWorkerToMainMessage({ v: 1, type: 'unknown' })).toBe(false);
    expect(isWorkerToMainMessage(null)).toBe(false);

    expect(
      isMainToWorkerMessage({
        v: 1,
        type: 'run',
        runId: 'r1',
        code: 'print(1)',
        traceLevel: 'full',
      }),
    ).toBe(true);
    expect(
      isMainToWorkerMessage({
        v: 1,
        type: 'run',
        runId: 'r1',
        code: 123,
        traceLevel: 'full',
      }),
    ).toBe(false);

    expect(
      isRunEvent({
        seq: 1,
        type: 'vars',
        line: 2,
        changes: [{ scope: 'global', name: 'x', typeName: 'int', repr: '5' }],
      }),
    ).toBe(true);
    expect(
      isRunEventBatch([
        { seq: 1, type: 'line', line: 1, frameDepth: 1, fn: '<module>' },
        { seq: 2, type: 'stdout', text: 'halo\n' },
      ]),
    ).toBe(true);
    expect(isRunEventBatch([{ seq: 'bad', type: 'line' }])).toBe(false);
  });
});

describe('TimelineIndex & ActionPlayer', () => {
  it('creates 200-event checkpoints and seeks accurately back and forth', () => {
    const init = makeBasicInit({ width: 300, height: 3 });
    const sim = new WorldSim(init);
    const events: RunEvent[] = [];
    let seq = 0;

    // Generate > 450 events to verify multiple 200-event checkpoints
    for (let i = 1; i <= 230; i++) {
      events.push({
        seq: ++seq,
        type: 'line',
        line: 2,
        frameDepth: 1,
        fn: '<module>',
      });
      events.push({
        seq: ++seq,
        type: 'vars',
        line: 2,
        changes: [{ scope: 'global', name: 'step', typeName: 'int', repr: String(i) }],
      });
      const res = sim.move(1);
      events.push({
        seq: ++seq,
        type: 'action',
        kind: 'robot.move',
        args: [1],
        result: res.returnValue,
        delta: res.delta,
        inverse: res.inverse,
        durationMs: res.durationMs,
        narrationId: res.narrationId,
        line: 2,
      });
    }

    const index = new TimelineIndex();
    index.build(init, events);
    expect(index.getLength()).toBe(690);
    // Initial checkpoint (-1) + 200, 400, 600 = 4 checkpoints
    expect(index.getCheckpointCount()).toBe(4);

    // Seek to 100th action (event index 299 -> seq 300)
    const snap100 = index.seekToSeq(300);
    expect(snap100.simState.robot.x).toBe(101);
    expect(snap100.variables.find((v) => v.name === 'step')?.repr).toBe('100');

    // Seek backward to 10th action (seq 30)
    const snap10 = index.seekToSeq(30);
    expect(snap10.simState.robot.x).toBe(11);
    expect(snap10.variables.find((v) => v.name === 'step')?.repr).toBe('10');

    // Seek to beginning
    const snapStart = index.seekToIndex(-1);
    expect(snapStart.simState.robot.x).toBe(1);
    expect(snapStart.variables).toHaveLength(0);
  });

  it('re-validates actions on main WorldSim, supports Observation Mode & step navigation', () => {
    const init = makeBasicInit();
    const workerSim = new WorldSim(init);
    const r1 = workerSim.move(2);
    const r2 = workerSim.turn('right');
    const r3 = workerSim.say('Halo');
    const expectedHash = workerSim.computeStateHash();

    const events: RunEvent[] = [
      { seq: 1, type: 'line', line: 1, frameDepth: 1, fn: '<module>' },
      {
        seq: 2,
        type: 'action',
        kind: 'robot.move',
        args: [2],
        result: r1.returnValue,
        delta: r1.delta,
        inverse: r1.inverse,
        durationMs: r1.durationMs,
        narrationId: r1.narrationId,
        line: 1,
      },
      { seq: 3, type: 'line', line: 2, frameDepth: 1, fn: '<module>' },
      {
        seq: 4,
        type: 'action',
        kind: 'robot.turn',
        args: ['right'],
        result: r2.returnValue,
        delta: r2.delta,
        inverse: r2.inverse,
        durationMs: r2.durationMs,
        narrationId: r2.narrationId,
        line: 2,
      },
      { seq: 5, type: 'line', line: 3, frameDepth: 1, fn: '<module>' },
      {
        seq: 6,
        type: 'action',
        kind: 'robot.say',
        args: ['Halo'],
        result: r3.returnValue,
        delta: r3.delta,
        inverse: r3.inverse,
        durationMs: r3.durationMs,
        narrationId: r3.narrationId,
        line: 3,
      },
    ];

    const observedStates: boolean[] = [];
    const player = new ActionPlayer({
      speed: 'instant',
      syncEditorStore: false,
      callbacks: {
        onObservationModeChange: (obs) => observedStates.push(obs),
      },
    });

    player.loadRecording(init, events, expectedHash, true);
    expect(player.getState()).toBe('finished');
    expect(player.getMainSimHash()).toBe(expectedHash);
    expect(player.isObservingPlayback()).toBe(false);
    expect(observedStates).toEqual([true, false]);

    // Step back & forward
    player.pause();
    const back = player.stepBackLine();
    expect(back?.simState.robot.sayHistory).toEqual([]);
    const fwd = player.stepForwardLine();
    expect(fwd?.simState.robot.sayHistory).toEqual(['Halo']);
  });

  it('triggers fault and resets mainSim if worker delta is tampered', () => {
    const init = makeBasicInit();
    const workerSim = new WorldSim(init);
    const r1 = workerSim.move(1);

    const tamperedEvent: RunEvent = {
      seq: 1,
      type: 'action',
      kind: 'robot.move',
      args: [1],
      result: r1.returnValue,
      delta: { robot: { x: 99, y: 1, z: 0 } }, // tampered!
      inverse: r1.inverse,
      durationMs: r1.durationMs,
      narrationId: r1.narrationId,
      line: 1,
    };

    const faults: string[] = [];
    const player = new ActionPlayer({
      speed: 'instant',
      syncEditorStore: false,
      callbacks: {
        onFault: (msg) => faults.push(msg),
      },
    });

    player.loadRecording(init, [tamperedEvent], workerSim.computeStateHash(), true);
    expect(player.getState()).toBe('fault');
    expect(faults).toHaveLength(1);
    expect(player.getMainSimState()?.robot.x).toBe(1); // reset to initial
    expect(player.isObservingPlayback()).toBe(false);
  });
});

describe('RuntimeClient lifecycle, input fallback, stop & heap recycle', () => {
  it('scans input() statically outside comments and strings', () => {
    const code = [
      '# input("komentar")',
      'nama = input("Siapa namamu? ")',
      'print("input(bukan)")',
      'for i in range(2):',
      '    kota = input("Kota?")',
    ].join('\n');
    const scan = scanInputCallsStatic(code);
    expect(scan.inputCalls).toBe(2);
    expect(scan.hasInputInLoop).toBe(true);
  });

  it('recycles worker when memoryExceeded is true and on non-isolated stop()', async () => {
    const workers: MockWorker[] = [];
    const recycleReasons: string[] = [];

    const client = new RuntimeClient({
      crossOriginIsolated: false,
      workerFactory: () => {
        const w = new MockWorker();
        workers.push(w);
        return w;
      },
      onRecycle: (reason) => recycleReasons.push(reason),
    });

    await client.ensureReady();
    expect(workers).toHaveLength(1);

    // Run 1: triggers memoryExceeded -> recycles to worker #2
    const run1Promise = client.run({ code: 'print(1)', runId: 'r1' });
    await vi.waitFor(() => {
      const msg = workers[0]!.posted.find(
        (p) => (p as { type?: string }).type === 'run',
      );
      expect(msg).toBeDefined();
    });

    workers[0]!.emitMessage({
      v: 1,
      type: 'runEnd',
      runId: 'r1',
      status: 'ok',
      scenarioResults: [],
      astReport: {
        ok: true,
        comments: [],
        mixedTabsSpaces: false,
        constructCounts: {},
        statementLines: 1,
        printCalls: 1,
        inputCalls: 0,
        hasInputInLoop: false,
        definedFunctions: [],
        traps: [],
        ruleFailures: [],
      },
      functionTests: [],
      finalStateHash: 'abc',
      heapBytes: 150 * 1024 * 1024,
      memoryExceeded: true,
    });

    const res1 = await run1Promise;
    expect(res1.memoryExceeded).toBe(true);
    await vi.waitFor(() => {
      expect(workers).toHaveLength(2);
    });
    expect(workers[0]!.terminated).toBe(true);
    expect(recycleReasons).toContain('memory_exceeded');

    // Run 2: instant stop() in non-isolated mode terminates and spawns worker #3
    const run2Promise = client.run({ code: 'while True: pass', runId: 'r2' });
    await vi.waitFor(() => {
      const msg = workers[1]!.posted.find(
        (p) => (p as { type?: string }).type === 'run',
      );
      expect(msg).toBeDefined();
    });
    client.stop('r2');
    const res2 = await run2Promise;
    expect(res2.status).toBe('stopped');
    await vi.waitFor(() => {
      expect(workers).toHaveLength(3);
    });
    expect(workers[1]!.terminated).toBe(true);
    expect(recycleReasons).toContain('stopped');

    client.dispose();
  });

  it('adapts m1_s5 visible scenario predicates to accept custom player input() names while hidden scenario stays strict', () => {
    const m1s5 = getStepById('m1_s5')!;
    const visibleScenario = m1s5.scenarios[0]!; // Arsitek Rara
    const hiddenScenario = m1s5.scenarios[1]!; // Arsitek Budi
    const sim = new WorldSim(visibleScenario.initialState);

    const adaptedPreds = adaptVisiblePredicatesForInput(
      visibleScenario.predicates,
      visibleScenario.scriptedInputs,
      ['Heri']
    );
    const visiblePass = evaluateScenarioPredicates(sim, ['Selamat datang, Heri'], adaptedPreds, []);
    expect(visiblePass.passed).toBe(true);

    // If a hardcoded print('Selamat datang, Heri') ignores input(), hidden scenario fails expecting Budi Santoso
    const hiddenHardcodedFail = evaluateScenarioPredicates(
      sim,
      ['Selamat datang, Heri'],
      hiddenScenario.predicates,
      []
    );
    expect(hiddenHardcodedFail.passed).toBe(false);

    // Valid input() code echoes the hidden scenario input and passes
    const hiddenDynamicPass = evaluateScenarioPredicates(
      sim,
      ['Selamat datang, Budi Santoso'],
      hiddenScenario.predicates,
      []
    );
    expect(hiddenDynamicPass.passed).toBe(true);
  });
});
