import { applyDeltaToState, cloneCell } from './deltas.js';
import {
  SimValidationError,
  type BlockType,
  type CellDelta,
  type CellKind,
  type CommandResult,
  type CropType,
  type Direction,
  type GateLightColor,
  type GridCell,
  type SimCommandKind,
  type SimDelta,
  type SimInverseDelta,
  type TurnDirection,
  type WorldSimState,
} from './types.js';

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

const LEFT_TURN: Record<Direction, Direction> = {
  north: 'west',
  west: 'south',
  south: 'east',
  east: 'north',
};

const RIGHT_TURN: Record<Direction, Direction> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};

const AROUND_TURN: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

const BLOCKED_KINDS = new Set<CellKind>([
  'rock',
  'wall',
  'edge',
  'water',
  'bridge_gap',
  'crate',
  'altar',
  'cell',
]);

const UNPLACEABLE_KINDS = new Set<CellKind>([
  'rock',
  'wall',
  'edge',
  'water',
  'gate',
  'crate',
  'altar',
  'bridge_gap',
  'cell',
  'planted',
]);

export function getFrontCoords(
  x: number,
  y: number,
  facing: Direction,
): { x: number; y: number } {
  const vec = DIRECTION_VECTORS[facing];
  return { x: x + vec.dx, y: y + vec.dy };
}

export function getCellAt(
  state: WorldSimState,
  x: number,
  y: number,
): GridCell | null {
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
    return null;
  }
  return state.cells[y * state.width + x] ?? null;
}

export function effectiveElevation(cell: GridCell): number {
  return cell.elevation + cell.stackHeight;
}

function canStepInto(
  state: WorldSimState,
  currentZ: number,
  nx: number,
  ny: number,
): { ok: true; nextZ: number } | { ok: false; blocker: string } {
  const cell = getCellAt(state, nx, ny);
  if (!cell) {
    return { ok: false, blocker: 'edge' };
  }
  if (BLOCKED_KINDS.has(cell.kind)) {
    return { ok: false, blocker: cell.kind };
  }
  if (cell.kind === 'gate' && !state.gate.isOpen) {
    return { ok: false, blocker: 'closed_gate' };
  }
  const nextZ = effectiveElevation(cell);
  if (Math.abs(nextZ - currentZ) > 1) {
    return { ok: false, blocker: 'elevation' };
  }
  return { ok: true, nextZ };
}

function assertIntegerInRange(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number {
  if (typeof value === 'boolean' || typeof value !== 'number' || Number.isNaN(value)) {
    throw new SimValidationError('TYPE_ERROR', `${name} must be an integer`);
  }
  if (!Number.isInteger(value)) {
    throw new SimValidationError('VALUE_ERROR', `${name} must be a whole integer`);
  }
  if (value < min || value > max) {
    throw new SimValidationError(
      'VALUE_ERROR',
      `${name} must be between ${min} and ${max}`,
    );
  }
  return value;
}

function assertString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new SimValidationError('TYPE_ERROR', `${name} must be a string`);
  }
  return value;
}

function commitResult(
  state: WorldSimState,
  partial: Omit<CommandResult, 'ok'>,
): CommandResult {
  applyDeltaToState(state, partial.delta);
  return { ok: true, ...partial };
}

export function cmdMove(state: WorldSimState, steps: unknown = 1): CommandResult {
  const count = assertIntegerInRange(steps, 'steps', 1, 20);
  const startX = state.robot.x;
  const startY = state.robot.y;
  const startZ = state.robot.z;

  let curX = startX;
  let curY = startY;
  let curZ = startZ;
  let moved = 0;
  let blocker = '';

  for (let i = 0; i < count; i++) {
    const next = getFrontCoords(curX, curY, state.robot.facing);
    const check = canStepInto(state, curZ, next.x, next.y);
    if (!check.ok) {
      blocker = check.blocker;
      break;
    }
    curX = next.x;
    curY = next.y;
    curZ = check.nextZ;
    moved++;
  }

  const delta: SimDelta = {};
  const inverse: SimInverseDelta = {};

  if (moved > 0) {
    delta.robot = { x: curX, y: curY, z: curZ };
    inverse.robot = { x: startX, y: startY, z: startZ };
  }

  const hitObstacle = moved < count;
  const durationMs = moved * 260 + (hitObstacle ? 200 : 0);

  return commitResult(state, {
    returnValue: moved,
    delta,
    inverse,
    ...(hitObstacle
      ? {
          warningCode:
            blocker === 'elevation' ? 'move_blocked_elevation' : 'move_blocked',
          warningParams: { requested: count, moved, blocker },
        }
      : {}),
    narrationId: hitObstacle ? 'robot.move.blocked' : 'robot.move.ok',
    durationMs,
  });
}

