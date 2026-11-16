import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Compartment,
  EditorState,
  RangeSetBuilder,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
  redo,
  undo,
} from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import {
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { AssistanceTier, LocaleCode } from '../stores';
import {
  focusNextGuidedBlank,
  guidedBlanksExtension,
  guidedBlanksField,
  parseBlankTemplate,
  setGuidedBlanksEffect,
} from './blankWidgets';
import {
  lineHighlightExtension,
  scrollLineIntoView,
  setErrorLineEffect,
  setExecutingLineEffect,
  setHintLinesEffect,
  setLoopCountersEffect,
  type ErrorLineMarker,
  type LoopCounterBadge,
} from './lineHighlight';
import {
  capabilityAutocompleteExtension,
  getUnlockedSnippetChips,
  type SnippetChip,
} from './autocomplete';

export interface CodeEditorProps {
  value: string;
  onChange: (nextCode: string) => void;
  tier: AssistanceTier;
  /** Starter template used in Guided tier to locate `___` blanks */
  guidedTemplate?: string;
  capabilities?: string[];
  targetKCs?: string[];
  locale?: LocaleCode;
  executingLine?: number | null;
  loopCounters?: LoopCounterBadge[];
  errorMarker?: ErrorLineMarker | null;
  hintLines?: number[];
  readOnly?: boolean;
  showMobileAccessoryBar?: boolean;
  onRunShortcut?: () => void;
  onStopShortcut?: () => void;
  onFocusChange?: (focused: boolean) => void;
  ariaLabel?: string;
}

const pycraftHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#F2B544', fontWeight: '700' },
  { tag: t.controlKeyword, color: '#F2B544', fontWeight: '700' },
  { tag: t.operatorKeyword, color: '#F2B544' },
  { tag: t.string, color: '#9CCB6B' },
  { tag: t.number, color: '#E59A6B' },
  { tag: t.bool, color: '#F2B544' },
  { tag: t.comment, color: '#8FA3A9', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.standard(t.variableName)], color: '#7FC8E8' },
  { tag: t.propertyName, color: '#3CC4C0' },
  { tag: t.variableName, color: '#E8EEF0' },
  { tag: t.operator, color: '#A9B8BD' },
  { tag: t.punctuation, color: '#A9B8BD' },
]);

const pycraftEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#1A2225',
      color: '#E8EEF0',
      fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
      fontSize: '0.875rem',
      lineHeight: '1.5',
      height: '100%',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.5',
    },
    '.cm-content': {
      padding: '8px 0',
      caretColor: '#F2B544',
    },
    '.cm-gutters': {
      backgroundColor: '#1F292C',
      color: '#8FA3A9',
      borderRight: '1px solid #33434A',
      minWidth: '40px',
    },
    '.cm-activeLine': {
      backgroundColor: '#24303A',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#24303A',
      color: '#E8EEF0',
    },
    '.cm-executing-line': {
      backgroundColor: 'rgba(60, 196, 192, 0.18) !important',
      boxShadow: 'inset 3px 0 0 #3CC4C0',
    },
    '.cm-hint-line': {
      backgroundColor: 'rgba(242, 181, 68, 0.12)',
      boxShadow: 'inset 2px 0 0 #F2B544',
    },
    '.cm-error-line': {
      backgroundColor: 'rgba(224, 96, 63, 0.14)',
    },
    '.cm-error-squiggle': {
      textDecoration: 'underline wavy #E0603F',
      textUnderlineOffset: '3px',
    },
    '.cm-error-gutter-marker': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      backgroundColor: '#E0603F',
      color: '#1C2427',
      fontWeight: '700',
      fontSize: '11px',
      borderRadius: '2px',
    },
    '.cm-pycraft-status-gutter': {
      minWidth: '28px',
      padding: '0 4px',
    },
    '.cm-loop-badge': {
      display: 'inline-block',
      padding: '0 4px',
      fontSize: '11px',
      fontWeight: '700',
      borderRadius: '2px',
      lineHeight: '1.3',
    },
    '.cm-loop-badge-active': {
      backgroundColor: 'rgba(60, 196, 192, 0.25)',
      color: '#3CC4C0',
      border: '1px solid #3CC4C0',
    },
    '.cm-loop-badge-done': {
      backgroundColor: '#243034',
      color: '#A9B8BD',
      border: '1px solid #33434A',
    },
    '.cm-guided-blank': {
      backgroundColor: '#27383E',
      borderBottom: '2px solid #F2B544',
      color: '#E8EEF0',
      padding: '0 2px',
      borderRadius: '2px',
    },
    '.cm-guided-blank-empty': {
      display: 'inline-block',
      backgroundColor: '#27383E',
      border: '1px dashed #F2B544',
      color: '#F2B544',
      padding: '0 4px',
      borderRadius: '2px',
      fontWeight: '700',
    },
    '.cm-indent-guide': {
      boxShadow: 'inset 1px 0 0 rgba(143, 163, 169, 0.22)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-tooltip-autocomplete': {
      backgroundColor: '#243034',
      border: '1px solid #33434A',
      color: '#E8EEF0',
      borderRadius: '4px',
    },
    '.cm-tooltip-autocomplete > ul > li': {
      minHeight: '36px',
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#33434A',
      color: '#F2B544',
    },
  },
  { dark: true }
);

function buildIndentGuideDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const deco = Decoration.mark({ class: 'cm-indent-guide' });
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const match = /^( +)/.exec(line.text);
      if (match) {
        const spaces = match[1]?.length ?? 0;
        for (let col = 0; col + 4 <= spaces; col += 4) {
          builder.add(line.from + col, line.from + col + 1, deco);
        }
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

const indentGuidesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildIndentGuideDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildIndentGuideDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  tier,
  guidedTemplate,
  capabilities = [],
  targetKCs = [],
  locale = 'id',
  executingLine = null,
  loopCounters = [],
  errorMarker = null,
  hintLines = [],
  readOnly = false,
  showMobileAccessoryBar = false,
  onRunShortcut,
  onStopShortcut,
  onFocusChange,
  ariaLabel,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment()).current;
  const [snippetsOpen, setSnippetsOpen] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onRunRef = useRef(onRunShortcut);
  onRunRef.current = onRunShortcut;
  const onStopRef = useRef(onStopShortcut);
  onStopRef.current = onStopShortcut;
  const onFocusRef = useRef(onFocusChange);
  onFocusRef.current = onFocusChange;
  const capsRef = useRef(capabilities);
  capsRef.current = capabilities;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const snippetChips = useMemo(
    () => getUnlockedSnippetChips(capabilities, targetKCs),
    [capabilities, targetKCs]
  );

  // Initialize CodeMirror instance once
  useEffect(() => {
    if (!hostRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      indentUnit.of('    '),
      python(),
      syntaxHighlighting(pycraftHighlightStyle),
      pycraftEditorTheme,
      indentGuidesPlugin,
      guidedBlanksExtension(),
      lineHighlightExtension(),
      capabilityAutocompleteExtension(
        () => capsRef.current,
        () => localeRef.current
      ),
      readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
      EditorView.contentAttributes.of({
        'aria-label':
          ariaLabel ??
          (locale === 'id' ? 'Editor kode Python' : 'Python code editor'),
      }),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
        {
          key: 'Ctrl-.',
          run: () => {
            onStopRef.current?.();
            return true;
          },
        },
        {
          key: 'Tab',
          run: (view) => {
            const guided = view.state.field(guidedBlanksField);
            if (guided.enabled && guided.spans.length > 0) {
              return focusNextGuidedBlank(view);
            }
            return indentMore(view);
          },
          shift: indentLess,
        },
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
        if (update.focusChanged) {
          onFocusRef.current?.(update.view.hasFocus);
        }
      }),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: hostRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external `value` changes (step change, reset, tier switch)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      const isGuided = tier === 'guided';
      const parsed = isGuided ? parseBlankTemplate(guidedTemplate ?? value) : null;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        effects: setGuidedBlanksEffect.of({
          enabled: Boolean(isGuided && parsed && parsed.blanks.length > 0),
          spans:
            parsed?.blanks.map((b) => ({
              index: b.index,
              from: b.from,
              to: b.to,
            })) ?? [],
        }),
      });
    }
  }, [value, tier, guidedTemplate]);

  // Sync Guided tier blanks when tier or guidedTemplate changes even if value matches
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const isGuided = tier === 'guided';
    const docText = view.state.doc.toString();
    const parsed = isGuided ? parseBlankTemplate(guidedTemplate ?? docText) : null;
    view.dispatch({
      effects: setGuidedBlanksEffect.of({
        enabled: Boolean(isGuided && parsed && parsed.blanks.length > 0),
        spans:
          parsed?.blanks.map((b) => ({
            index: b.index,
            from: b.from,
            to: b.to,
          })) ?? [],
      }),
    });
  }, [tier, guidedTemplate]);

  // Sync readOnly compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly, readOnlyCompartment]);

  // Sync executing line + scroll into view
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setExecutingLineEffect.of(executingLine) });
    if (executingLine !== null) {
      scrollLineIntoView(view, executingLine);
    }
  }, [executingLine]);

  // Sync loop counters
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setLoopCountersEffect.of(loopCounters) });
  }, [loopCounters]);

  // Sync error line
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setErrorLineEffect.of(errorMarker) });
  }, [errorMarker]);

  // Sync hint lines
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setHintLinesEffect.of(hintLines) });
  }, [hintLines]);

  const insertAtCursor = (text: string, cursorOffset?: number) => {
    const view = viewRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    const nextCursor =
      cursorOffset !== undefined ? sel.from + cursorOffset : sel.from + text.length;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: text },
      selection: { anchor: nextCursor, head: nextCursor },
      scrollIntoView: true,
    });
    view.focus();
  };

  const handleSnippetSelect = (chip: SnippetChip) => {
    insertAtCursor(chip.insertText, chip.cursorOffset);
    setSnippetsOpen(false);
  };

  const accessoryKeys: Array<{
    label: string;
    aria: string;
    onClick: () => void;
  }> = [
    {
      label: 'Tab ⇥',
      aria: 'Tambah indentasi',
      onClick: () => {
        const view = viewRef.current;
        if (!view) return;
        indentMore(view);
        view.focus();
      },
    },
    {
      label: '⇤',
      aria: 'Kurangi indentasi',
      onClick: () => {
        const view = viewRef.current;
        if (!view) return;
        indentLess(view);
        view.focus();
      },
    },
    { label: '( )', aria: 'Sisipkan tanda kurung', onClick: () => insertAtCursor('()', 1) },
    { label: '" "', aria: 'Sisipkan tanda kutip', onClick: () => insertAtCursor('""', 1) },
    { label: ':', aria: 'Sisipkan titik dua', onClick: () => insertAtCursor(':') },
    { label: '=', aria: 'Sisipkan sama dengan', onClick: () => insertAtCursor(' = ') },
    { label: '+', aria: 'Sisipkan tambah', onClick: () => insertAtCursor(' + ') },
    { label: '-', aria: 'Sisipkan kurang', onClick: () => insertAtCursor(' - ') },
    { label: '<', aria: 'Sisipkan kurang dari', onClick: () => insertAtCursor(' < ') },
    { label: '>', aria: 'Sisipkan lebih dari', onClick: () => insertAtCursor(' > ') },
    { label: '#', aria: 'Sisipkan komentar', onClick: () => insertAtCursor('# ') },
    {
      label: '↶',
      aria: 'Urungkan',
      onClick: () => {
        const view = viewRef.current;
        if (view) {
          undo(view);
          view.focus();
        }
      },
    },
    {
      label: '↷',
      aria: 'Ulangi',
      onClick: () => {
        const view = viewRef.current;
        if (view) {
          redo(view);
          view.focus();
        }
      },
    },
  ];

  return (
    <div
      className="pycraft-code-editor-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        position: 'relative',
      }}
      onKeyDown={(e) => {
        // Prevent gameplay WASD/E/V/Tab listeners from intercepting typing
        if (e.key !== 'Escape') {
          e.stopPropagation();
        }
      }}
    >
      <div
        ref={hostRef}
        data-testid="codemirror-host"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          border: '1px solid var(--slate-border, #33434A)',
          borderRadius: '2px',
          backgroundColor: '#1A2225',
        }}
      />

      {showMobileAccessoryBar && (
        <div
          data-testid="mobile-accessory-bar"
          style={{
            position: 'relative',
            height: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 6px',
            backgroundColor: '#243034',
            borderTop: '1px solid #33434A',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            type="button"
            aria-expanded={snippetsOpen}
            aria-label={locale === 'id' ? 'Keping Kode' : 'Code Snippets'}
            onClick={() => setSnippetsOpen((v) => !v)}
            style={{
              height: '34px',
              padding: '0 10px',
              backgroundColor: '#F2B544',
              color: '#1C2427',
              border: 'none',
              borderRadius: '2px',
              fontWeight: 700,
              fontSize: '0.8125rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {locale === 'id' ? 'Keping Kode ▾' : 'Snippets ▾'}
          </button>

          {accessoryKeys.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-label={item.aria}
              onMouseDown={(e) => e.preventDefault()}
              onClick={item.onClick}
              style={{
                minWidth: '38px',
                height: '34px',
                padding: '0 8px',
                backgroundColor: '#1C2427',
                color: '#E8EEF0',
                border: '1px solid #33434A',
                borderRadius: '2px',
                fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
                fontSize: '0.875rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {showMobileAccessoryBar && snippetsOpen && (
        <div
          role="menu"
          aria-label={locale === 'id' ? 'Daftar Keping Kode' : 'Code Snippets Menu'}
          style={{
            position: 'absolute',
            left: '6px',
            bottom: '48px',
            zIndex: 30,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: '#243034',
            border: '1px solid #33434A',
            borderRadius: '4px',
            padding: '4px',
            boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {snippetChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSnippetSelect(chip)}
              style={{
                minHeight: '40px',
                padding: '6px 12px',
                textAlign: 'left',
                backgroundColor: '#1C2427',
                color: '#3CC4C0',
                border: '1px solid #33434A',
                borderRadius: '2px',
                fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
