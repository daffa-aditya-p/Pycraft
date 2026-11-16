import {
  RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
} from '@codemirror/view';

export interface LoopCounterBadge {
  line: number;
  iteration: number;
  finished?: boolean;
}

export interface ErrorLineMarker {
  line: number;
  col?: number;
  message?: string;
}

export const setExecutingLineEffect = StateEffect.define<number | null>();
export const setLoopCountersEffect = StateEffect.define<LoopCounterBadge[]>();
export const setErrorLineEffect = StateEffect.define<ErrorLineMarker | null>();
export const setHintLinesEffect = StateEffect.define<number[]>();

class LoopBadgeMarker extends GutterMarker {
  constructor(
    readonly iteration: number,
    readonly finished: boolean
  ) {
    super();
  }

  eq(other: LoopBadgeMarker): boolean {
    return this.iteration === other.iteration && this.finished === other.finished;
  }

  toDOM(): Node {
    const el = document.createElement('span');
    el.className = this.finished
      ? 'cm-loop-badge cm-loop-badge-done'
      : 'cm-loop-badge cm-loop-badge-active';
    el.textContent = this.finished ? `×${this.iteration}` : `ke-${this.iteration}`;
    el.title = this.finished
      ? `Total ${this.iteration} iterasi`
      : `Iterasi ke-${this.iteration}`;
    return el;
  }
}

class ErrorGutterMarker extends GutterMarker {
  constructor(readonly message?: string) {
    super();
  }

  eq(other: ErrorGutterMarker): boolean {
    return this.message === other.message;
  }

  toDOM(): Node {
    const el = document.createElement('span');
    el.className = 'cm-error-gutter-marker';
    el.textContent = '!';
    el.setAttribute('aria-label', this.message ?? 'Baris error');
    if (this.message) {
      el.title = this.message;
    }
    return el;
  }
}

export const executingLineField = StateField.define<number | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setExecutingLineEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

export const loopCountersField = StateField.define<LoopCounterBadge[]>({
  create() {
    return [];
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setLoopCountersEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

export const errorLineField = StateField.define<ErrorLineMarker | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setErrorLineEffect)) {
        return effect.value;
      }
    }
    if (tr.docChanged) {
      return null;
    }
    return value;
  },
});

export const hintLinesField = StateField.define<number[]>({
  create() {
    return [];
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHintLinesEffect)) {
        return effect.value;
      }
    }
    return value;
  },
});

const lineDecorationsField = EditorView.decorations.compute(
  [executingLineField, errorLineField, hintLinesField],
  (state) => {
    const execLine = state.field(executingLineField);
    const err = state.field(errorLineField);
    const hints = state.field(hintLinesField);

    const items: Array<{ from: number; to: number; dec: Decoration }> = [];

    if (execLine !== null && execLine >= 1 && execLine <= state.doc.lines) {
      const line = state.doc.line(execLine);
      items.push({
        from: line.from,
        to: line.from,
        dec: Decoration.line({ class: 'cm-executing-line' }),
      });
    }

    for (const h of hints) {
      if (h >= 1 && h <= state.doc.lines && h !== execLine) {
        const line = state.doc.line(h);
        items.push({
          from: line.from,
          to: line.from,
          dec: Decoration.line({ class: 'cm-hint-line' }),
        });
      }
    }

    if (err !== null && err.line >= 1 && err.line <= state.doc.lines) {
      const line = state.doc.line(err.line);
      items.push({
        from: line.from,
        to: line.from,
        dec: Decoration.line({ class: 'cm-error-line' }),
      });
      if (line.length > 0) {
        const startOffset =
          err.col !== undefined && err.col > 0 && err.col <= line.length
            ? err.col - 1
            : 0;
        const from = line.from + startOffset;
        const to = line.to;
        if (from < to) {
          items.push({
            from,
            to,
            dec: Decoration.mark({ class: 'cm-error-squiggle' }),
          });
        }
      }
    }

    items.sort((a, b) => a.from - b.from || a.to - b.to);
    const builder = new RangeSetBuilder<Decoration>();
    for (const item of items) {
      builder.add(item.from, item.to, item.dec);
    }
    return builder.finish();
  }
);

const statusGutter = gutter({
  class: 'cm-pycraft-status-gutter',
  markers(view) {
    const loops = view.state.field(loopCountersField);
    const err = view.state.field(errorLineField);
    const entries: Array<{ pos: number; marker: GutterMarker }> = [];

    if (err !== null && err.line >= 1 && err.line <= view.state.doc.lines) {
      const line = view.state.doc.line(err.line);
      entries.push({ pos: line.from, marker: new ErrorGutterMarker(err.message) });
    }

    for (const badge of loops) {
      if (badge.line >= 1 && badge.line <= view.state.doc.lines) {
        const line = view.state.doc.line(badge.line);
        entries.push({
          pos: line.from,
          marker: new LoopBadgeMarker(badge.iteration, Boolean(badge.finished)),
        });
      }
    }

    entries.sort((a, b) => a.pos - b.pos);
    const builder = new RangeSetBuilder<GutterMarker>();
    for (const e of entries) {
      builder.add(e.pos, e.pos, e.marker);
    }
    return builder.finish() as RangeSet<GutterMarker>;
  },
});

export function scrollLineIntoView(view: EditorView, lineNumber: number): void {
  if (lineNumber < 1 || lineNumber > view.state.doc.lines) return;
  const line = view.state.doc.line(lineNumber);
  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
  });
}

export function lineHighlightExtension(): Extension {
  return [
    executingLineField,
    loopCountersField,
    errorLineField,
    hintLinesField,
    lineDecorationsField,
    statusGutter,
  ];
}
