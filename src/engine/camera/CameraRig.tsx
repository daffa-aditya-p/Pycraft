import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EventBus } from '../../stores/EventBus';
import { useGameStore } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import type { ChunkStorage } from '../voxel/ChunkStorage';
import { raycastStorage } from '../voxel/raycast';
import type { InputManager } from '../input/InputManager';

export type CameraMode = 'third_person' | 'isometric';

export const CAMERA_CONSTANTS = {
  TRANSITION_MS: 600,
  VIEW_OFFSET_MS: 200,
  TP_MIN_DIST: 3.0,
  TP_MAX_DIST: 9.0,
  TP_DEFAULT_DIST: 6.2,
  TP_FOV: 46,
  ISO_FOV: 16,
  ISO_PITCH: Math.atan(Math.SQRT1_2), // ~35.264 deg true isometric angle
  ISO_BASE_DIST: 28,
  ISO_MIN_ZOOM: 0.6,
  ISO_MAX_ZOOM: 1.6,
  TITLE_ORBIT_RAD_PER_SEC: ((12 * Math.PI) / 180) / 60, // 12 deg/min
} as const;

export function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export interface CameraPoseInput {
  mode: CameraMode;
  target: [number, number, number];
  tpYaw: number;
  tpPitch: number;
  tpDistance: number;
  isoStep: number;
  isoZoom: number;
}

