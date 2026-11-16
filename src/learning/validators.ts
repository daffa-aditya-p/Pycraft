import type {
  ASTConstructName,
  ASTRuleFailure,
  ASTTrapWarning,
  ASTValidationReport,
  ASTValidationRules,
  CommentToken,
  FunctionTestResult,
  ScenarioResult,
  ScenarioSpec,
} from '../runtime/protocol';

type ScenarioPredicate = ScenarioSpec['predicates'][number];
import { evaluateScenarioPredicates } from '../sim/predicates';
import type { WorldSim } from '../sim/WorldSim';
import type { Locale } from '../mentor/types';

export type ExtendedConstructRule =
  | ASTConstructName
  | 'Elif'
  | 'Else'
  | 'NestedIf'
  | 'NestedLoop'
  | 'Continue'
  | 'NameArg:move'
  | 'ReassignVar'
  | 'DefaultArg'
  | 'NotOp';

export interface StepASTValidationRules extends ASTValidationRules {
  requireExtendedConstructs?: ExtendedConstructRule[];
  exactPrintCalls?: number;
}

export interface StepValidationInput {
  stepId: string;
  code: string;
  locale: Locale;
  rules?: StepASTValidationRules;
  workerAstReport?: ASTValidationReport;
  scenarioResults?: ScenarioResult[];
  functionTests?: FunctionTestResult[];
  expectedScenarioCount?: number;
}

export interface Stage1InspectionResult {
  passed: boolean;
  comments: CommentToken[];
  mixedTabsSpaces: boolean;
  traps: ASTTrapWarning[];
  syntaxErrorMessage?: { id: string; en: string };
  line?: number;
}

export interface Stage2InspectionResult {
  passed: boolean;
  failures: ASTRuleFailure[];
}

export interface ValidationPipelineResult {
  passed: boolean;
  stageFailed: 1 | 2 | 3 | 4 | null;
  stage1: Stage1InspectionResult;
  stage2: Stage2InspectionResult;
  scenarioResults: ScenarioResult[];
  functionTests: FunctionTestResult[];
  passedScenarios: number;
  totalScenarios: number;
  summaryBadge: string;
  firstFailedScenarioId?: string;
  feedback?: { id: string; en: string };
  printInsteadOfReturnDetected: boolean;
}

const KNOWN_ZERO_ARG_METHODS = [
  'gate.open',
  'gate.close',
  'gate.is_open',
  'robot.can_move',
  'robot.front',
  'robot.scan',
  'robot.measure',
  'robot.next_row',
  'robot.facing',
  'sensor.read',
  'scale.read',
];

/**
 * Pure-TS Stage 1 lexical & structural analyzer mirroring CPython `tokenize` + `ast` rules.
 * Used when evaluating locally in unit tests or enriching worker AST reports.
 */