export function cmdTurn(state: WorldSimState, direction: unknown): CommandResult {
  const dir = assertString(direction, 'direction') as TurnDirection;
  let nextFacing: Direction;
  if (dir === 'left') {
    nextFacing = LEFT_TURN[state.robot.facing];
  } else if (dir === 'right') {
    nextFacing = RIGHT_TURN[state.robot.facing];
  } else if (dir === 'around') {
    nextFacing = AROUND_TURN[state.robot.facing];
  } else {
    throw new SimValidationError(
      'VALUE_ERROR',
      `Invalid turn direction "${String(direction)}"; expected "left", "right", or "around"`,
    );
  }

  const prevFacing = state.robot.facing;
  return commitResult(state, {
    returnValue: null,
    delta: { robot: { facing: nextFacing } },
    inverse: { robot: { facing: prevFacing } },
    narrationId: `robot.turn.${dir}`,
    durationMs: dir === 'around' ? 360 : 180,
  });
}

export function cmdSay(state: WorldSimState, text: unknown): CommandResult {
  const str = assertString(text, 'text').slice(0, 60);
  return commitResult(state, {
    returnValue: null,
    delta: { sayAppend: [str] },
    inverse: { sayPopCount: 1 },
    narrationId: 'robot.say',
    durationMs: 900,
  });
}

export function cmdScan(state: WorldSimState): CommandResult {
  const front = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  const cell = getCellAt(state, front.x, front.y);
  return commitResult(state, {
    returnValue: cell?.label ?? null,
    delta: {},
    inverse: {},
    narrationId: 'robot.scan',
    durationMs: 120,
  });
}

export function cmdMeasure(state: WorldSimState): CommandResult {
  let { x, y } = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  let count = 0;
  while (true) {
    const cell = getCellAt(state, x, y);
    if (!cell || cell.kind !== 'bridge_gap') {
      break;
    }
    count++;
    const next = getFrontCoords(x, y, state.robot.facing);
    x = next.x;
    y = next.y;
  }

  return commitResult(state, {
    returnValue: count,
    delta: {},
    inverse: {},
    narrationId: 'robot.measure',
    durationMs: 200,
  });
}

export function cmdCanMove(state: WorldSimState): CommandResult {
  const front = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  const check = canStepInto(state, state.robot.z, front.x, front.y);
  return commitResult(state, {
    returnValue: check.ok,
    delta: {},
    inverse: {},
    narrationId: 'robot.can_move',
    durationMs: 120,
  });
}

export function cmdFront(state: WorldSimState): CommandResult {
  const front = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  const cell = getCellAt(state, front.x, front.y);
  return commitResult(state, {
    returnValue: cell ? cell.kind : 'edge',
    delta: {},
    inverse: {},
    narrationId: 'robot.front',
    durationMs: 120,
  });
}

export function cmdFacing(state: WorldSimState): CommandResult {
  return commitResult(state, {
    returnValue: state.robot.facing,
    delta: {},
    inverse: {},
    narrationId: 'robot.facing',
    durationMs: 0,
  });
}

export function cmdCount(state: WorldSimState, item: unknown): CommandResult {
  const itemKey = assertString(item, 'item');
  return commitResult(state, {
    returnValue: state.robot.cargo[itemKey] ?? 0,
    delta: {},
    inverse: {},
    narrationId: 'robot.count',
    durationMs: 0,
  });
}

