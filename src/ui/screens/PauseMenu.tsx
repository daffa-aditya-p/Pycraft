import React from 'react';
import { EventBus, useGameStore, useSettingsStore, useUIStore } from '@/stores';
import { IconJournal, IconPlay, IconSave, IconSettings, IconSpark } from '../icons';
import { formatRelativeTime } from '../layout';

export interface PauseMenuProps {
  onSaveNow?: () => void | Promise<void>;
  onExportCurrentSlot?: () => void | Promise<void>;
  onReturnToTitle?: () => void | Promise<void>;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onSaveNow,
  onExportCurrentSlot,
  onReturnToTitle,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const lastSavedAt = useUIStore((s) => s.lastSavedAt);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);
  const setJournalTab = useUIStore((s) => s.setJournalTab);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const activeSlotId = useGameStore((s) => s.activeSlotId);

  const handleResume = () => {
    setInGameOverlay('explore');
  };

  const handleSaveNow = async () => {
    if (onSaveNow) {
      await onSaveNow();
    } else {
      EventBus.emit('save.requested', { reason: 'manual', immediate: true });
    }
  };

  const handleMainMenu = async () => {
    await handleSaveNow();
    if (onReturnToTitle) {
      await onReturnToTitle();
    } else {
      navigateTo('title');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-menu-title"
      data-testid="pause-menu"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        backgroundColor: 'rgba(28, 36, 39, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h1
          id="pause-menu-title"
          style={{
            margin: '0 0 4px',
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: '#F2B544',
            textAlign: 'center',
          }}
        >
          {locale === 'id' ? 'Jeda' : 'Paused'}
        </h1>

        <div
          style={{
            textAlign: 'center',
            fontSize: '0.8125rem',
            color: '#A9B8BD',
            marginBottom: '6px',
          }}
        >
          {lastSavedAt
            ? `${locale === 'id' ? 'Tersimpan' : 'Saved'} ${formatRelativeTime(lastSavedAt, locale)}`
            : locale === 'id'
              ? 'Belum tersimpan sesi ini'
              : 'Not saved this session'}
        </div>

        <button
          type="button"
          className="btn-primary-chamfer"
          onClick={handleResume}
        >
          <IconPlay size={18} />
          <span>{locale === 'id' ? 'Lanjutkan' : 'Resume'}</span>
        </button>

        <button
          type="button"
          className="btn-slate"
          onClick={() => {
            setJournalTab('quests');
            setInGameOverlay('journal');
          }}
        >
          <IconJournal size={18} />
          <span>{locale === 'id' ? 'Jurnal' : 'Journal'}</span>
        </button>

        <button
          type="button"
          className="btn-slate"
          onClick={() => navigateTo('progress')}
        >
          <span>{locale === 'id' ? 'Peta Dunia' : 'World Map'}</span>
        </button>

        <button
          type="button"
          className="btn-slate"
          onClick={() => {
            setInGameOverlay('cinematic');
          }}
        >
          <IconSpark size={18} />
          <span>
            {locale === 'id' ? 'Tonton Ulang Sinematik' : 'Replay Cinematic'}
          </span>
        </button>

        <button
          type="button"
          className="btn-slate"
          onClick={() => navigateTo('settings')}
        >
          <IconSettings size={18} />
          <span>{locale === 'id' ? 'Pengaturan' : 'Settings'}</span>
        </button>

        <button
          type="button"
          className="btn-slate"
          onClick={() => void handleSaveNow()}
        >
          <IconSave size={18} />
          <span>{locale === 'id' ? 'Simpan Sekarang' : 'Save Now'}</span>
        </button>

        {activeSlotId !== null && onExportCurrentSlot && (
          <button
            type="button"
            className="btn-slate"
            onClick={() => void onExportCurrentSlot()}
          >
            <span>
              {locale === 'id'
                ? 'Cadangkan ke File (.json)'
                : 'Backup to File (.json)'}
            </span>
          </button>
        )}

        <button
          type="button"
          className="btn-slate"
          onClick={() => void handleMainMenu()}
          style={{ marginTop: '4px', borderColor: '#3D5058' }}
        >
          <span>{locale === 'id' ? 'Menu Utama' : 'Main Menu'}</span>
        </button>
      </div>
    </div>
  );
};
