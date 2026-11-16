import React, { useMemo, useRef } from 'react';
import {
  RANK_THRESHOLDS,
  useSettingsStore,
  useUIStore,
  type SlotSummary,
} from '@/stores';
import { IconFullscreen, IconPlay } from '../icons';
import { formatRelativeTime } from '../layout';

export interface TitleScreenProps {
  onContinueAdventure?: (slot: SlotSummary) => void;
  onToggleFullscreen?: () => void;
}

const REGION_NAMES: Record<string, { id: string; en: string }> = {
  awakening: { id: 'Kebangkitan', en: 'The Awakening' },
  data_valley: { id: 'Lembah Data', en: 'Data Valley' },
  arithmetic_mines: { id: 'Tambang Aritmetika', en: 'Arithmetic Mines' },
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onContinueAdventure,
  onToggleFullscreen,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const lastActiveSlotId = useSettingsStore((s) => s.lastActiveSlotId);
  const slotSummaries = useUIStore((s) => s.slotSummaries);
  const fullscreenSupported = useUIStore((s) => s.fullscreenSupported);
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const worldLoadProgress = useUIStore((s) => s.worldLoadProgress);
  const worldLoadPhase = useUIStore((s) => s.worldLoadPhase);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const layoutClass = useUIStore((s) => s.layoutClass);

  const menuRef = useRef<HTMLDivElement | null>(null);

  const activeSlot = useMemo(() => {
    const occupied = slotSummaries.filter((s) => s.occupied);
    if (occupied.length === 0) return null;
    if (lastActiveSlotId !== null) {
      const preferred = occupied.find((s) => s.slotId === lastActiveSlotId);
      if (preferred) return preferred;
    }
    return [...occupied].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  }, [slotSummaries, lastActiveSlotId]);

  const rankLabel = useMemo(() => {
    if (!activeSlot) return '';
    const found = RANK_THRESHOLDS.find((r) => r.rank === activeSlot.architectRank);
    return found ? (locale === 'id' ? found.id : found.en) : `Rank ${activeSlot.architectRank}`;
  }, [activeSlot, locale]);

  const regionLabel = useMemo(() => {
    if (!activeSlot) return '';
    const found = REGION_NAMES[activeSlot.currentRegionId];
    return found ? (locale === 'id' ? found.id : found.en) : activeSlot.currentRegionId;
  }, [activeSlot, locale]);

  const handleContinue = () => {
    if (!activeSlot) return;
    if (onContinueAdventure) {
      onContinueAdventure(activeSlot);
    } else {
      navigateTo('loading_world');
    }
  };

  const handleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
    );
    if (buttons.length === 0) return;
    e.preventDefault();
    const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    const nextIdx =
      currentIdx === -1
        ? 0
        : (currentIdx + delta + buttons.length) % buttons.length;
    buttons[nextIdx]?.focus();
  };

  const isCompact = layoutClass === 'P' || layoutClass === 'L';

  return (
    <main
      data-testid="title-screen"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCompact
          ? 'calc(16px + var(--sat)) calc(16px + var(--sar)) calc(16px + var(--sab)) calc(16px + var(--sal))'
          : '32px 48px',
        pointerEvents: 'none',
      }}
    >
      {/* Top bar: world loading status & Fullscreen toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          pointerEvents: 'auto',
        }}
      >
        {worldLoadProgress > 0 && worldLoadProgress < 100 ? (
          <div
            className="surface-slate"
            style={{
              padding: '6px 12px',
              fontSize: '0.875rem',
              color: '#A9B8BD',
            }}
          >
            {worldLoadPhase || (locale === 'id' ? 'Menyiapkan dunia…' : 'Preparing world…')}{' '}
            {Math.round(worldLoadProgress)}%
          </div>
        ) : (
          <div />
        )}

        {fullscreenSupported && (
          <button
            type="button"
            className="btn-slate touch-target-48"
            aria-label={
              isFullscreen
                ? locale === 'id'
                  ? 'Keluar Layar Penuh'
                  : 'Exit Fullscreen'
                : locale === 'id'
                  ? 'Layar Penuh'
                  : 'Fullscreen'
            }
            aria-pressed={isFullscreen}
            onClick={handleFullscreen}
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <IconFullscreen size={20} />
            {!isCompact && (
              <span>
                {locale === 'id' ? 'Layar Penuh' : 'Fullscreen'}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Left-aligned Title Header & Vertical Menu over live 3D island */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? '14px' : '20px',
          maxWidth: isCompact ? '100%' : '380px',
          width: '100%',
          pointerEvents: 'auto',
        }}
      >
        {/* 3D / Voxel-styled wordmark */}
        <header
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '6px',
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(28, 36, 39, 0.92)',
            border: '2px solid #33434A',
            boxShadow: '4px 4px 0 #161D1F',
            padding: isCompact ? '12px 16px' : '16px 24px',
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                backgroundColor: '#3CC4C0',
                border: '2px solid #E8EEF0',
                boxShadow: '2px 2px 0 #243034',
              }}
            />
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: isCompact ? '2rem' : '2.75rem',
                letterSpacing: '0.08em',
                lineHeight: 1,
                color: '#F2B544',
                textShadow: '3px 3px 0 #161D1F',
              }}
            >
              PYCRAFT
            </h1>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '1rem',
              letterSpacing: '0.06em',
              color: '#E8EEF0',
              textTransform: 'uppercase',
            }}
          >
            Code Your World
          </p>
        </header>

        {/* Vertical Navigation Menu */}
        <nav
          ref={menuRef}
          aria-label={locale === 'id' ? 'Menu Utama' : 'Main Menu'}
          onKeyDown={handleMenuKeyDown}
          className="surface-slate"
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div>
            <button
              type="button"
              data-testid="btn-continue-adventure"
              className="btn-primary-chamfer"
              disabled={!activeSlot}
              onClick={handleContinue}
              style={{
                width: '100%',
                justifyContent: 'space-between',
                padding: '10px 16px',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <IconPlay size={18} />
                {locale === 'id' ? 'Lanjutkan Petualangan' : 'Continue Adventure'}
              </span>
              {activeSlot && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                  Slot {activeSlot.slotId}
                </span>
              )}
            </button>
            <div
              style={{
                padding: '4px 4px 0',
                fontSize: '0.8125rem',
                color: activeSlot ? '#A9B8BD' : '#8FA3A9',
              }}
            >
              {activeSlot
                ? `${activeSlot.playerName} · ${rankLabel} · ${regionLabel} · ${formatRelativeTime(activeSlot.updatedAt, locale)}`
                : locale === 'id'
                  ? 'Belum ada petualangan tersimpan'
                  : 'No saved adventure yet'}
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-select-adventure"
            className="btn-slate"
            onClick={() => navigateTo('save_management')}
            style={{ justifyContent: 'flex-start' }}
          >
            {locale === 'id' ? 'Pilih Petualangan' : 'Select Adventure'}
          </button>

          <button
            type="button"
            data-testid="btn-new-adventure"
            className="btn-slate"
            onClick={() => navigateTo('new_adventure')}
            style={{ justifyContent: 'flex-start' }}
          >
            {locale === 'id' ? 'Petualangan Baru' : 'New Adventure'}
          </button>

          <button
            type="button"
            data-testid="btn-game-modes"
            className="btn-slate"
            onClick={() => navigateTo('modes')}
            style={{ justifyContent: 'flex-start' }}
          >
            {locale === 'id' ? 'Mode Permainan' : 'Game Modes'}
          </button>

          <button
            type="button"
            data-testid="btn-world-progress"
            className="btn-slate"
            onClick={() => navigateTo('progress')}
            style={{ justifyContent: 'flex-start' }}
          >
            {locale === 'id' ? 'Dunia & Progres' : 'World & Progress'}
          </button>

          <button
            type="button"
            data-testid="btn-settings"
            className="btn-slate"
            onClick={() => navigateTo('settings')}
            style={{ justifyContent: 'flex-start' }}
          >
            {locale === 'id' ? 'Pengaturan' : 'Settings'}
          </button>
        </nav>
      </div>

      {/* Bottom caption */}
      <div
        style={{
          fontSize: '0.8125rem',
          color: '#E8EEF0',
          backgroundColor: 'rgba(28, 36, 39, 0.85)',
          padding: '4px 10px',
          borderRadius: '2px',
          alignSelf: 'flex-start',
          border: '1px solid #33434A',
          pointerEvents: 'auto',
        }}
      >
        {locale === 'id'
          ? 'R1 Kebangkitan · Simpan lokal di perangkat ini'
          : 'R1 The Awakening · Local-first saves on this device'}
      </div>
    </main>
  );
};
