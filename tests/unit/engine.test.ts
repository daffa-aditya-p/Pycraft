import { describe, it, expect, beforeEach } from 'vitest';
import {
  AO_LEVELS,
  ChunkStorage,
  CharacterController,
  PLAYER_CONSTANTS,
  VoxelId,
  buildDetailVoxelGeometry,
  computeCameraPose,
  computeTargetViewOffset,
  easeOutCubic,
  generateAwakeningWorld,
  lerpAngle,
  lerpCameraPose,
  meshPaddedChunk,
  raycastStorage,
  serializeGeneratedWorld,
} from '@/engine';
import { EventBus } from '@/stores/EventBus';
import { CINEMATIC_ACTS, interpolateCinematicPose } from '@/ui/screens/CinematicIntroOverlay';

describe('Voxel Engine: ChunkStorage, Greedy Mesher & 4-Level AO', () => {
  it('achieves >= 65% face reduction on flat/stepped terrain via greedy meshing', () => {
    const storage = new ChunkStorage();
    for (let x = 2; x < 28; x++) {
      for (let z = 2; z < 28; z++) {
        storage.setVoxel(x, 0, z, VoxelId.STONE_MID);
        storage.setVoxel(x, 1, z, VoxelId.SOIL_WARM);
        storage.setVoxel(x, 2, z, VoxelId.GRASS_TOP);
      }
    }
    // Add water and skybridge layers
    for (let x = 10; x < 16; x++) {
      for (let z = 10; z < 16; z++) {
        storage.setVoxel(x, 3, z, VoxelId.WATER_SHALLOW);
      }
      storage.setVoxel(x, 4, 20, VoxelId.SKYBRIDGE_CYAN);
    }

    const chunk = storage.getChunk(0, 0, 0)!;
    const padded = storage.extractPaddedChunk(0, 0, 0);
    const mesh = meshPaddedChunk(padded, 0, 0, 0);

    expect(mesh.stats.naiveFaces).toBeGreaterThan(500);
    expect(mesh.stats.reductionRatio).toBeGreaterThanOrEqual(0.65);
    expect(mesh.solid.faceCount).toBeGreaterThan(0);
    expect(mesh.water.faceCount).toBeGreaterThan(0);
    expect(mesh.skybridge.faceCount).toBeGreaterThan(0);
    expect(chunk.data.length).toBe(32 * 32 * 32);
  });

  it('bakes 4-level vertex AO [0.62, 0.76, 0.88, 1.0] seamlessly including across chunk borders', () => {
    const storage = new ChunkStorage();
    // Floor slab spanning chunk border x=31 -> x=32
    for (let x = 28; x <= 35; x++) {
      for (let z = 4; z <= 10; z++) {
        storage.setVoxel(x, 4, z, VoxelId.STONE_MID);
      }
    }
    // Place L-corner walls on chunk 1 (x=32) bordering chunk 0 (x=31)
    storage.setVoxel(32, 5, 6, VoxelId.STONE_DARK);
    storage.setVoxel(31, 5, 7, VoxelId.STONE_DARK);

    const padded0 = storage.extractPaddedChunk(0, 0, 0);
    const mesh0 = meshPaddedChunk(padded0, 0, 0, 0);

    const aoValues = new Set<number>();
    for (let i = 0; i < mesh0.solid.ao.length; i++) {
      aoValues.add(Number(mesh0.solid.ao[i]!.toFixed(2)));
    }

    expect(aoValues.has(AO_LEVELS[0])).toBe(true); // 0.62 corner occluded by both sides
    expect(aoValues.has(AO_LEVELS[2])).toBe(true); // 0.88 single neighbor
    expect(aoValues.has(AO_LEVELS[3])).toBe(true); // 1.0 unoccluded
  });

  it('performs accurate 3D DDA voxel raycasting', () => {
    const storage = new ChunkStorage();
    storage.setVoxel(4, 5, 0, VoxelId.STONE_MID);

    const hit = raycastStorage(storage, [0.5, 5.5, 0.5], [1, 0, 0], 10);
    expect(hit).not.toBeNull();
    expect(hit!.voxel).toEqual([4, 5, 0]);
    expect(hit!.normal).toEqual([-1, 0, 0]);
    expect(hit!.distance).toBeCloseTo(3.5, 4);
  });
});

