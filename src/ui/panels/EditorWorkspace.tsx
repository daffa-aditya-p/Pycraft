import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  EventBus,
  useEditorStore,
  useSettingsStore,
  useUIStore,
  type AssistanceTier,
  type PlaybackSpeed,
} from '@/stores';
import type { ErrorLineMarker, LoopCounterBadge } from '@/editor/lineHighlight';
import { HoldConfirmModal } from '../components/HoldConfirmModal';
import {
  IconCheck,
  IconClose,
  IconHint,
  IconPause,
  IconPlay,
  IconReset,
  IconSkipNext,
  IconSkipPrev,
  IconStepBack,
  IconStepForward,
  IconStop,
  IconWarning,
} from '../icons';
import { computeLayoutClass } from '../layout';

const LazyCodeEditor = React.lazy(() =>
  import('@/editor/CodeEditor').then((m) => ({ default: m.CodeEditor }))
);

export type EditorBottomTab = 'console' | 'variables' | 'timeline';

export interface EditorWorkspaceProps {
  stepTitle?: string;
  requirementChips?: string[];
  capabilities?: string[];
  targetKCs?: string[];
  guidedTemplate?: string;
  onRun?: (code: string) => void;
  onStop?: () => void;
  onResetCode?: () => void;
  onRequestHint?: (rung: 1 | 2 | 3 | 4) => void;
  onTimelinePlayPause?: () => void;
  onTimelineSeek?: (seq: number) => void;
  onTimelineStep?: (dir: -1 | 1) => void;
  onTimelineJumpAction?: (dir: -1 | 1) => void;
  onPreviewScenario?: (scenarioId: string) => void;
  onSubmitInputAnswers?: (answers: string[]) => void;
}

const TIERS: Array<{ id: AssistanceTier; idLabel: string; enLabel: string }> = [
  { id: 'guided', idLabel: 'Terpandu', enLabel: 'Guided' },
  { id: 'assisted', idLabel: 'Dibantu', enLabel: 'Assisted' },
  { id: 'independent', idLabel: 'Mandiri', enLabel: 'Independent' },
  { id: 'mastery', idLabel: 'Mahir', enLabel: 'Mastery' },
];

