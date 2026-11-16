import { describe, expect, it } from 'vitest';
import {
  SimValidationError,
  WorldSim,
  canonicalJson,
  evaluateScenarioPredicates,
  sha256Hex,
  type CommandResult,
  type WorldSimInit,
} from '../../src/sim/index.js';

function createRichInit(): WorldSimInit {
  return {
    width: 8,
    height: 6,
    seed: 42,
    cargoTracking: false,
    cells: [
      { x: 1, y: 0, kind: 'soil' },
      { x: 2, y: 0, kind: 'soil' },
      { x: 3, y: 0, kind: 'rock' },
      { x: 4, y: 0, kind: 'empty', elevation: 1 },
      { x: 5, y: 0, kind: 'empty', elevation: 3 },
      { x: 1, y: 1, kind: 'crate', label: '12' },
      { x: 2, y: 1, kind: 'bridge_gap' },
      { x: 3, y: 1, kind: 'bridge_gap' },
      { x: 4, y: 1, kind: 'bridge_gap' },
      { x: 5, y: 1, kind: 'bridge_gap' },
      { x: 0, y: 2, kind: 'empty' },
      { x: 1, y: 2, kind: 'soil' },
      { x: 2, y: 2, kind: 'soil' },
      { x: 0, y: 3, kind: 'cell' },
      { x: 1, y: 3, kind: 'gate' },
      { x: 2, y: 3, kind: 'water' },
      { x: 3, y: 3, kind: 'altar' },
    ],
    robot: { x: 0, y: 0, facing: 'east' },
    sensor: { crystalColor: 'blue' },
    scale: { weight: 4 },
    farm: {
      rows: 2,
      cols: 2,
      rowStarts: [
        { x: 0, y: 0, facing: 'east' },
        { x: 0, y: 2, facing: 'east' },
      ],
      targetCount: 4,
    },
    depot: { expectedItem: 'stone', expectedAmount: 12 },
    altar: { requiredCells: 1 },
  };
}

describe('Pure-TS SHA-256 & canonical JSON', () => {
  it('computes standard NIST SHA-256 digest for "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('produces identical canonical JSON regardless of key insertion order', () => {
    const a = { z: 1, a: { d: 4, b: 2 }, u: undefined };
    const b = { a: { b: 2, d: 4 }, z: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(sha256Hex(canonicalJson(a))).toBe(sha256Hex(canonicalJson(b)));
  });
});

describe('WorldSim determinism (50 runs)', () => {
  it('produces identical hashes, return values, and deltas across 50 runs', () => {
    const init = createRichInit();

    const runSequence = (sim: WorldSim) => {
      const results: CommandResult[] = [];
      results.push(sim.plant('wheat'));
      results.push(sim.move(1));
      results.push(sim.plant('carrot'));
      results.push(sim.move(1));
      results.push(sim.move(1)); // blocked by rock at (3,0)
      results.push(sim.nextRow());
      results.push(sim.plant('wheat'));
      results.push(sim.move(1));
      results.push(sim.plant('wheat'));
      results.push(sim.turn('right')); // south
      results.push(sim.collect('cell'));
      results.push(sim.turn('left')); // east
      results.push(sim.placeBlock('stone'));
      results.push(sim.readSensor());
      results.push(sim.readScale());
      results.push(sim.openGate());
      results.push(sim.setGateLight('green'));
      results.push(sim.requestDepot('stone', 12));
      results.push(sim.say('Siap!'));
      results.push(sim.activateAltar(1));
      return { results, hash: sim.computeStateHash() };
    };

    const baseline = runSequence(new WorldSim(init));

    for (let i = 0; i < 50; i++) {
      const sim = new WorldSim(init);
      const run = runSequence(sim);
      expect(run.hash).toBe(baseline.hash);
      expect(run.results).toEqual(baseline.results);
    }
  });
});

