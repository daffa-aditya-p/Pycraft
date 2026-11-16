export type Direction = 'north' | 'east' | 'south' | 'west';

export type TurnDirection = 'left' | 'right' | 'around';

export type CellKind =
  | 'empty'
  | 'soil'
  | 'planted'
  | 'rock'
  | 'wall'
  | 'edge'
  | 'water'
  | 'cell'
  | 'block'
  | 'gate'
  | 'crate'
  | 'bridge_gap'
  | 'bridge_plank'
  | 'altar';

export type BlockType = 'stone' | 'wood';

export type CropType = 'wheat' | 'carrot';

export type CrystalColor = 'blue' | 'green' | 'red' | 'white';

export type GateLightColor = 'off' | 'red' | 'yellow' | 'green';

export interface GridCell {
  x: number;
  y: number;
  elevation: number;
  kind: CellKind;
  stackHeight: number;
  blockType?: BlockType;
  cropType?: CropType;
  label?: string;
  item?: string;
  itemCount?: number;
}

export interface RobotState {
  x: number;
  y: number;
  z: number;
  facing: Direction;
  cargo: Record<string, number>;
  sayHistory: string[];
  rowIndex: number;
}

export interface BridgeState {
  gapLength: number;
  builtLength: number;
  complete: boolean;
}

export interface SensorState {
  crystalColor: CrystalColor;
}

export interface ScaleState {
  weight: number;
}

export interface GateState {
  isOpen: boolean;
  lightColor: GateLightColor;
}

export interface FarmRowStart {
  x: number;
  y: number;
  facing: Direction;
}

export interface FarmState {
  rows: number;
  cols: number;
  rowStarts: FarmRowStart[];
  plantedCount: number;
  targetCount: number;
}

export interface DepotState {
  requestedItem: string | null;
  requestedAmount: number;
  expectedItem?: string;
  expectedAmount?: number;
  delivered: boolean;
}

export interface AltarState {
  requiredCells: number;
  activatedCells: number;
  active: boolean;
}

export interface BeaconState {
  lines: string[];
  signLines: string[];
  litSegments: number;
  engravedName: string | null;
}

export interface WorldSimState {
  width: number;
  height: number;
  seed: number;
  cargoTracking: boolean;
  cells: GridCell[];
  robot: RobotState;
  bridge: BridgeState;
  sensor: SensorState;
  scale: ScaleState;
  gate: GateState;
  farm: FarmState;
  depot: DepotState;
  altar: AltarState;
  beacon: BeaconState;
}

export interface WorldSimInit {
  width: number;
  height: number;
  seed?: number;
  cargoTracking?: boolean;
  defaultElevation?: number;
  defaultKind?: CellKind;
  cells?: Array<Partial<GridCell> & { x: number; y: number }>;
  robot?: Partial<RobotState>;
  bridge?: Partial<BridgeState>;
  sensor?: Partial<SensorState>;
  scale?: Partial<ScaleState>;
  gate?: Partial<GateState>;
  farm?: Partial<FarmState>;
  depot?: Partial<DepotState>;
  altar?: Partial<AltarState>;
  beacon?: Partial<BeaconState>;
}

export interface CellDelta {
  x: number;
  y: number;
  cell: GridCell;
}

export interface SimDelta {
  robot?: Partial<Pick<RobotState, 'x' | 'y' | 'z' | 'facing' | 'rowIndex'>>;
  sayAppend?: string[];
  cargoSet?: Record<string, number | null>;
  cells?: CellDelta[];
  bridge?: Partial<BridgeState>;
  sensor?: Partial<SensorState>;
  scale?: Partial<ScaleState>;
  gate?: Partial<GateState>;
  farm?: Partial<Pick<FarmState, 'plantedCount' | 'targetCount' | 'rows' | 'cols'>>;
  depot?: Partial<DepotState>;
  altar?: Partial<AltarState>;
  beacon?: Partial<BeaconState>;
}