export function cmdPlant(state: WorldSimState, crop: unknown): CommandResult {
  const cropStr = assertString(crop, 'crop') as CropType;
  if (cropStr !== 'wheat' && cropStr !== 'carrot') {
    throw new SimValidationError(
      'VALUE_ERROR',
      `Invalid crop "${String(crop)}"; expected "wheat" or "carrot"`,
    );
  }

  const front = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  const frontCell = getCellAt(state, front.x, front.y);
  const currentCell = getCellAt(state, state.robot.x, state.robot.y);

  let target: GridCell | null = null;
  if (frontCell && frontCell.kind === 'soil') {
    target = frontCell;
  } else if (currentCell && currentCell.kind === 'soil') {
    target = currentCell;
  }

  if (!target) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'cannot_plant',
      warningParams: { frontKind: frontCell ? frontCell.kind : 'edge' },
      narrationId: 'robot.plant.fail',
      durationMs: 300,
    });
  }

  const prevCell = cloneCell(target);
  const nextCell = cloneCell(target);
  nextCell.kind = 'planted';
  nextCell.cropType = cropStr;

  const prevPlanted = state.farm.plantedCount;
  const nextPlanted = prevPlanted + 1;

  return commitResult(state, {
    returnValue: true,
    delta: {
      cells: [{ x: nextCell.x, y: nextCell.y, cell: nextCell }],
      farm: { plantedCount: nextPlanted },
    },
    inverse: {
      cells: [{ x: prevCell.x, y: prevCell.y, cell: prevCell }],
      farm: { plantedCount: prevPlanted },
    },
    narrationId: 'robot.plant.ok',
    durationMs: 300,
  });
}

export function cmdNextRow(state: WorldSimState): CommandResult {
  const nextIdx = state.robot.rowIndex + 1;
  if (nextIdx >= state.farm.rowStarts.length) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'no_next_row',
      warningParams: { rowIndex: state.robot.rowIndex },
      narrationId: 'robot.next_row.end',
      durationMs: 200,
    });
  }

  const dest = state.farm.rowStarts[nextIdx];
  if (!dest) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'no_next_row',
      warningParams: { rowIndex: state.robot.rowIndex },
      narrationId: 'robot.next_row.end',
      durationMs: 200,
    });
  }
  const destCell = getCellAt(state, dest.x, dest.y);
  const nextZ = destCell ? effectiveElevation(destCell) : state.robot.z;

  return commitResult(state, {
    returnValue: true,
    delta: {
      robot: {
        x: dest.x,
        y: dest.y,
        z: nextZ,
        facing: dest.facing,
        rowIndex: nextIdx,
      },
    },
    inverse: {
      robot: {
        x: state.robot.x,
        y: state.robot.y,
        z: state.robot.z,
        facing: state.robot.facing,
        rowIndex: state.robot.rowIndex,
      },
    },
    narrationId: 'robot.next_row.ok',
    durationMs: 500,
  });
}

