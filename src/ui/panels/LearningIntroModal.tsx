import React, { useState } from 'react';
import { useSettingsStore, useUIStore } from '@/stores';
import { IconPlay } from '../icons';

export interface LearningIntroModalProps {
  open: boolean;
  conceptTitle: string;
  conceptSummary: string;
  inWorldNote: string;
  exampleCode: string;
  exampleOutput: string;
  onTryExample?: (code: string) => void;
  onComplete: () => void;
}

export const LearningIntroModal: React.FC<LearningIntroModalProps> = ({
  open,
  conceptTitle,
  conceptSummary,
  inWorldNote,
  exampleCode,
  exampleOutput,
  onTryExample,
  onComplete,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);
  const [stepIndex, setStepIndex] = useState(0);
  const [ranPreview, setRanPreview] = useState(false);

  if (!open) return null;

  const finish = () => {
    setStepIndex(0);
    setRanPreview(false);
    onComplete();
    setInGameOverlay('editor');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-intro-title"
      data-testid="learning-intro-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 75,
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
          maxWidth: '560px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              padding: '3px 8px',
              backgroundColor: '#243034',
              color: '#3CC4C0',
              fontWeight: 700,
              fontSize: '0.75rem',
              borderRadius: '2px',
            }}
          >
            NEO · {stepIndex + 1}/3
          </span>

          <button
            type="button"
            className="btn-parchment"
            onClick={finish}
            style={{ minHeight: '36px', padding: '4px 10px', fontSize: '0.8125rem' }}
          >
            {locale === 'id' ? 'Lewati' : 'Skip'}
          </button>
        </div>

        <h1
          id="learning-intro-title"
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: '#2A2420',
          }}
        >
          {conceptTitle}
        </h1>

        {stepIndex === 0 && (
          <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.55, color: '#2A2420' }}>
            {conceptSummary}
          </p>
        )}

        {stepIndex === 1 && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#EFE2CA',
              border: '1px solid #D9C9A8',
              borderRadius: '2px',
              color: '#2A2420',
              lineHeight: 1.5,
            }}
          >
            <strong>{locale === 'id' ? 'Di Dunia Aetheria:' : 'In Aetheria:'}</strong>
            <p style={{ margin: '6px 0 0' }}>{inWorldNote}</p>
          </div>
        )}

        {stepIndex === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <pre
              style={{
                margin: 0,
                padding: '10px 12px',
                backgroundColor: '#1A2225',
                color: '#E8EEF0',
                fontFamily: 'var(--font-code)',
                fontSize: '0.875rem',
                borderRadius: '2px',
                overflowX: 'auto',
              }}
            >
              {exampleCode}
            </pre>

            <button
              type="button"
              className="btn-slate"
              onClick={() => {
                setRanPreview(true);
              }}
              style={{ alignSelf: 'flex-start' }}
            >
              <IconPlay size={16} />
              <span>{locale === 'id' ? 'Lihat Contoh Output' : 'Preview Output'}</span>
            </button>

            {onTryExample && (
              <button
                type="button"
                className="btn-parchment"
                onClick={() => onTryExample(exampleCode)}
                style={{ alignSelf: 'flex-start', minHeight: '36px', fontSize: '0.8125rem' }}
              >
                {locale === 'id' ? 'Salin Contoh ke Editor' : 'Copy Example to Editor'}
              </button>
            )}

            {ranPreview && (
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#1C2427',
                  color: '#9CCB6B',
                  fontFamily: 'var(--font-code)',
                  fontSize: '0.8125rem',
                  borderRadius: '2px',
                }}
              >
                <div style={{ color: '#8FA3A9', fontSize: '0.75rem', marginBottom: '2px' }}>
                  {locale === 'id' ? 'Keluaran contoh:' : 'Example output:'}
                </div>
                {exampleOutput}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <button
            type="button"
            className="btn-parchment"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            {locale === 'id' ? 'Sebelumnya' : 'Previous'}
          </button>

          {stepIndex < 2 ? (
            <button
              type="button"
              className="btn-primary-chamfer"
              onClick={() => setStepIndex((i) => Math.min(2, i + 1))}
            >
              {locale === 'id' ? 'Berikutnya' : 'Next'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary-chamfer"
              onClick={finish}
            >
              {locale === 'id' ? 'Mulai Menulis Kode' : 'Start Coding'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
