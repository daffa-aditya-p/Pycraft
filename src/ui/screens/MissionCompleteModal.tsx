import React, { useEffect, useState } from 'react';
import { useSettingsStore, useUIStore } from '@/stores';
import { IconCheck } from '../icons';

export interface PracticedConceptSummary {
  kcId: string;
  title: string;
  previousScore: number;
  newScore: number;
}

export interface MissionCompleteModalProps {
  open: boolean;
  missionTitle: string;
  xpGained: number;
  conceptsPracticed: PracticedConceptSummary[];
  rewardsUnlocked?: string[];
  playerCodeSnippet: string;
  neoLine: string;
  onContinue: () => void;
}

export const MissionCompleteModal: React.FC<MissionCompleteModalProps> = ({
  open,
  missionTitle,
  xpGained,
  conceptsPracticed,
  rewardsUnlocked = [],
  playerCodeSnippet,
  neoLine,
  onContinue,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);
  const [displayedXp, setDisplayedXp] = useState(xpGained);

  useEffect(() => {
    if (!open) return;
    if (reducedMotion || xpGained <= 0) {
      setDisplayedXp(xpGained);
      return;
    }

    let raf = 0;
    const duration = 550;
    const start = performance.now();
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration);
      setDisplayedXp(Math.round(xpGained * ratio));
      if (ratio < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, xpGained, reducedMotion]);

  if (!open) return null;

  const handleClose = () => {
    onContinue();
    setInGameOverlay('explore');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-complete-title"
      data-testid="mission-complete-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        backgroundColor: 'rgba(28, 36, 39, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="surface-parchment"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#5C4F47',
              }}
            >
              {locale === 'id' ? 'Misi Selesai' : 'Mission Complete'}
            </div>
            <h1
              id="mission-complete-title"
              style={{
                margin: '4px 0 0',
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                color: '#2A2420',
              }}
            >
              {missionTitle}
            </h1>
          </div>

          <div
            style={{
              padding: '8px 14px',
              backgroundColor: '#243034',
              color: '#F2B544',
              borderRadius: '2px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.25rem',
              whiteSpace: 'nowrap',
            }}
          >
            +{displayedXp} XP
          </div>
        </div>

        {/* Practiced KCs */}
        {conceptsPracticed.length > 0 && (
          <div>
            <h2
              style={{
                margin: '0 0 8px',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                color: '#2A2420',
              }}
            >
              {locale === 'id' ? 'Konsep yang Dilatih' : 'Concepts Practiced'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {conceptsPracticed.map((kc) => {
                const delta = kc.newScore - kc.previousScore;
                return (
                  <div
                    key={kc.kcId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: '#EFE2CA',
                      border: '1px solid #D9C9A8',
                      borderRadius: '2px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <span>
                      <strong>{kc.kcId}</strong> — {kc.title}
                    </span>
                    <span style={{ fontWeight: 700, color: '#2A2420' }}>
                      {kc.newScore}%{delta > 0 ? ` (+${delta})` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rewards Unlocked */}
        {rewardsUnlocked.length > 0 && (
          <div>
            <h2
              style={{
                margin: '0 0 8px',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                color: '#2A2420',
              }}
            >
              {locale === 'id' ? 'Hadiah Terbuka' : 'Rewards Unlocked'}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {rewardsUnlocked.map((reward) => (
                <span
                  key={reward}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: '#EFE2CA',
                    border: '1px solid #D9C9A8',
                    borderRadius: '2px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  <IconCheck size={14} />
                  {reward}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Player's Code Snippet */}
        <div>
          <h2
            style={{
              margin: '0 0 6px',
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              color: '#2A2420',
            }}
          >
            {locale === 'id' ? 'Kodemu' : 'Your Code'}
          </h2>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              backgroundColor: '#1A2225',
              color: '#E8EEF0',
              borderRadius: '2px',
              fontFamily: 'var(--font-code)',
              fontSize: '0.8125rem',
              overflowX: 'auto',
            }}
          >
            {playerCodeSnippet}
          </pre>
        </div>

        {/* NEO Quote */}
        <blockquote
          style={{
            margin: 0,
            padding: '10px 12px',
            backgroundColor: '#EFE2CA',
            borderLeft: '3px solid #3CC4C0',
            fontSize: '0.9375rem',
            color: '#2A2420',
          }}
        >
          <strong>NEO:</strong> "{neoLine}"
        </blockquote>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-primary-chamfer"
            onClick={handleClose}
            style={{ minWidth: '150px' }}
          >
            <span>{locale === 'id' ? 'Lanjutkan' : 'Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