export function cmdPlaceBlock(
  state: WorldSimState,
  blockType: unknown,
): CommandResult {
  const block = assertString(blockType, 'blockType') as BlockType;
  if (block !== 'stone' && block !== 'wood') {
    throw new SimValidationError(
      'VALUE_ERROR',
      `Invalid block type "${String(blockType)}"; expected "stone" or "wood"`,
    );
  }

  const front = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  const frontCell = getCellAt(state, front.x, front.y);
  if (!frontCell) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'cannot_place_out_of_bounds',
      narrationId: 'robot.place_block.fail',
      durationMs: 220,
    });
  }

  if (UNPLACEABLE_KINDS.has(frontCell.kind)) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'cannot_place_block',
      warningParams: { kind: frontCell.kind },
      narrationId: 'robot.place_block.fail',
      durationMs: 220,
    });
  }

  if (frontCell.stackHeight >= 8) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'stack_limit_reached',
      warningParams: { stackHeight: frontCell.stackHeight },
      narrationId: 'robot.place_block.fail',
      durationMs: 220,
    });
  }

  const targetBaseZ = effectiveElevation(frontCell);
  const verticalOffset = targetBaseZ - state.robot.z;
  if (verticalOffset < 0 || verticalOffset > 4) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'out_of_vertical_reach',
      warningParams: { offset: verticalOffset },
      narrationId: 'robot.place_block.fail',
      durationMs: 220,
    });
  }

  const delta: SimDelta = {};
  const inverse: SimInverseDelta = {};

  if (state.cargoTracking) {
    const hasKey = Object.prototype.hasOwnProperty.call(state.robot.cargo, block);
    const available = state.robot.cargo[block] ?? 0;
    if (available < 1) {
      return commitResult(state, {
        returnValue: false,
        delta: {},
        inverse: {},
        warningCode: 'insufficient_cargo',
        warningParams: { item: block },
        narrationId: 'robot.place_block.fail',
        durationMs: 220,
      });
    }
    delta.cargoSet = { [block]: available - 1 };
    inverse.cargoSet = { [block]: hasKey ? available : null };
  }

  const prevCell = cloneCell(frontCell);
  const nextCell = cloneCell(frontCell);
  nextCell.kind = 'block';
  nextCell.stackHeight = prevCell.stackHeight + 1;
  nextCell.blockType = block;

  delta.cells = [{ x: nextCell.x, y: nextCell.y, cell: nextCell }];
  inverse.cells = [{ x: prevCell.x, y: prevCell.y, cell: prevCell }];

  return commitResult(state, {
    returnValue: true,
    delta,
    inverse,
    narrationId: 'robot.place_block.ok',
    durationMs: 220,
  });
}

function cellMatchesCollectItem(cell: GridCell | null, item: string): boolean {
  if (!cell) return false;
  if (cell.item === item && (cell.itemCount ?? 1) > 0) {
    return true;
  }
  if (item === 'cell' && cell.kind === 'cell' && cell.item === undefined) {
    return true;
  }
  return false;
}

export function cmdCollect(state: WorldSimState, item: unknown): CommandResult {
  const itemKey = assertString(item, 'item');
  if (itemKey.length === 0) {
    throw new SimValidationError('VALUE_ERROR', 'item must be a non-empty string');
  }

  const front = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  const frontCell = getCellAt(state, front.x, front.y);
  const currentCell = getCellAt(state, state.robot.x, state.robot.y);

  let target: GridCell | null = null;
  if (cellMatchesCollectItem(frontCell, itemKey)) {
    target = frontCell;
  } else if (cellMatchesCollectItem(currentCell, itemKey)) {
    target = currentCell;
  }

  if (!target) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'nothing_to_collect',
      warningParams: { item: itemKey },
      narrationId: 'robot.collect.fail',
      durationMs: 260,
    });
  }

  const prevCell = cloneCell(target);
  const nextCell = cloneCell(target);
  const prevCount = nextCell.itemCount ?? 1;
  if (prevCount <= 1) {
    delete nextCell.item;
    delete nextCell.itemCount;
    if (nextCell.kind === 'cell') {
      nextCell.kind = 'empty';
    }
  } else {
    nextCell.itemCount = prevCount - 1;
  }

  const prevCargo = state.robot.cargo[itemKey];

  return commitResult(state, {
    returnValue: true,
    delta: {
      cells: [{ x: nextCell.x, y: nextCell.y, cell: nextCell }],
      cargoSet: { [itemKey]: (prevCargo ?? 0) + 1 },
    },
    inverse: {
      cells: [{ x: prevCell.x, y: prevCell.y, cell: prevCell }],
      cargoSet: { [itemKey]: prevCargo !== undefined ? prevCargo : null },
    },
    narrationId: 'robot.collect.ok',
    durationMs: 260,
  });
}

