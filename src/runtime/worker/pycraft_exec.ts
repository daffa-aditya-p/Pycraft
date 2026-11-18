import {
  WorldSim,
  evaluateScenarioPredicates,
  SimValidationError,
} from '../../sim/index.js';
import type {
  CommandResult,
  ScenarioPredicate,
  SimCommandKind,
  WorldSimInit,
} from '../../sim/types.js';

/**
 * Adapts visible scenario predicates so user-entered `input()` answers (e.g. "Heri")
 * replace placeholder `scriptedInputs` strings ("Rara") while hidden scenarios keep strict checks.
 */
export function adaptVisiblePredicatesForInput(
  predicates: ScenarioPredicate[],
  scriptedInputs?: string[],
  inputAnswers?: string[],
): ScenarioPredicate[] {
  if (!scriptedInputs || scriptedInputs.length === 0 || !inputAnswers || inputAnswers.length === 0) {
    return predicates;
  }
  const replacements: Array<[string, string]> = [];
  for (let i = 0; i < scriptedInputs.length; i++) {
    const scriptedVal = scriptedInputs[i];
    const userVal = inputAnswers[i];
    if (
      scriptedVal &&
      typeof userVal === 'string' &&
      userVal.length > 0 &&
      userVal !== scriptedVal
    ) {
      replacements.push([scriptedVal, userVal]);
    }
  }
  if (replacements.length === 0) return predicates;

  const replaceAllPairs = (str: string): string => {
    let out = str;
    for (const [from, to] of replacements) {
      out = out.split(from).join(to);
    }
    return out;
  };
  return predicates.map((pred) => {
    if (pred.type === 'stdout_contains') {
      return { ...pred, text: replaceAllPairs(pred.text) };
    }
    if (pred.type === 'stdout_equals_lines') {
      return { ...pred, lines: pred.lines.map(replaceAllPairs) };
    }
    if (pred.type === 'stdout_tokens_in_order') {
      return { ...pred, tokens: pred.tokens.map(replaceAllPairs) };
    }
    return pred;
  });
}
import {
  DEFAULT_RUNTIME_LIMITS,
  type ASTValidationReport,
  type ASTValidationRules,
  type FunctionTestResult,
  type FunctionTestSpec,
  type PyErrorInfo,
  type RunEvent,
  type RunStatus,
  type RuntimeLimits,
  type ScenarioResult,
  type ScenarioSpec,
} from '../protocol.js';

export interface PyodideLike {
  version?: string;
  globals: {
    get(name: string): unknown;
    set(name: string, value: unknown): void;
  };
  runPython(code: string): unknown;
  runPythonAsync?(code: string): Promise<unknown>;
  setInterruptBuffer?(buffer: Int32Array): void;
  _module?: {
    HEAPU8?: {
      byteLength: number;
    };
  };
}

export interface PycraftExecutorHost {
  onProgress?: (
    phase: 'loading_pyodide' | 'loading_stdlib' | 'init_pycraft' | 'ready',
    pct: number,
  ) => void;
  onEvents?: (runId: string, batch: RunEvent[]) => void;
  onInputRequest?: (runId: string, prompt: string) => void;
  readInputFromSAB?: (prompt: string) => string;
  awaitAsyncInput?: (runId: string, prompt: string) => Promise<string>;
}

const KNOWN_TOP_LEVEL_CAPABILITIES = new Set([
  'print',
  'input',
  'robot',
  'bridge',
  'sensor',
  'scale',
  'gate',
  'farm',
  'depot',
  'altar',
]);

const KNOWN_CAPABILITY_PATHS = new Set([
  'print',
  'beacon.print',
  'input',
  'robot.move',
  'robot.turn',
  'robot.say',
  'robot.scan',
  'robot.measure',
  'robot.can_move',
  'robot.front',
  'robot.position',
  'robot.facing',
  'robot.plant',
  'robot.next_row',
  'robot.place_block',
  'robot.collect',
  'robot.inventory',
  'robot.count',
  'bridge.build',
  'sensor.read',
  'scale.read',
  'gate.open',
  'gate.close',
  'gate.light',
  'gate.is_open',
  'farm.rows',
  'farm.cols',
  'depot.request',
  'altar.activate',
]);

