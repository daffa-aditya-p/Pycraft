import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioManager } from '@/audio/AudioManager';
import { EventBus, useGameStore, useSettingsStore } from '@/stores';
import {
  IconClose,
  IconPlay,
  IconPause,
  IconSkipNext,
  IconSpark,
  IconVolumeMute,
  IconVolumeOn,
} from '../icons';

export interface CinematicIntroOverlayProps {
  onComplete: () => void;
}

export interface CinematicCameraPose {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
  driftSpeed?: number;
}

export interface CinematicAct {
  id: string;
  badge: { id: string; en: string };
  title: { id: string; en: string };
  speaker: { id: string; en: string };
  text: { id: string; en: string };
  durationSec: number;
  cameraStart: CinematicCameraPose;
  cameraEnd: CinematicCameraPose;
}

export function interpolateCinematicPose(
  start: CinematicCameraPose,
  end: CinematicCameraPose,
  progress: number
): CinematicCameraPose {
  const p = Math.max(0, Math.min(1, progress));
  // Smooth cubic ease-in-out
  const t = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  return {
    position: [
      start.position[0] + (end.position[0] - start.position[0]) * t,
      start.position[1] + (end.position[1] - start.position[1]) * t,
      start.position[2] + (end.position[2] - start.position[2]) * t,
    ],
    lookAt: [
      start.lookAt[0] + (end.lookAt[0] - start.lookAt[0]) * t,
      start.lookAt[1] + (end.lookAt[1] - start.lookAt[1]) * t,
      start.lookAt[2] + (end.lookAt[2] - start.lookAt[2]) * t,
    ],
    fov: start.fov + (end.fov - start.fov) * t,
    driftSpeed: (start.driftSpeed ?? 2.4) + ((end.driftSpeed ?? 2.4) - (start.driftSpeed ?? 2.4)) * t,
  };
}

