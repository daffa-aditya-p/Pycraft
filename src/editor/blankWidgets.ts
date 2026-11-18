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

  return spans.map((span) => {
    const mappedFrom = tr.changes.mapPos(span.from, -1);
    const mappedTo = tr.changes.mapPos(span.to, 1);
    return {
      index: span.index,
      from: Math.min(mappedFrom, mappedTo),
      to: Math.max(mappedFrom, mappedTo),
    };
  });
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
  if (!enabled) return Decoration.none;

  const docLen = state.doc.length;
  const items: Array<{ from: number; to: number; deco: Decoration }> = [];
  const trackedRanges: Array<{ from: number; to: number }> = [];

  for (const span of spans) {
    const from = Math.max(0, Math.min(span.from, docLen));
    const to = Math.max(from, Math.min(span.to, docLen));
    trackedRanges.push({ from, to });
    if (from === to) {
      items.push({
        from,
        to,
        deco: Decoration.widget({
          widget: new EmptyBlankPlaceholderWidget(span.index),
          side: 1,
        }),
      });
    } else {
      items.push({
        from,
        to,
        deco: Decoration.mark({
          class: 'cm-guided-blank',
          attributes: {
            'data-blank-index': String(span.index),
          },
        }),
      });
    }
  }

  // Also highlight any remaining unfilled `___` tokens in the document
  const docText = state.doc.toString();
  const tokenRegex = /_{3,}/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(docText)) !== null) {
    const tokenFrom = match.index;
    const tokenTo = tokenFrom + match[0].length;
    const overlapsTracked = trackedRanges.some(
      (r) =>
        (r.from === r.to && r.from >= tokenFrom && r.from <= tokenTo) ||
        (r.from < tokenTo && r.to > tokenFrom)
    );
    if (!overlapsTracked) {
      items.push({
        from: tokenFrom,
        to: tokenTo,
        deco: Decoration.mark({
          class: 'cm-guided-blank',
        }),
      });
    }
  }

  if (items.length === 0) return Decoration.none;

  items.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  let lastTo = -1;
  for (const item of items) {
    if (item.from < lastTo) continue;
    if (item.from === item.to) {
      builder.add(item.from, item.to, item.deco);
      lastTo = item.from;
    } else {
      builder.add(item.from, item.to, item.deco);
      lastTo = item.to;
    }
  }
  return builder.finish();
}

export const guidedBlanksDecorations = EditorView.decorations.compute(
  [guidedBlanksField],
  (state) => buildBlankDecorations(state)
);

/**
 * Transaction filter for Guided tier. Always allows user edits so typing on any line
 * (including Line 1 or outside blanks) is never locked out.
 */
export const guidedBlanksFilter = EditorState.transactionFilter.of((tr) => {
  return tr;
});

/**
 * Selects the full `___` token when the user clicks inside or on an unfilled blank
 * so typing immediately replaces it.
 */
export const guidedBlanksDomHandlers = EditorView.domEventHandlers({
  mouseup(event, view) {
    const { enabled } = view.state.field(guidedBlanksField);
    if (!enabled) return false;

    const sel = view.state.selection.main;
    if (!sel.empty) return false;

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;

    const line = view.state.doc.lineAt(pos);
    const localPos = pos - line.from;
    const regex = /_{3,}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line.text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      if (localPos >= matchStart && localPos <= matchEnd) {
        view.dispatch({
          selection: {
            anchor: line.from + matchStart,
            head: line.from + matchEnd,
          },
        });
        return true;
      }
    }
    return false;
  },
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
  return [
    guidedBlanksField,
    guidedBlanksDecorations,
    guidedBlanksFilter,
    guidedBlanksDomHandlers,
  ];
}