const PYCRAFT_BOOTSTRAP_PY = String.raw`
import ast
import builtins
import io
import json
import math
import random
import re
import sys
import time
import tokenize
import traceback
import types

_BLOCKED_ROOTS = frozenset({
    'js',
    'pyodide',
    'pyodide_js',
    'micropip',
    'os',
    'sys',
    'socket',
    'urllib',
    'http',
    'ctypes',
    'subprocess',
    'threading',
    'multiprocessing',
    'pathlib',
    'shutil',
    'pickle',
    'marshal',
    'importlib',
})

_KNOWN_API_METHODS = {
    'robot': {
        'move', 'turn', 'say', 'scan', 'measure', 'can_move', 'front',
        'position', 'facing', 'plant', 'next_row', 'place_block',
        'collect', 'inventory', 'count',
    },
    'bridge': {'build'},
    'sensor': {'read'},
    'scale': {'read'},
    'gate': {'open', 'close', 'light', 'is_open'},
    'depot': {'request'},
    'altar': {'activate'},
}

_KNOWN_API_ROOTS = frozenset({
    'print', 'input', 'robot', 'bridge', 'sensor', 'scale',
    'gate', 'farm', 'depot', 'altar',
})

def _caller_is_player():
    try:
        frame = sys._getframe(1)
    except ValueError:
        return False
    while frame is not None:
        if frame.f_code.co_filename == '<player>':
            return True
        frame = frame.f_back
    return False

class _PycraftImportGuard:
    def find_spec(self, fullname, path, target=None):
        root = fullname.split('.')[0]
        if root in _BLOCKED_ROOTS and _caller_is_player():
            raise ImportError(
                f"[PYCRAFT_BLOCKED_IMPORT:{fullname}] Modul '{fullname}' tidak tersedia di Pycraft."
            )
        return None

_guard_instance = _PycraftImportGuard()
sys.meta_path = [g for g in sys.meta_path if not isinstance(g, _PycraftImportGuard)]
sys.meta_path.insert(0, _guard_instance)

_orig_import = builtins.__import__

def _player_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.split('.')[0]
    if root in _BLOCKED_ROOTS:
        raise ImportError(
            f"[PYCRAFT_BLOCKED_IMPORT:{name}] Modul '{name}' tidak tersedia di Pycraft."
        )
    return _orig_import(name, globals, locals, fromlist, level)

class PycraftValueError(ValueError):
    pass

class PycraftTypeError(TypeError):
    pass

class _PycraftLimitError(Exception):
    def __init__(self, error_type, msg, line=None):
        super().__init__(msg)
        self.error_type = error_type
        self.msg = msg
        self.line = line

class _PycraftApiObject:
    pass

def _safe_repr(val, max_len=80):
    try:
        r = repr(val)
    except Exception:
        r = f"<{type(val).__name__}>"
    if len(r) > max_len:
        return r[:max_len - 3] + '...'
    return r

def _detect_mixed_tabs_spaces(code):
    has_space_indent = False
    has_tab_indent = False
    for raw_line in code.splitlines():
        if not raw_line.strip():
            continue
        indent = raw_line[:len(raw_line) - len(raw_line.lstrip(' \t'))]
        if not indent:
            continue
        if ' ' in indent and '\t' in indent:
            return True
        if '\t' in indent:
            has_tab_indent = True
        if ' ' in indent:
            has_space_indent = True
    return has_space_indent and has_tab_indent

def _detect_parent_keyword(code, lineno):
    if not lineno or lineno <= 1:
        return None
    lines = code.splitlines()
    idx = min(lineno - 2, len(lines) - 1)
    while idx >= 0:
        stripped = lines[idx].strip()
        if stripped and not stripped.startswith('#'):
            m = re.match(r'^(if|elif|else|for|while|def)\b', stripped)
            if m:
                return m.group(1)
            break
        idx -= 1
    return None

def _build_syntax_error_info(exc, code):
    err_type = type(exc).__name__
    msg = str(getattr(exc, 'msg', '') or exc)
    lineno = getattr(exc, 'lineno', None)
    offset = getattr(exc, 'offset', None)
    end_lineno = getattr(exc, 'end_lineno', None)
    end_offset = getattr(exc, 'end_offset', None)
    info = {
        'type': err_type,
        'msg': msg,
        'line': lineno,
        'col': offset,
        'endLine': end_lineno,
        'endCol': end_offset,
        'tracebackUser': [],
    }
    if err_type == 'IndentationError':
        pk = _detect_parent_keyword(code, lineno)
        if pk:
            info['parentKeyword'] = pk
    return info

def _extract_loop_ranges(tree):
    ranges = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            end_ln = getattr(node, 'end_lineno', None) or node.lineno
            ranges[node.lineno] = end_ln
    return ranges

def inspect_code(code, rules_json="{}"):
    rules = json.loads(rules_json) if rules_json else {}
    comments = []
    mixed_tabs = _detect_mixed_tabs_spaces(code)

    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type == tokenize.COMMENT:
                comments.append({
                    'line': tok.start[0],
                    'col': tok.start[1],
                    'text': tok.string,
                })
    except (tokenize.TokenError, IndentationError, TabError):
        pass

    traps = []
    if mixed_tabs:
        traps.append({
            'kind': 'mixed_tabs_spaces',
            'line': 1,
            'col': 0,
            'msg': 'Campuran tab dan spasi terdeteksi pada indentasi.',
        })

    try:
        tree = ast.parse(code, filename='<player>')
    except SyntaxError as exc:
        err_info = _build_syntax_error_info(exc, code)
        ln = err_info.get('line') or 1
        lines = code.splitlines()
        if 1 <= ln <= len(lines):
            src_line = lines[ln - 1]
            if re.match(r'^\s*(?:if|elif|while)\b.*[^=!<>]=[^=]', src_line) and '==' not in src_line:
                traps.append({
                    'kind': 'assign_in_if',
                    'line': ln,
                    'col': err_info.get('col') or 0,
                    'expr': src_line.strip(),
                    'msg': "Gunakan '==' untuk membandingkan di dalam kondisi, bukan '='.",
                })
        return json.dumps({
            'ok': False,
            'syntaxError': err_info,
            'comments': comments,
            'mixedTabsSpaces': mixed_tabs,
            'constructCounts': {'For': 0, 'While': 0, 'If': 0, 'FunctionDef': 0, 'Return': 0},
            'statementLines': 0,
            'printCalls': 0,
            'inputCalls': 0,
            'hasInputInLoop': False,
            'definedFunctions': [],
            'traps': traps,
            'ruleFailures': [],
        })

    construct_counts = {'For': 0, 'While': 0, 'If': 0, 'FunctionDef': 0, 'Return': 0}
    stmt_lines = set()
    print_calls = 0
    input_calls = 0
    has_input_in_loop = False
    defined_functions = []

    def _walk_with_loop_flag(node, in_loop):
        nonlocal print_calls, input_calls, has_input_in_loop
        if isinstance(node, ast.stmt):
            stmt_lines.add(node.lineno)
        if isinstance(node, (ast.For, ast.AsyncFor)):
            construct_counts['For'] += 1
        elif isinstance(node, ast.While):
            construct_counts['While'] += 1
        elif isinstance(node, ast.If):
            construct_counts['If'] += 1
        elif isinstance(node, ast.FunctionDef):
            construct_counts['FunctionDef'] += 1
            defined_functions.append(node.name)
        elif isinstance(node, ast.Return):
            construct_counts['Return'] += 1

        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id == 'print':
                print_calls += 1
            elif node.func.id == 'input':
                input_calls += 1
                if in_loop:
                    has_input_in_loop = True

        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Attribute):
            attr_node = node.value
            if isinstance(attr_node.value, ast.Name):
                obj_name = attr_node.value.id
                attr_name = attr_node.attr
                if obj_name in _KNOWN_API_METHODS and attr_name in _KNOWN_API_METHODS[obj_name]:
                    traps.append({
                        'kind': 'uncalled_method',
                        'line': node.lineno,
                        'col': node.col_offset,
                        'expr': f"{obj_name}.{attr_name}",
                        'msg': f"Tambahkan tanda kurung () pada {obj_name}.{attr_name}() agar dijalankan.",
                    })

        next_in_loop = in_loop or isinstance(node, (ast.For, ast.AsyncFor, ast.While))
        for child in ast.iter_child_nodes(node):
            _walk_with_loop_flag(child, next_in_loop)

    _walk_with_loop_flag(tree, False)

    rule_failures = []
    req_constructs = rules.get('requireConstructs') or []
    for c in req_constructs:
        if construct_counts.get(c, 0) == 0:
            if c == 'For':
                msg = "Tantangan ini memintamu menggunakan perulangan 'for' agar kode ringkas."
            elif c == 'While':
                msg = "Tantangan ini memintamu menggunakan perulangan 'while'."
            elif c == 'If':
                msg = "Tantangan ini memintamu menggunakan percabangan 'if'."
            elif c == 'FunctionDef':
                msg = "Tantangan ini memintamu membuat fungsi dengan 'def'."
            elif c == 'Return':
                msg = "Fungsimu harus mengembalikan nilai dengan 'return'."
            else:
                msg = f"Konstruk '{c}' diperlukan."
            rule_failures.append({
                'rule': 'requireConstructs',
                'messageId': f"missing_{c.lower()}",
                'message': msg,
            })

    forbid_constructs = rules.get('forbidConstructs') or []
    for c in forbid_constructs:
        if construct_counts.get(c, 0) > 0:
            rule_failures.append({
                'rule': 'forbidConstructs',
                'messageId': f"forbidden_{c.lower()}",
                'message': f"Konstruk '{c}' tidak diperbolehkan pada langkah ini.",
            })

    req_comment = rules.get('requireComment')
    min_comments = rules.get('minCommentCount')
    if req_comment or (min_comments is not None and min_comments > 0):
        needed = min_comments if min_comments is not None else 1
        if len(comments) < needed:
            rule_failures.append({
                'rule': 'requireComment',
                'messageId': 'missing_comment',
                'message': f"Tambahkan minimal {needed} komentar dengan tanda '#'.",
            })

    max_stmt = rules.get('maxStatementLines')
    if max_stmt is not None and len(stmt_lines) > max_stmt:
        rule_failures.append({
            'rule': 'maxStatementLines',
            'messageId': 'too_many_statements',
            'message': f"Kode maksimal {max_stmt} baris pernyataan (saat ini {len(stmt_lines)} baris).",
        })

    max_prints = rules.get('maxPrintCalls')
    if max_prints is not None and print_calls > max_prints:
        rule_failures.append({
            'rule': 'maxPrintCalls',
            'messageId': 'too_many_prints',
            'message': f"Maksimal {max_prints} pemanggilan print() pada langkah ini.",
        })

    if rules.get('forbidPrint') and print_calls > 0:
        rule_failures.append({
            'rule': 'forbidPrint',
            'messageId': 'forbidden_print',
            'message': "Jangan gunakan print() pada langkah ini.",
        })

    req_fn = rules.get('requireFunctionName')
    if req_fn and req_fn not in defined_functions:
        rule_failures.append({
            'rule': 'requireFunctionName',
            'messageId': 'missing_function_name',
            'message': f"Buat fungsi bernama '{req_fn}' dengan 'def {req_fn}(...):'.",
        })

    ok = len(rule_failures) == 0
    return json.dumps({
        'ok': ok,
        'comments': comments,
        'mixedTabsSpaces': mixed_tabs,
        'constructCounts': construct_counts,
        'statementLines': len(stmt_lines),
        'printCalls': print_calls,
        'inputCalls': input_calls,
        'hasInputInLoop': has_input_in_loop,
        'definedFunctions': defined_functions,
        'traps': traps,
        'ruleFailures': rule_failures,
    })

class _FrameState:
    __slots__ = ('frame_id', 'fn', 'depth', 'pending_line', 'last_locals', 'loop_counters')
    def __init__(self, frame_id, fn, depth):
        self.frame_id = frame_id
        self.fn = fn
        self.depth = depth
        self.pending_line = None
        self.last_locals = {}
        self.loop_counters = {}

def _current_player_line():
    try:
        frame = sys._getframe(1)
    except ValueError:
        return 1
    while frame is not None:
        if frame.f_code.co_filename == '<player>':
            return frame.f_lineno
        frame = frame.f_back
    return 1

class _PycraftTracer:
    def __init__(self, emit_fn, trace_full, max_lines, max_actions, timeout_ms, loop_ranges, skip_names):
        self.emit_fn = emit_fn
        self.trace_full = trace_full
        self.max_lines = max_lines
        self.max_actions = max_actions
        self.timeout_ms = timeout_ms
        self.loop_ranges = loop_ranges
        self.skip_names = skip_names
        self.frame_stack = []
        self.line_count = 0
        self.action_count = 0
        self.start_time = time.monotonic()
        self.input_wait_ms = 0.0

    def check_limits(self, line):
        elapsed_ms = (time.monotonic() - self.start_time) * 1000.0 - self.input_wait_ms
        if elapsed_ms > self.timeout_ms:
            raise _PycraftLimitError(
                'TimeoutError',
                f"Program berhenti karena melebihi batas waktu {int(self.timeout_ms)} ms.",
                line,
            )
        if self.line_count >= self.max_lines:
            raise _PycraftLimitError(
                'TooManySteps',
                f"Program berjalan lebih dari {self.max_lines} langkah.",
                line,
            )

    def increment_action(self):
        line = _current_player_line()
        self.check_limits(line)
        self.action_count += 1
        if self.action_count > self.max_actions:
            raise _PycraftLimitError(
                'ActionLimit',
                f"Jumlah aksi melebihi batas {self.max_actions} aksi.",
                line,
            )
        return line

    def _find_frame_state(self, frame):
        fid = id(frame)
        for fs in reversed(self.frame_stack):
            if fs.frame_id == fid:
                return fs
        return None

    def flush_frame(self, fs, frame, next_line=None):
        if fs.pending_line is None:
            return
        pline = fs.pending_line
        curr_vars = {}
        for k, v in list(frame.f_locals.items()):
            if k.startswith('_') or k in self.skip_names:
                continue
            if isinstance(v, (types.ModuleType, types.FunctionType, types.BuiltinFunctionType, types.MethodType, type, _PycraftApiObject)):
                continue
            curr_vars[k] = (type(v).__name__, _safe_repr(v, 80))

        changes = []
        scope = 'global' if fs.fn == '<module>' else 'local'
        for k, pair in curr_vars.items():
            if fs.last_locals.get(k) != pair:
                changes.append({
                    'scope': scope,
                    'name': k,
                    'typeName': pair[0],
                    'repr': pair[1],
                })
        for k in list(fs.last_locals.keys()):
            if k not in curr_vars:
                changes.append({
                    'scope': scope,
                    'name': k,
                    'typeName': 'deleted',
                    'repr': '',
                    'deleted': True,
                })
        if changes:
            self.emit_fn({
                'type': 'vars',
                'line': pline,
                'changes': changes,
            })
        fs.last_locals = curr_vars

        if pline in self.loop_ranges:
            loop_end = self.loop_ranges[pline]
            if next_line is not None and pline < next_line <= loop_end:
                cnt = fs.loop_counters.get(pline, 0) + 1
                fs.loop_counters[pline] = cnt
                self.emit_fn({
                    'type': 'loop',
                    'line': pline,
                    'iteration': cnt,
                })
            else:
                cnt = fs.loop_counters.get(pline, 0)
                if cnt > 0:
                    self.emit_fn({
                        'type': 'loop',
                        'line': pline,
                        'iteration': cnt,
                        'done': True,
                    })
                    fs.loop_counters[pline] = 0

        if next_line is not None:
            for hdr in list(fs.loop_counters.keys()):
                cnt = fs.loop_counters[hdr]
                if cnt > 0 and hdr != pline:
                    end_ln = self.loop_ranges.get(hdr, hdr)
                    if next_line > end_ln or next_line < hdr:
                        self.emit_fn({
                            'type': 'loop',
                            'line': hdr,
                            'iteration': cnt,
                            'done': True,
                        })
                        fs.loop_counters[hdr] = 0

        fs.pending_line = None

    def trace_fn(self, frame, event, arg):
        if frame.f_code.co_filename != '<player>':
            return None

        if event == 'call':
            fn = frame.f_code.co_name
            depth = len(self.frame_stack) + 1
            fs = _FrameState(id(frame), fn, depth)
            self.frame_stack.append(fs)
            if self.trace_full and fn != '<module>':
                code_obj = frame.f_code
                arg_names = code_obj.co_varnames[:code_obj.co_argcount]
                args_repr = [_safe_repr(frame.f_locals.get(n), 40) for n in arg_names]
                caller_line = (
                    frame.f_back.f_lineno
                    if frame.f_back and frame.f_back.f_code.co_filename == '<player>'
                    else frame.f_lineno
                )
                self.emit_fn({
                    'type': 'call',
                    'line': caller_line,
                    'fn': fn,
                    'argsRepr': args_repr,
                    'frameDepth': depth,
                })
            return self.trace_fn

        if event == 'line':
            self.line_count += 1
            lineno = frame.f_lineno
            self.check_limits(lineno)
            if not self.trace_full:
                return self.trace_fn
            fs = self._find_frame_state(frame)
            if fs is None:
                fs = _FrameState(id(frame), frame.f_code.co_name, len(self.frame_stack) + 1)
                self.frame_stack.append(fs)
            self.flush_frame(fs, frame, next_line=lineno)
            self.emit_fn({
                'type': 'line',
                'line': lineno,
                'frameDepth': fs.depth,
                'fn': fs.fn,
            })
            fs.pending_line = lineno
            return self.trace_fn

        if event == 'return':
            fs = self._find_frame_state(frame)
            if fs is not None:
                if self.trace_full:
                    self.flush_frame(fs, frame, next_line=None)
                    if fs.fn != '<module>':
                        self.emit_fn({
                            'type': 'return',
                            'line': frame.f_lineno,
                            'fn': fs.fn,
                            'returnRepr': _safe_repr(arg, 80),
                            'frameDepth': fs.depth,
                        })
                if fs in self.frame_stack:
                    self.frame_stack.remove(fs)
            return None

        if event == 'exception':
            fs = self._find_frame_state(frame)
            if fs is not None and self.trace_full:
                self.flush_frame(fs, frame, next_line=None)
            return self.trace_fn

        return self.trace_fn

def _build_runtime_error_info(exc):
    tb_list = traceback.extract_tb(exc.__traceback__)
    user_frames = []
    err_line = None
    err_col = None
    for f in tb_list:
        if f.filename == '<player>':
            user_frames.append(f"Baris {f.lineno} di {f.name}: {f.line or ''}")
            err_line = f.lineno
            err_col = getattr(f, 'colno', None)

    if isinstance(exc, _PycraftLimitError):
        return {
            'type': exc.error_type,
            'msg': exc.msg,
            'line': exc.line or err_line or 1,
            'col': 0,
            'tracebackUser': user_frames,
        }

    err_type = type(exc).__name__
    msg = str(exc)
    if isinstance(exc, SyntaxError):
        err_line = getattr(exc, 'lineno', err_line)
        err_col = getattr(exc, 'offset', err_col)
        msg = str(getattr(exc, 'msg', '') or exc)

    info = {
        'type': err_type,
        'msg': msg,
        'line': err_line,
        'col': err_col,
        'tracebackUser': user_frames,
    }

    locked_match = re.match(r'^\[PYCRAFT_LOCKED:([^\]]+)\]\s*(.*)$', msg)
    if locked_match:
        cap = locked_match.group(1)
        info['lockedCapability'] = cap
        info['msg'] = locked_match.group(2) or msg
        if '.' in cap:
            obj_name, attr_name = cap.split('.', 1)
            info['objectName'] = obj_name
            info['attributeName'] = attr_name
            info['offendingName'] = attr_name
        else:
            info['offendingName'] = cap
        return info

    blocked_match = re.match(r'^\[PYCRAFT_BLOCKED_IMPORT:([^\]]+)\]\s*(.*)$', msg)
    if blocked_match:
        info['offendingName'] = blocked_match.group(1)
        info['msg'] = blocked_match.group(2) or msg
        return info

    if err_type == 'NameError':
        m = re.search(r"name '([^']+)'", msg)
        if m:
            name = m.group(1)
            info['offendingName'] = name
            if name in _KNOWN_API_ROOTS:
                info['lockedCapability'] = name
    elif err_type == 'AttributeError':
        m = re.search(r"'([^']+)' object has no attribute '([^']+)'", msg)
        if m:
            info['attributeName'] = m.group(2)
            info['offendingName'] = m.group(2)
    elif err_type == 'KeyError':
        info['offendingValue'] = msg.strip("'\"")
    elif err_type in ('ValueError', 'PycraftValueError'):
        m = re.search(r"invalid literal for int\(\) with base \d+: '([^']*)'", msg)
        if m:
            info['offendingValue'] = m.group(1)

    return info

def _make_locked_attr_error(obj_name, attr_name):
    cap = f"{obj_name}.{attr_name}"
    return AttributeError(
        f"[PYCRAFT_LOCKED:{cap}] '{obj_name}' object has no attribute '{attr_name}'"
    )

class Robot(_PycraftApiObject):
    def __init__(self, bridge, allowed_methods):
        self._bridge = bridge
        self._allowed = allowed_methods

    def _require(self, method):
        if method not in self._allowed:
            attr = method.split('.', 1)[1] if '.' in method else method
            raise _make_locked_attr_error('robot', attr)

    def _int_arg(self, val, name):
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            raise PycraftTypeError(f"{name} must be an integer")
        if isinstance(val, float):
            if val.is_integer():
                self._bridge.emit_warning(
                    'whole_float_arg',
                    {'value': str(val), 'intValue': int(val)},
                    _current_player_line(),
                )
                return int(val)
            raise PycraftValueError(f"{name} must be a whole integer")
        return val

    def move(self, steps=1):
        self._require('robot.move')
        return self._bridge.call('robot.move', [self._int_arg(steps, 'steps')])

    def turn(self, direction):
        self._require('robot.turn')
        return self._bridge.call('robot.turn', [direction])

    def say(self, value):
        self._require('robot.say')
        return self._bridge.call('robot.say', [str(value)])

    def scan(self):
        self._require('robot.scan')
        return self._bridge.call('robot.scan', [])

    def measure(self):
        self._require('robot.measure')
        return self._bridge.call('robot.measure', [])

    def can_move(self):
        self._require('robot.can_move')
        return self._bridge.call('robot.can_move', [])

    def front(self):
        self._require('robot.front')
        return self._bridge.call('robot.front', [])

    def position(self):
        self._require('robot.position')
        return tuple(self._bridge.query('robot.position'))

    def facing(self):
        self._require('robot.facing')
        return self._bridge.call('robot.facing', [])

    def plant(self, seed):
        self._require('robot.plant')
        return self._bridge.call('robot.plant', [seed])

    def next_row(self):
        self._require('robot.next_row')
        return self._bridge.call('robot.next_row', [])

    def place_block(self, block):
        self._require('robot.place_block')
        return self._bridge.call('robot.place_block', [block])

    def collect(self, item):
        self._require('robot.collect')
        return self._bridge.call('robot.collect', [item])

    def inventory(self):
        self._require('robot.inventory')
        return dict(self._bridge.query('robot.inventory'))

    def count(self, item):
        self._require('robot.count')
        return self._bridge.call('robot.count', [item])

    def __getattr__(self, attr):
        if attr in _KNOWN_API_METHODS['robot'] and f"robot.{attr}" not in self._allowed:
            raise _make_locked_attr_error('robot', attr)
        raise AttributeError(f"'robot' object has no attribute '{attr}'")

class _BridgeApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    def build(self, length):
        if 'bridge.build' not in self._allowed:
            raise _make_locked_attr_error('bridge', 'build')
        if isinstance(length, bool) or not isinstance(length, (int, float)):
            raise PycraftTypeError("length must be an integer")
        if isinstance(length, float):
            if length.is_integer():
                self._bridge.emit_warning('whole_float_arg', {'value': str(length), 'intValue': int(length)}, _current_player_line())
                length = int(length)
            else:
                raise PycraftValueError("length must be a whole integer")
        return self._bridge.call('bridge.build', [length])

    def __getattr__(self, attr):
        if attr in _KNOWN_API_METHODS['bridge']:
            raise _make_locked_attr_error('bridge', attr)
        raise AttributeError(f"'bridge' object has no attribute '{attr}'")

class _SensorApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    def read(self):
        if 'sensor.read' not in self._allowed:
            raise _make_locked_attr_error('sensor', 'read')
        return self._bridge.call('sensor.read', [])

class _ScaleApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    def read(self):
        if 'scale.read' not in self._allowed:
            raise _make_locked_attr_error('scale', 'read')
        return self._bridge.call('scale.read', [])

class _GateApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    def open(self):
        if 'gate.open' not in self._allowed:
            raise _make_locked_attr_error('gate', 'open')
        return self._bridge.call('gate.open', [])

    def close(self):
        if 'gate.close' not in self._allowed:
            raise _make_locked_attr_error('gate', 'close')
        return self._bridge.call('gate.close', [])

    def light(self, color):
        if 'gate.light' not in self._allowed:
            raise _make_locked_attr_error('gate', 'light')
        return self._bridge.call('gate.light', [color])

    def is_open(self):
        if 'gate.is_open' not in self._allowed:
            raise _make_locked_attr_error('gate', 'is_open')
        return self._bridge.call('gate.is_open', [])

    def __getattr__(self, attr):
        if attr in _KNOWN_API_METHODS['gate']:
            raise _make_locked_attr_error('gate', attr)
        raise AttributeError(f"'gate' object has no attribute '{attr}'")

class _FarmApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    @property
    def rows(self):
        if 'farm.rows' not in self._allowed:
            raise _make_locked_attr_error('farm', 'rows')
        return int(self._bridge.query('farm.rows'))

    @property
    def cols(self):
        if 'farm.cols' not in self._allowed:
            raise _make_locked_attr_error('farm', 'cols')
        return int(self._bridge.query('farm.cols'))

class _DepotApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    def request(self, item, amount):
        if 'depot.request' not in self._allowed:
            raise _make_locked_attr_error('depot', 'request')
        if isinstance(amount, bool) or not isinstance(amount, (int, float)):
            raise PycraftTypeError("amount must be an integer")
        if isinstance(amount, float):
            if amount.is_integer():
                self._bridge.emit_warning('whole_float_arg', {'value': str(amount), 'intValue': int(amount)}, _current_player_line())
                amount = int(amount)
            else:
                raise PycraftValueError("amount must be a whole integer")
        return self._bridge.call('depot.request', [item, amount])

class _AltarApi(_PycraftApiObject):
    def __init__(self, bridge, allowed):
        self._bridge = bridge
        self._allowed = allowed

    def activate(self, cells):
        if 'altar.activate' not in self._allowed:
            raise _make_locked_attr_error('altar', 'activate')
        if isinstance(cells, bool) or not isinstance(cells, (int, float)):
            raise PycraftTypeError("cells must be an integer")
        if isinstance(cells, float):
            if cells.is_integer():
                self._bridge.emit_warning('whole_float_arg', {'value': str(cells), 'intValue': int(cells)}, _current_player_line())
                cells = int(cells)
            else:
                raise PycraftValueError("cells must be a whole integer")
        return self._bridge.call('altar.activate', [cells])

class _StdoutRedirector:
    def __init__(self, on_write, max_stdout_bytes, max_print_bytes, bridge=None, beacon_print=False):
        self._on_write = on_write
        self._max_stdout_bytes = max_stdout_bytes
        self._max_print_bytes = max_print_bytes
        self._total_bytes = 0
        self._truncated = False
        self._bridge = bridge
        self._beacon_print = beacon_print
        self._line_buf = ''

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        if not s:
            return 0
        if self._truncated:
            return len(s)
        encoded = s.encode('utf-8', errors='replace')
        if len(encoded) > self._max_print_bytes:
            s = encoded[:self._max_print_bytes].decode('utf-8', errors='ignore') + '...(terpotong)'
            encoded = s.encode('utf-8', errors='replace')
        if self._total_bytes + len(encoded) > self._max_stdout_bytes:
            remaining = max(0, self._max_stdout_bytes - self._total_bytes)
            partial = encoded[:remaining].decode('utf-8', errors='ignore')
            self._total_bytes = self._max_stdout_bytes
            self._truncated = True
            self._on_write(partial + '\n[Output dipotong: batas 64 KB tercapai]', True)
            return len(s)
        self._total_bytes += len(encoded)
        self._on_write(s, False)
        if self._beacon_print and self._bridge is not None:
            self._line_buf += s
            while '\n' in self._line_buf:
                line, self._line_buf = self._line_buf.split('\n', 1)
                self._bridge.call_internal('beacon.print', [line])
        return len(s)

    def flush(self):
        if self._beacon_print and self._bridge is not None and self._line_buf:
            self._bridge.call_internal('beacon.print', [self._line_buf])
            self._line_buf = ''

def _build_player_builtins(allow_print, allow_input, input_fn):
    safe_builtins = {}
    for k, v in builtins.__dict__.items():
        if k in ('__import__', 'open', 'eval', 'exec', 'compile', 'breakpoint', 'exit', 'quit', 'input', 'print'):
            continue
        safe_builtins[k] = v
    safe_builtins['__import__'] = _player_import
    if allow_print:
        safe_builtins['print'] = builtins.print
    if allow_input and input_fn is not None:
        safe_builtins['input'] = input_fn
    return safe_builtins

class _BridgeAdapter:
    def __init__(self, js_bridge, tracer):
        self._js = js_bridge
        self._tracer = tracer

    def call(self, kind, args):
        line = self._tracer.increment_action()
        res_json = self._js.executeCommand(kind, json.dumps(args), line)
        res = json.loads(res_json)
        if not res.get('ok', True):
            err_code = res.get('errorCode', 'VALUE_ERROR')
            err_msg = res.get('errorMessage', 'Invalid argument')
            if err_code == 'TYPE_ERROR':
                raise PycraftTypeError(err_msg)
            raise PycraftValueError(err_msg)
        return res.get('returnValue')

    def call_internal(self, kind, args):
        line = _current_player_line()
        self._js.executeCommand(kind, json.dumps(args), line)

    def query(self, key):
        return json.loads(self._js.queryState(key))

    def emit_warning(self, code, params, line):
        self._js.emitWarning(code, json.dumps(params), line)

_last_exec_globals = None

def execute_scenario(code, config_json, js_bridge):
    global _last_exec_globals
    cfg = json.loads(config_json)
    trace_full = bool(cfg.get('traceFull', True))
    capabilities = set(cfg.get('capabilities') or [])
    seed = int(cfg.get('seed', 1))
    max_lines = int(cfg.get('maxLineEvents', 20000))
    max_actions = int(cfg.get('maxActions', 500))
    timeout_ms = float(cfg.get('timeoutMs', 5000))
    max_stdout = int(cfg.get('maxStdoutBytes', 65536))
    max_print = int(cfg.get('maxPrintBytes', 4096))
    recursion_limit = int(cfg.get('recursionLimit', 200))
    input_queue = list(cfg.get('inputAnswers') or [])
    use_sab_input = bool(cfg.get('useSabInput', False))
    beacon_print = bool(cfg.get('beaconPrint', False))

    random.seed(seed)
    sys.setrecursionlimit(max(50, recursion_limit))

    tree = ast.parse(code, filename='<player>')
    loop_ranges = _extract_loop_ranges(tree)

    def _emit_trace(ev):
        js_bridge.emitTraceEvent(json.dumps(ev))

    skip_names = set(_KNOWN_API_ROOTS) | {'Robot'}
    tracer = _PycraftTracer(
        _emit_trace,
        trace_full,
        max_lines,
        max_actions,
        timeout_ms,
        loop_ranges,
        skip_names,
    )
    adapter = _BridgeAdapter(js_bridge, tracer)

    def _player_input(prompt=""):
        prompt_str = str(prompt) if prompt is not None else ""
        if prompt_str:
            sys.stdout.write(prompt_str)
        t0 = time.monotonic()
        try:
            if use_sab_input:
                ans = js_bridge.requestInputSync(prompt_str)
                return str(ans)
            if not input_queue:
                raise EOFError("EOF when reading a line")
            ans = str(input_queue.pop(0))
            return ans
        finally:
            tracer.input_wait_ms += (time.monotonic() - t0) * 1000.0

    allow_print = 'print' in capabilities or len(capabilities) == 0
    allow_input = 'input' in capabilities
    exec_globals = {
        '__name__': '__main__',
        '__builtins__': _build_player_builtins(allow_print, allow_input, _player_input if allow_input else None),
    }

    roots = {c.split('.')[0] for c in capabilities}
    if 'robot' in roots:
        exec_globals['robot'] = Robot(adapter, capabilities)
    if 'bridge' in roots:
        exec_globals['bridge'] = _BridgeApi(adapter, capabilities)
    if 'sensor' in roots:
        exec_globals['sensor'] = _SensorApi(adapter, capabilities)
    if 'scale' in roots:
        exec_globals['scale'] = _ScaleApi(adapter, capabilities)
    if 'gate' in roots:
        exec_globals['gate'] = _GateApi(adapter, capabilities)
    if 'farm' in roots:
        exec_globals['farm'] = _FarmApi(adapter, capabilities)
    if 'depot' in roots:
        exec_globals['depot'] = _DepotApi(adapter, capabilities)
    if 'altar' in roots:
        exec_globals['altar'] = _AltarApi(adapter, capabilities)

    def _on_stdout(text, truncated):
        js_bridge.emitStdout(text, bool(truncated))

    redirector = _StdoutRedirector(
        _on_stdout,
        max_stdout,
        max_print,
        bridge=adapter,
        beacon_print=beacon_print,
    )

    old_stdout = sys.stdout
    old_stderr = sys.stderr
    compiled = compile(tree, '<player>', 'exec')
    status = 'ok'
    error_info = None

    try:
        sys.stdout = redirector
        sys.stderr = redirector
        sys.settrace(tracer.trace_fn)
        exec(compiled, exec_globals, exec_globals)
    except KeyboardInterrupt:
        status = 'stopped'
        error_info = {
            'type': 'KeyboardInterrupt',
            'msg': 'Eksekusi dihentikan oleh pengguna.',
            'line': _current_player_line(),
            'col': 0,
            'tracebackUser': [],
        }
    except _PycraftLimitError as lim:
        status = 'limit'
        error_info = _build_runtime_error_info(lim)
    except BaseException as exc:
        status = 'error'
        error_info = _build_runtime_error_info(exc)
    finally:
        sys.settrace(None)
        if trace_full:
            while tracer.frame_stack:
                fs = tracer.frame_stack.pop()
                # pending_line already flushed on exception/return; only flush if dangling
                fs.pending_line = None
        redirector.flush()
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    _last_exec_globals = exec_globals
    return json.dumps({
        'status': status,
        'error': error_info,
        'actionsExecuted': tracer.action_count,
        'lineEvents': tracer.line_count,
    })

def run_function_tests(tests_json):
    global _last_exec_globals
    tests = json.loads(tests_json)
    results = []
    ns = _last_exec_globals or {}
    for t in tests:
        tid = t['id']
        fn_name = t['fnName']
        args = t.get('args') or []
        expected = t.get('expectedReturn')
        fn = ns.get(fn_name)
        if not callable(fn):
            results.append({
                'testId': tid,
                'fnName': fn_name,
                'args': args,
                'expectedReturn': expected,
                'actualReturn': None,
                'passed': False,
                'error': f"Fungsi '{fn_name}' tidak ditemukan.",
            })
            continue
        buf = io.StringIO()
        old_stdout = sys.stdout
        try:
            sys.stdout = buf
            actual = fn(*args)
            printed = buf.getvalue().strip()
            printed_instead = (actual is None) and (len(printed) > 0)
            passed = (actual == expected) and (type(actual) is type(expected) or (isinstance(actual, (int, float)) and isinstance(expected, (int, float)) and not isinstance(actual, bool) and not isinstance(expected, bool)))
            results.append({
                'testId': tid,
                'fnName': fn_name,
                'args': args,
                'expectedReturn': expected,
                'actualReturn': actual,
                'passed': bool(passed),
                'printedInsteadOfReturned': bool(printed_instead),
            })
        except Exception as exc:
            results.append({
                'testId': tid,
                'fnName': fn_name,
                'args': args,
                'expectedReturn': expected,
                'actualReturn': None,
                'passed': False,
                'error': f"{type(exc).__name__}: {exc}",
            })
        finally:
            sys.stdout = old_stdout
    return json.dumps(results)
`;

