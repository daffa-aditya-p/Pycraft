import { dispatchCommand, getCellAt } from './commands.js';
import {
  applyDeltaToState,
  applyInverseDeltaToState,
  cloneState,
  computeStateSha256,
} from './deltas.js';
import type {
  BlockType,
  CommandResult,
  CropType,
  GateLightColor,
  GridCell,
  SimCommandKind,
  SimDelta,
  SimInverseDelta,
  TurnDirection,
  WorldSimInit,
  WorldSimState,
} from './types.js';

function buildInitialState(init: WorldSimInit): WorldSimState {
  const width = Math.max(1, Math.floor(init.width));
  const height = Math.max(1, Math.floor(init.height));
  const defaultElevation = init.defaultElevation ?? 0;
  const defaultKind = init.defaultKind ?? 'empty';

  const cells: GridCell[] = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = {
        x,
        y,
        elevation: defaultElevation,
        kind: defaultKind,
        stackHeight: 0,
      };
    }
  }

  if (init.cells) {
    for (const patch of init.cells) {
      if (patch.x >= 0 && patch.x < width && patch.y >= 0 && patch.y < height) {
        const idx = patch.y * width + patch.x;
        const base = cells[idx];
        if (!base) continue;
        const merged: GridCell = {
          x: base.x,
          y: base.y,
          elevation: patch.elevation ?? base.elevation,
          kind: patch.kind ?? base.kind,
          stackHeight: patch.stackHeight ?? base.stackHeight,
        };
        if (patch.blockType !== undefined) merged.blockType = patch.blockType;
        if (patch.cropType !== undefined) merged.cropType = patch.cropType;
        if (patch.label !== undefined) merged.label = patch.label;
        if (patch.item !== undefined) merged.item = patch.item;
        if (patch.itemCount !== undefined) merged.itemCount = patch.itemCount;
        cells[idx] = merged;
      }
    }
  }

  const robotX = init.robot?.x ?? 0;
  const robotY = init.robot?.y ?? 0;
  const spawnCell =
    robotX >= 0 && robotX < width && robotY >= 0 && robotY < height
      ? cells[robotY * width + robotX]
      : null;
  const defaultRobotZ = spawnCell ? spawnCell.elevation + spawnCell.stackHeight : 0;

  let gapCount = 0;
  let soilCount = 0;
  for (const c of cells) {
    if (c.kind === 'bridge_gap') gapCount++;
    if (c.kind === 'soil') soilCount++;
  }

  return {
    width,
    height,
    seed: init.seed ?? 1,
    cargoTracking: init.cargoTracking ?? false,
    cells,
    robot: {
      x: robotX,
      y: robotY,
      z: init.robot?.z ?? defaultRobotZ,
      facing: init.robot?.facing ?? 'east',
      cargo: init.robot?.cargo ? { ...init.robot.cargo } : {},
      sayHistory: init.robot?.sayHistory ? [...init.robot.sayHistory] : [],
      rowIndex: init.robot?.rowIndex ?? 0,
    },
    bridge: {
      gapLength: init.bridge?.gapLength ?? gapCount,
      builtLength: init.bridge?.builtLength ?? 0,
      complete: init.bridge?.complete ?? false,
    },
    sensor: {
      crystalColor: init.sensor?.crystalColor ?? 'blue',
    },
    scale: {
      weight: init.scale?.weight ?? 0,
    },
    gate: {
      isOpen: init.gate?.isOpen ?? false,
      lightColor: init.gate?.lightColor ?? 'off',
    },
    farm: {
      rows: init.farm?.rows ?? 1,
      cols: init.farm?.cols ?? Math.max(1, soilCount),
      rowStarts: init.farm?.rowStarts
        ? init.farm.rowStarts.map((rs) => ({ ...rs }))
        : [{ x: robotX, y: robotY, facing: init.robot?.facing ?? 'east' }],
      plantedCount: init.farm?.plantedCount ?? 0,
      targetCount: init.farm?.targetCount ?? soilCount,
    },
    depot: {
      requestedItem: init.depot?.requestedItem ?? null,
      requestedAmount: init.depot?.requestedAmount ?? 0,
      ...(init.depot?.expectedItem !== undefined
        ? { expectedItem: init.depot.expectedItem }
        : {}),
      ...(init.depot?.expectedAmount !== undefined
        ? { expectedAmount: init.depot.expectedAmount }
        : {}),
      delivered: init.depot?.delivered ?? false,
    },
    altar: {
      requiredCells: init.altar?.requiredCells ?? 3,
      activatedCells: init.altar?.activatedCells ?? 0,
      active: init.altar?.active ?? false,
    },
    beacon: {
      lines: init.beacon?.lines ? [...init.beacon.lines] : [],
      signLines: init.beacon?.signLines ? [...init.beacon.signLines] : [],
      litSegments: init.beacon?.litSegments ?? 0,
      engravedName: init.beacon?.engravedName ?? null,
    },
  };
}

