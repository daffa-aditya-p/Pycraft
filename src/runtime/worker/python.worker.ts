import {
  PROTOCOL_VERSION,
  isMainToWorkerMessage,
  type WorkerToMainMessage,
} from '../protocol.js';
import { PycraftExecutor } from './pycraft_exec.js';

let interruptView: Int32Array | null = null;
let inputMetaView: Int32Array | null = null;
let inputDataView: Uint8Array | null = null;

function postToMain(msg: WorkerToMainMessage): void {
  self.postMessage(msg);
}

const executor = new PycraftExecutor({
  onProgress: (phase, pct) => {
    postToMain({
      v: PROTOCOL_VERSION,
      type: 'progress',
      phase,
      pct,
    });
  },
  onEvents: (runId, batch) => {
    postToMain({
      v: PROTOCOL_VERSION,
      type: 'events',
      runId,
      batch,
    });
  },
  onInputRequest: (runId, prompt) => {
    postToMain({
      v: PROTOCOL_VERSION,
      type: 'inputRequest',
      runId,
      prompt,
    });
  },
  readInputFromSAB: (_prompt: string) => {
    if (!inputMetaView || !inputDataView) {
      return '';
    }
    Atomics.store(inputMetaView, 0, 1); // 1 = waiting for input
    while (Atomics.load(inputMetaView, 0) === 1) {
      if (interruptView && Atomics.load(interruptView, 0) !== 0) {
        Atomics.store(inputMetaView, 0, 0);
        return '';
      }
      Atomics.wait(inputMetaView, 0, 1, 200);
    }
    const state = Atomics.load(inputMetaView, 0);
    if (state !== 2) {
      Atomics.store(inputMetaView, 0, 0);
      return '';
    }
    const len = Math.max(
      0,
      Math.min(Atomics.load(inputMetaView, 1), inputDataView.byteLength),
    );
    const copy = new Uint8Array(len);
    copy.set(inputDataView.subarray(0, len));
    Atomics.store(inputMetaView, 0, 0);
    return new TextDecoder().decode(copy);
  },
});

async function handleMessage(data: unknown): Promise<void> {
  if (!isMainToWorkerMessage(data)) {
    return;
  }

  try {
    switch (data.type) {
      case 'init': {
        interruptView = data.interruptSAB
          ? new Int32Array(data.interruptSAB)
          : null;
        inputMetaView = data.inputMetaSAB
          ? new Int32Array(data.inputMetaSAB)
          : null;
        inputDataView = data.inputDataSAB
          ? new Uint8Array(data.inputDataSAB)
          : null;

        const ready = await executor.init({
          pyodideBase: data.pyodideBase,
          interruptSAB: data.interruptSAB,
          hasInputSAB: Boolean(data.inputMetaSAB && data.inputDataSAB),
        });
        postToMain({
          v: PROTOCOL_VERSION,
          type: 'ready',
          pyodideVersion: ready.pyodideVersion,
          isolated: ready.isolated,
          heapBytes: ready.heapBytes,
        });
        break;
      }

      case 'loadStep': {
        executor.loadStep({
          stepId: data.stepId,
          capabilities: data.capabilities,
          scenarios: data.scenarios,
          limits: data.limits,
          astRules: data.astRules,
          functionTests: data.functionTests,
        });
        break;
      }

      case 'checkSyntax': {
        const report = executor.inspectSyntax(data.code, data.astRules);
        postToMain({
          v: PROTOCOL_VERSION,
          type: 'syntaxResult',
          reqId: data.reqId,
          ok: report.ok,
          ...(report.syntaxError
            ? {
                line: report.syntaxError.line ?? undefined,
                col: report.syntaxError.col ?? undefined,
                msg: report.syntaxError.msg,
              }
            : {}),
          report,
        });
        break;
      }

      case 'run': {
        const res = executor.run({
          runId: data.runId,
          code: data.code,
          traceLevel: data.traceLevel,
          inputAnswers: data.inputAnswers,
          visibleScenarioIndex: data.visibleScenarioIndex,
        });
        postToMain({
          v: PROTOCOL_VERSION,
          type: 'runEnd',
          runId: data.runId,
          status: res.status,
          ...(res.error ? { error: res.error } : {}),
          scenarioResults: res.scenarioResults,
          astReport: res.astReport,
          functionTests: res.functionTests,
          finalStateHash: res.finalStateHash,
          heapBytes: res.heapBytes,
          memoryExceeded: res.memoryExceeded,
        });
        break;
      }

      case 'stop': {
        executor.requestStop(data.runId);
        if (interruptView) {
          Atomics.store(interruptView, 0, 2);
        }
        if (inputMetaView) {
          Atomics.store(inputMetaView, 0, 3);
          Atomics.notify(inputMetaView, 0, 1);
        }
        break;
      }

      case 'inputReply': {
        // Non-SAB inputReply fallback is handled via pre-run queue;
        // if SAB is active, main writes directly to inputMetaSAB/inputDataSAB.
        break;
      }

      case 'dispose': {
        self.close();
        break;
      }
    }
  } catch (err) {
    postToMain({
      v: PROTOCOL_VERSION,
      type: 'fatal',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  void handleMessage(event.data);
});