export interface LoadedStepState {
  stepId: string;
  capabilities: string[];
  scenarios: ScenarioSpec[];
  limits: RuntimeLimits;
  astRules?: ASTValidationRules;
  functionTests?: FunctionTestSpec[];
}

export class PycraftExecutor {
  private pyodide: PyodideLike | null = null;
  private host: PycraftExecutorHost;
  private step: LoadedStepState | null = null;
  private sim: WorldSim | null = null;
  private useSabInput = false;
  private activeRunId: string | null = null;
  private stopRequested = false;

  constructor(host: PycraftExecutorHost = {}) {
    this.host = host;
  }

  getPyodide(): PyodideLike | null {
    return this.pyodide;
  }

  isReady(): boolean {
    return this.pyodide !== null;
  }

  getHeapBytes(): number {
    return this.pyodide?._module?.HEAPU8?.byteLength ?? 0;
  }

  requestStop(runId?: string): void {
    if (!runId || this.activeRunId === runId) {
      this.stopRequested = true;
    }
  }

  async init(options: {
    pyodideBase?: string;
    interruptSAB?: SharedArrayBuffer;
    hasInputSAB?: boolean;
  } = {}): Promise<{ pyodideVersion: string; isolated: boolean; heapBytes: number }> {
    this.host.onProgress?.('loading_pyodide', 15);
    const pyodide = await loadPyodideInstance(options.pyodideBase);
    this.host.onProgress?.('loading_stdlib', 55);

    if (options.interruptSAB && typeof pyodide.setInterruptBuffer === 'function') {
      pyodide.setInterruptBuffer(new Int32Array(options.interruptSAB));
    }
    this.useSabInput = Boolean(options.hasInputSAB && this.host.readInputFromSAB);

    this.host.onProgress?.('init_pycraft', 80);
    pyodide.runPython(PYCRAFT_BOOTSTRAP_PY);
    this.pyodide = pyodide;

    const version =
      pyodide.version ??
      String(pyodide.runPython("import sys; f'{sys.version_info.major}.{sys.version_info.minor}'"));
    const heapBytes = this.getHeapBytes();
    this.host.onProgress?.('ready', 100);

    return {
      pyodideVersion: version,
      isolated: Boolean(options.interruptSAB),
      heapBytes,
    };
  }

