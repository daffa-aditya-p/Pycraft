import { beforeAll, describe, expect, it } from 'vitest';
import { ALL_AWAKENING_STEPS, getStepById } from '@/content/awakening';
import { evaluateValidationPipeline } from '@/learning/index';
import { ActionPlayer } from '@/playback/index';
import {
  DEFAULT_RUNTIME_LIMITS,
  PycraftExecutor,
  type RunEvent,
} from '@/runtime/index';

describe('Golden Awakening Campaign Integration (Real Pyodide + ActionPlayer + 4-Stage Validator)', () => {
  let executor: PycraftExecutor;
  let capturedEvents: RunEvent[] = [];

  beforeAll(async () => {
    executor = new PycraftExecutor({
      onEvents: (_runId, batch) => {
        capturedEvents.push(...batch);
      },
    });
    const info = await executor.init({ pyodideBase: 'node' });
    expect(info.pyodideVersion).toBeTruthy();
  }, 60_000);

  it('executes all 31 Awakening steps (M1-M5 + Final Core) in real Pyodide, validates all scenarios & hashes', () => {
    expect(ALL_AWAKENING_STEPS).toHaveLength(31);

    for (const step of ALL_AWAKENING_STEPS) {
      capturedEvents = [];
      const visibleScenario = step.scenarios[0]!;
      expect(visibleScenario).toBeDefined();

      executor.loadStep({
        stepId: step.stepId,
        capabilities: step.capabilities,
        scenarios: step.scenarios,
        limits: step.limits,
        astRules: step.astRules,
        functionTests: step.functionTests,
      });

      const runRes = executor.run({
        runId: `golden_${step.stepId}`,
        code: step.referenceSolution,
        traceLevel: 'full',
        inputAnswers: visibleScenario.scriptedInputs ?? [],
      });

      expect(
        runRes.status,
        `Step ${step.stepId} errored in Pyodide: ${JSON.stringify(runRes.error)}`,
      ).toBe('ok');

      // Re-validate every action delta on main-thread ActionPlayer -> WorldSim
      const player = new ActionPlayer({ speed: 'instant', syncEditorStore: false });
      player.loadRecording(
        visibleScenario.initialState,
        capturedEvents,
        runRes.finalStateHash,
        true,
      );
      expect(
        player.getState(),
        `ActionPlayer state mismatch for ${step.stepId}`,
      ).toBe('finished');
      expect(
        player.getMainSimHash(),
        `WorldSim hash mismatch for ${step.stepId}`,
      ).toBe(runRes.finalStateHash);

      const pipeline = evaluateValidationPipeline({
        stepId: step.stepId,
        code: step.referenceSolution,
        locale: 'id',
        rules: step.astRules,
        workerAstReport: runRes.astReport,
        scenarioResults: runRes.scenarioResults,
        functionTests: runRes.functionTests,
        expectedScenarioCount: step.scenarios.length,
      });

      expect(
        pipeline.passed,
        `Pipeline failed for ${step.stepId} at stage ${String(pipeline.stageFailed)}: ${pipeline.feedback?.id ?? 'unknown'} | scenarios=${JSON.stringify(runRes.scenarioResults.map((s) => ({ id: s.scenarioId, passed: s.passed, reasons: s.failedReasons })))}`,
      ).toBe(true);
    }
  }, 60_000);

  it('rejects hardcoded/unrolled/comment-stripped bypasses in real Pyodide across M1-M5', () => {
    // 1. M1.3 (RC-01): omitting '#' comments fails Stage 1 tokenize.COMMENT check
    const m1s3 = getStepById('m1_s3')!;
    executor.loadStep({
      stepId: m1s3.stepId,
      capabilities: m1s3.capabilities,
      scenarios: m1s3.scenarios,
      astRules: m1s3.astRules,
    });
    const m1s3NoComment = executor.run({
      runId: 'bypass_m1s3',
      code: 'print("Suar aktif")',
      traceLevel: 'full',
    });
    const m1s3Pipe = evaluateValidationPipeline({
      stepId: m1s3.stepId,
      code: 'print("Suar aktif")',
      locale: 'id',
      rules: m1s3.astRules,
      workerAstReport: m1s3NoComment.astReport,
      scenarioResults: m1s3NoComment.scenarioResults,
      expectedScenarioCount: m1s3.scenarios.length,
    });
    expect(m1s3Pipe.passed).toBe(false);
    expect(m1s3Pipe.stageFailed).toBe(1);

    // 2. M2.4: hardcoding bridge.build(4) passes visible gap4, fails hidden gap5/gap6
    const m2s4 = getStepById('m2_s4')!;
    executor.loadStep({
      stepId: m2s4.stepId,
      capabilities: m2s4.capabilities,
      scenarios: m2s4.scenarios,
      astRules: m2s4.astRules,
    });
    const m2s4Hardcoded = executor.run({
      runId: 'bypass_m2s4',
      code: 'print(robot.can_move())\nbridge.build(4)\nprint(6.0)\nprint(robot.can_move())',
      traceLevel: 'full',
    });
    expect(m2s4Hardcoded.scenarioResults[0]?.passed).toBe(true);
    expect(m2s4Hardcoded.scenarioResults[1]?.passed).toBe(false);

    // 3. M3.2: hardcoding gate.open() fails hidden red crystal scenario
    const m3s2 = getStepById('m3_s2')!;
    executor.loadStep({
      stepId: m3s2.stepId,
      capabilities: m3s2.capabilities,
      scenarios: m3s2.scenarios,
      astRules: m3s2.astRules,
    });
    const m3s2Hardcoded = executor.run({
      runId: 'bypass_m3s2',
      code: 'gate.open()',
      traceLevel: 'full',
    });
    const m3s2Pipe = evaluateValidationPipeline({
      stepId: m3s2.stepId,
      code: 'gate.open()',
      locale: 'id',
      rules: m3s2.astRules,
      workerAstReport: m3s2Hardcoded.astReport,
      scenarioResults: m3s2Hardcoded.scenarioResults,
      expectedScenarioCount: m3s2.scenarios.length,
    });
    expect(m3s2Pipe.passed).toBe(false);

    // 4. M4.2: unrolling robot.plant("wheat") without 'for' fails Stage 2 AST construct rule
    const m4s2 = getStepById('m4_s2')!;
    executor.loadStep({
      stepId: m4s2.stepId,
      capabilities: m4s2.capabilities,
      scenarios: m4s2.scenarios,
      astRules: m4s2.astRules,
    });
    const unrolledCode = Array.from({ length: 6 }, () => 'robot.plant("wheat")\nrobot.move(1)').join('\n');
    const m4s2Unrolled = executor.run({
      runId: 'bypass_m4s2',
      code: unrolledCode,
      traceLevel: 'full',
    });
    const m4s2Pipe = evaluateValidationPipeline({
      stepId: m4s2.stepId,
      code: unrolledCode,
      locale: 'id',
      rules: m4s2.astRules,
      workerAstReport: m4s2Unrolled.astReport,
      scenarioResults: m4s2Unrolled.scenarioResults,
      expectedScenarioCount: m4s2.scenarios.length,
    });
    expect(m4s2Pipe.passed).toBe(false);
    expect(m4s2Pipe.stageFailed).toBe(2);

    // 5. M5.3: print() instead of return is flagged
    const m5s3 = getStepById('m5_s3')!;
    executor.loadStep({
      stepId: m5s3.stepId,
      capabilities: m5s3.capabilities,
      scenarios: m5s3.scenarios,
      astRules: m5s3.astRules,
      functionTests: m5s3.functionTests,
    });
    const m5s3PrintOnly = executor.run({
      runId: 'bypass_m5s3',
      code: 'def hitung_balok(lebar, tinggi):\n    print(lebar * tinggi)\n\nhasil = hitung_balok(3, 4)\ndepot.request("stone", 12)',
      traceLevel: 'full',
    });
    const m5s3Pipe = evaluateValidationPipeline({
      stepId: m5s3.stepId,
      code: 'def hitung_balok(lebar, tinggi):\n    print(lebar * tinggi)\n\nhasil = hitung_balok(3, 4)\ndepot.request("stone", 12)',
      locale: 'id',
      rules: m5s3.astRules,
      workerAstReport: m5s3PrintOnly.astReport,
      scenarioResults: m5s3PrintOnly.scenarioResults,
      functionTests: m5s3PrintOnly.functionTests,
      expectedScenarioCount: m5s3.scenarios.length,
    });
    expect(m5s3Pipe.passed).toBe(false);
    expect(m5s3Pipe.printInsteadOfReturnDetected).toBe(true);
  });

  it('enforces RC-05 128 MB heap watchdog budget and flags memoryExceeded when exceeded', () => {
    expect(DEFAULT_RUNTIME_LIMITS.maxHeapBytes).toBe(128 * 1024 * 1024);

    // Verify heap measurement & memoryExceeded flag against an explicit threshold below current WASM heap
    executor.loadStep({
      stepId: 'heap_check',
      capabilities: ['print'],
      scenarios: [
        {
          id: 'heap_s0',
          initialState: { width: 3, height: 3, seed: 1 },
          predicates: [],
        },
      ],
      limits: {
        maxHeapBytes: 1024, // force watchdog trigger against real WASM HEAPU8.byteLength
      },
    });
    const res = executor.run({
      runId: 'heap_trigger',
      code: 'print("heap")',
      traceLevel: 'full',
    });
    expect(res.heapBytes).toBeGreaterThan(1024);
    expect(res.memoryExceeded).toBe(true);
  });
});
