import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores';

interface ViewportSnapshot {
  width: number;
  height: number;
  coarse: boolean;
}

function readViewport(): ViewportSnapshot {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768, coarse: false };
  }
  const width = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const coarse = Boolean(
    window.matchMedia?.('(pointer: coarse)').matches ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && width < 1024),
  );
  return { width, height, coarse };
}

export async function tryLockLandscapeOrientation(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
    }
  } catch {
    // Fullscreen may be unavailable on iOS Safari or without browser permission
  }

  try {
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (mode: string) => Promise<void> })
      | undefined;
    if (orientation?.lock) {
      await orientation.lock('landscape');
      return true;
    }
  } catch {
    // Some browsers require installed PWA or system Auto-Rotate
  }
  return false;
}

export const PortraitOrientationGuard: React.FC = () => {
  const locale = useSettingsStore((s) => s.locale);
  const [viewport, setViewport] = useState<ViewportSnapshot>(readViewport);
  const [lockAttempted, setLockAttempted] = useState(false);

  useEffect(() => {
    const refresh = () => setViewport(readViewport());
    const delayedRefresh = () => {
      refresh();
      window.setTimeout(refresh, 160);
    };

    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', delayedRefresh);
    window.visualViewport?.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', delayedRefresh);
      window.visualViewport?.removeEventListener('resize', refresh);
    };
  }, []);

  const isPortraitBlocked =
    viewport.height > viewport.width && (viewport.coarse || viewport.width < 1024);

  if (!isPortraitBlocked) return null;

  const handleRequestLandscape = async () => {
    await tryLockLandscapeOrientation();
    setLockAttempted(true);
    setViewport(readViewport());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="landscape-required-title"
      data-testid="portrait-orientation-guard"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background:
          'linear-gradient(155deg, rgba(142, 197, 232, 0.98) 0%, rgba(217, 238, 246, 0.98) 55%, rgba(254, 243, 199, 0.98) 100%)',
        backdropFilter: 'blur(8px)',
        overflowY: 'auto',
      }}
    >
      <style>{`
        @keyframes rotatePhoneToLandscape {
          0%, 20% {
            transform: rotate(0deg) scale(0.96);
          }
          55%, 85% {
            transform: rotate(-90deg) scale(1);
          }
          100% {
            transform: rotate(0deg) scale(0.96);
          }
        }
        .pycraft-rotate-phone-svg {
          animation: rotatePhoneToLandscape 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pycraft-rotate-phone-svg {
            animation: none;
            transform: rotate(-90deg);
          }
        }
      `}</style>

      <div
        className="surface-slate"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '24px 22px',
          borderRadius: '18px',
          border: '2px solid #7CC4DF',
          boxShadow: '0 8px 0 rgba(70, 130, 160, 0.25), 0 20px 44px rgba(15, 52, 76, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '92px',
            height: '92px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #E0F2FE 0%, #CFFAFE 100%)',
            border: '2px solid #38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            className="pycraft-rotate-phone-svg"
          >
            <rect
              x="14"
              y="6"
              width="24"
              height="40"
              rx="4"
              fill="#0E7490"
              stroke="#172B3A"
              strokeWidth="2.5"
            />
            <rect x="17" y="11" width="18" height="28" rx="2" fill="#BAE6FD" />
            <polygon points="22,25 30,21 22,17" fill="#F59E0B" />
            <circle cx="26" cy="42.5" r="1.5" fill="#FFFDF7" />
          </svg>
        </div>

        <span
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            backgroundColor: '#FEF3C7',
            border: '1.5px solid #F59E0B',
            color: '#92400E',
            fontFamily: 'var(--font-code)',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
          }}
        >
          {locale === 'id' ? 'MODE LANSKAP WAJIB' : 'LANDSCAPE REQUIRED'}
        </span>

        <h1
          id="landscape-required-title"
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.45rem',
            color: '#0E7490',
            lineHeight: 1.2,
          }}
        >
          {locale === 'id'
            ? 'Putar Ponsel ke Posisi Lanskap'
            : 'Rotate Your Device to Landscape'}
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            lineHeight: 1.5,
            color: '#335267',
          }}
        >
          {locale === 'id'
            ? 'PYCRAFT dirancang wajib dalam tampilan mendatar (lanskap) agar dunia 3D, joystick, dan editor Python tampil lega dan nyaman dimainkan.'
            : 'PYCRAFT requires landscape orientation so the 3D world, virtual joystick, and Python editor fit comfortably.'}
        </p>

        <button
          type="button"
          data-testid="btn-lock-landscape"
          className="btn-primary-chamfer"
          onClick={() => void handleRequestLandscape()}
          style={{ width: '100%', minHeight: '48px' }}
        >
          {locale === 'id'
            ? 'Aktifkan Layar Penuh & Lanskap'
            : 'Enable Fullscreen & Landscape'}
        </button>

        {lockAttempted && (
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: '#92400E',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '8px 10px',
            }}
          >
            {locale === 'id'
              ? 'Jika layar belum berputar otomatis, aktifkan fitur Rotasi Otomatis (Auto-Rotate) di ponsel kamu lalu miringkan perangkat.'
              : 'If the screen did not rotate automatically, enable Auto-Rotate on your device and turn it sideways.'}
          </p>
        )}
      </div>
    </div>
  );
};
