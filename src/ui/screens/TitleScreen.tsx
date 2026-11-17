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
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
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
        overflow: 'hidden',
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
            borderColor: showFullscreenToast.mode === 'exit' ? '#F2B544' : '#3CC4C0',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              backgroundColor: showFullscreenToast.mode === 'exit' ? '#F2B544' : '#3CC4C0',
              boxShadow: `0 0 6px ${showFullscreenToast.mode === 'exit' ? '#F2B544' : '#3CC4C0'}`,
            }}
          />
          <span style={{ color: '#E8EEF0', fontWeight: 700 }}>
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
              color: '#A9B8BD',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderLeft: '3px solid #F2B544',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '1px',
                backgroundColor: '#F2B544',
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
              letterSpacing: '0.06em',
              color: '#8FA3A9',
              display: isCompact ? 'none' : 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                backgroundColor: '#3CC4C0',
                boxShadow: '0 0 0 2px rgba(60, 196, 192, 0.25)',
              }}
            />
            <span>AETHERIA ORBIT // POS: [14.0, 5.5, 4.0]</span>
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
              color: '#F2B544',
              borderColor: '#D99B29',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
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
              padding: '6px 10px',
              fontFamily: 'var(--font-code)',
              fontSize: '0.8125rem',
              fontWeight: 700,
            }}
          >
            <span style={{ color: locale === 'id' ? '#F2B544' : '#8FA3A9' }}>ID</span>
            <span style={{ color: '#33434A' }}>|</span>
            <span style={{ color: locale === 'en' ? '#F2B544' : '#8FA3A9' }}>EN</span>
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
              color: audio.muted ? '#E0603F' : '#3CC4C0',
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
                borderColor: isFullscreen ? '#3CC4C0' : undefined,
                color: isFullscreen ? '#3CC4C0' : '#E8EEF0',
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
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? '12px' : '18px',
          maxWidth: isCompact ? '100%' : '420px',
          width: '100%',
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      >
        {/* Brand Banner with 3D Isometric Voxel Cube Logo */}
        <section
          aria-label="PyCraft Brand"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignSelf: 'flex-start',
            width: '100%',
            backgroundColor: 'rgba(28, 36, 39, 0.94)',
            border: '2px solid #33434A',
            borderTop: '3px solid #F2B544',
            boxShadow: '4px 4px 0 #161D1F, 0 12px 24px rgba(0,0,0,0.4)',
            padding: isCompact ? '12px 16px' : '18px 24px',
            borderRadius: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* 3D Isometric Voxel Cube SVG */}
            <svg
              width="44"
              height="44"
              viewBox="0 0 48 48"
              className="title-floating-logo"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <polygon
                points="24,4 44,14 24,24 4,14"
                fill="#F2B544"
                stroke="#161D1F"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <line x1="14" y1="9" x2="34" y2="19" stroke="#F5C467" strokeWidth="1.5" />
              <line x1="34" y1="9" x2="14" y2="19" stroke="#F5C467" strokeWidth="1.5" />

              <polygon
                points="4,14 24,24 24,44 4,34"
                fill="#C7881D"
                stroke="#161D1F"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <line x1="4" y1="24" x2="24" y2="34" stroke="#D99B29" strokeWidth="1.5" />

              <polygon
                points="24,24 44,14 44,34 24,44"
                fill="#243034"
                stroke="#161D1F"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <polyline
                points="28,26 36,30 36,39"
                fill="none"
                stroke="#3CC4C0"
                strokeWidth="2"
                strokeLinecap="square"
              />
              <polygon points="21,12 27,14 21,16" fill="#1C2427" />
            </svg>

            {/* Title & Subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: isCompact ? '2.1rem' : '2.85rem',
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                    textShadow: '3px 3px 0 #161D1F',
                  }}
                >
                  <span style={{ color: '#F2B544' }}>PY</span>
                  <span style={{ color: '#E8EEF0' }}>CRAFT</span>
                </h1>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-code)',
                    color: '#3CC4C0',
                    backgroundColor: 'rgba(60, 196, 192, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    border: '1px solid rgba(60, 196, 192, 0.4)',
                    letterSpacing: '0.06em',
                  }}
                >
                  v0.1.0
                </span>
              </div>
              <p
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '0.14em',
                  color: '#A9B8BD',
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
              marginTop: '4px',
              padding: '6px 10px',
              backgroundColor: '#161D1F',
              border: '1px solid #28373D',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-code)',
              fontSize: '0.75rem',
              color: '#3CC4C0',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <IconTerminal size={14} className="title-terminal-icon" />
            <span style={{ color: '#F2B544', fontWeight: 700 }}>&gt;&gt;&gt;</span>
            <span style={{ color: '#E8EEF0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {TERMINAL_SNIPPETS[snippetIndex]}
            </span>
            <span className="title-cursor" aria-hidden="true" />
          </div>
        </section>

        {/* Hero Save Summary / Continue Banner */}
        <section
          aria-label={locale === 'id' ? 'Ringkasan Petualangan' : 'Adventure Summary'}
          style={{
            backgroundColor: 'rgba(28, 36, 39, 0.94)',
            border: activeSlot ? '1px solid #F2B544' : '1px dashed #3D5058',
            boxShadow: '4px 4px 0 #161D1F',
            padding: '12px',
            borderRadius: '2px',
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
                  borderBottom: '1px solid #28373D',
                  paddingBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      backgroundColor: '#6DBE4B',
                      boxShadow: '0 0 0 2px rgba(109, 190, 75, 0.3)',
                    }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#E8EEF0' }}>
                    {activeSlot.playerName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: '#F2B544',
                      backgroundColor: 'rgba(242, 181, 68, 0.14)',
                      padding: '1px 6px',
                      borderRadius: '2px',
                      fontWeight: 700,
                    }}
                  >
                    {rankLabel}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-code)',
                    color: '#8FA3A9',
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
                  color: '#A9B8BD',
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
                  marginTop: '4px',
                  boxShadow: '0 2px 8px rgba(242, 181, 68, 0.2)',
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
                    backgroundColor: '#1C2427',
                    color: '#F2B544',
                    padding: '2px 8px',
                    borderRadius: '2px',
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
                  padding: '4px 4px 2px',
                  fontSize: '0.8125rem',
                  color: '#8FA3A9',
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

        {/* Vertical Navigation Menu Panel */}
        <nav
          ref={menuRef}
          aria-label={locale === 'id' ? 'Menu Utama' : 'Main Menu'}
          onKeyDown={handleMenuKeyDown}
          className="surface-slate"
          style={{
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: 'rgba(28, 36, 39, 0.94)',
            boxShadow: '4px 4px 0 #161D1F, 0 16px 32px rgba(0,0,0,0.5)',
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
              <span style={{ color: '#3CC4C0', display: 'inline-flex' }}><IconFolder size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Pilih Petualangan' : 'Select Adventure'}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#8FA3A9' }}>
                  {locale === 'id' ? 'Kelola 3 slot penyimpanan lokal' : 'Manage 3 local save slots'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#8FA3A9',
                backgroundColor: '#161D1F',
                padding: '2px 6px',
                borderRadius: '2px',
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
            style={
              !activeSlot
                ? {
                    borderLeftColor: '#F2B544',
                    backgroundColor: '#273439',
                  }
                : undefined
            }
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#F2B544', display: 'inline-flex' }}><IconSpark size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Petualangan Baru' : 'New Adventure'}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#8FA3A9' }}>
                  {locale === 'id' ? 'Mulai perjalanan arsitek baru' : 'Begin a fresh architect journey'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: !activeSlot ? '#F2B544' : '#8FA3A9',
                backgroundColor: '#161D1F',
                padding: '2px 6px',
                borderRadius: '2px',
                fontWeight: !activeSlot ? 700 : 500,
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
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#3CC4C0', display: 'inline-flex' }}><IconLayers size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Mode Permainan' : 'Game Modes'}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#8FA3A9' }}>
                  {locale === 'id' ? 'Petualangan, Otomasi & Sandbox' : 'Adventure, Automation & Sandbox'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#8FA3A9',
                backgroundColor: '#161D1F',
                padding: '2px 6px',
                borderRadius: '2px',
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
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#3CC4C0', display: 'inline-flex' }}><IconMap size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Dunia & Progres' : 'World & Progress'}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#8FA3A9' }}>
                  {locale === 'id' ? 'Peta 8 Wilayah & Monolit' : '8 Region Map & Monoliths'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#8FA3A9',
                backgroundColor: '#161D1F',
                padding: '2px 6px',
                borderRadius: '2px',
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
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#F2B544', display: 'inline-flex' }}><IconSettings size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2 }}>
                  {locale === 'id' ? 'Pengaturan' : 'Settings'}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#8FA3A9' }}>
                  {locale === 'id' ? 'Audio, Grafis, Bahasa & Kontrol' : 'Audio, Graphics, Language & Controls'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#8FA3A9',
                backgroundColor: '#161D1F',
                padding: '2px 6px',
                borderRadius: '2px',
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
              borderLeftColor: '#F2B544',
              backgroundColor: 'rgba(242, 181, 68, 0.08)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#F2B544', display: 'inline-flex' }}><IconJournal size={18} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ lineHeight: 1.2, color: '#F2B544' }}>
                  {locale === 'id' ? 'Buku Panduan Arsitek' : 'Architect Guidebook'}
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#A9B8BD' }}>
                  {locale === 'id' ? 'Kontrol, kenapa ada .json & tutorial Python' : 'Controls, why .json & Python tutorial'}
                </span>
              </span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-code)',
                color: '#F2B544',
                backgroundColor: '#161D1F',
                padding: '2px 6px',
                borderRadius: '2px',
                fontWeight: 700,
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
          style={{
            fontSize: '0.75rem',
            color: '#E8EEF0',
            backgroundColor: 'rgba(28, 36, 39, 0.92)',
            padding: '6px 14px',
            borderRadius: '2px',
            border: '1px solid #33434A',
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
              backgroundColor: '#6DBE4B',
              borderRadius: '1px',
            }}
          />
          <span>
            {locale === 'id'
              ? 'R1 Kebangkitan · Simpan lokal di perangkat ini'
              : 'R1 The Awakening · Local-first saves on this device'}
          </span>
          <span style={{ color: '#33434A' }}>|</span>
          <span style={{ color: '#8FA3A9', fontFamily: 'var(--font-code)' }}>
            PYODIDE WASM
          </span>
        </div>

        {/* Right: Keyboard navigation hints */}
        {!isCompact && (
          <div
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-code)',
              color: '#8FA3A9',
              backgroundColor: 'rgba(28, 36, 39, 0.92)',
              padding: '6px 14px',
              borderRadius: '2px',
              border: '1px solid #33434A',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>
              <strong style={{ color: '#E8EEF0' }}>[↑/↓]</strong>{' '}
              {locale === 'id' ? 'Navigasi' : 'Navigate'}
            </span>
            <span>
              <strong style={{ color: '#F2B544' }}>[Enter]</strong>{' '}
              {locale === 'id' ? 'Pilih' : 'Select'}
            </span>
            <span>
              <strong style={{ color: '#3CC4C0' }}>[1-6]</strong>{' '}
              {locale === 'id' ? 'Menu' : 'Shortcuts'}
            </span>
            <span>
              <strong style={{ color: '#F2B544' }}>[G]</strong>{' '}
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