const SPEEDS: Array<{ value: PlaybackSpeed; label: string }> = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
  { value: 'instant', label: 'Instan' },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  stepTitle,
  requirementChips = [],
  capabilities = [],
  targetKCs = [],
  guidedTemplate,
  onRun,
  onStop,
  onResetCode,
  onRequestHint,
  onTimelinePlayPause,
  onTimelineSeek,
  onTimelineStep,
  onTimelineJumpAction,
  onPreviewScenario,
  onSubmitInputAnswers,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);

  const editorDockOpen = useUIStore((s) => s.editorDockOpen);
  const setEditorDockOpen = useUIStore((s) => s.setEditorDockOpen);
  const inputMode = useUIStore((s) => s.inputMode);
  const keyboardOpen = useUIStore((s) => s.keyboardOpen);
  const setKeyboardOpen = useUIStore((s) => s.setKeyboardOpen);
  const mobileSheetSnap = useUIStore((s) => s.mobileSheetSnap);
  const setMobileSheetSnap = useUIStore((s) => s.setMobileSheetSnap);
  const editorAutoCollapsed = useUIStore((s) => s.editorAutoCollapsedForRestoration);
  const collapseEditorForRestoration = useUIStore(
    (s) => s.collapseEditorForRestoration
  );

  const stepId = useEditorStore((s) => s.stepId);
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const tier = useEditorStore((s) => s.tier);
  const setTier = useEditorStore((s) => s.setTier);
  const playbackSpeed = useEditorStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useEditorStore((s) => s.setPlaybackSpeed);
  const stepMode = useEditorStore((s) => s.stepMode);
  const setStepMode = useEditorStore((s) => s.setStepMode);
  const runtimeStatus = useEditorStore((s) => s.runtimeStatus);
  const pyodideProgress = useEditorStore((s) => s.pyodideProgress);
  const currentLine = useEditorStore((s) => s.currentLine);
  const loopIterations = useEditorStore((s) => s.loopIterations);
  const variables = useEditorStore((s) => s.variables);
  const consoleEntries = useEditorStore((s) => s.consoleEntries);
  const clearConsole = useEditorStore((s) => s.clearConsole);
  const timeline = useEditorStore((s) => s.timeline);
  const scenarioResults = useEditorStore((s) => s.scenarioResults);
  const mentorPanel = useEditorStore((s) => s.mentorPanel);
  const setMentorPanel = useEditorStore((s) => s.setMentorPanel);
  const syntaxError = useEditorStore((s) => s.syntaxError);
  const inputModal = useEditorStore((s) => s.inputModal);
  const setInputModal = useEditorStore((s) => s.setInputModal);

  const [bottomTab, setBottomTab] = useState<EditorBottomTab>('console');
  const [dockWidthPct, setDockWidthPct] = useState(42);
  const [editorFocused, setEditorFocused] = useState(false);
  const [rung4ConfirmOpen, setRung4ConfirmOpen] = useState(false);
  const [rawTracebackOpen, setRawTracebackOpen] = useState(false);
  const [landscapeRailCollapsed, setLandscapeRailCollapsed] = useState(false);
  const [inputDrafts, setInputDrafts] = useState<string[]>(['']);

  const [viewportSize, setViewportSize] = useState<{ w: number; h: number }>(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 1280, h: 800 }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isCoarsePointer =
    inputMode === 'touch' ||
    (typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(pointer: coarse)').matches));

  const detailedLayout = computeLayoutClass(
    viewportSize.w,
    viewportSize.h,
    isCoarsePointer
  );

  // RC-10: Auto-collapse editor for 5s when a mission restoration animation plays
  const restoreTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const unsub = EventBus.on('world.zone.restored', () => {
      collapseEditorForRestoration(true);
      if (restoreTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(restoreTimerRef.current);
      }
      if (typeof window !== 'undefined') {
        restoreTimerRef.current = window.setTimeout(() => {
          collapseEditorForRestoration(false);
        }, 5000);
      }
    });
    return () => {
      unsub();
      if (restoreTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(restoreTimerRef.current);
      }
    };
  }, [collapseEditorForRestoration]);

  // Sync input modal drafts length
  useEffect(() => {
    if (!inputModal.open) return;
    const count = Math.max(1, inputModal.expectedCount || 1);
    setInputDrafts((prev) =>
      Array.from({ length: count }, (_, idx) => prev[idx] ?? '')
    );
  }, [inputModal.open, inputModal.expectedCount]);

  const loopCounterBadges: LoopCounterBadge[] = useMemo(
    () =>
      Object.entries(loopIterations).map(([lineStr, counts]) => ({
        line: Number(lineStr),
        iteration: counts.current,
        finished: runtimeStatus === 'completed' || timeline.currentSeq >= timeline.totalEvents,
      })),
    [loopIterations, runtimeStatus, timeline.currentSeq, timeline.totalEvents]
  );

  const errorMarker: ErrorLineMarker | null = useMemo(() => {
    if (!syntaxError) return null;
    return {
      line: syntaxError.line,
      col: syntaxError.col,
      message: syntaxError.message,
    };
  }, [syntaxError]);

  if (!editorDockOpen) return null;

  const isRunning = runtimeStatus === 'running';
  const isPreparing = runtimeStatus === 'preparing';
  const isLandscapePhone = detailedLayout === 'L';
  const isSheet = detailedLayout === 'P' || detailedLayout === 'T-Portrait';
  const isKeyboardFullOverlay =
    isLandscapePhone && (keyboardOpen || editorFocused);

  const statusText =
    runtimeStatus === 'preparing'
      ? locale === 'id'
        ? `Menyiapkan Python… ${Math.round(pyodideProgress.pct)}%`
        : `Preparing Python… ${Math.round(pyodideProgress.pct)}%`
      : runtimeStatus === 'running'
        ? locale === 'id'
          ? 'Berjalan'
          : 'Running'
        : runtimeStatus === 'waiting_input'
          ? locale === 'id'
            ? 'Menunggu input'
            : 'Waiting input'
          : runtimeStatus === 'paused'
            ? locale === 'id'
              ? 'Dijeda'
              : 'Paused'
            : runtimeStatus === 'completed'
              ? locale === 'id'
                ? 'Selesai ✓'
                : 'Done ✓'
              : runtimeStatus === 'error'
                ? 'Error ✕'
                : runtimeStatus === 'stopped'
                  ? locale === 'id'
                    ? 'Dihentikan'
                    : 'Stopped'
                  : runtimeStatus === 'limit_reached'
                    ? locale === 'id'
                      ? 'Batas tercapai'
                      : 'Limit reached'
                    : 'Idle';

  const handleRun = () => {
    onRun?.(code);
  };

  const handleHintStep = () => {
    const nextRung = Math.min(4, (mentorPanel.activeRung || 0) + 1) as 1 | 2 | 3 | 4;
    if (nextRung === 4 && mentorPanel.activeRung < 4) {
      setRung4ConfirmOpen(true);
      return;
    }
    onRequestHint?.(nextRung);
  };

  const handleCloseKeyboard = () => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditorFocused(false);
    setKeyboardOpen(false);
  };

  // Collapsed rail for Landscape Phone (`L`) during 5s restoration or manual collapse
  if (isLandscapePhone && (editorAutoCollapsed || landscapeRailCollapsed) && !isKeyboardFullOverlay) {
    return (
      <aside
        data-testid="editor-landscape-rail"
        className="surface-slate"
        style={{
          position: 'fixed',
          top: 'calc(8px + var(--sat))',
          right: 'calc(8px + var(--sar))',
          bottom: 'calc(8px + var(--sab))',
          width: '56px',
          zIndex: 45,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 4px',
        }}
      >
        <button
          type="button"
          className="btn-primary-chamfer"
          aria-label={locale === 'id' ? 'Perluas Editor' : 'Expand Editor'}
          onClick={() => {
            collapseEditorForRestoration(false);
            setLandscapeRailCollapsed(false);
          }}
          style={{ width: '48px', minHeight: '48px', padding: 0 }}
        >
          <span>{'</>'}</span>
        </button>
        <button
          type="button"
          className="btn-slate"
          aria-label={locale === 'id' ? 'Jalankan' : 'Run'}
          onClick={handleRun}
          style={{ width: '48px', minHeight: '48px', padding: 0 }}
        >
          <IconPlay size={18} />
        </button>
        <button
          type="button"
          className="btn-slate"
          aria-label={locale === 'id' ? 'Tutup Editor' : 'Close Editor'}
          onClick={() => setEditorDockOpen(false)}
          style={{ width: '48px', minHeight: '48px', padding: 0 }}
        >
          <IconClose size={18} />
        </button>
      </aside>
    );
  }

  // Compute outer container style per layout class
  let containerStyle: React.CSSProperties;
  if (isKeyboardFullOverlay) {
    // RC-10: Phone Landscape full visualViewport overlay when keyboard is active
    containerStyle = {
      position: 'fixed',
      inset: 0,
      width: '100%',
      height: 'var(--app-h, 100dvh)',
      zIndex: 60,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 0,
    };
  } else if (isSheet) {
    const effectiveSnap = editorAutoCollapsed ? 'peek' : mobileSheetSnap;
    const sheetHeight =
      effectiveSnap === 'peek'
        ? 'auto'
        : effectiveSnap === 'half'
          ? '50dvh'
          : '92dvh';
    containerStyle = {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      height: sheetHeight,
      minHeight: effectiveSnap === 'peek' ? '88px' : undefined,
      maxHeight: '92dvh',
      zIndex: 45,
      display: 'flex',
      flexDirection: 'column',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    };
  } else {
    const widthPct =
      detailedLayout === 'L'
        ? 48
        : detailedLayout === 'T-Landscape'
          ? 45
          : dockWidthPct;
    containerStyle = {
      position: 'fixed',
      top: 'calc(10px + var(--sat))',
      right: 'calc(10px + var(--sar))',
      bottom: 'calc(10px + var(--sab))',
      width: editorAutoCollapsed ? '280px' : `${widthPct}vw`,
      height: editorAutoCollapsed ? '88px' : 'auto',
      zIndex: 45,
      display: 'flex',
      flexDirection: 'column',
    };
  }

  const isPeekSheet = isSheet && (editorAutoCollapsed || mobileSheetSnap === 'peek');

  return (
    <aside
      data-testid="editor-workspace"
      data-layout-class={detailedLayout}
      data-keyboard-overlay={isKeyboardFullOverlay ? 'true' : 'false'}
      aria-label={locale === 'id' ? 'Ruang Kerja Editor Python' : 'Python Editor Workspace'}
      className="surface-slate"
      style={containerStyle}
    >
      {/* Desktop resize handle (D only) */}
      {detailedLayout === 'D' && !editorAutoCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={locale === 'id' ? 'Ubah lebar editor' : 'Resize editor'}
          onPointerDown={(e) => {
            const startX = e.clientX;
            const startPct = dockWidthPct;
            const onMove = (ev: PointerEvent) => {
              const dx = startX - ev.clientX;
              const deltaPct = (dx / window.innerWidth) * 100;
              setDockWidthPct(Math.max(30, Math.min(60, startPct + deltaPct)));
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          }}
          style={{
            position: 'absolute',
            left: '-5px',
            top: 0,
            bottom: 0,
            width: '10px',
            cursor: 'ew-resize',
          }}
        />
      )}

      {/* Bottom Sheet Snap Controls for P / T-Portrait */}
      {isSheet && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            borderBottom: '1px solid #33434A',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['peek', 'half', 'full'] as const).map((snap) => (
              <button
                key={snap}
                type="button"
                data-testid={`sheet-snap-${snap}`}
                className="btn-slate"
                aria-pressed={mobileSheetSnap === snap && !editorAutoCollapsed}
                onClick={() => {
                  collapseEditorForRestoration(false);
                  setMobileSheetSnap(snap);
                }}
                style={{
                  minHeight: '36px',
                  padding: '2px 10px',
                  fontSize: '0.75rem',
                  borderColor:
                    mobileSheetSnap === snap && !editorAutoCollapsed ? '#F2B544' : '#33434A',
                }}
              >
                {snap === 'peek' ? 'Intip' : snap === 'half' ? '50%' : 'Penuh'}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-slate"
            aria-label={locale === 'id' ? 'Tutup Editor' : 'Close Editor'}
            onClick={() => setEditorDockOpen(false)}
            style={{ minHeight: '36px', minWidth: '36px', padding: '0 8px' }}
          >
            <IconClose size={16} />
          </button>
        </div>
      )}

      {/* Mission Header */}
      <header
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #33434A',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              data-testid="runtime-status-chip"
              style={{
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: '#243034',
                border: `1px solid ${
                  runtimeStatus === 'error'
                    ? '#E0603F'
                    : runtimeStatus === 'completed'
                      ? '#6DBE4B'
                      : '#3CC4C0'
                }`,
                color:
                  runtimeStatus === 'error'
                    ? '#E0603F'
                    : runtimeStatus === 'completed'
                      ? '#6DBE4B'
                      : '#3CC4C0',
                borderRadius: '2px',
                whiteSpace: 'nowrap',
              }}
            >
              {statusText}
            </span>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '1.0625rem',
                color: '#E8EEF0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {stepTitle ?? stepId ?? (locale === 'id' ? 'Editor Python' : 'Python Editor')}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isKeyboardFullOverlay && (
              <button
                type="button"
                data-testid="btn-close-keyboard"
                className="btn-primary-chamfer"
                onClick={handleCloseKeyboard}
                style={{ minHeight: '38px', padding: '4px 12px', fontSize: '0.8125rem' }}
              >
                {locale === 'id' ? 'Tutup Keyboard' : 'Close Keyboard'}
              </button>
            )}

            {isLandscapePhone && !isKeyboardFullOverlay && (
              <button
                type="button"
                className="btn-slate"
                onClick={() => setLandscapeRailCollapsed(true)}
                style={{ minHeight: '36px', padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {locale === 'id' ? 'Ciutkan' : 'Collapse'}
              </button>
            )}

            {isPeekSheet && (
              <button
                type="button"
                className="btn-primary-chamfer"
                onClick={handleRun}
                disabled={isRunning}
                style={{ minHeight: '38px', padding: '4px 12px' }}
              >
                <IconPlay size={16} />
                <span>{locale === 'id' ? 'Jalankan' : 'Run'}</span>
              </button>
            )}

            {!isSheet && !isKeyboardFullOverlay && (
              <button
                type="button"
                className="btn-slate"
                aria-label={locale === 'id' ? 'Tutup Editor' : 'Close Editor'}
                onClick={() => setEditorDockOpen(false)}
                style={{ minHeight: '36px', minWidth: '36px', padding: '0 8px' }}
              >
                <IconClose size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Requirement chips & 4-tier switcher (hidden in compact peek/auto-collapse) */}
        {!isPeekSheet && !editorAutoCollapsed && !isKeyboardFullOverlay && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {requirementChips.map((chip) => (
                <span
                  key={chip}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#1C2427',
                    border: '1px solid #33434A',
                    borderRadius: '2px',
                    fontSize: '0.75rem',
                    color: '#A9B8BD',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div
              role="group"
              aria-label={locale === 'id' ? 'Tingkat Bantuan' : 'Assistance Tier'}
              style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
            >
              {TIERS.map((tItem) => (
                <button
                  key={tItem.id}
                  type="button"
                  data-testid={`tier-btn-${tItem.id}`}
                  aria-pressed={tier === tItem.id}
                  onClick={() => setTier(tItem.id)}
                  style={{
                    minHeight: '32px',
                    padding: '2px 8px',
                    backgroundColor: tier === tItem.id ? '#2C3A3F' : '#1C2427',
                    color: tier === tItem.id ? '#F2B544' : '#A9B8BD',
                    border:
                      tier === tItem.id ? '1px solid #F2B544' : '1px solid #33434A',
                    borderRadius: '2px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'id' ? tItem.idLabel : tItem.enLabel}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Editor + Toolbar + Bottom Tabs (hidden during peek/auto-collapse) */}
      {!isPeekSheet && !editorAutoCollapsed && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid #33434A',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              backgroundColor: '#243034',
            }}
          >
            {!isRunning ? (
              <button
                type="button"
                data-testid="btn-run-code"
                className="btn-primary-chamfer"
                disabled={isPreparing}
                onClick={handleRun}
                style={{ minHeight: '38px', padding: '4px 12px', fontSize: '0.875rem' }}
              >
                <IconPlay size={16} />
                <span>{locale === 'id' ? 'Jalankan' : 'Run'}</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-stop-code"
                className="btn-slate"
                onClick={() => onStop?.()}
                style={{
                  minHeight: '38px',
                  padding: '4px 12px',
                  borderColor: '#E0603F',
                  color: '#E0603F',
                  fontSize: '0.875rem',
                }}
              >
                <IconStop size={16} />
                <span>{locale === 'id' ? 'Hentikan' : 'Stop'}</span>
              </button>
            )}

            <button
              type="button"
              data-testid="btn-reset-code"
              className="btn-slate"
              onClick={() => onResetCode?.()}
              style={{ minHeight: '38px', padding: '4px 10px', fontSize: '0.8125rem' }}
            >
              <IconReset size={16} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              data-testid="btn-neo-hint"
              className="btn-slate"
              onClick={handleHintStep}
              style={{
                minHeight: '38px',
                padding: '4px 10px',
                fontSize: '0.8125rem',
                borderColor: '#3CC4C0',
                color: '#3CC4C0',
              }}
            >
              <IconHint size={16} />
              <span>{locale === 'id' ? 'Petunjuk NEO' : 'NEO Hint'}</span>
            </button>
          </div>

          {/* CodeMirror 6 Editor */}
          <div
            style={{
              flex: isKeyboardFullOverlay ? '1 1 auto' : '1 1 55%',
              minHeight: '110px',
              padding: '6px 8px',
            }}
          >
            <Suspense
              fallback={
                <div style={{ padding: '12px', color: '#8FA3A9' }}>
                  {locale === 'id' ? 'Memuat editor kode…' : 'Loading code editor…'}
                </div>
              }
            >
              <LazyCodeEditor
                value={code}
                onChange={(next) => setCode(next, true)}
                tier={tier}
                guidedTemplate={guidedTemplate}
                capabilities={capabilities}
                targetKCs={targetKCs}
                locale={locale}
                executingLine={currentLine}
                loopCounters={loopCounterBadges}
                errorMarker={errorMarker}
                hintLines={mentorPanel.highlightLines}
                showMobileAccessoryBar={isCoarsePointer || isKeyboardFullOverlay}
                onRunShortcut={handleRun}
                onStopShortcut={onStop}
                onFocusChange={(focused) => setEditorFocused(focused)}
              />
            </Suspense>
          </div>

          {/* NEO Mentor / Error Diagnostic Drawer */}
          {mentorPanel.open && !isKeyboardFullOverlay && (
            <div
              data-testid="mentor-panel"
              className="surface-slate-raised"
              style={{
                margin: '0 8px 6px',
                padding: '10px 12px',
                borderLeft: '3px solid #3CC4C0',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#3CC4C0' }}>
                  NEO ({mentorPanel.visorMood})
                  {mentorPanel.activeRung > 0 ? ` · Petunjuk ${mentorPanel.activeRung}/4` : ''}
                </strong>
                <button
                  type="button"
                  aria-label="Tutup panel NEO"
                  onClick={() => setMentorPanel({ open: false })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#A9B8BD',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </div>
              {mentorPanel.errorHeadline && (
                <div style={{ fontWeight: 700, color: '#F2B544' }}>
                  {mentorPanel.errorHeadline}
                </div>
              )}
              {mentorPanel.errorBody && (
                <div style={{ color: '#E8EEF0', lineHeight: 1.4 }}>{mentorPanel.errorBody}</div>
              )}
              {mentorPanel.socraticQuestion && (
                <div style={{ color: '#A9B8BD', fontStyle: 'italic' }}>
                  {mentorPanel.socraticQuestion}
                </div>
              )}
              {mentorPanel.codeSnippet && (
                <pre
                  style={{
                    margin: 0,
                    padding: '6px 8px',
                    backgroundColor: '#1A2225',
                    color: '#9CCB6B',
                    fontFamily: 'var(--font-code)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                  }}
                >
                  {mentorPanel.codeSnippet}
                </pre>
              )}
              {mentorPanel.rawTraceback && (
                <div>
                  <button
                    type="button"
                    onClick={() => setRawTracebackOpen((v) => !v)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: '#8FA3A9',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      textDecoration: 'underline',
                    }}
                  >
                    {rawTracebackOpen
                      ? 'Sembunyikan Detail Teknis Python'
                      : 'Detail Teknis Python'}
                  </button>
                  {rawTracebackOpen && (
                    <pre
                      style={{
                        margin: '4px 0 0',
                        padding: '6px',
                        backgroundColor: '#1A2225',
                        color: '#E0603F',
                        fontFamily: 'var(--font-code)',
                        fontSize: '0.75rem',
                        overflowX: 'auto',
                      }}
                    >
                      {mentorPanel.rawTraceback}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom Tabs: Console / Variables / Timeline (hidden during L-mode keyboard overlay) */}
          {!isKeyboardFullOverlay && (
            <div
              style={{
                flex: '0 1 40%',
                minHeight: '140px',
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid #33434A',
              }}
            >
              <div
                role="tablist"
                aria-label="Panel Eksekusi"
                style={{
                  display: 'flex',
                  gap: '2px',
                  padding: '4px 8px 0',
                  backgroundColor: '#1F292C',
                  borderBottom: '1px solid #33434A',
                }}
              >
                {(
                  [
                    { id: 'console', idLabel: 'Konsol', enLabel: 'Console' },
                    { id: 'variables', idLabel: 'Variabel', enLabel: 'Variables' },
                    { id: 'timeline', idLabel: 'Linimasa', enLabel: 'Timeline' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={bottomTab === tab.id}
                    onClick={() => setBottomTab(tab.id)}
                    style={{
                      minHeight: '36px',
                      padding: '4px 12px',
                      backgroundColor: bottomTab === tab.id ? '#243034' : 'transparent',
                      color: bottomTab === tab.id ? '#F2B544' : '#A9B8BD',
                      border: 'none',
                      borderBottom:
                        bottomTab === tab.id
                          ? '2px solid #F2B544'
                          : '2px solid transparent',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    {locale === 'id' ? tab.idLabel : tab.enLabel}
                  </button>
                ))}
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '8px 10px',
                  backgroundColor: '#1A2225',
                }}
              >
                {bottomTab === 'console' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={clearConsole}
                        style={{
                          background: 'transparent',
                          border: '1px solid #33434A',
                          color: '#8FA3A9',
                          borderRadius: '2px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {locale === 'id' ? 'Bersihkan' : 'Clear'}
                      </button>
                    </div>

                    {consoleEntries.length === 0 ? (
                      <div style={{ color: '#8FA3A9', fontSize: '0.8125rem' }}>
                        {locale === 'id'
                          ? 'Tekan Jalankan untuk melihat keluaran Python dan aksi BIT.'
                          : 'Press Run to see Python output and BIT actions.'}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontFamily: 'var(--font-code)',
                          fontSize: '0.8125rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        {consoleEntries.map((entry) => {
                          const color =
                            entry.kind === 'error'
                              ? '#E0603F'
                              : entry.kind === 'warning'
                                ? '#E9A23B'
                                : entry.kind === 'action'
                                  ? '#8FA3A9'
                                  : entry.kind === 'system'
                                    ? '#3CC4C0'
                                    : '#E8EEF0';
                          return (
                            <div key={entry.id} style={{ color, whiteSpace: 'pre-wrap' }}>
                              {entry.line !== undefined ? `[L${entry.line}] ` : ''}
                              {entry.text}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Scenario Verification Results */}
                    {scenarioResults.length > 0 && (
                      <div
                        data-testid="scenario-results"
                        style={{
                          marginTop: '6px',
                          paddingTop: '8px',
                          borderTop: '1px solid #33434A',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {scenarioResults.map((sc) => (
                          <div
                            key={sc.scenarioId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#243034',
                              border: `1px solid ${sc.passed ? '#6DBE4B' : '#E0603F'}`,
                              borderRadius: '2px',
                              fontSize: '0.8125rem',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: sc.passed ? '#6DBE4B' : '#E0603F',
                              }}
                            >
                              {sc.passed ? <IconCheck size={14} /> : <IconWarning size={14} />}
                              <span>
                                Skenario {sc.label}
                                {sc.reason ? ` — ${sc.reason}` : ''}
                              </span>
                            </span>
                            {!sc.passed && onPreviewScenario && (
                              <button
                                type="button"
                                className="btn-slate"
                                onClick={() => onPreviewScenario(sc.scenarioId)}
                                style={{
                                  minHeight: '30px',
                                  padding: '2px 8px',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {locale === 'id' ? 'Lihat skenario ini' : 'View scenario'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bottomTab === 'variables' && (
                  <div data-testid="variables-panel">
                    {variables.length === 0 ? (
                      <div style={{ color: '#8FA3A9', fontSize: '0.8125rem' }}>
                        {locale === 'id'
                          ? 'Belum ada variabel yang terekam.'
                          : 'No variables recorded yet.'}
                      </div>
                    ) : (
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--font-code)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <thead>
                          <tr style={{ color: '#8FA3A9', textAlign: 'left' }}>
                            <th style={{ padding: '4px' }}>Nama</th>
                            <th style={{ padding: '4px' }}>Tipe</th>
                            <th style={{ padding: '4px' }}>Nilai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variables.map((v) => {
                            const justChanged =
                              !reducedMotion && v.changedAtSeq === timeline.currentSeq;
                            return (
                              <tr
                                key={`${v.scope}.${v.name}`}
                                style={{
                                  backgroundColor: justChanged
                                    ? 'rgba(242, 181, 68, 0.2)'
                                    : 'transparent',
                                  borderTop: '1px solid #243034',
                                }}
                              >
                                <td style={{ padding: '4px', color: '#E8EEF0' }}>{v.name}</td>
                                <td style={{ padding: '4px', color: '#3CC4C0' }}>
                                  {v.typeName}
                                </td>
                                <td style={{ padding: '4px', color: '#9CCB6B' }}>{v.repr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {bottomTab === 'timeline' && (
                  <div
                    data-testid="timeline-panel"
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    {timeline.isDirtyAfterEdit && (
                      <div
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#3B2C1B',
                          border: '1px solid #E9A23B',
                          borderRadius: '2px',
                          fontSize: '0.75rem',
                          color: '#E8EEF0',
                        }}
                      >
                        {locale === 'id'
                          ? 'Kode berubah — jalankan ulang untuk merekam lagi.'
                          : 'Code changed — run again to re-record.'}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="range"
                        aria-label={locale === 'id' ? 'Penggeser Linimasa' : 'Timeline Scrubber'}
                        min={0}
                        max={Math.max(1, timeline.totalEvents)}
                        value={timeline.currentSeq}
                        disabled={timeline.totalEvents === 0}
                        onChange={(e) => onTimelineSeek?.(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#A9B8BD', minWidth: '58px' }}>
                        {timeline.currentSeq}/{timeline.totalEvents}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn-slate"
                          aria-label={locale === 'id' ? 'Aksi Sebelumnya' : 'Previous Action'}
                          disabled={timeline.totalEvents === 0}
                          onClick={() => onTimelineJumpAction?.(-1)}
                          style={{ minHeight: '36px', padding: '0 8px' }}
                        >
                          <IconSkipPrev size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-slate"
                          aria-label={locale === 'id' ? 'Mundur 1 Baris' : 'Step Back'}
                          disabled={timeline.totalEvents === 0}
                          onClick={() => onTimelineStep?.(-1)}
                          style={{ minHeight: '36px', padding: '0 8px' }}
                        >
                          <IconStepBack size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-primary-chamfer"
                          aria-label={
                            timeline.isPlaying
                              ? locale === 'id'
                                ? 'Jeda Putar Ulang'
                                : 'Pause Replay'
                              : locale === 'id'
                                ? 'Putar Ulang'
                                : 'Play Replay'
                          }
                          disabled={timeline.totalEvents === 0}
                          onClick={() => onTimelinePlayPause?.()}
                          style={{ minHeight: '36px', padding: '0 12px' }}
                        >
                          {timeline.isPlaying ? (
                            <IconPause size={16} />
                          ) : (
                            <IconPlay size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn-slate"
                          aria-label={locale === 'id' ? 'Maju 1 Baris' : 'Step Forward'}
                          disabled={timeline.totalEvents === 0}
                          onClick={() => onTimelineStep?.(1)}
                          style={{ minHeight: '36px', padding: '0 8px' }}
                        >
                          <IconStepForward size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-slate"
                          aria-label={locale === 'id' ? 'Aksi Berikutnya' : 'Next Action'}
                          disabled={timeline.totalEvents === 0}
                          onClick={() => onTimelineJumpAction?.(1)}
                          style={{ minHeight: '36px', padding: '0 8px' }}
                        >
                          <IconSkipNext size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {SPEEDS.map((sp) => (
                          <button
                            key={String(sp.value)}
                            type="button"
                            aria-pressed={playbackSpeed === sp.value}
                            onClick={() => setPlaybackSpeed(sp.value)}
                            style={{
                              minHeight: '30px',
                              padding: '2px 6px',
                              backgroundColor:
                                playbackSpeed === sp.value ? '#2C3A3F' : '#1C2427',
                              color:
                                playbackSpeed === sp.value ? '#F2B544' : '#A9B8BD',
                              border:
                                playbackSpeed === sp.value
                                  ? '1px solid #F2B544'
                                  : '1px solid #33434A',
                              borderRadius: '2px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {sp.label}
                          </button>
                        ))}
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            color: '#A9B8BD',
                            marginLeft: '4px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={stepMode}
                            onChange={(e) => setStepMode(e.target.checked)}
                          />
                          <span>{locale === 'id' ? 'Langkah' : 'Step'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rung 4 Worked Solution Hold Confirmation */}
      <HoldConfirmModal
        open={rung4ConfirmOpen}
        title={locale === 'id' ? 'Tampilkan Solusi Lengkap?' : 'Reveal Full Solution?'}
        description={
          locale === 'id'
            ? 'Membuka contoh solusi lengkap (Tahap 4) akan menandai langkah ini sebagai Terpandu.'
            : 'Revealing the worked solution (Rung 4) will record this step pass as Guided.'
        }
        confirmLabel={locale === 'id' ? 'Tampilkan Solusi' : 'Reveal Solution'}
        danger={false}
        onConfirm={() => {
          setRung4ConfirmOpen(false);
          onRequestHint?.(4);
        }}
        onCancel={() => setRung4ConfirmOpen(false)}
      />

      {/* input() Pre-Run Queue / SAB Prompt Modal */}
      {inputModal.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="input-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 105,
            backgroundColor: 'rgba(28, 36, 39, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <form
            className="surface-slate"
            onSubmit={(e) => {
              e.preventDefault();
              setInputModal({ open: false });
              onSubmitInputAnswers?.(inputDrafts);
            }}
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h2
              id="input-modal-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                color: '#F2B544',
              }}
            >
              {locale === 'id' ? 'Jawaban untuk input()' : 'Answers for input()'}
            </h2>
            {inputModal.prompt && (
              <p style={{ margin: 0, color: '#E8EEF0', fontSize: '0.9375rem' }}>
                {inputModal.prompt}
              </p>
            )}
            {inputDrafts.map((val, idx) => (
              <input
                key={idx}
                type="text"
                value={val}
                placeholder={`Jawaban #${idx + 1}`}
                onChange={(e) => {
                  const copy = [...inputDrafts];
                  copy[idx] = e.target.value;
                  setInputDrafts(copy);
                }}
                style={{
                  minHeight: '44px',
                  padding: '8px 12px',
                  backgroundColor: '#1A2225',
                  color: '#E8EEF0',
                  border: '1px solid #33434A',
                  borderRadius: '2px',
                }}
              />
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-slate"
                onClick={() => setInputModal({ open: false })}
              >
                {locale === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button type="submit" className="btn-primary-chamfer">
                {locale === 'id' ? 'Kirim' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