export function inspectPythonSourceTS(code: string): {
  comments: CommentToken[];
  mixedTabsSpaces: boolean;
  statementLines: number;
  printCalls: number;
  inputCalls: number;
  constructs: Set<ExtendedConstructRule>;
  definedFunctions: string[];
  traps: ASTTrapWarning[];
  syntaxOk: boolean;
  syntaxLine?: number;
  syntaxMsg?: string;
} {
  const comments: CommentToken[] = [];
  const traps: ASTTrapWarning[] = [];
  const constructs = new Set<ExtendedConstructRule>();
  const definedFunctions: string[] = [];
  const assignedVars = new Map<string, number>();

  let hasLeadingTabs = false;
  let hasLeadingSpaces = false;
  let statementLines = 0;
  let printCalls = 0;
  let inputCalls = 0;
  let syntaxOk = true;
  let syntaxLine: number | undefined;
  let syntaxMsg: string | undefined;

  const lines = code.split(/\r?\n/);
  const blockStack: Array<{ indent: number; kind: 'for' | 'while' | 'if' | 'def' | 'other' }> = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const rawLine = lines[idx] ?? '';

    const leadingMatch = rawLine.match(/^([ \t]*)/);
    const leading = leadingMatch?.[1] ?? '';
    if (leading.includes('\t')) hasLeadingTabs = true;
    if (leading.includes(' ')) hasLeadingSpaces = true;
    const indent = leading.replace(/\t/g, '    ').length;

    // Lex line character by character to separate code from # comments (RC-01)
    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    let commentStart = -1;

    for (let c = 0; c < rawLine.length; c++) {
      const ch = rawLine[c]!;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && (inSingle || inDouble)) {
        escaped = true;
        continue;
      }
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
      } else if (ch === '#' && !inSingle && !inDouble) {
        commentStart = c;
        break;
      }
    }

    if (inSingle || inDouble) {
      syntaxOk = false;
      syntaxLine = syntaxLine ?? lineNum;
      syntaxMsg = syntaxMsg ?? 'unterminated string literal';
    }

    if (commentStart >= 0) {
      comments.push({
        line: lineNum,
        col: commentStart,
        text: rawLine.slice(commentStart),
      });
    }

    const codePart = (commentStart >= 0 ? rawLine.slice(0, commentStart) : rawLine).trim();
    if (codePart.length === 0) {
      continue;
    }

    statementLines++;

    while (blockStack.length > 0 && blockStack[blockStack.length - 1]!.indent >= indent) {
      blockStack.pop();
    }

    // Count print() and input() calls outside comments
    const printMatches = codePart.match(/\bprint\s*\(/g);
    if (printMatches) printCalls += printMatches.length;

    const inputMatches = codePart.match(/\binput\s*\(/g);
    if (inputMatches) inputCalls += inputMatches.length;

    // Check uncalled known methods (e.g., `robot.move` or `gate.open` without `()`)
    for (const methodName of KNOWN_ZERO_ARG_METHODS) {
      const escapedName = methodName.replace('.', '\\.');
      const re = new RegExp(`^${escapedName}\\s*$`);
      if (re.test(codePart)) {
        traps.push({
          kind: 'uncalled_method',
          line: lineNum,
          col: indent,
          expr: methodName,
          msg: `Missing parentheses on ${methodName}()`,
        });
      }
    }
    if (/^robot\.move\s*$/.test(codePart)) {
      traps.push({
        kind: 'uncalled_method',
        line: lineNum,
        col: indent,
        expr: 'robot.move',
        msg: 'Missing parentheses on robot.move()',
      });
    }

    // Check `=` inside `if` / `elif` / `while` condition
    if (/^(if|elif|while)\b/.test(codePart)) {
      const condBody = codePart.replace(/^(if|elif|while)\b/, '').replace(/:\s*$/, '');
      if (/(?<![=!<>])=(?!=)/.test(condBody)) {
        traps.push({
          kind: 'assign_in_if',
          line: lineNum,
          col: indent,
          msg: 'Assignment = used inside condition',
        });
        syntaxOk = false;
        syntaxLine = syntaxLine ?? lineNum;
        syntaxMsg = syntaxMsg ?? "invalid syntax. Maybe you meant '=='";
      }
      if (!codePart.endsWith(':')) {
        syntaxOk = false;
        syntaxLine = syntaxLine ?? lineNum;
        syntaxMsg = syntaxMsg ?? "expected ':'";
      }
    }

    if (/^(for|def|else)\b/.test(codePart) && !codePart.endsWith(':')) {
      syntaxOk = false;
      syntaxLine = syntaxLine ?? lineNum;
      syntaxMsg = syntaxMsg ?? "expected ':'";
    }

    // Construct detection
    if (/^for\b/.test(codePart)) {
      if (blockStack.some((b) => b.kind === 'for' || b.kind === 'while')) {
        constructs.add('NestedLoop');
      }
      constructs.add('For');
      blockStack.push({ indent, kind: 'for' });
    } else if (/^while\b/.test(codePart)) {
      if (blockStack.some((b) => b.kind === 'for' || b.kind === 'while')) {
        constructs.add('NestedLoop');
      }
      constructs.add('While');
      blockStack.push({ indent, kind: 'while' });
    } else if (/^if\b/.test(codePart)) {
      if (blockStack.some((b) => b.kind === 'if')) {
        constructs.add('NestedIf');
      }
      constructs.add('If');
      blockStack.push({ indent, kind: 'if' });
    } else if (/^elif\b/.test(codePart)) {
      constructs.add('Elif');
    } else if (/^else\s*:/.test(codePart)) {
      constructs.add('Else');
    } else if (/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/.test(codePart)) {
      const m = codePart.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/);
      if (m?.[1]) {
        definedFunctions.push(m[1]);
      }
      if (m?.[2] && m[2].includes('=')) {
        constructs.add('DefaultArg');
      }
      constructs.add('FunctionDef');
      blockStack.push({ indent, kind: 'def' });
    }

    if (/^return\b/.test(codePart)) {
      constructs.add('Return');
    }
    if (/^continue\b/.test(codePart)) {
      constructs.add('Continue');
    }
    if (/\bnot\b/.test(codePart)) {
      constructs.add('NotOp');
    }
    // robot.move(langkah) where argument is a variable Name rather than a literal integer
    const moveCallMatch = codePart.match(/robot\.move\(\s*([A-Za-z_]\w*)\s*\)/);
    if (moveCallMatch?.[1]) {
      constructs.add('NameArg:move');
    }

    // Track variable reassignment
    const assignMatch = codePart.match(/^([A-Za-z_]\w*)\s*=(?!=)/);
    if (assignMatch?.[1]) {
      const varName = assignMatch[1];
      const prev = assignedVars.get(varName) ?? 0;
      assignedVars.set(varName, prev + 1);
      if (prev + 1 >= 2) {
        constructs.add('ReassignVar');
      }
    }
  }

  return {
    comments,
    mixedTabsSpaces: hasLeadingTabs && hasLeadingSpaces,
    statementLines,
    printCalls,
    inputCalls,
    constructs,
    definedFunctions,
    traps,
    syntaxOk,
    ...(syntaxLine !== undefined ? { syntaxLine } : {}),
    ...(syntaxMsg !== undefined ? { syntaxMsg } : {}),
  };
}

