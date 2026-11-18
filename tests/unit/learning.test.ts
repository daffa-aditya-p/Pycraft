import { describe, expect, it } from 'vitest';
import {
  ALL_AWAKENING_STEPS,
  AWAKENING_DIALOGUES,
  AWAKENING_LORE_NOTES,
  AWAKENING_MISSIONS,
  AWAKENING_QUESTS,
  getMissionById,
  getStepById,
} from '../../src/content/awakening';
import { t, UI_STRINGS } from '../../src/content/locales';
import {
  AWAKENING_ISLAND_ZONES,
  COSMETIC_CATALOG,
  DialogueRunner,
  ProgressionController,
  QuestRunner,
  computeRestorationProgress,
  getRankMeta,
} from '../../src/game';
import {
  KC_LIST,
  KC_MAP,
  REGIONS,
  arePrerequisitesMet,
  computeErrorPenalty,
  createInitialKCMastery,
  evaluateScenariosWithWorldSim,
  evaluateStage1,
  evaluateStage2,
  evaluateValidationPipeline,
  getKC,
  getKCsByRegion,
  getMaxScoreForKC,
  getPrerequisiteEdges,
  getR1ActiveKCs,
  inspectPythonSourceTS,
  isKCMastered,
  selectRecommendedTier,
  shouldOfferStepDown,
  updateKCMastery,
} from '../../src/learning';
import {
  CuratedMentorProvider,
  ERROR_CATALOG_EN,
  ERROR_CATALOG_ID,
  buildErrorMentorResponse,
  curatedMentorProvider,
  findClosestSuggestion,
  levenshtein,
  translatePythonError,
} from '../../src/mentor';
import type { FunctionTestResult, PyErrorInfo, ScenarioSpec } from '../../src/runtime/protocol';
import { WorldSim } from '../../src/sim/WorldSim';
import type { SimCommandKind } from '../../src/sim/types';

// ============================================================================
// Lightweight deterministic Python-subset runner for verifying all Awakening
// reference solutions directly against WorldSim + evaluateScenarioPredicates.
// ============================================================================

type PyFloat = { pyFloat: number };
type PyVal = number | string | boolean | null | PyFloat | PyVal[];

function isPyFloat(v: PyVal): v is PyFloat {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'pyFloat' in v;
}

function toNum(v: PyVal): number {
  return isPyFloat(v) ? v.pyFloat : Number(v);
}

function toRawJs(v: PyVal): unknown {
  if (isPyFloat(v)) return v.pyFloat;
  if (Array.isArray(v)) return v.map(toRawJs);
  return v;
}

interface PyFn {
  params: Array<{ name: string; defaultExpr?: string }>;
  body: BlockNode[];
}

type BlockNode =
  | { kind: 'stmt'; line: string }
  | { kind: 'if'; branches: Array<{ cond: string | null; body: BlockNode[] }> }
  | { kind: 'for'; varName: string; iterExpr: string; body: BlockNode[] }
  | { kind: 'while'; cond: string; body: BlockNode[] }
  | { kind: 'def'; name: string; params: Array<{ name: string; defaultExpr?: string }>; body: BlockNode[] };

class ContinueSignal {}
class ReturnSignal {
  constructor(public readonly value: PyVal) {}
}

function stripInlineComment(line: string): string {
  let quote: string | null = null;
  let escape = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && quote !== null) {
      escape = true;
      continue;
    }
    if ((ch === '"' || ch === "'") && quote === null) {
      quote = ch;
      continue;
    }
    if (ch === quote) {
      quote = null;
      continue;
    }
    if (ch === '#' && quote === null) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

function parseBlock(lines: Array<{ indent: number; text: string }>, startIdx: number, minIndent: number): { nodes: BlockNode[]; nextIdx: number } {
  const nodes: BlockNode[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const item = lines[i]!;
    if (item.indent < minIndent) break;
    const text = item.text;

    if (text.startsWith('if ') && text.endsWith(':')) {
      const branches: Array<{ cond: string | null; body: BlockNode[] }> = [];
      const firstCond = text.slice(3, -1).trim();
      const firstBody = parseBlock(lines, i + 1, item.indent + 1);
      branches.push({ cond: firstCond, body: firstBody.nodes });
      i = firstBody.nextIdx;

      while (i < lines.length && lines[i]!.indent === item.indent) {
        const nextText = lines[i]!.text;
        if (nextText.startsWith('elif ') && nextText.endsWith(':')) {
          const cond = nextText.slice(5, -1).trim();
          const sub = parseBlock(lines, i + 1, item.indent + 1);
          branches.push({ cond, body: sub.nodes });
          i = sub.nextIdx;
        } else if (nextText === 'else:') {
          const sub = parseBlock(lines, i + 1, item.indent + 1);
          branches.push({ cond: null, body: sub.nodes });
          i = sub.nextIdx;
          break;
        } else {
          break;
        }
      }
      nodes.push({ kind: 'if', branches });
      continue;
    }

    const forMatch = /^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/.exec(text);
    if (forMatch) {
      const sub = parseBlock(lines, i + 1, item.indent + 1);
      nodes.push({ kind: 'for', varName: forMatch[1]!, iterExpr: forMatch[2]!.trim(), body: sub.nodes });
      i = sub.nextIdx;
      continue;
    }

    const whileMatch = /^while\s+(.+):$/.exec(text);
    if (whileMatch) {
      const sub = parseBlock(lines, i + 1, item.indent + 1);
      nodes.push({ kind: 'while', cond: whileMatch[1]!.trim(), body: sub.nodes });
      i = sub.nextIdx;
      continue;
    }

    const defMatch = /^def\s+([A-Za-z_]\w*)\(([^)]*)\):$/.exec(text);
    if (defMatch) {
      const rawParams = defMatch[2]!.trim();
      const params = rawParams
        ? splitTopLevelArgs(rawParams).map((p) => {
            const eqIdx = p.indexOf('=');
            if (eqIdx === -1) return { name: p.trim() };
            return { name: p.slice(0, eqIdx).trim(), defaultExpr: p.slice(eqIdx + 1).trim() };
          })
        : [];
      const sub = parseBlock(lines, i + 1, item.indent + 1);
      nodes.push({ kind: 'def', name: defMatch[1]!, params, body: sub.nodes });
      i = sub.nextIdx;
      continue;
    }

    nodes.push({ kind: 'stmt', line: text });
    i++;
  }
  return { nodes, nextIdx: i };
}