export interface SimInverseDelta {
  robot?: Partial<Pick<RobotState, 'x' | 'y' | 'z' | 'facing' | 'rowIndex'>>;
  sayPopCount?: number;
  cargoSet?: Record<string, number | null>;
  cells?: CellDelta[];
  bridge?: Partial<BridgeState>;
  sensor?: Partial<SensorState>;
  scale?: Partial<ScaleState>;
  gate?: Partial<GateState>;
  farm?: Partial<Pick<FarmState, 'plantedCount' | 'targetCount' | 'rows' | 'cols'>>;
  depot?: Partial<DepotState>;
  altar?: Partial<AltarState>;
  beacon?: Partial<BeaconState>;
}

export type SimCommandKind =
  | 'robot.move'
  | 'robot.turn'
  | 'robot.say'
  | 'robot.scan'
  | 'robot.measure'
  | 'robot.can_move'
  | 'robot.front'
  | 'robot.facing'
  | 'robot.plant'
  | 'robot.next_row'
  | 'robot.place_block'
  | 'robot.collect'
  | 'robot.count'
  | 'farm.rows'
  | 'farm.cols'
  | 'bridge.build'
  | 'sensor.read'
  | 'scale.read'
  | 'gate.open'
  | 'gate.close'
  | 'gate.light'
  | 'gate.is_open'
  | 'depot.request'
  | 'altar.activate'
  | 'beacon.print'
  | 'beacon.sign'
  | 'beacon.engrave';

export interface CommandResult {
  ok: boolean;
  returnValue: number | boolean | string | null;
  delta: SimDelta;
  inverse: SimInverseDelta;
  warningCode?: string;
  warningParams?: Record<string, string | number>;
  narrationId: string;
  durationMs: number;
}

export class SimValidationError extends Error {
  readonly code: 'TYPE_ERROR' | 'VALUE_ERROR';

  constructor(code: 'TYPE_ERROR' | 'VALUE_ERROR', message: string) {
    super(message);
    this.name = 'SimValidationError';
    this.code = code;
  }
}

export type ScenarioPredicate =
  | { type: 'stdout_non_empty'; minLines?: number }
  | { type: 'stdout_line_count'; exact?: number; min?: number; max?: number }
  | { type: 'stdout_contains'; text: string; caseInsensitive?: boolean }
  | { type: 'stdout_not_contains'; text: string; caseInsensitive?: boolean }
  | { type: 'stdout_tokens_in_order'; tokens: string[]; caseInsensitive?: boolean }
  | { type: 'stdout_matches_regex'; pattern: string; flags?: string }
  | { type: 'stdout_equals_lines'; lines: string[]; trim?: boolean }
  | { type: 'robot_at'; x: number; y: number; z?: number }
  | { type: 'robot_facing'; facing: Direction }
  | { type: 'robot_say_equals'; expected: string[]; exact?: boolean }
  | { type: 'robot_say_contains'; text: string }
  | { type: 'robot_cargo_at_least'; item: string; count: number }
  | { type: 'bridge_complete'; requireExactLength?: boolean }
  | { type: 'gate_is_open'; expected: boolean }
  | { type: 'gate_light'; expected: GateLightColor }
  | { type: 'farm_planted_count'; min?: number; exact?: number; allSoilPlanted?: boolean }
  | {
      type: 'cell_check';
      x: number;
      y: number;
      kind?: CellKind;
      stackHeight?: number;
      minStackHeight?: number;
      blockType?: BlockType;
      cropType?: CropType;
    }
  | {
      type: 'cells_match_blueprint';
      cells: Array<{
        x: number;
        y: number;
        kind?: CellKind;
        stackHeight?: number;
        minStackHeight?: number;
        blockType?: BlockType;
      }>;
    }
  | { type: 'depot_delivered'; expected: boolean; item?: string; amount?: number }
  | { type: 'altar_active'; expected: boolean; cells?: number }
  | { type: 'no_warnings'; allowedCodes?: string[] }
  | { type: 'custom_state_check'; path: string; equals: string | number | boolean | null };

export interface PredicateCheckDetail {
  predicate: ScenarioPredicate;
  passed: boolean;
  reason?: string;
}

export interface PredicateEvaluationResult {
  passed: boolean;
  details: PredicateCheckDetail[];
  failedReasons: string[];
}
