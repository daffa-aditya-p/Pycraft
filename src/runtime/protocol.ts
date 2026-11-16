import type {
  ScenarioPredicate,
  SimCommandKind,
  SimDelta,
  SimInverseDelta,
  WorldSimInit,
} from '../sim/types.js';

export const PROTOCOL_VERSION = 1 as const;

export const DEFAULT_RUNTIME_LIMITS: RuntimeLimits = {
  maxLineEvents: 20_000,
  maxActions: 500,
  timeoutMs: 5_000,
  maxStdoutBytes: 64 * 1024,
  maxPrintBytes: 4 * 1024,
  recursionLimit: 200,
  maxCodeBytes: 20 * 1024,
  maxHeapBytes: 128 * 1024 * 1024,
};

export interface RuntimeLimits {
  maxLineEvents: number;
  maxActions: number;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxPrintBytes: number;
  recursionLimit: number;
  maxCodeBytes: number;
  maxHeapBytes: number;
}

export interface PyErrorInfo {
  type: string;
  msg: string;
  line: number | null;
  col: number | null;
  endLine?: number | null;
  endCol?: number | null;
  tracebackUser: string[];
  catalogKey?: string;
  lockedCapability?: string;
  parentKeyword?: string;
  offendingName?: string;
  offendingValue?: string;
  objectName?: string;
  attributeName?: string;
}

export interface CommentToken {
  line: number;
  col: number;
  text: string;
}

export type ASTTrapKind =
  | 'assign_in_if'
  | 'uncalled_method'
  | 'mixed_tabs_spaces'
  | 'print_instead_of_return';

export interface ASTTrapWarning {
  kind: ASTTrapKind;
  line: number;
  col: number;
  expr?: string;
  msg: string;
}

export type ASTConstructName = 'For' | 'While' | 'If' | 'FunctionDef' | 'Return';

export interface ASTValidationRules {
  requireConstructs?: ASTConstructName[];
  forbidConstructs?: ASTConstructName[];
  requireComment?: boolean;
  minCommentCount?: number;
  maxStatementLines?: number;
  maxPrintCalls?: number;
  forbidPrint?: boolean;
  requireFunctionName?: string;
}

export interface ASTRuleFailure {
  rule: string;
  messageId: string;
  message: string;
  line?: number;
}

export interface ASTValidationReport {
  ok: boolean;
  syntaxError?: PyErrorInfo;
  comments: CommentToken[];
  mixedTabsSpaces: boolean;
  constructCounts: Record<string, number>;
  statementLines: number;
  printCalls: number;
  inputCalls: number;
  hasInputInLoop: boolean;
  definedFunctions: string[];
  traps: ASTTrapWarning[];
  ruleFailures: ASTRuleFailure[];
}

export interface VarChange {
  scope: 'global' | 'local';
  name: string;
  typeName: string;
  repr: string;
  deleted?: boolean;
}

export interface LineRunEvent {
  seq: number;
  type: 'line';
  line: number;
  frameDepth: number;
  fn: string;
}

export interface VarsRunEvent {
  seq: number;
  type: 'vars';
  line: number;
  changes: VarChange[];
}

export interface LoopRunEvent {
  seq: number;
  type: 'loop';
  line: number;
  iteration: number;
  done?: boolean;
}

export interface CallRunEvent {
  seq: number;
  type: 'call';
  line: number;
  fn: string;
  argsRepr: string[];
  frameDepth: number;
}

export interface ReturnRunEvent {
  seq: number;
  type: 'return';
  line: number;
  fn: string;
  returnRepr: string;
  frameDepth: number;
}

export interface StdoutRunEvent {
  seq: number;
  type: 'stdout';
  text: string;
  truncated?: boolean;
}

export interface ActionRunEvent {
  seq: number;
  type: 'action';
  kind: SimCommandKind;
  args: unknown[];
  result: number | boolean | string | null;
  delta: SimDelta;
  inverse: SimInverseDelta;
  durationMs: number;
  narrationId: string;
  line: number;
  warningCode?: string;
  warningParams?: Record<string, string | number>;
}

