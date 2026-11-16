import type { WorldSim } from './WorldSim.js';
import type {
  PredicateCheckDetail,
  PredicateEvaluationResult,
  ScenarioPredicate,
  WorldSimState,
} from './types.js';

export function normalizeStdoutLines(rawLines: string[]): string[] {
  const result: string[] = [];
  for (const entry of rawLines) {
    const trimmedTrailingNewline = entry.endsWith('\n')
      ? entry.slice(0, entry.endsWith('\r\n') ? -2 : -1)
      : entry;
    const parts = trimmedTrailingNewline.split(/\r?\n/);
    for (const part of parts) {
      result.push(part);
    }
  }
  return result;
}

function getPathValue(root: unknown, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

function evaluateSinglePredicate(
  state: WorldSimState,
  lines: string[],
  joinedStdout: string,
  warnings: string[],
  predicate: ScenarioPredicate,
): PredicateCheckDetail {
  switch (predicate.type) {
    case 'stdout_non_empty': {
      const nonEmpty = lines.filter((l) => l.trim().length > 0);
      const min = predicate.minLines ?? 1;
      const passed = nonEmpty.length >= min;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : { reason: `Expected at least ${min} non-empty stdout line(s), got ${nonEmpty.length}` }),
      };
    }

    case 'stdout_line_count': {
      const count = lines.length;
      if (predicate.exact !== undefined && count !== predicate.exact) {
        return {
          predicate,
          passed: false,
          reason: `Expected exactly ${predicate.exact} stdout line(s), got ${count}`,
        };
      }
      if (predicate.min !== undefined && count < predicate.min) {
        return {
          predicate,
          passed: false,
          reason: `Expected at least ${predicate.min} stdout line(s), got ${count}`,
        };
      }
      if (predicate.max !== undefined && count > predicate.max) {
        return {
          predicate,
          passed: false,
          reason: `Expected at most ${predicate.max} stdout line(s), got ${count}`,
        };
      }
      return { predicate, passed: true };
    }

    case 'stdout_contains': {
      const haystack = predicate.caseInsensitive
        ? joinedStdout.toLowerCase()
        : joinedStdout;
      const needle = predicate.caseInsensitive
        ? predicate.text.toLowerCase()
        : predicate.text;
      const passed = haystack.includes(needle);
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : { reason: `Expected stdout to contain "${predicate.text}"` }),
      };
    }

    case 'stdout_not_contains': {
      const haystack = predicate.caseInsensitive
        ? joinedStdout.toLowerCase()
        : joinedStdout;
      const needle = predicate.caseInsensitive
        ? predicate.text.toLowerCase()
        : predicate.text;
      const passed = !haystack.includes(needle);
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : { reason: `Expected stdout NOT to contain "${predicate.text}"` }),
      };
    }

    case 'stdout_tokens_in_order': {
      const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
      const haystack = predicate.caseInsensitive
        ? collapse(joinedStdout).toLowerCase()
        : collapse(joinedStdout);
      let cursor = 0;
      for (const rawToken of predicate.tokens) {
        const token = predicate.caseInsensitive
          ? collapse(rawToken).toLowerCase()
          : collapse(rawToken);
        const idx = haystack.indexOf(token, cursor);
        if (idx === -1) {
          return {
            predicate,
            passed: false,
            reason: `Expected token "${rawToken}" in order in stdout`,
          };
        }
        cursor = idx + token.length;
      }
      return { predicate, passed: true };
    }

    case 'stdout_matches_regex': {
      const re = new RegExp(predicate.pattern, predicate.flags);
      const passed = re.test(joinedStdout);
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : { reason: `Expected stdout to match /${predicate.pattern}/${predicate.flags ?? ''}` }),
      };
    }

    case 'stdout_equals_lines': {
      const norm = (s: string) => (predicate.trim !== false ? s.trim() : s);
      const actual = lines.map(norm);
      const expected = predicate.lines.map(norm);
      const passed =
        actual.length === expected.length &&
        actual.every((line, i) => line === expected[i]);
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected stdout lines [${expected.join(', ')}], got [${actual.join(', ')}]`,
            }),
      };
    }

    case 'robot_at': {
      const zOk = predicate.z === undefined || state.robot.z === predicate.z;
      const passed =
        state.robot.x === predicate.x && state.robot.y === predicate.y && zOk;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected robot at (${predicate.x}, ${predicate.y}${
                predicate.z !== undefined ? `, ${predicate.z}` : ''
              }), got (${state.robot.x}, ${state.robot.y}, ${state.robot.z})`,
            }),
      };
    }

    case 'robot_facing': {
      const passed = state.robot.facing === predicate.facing;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected robot facing ${predicate.facing}, got ${state.robot.facing}`,
            }),
      };
    }

    case 'robot_say_equals': {
      const actual = state.robot.sayHistory;
      const expected = predicate.expected;
      const passed = predicate.exact !== false
        ? actual.length === expected.length &&
          actual.every((v, i) => v === expected[i])
        : expected.every((v) => actual.includes(v));
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected robot.say history [${expected.join(', ')}], got [${actual.join(', ')}]`,
            }),
      };
    }

    case 'robot_say_contains': {
      const passed = state.robot.sayHistory.some((s) => s.includes(predicate.text));
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : { reason: `Expected robot.say history to contain "${predicate.text}"` }),
      };
    }

    case 'robot_cargo_at_least': {
      const actual = state.robot.cargo[predicate.item] ?? 0;
      const passed = actual >= predicate.count;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected at least ${predicate.count} "${predicate.item}" in cargo, got ${actual}`,
            }),
      };
    }

    case 'bridge_complete': {
      const exactOk =
        !predicate.requireExactLength ||
        state.bridge.builtLength === state.bridge.gapLength;
      const passed = state.bridge.complete && exactOk;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected bridge complete (${state.bridge.builtLength}/${state.bridge.gapLength}, complete=${state.bridge.complete})`,
            }),
      };
    }

    case 'gate_is_open': {
      const passed = state.gate.isOpen === predicate.expected;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected gate.isOpen=${predicate.expected}, got ${state.gate.isOpen}`,
            }),
      };
    }

    case 'gate_light': {
      const passed = state.gate.lightColor === predicate.expected;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected gate light "${predicate.expected}", got "${state.gate.lightColor}"`,
            }),
      };
    }

    case 'farm_planted_count': {
      if (
        predicate.exact !== undefined &&
        state.farm.plantedCount !== predicate.exact
      ) {
        return {
          predicate,
          passed: false,
          reason: `Expected plantedCount=${predicate.exact}, got ${state.farm.plantedCount}`,
        };
      }
      if (predicate.min !== undefined && state.farm.plantedCount < predicate.min) {
        return {
          predicate,
          passed: false,
          reason: `Expected plantedCount >= ${predicate.min}, got ${state.farm.plantedCount}`,
        };
      }
      if (predicate.allSoilPlanted) {
        const remainingSoil = state.cells.filter((c) => c.kind === 'soil').length;
        if (remainingSoil > 0) {
          return {
            predicate,
            passed: false,
            reason: `Expected all soil cells planted, but ${remainingSoil} soil cell(s) remain`,
          };
        }
      }
      return { predicate, passed: true };
    }

    case 'cell_check': {
      if (
        predicate.x < 0 ||
        predicate.x >= state.width ||
        predicate.y < 0 ||
        predicate.y >= state.height
      ) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) is out of bounds`,
        };
      }
      const cell = state.cells[predicate.y * state.width + predicate.x];
      if (!cell) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) does not exist`,
        };
      }
      if (predicate.kind !== undefined && cell.kind !== predicate.kind) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) expected kind "${predicate.kind}", got "${cell.kind}"`,
        };
      }
      if (
        predicate.stackHeight !== undefined &&
        cell.stackHeight !== predicate.stackHeight
      ) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) expected stackHeight ${predicate.stackHeight}, got ${cell.stackHeight}`,
        };
      }
      if (
        predicate.minStackHeight !== undefined &&
        cell.stackHeight < predicate.minStackHeight
      ) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) expected stackHeight >= ${predicate.minStackHeight}, got ${cell.stackHeight}`,
        };
      }
      if (
        predicate.blockType !== undefined &&
        cell.blockType !== predicate.blockType
      ) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) expected blockType "${predicate.blockType}", got "${String(cell.blockType)}"`,
        };
      }
      if (
        predicate.cropType !== undefined &&
        cell.cropType !== predicate.cropType
      ) {
        return {
          predicate,
          passed: false,
          reason: `Cell (${predicate.x}, ${predicate.y}) expected cropType "${predicate.cropType}", got "${String(cell.cropType)}"`,
        };
      }
      return { predicate, passed: true };
    }

    case 'cells_match_blueprint': {
      for (const spec of predicate.cells) {
        const sub = evaluateSinglePredicate(state, lines, joinedStdout, warnings, {
          type: 'cell_check',
          ...spec,
        });
        if (!sub.passed) {
          return {
            predicate,
            passed: false,
            reason: sub.reason,
          };
        }
      }
      return { predicate, passed: true };
    }

    case 'depot_delivered': {
      if (state.depot.delivered !== predicate.expected) {
        return {
          predicate,
          passed: false,
          reason: `Expected depot.delivered=${predicate.expected}, got ${state.depot.delivered}`,
        };
      }
      if (
        predicate.item !== undefined &&
        state.depot.requestedItem !== predicate.item
      ) {
        return {
          predicate,
          passed: false,
          reason: `Expected depot item "${predicate.item}", got "${String(state.depot.requestedItem)}"`,
        };
      }
      if (
        predicate.amount !== undefined &&
        state.depot.requestedAmount !== predicate.amount
      ) {
        return {
          predicate,
          passed: false,
          reason: `Expected depot amount ${predicate.amount}, got ${state.depot.requestedAmount}`,
        };
      }
      return { predicate, passed: true };
    }

    case 'altar_active': {
      if (state.altar.active !== predicate.expected) {
        return {
          predicate,
          passed: false,
          reason: `Expected altar.active=${predicate.expected}, got ${state.altar.active}`,
        };
      }
      if (
        predicate.cells !== undefined &&
        state.altar.activatedCells !== predicate.cells
      ) {
        return {
          predicate,
          passed: false,
          reason: `Expected altar.activatedCells=${predicate.cells}, got ${state.altar.activatedCells}`,
        };
      }
      return { predicate, passed: true };
    }

    case 'no_warnings': {
      const allowed = new Set(predicate.allowedCodes ?? []);
      const disallowed = warnings.filter((w) => !allowed.has(w));
      const passed = disallowed.length === 0;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : { reason: `Disallowed warnings occurred: ${disallowed.join(', ')}` }),
      };
    }

    case 'custom_state_check': {
      const actual = getPathValue(state, predicate.path);
      const passed = actual === predicate.equals;
      return {
        predicate,
        passed,
        ...(passed
          ? {}
          : {
              reason: `Expected state.${predicate.path}=${String(predicate.equals)}, got ${String(actual)}`,
            }),
      };
    }
  }
}

export function evaluateScenarioPredicates(
  sim: WorldSim,
  stdoutLines: string[],
  predicates: ScenarioPredicate[],
  warnings: string[] = [],
): PredicateEvaluationResult {
  const state = sim.getStateRef();
  const lines = normalizeStdoutLines(stdoutLines);
  const joinedStdout = lines.join('\n');

  const details: PredicateCheckDetail[] = predicates.map((p) =>
    evaluateSinglePredicate(state, lines, joinedStdout, warnings, p),
  );

  const failedReasons = details
    .filter((d) => !d.passed && d.reason !== undefined)
    .map((d) => d.reason as string);

  return {
    passed: details.every((d) => d.passed),
    details,
    failedReasons,
  };
}
