import React, { useRef, useState } from 'react';
import { EventBus, useGameStore, useSettingsStore, useUIStore } from '@/stores';
import {
  IconCamera,
  IconCode,
  IconInteract,
  IconJump,
  IconRotateLeft,
  IconRotateRight,
} from '../icons';

export interface JoystickVector {
  x: number;
  y: number;
  sprint: boolean;
}

export interface TouchControlsProps {
  onJoystickMove?: (vec: JoystickVector) => void;
  onCameraDrag?: (dx: number, dy: number) => void;
  onCameraPinch?: (scaleDelta: number) => void;
  onJump?: () => void;
  onInteract?: (targetId: string) => void;
  onToggleCamera?: () => void;
  onRotateIso?: (dir: -1 | 1) => void;
}

interface ActiveTouchPoint {
  x: number;
  y: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onJoystickMove,
  onCameraDrag,
  onCameraPinch,
  onJump,
  onInteract,
  onToggleCamera,
  onRotateIso,
}) => {
  const locale = useSettingsStore((s) => s.locale);
  const leftHanded = useSettingsStore((s) => s.controls.leftHandedTouch);
  const layoutClass = useUIStore((s) => s.layoutClass);
  const activePrompt = useUIStore((s) => s.activePrompt);
  const setEditorDockOpen = useUIStore((s) => s.setEditorDockOpen);
  const cameraMode = useGameStore((s) => s.world.cameraMode);

  // Floating joystick state
  const [joyState, setJoyState] = useState<{
    active: boolean;
    pointerId: number | null;
    originX: number;
    originY: number;
    knobX: number;
    knobY: number;
    sprint: boolean;
  }>({
    active: false,
    pointerId: null,
    originX: 0,
    originY: 0,
    knobX: 0,
    knobY: 0,
    sprint: false,
  });

  const joyPointerIdRef = useRef<number | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraPointersRef = useRef<Map<number, ActiveTouchPoint>>(new Map());
  const prevPinchDistRef = useRef<number | null>(null);

  const baseSize = layoutClass === 'P' ? 96 : 120;
  const maxRadius = baseSize / 2;

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - joyOriginRef.current.x;
    const dy = clientY - joyOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    const normMag = dist / maxRadius;

    // 12% dead-zone; sprint past 90%
    if (normMag < 0.12) {
      setJoyState((s) => ({ ...s, knobX, knobY, sprint: false }));
      onJoystickMove?.({ x: 0, y: 0, sprint: false });
      return;
    }

    const scaled = Math.min(1, (normMag - 0.12) / 0.88);
    const nx = Math.cos(angle) * scaled;
    const ny = Math.sin(angle) * scaled;
    const sprint = normMag >= 0.9;

    setJoyState((s) => ({ ...s, knobX, knobY, sprint }));
    onJoystickMove?.({ x: nx, y: ny, sprint });
  };

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setJoyState({
      active: false,
      pointerId: null,
      originX: 0,
      originY: 0,
      knobX: 0,
      knobY: 0,
      sprint: false,
    });
    onJoystickMove?.({ x: 0, y: 0, sprint: false });
  };

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerIdRef.current !== null) return;
    e.stopPropagation();
    // Critical RC-10 requirement: capture pointerId so thumb drift past 40% never drops movement or spins camera
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerIdRef.current = e.pointerId;
    joyOriginRef.current = { x: e.clientX, y: e.clientY };
    setJoyState({
      active: true,
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      knobX: 0,
      knobY: 0,
      sprint: false,
    });
    onJoystickMove?.({ x: 0, y: 0, sprint: false });
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyPointerIdRef.current) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joyPointerIdRef.current) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetJoystick();
  };

  const handleCameraPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === joyPointerIdRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cameraPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (cameraPointersRef.current.size === 2) {
      const pts = Array.from(cameraPointersRef.current.values());
      prevPinchDistRef.current = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
    }
  };

  const handleCameraPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === joyPointerIdRef.current) return;
    const prev = cameraPointersRef.current.get(e.pointerId);
    if (!prev) return;

    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    cameraPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (cameraPointersRef.current.size === 1) {
      onCameraDrag?.(dx, dy);
    } else if (cameraPointersRef.current.size === 2) {
      const pts = Array.from(cameraPointersRef.current.values());
      const dist = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
      if (prevPinchDistRef.current !== null && prevPinchDistRef.current > 0) {
        onCameraPinch?.(dist - prevPinchDistRef.current);
      }
      prevPinchDistRef.current = dist;
    }
  };

  const handleCameraPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === joyPointerIdRef.current) return;
    cameraPointersRef.current.delete(e.pointerId);
    if (cameraPointersRef.current.size < 2) {
      prevPinchDistRef.current = null;
    }
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const joystickSideStyle: React.CSSProperties = leftHanded
    ? { right: 0, width: '40%' }
    : { left: 0, width: '40%' };

  const cameraSideStyle: React.CSSProperties = leftHanded
    ? { left: 0, width: '60%' }
    : { right: 0, width: '60%' };

  const actionClusterSideStyle: React.CSSProperties = leftHanded
    ? { left: 'calc(16px + var(--sal))', alignItems: 'flex-start' }
    : { right: 'calc(16px + var(--sar))', alignItems: 'flex-end' };

  return (
    <div
      data-testid="touch-controls"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 15,
        pointerEvents: 'none',
      }}
    >
      {/* 40% Floating Joystick Zone */}
      <div
        data-testid="touch-joystick-zone"
        onPointerDown={handleJoystickPointerDown}
        onPointerMove={handleJoystickPointerMove}
        onPointerUp={handleJoystickPointerUp}
        onPointerCancel={handleJoystickPointerUp}
        style={{
          position: 'absolute',
          top: '20%',
          bottom: 0,
          ...joystickSideStyle,
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      >
        {joyState.active && (
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: `${joyState.originX - maxRadius}px`,
              top: `${joyState.originY - maxRadius}px`,
              width: `${baseSize}px`,
              height: `${baseSize}px`,
              borderRadius: '50%',
              border: `2.5px solid ${joyState.sprint ? '#F59E0B' : '#0891B2'}`,
              backgroundColor: 'rgba(255, 253, 247, 0.55)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: joyState.sprint ? '#F59E0B' : '#0891B2',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 6px rgba(15, 52, 76, 0.25)',
                transform: `translate(${joyState.knobX}px, ${joyState.knobY}px)`,
              }}
            />
          </div>
        )}
      </div>

      {/* 60% Right-side Camera Drag + Pinch Zone */}
      <div
        data-testid="touch-camera-zone"
        onPointerDown={handleCameraPointerDown}
        onPointerMove={handleCameraPointerMove}
        onPointerUp={handleCameraPointerUp}
        onPointerCancel={handleCameraPointerUp}
        style={{
          position: 'absolute',
          top: '15%',
          bottom: 0,
          ...cameraSideStyle,
          pointerEvents: 'auto',
          touchAction: 'none',
        }}
      />

      {/* Action Buttons Cluster (>= 48x48 px hit areas, 8px apart) */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(16px + var(--sab))',
          ...actionClusterSideStyle,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'auto',
        }}
      >
        {/* Secondary utility buttons row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {cameraMode === 'isometric' && (
            <>
              <button
                type="button"
                data-testid="touch-btn-iso-left"
                className="btn-slate touch-target-48"
                aria-label={locale === 'id' ? 'Putar Isometrik Kiri' : 'Rotate Iso Left'}
                onClick={() => onRotateIso?.(-1)}
                style={{ width: '48px', height: '48px', padding: 0 }}
              >
                <IconRotateLeft size={20} />
              </button>
              <button
                type="button"
                data-testid="touch-btn-iso-right"
                className="btn-slate touch-target-48"
                aria-label={locale === 'id' ? 'Putar Isometrik Kanan' : 'Rotate Iso Right'}
                onClick={() => onRotateIso?.(1)}
                style={{ width: '48px', height: '48px', padding: 0 }}
              >
                <IconRotateRight size={20} />
              </button>
            </>
          )}

          <button
            type="button"
            data-testid="touch-btn-camera"
            className="btn-slate touch-target-48"
            aria-label={locale === 'id' ? 'Kamera' : 'Camera'}
            onClick={() => onToggleCamera?.()}
            style={{ minWidth: '48px', height: '48px', padding: '0 10px' }}
          >
            <IconCamera size={18} />
            <span style={{ fontSize: '0.75rem' }}>
              {locale === 'id' ? 'Kamera' : 'Cam'}
            </span>
          </button>

          <button
            type="button"
            data-testid="touch-btn-editor"
            className="btn-slate touch-target-48"
            aria-label={locale === 'id' ? 'Buka Editor Kode' : 'Open Code Editor'}
            onClick={() => setEditorDockOpen(true)}
            style={{
              minWidth: '48px',
              height: '48px',
              padding: '0 10px',
              backgroundColor: '#ECFEFF',
              borderColor: '#0891B2',
              color: '#0E7490',
            }}
          >
            <IconCode size={18} />
            <span style={{ fontSize: '0.75rem' }}>
              {locale === 'id' ? 'Kode' : 'Code'}
            </span>
          </button>
        </div>

        {/* Primary Jump + Contextual Interact row */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {activePrompt && (
            <button
              type="button"
              data-testid="touch-btn-interact"
              className="btn-primary-chamfer"
              onClick={() => {
                if (onInteract) {
                  onInteract(activePrompt.targetId);
                } else {
                  EventBus.emit('player.interact', {
                    targetId: activePrompt.targetId,
                    kind: activePrompt.kind,
                  });
                }
              }}
              style={{
                minWidth: '64px',
                minHeight: '64px',
                padding: '0 14px',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <IconInteract size={20} />
              <span style={{ fontSize: '0.75rem' }}>{activePrompt.label}</span>
            </button>
          )}

          <button
            type="button"
            data-testid="touch-btn-jump"
            className="btn-slate"
            aria-label={locale === 'id' ? 'Lompat' : 'Jump'}
            onPointerDown={(e) => {
              e.stopPropagation();
              onJump?.();
            }}
            style={{
              minWidth: '56px',
              minHeight: '56px',
              padding: '0 10px',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <IconJump size={20} />
            <span style={{ fontSize: '0.75rem' }}>
              {locale === 'id' ? 'Lompat' : 'Jump'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