export function cmdBuildBridge(
  state: WorldSimState,
  length: unknown,
): CommandResult {
  const len = assertIntegerInRange(length, 'length', 1, 12);
  const targetPlanks = Math.min(len, state.bridge.gapLength);
  const needToPlace = Math.max(0, targetPlanks - state.bridge.builtLength);

  // Locate bridge_gap cells ahead of BIT first (skipping already-built bridge_plank cells).
  const gapCells: GridCell[] = [];
  let probe = getFrontCoords(state.robot.x, state.robot.y, state.robot.facing);
  while (true) {
    const cell = getCellAt(state, probe.x, probe.y);
    if (!cell) break;
    if (cell.kind === 'bridge_plank') {
      probe = getFrontCoords(probe.x, probe.y, state.robot.facing);
      continue;
    }
    if (cell.kind === 'bridge_gap') {
      gapCells.push(cell);
      probe = getFrontCoords(probe.x, probe.y, state.robot.facing);
      continue;
    }
    break;
  }

  // Fallback: scan grid in row-major order if BIT isn't directly facing the gap.
  if (gapCells.length === 0) {
    for (const cell of state.cells) {
      if (cell.kind === 'bridge_gap') {
        gapCells.push(cell);
      }
    }
  }

  const toConvert = gapCells.slice(0, needToPlace);
  const forwardCells: CellDelta[] = [];
  const inverseCells: CellDelta[] = [];

  for (const cell of toConvert) {
    const prevCell = cloneCell(cell);
    const nextCell = cloneCell(cell);
    nextCell.kind = 'bridge_plank';
    forwardCells.push({ x: nextCell.x, y: nextCell.y, cell: nextCell });
    inverseCells.push({ x: prevCell.x, y: prevCell.y, cell: prevCell });
  }

  const nextBuiltLength = Math.max(state.bridge.builtLength, targetPlanks);
  const exactMatch = len === state.bridge.gapLength;
  const nextComplete = exactMatch && nextBuiltLength >= state.bridge.gapLength;

  const delta: SimDelta = {
    ...(forwardCells.length > 0 ? { cells: forwardCells } : {}),
    bridge: {
      builtLength: nextBuiltLength,
      complete: nextComplete,
    },
  };
  const inverse: SimInverseDelta = {
    ...(inverseCells.length > 0 ? { cells: inverseCells } : {}),
    bridge: {
      builtLength: state.bridge.builtLength,
      complete: state.bridge.complete,
    },
  };

  return commitResult(state, {
    returnValue: exactMatch,
    delta,
    inverse,
    ...(exactMatch
      ? {}
      : {
          warningCode: 'bridge_length_mismatch',
          warningParams: { requested: len, gapLength: state.bridge.gapLength },
        }),
    narrationId: exactMatch ? 'bridge.build.ok' : 'bridge.build.mismatch',
    durationMs: Math.max(180, forwardCells.length * 180),
  });
}

export function cmdSensorRead(state: WorldSimState): CommandResult {
  return commitResult(state, {
    returnValue: state.sensor.crystalColor,
    delta: {},
    inverse: {},
    narrationId: 'sensor.read',
    durationMs: 150,
  });
}

export function cmdScaleRead(state: WorldSimState): CommandResult {
  return commitResult(state, {
    returnValue: state.scale.weight,
    delta: {},
    inverse: {},
    narrationId: 'scale.read',
    durationMs: 150,
  });
}

export function cmdGateOpen(state: WorldSimState): CommandResult {
  return commitResult(state, {
    returnValue: null,
    delta: { gate: { isOpen: true } },
    inverse: { gate: { isOpen: state.gate.isOpen } },
    narrationId: 'gate.open',
    durationMs: 700,
  });
}

export function cmdGateClose(state: WorldSimState): CommandResult {
  return commitResult(state, {
    returnValue: null,
    delta: { gate: { isOpen: false } },
    inverse: { gate: { isOpen: state.gate.isOpen } },
    narrationId: 'gate.close',
    durationMs: 700,
  });
}