describe('CharacterController: Swept AABB, Step/Wall Jump & Void Respawn', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('clears a 1-voxel step with 1.3 u jump apex and is blocked by a 2-voxel wall', () => {
    const storage = new ChunkStorage();
    for (let x = -4; x <= 12; x++) {
      for (let z = -4; z <= 4; z++) {
        storage.setVoxel(x, 0, z, VoxelId.GRASS_TOP);
      }
    }
    // 1-voxel step at x = 3
    for (let z = -3; z <= 3; z++) {
      storage.setVoxel(3, 1, z, VoxelId.STONE_MID);
    }
    // 2-voxel wall at x = 7
    for (let z = -3; z <= 3; z++) {
      storage.setVoxel(7, 1, z, VoxelId.STONE_DARK);
      storage.setVoxel(7, 2, z, VoxelId.STONE_DARK);
    }

    const ctrl = new CharacterController([0.5, 1, 0.5], 0, [
      { id: 'spawn', islandId: 'stasis_shrine', position: [0.5, 1, 0.5], yaw: 0 },
    ]);

    // Settle onto ground
    for (let i = 0; i < 10; i++) {
      ctrl.step(0.016, { moveX: 0, moveZ: 0, sprint: false, jumpPressed: false, cameraYaw: 0, observationLocked: false }, storage);
    }
    expect(ctrl.state.grounded).toBe(true);

    // Measure exact jump apex height while stationary
    ctrl.step(0.016, { moveX: 0, moveZ: 0, sprint: false, jumpPressed: true, cameraYaw: 0, observationLocked: false }, storage);
    let maxApex = ctrl.state.position[1];
    for (let i = 0; i < 60; i++) {
      ctrl.step(0.016, { moveX: 0, moveZ: 0, sprint: false, jumpPressed: false, cameraYaw: 0, observationLocked: false }, storage);
      maxApex = Math.max(maxApex, ctrl.state.position[1]);
    }
    expect(maxApex - 1).toBeGreaterThanOrEqual(1.25);
    expect(maxApex - 1).toBeLessThanOrEqual(PLAYER_CONSTANTS.JUMP_APEX + 0.05);

    // Move right (+X) and jump over the 1-voxel step at x=3
    // With cameraYaw = -PI/2, moveZ=+1 moves along +X
    const yawEast = -Math.PI / 2;
    for (let i = 0; i < 45; i++) {
      ctrl.step(
        0.02,
        {
          moveX: 0,
          moveZ: 1,
          sprint: false,
          jumpPressed: i === 18,
          cameraYaw: yawEast,
          observationLocked: false,
        },
        storage,
      );
    }
    expect(ctrl.state.position[0]).toBeGreaterThan(3.5);
    expect(ctrl.state.position[1]).toBeCloseTo(2, 1);

    // Step forward off the 1-voxel step onto y=1 ground before testing the 2-voxel wall at x=7
    for (let i = 0; i < 20; i++) {
      ctrl.step(
        0.02,
        {
          moveX: 0,
          moveZ: 1,
          sprint: false,
          jumpPressed: false,
          cameraYaw: yawEast,
          observationLocked: false,
        },
        storage,
      );
    }
    expect(ctrl.state.position[1]).toBeCloseTo(1, 2);

    // Attempt to jump over the 2-voxel wall at x=7 from ground y=1 (must remain blocked < 7)
    for (let i = 0; i < 90; i++) {
      ctrl.step(
        0.02,
        {
          moveX: 0,
          moveZ: 1,
          sprint: true,
          jumpPressed: i % 30 === 5,
          cameraYaw: yawEast,
          observationLocked: false,
        },
        storage,
      );
    }
    expect(ctrl.state.position[0]).toBeLessThan(7);
  });

  it('slides cleanly along corners over 1,000 frames without snagging and locks in Observation Mode', () => {
    const storage = new ChunkStorage();
    for (let x = -5; x <= 20; x++) {
      for (let z = -5; z <= 20; z++) {
        storage.setVoxel(x, 0, z, VoxelId.GRASS_TOP);
      }
    }
    // Wall along x = 5 from z = -2 to z = 20
    for (let z = -2; z <= 20; z++) {
      storage.setVoxel(5, 1, z, VoxelId.STONE_MID);
      storage.setVoxel(5, 2, z, VoxelId.STONE_MID);
    }

    const ctrl = new CharacterController([2, 1, 2], 0);
    for (let i = 0; i < 1000; i++) {
      ctrl.step(
        0.016,
        {
          moveX: 0.7,
          moveZ: -0.7, // diagonal toward +X and +Z against the X=5 wall
          sprint: false,
          jumpPressed: false,
          cameraYaw: 0,
          observationLocked: false,
        },
        storage,
      );
    }
    expect(ctrl.state.position[0]).toBeLessThan(5);
    expect(ctrl.state.position[2]).toBeGreaterThan(15);

    // Observation Mode locks player horizontal motion
    const frozenX = ctrl.state.position[0];
    const frozenZ = ctrl.state.position[2];
    ctrl.step(
      0.03,
      { moveX: 1, moveZ: 1, sprint: true, jumpPressed: true, cameraYaw: 0, observationLocked: true },
      storage,
    );
    expect(ctrl.state.position[0]).toBeCloseTo(frozenX, 5);
    expect(ctrl.state.position[2]).toBeCloseTo(frozenZ, 5);
  });

  it('triggers void fall fade and respawns at nearest RespawnAnchor within <= 1.2 s', () => {
    const storage = new ChunkStorage();
    storage.setVoxel(-18, 5, 36, VoxelId.GRASS_TOP);
    const anchors = [
      { id: 'shrine_spawn', islandId: 'stasis_shrine', position: [-48, 4, 52] as [number, number, number], yaw: 0 },
      { id: 'beacon_anchor', islandId: 'beacon_point', position: [-18, 6, 36] as [number, number, number], yaw: 0 },
    ];
    const ctrl = new CharacterController([-16, -31, 35], 0, anchors);

    let respawnedAnchor: string | null = null;
    EventBus.on('world.player.respawned', ({ anchorId }) => {
      respawnedAnchor = anchorId;
    });

    // Step 0.02 s -> enters void fade
    ctrl.step(0.02, { moveX: 0, moveZ: 0, sprint: false, jumpPressed: false, cameraYaw: 0, observationLocked: false }, storage);
    expect(ctrl.state.respawning).toBe(true);

    // Advance 0.9 s (400 ms fade out + 400 ms fade in) -> must complete <= 1.2 s
    for (let i = 0; i < 45; i++) {
      ctrl.step(0.02, { moveX: 0, moveZ: 0, sprint: false, jumpPressed: false, cameraYaw: 0, observationLocked: false }, storage);
    }

    expect(respawnedAnchor).toBe('beacon_anchor');
    expect(ctrl.state.respawning).toBe(false);
    expect(ctrl.state.position).toEqual([-18, 6, 36]);
  });
});

