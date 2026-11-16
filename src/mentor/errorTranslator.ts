import idErrors from '../content/locales/id/errors.json';
import enErrors from '../content/locales/en/errors.json';
import type { Locale, MentorContext, MentorResponse, PyErrorInfo } from './types';

export interface ErrorRuleEntry {
  id: string;
  priority: number;
  errorType: string;
  headline: string;
  template: string;
  socratic: string;
}

export const ERROR_CATALOG_ID: readonly ErrorRuleEntry[] = idErrors as ErrorRuleEntry[];
export const ERROR_CATALOG_EN: readonly ErrorRuleEntry[] = enErrors as ErrorRuleEntry[];

export interface TranslatedErrorCard {
  ruleId: string;
  priority: number;
  headline: string;
  body: string;
  socraticQuestion: string;
  highlightLines: number[];
  errorTag: string;
  suggestion?: string;
}

export const PYTHON_CORE_BUILTINS: readonly string[] = [
  'print',
  'input',
  'int',
  'float',
  'str',
  'bool',
  'len',
  'range',
  'abs',
  'round',
  'True',
  'False',
  'None',
];

export const GLOBAL_CAPABILITY_UNLOCKS: Record<string, { id: string; en: string }> = {
  robot: { id: 'Misi 2: Pengumpul Data', en: 'Mission 2: Data Collector' },
  bridge: { id: 'Misi 2: Pengumpul Data', en: 'Mission 2: Data Collector' },
  sensor: { id: 'Misi 3: Gerbang Terkunci', en: 'Mission 3: The Locked Gate' },
  scale: { id: 'Misi 3: Gerbang Terkunci', en: 'Mission 3: The Locked Gate' },
  gate: { id: 'Misi 3: Gerbang Terkunci', en: 'Mission 3: The Locked Gate' },
  farm: { id: 'Misi 4: Ladang Otomatis', en: 'Mission 4: Automated Farm' },
  depot: { id: 'Misi 5: Cetak Biru', en: 'Mission 5: The Blueprint' },
  altar: { id: 'Tantangan Inti: Puncak Serpihan', en: 'Final Challenge: Core Shard Spire' },
  plant: { id: 'Misi 4: Ladang Otomatis (robot.plant)', en: 'Mission 4: Automated Farm (robot.plant)' },
  input: { id: 'Misi 1 Langkah 1.5', en: 'Mission 1 Step 1.5' },
  shelf: { id: 'Wilayah 2: Lembah Data', en: 'Region 2: Data Valley' },
  catalog: { id: 'Wilayah 2: Lembah Data', en: 'Region 2: Data Valley' },
  lift: { id: 'Wilayah 3: Tambang Aritmetika', en: 'Region 3: Arithmetic Mines' },
};

export const OBJECT_METHOD_CATALOG: Record<string, Record<string, { id: string; en: string }>> = {
  robot: {
    move: { id: 'Misi 2', en: 'Mission 2' },
    turn: { id: 'Misi 2', en: 'Mission 2' },
    scan: { id: 'Misi 2', en: 'Mission 2' },
    measure: { id: 'Misi 2', en: 'Mission 2' },
    can_move: { id: 'Misi 2', en: 'Mission 2' },
    say: { id: 'Misi 2', en: 'Mission 2' },
    front: { id: 'Misi 4', en: 'Mission 4' },
    plant: { id: 'Misi 4', en: 'Mission 4' },
    next_row: { id: 'Misi 4 Langkah 4.5', en: 'Mission 4 Step 4.5' },
    place_block: { id: 'Misi 5', en: 'Mission 5' },
    collect: { id: 'Tantangan Inti', en: 'Final Challenge' },
    position: { id: 'Wilayah 2: Lembah Data', en: 'Region 2: Data Valley' },
    facing: { id: 'Wilayah 2: Lembah Data', en: 'Region 2: Data Valley' },
    inventory: { id: 'Wilayah 2: Lembah Data', en: 'Region 2: Data Valley' },
    count: { id: 'Wilayah 2: Lembah Data', en: 'Region 2: Data Valley' },
  },
  bridge: {
    build: { id: 'Misi 2 Langkah 2.4', en: 'Mission 2 Step 2.4' },
  },
  sensor: {
    read: { id: 'Misi 3', en: 'Mission 3' },
  },
  scale: {
    read: { id: 'Misi 3 Langkah 3.5', en: 'Mission 3 Step 3.5' },
  },
  gate: {
    open: { id: 'Misi 3', en: 'Mission 3' },
    close: { id: 'Misi 3', en: 'Mission 3' },
    light: { id: 'Misi 3 Langkah 3.3', en: 'Mission 3 Step 3.3' },
    is_open: { id: 'Misi 3', en: 'Mission 3' },
  },
  farm: {
    rows: { id: 'Misi 4 Langkah 4.5', en: 'Mission 4 Step 4.5' },
    cols: { id: 'Misi 4 Langkah 4.5', en: 'Mission 4 Step 4.5' },
  },
  depot: {
    request: { id: 'Misi 5 Langkah 5.3', en: 'Mission 5 Step 5.3' },
  },
  altar: {
    activate: { id: 'Tantangan Inti', en: 'Final Challenge' },
  },
};

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n]!;
}