export const CINEMATIC_ACTS: CinematicAct[] = [
  {
    id: 'act_0_prologue',
    badge: { id: 'PROLOG AETHERIA', en: 'AETHERIA PROLOGUE' },
    title: { id: 'KEBANGKITAN KEPULAUAN LANGIT', en: 'THE AWAKENING OF THE SKY ISLES' },
    speaker: { id: 'Suara Purba Aetheria', en: 'The Ancient Voice of Aetheria' },
    text: {
      id: 'Jauh di atas samudra awan, kepulauan Aetheria melayang dalam keheningan abadi...',
      en: 'Far above the ocean of clouds, the floating archipelago of Aetheria drifts in eternal silence...',
    },
    durationSec: 5.5,
    cameraStart: {
      position: [-10, 48, 54],
      lookAt: [-42, 18, -8],
      fov: 44,
      driftSpeed: 1.8,
    },
    cameraEnd: {
      position: [-26, 42, 38],
      lookAt: [-46, 20, -12],
      fov: 40,
      driftSpeed: 1.8,
    },
  },
  {
    id: 'act_1_core_spire',
    badge: { id: 'BAB I • MENARA INTI', en: 'ACT I • THE CORE SPIRE' },
    title: { id: 'SUMBER SEGALA KEHIDUPAN', en: 'THE SOURCE OF ALL LIFE' },
    speaker: { id: 'Suara Purba Aetheria', en: 'The Ancient Voice of Aetheria' },
    text: {
      id: 'Dahulu kala, Menara Inti memancarkan energi magis yang menggerakkan air terjun, jembatan energi, dan ekosistem Aetheria.',
      en: 'In ancient times, the Core Spire radiated magical energy that powered the waterfalls, energy bridges, and ecosystems of Aetheria.',
    },
    durationSec: 7.0,
    cameraStart: {
      position: [-28, 34, 18],
      lookAt: [-48, 24, -16],
      fov: 38,
      driftSpeed: 1.6,
    },
    cameraEnd: {
      position: [-40, 27, 4],
      lookAt: [-48, 22, -16],
      fov: 33,
      driftSpeed: 1.6,
    },
  },
  {
    id: 'act_2_great_silence',
    badge: { id: 'BAB II • ZAMAN KESUNYIAN', en: 'ACT II • THE GREAT SILENCE' },
    title: { id: 'KEHANCURAN & TIDUR PANJANG', en: 'THE GREAT SLUMBER' },
    speaker: { id: 'Suara Purba Aetheria', en: 'The Ancient Voice of Aetheria' },
    text: {
      id: 'Ketika Menara Inti teredam, Zaman Kesunyian tiba. Jembatan runtuh, gerbang terkunci, dan mesin-mesin kuno tertidur lelap.',
      en: 'When the Core Spire dimmed, the Great Silence fell. Bridges crumbled, gates sealed shut, and ancient machines fell into deep slumber.',
    },
    durationSec: 7.2,
    cameraStart: {
      position: [14, 16, 24],
      lookAt: [-16, 5, 32],
      fov: 36,
      driftSpeed: 1.8,
    },
    cameraEnd: {
      position: [-8, 9, 36],
      lookAt: [-16, 4, 30],
      fov: 31,
      driftSpeed: 1.8,
    },
  },
  {
    id: 'act_3_the_architect',
    badge: { id: 'BAB III • SANG ARSITEK', en: 'ACT III • THE ARCHITECT' },
    title: { id: 'PEWARIS LOGIKA KUNO', en: 'HEIR OF ANCIENT LOGIC' },
    speaker: { id: 'Suara Purba Aetheria', en: 'The Ancient Voice of Aetheria' },
    text: {
      id: 'Kini, ramalan kuno telah terwujud. Seorang Arsitek telah tiba di Kuil Stasis—membawa kembali kekuatan bahasa logika Python!',
      en: 'Now, ancient prophecy is fulfilled. An Architect has arrived at the Stasis Shrine—bringing back the power of Python logic!',
    },
    durationSec: 7.5,
    cameraStart: {
      position: [-53, 7.5, 60],
      lookAt: [-48, 4.3, 52],
      fov: 34,
      driftSpeed: 2.2,
    },
    cameraEnd: {
      position: [-48.2, 5.0, 55.4],
      lookAt: [-48.0, 4.2, 52],
      fov: 29,
      driftSpeed: 2.2,
    },
  },
  {
    id: 'act_4_bit_awakening',
    badge: { id: 'BAB IV • KEBANGKITAN LOGIKA', en: 'ACT IV • THE SPARK OF CODE' },
    title: { id: 'BANGKITKAN DUNIAMU', en: 'CODE YOUR WORLD' },
    speaker: { id: 'Suara Purba Aetheria', en: 'The Ancient Voice of Aetheria' },
    text: {
      id: 'Tuliskan baris kodemu. Bangunkan rekan automasimu BIT, dan pulihkan kejayaan Aetheria!',
      en: 'Write your lines of code. Awaken your automaton companion BIT, and restore the glory of Aetheria!',
    },
    durationSec: 8.0,
    cameraStart: {
      position: [-45.0, 4.8, 54.5],
      lookAt: [-47.0, 3.8, 50.8],
      fov: 28,
      driftSpeed: 2.0,
    },
    cameraEnd: {
      position: [-43.6, 4.2, 48.6],
      lookAt: [-47.0, 3.8, 50.8],
      fov: 26,
      driftSpeed: 2.0,
    },
  },
];