export function cmdGateLight(state: WorldSimState, color: unknown): CommandResult {
  const c = assertString(color, 'color') as GateLightColor;
  if (c !== 'off' && c !== 'red' && c !== 'yellow' && c !== 'green') {
    throw new SimValidationError(
      'VALUE_ERROR',
      `Invalid gate light color "${String(color)}"; expected "red", "yellow", "green", or "off"`,
    );
  }

  return commitResult(state, {
    returnValue: null,
    delta: { gate: { lightColor: c } },
    inverse: { gate: { lightColor: state.gate.lightColor } },
    narrationId: `gate.light.${c}`,
    durationMs: 200,
  });
}

export function cmdGateIsOpen(state: WorldSimState): CommandResult {
  return commitResult(state, {
    returnValue: state.gate.isOpen,
    delta: {},
    inverse: {},
    narrationId: 'gate.is_open',
    durationMs: 0,
  });
}

export function cmdDepotRequest(
  state: WorldSimState,
  item: unknown,
  amount: unknown,
): CommandResult {
  const itemKey = assertString(item, 'item');
  if (itemKey.length === 0) {
    throw new SimValidationError('VALUE_ERROR', 'item must be a non-empty string');
  }
  const qty = assertIntegerInRange(amount, 'amount', 1, 999);

  const itemMatches =
    state.depot.expectedItem === undefined || state.depot.expectedItem === itemKey;
  const amountMatches =
    state.depot.expectedAmount === undefined || state.depot.expectedAmount === qty;
  const accepted = itemMatches && amountMatches;

  const prevDepot = {
    requestedItem: state.depot.requestedItem,
    requestedAmount: state.depot.requestedAmount,
    delivered: state.depot.delivered,
  };

  if (!accepted) {
    return commitResult(state, {
      returnValue: false,
      delta: {
        depot: {
          requestedItem: itemKey,
          requestedAmount: qty,
          delivered: false,
        },
      },
      inverse: { depot: prevDepot },
      warningCode: !itemMatches ? 'depot_wrong_item' : 'depot_wrong_amount',
      warningParams: {
        requestedItem: itemKey,
        requestedAmount: qty,
        ...(state.depot.expectedItem !== undefined
          ? { expectedItem: state.depot.expectedItem }
          : {}),
        ...(state.depot.expectedAmount !== undefined
          ? { expectedAmount: state.depot.expectedAmount }
          : {}),
      },
      narrationId: 'depot.request.refused',
      durationMs: 800,
    });
  }

  const prevCargo = state.robot.cargo[itemKey];

  return commitResult(state, {
    returnValue: true,
    delta: {
      depot: {
        requestedItem: itemKey,
        requestedAmount: qty,
        delivered: true,
      },
      cargoSet: { [itemKey]: (prevCargo ?? 0) + qty },
    },
    inverse: {
      depot: prevDepot,
      cargoSet: { [itemKey]: prevCargo !== undefined ? prevCargo : null },
    },
    narrationId: 'depot.request.ok',
    durationMs: 800,
  });
}

export function cmdAltarActivate(
  state: WorldSimState,
  cells: unknown,
): CommandResult {
  const count = assertIntegerInRange(cells, 'cells', 0, 999);
  const collected = state.robot.cargo['cell'] ?? 0;

  if (count !== state.altar.requiredCells) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'altar_wrong_cell_count',
      warningParams: { provided: count, required: state.altar.requiredCells },
      narrationId: 'altar.activate.fail',
      durationMs: 1200,
    });
  }

  if (collected < count) {
    return commitResult(state, {
      returnValue: false,
      delta: {},
      inverse: {},
      warningCode: 'altar_insufficient_cells',
      warningParams: { collected, required: count },
      narrationId: 'altar.activate.fail',
      durationMs: 1200,
    });
  }

  const prevCargo = state.robot.cargo['cell'];

  return commitResult(state, {
    returnValue: true,
    delta: {
      altar: { activatedCells: count, active: true },
      cargoSet: { cell: collected - count },
    },
    inverse: {
      altar: {
        activatedCells: state.altar.activatedCells,
        active: state.altar.active,
      },
      cargoSet: { cell: prevCargo !== undefined ? prevCargo : null },
    },
    narrationId: 'altar.activate.ok',
    durationMs: 1200,
  });
}

