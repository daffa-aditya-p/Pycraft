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
  stepGoal?: string;
  requirementChips?: string[];
  capabilities?: string[];
  targetKCs?: string[];
  guidedTemplate?: string;
  lessonSlides?: Array<{
    title: { id: string; en: string };
    body: { id: string; en: string };
    exampleCode?: string;
  }>;
  hasNextStep?: boolean;
  nextStepTitle?: string;
  onNextStep?: () => void;
  onChangeTier?: (tier: AssistanceTier) => void;
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

const TIER_HINTS: Record<AssistanceTier, { id: string; en: string }> = {
  guided: {
    id: '💡 Terpandu: Klik kotak kuning ___ atau ketik bebas di baris mana saja',
    en: '💡 Guided: Click yellow ___ blanks or type freely on any line',
  },
  assisted: {
    id: '💡 Dibantu: Kerangka awal dengan petunjuk komentar',
    en: '💡 Assisted: Starter skeleton with comment hints',
  },
  independent: {
    id: '💡 Mandiri: Tulis solusi lengkap dari instruksi',
    en: '💡 Independent: Write full solution from instructions',
  },
  mastery: {
    id: '💡 Mahir: Kanvas kosong tanpa bantuan (+XP Maksimal)',
    en: '💡 Mastery: Blank canvas with no scaffolding (+Max XP)',
  },
};

