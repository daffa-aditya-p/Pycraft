import { ChunkStorage, type SerializedWorldData } from './ChunkStorage';
import { VoxelId } from './palette';
import type { RespawnAnchor } from '../controller/CharacterController';

export interface PropPlacement {
  type:
    | 'pine_small'
    | 'pine_tall'
    | 'oak'
    | 'shrub'
    | 'rock'
    | 'crystal'
    | 'crate'
    | 'crop_wheat'
    | 'lore_note'
    | 'cloud';
  position: [number, number, number];
  rotationY: number;
  scale: number;
  zoneId: string;
  itemId?: string;
}

export interface IslandZoneSpec {
  id: string;
  name: string;
  center: [number, number, number];
  radius: number;
  spawnAnchor: RespawnAnchor;
  puzzleZoneCenter?: [number, number, number];
  puzzleZoneRadius?: number;
}

export interface InteractablePlacement {
  id: string;
  kind: 'npc' | 'device' | 'item' | 'lore' | 'puzzle';
  label: string;
  position: [number, number, number];
  zoneId: string;
  missionId?: string;
}

export interface GeneratedWorld {
  storage: ChunkStorage;
  zones: IslandZoneSpec[];
  anchors: RespawnAnchor[];
  props: PropPlacement[];
  interactables: InteractablePlacement[];
  npcPositions: Record<string, [number, number, number]>;
  bitInitialPos: [number, number, number];
  playerSpawnPos: [number, number, number];
}

export const AWAKENING_ZONES: IslandZoneSpec[] = [
  {
    id: 'stasis_shrine',
    name: 'Kuil Stasis',
    center: [-48, 2, 48],
    radius: 12,
    spawnAnchor: { id: 'shrine_spawn', islandId: 'stasis_shrine', position: [-48, 4, 52], yaw: Math.PI },
  },
  {
    id: 'beacon_point',
    name: 'Tanjung Suar',
    center: [-16, 4, 32],
    radius: 14,
    spawnAnchor: { id: 'beacon_anchor', islandId: 'beacon_point', position: [-18, 6, 36], yaw: 0 },
    puzzleZoneCenter: [-15, 6, 27],
    puzzleZoneRadius: 7,
  },
  {
    id: 'supply_grove',
    name: 'Hutan Perbekalan',
    center: [16, 4, 16],
    radius: 14,
    spawnAnchor: { id: 'grove_anchor', islandId: 'supply_grove', position: [12, 6, 20], yaw: 0 },
    puzzleZoneCenter: [21, 6, 12],
    puzzleZoneRadius: 8,
  },
  {
    id: 'gatehouse_rock',
    name: 'Gerbang Batu',
    center: [48, 6, 0],
    radius: 13,
    spawnAnchor: { id: 'gate_anchor', islandId: 'gatehouse_rock', position: [44, 8, 5], yaw: 0 },
    puzzleZoneCenter: [48, 8, -2],
    puzzleZoneRadius: 7,
  },
  {
    id: 'terrace_farm',
    name: 'Ladang Terasering',
    center: [16, 10, -32],
    radius: 15,
    spawnAnchor: { id: 'farm_anchor', islandId: 'terrace_farm', position: [20, 12, -26], yaw: 0 },
    puzzleZoneCenter: [14, 12, -33],
    puzzleZoneRadius: 8,
  },
  {
    id: 'bolts_workshop',
    name: 'Bengkel BOLT',
    center: [-16, 16, -48],
    radius: 14,
    spawnAnchor: { id: 'workshop_anchor', islandId: 'bolts_workshop', position: [-14, 18, -42], yaw: 0 },
    puzzleZoneCenter: [-18, 18, -50],
    puzzleZoneRadius: 8,
  },
  {
    id: 'core_spire',
    name: 'Puncak Pecahan Inti',
    center: [-48, 22, -16],
    radius: 15,
    spawnAnchor: { id: 'spire_anchor', islandId: 'core_spire', position: [-46, 24, -10], yaw: 0 },
    puzzleZoneCenter: [-48, 24, -18],
    puzzleZoneRadius: 8,
  },
];

function hash2d(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Returns world Y surface elevation (top face of topmost non-air solid/water voxel). */
function getGroundSurfaceY(
  storage: ChunkStorage,
  wx: number,
  wz: number,
  fallbackY: number,
  minY = -15,
  maxY = 40,
): number {
  const gx = Math.floor(wx);
  const gz = Math.floor(wz);
  for (let y = maxY; y >= minY; y--) {
    const id = storage.getVoxel(gx, y, gz);
    if (id !== VoxelId.AIR && id !== VoxelId.CLOUD_WHITE) {
      return y + 1;
    }
  }
  return fallbackY;
}

/** Flattens a rectangular stone/path pad and fills solid foundation beneath. */
function pavePad(
  storage: ChunkStorage,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  surfaceVoxelY: number,
  voxelId: number,
  zoneId: string,
  clearHeight = 5,
): void {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minZ = Math.min(z0, z1);
  const maxZ = Math.max(z0, z1);
  for (let x = minX; x <= maxX; x++) {
    for (let z = minZ; z <= maxZ; z++) {
      // Clear headroom above
      for (let y = surfaceVoxelY + 1; y <= surfaceVoxelY + clearHeight; y++) {
        storage.setVoxel(x, y, z, VoxelId.AIR, zoneId);
      }
      storage.setVoxel(x, surfaceVoxelY, z, voxelId, zoneId);
      storage.setVoxel(x, surfaceVoxelY - 1, z, VoxelId.SOIL_WARM, zoneId);
      storage.setVoxel(x, surfaceVoxelY - 2, z, VoxelId.STONE_MID, zoneId);
      storage.setVoxel(x, surfaceVoxelY - 3, z, VoxelId.STONE_DARK, zoneId);
    }
  }
}

/** Carves a smooth, continuous stepped pathway between two points. */
function carveSmoothPath(
  storage: ChunkStorage,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  width: number,
  zoneId: string,
  pathVoxel: number = VoxelId.PATH_STONE,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const steps = Math.max(Math.abs(dx), Math.abs(dz), 1) * 2;
  const perpX = Math.abs(dz) >= Math.abs(dx) ? 1 : 0;
  const perpZ = perpX === 1 ? 0 : 1;
  const halfW = Math.floor(width / 2);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = Math.round(x0 + dx * t);
    const by = Math.round(y0 + dy * t);
    const bz = Math.round(z0 + dz * t);

    for (let w = -halfW; w <= halfW; w++) {
      const px = bx + perpX * w;
      const pz = bz + perpZ * w;
      // Clear headroom
      for (let h = 1; h <= 4; h++) {
        storage.setVoxel(px, by + h, pz, VoxelId.AIR, zoneId);
      }
      storage.setVoxel(px, by, pz, pathVoxel, zoneId);
      storage.setVoxel(px, by - 1, pz, VoxelId.SOIL_WARM, zoneId);
      storage.setVoxel(px, by - 2, pz, VoxelId.STONE_MID, zoneId);
      storage.setVoxel(px, by - 3, pz, VoxelId.STONE_DARK, zoneId);
    }
  }
}

export interface StalactiteNeedle {
  ox: number;
  oz: number;
  depth: number;
}

/**
 * Generates an art-directed floating island foundation with deep stratified underbelly:
 * - Vibrant grass cap (GRASS_TOP / GRASS_LIGHT, with GRASS_LIP edges)
 * - Terracotta soil stratum (SOIL_WARM and SOIL_DARK)
 * - Stratified rock layers (STONE_LIGHT, STONE_MID, STONE_DARK, STONE_BASE)
 * - Stalactite taper with secondary hanging stalactite needle spires
 * - Naturally embedded crystal & core veins in cliff fissures
 */