  loadStep(step: {
    stepId: string;
    capabilities: string[];
    scenarios: ScenarioSpec[];
    limits?: Partial<RuntimeLimits>;
    astRules?: ASTValidationRules;
    functionTests?: FunctionTestSpec[];
  }): void {
    this.step = {
      stepId: step.stepId,
      capabilities: [...step.capabilities],
      scenarios: step.scenarios,
      limits: {
        ...DEFAULT_RUNTIME_LIMITS,
        ...(step.limits ?? {}),
      },
      astRules: step.astRules,
      functionTests: step.functionTests,
    };
  }

  inspectSyntax(code: string, astRules?: ASTValidationRules): ASTValidationReport {
    if (!this.pyodide) {
      throw new Error('Pyodide is not initialized');
    }
    const fn = this.pyodide.globals.get('inspect_code') as (
      c: string,
      r: string,
    ) => string;
    const raw = fn(code, JSON.stringify(astRules ?? {}));
    return JSON.parse(raw) as ASTValidationReport;
  }

  run(params: {
    runId: string;
    code: string;
    traceLevel: 'full' | 'none';
    inputAnswers?: string[];
    visibleScenarioIndex?: number;
  }): {
    status: RunStatus;
    error?: PyErrorInfo;
    scenarioResults: ScenarioResult[];
    astReport: ASTValidationReport;
    functionTests: FunctionTestResult[];
    finalStateHash: string;
    heapBytes: number;
    memoryExceeded: boolean;
  } {
    if (!this.pyodide) {
      throw new Error('Pyodide is not initialized');
    }
    if (!this.step || this.step.scenarios.length === 0) {
      throw new Error('No step/scenarios loaded in PycraftExecutor');
    }

    const step = this.step;
    const limits = step.limits;
    this.activeRunId = params.runId;
    this.stopRequested = false;

    const codeBytes = new TextEncoder().encode(params.code).byteLength;
    if (codeBytes > limits.maxCodeBytes) {
      const err: PyErrorInfo = {
        type: 'SyntaxError',
        msg: `Kode terlalu panjang (${codeBytes} byte; maksimal ${limits.maxCodeBytes} byte).`,
        line: 1,
        col: 0,
        tracebackUser: [],
      };
      const emptyAst: ASTValidationReport = {
        ok: false,
        syntaxError: err,
        comments: [],
        mixedTabsSpaces: false,
        constructCounts: { For: 0, While: 0, If: 0, FunctionDef: 0, Return: 0 },
        statementLines: 0,
        printCalls: 0,
        inputCalls: 0,
        hasInputInLoop: false,
        definedFunctions: [],
        traps: [],
        ruleFailures: [],
      };
      const heapBytes = this.getHeapBytes();
      this.activeRunId = null;
      return {
        status: 'error',
        error: err,
        scenarioResults: [],
        astReport: emptyAst,
        functionTests: [],
        finalStateHash: '',
        heapBytes,
        memoryExceeded: heapBytes > limits.maxHeapBytes,
      };
    }

    const astReport = this.inspectSyntax(params.code, step.astRules);
    if (astReport.syntaxError) {
      if (params.traceLevel === 'full') {
        this.emitSingleBatch(params.runId, [
          { seq: 1, type: 'error', error: astReport.syntaxError },
        ]);
      }
      const heapBytes = this.getHeapBytes();
      this.activeRunId = null;
      return {
        status: 'error',
        error: astReport.syntaxError,
        scenarioResults: [],
        astReport,
        functionTests: [],
        finalStateHash: '',
        heapBytes,
        memoryExceeded: heapBytes > limits.maxHeapBytes,
      };
    }

    const visibleIdx = Math.max(
      0,
      Math.min(params.visibleScenarioIndex ?? 0, step.scenarios.length - 1),
    );
    const visibleScenario = step.scenarios[visibleIdx]!;

    // Stage 3: Execute visible scenario
    const visibleExec = this.executeSingleScenario({
      runId: params.runId,
      code: params.code,
      scenario: visibleScenario,
      visible: true,
      traceFull: params.traceLevel === 'full',
      capabilities: step.capabilities,
      stepId: step.stepId,
      limits,
      inputAnswers: params.inputAnswers ?? visibleScenario.scriptedInputs ?? [],
      useSabInput: this.useSabInput && params.traceLevel === 'full',
    });

    // Run optional function unit tests against the visible scenario's globals
    let functionTestResults: FunctionTestResult[] = [];
    if (
      step.functionTests &&
      step.functionTests.length > 0 &&
      visibleExec.status === 'ok'
    ) {
      const runFnTests = this.pyodide.globals.get('run_function_tests') as (
        testsJson: string,
      ) => string;
      const rawTests = runFnTests(JSON.stringify(step.functionTests));
      functionTestResults = JSON.parse(rawTests) as FunctionTestResult[];
    }

    const scenarioResults: Array<{ index: number; result: ScenarioResult }> = [
      { index: visibleIdx, result: visibleExec.scenarioResult },
    ];

    // Stage 4: Run hidden scenarios untraced if visible execution succeeded without error
    if (visibleExec.status === 'ok' && !this.stopRequested) {
      for (let i = 0; i < step.scenarios.length; i++) {
        if (i === visibleIdx) continue;
        if (this.stopRequested) break;
        const hiddenScenario = step.scenarios[i]!;
        const hiddenExec = this.executeSingleScenario({
          runId: params.runId,
          code: params.code,
          scenario: hiddenScenario,
          visible: false,
          traceFull: false,
          capabilities: step.capabilities,
          stepId: step.stepId,
          limits,
          inputAnswers: hiddenScenario.scriptedInputs ?? params.inputAnswers ?? [],
          useSabInput: false,
        });
        scenarioResults.push({ index: i, result: hiddenExec.scenarioResult });
      }
    }

    scenarioResults.sort((a, b) => a.index - b.index);
    const orderedResults = scenarioResults.map((entry) => entry.result);

    const heapBytes = this.getHeapBytes();
    const memoryExceeded = heapBytes > limits.maxHeapBytes;
    this.activeRunId = null;

    return {
      status: visibleExec.status,
      ...(visibleExec.error ? { error: visibleExec.error } : {}),
      scenarioResults: orderedResults,
      astReport,
      functionTests: functionTestResults,
      finalStateHash: visibleExec.scenarioResult.finalStateHash,
      heapBytes,
      memoryExceeded,
    };
  }

