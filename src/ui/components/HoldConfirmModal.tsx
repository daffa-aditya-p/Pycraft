import React, { useEffect, useRef, useState } from 'react';
import { IconWarning } from '../icons';

export interface HoldConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  holdDurationMs?: number;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const HoldConfirmModal: React.FC<HoldConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  holdDurationMs = 1500,
  secondaryActionLabel,
  onSecondaryAction,
  onConfirm,
  onCancel,
  danger = true,
}) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const stopHold = () => {
    setHolding(false);
    setProgress(0);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopHold();
      completedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!holding || !open) return;
    completedRef.current = false;
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const ratio = Math.min(1, elapsed / holdDurationMs);
      setProgress(ratio);
      if (ratio >= 1 && !completedRef.current) {
        completedRef.current = true;
        stopHold();
        onConfirm();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [holding, open, holdDurationMs, onConfirm]);

  if (!open) return null;

  const pct = Math.round(progress * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-confirm-title"
      data-testid="hold-confirm-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(14, 50, 78, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderRadius: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: danger ? '#DC2626' : '#D97706', display: 'flex' }}>
            <IconWarning size={22} />
          </span>
          <h2
            id="hold-confirm-title"
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              color: '#172B3A',
            }}
          >
            {title}
          </h2>
        </div>

        <p style={{ margin: 0, color: '#335267', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          {description}
        </p>

        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            className="btn-slate"
            onClick={onSecondaryAction}
            style={{
              width: '100%',
              backgroundColor: '#ECFEFF',
              borderColor: '#0891B2',
              color: '#0E7490',
            }}
          >
            {secondaryActionLabel}
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            data-testid="hold-confirm-button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              setHolding(true);
            }}
            onPointerUp={stopHold}
            onPointerCancel={stopHold}
            onPointerLeave={stopHold}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                setHolding(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                stopHold();
              }
            }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: '48px',
              padding: '10px 16px',
              backgroundColor: danger ? '#FEE2E2' : '#FEF3C7',
              color: danger ? '#991B1B' : '#92400E',
              border: `2px solid ${danger ? '#EF4444' : '#F59E0B'}`,
              borderRadius: '10px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: `${pct}%`,
                backgroundColor: danger ? '#EF4444' : '#F59E0B',
                opacity: 0.35,
                pointerEvents: 'none',
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>
              {holding
                ? `Tahan… ${pct}%`
                : `${confirmLabel} (Tahan ${(holdDurationMs / 1000).toFixed(1)} dtk)`}
            </span>
          </button>

          <button type="button" className="btn-slate" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
