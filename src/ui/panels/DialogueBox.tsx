import React, { useEffect, useState } from 'react';
import { useSettingsStore, useUIStore } from '@/stores';

export interface DialogueBoxProps {
  onAdvance?: () => void;
  onSelectChoice?: (choiceId: string) => void;
  onClose?: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  onAdvance,
  onSelectChoice,
  onClose,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const dialogue = useUIStore((s) => s.dialogue);
  const setDialogue = useUIStore((s) => s.setDialogue);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);
  const [logOpen, setLogOpen] = useState(false);

  const currentLine = dialogue.lines[dialogue.lineIndex] ?? '';
  const hasMoreLines = dialogue.lineIndex < dialogue.lines.length - 1;

  const handleAdvance = () => {
    if (onAdvance) {
      onAdvance();
      return;
    }
    if (hasMoreLines) {
      setDialogue({
        lineIndex: dialogue.lineIndex + 1,
        history: [
          ...dialogue.history.slice(-19),
          { speaker: dialogue.speakerName, text: currentLine },
        ],
      });
      return;
    }
    if (dialogue.choices.length === 0) {
      setDialogue({ active: false });
      setInGameOverlay('explore');
      onClose?.();
    }
  };

  useEffect(() => {
    if (!dialogue.active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (dialogue.choices.length === 0 || hasMoreLines) {
          e.preventDefault();
          handleAdvance();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogue.active, dialogue.lineIndex, dialogue.choices.length, hasMoreLines]);

  if (!dialogue.active) return null;

  return (
    <div
      role="dialog"
      aria-label={locale === 'id' ? 'Dialog Karakter' : 'Character Dialogue'}
      data-testid="dialogue-box"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(16px + var(--sab))',
        zIndex: 55,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      <div
        className="surface-parchment"
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '720px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              backgroundColor: '#243034',
              color: '#F2B544',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.9375rem',
              borderRadius: '2px',
            }}
          >
            {dialogue.speakerName}
          </span>

          <button
            type="button"
            className="btn-parchment"
            onClick={() => setLogOpen((v) => !v)}
            style={{ minHeight: '36px', padding: '4px 10px', fontSize: '0.8125rem' }}
          >
            {logOpen
              ? locale === 'id'
                ? 'Tutup Riwayat'
                : 'Hide Log'
              : locale === 'id'
                ? `Riwayat (${dialogue.history.length})`
                : `Log (${dialogue.history.length})`}
          </button>
        </div>

        {logOpen && (
          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              padding: '8px 10px',
              backgroundColor: '#EFE2CA',
              border: '1px solid #D9C9A8',
              borderRadius: '2px',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {dialogue.history.length === 0 ? (
              <span style={{ color: '#5C4F47' }}>
                {locale === 'id' ? 'Belum ada riwayat dialog.' : 'No dialogue history yet.'}
              </span>
            ) : (
              dialogue.history.slice(-20).map((entry, idx) => (
                <div key={idx}>
                  <strong>{entry.speaker}:</strong> {entry.text}
                </div>
              ))
            )}
          </div>
        )}

        <p
          style={{
            margin: 0,
            fontSize: '1.0625rem',
            lineHeight: 1.5,
            color: '#2A2420',
          }}
        >
          {currentLine}
        </p>

        {!hasMoreLines && dialogue.choices.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
            {dialogue.choices.slice(0, 3).map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="btn-parchment"
                onClick={() => onSelectChoice?.(choice.id)}
                style={{ borderColor: '#2A2420' }}
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              data-testid="dialogue-advance-btn"
              className="btn-primary-chamfer"
              onClick={handleAdvance}
            >
              {hasMoreLines
                ? locale === 'id'
                  ? 'Lanjut'
                  : 'Next'
                : locale === 'id'
                  ? 'Mengerti'
                  : 'Got it'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