export interface WarningRunEvent {
  seq: number;
  type: 'warning';
  code: string;
  params?: Record<string, string | number>;
  line: number;
}

export interface ErrorRunEvent {
  seq: number;
  type: 'error';
  error: PyErrorInfo;
}

export type RunEvent =
  | LineRunEvent
  | VarsRunEvent
  | LoopRunEvent
  | CallRunEvent
  | ReturnRunEvent
  | StdoutRunEvent
  | ActionRunEvent
  | WarningRunEvent
  | ErrorRunEvent;

export interface ScenarioSpec {
  id: string;
  label?: string;
  initialState: WorldSimInit;
  predicates: ScenarioPredicate[];
  scriptedInputs?: string[];
}

export interface FunctionTestSpec {
  id: string;
  fnName: string;
  args: unknown[];
  expectedReturn: unknown;
  description?: string;
}

export interface ScenarioResult {
  scenarioId: string;
  label?: string;
  visible: boolean;
  passed: boolean;
  failedReasons: string[];
  stdout: string[];
  warnings: string[];
  finalStateHash: string;
  actionsExecuted: number;
  error?: PyErrorInfo;
}

export interface FunctionTestResult {
  testId: string;
  fnName: string;
  args: unknown[];
  expectedReturn: unknown;
  actualReturn: unknown;
  passed: boolean;
  printedInsteadOfReturned?: boolean;
  error?: string;
}

export type RunStatus = 'ok' | 'error' | 'stopped' | 'limit';

export interface InitWorkerMessage {
  v: 1;
  type: 'init';
  pyodideBase: string;
  interruptSAB?: SharedArrayBuffer;
  inputMetaSAB?: SharedArrayBuffer;
  inputDataSAB?: SharedArrayBuffer;
}

export interface LoadStepWorkerMessage {
  v: 1;
  type: 'loadStep';
  stepId: string;
  capabilities: string[];
  scenarios: ScenarioSpec[];
  limits?: Partial<RuntimeLimits>;
  astRules?: ASTValidationRules;
  functionTests?: FunctionTestSpec[];
}

export interface RunWorkerMessage {
  v: 1;
  type: 'run';
  runId: string;
  code: string;
  traceLevel: 'full' | 'none';
  inputAnswers?: string[];
  visibleScenarioIndex?: number;
}

export interface CheckSyntaxWorkerMessage {
  v: 1;
  type: 'checkSyntax';
  reqId: string;
  code: string;
  astRules?: ASTValidationRules;
}

export interface InputReplyWorkerMessage {
  v: 1;
  type: 'inputReply';
  runId: string;
  answer: string;
}

export interface StopWorkerMessage {
  v: 1;
  type: 'stop';
  runId: string;
}

export interface DisposeWorkerMessage {
  v: 1;
  type: 'dispose';
}

export type MainToWorkerMessage =
  | InitWorkerMessage
  | LoadStepWorkerMessage
  | RunWorkerMessage
  | CheckSyntaxWorkerMessage
  | InputReplyWorkerMessage
  | StopWorkerMessage
  | DisposeWorkerMessage;

export interface ProgressWorkerEvent {
  v: 1;
  type: 'progress';
  phase: 'loading_pyodide' | 'loading_stdlib' | 'init_pycraft' | 'ready';
  pct: number;
}

export interface ReadyWorkerEvent {
  v: 1;
  type: 'ready';
  pyodideVersion: string;
  isolated: boolean;
  heapBytes: number;
}

export interface EventsWorkerEvent {
  v: 1;
  type: 'events';
  runId: string;
  batch: RunEvent[];
}

export interface InputRequestWorkerEvent {
  v: 1;
  type: 'inputRequest';
  runId: string;
  prompt: string;
}

export interface SyntaxResultWorkerEvent {
  v: 1;
  type: 'syntaxResult';
  reqId: string;
  ok: boolean;
  line?: number;
  col?: number;
  msg?: string;
  report?: ASTValidationReport;
}

