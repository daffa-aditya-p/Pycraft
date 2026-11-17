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
  minY = 0,
  maxY = 36,
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

/** Flattens a rectangular stone/path pad and fills soil beneath so nothing floats. */
function pavePad(
  storage: ChunkStorage,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  surfaceVoxelY: number,
  voxelId: number,
  zoneId: string,
): void {
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      // Clear any overhang voxels above
      for (let y = surfaceVoxelY + 1; y <= surfaceVoxelY + 6; y++) {
        storage.setVoxel(x, y, z, VoxelId.AIR, zoneId);
      }
      storage.setVoxel(x, surfaceVoxelY, z, voxelId, zoneId);
      storage.setVoxel(x, surfaceVoxelY - 1, z, VoxelId.SOIL_WARM, zoneId);
      storage.setVoxel(x, surfaceVoxelY - 2, z, VoxelId.STONE_MID, zoneId);
    }
  }
}

/**
 * Tier 1: Generates an art-directed floating island foundation matching reference.png:
 * - Vibrant lime-green grass cap (1 voxel, #8ED438 / #76BF31 / #5FA32A side lip)
 * - Warm terracotta soil layer (2-3 voxels, #8F5D3C / #6D4630)
 * - Stepped tapering gray stone stalactite underside (#B2B8BC / #8C9398 / #6E757A / #555B60)
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
  terraceStep = true,
): void {
  const maxR = Math.max(rx, rz) + 2;
  for (let dx = -maxR; dx <= maxR; dx++) {
    for (let dz = -maxR; dz <= maxR; dz++) {
      const nx = dx / rx;
      const nz = dz / rz;
      const lobe = 0.08 * Math.sin(Math.atan2(dz, dx) * 3 + seed) + 0.05 * Math.cos(Math.atan2(dz, dx) * 5);
      const distNorm = Math.sqrt(nx * nx + nz * nz) - lobe;
      if (distNorm > 1.0) continue;

      const wx = cx + dx;
      const wz = cz + dz;
      const h = hash2d(wx, wz, seed);

      // Gentle 1-voxel terrace elevation toward the back/center
      const elevOffset =
        terraceStep && distNorm < 0.55 && nx + nz < 0.25 ? 1 : 0;
      const surfaceY = topY + elevOffset;

      const isEdge = distNorm > 0.82;
      const grassId = isEdge
        ? VoxelId.GRASS_LIP
        : h > 0.52
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

      // Stepped tapering stone stalactite underside
      const taperMax = Math.max(
        2,
        Math.round((1.0 - distNorm * 0.85) * (9 + h * 7)),
      );
      for (let d = soilDepth + 1; d <= soilDepth + taperMax; d++) {
        const stoneId =
          d < soilDepth + 4
            ? VoxelId.STONE_MID
            : d < soilDepth + 8
              ? VoxelId.STONE_DARK
              : VoxelId.STONE_BASE;
        storage.setVoxel(wx, surfaceY - d, wz, stoneId, zoneId);
      }
    }
  }
}

/**
 * Tier 4: Builds a stepped spline bridge (either rustic wood planks or cyan Bayer skybridge).
 */
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
      storage.setVoxel(bx + perpX * w, by, bz + perpZ * w, voxelId, zoneId);
    }
    if (railVoxelId && i % 4 === 0) {
      storage.setVoxel(bx + perpX * (halfW + 1), by + 1, bz + perpZ * (halfW + 1), railVoxelId, zoneId);
      storage.setVoxel(bx - perpX * (halfW + 1), by + 1, bz - perpZ * (halfW + 1), railVoxelId, zoneId);
    }
  }
}