describe('Forward & inverse delta symmetry', () => {
  it('replays forward and rewinds backward to exact bit-for-bit state hashes', () => {
    const init = createRichInit();
    const sim = new WorldSim(init);
    const workerSim = new WorldSim(init);

    const history: Array<{
      hashBefore: string;
      hashAfter: string;
      result: CommandResult;
    }> = [];

    const exec = (fn: (s: WorldSim) => CommandResult) => {
      const hashBefore = sim.computeStateHash();
      const result = fn(sim);
      const hashAfter = sim.computeStateHash();
      // Main sim vs worker sim verification
      const workerResult = fn(workerSim);
      expect(workerResult).toEqual(result);
      expect(workerSim.computeStateHash()).toBe(hashAfter);
      history.push({ hashBefore, hashAfter, result });
    };

    exec((s) => s.plant('wheat'));
    exec((s) => s.move(1));
    exec((s) => s.say('Halo'));
    exec((s) => s.turn('right')); // south
    exec((s) => s.scan());
    exec((s) => s.turn('left')); // east
    exec((s) => s.nextRow());
    exec((s) => s.plant('carrot'));
    exec((s) => s.move(1));
    exec((s) => s.turn('right')); // south
    exec((s) => s.placeBlock('wood'));
    exec((s) => s.turn('right')); // west
    exec((s) => s.move(1));
    exec((s) => s.turn('left')); // south
    exec((s) => s.collect('cell'));
    exec((s) => s.openGate());
    exec((s) => s.setGateLight('yellow'));
    exec((s) => s.closeGate());
    exec((s) => s.requestDepot('stone', 12));
    exec((s) => s.activateAltar(1));
    exec((s) => s.beaconPrint('Baris 1'));
    exec((s) => s.beaconSign(['A', 'B', 'C']));
    exec((s) => s.beaconEngrave('Rara'));

    // Rewind all steps using applyInverseDelta
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (!entry) continue;
      sim.applyInverseDelta(entry.result.inverse);
      expect(sim.computeStateHash()).toBe(entry.hashBefore);
    }

    // Step forward again using applyDelta
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      if (!entry) continue;
      sim.applyDelta(entry.result.delta);
      expect(sim.computeStateHash()).toBe(entry.hashAfter);
    }
  });

  it('reverts bridge.build forward and inverse deltas cleanly', () => {
    const sim = new WorldSim({
      width: 7,
      height: 1,
      cells: [
        { x: 1, y: 0, kind: 'bridge_gap' },
        { x: 2, y: 0, kind: 'bridge_gap' },
        { x: 3, y: 0, kind: 'bridge_gap' },
        { x: 4, y: 0, kind: 'bridge_gap' },
      ],
      robot: { x: 0, y: 0, facing: 'east' },
    });

    const initialHash = sim.computeStateHash();
    const res = sim.buildBridge(4);
    expect(res.returnValue).toBe(true);
    expect(sim.getStateRef().bridge.complete).toBe(true);
    expect(sim.canMove().returnValue).toBe(true);

    sim.applyInverseDelta(res.inverse);
    expect(sim.computeStateHash()).toBe(initialHash);
    expect(sim.getStateRef().bridge.complete).toBe(false);
    expect(sim.canMove().returnValue).toBe(false);
  });
});

