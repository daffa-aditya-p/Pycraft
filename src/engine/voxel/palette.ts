/**
 * Canonical Voxel IDs and Locked Reference Art Palette (RC-07 / Section 11.2).
 * All hex values strictly derive from src/content/palette.json (calibrated to docs/art/reference.png).
 * Zero pixel textures: every voxel carries a palette index mapped to linear
 * vertex colors plus a dormant variant for island restoration blending (0 -> 1).
 */

export const VoxelId = {
  AIR: 0,
  GRASS_LIGHT: 1,
  GRASS_TOP: 2,
  GRASS_LIP: 3,
  GRASS_DORMANT: 4,
  SOIL_WARM: 5,
  SOIL_DARK: 6,
  SOIL_TILLED: 7,
  STONE_LIGHT: 8,
  STONE_MID: 9,
  STONE_DARK: 10,
  STONE_BASE: 11,
  WATER_SHALLOW: 12,
  WATER_CASCADE: 13,
  WATER_DEEP: 14,
  WATER_FOAM: 15,
  SAND_LIGHT: 16,
  PATH_STONE: 17,
  WOOD_PLANK: 18,
  WOOD_DARK: 19,
  WOOD_TRUNK: 20,
  FOLIAGE_DEEP: 21,
  FOLIAGE_MID: 22,
  FOLIAGE_LIGHT: 23,
  FOLIAGE_BLOSSOM: 24,
  LAMP_AMBER: 25,
  FIRE_ORANGE: 26,
  CLAY_ROOF: 27,
  CLOTH_TEAL: 28,
  BRONZE: 29,
  CORE_VEIN: 30,
  LIGHTHOUSE_RED: 31,
  CERAMIC_WHITE: 32,
  SKYBRIDGE_CYAN: 33,
  SLATE_ROOF: 34,
  CRATE_WOOD: 35,
  CRYSTAL_BLUE: 36,
  FLOWER_YELLOW: 37,
  CLOUD_WHITE: 38,
  COTTAGE_WALL: 39,
  CRYSTAL_GREEN: 40,
  CRYSTAL_RED: 41,
  CHAR_SLATE: 42,
} as const;

export type VoxelIdValue = (typeof VoxelId)[keyof typeof VoxelId];

export type VoxelRenderLayer = 'none' | 'solid' | 'water' | 'skybridge';

export interface VoxelMaterialSpec {
  id: number;
  name: string;
  hex: string;
  dormantHex: string;
  layer: VoxelRenderLayer;
  /** Solid for character swept-AABB collision */
  solid: boolean;
  /** Opaque for greedy culling and baked 4-level vertex AO */
  opaque: boolean;
  /** Emissive multiplier clamped strictly <= 1.2 (zero HDR bloom) */
  emissiveStrength: number;
}

