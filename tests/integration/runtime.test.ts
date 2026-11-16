import { beforeAll, describe, expect, it } from 'vitest';
import {
  PycraftExecutor,
  type ASTValidationReport,
  type RunEvent,
  type ScenarioSpec,
} from '@/runtime/index';
import { ActionPlayer } from '@/playback/index';
import type { WorldSimInit } from '@/sim/types';

function makeBridgeInit(gapLength: number, seed = 1): WorldSimInit {
  const cells: NonNullable<WorldSimInit['cells']> = [];
  for (let i = 0; i < gapLength; i++) {
    cells.push({ x: 2 + i, y: 1, kind: 'bridge_gap' });
  }
  return {
    width: 12,
    height: 3,
    seed,
    robot: { x: 1, y: 1, facing: 'east' },
    cells,
    bridge: { gapLength },
  };
}

function makeFarmInit(rows: number, cols: number, seed = 1): WorldSimInit {
  const cells: NonNullable<WorldSimInit['cells']> = [];
  const rowStarts: Array<{ x: number; y: number; facing: 'east' }> = [];
  for (let r = 0; r < rows; r++) {
    rowStarts.push({ x: 0, y: r, facing: 'east' });
    for (let c = 1; c <= cols; c++) {
      cells.push({ x: c, y: r, kind: 'soil' });
    }
  }
  return {
    width: cols + 2,
    height: rows,
    seed,
    robot: { x: 0, y: 0, facing: 'east' },
    cells,
    farm: {
      rows,
      cols,
      rowStarts,
      plantedCount: 0,
      targetCount: rows * cols,
    },
  };
}

