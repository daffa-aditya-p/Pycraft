import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EventBus } from '../../stores/EventBus';
import { useEditorStore } from '../../stores/useEditorStore';
import { useGameStore } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { CameraRig } from '../camera/CameraRig';
import { CharacterController } from '../controller/CharacterController';
import { globalInputManager } from '../input/InputManager';
import { CHUNK_SIZE, ChunkStorage } from '../voxel/ChunkStorage';
import { generateAwakeningWorld, type GeneratedWorld } from '../voxel/islandGenerator';
import { type LayerMeshBuffers } from '../voxel/mesher';
import { MesherClient } from '../voxel/MesherClient';
import {
  ArchitectEntity,
  BitEntity,
  BoltNpc,
  GuardianSilhouette,
  InteractablesHighlightLayer,
  MiraNpc,
  NeoEntity,
  OldTamoNpc,
} from './Entities';
import { InstancedPropsLayer } from './InstancedProps';
import { QualityController } from './QualityController';
import { QUALITY_PRESETS, SkyAndLighting } from './SkyAndLighting';
import {
  createSharedShaderUniforms,
  createSkybridgeMaterial,
  createTerrainMaterial,
  createWaterMaterial,
} from './VoxelMaterials';

import type { WorldSimState, Direction } from '../../sim/types';

export interface BitVisualState {
  targetPosition: [number, number, number] | null;
  targetYaw: number | null;
  speechBubble: string | null;
}

const bitVisualTarget: BitVisualState = {
  targetPosition: null,
  targetYaw: null,
  speechBubble: null,
};

const DIRECTION_TO_YAW: Record<Direction, number> = {
  south: 0,
  east: Math.PI * 0.5,
  north: Math.PI,
  west: -Math.PI * 0.5,
};

/**
 * Updates BIT's 3D target pose & speech bubble from an authoritative WorldSimState
 * during ActionPlayer playback (zero React re-renders).
 */
export function syncBitVisualFromSim(
  puzzleOrigin: [number, number, number],
  simState: WorldSimState,
): void {
  bitVisualTarget.targetPosition = [
    puzzleOrigin[0] + simState.robot.x,
    puzzleOrigin[1] + simState.robot.z,
    puzzleOrigin[2] + simState.robot.y,
  ];
  bitVisualTarget.targetYaw = DIRECTION_TO_YAW[simState.robot.facing] ?? 0;
  const lastSay = simState.robot.sayHistory[simState.robot.sayHistory.length - 1] ?? null;
  bitVisualTarget.speechBubble = lastSay ? lastSay.slice(0, 60) : null;
}

export function clearBitVisualOverride(): void {
  bitVisualTarget.targetPosition = null;
  bitVisualTarget.targetYaw = null;
  bitVisualTarget.speechBubble = null;
}

