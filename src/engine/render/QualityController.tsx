import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EventBus, type QualityPreset } from '../../stores/EventBus';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { QUALITY_PRESETS } from './SkyAndLighting';

export interface QualityControllerProps {
  onContextRestored: () => void;
  onContextLostChange?: (lost: boolean) => void;
  onFpsSample?: (fps: number) => void;
}

const FRAME_WINDOW = 90;
const DEGRADE_THRESHOLD_MS = 33.3;

/**
 * Adaptive graphics governor (Section 19.2):
 * - Applies High / Medium / Low presets (DPR, shadow map, fog, water detail).
 * - Hysteresis auto-step-down when median frame time > 33.3 ms over 90 consecutive frames.
 * - Handles webglcontextlost / webglcontextrestored cleanly and triggers full GPU mesh rebuild.
 */
export function QualityController({
  onContextRestored,
  onContextLostChange,
  onFpsSample,
}: QualityControllerProps) {
  const { gl, setDpr } = useThree();
  const quality = useSettingsStore((s) => s.graphics.quality);
  const autoDegrade = useSettingsStore((s) => s.graphics.autoDegrade);
  const showFps = useSettingsStore((s) => s.graphics.showFps);

  const frameTimesRef = useRef<number[]>([]);
  const slowCountRef = useRef(0);
  const fpsTimerRef = useRef(0);
  const fpsFramesRef = useRef(0);

  // Apply DPR and shadow map configuration whenever quality preset changes
  useEffect(() => {
    const preset = QUALITY_PRESETS[quality];
    const nativeDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const targetDpr = quality === 'high' ? Math.min(nativeDpr, preset.dprMax) : preset.dprMax;
    setDpr(targetDpr);

    gl.shadowMap.enabled = preset.shadowSize > 0;
    gl.shadowMap.needsUpdate = true;
    slowCountRef.current = 0;
    frameTimesRef.current = [];
  }, [quality, gl, setDpr]);

  // WebGL context loss / restoration recovery (Section 19.4 / R-09)
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (e: Event) => {
      e.preventDefault();
      onContextLostChange?.(true);
      EventBus.emit('toast.show', {
        kind: 'warning',
        message: 'Memulihkan tampilan 3D…',
        durationMs: 5000,
      });
    };

    const handleRestored = () => {
      onContextLostChange?.(false);
      onContextRestored();
      EventBus.emit('toast.show', {
        kind: 'info',
        message: 'Tampilan 3D berhasil dipulihkan.',
        durationMs: 2500,
      });
    };

    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
    };
  }, [gl, onContextRestored, onContextLostChange]);

  useFrame((_, delta) => {
    const frameMs = delta * 1000;

    // Optional FPS telemetry callback
    if (showFps && onFpsSample) {
      fpsTimerRef.current += delta;
      fpsFramesRef.current += 1;
      if (fpsTimerRef.current >= 0.5) {
        onFpsSample(Math.round(fpsFramesRef.current / fpsTimerRef.current));
        fpsTimerRef.current = 0;
        fpsFramesRef.current = 0;
      }
    }

    // Hysteresis auto-step-down check
    if (!autoDegrade || quality === 'low') return;
    if (frameMs > 250) return; // ignore tab-switch spikes

    const buf = frameTimesRef.current;
    buf.push(frameMs);
    if (buf.length > FRAME_WINDOW) buf.shift();

    if (frameMs > DEGRADE_THRESHOLD_MS) {
      slowCountRef.current += 1;
    } else {
      slowCountRef.current = Math.max(0, slowCountRef.current - 1);
    }

    if (buf.length >= FRAME_WINDOW && slowCountRef.current >= FRAME_WINDOW) {
      const sorted = [...buf].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      if (median > DEGRADE_THRESHOLD_MS) {
        const nextPreset: QualityPreset = quality === 'high' ? 'medium' : 'low';
        useSettingsStore.getState().updateGraphics({ quality: nextPreset }, 'auto');
        useUIStore.getState().pushToast({
          kind: 'info',
          message:
            nextPreset === 'medium'
              ? 'Kualitas grafis disesuaikan ke Sedang agar tetap lancar.'
              : 'Kualitas grafis disesuaikan ke Rendah agar tetap lancar.',
        });
        slowCountRef.current = 0;
        buf.length = 0;
      }
    }
  });

  return null;
}