describe('Real Pyodide Runtime Integration (RC-01..RC-06)', () => {
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

  it('RC-01: inspectSyntax extracts tokenize.COMMENT, mixed tabs/spaces, and AST beginner traps', () => {
    const commentReport: ASTValidationReport = executor.inspectSyntax(
      [
        '# Catatan Arsitek: nyalakan suar',
        'print("NEO online")',
        '# baris akhir',
      ].join('\n'),
      { requireComment: true, minCommentCount: 2 },
    );
    expect(commentReport.ok).toBe(true);
    expect(commentReport.comments).toHaveLength(2);
    expect(commentReport.comments[0]).toMatchObject({
      line: 1,
      text: '# Catatan Arsitek: nyalakan suar',
    });

    const missingComment = executor.inspectSyntax('print("tanpa komentar")', {
      requireComment: true,
    });
    expect(missingComment.ok).toBe(false);
    expect(missingComment.ruleFailures[0]?.messageId).toBe('missing_comment');

    const assignInIf = executor.inspectSyntax('if warna = "blue":\n    gate.open()');
    expect(assignInIf.ok).toBe(false);
    expect(assignInIf.syntaxError?.type).toBe('SyntaxError');
    expect(assignInIf.traps.some((t) => t.kind === 'assign_in_if')).toBe(true);

    const uncalledMethod = executor.inspectSyntax('robot.move\n');
    expect(uncalledMethod.traps.some((t) => t.kind === 'uncalled_method' && t.expr === 'robot.move')).toBe(true);

    const mixedIndent = executor.inspectSyntax('if True:\n\tx = 1\n    y = 2');
    expect(mixedIndent.mixedTabsSpaces).toBe(true);
  });

  it('RC-02: deferred pending_line tracer stamps vars and loop iterations on the line that executed', () => {
    capturedEvents = [];
    const scenario: ScenarioSpec = {
      id: 'trace_test',
      initialState: { width: 4, height: 4, seed: 1 },
      predicates: [{ type: 'stdout_equals_lines', lines: ['3'] }],
    };
    executor.loadStep({
      stepId: 'trace_step',
      capabilities: ['print'],
      scenarios: [scenario],
    });

    const code = [
      'x = 0',
      'y = x + 10',
      'for i in range(3):',
      '    x += i',
      'print(x)',
    ].join('\n');

    const res = executor.run({ runId: 'run_trace', code, traceLevel: 'full' });
    expect(res.status).toBe('ok');
    expect(res.scenarioResults[0]?.passed).toBe(true);

    const varsOnLine1 = capturedEvents.find(
      (e) => e.type === 'vars' && e.line === 1,
    );
    expect(varsOnLine1?.type === 'vars' ? varsOnLine1.changes : []).toEqual([
      { scope: 'global', name: 'x', typeName: 'int', repr: '0' },
    ]);

    const varsOnLine2 = capturedEvents.find(
      (e) => e.type === 'vars' && e.line === 2,
    );
    expect(varsOnLine2?.type === 'vars' ? varsOnLine2.changes : []).toEqual([
      { scope: 'global', name: 'y', typeName: 'int', repr: '10' },
    ]);

    const loopEvents = capturedEvents.filter(
      (e) => e.type === 'loop' && e.line === 3,
    );
    expect(loopEvents.map((l) => (l.type === 'loop' ? l.iteration : 0))).toEqual([
      1, 2, 3, 3,
    ]);
    const lastLoop = loopEvents[loopEvents.length - 1];
    expect(lastLoop?.type === 'loop' ? lastLoop.done : false).toBe(true);
  });

  it('RC-03 & RC-06: executes farm.rows/cols as ints, blocks locked capabilities, and replays identically on ActionPlayer', () => {
    capturedEvents = [];
    const s0: ScenarioSpec = {
      id: 'farm_3x4',
      initialState: makeFarmInit(2, 3, 7),
      predicates: [{ type: 'farm_planted_count', exact: 6, allSoilPlanted: true }],
    };
    const s1: ScenarioSpec = {
      id: 'farm_3x5',
      initialState: makeFarmInit(3, 4, 8),
      predicates: [{ type: 'farm_planted_count', exact: 12, allSoilPlanted: true }],
    };

    executor.loadStep({
      stepId: 'm4_5',
      capabilities: [
        'print',
        'robot.move',
        'robot.plant',
        'robot.next_row',
        'farm.rows',
        'farm.cols',
      ],
      scenarios: [s0, s1],
      astRules: { requireConstructs: ['For'] },
    });

    const code = [
      'for r in range(farm.rows):',
      '    for c in range(farm.cols):',
      '        robot.plant("wheat")',
      '        robot.move(1)',
      '    robot.next_row()',
    ].join('\n');

    const res = executor.run({ runId: 'run_farm', code, traceLevel: 'full' });
    expect(res.status).toBe('ok');
    expect(res.scenarioResults).toHaveLength(2);
    expect(res.scenarioResults.every((s) => s.passed)).toBe(true);

    // Replay visible events on main-thread ActionPlayer & verify finalStateHash
    const player = new ActionPlayer({ speed: 'instant', syncEditorStore: false });
    player.loadRecording(s0.initialState, capturedEvents, res.finalStateHash, true);
    expect(player.getState()).toBe('finished');
    expect(player.getMainSimHash()).toBe(res.finalStateHash);

    // Locked capability test: robot.place_block is locked in M4
    capturedEvents = [];
    const lockedRes = executor.run({
      runId: 'run_locked',
      code: 'robot.place_block("stone")',
      traceLevel: 'full',
    });
    expect(lockedRes.status).toBe('error');
    expect(lockedRes.error?.type).toBe('AttributeError');
    expect(lockedRes.error?.lockedCapability).toBe('robot.place_block');
    expect(lockedRes.error?.objectName).toBe('robot');
    expect(lockedRes.error?.attributeName).toBe('place_block');
  });

  it('RC-04 & RC-05: blocks dangerous imports, enforces TooManySteps/timeout, and validates hidden scenarios + M5.3 return tests', () => {
    capturedEvents = [];
    const baseBridge0 = makeBridgeInit(4, 10);
    const baseBridge1 = makeBridgeInit(6, 11);

    executor.loadStep({
      stepId: 'm2_4',
      capabilities: ['print', 'robot.measure', 'bridge.build'],
      scenarios: [
        {
          id: 'gap_4',
          initialState: baseBridge0,
          predicates: [{ type: 'bridge_complete', requireExactLength: true }],
        },
        {
          id: 'gap_6',
          initialState: baseBridge1,
          predicates: [{ type: 'bridge_complete', requireExactLength: true }],
        },
      ],
    });

    // Hardcoded bridge.build(4) passes visible scenario 0, fails hidden scenario 1!
    const hardcodedRes = executor.run({
      runId: 'run_hardcode',
      code: 'bridge.build(4)',
      traceLevel: 'full',
    });
    expect(hardcodedRes.status).toBe('ok');
    expect(hardcodedRes.scenarioResults[0]?.passed).toBe(true);
    expect(hardcodedRes.scenarioResults[1]?.passed).toBe(false);

    // Dynamic solution passes both and is 100% deterministic
    capturedEvents = [];
    const dyn1 = executor.run({
      runId: 'run_dyn_1',
      code: 'lebar = robot.measure()\nbridge.build(lebar)',
      traceLevel: 'full',
    });
    const events1 = [...capturedEvents];
    capturedEvents = [];
    const dyn2 = executor.run({
      runId: 'run_dyn_2',
      code: 'lebar = robot.measure()\nbridge.build(lebar)',
      traceLevel: 'full',
    });
    expect(dyn1.scenarioResults.every((s) => s.passed)).toBe(true);
    expect(dyn1.finalStateHash).toBe(dyn2.finalStateHash);
    expect(capturedEvents).toEqual(events1);

    // Blocked import
    const impRes = executor.run({
      runId: 'run_imp',
      code: 'import os',
      traceLevel: 'full',
    });
    expect(impRes.status).toBe('error');
    expect(impRes.error?.type).toBe('ImportError');
    expect(impRes.error?.offendingName).toBe('os');

    // Infinite loop step limit
    executor.loadStep({
      stepId: 'limit_test',
      capabilities: ['print'],
      scenarios: [
        {
          id: 's0',
          initialState: { width: 3, height: 3, seed: 1 },
          predicates: [],
        },
      ],
      limits: { maxLineEvents: 400, timeoutMs: 1500 },
    });
    const loopLimitRes = executor.run({
      runId: 'run_inf',
      code: 'i = 0\nwhile True:\n    i += 1',
      traceLevel: 'full',
    });
    expect(loopLimitRes.status).toBe('limit');
    expect(loopLimitRes.error?.type).toBe('TooManySteps');

    // M5.3 return vs print unit test harness
    executor.loadStep({
      stepId: 'm5_3',
      capabilities: ['print'],
      scenarios: [
        {
          id: 'fn_s0',
          initialState: { width: 3, height: 3, seed: 1 },
          predicates: [],
        },
      ],
      functionTests: [
        { id: 't1', fnName: 'hitung_balok', args: [2, 5], expectedReturn: 10 },
        { id: 't2', fnName: 'hitung_balok', args: [4, 4], expectedReturn: 16 },
      ],
    });

    const printOnlyFn = executor.run({
      runId: 'run_fn_print',
      code: 'def hitung_balok(lebar, tinggi):\n    print(lebar * tinggi)',
      traceLevel: 'full',
    });
    expect(printOnlyFn.functionTests[0]?.passed).toBe(false);
    expect(printOnlyFn.functionTests[0]?.printedInsteadOfReturned).toBe(true);

    const returnFn = executor.run({
      runId: 'run_fn_ret',
      code: 'def hitung_balok(lebar, tinggi):\n    return lebar * tinggi',
      traceLevel: 'full',
    });
    expect(returnFn.functionTests.every((t) => t.passed)).toBe(true);

    // Pre-run queued input() in visible and hidden scenarios
    executor.loadStep({
      stepId: 'm1_5',
      capabilities: ['print', 'input'],
      scenarios: [
        {
          id: 'in_vis',
          initialState: { width: 3, height: 3, seed: 1 },
          predicates: [{ type: 'stdout_contains', text: 'Halo, Aria!' }],
          scriptedInputs: ['Aria'],
        },
        {
          id: 'in_hid',
          initialState: { width: 3, height: 3, seed: 2 },
          predicates: [{ type: 'stdout_contains', text: 'Halo, Budi!' }],
          scriptedInputs: ['Budi'],
        },
      ],
    });
    const inputRes = executor.run({
      runId: 'run_input',
      code: 'nama = input("Siapa namamu? ")\nprint(f"Halo, {nama}!")',
      traceLevel: 'full',
      inputAnswers: ['Aria'],
    });
    expect(inputRes.status).toBe('ok');
    expect(inputRes.scenarioResults.every((s) => s.passed)).toBe(true);
    expect(inputRes.heapBytes).toBeGreaterThan(0);

    // Wall-clock timeout (< 1.0s) for infinite while True loop
    executor.loadStep({
      stepId: 'timeout_test',
      capabilities: ['print'],
      scenarios: [
        {
          id: 's0',
          initialState: { width: 3, height: 3, seed: 1 },
          predicates: [],
        },
      ],
      limits: { maxLineEvents: 10_000_000, timeoutMs: 120 },
    });
    const t0 = Date.now();
    const timeoutRes = executor.run({
      runId: 'run_timeout',
      code: 'while True:\n    pass',
      traceLevel: 'full',
    });
    const elapsed = Date.now() - t0;
    expect(timeoutRes.status).toBe('limit');
    expect(timeoutRes.error?.type).toBe('TimeoutError');
    expect(elapsed).toBeLessThan(1000);

    // RecursionError limit
    executor.loadStep({
      stepId: 'recursion_test',
      capabilities: ['print'],
      scenarios: [
        {
          id: 's0',
          initialState: { width: 3, height: 3, seed: 1 },
          predicates: [],
        },
      ],
      limits: { timeoutMs: 5000, recursionLimit: 200 },
    });
    const recRes = executor.run({
      runId: 'run_rec',
      code: 'def f(n):\n    return f(n + 1)\nf(1)',
      traceLevel: 'full',
    });
    expect(recRes.status).toBe('error');
    expect(recRes.error?.type).toBe('RecursionError');

    // Whole float warning + bool rejection
    capturedEvents = [];
    executor.loadStep({
      stepId: 'float_bool_test',
      capabilities: ['robot.move'],
      scenarios: [
        {
          id: 's0',
          initialState: { width: 6, height: 3, seed: 1, robot: { x: 0, y: 1, facing: 'east' } },
          predicates: [{ type: 'robot_at', x: 2, y: 1 }],
        },
      ],
    });
    const floatRes = executor.run({
      runId: 'run_float',
      code: 'robot.move(2.0)',
      traceLevel: 'full',
    });
    expect(floatRes.status).toBe('ok');
    expect(floatRes.scenarioResults[0]?.passed).toBe(true);
    expect(capturedEvents.some((e) => e.type === 'warning' && e.code === 'whole_float_arg')).toBe(true);

    const boolRes = executor.run({
      runId: 'run_bool',
      code: 'robot.move(True)',
      traceLevel: 'full',
    });
    expect(boolRes.status).toBe('error');
    expect(boolRes.error?.type).toBe('PycraftTypeError');
  });
});