function isWorldSimState(input: WorldSimInit | WorldSimState): input is WorldSimState {
  const candidate = input as Partial<WorldSimState>;
  return (
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    typeof candidate.seed === 'number' &&
    typeof candidate.cargoTracking === 'boolean' &&
    Array.isArray(candidate.cells) &&
    candidate.cells.length === candidate.width * candidate.height &&
    candidate.robot !== undefined &&
    Array.isArray(candidate.robot.sayHistory) &&
    candidate.bridge !== undefined &&
    candidate.sensor !== undefined &&
    candidate.scale !== undefined &&
    candidate.gate !== undefined &&
    candidate.farm !== undefined &&
    candidate.depot !== undefined &&
    candidate.altar !== undefined &&
    candidate.beacon !== undefined
  );
}

export class WorldSim {
  private state: WorldSimState;

  constructor(init: WorldSimInit | WorldSimState) {
    if (isWorldSimState(init)) {
      this.state = cloneState(init);
    } else {
      this.state = buildInitialState(init);
    }
  }

  static fromState(state: WorldSimState): WorldSim {
    return new WorldSim(cloneState(state));
  }

  reset(init: WorldSimInit): void {
    this.state = buildInitialState(init);
  }

  clone(): WorldSim {
    return WorldSim.fromState(this.state);
  }

  getState(): WorldSimState {
    return cloneState(this.state);
  }

  getCell(x: number, y: number): GridCell | null {
    const cell = getCellAt(this.state, x, y);
    return cell ? { ...cell } : null;
  }

  get farmRows(): number {
    return this.state.farm.rows;
  }

  get farmCols(): number {
    return this.state.farm.cols;
  }

  get farm() {
    return {
      rows: this.state.farm.rows,
      cols: this.state.farm.cols,
    };
  }

  getStateRef(): Readonly<WorldSimState> {
    return this.state;
  }

  applyDelta(delta: SimDelta): void {
    applyDeltaToState(this.state, delta);
  }

  applyInverseDelta(inverse: SimInverseDelta): void {
    applyInverseDeltaToState(this.state, inverse);
  }

  computeStateHash(): string {
    return computeStateSha256(this.state);
  }

  executeCommand(kind: SimCommandKind, args: unknown[] = []): CommandResult {
    return dispatchCommand(this.state, kind, args);
  }

  move(steps = 1): CommandResult {
    return this.executeCommand('robot.move', [steps]);
  }

  turn(direction: TurnDirection): CommandResult {
    return this.executeCommand('robot.turn', [direction]);
  }

  say(text: string): CommandResult {
    return this.executeCommand('robot.say', [text]);
  }

  scan(): CommandResult {
    return this.executeCommand('robot.scan', []);
  }

  measure(): CommandResult {
    return this.executeCommand('robot.measure', []);
  }

  canMove(): CommandResult {
    return this.executeCommand('robot.can_move', []);
  }

  front(): CommandResult {
    return this.executeCommand('robot.front', []);
  }

  plant(crop: CropType): CommandResult {
    return this.executeCommand('robot.plant', [crop]);
  }

  nextRow(): CommandResult {
    return this.executeCommand('robot.next_row', []);
  }

  placeBlock(blockType: BlockType): CommandResult {
    return this.executeCommand('robot.place_block', [blockType]);
  }

  collect(item: string): CommandResult {
    return this.executeCommand('robot.collect', [item]);
  }

  buildBridge(length: number): CommandResult {
    return this.executeCommand('bridge.build', [length]);
  }

  readSensor(): CommandResult {
    return this.executeCommand('sensor.read', []);
  }

  readScale(): CommandResult {
    return this.executeCommand('scale.read', []);
  }

  openGate(): CommandResult {
    return this.executeCommand('gate.open', []);
  }

  closeGate(): CommandResult {
    return this.executeCommand('gate.close', []);
  }

  setGateLight(color: GateLightColor): CommandResult {
    return this.executeCommand('gate.light', [color]);
  }

  isGateOpen(): CommandResult {
    return this.executeCommand('gate.is_open', []);
  }

  requestDepot(item: string, amount: number): CommandResult {
    return this.executeCommand('depot.request', [item, amount]);
  }

  activateAltar(cells: number): CommandResult {
    return this.executeCommand('altar.activate', [cells]);
  }

  beaconPrint(line: string): CommandResult {
    return this.executeCommand('beacon.print', [line]);
  }

  beaconSign(lines: string[]): CommandResult {
    return this.executeCommand('beacon.sign', [lines]);
  }

  beaconEngrave(name: string): CommandResult {
    return this.executeCommand('beacon.engrave', [name]);
  }
}