export function evaluateStage1(
  code: string,
  rules?: StepASTValidationRules,
  workerAstReport?: ASTValidationReport
): Stage1InspectionResult {
  const tsCheck = inspectPythonSourceTS(code);
  const comments = workerAstReport?.comments ?? tsCheck.comments;
  const mixedTabsSpaces = workerAstReport?.mixedTabsSpaces ?? tsCheck.mixedTabsSpaces;
  const traps = workerAstReport?.traps ?? tsCheck.traps;

  if (workerAstReport?.syntaxError) {
    return {
      passed: false,
      comments,
      mixedTabsSpaces,
      traps,
      line: workerAstReport.syntaxError.line ?? 1,
      syntaxErrorMessage: {
        id: workerAstReport.syntaxError.msg,
        en: workerAstReport.syntaxError.msg,
      },
    };
  }

  if (!workerAstReport && !tsCheck.syntaxOk) {
    return {
      passed: false,
      comments,
      mixedTabsSpaces,
      traps,
      line: tsCheck.syntaxLine ?? 1,
      syntaxErrorMessage: {
        id: tsCheck.syntaxMsg ?? 'SyntaxError pada kode Python.',
        en: tsCheck.syntaxMsg ?? 'Python syntax error.',
      },
    };
  }

  if (mixedTabsSpaces) {
    return {
      passed: false,
      comments,
      mixedTabsSpaces: true,
      traps,
      syntaxErrorMessage: {
        id: 'Tab dan spasi tercampur pada indentasi. Gunakan 4 spasi secara konsisten.',
        en: 'Mixed tabs and spaces in indentation. Use 4 spaces consistently.',
      },
    };
  }

  // RC-01: tokenize.COMMENT inspection for comment-required steps (M1.3)
  const minComments = rules?.minCommentCount ?? (rules?.requireComment ? 1 : 0);
  if (minComments > 0 && comments.length < minComments) {
    return {
      passed: false,
      comments,
      mixedTabsSpaces,
      traps,
      syntaxErrorMessage: {
        id: `Tambahkan minimal ${minComments} komentar menggunakan tanda \`#\` untuk menonaktifkan baris yang salah.`,
        en: `Add at least ${minComments} \`#\` comment(s) to disable the faulty lines.`,
      },
    };
  }

  return {
    passed: true,
    comments,
    mixedTabsSpaces,
    traps,
  };
}

