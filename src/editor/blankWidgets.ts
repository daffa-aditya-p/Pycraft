import {
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
  type Transaction,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view';

export interface BlankRange {
  index: number;
  from: number;
  to: number;
  line: number;
  placeholder: string;
}

export interface ParsedBlankTemplate {
  code: string;
  blanks: BlankRange[];
}

const BLANK_TOKEN_REGEX = /_{3,}/g;

/**
 * Parses a Guided-tier template string and locates all `___` blank tokens.
 */
export function parseBlankTemplate(template: string): ParsedBlankTemplate {
  const blanks: BlankRange[] = [];
  const lines = template.split('\n');
  let offset = 0;
  let blankIndex = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx] ?? '';
    BLANK_TOKEN_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BLANK_TOKEN_REGEX.exec(lineText)) !== null) {
      const from = offset + match.index;
      const to = from + match[0].length;
      blanks.push({
        index: blankIndex++,
        from,
        to,
        line: lineIdx + 1,
        placeholder: match[0],
      });
    }
    offset += lineText.length + 1; // +1 for '\n'
  }

  return { code: template, blanks };
}

export interface BlankSpan {
  index: number;
  from: number;
  to: number;
}

export interface GuidedBlanksState {
  enabled: boolean;
  spans: BlankSpan[];
}

export const setGuidedBlanksEffect = StateEffect.define<{
  enabled: boolean;
  spans: BlankSpan[];
}>();

class EmptyBlankPlaceholderWidget extends WidgetType {
  constructor(readonly blankIndex: number) {
    super();
  }

  eq(other: EmptyBlankPlaceholderWidget): boolean {
    return other.blankIndex === this.blankIndex;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-guided-blank-empty';
    span.setAttribute('data-blank-index', String(this.blankIndex));
    span.textContent = '___';
    return span;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function applyChangesToSpans(spans: BlankSpan[], tr: Transaction): BlankSpan[] {
  if (!tr.docChanged || spans.length === 0) return spans;

  const updated = spans.map((s) => ({ ...s }));
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const delta = inserted.length - (toA - fromA);
    let matchedIdx = -1;
    for (let i = 0; i < updated.length; i++) {
      const span = updated[i];
      if (span && fromA >= span.from && toA <= span.to) {
        matchedIdx = i;
        break;
      }
    }
    if (matchedIdx !== -1) {
      const matched = updated[matchedIdx];
      if (matched) {
        matched.to += delta;
      }
      for (let j = matchedIdx + 1; j < updated.length; j++) {
        const nextSpan = updated[j];
        if (nextSpan) {
          nextSpan.from += delta;
          nextSpan.to += delta;
        }
      }
    }
  });
  return updated;
}

export const guidedBlanksField = StateField.define<GuidedBlanksState>({
  create() {
    return { enabled: false, spans: [] };
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGuidedBlanksEffect)) {
        return {
          enabled: effect.value.enabled,
          spans: effect.value.spans.map((s) => ({ ...s })),
        };
      }
    }
    if (!value.enabled) return value;
    if (tr.docChanged) {
      return {
        enabled: value.enabled,
        spans: applyChangesToSpans(value.spans, tr),
      };
    }
    return value;
  },
});

function buildBlankDecorations(state: EditorState): DecorationSet {
  const { enabled, spans } = state.field(guidedBlanksField);
  if (!enabled || spans.length === 0) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  const docLen = state.doc.length;

  for (const span of spans) {
    const from = Math.max(0, Math.min(span.from, docLen));
    const to = Math.max(from, Math.min(span.to, docLen));
    if (from === to) {
      builder.add(
        from,
        from,
        Decoration.widget({
          widget: new EmptyBlankPlaceholderWidget(span.index),
          side: 1,
        })
      );
    } else {
      builder.add(
        from,
        to,
        Decoration.mark({
          class: 'cm-guided-blank',
          attributes: {
            'data-blank-index': String(span.index),
          },
        })
      );
    }
  }
  return builder.finish();
}

export const guidedBlanksDecorations = EditorView.decorations.compute(
  [guidedBlanksField],
  (state) => buildBlankDecorations(state)
);

/**
 * Transaction filter that keeps boilerplate read-only in Guided tier while allowing
 * full typing, selection replacement, and OS copy/paste inside blank spans.
 */
export const guidedBlanksFilter = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr;
  // Bypass when replacing the entire template programmatically
  if (tr.effects.some((e) => e.is(setGuidedBlanksEffect))) {
    return tr;
  }

  const { enabled, spans } = tr.startState.field(guidedBlanksField);
  if (!enabled) return tr;

  // Validate against evolving spans across multi-part changes
  const simSpans = spans.map((s) => ({ ...s }));
  let allInsideBlanks = true;

  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (!allInsideBlanks) return;
    let matchedIdx = -1;
    for (let i = 0; i < simSpans.length; i++) {
      const span = simSpans[i];
      if (span && fromA >= span.from && toA <= span.to) {
        matchedIdx = i;
        break;
      }
    }
    if (matchedIdx === -1) {
      allInsideBlanks = false;
      return;
    }
    const delta = inserted.length - (toA - fromA);
    const matched = simSpans[matchedIdx];
    if (matched) {
      matched.to += delta;
    }
    for (let j = matchedIdx + 1; j < simSpans.length; j++) {
      const nextSpan = simSpans[j];
      if (nextSpan) {
        nextSpan.from += delta;
        nextSpan.to += delta;
      }
    }
  });

  if (!allInsideBlanks) {
    return [];
  }
  return tr;
});

/**
 * Moves cursor to the next Guided blank (wrapping around) and selects `___` if still unfilled.
 */
export function focusNextGuidedBlank(view: EditorView): boolean {
  const { enabled, spans } = view.state.field(guidedBlanksField);
  if (!enabled || spans.length === 0) return false;

  const head = view.state.selection.main.head;
  const next = spans.find((s) => s.from > head) ?? spans[0];
  if (!next) return false;
  const text = view.state.doc.sliceString(next.from, next.to);
  const selectAll = /^_{3,}$/.test(text);
  view.dispatch({
    selection: {
      anchor: next.from,
      head: selectAll ? next.to : next.to,
    },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

export function guidedBlanksExtension(): Extension {
  return [guidedBlanksField, guidedBlanksDecorations, guidedBlanksFilter];
}
