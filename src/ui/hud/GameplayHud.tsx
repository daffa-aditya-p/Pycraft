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
  const objectiveHint = useGameStore((s) => s.objectiveHint);
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
      ? '#DC2626'
      : saveStatus === 'readonly'
        ? '#B45309'
        : saveStatus === 'saved'
          ? '#15803D'
          : '#0E7490';

  const isCompact = layoutClass === 'P' || layoutClass === 'L';
  const isLandscapePhone = layoutClass === 'L';
  const dockOffsetRight =
    (editorDockOpen || inGameOverlay === 'editor') && !editorAutoCollapsed && layoutClass !== 'P'
      ? isLandscapePhone
        ? 'calc(49vw + 8px)'
        : layoutClass === 'T'
          ? 'calc(46vw + 10px)'
          : 'calc(44vw + 10px)'
      : 0;

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
              gap: isCompact ? '8px' : '12px',
              paddingRight: dockOffsetRight,
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
                padding: isCompact ? '6px 10px' : '10px 14px',
                maxWidth: isLandscapePhone ? '210px' : isCompact ? '185px' : '330px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'block',
                background: 'linear-gradient(180deg, #FFFDF7 0%, #F4FAFD 100%)',
                border: '2px solid #F59E0B',
                borderRadius: isCompact ? '11px' : '14px',
                boxShadow: '0 4px 0 rgba(217, 119, 6, 0.28), 0 10px 22px rgba(15, 52, 76, 0.16)',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0891B2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#F59E0B';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: isCompact ? '0.6875rem' : '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#0E7490',
                  }}
                >
                  {activeMissionId ?? (locale === 'id' ? 'Eksplorasi' : 'Exploration')} · {xp} XP
                </div>
                {!isCompact && (
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: '#92400E',
                      fontWeight: 800,
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      padding: '1px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.03em',
                    }}
                  >
                    [O / J]
                  </span>
                )}
              </div>
              <div
                style={{
                  marginTop: isCompact ? '2px' : '4px',
                  fontSize: isCompact ? '0.8rem' : '0.9rem',
                  fontWeight: 800,
                  color: '#172B3A',
                  lineHeight: 1.3,
                  overflow: isCompact ? 'hidden' : undefined,
                  display: isCompact ? '-webkit-box' : undefined,
                  WebkitLineClamp: isCompact ? 2 : undefined,
                  WebkitBoxOrient: isCompact ? 'vertical' : undefined,
                }}
              >
                {objectiveLabel ??
                  (locale === 'id'
                    ? 'Jelajahi pulau dan temui NEO.'
                    : 'Explore the island and meet NEO.')}
              </div>
              {objectiveHint && (
                <div
                  style={{
                    marginTop: '5px',
                    padding: '4px 8px',
                    borderRadius: '7px',
                    backgroundColor: '#FEF9C3',
                    border: '1px solid #FDE047',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '5px',
                    fontSize: isCompact ? '0.71875rem' : '0.78125rem',
                    color: '#713F12',
                    lineHeight: 1.35,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ flexShrink: 0, fontSize: '0.85rem' }}>💡</span>
                  <span
                    style={{
                      overflow: isCompact ? 'hidden' : undefined,
                      display: isCompact ? '-webkit-box' : undefined,
                      WebkitLineClamp: isCompact ? 2 : undefined,
                      WebkitBoxOrient: isCompact ? 'vertical' : undefined,
                    }}
                  >
                    {objectiveHint}
                  </span>
                </div>
              )}
              {!isLandscapePhone && (
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: '#4C697C',
                  }}
                >
                  {locale === 'id' ? 'Klik untuk daftar objektif' : 'Click for objectives list'}
                </div>
              )}
              {showFps && fps !== null && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#0E7490', fontWeight: 700 }}>
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
                  minHeight: '44px',
                  padding: '6px 12px',
                  background:
                    saveStatus === 'error'
                      ? '#FEF2F2'
                      : saveStatus === 'readonly'
                        ? '#FFFBEB'
                        : '#ECFDF5',
                  borderColor:
                    saveStatus === 'error'
                      ? '#FCA5A5'
                      : saveStatus === 'readonly'
                        ? '#FCD34D'
                        : '#6EE7B7',
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
                  style={{
                    minHeight: '44px',
                    background: '#EFF6FF',
                    borderColor: '#93C5FD',
                    color: '#1D4ED8',
                  }}
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
                style={{
                  minHeight: '44px',
                  background: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)',
                  borderColor: '#F59E0B',
                  color: '#92400E',
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
                    minHeight: '44px',
                    background:
                      inGameOverlay === 'editor'
                        ? 'linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)'
                        : 'linear-gradient(180deg, #ECFEFF 0%, #CFFAFE 100%)',
                    borderColor: '#0891B2',
                    color: inGameOverlay === 'editor' ? '#FFFFFF' : '#0E7490',
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
                style={{
                  minHeight: '44px',
                  background: 'linear-gradient(180deg, #FFFDF7 0%, #F1F5F9 100%)',
                  borderColor: '#94A3B8',
                  color: '#1E293B',
                }}
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
            {activePrompt && inGameOverlay === 'explore' && inputMode !== 'touch' && (
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
                ? '#DC2626'
                : toast.kind === 'warning'
                  ? '#F59E0B'
                  : toast.kind === 'success'
                    ? '#16A34A'
                    : '#0891B2';
            return (
              <div
                key={toast.id}
                role="status"
                className="surface-slate"
                style={{
                  pointerEvents: 'auto',
                  padding: '10px 14px',
                  borderLeft: `5px solid ${borderColor}`,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#172B3A',
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
                    color: '#4C697C',
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