describe('WorldSim command semantics & edge cases', () => {
  it('handles 2.5D elevation: auto steps +/-1, stops on +/-2', () => {
    const sim = new WorldSim({
      width: 6,
      height: 1,
      cells: [
        { x: 0, y: 0, elevation: 0 },
        { x: 1, y: 0, elevation: 1 },
        { x: 2, y: 0, elevation: 2 },
        { x: 3, y: 0, elevation: 1 },
        { x: 4, y: 0, elevation: 3 }, // +2 jump from 1 -> blocked
      ],
      robot: { x: 0, y: 0, facing: 'east' },
    });

    const res = sim.move(5);
    expect(res.ok).toBe(true);
    expect(res.returnValue).toBe(3);
    expect(res.warningCode).toBe('move_blocked_elevation');
    expect(sim.getStateRef().robot.x).toBe(3);
    expect(sim.getStateRef().robot.z).toBe(1);
    expect(sim.canMove().returnValue).toBe(false);
  });

  it('stops on closed gate and passes through open gate', () => {
    const sim = new WorldSim({
      width: 4,
      height: 1,
      cells: [{ x: 1, y: 0, kind: 'gate' }],
      robot: { x: 0, y: 0, facing: 'east' },
    });

    expect(sim.isGateOpen().returnValue).toBe(false);
    expect(sim.canMove().returnValue).toBe(false);
    const blocked = sim.move(2);
    expect(blocked.returnValue).toBe(0);
    expect(blocked.warningCode).toBe('move_blocked');

    sim.openGate();
    expect(sim.isGateOpen().returnValue).toBe(true);
    expect(sim.canMove().returnValue).toBe(true);
    const passed = sim.move(2);
    expect(passed.returnValue).toBe(2);
    expect(sim.getStateRef().robot.x).toBe(2);
  });

  it('rejects invalid argument types/ranges with SimValidationError', () => {
    const sim = new WorldSim({ width: 3, height: 3 });

    expect(() => sim.executeCommand('robot.move', [true])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('robot.move', [1.5])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('robot.move', [0])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('robot.move', [21])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('robot.turn', ['up'])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('robot.plant', ['corn'])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('robot.place_block', ['gold'])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('bridge.build', [13])).toThrow(SimValidationError);
    expect(() => sim.executeCommand('gate.light', ['purple'])).toThrow(SimValidationError);
  });

  it('measures bridge_gap ahead and builds partial or exact bridges', () => {
    const sim = new WorldSim({
      width: 8,
      height: 1,
      cells: [
        { x: 1, y: 0, kind: 'bridge_gap' },
        { x: 2, y: 0, kind: 'bridge_gap' },
        { x: 3, y: 0, kind: 'bridge_gap' },
        { x: 4, y: 0, kind: 'bridge_gap' },
        { x: 5, y: 0, kind: 'bridge_gap' },
      ],
      robot: { x: 0, y: 0, facing: 'east' },
    });

    expect(sim.front().returnValue).toBe('bridge_gap');
    expect(sim.measure().returnValue).toBe(5);
    expect(sim.canMove().returnValue).toBe(false);

    // Wrong length (too short)
    const shortRes = sim.buildBridge(3);
    expect(shortRes.returnValue).toBe(false);
    expect(shortRes.warningCode).toBe('bridge_length_mismatch');
    expect(sim.getStateRef().bridge.builtLength).toBe(3);
    expect(sim.getStateRef().bridge.complete).toBe(false);
    expect(sim.canMove().returnValue).toBe(true); // first 3 are now planks

    // Wrong length (too long) builds remaining planks up to gapLength, returns false
    const overRes = sim.buildBridge(9);
    expect(overRes.returnValue).toBe(false);
    expect(overRes.warningCode).toBe('bridge_length_mismatch');
    expect(sim.getStateRef().bridge.builtLength).toBe(5);
    expect(sim.getStateRef().bridge.complete).toBe(false);

    // Exact match on fresh sim completes bridge
    const fresh = new WorldSim({
      width: 8,
      height: 1,
      cells: [
        { x: 1, y: 0, kind: 'bridge_gap' },
        { x: 2, y: 0, kind: 'bridge_gap' },
        { x: 3, y: 0, kind: 'bridge_gap' },
        { x: 4, y: 0, kind: 'bridge_gap' },
        { x: 5, y: 0, kind: 'bridge_gap' },
      ],
      robot: { x: 0, y: 0, facing: 'east' },
    });
    const exactRes = fresh.buildBridge(fresh.measure().returnValue as number);
    expect(exactRes.returnValue).toBe(true);
    expect(exactRes.warningCode).toBeUndefined();
    expect(fresh.getStateRef().bridge.complete).toBe(true);
    expect(fresh.move(6).returnValue).toBe(6);
  });

  it('supports M4 farm.rows, farm.cols, plant, and next_row across variable grids', () => {
    const sim = new WorldSim({
      width: 5,
      height: 3,
      cells: [
        { x: 1, y: 0, kind: 'soil' },
        { x: 2, y: 0, kind: 'soil' },
        { x: 3, y: 0, kind: 'soil' },
        { x: 1, y: 1, kind: 'soil' },
        { x: 2, y: 1, kind: 'rock' },
        { x: 3, y: 1, kind: 'soil' },
      ],
      robot: { x: 0, y: 0, facing: 'east' },
      farm: {
        rows: 2,
        cols: 3,
        rowStarts: [
          { x: 0, y: 0, facing: 'east' },
          { x: 0, y: 1, facing: 'east' },
        ],
        targetCount: 5,
      },
    });

    expect(sim.farm.rows).toBe(2);
    expect(sim.farm.cols).toBe(3);

    for (let r = 0; r < sim.farmRows; r++) {
      for (let c = 0; c < sim.farmCols; c++) {
        if (sim.front().returnValue === 'rock') {
          break;
        }
        expect(sim.plant('wheat').returnValue).toBe(true);
        sim.move(1);
      }
      if (r < sim.farmRows - 1) {
        expect(sim.nextRow().returnValue).toBe(true);
      }
    }

    // Final row returns false on next_row()
    expect(sim.nextRow().returnValue).toBe(false);
    expect(sim.getStateRef().farm.plantedCount).toBe(4);
  });

  it('enforces place_block stack height 8, vertical reach z+0..z+4, and cargoTracking', () => {
    const sim = new WorldSim({
      width: 4,
      height: 2,
      cargoTracking: true,
      robot: { x: 0, y: 0, facing: 'east', cargo: { stone: 6 } },
    });

    // Place 5 blocks from ground z=0 -> stackHeight 5 (base offsets 0,1,2,3,4)
    for (let i = 0; i < 5; i++) {
      expect(sim.placeBlock('stone').returnValue).toBe(true);
    }
    expect(sim.getCell(1, 0)?.stackHeight).toBe(5);
    expect(sim.getStateRef().robot.cargo.stone).toBe(1);

    // 6th block base offset is 5 > 4 -> out_of_vertical_reach
    const tooHigh = sim.placeBlock('stone');
    expect(tooHigh.returnValue).toBe(false);
    expect(tooHigh.warningCode).toBe('out_of_vertical_reach');

    // Empty cargo check on another cell
    sim.turn('right'); // south
    expect(sim.placeBlock('stone').returnValue).toBe(true); // uses last 1 stone
    const emptyCargo = sim.placeBlock('stone');
    expect(emptyCargo.returnValue).toBe(false);
    expect(emptyCargo.warningCode).toBe('insufficient_cargo');
  });

  it('enforces max stackHeight 8 even when robot climbs stairs to reach higher', () => {
    const sim = new WorldSim({
      width: 3,
      height: 1,
      cells: [
        { x: 0, y: 0, elevation: 4 },
        { x: 1, y: 0, kind: 'block', stackHeight: 7, blockType: 'stone' },
      ],
      robot: { x: 0, y: 0, z: 4, facing: 'east' },
    });

    // Stack 8th block (base offset = 7 - 4 = 3 <= 4)
    expect(sim.placeBlock('stone').returnValue).toBe(true);
    expect(sim.getCell(1, 0)?.stackHeight).toBe(8);

    // 9th block rejected by stack_limit_reached
    const overMax = sim.placeBlock('stone');
    expect(overMax.returnValue).toBe(false);
    expect(overMax.warningCode).toBe('stack_limit_reached');
  });

  it('validates depot.request and altar.activate preconditions', () => {
    const sim = new WorldSim({
      width: 5,
      height: 1,
      cells: [
        { x: 1, y: 0, kind: 'cell' },
        { x: 2, y: 0, kind: 'cell' },
        { x: 3, y: 0, kind: 'altar' },
      ],
      robot: { x: 0, y: 0, facing: 'east' },
      depot: { expectedItem: 'stone', expectedAmount: 12 },
      altar: { requiredCells: 2 },
    });

    // Wrong depot count
    expect(sim.requestDepot('stone', 10).returnValue).toBe(false);
    expect(sim.getStateRef().depot.delivered).toBe(false);

    // Exact depot count
    expect(sim.requestDepot('stone', 12).returnValue).toBe(true);
    expect(sim.getStateRef().depot.delivered).toBe(true);
    expect(sim.getStateRef().robot.cargo.stone).toBe(12);

    // Altar fails before collecting cells
    const failAltar = sim.activateAltar(2);
    expect(failAltar.returnValue).toBe(false);
    expect(failAltar.warningCode).toBe('altar_insufficient_cells');

    // Collect both cells and activate altar
    expect(sim.collect('cell').returnValue).toBe(true);
    expect(sim.move(1).returnValue).toBe(1);
    expect(sim.collect('cell').returnValue).toBe(true);
    expect(sim.activateAltar(2).returnValue).toBe(true);
    expect(sim.getStateRef().altar.active).toBe(true);
    expect(sim.getStateRef().robot.cargo.cell).toBe(0);
  });
});