function splitTopLevelArgs(raw: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  let quote: string | null = null;
  let escaping = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (escaping) {
      cur += ch;
      escaping = false;
      continue;
    }
    if (ch === '\\' && quote) {
      cur += ch;
      escaping = true;
      continue;
    }
    if ((ch === '"' || ch === "'") && !quote) {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === quote) {
      quote = null;
      cur += ch;
      continue;
    }
    if (!quote) {
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (ch === ',' && depth === 0) {
        out.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim().length > 0) out.push(cur.trim());
  return out;
}

function unescapePyString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

function findTopLevelOp(expr: string, ops: string[]): { idx: number; op: string } | null {
  let depth = 0;
  let quote: string | null = null;
  // Scan right-to-left for left-associative operators
  for (let i = expr.length - 1; i >= 0; i--) {
    const ch = expr[i]!;
    if (i > 0 && expr[i - 1] === '\\') continue;
    if ((ch === '"' || ch === "'") && !quote) {
      quote = ch;
      continue;
    }
    if (ch === quote) {
      quote = null;
      continue;
    }
    if (quote) continue;
    if (ch === ')' || ch === ']') depth++;
    else if (ch === '(' || ch === '[') depth--;
    if (depth !== 0) continue;

    for (const op of ops) {
      if (op === 'and' || op === 'or') {
        const start = i - op.length + 1;
        if (start >= 1 && expr.slice(start, i + 1) === op) {
          const before = expr[start - 1]!;
          const after = expr[i + 1] ?? '';
          if (/\s/.test(before) && /\s/.test(after)) {
            return { idx: start, op };
          }
        }
      } else {
        const start = i - op.length + 1;
        if (start >= 0 && expr.slice(start, i + 1) === op) {
          if (op === '+' || op === '-') {
            const prevNonSpace = expr.slice(0, start).trimEnd().slice(-1);
            if (!prevNonSpace || ['(', ',', '=', '!', '<', '>', '+', '-', '*'].includes(prevNonSpace)) {
              continue;
            }
          }
          if (op === '<' || op === '>') {
            const nextCh = expr[i + 1] ?? '';
            const prevCh = start > 0 ? expr[start - 1]! : '';
            if (nextCh === '=' || prevCh === '<' || prevCh === '>') continue;
          }
          return { idx: start, op };
        }
      }
    }
  }
  return null;
}

function isPyTruthy(v: PyVal): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (isPyFloat(v)) return v.pyFloat !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return v !== null;
}

function pyStr(v: PyVal): string {
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (v === null) return 'None';
  if (isPyFloat(v)) return Number.isInteger(v.pyFloat) ? `${v.pyFloat}.0` : String(v.pyFloat);
  return String(v);
}