export interface RunEndWorkerEvent {
  v: 1;
  type: 'runEnd';
  runId: string;
  status: RunStatus;
  error?: PyErrorInfo;
  scenarioResults: ScenarioResult[];
  astReport: ASTValidationReport;
  functionTests: FunctionTestResult[];
  finalStateHash: string;
  heapBytes: number;
  memoryExceeded: boolean;
}

export interface FatalWorkerEvent {
  v: 1;
  type: 'fatal';
  message: string;
}

export type WorkerToMainMessage =
  | ProgressWorkerEvent
  | ReadyWorkerEvent
  | EventsWorkerEvent
  | InputRequestWorkerEvent
  | SyntaxResultWorkerEvent
  | RunEndWorkerEvent
  | FatalWorkerEvent;

// ---------------------------------------------------------------------------
// Fast runtime validation guards
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isPyErrorInfo(value: unknown): value is PyErrorInfo {
  if (!isRecord(value)) return false;
  return (
    isString(value.type) &&
    isString(value.msg) &&
    (value.line === null || isFiniteNumber(value.line)) &&
    (value.col === null || isFiniteNumber(value.col)) &&
    Array.isArray(value.tracebackUser) &&
    value.tracebackUser.every(isString)
  );
}

const VALID_VAR_SCOPES = new Set(['global', 'local']);

export function isVarChange(value: unknown): value is VarChange {
  if (!isRecord(value)) return false;
  return (
    isString(value.scope) &&
    VALID_VAR_SCOPES.has(value.scope) &&
    isString(value.name) &&
    isString(value.typeName) &&
    isString(value.repr) &&
    (value.deleted === undefined || isBoolean(value.deleted))
  );
}

export function isRunEvent(value: unknown): value is RunEvent {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.seq) || !isString(value.type)) return false;

  switch (value.type) {
    case 'line':
      return (
        isFiniteNumber(value.line) &&
        isFiniteNumber(value.frameDepth) &&
        isString(value.fn)
      );
    case 'vars':
      return (
        isFiniteNumber(value.line) &&
        Array.isArray(value.changes) &&
        value.changes.every(isVarChange)
      );
    case 'loop':
      return (
        isFiniteNumber(value.line) &&
        isFiniteNumber(value.iteration) &&
        (value.done === undefined || isBoolean(value.done))
      );
    case 'call':
      return (
        isFiniteNumber(value.line) &&
        isString(value.fn) &&
        Array.isArray(value.argsRepr) &&
        value.argsRepr.every(isString) &&
        isFiniteNumber(value.frameDepth)
      );
    case 'return':
      return (
        isFiniteNumber(value.line) &&
        isString(value.fn) &&
        isString(value.returnRepr) &&
        isFiniteNumber(value.frameDepth)
      );
    case 'stdout':
      return (
        isString(value.text) &&
        (value.truncated === undefined || isBoolean(value.truncated))
      );
    case 'action':
      return (
        isString(value.kind) &&
        Array.isArray(value.args) &&
        (value.result === null ||
          isFiniteNumber(value.result) ||
          isBoolean(value.result) ||
          isString(value.result)) &&
        isRecord(value.delta) &&
        isRecord(value.inverse) &&
        isFiniteNumber(value.durationMs) &&
        isString(value.narrationId) &&
        isFiniteNumber(value.line)
      );
    case 'warning':
      return (
        isString(value.code) &&
        isFiniteNumber(value.line) &&
        (value.params === undefined || isRecord(value.params))
      );
    case 'error':
      return isPyErrorInfo(value.error);
    default:
      return false;
  }
}

export function isRunEventBatch(value: unknown): value is RunEvent[] {
  return Array.isArray(value) && value.every(isRunEvent);
}