function carveIslandFoundation(
  storage: ChunkStorage,
  cx: number,
  topY: number,
  cz: number,
  rx: number,
  rz: number,
  seed: number,
  zoneId: string,
  options: {
    terraceStep?: boolean;
    taperMultiplier?: number;
    stalactiteNeedles?: StalactiteNeedle[];
    hasCrystalVeins?: boolean;
  } = {},
): void {
  const maxR = Math.max(rx, rz) + 3;
  const taperMul = options.taperMultiplier ?? 1.0;
  const needles = options.stalactiteNeedles ?? [];
  const hasVeins = options.hasCrystalVeins ?? true;

  for (let dx = -maxR; dx <= maxR; dx++) {
    for (let dz = -maxR; dz <= maxR; dz++) {
      const nx = dx / rx;
      const nz = dz / rz;
      const angle = Math.atan2(dz, dx);
      // Multi-frequency harmonic lobe noise for organic, majestic contours
      const lobe =
        0.11 * Math.sin(angle * 3 + seed) +
        0.06 * Math.cos(angle * 5 - seed * 1.6) +
        0.03 * Math.sin(angle * 7 + 0.9);
      const distNorm = Math.sqrt(nx * nx + nz * nz) - lobe;
      if (distNorm > 1.0) continue;

      const wx = cx + dx;
      const wz = cz + dz;
      const h = hash2d(wx, wz, seed);

      // Gentle elevated plateau terrace toward back/center
      const elevOffset =
        options.terraceStep && distNorm < 0.52 && nx + nz < 0.2 ? 1 : 0;
      const surfaceY = topY + elevOffset;

      const isEdge = distNorm > 0.82;
      const grassId = isEdge
        ? VoxelId.GRASS_LIP
        : h > 0.54
          ? VoxelId.GRASS_LIGHT
          : VoxelId.GRASS_TOP;
      storage.setVoxel(wx, surfaceY, wz, grassId, zoneId);

      // Soil stratum (2-3 voxels)
      const soilDepth = isEdge ? 2 : 3;
      for (let s = 1; s <= soilDepth; s++) {
        storage.setVoxel(
          wx,
          surfaceY - s,
          wz,
          s === 1 ? VoxelId.SOIL_WARM : VoxelId.SOIL_DARK,
          zoneId,
        );
      }

      // Deep tapering stalactite underbelly
      const taperBase = Math.pow(Math.max(0, 1.0 - distNorm * 0.88), 1.25);
      let taperDepth = Math.round(taperBase * (12 + h * 9) * taperMul);

      // Secondary hanging stalactite needle spires
      for (const needle of needles) {
        const ndx = dx - needle.ox;
        const ndz = dz - needle.oz;
        const nDist = Math.sqrt(ndx * ndx + ndz * ndz);
        if (nDist < 3.2) {
          const extraDepth = Math.round(needle.depth * Math.max(0, 1 - nDist / 3.2));
          taperDepth = Math.max(taperDepth, extraDepth);
        }
      }

      // Stratified stone underbelly
      for (let d = soilDepth + 1; d <= soilDepth + taperDepth; d++) {
        let stoneId: number = VoxelId.STONE_BASE;
        if (d <= soilDepth + 3) {
          stoneId = VoxelId.STONE_LIGHT;
        } else if (d <= soilDepth + 7) {
          stoneId = VoxelId.STONE_MID;
        } else if (d <= soilDepth + 13) {
          stoneId = VoxelId.STONE_DARK;
        }

        // Luminous crystal / core mineral veins in deep fractures
        if (hasVeins && d > soilDepth + 2) {
          const veinWave = Math.sin(wx * 0.45 + wz * 0.35 + d * 0.6) * Math.cos(wx * 0.2 - wz * 0.4 + d * 0.3);
          if (Math.abs(veinWave) > 0.86 && (wx + wz + d) % 5 === 0) {
            stoneId = (wx + d) % 2 === 0 ? VoxelId.CORE_VEIN : VoxelId.CRYSTAL_BLUE;
          }
        }

        storage.setVoxel(wx, surfaceY - d, wz, stoneId, zoneId);
      }
    }
  }
}

/** Builds an orbiting floating satellite mini-island. */
function buildSatelliteIsland(
  storage: ChunkStorage,
  cx: number,
  topY: number,
  cz: number,
  radius: number,
  seed: number,
  zoneId: string,
  crystalType?: number,
): void {
  const rInt = Math.ceil(radius);
  for (let dx = -rInt; dx <= rInt; dx++) {
    for (let dz = -rInt; dz <= rInt; dz++) {
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > radius) continue;
      const wx = cx + dx;
      const wz = cz + dz;
      const h = hash2d(wx, wz, seed);
      const isEdge = dist > radius - 0.9;
      storage.setVoxel(wx, topY, wz, isEdge ? VoxelId.GRASS_LIP : VoxelId.GRASS_TOP, zoneId);
      storage.setVoxel(wx, topY - 1, wz, VoxelId.SOIL_WARM, zoneId);
      storage.setVoxel(wx, topY - 2, wz, VoxelId.SOIL_DARK, zoneId);

      const maxDepth = Math.round((1 - dist / (radius + 0.5)) * (5 + h * 4));
      for (let d = 3; d <= 3 + maxDepth; d++) {
        storage.setVoxel(
          wx,
          topY - d,
          wz,
          d <= 4 ? VoxelId.STONE_LIGHT : d <= 6 ? VoxelId.STONE_MID : VoxelId.STONE_BASE,
          zoneId,
        );
      }
    }
  }
  // Decorative glowing crystal beacon or shrub atop satellite
  if (crystalType) {
    storage.setVoxel(cx, topY + 1, cz, crystalType, zoneId);
    storage.setVoxel(cx, topY + 2, cz, crystalType, zoneId);
  }
}

/** Builds a stepped spline bridge with under-arch support corbels and decorative railings. */
function buildSteppedBridge(
  storage: ChunkStorage,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  width: number,
  voxelId: number,
  zoneId: string,
  railVoxelId?: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const steps = Math.max(Math.abs(dx), Math.abs(dz), 1) * 2;
  const perpX = Math.abs(dz) >= Math.abs(dx) ? 1 : 0;
  const perpZ = perpX === 1 ? 0 : 1;
  const halfW = Math.floor(width / 2);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = Math.round(x0 + dx * t);
    const by = Math.round(y0 + dy * t);
    const bz = Math.round(z0 + dz * t);

    for (let w = -halfW; w <= halfW; w++) {
      const px = bx + perpX * w;
      const pz = bz + perpZ * w;
      storage.setVoxel(px, by, pz, voxelId, zoneId);
      // Under-arch reinforcement corbels
      storage.setVoxel(px, by - 1, pz, VoxelId.STONE_MID, zoneId);
    }
    if (railVoxelId && i % 3 === 0) {
      storage.setVoxel(bx + perpX * (halfW + 1), by + 1, bz + perpZ * (halfW + 1), railVoxelId, zoneId);
      storage.setVoxel(bx - perpX * (halfW + 1), by + 1, bz - perpZ * (halfW + 1), railVoxelId, zoneId);
    }
  }
}

function buildCampfire(
  storage: ChunkStorage,
  cx: number,
  cz: number,
  zoneId: string,
  surfaceY: number,
): void {
  const y = surfaceY - 1;
  const ring = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  for (const [ox, oz] of ring) {
    storage.setVoxel(cx + ox!, y + 1, cz + oz!, VoxelId.STONE_MID, zoneId);
  }
  storage.setVoxel(cx, y + 1, cz, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(cx, y + 2, cz, VoxelId.FIRE_ORANGE, zoneId);
  // Log seats nearby
  storage.setVoxel(cx - 2, y + 1, cz, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx + 2, y + 1, cz, VoxelId.WOOD_PLANK, zoneId);
}

/**
 * Island A: Neoclassical Stasis Sanctuary
 * Colonnade pillars, stone arch lintels, mosaic ceremonial floor, glowing stasis monolith.
 */
function buildStasisSanctuary(
  storage: ChunkStorage,
  cx: number,
  y: number, // ground surface level = 3
  cz: number,
  zoneId: string,
): void {
  // Paved Grand Mosaic Sanctuary Floor
  pavePad(storage, cx - 7, cx + 7, cz - 6, cz + 6, y, VoxelId.PATH_STONE, zoneId);

  // Geometric ceramic mosaic inlay centered around neo_pedestal [-48, 48]
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      const isCross = dx === 0 || dz === 0;
      const isRing = Math.abs(dx) + Math.abs(dz) === 3 || (Math.abs(dx) === 3 && Math.abs(dz) === 3);
      if (isCross || isRing) {
        storage.setVoxel(cx + dx, y, cz + dz, VoxelId.CERAMIC_WHITE, zoneId);
      } else if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
        storage.setVoxel(cx + dx, y, cz + dz, VoxelId.STONE_LIGHT, zoneId);
      }
    }
  }

  // Neoclassical Colonnade Pillars & Stone Arch Lintels
  // Column positions flanking the sanctuary
  const colCoords: [number, number][] = [
    [cx - 5, cz - 3], [cx - 5, cz], [cx - 5, cz + 3],
    [cx + 5, cz - 3], [cx + 5, cz], [cx + 5, cz + 3],
    [cx - 3, cz - 5], [cx, cz - 5], [cx + 3, cz - 5],
  ];

  for (const [colX, colZ] of colCoords) {
    // Column plinth
    storage.setVoxel(colX, y + 1, colZ, VoxelId.STONE_MID, zoneId);
    // Fluted shaft (y+2..y+5)
    for (let h = 2; h <= 5; h++) {
      storage.setVoxel(colX, y + h, colZ, VoxelId.CERAMIC_WHITE, zoneId);
    }
    // Classical capital
    storage.setVoxel(colX, y + 6, colZ, VoxelId.STONE_LIGHT, zoneId);
  }

  // Overhead Stone Arch Lintels connecting colonnade at y+6
  for (let z = cz - 5; z <= cz + 4; z++) {
    storage.setVoxel(cx - 5, y + 6, z, VoxelId.STONE_LIGHT, zoneId);
    storage.setVoxel(cx + 5, y + 6, z, VoxelId.STONE_LIGHT, zoneId);
  }
  for (let x = cx - 5; x <= cx + 5; x++) {
    storage.setVoxel(x, y + 6, cz - 5, VoxelId.STONE_LIGHT, zoneId);
  }

  // Stasis Monolith Altar behind NEO Pedestal (x=cx, z=cz-3)
  for (let dx = -1; dx <= 1; dx++) {
    storage.setVoxel(cx + dx, y + 1, cz - 3, VoxelId.STONE_LIGHT, zoneId);
  }
  storage.setVoxel(cx, y + 2, cz - 3, VoxelId.CORE_VEIN, zoneId);
  storage.setVoxel(cx, y + 3, cz - 3, VoxelId.CORE_VEIN, zoneId);
  storage.setVoxel(cx, y + 4, cz - 3, VoxelId.STONE_LIGHT, zoneId);

  // Ceremonial Braziers flanking altar
  storage.setVoxel(cx - 3, y + 1, cz - 3, VoxelId.BRONZE, zoneId);
  storage.setVoxel(cx - 3, y + 2, cz - 3, VoxelId.FIRE_ORANGE, zoneId);
  storage.setVoxel(cx + 3, y + 1, cz - 3, VoxelId.BRONZE, zoneId);
  storage.setVoxel(cx + 3, y + 2, cz - 3, VoxelId.FIRE_ORANGE, zoneId);

  // Pedestal dais pad at [-48, 48] (exact coordinates)
  storage.setVoxel(cx, y, cz, VoxelId.STONE_LIGHT, zoneId);
}