const CONSTRUCT_LABELS: Record<ExtendedConstructRule, { id: string; en: string }> = {
  For: { id: 'perulangan `for`', en: 'a `for` loop' },
  While: { id: 'perulangan `while`', en: 'a `while` loop' },
  If: { id: 'percabangan `if`', en: 'an `if` statement' },
  Elif: { id: 'cabang `elif`', en: 'an `elif` branch' },
  Else: { id: 'cabang `else`', en: 'an `else` branch' },
  FunctionDef: { id: 'definisi fungsi `def`', en: 'a `def` function' },
  Return: { id: 'pernyataan `return`', en: 'a `return` statement' },
  NestedIf: { id: '`if` bersarang', en: 'a nested `if`' },
  NestedLoop: { id: 'perulangan bersarang (loop di dalam loop)', en: 'nested loops' },
  Continue: { id: 'kata kunci `continue`', en: '`continue`' },
  'NameArg:move': { id: 'variabel di dalam `robot.move(...)`', en: 'a variable passed to `robot.move(...)`' },
  ReassignVar: { id: 'mengubah ulang nilai variabel yang sama', en: 'reassigning the same variable' },
  DefaultArg: { id: 'parameter dengan nilai default', en: 'default parameter values' },
  NotOp: { id: 'operator `not`', en: 'the `not` operator' },
};

export function evaluateStage2(
  code: string,
  rules?: StepASTValidationRules,
  workerAstReport?: ASTValidationReport
): Stage2InspectionResult {
  if (!rules) {
    return { passed: true, failures: [] };
  }

  const tsCheck = inspectPythonSourceTS(code);
  const failures: ASTRuleFailure[] = [];

  // Start with worker ruleFailures if provided
  if (workerAstReport?.ruleFailures && workerAstReport.ruleFailures.length > 0) {
    failures.push(...workerAstReport.ruleFailures);
  }

  const hasConstruct = (c: ExtendedConstructRule): boolean => {
    if (workerAstReport?.constructCounts && (workerAstReport.constructCounts[c] ?? 0) > 0) {
      return true;
    }
    return tsCheck.constructs.has(c);
  };

  for (const req of rules.requireConstructs ?? []) {
    if (!hasConstruct(req)) {
      const label = CONSTRUCT_LABELS[req];
      failures.push({
        rule: `require_${req}`,
        messageId: `Aksi berhasil berjalan, tetapi tantangan ini memintamu menggunakan ${label.id} agar kode ringkas.`,
        message: `Actions ran, but this challenge requires ${label.en} so your solution stays concise.`,
      });
    }
  }

  for (const req of rules.requireExtendedConstructs ?? []) {
    if (!hasConstruct(req)) {
      const label = CONSTRUCT_LABELS[req];
      failures.push({
        rule: `require_${req}`,
        messageId: `Aksi berhasil berjalan, tetapi tantangan ini memintamu menggunakan ${label.id}.`,
        message: `Actions ran, but this challenge requires ${label.en}.`,
      });
    }
  }

  for (const forbidden of rules.forbidConstructs ?? []) {
    if (hasConstruct(forbidden)) {
      const label = CONSTRUCT_LABELS[forbidden];
      failures.push({
        rule: `forbid_${forbidden}`,
        messageId: `Langkah ini tidak memperbolehkan ${label.id}.`,
        message: `This step forbids using ${label.en}.`,
      });
    }
  }

  const statementLines = workerAstReport?.statementLines ?? tsCheck.statementLines;
  if (rules.maxStatementLines !== undefined && statementLines > rules.maxStatementLines) {
    failures.push({
      rule: 'max_statement_lines',
      messageId: `Kodemu memakai ${statementLines} baris perintah. Tantangan ini membatasi maksimal ${rules.maxStatementLines} baris agar tidak diulang manual.`,
      message: `Your code uses ${statementLines} statement lines; the limit is ${rules.maxStatementLines} to avoid manual unrolling.`,
    });
  }

  const printCalls = workerAstReport?.printCalls ?? tsCheck.printCalls;
  if (rules.forbidPrint && printCalls > 0) {
    failures.push({
      rule: 'forbid_print',
      messageId: 'Jangan gunakan `print()` pada langkah ini; gunakan `return` atau API robot.',
      message: 'Do not use `print()` in this step; use `return` or the robot API.',
    });
  }
  if (rules.maxPrintCalls !== undefined && printCalls > rules.maxPrintCalls) {
    failures.push({
      rule: 'max_print_calls',
      messageId: `Tantangan ini meminta maksimal ${rules.maxPrintCalls} perintah \`print()\` (kamu memakai ${printCalls}). Gunakan \`\\n\` di dalam satu \`print\`.`,
      message: `This challenge allows at most ${rules.maxPrintCalls} \`print()\` call(s) (found ${printCalls}). Use \`\\n\` in one \`print\`.`,
    });
  }
  if (rules.exactPrintCalls !== undefined && printCalls !== rules.exactPrintCalls) {
    failures.push({
      rule: 'exact_print_calls',
      messageId: `Tantangan ini meminta tepat ${rules.exactPrintCalls} perintah \`print()\` (ditemukan ${printCalls}).`,
      message: `This challenge requires exactly ${rules.exactPrintCalls} \`print()\` call(s) (found ${printCalls}).`,
    });
  }

  const definedFns = workerAstReport?.definedFunctions ?? tsCheck.definedFunctions;
  if (rules.requireFunctionName && !definedFns.includes(rules.requireFunctionName)) {
    failures.push({
      rule: 'require_function_name',
      messageId: `Definisikan fungsi bernama \`${rules.requireFunctionName}\` dengan \`def ${rules.requireFunctionName}(...):\`.`,
      message: `Define a function named \`${rules.requireFunctionName}\` using \`def ${rules.requireFunctionName}(...):\`.`,
    });
  }

  // Deduplicate rules by rule ID
  const seen = new Set<string>();
  const deduped = failures.filter((f) => {
    if (seen.has(f.rule)) return false;
    seen.add(f.rule);
    return true;
  });

  return {
    passed: deduped.length === 0,
    failures: deduped,
  };
}

