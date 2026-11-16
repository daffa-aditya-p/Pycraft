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

function buildCampfire(storage: ChunkStorage, cx: number, y: number, cz: number, zoneId: string): void {
  const ring = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  for (const [ox, oz] of ring) {
    storage.setVoxel(cx + ox!, y, cz + oz!, VoxelId.STONE_MID, zoneId);
  }
  storage.setVoxel(cx, y, cz, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(cx, y + 1, cz, VoxelId.FIRE_ORANGE, zoneId);
  storage.setVoxel(cx, y + 2, cz, VoxelId.LAMP_AMBER, zoneId);
}

/**
 * Tier 3 Hero Landmark: Cozy Cottage + Dual Waterfalls matching docs/art/reference.png top island.
 */
function buildBeaconCottageAndWaterfall(
  storage: ChunkStorage,
  cx: number,
  y: number,
  cz: number,
  zoneId: string,
): void {
  // Cottage base at (cx - 2..cx + 3, cz - 5..cz - 1)
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
      // Pitched slate roof
      storage.setVoxel(x, y + 4, z, VoxelId.SLATE_ROOF, zoneId);
      if (z >= cz - 4 && z <= cz - 2) {
        storage.setVoxel(x, y + 5, z, VoxelId.SLATE_ROOF, zoneId);
      }
    }
  }
  // Door & glowing amber window
  storage.setVoxel(cx + 1, y + 1, cz - 1, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx + 1, y + 2, cz - 1, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 1, y + 2, cz - 1, VoxelId.LAMP_AMBER, zoneId);
  // Stone stairs in front
  storage.setVoxel(cx + 1, y, cz, VoxelId.STONE_LIGHT, zoneId);
  storage.setVoxel(cx + 2, y, cz, VoxelId.STONE_LIGHT, zoneId);

  // Turquoise pond & dual cascading waterfalls (front/right cliff edge)
  for (let x = cx - 4; x <= cx + 4; x++) {
    for (let z = cz + 2; z <= cz + 6; z++) {
      storage.setVoxel(x, y - 1, z, VoxelId.STONE_DARK, zoneId);
      storage.setVoxel(x, y, z, VoxelId.WATER_SHALLOW, zoneId);
    }
  }
  // Wooden dock jutting into pond
  storage.setVoxel(cx - 2, y + 1, cz + 2, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 2, y + 1, cz + 3, VoxelId.WOOD_PLANK, zoneId);
  storage.setVoxel(cx - 1, y + 1, cz + 3, VoxelId.WOOD_PLANK, zoneId);

  // Waterfall cascade down cliff
  for (let drop = 0; drop <= 6; drop++) {
    const col = drop === 6 ? VoxelId.WATER_FOAM : drop % 2 === 0 ? VoxelId.WATER_CASCADE : VoxelId.WATER_SHALLOW;
    storage.setVoxel(cx + 3, y - drop, cz + 7, col, zoneId);
    storage.setVoxel(cx + 4, y - drop, cz + 7, col, zoneId);
  }

  // Stone Beacon Tower + Terminal + Signpost
  const bx = cx + 6;
  const bz = cz - 2;
  for (let h = 1; h <= 5; h++) {
    storage.setVoxel(bx, y + h, bz, h === 4 ? VoxelId.LAMP_AMBER : h === 5 ? VoxelId.BRONZE : VoxelId.STONE_MID, zoneId);
  }
  // Terminal console
  storage.setVoxel(bx - 2, y + 1, bz + 2, VoxelId.CHAR_SLATE, zoneId);
  storage.setVoxel(bx - 2, y + 2, bz + 2, VoxelId.CORE_VEIN, zoneId);
  // Signpost
  storage.setVoxel(cx - 5, y + 1, cz + 1, VoxelId.WOOD_DARK, zoneId);
  storage.setVoxel(cx - 5, y + 2, cz + 1, VoxelId.WOOD_PLANK, zoneId);
}

/**
 * Tier 3 Hero Landmark: Red-and-White Striped Lighthouse matching docs/art/reference.png right island.
 */