export function findClosestSuggestion(
  name: string,
  candidates: readonly string[],
  maxDistance = 2
): string | undefined {
  let best: string | undefined;
  let bestDist = maxDistance + 1;
  const lower = name.toLowerCase();
  for (const cand of candidates) {
    if (cand === name) continue;
    const dist = levenshtein(lower, cand.toLowerCase());
    if (dist <= maxDistance && dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

function extractLineCode(code: string, lineNumber: number): string {
  if (!code || lineNumber <= 0) return '';
  const lines = code.split(/\r?\n/);
  return lines[lineNumber - 1] ?? '';
}

function extractPlayerAssignedNames(code: string): string[] {
  const names = new Set<string>();
  const assignRe = /^\s*([A-Za-z_]\w*)\s*=/gm;
  let m: RegExpExecArray | null;
  while ((m = assignRe.exec(code)) !== null) {
    if (m[1]) names.add(m[1]);
  }
  const defRe = /^\s*def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/gm;
  while ((m = defRe.exec(code)) !== null) {
    if (m[1]) names.add(m[1]);
    if (m[2]) {
      for (const rawParam of m[2].split(',')) {
        const param = rawParam.split('=')[0]?.trim();
        if (param) names.add(param);
      }
    }
  }
  return Array.from(names);
}

function extractOffendingName(err: PyErrorInfo): string {
  if (err.offendingName) return err.offendingName;
  const quoted = err.msg.match(/name '([^']+)'/);
  if (quoted?.[1]) return quoted[1];
  const moduleMatch = err.msg.match(/No module named '([^']+)'/);
  if (moduleMatch?.[1]) return moduleMatch[1];
  return '???';
}

function extractAttributeContext(err: PyErrorInfo, lineCode: string): { obj: string; attr: string } {
  if (err.objectName && err.attributeName) {
    return { obj: err.objectName, attr: err.attributeName };
  }
  const m = err.msg.match(/'([^']+)' object has no attribute '([^']+)'/);
  const attr = err.attributeName ?? m?.[2] ?? '???';
  const lineCall = lineCode.match(/([A-Za-z_]\w*)\s*\.\s*([A-Za-z_]\w*)/);
  const obj = err.objectName ?? lineCall?.[1] ?? (m?.[1] === 'NoneType' ? 'None' : 'objek');
  return { obj, attr };
}

function extractHeaderKeyword(lineCode: string): string {
  const m = lineCode.trim().match(/^(if|elif|else|for|while|def)\b/);
  return m?.[1] ?? 'if/for/def';
}

function getAllowlistRoots(allowlist: readonly string[]): Set<string> {
  const roots = new Set<string>(PYTHON_CORE_BUILTINS);
  for (const item of allowlist) {
    roots.add(item);
    const root = item.split('.')[0];
    if (root) roots.add(root);
  }
  return roots;
}

function getRule(catalog: readonly ErrorRuleEntry[], id: string): ErrorRuleEntry {
  const found = catalog.find((r) => r.id === id);
  if (!found) {
    throw new Error(`Missing error rule '${id}' in catalog`);
  }
  return found;
}

export function translatePythonError(
  err: PyErrorInfo,
  options: {
    locale?: Locale;
    playerCode?: string;
    allowlist?: readonly string[];
    playerVariables?: readonly string[];
    stepLimit?: number;
    actionLimit?: number;
    astReport?: MentorContext['astReport'];
  } = {}
): TranslatedErrorCard {
  const locale: Locale = options.locale ?? 'id';
  const catalog = locale === 'en' ? ERROR_CATALOG_EN : ERROR_CATALOG_ID;
  const code = options.playerCode ?? '';
  const line = Math.max(1, err.line || 1);
  const lineCode = extractLineCode(code, line);
  const msg = err.msg ?? '';
  const type = err.type ?? 'SyntaxError';
  const allowlist = options.allowlist ?? ['print', 'robot', 'robot.move', 'robot.turn', 'robot.say'];

  const emit = (
    ruleId: string,
    params: Record<string, string | number> = {},
    suggestion?: string
  ): TranslatedErrorCard => {
    const rule = getRule(catalog, ruleId);
    const mergedParams = { line, ...params };
    return {
      ruleId: rule.id,
      priority: rule.priority,
      headline: interpolate(rule.headline, mergedParams),
      body: interpolate(rule.template, mergedParams),
      socraticQuestion: interpolate(rule.socratic, mergedParams),
      highlightLines: [line],
      errorTag: rule.id,
      ...(suggestion ? { suggestion } : {}),
    };
  };

  // Explicit AST trap override (e.g., uncalled method detected by AST without runtime error)
  if (err.catalogKey === 'type_missing_parens' || type === 'UncalledMethodWarning') {
    const expr = err.offendingName ?? lineCode.trim();
    return emit('type_missing_parens', { expr });
  }

  // 1. TabError
  if (type === 'TabError' || /inconsistent use of tabs and spaces/i.test(msg)) {
    return emit('tab_mixed');
  }

  // 2-3. IndentationError
  if (type === 'IndentationError') {
    if (/expected an indented block/i.test(msg)) {
      return emit('indent_expected');
    }
    return emit('indent_alignment');
  }

  // 4-13. SyntaxError rules (priority ordered)
  if (type === 'SyntaxError') {
    if (/unterminated string|EOL while scanning string|EOF while scanning triple/i.test(msg)) {
      return emit('syntax_unclosed_string');
    }
    const assignInCondTrap = options.astReport?.traps?.some(
      (t) => t.kind === 'assign_in_if' && t.line === line
    );
    if (
      assignInCondTrap ||
      /Maybe you meant '=='|cannot assign to expression/i.test(msg) ||
      (/^\s*(if|elif|while)\b.*[^=!<>]=[^=]/.test(lineCode) && !/==/.test(lineCode))
    ) {
      return emit('syntax_assign_in_condition');
    }
    if (
      /expected ':'/i.test(msg) ||
      (/^\s*(if|elif|else|for|while|def)\b/.test(lineCode) && !lineCode.trimEnd().endsWith(':'))
    ) {
      return emit('syntax_missing_colon', { keyword: extractHeaderKeyword(lineCode) });
    }
    if (/was never closed|unexpected EOF while parsing/i.test(msg)) {
      return emit('syntax_unclosed_bracket');
    }
    if (/unmatched '[)\]}]'|closing parenthesis/i.test(msg)) {
      const charMatch = msg.match(/['"]([)\]}])['"]/);
      return emit('syntax_unmatched_bracket', { char: charMatch?.[1] ?? ')' });
    }
    if (/forgot a comma/i.test(msg)) {
      return emit('syntax_missing_comma');
    }
    if (/Missing parentheses in call to 'print'/i.test(msg)) {
      return emit('syntax_print_no_parens');
    }
    if (/invalid character|non-printable/i.test(msg) || /[“”‘’]/.test(lineCode)) {
      return emit('syntax_invalid_char');
    }
    if (
      /invalid decimal literal|cannot assign to literal|outside function|outside loop|not properly in loop|invalid syntax.*(def|return|break|continue|class|for|if)/i.test(
        msg
      )
    ) {
      return emit('syntax_invalid_identifier');
    }
    return emit('syntax_generic');
  }

  // 14. ImportError / ModuleNotFoundError
  if (type === 'ImportError' || type === 'ModuleNotFoundError') {
    return emit('import_blocked', { name: extractOffendingName(err) });
  }

  // 15-18. NameError
  if (type === 'NameError' || type === 'UnboundLocalError') {
    const name = extractOffendingName(err);
    const activeRoots = getAllowlistRoots(allowlist);

    // 15. Locked future capability
    if (GLOBAL_CAPABILITY_UNLOCKS[name] && !activeRoots.has(name)) {
      const unlockMission = GLOBAL_CAPABILITY_UNLOCKS[name][locale];
      return emit('name_locked_capability', { name, unlockMission });
    }

    // 16. Lowercase bool / None
    const lowerMap: Record<string, string> = {
      true: 'True',
      false: 'False',
      none: 'None',
    };
    if (lowerMap[name]) {
      return emit('name_bool_lowercase', { name, suggestion: lowerMap[name] }, lowerMap[name]);
    }

    // 17. Levenshtein <= 2 typo against active allowlist + builtins + player variables
    const candidateNames = Array.from(
      new Set([
        ...activeRoots,
        ...(options.playerVariables ?? []),
        ...extractPlayerAssignedNames(code),
      ])
    );
    const suggestion = findClosestSuggestion(name, candidateNames, 2);
    if (suggestion) {
      return emit('name_typo', { name, suggestion }, suggestion);
    }

    // 18. Generic undefined name
    return emit('name_generic', { name });
  }

  // 19-22. AttributeError
  if (type === 'AttributeError') {
    if (/'NoneType' object has no attribute/i.test(msg)) {
      return emit('attr_nonetype');
    }
    const { obj, attr } = extractAttributeContext(err, lineCode);
    const knownObjMethods = OBJECT_METHOD_CATALOG[obj];
    if (knownObjMethods) {
      const fullName = `${obj}.${attr}`;
      const isAllowed = allowlist.includes(fullName);
      if (knownObjMethods[attr] && !isAllowed) {
        return emit('attr_locked_method', {
          object: obj,
          attr,
          unlockMission: knownObjMethods[attr][locale],
        });
      }
      // Typo check on allowed methods for this object
      const allowedForObj = Object.keys(knownObjMethods).filter((m) =>
        allowlist.some((a) => a === `${obj}.${m}` || a === obj)
      );
      const suggestion = findClosestSuggestion(
        attr,
        allowedForObj.length > 0 ? allowedForObj : Object.keys(knownObjMethods),
        2
      );
      if (suggestion) {
        return emit('attr_typo', { object: obj, attr, suggestion }, `${obj}.${suggestion}`);
      }
    }
    return emit('attr_generic', { attr });
  }

  // 23-27. TypeError
  if (type === 'TypeError' || type === 'PycraftTypeError') {
    if (
      /can only concatenate str|unsupported operand type\(s\) for \+: 'str' and 'int'|unsupported operand type\(s\) for \+: 'int' and 'str'/i.test(
        msg
      )
    ) {
      return emit('type_str_int');
    }
    if (/'(builtin_function_or_method|method|function)' object is not/i.test(msg)) {
      return emit('type_missing_parens', { expr: lineCode.trim() });
    }
    if (/positional argument|unexpected keyword argument/i.test(msg)) {
      return emit('type_arg_count');
    }
    if (/object is not (iterable|callable|subscriptable)/i.test(msg)) {
      return emit('type_not_iterable_or_callable');
    }
    return emit('type_generic');
  }

  // 28-29. ValueError
  if (type === 'ValueError' || type === 'PycraftValueError') {
    const intLiteralMatch = msg.match(/invalid literal for int\(\) with base \d+: '([^']*)'/);
    if (intLiteralMatch) {
      return emit('value_int_parse', { val: err.offendingValue ?? intLiteralMatch[1] ?? '' });
    }
    return emit('value_api_arg');
  }

  // 30. ZeroDivisionError
  if (type === 'ZeroDivisionError') {
    return emit('zero_division');
  }

  // 31. IndexError
  if (type === 'IndexError') {
    return emit('index_error');
  }

  // 32. KeyError
  if (type === 'KeyError') {
    const val = err.offendingValue ?? msg.replace(/^['"]|['"]$/g, '');
    return emit('key_error', { val });
  }

  // 33. RecursionError
  if (type === 'RecursionError') {
    return emit('recursion_error');
  }

  // 34. EOFError
  if (type === 'EOFError') {
    return emit('eof_error');
  }

  // 35. TooManySteps
  if (type === 'TooManySteps') {
    return emit('too_many_steps', { limit: options.stepLimit ?? 20000 });
  }

  // 36. ActionLimit
  if (type === 'ActionLimit') {
    return emit('action_limit', { limit: options.actionLimit ?? 500 });
  }

  // Fallback for unexpected exceptions
  return emit('syntax_generic');
}

export function buildErrorMentorResponse(ctx: MentorContext): MentorResponse {
  if (!ctx.lastError) {
    const isId = ctx.locale === 'id';
    return {
      source: 'curated',
      visorMood: 'thinking',
      headline: isId ? 'Ayo Periksa Hasilnya' : "Let's Check the Result",
      body: isId
        ? 'Programmu berjalan tanpa error Python, tetapi hasil di dunia belum sesuai target misi.'
        : 'Your code ran without Python errors, but the world outcome did not match the step goal yet.',
      socraticQuestion: isId
        ? 'Periksa urutan aksi BIT di panel Konsol atau Linimasa.'
        : 'Check BIT’s action sequence in the Console or Timeline.',
      rung: 1,
    };
  }

  const card = translatePythonError(ctx.lastError, {
    locale: ctx.locale,
    playerCode: ctx.playerCode,
    allowlist: ctx.allowlist,
    playerVariables: ctx.playerVariables,
    stepLimit: ctx.stepLimit,
    actionLimit: ctx.actionLimit,
    astReport: ctx.astReport,
  });

  return {
    source: 'curated',
    visorMood: 'concerned',
    headline: card.headline.slice(0, 90),
    body: card.body.slice(0, 240),
    socraticQuestion: card.socraticQuestion.slice(0, 120),
    highlightLines: card.highlightLines,
    rung: 1,
    errorTag: card.errorTag,
  };
}