function executePythonSubset(
  code: string,
  spec: ScenarioSpec
): {
  sim: WorldSim;
  stdoutLines: string[];
  warnings: string[];
  invokeFn: (fnName: string, args: unknown[]) => { returnValue: unknown; printed: boolean };
} {
  const sim = new WorldSim(spec.initialState);
  const stdoutLines: string[] = [];
  const warnings: string[] = [];
  const stdinQueue = [...(spec.scriptedInputs ?? [])];
  const fns = new Map<string, PyFn>();
  const globalScope: Record<string, PyVal> = {};

  const parsedLines: Array<{ indent: number; text: string }> = [];
  for (const rawLine of code.split(/\r?\n/)) {
    const stripped = stripInlineComment(rawLine);
    if (stripped.trim().length === 0) continue;
    const indent = stripped.length - stripped.trimStart().length;
    parsedLines.push({ indent, text: stripped.trim() });
  }
  const ast = parseBlock(parsedLines, 0, 0).nodes;

  function evalExpr(rawExpr: string, scope: Record<string, PyVal>): PyVal {
    const expr = rawExpr.trim();
    if (expr.startsWith('(') && expr.endsWith(')')) {
      // Check matching parens
      let d = 0;
      let q: string | null = null;
      let wrapsWhole = true;
      for (let i = 0; i < expr.length; i++) {
        const ch = expr[i]!;
        if ((ch === '"' || ch === "'") && !q) q = ch;
        else if (ch === q) q = null;
        else if (!q) {
          if (ch === '(') d++;
          else if (ch === ')') d--;
          if (d === 0 && i < expr.length - 1) {
            wrapsWhole = false;
            break;
          }
        }
      }
      if (wrapsWhole) return evalExpr(expr.slice(1, -1), scope);
    }

    // Boolean or / and
    const orHit = findTopLevelOp(expr, ['or']);
    if (orHit) {
      const left = evalExpr(expr.slice(0, orHit.idx), scope);
      return isPyTruthy(left) ? left : evalExpr(expr.slice(orHit.idx + 2), scope);
    }
    const andHit = findTopLevelOp(expr, ['and']);
    if (andHit) {
      const left = evalExpr(expr.slice(0, andHit.idx), scope);
      return isPyTruthy(left) ? evalExpr(expr.slice(andHit.idx + 3), scope) : left;
    }
    if (expr.startsWith('not ')) {
      return !isPyTruthy(evalExpr(expr.slice(4), scope));
    }

    // Comparisons
    const cmpHit = findTopLevelOp(expr, ['==', '!=', '<=', '>=', '<', '>']);
    if (cmpHit) {
      const l = evalExpr(expr.slice(0, cmpHit.idx), scope);
      const r = evalExpr(expr.slice(cmpHit.idx + cmpHit.op.length), scope);
      switch (cmpHit.op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<=': return Number(l) <= Number(r);
        case '>=': return Number(l) >= Number(r);
        case '<': return Number(l) < Number(r);
        case '>': return Number(l) > Number(r);
      }
    }

    // + / -
    const addHit = findTopLevelOp(expr, ['+', '-']);
    if (addHit) {
      const l = evalExpr(expr.slice(0, addHit.idx), scope);
      const r = evalExpr(expr.slice(addHit.idx + 1), scope);
      const floatOut = isPyFloat(l) || isPyFloat(r);
      if (addHit.op === '+') {
        if (typeof l === 'string' && typeof r === 'string') return l + r;
        const sum = toNum(l) + toNum(r);
        return floatOut ? { pyFloat: sum } : sum;
      }
      const diff = toNum(l) - toNum(r);
      return floatOut ? { pyFloat: diff } : diff;
    }

    // * / //
    const mulHit = findTopLevelOp(expr, ['//', '*', '/']);
    if (mulHit) {
      const l = evalExpr(expr.slice(0, mulHit.idx), scope);
      const r = evalExpr(expr.slice(mulHit.idx + mulHit.op.length), scope);
      const floatOut = isPyFloat(l) || isPyFloat(r);
      if (mulHit.op === '*') {
        if (typeof l === 'string' && typeof r === 'number') return l.repeat(r);
        const prod = toNum(l) * toNum(r);
        return floatOut ? { pyFloat: prod } : prod;
      }
      if (mulHit.op === '//') {
        const q = Math.trunc(toNum(l) / toNum(r));
        return floatOut ? { pyFloat: q } : q;
      }
      return { pyFloat: toNum(l) / toNum(r) };
    }

    // f-string
    if ((expr.startsWith('f"') && expr.endsWith('"')) || (expr.startsWith("f'") && expr.endsWith("'"))) {
      const inner = expr.slice(2, -1);
      const interpolated = inner.replace(/\{([^}]+)\}/g, (_, codePart: string) =>
        pyStr(evalExpr(codePart, scope))
      );
      return unescapePyString(interpolated);
    }

    // String literal
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return unescapePyString(expr.slice(1, -1));
    }

    if (expr === 'True') return true;
    if (expr === 'False') return false;
    if (expr === 'None') return null;
    if (/^-?\d+\.\d+$/.test(expr)) return { pyFloat: Number(expr) };
    if (/^-?\d+$/.test(expr)) return Number(expr);

    // Properties
    if (expr === 'farm.rows') return sim.farmRows;
    if (expr === 'farm.cols') return sim.farmCols;

    // Function / method calls
    const callMatch = /^([A-Za-z_][\w.]*)\((.*)\)$/.exec(expr);
    if (callMatch) {
      const target = callMatch[1]!;
      const args = callMatch[2]!.trim() ? splitTopLevelArgs(callMatch[2]!).map((a) => evalExpr(a, scope)) : [];
      return invokeCallable(target, args, scope);
    }

    if (expr in scope) return scope[expr] ?? null;
    if (expr in globalScope) return globalScope[expr] ?? null;
    throw new Error(`Unknown expression '${expr}'`);
  }

  function invokeCallable(target: string, args: PyVal[], callerScope: Record<string, PyVal>): PyVal {
    if (target === 'print') {
      stdoutLines.push(args.map((a) => pyStr(a)).join(' '));
      return null;
    }
    if (target === 'input') {
      return stdinQueue.shift() ?? '';
    }
    if (target === 'str') return pyStr(args[0] ?? '');
    if (target === 'int') return Math.trunc(toNum(args[0] ?? 0));
    if (target === 'float') return { pyFloat: toNum(args[0] ?? 0) };
    if (target === 'len') return typeof args[0] === 'string' || Array.isArray(args[0]) ? args[0].length : 0;
    if (target === 'range') {
      const start = args.length === 1 ? 0 : toNum(args[0] ?? 0);
      const end = args.length === 1 ? toNum(args[0] ?? 0) : toNum(args[1] ?? 0);
      const out: number[] = [];
      for (let i = start; i < end; i++) out.push(i);
      return out;
    }

    const simCommands = new Set<string>([
      'robot.move',
      'robot.turn',
      'robot.say',
      'robot.scan',
      'robot.measure',
      'robot.can_move',
      'robot.front',
      'robot.plant',
      'robot.next_row',
      'robot.place_block',
      'robot.collect',
      'bridge.build',
      'sensor.read',
      'scale.read',
      'gate.open',
      'gate.close',
      'gate.light',
      'gate.is_open',
      'depot.request',
      'altar.activate',
      'beacon.print',
    ]);
    if (simCommands.has(target)) {
      const coercedArgs = target === 'robot.say' ? [pyStr(args[0] ?? '')] : args.map(toRawJs);
      const res = sim.executeCommand(target as SimCommandKind, coercedArgs);
      if (res.warningCode) warnings.push(res.warningCode);
      return (res.returnValue as PyVal | undefined) ?? null;
    }

    const fn = fns.get(target);
    if (fn) {
      const fnScope: Record<string, PyVal> = {};
      for (let i = 0; i < fn.params.length; i++) {
        const param = fn.params[i]!;
        if (i < args.length) {
          fnScope[param.name] = args[i] ?? null;
        } else if (param.defaultExpr !== undefined) {
          fnScope[param.name] = evalExpr(param.defaultExpr, callerScope);
        }
      }
      try {
        execBlock(fn.body, fnScope, false);
      } catch (sig) {
        if (sig instanceof ReturnSignal) return sig.value;
        throw sig;
      }
      return null;
    }
    throw new Error(`Unknown callable '${target}'`);
  }

  function execBlock(nodes: BlockNode[], scope: Record<string, PyVal>, isRoot: boolean): void {
    for (const node of nodes) {
      if (node.kind === 'def') {
        fns.set(node.name, { params: node.params, body: node.body });
        continue;
      }
      if (node.kind === 'if') {
        for (const br of node.branches) {
          if (br.cond === null || isPyTruthy(evalExpr(br.cond, scope))) {
            execBlock(br.body, scope, isRoot);
            break;
          }
        }
        continue;
      }
      if (node.kind === 'for') {
        const iter = evalExpr(node.iterExpr, scope);
        const list = Array.isArray(iter) ? iter : [];
        for (const item of list) {
          scope[node.varName] = item;
          try {
            execBlock(node.body, scope, isRoot);
          } catch (sig) {
            if (sig instanceof ContinueSignal) continue;
            throw sig;
          }
        }
        continue;
      }
      if (node.kind === 'while') {
        let guard = 0;
        while (isPyTruthy(evalExpr(node.cond, scope))) {
          if (++guard > 200) throw new Error('While loop exceeded test guard');
          try {
            execBlock(node.body, scope, isRoot);
          } catch (sig) {
            if (sig instanceof ContinueSignal) continue;
            throw sig;
          }
        }
        continue;
      }

      const line = node.line;
      if (line === 'continue') throw new ContinueSignal();
      if (line.startsWith('return ')) {
        throw new ReturnSignal(evalExpr(line.slice(7), scope));
      }
      if (line === 'return') {
        throw new ReturnSignal(null);
      }

      // Assignment `x = expr`
      const assignMatch = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(line);
      if (assignMatch && !line.startsWith('==')) {
        const varName = assignMatch[1]!;
        const val = evalExpr(assignMatch[2]!, scope);
        scope[varName] = val;
        if (isRoot) globalScope[varName] = val;
        continue;
      }

      evalExpr(line, scope);
    }
  }

  execBlock(ast, globalScope, true);

  return {
    sim,
    stdoutLines,
    warnings,
    invokeFn: (fnName, args) => {
      const beforeOut = stdoutLines.length;
      const returnValue = invokeCallable(fnName, args as PyVal[], globalScope);
      return { returnValue, printed: stdoutLines.length > beforeOut };
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('KC Registry & Curriculum Graph', () => {
  it('contains all 8 regions and every KC group F1-F8, V1, D1-D14, O1-O7, B1-B8, L1-L8, N1-N9, P1-P9, X1-X3', () => {
    expect(REGIONS).toHaveLength(8);
    expect(getKC('F1')?.title.id).toBeTruthy();
    expect(getKC('F8')?.homeRegion).toBe('awakening');
    expect(getKC('V1')?.homeRegion).toBe('data_valley');
    expect(getKC('V1')?.r1Tier).toBe('T1');
    expect(getKC('D14')?.homeRegion).toBe('data_valley');
    expect(getKC('O7')?.homeRegion).toBe('arithmetic_mines');
    expect(getKC('B8')?.homeRegion).toBe('logic_fortress');
    expect(getKC('L8')?.homeRegion).toBe('automation_forest');
    expect(getKC('N9')?.homeRegion).toBe('function_kingdom');
    expect(getKC('P9')?.homeRegion).toBe('object_realm');
    expect(getKC('X3')?.homeRegion).toBe('core_citadel');

    expect(getKCsByRegion('awakening').length).toBeGreaterThanOrEqual(8);
    expect(getR1ActiveKCs().length).toBeGreaterThanOrEqual(16);
    expect(KC_LIST.length).toBe(KC_MAP.size);
  });

  it('has an acyclic prerequisite DAG and enforces prerequisites cleanly', () => {
    const edges = getPrerequisiteEdges();
    expect(edges.length).toBeGreaterThan(20);

    // Cycle check via Kahn's topological sort
    const inDeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const kc of KC_LIST) {
      inDeg.set(kc.id, 0);
      adj.set(kc.id, []);
    }
    for (const edge of edges) {
      inDeg.set(edge.to, (inDeg.get(edge.to) ?? 0) + 1);
      adj.get(edge.from)?.push(edge.to);
    }
    const q: string[] = [];
    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) q.push(id);
    }
    let visited = 0;
    while (q.length > 0) {
      const cur = q.shift()!;
      visited++;
      for (const nxt of adj.get(cur) ?? []) {
        const nd = (inDeg.get(nxt) ?? 0) - 1;
        inDeg.set(nxt, nd);
        if (nd === 0) q.push(nxt);
      }
    }
    expect(visited).toBe(KC_LIST.length);

    expect(arePrerequisitesMet('F1', new Set())).toBe(true);
    expect(arePrerequisitesMet('F5', new Set())).toBe(false);
    expect(arePrerequisitesMet('F5', new Set(['F3']))).toBe(true);
  });
});