/**
 * Helper to evaluate a list of scenarios against already-executed WorldSim instances
 * (useful in deterministic unit tests and main-thread verification).
 */
export function evaluateScenariosWithWorldSim(
  scenarios: Array<{
    spec: ScenarioSpec;
    sim: WorldSim;
    stdoutLines: string[];
    warnings?: string[];
  }>
): ScenarioResult[] {
  return scenarios.map((entry, idx) => {
    const evalRes = evaluateScenarioPredicates(
      entry.sim,
      entry.stdoutLines,
      entry.spec.predicates,
      entry.warnings ?? []
    );
    return {
      scenarioId: entry.spec.id,
      label: entry.spec.label,
      visible: idx === 0,
      passed: evalRes.passed,
      failedReasons: evalRes.failedReasons,
      stdout: entry.stdoutLines,
      warnings: entry.warnings ?? [],
      finalStateHash: entry.sim.computeStateHash(),
      actionsExecuted: 0,
    };
  });
}

/**
 * Full 4-Stage Validation Pipeline orchestrator (Master Plan Section 16.3):
 * - Stage 1: tokenize.COMMENT + syntax / mixed indentation inspection
 * - Stage 2: AST structural rules (anti-unrolling / anti-hardcoding)
 * - Stage 3: Visible scenario (scenarios[0]) predicate evaluation
 * - Stage 4: Hidden scenarios (scenarios[1..k]) + function return unit tests
 */