export interface CameraPoseOutput {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

export interface CinematicShotData {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
  driftSpeed?: number;
}

let activeCinematicShot: CinematicShotData | null = null;

export function getActiveCinematicShot(): CinematicShotData | null {
  return activeCinematicShot;
}

/**
 * Pure camera pose calculation for unit testing and per-frame camera interpolation.
 */
export function computeCameraPose(input: CameraPoseInput): CameraPoseOutput {
  const [tx, ty, tz] = input.target;
  if (input.mode === 'third_person') {
    const dist = Math.max(
      CAMERA_CONSTANTS.TP_MIN_DIST,
      Math.min(CAMERA_CONSTANTS.TP_MAX_DIST, input.tpDistance),
    );
    const pitch = Math.max(0.14, Math.min(1.25, input.tpPitch));
    const horiz = Math.cos(pitch) * dist;
    const vert = Math.sin(pitch) * dist;
    const px = tx + Math.sin(input.tpYaw) * horiz;
    const py = ty + vert;
    const pz = tz + Math.cos(input.tpYaw) * horiz;
    return {
      position: [px, py, pz],
      lookAt: [tx, ty, tz],
      fov: CAMERA_CONSTANTS.TP_FOV,
    };
  }

  // Isometric mode with 90-degree Z/C steps starting at 45 deg
  const isoYaw = Math.PI * 0.25 + input.isoStep * (Math.PI * 0.5);
  const zoom = Math.max(
    CAMERA_CONSTANTS.ISO_MIN_ZOOM,
    Math.min(CAMERA_CONSTANTS.ISO_MAX_ZOOM, input.isoZoom),
  );
  const dist = CAMERA_CONSTANTS.ISO_BASE_DIST / zoom;
  const horiz = Math.cos(CAMERA_CONSTANTS.ISO_PITCH) * dist;
  const vert = Math.sin(CAMERA_CONSTANTS.ISO_PITCH) * dist;
  return {
    position: [tx + Math.sin(isoYaw) * horiz, ty + vert, tz + Math.cos(isoYaw) * horiz],
    lookAt: [tx, ty, tz],
    fov: CAMERA_CONSTANTS.ISO_FOV,
  };
}

export function lerpCameraPose(
  from: CameraPoseOutput,
  to: CameraPoseOutput,
  rawT: number,
): CameraPoseOutput {
  const t = easeOutCubic(rawT);
  return {
    position: [
      from.position[0] + (to.position[0] - from.position[0]) * t,
      from.position[1] + (to.position[1] - from.position[1]) * t,
      from.position[2] + (to.position[2] - from.position[2]) * t,
    ],
    lookAt: [
      from.lookAt[0] + (to.lookAt[0] - from.lookAt[0]) * t,
      from.lookAt[1] + (to.lookAt[1] - from.lookAt[1]) * t,
      from.lookAt[2] + (to.lookAt[2] - from.lookAt[2]) * t,
    ],
    fov: from.fov + (to.fov - from.fov) * t,
  };
}

/**
 * Computes desired screen-space view offset (pixels) so the player/BIT stays centered
 * in the unobstructed viewport when the desktop dock or mobile bottom sheet is open.
 */
export function computeTargetViewOffset(
  layoutClass: 'D' | 'T' | 'L' | 'P',
  editorOpen: boolean,
  mobileSheetSnap: 'peek' | 'half' | 'full',
  width: number,
  height: number,
): [number, number] {
  if (!editorOpen) return [0, 0];
  if (layoutClass === 'D' || layoutClass === 'T') {
    // Right dock occupies ~40-45% width -> shift frustum right so center moves left
    return [width * 0.2, 0];
  }
  if (layoutClass === 'L') {
    return [width * 0.24, 0];
  }
  if (layoutClass === 'P' && mobileSheetSnap === 'half') {
    // Bottom sheet occupies 50% height -> shift frustum down so character centers in top half
    return [0, height * 0.22];
  }
  return [0, 0];
}

export interface CameraRigProps {
  storageRef: React.MutableRefObject<ChunkStorage>;
  playerPosRef: React.MutableRefObject<[number, number, number]>;
  bitPosRef: React.MutableRefObject<[number, number, number]>;
  npcPositionsRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
  inputManager: InputManager;
  onCameraYawChange?: (yaw: number) => void;
}

export function CameraRig({
  storageRef,
  playerPosRef,
  bitPosRef,
  npcPositionsRef,
  inputManager,
  onCameraYawChange,
}: CameraRigProps) {
  const { camera, size } = useThree();

  const initialPlayerYaw = useGameStore.getState().world.playerYaw ?? 0.65;
  const initialMode = useGameStore.getState().world.cameraMode ?? 'third_person';

  const stateRef = useRef({
    tpYaw: initialPlayerYaw,
    tpPitch: 0.45,
    tpDistance: CAMERA_CONSTANTS.TP_DEFAULT_DIST as number,
    collisionDist: CAMERA_CONSTANTS.TP_DEFAULT_DIST as number,
    targetPosSmoothed: null as [number, number, number] | null,
    isoStep: Math.round((initialPlayerYaw - Math.PI * 0.25) / (Math.PI * 0.5)),
    isoTargetStep: Math.round((initialPlayerYaw - Math.PI * 0.25) / (Math.PI * 0.5)),
    isoZoom: 1.0,
    titleAngle: 0.4,
    mode: initialMode as CameraMode,
    transitionActive: false,
    transitionElapsed: 0,
    fromPose: computeCameraPose({
      mode: initialMode,
      target: [0, 2, 0],
      tpYaw: initialPlayerYaw,
      tpPitch: 0.45,
      tpDistance: CAMERA_CONSTANTS.TP_DEFAULT_DIST,
      isoStep: 0,
      isoZoom: 1.0,
    }),
    // View offset lerp (200 ms)
    currentOffset: [0, 0] as [number, number],
    startOffset: [0, 0] as [number, number],
    targetOffset: [0, 0] as [number, number],
    offsetElapsed: CAMERA_CONSTANTS.VIEW_OFFSET_MS / 1000,
    // Quest active camera mode tracking
    savedModeBeforeQuest: null as CameraMode | null,
    wasWorkingOnQuest: false,
    // Suggested perspective (smooth blend without taking control away)
    suggestedYaw: null as number | null,
    suggestedPitch: null as number | null,
    // Dialogue framing shot
    dialogueShot: null as {
      targetId: string;
      preset: 'speaker' | 'device' | 'overview' | 'release';
    } | null,
    // Cinematic shot tracking
    cinematicShot: null as CinematicShotData | null,
    cinematicCurrentPos: [0, 0, 0] as [number, number, number],
    cinematicCurrentLookAt: [0, 0, 0] as [number, number, number],
    cinematicInitialized: false,
    cinematicWasActive: false,
  });

  // Subscribe to input actions, mode changes, dialogue requests & cinematic shots
  useEffect(() => {
    // Notify initial yaw on mount
    onCameraYawChange?.(stateRef.current.tpYaw);

    const unsubInput = inputManager.onAction((action) => {
      const s = stateRef.current;
      const game = useGameStore.getState();
      if (action === 'camera_toggle') {
        const nextMode: CameraMode =
          game.world.cameraMode === 'third_person' ? 'isometric' : 'third_person';
        s.savedModeBeforeQuest = null;
        game.setCameraMode(nextMode);
      } else if (action === 'iso_rotate_left') {
        s.isoTargetStep -= 1;
      } else if (action === 'iso_rotate_right') {
        s.isoTargetStep += 1;
      }
    });

    const unsubCam = EventBus.on('camera.mode.changed', ({ mode }) => {
      const s = stateRef.current;
      if (s.mode === mode) return;

      // Preserve angular orientation seamlessly across mode switch
      if (mode === 'isometric') {
        const matchingIsoStep = Math.round((s.tpYaw - Math.PI * 0.25) / (Math.PI * 0.5));
        s.isoStep = matchingIsoStep;
        s.isoTargetStep = matchingIsoStep;
      } else {
        s.tpYaw = Math.PI * 0.25 + s.isoStep * (Math.PI * 0.5);
        onCameraYawChange?.(s.tpYaw);
      }

      const currentLookAt = s.targetPosSmoothed ?? [
        playerPosRef.current[0],
        playerPosRef.current[1] + 1.25,
        playerPosRef.current[2],
      ];

      s.fromPose = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        lookAt: [currentLookAt[0], currentLookAt[1], currentLookAt[2]],
        fov:
          camera instanceof THREE.PerspectiveCamera
            ? camera.fov
            : (mode === 'isometric' ? CAMERA_CONSTANTS.TP_FOV : CAMERA_CONSTANTS.ISO_FOV),
      };
      s.mode = mode;
      s.transitionActive = true;
      s.transitionElapsed = 0;
    });

    const unsubDialogue = EventBus.on('dialogue.camera.request', (req) => {
      if (req.preset === 'release') {
        stateRef.current.dialogueShot = null;
      } else {
        stateRef.current.dialogueShot = req;
      }
    });

    const unsubCinematic = EventBus.on('cinematic.shot', (shot) => {
      const s = stateRef.current;
      activeCinematicShot = shot;
      if (!shot) {
        if (s.cinematicWasActive) {
          s.cinematicWasActive = false;
          s.cinematicInitialized = false;
          s.cinematicShot = null;

          // Preserve the orientation where the cinematic shot left off
          const dx = camera.position.x - playerPosRef.current[0];
          const dz = camera.position.z - playerPosRef.current[2];
          if (Math.hypot(dx, dz) > 0.1) {
            s.tpYaw = Math.atan2(dx, dz);
            onCameraYawChange?.(s.tpYaw);
          }

          s.fromPose = {
            position: [camera.position.x, camera.position.y, camera.position.z],
            lookAt: [
              playerPosRef.current[0],
              playerPosRef.current[1] + 1.25,
              playerPosRef.current[2],
            ],
            fov:
              camera instanceof THREE.PerspectiveCamera
                ? camera.fov
                : CAMERA_CONSTANTS.TP_FOV,
          };
          s.mode = 'third_person';
          s.transitionActive = true;
          s.transitionElapsed = 0;
        }
      } else {
        s.cinematicShot = shot;
        if (!s.cinematicInitialized) {
          s.cinematicCurrentPos = [shot.position[0], shot.position[1], shot.position[2]];
          s.cinematicCurrentLookAt = [shot.lookAt[0], shot.lookAt[1], shot.lookAt[2]];
          camera.position.set(shot.position[0], shot.position[1], shot.position[2]);
          camera.lookAt(shot.lookAt[0], shot.lookAt[1], shot.lookAt[2]);
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = shot.fov ?? 42;
            camera.updateProjectionMatrix();
          }
          s.cinematicInitialized = true;
          s.cinematicWasActive = true;
        }
      }
    });

    const unsubRespawn = EventBus.on('world.player.respawned', (payload) => {
      const s = stateRef.current;
      s.targetPosSmoothed = [payload.position[0], payload.position[1] + 1.25, payload.position[2]];
      s.collisionDist = CAMERA_CONSTANTS.TP_DEFAULT_DIST;
    });

    const unsubSuggest = EventBus.on('camera.perspective.suggest', (suggestion) => {
      const s = stateRef.current;
      if (s.mode === 'third_person') {
        if (suggestion.yaw !== undefined) s.suggestedYaw = suggestion.yaw;
        if (suggestion.pitch !== undefined) s.suggestedPitch = suggestion.pitch;
      }
    });

    return () => {
      unsubInput();
      unsubCam();
      unsubDialogue();
      unsubCinematic();
      unsubRespawn();
      unsubSuggest();
    };
  }, [camera, inputManager, onCameraYawChange, playerPosRef]);

  useFrame((threeState, delta) => {
    const dt = Math.min(0.05, delta);
    const s = stateRef.current;
    const ui = useUIStore.getState();
    const game = useGameStore.getState();
    const settings = useSettingsStore.getState();

    // 0. Cinematic camera override during prologue/cutscene
    if (ui.screen === 'in_game' && ui.inGameOverlay === 'cinematic') {
      const shot = s.cinematicShot ?? activeCinematicShot;
      if (shot) {
        if (!s.cinematicInitialized) {
          s.cinematicCurrentPos = [shot.position[0], shot.position[1], shot.position[2]];
          s.cinematicCurrentLookAt = [shot.lookAt[0], shot.lookAt[1], shot.lookAt[2]];
          camera.position.set(shot.position[0], shot.position[1], shot.position[2]);
          camera.lookAt(shot.lookAt[0], shot.lookAt[1], shot.lookAt[2]);
          if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = shot.fov ?? 42;
            camera.updateProjectionMatrix();
          }
          s.cinematicInitialized = true;
          s.cinematicWasActive = true;
        }

        const lerpRate = Math.min(1, dt * (shot.driftSpeed ?? 2.4));
        s.cinematicCurrentPos[0] += (shot.position[0] - s.cinematicCurrentPos[0]) * lerpRate;
        s.cinematicCurrentPos[1] += (shot.position[1] - s.cinematicCurrentPos[1]) * lerpRate;
        s.cinematicCurrentPos[2] += (shot.position[2] - s.cinematicCurrentPos[2]) * lerpRate;

        // Subtle atmospheric drone sway
        const swayTime = threeState.clock.elapsedTime;
        const swayX = Math.sin(swayTime * 0.45) * 0.14;
        const swayY = Math.cos(swayTime * 0.35) * 0.08;

        s.cinematicCurrentLookAt[0] += (shot.lookAt[0] + swayX - s.cinematicCurrentLookAt[0]) * lerpRate;
        s.cinematicCurrentLookAt[1] += (shot.lookAt[1] + swayY - s.cinematicCurrentLookAt[1]) * lerpRate;
        s.cinematicCurrentLookAt[2] += (shot.lookAt[2] - s.cinematicCurrentLookAt[2]) * lerpRate;

        camera.position.set(
          s.cinematicCurrentPos[0],
          s.cinematicCurrentPos[1],
          s.cinematicCurrentPos[2],
        );
        camera.lookAt(
          s.cinematicCurrentLookAt[0],
          s.cinematicCurrentLookAt[1],
          s.cinematicCurrentLookAt[2],
        );

        const targetFov = shot.fov ?? 38;
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov += (targetFov - camera.fov) * lerpRate;
          camera.updateProjectionMatrix();
        }
        camera.clearViewOffset();
        return;
      }
    }

    // Smooth transition out of cinematic when exiting cinematic overlay
    if (s.cinematicWasActive && ui.inGameOverlay !== 'cinematic') {
      s.cinematicWasActive = false;
      s.cinematicInitialized = false;
      s.cinematicShot = null;
      activeCinematicShot = null;

      const dx = camera.position.x - playerPosRef.current[0];
      const dz = camera.position.z - playerPosRef.current[2];
      if (Math.hypot(dx, dz) > 0.1) {
        s.tpYaw = Math.atan2(dx, dz);
        onCameraYawChange?.(s.tpYaw);
      }

      s.fromPose = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        lookAt: [
          playerPosRef.current[0],
          playerPosRef.current[1] + 1.25,
          playerPosRef.current[2],
        ],
        fov:
          camera instanceof THREE.PerspectiveCamera
            ? camera.fov
            : CAMERA_CONSTANTS.TP_FOV,
      };
      s.mode = 'third_person';
      s.transitionActive = true;
      s.transitionElapsed = 0;
    }

    // 1. Title screen & pre-game slow orbit (12 deg/min)
    if (ui.screen !== 'in_game') {
      s.titleAngle += CAMERA_CONSTANTS.TITLE_ORBIT_RAD_PER_SEC * dt;
      const orbitCenter: [number, number, number] =
        ui.screen === 'new_adventure' ? [0, 3.2, 0] : [14, 5.5, 4];
      const radius = ui.screen === 'new_adventure' ? 4.2 : 24;
      const height = ui.screen === 'new_adventure' ? 1.8 : 13;
      const px = orbitCenter[0] + Math.sin(s.titleAngle) * radius;
      const pz = orbitCenter[2] + Math.cos(s.titleAngle) * radius;
      camera.position.set(px, orbitCenter[1] + height, pz);
      camera.lookAt(orbitCenter[0], orbitCenter[1], orbitCenter[2]);
      if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - 42) > 0.1) {
        camera.fov = 42;
        camera.updateProjectionMatrix();
      }
      camera.clearViewOffset();
      return;
    }

    // 2. Quest active camera mode transition (honoring settings.controls.autoIsoInPuzzle):
    // Camera only auto-switches if user opted into autoIsoInPuzzle, or via manual 'V' toggle.
    const isWorkingOnQuest =
      settings.controls.autoIsoInPuzzle &&
      (ui.inGameOverlay === 'editor' ||
        ui.inGameOverlay === 'learning_intro' ||
        game.isObservingPlayback);

    if (isWorkingOnQuest && !s.wasWorkingOnQuest) {
      s.wasWorkingOnQuest = true;
      s.savedModeBeforeQuest = game.world.cameraMode;
      if (game.world.cameraMode !== 'isometric') {
        game.setCameraMode('isometric');
      }
    } else if (!isWorkingOnQuest && s.wasWorkingOnQuest) {
      s.wasWorkingOnQuest = false;
      if (s.savedModeBeforeQuest && game.world.cameraMode !== s.savedModeBeforeQuest) {
        game.setCameraMode(s.savedModeBeforeQuest);
      }
      s.savedModeBeforeQuest = null;
    }

    // 3. Apply orbit/zoom deltas from InputManager
    const sens = settings.controls.cameraSensitivity;
    const invertSign = settings.controls.invertY ? -1 : 1;
    const snap = inputManager.consumeCameraDeltas();

    // If player manually moves the camera, dismiss any advisory suggested angle
    if (snap.orbitDeltaX !== 0 || snap.orbitDeltaY !== 0) {
      s.suggestedYaw = null;
      s.suggestedPitch = null;
    }

    if (s.mode === 'third_person') {
      s.tpYaw -= snap.orbitDeltaX * 0.006 * sens;
      s.tpPitch = Math.max(
        0.14,
        Math.min(1.25, s.tpPitch + snap.orbitDeltaY * 0.005 * sens * invertSign),
      );
      s.tpDistance = Math.max(
        CAMERA_CONSTANTS.TP_MIN_DIST,
        Math.min(CAMERA_CONSTANTS.TP_MAX_DIST, s.tpDistance + snap.zoomDelta * 0.6),
      );

      // Smoothly blend suggested perspective if present and no active player drag
      if (s.suggestedYaw !== null) {
        s.tpYaw = lerpAngle(s.tpYaw, s.suggestedYaw, Math.min(1, dt * 3.0));
        if (Math.abs(lerpAngle(0, s.suggestedYaw - s.tpYaw, 1)) < 0.01) {
          s.suggestedYaw = null;
        }
      }
      if (s.suggestedPitch !== null) {
        s.tpPitch += (s.suggestedPitch - s.tpPitch) * Math.min(1, dt * 3.0);
        if (Math.abs(s.suggestedPitch - s.tpPitch) < 0.01) {
          s.suggestedPitch = null;
        }
      }

      onCameraYawChange?.(s.tpYaw);
    } else {
      s.isoZoom = Math.max(
        CAMERA_CONSTANTS.ISO_MIN_ZOOM,
        Math.min(CAMERA_CONSTANTS.ISO_MAX_ZOOM, s.isoZoom - snap.zoomDelta * 0.12),
      );
      const isoYaw = Math.PI * 0.25 + s.isoStep * (Math.PI * 0.5);
      onCameraYawChange?.(isoYaw);
    }

    // Smooth 90-deg isometric rotation steps
    const stepDiff = s.isoTargetStep - s.isoStep;
    if (Math.abs(stepDiff) > 0.001) {
      s.isoStep += stepDiff * Math.min(1, dt * 10);
    } else {
      s.isoStep = s.isoTargetStep;
    }

    // 4. Determine camera focus target (BIT during playback, NPC during dialogue, or Player)
    let rawTarget: [number, number, number] = [
      playerPosRef.current[0],
      playerPosRef.current[1] + 1.25,
      playerPosRef.current[2],
    ];
    if (game.isObservingPlayback) {
      rawTarget = [
        bitPosRef.current[0],
        bitPosRef.current[1] + 0.6,
        bitPosRef.current[2],
      ];
    } else if (ui.inGameOverlay === 'editor') {
      const dist = Math.hypot(
        playerPosRef.current[0] - bitPosRef.current[0],
        playerPosRef.current[2] - bitPosRef.current[2],
      );
      if (dist < 14) {
        rawTarget = [
          (playerPosRef.current[0] + bitPosRef.current[0]) * 0.5,
          Math.max(playerPosRef.current[1], bitPosRef.current[1]) + 0.8,
          (playerPosRef.current[2] + bitPosRef.current[2]) * 0.5,
        ];
      }
    } else if (s.dialogueShot && npcPositionsRef?.current[s.dialogueShot.targetId]) {
      const npcPos = npcPositionsRef.current[s.dialogueShot.targetId]!;
      if (s.dialogueShot.preset === 'overview') {
        rawTarget = [npcPos[0], npcPos[1] + 2.5, npcPos[2]];
      } else {
        rawTarget = [npcPos[0], npcPos[1] + 1.15, npcPos[2]];
      }
    }

    // Smooth target follow & vertical stair dampening
    if (!s.targetPosSmoothed) {
      s.targetPosSmoothed = [...rawTarget];
    } else {
      const dx = rawTarget[0] - s.targetPosSmoothed[0];
      const dy = rawTarget[1] - s.targetPosSmoothed[1];
      const dz = rawTarget[2] - s.targetPosSmoothed[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > 144) {
        // Fast snap on teleports or respawns
        s.targetPosSmoothed = [...rawTarget];
      } else {
        // Horizontal follow: responsive rate 16
        const rateH = Math.min(1, dt * 16);
        // Vertical follow: slightly dampened (rate 10) to absorb block-stair steps smoothly
        const rateV = Math.min(1, dt * 10);
        s.targetPosSmoothed[0] += dx * rateH;
        s.targetPosSmoothed[1] += dy * rateV;
        s.targetPosSmoothed[2] += dz * rateH;
      }
    }

    const targetPos = s.targetPosSmoothed;

    const desiredPose = computeCameraPose({
      mode: s.mode,
      target: targetPos,
      tpYaw: s.tpYaw,
      tpPitch: s.tpPitch,
      tpDistance: s.tpDistance,
      isoStep: s.isoStep,
      isoZoom: s.isoZoom,
    });

    // 5. Third-person terrain collision clamping with smooth distance damping
    if (s.mode === 'third_person' && storageRef.current) {
      const dirX = desiredPose.position[0] - targetPos[0];
      const dirY = desiredPose.position[1] - targetPos[1];
      const dirZ = desiredPose.position[2] - targetPos[2];
      const maxLen = Math.hypot(dirX, dirY, dirZ);
      if (maxLen > 0.1) {
        const hit = raycastStorage(
          storageRef.current,
          targetPos,
          [dirX, dirY, dirZ],
          maxLen,
        );

        const targetDist = hit && hit.distance < maxLen
          ? Math.max(1.15, hit.distance - 0.35)
          : maxLen;

        if (targetDist < s.collisionDist) {
          // Obstacle encroaching: rapid retraction to prevent clipping into terrain
          s.collisionDist += (targetDist - s.collisionDist) * Math.min(1, dt * 25);
        } else {
          // Obstacle cleared: smooth easing back out to avoid popping/jerking
          s.collisionDist += (targetDist - s.collisionDist) * Math.min(1, dt * 6);
        }

        s.collisionDist = Math.max(1.1, Math.min(maxLen, s.collisionDist));
        const scale = s.collisionDist / maxLen;
        desiredPose.position = [
          targetPos[0] + dirX * scale,
          targetPos[1] + dirY * scale,
          targetPos[2] + dirZ * scale,
        ];
      }
    }

    // 6. Smooth 600 ms cubic ease-out mode transition with dynamic anchor tracking
    let finalPose = desiredPose;
    if (s.transitionActive) {
      const transitionSec = settings.accessibility.reducedMotion
        ? 0.05
        : CAMERA_CONSTANTS.TRANSITION_MS / 1000;
      s.transitionElapsed += dt;
      const t = Math.min(1, s.transitionElapsed / transitionSec);

      // Dynamically track target so player movement during transition doesn't lag or snap
      const fromPoseDynamic: CameraPoseOutput = {
        position: [
          desiredPose.lookAt[0] + (s.fromPose.position[0] - s.fromPose.lookAt[0]),
          desiredPose.lookAt[1] + (s.fromPose.position[1] - s.fromPose.lookAt[1]),
          desiredPose.lookAt[2] + (s.fromPose.position[2] - s.fromPose.lookAt[2]),
        ],
        lookAt: desiredPose.lookAt,
        fov: s.fromPose.fov,
      };

      finalPose = lerpCameraPose(fromPoseDynamic, desiredPose, t);
      if (t >= 1) {
        s.transitionActive = false;
      }
    }

    camera.position.set(finalPose.position[0], finalPose.position[1], finalPose.position[2]);
    camera.lookAt(finalPose.lookAt[0], finalPose.lookAt[1], finalPose.lookAt[2]);
    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - finalPose.fov) > 0.05) {
        camera.fov = finalPose.fov;
        camera.updateProjectionMatrix();
      }
    }

    // 7. 200 ms camera.setViewOffset lerp for editor dock / portrait bottom sheet
    const editorOpen =
      ui.inGameOverlay === 'editor' && !ui.editorAutoCollapsedForRestoration;
    const [nextOffX, nextOffY] = computeTargetViewOffset(
      ui.layoutClass,
      editorOpen,
      ui.mobileSheetSnap,
      size.width,
      size.height,
    );
    if (
      Math.abs(nextOffX - s.targetOffset[0]) > 0.5 ||
      Math.abs(nextOffY - s.targetOffset[1]) > 0.5
    ) {
      s.startOffset = [...s.currentOffset];
      s.targetOffset = [nextOffX, nextOffY];
      s.offsetElapsed = 0;
    }

    const offsetDur = settings.accessibility.reducedMotion
      ? 0.01
      : CAMERA_CONSTANTS.VIEW_OFFSET_MS / 1000;
    if (s.offsetElapsed < offsetDur) {
      s.offsetElapsed = Math.min(offsetDur, s.offsetElapsed + dt);
      const t = easeOutCubic(s.offsetElapsed / offsetDur);
      s.currentOffset = [
        s.startOffset[0] + (s.targetOffset[0] - s.startOffset[0]) * t,
        s.startOffset[1] + (s.targetOffset[1] - s.startOffset[1]) * t,
      ];
    } else {
      s.currentOffset = [...s.targetOffset];
    }

    if (
      camera instanceof THREE.PerspectiveCamera &&
      (Math.abs(s.currentOffset[0]) > 0.5 || Math.abs(s.currentOffset[1]) > 0.5)
    ) {
      camera.setViewOffset(
        size.width,
        size.height,
        s.currentOffset[0],
        s.currentOffset[1],
        size.width,
        size.height,
      );
    } else if (camera instanceof THREE.PerspectiveCamera && camera.view !== null) {
      camera.clearViewOffset();
    }
  });

  return null;
}