describe('Mastery Engine (Section 16.2)', () => {
  it('computes deterministic score gains, Rung 4 cap, error penalty cap, and Region 1 T1 cap', () => {
    let rec = createInitialKCMastery('F2');
    expect(rec.score).toBe(0);

    // Independent pass (+28)
    rec = updateKCMastery(rec, { stepId: 'm1_s2', tier: 'independent', passed: true }, 'awakening');
    expect(rec.score).toBe(28);
    expect(rec.independentPasses).toBe(1);
    expect(isKCMastered(rec)).toBe(false);

    // Mastery bonus (+15) on m1_s3 + independent pass on m1_s4
    rec = updateKCMastery(rec, { stepId: 'm1_s3', tier: 'mastery', passed: true }, 'awakening');
    expect(rec.score).toBe(43); // 28 + 15
    expect(rec.independentPasses).toBe(2);

    rec = updateKCMastery(rec, { stepId: 'm1_s4', tier: 'independent', passed: true }, 'awakening');
    rec = updateKCMastery(rec, { stepId: 'm1_s5', tier: 'independent', passed: true }, 'awakening');
    expect(rec.score).toBe(99);
    expect(isKCMastered(rec)).toBe(true);

    // Rung 4 worked solution caps gain at +5 and grants no independent credit
    const rung4Start = createInitialKCMastery('F6');
    const afterRung4 = updateKCMastery(
      rung4Start,
      { stepId: 'm1_s5', tier: 'independent', passed: true, usedRung4Solution: true },
      'awakening'
    );
    expect(afterRung4.score).toBe(5);
    expect(afterRung4.independentPasses).toBe(0);

    // Error penalty: -3 per consecutive error beyond first, capped at -9
    expect(computeErrorPenalty(1)).toBe(0);
    expect(computeErrorPenalty(2)).toBe(3);
    expect(computeErrorPenalty(4)).toBe(9);
    expect(computeErrorPenalty(10)).toBe(9);
    const afterFail = updateKCMastery(
      { ...createInitialKCMastery('B1'), score: 20 },
      { stepId: 'm3_s1', tier: 'guided', passed: false, consecutiveErrorsInStep: 6 },
      'awakening'
    );
    expect(afterFail.score).toBe(11); // 20 - 9
    expect(shouldOfferStepDown(2)).toBe(true);

    // Region 1 T1 cap at 60 vs F1-F8 full cap 100
    expect(getMaxScoreForKC('F2', 'awakening')).toBe(100);
    expect(getMaxScoreForKC('V1', 'awakening')).toBe(60);
    expect(getMaxScoreForKC('V1', 'data_valley')).toBe(100);
    expect(getMaxScoreForKC('B3', 'awakening')).toBe(60);
    expect(getMaxScoreForKC('B3', 'logic_fortress')).toBe(100);
    let t1Rec = createInitialKCMastery('B3');
    for (let i = 0; i < 4; i++) {
      t1Rec = updateKCMastery(
        t1Rec,
        { stepId: `ctx_${i}`, tier: 'independent', passed: true },
        'awakening'
      );
    }
    expect(t1Rec.score).toBe(60);
  });

  it('selectRecommendedTier uses mean score across target KCs (<35 guided, 35-64 assisted, >=65 independent)', () => {
    expect(
      selectRecommendedTier(['F1', 'F2'], {
        F1: { ...createInitialKCMastery('F1'), attempts: 2, score: 40 },
        F2: { ...createInitialKCMastery('F2'), attempts: 1, score: 20 },
      })
    ).toBe('guided'); // mean = 30 -> guided
    expect(
      selectRecommendedTier(['F1', 'F2'], {
        F1: { ...createInitialKCMastery('F1'), attempts: 2, score: 70 },
        F2: { ...createInitialKCMastery('F2'), attempts: 1, score: 50 },
      })
    ).toBe('assisted'); // mean = 60 -> assisted
    expect(
      selectRecommendedTier(['F1', 'F2'], {
        F1: { ...createInitialKCMastery('F1'), attempts: 2, score: 80 },
        F2: { ...createInitialKCMastery('F2'), attempts: 2, score: 65 },
      })
    ).toBe('independent');
  });
});

