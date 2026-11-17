import React, { useEffect } from 'react';
import {
  EventBus,
  useEditorStore,
  useGameStore,
  useSettingsStore,
  useUIStore,
} from '@/stores';
import {
  IconCamera,
  IconCheck,
  IconCode,
  IconJournal,
  IconMenu,
  IconSave,
  IconWarning,
} from '../icons';

export interface GameplayHudProps {
  isCinematic?: boolean;
  fps?: number | null;
  onInteract?: (targetId: string) => void;
  onToggleCamera?: () => void;
  onRecoverSave?: () => void;
}

export const GameplayHud: React.FC<GameplayHudProps> = ({
  isCinematic = false,
  fps = null,
  onInteract,
  onToggleCamera,
  onRecoverSave,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const showFps = useSettingsStore((s) => s.graphics.showFps);

  const objectiveLabel = useGameStore((s) => s.objectiveLabel);
  const activeMissionId = useGameStore((s) => s.quests.activeMissionId);
  const xp = useGameStore((s) => s.learning.xp);
  const cameraMode = useGameStore((s) => s.world.cameraMode);

  const saveStatus = useUIStore((s) => s.saveStatus);
  const announcements = useUIStore((s) => s.announcements);
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);
  const activePrompt = useUIStore((s) => s.activePrompt);
  const inGameOverlay = useUIStore((s) => s.inGameOverlay);
  const editorDockOpen = useUIStore((s) => s.editorDockOpen);
  const editorAutoCollapsed = useUIStore((s) => s.editorAutoCollapsedForRestoration);
  const layoutClass = useUIStore((s) => s.layoutClass);
  const inputMode = useUIStore((s) => s.inputMode);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);
  const setJournalTab = useUIStore((s) => s.setJournalTab);
  const setEditorDockOpen = useUIStore((s) => s.setEditorDockOpen);
  const announce = useUIStore((s) => s.announce);

  const runtimeStatus = useEditorStore((s) => s.runtimeStatus);

  // Announce key game events politely for assistive tech (#game-announcements)
  useEffect(() => {
    const unsubs = [
      EventBus.on('quest.objective.completed', ({ objectiveId }) => {
        announce(
          locale === 'id'
            ? `Tujuan selesai: ${objectiveId}`
            : `Objective completed: ${objectiveId}`
        );
      }),
      EventBus.on('mission.step.passed', ({ stepId, xpAwarded }) => {
        announce(
          locale === 'id'
            ? `Langkah ${stepId} berhasil! +${xpAwarded} XP.`
            : `Step ${stepId} passed! +${xpAwarded} XP.`
        );
      }),
      EventBus.on('mission.step.failed', ({ stepId }) => {
        announce(
          locale === 'id'
            ? `Langkah ${stepId} belum tepat. Periksa petunjuk NEO.`
            : `Step ${stepId} did not pass. Check NEO hints.`
        );
      }),
      EventBus.on('world.zone.restored', ({ zoneId }) => {
        announce(
          locale === 'id'
            ? `Zona ${zoneId} mulai pulih.`
            : `Zone ${zoneId} is restoring.`
        );
      }),
      EventBus.on('runtime.status.changed', ({ status, message }) => {
        if (status === 'error' || status === 'limit_reached') {
          announce(message ?? (locale === 'id' ? 'Terjadi kesalahan pada kode Python.' : 'Python code error.'));
        }
      }),
    ];
    return () => {
      for (const u of unsubs) u();
    };
  }, [announce, locale]);

  const saveLabel =
    saveStatus === 'saving'
      ? locale === 'id'
        ? 'Menyimpan…'
        : 'Saving…'
      : saveStatus === 'saved'
        ? locale === 'id'
          ? 'Tersimpan'
          : 'Saved'
        : saveStatus === 'error'
          ? locale === 'id'
            ? 'Gagal Simpan'
            : 'Save Error'
          : saveStatus === 'readonly'
            ? locale === 'id'
              ? 'Baca-Saja'
              : 'Read-Only'
            : locale === 'id'
              ? 'Siap'
              : 'Ready';

  const saveColor =
    saveStatus === 'error'
      ? '#E0603F'
      : saveStatus === 'readonly'
        ? '#E9A23B'
        : saveStatus === 'saved'
          ? '#6DBE4B'
          : '#A9B8BD';

  const isCompact = layoutClass === 'P' || layoutClass === 'L';

  return (
    <>
      {/* Persistent off-screen polite announcement landmark */}
      <div
        id="game-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only-live"
      >
        {announcements}
      </div>

      {!isCinematic && (
        <div
          data-testid="gameplay-hud"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            padding:
              'calc(12px + var(--sat)) calc(12px + var(--sar)) calc(12px + var(--sab)) calc(12px + var(--sal))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 20,
          }}
        >
          {/* Top Row: Objective Tracker (left) & Save + Action Buttons (right) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              paddingRight:
                (editorDockOpen || inGameOverlay === 'editor') &&
                !editorAutoCollapsed &&
                layoutClass !== 'P'
                  ? 'calc(44vw + 10px)'
                  : 0,
            }}
          >
            {/* Top-Left Objective Tracker (Clickable to open Quests/Objectives) */}
            <button
              type="button"
              data-testid="hud-objective-badge"
              aria-label={
                locale === 'id'
                  ? 'Buka Jurnal Objektif (Tekan O atau J)'
                  : 'Open Objectives Journal (Press O or J)'
              }
              onClick={() => {
                setJournalTab('quests');
                setInGameOverlay('journal');
              }}
              className="surface-slate"
              style={{
                pointerEvents: 'auto',
                padding: isCompact ? '8px 10px' : '10px 14px',
                maxWidth: isCompact ? '210px' : '320px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'block',
                background: 'var(--slate-base-96, #1C2427)',
                border: '1px solid var(--slate-border, #33434A)',
                borderRadius: 'var(--radius-2, 2px)',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#F2B544';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--slate-border, #33434A)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#3CC4C0',
                  }}
                >
                  {activeMissionId ?? (locale === 'id' ? 'Eksplorasi' : 'Exploration')} · {xp} XP
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: '#F2B544',
                    fontWeight: 700,
                    backgroundColor: 'rgba(242, 181, 68, 0.15)',
                    padding: '1px 5px',
                    borderRadius: '2px',
                    letterSpacing: '0.03em',
                  }}
                >
                  [O / J]
                </span>
              </div>
              <div
                style={{
                  marginTop: '3px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#E8EEF0',
                  lineHeight: 1.35,
                }}
              >
                {objectiveLabel ??
                  (locale === 'id'
                    ? 'Jelajahi pulau dan temui NEO.'
                    : 'Explore the island and meet NEO.')}
              </div>
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '0.6875rem',
                  color: '#8FA3A9',
                }}
              >
                {locale === 'id' ? 'Klik untuk daftar objektif' : 'Click for objectives list'}
              </div>
              {showFps && fps !== null && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#8FA3A9' }}>
                  {Math.round(fps)} FPS · {runtimeStatus}
                </div>
              )}
            </button>

            {/* Top-Right Controls */}
            <div
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {/* Save Status Chip */}
              <button
                type="button"
                data-testid="hud-save-status"
                onClick={() => {
                  if (saveStatus === 'error' && onRecoverSave) {
                    onRecoverSave();
                  } else {
                    EventBus.emit('save.requested', { reason: 'manual', immediate: true });
                  }
                }}
                className="btn-slate"
                aria-label={`${locale === 'id' ? 'Status simpan' : 'Save status'}: ${saveLabel}`}
                style={{
                  minHeight: '48px',
                  padding: '6px 10px',
                  borderColor: saveStatus === 'error' ? '#E0603F' : '#33434A',
                  color: saveColor,
                  fontSize: '0.8125rem',
                }}
              >
                {saveStatus === 'error' ? (
                  <IconWarning size={16} />
                ) : saveStatus === 'saved' ? (
                  <IconCheck size={16} />
                ) : (
                  <IconSave size={16} />
                )}
                {!isCompact && <span>{saveLabel}</span>}
              </button>

              {!isCompact && (
                <button
                  type="button"
                  data-testid="hud-camera-btn"
                  className="btn-slate touch-target-48"
                  aria-label={
                    locale === 'id'
                      ? `Ganti kamera (${cameraMode === 'isometric' ? 'Isometrik' : 'Orang Ketiga'})`
                      : 'Toggle Camera'
                  }
                  onClick={() => onToggleCamera?.()}
                >
                  <IconCamera size={18} />
                </button>
              )}

              <button
                type="button"
                data-testid="hud-journal-btn"
                className="btn-slate touch-target-48"
                aria-label={locale === 'id' ? 'Buka Jurnal' : 'Open Journal'}
                onClick={() => {
                  setJournalTab('quests');
                  setInGameOverlay('journal');
                }}
              >
                <IconJournal size={18} />
                {!isCompact && <span>{locale === 'id' ? 'Jurnal' : 'Journal'}</span>}
              </button>

              {inputMode !== 'touch' && (
                <button
                  type="button"
                  data-testid="hud-editor-btn"
                  className="btn-slate touch-target-48"
                  aria-label={locale === 'id' ? 'Buka Editor Kode' : 'Toggle Code Editor'}
                  aria-pressed={inGameOverlay === 'editor'}
                  onClick={() => setEditorDockOpen(inGameOverlay !== 'editor')}
                  style={{
                    borderColor: inGameOverlay === 'editor' ? '#3CC4C0' : '#33434A',
                    color: inGameOverlay === 'editor' ? '#3CC4C0' : '#E8EEF0',
                  }}
                >
                  <IconCode size={18} />
                  {!isCompact && <span>{locale === 'id' ? 'Kode' : 'Code'}</span>}
                </button>
              )}

              <button
                type="button"
                data-testid="hud-pause-btn"
                className="btn-slate touch-target-48"
                aria-label={locale === 'id' ? 'Menu Jeda' : 'Pause Menu'}
                onClick={() => setInGameOverlay('paused')}
              >
                <IconMenu size={20} />
              </button>
            </div>
          </div>

          {/* Bottom-Center Contextual Interaction Prompt */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {activePrompt && inGameOverlay === 'explore' && (
              <button
                type="button"
                data-testid="hud-interaction-prompt"
                className="btn-primary-chamfer"
                onClick={() => {
                  if (onInteract) {
                    onInteract(activePrompt.targetId);
                  } else {
                    EventBus.emit('player.interact', {
                      targetId: activePrompt.targetId,
                      kind: activePrompt.kind,
                    });
                  }
                }}
                style={{
                  pointerEvents: 'auto',
                  minHeight: '48px',
                  padding: '8px 18px',
                }}
              >
                <span>
                  [{activePrompt.keyHint}] {activePrompt.label}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          aria-label={locale === 'id' ? 'Notifikasi' : 'Notifications'}
          style={{
            position: 'fixed',
            top: 'calc(76px + var(--sat))',
            right: 'calc(12px + var(--sar))',
            zIndex: 95,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '320px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((toast) => {
            const borderColor =
              toast.kind === 'error'
                ? '#E0603F'
                : toast.kind === 'warning'
                  ? '#E9A23B'
                  : toast.kind === 'success'
                    ? '#6DBE4B'
                    : '#3CC4C0';
            return (
              <div
                key={toast.id}
                role="status"
                className="surface-slate"
                style={{
                  pointerEvents: 'auto',
                  padding: '10px 12px',
                  borderLeft: `3px solid ${borderColor}`,
                  fontSize: '0.875rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span>{toast.message}</span>
                <button
                  type="button"
                  aria-label={locale === 'id' ? 'Tutup notifikasi' : 'Dismiss'}
                  onClick={() => dismissToast(toast.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#A9B8BD',
                    cursor: 'pointer',
                    fontWeight: 700,
                    minWidth: '28px',
                    minHeight: '28px',
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