/**
 * Island B: Grand Coastal Citadel
 * Timber cottage, stone chimney, dual waterfalls into stone basins, garden pergola, promenade.
 */
function buildBeaconCitadel(
  storage: ChunkStorage,
  cx: number, // -16
  y: number,  // 5
  cz: number, // 32
  zoneId: string,
): void {
  // Paved grand promenade connecting arrival bridge [-27, 37] to beacon courtyard
  pavePad(storage, cx - 12, cx + 7, cz - 7, cz + 6, y, VoxelId.PATH_STONE, zoneId);

  // Grand Coastal Cottage (cx-2..cx+3, cz-5..cz-1)
  for (let x = cx - 2; x <= cx + 3; x++) {
    for (let z = cz - 5; z <= cz - 1; z++) {
      storage.setVoxel(x, y, z, VoxelId.STONE_LIGHT, zoneId);
      for (let h = 1; h <= 3; h++) {
        const isCorner = (x === cx - 2 || x === cx + 3) && (z === cz - 5 || z === cz - 1);
        const isWall = x === cx - 2 || x === cx + 3 || z === cz - 5 || z === cz - 1;
        if (isWall) {
          storage.setVoxel(x, y + h, z, isCorner ? VoxelId.WOOD_DARK : VoxelId.COTTAGE_WALL, zoneId);
        } else {
          storage.setVoxel(x, y + h, z, VoxelId.AIR, zoneId);
        }
      }
    }
  }

  // Pitch Slate Roof with gable eaves
  for (let x = cx - 3; x <= cx + 4; x++) {
    for (let z = cz - 6; z <= cz; z++) {
      storage.setVoxel(x, y + 4, z, VoxelId.SLATE_ROOF, zoneId);
    }
    for (let z = cz - 5; z <= cz - 1; z++) {
      storage.setVoxel(x, y + 5, z, VoxelId.SLATE_ROOF, zoneId);
    }
    for (let z = cz - 4; z <= cz - 2; z++) {
      storage.setVoxel(x, y + 6, z, VoxelId.WOOD_DARK, zoneId);
    }
  }

  // Sturdy Stone Chimney with chimney pot
  storage.setVoxel(cx - 1, y + 5, cz - 4, VoxelId.STONE_DARK, zoneId);
  storage.setVoxel(cx - 1, y + 6, cz - 4, VoxelId.STONE_MID, zoneId);
  storage.setVoxel(cx - 1, y + 7, cz - 4, VoxelId.STONE_LIGHT, zoneId);
  storage.setVoxel(cx - 1, y + 8, cz - 4, VoxelId.STONE_MID, zoneId);

  // Recessed Oak Door & Amber Porch Lantern
  storage.setVoxel(cx + 1, y + 1, cz - 1, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx + 1, y + 2, cz - 1, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 1, y + 2, cz - 1, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(cx - 1, y + 1, cz, VoxelId.FOLIAGE_BLOSSOM, zoneId);

  // Double Cascading Waterfalls & Stone Basins
  // Upper turquoise reservoir pond
  for (let x = cx + 2; x <= cx + 6; x++) {
    for (let z = cz + 2; z <= cz + 6; z++) {
      const isBasinBorder = x === cx + 2 || x === cx + 6 || z === cz + 2;
      if (isBasinBorder) {
        storage.setVoxel(x, y, z, VoxelId.STONE_MID, zoneId);
      } else {
        storage.setVoxel(x, y - 1, z, VoxelId.STONE_DARK, zoneId);
        storage.setVoxel(x, y, z, VoxelId.WATER_DEEP, zoneId);
      }
    }
  }

  // Wooden dock projecting into basin
  storage.setVoxel(cx + 1, y + 1, cz + 3, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx + 1, y + 1, cz + 4, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx + 2, y + 1, cz + 4, VoxelId.WOOD_PLANK, zoneId);

  // Waterfall 1: Right channel cascade down cliff
  for (let drop = 0; drop <= 7; drop++) {
    const col = drop === 7 ? VoxelId.WATER_FOAM : drop % 2 === 0 ? VoxelId.WATER_CASCADE : VoxelId.WATER_SHALLOW;
    storage.setVoxel(cx + 4, y - drop, cz + 7, col, zoneId);
    storage.setVoxel(cx + 5, y - drop, cz + 7, col, zoneId);
  }
  // Waterfall 2: Left channel cascade into plunge basin
  for (let drop = 0; drop <= 6; drop++) {
    const col = drop === 6 ? VoxelId.WATER_FOAM : VoxelId.WATER_CASCADE;
    storage.setVoxel(cx + 6, y - drop, cz + 4, col, zoneId);
    storage.setVoxel(cx + 6, y - drop, cz + 5, col, zoneId);
  }

  // Garden Pergola overlooking the sea of clouds (cx-7..cx-4, cz-6..cz-3)
  for (const [px, pz] of [[cx - 7, cz - 6], [cx - 4, cz - 6], [cx - 7, cz - 3], [cx - 4, cz - 3]]) {
    storage.setVoxel(px!, y + 1, pz!, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(px!, y + 2, pz!, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(px!, y + 3, pz!, VoxelId.WOOD_DARK, zoneId);
  }
  // Trellis crossbeams & climbing foliage vines
  for (let x = cx - 7; x <= cx - 4; x++) {
    for (let z = cz - 6; z <= cz - 3; z++) {
      if (x === cx - 7 || x === cx - 4 || z === cz - 6 || z === cz - 3) {
        storage.setVoxel(x, y + 4, z, VoxelId.WOOD_PLANK, zoneId);
        storage.setVoxel(x, y + 5, z, (x + z) % 2 === 0 ? VoxelId.FOLIAGE_BLOSSOM : VoxelId.FOLIAGE_LIGHT, zoneId);
      }
    }
  }

  // Solid stone dais pad for Beacon Terminal [-12, 30] & Menara Suar [-9.5, 28.5]
  pavePad(storage, cx + 3, cx + 7, cz - 4, cz + 1, y, VoxelId.STONE_LIGHT, zoneId);
}

/**
 * Island C: Supply Grove & Colossal Ancient Tree
 * Colossal ancient tree with multi-tiered canopy, expedition camp, campfire hearth, supply depot, crystal plinths.
 */
function buildSupplyGroveAndTree(
  storage: ChunkStorage,
  cx: number, // 16
  y: number,  // 4
  cz: number, // 16
  zoneId: string,
): void {
  // Broad continuous stone pathway connecting entry bridge [5, 21] through grove to exit bridge [26, 11]
  pavePad(storage, 4, 27, 10, 24, y, VoxelId.PATH_STONE, zoneId);

  // Colossal Ancient World Tree (centered at cx, cz-1 -> [16, 15])
  const tx = cx;
  const tz = cz - 1;

  // Massive Gnarled Buttress Roots
  const rootOffsets = [
    [-2, 0], [2, 0], [0, -2], [0, 2],
    [-2, -2], [2, -2], [-2, 2], [2, 2],
  ];
  for (const [rox, roz] of rootOffsets) {
    storage.setVoxel(tx + rox!, y + 1, tz + roz!, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(tx + rox!, y, tz + roz!, VoxelId.WOOD_TRUNK, zoneId);
  }

  // Soaring Gnarled Trunk (y+1 .. y+14) with hollow archway at base
  for (let h = 1; h <= 14; h++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        // Hollow walking archway at ground level (h=1..2 on north-south axis)
        const isArch = h <= 2 && dx === 0;
        if (!isArch) {
          storage.setVoxel(tx + dx, y + h, tz + dz, VoxelId.WOOD_TRUNK, zoneId);
        }
      }
    }
  }

  // Spreading Multi-Tiered Boughs & Leaf Canopy
  // Tier 1 boughs at y+9
  for (let r = 2; r <= 4; r++) {
    storage.setVoxel(tx + r, y + 9, tz, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(tx - r, y + 9, tz, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(tx, y + 9, tz + r, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(tx, y + 9, tz - r, VoxelId.WOOD_DARK, zoneId);
  }

  // Tier 1 dense leaf canopy (y+10..y+12, radius 5)
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= 5.2 && d >= 1.5) {
        storage.setVoxel(tx + dx, y + 10, tz + dz, VoxelId.FOLIAGE_DEEP, zoneId);
        storage.setVoxel(tx + dx, y + 11, tz + dz, VoxelId.FOLIAGE_MID, zoneId);
        if (d <= 4.0) {
          storage.setVoxel(tx + dx, y + 12, tz + dz, VoxelId.FOLIAGE_LIGHT, zoneId);
        }
      }
    }
  }

  // Tier 2 high crown canopy (y+13..y+16, radius 3.5)
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= 3.8) {
        storage.setVoxel(tx + dx, y + 13, tz + dz, VoxelId.FOLIAGE_MID, zoneId);
        storage.setVoxel(tx + dx, y + 14, tz + dz, VoxelId.FOLIAGE_LIGHT, zoneId);
        storage.setVoxel(tx + dx, y + 15, tz + dz, VoxelId.FOLIAGE_BLOSSOM, zoneId);
      }
    }
  }
  storage.setVoxel(tx, y + 16, tz, VoxelId.FOLIAGE_BLOSSOM, zoneId);

  // Expedition Camp & Supply Depot (around [14, 19] to [22, 16])
  // Campfire hearth with stone seating
  buildCampfire(storage, 14, 19, zoneId, y + 1);

  // Supply Depot Boardwalks & Teal Cloth Shelter
  for (let x = 20; x <= 23; x++) {
    for (let z = 14; z <= 17; z++) {
      storage.setVoxel(x, y + 1, z, VoxelId.WOOD_PLANK, zoneId);
    }
  }
  // Tent posts & teal canvas tarp
  storage.setVoxel(20, y + 2, 14, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(23, y + 2, 14, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(20, y + 2, 17, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(23, y + 2, 17, VoxelId.WOOD_DARK, zoneId);
  for (let x = 20; x <= 23; x++) {
    for (let z = 14; z <= 17; z++) {
      storage.setVoxel(x, y + 3, z, VoxelId.CLOTH_TEAL, zoneId);
    }
  }

  // Dedicated Carved Stone Crystal Plinths (exact coordinates):
  // Crystal 1: [11, 22], Crystal 2: [19, 9], Crystal 3: [24, 18]
  for (const [px, pz] of [[11, 22], [19, 9], [24, 18]]) {
    storage.setVoxel(px!, y, pz!, VoxelId.STONE_MID, zoneId);
    storage.setVoxel(px!, y + 1, pz!, VoxelId.STONE_LIGHT, zoneId);
  }
}

/**
 * Island D: Fortified Fortress Gatehouse
 * Twin barbicans, crenellated battlements, glowing runic arch, stone parapets with braziers.
 */
function buildFortressGatehouse(
  storage: ChunkStorage,
  _cx: number, // 48
  y: number,  // 7 (surface elevation 8)
  _cz: number, // 0
  zoneId: string,
): void {
  // Broad continuous stone plaza linking arrival bridge [37, 7, 4], Old Tamo, Gate Console, departure [41, 7, -9]
  pavePad(storage, 36, 50, -10, 8, y, VoxelId.PATH_STONE, zoneId);

  // Twin Barbican Defense Towers:
  // North Barbican: x=47..50, z=3..6 (y+1 .. y+9)
  // South Barbican: x=47..50, z=-6..-3 (y+1 .. y+9)
  const towers: Array<[number, number, number, number]> = [
    [47, 50, 3, 6],
    [47, 50, -6, -3],
  ];

  for (const [x0, x1, z0, z1] of towers) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        for (let h = 1; h <= 8; h++) {
          const isQuoin = (x === x0 || x === x1) && (z === z0 || z === z1);
          storage.setVoxel(
            x,
            y + h,
            z,
            isQuoin ? VoxelId.STONE_LIGHT : VoxelId.STONE_DARK,
            zoneId,
          );
        }
        // Crenellated Battlements at tower top (y+9)
        const isCrenel = (x + z) % 2 === 0;
        storage.setVoxel(
          x,
          y + 9,
          z,
          isCrenel ? VoxelId.STONE_MID : VoxelId.STONE_LIGHT,
          zoneId,
        );
      }
    }
  }

  // Stone Braziers with blazing fire on tower battlements
  storage.setVoxel(48, y + 10, 4, VoxelId.BRONZE, zoneId);
  storage.setVoxel(48, y + 11, 4, VoxelId.FIRE_ORANGE, zoneId);
  storage.setVoxel(48, y + 10, -5, VoxelId.BRONZE, zoneId);
  storage.setVoxel(48, y + 11, -5, VoxelId.FIRE_ORANGE, zoneId);

  // Glowing Runic Arch spanning between barbicans over gate threshold (z=-2..2)
  for (let z = -2; z <= 2; z++) {
    storage.setVoxel(48, y + 6, z, VoxelId.STONE_MID, zoneId);
    storage.setVoxel(48, y + 7, z, Math.abs(z) === 0 ? VoxelId.CORE_VEIN : VoxelId.CRYSTAL_BLUE, zoneId);
    storage.setVoxel(48, y + 8, z, VoxelId.STONE_LIGHT, zoneId);
  }

  // Portcullis ironwood gate frame
  for (let h = 1; h <= 5; h++) {
    storage.setVoxel(48, y + h, -2, VoxelId.WOOD_DARK, zoneId);
    storage.setVoxel(48, y + h, 2, VoxelId.WOOD_DARK, zoneId);
  }

  // 3 Carved Rune Plinth pedestals (exact coordinates: [44, -3], [44, 0], [44, 3])
  for (const z of [-3, 0, 3]) {
    storage.setVoxel(44, y, z, VoxelId.STONE_MID, zoneId);
    storage.setVoxel(44, y + 1, z, VoxelId.STONE_LIGHT, zoneId);
  }

  // Old Tamo Guard Post station at [43, 8, 5]
  storage.setVoxel(43, y, 5, VoxelId.STONE_LIGHT, zoneId);
  storage.setVoxel(42, y + 1, 6, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(42, y + 2, 6, VoxelId.LAMP_AMBER, zoneId);

  // Gate Console station at [46, 8, -2]
  storage.setVoxel(46, y, -2, VoxelId.STONE_LIGHT, zoneId);
  storage.setVoxel(46, y, -1, VoxelId.STONE_MID, zoneId);
}