export function cmdBeaconPrint(state: WorldSimState, line: unknown): CommandResult {
  const str = assertString(line, 'line');
  const nextLines = [...state.beacon.lines, str];
  return commitResult(state, {
    returnValue: null,
    delta: {
      beacon: {
        lines: nextLines,
        litSegments: state.beacon.litSegments + 1,
      },
    },
    inverse: {
      beacon: {
        lines: [...state.beacon.lines],
        litSegments: state.beacon.litSegments,
      },
    },
    narrationId: 'beacon.print',
    durationMs: 150,
  });
}

export function cmdBeaconSign(state: WorldSimState, lines: unknown): CommandResult {
  if (!Array.isArray(lines) || !lines.every((l) => typeof l === 'string')) {
    throw new SimValidationError('TYPE_ERROR', 'lines must be an array of strings');
  }
  return commitResult(state, {
    returnValue: null,
    delta: { beacon: { signLines: [...lines] } },
    inverse: { beacon: { signLines: [...state.beacon.signLines] } },
    narrationId: 'beacon.sign',
    durationMs: 200,
  });
}

export function cmdBeaconEngrave(state: WorldSimState, name: unknown): CommandResult {
  const str = assertString(name, 'name');
  return commitResult(state, {
    returnValue: null,
    delta: { beacon: { engravedName: str } },
    inverse: { beacon: { engravedName: state.beacon.engravedName } },
    narrationId: 'beacon.engrave',
    durationMs: 300,
  });
}

export function dispatchCommand(
  state: WorldSimState,
  kind: SimCommandKind,
  args: unknown[] = [],
): CommandResult {
  switch (kind) {
    case 'robot.move':
      return cmdMove(state, args[0] ?? 1);
    case 'robot.turn':
      return cmdTurn(state, args[0]);
    case 'robot.say':
      return cmdSay(state, args[0]);
    case 'robot.scan':
      return cmdScan(state);
    case 'robot.measure':
      return cmdMeasure(state);
    case 'robot.can_move':
      return cmdCanMove(state);
    case 'robot.front':
      return cmdFront(state);
    case 'robot.facing':
      return cmdFacing(state);
    case 'robot.plant':
      return cmdPlant(state, args[0]);
    case 'robot.next_row':
      return cmdNextRow(state);
    case 'robot.place_block':
      return cmdPlaceBlock(state, args[0]);
    case 'robot.collect':
      return cmdCollect(state, args[0]);
    case 'robot.count':
      return cmdCount(state, args[0]);
    case 'farm.rows':
      return commitResult(state, {
        returnValue: state.farm.rows,
        delta: {},
        inverse: {},
        narrationId: 'farm.rows',
        durationMs: 0,
      });
    case 'farm.cols':
      return commitResult(state, {
        returnValue: state.farm.cols,
        delta: {},
        inverse: {},
        narrationId: 'farm.cols',
        durationMs: 0,
      });
    case 'bridge.build':
      return cmdBuildBridge(state, args[0]);
    case 'sensor.read':
      return cmdSensorRead(state);
    case 'scale.read':
      return cmdScaleRead(state);
    case 'gate.open':
      return cmdGateOpen(state);
    case 'gate.close':
      return cmdGateClose(state);
    case 'gate.light':
      return cmdGateLight(state, args[0]);
    case 'gate.is_open':
      return cmdGateIsOpen(state);
    case 'depot.request':
      return cmdDepotRequest(state, args[0], args[1]);
    case 'altar.activate':
      return cmdAltarActivate(state, args[0]);
    case 'beacon.print':
      return cmdBeaconPrint(state, args[0]);
    case 'beacon.sign':
      return cmdBeaconSign(state, args[0]);
    case 'beacon.engrave':
      return cmdBeaconEngrave(state, args[0]);
    default: {
      const exhaustive: never = kind;
      throw new SimValidationError(
        'VALUE_ERROR',
        `Unknown sim command: ${String(exhaustive)}`,
      );
    }
  }
}
