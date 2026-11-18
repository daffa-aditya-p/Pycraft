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
  { tag: t.keyword, color: '#7C3AED', fontWeight: '700' },
  { tag: t.controlKeyword, color: '#7C3AED', fontWeight: '700' },
  { tag: t.operatorKeyword, color: '#6D28D9', fontWeight: '600' },
  { tag: t.string, color: '#15803D', fontWeight: '500' },
  { tag: t.number, color: '#C2410C', fontWeight: '600' },
  { tag: t.bool, color: '#B45309', fontWeight: '700' },
  { tag: t.comment, color: '#64748B', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.standard(t.variableName)], color: '#0284C7', fontWeight: '600' },
  { tag: t.propertyName, color: '#0F766E', fontWeight: '600' },
  { tag: t.variableName, color: '#0F172A' },
  { tag: t.operator, color: '#475569' },
  { tag: t.punctuation, color: '#475569' },
]);

const pycraftEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
      fontSize: '0.875rem',
      lineHeight: '1.55',
      height: '100%',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.55',
    },
    '.cm-content': {
      padding: '10px 0',
      caretColor: '#0891B2',
    },
    '.cm-gutters': {
      backgroundColor: '#EDF6FA',
      color: '#4D6B7D',
      borderRight: '1px solid #C8E2EE',
      minWidth: '40px',
    },
    '.cm-activeLine': {
      backgroundColor: '#F0F9FF',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#DCEFF8',
      color: '#0E7490',
      fontWeight: '700',
    },
    '.cm-executing-line': {
      backgroundColor: 'rgba(6, 182, 212, 0.16) !important',
      boxShadow: 'inset 3px 0 0 #0891B2',
    },
    '.cm-hint-line': {
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      boxShadow: 'inset 3px 0 0 #F59E0B',
    },
    '.cm-error-line': {
      backgroundColor: 'rgba(220, 38, 38, 0.10)',
    },
    '.cm-error-squiggle': {
      textDecoration: 'underline wavy #DC2626',
      textUnderlineOffset: '3px',
    },
    '.cm-error-gutter-marker': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: '11px',
      borderRadius: '4px',
    },
    '.cm-pycraft-status-gutter': {
      minWidth: '28px',
      padding: '0 4px',
    },
    '.cm-loop-badge': {
      display: 'inline-block',
      padding: '0 5px',
      fontSize: '11px',
      fontWeight: '700',
      borderRadius: '999px',
      lineHeight: '1.3',
    },
    '.cm-loop-badge-active': {
      backgroundColor: '#CFFAFE',
      color: '#0E7490',
      border: '1px solid #06B6D4',
    },
    '.cm-loop-badge-done': {
      backgroundColor: '#DCFCE7',
      color: '#15803D',
      border: '1px solid #4ADE80',
    },
    '.cm-guided-blank': {
      backgroundColor: '#FEF3C7',
      borderBottom: '2px solid #D97706',
      color: '#78350F',
      padding: '0 3px',
      borderRadius: '4px',
      fontWeight: '700',
    },
    '.cm-guided-blank-empty': {
      display: 'inline-block',
      backgroundColor: '#FEF3C7',
      border: '1.5px dashed #D97706',
      color: '#B45309',
      padding: '0 5px',
      borderRadius: '4px',
      fontWeight: '700',
    },
    '.cm-indent-guide': {
      boxShadow: 'inset 1px 0 0 rgba(100, 116, 139, 0.20)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-tooltip-autocomplete': {
      backgroundColor: '#FFFFFF',
      border: '2px solid #8EC6DB',
      color: '#172B3A',
      borderRadius: '8px',
      boxShadow: '0 6px 16px rgba(15, 52, 76, 0.16)',
    },
    '.cm-tooltip-autocomplete > ul > li': {
      minHeight: '36px',
      display: 'flex',
      alignItems: 'center',
      padding: '4px 10px',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#E0F2FE',
      color: '#0E7490',
      fontWeight: '700',
    },
  },
  { dark: false }
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
      const targetText = value.length > 0 ? value : (guidedTemplate ?? '');
      const parsed = isGuided ? parseBlankTemplate(targetText) : null;
      const firstBlank = parsed?.blanks[0];
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        ...(isGuided && firstBlank && firstBlank.to <= value.length
          ? { selection: { anchor: firstBlank.from, head: firstBlank.to } }
          : {}),
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
    const targetText = docText.length > 0 ? docText : (guidedTemplate ?? '');
    const parsed = isGuided ? parseBlankTemplate(targetText) : null;
    const firstBlank = parsed?.blanks[0];
    view.dispatch({
      ...(isGuided && firstBlank && firstBlank.to <= docText.length
        ? { selection: { anchor: firstBlank.from, head: firstBlank.to } }
        : {}),
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
        onClick={() => {
          if (viewRef.current && !viewRef.current.hasFocus) {
            viewRef.current.focus();
          }
        }}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          border: '2px solid #9ECCDF',
          borderRadius: '10px',
          backgroundColor: '#FFFFFF',
          boxShadow: 'inset 0 2px 4px rgba(15, 52, 76, 0.05)',
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
            gap: '5px',
            padding: '0 8px',
            backgroundColor: '#EDF6FA',
            borderTop: '2px solid #C8E2EE',
            borderRadius: '0 0 8px 8px',
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
              padding: '0 12px',
              background: 'linear-gradient(180deg, #FFD15C 0%, #F59E0B 100%)',
              color: '#3E1F05',
              border: '1.5px solid #D97706',
              borderRadius: '8px',
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
                backgroundColor: '#FFFFFF',
                color: '#172B3A',
                border: '1.5px solid #9ECCDF',
                borderRadius: '8px',
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
            backgroundColor: '#FFFFFF',
            border: '2px solid #8EC6DB',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 8px 20px rgba(15, 52, 76, 0.2)',
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
                backgroundColor: '#F0F9FF',
                color: '#0E7490',
                border: '1px solid #B7E0EF',
                borderRadius: '8px',
                fontFamily: "var(--font-code, 'JetBrains Mono', monospace)",
                fontSize: '0.875rem',
                fontWeight: 600,
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
