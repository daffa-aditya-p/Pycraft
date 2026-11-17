import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EventBus,
  RANK_THRESHOLDS,
  useSettingsStore,
  useUIStore,
  type SlotSummary,
} from '@/stores';
import {
  IconExitFullscreen,
  IconFolder,
  IconFullscreen,
  IconJournal,
  IconLayers,
  IconMap,
  IconPlay,
  IconSettings,
  IconSpark,
  IconTerminal,
  IconVolumeMute,
  IconVolumeOn,
} from '../icons';
import { formatRelativeTime } from '../layout';
import { GuidebookModal } from '../components/GuidebookModal';

export interface TitleScreenProps {
  onContinueAdventure?: (slot: SlotSummary) => void;
  onToggleFullscreen?: () => void;
}

const REGION_NAMES: Record<string, { id: string; en: string }> = {
  awakening: { id: 'Kebangkitan', en: 'The Awakening' },
  data_valley: { id: 'Lembah Data', en: 'Data Valley' },
  arithmetic_mines: { id: 'Tambang Aritmetika', en: 'Arithmetic Mines' },
};

const TERMINAL_SNIPPETS = [
  'architect.awake(region="Awakening")',
  'bit.locate_pedestal()  # System Ready',
  'world.restore(core="Shrine")',
  'run_python(code=pure_magic)',
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onContinueAdventure,
  onToggleFullscreen,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const audio = useSettingsStore((s) => s.audio);
  const updateAudio = useSettingsStore((s) => s.updateAudio);
  const lastActiveSlotId = useSettingsStore((s) => s.lastActiveSlotId);

  const slotSummaries = useUIStore((s) => s.slotSummaries);
  const fullscreenSupported = useUIStore((s) => s.fullscreenSupported);
  const isFullscreen = useUIStore((s) => s.isFullscreen);
  const worldLoadProgress = useUIStore((s) => s.worldLoadProgress);
  const worldLoadPhase = useUIStore((s) => s.worldLoadPhase);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const layoutClass = useUIStore((s) => s.layoutClass);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [showGuidebook, setShowGuidebook] = useState(false);

  // Fullscreen transition animation states
  const [animatingFullscreen, setAnimatingFullscreen] = useState<'exit' | 'enter' | null>(null);
  const [showFullscreenToast, setShowFullscreenToast] = useState<{ mode: 'exit' | 'enter'; text: string } | null>(null);
  const prevFullscreenRef = useRef<boolean>(isFullscreen);

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

  const playHoverSfx = useCallback(() => {
    EventBus.emit('audio.cue', { cue: 'ui_click' });
  }, []);

  const playConfirmSfx = useCallback(() => {
    EventBus.emit('audio.cue', { cue: 'ui_confirm' });
  }, []);

  const handleContinue = useCallback(() => {
    if (!activeSlot) return;
    playConfirmSfx();
    if (onContinueAdventure) {
      onContinueAdventure(activeSlot);
    } else {
      navigateTo('loading_world');
    }
  }, [activeSlot, onContinueAdventure, navigateTo, playConfirmSfx]);

  const handleNavigate = useCallback(
    (screen: 'save_management' | 'new_adventure' | 'modes' | 'progress' | 'settings') => {
      playConfirmSfx();
      navigateTo(screen);
    },
    [navigateTo, playConfirmSfx]
  );

  const handleFullscreen = useCallback(() => {
    playConfirmSfx();
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      void document.documentElement
        .requestFullscreen?.()
        .then(() => {
          const orientation = window.screen?.orientation as
            | (ScreenOrientation & { lock?: (mode: string) => Promise<void> })
            | undefined;
          if (window.matchMedia?.('(pointer: coarse)').matches) {
            return orientation?.lock?.('landscape');
          }
          return undefined;
        })
        .catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  }, [onToggleFullscreen, playConfirmSfx]);

  const handleToggleMute = useCallback(() => {
    playConfirmSfx();
    updateAudio({ muted: !audio.muted });
  }, [audio.muted, updateAudio, playConfirmSfx]);

  const handleToggleLocale = useCallback(() => {
    playConfirmSfx();
    setLocale(locale === 'id' ? 'en' : 'id');
  }, [locale, setLocale, playConfirmSfx]);

  const cycleSnippet = () => {
    playHoverSfx();
    setSnippetIndex((prev) => (prev + 1) % TERMINAL_SNIPPETS.length);
  };

  // Listen to fullscreen state transitions (including Esc or F11)
  useEffect(() => {
    if (prevFullscreenRef.current !== isFullscreen) {
      const mode = isFullscreen ? 'enter' : 'exit';
      prevFullscreenRef.current = isFullscreen;
      setAnimatingFullscreen(mode);
      setShowFullscreenToast({
        mode,
        text:
          mode === 'exit'
            ? locale === 'id'
              ? 'KELUAR LAYAR PENUH // MODE JENDELA'
              : 'EXIT FULLSCREEN // WINDOWED MODE'
            : locale === 'id'
              ? 'LAYAR PENUH AKTIF // FULLSCREEN ENGAGED'
              : 'FULLSCREEN ENGAGED // AETHERIA IMMERSION',
      });
      EventBus.emit('audio.cue', { cue: mode === 'exit' ? 'gate_close' : 'gate_open' });
      const timer = setTimeout(() => setAnimatingFullscreen(null), 450);
      const toastTimer = setTimeout(() => setShowFullscreenToast(null), 1400);
      return () => {
        clearTimeout(timer);
        clearTimeout(toastTimer);
      };
    }
  }, [isFullscreen, locale]);

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
    playHoverSfx();
  };

  // Keyboard shortcut listener for hotkeys (1-6, G, M, L, F, Enter)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        handleNavigate('save_management');
      } else if (e.key === '2') {
        e.preventDefault();
        handleNavigate('new_adventure');
      } else if (e.key === '3') {
        e.preventDefault();
        handleNavigate('modes');
      } else if (e.key === '4') {
        e.preventDefault();
        handleNavigate('progress');
      } else if (e.key === '5') {
        e.preventDefault();
        handleNavigate('settings');
      } else if (e.key === '6' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        playConfirmSfx();
        setShowGuidebook((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleToggleLocale();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleNavigate, handleToggleMute, handleToggleLocale, playConfirmSfx]);

  const isCompact = layoutClass === 'P' || layoutClass === 'L';
  const isLandscapePhone = layoutClass === 'L';

  return (
    <main
      data-testid="title-screen"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: isLandscapePhone ? '8px' : undefined,
        padding: isCompact
          ? 'calc(10px + var(--sat)) calc(14px + var(--sar)) calc(10px + var(--sab)) calc(14px + var(--sal))'
          : '32px 48px',
        pointerEvents: 'none',
        overflowX: 'hidden',
        overflowY: isCompact ? 'auto' : 'hidden',
      }}
    >
      {/* Fullscreen Shutter Animation Overlay */}
      {animatingFullscreen === 'exit' && (
        <div aria-hidden="true" className="fullscreen-exit-shutter" />
      )}
      {animatingFullscreen === 'enter' && (
        <div aria-hidden="true" className="fullscreen-enter-shutter" />
      )}

      {/* Fullscreen Tactical HUD Toast Notification */}
      {showFullscreenToast && (
        <div
          role="status"
          aria-live="polite"
          className="fullscreen-hud-toast"
          style={{
            borderColor: showFullscreenToast.mode === 'exit' ? '#F59E0B' : '#0891B2',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '999px',
              backgroundColor: showFullscreenToast.mode === 'exit' ? '#F59E0B' : '#0891B2',
            }}
          />
          <span style={{ color: '#172B3A', fontWeight: 800 }}>
            {showFullscreenToast.text}
          </span>
        </div>
      )}

      {/* Tactical Framing Corner Brackets */}
      {!isCompact && (
        <>
          <div
            className={`title-hud-bracket ${
              animatingFullscreen === 'exit'
                ? 'bracket-anim-exit'
                : animatingFullscreen === 'enter'
                  ? 'bracket-anim-enter'
                  : ''
            }`}
            style={{ top: 16, left: 16, borderRight: 'none', borderBottom: 'none' }}
          />
          <div
            className={`title-hud-bracket ${
              animatingFullscreen === 'exit'
                ? 'bracket-anim-exit'
                : animatingFullscreen === 'enter'
                  ? 'bracket-anim-enter'
                  : ''
            }`}
            style={{ top: 16, right: 16, borderLeft: 'none', borderBottom: 'none' }}
          />
          <div
            className={`title-hud-bracket ${
              animatingFullscreen === 'exit'
                ? 'bracket-anim-exit'
                : animatingFullscreen === 'enter'
                  ? 'bracket-anim-enter'
                  : ''
            }`}
            style={{ bottom: 16, left: 16, borderRight: 'none', borderTop: 'none' }}
          />
          <div
            className={`title-hud-bracket ${
              animatingFullscreen === 'exit'
                ? 'bracket-anim-exit'
                : animatingFullscreen === 'enter'
                  ? 'bracket-anim-enter'
                  : ''
            }`}
            style={{ bottom: 16, right: 16, borderLeft: 'none', borderTop: 'none' }}
          />
        </>
      )}

      {/* Ambient Drifting Voxel Sparks */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div className="title-spark-node" style={{ left: '15%', bottom: '25%', width: 4, height: 4, backgroundColor: '#F2B544', animationDelay: '0s' }} />
        <div className="title-spark-node" style={{ left: '32%', bottom: '15%', width: 5, height: 5, backgroundColor: '#3CC4C0', animationDelay: '2s' }} />
        <div className="title-spark-node" style={{ left: '55%', bottom: '35%', width: 3, height: 3, backgroundColor: '#F2B544', animationDelay: '4s' }} />
        <div className="title-spark-node" style={{ left: '78%', bottom: '20%', width: 4, height: 4, backgroundColor: '#3CC4C0', animationDelay: '1.5s' }} />
      </div>

      {/* Top Telemetry & Quick Action Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      >
        {/* Left: World Status or Telemetry */}
        {worldLoadProgress > 0 && worldLoadProgress < 100 ? (
          <div
            className="surface-slate"
            style={{
              padding: '6px 14px',
              fontSize: '0.8125rem',
              color: '#172B3A',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderLeft: '4px solid #F59E0B',
              borderRadius: '999px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '999px',
                backgroundColor: '#F59E0B',
              }}
            />
            <span>
              {worldLoadPhase || (locale === 'id' ? 'Menyiapkan dunia…' : 'Preparing world…')}{' '}
              {Math.round(worldLoadProgress)}%
            </span>
          </div>
        ) : (
          <div
            className="surface-slate"
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-code)',
              letterSpacing: '0.05em',
              color: '#0E7490',
              fontWeight: 700,
              display: isCompact ? 'none' : 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '999px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '999px',
                backgroundColor: '#16A34A',
                boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.2)',
              }}
            />
            <span>AETHERIA ORBIT // [14.0, 5.5, 4.0]</span>
          </div>
        )}

        {/* Right: Quick Controls (Guidebook, Language, Mute, Fullscreen) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Top Guidebook Button */}
          <button
            type="button"
            data-testid="btn-top-guidebook"
            className="btn-slate touch-target-48"
            aria-label={locale === 'id' ? 'Buka Buku Panduan' : 'Open Guidebook'}
            onClick={() => {
              playConfirmSfx();
              setShowGuidebook(true);
            }}
            onMouseEnter={playHoverSfx}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '6px 12px',
              background: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)',
              color: '#92400E',
              borderColor: '#F59E0B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
            }}
          >
            <IconJournal size={18} />
            {!isCompact && (
              <span style={{ fontSize: '0.8125rem' }}>
                {locale === 'id' ? 'Buku Panduan' : 'Guidebook'}
              </span>
            )}
          </button>

          {/* Quick Language Switcher */}
          <button
            type="button"
            className="btn-slate touch-target-48"
            aria-label={locale === 'id' ? 'Ganti Bahasa ke English' : 'Switch Language to Indonesian'}
            onClick={handleToggleLocale}
            onMouseEnter={playHoverSfx}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '6px 12px',
              fontFamily: 'var(--font-code)',
              fontSize: '0.8125rem',
              fontWeight: 800,
            }}
          >
            <span style={{ color: locale === 'id' ? '#D97706' : '#64748B' }}>ID</span>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span style={{ color: locale === 'en' ? '#0891B2' : '#64748B' }}>EN</span>
          </button>

          {/* Quick Audio Mute Toggle */}
          <button
            type="button"
            className="btn-slate touch-target-48"
            aria-label={audio.muted ? (locale === 'id' ? 'Bunyikan Audio' : 'Unmute Audio') : (locale === 'id' ? 'Senapkan Audio' : 'Mute Audio')}
            aria-pressed={audio.muted}
            onClick={handleToggleMute}
            onMouseEnter={playHoverSfx}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '6px 10px',
              color: audio.muted ? '#DC2626' : '#0891B2',
              borderColor: audio.muted ? '#FCA5A5' : '#96C4D8',
            }}
          >
            {audio.muted ? <IconVolumeMute size={18} /> : <IconVolumeOn size={18} />}
          </button>

          {/* Fullscreen Toggle with Dynamic Icon & Animation */}
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
              onMouseEnter={playHoverSfx}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                padding: '6px 12px',
                borderColor: isFullscreen ? '#0891B2' : undefined,
                color: isFullscreen ? '#0E7490' : '#172B3A',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 200ms ease',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  transform: animatingFullscreen ? 'rotate(90deg) scale(0.85)' : 'none',
                  transition: 'transform 250ms var(--ease-out-cubic)',
                }}
              >
                {isFullscreen ? <IconExitFullscreen size={18} /> : <IconFullscreen size={18} />}
              </span>
              {!isCompact && (
                <span style={{ fontSize: '0.8125rem' }}>
                  {isFullscreen
                    ? locale === 'id'
                      ? 'Keluar Layar Penuh'
                      : 'Exit Fullscreen'
                    : locale === 'id'
                      ? 'Layar Penuh'
                      : 'Fullscreen'}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area: Brand Logo & Vertical Console Menu */}
      <div
        style={{
          display: isLandscapePhone ? 'grid' : 'flex',
          gridTemplateColumns: isLandscapePhone
            ? 'minmax(240px, 0.92fr) minmax(290px, 1.08fr)'
            : undefined,
          alignItems: isLandscapePhone ? 'start' : undefined,
          flexDirection: isLandscapePhone ? undefined : 'column',
          gap: isLandscapePhone ? '10px' : isCompact ? '10px' : '14px',
          maxWidth: isCompact ? '100%' : '430px',
          width: '100%',
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isLandscapePhone ? '8px' : isCompact ? '10px' : '14px',
            minWidth: 0,
          }}
        >
        {/* Brand Banner with 3D Isometric Voxel Cube Logo */}
        <section
          aria-label="PyCraft Brand"
          className="surface-slate"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isLandscapePhone ? '6px' : '10px',
            alignSelf: 'flex-start',
            width: '100%',
            background: 'linear-gradient(135deg, #0E7490 0%, #0D9488 100%)',
            border: '2px solid #A5F3FC',
            boxShadow: '0 6px 0 #0F766E, 0 16px 32px rgba(15, 50, 75, 0.25)',
            padding: isLandscapePhone ? '10px 12px' : isCompact ? '14px 16px' : '18px 22px',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isLandscapePhone ? '10px' : '14px' }}>
            {/* 3D Isometric Voxel Cube SVG */}
            <svg
              width={isLandscapePhone ? '36' : '48'}
              height={isLandscapePhone ? '36' : '48'}
              viewBox="0 0 48 48"
              className="title-floating-logo"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <polygon
                points="24,4 44,14 24,24 4,14"
                fill="#FBBF24"
                stroke="#422006"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <line x1="14" y1="9" x2="34" y2="19" stroke="#FDE68A" strokeWidth="1.5" />
              <line x1="34" y1="9" x2="14" y2="19" stroke="#FDE68A" strokeWidth="1.5" />

              <polygon
                points="4,14 24,24 24,44 4,34"
                fill="#D97706"
                stroke="#422006"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <line x1="4" y1="24" x2="24" y2="34" stroke="#F59E0B" strokeWidth="1.5" />

              <polygon
                points="24,24 44,14 44,34 24,44"
                fill="#06B6D4"
                stroke="#0F172A"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <polyline
                points="28,26 36,30 36,39"
                fill="none"
                stroke="#FFFBEB"
                strokeWidth="2"
                strokeLinecap="square"
              />
              <polygon points="21,12 27,14 21,16" fill="#422006" />
            </svg>

            {/* Title & Subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: isLandscapePhone ? '1.65rem' : isCompact ? '2.1rem' : '2.85rem',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    textShadow: '0 3px 0 rgba(15, 45, 70, 0.35)',
                  }}
                >
                  <span style={{ color: '#FDE047' }}>PY</span>
                  <span style={{ color: '#FFFFFF' }}>CRAFT</span>
                </h1>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-code)',
                    color: '#0F766E',
                    backgroundColor: '#CCFBF1',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #99F6E4',
                    letterSpacing: '0.04em',
                  }}
                >
                  v0.1.0
                </span>
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  letterSpacing: '0.14em',
                  color: '#ECFEFF',
                  textTransform: 'uppercase',
                }}
              >
                Code Your World
              </p>
            </div>
          </div>

          {/* Terminal / Code Quote Teaser */}
          <div
            onClick={cycleSnippet}
            title={locale === 'id' ? 'Klik untuk mengganti kode' : 'Click to cycle code snippet'}
            style={{
              marginTop: '2px',
              padding: '7px 12px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #99F6E4',
              borderRadius: '10px',
              display: isLandscapePhone ? 'none' : 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-code)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0E7490',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <IconTerminal size={14} className="title-terminal-icon" />
            <span style={{ color: '#D97706', fontWeight: 800 }}>&gt;&gt;&gt;</span>
            <span style={{ color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {TERMINAL_SNIPPETS[snippetIndex]}
            </span>
            <span className="title-cursor" aria-hidden="true" />
          </div>
        </section>

        {/* Hero Save Summary / Continue Banner */}
        <section
          aria-label={locale === 'id' ? 'Ringkasan Petualangan' : 'Adventure Summary'}
          className="surface-slate"
          style={{
            background: '#FFFDF7',
            border: activeSlot ? '2px solid #F59E0B' : '2px dashed #76B8CF',
            boxShadow: '0 4px 0 rgba(70, 130, 160, 0.25), 0 12px 24px rgba(15, 50, 75, 0.16)',
            padding: '12px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {activeSlot ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F3E5C8',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 9,
                      borderRadius: '999px',
                      backgroundColor: '#16A34A',
                      boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.2)',
                    }}
                  />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#172B3A' }}>
                    {activeSlot.playerName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: '#92400E',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      padding: '1px 8px',
                      borderRadius: '999px',
                      fontWeight: 800,
                    }}
                  >
                    {rankLabel}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-code)',
                    color: '#4C697C',
                    fontWeight: 700,
                  }}
                >
                  Slot {activeSlot.slotId}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#335267',
                }}
              >
                <span>{regionLabel}</span>
                <span>{formatRelativeTime(activeSlot.updatedAt, locale)}</span>
              </div>

              <button
                type="button"
                data-testid="btn-continue-adventure"
                className="btn-primary-chamfer"
                onClick={handleContinue}
                onMouseEnter={playHoverSfx}
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  marginTop: '2px',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <IconPlay size={20} />
                  <span>{locale === 'id' ? 'Lanjutkan Petualangan' : 'Continue Adventure'}</span>
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    backgroundColor: '#FFFBEB',
                    color: '#92400E',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    letterSpacing: '0.04em',
                  }}
                >
                  [ENTER]
                </span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                data-testid="btn-continue-adventure"
                className="btn-primary-chamfer"
                disabled={true}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '10px 16px',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <IconPlay size={18} />
                  <span>{locale === 'id' ? 'Lanjutkan Petualangan' : 'Continue Adventure'}</span>
                </span>
              </button>
              <div
                style={{
                  padding: '2px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#4C697C',
                  textAlign: 'center',
                }}
              >
                {locale === 'id'
                  ? 'Belum ada petualangan tersimpan'
                  : 'No saved adventure yet'}
              </div>
            </div>
          )}
        </section>
        </div>

        {/* Vertical / Landscape 2-Col Navigation Menu Panel */}
        <nav
          ref={menuRef}
          aria-label={locale === 'id' ? 'Menu Utama' : 'Main Menu'}
          onKeyDown={handleMenuKeyDown}
          className="surface-slate"
          style={{
            padding: isLandscapePhone ? '8px' : '10px',
            display: isLandscapePhone ? 'grid' : 'flex',
            gridTemplateColumns: isLandscapePhone ? 'repeat(2, minmax(0, 1fr))' : undefined,
            flexDirection: isLandscapePhone ? undefined : 'column',
            gap: '6px',
            borderRadius: '16px',
          }}
        >
          {/* 1. Pilih Petualangan / Select Adventure */}
          <button
            type="button"
            data-testid="btn-select-adventure"
            className="title-menu-btn"
            onClick={() => handleNavigate('save_management')}
            onMouseEnter={playHoverSfx}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#0891B2', display: 'inline-flex' }}><IconFolder size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Pilih Petualangan' : 'Select Adventure'}
                </span>
                <span className="title-menu-sub" style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#4C697C' }}>
                  {locale === 'id' ? 'Kelola 3 slot penyimpanan lokal' : 'Manage 3 local save slots'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#0E7490',
                backgroundColor: '#E0F2FE',
                padding: '2px 7px',
                borderRadius: '999px',
              }}
            >
              [1]
            </span>
          </button>

          {/* 2. Petualangan Baru / New Adventure */}
          <button
            type="button"
            data-testid="btn-new-adventure"
            className="title-menu-btn"
            onClick={() => handleNavigate('new_adventure')}
            onMouseEnter={playHoverSfx}
            style={{
              borderLeftColor: '#F59E0B',
              background: !activeSlot
                ? 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)'
                : undefined,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#D97706', display: 'inline-flex' }}><IconSpark size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Petualangan Baru' : 'New Adventure'}
                </span>
                <span className="title-menu-sub" style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#4C697C' }}>
                  {locale === 'id' ? 'Mulai perjalanan arsitek baru' : 'Begin a fresh architect journey'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#92400E',
                backgroundColor: '#FEF3C7',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: 700,
              }}
            >
              [2]
            </span>
          </button>

          {/* 3. Mode Permainan / Game Modes */}
          <button
            type="button"
            data-testid="btn-game-modes"
            className="title-menu-btn"
            onClick={() => handleNavigate('modes')}
            onMouseEnter={playHoverSfx}
            style={{ borderLeftColor: '#16A34A' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#16A34A', display: 'inline-flex' }}><IconLayers size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Mode Permainan' : 'Game Modes'}
                </span>
                <span className="title-menu-sub" style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#4C697C' }}>
                  {locale === 'id' ? 'Petualangan, Otomasi & Sandbox' : 'Adventure, Automation & Sandbox'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '2px 7px',
                borderRadius: '999px',
              }}
            >
              [3]
            </span>
          </button>

          {/* 4. Dunia & Progres / World & Progress */}
          <button
            type="button"
            data-testid="btn-world-progress"
            className="title-menu-btn"
            onClick={() => handleNavigate('progress')}
            onMouseEnter={playHoverSfx}
            style={{ borderLeftColor: '#0284C7' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#0284C7', display: 'inline-flex' }}><IconMap size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Dunia & Progres' : 'World & Progress'}
                </span>
                <span className="title-menu-sub" style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#4C697C' }}>
                  {locale === 'id' ? 'Peta 8 Wilayah & Monolit' : '8 Region Map & Monoliths'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#0369A1',
                backgroundColor: '#E0F2FE',
                padding: '2px 7px',
                borderRadius: '999px',
              }}
            >
              [4]
            </span>
          </button>

          {/* 5. Pengaturan / Settings */}
          <button
            type="button"
            data-testid="btn-settings"
            className="title-menu-btn"
            onClick={() => handleNavigate('settings')}
            onMouseEnter={playHoverSfx}
            style={{ borderLeftColor: '#7C3AED' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#7C3AED', display: 'inline-flex' }}><IconSettings size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Pengaturan' : 'Settings'}
                </span>
                <span className="title-menu-sub" style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#4C697C' }}>
                  {locale === 'id' ? 'Audio, Grafis, Bahasa & Kontrol' : 'Audio, Graphics, Language & Controls'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#6D28D9',
                backgroundColor: '#EDE9FE',
                padding: '2px 7px',
                borderRadius: '999px',
              }}
            >
              [5]
            </span>
          </button>

          {/* 6. Buku Panduan / Guidebook */}
          <button
            type="button"
            data-testid="btn-guidebook"
            className="title-menu-btn"
            onClick={() => {
              playConfirmSfx();
              setShowGuidebook(true);
            }}
            onMouseEnter={playHoverSfx}
            style={{
              borderLeftColor: '#EA580C',
              background: 'linear-gradient(180deg, #FFFDF7 0%, #FFF7ED 100%)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#EA580C', display: 'inline-flex' }}><IconJournal size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2, color: '#9A3412' }}>
                  {locale === 'id' ? 'Buku Panduan Arsitek' : 'Architect Guidebook'}
                </span>
                <span className="title-menu-sub" style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#7C2D12' }}>
                  {locale === 'id' ? 'Kontrol, kenapa ada .json & tutorial Python' : 'Controls, why .json & Python tutorial'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#9A3412',
                backgroundColor: '#FFEDD5',
                padding: '2px 7px',
                borderRadius: '999px',
                fontWeight: 800,
              }}
            >
              [6]
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom Telemetry & Navigation Guide */}
      <footer
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      >
        {/* Left: Device & Save Local Indicator */}
        <div
          className="surface-slate"
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#172B3A',
            padding: '6px 14px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              backgroundColor: '#16A34A',
              borderRadius: '999px',
            }}
          />
          <span>
            {locale === 'id'
              ? 'R1 Kebangkitan · Simpan lokal di perangkat ini'
              : 'R1 The Awakening · Local-first saves on this device'}
          </span>
          <span style={{ color: '#94A3B8' }}>|</span>
          <span style={{ color: '#0E7490', fontFamily: 'var(--font-code)' }}>
            PYODIDE WASM
          </span>
        </div>

        {/* Right: Keyboard navigation hints */}
        {!isCompact && (
          <div
            className="surface-slate"
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-code)',
              color: '#335267',
              padding: '6px 14px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>
              <strong style={{ color: '#172B3A' }}>[↑/↓]</strong>{' '}
              {locale === 'id' ? 'Navigasi' : 'Navigate'}
            </span>
            <span>
              <strong style={{ color: '#D97706' }}>[Enter]</strong>{' '}
              {locale === 'id' ? 'Pilih' : 'Select'}
            </span>
            <span>
              <strong style={{ color: '#0891B2' }}>[1-6]</strong>{' '}
              {locale === 'id' ? 'Menu' : 'Shortcuts'}
            </span>
            <span>
              <strong style={{ color: '#EA580C' }}>[G]</strong>{' '}
              {locale === 'id' ? 'Panduan' : 'Guide'}
            </span>
          </div>
        )}
      </footer>

      {/* In-Game Interactive Guidebook Modal */}
      <GuidebookModal open={showGuidebook} onClose={() => setShowGuidebook(false)} />
    </main>
  );
};