  private executeSingleScenario(opts: {
    runId: string;
    code: string;
    scenario: ScenarioSpec;
    visible: boolean;
    traceFull: boolean;
    capabilities: string[];
    stepId: string;
    limits: RuntimeLimits;
    inputAnswers: string[];
    useSabInput: boolean;
  }): {
    status: RunStatus;
    error?: PyErrorInfo;
    scenarioResult: ScenarioResult;
  } {
    const pyodide = this.pyodide!;
    const sim = new WorldSim(opts.scenario.initialState);
    this.sim = sim;

    let seqCounter = 0;
    const batch: RunEvent[] = [];
    let lastFlushTime = Date.now();
    const stdoutChunks: string[] = [];
    const warningCodes: string[] = [];

    const flushBatch = (force = false) => {
      if (!opts.traceFull || batch.length === 0) {
        if (!opts.traceFull) batch.length = 0;
        return;
      }
      const now = Date.now();
      if (force || batch.length >= 64 || now - lastFlushTime >= 16) {
        this.host.onEvents?.(opts.runId, batch.splice(0, batch.length));
        lastFlushTime = now;
      }
    };

    type RunEventPayload = RunEvent extends infer T
      ? T extends RunEvent
        ? Omit<T, 'seq'>
        : never
      : never;

    const pushEvent = (ev: RunEventPayload) => {
      if (!opts.traceFull) return;
      seqCounter += 1;
      batch.push({ ...ev, seq: seqCounter } as RunEvent);
      flushBatch(false);
    };

    const jsBridge = {
      emitTraceEvent: (jsonStr: string) => {
        const parsed = JSON.parse(jsonStr) as RunEventPayload;
        pushEvent(parsed);
      },
      emitStdout: (text: string, truncated: boolean) => {
        stdoutChunks.push(text);
        pushEvent({
          type: 'stdout',
          text,
          ...(truncated ? { truncated: true } : {}),
        });
      },
      emitWarning: (code: string, paramsJson: string, line: number) => {
        warningCodes.push(code);
        const params = JSON.parse(paramsJson) as Record<string, string | number>;
        pushEvent({
          type: 'warning',
          code,
          params,
          line,
        });
      },
      requestInputSync: (prompt: string) => {
        flushBatch(true);
        this.host.onInputRequest?.(opts.runId, prompt);
        if (this.host.readInputFromSAB) {
          return this.host.readInputFromSAB(prompt);
        }
        return '';
      },
      executeCommand: (kind: string, argsJson: string, line: number) => {
        const args = JSON.parse(argsJson) as unknown[];
        try {
          const result: CommandResult = sim.executeCommand(
            kind as SimCommandKind,
            args,
          );
          if (result.warningCode) {
            warningCodes.push(result.warningCode);
          }
          pushEvent({
            type: 'action',
            kind: kind as SimCommandKind,
            args,
            result: result.returnValue,
            delta: result.delta,
            inverse: result.inverse,
            durationMs: result.durationMs,
            narrationId: result.narrationId,
            line,
            ...(result.warningCode ? { warningCode: result.warningCode } : {}),
            ...(result.warningParams ? { warningParams: result.warningParams } : {}),
          });
          if (result.warningCode) {
            pushEvent({
              type: 'warning',
              code: result.warningCode,
              ...(result.warningParams ? { params: result.warningParams } : {}),
              line,
            });
          }
          return JSON.stringify({ ok: true, returnValue: result.returnValue });
        } catch (err) {
          if (err instanceof SimValidationError) {
            return JSON.stringify({
              ok: false,
              errorCode: err.code,
              errorMessage: err.message,
            });
          }
          return JSON.stringify({
            ok: false,
            errorCode: 'VALUE_ERROR',
            errorMessage: err instanceof Error ? err.message : String(err),
          });
        }
      },
      queryState: (key: string) => {
        const state = sim.getStateRef();
        if (key === 'farm.rows') return JSON.stringify(state.farm.rows);
        if (key === 'farm.cols') return JSON.stringify(state.farm.cols);
        if (key === 'robot.position') return JSON.stringify([state.robot.x, state.robot.y]);
        if (key === 'robot.inventory') return JSON.stringify(state.robot.cargo);
        return JSON.stringify(null);
      },
    };

    const beaconPrint =
      opts.capabilities.includes('beacon.print') ||
      opts.stepId.startsWith('m1');

    const execConfig = {
      traceFull: opts.traceFull,
      capabilities: opts.capabilities,
      seed: opts.scenario.initialState.seed ?? 1,
      maxLineEvents: opts.limits.maxLineEvents,
      maxActions: opts.limits.maxActions,
      timeoutMs: opts.limits.timeoutMs,
      maxStdoutBytes: opts.limits.maxStdoutBytes,
      maxPrintBytes: opts.limits.maxPrintBytes,
      recursionLimit: opts.limits.recursionLimit,
      inputAnswers: opts.inputAnswers,
      useSabInput: opts.useSabInput,
      beaconPrint,
    };

    const executeScenarioPy = pyodide.globals.get('execute_scenario') as (
      code: string,
      cfgJson: string,
      bridge: typeof jsBridge,
    ) => string;

    const rawResult = executeScenarioPy(
      opts.code,
      JSON.stringify(execConfig),
      jsBridge,
    );
    const parsed = JSON.parse(rawResult) as {
      status: RunStatus;
      error?: PyErrorInfo | null;
      actionsExecuted: number;
      lineEvents: number;
    };

    if (parsed.error) {
      pushEvent({
        type: 'error',
        error: parsed.error,
      });
    }
    flushBatch(true);

    const joinedStdout = stdoutChunks.join('');
    const stdoutLines =
      joinedStdout.length > 0 ? joinedStdout.split(/\r?\n/) : [];
    // Remove trailing empty element produced by final print newline
    if (stdoutLines.length > 0 && stdoutLines[stdoutLines.length - 1] === '') {
      stdoutLines.pop();
    }

    const predicatesToEvaluate = opts.visible
      ? adaptVisiblePredicatesForInput(
          opts.scenario.predicates,
          opts.scenario.scriptedInputs,
          opts.inputAnswers,
        )
      : opts.scenario.predicates;

    const evalRes = evaluateScenarioPredicates(
      sim,
      stdoutLines,
      predicatesToEvaluate,
      warningCodes,
    );

    const passed = parsed.status === 'ok' && evalRes.passed;
    const failedReasons =
      parsed.error && !evalRes.failedReasons.length
        ? [`${parsed.error.type}: ${parsed.error.msg}`]
        : evalRes.failedReasons;

    const scenarioResult: ScenarioResult = {
      scenarioId: opts.scenario.id,
      ...(opts.scenario.label ? { label: opts.scenario.label } : {}),
      visible: opts.visible,
      passed,
      failedReasons,
      stdout: stdoutLines,
      warnings: warningCodes,
      finalStateHash: sim.computeStateHash(),
      actionsExecuted: parsed.actionsExecuted,
      ...(parsed.error ? { error: parsed.error } : {}),
    };

    return {
      status: parsed.status,
      ...(parsed.error ? { error: parsed.error } : {}),
      scenarioResult,
    };
  }