export function isASTValidationReport(value: unknown): value is ASTValidationReport {
  if (!isRecord(value)) return false;
  return (
    isBoolean(value.ok) &&
    (value.syntaxError === undefined || isPyErrorInfo(value.syntaxError)) &&
    Array.isArray(value.comments) &&
    isBoolean(value.mixedTabsSpaces) &&
    isRecord(value.constructCounts) &&
    isFiniteNumber(value.statementLines) &&
    isFiniteNumber(value.printCalls) &&
    isFiniteNumber(value.inputCalls) &&
    isBoolean(value.hasInputInLoop) &&
    Array.isArray(value.definedFunctions) &&
    Array.isArray(value.traps) &&
    Array.isArray(value.ruleFailures)
  );
}

export function isScenarioResult(value: unknown): value is ScenarioResult {
  if (!isRecord(value)) return false;
  return (
    isString(value.scenarioId) &&
    isBoolean(value.visible) &&
    isBoolean(value.passed) &&
    Array.isArray(value.failedReasons) &&
    Array.isArray(value.stdout) &&
    Array.isArray(value.warnings) &&
    isString(value.finalStateHash) &&
    isFiniteNumber(value.actionsExecuted) &&
    (value.error === undefined || isPyErrorInfo(value.error))
  );
}

const VALID_RUN_STATUS = new Set(['ok', 'error', 'stopped', 'limit']);
const VALID_PHASES = new Set(['loading_pyodide', 'loading_stdlib', 'init_pycraft', 'ready']);

export function isWorkerToMainMessage(value: unknown): value is WorkerToMainMessage {
  if (!isRecord(value) || value.v !== PROTOCOL_VERSION || !isString(value.type)) {
    return false;
  }

  switch (value.type) {
    case 'progress':
      return (
        isString(value.phase) &&
        VALID_PHASES.has(value.phase) &&
        isFiniteNumber(value.pct)
      );
    case 'ready':
      return (
        isString(value.pyodideVersion) &&
        isBoolean(value.isolated) &&
        isFiniteNumber(value.heapBytes)
      );
    case 'events':
      return isString(value.runId) && isRunEventBatch(value.batch);
    case 'inputRequest':
      return isString(value.runId) && isString(value.prompt);
    case 'syntaxResult':
      return (
        isString(value.reqId) &&
        isBoolean(value.ok) &&
        (value.report === undefined || isASTValidationReport(value.report))
      );
    case 'runEnd':
      return (
        isString(value.runId) &&
        isString(value.status) &&
        VALID_RUN_STATUS.has(value.status) &&
        (value.error === undefined || isPyErrorInfo(value.error)) &&
        Array.isArray(value.scenarioResults) &&
        value.scenarioResults.every(isScenarioResult) &&
        isASTValidationReport(value.astReport) &&
        Array.isArray(value.functionTests) &&
        isString(value.finalStateHash) &&
        isFiniteNumber(value.heapBytes) &&
        isBoolean(value.memoryExceeded)
      );
    case 'fatal':
      return isString(value.message);
    default:
      return false;
  }
}

export function isMainToWorkerMessage(value: unknown): value is MainToWorkerMessage {
  if (!isRecord(value) || value.v !== PROTOCOL_VERSION || !isString(value.type)) {
    return false;
  }

  switch (value.type) {
    case 'init':
      return isString(value.pyodideBase);
    case 'loadStep':
      return (
        isString(value.stepId) &&
        Array.isArray(value.capabilities) &&
        value.capabilities.every(isString) &&
        Array.isArray(value.scenarios)
      );
    case 'run':
      return (
        isString(value.runId) &&
        isString(value.code) &&
        (value.traceLevel === 'full' || value.traceLevel === 'none') &&
        (value.inputAnswers === undefined ||
          (Array.isArray(value.inputAnswers) && value.inputAnswers.every(isString))) &&
        (value.visibleScenarioIndex === undefined ||
          isFiniteNumber(value.visibleScenarioIndex))
      );
    case 'checkSyntax':
      return isString(value.reqId) && isString(value.code);
    case 'inputReply':
      return isString(value.runId) && isString(value.answer);
    case 'stop':
      return isString(value.runId);
    case 'dispose':
      return true;
    default:
      return false;
  }
}