function buildCampfire(storage: ChunkStorage, cx: number, cz: number, zoneId: string, fallbackY = 3): void {
  const topY = getGroundSurfaceY(storage, cx, cz, fallbackY + 1);
  const y = topY - 1;
  const ring = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  for (const [ox, oz] of ring) {
    storage.setVoxel(cx + ox!, y + 1, cz + oz!, VoxelId.STONE_MID, zoneId);
  }
  storage.setVoxel(cx, y + 1, cz, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(cx, y + 2, cz, VoxelId.FIRE_ORANGE, zoneId);
}

/**
 * Tier 3 Hero Landmark: Cozy Timber Cottage, Paved Beacon Courtyard & Dual Waterfalls.
 */
function buildBeaconCottageAndWaterfall(
  storage: ChunkStorage,
  cx: number,
  y: number,
  cz: number,
  zoneId: string,
): void {
  // Level cozy grass yard + paved stone garden courtyard around cottage, terminal, and beacon
  pavePad(storage, cx - 3, cx + 7, cz - 6, cz + 1, y, VoxelId.GRASS_TOP, zoneId);
  pavePad(storage, cx, cx + 6, cz - 3, cz + 1, y, VoxelId.PATH_STONE, zoneId);

  // Cottage plinth (cx - 2..cx + 3, cz - 5..cz - 1)
  for (let x = cx - 2; x <= cx + 3; x++) {
    for (let z = cz - 5; z <= cz - 1; z++) {
      storage.setVoxel(x, y, z, VoxelId.STONE_LIGHT, zoneId);
      for (let h = 1; h <= 3; h++) {
        const isCorner = (x === cx - 2 || x === cx + 3) && (z === cz - 5 || z === cz - 1);
        const isInterior = x > cx - 2 && x < cx + 3 && z > cz - 5 && z < cz - 1;
        if (!isInterior) {
          storage.setVoxel(
            x,
            y + h,
            z,
            isCorner ? VoxelId.WOOD_DARK : VoxelId.COTTAGE_WALL,
            zoneId,
          );
        }
      }
    }
  }
  // Overhanging pitched slate roof (wider eaves & peaked ridge)
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
  // Stone chimney on left roof slope
  storage.setVoxel(cx - 1, y + 5, cz - 4, VoxelId.STONE_MID, zoneId);
  storage.setVoxel(cx - 1, y + 6, cz - 4, VoxelId.STONE_MID, zoneId);
  storage.setVoxel(cx - 1, y + 7, cz - 4, VoxelId.STONE_LIGHT, zoneId);

  // Warm recessed oak door, cozy amber window & porch flower box
  storage.setVoxel(cx + 1, y + 1, cz - 1, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx + 1, y + 2, cz - 1, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 1, y + 2, cz - 1, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(cx - 1, y + 1, cz, VoxelId.FOLIAGE_BLOSSOM, zoneId);

  // Stone doorstep & garden border
  storage.setVoxel(cx + 1, y, cz, VoxelId.STONE_LIGHT, zoneId);
  storage.setVoxel(cx + 2, y, cz, VoxelId.STONE_LIGHT, zoneId);

  // Turquoise pond & dual cascading waterfalls (front/right cliff edge, leaving -18, 36 dry)
  for (let x = cx - 2; x <= cx + 4; x++) {
    for (let z = cz + 2; z <= cz + 5; z++) {
      storage.setVoxel(x, y - 1, z, VoxelId.STONE_DARK, zoneId);
      storage.setVoxel(x, y, z, VoxelId.WATER_SHALLOW, zoneId);
    }
  }
  // Wooden dock jutting cleanly into pond
  storage.setVoxel(cx - 2, y + 1, cz + 2, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 2, y + 1, cz + 3, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 1, y + 1, cz + 3, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 2, y, cz + 3, VoxelId.WOOD_DARK, zoneId);

  // Waterfall cascade down cliff
  for (let drop = 0; drop <= 6; drop++) {
    const col = drop === 6 ? VoxelId.WATER_FOAM : drop % 2 === 0 ? VoxelId.WATER_CASCADE : VoxelId.WATER_SHALLOW;
    storage.setVoxel(cx + 3, y - drop, cz + 6, col, zoneId);
    storage.setVoxel(cx + 4, y - drop, cz + 6, col, zoneId);
  }

  // Dedicated stone dais pads for Beacon Tower ([-10, 28]) & Terminal Suar ([-12, 30])
  // (Rendered with sculpted 3D detail geometry in WorldLandmarks.tsx — no raw floating blocks!)
  storage.setVoxel(cx + 6, y, cz - 2, VoxelId.STONE_LIGHT, zoneId);
  storage.setVoxel(cx + 4, y, cz, VoxelId.STONE_LIGHT, zoneId);

  // Cozy wooden signpost by pond dock
  storage.setVoxel(cx - 5, y + 1, cz + 1, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(cx - 5, y + 2, cz + 1, VoxelId.WOOD_PLANK, zoneId);
}

/**
 * Tier 3 Hero Landmark: Red-and-White Striped Lighthouse & Core Altar Dais.
 */
function buildLighthouseAndCoreSpire(
  storage: ChunkStorage,
  cx: number,
  y: number,
  cz: number,
  zoneId: string,
): void {
  pavePad(storage, cx - 7, cx + 3, cz - 3, cz + 4, y, VoxelId.GRASS_TOP, zoneId);
  // Stepped rocky lighthouse plinth
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) + Math.abs(dz) <= 4) {
        storage.setVoxel(cx + dx, y + 1, cz + dz, VoxelId.STONE_MID, zoneId);
      }
      if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
        storage.setVoxel(cx + dx, y + 2, cz + dz, VoxelId.STONE_LIGHT, zoneId);
      }
    }
  }
  // Red & white striped tower (y+3 .. y+11)
  for (let h = 3; h <= 11; h++) {
    const isRed = h % 2 === 1;
    const col = isRed ? VoxelId.LIGHTHOUSE_RED : VoxelId.CERAMIC_WHITE;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 2) {
          storage.setVoxel(cx + dx, y + h, cz + dz, col, zoneId);
        }
      }
    }
  }
  // Lantern gallery + warm beacon lamp + slate peaked dome cap
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      storage.setVoxel(cx + dx, y + 12, cz + dz, VoxelId.BRONZE, zoneId);
      storage.setVoxel(cx + dx, y + 14, cz + dz, VoxelId.SLATE_ROOF, zoneId);
    }
  }
  storage.setVoxel(cx, y + 13, cz, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(cx, y + 15, cz, VoxelId.LAMP_AMBER, zoneId);

  // Core Shard Altar stone courtyard beside the lighthouse ([-51, 24, -15])
  const ax = cx - 5;
  const az = cz + 3;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      storage.setVoxel(ax + dx, y, az + dz, VoxelId.STONE_LIGHT, zoneId);
    }
  }
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
  carveIslandFoundation(storage, -48, 2, 48, 10, 10, 11, 'stasis_shrine');
  // Paved Shrine Courtyard & Awakening Altar Promenade (smooth path from spawn [-48, 52] -> NEO pedestal [-44, 47] -> bridge [-39, 43])
  pavePad(storage, -50, -42, 44, 53, 3, VoxelId.PATH_STONE, 'stasis_shrine');
  pavePad(storage, -43, -38, 42, 46, 3, VoxelId.PATH_STONE, 'stasis_shrine');
  // Stasis Monolith Arch behind spawn
  storage.setVoxel(-49, 4, 45, VoxelId.STONE_MID, 'stasis_shrine');
  storage.setVoxel(-49, 5, 45, VoxelId.STONE_LIGHT, 'stasis_shrine');
  storage.setVoxel(-48, 4, 45, VoxelId.STONE_MID, 'stasis_shrine');
  storage.setVoxel(-48, 5, 45, VoxelId.CORE_VEIN, 'stasis_shrine');
  storage.setVoxel(-48, 6, 45, VoxelId.STONE_LIGHT, 'stasis_shrine');
  storage.setVoxel(-47, 4, 45, VoxelId.STONE_MID, 'stasis_shrine');
  storage.setVoxel(-47, 5, 45, VoxelId.STONE_LIGHT, 'stasis_shrine');
  buildCampfire(storage, -52, 50, 'stasis_shrine', 3);

  props.push(
    { type: 'pine_tall', position: [-53, 3, 43], rotationY: 0.2, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'pine_small', position: [-42, 3, 42], rotationY: 1.1, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'shrub', position: [-51, 3, 54], rotationY: 0, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'shrub', position: [-44, 3, 52], rotationY: 1.4, scale: 0.9, zoneId: 'stasis_shrine' },
    { type: 'rock', position: [-43, 3, 53], rotationY: 0.7, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'lore_note', position: [-53, 4, 46], rotationY: 0.4, scale: 1, zoneId: 'stasis_shrine', itemId: 'lore_note_1' },
  );

  interactables.push(
    { id: 'neo_pedestal', kind: 'device', label: 'Nyalakan NEO', position: [-44, 4.0, 47], zoneId: 'stasis_shrine', missionId: 'prologue' },
    { id: 'lore_note_1', kind: 'lore', label: 'Catatan Kuno: Apa itu Python?', position: [-53, 4, 46], zoneId: 'stasis_shrine' },
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
      npcPositions: { neo_pedestal: [-44, 4.5, 47] },
      bitInitialPos: [-46, 3, 49],
      playerSpawnPos: [-48, 4, 52],
    };
  }

  // --- Land path bridge A -> B ---
  buildSteppedBridge(storage, -39, 3, 43, -27, 4, 37, 3, VoxelId.PATH_STONE, 'stasis_shrine');

  // --- Island B: Beacon Point & Cottage (-16, 4, 32) ---
  carveIslandFoundation(storage, -16, 4, 32, 12, 11, 23, 'beacon_point');
  buildBeaconCottageAndWaterfall(storage, -16, 5, 30, 'beacon_point');
  // Broad paved avenue connecting arrival bridge [-27, 37] across courtyard to Beacon Terminal [-12, 30] and exit skybridge [-6, 26]
  pavePad(storage, -28, -10, 26, 38, 5, VoxelId.PATH_STONE, 'beacon_point');
  props.push(
    { type: 'pine_tall', position: [-23, 6, 26], rotationY: 0.5, scale: 1, zoneId: 'beacon_point' },
    { type: 'oak', position: [-9, 5, 37], rotationY: 1.4, scale: 1, zoneId: 'beacon_point' },
    { type: 'shrub', position: [-22, 5, 35], rotationY: 0, scale: 1, zoneId: 'beacon_point' },
    { type: 'shrub', position: [-13, 6, 25], rotationY: 0.8, scale: 0.9, zoneId: 'beacon_point' },
    { type: 'lore_note', position: [-23, 5, 32], rotationY: 0, scale: 1, zoneId: 'beacon_point', itemId: 'lore_note_2' },
  );
  interactables.push(
    { id: 'beacon_terminal', kind: 'puzzle', label: 'Terminal Suar (M1)', position: [-12, 6, 30], zoneId: 'beacon_point', missionId: 'm1_hello_architect' },
    { id: 'lore_note_2', kind: 'lore', label: 'Catatan Kuno: Komentar Arsitek', position: [-23, 5, 32], zoneId: 'beacon_point' },
  );

  // --- Stepped Skybridge B -> C ---
  buildSteppedBridge(storage, -6, 5, 26, 5, 5, 21, 3, VoxelId.SKYBRIDGE_CYAN, 'beacon_point');

  // --- Island C: Supply Grove (16, 4, 16) ---
  carveIslandFoundation(storage, 16, 4, 16, 12, 11, 37, 'supply_grove');
  // Broad continuous stone pathway connecting entry bridge [5, 21] through central camp to exit bridge [26, 11]
  pavePad(storage, 5, 26, 18, 23, 4, VoxelId.PATH_STONE, 'supply_grove');
  pavePad(storage, 14, 22, 10, 18, 4, VoxelId.PATH_STONE, 'supply_grove');
  pavePad(storage, 20, 26, 10, 14, 4, VoxelId.PATH_STONE, 'supply_grove');
  buildCampfire(storage, 14, 19, 'supply_grove', 5);
  // Dedicated carved pedestals for crystals so they are elevated, distinct and impossible to miss
  storage.setVoxel(11, 4, 22, VoxelId.STONE_LIGHT, 'supply_grove');
  storage.setVoxel(19, 4, 9, VoxelId.STONE_LIGHT, 'supply_grove');
  storage.setVoxel(24, 4, 18, VoxelId.STONE_LIGHT, 'supply_grove');
  props.push(
    { type: 'pine_tall', position: [10, 6, 11], rotationY: 0.3, scale: 1, zoneId: 'supply_grove' },
    { type: 'pine_tall', position: [15, 6, 9], rotationY: 1.8, scale: 1.1, zoneId: 'supply_grove' },
    { type: 'pine_small', position: [8, 5, 15], rotationY: 0.9, scale: 1, zoneId: 'supply_grove' },
    { type: 'oak', position: [23, 5, 21], rotationY: 2.1, scale: 1, zoneId: 'supply_grove' },
    { type: 'crate', position: [21, 5, 15], rotationY: 0, scale: 1, zoneId: 'supply_grove' },
    { type: 'crate', position: [22, 5, 16], rotationY: 0.3, scale: 1, zoneId: 'supply_grove' },
    { type: 'crystal', position: [11, 5, 22], rotationY: 0, scale: 1, zoneId: 'supply_grove', itemId: 'awakening_crystal_1' },
    { type: 'crystal', position: [19, 5, 9], rotationY: 1.0, scale: 1, zoneId: 'supply_grove', itemId: 'awakening_crystal_2' },
    { type: 'crystal', position: [24, 5, 18], rotationY: 2.2, scale: 1, zoneId: 'supply_grove', itemId: 'awakening_crystal_3' },
  );
  interactables.push(
    { id: 'awakening_crystal_1', kind: 'item', label: 'Ambil Kristal Biru', position: [11, 5.5, 22], zoneId: 'supply_grove' },
    { id: 'awakening_crystal_2', kind: 'item', label: 'Ambil Kristal Biru', position: [19, 5.5, 9], zoneId: 'supply_grove' },
    { id: 'awakening_crystal_3', kind: 'item', label: 'Ambil Kristal Biru', position: [24, 5.5, 18], zoneId: 'supply_grove' },
    { id: 'bit_robot', kind: 'npc', label: 'Aktifkan BIT', position: [18, 5.5, 14], zoneId: 'supply_grove' },
    { id: 'bit_terminal', kind: 'puzzle', label: 'Program BIT (M2)', position: [20, 5.0, 12], zoneId: 'supply_grove', missionId: 'm2_data_collector' },
  );

  // --- Rustic Wooden Plank Bridge C -> D (M2, #B07D4F) ---
  buildSteppedBridge(storage, 26, 5, 11, 37, 7, 4, 3, VoxelId.WOOD_PLANK, 'supply_grove', VoxelId.WOOD_DARK);

  // --- Island D: Gatehouse Rock (48, 6, 0) ---
  carveIslandFoundation(storage, 48, 6, 0, 11, 11, 49, 'gatehouse_rock');
  // Continuous stone plaza linking arrival bridge [37, 7, 4], Old Tamo, Gate Console, and departure bridge [41, 7, -9]
  pavePad(storage, 36, 49, -10, 7, 7, VoxelId.PATH_STONE, 'gatehouse_rock');
  // Fortified gatehouse arch & rune plinths (sculpted crystals mounted cleanly in WorldLandmarks)
  for (let dz = -4; dz <= 4; dz++) {
    for (let h = 1; h <= 4; h++) {
      if (Math.abs(dz) > 1 || h === 4) {
        storage.setVoxel(48, 7 + h, dz, VoxelId.STONE_MID, 'gatehouse_rock');
      } else {
        storage.setVoxel(48, 7 + h, dz, VoxelId.WOOD_DARK, 'gatehouse_rock');
      }
    }
  }
  // 3 Carved Rune Plinth pedestals (floating rotating gems rendered in WorldLandmarks)
  storage.setVoxel(44, 8, -3, VoxelId.STONE_LIGHT, 'gatehouse_rock');
  storage.setVoxel(44, 8, 0, VoxelId.STONE_LIGHT, 'gatehouse_rock');
  storage.setVoxel(44, 8, 3, VoxelId.STONE_LIGHT, 'gatehouse_rock');

  npcPositions.old_tamo = [43, 8, 5];
  interactables.push(
    { id: 'old_tamo', kind: 'npc', label: 'Bicara dengan Pak Tamo', position: [43, 8, 5], zoneId: 'gatehouse_rock' },
    { id: 'gate_console', kind: 'puzzle', label: 'Konsol Gerbang (M3)', position: [46, 8, -2], zoneId: 'gatehouse_rock', missionId: 'm3_locked_gate' },
  );

  // --- Stepped Skybridge D -> E ---
  buildSteppedBridge(storage, 41, 7, -9, 27, 11, -22, 3, VoxelId.SKYBRIDGE_CYAN, 'gatehouse_rock');

  // --- Island E: Terrace Farm & Dual Waterfalls (16, 10, -32) ---
  carveIslandFoundation(storage, 16, 10, -32, 13, 13, 61, 'terrace_farm');
  pavePad(storage, 6, 17, -36, -24, 11, VoxelId.GRASS_TOP, 'terrace_farm');
  // Continuous stone terrace walkways linking arrival bridge [27, -22] to Mira [11, -26], Farm Console [11, -33], and exit bridge [5, -38]
  pavePad(storage, 10, 28, -26, -21, 11, VoxelId.PATH_STONE, 'terrace_farm');
  pavePad(storage, 4, 12, -39, -26, 11, VoxelId.PATH_STONE, 'terrace_farm');
  // Tilled farm rows & dual waterfall
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      storage.setVoxel(12 + col, 11, -35 + row * 2, VoxelId.SOIL_TILLED, 'terrace_farm');
      props.push({
        type: 'crop_wheat',
        position: [12 + col + 0.5, 12, -35 + row * 2 + 0.5],
        rotationY: 0,
        scale: 1,
        zoneId: 'terrace_farm',
      });
    }
  }
  // Upper pond + waterfall
  for (let x = 20; x <= 25; x++) {
    for (let z = -39; z <= -34; z++) {
      storage.setVoxel(x, 11, z, VoxelId.WATER_SHALLOW, 'terrace_farm');
    }
  }
  for (let drop = 0; drop <= 6; drop++) {
    const col = drop === 6 ? VoxelId.WATER_FOAM : VoxelId.WATER_CASCADE;
    storage.setVoxel(24, 11 - drop, -33, col, 'terrace_farm');
    storage.setVoxel(25, 11 - drop, -33, col, 'terrace_farm');
  }
  // Mira's clay-roof farmhouse with overhanging terracotta roof & cozy trim
  for (let x = 6; x <= 10; x++) {
    for (let z = -29; z <= -25; z++) {
      storage.setVoxel(x, 11, z, VoxelId.STONE_LIGHT, 'terrace_farm');
      for (let h = 1; h <= 3; h++) {
        const isCorner = (x === 6 || x === 10) && (z === -29 || z === -25);
        storage.setVoxel(x, 11 + h, z, isCorner ? VoxelId.WOOD_DARK : VoxelId.COTTAGE_WALL, 'terrace_farm');
      }
    }
  }
  for (let x = 5; x <= 11; x++) {
    for (let z = -30; z <= -24; z++) {
      storage.setVoxel(x, 15, z, VoxelId.CLAY_ROOF, 'terrace_farm');
      if (x >= 6 && x <= 10 && z >= -29 && z <= -25) {
        storage.setVoxel(x, 16, z, VoxelId.CLAY_ROOF, 'terrace_farm');
      }
    }
  }
  storage.setVoxel(10, 12, -27, VoxelId.WOOD_PLANK, 'terrace_farm');
  storage.setVoxel(10, 13, -27, VoxelId.WOOD_PLANK, 'terrace_farm');
  storage.setVoxel(10, 13, -26, VoxelId.LAMP_AMBER, 'terrace_farm');

  npcPositions.mira = [11, 12, -26];
  interactables.push(
    { id: 'mira', kind: 'npc', label: 'Bicara dengan Mira', position: [11, 12, -26], zoneId: 'terrace_farm' },
    { id: 'farm_console', kind: 'puzzle', label: 'Otomasi Ladang (M4)', position: [11, 12, -33], zoneId: 'terrace_farm', missionId: 'm4_automated_farm' },
  );

  // --- Stepped Skybridge E -> F ---
  buildSteppedBridge(storage, 5, 12, -38, -6, 16, -44, 3, VoxelId.SKYBRIDGE_CYAN, 'terrace_farm');

  // --- Island F: BOLT's Workshop & Watchtower (-16, 16, -48) ---
  carveIslandFoundation(storage, -16, 16, -48, 12, 11, 73, 'bolts_workshop');
  pavePad(storage, -22, -8, -53, -45, 17, VoxelId.GRASS_TOP, 'bolts_workshop');
  // Continuous stone workshop floor connecting arrival skybridge [-6, -44], BOLT, console, to departure skybridge [-26, -40]
  pavePad(storage, -27, -6, -53, -40, 17, VoxelId.PATH_STONE, 'bolts_workshop');
  // Depot & crane
  for (let x = -12; x <= -8; x++) {
    for (let z = -52; z <= -48; z++) {
      storage.setVoxel(x, 17, z, VoxelId.WOOD_PLANK, 'bolts_workshop');
    }
  }
  for (let h = 1; h <= 5; h++) {
    storage.setVoxel(-9, 17 + h, -51, VoxelId.BRONZE, 'bolts_workshop');
  }
  storage.setVoxel(-10, 22, -51, VoxelId.BRONZE, 'bolts_workshop');
  storage.setVoxel(-11, 22, -51, VoxelId.LAMP_AMBER, 'bolts_workshop');
  // Watchtower foundation
  for (const [tx, tz] of [[-22, -52], [-18, -52], [-22, -48], [-18, -48]]) {
    storage.setVoxel(tx!, 18, tz!, VoxelId.STONE_LIGHT, 'bolts_workshop');
    storage.setVoxel(tx!, 19, tz!, VoxelId.STONE_MID, 'bolts_workshop');
  }
  props.push(
    { type: 'crate', position: [-11, 18, -47], rotationY: 0.2, scale: 1, zoneId: 'bolts_workshop' },
    { type: 'pine_small', position: [-23, 17, -43], rotationY: 0.8, scale: 1, zoneId: 'bolts_workshop' },
  );
  npcPositions.bolt = [-13, 18, -46];
  interactables.push(
    { id: 'bolt', kind: 'npc', label: 'Bicara dengan BOLT', position: [-13, 18, -46], zoneId: 'bolts_workshop' },
    { id: 'workshop_console', kind: 'puzzle', label: 'Cetak Biru Menara (M5)', position: [-17, 18, -49], zoneId: 'bolts_workshop', missionId: 'm5_blueprint' },
  );

  // --- Stepped Skybridge F -> G ---
  buildSteppedBridge(storage, -26, 17, -40, -37, 22, -25, 3, VoxelId.SKYBRIDGE_CYAN, 'bolts_workshop');

  // --- Island G: Core Shard Spire & Lighthouse (-48, 22, -16) ---
  carveIslandFoundation(storage, -48, 22, -16, 13, 12, 89, 'core_spire');
  buildLighthouseAndCoreSpire(storage, -46, 23, -18, 'core_spire');
  // Ceremonial stone walkway connecting arrival skybridge [-37, 22, -25] directly to Core Altar dais [-51, 24, -15]
  pavePad(storage, -54, -36, -26, -13, 23, VoxelId.PATH_STONE, 'core_spire');
  // Distant Skybridge toward Data Valley (appears once Core Shard restores!)
  buildSteppedBridge(storage, -58, 24, -22, -74, 28, -36, 3, VoxelId.SKYBRIDGE_CYAN, 'core_spire');
  props.push(
    { type: 'oak', position: [-40, 23, -12], rotationY: 0.5, scale: 1, zoneId: 'core_spire' },
    { type: 'pine_small', position: [-41, 23, -21], rotationY: 1.4, scale: 1, zoneId: 'core_spire' },
    { type: 'rock', position: [-54, 23, -11], rotationY: 0.9, scale: 1, zoneId: 'core_spire' },
  );
  interactables.push(
    { id: 'core_altar', kind: 'puzzle', label: 'Altar Pecahan Inti (Final)', position: [-51, 24, -15], zoneId: 'core_spire', missionId: 'final_core_shard' },
  );

  // Ground-snap all non-cloud / non-crop props flush onto actual terrain surface
  for (const prop of props) {
    if (prop.type === 'cloud' || prop.type === 'crop_wheat') continue;
    const groundedY = getGroundSurfaceY(storage, prop.position[0], prop.position[2], prop.position[1]);
    prop.position = [prop.position[0], groundedY, prop.position[2]];
  }
  for (const item of interactables) {
    if (item.id === 'bit_robot') continue; // keep canonical supply grove position [18, 5.5, 14]
    const groundedY = getGroundSurfaceY(storage, item.position[0], item.position[2], item.position[1]);
    item.position = [item.position[0], item.kind === 'lore' ? groundedY : groundedY, item.position[2]];
  }

  // Decorative floating voxel clouds
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
    bitInitialPos: [18, 5, 14],
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