  private emitSingleBatch(runId: string, events: RunEvent[]): void {
    this.host.onEvents?.(runId, events);
  }

  getSimSnapshot(): WorldSimInit | null {
    return this.sim ? this.sim.getState() : null;
  }
}

export async function loadPyodideInstance(pyodideBase?: string): Promise<PyodideLike> {
  const isNodeEnv =
    typeof process !== 'undefined' &&
    Boolean(process.versions?.node) &&
    (!pyodideBase || pyodideBase === 'node');

  if (isNodeEnv) {
    const pathMod = await import(/* @vite-ignore */ 'node:path');
    const indexURL = pathMod.resolve(process.cwd(), 'node_modules/pyodide');
    const mod = (await import('pyodide')) as unknown as {
      loadPyodide: (opts?: { indexURL?: string }) => Promise<PyodideLike>;
    };
    return await mod.loadPyodide({ indexURL });
  }

  const base = (pyodideBase ?? '/pyodide').replace(/\/+$/, '');
  const mod = (await import(/* @vite-ignore */ `${base}/pyodide.mjs`)) as {
    loadPyodide: (opts: { indexURL: string }) => Promise<PyodideLike>;
  };
  return await mod.loadPyodide({ indexURL: `${base}/` });
}

export function isKnownCapability(name: string): boolean {
  return KNOWN_CAPABILITY_PATHS.has(name) || KNOWN_TOP_LEVEL_CAPABILITIES.has(name);
}