describe('Scenario predicates evaluator', () => {
  it('evaluates stdout, world, blueprint, and warning predicates accurately', () => {
    const sim = new WorldSim({
      width: 4,
      height: 2,
      cells: [
        { x: 1, y: 0, kind: 'soil' },
        { x: 2, y: 0, kind: 'soil' },
      ],
      robot: { x: 0, y: 0, facing: 'east' },
      gate: { isOpen: true, lightColor: 'green' },
    });

    sim.plant('wheat');
    sim.move(1);
    sim.plant('wheat');
    sim.say('2');

    const passRes = evaluateScenarioPredicates(
      sim,
      ['Sistem suara aktif\nSistem memori siap\nSiap!\n'],
      [
        { type: 'stdout_non_empty', minLines: 3 },
        { type: 'stdout_line_count', exact: 3 },
        {
          type: 'stdout_tokens_in_order',
          tokens: ['sistem suara', 'sistem memori', 'siap'],
          caseInsensitive: true,
        },
        { type: 'stdout_not_contains', text: 'ERROR' },
        { type: 'robot_at', x: 1, y: 0 },
        { type: 'robot_say_equals', expected: ['2'] },
        { type: 'gate_is_open', expected: true },
        { type: 'gate_light', expected: 'green' },
        { type: 'farm_planted_count', exact: 2, allSoilPlanted: true },
        { type: 'cell_check', x: 1, y: 0, kind: 'planted', cropType: 'wheat' },
        { type: 'no_warnings' },
      ],
    );
    expect(passRes.passed).toBe(true);
    expect(passRes.failedReasons).toHaveLength(0);

    const failRes = evaluateScenarioPredicates(
      sim,
      ['Only one line\n'],
      [
        { type: 'stdout_line_count', exact: 3 },
        { type: 'no_warnings' },
      ],
      ['move_blocked'],
    );
    expect(failRes.passed).toBe(false);
    expect(failRes.failedReasons).toHaveLength(2);
  });
});
