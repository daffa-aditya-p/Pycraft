import type { ChunkStorage } from './ChunkStorage';
import { PALETTE_TABLES, VoxelId } from './palette';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface VoxelRaycastHit {
  voxel: [number, number, number];
  normal: [number, number, number];
  point: [number, number, number];
  distance: number;
  voxelId: number;
}

/**
 * 3D DDA (Amanatides & Woo) voxel raycaster.
 * Used for collision-aware camera clamping and world voxel picking.
 */
export function raycastVoxels(
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
  sampleVoxel: (wx: number, wy: number, wz: number) => number,
  isBlocking: (voxelId: number) => boolean = (id) => id !== VoxelId.AIR,
): VoxelRaycastHit | null {
  const lenSq = direction[0] * direction[0] + direction[1] * direction[1] + direction[2] * direction[2];
  if (lenSq < 1e-12) return null;
  const invLen = 1 / Math.sqrt(lenSq);
  const dx = direction[0] * invLen;
  const dy = direction[1] * invLen;
  const dz = direction[2] * invLen;

  let vx = Math.floor(origin[0]);
  let vy = Math.floor(origin[1]);
  let vz = Math.floor(origin[2]);

  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Infinity;

  let tMaxX =
    stepX > 0
      ? (vx + 1 - origin[0]) * tDeltaX
      : stepX < 0
        ? (origin[0] - vx) * tDeltaX
        : Infinity;
  let tMaxY =
    stepY > 0
      ? (vy + 1 - origin[1]) * tDeltaY
      : stepY < 0
        ? (origin[1] - vy) * tDeltaY
        : Infinity;
  let tMaxZ =
    stepZ > 0
      ? (vz + 1 - origin[2]) * tDeltaZ
      : stepZ < 0
        ? (origin[2] - vz) * tDeltaZ
        : Infinity;

  let dist = 0;
  let nx = 0;
  let ny = 0;
  let nz = 0;

  // Check starting voxel
  const startId = sampleVoxel(vx, vy, vz);
  if (isBlocking(startId)) {
    return {
      voxel: [vx, vy, vz],
      normal: [0, 1, 0],
      point: [origin[0], origin[1], origin[2]],
      distance: 0,
      voxelId: startId,
    };
  }

  const maxSteps = Math.ceil(maxDistance * 3) + 4;
  for (let i = 0; i < maxSteps; i++) {
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        dist = tMaxX;
        if (dist > maxDistance) break;
        vx += stepX;
        tMaxX += tDeltaX;
        nx = -stepX;
        ny = 0;
        nz = 0;
      } else {
        dist = tMaxZ;
        if (dist > maxDistance) break;
        vz += stepZ;
        tMaxZ += tDeltaZ;
        nx = 0;
        ny = 0;
        nz = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        dist = tMaxY;
        if (dist > maxDistance) break;
        vy += stepY;
        tMaxY += tDeltaY;
        nx = 0;
        ny = -stepY;
        nz = 0;
      } else {
        dist = tMaxZ;
        if (dist > maxDistance) break;
        vz += stepZ;
        tMaxZ += tDeltaZ;
        nx = 0;
        ny = 0;
        nz = -stepZ;
      }
    }

    const vid = sampleVoxel(vx, vy, vz);
    if (isBlocking(vid)) {
      return {
        voxel: [vx, vy, vz],
        normal: [nx, ny, nz],
        point: [origin[0] + dx * dist, origin[1] + dy * dist, origin[2] + dz * dist],
        distance: dist,
        voxelId: vid,
      };
    }
  }

  return null;
}

export function raycastStorage(
  storage: ChunkStorage,
  origin: [number, number, number],
  direction: [number, number, number],
  maxDistance: number,
  includeWater = false,
): VoxelRaycastHit | null {
  return raycastVoxels(
    origin,
    direction,
    maxDistance,
    (x, y, z) => storage.getVoxel(x, y, z),
    (id) => (includeWater ? id !== VoxelId.AIR : PALETTE_TABLES.solid[id] === 1),
  );
}
