import React, { useEffect, useState, type ReactNode } from 'react';
import { useUIStore, type LayoutClass } from '@/stores/useUIStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { AudioManager } from '@/audio/AudioManager';

function detectWebGL2(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch {
    return false;
  }
}

function detectLayoutClass(width: number, height: number): LayoutClass {
  if (height < 500 && width > height) return 'L';
  if (width < 768 && height >= width) return 'P';
  if (width < 1024) return 'T';
  return 'D';
}

function detectFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as Document & { webkitFullscreenEnabled?: boolean };
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function BootGate({ children }: { children: ReactNode }): React.JSX.Element {
  const [booted, setBooted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const screen = useUIStore((s) => s.screen);
  const textScale = useSettingsStore((s) => s.accessibility.textScale);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);

  useEffect(() => {
    const hasWebGL2 = detectWebGL2();
    setWebglSupported(hasWebGL2);

    const ui = useUIStore.getState();
    ui.setFullscreen(Boolean(document.fullscreenElement), detectFullscreenSupported());
    ui.setLayoutClass(detectLayoutClass(window.innerWidth, window.innerHeight));

    if (!hasWebGL2) {
      ui.setBootError('Browser atau perangkat ini belum mendukung WebGL2.');
      ui.navigateTo('unsupported', { pushHistory: false });
      setBooted(true);
      return;
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      useSettingsStore.getState().updateAccessibility({ reducedMotion: true });
    }

    if (navigator.storage?.persist) {
      void navigator.storage.persist().catch(() => undefined);
    }

    AudioManager.init();
    ui.navigateTo('title', { pushHistory: false });
    setBooted(true);

    return () => {
      AudioManager.dispose();
    };
  }, []);

  useEffect(() => {
    const updateViewport = (): void => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-h', `${Math.round(height)}px`);

      const ui = useUIStore.getState();
      const layout = detectLayoutClass(window.innerWidth, window.innerHeight);
      ui.setLayoutClass(layout);

      const softKeyboardLikelyOpen =
        window.innerHeight - height > 120 && (layout === 'L' || layout === 'P');
      ui.setKeyboardOpen(softKeyboardLikelyOpen);
    };

    const onPointerDown = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') {
        useUIStore.getState().setInputMode('touch');
      } else {
        useUIStore.getState().setInputMode('mouse+keyboard');
      }
    };

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') {
        useUIStore.getState().setInputMode('keyboard-only');
      }
    };

    const onPopState = (): void => {
      useUIStore.getState().goBack();
    };

    const onFullscreenChange = (): void => {
      useUIStore
        .getState()
        .setFullscreen(Boolean(document.fullscreenElement), detectFullscreenSupported());
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('popstate', onPopState);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(textScale / 100));
    document.documentElement.style.fontSize = `${textScale}%`;
  }, [textScale]);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
  }, [reducedMotion]);

  if (!booted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #8EC5E8 0%, #B4DAF0 50%, #D9EEF6 100%)',
          color: '#172B3A',
          fontWeight: 700,
        }}
      >
        Menyiapkan PYCRAFT…
      </div>
    );
  }

  if (!webglSupported || screen === 'unsupported') {
    return (
      <main
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #8EC5E8 0%, #D9EEF6 100%)',
          color: '#172B3A',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: '#FFFDF7',
            border: '2px solid #7CC4DF',
            borderRadius: '14px',
            padding: '28px',
            boxShadow: '0 12px 28px rgba(15, 52, 76, 0.16)',
          }}
        >
          <h1 style={{ color: '#0E7490', marginBottom: '12px', marginTop: 0 }}>
            WebGL2 Tidak Tersedia
          </h1>
          <p style={{ color: '#335267', maxWidth: '480px', lineHeight: 1.5, margin: 0 }}>
            PYCRAFT membutuhkan browser dengan dukungan WebGL2 (Chrome, Edge, Firefox, atau Safari
            versi terbaru). Aktifkan akselerasi perangkat keras atau perbarui browser kamu.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