function buildThreeGeometryFromLayer(layer: LayerMeshBuffers, ox: number, oy: number, oz: number): THREE.BufferGeometry | null {
  if (layer.faceCount === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(layer.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(layer.normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(layer.colors, 3));
  geo.setAttribute('aDormantColor', new THREE.BufferAttribute(layer.dormantColors, 3));
  geo.setAttribute('aAo', new THREE.BufferAttribute(layer.ao, 1));
  geo.setAttribute('aEmissive', new THREE.BufferAttribute(layer.emissive, 1));
  geo.setIndex(new THREE.BufferAttribute(layer.indices, 1));
  geo.translate(ox, oy, oz);
  geo.computeBoundingSphere();
  return geo;
}

interface ChunkRenderEntry {
  key: string;
  zoneId: string;
  solidGeo: THREE.BufferGeometry | null;
  waterGeo: THREE.BufferGeometry | null;
  skybridgeGeo: THREE.BufferGeometry | null;
}

interface AwakeningSceneProps {
  world: GeneratedWorld;
  onVoidFadeChange: (opacity: number) => void;
  onContextLostChange: (lost: boolean) => void;
  onFpsSample: (fps: number) => void;
}

function AwakeningScene({
  world,
  onVoidFadeChange,
  onContextLostChange,
  onFpsSample,
}: AwakeningSceneProps) {
  const storageRef = useRef<ChunkStorage>(world.storage);
  const mesherRef = useRef<MesherClient | null>(null);
  const [chunkMeshes, setChunkMeshes] = useState<ChunkRenderEntry[]>([]);
  const [rebuildToken, setRebuildToken] = useState(0);

  const appearance = useGameStore((s) => s.profile.appearance);
  const cosmetics = useGameStore((s) => s.profile.cosmetics);
  const restoredZoneIds = useGameStore((s) => s.world.restoredZoneIds);
  const collectedWorldItemIds = useGameStore((s) => s.world.collectedWorldItemIds);
  const discoveredLoreNoteIds = useGameStore((s) => s.world.discoveredLoreNoteIds);
  const neoMood = useEditorStore((s) => s.mentorPanel.visorMood);
  const quality = useSettingsStore((s) => s.graphics.quality);
  const activePromptTargetId = useUIStore((s) => s.activePrompt?.targetId ?? null);

  const sharedUniforms = useMemo(() => createSharedShaderUniforms(), []);

  // Per-zone restoration uniform & material sets so each island restores smoothly 0 -> 1
  const zoneMaterials = useMemo(() => {
    const map = new Map<
      string,
      {
        restoration: { value: number };
        solid: THREE.MeshLambertMaterial;
        water: THREE.MeshLambertMaterial;
        skybridge: THREE.MeshLambertMaterial;
      }
    >();
    for (const zone of world.zones) {
      const rest = { value: zone.id === 'stasis_shrine' ? 0.35 : 0 };
      map.set(zone.id, {
        restoration: rest,
        solid: createTerrainMaterial(sharedUniforms, rest),
        water: createWaterMaterial(sharedUniforms, rest),
        skybridge: createSkybridgeMaterial(sharedUniforms, rest),
      });
    }
    return map;
  }, [world.zones, sharedUniforms]);

  const entityMaterial = useMemo(
    () => createTerrainMaterial(sharedUniforms, { value: 1 }),
    [sharedUniforms],
  );

  // Character controller & mutable per-frame refs (zero React re-renders per frame)
  const controllerRef = useRef<CharacterController | null>(null);
  if (!controllerRef.current) {
    const savedPos = useGameStore.getState().world.playerPosition;
    const startPos: [number, number, number] =
      savedPos[0] === 0 && savedPos[1] === 2 && savedPos[2] === 0
        ? world.playerSpawnPos
        : savedPos;
    controllerRef.current = new CharacterController(
      startPos,
      useGameStore.getState().world.playerYaw,
      world.anchors,
    );
  }

  const playerPosRef = useRef<[number, number, number]>([...controllerRef.current.state.position]);
  const playerYawRef = useRef(controllerRef.current.state.yaw);
  const playerWalkingRef = useRef(false);
  const playerSprintingRef = useRef(false);
  const cameraYawRef = useRef(0.65);

  const bitPosRef = useRef<[number, number, number]>([...world.bitInitialPos]);
  const bitYawRef = useRef(0);
  const bitAnimRef = useRef({
    bumpTimer: 0,
    craneTimer: 0,
    scanTimer: 0,
    speechBubble: null as string | null,
  });

  const npcPositionsRef = useRef<Record<string, [number, number, number]>>(world.npcPositions);
  const focusPosRef = useRef<[number, number, number]>([...playerPosRef.current]);
  const lastStoreSyncRef = useRef(0);
  const lastFadeRef = useRef(0);

  // Mesh all chunks asynchronously via MesherClient worker
  useEffect(() => {
    const client = new MesherClient();
    mesherRef.current = client;
    let cancelled = false;

    async function buildAllChunks() {
      const storage = storageRef.current;
      storage.markAllDirty();
      const dirty = storage.getDirtyChunks();
      const entries: ChunkRenderEntry[] = [];

      const results = await Promise.all(
        dirty.map(async (chunk) => ({
          chunk,
          mesh: await client.meshChunk(storage, chunk),
        })),
      );

      if (cancelled) return;

      for (const { chunk, mesh } of results) {
        storage.markClean(chunk.key);
        const ox = chunk.cx * CHUNK_SIZE;
        const oy = chunk.cy * CHUNK_SIZE;
        const oz = chunk.cz * CHUNK_SIZE;
        entries.push({
          key: chunk.key,
          zoneId: chunk.zoneId,
          solidGeo: buildThreeGeometryFromLayer(mesh.solid, ox, oy, oz),
          waterGeo: buildThreeGeometryFromLayer(mesh.water, ox, oy, oz),
          skybridgeGeo: buildThreeGeometryFromLayer(mesh.skybridge, ox, oy, oz),
        });
      }

      setChunkMeshes(entries);
      useUIStore.getState().setWorldLoadProgress(100, 'Siap');
    }

    void buildAllChunks();

    return () => {
      cancelled = true;
      client.dispose();
    };
  }, [rebuildToken]);

  // Listen for Interact (E) action -> emit player.interact for nearest interactable
  useEffect(() => {
    const unsubAction = globalInputManager.onAction((action) => {
      if (action === 'interact') {
        const prompt = useUIStore.getState().activePrompt;
        if (prompt) {
          EventBus.emit('player.interact', {
            targetId: prompt.targetId,
            kind: prompt.kind,
          });
        }
      }
    });

    const unsubPlayback = EventBus.on('playback.state.changed', ({ state }) => {
      useGameStore.getState().setObservingPlayback(state === 'playing' || state === 'paused');
      if (state === 'idle' || state === 'finished' || state === 'fault') {
        bitAnimRef.current.speechBubble = null;
      }
    });

    const unsubAudioCue = EventBus.on('audio.cue', ({ cue }) => {
      if (cue === 'bit_bump') bitAnimRef.current.bumpTimer = 0.28;
      if (cue === 'bit_place' || cue === 'bit_plant' || cue === 'bit_collect') {
        bitAnimRef.current.craneTimer = 0.3;
      }
      if (cue === 'bit_chirp') bitAnimRef.current.scanTimer = 0.2;
    });

    return () => {
      unsubAction();
      unsubPlayback();
      unsubAudioCue();
    };
  }, []);

  const handleContextRestored = useCallback(() => {
    setRebuildToken((t) => t + 1);
  }, []);

  // Per-frame simulation, animation, restoration blending, and proximity checks
  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    sharedUniforms.uTime.value = state.clock.elapsedTime;
    sharedUniforms.uWaterDetail.value = QUALITY_PRESETS[quality].waterDetail;

    const game = useGameStore.getState();
    const ui = useUIStore.getState();

    // Smooth 0 -> 1 restoration shader uniform interpolation per island
    for (const [zoneId, bundle] of zoneMaterials.entries()) {
      const targetRest = game.world.restoredZoneIds.includes(zoneId) ? 1.0 : 0.0;
      const cur = bundle.restoration.value;
      if (Math.abs(targetRest - cur) > 0.002) {
        bundle.restoration.value = cur + (targetRest - cur) * Math.min(1, dt * 1.4);
      } else {
        bundle.restoration.value = targetRest;
      }
    }

    if (ui.screen !== 'in_game') return;

    const ctrl = controllerRef.current!;
    const moveSnap = globalInputManager.getMovementInput();
    ctrl.step(
      dt,
      {
        moveX: moveSnap.moveX,
        moveZ: moveSnap.moveZ,
        sprint: moveSnap.sprint,
        jumpPressed: moveSnap.jump,
        cameraYaw: cameraYawRef.current,
        observationLocked: game.isObservingPlayback || moveSnap.suspended || ui.inGameOverlay === 'cinematic',
      },
      storageRef.current,
    );

    playerPosRef.current[0] = ctrl.state.position[0];
    playerPosRef.current[1] = ctrl.state.position[1];
    playerPosRef.current[2] = ctrl.state.position[2];
    playerYawRef.current = ctrl.state.yaw;
    playerWalkingRef.current = ctrl.state.walking;
    playerSprintingRef.current = ctrl.state.sprinting;

    focusPosRef.current = game.isObservingPlayback
      ? [...bitPosRef.current]
      : [...playerPosRef.current];

    // Smoothly interpolate BIT toward sim target when driven by ActionPlayer
    if (bitVisualTarget.targetPosition) {
      const rate = Math.min(1, dt * 12);
      bitPosRef.current[0] += (bitVisualTarget.targetPosition[0] - bitPosRef.current[0]) * rate;
      bitPosRef.current[1] += (bitVisualTarget.targetPosition[1] - bitPosRef.current[1]) * rate;
      bitPosRef.current[2] += (bitVisualTarget.targetPosition[2] - bitPosRef.current[2]) * rate;
    }
    if (bitVisualTarget.targetYaw !== null) {
      let diff = ((bitVisualTarget.targetYaw - bitYawRef.current + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      bitYawRef.current += diff * Math.min(1, dt * 14);
    }
    if (bitVisualTarget.speechBubble !== null) {
      bitAnimRef.current.speechBubble = bitVisualTarget.speechBubble;
    }

    if (Math.abs(ctrl.state.voidFadeProgress - lastFadeRef.current) > 0.01) {
      lastFadeRef.current = ctrl.state.voidFadeProgress;
      onVoidFadeChange(ctrl.state.voidFadeProgress);
    }

    // Periodic store sync (~4 Hz) so React never re-renders per frame
    lastStoreSyncRef.current += dt;
    if (lastStoreSyncRef.current >= 0.25) {
      lastStoreSyncRef.current = 0;

      // Sync player transform & playtime
      game.updatePlayerTransform(
        [...ctrl.state.position],
        ctrl.state.yaw,
        ctrl.state.currentIslandId,
      );
      game.tickPlaytime(0.25);

      // Proximity check for interactables (< 2.4 u)
      let nearestPrompt: {
        targetId: string;
        label: string;
        keyHint: string;
        kind: 'npc' | 'device' | 'item' | 'lore' | 'puzzle';
      } | null = null;
      let bestDistSq = 2.6 * 2.6;
      const px = ctrl.state.position[0];
      const py = ctrl.state.position[1];
      const pz = ctrl.state.position[2];

      for (const item of world.interactables) {
        if (game.world.collectedWorldItemIds.includes(item.id)) continue;
        if (game.world.discoveredLoreNoteIds.includes(item.id)) continue;
        const dx = item.position[0] - px;
        const dy = item.position[1] - py;
        const dz = item.position[2] - pz;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          nearestPrompt = {
            targetId: item.id,
            label: item.label,
            keyHint: 'E',
            kind: item.kind,
          };
        }
      }

      if (ui.activePrompt?.targetId !== nearestPrompt?.targetId) {
        ui.setActivePrompt(nearestPrompt);
      }

      // Spatial area changes never alter camera mode or trigger zone switches automatically
    }
  });

  const coreRestored = restoredZoneIds.includes('core_spire');

  return (
    <>
      <QualityController
        onContextRestored={handleContextRestored}
        onContextLostChange={onContextLostChange}
        onFpsSample={onFpsSample}
      />
      <SkyAndLighting focusPosRef={focusPosRef} />

      {/* Meshed Awakening Chunks */}
      <group name="awakening-chunks">
        {chunkMeshes.map((entry) => {
          const mats = zoneMaterials.get(entry.zoneId) ?? zoneMaterials.values().next().value!;
          return (
            <group key={entry.key}>
              {entry.solidGeo && (
                <mesh
                  geometry={entry.solidGeo}
                  material={mats.solid}
                  castShadow
                  receiveShadow
                />
              )}
              {entry.waterGeo && (
                <mesh
                  geometry={entry.waterGeo}
                  material={mats.water}
                  receiveShadow
                />
              )}
              {entry.skybridgeGeo && (
                <mesh
                  geometry={entry.skybridgeGeo}
                  material={mats.skybridge}
                  receiveShadow
                />
              )}
            </group>
          );
        })}
      </group>

      {/* Instanced Tier 2 Props */}
      <InstancedPropsLayer
        props={world.props}
        collectedWorldItemIds={collectedWorldItemIds}
        discoveredLoreNoteIds={discoveredLoreNoteIds}
        restoredZoneIds={restoredZoneIds}
        material={entityMaterial}
      />

      {/* 3D Interactable and Quest Objective Highlights */}
      <InteractablesHighlightLayer
        interactables={world.interactables}
        playerPosRef={playerPosRef}
        collectedWorldItemIds={collectedWorldItemIds}
        discoveredLoreNoteIds={discoveredLoreNoteIds}
        activePromptTargetId={activePromptTargetId}
      />

      {/* Distant Core Citadel Monolith & Guardian Silhouette (Section 6.2 / 6.4) */}
      <group position={[-85, 36, -95]} name="distant-core-citadel">
        <mesh material={entityMaterial}>
          <boxGeometry args={[12, 34, 12]} />
        </mesh>
      </group>
      <GuardianSilhouette
        position={[-72, 28, -58]}
        visible={coreRestored}
        material={entityMaterial}
      />

      {/* Characters & Robots */}
      <ArchitectEntity
        positionRef={playerPosRef}
        yawRef={playerYawRef}
        walkingRef={playerWalkingRef}
        sprintingRef={playerSprintingRef}
        appearance={appearance}
        material={entityMaterial}
      />
      <NeoEntity
        followPosRef={playerPosRef}
        mood={neoMood}
        visorCosmetic={cosmetics.neoVisor}
        material={entityMaterial}
      />
      <BitEntity
        positionRef={bitPosRef}
        yawRef={bitYawRef}
        animStateRef={bitAnimRef}
        cosmetics={cosmetics}
        material={entityMaterial}
      />
      {world.npcPositions.bolt && (
        <BoltNpc position={world.npcPositions.bolt} yaw={0.4} material={entityMaterial} />
      )}
      {world.npcPositions.mira && (
        <MiraNpc position={world.npcPositions.mira} yaw={-0.6} material={entityMaterial} />
      )}
      {world.npcPositions.old_tamo && (
        <OldTamoNpc position={world.npcPositions.old_tamo} yaw={-1.2} material={entityMaterial} />
      )}

      {/* Dual Camera Rig */}
      <CameraRig
        storageRef={storageRef}
        playerPosRef={playerPosRef}
        bitPosRef={bitPosRef}
        npcPositionsRef={npcPositionsRef}
        inputManager={globalInputManager}
        onCameraYawChange={(yaw) => {
          cameraYawRef.current = yaw;
        }}
      />
    </>
  );
}

/**
 * Single persistent React Three Fiber Canvas hosting Title orbit and Awakening gameplay.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [voidFade, setVoidFade] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  const showFps = useSettingsStore((s) => s.graphics.showFps);

  const world = useMemo(() => generateAwakeningWorld(), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return globalInputManager.attach(el);
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="pycraft-game-canvas"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <Canvas
        shadows
        dpr={[0.8, 1.5]}
        camera={{ fov: 46, near: 0.2, far: 400, position: [-40, 12, 64] }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <AwakeningScene
          world={world}
          onVoidFadeChange={setVoidFade}
          onContextLostChange={setContextLost}
          onFpsSample={setFps}
        />
      </Canvas>

      {/* Void Fall 400 ms Fade Overlay */}
      {voidFade > 0.01 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#1C2427',
            opacity: voidFade,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* WebGL Context Lost Recovery Banner */}
      {contextLost && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(28, 36, 39, 0.92)',
            color: '#E8EEF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700,
          }}
        >
          Memulihkan tampilan 3D…
        </div>
      )}

      {/* Optional FPS Overlay (Section 4 #34) */}
      {showFps && fps !== null && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1C2427',
            color: '#3CC4C0',
            border: '1px solid #33434A',
            padding: '2px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            pointerEvents: 'none',
          }}
        >
          {fps} FPS
        </div>
      )}
    </div>
  );
}