function buildLighthouseAndCoreSpire(
  storage: ChunkStorage,
  cx: number,
  y: number,
  cz: number,
  zoneId: string,
): void {
  // Stepped rocky plinth
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
  // Red & white striped tower (y+3 .. y+12)
  for (let h = 3; h <= 11; h++) {
    const rad = h < 7 ? 1 : 1;
    const isRed = h % 2 === 1;
    const col = isRed ? VoxelId.LIGHTHOUSE_RED : VoxelId.CERAMIC_WHITE;
    for (let dx = -rad; dx <= rad; dx++) {
      for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 2) {
          storage.setVoxel(cx + dx, y + h, cz + dz, col, zoneId);
        }
      }
    }
  }
  // Lantern gallery + warm beacon lamp + slate dome cap
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      storage.setVoxel(cx + dx, y + 12, cz + dz, VoxelId.WOOD_DARK, zoneId);
      storage.setVoxel(cx + dx, y + 14, cz + dz, VoxelId.STONE_DARK, zoneId);
    }
  }
  storage.setVoxel(cx, y + 13, cz, VoxelId.LAMP_AMBER, zoneId);
  storage.setVoxel(cx, y + 15, cz, VoxelId.STONE_LIGHT, zoneId);

  // Core Shard Altar beside the lighthouse
  const ax = cx - 5;
  const az = cz + 3;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      storage.setVoxel(ax + dx, y + 1, az + dz, VoxelId.STONE_BASE, zoneId);
    }
  }
  storage.setVoxel(ax, y + 2, az, VoxelId.BRONZE, zoneId);
  storage.setVoxel(ax, y + 3, az, VoxelId.CORE_VEIN, zoneId);
  storage.setVoxel(ax, y + 4, az, VoxelId.CORE_VEIN, zoneId);
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
  // Stasis Pod & NEO Pedestal
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      storage.setVoxel(-48 + dx, 3, 46 + dz, VoxelId.PATH_STONE, 'stasis_shrine');
    }
  }
  storage.setVoxel(-48, 4, 45, VoxelId.STONE_MID, 'stasis_shrine');
  storage.setVoxel(-48, 5, 45, VoxelId.CORE_VEIN, 'stasis_shrine');
  storage.setVoxel(-44, 4, 47, VoxelId.STONE_LIGHT, 'stasis_shrine');
  storage.setVoxel(-44, 5, 47, VoxelId.BRONZE, 'stasis_shrine');
  buildCampfire(storage, -52, 3, 50, 'stasis_shrine');

  props.push(
    { type: 'pine_tall', position: [-53, 4, 43], rotationY: 0.2, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'pine_small', position: [-42, 3, 42], rotationY: 1.1, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'shrub', position: [-51, 3, 54], rotationY: 0, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'rock', position: [-43, 3, 53], rotationY: 0.7, scale: 1, zoneId: 'stasis_shrine' },
    { type: 'lore_note', position: [-53, 4, 46], rotationY: 0.4, scale: 1, zoneId: 'stasis_shrine', itemId: 'lore_note_1' },
  );

  interactables.push(
    { id: 'neo_pedestal', kind: 'device', label: 'Nyalakan NEO', position: [-44, 5, 47], zoneId: 'stasis_shrine', missionId: 'prologue' },
    { id: 'lore_note_1', kind: 'lore', label: 'Catatan Kuno: Apa itu Python?', position: [-53, 4, 46], zoneId: 'stasis_shrine' },
  );

  if (options.singleIslandOnly) {
    // Add a practice 1-voxel step and 2-voxel wall for M0 tests
    storage.setVoxel(-45, 3, 50, VoxelId.STONE_MID, 'stasis_shrine'); // 1-voxel step
    storage.setVoxel(-45, 3, 52, VoxelId.STONE_DARK, 'stasis_shrine'); // 2-voxel wall
    storage.setVoxel(-45, 4, 52, VoxelId.STONE_DARK, 'stasis_shrine');
    const shrineZone = AWAKENING_ZONES[0]!;
    return {
      storage,
      zones: [shrineZone],
      anchors: [shrineZone.spawnAnchor],
      props,
      interactables,
      npcPositions: { neo_pedestal: [-44, 5.5, 47] },
      bitInitialPos: [-46, 3, 49],
      playerSpawnPos: [-48, 4, 52],
    };
  }

  // --- Land path bridge A -> B ---
  buildSteppedBridge(storage, -39, 3, 43, -27, 4, 37, 3, VoxelId.PATH_STONE, 'stasis_shrine');

  // --- Island B: Beacon Point & Cottage (-16, 4, 32) ---
  carveIslandFoundation(storage, -16, 4, 32, 12, 11, 23, 'beacon_point');
  buildBeaconCottageAndWaterfall(storage, -16, 5, 30, 'beacon_point');
  props.push(
    { type: 'pine_tall', position: [-23, 6, 26], rotationY: 0.5, scale: 1, zoneId: 'beacon_point' },
    { type: 'oak', position: [-9, 5, 37], rotationY: 1.4, scale: 1, zoneId: 'beacon_point' },
    { type: 'shrub', position: [-22, 5, 35], rotationY: 0, scale: 1, zoneId: 'beacon_point' },
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
  buildCampfire(storage, 14, 5, 19, 'supply_grove');
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
    { id: 'bit_terminal', kind: 'puzzle', label: 'Program BIT (M2)', position: [20, 5.5, 12], zoneId: 'supply_grove', missionId: 'm2_data_collector' },
  );

  // --- Rustic Wooden Plank Bridge C -> D (M2, #B07D4F) ---
  buildSteppedBridge(storage, 26, 5, 11, 37, 7, 4, 3, VoxelId.WOOD_PLANK, 'supply_grove', VoxelId.WOOD_DARK);

  // --- Island D: Gatehouse Rock (48, 6, 0) ---
  carveIslandFoundation(storage, 48, 6, 0, 11, 11, 49, 'gatehouse_rock');
  // Fortified gatehouse wall & rune pillars
  for (let dz = -4; dz <= 4; dz++) {
    for (let h = 1; h <= 4; h++) {
      if (Math.abs(dz) > 1 || h === 4) {
        storage.setVoxel(48, 7 + h, dz, VoxelId.STONE_MID, 'gatehouse_rock');
      } else {
        storage.setVoxel(48, 7 + h, dz, VoxelId.WOOD_DARK, 'gatehouse_rock');
      }
    }
  }
  // 3 Rune pillars
  storage.setVoxel(44, 8, -3, VoxelId.STONE_LIGHT, 'gatehouse_rock');
  storage.setVoxel(44, 9, -3, VoxelId.CRYSTAL_BLUE, 'gatehouse_rock');
  storage.setVoxel(44, 8, 0, VoxelId.STONE_LIGHT, 'gatehouse_rock');
  storage.setVoxel(44, 9, 0, VoxelId.CRYSTAL_GREEN, 'gatehouse_rock');
  storage.setVoxel(44, 8, 3, VoxelId.STONE_LIGHT, 'gatehouse_rock');
  storage.setVoxel(44, 9, 3, VoxelId.CRYSTAL_RED, 'gatehouse_rock');

  npcPositions.old_tamo = [43, 7, 5];
  interactables.push(
    { id: 'old_tamo', kind: 'npc', label: 'Bicara dengan Pak Tamo', position: [43, 7.5, 5], zoneId: 'gatehouse_rock' },
    { id: 'gate_console', kind: 'puzzle', label: 'Konsol Gerbang (M3)', position: [46, 7.5, -2], zoneId: 'gatehouse_rock', missionId: 'm3_locked_gate' },
  );

  // --- Stepped Skybridge D -> E ---
  buildSteppedBridge(storage, 41, 7, -9, 27, 11, -22, 3, VoxelId.SKYBRIDGE_CYAN, 'gatehouse_rock');

  // --- Island E: Terrace Farm & Dual Waterfalls (16, 10, -32) ---
  carveIslandFoundation(storage, 16, 10, -32, 13, 13, 61, 'terrace_farm');
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
  // Upper pond + waterfall + water wheel
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
  // Mira's clay-roof farmhouse
  for (let x = 6; x <= 10; x++) {
    for (let z = -29; z <= -25; z++) {
      for (let h = 1; h <= 3; h++) {
        storage.setVoxel(x, 11 + h, z, VoxelId.COTTAGE_WALL, 'terrace_farm');
      }
      storage.setVoxel(x, 15, z, VoxelId.CLAY_ROOF, 'terrace_farm');
    }
  }
  npcPositions.mira = [11, 12, -26];
  interactables.push(
    { id: 'mira', kind: 'npc', label: 'Bicara dengan Mira', position: [11, 12.5, -26], zoneId: 'terrace_farm' },
    { id: 'farm_console', kind: 'puzzle', label: 'Otomasi Ladang (M4)', position: [11, 12, -33], zoneId: 'terrace_farm', missionId: 'm4_automated_farm' },
  );

  // --- Stepped Skybridge E -> F ---
  buildSteppedBridge(storage, 5, 12, -38, -6, 16, -44, 3, VoxelId.SKYBRIDGE_CYAN, 'terrace_farm');

  // --- Island F: BOLT's Workshop & Watchtower (-16, 16, -48) ---
  carveIslandFoundation(storage, -16, 16, -48, 12, 11, 73, 'bolts_workshop');
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
  npcPositions.bolt = [-13, 17, -46];
  interactables.push(
    { id: 'bolt', kind: 'npc', label: 'Bicara dengan BOLT', position: [-13, 17.5, -46], zoneId: 'bolts_workshop' },
    { id: 'workshop_console', kind: 'puzzle', label: 'Cetak Biru Menara (M5)', position: [-17, 17.5, -49], zoneId: 'bolts_workshop', missionId: 'm5_blueprint' },
  );

  // --- Stepped Skybridge F -> G ---
  buildSteppedBridge(storage, -26, 17, -40, -37, 22, -25, 3, VoxelId.SKYBRIDGE_CYAN, 'bolts_workshop');

  // --- Island G: Core Shard Spire & Lighthouse (-48, 22, -16) ---
  carveIslandFoundation(storage, -48, 22, -16, 13, 12, 89, 'core_spire');
  buildLighthouseAndCoreSpire(storage, -46, 23, -18, 'core_spire');
  // Distant Skybridge toward Data Valley (appears once Core Shard restores!)
  buildSteppedBridge(storage, -58, 24, -22, -74, 28, -36, 3, VoxelId.SKYBRIDGE_CYAN, 'core_spire');
  props.push(
    { type: 'oak', position: [-40, 23, -12], rotationY: 0.5, scale: 1, zoneId: 'core_spire' },
    { type: 'pine_small', position: [-41, 23, -21], rotationY: 1.4, scale: 1, zoneId: 'core_spire' },
    { type: 'rock', position: [-54, 23, -11], rotationY: 0.9, scale: 1, zoneId: 'core_spire' },
  );
  interactables.push(
    { id: 'core_altar', kind: 'puzzle', label: 'Altar Pecahan Inti (Final)', position: [-51, 24.5, -15], zoneId: 'core_spire', missionId: 'final_core_shard' },
  );

  // Decorative floating voxel clouds (high above / flanking the diorama like reference.png)
  props.push(
    { type: 'cloud', position: [-62, 26, 26], rotationY: 0, scale: 1.4, zoneId: 'stasis_shrine' },
    { type: 'cloud', position: [34, 24, 34], rotationY: 0.8, scale: 1.2, zoneId: 'supply_grove' },
    { type: 'cloud', position: [0, 32, -62], rotationY: 0.3, scale: 1.5, zoneId: 'terrace_farm' },
    { type: 'cloud', position: [-66, 34, -40], rotationY: 1.2, scale: 1.3, zoneId: 'core_spire' },
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