export function evaluateValidationPipeline(input: StepValidationInput): ValidationPipelineResult {
  const isId = input.locale === 'id';
  const stage1 = evaluateStage1(input.code, input.rules, input.workerAstReport);
  const stage2 = evaluateStage2(input.code, input.rules, input.workerAstReport);

  const scenarios = input.scenarioResults ?? [];
  const fnTests = input.functionTests ?? [];

  const totalScenarios = Math.max(scenarios.length, input.expectedScenarioCount ?? scenarios.length);
  const passedScenarios = scenarios.filter((s) => s.passed).length;
  const summaryBadge = isId
    ? `Skenario ${passedScenarios}/${totalScenarios} ${passedScenarios === totalScenarios && totalScenarios > 0 ? '✓' : '✕'}`
    : `Scenarios ${passedScenarios}/${totalScenarios} ${passedScenarios === totalScenarios && totalScenarios > 0 ? '✓' : '✕'}`;

  const printInsteadOfReturnDetected =
    fnTests.some((t) => t.printedInsteadOfReturned || (!t.passed && t.actualReturn === null)) ||
    Boolean(input.workerAstReport?.traps?.some((t) => t.kind === 'print_instead_of_return'));

  // Stage 1 check
  if (!stage1.passed) {
    return {
      passed: false,
      stageFailed: 1,
      stage1,
      stage2,
      scenarioResults: scenarios,
      functionTests: fnTests,
      passedScenarios,
      totalScenarios,
      summaryBadge,
      feedback: stage1.syntaxErrorMessage,
      printInsteadOfReturnDetected,
    };
  }

  // Stage 3: Visible scenario must pass
  const visibleScenario = scenarios.find((s) => s.visible) ?? scenarios[0];
  if (visibleScenario && !visibleScenario.passed) {
    const reason = visibleScenario.failedReasons[0] ?? '';
    return {
      passed: false,
      stageFailed: 3,
      stage1,
      stage2,
      scenarioResults: scenarios,
      functionTests: fnTests,
      passedScenarios,
      totalScenarios,
      summaryBadge,
      firstFailedScenarioId: visibleScenario.scenarioId,
      feedback: {
        id: `Skenario utama belum sesuai target${reason ? `: ${reason}` : '.'}`,
        en: `Visible scenario did not meet all goals${reason ? `: ${reason}` : '.'}`,
      },
      printInsteadOfReturnDetected,
    };
  }

  // Stage 4a: Hidden scenarios
  const failedHidden = scenarios.find((s) => !s.visible && !s.passed);
  if (failedHidden) {
    const label = failedHidden.label ?? failedHidden.scenarioId;
    const reason = failedHidden.failedReasons[0] ?? '';
    return {
      passed: false,
      stageFailed: 4,
      stage1,
      stage2,
      scenarioResults: scenarios,
      functionTests: fnTests,
      passedScenarios,
      totalScenarios,
      summaryBadge,
      firstFailedScenarioId: failedHidden.scenarioId,
      feedback: {
        id: `Skenario '${label}' gagal${reason ? `: ${reason}` : '.'} Klik "Lihat skenario ini" untuk memutarnya di dunia 3D.`,
        en: `Hidden scenario '${label}' failed${reason ? `: ${reason}` : '.'} Click "Watch this scenario" to replay it in 3D.`,
      },
      printInsteadOfReturnDetected,
    };
  }

  // Stage 4b: Function unit tests (M5.3 return vs print)
  const failedFn = fnTests.find((t) => !t.passed);
  if (failedFn) {
    return {
      passed: false,
      stageFailed: 4,
      stage1,
      stage2,
      scenarioResults: scenarios,
      functionTests: fnTests,
      passedScenarios,
      totalScenarios,
      summaryBadge,
      feedback: printInsteadOfReturnDetected
        ? {
            id: `Fungsi \`${failedFn.fnName}\` hanya mencetak hasil dengan \`print()\` dan mengembalikan \`None\`. Gunakan \`return\` untuk mengembalikan ${String(failedFn.expectedReturn)}.`,
            en: `Function \`${failedFn.fnName}\` printed instead of returning a value (returned \`None\`). Use \`return\` to return ${String(failedFn.expectedReturn)}.`,
          }
        : {
            id: `Uji fungsi \`${failedFn.fnName}(${failedFn.args.map(String).join(', ')})\` mengharapkan nilai kembali \`${String(failedFn.expectedReturn)}\`, tetapi mendapat \`${String(failedFn.actualReturn)}\`.`,
            en: `Function test \`${failedFn.fnName}(${failedFn.args.map(String).join(', ')})\` expected \`${String(failedFn.expectedReturn)}\`, got \`${String(failedFn.actualReturn)}\`.`,
          },
      printInsteadOfReturnDetected,
    };
  }

  // Stage 2: AST structural rules (anti-hardcoding / anti-unrolling)
  if (!stage2.passed) {
    const firstFailure = stage2.failures[0]!;
    return {
      passed: false,
      stageFailed: 2,
      stage1,
      stage2,
      scenarioResults: scenarios,
      functionTests: fnTests,
      passedScenarios,
      totalScenarios,
      summaryBadge,
      feedback: {
        id: firstFailure.messageId,
        en: firstFailure.message,
      },
      printInsteadOfReturnDetected,
    };
  }

  return {
    passed: true,
    stageFailed: null,
    stage1,
    stage2,
    scenarioResults: scenarios,
    functionTests: fnTests,
    passedScenarios,
    totalScenarios,
    summaryBadge,
    printInsteadOfReturnDetected,
  };
}

export function formatPredicateFeedback(
  predicates: ScenarioPredicate[],
  failedReasons: string[],
  locale: Locale
): string {
  if (failedReasons.length === 0 && predicates.length > 0) {
    return locale === 'id' ? 'Semua syarat skenario terpenuhi.' : 'All scenario predicates passed.';
  }
  return failedReasons[0] ?? (locale === 'id' ? 'Skenario belum terpenuhi.' : 'Scenario not satisfied.');
}
