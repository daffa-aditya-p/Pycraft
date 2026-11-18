import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioManager } from '@/audio/AudioManager';
import { EventBus, useGameStore, useSettingsStore, useUIStore } from '@/stores';
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
    durationSec: 7.5,
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
    durationSec: 9.0,
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
    durationSec: 9.0,
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
    durationSec: 9.0,
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
    durationSec: 8.5,
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
  const layoutClass = useUIStore((s) => s.layoutClass);
  const isLandscapePhone = layoutClass === 'L';

  const [actIndex, setActIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  const actTimerRef = useRef<number | null>(null);
  const typewriterTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const audioCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);

  const updateSpeaking = useCallback((speaking: boolean) => {
    isSpeakingRef.current = speaking;
    setIsSpeaking(speaking);
  }, []);

  const stopNarration = useCallback(() => {
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    updateSpeaking(false);
  }, [updateSpeaking]);

  // Preload pre-generated VO <audio> elements for all 5 acts on mount / locale change
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    const cache = audioCacheRef.current;
    for (const act of CINEMATIC_ACTS) {
      const key = `${act.id}_${locale}`;
      if (!cache.has(key)) {
        const audio = new Audio(`/audio/vo/${act.id}_${locale}.mp3`);
        audio.preload = 'auto';
        audio.addEventListener('error', () => {
          if (!audio.dataset.wavFallback) {
            audio.dataset.wavFallback = '1';
            audio.src = `/audio/vo/${act.id}_${locale}.wav`;
          }
        });
        cache.set(key, audio);
      }
    }
  }, [locale]);

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
    stopNarration();
    EventBus.emit('cinematic.shot', null);
    onComplete();
  }, [onComplete, stopNarration]);

  // Web Speech API fallback (80ms delay after cancel prevents Chrome synchronous drop)
  const speakWithSpeechSynthesis = useCallback(
    (textToSpeak: string, volume: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        updateSpeaking(false);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        if (speechTimeoutRef.current !== null) {
          window.clearTimeout(speechTimeoutRef.current);
        }
        speechTimeoutRef.current = window.setTimeout(() => {
          speechTimeoutRef.current = null;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = locale === 'id' ? 'id-ID' : 'en-US';
          utterance.rate = 0.92;
          utterance.pitch = 0.94;
          utterance.volume = volume;

          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            const prefix = locale === 'id' ? 'id' : 'en';
            const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
            if (match) utterance.voice = match;
          }

          utterance.onstart = () => updateSpeaking(true);
          utterance.onend = () => updateSpeaking(false);
          utterance.onerror = () => updateSpeaking(false);

          window.speechSynthesis.speak(utterance);
        }, 80);
      } catch {
        updateSpeaking(false);
      }
    },
    [locale, updateSpeaking]
  );

  // Zero-delay pre-generated VO narrator with SpeechSynthesis fallback
  const speakNarrator = useCallback(
    (textToSpeak: string, actId: string) => {
      stopNarration();
      if (voiceMuted || audioSettings.muted) {
        return;
      }
      const volume = Math.min(1, Math.max(0, audioSettings.master * audioSettings.sfx * 1.2));
      const key = `${actId}_${locale}`;
      const audio = audioCacheRef.current.get(key);

      if (audio) {
        activeAudioRef.current = audio;
        audio.currentTime = 0;
        audio.volume = volume;
        audio.onplay = () => updateSpeaking(true);
        audio.onended = () => {
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          updateSpeaking(false);
        };
        audio.onerror = () => {
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
            speakWithSpeechSynthesis(textToSpeak, volume);
          }
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            if (activeAudioRef.current === audio) {
              activeAudioRef.current = null;
            }
            speakWithSpeechSynthesis(textToSpeak, volume);
          });
        }
        return;
      }

      speakWithSpeechSynthesis(textToSpeak, volume);
    },
    [audioSettings, locale, speakWithSpeechSynthesis, stopNarration, updateSpeaking, voiceMuted]
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

    // Start VO narration with personalized text
    speakNarrator(personalizedText, currentAct.id);

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
  }, [actIndex, currentAct.id, personalizedText, speakNarrator]);

  // Pause/resume active narration when isPaused toggles
  useEffect(() => {
    const activeAudio = activeAudioRef.current;
    if (isPaused) {
      if (activeAudio && !activeAudio.paused) {
        activeAudio.pause();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
      }
    } else if (!voiceMuted && !audioSettings.muted) {
      if (activeAudio && activeAudio.paused && activeAudio.currentTime > 0 && !activeAudio.ended) {
        void activeAudio.play().catch(() => {});
      }
      if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
      }
    }
  }, [audioSettings.muted, isPaused, voiceMuted]);

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

      // Delay auto-advance up to +2500ms if voice-over is still speaking
      if (elapsed >= durationMs && (!isSpeakingRef.current || elapsed >= durationMs + 2500)) {
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
      stopNarration();
      EventBus.emit('cinematic.shot', null);
    };
  }, [stopNarration]);

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
          minHeight: isLandscapePhone ? '52px' : '80px',
          height: isLandscapePhone ? 'auto' : '11vh',
          padding: isLandscapePhone ? '6px 14px' : '0 24px',
          background: 'linear-gradient(180deg, #0E2D44 0%, #143D59 100%)',
          borderBottom: '2px solid #F59E0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          position: 'relative',
          gap: '8px',
        }}
      >
        {/* World Crest & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#0891B2',
              border: '1.5px solid #FBBF24',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FDE68A',
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
                color: '#FDE68A',
                textTransform: 'uppercase',
              }}
            >
              Aetheria: Chronicles
            </div>
            <div style={{ fontSize: '0.75rem', color: '#BAE6FD', letterSpacing: '0.04em' }}>
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
                  backgroundColor: isActive ? '#FBBF24' : isDone ? '#4ADE80' : '#38BDF8',
                  opacity: isActive || isDone ? 1 : 0.4,
                  borderRadius: '999px',
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
              if (nextMute) {
                stopNarration();
              } else if (!isPaused) {
                speakNarrator(personalizedText, currentAct.id);
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
          padding: isLandscapePhone ? '0 14px' : '0 24px',
          boxSizing: 'border-box',
          marginBottom: isLandscapePhone ? '8px' : '20px',
        }}
      >
        <div
          className="surface-slate"
          style={{
            maxWidth: '820px',
            width: '100%',
            padding: isLandscapePhone ? '12px 16px' : '20px 28px',
            maxHeight: isLandscapePhone ? '56dvh' : undefined,
            overflowY: isLandscapePhone ? 'auto' : undefined,
            boxShadow: '0 16px 40px rgba(14, 50, 78, 0.35)',
            borderLeft: '5px solid #F59E0B',
            borderRadius: '14px',
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
              borderBottom: '1px solid #D4E7F1',
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
                  backgroundColor: isSpeaking ? '#16A34A' : '#F59E0B',
                  boxShadow: isSpeaking ? '0 0 8px #16A34A' : 'none',
                  transition: 'background-color 0.2s',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#0E7490',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {currentAct.speaker[locale]}
              </span>
              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>•</span>
              <span style={{ color: '#335267', fontSize: '0.75rem', fontWeight: 600 }}>
                {currentAct.title[locale]}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#4C697C', fontFamily: 'monospace' }}>
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
              color: '#172B3A',
              fontFamily: 'var(--font-body)',
              minHeight: '3.4em',
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
                  backgroundColor: '#F59E0B',
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
          minHeight: isLandscapePhone ? '44px' : '80px',
          height: isLandscapePhone ? 'auto' : '11vh',
          background: 'linear-gradient(180deg, #143D59 0%, #0E2D44 100%)',
          borderTop: '2px solid #F59E0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isLandscapePhone ? '6px 14px' : '0 24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: '#BAE6FD' }}>
            PyCraft Engine v0.1 • WebAssembly Python 3.12
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: '#BAE6FD' }}>
            {locale === 'id' ? 'Navigasi Bab:' : 'Chapter Nav:'}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#FDE68A',
              backgroundColor: '#164E63',
              border: '1px solid #38BDF8',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          >
            [ ← ]
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#FDE68A',
              backgroundColor: '#164E63',
              border: '1px solid #38BDF8',
              padding: '2px 6px',
              borderRadius: '4px',
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