describe('Error Translator (36 Rules + Levenshtein <= 2 + Locked Capabilities)', () => {
  it('loads all 36 bilingual rules in priority order', () => {
    expect(ERROR_CATALOG_ID).toHaveLength(36);
    expect(ERROR_CATALOG_EN).toHaveLength(36);
    const idIds = ERROR_CATALOG_ID.map((r) => r.id);
    const enIds = ERROR_CATALOG_EN.map((r) => r.id);
    expect(idIds).toEqual(enIds);
    for (let i = 0; i < ERROR_CATALOG_ID.length; i++) {
      expect(ERROR_CATALOG_ID[i]!.priority).toBe(i + 1);
    }
  });

  it('translates every single one of the 36 error patterns cleanly in id and en', () => {
    const cases: Array<{ ruleId: string; err: PyErrorInfo; playerCode?: string }> = [
      { ruleId: 'tab_mixed', err: { type: 'TabError', msg: 'inconsistent use of tabs and spaces in indentation', line: 2, col: 1, tracebackUser: [] } },
      { ruleId: 'indent_expected', err: { type: 'IndentationError', msg: 'expected an indented block after for statement', line: 2, col: 1, tracebackUser: [] } },
      { ruleId: 'indent_alignment', err: { type: 'IndentationError', msg: 'unexpected indent', line: 3, col: 4, tracebackUser: [] } },
      { ruleId: 'syntax_unclosed_string', err: { type: 'SyntaxError', msg: 'unterminated string literal', line: 1, col: 7, tracebackUser: [] }, playerCode: 'print("hi)' },
      { ruleId: 'syntax_assign_in_condition', err: { type: 'SyntaxError', msg: "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", line: 1, col: 6, tracebackUser: [] }, playerCode: 'if x = 5:' },
      { ruleId: 'syntax_missing_colon', err: { type: 'SyntaxError', msg: "expected ':'", line: 1, col: 10, tracebackUser: [] }, playerCode: 'if True' },
      { ruleId: 'syntax_unclosed_bracket', err: { type: 'SyntaxError', msg: "'(' was never closed", line: 1, col: 6, tracebackUser: [] }, playerCode: 'print("hi"' },
      { ruleId: 'syntax_unmatched_bracket', err: { type: 'SyntaxError', msg: "unmatched ')'", line: 1, col: 11, tracebackUser: [] } },
      { ruleId: 'syntax_missing_comma', err: { type: 'SyntaxError', msg: 'invalid syntax. Perhaps you forgot a comma?', line: 1, col: 8, tracebackUser: [] } },
      { ruleId: 'syntax_print_no_parens', err: { type: 'SyntaxError', msg: "Missing parentheses in call to 'print'", line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'syntax_invalid_identifier', err: { type: 'SyntaxError', msg: 'invalid decimal literal', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'syntax_invalid_char', err: { type: 'SyntaxError', msg: 'invalid character in identifier', line: 1, col: 7, tracebackUser: [] }, playerCode: 'print(“hi”)' },
      { ruleId: 'syntax_generic', err: { type: 'SyntaxError', msg: 'invalid syntax', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'import_blocked', err: { type: 'ImportError', msg: 'Module os is not allowed in Pycraft', line: 1, col: 1, tracebackUser: [], offendingName: 'os' } },
      { ruleId: 'name_locked_capability', err: { type: 'NameError', msg: "name 'bridge' is not defined", line: 1, col: 1, tracebackUser: [], offendingName: 'bridge' } },
      { ruleId: 'name_bool_lowercase', err: { type: 'NameError', msg: "name 'true' is not defined", line: 1, col: 4, tracebackUser: [], offendingName: 'true' } },
      { ruleId: 'name_typo', err: { type: 'NameError', msg: "name 'pirnt' is not defined", line: 1, col: 1, tracebackUser: [], offendingName: 'pirnt' } },
      { ruleId: 'name_generic', err: { type: 'NameError', msg: "name 'xyz_unknown' is not defined", line: 1, col: 1, tracebackUser: [], offendingName: 'xyz_unknown' } },
      { ruleId: 'attr_locked_method', err: { type: 'AttributeError', msg: "'Robot' object has no attribute 'plant'", line: 1, col: 1, tracebackUser: [], objectName: 'robot', attributeName: 'plant' }, playerCode: 'robot.plant("wheat")' },
      { ruleId: 'attr_typo', err: { type: 'AttributeError', msg: "'Robot' object has no attribute 'mve'", line: 1, col: 1, tracebackUser: [], objectName: 'robot', attributeName: 'mve' }, playerCode: 'robot.mve(1)' },
      { ruleId: 'attr_nonetype', err: { type: 'AttributeError', msg: "'NoneType' object has no attribute 'upper'", line: 2, col: 1, tracebackUser: [] } },
      { ruleId: 'attr_generic', err: { type: 'AttributeError', msg: "'Foo' object has no attribute 'bar'", line: 1, col: 1, tracebackUser: [], objectName: 'foo', attributeName: 'bar' } },
      { ruleId: 'type_str_int', err: { type: 'TypeError', msg: 'can only concatenate str (not "int") to str', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'type_missing_parens', err: { type: 'TypeError', msg: "'builtin_function_or_method' object is not subscriptable", line: 1, col: 1, tracebackUser: [] }, playerCode: 'if robot.can_move:' },
      { ruleId: 'type_arg_count', err: { type: 'TypeError', msg: 'move() takes 1 positional argument but 3 were given', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'type_not_iterable_or_callable', err: { type: 'TypeError', msg: "'int' object is not iterable", line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'type_generic', err: { type: 'TypeError', msg: 'incompatible operand types', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'value_int_parse', err: { type: 'ValueError', msg: "invalid literal for int() with base 10: 'abc'", line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'value_api_arg', err: { type: 'ValueError', msg: 'direction must be left, right, or around', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'zero_division', err: { type: 'ZeroDivisionError', msg: 'division by zero', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'index_error', err: { type: 'IndexError', msg: 'list index out of range', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'key_error', err: { type: 'KeyError', msg: "'gold'", line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'recursion_error', err: { type: 'RecursionError', msg: 'maximum recursion depth exceeded', line: 3, col: 5, tracebackUser: [] } },
      { ruleId: 'eof_error', err: { type: 'EOFError', msg: 'EOF when reading a line', line: 1, col: 1, tracebackUser: [] } },
      { ruleId: 'too_many_steps', err: { type: 'TooManySteps', msg: 'Execution step limit exceeded', line: 2, col: 1, tracebackUser: [] } },
      { ruleId: 'action_limit', err: { type: 'ActionLimit', msg: 'Action limit reached: 201', line: 2, col: 1, tracebackUser: [] } },
    ];

    expect(cases).toHaveLength(36);
    const seenIds = new Set<string>();
    for (const c of cases) {
      const idRes = translatePythonError(c.err, { locale: 'id', allowlist: ['print', 'robot.move'], playerCode: c.playerCode });
      const enRes = translatePythonError(c.err, { locale: 'en', allowlist: ['print', 'robot.move'], playerCode: c.playerCode });
      expect(idRes.ruleId).toBe(c.ruleId);
      expect(enRes.ruleId).toBe(c.ruleId);
      expect(idRes.body.length).toBeGreaterThan(5);
      expect(enRes.body.length).toBeGreaterThan(5);
      seenIds.add(c.ruleId);
    }
    expect(seenIds.size).toBe(36);
  });

  it('computes Levenshtein distance <= 2 suggestions and renders T1 arithmetic card in M2.3', async () => {
    expect(levenshtein('pirnt', 'print')).toBe(2);
    expect(findClosestSuggestion('pirnt', ['print', 'input', 'range'])).toBe('print');
    expect(findClosestSuggestion('abcdefg', ['print', 'input'])).toBeUndefined();

    const resp = await curatedMentorProvider.explainError({
      missionId: 'm2_data_collector',
      stepId: 'm2_s3',
      locale: 'id',
      assistanceTier: 'guided',
      attemptNumber: 1,
      playerCode: 'jarak = robot.measure()\ntotal = jarak + "1"',
      lastError: { type: 'TypeError', msg: 'can only concatenate str (not "int") to str', line: 2, col: 1, tracebackUser: [] },
      allowlist: ['print', 'robot.measure', 'bridge.build'],
      targetKCs: ['D3', 'O1'],
      hintLadder: [],
      simSummary: { robotPos: [0, 0], actionsExecuted: 0, warningCodes: [] },
    });
    expect(resp.conceptCardId).toBe('T1_ARITH');

    const baseErrResp = buildErrorMentorResponse({
      missionId: 'm1_hello_architect',
      stepId: 'm1_s1',
      locale: 'en',
      assistanceTier: 'guided',
      attemptNumber: 1,
      playerCode: 'pirnt("hi")',
      lastError: { type: 'NameError', msg: "name 'pirnt' is not defined", line: 1, col: 1, tracebackUser: [], offendingName: 'pirnt' },
      allowlist: ['print'],
      targetKCs: ['F2'],
      simSummary: { robotPos: [0, 0], actionsExecuted: 0, warningCodes: [] },
    });
    expect(baseErrResp.errorTag).toBe('name_typo');
  });
});

describe('CuratedMentorProvider', () => {
  it('serves all 4 hint rungs with worked solution on Rung 4 and exposes bilingual concept cards', async () => {
    const step = getStepById('m2_s4')!;
    const provider = new CuratedMentorProvider();
    const ctx = {
      missionId: step.missionId,
      stepId: step.stepId,
      locale: 'id' as const,
      assistanceTier: 'guided' as const,
      attemptNumber: 1,
      playerCode: '',
      allowlist: step.capabilities,
      targetKCs: step.targetKCs,
      hintLadder: step.hintLadder,
      simSummary: { robotPos: [0, 0] as [number, number], actionsExecuted: 0, warningCodes: [] },
    };

    const r1 = await provider.getHint(ctx, 1);
    const r2 = await provider.getHint(ctx, 2);
    const r3 = await provider.getHint(ctx, 3);
    const r4 = await provider.getHint(ctx, 4);
    expect(r1.rung).toBe(1);
    expect(r2.rung).toBe(2);
    expect(r3.codeSnippet).toBeTruthy();
    expect(r4.rung).toBe(4);
    expect(r4.visorMood).toBe('proud');
    expect(r4.codeSnippet).toBeTruthy();

    const card = await curatedMentorProvider.getConceptCard('N4', 'en');
    expect(card?.title).toContain('return');
  });

  it('translates worker AST slug messageId like too_many_prints into readable Indonesian/English text', async () => {
    const provider = new CuratedMentorProvider();
    const idResp = await provider.explainError({
      missionId: 'm1_hello_architect',
      stepId: 'm1_bonus',
      locale: 'id',
      assistanceTier: 'mastery',
      attemptNumber: 1,
      playerCode: 'print("a")\nprint("b")',
      targetKCs: ['F5'],
      astReport: {
        ok: false,
        comments: [],
        mixedTabsSpaces: false,
        constructCounts: {},
        statementLines: 2,
        printCalls: 2,
        inputCalls: 0,
        hasInputInLoop: false,
        definedFunctions: [],
        traps: [],
        ruleFailures: [
          {
            rule: 'maxPrintCalls',
            messageId: 'too_many_prints',
            message: 'Maksimal 1 pemanggilan print() pada langkah ini.',
          },
        ],
      },
      simSummary: { robotPos: [0, 0], actionsExecuted: 0, warningCodes: [] },
    });
    expect(idResp.body).not.toBe('too_many_prints');
    expect(idResp.body).toContain('Maksimal 1 pemanggilan print()');

    const enResp = await provider.explainError({
      missionId: 'm1_hello_architect',
      stepId: 'm1_bonus',
      locale: 'en',
      assistanceTier: 'mastery',
      attemptNumber: 1,
      playerCode: 'print("a")\nprint("b")',
      targetKCs: ['F5'],
      astReport: {
        ok: false,
        comments: [],
        mixedTabsSpaces: false,
        constructCounts: {},
        statementLines: 2,
        printCalls: 2,
        inputCalls: 0,
        hasInputInLoop: false,
        definedFunctions: [],
        traps: [],
        ruleFailures: [
          {
            rule: 'maxPrintCalls',
            messageId: 'too_many_prints',
            message: 'Maksimal 1 pemanggilan print() pada langkah ini.',
          },
        ],
      },
      simSummary: { robotPos: [0, 0], actionsExecuted: 0, warningCodes: [] },
    });
    expect(enResp.body).toContain('too many print() calls');

    const slugFallbackId = await provider.explainError({
      missionId: 'm1_hello_architect',
      stepId: 'm1_bonus',
      locale: 'id',
      assistanceTier: 'mastery',
      attemptNumber: 1,
      playerCode: 'print("a")\nprint("b")',
      targetKCs: ['F5'],
      astReport: {
        ok: false,
        comments: [],
        mixedTabsSpaces: false,
        constructCounts: {},
        statementLines: 2,
        printCalls: 2,
        inputCalls: 0,
        hasInputInLoop: false,
        definedFunctions: [],
        traps: [],
        ruleFailures: [
          {
            rule: 'maxPrintCalls',
            messageId: 'too_many_prints',
            message: 'too_many_prints',
          },
        ],
      },
      simSummary: { robotPos: [0, 0], actionsExecuted: 0, warningCodes: [] },
    });
    expect(slugFallbackId.body).not.toBe('too_many_prints');
    expect(slugFallbackId.body).toContain('print()');
  });
});

describe('4-Stage Validator Pipeline & RC-01 Comment Tokenization', () => {
  it('enforces RC-01 tokenize.COMMENT semantics (ignores # inside string literals)', () => {
    const fakeComment = evaluateStage1('print("# Ini bukan komentar")', { requireComment: true });
    expect(fakeComment.passed).toBe(false);

    const realComment = evaluateStage1('# Komentar resmi\nprint("Halo Aetheria!")', { requireComment: true });
    expect(realComment.passed).toBe(true);
    expect(realComment.comments).toHaveLength(1);
  });

  it('rejects unrolled M4 code, hardcoded M1.4 print count, and M5.3 print-instead-of-return', () => {
    const unrolled = evaluateStage2(
      'robot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")\nrobot.move(1)\nrobot.plant("wheat")',
      { requireConstructs: ['For'], maxStatementLines: 5 }
    );
    expect(unrolled.passed).toBe(false);

    const multiPrint = evaluateStage2('print("A")\nprint("B")', { exactPrintCalls: 1 });
    expect(multiPrint.passed).toBe(false);

    const m5Step = getStepById('m5_s3')!;
    const badPrintCode = 'def hitung_balok(lebar, tinggi):\n    print(lebar * tinggi)\ndepot.request("stone", 12)';
    const fnTests: FunctionTestResult[] = [
      { testId: 'ft_2_5', fnName: 'hitung_balok', args: [2, 5], expectedReturn: 10, actualReturn: null, passed: false, printedInsteadOfReturned: true },
    ];
    const pipeline = evaluateValidationPipeline({
      stepId: m5Step.stepId,
      code: badPrintCode,
      locale: 'id',
      rules: m5Step.astRules,
      scenarioResults: [],
      functionTests: fnTests,
      expectedScenarioCount: 1,
    });
    expect(pipeline.passed).toBe(false);
    expect(pipeline.printInsteadOfReturnDetected).toBe(true);
    expect(pipeline.feedback?.id).toContain('return');

    const insp = inspectPythonSourceTS('for r in range(3):\n    for c in range(5):\n        robot.plant("wheat")');
    expect(insp.constructs.has('NestedLoop')).toBe(true);
  });
});

describe('Game Quests, DialogueRunner, ProgressionController & Bilingual UI', () => {
  it('runs quest objective transitions, dialogue choices + 20-line history, XP ranks, restoration, and 10 lore notes', () => {
    expect(AWAKENING_LORE_NOTES).toHaveLength(10);
    expect(AWAKENING_QUESTS).toHaveLength(8);
    expect(Object.keys(AWAKENING_DIALOGUES).length).toBeGreaterThanOrEqual(7);
    expect(t('id', 'editor.run')).toBe(UI_STRINGS.id.editor.run);
    expect(t('en', 'editor.run')).toBe(UI_STRINGS.en.editor.run);

    const qRunner = new QuestRunner(AWAKENING_QUESTS);
    expect(qRunner.getQuestStatus('prologue')).toBe('active');
    expect(qRunner.onGoTo('shrine_ledge')).toContain('pro_1_move');
    expect(qRunner.onInteract('neo_pedestal')).toContain('pro_2_neo');
    expect(qRunner.onGoTo('beacon_point')).toContain('pro_3_beacon');
    expect(qRunner.getQuestStatus('prologue')).toBe('completed');
    expect(qRunner.getQuestStatus('m1_hello_architect')).toBe('active');

    const dRunner = new DialogueRunner();
    const firstNode = dRunner.start(AWAKENING_DIALOGUES.prologue_neo_reboot!, 'id');
    expect(firstNode?.speaker).toBe('NEO');
    const secondNode = dRunner.advance();
    expect(secondNode?.choices?.length).toBeGreaterThan(0);
    const chosen = dRunner.choose(secondNode!.choices![0]!.id);
    expect(chosen).toBeTruthy();
    expect(dRunner.getHistory().length).toBeLessThanOrEqual(20);

    const progression = new ProgressionController();
    const res1 = progression.awardStepXP('m1_s1', 30, ['neo_visor_amber']);
    expect(res1.xpGranted).toBe(30);
    // Idempotent duplicate step award
    const dup = progression.awardStepXP('m1_s1', 30);
    expect(dup.xpGranted).toBe(0);

    const rankCheck = getRankMeta(2, 'id');
    expect(rankCheck.title).toBe('Magang');
    expect(COSMETIC_CATALOG.length).toBeGreaterThanOrEqual(8);
    expect(AWAKENING_ISLAND_ZONES).toHaveLength(7);

    progression.restoreZone('beacon_point', 'm1_hello_architect');
    expect(computeRestorationProgress(5000, 5000, false)).toBeCloseTo(1, 4);
    expect(progression.getRestorationUniforms().beacon_point).toBe(1);
  });
});

describe('Awakening Campaign Golden Verification (All 31 Reference Solutions vs WorldSim + 4-Stage Pipeline)', () => {
  it('validates every step across M1-M5 and Final Core Shard against WorldSim & AST/Scenario rules', () => {
    expect(AWAKENING_MISSIONS).toHaveLength(6);
    expect(getMissionById('m1_hello_architect')?.steps.length).toBeGreaterThanOrEqual(5);
    expect(ALL_AWAKENING_STEPS.length).toBe(31);

    for (const step of ALL_AWAKENING_STEPS) {
      expect(step.hintLadder).toHaveLength(4);
      expect(step.referenceSolution.trim().length).toBeGreaterThan(0);

      const evaluatedScenarios = step.scenarios.map((spec) => {
        const exec = executePythonSubset(step.referenceSolution, spec);
        return {
          spec,
          sim: exec.sim,
          stdoutLines: exec.stdoutLines,
          warnings: exec.warnings,
          invokeFn: exec.invokeFn,
        };
      });

      const scenarioResults = evaluateScenariosWithWorldSim(evaluatedScenarios);

      const fnTests: FunctionTestResult[] = (step.functionTests ?? []).map((ft) => {
        const firstExec = evaluatedScenarios[0]!;
        const callRes = firstExec.invokeFn(ft.fnName, ft.args);
        const passed = callRes.returnValue === ft.expectedReturn;
        return {
          testId: ft.id,
          fnName: ft.fnName,
          args: ft.args,
          expectedReturn: ft.expectedReturn,
          actualReturn: callRes.returnValue,
          passed,
          printedInsteadOfReturned: callRes.printed && callRes.returnValue === null,
        };
      });

      const pipeline = evaluateValidationPipeline({
        stepId: step.stepId,
        code: step.referenceSolution,
        locale: 'id',
        rules: step.astRules,
        scenarioResults,
        functionTests: fnTests,
        expectedScenarioCount: step.scenarios.length,
      });

      if (!pipeline.passed) {
        throw new Error(
          `Golden verification failed for ${step.stepId} (stage ${String(pipeline.stageFailed)}): ${pipeline.feedback?.id ?? 'unknown'} | reasons=${JSON.stringify(scenarioResults.map((s) => s.failedReasons))}`
        );
      }
      expect(pipeline.passed).toBe(true);
    }
  });
});