const RAW_SPECS: VoxelMaterialSpec[] = [
  { id: VoxelId.AIR, name: 'air', hex: '#000000', dormantHex: '#000000', layer: 'none', solid: false, opaque: false, emissiveStrength: 0 },
  { id: VoxelId.GRASS_LIGHT, name: 'grass_light', hex: '#8ED438', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.GRASS_TOP, name: 'grass_top', hex: '#76BF31', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.GRASS_LIP, name: 'grass_lip', hex: '#5FA32A', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.GRASS_DORMANT, name: 'grass_dormant', hex: '#9AA071', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.SOIL_WARM, name: 'soil_warm', hex: '#8F5D3C', dormantHex: '#6D4630', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.SOIL_DARK, name: 'soil_dark', hex: '#6D4630', dormantHex: '#6D4630', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.SOIL_TILLED, name: 'soil_tilled', hex: '#5B3A27', dormantHex: '#5B3A27', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.STONE_LIGHT, name: 'stone_light', hex: '#B2B8BC', dormantHex: '#8C9398', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.STONE_MID, name: 'stone_mid', hex: '#8C9398', dormantHex: '#8C9398', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.STONE_DARK, name: 'stone_dark', hex: '#6E757A', dormantHex: '#6E757A', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.STONE_BASE, name: 'stone_base', hex: '#555B60', dormantHex: '#555B60', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.WATER_SHALLOW, name: 'water_shallow', hex: '#4CD7E0', dormantHex: '#79A6A6', layer: 'water', solid: false, opaque: false, emissiveStrength: 0 },
  { id: VoxelId.WATER_CASCADE, name: 'water_cascade', hex: '#38B2CE', dormantHex: '#79A6A6', layer: 'water', solid: false, opaque: false, emissiveStrength: 0 },
  { id: VoxelId.WATER_DEEP, name: 'water_deep', hex: '#2A86A8', dormantHex: '#79A6A6', layer: 'water', solid: false, opaque: false, emissiveStrength: 0 },
  { id: VoxelId.WATER_FOAM, name: 'water_foam', hex: '#E8F7F4', dormantHex: '#79A6A6', layer: 'water', solid: false, opaque: false, emissiveStrength: 0.15 },
  { id: VoxelId.SAND_LIGHT, name: 'sand_light', hex: '#E2CE9C', dormantHex: '#CDB683', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.PATH_STONE, name: 'path_stone', hex: '#CDB683', dormantHex: '#CDB683', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.WOOD_PLANK, name: 'wood_plank', hex: '#B07D4F', dormantHex: '#7A5233', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.WOOD_DARK, name: 'wood_dark', hex: '#7A5233', dormantHex: '#7A5233', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.WOOD_TRUNK, name: 'wood_trunk', hex: '#6A4A2F', dormantHex: '#6A4A2F', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.FOLIAGE_DEEP, name: 'foliage_deep', hex: '#2D6636', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.FOLIAGE_MID, name: 'foliage_mid', hex: '#3E8242', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.FOLIAGE_LIGHT, name: 'foliage_light', hex: '#5CA64A', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.FOLIAGE_BLOSSOM, name: 'foliage_blossom', hex: '#E9B7C4', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.LAMP_AMBER, name: 'lamp_amber', hex: '#F2B544', dormantHex: '#6E757A', layer: 'solid', solid: true, opaque: true, emissiveStrength: 1.15 },
  { id: VoxelId.FIRE_ORANGE, name: 'fire_orange', hex: '#E5793A', dormantHex: '#E5793A', layer: 'solid', solid: false, opaque: true, emissiveStrength: 1.15 },
  { id: VoxelId.CLAY_ROOF, name: 'clay_roof', hex: '#B4533C', dormantHex: '#8F5D3C', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CLOTH_TEAL, name: 'cloth_teal', hex: '#2F7F86', dormantHex: '#79A6A6', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.BRONZE, name: 'bronze', hex: '#A8773D', dormantHex: '#7A5233', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CORE_VEIN, name: 'core_vein', hex: '#5ED8CB', dormantHex: '#555B60', layer: 'solid', solid: true, opaque: true, emissiveStrength: 1.15 },
  { id: VoxelId.LIGHTHOUSE_RED, name: 'lighthouse_red', hex: '#D9433B', dormantHex: '#B4533C', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CERAMIC_WHITE, name: 'ceramic_white', hex: '#F0EDE6', dormantHex: '#D6CCB8', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.SKYBRIDGE_CYAN, name: 'skybridge_cyan', hex: '#5CE1E6', dormantHex: '#79A6A6', layer: 'skybridge', solid: true, opaque: false, emissiveStrength: 1.15 },
  { id: VoxelId.SLATE_ROOF, name: 'slate_roof', hex: '#355C8C', dormantHex: '#3A464C', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CRATE_WOOD, name: 'crate_wood', hex: '#B07D4F', dormantHex: '#7A5233', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CRYSTAL_BLUE, name: 'crystal_blue', hex: '#4BACE8', dormantHex: '#79A6A6', layer: 'solid', solid: true, opaque: true, emissiveStrength: 1.05 },
  { id: VoxelId.FLOWER_YELLOW, name: 'flower_yellow', hex: '#F2B544', dormantHex: '#9AA071', layer: 'solid', solid: false, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CLOUD_WHITE, name: 'cloud_white', hex: '#F5FAFD', dormantHex: '#DCEAF3', layer: 'solid', solid: false, opaque: true, emissiveStrength: 0.1 },
  { id: VoxelId.COTTAGE_WALL, name: 'cottage_wall', hex: '#EDE4D0', dormantHex: '#D6CCB8', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
  { id: VoxelId.CRYSTAL_GREEN, name: 'crystal_green', hex: '#6DBE4B', dormantHex: '#9AA071', layer: 'solid', solid: true, opaque: true, emissiveStrength: 1.0 },
  { id: VoxelId.CRYSTAL_RED, name: 'crystal_red', hex: '#E0603F', dormantHex: '#B4533C', layer: 'solid', solid: true, opaque: true, emissiveStrength: 1.0 },
  { id: VoxelId.CHAR_SLATE, name: 'char_slate', hex: '#3A464C', dormantHex: '#3A464C', layer: 'solid', solid: true, opaque: true, emissiveStrength: 0 },
];

export const VOXEL_SPECS: VoxelMaterialSpec[] = [];
for (const spec of RAW_SPECS) {
  // Enforce <= 1.2x albedo emissive clamp per RC-07 / Section 11.1
  VOXEL_SPECS[spec.id] = {
    ...spec,
    emissiveStrength: Math.min(1.2, Math.max(0, spec.emissiveStrength)),
  };
}

export function hexToLinearRgb(hex: string): [number, number, number] {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const num = parseInt(clean, 16);
  const sr = ((num >> 16) & 0xff) / 255;
  const sg = ((num >> 8) & 0xff) / 255;
  const sb = (num & 0xff) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return [toLinear(sr), toLinear(sg), toLinear(sb)];
}

export interface PaletteColorTables {
  lushRgb: Float32Array;
  dormantRgb: Float32Array;
  emissive: Float32Array;
  layer: Uint8Array; // 0=none, 1=solid, 2=water, 3=skybridge
  opaque: Uint8Array;
  solid: Uint8Array;
}

const LAYER_TO_CODE: Record<VoxelRenderLayer, number> = {
  none: 0,
  solid: 1,
  water: 2,
  skybridge: 3,
};

export function buildPaletteTables(): PaletteColorTables {
  const maxId = 64;
  const lushRgb = new Float32Array(maxId * 3);
  const dormantRgb = new Float32Array(maxId * 3);
  const emissive = new Float32Array(maxId);
  const layer = new Uint8Array(maxId);
  const opaque = new Uint8Array(maxId);
  const solid = new Uint8Array(maxId);

  for (const spec of VOXEL_SPECS) {
    if (!spec) continue;
    const [lr, lg, lb] = hexToLinearRgb(spec.hex);
    const [dr, dg, db] = hexToLinearRgb(spec.dormantHex);
    const i3 = spec.id * 3;
    lushRgb[i3] = lr;
    lushRgb[i3 + 1] = lg;
    lushRgb[i3 + 2] = lb;
    dormantRgb[i3] = dr;
    dormantRgb[i3 + 1] = dg;
    dormantRgb[i3 + 2] = db;
    emissive[spec.id] = spec.emissiveStrength;
    layer[spec.id] = LAYER_TO_CODE[spec.layer];
    opaque[spec.id] = spec.opaque ? 1 : 0;
    solid[spec.id] = spec.solid ? 1 : 0;
  }

  return { lushRgb, dormantRgb, emissive, layer, opaque, solid };
}

export const PALETTE_TABLES = buildPaletteTables();