/**
 * Island E: Stepped Tiered Agricultural Paradise
 * Stone retaining walls, cascading water sluices feeding irrigation channels, rustic miller farmhouse with clay roof.
 */
function buildAgriculturalTerraces(
  storage: ChunkStorage,
  _cx: number, // 16
  y: number,  // 10 (base elevation)
  _cz: number, // -32
  zoneId: string,
): void {
  // Stepped Terrace 1 (Lower, y=10) & Terrace 2 (Middle, y=11)
  pavePad(storage, 5, 27, -40, -21, y + 1, VoxelId.GRASS_TOP, zoneId);

  // Continuous stone pathways linking arrival bridge [27, -22], Mira [11, -26], console [11, -33], exit [5, -38]
  carveSmoothPath(storage, 27, y + 1, -22, 11, y + 1, -26, 3, zoneId);
  carveSmoothPath(storage, 11, y + 1, -26, 11, y + 1, -33, 3, zoneId);
  carveSmoothPath(storage, 11, y + 1, -33, 5, y + 2, -38, 3, zoneId);

  // Stone Retaining Walls separating terrace levels
  for (let z = -38; z <= -23; z++) {
    storage.setVoxel(18, y + 1, z, VoxelId.STONE_LIGHT, zoneId);
    storage.setVoxel(18, y, z, VoxelId.STONE_MID, zoneId);
  }

  // Upper Reservoir Spring (x=20..25, z=-39..-34)
  for (let x = 20; x <= 25; x++) {
    for (let z = -39; z <= -34; z++) {
      storage.setVoxel(x, y + 1, z, VoxelId.WATER_SHALLOW, zoneId);
      storage.setVoxel(x, y, z, VoxelId.STONE_MID, zoneId);
    }
  }

  // Cascading Water Sluices feeding irrigation channels
  for (let drop = 0; drop <= 6; drop++) {
    const col = drop === 6 ? VoxelId.WATER_FOAM : VoxelId.WATER_CASCADE;
    storage.setVoxel(24, y + 1 - drop, -33, col, zoneId);
    storage.setVoxel(25, y + 1 - drop, -33, col, zoneId);
  }

  // Irrigation Canal running between tilled farm rows
  for (let x = 12; x <= 17; x++) {
    storage.setVoxel(x, y + 1, -31, VoxelId.WATER_SHALLOW, zoneId);
    storage.setVoxel(x, y, -31, VoxelId.STONE_MID, zoneId);
  }

  // Tilled farm rows
  for (let row = 0; row < 3; row++) {
    const zRow = -36 + row * 2;
    for (let col = 0; col < 5; col++) {
      storage.setVoxel(12 + col, y + 1, zRow, VoxelId.SOIL_TILLED, zoneId);
    }
  }

  // Rustic Miller Farmhouse (x=6..10, z=-29..-25)
  // Ensure Mira at [11, 12, -26] is completely clear of any roof overhang!
  for (let x = 6; x <= 10; x++) {
    for (let z = -29; z <= -25; z++) {
      storage.setVoxel(x, y + 1, z, VoxelId.STONE_LIGHT, zoneId);
      for (let h = 2; h <= 4; h++) {
        const isCorner = (x === 6 || x === 10) && (z === -29 || z === -25);
        const isWall = x === 6 || x === 10 || z === -29 || z === -25;
        if (isWall) {
          storage.setVoxel(x, y + h, z, isCorner ? VoxelId.WOOD_DARK : VoxelId.COTTAGE_WALL, zoneId);
        } else {
          storage.setVoxel(x, y + h, z, VoxelId.AIR, zoneId);
        }
      }
    }
  }

  // Pitched Terracotta Clay Tile Roof (strictly x=5..10, z=-30..-24)
  for (let x = 5; x <= 10; x++) {
    for (let z = -30; z <= -24; z++) {
      storage.setVoxel(x, y + 5, z, VoxelId.CLAY_ROOF, zoneId);
      if (x >= 6 && x <= 9 && z >= -29 && z <= -25) {
        storage.setVoxel(x, y + 6, z, VoxelId.CLAY_ROOF, zoneId);
      }
    }
  }

  // Farmhouse entrance door & lantern porch
  storage.setVoxel(10, y + 2, -27, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(10, y + 3, -27, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(10, y + 3, -26, VoxelId.LAMP_AMBER, zoneId);

  // Guarantee solid stone walkway under Mira [11, 12, -26] & Console [11, 12, -33] with clear air
  storage.setVoxel(11, y + 1, -26, VoxelId.PATH_STONE, zoneId);
  for (let h = 2; h <= 6; h++) {
    storage.setVoxel(11, y + h, -26, VoxelId.AIR, zoneId);
  }
  storage.setVoxel(11, y + 1, -33, VoxelId.STONE_LIGHT, zoneId);
}

/**
 * Island F: Magitech Industrial Workshop & Watchtower
 * Stone forge furnace, chimney, bronze gantry crane, multi-level timber scaffolding, fortified watchtower base.
 */
function buildIndustrialWorkshop(
  storage: ChunkStorage,
  cx: number, // -16
  y: number,  // 16 (surface elevation 17)
  cz: number, // -48
  zoneId: string,
): void {
  // Paved industrial workshop floor connecting arrival skybridge [-6, -44], BOLT, console, exit skybridge [-26, -40]
  pavePad(storage, cx - 11, cx + 11, cz - 6, cz + 9, y + 1, VoxelId.PATH_STONE, zoneId);

  // Continuous stone paths linking key interactive zones
  carveSmoothPath(storage, -6, y, -44, -13, y + 1, -46, 3, zoneId);
  carveSmoothPath(storage, -13, y + 1, -46, -17, y + 1, -49, 3, zoneId);
  carveSmoothPath(storage, -17, y + 1, -49, -26, y + 1, -40, 3, zoneId);

  // Stone Forge Furnace & Industrial Chimney (x=-11..-8, z=-52..-49)
  for (let x = -11; x <= -8; x++) {
    for (let z = -52; z <= -49; z++) {
      storage.setVoxel(x, y + 1, z, VoxelId.CHAR_SLATE, zoneId);
    }
  }
  // Refractory furnace walls & glowing forge hearth
  storage.setVoxel(-10, y + 2, -51, VoxelId.FIRE_ORANGE, zoneId);
  storage.setVoxel(-10, y + 2, -50, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(-11, y + 2, -51, VoxelId.STONE_DARK, zoneId);
  storage.setVoxel(-9, y + 2, -51, VoxelId.STONE_DARK, zoneId);
  storage.setVoxel(-11, y + 2, -50, VoxelId.STONE_DARK, zoneId);
  storage.setVoxel(-9, y + 2, -50, VoxelId.STONE_DARK, zoneId);

  // Tall Industrial Chimney Stack (y+3 .. y+10)
  for (let h = 3; h <= 10; h++) {
    storage.setVoxel(-10, y + h, -51, VoxelId.STONE_DARK, zoneId);
    if (h % 2 === 0) {
      storage.setVoxel(-10, y + h, -50, VoxelId.STONE_MID, zoneId);
    }
  }

  // Anvil plinth & water quench tank
  storage.setVoxel(-8, y + 2, -48, VoxelId.BRONZE, zoneId);
  storage.setVoxel(-8, y + 1, -47, VoxelId.WATER_SHALLOW, zoneId);

  // Heavy Bronze Gantry Crane
  for (let h = 1; h <= 6; h++) {
    storage.setVoxel(-9, y + 1 + h, -53, VoxelId.BRONZE, zoneId);
  }
  // Horizontal boom arm projecting over cliff edge
  for (let x = -13; x <= -9; x++) {
    storage.setVoxel(x, y + 7, -53, VoxelId.BRONZE, zoneId);
  }
  // Hanging crane cable & amber beacon
  storage.setVoxel(-13, y + 6, -53, VoxelId.LAMP_AMBER, zoneId);

  // Multi-Level Timber Scaffolding Platforms
  for (let x = -15; x <= -12; x++) {
    for (let z = -53; z <= -51; z++) {
      storage.setVoxel(x, y + 2, z, VoxelId.WOOD_PLANK, zoneId);
      storage.setVoxel(x, y + 4, z, VoxelId.WOOD_PLANK, zoneId);
    }
  }

  // Fortified Watchtower Base Bastion (x=-23..-18, z=-52..-47)
  for (let x = -23; x <= -18; x++) {
    for (let z = -52; z <= -47; z++) {
      const isWall = x === -23 || x === -18 || z === -52 || z === -47;
      if (isWall) {
        storage.setVoxel(x, y + 2, z, VoxelId.STONE_MID, zoneId);
        storage.setVoxel(x, y + 3, z, VoxelId.STONE_LIGHT, zoneId);
        if ((x + z) % 2 === 0) {
          storage.setVoxel(x, y + 4, z, VoxelId.STONE_LIGHT, zoneId);
        }
      }
    }
  }
  storage.setVoxel(-23, y + 5, -52, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(-18, y + 5, -47, VoxelId.LAMP_AMBER, zoneId);

  // Clear pads for BOLT [-13, 18, -46] and Workshop Console [-17, 18, -49]
  storage.setVoxel(-13, y + 1, -46, VoxelId.PATH_STONE, zoneId);
  storage.setVoxel(-17, y + 1, -49, VoxelId.STONE_LIGHT, zoneId);
}

/**
 * Island G: Celestial Citadel, Lighthouse & Core Shard Spire
 * Tiered crystal obelisks, grand ceremonial stairways, triumphal stone arches, lighthouse, floating satellites.
 */
function buildCelestialCitadel(
  storage: ChunkStorage,
  cx: number, // -48
  y: number,  // 22 (arrival elevation)
  cz: number, // -16
  zoneId: string,
): void {
  // Paved Lower Arrival Terrace (y=22) & Upper Sanctuary Plateau (y=23)
  pavePad(storage, cx - 11, cx + 12, cz - 11, cz + 11, y + 1, VoxelId.PATH_STONE, zoneId);

  // Grand Ceremonial Stone Stairways & Triumphal Stone Arches
  // Ceremonial paved path connecting arrival skybridge [-37, 22, -25] to altar [-51, 24, -15]
  carveSmoothPath(storage, -37, y, -25, -45, y + 1, -19, 3, zoneId);
  carveSmoothPath(storage, -45, y + 1, -19, -51, y + 1, -15, 3, zoneId);

  // Triumphal Stone Arch framing the ceremonial approach (at x=-44, z=-20..-18)
  for (let h = 1; h <= 4; h++) {
    storage.setVoxel(-44, y + 1 + h, -21, VoxelId.CERAMIC_WHITE, zoneId);
    storage.setVoxel(-44, y + 1 + h, -17, VoxelId.CERAMIC_WHITE, zoneId);
  }
  for (let z = -21; z <= -17; z++) {
    storage.setVoxel(-44, y + 6, z, VoxelId.STONE_LIGHT, zoneId);
    storage.setVoxel(-44, y + 7, z, z === -19 ? VoxelId.CORE_VEIN : VoxelId.STONE_LIGHT, zoneId);
  }

  // Tiered Crystal Obelisks surrounding Altar Sanctuary
  const obeliskPositions: [number, number][] = [
    [cx - 6, cz + 3], [cx - 6, cz - 3],
    [cx, cz + 6],     [cx, cz - 6],
  ];
  for (const [ox, oz] of obeliskPositions) {
    storage.setVoxel(ox, y + 2, oz, VoxelId.STONE_MID, zoneId);
    storage.setVoxel(ox, y + 3, oz, VoxelId.CERAMIC_WHITE, zoneId);
    storage.setVoxel(ox, y + 4, oz, VoxelId.CORE_VEIN, zoneId);
    storage.setVoxel(ox, y + 5, oz, VoxelId.CRYSTAL_BLUE, zoneId);
    storage.setVoxel(ox, y + 6, oz, VoxelId.CRYSTAL_BLUE, zoneId);
  }

  // Sacred Core Shard Altar Courtyard at [-51, 24, -15]
  const ax = -51;
  const az = -15;
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d <= 3.2) {
        const isCore = Math.abs(dx) <= 1 && Math.abs(dz) <= 1;
        storage.setVoxel(
          ax + dx,
          y + 1,
          az + dz,
          isCore ? VoxelId.CERAMIC_WHITE : VoxelId.STONE_LIGHT,
          zoneId,
        );
      }
    }
  }
  // Ceremonial braziers around altar
  storage.setVoxel(ax - 2, y + 2, az - 2, VoxelId.BRONZE, zoneId);
  storage.setVoxel(ax - 2, y + 3, az - 2, VoxelId.FIRE_ORANGE, zoneId);
  storage.setVoxel(ax + 2, y + 2, az + 2, VoxelId.BRONZE, zoneId);
  storage.setVoxel(ax + 2, y + 3, az + 2, VoxelId.FIRE_ORANGE, zoneId);

  // Red & White Striped Hero Lighthouse (centered at x=-46, z=-18)
  const lx = -46;
  const lz = -18;
  // Stepped rocky lighthouse plinth
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) + Math.abs(dz) <= 4) {
        storage.setVoxel(lx + dx, y + 2, lz + dz, VoxelId.STONE_MID, zoneId);
      }
      if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
        storage.setVoxel(lx + dx, y + 3, lz + dz, VoxelId.STONE_LIGHT, zoneId);
      }
    }
  }
  // Tower shaft (y+4 .. y+12)
  for (let h = 4; h <= 12; h++) {
    const isRed = h % 2 === 1;
    const col = isRed ? VoxelId.LIGHTHOUSE_RED : VoxelId.CERAMIC_WHITE;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 2) {
          storage.setVoxel(lx + dx, y + h, lz + dz, col, zoneId);
        }
      }
    }
  }
  // Lantern gallery, bronze balcony railing & beacon lamp
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      storage.setVoxel(lx + dx, y + 13, lz + dz, VoxelId.BRONZE, zoneId);
      storage.setVoxel(lx + dx, y + 15, lz + dz, VoxelId.SLATE_ROOF, zoneId);
    }
  }
  storage.setVoxel(lx, y + 14, lz, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(lx, y + 16, lz, VoxelId.LAMP_AMBER, zoneId);

  // Floating Satellite Mini-Islands
  buildSatelliteIsland(storage, -38, 25, -10, 3.0, 101, zoneId, VoxelId.CRYSTAL_BLUE);
  buildSatelliteIsland(storage, -58, 26, -9, 2.5, 103, zoneId, VoxelId.CORE_VEIN);
  buildSatelliteIsland(storage, -44, 27, -27, 3.2, 107, zoneId, VoxelId.CRYSTAL_BLUE);

  // Skybridge path to Data Valley exit starting at [-58, 24, -22]
  carveSmoothPath(storage, -51, y + 1, -15, -58, y + 1, -22, 3, zoneId);
}