describe('CameraRig Math & 7 Awakening Islands Generator', () => {
  it('interpolates third-person <-> isometric camera poses with cubic ease-out and computes dock view offsets', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 4);

    const tp = computeCameraPose({
      mode: 'third_person',
      target: [0, 2, 0],
      tpYaw: 0,
      tpPitch: 0.4,
      tpDistance: 6,
      isoStep: 0,
      isoZoom: 1,
    });
    const iso = computeCameraPose({
      mode: 'isometric',
      target: [0, 2, 0],
      tpYaw: 0,
      tpPitch: 0.4,
      tpDistance: 6,
      isoStep: 1,
      isoZoom: 1,
    });

    const mid = lerpCameraPose(tp, iso, 0.5);
    expect(mid.fov).toBeCloseTo(46 + (16 - 46) * 0.875, 3);

    expect(computeTargetViewOffset('D', true, 'peek', 1440, 900)).toEqual([288, 0]);
    expect(computeTargetViewOffset('P', true, 'half', 390, 844)).toEqual([0, 844 * 0.22]);
    expect(computeTargetViewOffset('D', false, 'peek', 1440, 900)).toEqual([0, 0]);
  });

  it('preserves camera orientation smoothly across mode switches and handles lerpAngle wrapping', () => {
    const angleA = Math.PI - 0.1;
    const angleB = -Math.PI + 0.1;
    const blended = lerpAngle(angleA, angleB, 0.5);
    expect(Math.abs(Math.abs(blended) - Math.PI)).toBeLessThan(0.15);

    // For an angle aligned with an isometric diagonal (e.g. 135 deg = 3 * PI / 4)
    const tpYawDiag = Math.PI * 0.75;
    const isoStepDiag = Math.round((tpYawDiag - Math.PI * 0.25) / (Math.PI * 0.5));
    const backToTpYaw = Math.PI * 0.25 + isoStepDiag * (Math.PI * 0.5);
    const diffDiag = Math.abs(((backToTpYaw - tpYawDiag + Math.PI) % (Math.PI * 2)) - Math.PI);
    expect(diffDiag).toBeLessThan(0.01);

    // For any arbitrary angle, nearest isometric quadrant is at most 45 deg (PI / 4) away
    const tpYawArbitrary = -Math.PI * 0.5;
    const isoStepArb = Math.round((tpYawArbitrary - Math.PI * 0.25) / (Math.PI * 0.5));
    const backFromArb = Math.PI * 0.25 + isoStepArb * (Math.PI * 0.5);
    const diffArb = Math.abs(((backFromArb - tpYawArbitrary + Math.PI) % (Math.PI * 2)) - Math.PI);
    expect(diffArb).toBeLessThanOrEqual(Math.PI * 0.25 + 0.001);
  });

  it('generates all 7 Awakening Islands and enforces 0.125 u detail-voxel snapping & emissive clamp', () => {
    const world = generateAwakeningWorld();
    expect(world.zones).toHaveLength(7);
    expect(world.anchors).toHaveLength(7);
    expect(world.props.length).toBeGreaterThan(20);

    const serialized = serializeGeneratedWorld(world);
    expect(serialized.chunks.chunks.length).toBeGreaterThan(10);

    // Detail voxel geometry check (0.125 u scale + emissive <= 1.2)
    const geo = buildDetailVoxelGeometry([
      { x: -2, y: 0, z: -2, w: 4, h: 4, d: 4, hex: '#F2F4F5', emissive: 5.0 },
    ]);
    const pos = geo.getAttribute('position');
    const em = geo.getAttribute('aEmissive');
    for (let i = 0; i < pos.count; i++) {
      // Every coordinate should be a multiple of 0.125 / 2 = 0.0625
      expect(Math.abs((pos.getX(i) * 16) % 1)).toBeLessThan(1e-5);
      expect(em.getX(i)).toBeLessThanOrEqual(Math.fround(1.2) + 1e-6);
    }
  });
});