const SPEEDS: Array<{ value: PlaybackSpeed; label: string }> = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
  { value: 'instant', label: 'Instan' },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  stepTitle,
  stepGoal,
  requirementChips = [],
  capabilities = [],
  targetKCs = [],
  guidedTemplate,
  lessonSlides,
  hasNextStep = false,
  nextStepTitle,
  onNextStep,
  onChangeTier,
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
  const [lessonGuideOpen, setLessonGuideOpen] = useState(false);
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
      backgroundColor: '#FBF8F1',
      border: '2px solid #76B8CF',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 6px 0 rgba(70, 130, 160, 0.25), 0 18px 36px rgba(15, 50, 75, 0.22)',
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
            backgroundColor: '#EDF6FA',
            borderBottom: '1px solid #C8E2EE',
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
                    mobileSheetSnap === snap && !editorAutoCollapsed ? '#F59E0B' : '#96C4D8',
                  backgroundColor:
                    mobileSheetSnap === snap && !editorAutoCollapsed ? '#FEF3C7' : '#FFFFFF',
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
          padding: isLandscapePhone ? '8px 10px' : '12px 14px',
          background: 'linear-gradient(135deg, #0E7490 0%, #0D9488 100%)',
          borderBottom: '2px solid #0F766E',
          display: 'flex',
          flexDirection: 'column',
          gap: isLandscapePhone ? '6px' : '8px',
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
                padding: '3px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                backgroundColor:
                  runtimeStatus === 'error'
                    ? '#FFE4E6'
                    : runtimeStatus === 'completed'
                      ? '#DCFCE7'
                      : '#FEF3C7',
                border: `1.5px solid ${
                  runtimeStatus === 'error'
                    ? '#E11D48'
                    : runtimeStatus === 'completed'
                      ? '#16A34A'
                      : '#F59E0B'
                }`,
                color:
                  runtimeStatus === 'error'
                    ? '#9F1239'
                    : runtimeStatus === 'completed'
                      ? '#166534'
                      : '#92400E',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
              }}
            >
              {statusText}
            </span>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                fontWeight: 800,
                color: '#FFFFFF',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
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
                style={{
                  minHeight: '36px',
                  minWidth: '36px',
                  padding: '0 8px',
                  background: 'rgba(255, 255, 255, 0.92)',
                  borderColor: '#BAE6FD',
                  color: '#0E7490',
                }}
              >
                <IconClose size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Requirement chips & 4-tier switcher */}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {requirementChips.map((chip) => (
                <span
                  key={chip}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.45)',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div
                role="group"
                aria-label={locale === 'id' ? 'Tingkat Bantuan' : 'Assistance Tier'}
                style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
              >
                {TIERS.map((tItem) => {
                  const active = tier === tItem.id;
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      data-testid={`tier-btn-${tItem.id}`}
                      aria-pressed={active}
                      onClick={() => {
                        if (onChangeTier) {
                          onChangeTier(tItem.id);
                        } else {
                          setTier(tItem.id);
                        }
                      }}
                      style={{
                        minHeight: '30px',
                        padding: '2px 10px',
                        backgroundColor: active ? '#FBBF24' : 'rgba(255, 255, 255, 0.16)',
                        color: active ? '#422006' : '#FFFFFF',
                        border: active ? '1.5px solid #FEF3C7' : '1px solid rgba(255, 255, 255, 0.35)',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {locale === 'id' ? tItem.idLabel : tItem.enLabel}
                    </button>
                  );
                })}
              </div>
              <div
                data-testid="tier-explanation-badge"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#E0F2FE',
                  backgroundColor: 'rgba(15, 23, 42, 0.22)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  lineHeight: 1.3,
                }}
              >
                {TIER_HINTS[tier][locale === 'id' ? 'id' : 'en']}
              </div>
            </div>
          </div>
        )}

        {/* Explicit Mission Goal / Task Instruction Banner */}
        {!isPeekSheet && !editorAutoCollapsed && !isKeyboardFullOverlay && stepGoal && (
          <div
            data-testid="editor-step-goal"
            style={{
              padding: isLandscapePhone ? '6px 10px' : '8px 12px',
              backgroundColor: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              borderLeft: '5px solid #F59E0B',
              borderRadius: '10px',
              fontSize: isLandscapePhone ? '0.78rem' : '0.84rem',
              lineHeight: 1.4,
              color: '#3E1F05',
              maxHeight: isLandscapePhone ? '64px' : undefined,
              overflowY: isLandscapePhone ? 'auto' : undefined,
            }}
          >
            <strong
              style={{
                backgroundColor: '#FDE68A',
                color: '#78350F',
                padding: '1px 7px',
                borderRadius: '999px',
                marginRight: '8px',
                fontSize: '0.75rem',
              }}
            >
              {locale === 'id' ? 'Tugas' : 'Task'}
            </strong>
            <span style={{ fontWeight: 600 }}>{stepGoal}</span>
          </div>
        )}

        {lessonSlides && lessonSlides.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            <button
              type="button"
              data-testid="btn-toggle-lesson-guide"
              onClick={() => setLessonGuideOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: lessonGuideOpen
                  ? '1px solid #0284C7'
                  : '1px solid #CBD5E1',
                backgroundColor: lessonGuideOpen ? '#E0F2FE' : '#F8FAFC',
                color: lessonGuideOpen ? '#0369A1' : '#334155',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>
                {locale === 'id' ? '📖 Materi & Contoh' : '📖 Lesson & Examples'}
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                {lessonGuideOpen ? '▲' : '▼'}
              </span>
            </button>

            {lessonGuideOpen && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '10px 12px',
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '10px',
                  maxHeight: isLandscapePhone ? '130px' : '210px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {lessonSlides.map((slide, idx) => (
                  <div
                    key={idx}
                    style={{
                      paddingBottom:
                        idx < lessonSlides.length - 1 ? '8px' : undefined,
                      borderBottom:
                        idx < lessonSlides.length - 1
                          ? '1px solid #BAE6FD'
                          : undefined,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        color: '#0C4A6E',
                        marginBottom: '3px',
                      }}
                    >
                      {slide.title[locale]}
                    </div>
                    <div
                      style={{
                        fontSize: '0.79rem',
                        lineHeight: 1.45,
                        color: '#1E293B',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {slide.body[locale]}
                    </div>
                    {slide.exampleCode && (
                      <pre
                        style={{
                          margin: '6px 0 0',
                          padding: '7px 10px',
                          backgroundColor: '#0F172A',
                          color: '#E2E8F0',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          overflowX: 'auto',
                          lineHeight: 1.4,
                        }}
                      >
                        <code>{slide.exampleCode}</code>
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Editor + Toolbar + Bottom Tabs */}
      {!isPeekSheet && !editorAutoCollapsed && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FBF8F1',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              padding: isLandscapePhone ? '6px 8px' : '8px 12px',
              borderBottom: '1px solid #DFD5C0',
              display: 'flex',
              alignItems: 'center',
              gap: isLandscapePhone ? '6px' : '8px',
              flexWrap: 'wrap',
              backgroundColor: '#F4EFE4',
            }}
          >
            {!isRunning ? (
              <button
                type="button"
                data-testid="btn-run-code"
                className="btn-primary-chamfer"
                disabled={isPreparing}
                onClick={handleRun}
                style={{ minHeight: '38px', padding: '4px 14px', fontSize: '0.875rem' }}
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
                  background: '#FFE4E6',
                  borderColor: '#E11D48',
                  color: '#9F1239',
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
                padding: '4px 12px',
                fontSize: '0.8125rem',
                background: 'linear-gradient(180deg, #ECFEFF 0%, #CFFAFE 100%)',
                borderColor: '#06B6D4',
                color: '#0E7490',
              }}
            >
              <IconHint size={16} />
              <span>{locale === 'id' ? 'Petunjuk NEO' : 'NEO Hint'}</span>
            </button>

            {runtimeStatus === 'completed' && hasNextStep && onNextStep && (
              <button
                type="button"
                data-testid="btn-next-step"
                className="btn-primary-chamfer"
                onClick={onNextStep}
                style={{
                  minHeight: '38px',
                  padding: '4px 14px',
                  fontSize: '0.8125rem',
                  marginLeft: 'auto',
                  background: 'linear-gradient(180deg, #4ADE80 0%, #16A34A 100%)',
                  borderColor: '#15803D',
                  color: '#FFFFFF',
                  boxShadow: '0 3px 0 #166534',
                }}
              >
                <span>
                  {locale === 'id'
                    ? `Lanjut${nextStepTitle ? `: ${nextStepTitle}` : ' Langkah Berikutnya'} →`
                    : `Next${nextStepTitle ? `: ${nextStepTitle}` : ' Step'} →`}
                </span>
              </button>
            )}
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
                <div style={{ padding: '12px', color: '#4C697C' }}>
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
              style={{
                margin: '0 8px 8px',
                padding: '10px 14px',
                backgroundColor: '#ECFEFF',
                border: '2px solid #06B6D4',
                borderLeft: '6px solid #0891B2',
                borderRadius: '12px',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(8, 145, 178, 0.14)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#0E7490', fontSize: '0.85rem' }}>
                  NEO ({mentorPanel.visorMood})
                  {mentorPanel.activeRung > 0 ? ` · Petunjuk ${mentorPanel.activeRung}/4` : ''}
                </strong>
                <button
                  type="button"
                  aria-label="Tutup panel NEO"
                  onClick={() => setMentorPanel({ open: false })}
                  style={{
                    background: '#CFFAFE',
                    border: '1px solid #06B6D4',
                    borderRadius: '999px',
                    width: '24px',
                    height: '24px',
                    color: '#0E7490',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  ×
                </button>
              </div>
              {mentorPanel.errorHeadline && (
                <div style={{ fontWeight: 800, color: '#B45309' }}>
                  {mentorPanel.errorHeadline}
                </div>
              )}
              {mentorPanel.errorBody && (
                <div style={{ color: '#172B3A', lineHeight: 1.45, fontWeight: 500 }}>{mentorPanel.errorBody}</div>
              )}
              {mentorPanel.socraticQuestion && (
                <div style={{ color: '#0E7490', fontStyle: 'italic', fontWeight: 600 }}>
                  {mentorPanel.socraticQuestion}
                </div>
              )}
              {mentorPanel.codeSnippet && (
                <pre
                  style={{
                    margin: 0,
                    padding: '8px 10px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #A5F3FC',
                    borderRadius: '8px',
                    color: '#15803D',
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
                      color: '#0E7490',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
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
                        padding: '8px',
                        backgroundColor: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        borderRadius: '8px',
                        color: '#BE123C',
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

          {/* Bottom Tabs: Console / Variables / Timeline */}
          {!isKeyboardFullOverlay && (
            <div
              style={{
                flex: isLandscapePhone ? '0 1 32%' : '0 1 40%',
                minHeight: isLandscapePhone ? '86px' : '140px',
                display: 'flex',
                flexDirection: 'column',
                borderTop: '2px solid #C8E2EE',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div
                role="tablist"
                aria-label="Panel Eksekusi"
                style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '6px 10px 0',
                  backgroundColor: '#EDF6FA',
                  borderBottom: '1px solid #C8E2EE',
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
                      minHeight: '34px',
                      padding: '4px 14px',
                      backgroundColor: bottomTab === tab.id ? '#FFFFFF' : 'transparent',
                      color: bottomTab === tab.id ? '#0E7490' : '#4C697C',
                      border: bottomTab === tab.id ? '1px solid #C8E2EE' : '1px solid transparent',
                      borderBottom:
                        bottomTab === tab.id
                          ? '3px solid #F59E0B'
                          : '3px solid transparent',
                      borderRadius: '8px 8px 0 0',
                      fontWeight: 800,
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
                  padding: '10px 12px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {bottomTab === 'console' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={clearConsole}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          borderRadius: '999px',
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {locale === 'id' ? 'Bersihkan' : 'Clear'}
                      </button>
                    </div>

                    {consoleEntries.length === 0 ? (
                      <div style={{ color: '#4C697C', fontSize: '0.8125rem' }}>
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
                              ? '#DC2626'
                              : entry.kind === 'warning'
                                ? '#B45309'
                                : entry.kind === 'action'
                                  ? '#0E7490'
                                  : entry.kind === 'system'
                                    ? '#15803D'
                                    : '#0F172A';
                          const bg =
                            entry.kind === 'error'
                              ? '#FEF2F2'
                              : entry.kind === 'warning'
                                ? '#FFFBEB'
                                : entry.kind === 'system'
                                  ? '#F0FDF4'
                                  : 'transparent';
                          return (
                            <div
                              key={entry.id}
                              style={{
                                color,
                                backgroundColor: bg,
                                padding: bg !== 'transparent' ? '4px 8px' : '2px 0',
                                borderRadius: '6px',
                                fontWeight: entry.kind === 'error' ? 700 : 500,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
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
                          borderTop: '1px solid #E2E8F0',
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
                              padding: '6px 10px',
                              backgroundColor: sc.passed ? '#F0FDF4' : '#FEF2F2',
                              border: `1.5px solid ${sc.passed ? '#4ADE80' : '#FCA5A5'}`,
                              borderRadius: '8px',
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: sc.passed ? '#15803D' : '#DC2626',
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
                                  padding: '2px 10px',
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
                      <div style={{ color: '#4C697C', fontSize: '0.8125rem' }}>
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
                          <tr style={{ color: '#4C697C', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                            <th style={{ padding: '6px' }}>Nama</th>
                            <th style={{ padding: '6px' }}>Tipe</th>
                            <th style={{ padding: '6px' }}>Nilai</th>
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
                                    ? '#FEF3C7'
                                    : 'transparent',
                                  borderTop: '1px solid #F1F5F9',
                                }}
                              >
                                <td style={{ padding: '6px', color: '#0F172A', fontWeight: 700 }}>{v.name}</td>
                                <td style={{ padding: '6px', color: '#0E7490', fontWeight: 600 }}>
                                  {v.typeName}
                                </td>
                                <td style={{ padding: '6px', color: '#15803D', fontWeight: 600 }}>{v.repr}</td>
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
                          padding: '6px 10px',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #F59E0B',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#92400E',
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
                        style={{ flex: 1, accentColor: '#0891B2' }}
                      />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#335267', minWidth: '58px' }}>
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
                              padding: '2px 8px',
                              backgroundColor:
                                playbackSpeed === sp.value ? '#FEF3C7' : '#F1F5F9',
                              color:
                                playbackSpeed === sp.value ? '#92400E' : '#475569',
                              border:
                                playbackSpeed === sp.value
                                  ? '1.5px solid #F59E0B'
                                  : '1px solid #CBD5E1',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
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
                            fontWeight: 700,
                            color: '#335267',
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
            backgroundColor: 'rgba(15, 50, 75, 0.45)',
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
              padding: '24px',
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
                color: '#0E7490',
              }}
            >
              {locale === 'id' ? 'Jawaban untuk input()' : 'Answers for input()'}
            </h2>
            {inputModal.prompt && (
              <p style={{ margin: 0, color: '#172B3A', fontSize: '0.9375rem', fontWeight: 600 }}>
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
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '2px solid #9ECCDF',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
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