/**
 * Generates all 7 Awakening Islands + hero landmarks + instanced prop placements
 * + respawn anchors + interactables.
 */
export function generateAwakeningWorld(options: { singleIslandOnly?: boolean } = {}): GeneratedWorld {
  const storage = new ChunkStorage();
  const props: PropPlacement[] = [];
  const interactables: InteractablePlacement[] = [];
  const npcPositions: Record<string, [number, number, number]> = {};

  // --- Island A: Stasis Shrine (-48, 2, 48) ---
  carveIslandFoundation(storage, -48, 2, 48, 12, 12, 11, 'stasis_shrine', {
    terraceStep: true,
    taperMultiplier: 1.25,
    stalactiteNeedles: [
      { ox: 0, oz: 0, depth: 16 },
      { ox: -3, oz: 3, depth: 12 },
    ],
    hasCrystalVeins: true,
  });
  buildStasisSanctuary(storage, -48, 3, 48, 'stasis_shrine');
  buildCampfire(storage, -52, 50, 'stasis_shrine', 4);

  // Smooth path connecting spawn [-48, 4, 52] -> neo_pedestal [-48, 4, 48] -> bridge exit [-39, 3, 43]
  carveSmoothPath(storage, -48, 3, 52, -48, 3, 48, 3, 'stasis_shrine');
  carveSmoothPath(storage, -48, 3, 48, -39, 3, 43, 3, 'stasis_shrine');

  props.push(
    { type: 'pine_tall', position: [-54, 3, 43], rotationY: 0.2, scale: 1.1, zoneId: 'stasis_shrine' },
    { type: 'pine_small', position: [-41, 3, 41], rotationY: 1.1, scale: 1.0, zoneId: 'stasis_shrine' },
    { type: 'shrub', position: [-51, 3, 54], rotationY: 0, scale: 1.0, zoneId: 'stasis_shrine' },
    { type: 'shrub', position: [-44, 3, 52], rotationY: 1.4, scale: 0.9, zoneId: 'stasis_shrine' },
    { type: 'rock', position: [-42, 3, 54], rotationY: 0.7, scale: 1.0, zoneId: 'stasis_shrine' },
    { type: 'lore_note', position: [-53, 4, 46], rotationY: 0.4, scale: 1.0, zoneId: 'stasis_shrine', itemId: 'lore_note_1' },
  );

  interactables.push(
    { id: 'neo_pedestal', kind: 'device', label: 'Nyalakan NEO', position: [-48, 4.0, 48], zoneId: 'stasis_shrine', missionId: 'prologue' },
    { id: 'lore_note_1', kind: 'lore', label: 'Catatan Kuno: Apa itu Python?', position: [-53, 4.0, 46], zoneId: 'stasis_shrine' },
  );

  if (options.singleIslandOnly) {
    storage.setVoxel(-45, 3, 50, VoxelId.STONE_MID, 'stasis_shrine');
    storage.setVoxel(-45, 3, 52, VoxelId.STONE_DARK, 'stasis_shrine');
    storage.setVoxel(-45, 4, 52, VoxelId.STONE_DARK, 'stasis_shrine');
    const shrineZone = AWAKENING_ZONES[0]!;
    return {
      storage,
      zones: [shrineZone],
      anchors: [shrineZone.spawnAnchor],
      props,
      interactables,
      npcPositions: { neo_pedestal: [-48, 4.5, 48] },
      bitInitialPos: [-46, 3, 49],
      playerSpawnPos: [-48, 4, 52],
    };
  }

  // --- Land path bridge A -> B ([-39, 3, 43] to [-27, 4, 37]) ---
  buildSteppedBridge(storage, -39, 3, 43, -27, 4, 37, 3, VoxelId.PATH_STONE, 'stasis_shrine', VoxelId.STONE_MID);

  // --- Island B: Beacon Point & Coastal Citadel (-16, 4, 32) ---
  carveIslandFoundation(storage, -16, 4, 32, 14, 13, 23, 'beacon_point', {
    terraceStep: true,
    taperMultiplier: 1.35,
    stalactiteNeedles: [
      { ox: 1, oz: 1, depth: 18 },
      { ox: -3, oz: -2, depth: 14 },
    ],
    hasCrystalVeins: true,
  });
  buildBeaconCitadel(storage, -16, 5, 32, 'beacon_point');

  // Continuous stone pathways linking arrival bridge [-27, 4, 37] -> lore_note_2 [-23, 5, 32] -> terminal [-12, 6, 30] -> exit bridge [-6, 5, 26]
  carveSmoothPath(storage, -27, 4, 37, -23, 5, 32, 3, 'beacon_point');
  carveSmoothPath(storage, -23, 5, 32, -12, 5, 30, 3, 'beacon_point');
  carveSmoothPath(storage, -12, 5, 30, -6, 5, 26, 3, 'beacon_point');

  props.push(
    { type: 'pine_tall', position: [-23, 6, 26], rotationY: 0.5, scale: 1.1, zoneId: 'beacon_point' },
    { type: 'oak', position: [-9, 5, 37], rotationY: 1.4, scale: 1.0, zoneId: 'beacon_point' },
    { type: 'shrub', position: [-22, 5, 35], rotationY: 0, scale: 1.0, zoneId: 'beacon_point' },
    { type: 'shrub', position: [-13, 6, 25], rotationY: 0.8, scale: 0.9, zoneId: 'beacon_point' },
    { type: 'lore_note', position: [-23, 5.0, 32], rotationY: 0, scale: 1.0, zoneId: 'beacon_point', itemId: 'lore_note_2' },
  );

  interactables.push(
    { id: 'beacon_terminal', kind: 'puzzle', label: 'Terminal Suar (M1)', position: [-12, 6.0, 30], zoneId: 'beacon_point', missionId: 'm1_hello_architect' },
    { id: 'lore_note_2', kind: 'lore', label: 'Catatan Kuno: Komentar Arsitek', position: [-23, 5.0, 32], zoneId: 'beacon_point' },
  );

  // --- Stepped Skybridge B -> C ([-6, 5, 26] to [5, 5, 21]) ---
  buildSteppedBridge(storage, -6, 5, 26, 5, 5, 21, 3, VoxelId.SKYBRIDGE_CYAN, 'beacon_point', VoxelId.CRYSTAL_BLUE);

  // --- Island C: Supply Grove & Ancient World Tree (16, 4, 16) ---
  carveIslandFoundation(storage, 16, 4, 16, 14, 13, 37, 'supply_grove', {
    terraceStep: true,
    taperMultiplier: 1.3,
    stalactiteNeedles: [
      { ox: 0, oz: 0, depth: 17 },
      { ox: 3, oz: -2, depth: 13 },
    ],
    hasCrystalVeins: true,
  });
  buildSupplyGroveAndTree(storage, 16, 4, 16, 'supply_grove');

  // Continuous stone paths linking arrival [5, 5, 21] -> crystals -> BIT [18, 14] -> terminal [20, 12] -> exit [26, 5, 11]
  carveSmoothPath(storage, 5, 4, 21, 11, 4, 22, 3, 'supply_grove');
  carveSmoothPath(storage, 11, 4, 22, 18, 4, 14, 3, 'supply_grove');
  carveSmoothPath(storage, 18, 4, 14, 20, 4, 12, 3, 'supply_grove');
  carveSmoothPath(storage, 20, 4, 12, 19, 4, 9, 3, 'supply_grove');
  carveSmoothPath(storage, 19, 4, 9, 24, 4, 18, 3, 'supply_grove');
  carveSmoothPath(storage, 24, 4, 18, 26, 5, 11, 3, 'supply_grove');

  props.push(
    { type: 'pine_tall', position: [9, 5, 11], rotationY: 0.3, scale: 1.1, zoneId: 'supply_grove' },
    { type: 'pine_tall', position: [14, 5, 8], rotationY: 1.8, scale: 1.15, zoneId: 'supply_grove' },
    { type: 'pine_small', position: [8, 5, 15], rotationY: 0.9, scale: 1.0, zoneId: 'supply_grove' },
    { type: 'oak', position: [23, 5, 22], rotationY: 2.1, scale: 1.0, zoneId: 'supply_grove' },
    { type: 'crate', position: [21, 5, 15], rotationY: 0, scale: 1.0, zoneId: 'supply_grove' },
    { type: 'crate', position: [22, 5, 16], rotationY: 0.3, scale: 1.0, zoneId: 'supply_grove' },
    { type: 'crystal', position: [11, 5.0, 22], rotationY: 0, scale: 1.0, zoneId: 'supply_grove', itemId: 'awakening_crystal_1' },
    { type: 'crystal', position: [19, 5.0, 9], rotationY: 1.0, scale: 1.0, zoneId: 'supply_grove', itemId: 'awakening_crystal_2' },
    { type: 'crystal', position: [24, 5.0, 18], rotationY: 2.2, scale: 1.0, zoneId: 'supply_grove', itemId: 'awakening_crystal_3' },
  );

  interactables.push(
    { id: 'awakening_crystal_1', kind: 'item', label: 'Ambil Kristal Biru', position: [11, 5.5, 22], zoneId: 'supply_grove' },
    { id: 'awakening_crystal_2', kind: 'item', label: 'Ambil Kristal Biru', position: [19, 5.5, 9], zoneId: 'supply_grove' },
    { id: 'awakening_crystal_3', kind: 'item', label: 'Ambil Kristal Biru', position: [24, 5.5, 18], zoneId: 'supply_grove' },
    { id: 'bit_robot', kind: 'npc', label: 'Aktifkan BIT', position: [18, 5.5, 14], zoneId: 'supply_grove' },
    { id: 'bit_terminal', kind: 'puzzle', label: 'Program BIT (M2)', position: [20, 5.0, 12], zoneId: 'supply_grove', missionId: 'm2_data_collector' },
  );

  // --- Rustic Wooden Plank Bridge C -> D ([26, 5, 11] to [37, 7, 4]) ---
  buildSteppedBridge(storage, 26, 5, 11, 37, 7, 4, 3, VoxelId.WOOD_PLANK, 'supply_grove', VoxelId.WOOD_DARK);

  // --- Island D: Gatehouse Rock & Fortress Gatehouse (48, 6, 0) ---
  carveIslandFoundation(storage, 48, 6, 0, 13, 13, 49, 'gatehouse_rock', {
    terraceStep: true,
    taperMultiplier: 1.4,
    stalactiteNeedles: [
      { ox: 0, oz: 0, depth: 19 },
      { ox: -2, oz: 3, depth: 14 },
    ],
    hasCrystalVeins: true,
  });
  buildFortressGatehouse(storage, 48, 7, 0, 'gatehouse_rock');

  // Continuous stone walkways linking arrival [37, 7, 4] -> Old Tamo [43, 8, 5] -> Console [46, 8, -2] -> exit [41, 7, -9]
  carveSmoothPath(storage, 37, 7, 4, 43, 7, 5, 3, 'gatehouse_rock');
  carveSmoothPath(storage, 43, 7, 5, 46, 7, -2, 3, 'gatehouse_rock');
  carveSmoothPath(storage, 46, 7, -2, 41, 7, -9, 3, 'gatehouse_rock');

  npcPositions.old_tamo = [43, 8, 5];
  interactables.push(
    { id: 'old_tamo', kind: 'npc', label: 'Bicara dengan Pak Tamo', position: [43, 8.0, 5], zoneId: 'gatehouse_rock' },
    { id: 'gate_console', kind: 'puzzle', label: 'Konsol Gerbang (M3)', position: [46, 8.0, -2], zoneId: 'gatehouse_rock', missionId: 'm3_locked_gate' },
  );

  // --- Stepped Skybridge D -> E ([41, 7, -9] to [27, 11, -22]) ---
  buildSteppedBridge(storage, 41, 7, -9, 27, 11, -22, 3, VoxelId.SKYBRIDGE_CYAN, 'gatehouse_rock', VoxelId.CRYSTAL_BLUE);

  // --- Island E: Terrace Farm & Miller Farmhouse (16, 10, -32) ---
  carveIslandFoundation(storage, 16, 10, -32, 15, 15, 61, 'terrace_farm', {
    terraceStep: true,
    taperMultiplier: 1.35,
    stalactiteNeedles: [
      { ox: 0, oz: 0, depth: 18 },
      { ox: -2, oz: -3, depth: 15 },
    ],
    hasCrystalVeins: true,
  });
  buildAgriculturalTerraces(storage, 16, 10, -32, 'terrace_farm');

  // Crops props on tilled soil
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      props.push({
        type: 'crop_wheat',
        position: [12 + col + 0.5, 12, -36 + row * 2 + 0.5],
        rotationY: 0,
        scale: 1.0,
        zoneId: 'terrace_farm',
      });
    }
  }

  npcPositions.mira = [11, 12, -26];
  interactables.push(
    { id: 'mira', kind: 'npc', label: 'Bicara dengan Mira', position: [11, 12.0, -26], zoneId: 'terrace_farm' },
    { id: 'farm_console', kind: 'puzzle', label: 'Otomasi Ladang (M4)', position: [11, 12.0, -33], zoneId: 'terrace_farm', missionId: 'm4_automated_farm' },
  );

  // --- Stepped Skybridge E -> F ([5, 12, -38] to [-6, 16, -44]) ---
  buildSteppedBridge(storage, 5, 12, -38, -6, 16, -44, 3, VoxelId.SKYBRIDGE_CYAN, 'terrace_farm', VoxelId.CRYSTAL_BLUE);

  // --- Island F: BOLT's Workshop & Magitech Depot (-16, 16, -48) ---
  carveIslandFoundation(storage, -16, 16, -48, 14, 13, 73, 'bolts_workshop', {
    terraceStep: true,
    taperMultiplier: 1.4,
    stalactiteNeedles: [
      { ox: 0, oz: 0, depth: 19 },
      { ox: -3, oz: 1, depth: 15 },
    ],
    hasCrystalVeins: true,
  });
  buildIndustrialWorkshop(storage, -16, 16, -48, 'bolts_workshop');

  props.push(
    { type: 'crate', position: [-11, 18, -47], rotationY: 0.2, scale: 1.0, zoneId: 'bolts_workshop' },
    { type: 'crate', position: [-12, 18, -48], rotationY: 0.8, scale: 1.0, zoneId: 'bolts_workshop' },
    { type: 'pine_small', position: [-23, 17, -43], rotationY: 0.8, scale: 1.0, zoneId: 'bolts_workshop' },
  );

  npcPositions.bolt = [-13, 18, -46];
  interactables.push(
    { id: 'bolt', kind: 'npc', label: 'Bicara dengan BOLT', position: [-13, 18.0, -46], zoneId: 'bolts_workshop' },
    { id: 'workshop_console', kind: 'puzzle', label: 'Cetak Biru Menara (M5)', position: [-17, 18.0, -49], zoneId: 'bolts_workshop', missionId: 'm5_blueprint' },
  );

  // --- Stepped Skybridge F -> G ([-26, 17, -40] to [-37, 22, -25]) ---
  buildSteppedBridge(storage, -26, 17, -40, -37, 22, -25, 3, VoxelId.SKYBRIDGE_CYAN, 'bolts_workshop', VoxelId.CRYSTAL_BLUE);

  // --- Island G: Celestial Citadel, Lighthouse & Core Spire (-48, 22, -16) ---
  carveIslandFoundation(storage, -48, 22, -16, 16, 15, 89, 'core_spire', {
    terraceStep: true,
    taperMultiplier: 1.5,
    stalactiteNeedles: [
      { ox: 0, oz: 0, depth: 22 },
      { ox: -3, oz: 2, depth: 18 },
      { ox: 3, oz: -3, depth: 16 },
    ],
    hasCrystalVeins: true,
  });
  buildCelestialCitadel(storage, -48, 22, -16, 'core_spire');

  // Distant Skybridge toward Data Valley ([-58, 24, -22] to [-74, 28, -36])
  buildSteppedBridge(storage, -58, 24, -22, -74, 28, -36, 3, VoxelId.SKYBRIDGE_CYAN, 'core_spire', VoxelId.CRYSTAL_BLUE);

  props.push(
    { type: 'oak', position: [-40, 23, -12], rotationY: 0.5, scale: 1.1, zoneId: 'core_spire' },
    { type: 'pine_small', position: [-41, 23, -21], rotationY: 1.4, scale: 1.0, zoneId: 'core_spire' },
    { type: 'rock', position: [-54, 23, -11], rotationY: 0.9, scale: 1.0, zoneId: 'core_spire' },
  );

  interactables.push(
    { id: 'core_altar', kind: 'puzzle', label: 'Altar Pecahan Inti (Final)', position: [-51, 24.0, -15], zoneId: 'core_spire', missionId: 'final_core_shard' },
  );

  // Ground-snap all non-cloud / non-crop props flush onto terrain surface
  for (const prop of props) {
    if (prop.type === 'cloud' || prop.type === 'crop_wheat') continue;
    const groundedY = getGroundSurfaceY(storage, prop.position[0], prop.position[2], prop.position[1]);
    prop.position = [prop.position[0], groundedY, prop.position[2]];
  }

  // Canonical Quest Coordinates Map: strictly preserve exact quest coordinates per Rule 1
  const canonicalQuestCoordinates: Record<string, [number, number, number]> = {
    neo_pedestal: [-48, 4.0, 48],
    lore_note_1: [-53, 4.0, 46],
    beacon_terminal: [-12, 6.0, 30],
    lore_note_2: [-23, 5.0, 32],
    awakening_crystal_1: [11, 5.5, 22],
    awakening_crystal_2: [19, 5.5, 9],
    awakening_crystal_3: [24, 5.5, 18],
    bit_robot: [18, 5.5, 14],
    bit_terminal: [20, 5.0, 12],
    old_tamo: [43, 8.0, 5],
    gate_console: [46, 8.0, -2],
    mira: [11, 12.0, -26],
    farm_console: [11, 12.0, -33],
    bolt: [-13, 18.0, -46],
    workshop_console: [-17, 18.0, -49],
    core_altar: [-51, 24.0, -15],
  };

  for (const item of interactables) {
    const canonicalPos = canonicalQuestCoordinates[item.id];
    if (canonicalPos) {
      item.position = [canonicalPos[0], canonicalPos[1], canonicalPos[2]];
    } else {
      const groundedY = getGroundSurfaceY(storage, item.position[0], item.position[2], item.position[1]);
      item.position = [item.position[0], groundedY, item.position[2]];
    }
  }

  // Atmospheric floating voxel clouds
  props.push(
    { type: 'cloud', position: [-62, 26, 26], rotationY: 0, scale: 1.4, zoneId: 'stasis_shrine' },
    { type: 'cloud', position: [34, 24, 34], rotationY: 0.8, scale: 1.2, zoneId: 'supply_grove' },
    { type: 'cloud', position: [0, 32, -62], rotationY: 0.3, scale: 1.5, zoneId: 'terrace_farm' },
    { type: 'cloud', position: [-66, 34, -40], rotationY: 1.2, scale: 1.3, zoneId: 'core_spire' },
    { type: 'cloud', position: [-28, 28, 56], rotationY: 0.6, scale: 1.35, zoneId: 'beacon_point' },
    { type: 'cloud', position: [62, 25, -18], rotationY: 2.1, scale: 1.25, zoneId: 'gatehouse_rock' },
  );

  return {
    storage,
    zones: AWAKENING_ZONES,
    anchors: AWAKENING_ZONES.map((z) => z.spawnAnchor),
    props,
    interactables,
    npcPositions,
    bitInitialPos: [18, 5.5, 14],
    playerSpawnPos: [-48, 4, 52],
  };
}

export function serializeGeneratedWorld(world: GeneratedWorld): {
  chunks: SerializedWorldData;
  props: PropPlacement[];
  zones: IslandZoneSpec[];
  interactables: InteractablePlacement[];
  npcPositions: Record<string, [number, number, number]>;
  bitInitialPos: [number, number, number];
  playerSpawnPos: [number, number, number];
} {
  return {
    chunks: world.storage.serialize(),
    props: world.props,
    zones: world.zones,
    interactables: world.interactables,
    npcPositions: world.npcPositions,
    bitInitialPos: world.bitInitialPos,
    playerSpawnPos: world.playerSpawnPos,
  };
}