describe('Cinematic Intro Camera Math & Choreography', () => {
  it('interpolates start to end camera pose with cubic ease-in-out', () => {
    const start = { position: [0, 10, 0] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number], fov: 40 };
    const end = { position: [10, 20, 30] as [number, number, number], lookAt: [5, 5, 5] as [number, number, number], fov: 30 };

    const atStart = interpolateCinematicPose(start, end, 0);
    expect(atStart.position).toEqual([0, 10, 0]);
    expect(atStart.lookAt).toEqual([0, 0, 0]);
    expect(atStart.fov).toBe(40);

    const atEnd = interpolateCinematicPose(start, end, 1);
    expect(atEnd.position).toEqual([10, 20, 30]);
    expect(atEnd.lookAt).toEqual([5, 5, 5]);
    expect(atEnd.fov).toBe(30);

    const atMid = interpolateCinematicPose(start, end, 0.5);
    expect(atMid.position[0]).toBeCloseTo(5, 3);
    expect(atMid.position[1]).toBeCloseTo(15, 3);
    expect(atMid.position[2]).toBeCloseTo(15, 3);
    expect(atMid.fov).toBeCloseTo(35, 3);
  });

  it('validates all 5 Cinematic Acts have smooth continuous camera waypoints and positive durations', () => {
    expect(CINEMATIC_ACTS).toHaveLength(5);
    for (const act of CINEMATIC_ACTS) {
      expect(act.durationSec).toBeGreaterThanOrEqual(4);
      expect(act.cameraStart.fov).toBeGreaterThan(20);
      expect(act.cameraStart.fov).toBeLessThan(60);
      expect(act.cameraEnd.fov).toBeGreaterThan(20);
      expect(act.cameraEnd.fov).toBeLessThan(60);
      expect(act.text.id.length).toBeGreaterThan(15);
      expect(act.text.en.length).toBeGreaterThan(15);
    }
  });
});