export const CinematicIntroOverlay: React.FC<CinematicIntroOverlayProps> = ({ onComplete }) => {
  const locale = useSettingsStore((s) => s.locale);
  const audioSettings = useSettingsStore((s) => s.audio);
  const playerName = useGameStore((s) => s.profile.name);

  const [actIndex, setActIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  const actTimerRef = useRef<number | null>(null);
  const typewriterTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const currentAct = CINEMATIC_ACTS[actIndex] ?? CINEMATIC_ACTS[0]!;

  const personalizedText = useMemo(() => {
    let raw = currentAct.text[locale] ?? currentAct.text.id;
    if (playerName && playerName.trim()) {
      raw = raw.replace('Seorang Arsitek', `Arsitek ${playerName.trim()}`);
      raw = raw.replace('An Architect', `Architect ${playerName.trim()}`);
    }
    return raw;
  }, [currentAct, locale, playerName]);

  // Clean finish function
  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    EventBus.emit('cinematic.shot', null);
    onComplete();
  }, [onComplete]);

  // Speech synthesis narrator
  const speakNarrator = useCallback(
    (textToSpeak: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (voiceMuted || audioSettings.muted) {
        setIsSpeaking(false);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = locale === 'id' ? 'id-ID' : 'en-US';
        utterance.rate = 0.92;
        utterance.pitch = 0.94;
        utterance.volume = Math.min(1, Math.max(0, audioSettings.master * audioSettings.sfx * 1.2));

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const prefix = locale === 'id' ? 'id' : 'en';
          const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
          if (match) utterance.voice = match;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [audioSettings, locale, voiceMuted]
  );

  // Transition to a specific act
  const goToAct = useCallback(
    (index: number) => {
      if (index >= CINEMATIC_ACTS.length) {
        handleComplete();
        return;
      }
      const nextIndex = Math.max(0, index);
      setActIndex(nextIndex);
      setProgressPct(0);
      const act = CINEMATIC_ACTS[nextIndex]!;

      // Immediately set target to act camera start
      EventBus.emit('cinematic.shot', act.cameraStart);

      // Play atmospheric chord drone
      AudioManager.playCinematicDrone(nextIndex);

      if (nextIndex === CINEMATIC_ACTS.length - 1) {
        // BIT wake-up chime
        window.setTimeout(() => {
          EventBus.emit('audio.cue', { cue: 'bit_chirp' });
        }, 2800);
      }
    },
    [handleComplete]
  );

  // Typewriter effect + speech synthesis trigger when actIndex changes
  useEffect(() => {
    let charIdx = 0;
    setDisplayedText('');

    if (typewriterTimerRef.current !== null) {
      window.clearInterval(typewriterTimerRef.current);
    }

    // Start speech synthesis with personalized text
    speakNarrator(personalizedText);

    typewriterTimerRef.current = window.setInterval(() => {
      charIdx += 2;
      setDisplayedText(personalizedText.slice(0, charIdx));
      if (charIdx >= personalizedText.length) {
        if (typewriterTimerRef.current !== null) {
          window.clearInterval(typewriterTimerRef.current);
          typewriterTimerRef.current = null;
        }
      }
    }, 38);

    return () => {
      if (typewriterTimerRef.current !== null) {
        window.clearInterval(typewriterTimerRef.current);
      }
    };
  }, [actIndex, personalizedText, speakNarrator]);

  // Act progress timer & continuous camera interpolation
  useEffect(() => {
    if (isPaused) return;
    const durationMs = currentAct.durationSec * 1000;
    const intervalMs = 50;
    let elapsed = 0;

    actTimerRef.current = window.setInterval(() => {
      elapsed += intervalMs;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgressPct(pct);

      // Continuous camera motion throughout the act
      const interpolatedShot = interpolateCinematicPose(
        currentAct.cameraStart,
        currentAct.cameraEnd,
        pct / 100
      );
      EventBus.emit('cinematic.shot', interpolatedShot);

      if (elapsed >= durationMs) {
        if (actTimerRef.current !== null) {
          window.clearInterval(actTimerRef.current);
          actTimerRef.current = null;
        }
        goToAct(actIndex + 1);
      }
    }, intervalMs);

    return () => {
      if (actTimerRef.current !== null) {
        window.clearInterval(actTimerRef.current);
      }
    };
  }, [actIndex, currentAct, goToAct, isPaused]);

  // Initial camera and audio setup
  useEffect(() => {
    const act = CINEMATIC_ACTS[0]!;
    EventBus.emit('cinematic.shot', act.cameraStart);
    AudioManager.playCinematicDrone(0);

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      EventBus.emit('cinematic.shot', null);
    };
  }, []);

  // Keyboard controls: Space/Esc to skip, Arrows to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleComplete();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToAct(actIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToAct(actIndex - 1);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actIndex, goToAct, handleComplete]);

  return (
    <div
      role="region"
      aria-label="Sinematik Pengantar Dunia Aetheria"
      data-testid="cinematic-intro-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 85,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Top 16:9 Letterbox Bar */}
      <div
        style={{
          width: '100%',
          minHeight: '80px',
          height: '11vh',
          background: '#0B0F17',
          borderBottom: '2px solid rgba(61, 80, 88, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* World Crest & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#1C2427',
              border: '1px solid #F2B544',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F2B544',
            }}
          >
            <IconSpark size={16} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#F2B544',
                textTransform: 'uppercase',
              }}
            >
              Aetheria: Chronicles
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8C9E9E', letterSpacing: '0.04em' }}>
              {currentAct.badge[locale]}
            </div>
          </div>
        </div>

        {/* Timeline Act Indicators */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {CINEMATIC_ACTS.map((act, idx) => {
            const isActive = idx === actIndex;
            const isDone = idx < actIndex;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => goToAct(idx)}
                title={act.title[locale]}
                style={{
                  width: isActive ? '36px' : '20px',
                  height: '6px',
                  backgroundColor: isActive ? '#F2B544' : isDone ? '#5FA32A' : '#2A363B',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'width 0.25s ease, background-color 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${progressPct}%`,
                      backgroundColor: '#FFFFFF',
                      opacity: 0.5,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Top Controls: Voice Mute, Play/Pause, Skip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-slate"
            onClick={() => {
              const nextMute = !voiceMuted;
              setVoiceMuted(nextMute);
              if (nextMute && typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
              } else if (!nextMute) {
                speakNarrator(personalizedText);
              }
            }}
            title={voiceMuted ? 'Nyalakan Suara Narator' : 'Matikan Suara Narator'}
            style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
          >
            {voiceMuted ? <IconVolumeMute size={16} /> : <IconVolumeOn size={16} />}
            <span style={{ fontSize: '0.75rem' }}>{voiceMuted ? 'Muted' : 'Voice'}</span>
          </button>

          <button
            type="button"
            className="btn-slate"
            onClick={() => setIsPaused((p) => !p)}
            title={isPaused ? 'Lanjutkan' : 'Jeda'}
            style={{ padding: '6px 10px' }}
          >
            {isPaused ? <IconPlay size={16} /> : <IconPause size={16} />}
          </button>

          <button
            type="button"
            className="btn-primary-chamfer"
            onClick={handleComplete}
            style={{
              padding: '6px 14px',
              fontSize: '0.8125rem',
              gap: '6px',
            }}
          >
            <span>{locale === 'id' ? 'Lewati' : 'Skip'}</span>
            <span
              style={{
                fontSize: '0.7rem',
                opacity: 0.8,
                background: 'rgba(0,0,0,0.25)',
                padding: '2px 5px',
                borderRadius: '2px',
                fontFamily: 'monospace',
              }}
            >
              ESC / SPACE
            </span>
            <IconClose size={14} />
          </button>
        </div>
      </div>

      {/* Center Subtitle & Narrative Card */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '0 24px',
          boxSizing: 'border-box',
          marginBottom: '20px',
        }}
      >
        <div
          className="surface-slate"
          style={{
            maxWidth: '820px',
            width: '100%',
            padding: '20px 28px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
            borderLeft: '4px solid #F2B544',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
          }}
        >
          {/* Card Header: Speaker & Mood indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(61, 80, 88, 0.4)',
              paddingBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isSpeaking ? '#5FA32A' : '#F2B544',
                  boxShadow: isSpeaking ? '0 0 8px #5FA32A' : 'none',
                  transition: 'background-color 0.2s',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#F2B544',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {currentAct.speaker[locale]}
              </span>
              <span style={{ color: '#6E757A', fontSize: '0.75rem' }}>•</span>
              <span style={{ color: '#A9B8BD', fontSize: '0.75rem', fontWeight: 600 }}>
                {currentAct.title[locale]}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#8C9E9E', fontFamily: 'monospace' }}>
                {actIndex + 1} / {CINEMATIC_ACTS.length}
              </span>
              <button
                type="button"
                onClick={() => goToAct(actIndex + 1)}
                className="btn-slate"
                title="Bab Berikutnya"
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                <IconSkipNext size={14} />
              </button>
            </div>
          </div>

          {/* Subtitle Dialogue Text */}
          <div
            style={{
              fontSize: '1.18rem',
              lineHeight: 1.55,
              color: '#F8FAFC',
              fontFamily: 'var(--font-body)',
              minHeight: '3.4em',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
            }}
          >
            {displayedText}
            {displayedText.length < personalizedText.length && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.1em',
                  verticalAlign: 'text-bottom',
                  backgroundColor: '#F2B544',
                  marginLeft: '4px',
                  animation: 'blink 0.8s infinite',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom 16:9 Letterbox Bar */}
      <div
        style={{
          width: '100%',
          minHeight: '80px',
          height: '11vh',
          background: '#0B0F17',
          borderTop: '2px solid rgba(61, 80, 88, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#6E757A' }}>
            PyCraft Engine v0.1 • WebAssembly Python 3.12
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#8C9E9E' }}>
            {locale === 'id' ? 'Navigasi Bab:' : 'Chapter Nav:'}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#F2B544',
              backgroundColor: '#1C2427',
              border: '1px solid #3D5058',
              padding: '2px 6px',
              borderRadius: '2px',
              fontFamily: 'monospace',
            }}
          >
            [ ← ]
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#F2B544',
              backgroundColor: '#1C2427',
              border: '1px solid #3D5058',
              padding: '2px 6px',
              borderRadius: '2px',
              fontFamily: 'monospace',
            }}
          >
            [ → ]
          </span>
        </div>
      </div>
    </div>
  );
};
