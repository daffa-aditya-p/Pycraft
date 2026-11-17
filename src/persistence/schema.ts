import { z } from 'zod';

export const SCHEMA_VERSION = 1 as const;
export const DB_NAME = 'pycraft_db' as const;
export const DB_VERSION = 1 as const;
export const BACKUP_SLOTS_PER_SLOT = 3 as const;
export const MAX_TELEMETRY_ENTRIES = 50 as const;
export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB
export const EXPORT_MAGIC = 'PYCRAFT_SAVE' as const;

export const SlotIdSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type SlotId = z.infer<typeof SlotIdSchema>;

export const Sha256HexSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'SHA-256 must be a 64-character lowercase hex digest');

export const KCMasteryRecordSchema = z.object({
  kcId: z.string().min(1),
  score: z.number().min(0).max(100),
  attempts: z.number().int().nonnegative(),
  independentPasses: z.number().int().nonnegative(),
  distinctContextsPassed: z.array(z.string()),
  lastPracticedAt: z.number().nonnegative(),
  commonErrorTags: z.record(z.string(), z.number().int().nonnegative()),
});
export type KCMasteryRecord = z.infer<typeof KCMasteryRecordSchema>;

export const StepCodeDraftSchema = z.object({
  code: z.string(),
  tier: z.enum(['guided', 'assisted', 'independent', 'mastery']).or(z.string().min(1)),
  updatedAt: z.number().nonnegative(),
});
export type StepCodeDraft = z.infer<typeof StepCodeDraftSchema>;

export const AppearanceSchema = z.object({
  skinTone: z.number().int().min(0).max(5),
  hairStyle: z.number().int().min(0).max(3),
  hairColor: z.number().int().min(0).max(5),
  scarfColor: z.number().int().min(0).max(5),
});
export type ArchitectAppearance = z.infer<typeof AppearanceSchema>;

export const CosmeticsSchema = z.object({
  bitPaint: z.string().min(1),
  bitAccessory: z.string().min(1).nullable(),
  neoVisor: z.string().min(1),
  unlockedIds: z.array(z.string()),
});
export type CosmeticsState = z.infer<typeof CosmeticsSchema>;

export const SaveStatePayloadSchema = z.object({
  profile: z.object({
    name: z.string().trim().min(1).max(16),
    createdAt: z.number().nonnegative(),
    playtimeSeconds: z.number().nonnegative(),
    appearance: AppearanceSchema,
    cosmetics: CosmeticsSchema,
  }),
  world: z.object({
    regionId: z.string().min(1),
    islandId: z.string().min(1),
    safeAnchorId: z.string().min(1),
    playerPosition: z.tuple([z.number(), z.number(), z.number()]),
    playerYaw: z.number(),
    cameraMode: z.enum(['third_person', 'isometric']),
    restoredZoneIds: z.array(z.string()),
    collectedWorldItemIds: z.array(z.string()),
    discoveredLoreNoteIds: z.array(z.string()),
  }),
  quests: z.object({
    states: z.record(z.string(), z.enum(['locked', 'available', 'active', 'completed'])),
    completedStepIds: z.array(z.string()),
    completedObjectiveIds: z.array(z.string()).optional(),
    activeMissionId: z.string().nullable(),
    activeStepId: z.string().nullable(),
  }),
  learning: z.object({
    xp: z.number().int().nonnegative(),
    rank: z.number().int().min(1).max(7),
    kcMastery: z.record(z.string(), KCMasteryRecordSchema),
    stepCodeDrafts: z.record(z.string(), StepCodeDraftSchema),
  }),
  inventory: z.object({
    items: z.record(z.string(), z.number().int().nonnegative()),
  }),
});
export type SaveStatePayload = z.infer<typeof SaveStatePayloadSchema>;

export const SlotHeaderRecordSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    slotId: SlotIdSchema,
    occupied: z.boolean(),
    playerName: z.string().max(16),
    architectRank: z.number().int().min(1).max(7),
    xp: z.number().int().nonnegative(),
    currentRegionId: z.string().min(1),
    activeQuestId: z.string(),
    completedMissionCount: z.number().int().nonnegative(),
    playtimeSeconds: z.number().nonnegative(),
    updatedAt: z.number().nonnegative(),
    sha256: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.occupied) {
      if (val.playerName.trim().length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['playerName'],
          message: 'Occupied slot header must have a non-empty playerName (1..16 chars)',
        });
      }
      if (!/^[a-f0-9]{64}$/.test(val.sha256)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sha256'],
          message: 'Occupied slot header must have a valid 64-char sha256 hex digest',
        });
      }
    }
  });
export type SlotHeaderRecord = z.infer<typeof SlotHeaderRecordSchema>;

export const SaveStateRecordSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  slotId: SlotIdSchema,
  sha256: Sha256HexSchema,
  payload: SaveStatePayloadSchema,
});
export type SaveStateRecord = z.infer<typeof SaveStateRecordSchema>;

export const GlobalSettingsRecordSchema = z.object({
  id: z.literal('global'),
  schemaVersion: z.literal(SCHEMA_VERSION),
  lastActiveSlotId: SlotIdSchema.nullable(),
  locale: z.enum(['id', 'en']),
  audio: z.object({
    master: z.number().min(0).max(1),
    music: z.number().min(0).max(1),
    sfx: z.number().min(0).max(1),
    muted: z.boolean(),
  }),
  graphics: z.object({
    quality: z.enum(['high', 'medium', 'low']),
    showFps: z.boolean(),
    autoDegrade: z.boolean().default(true),
  }),
  controls: z.object({
    cameraSensitivity: z.number().min(0.1).max(3).default(1.0),
    invertY: z.boolean(),
    leftHandedTouch: z.boolean(),
    autoIsoInPuzzle: z.boolean(),
    pointerLock: z.boolean(),
  }),
  accessibility: z.object({
    textScale: z.union([z.literal(100), z.literal(125), z.literal(150)]),
    reducedMotion: z.boolean(),
    highContrastOutline: z.boolean().default(false),
    screenReaderHints: z.boolean().default(true),
  }),
  playbackSpeed: z
    .union([
      z.literal(0.5),
      z.literal(1),
      z.literal(2),
      z.literal(4),
      z.literal('instant'),
    ])
    .optional(),
  updatedAt: z.number().nonnegative().optional(),
});
export type GlobalSettingsRecord = z.infer<typeof GlobalSettingsRecordSchema>;

export const BackupReasonSchema = z.enum([
  'periodic_10m',
  'pre_migration',
  'pre_overwrite',
  'manual',
]);
export type BackupReason = z.infer<typeof BackupReasonSchema>;

export const BackupIndexSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type BackupIndex = z.infer<typeof BackupIndexSchema>;

export const BackupRecordSchema = z.object({
  backupId: z.string().regex(/^[123]_[012]$/),
  slotId: SlotIdSchema,
  slotIndex: BackupIndexSchema,
  reason: BackupReasonSchema,
  schemaVersion: z.number().int().nonnegative(),
  createdAt: z.number().nonnegative(),
  sha256: z.string(),
  header: z.unknown().optional(),
  state: z.unknown(),
});
export type BackupRecord = z.infer<typeof BackupRecordSchema>;

export const TelemetryKindSchema = z.enum([
  'runtime_fault',
  'worker_crash',
  'save_error',
  'migration',
  'integrity_error',
  'info',
]);
export type TelemetryKind = z.infer<typeof TelemetryKindSchema>;

export const TelemetryRecordSchema = z.object({
  id: z.number().int().positive().optional(),
  kind: TelemetryKindSchema,
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.number().nonnegative(),
});
export type TelemetryRecord = z.infer<typeof TelemetryRecordSchema>;

export const ExportBundleSchema = z.object({
  magic: z.literal(EXPORT_MAGIC),
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.number().nonnegative(),
  sha256: Sha256HexSchema,
  header: SlotHeaderRecordSchema,
  payload: SaveStatePayloadSchema,
});
export type ExportBundle = z.infer<typeof ExportBundleSchema>;

export const RawExportBundleEnvelopeSchema = z.object({
  magic: z.literal(EXPORT_MAGIC),
  schemaVersion: z.number().int().nonnegative().max(SCHEMA_VERSION),
  exportedAt: z.number().nonnegative(),
  sha256: Sha256HexSchema,
  header: z.unknown(),
  payload: z.unknown(),
});
export type RawExportBundleEnvelope = z.infer<typeof RawExportBundleEnvelopeSchema>;

export function createDefaultGlobalSettings(
  now = Date.now()
): GlobalSettingsRecord {
  return {
    id: 'global',
    schemaVersion: SCHEMA_VERSION,
    lastActiveSlotId: null,
    locale: 'id',
    audio: {
      master: 0.8,
      music: 0.5,
      sfx: 0.85,
      muted: false,
    },
    graphics: {
      quality: 'high',
      showFps: false,
      autoDegrade: true,
    },
    controls: {
      cameraSensitivity: 1.0,
      invertY: false,
      leftHandedTouch: false,
      autoIsoInPuzzle: false,
      pointerLock: false,
    },
    accessibility: {
      textScale: 100,
      reducedMotion: false,
      highContrastOutline: false,
      screenReaderHints: true,
    },
    playbackSpeed: 1,
    updatedAt: now,
  };
}

export function createDefaultSavePayload(
  playerName: string,
  appearance: Partial<ArchitectAppearance> = {},
  now = Date.now()
): SaveStatePayload {
  return {
    profile: {
      name: playerName.trim().slice(0, 16) || 'Architect',
      createdAt: now,
      playtimeSeconds: 0,
      appearance: {
        skinTone: appearance.skinTone ?? 2,
        hairStyle: appearance.hairStyle ?? 0,
        hairColor: appearance.hairColor ?? 1,
        scarfColor: appearance.scarfColor ?? 0,
      },
      cosmetics: {
        bitPaint: 'moss',
        bitAccessory: null,
        neoVisor: 'turquoise',
        unlockedIds: ['bit_paint_moss', 'neo_visor_turquoise', 'scarf_teal'],
      },
    },
    world: {
      regionId: 'awakening',
      islandId: 'stasis_shrine',
      safeAnchorId: 'shrine_spawn',
      playerPosition: [0, 2, 0],
      playerYaw: 0,
      cameraMode: 'third_person',
      restoredZoneIds: [],
      collectedWorldItemIds: [],
      discoveredLoreNoteIds: [],
    },
    quests: {
      states: {
        prologue: 'active',
      },
      completedStepIds: [],
      activeMissionId: 'prologue',
      activeStepId: null,
    },
    learning: {
      xp: 0,
      rank: 1,
      kcMastery: {},
      stepCodeDrafts: {},
    },
    inventory: {
      items: {},
    },
  };
}

export function deriveSlotHeader(
  slotId: SlotId,
  payload: SaveStatePayload,
  sha256: string,
  updatedAt = Date.now()
): SlotHeaderRecord {
  const completedMissionCount = Object.values(payload.quests.states).filter(
    (s) => s === 'completed'
  ).length;

  return {
    schemaVersion: SCHEMA_VERSION,
    slotId,
    occupied: true,
    playerName: payload.profile.name,
    architectRank: payload.learning.rank,
    xp: payload.learning.xp,
    currentRegionId: payload.world.regionId,
    activeQuestId: payload.quests.activeMissionId ?? '',
    completedMissionCount,
    playtimeSeconds: payload.profile.playtimeSeconds,
    updatedAt,
    sha256,
  };
}

/**
 * Deterministic JSON serialization with lexicographically sorted object keys
 * so identical DTO payloads always yield identical UTF-8 byte sequences.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortCanonicalValue(value));
}

function sortCanonicalValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : sortCanonicalValue(item)));
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(record).sort();
  for (const key of keys) {
    const val = record[key];
    if (val !== undefined) {
      sorted[key] = sortCanonicalValue(val);
    }
  }
  return sorted;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SHA256_INIT = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Pure TypeScript FIPS 180-4 SHA-256 implementation for environments without WebCrypto `crypto.subtle`.
 */
export function sha256PureTs(bytes: Uint8Array): string {
  const len = bytes.length;
  const bitLenHi = Math.floor((len * 8) / 0x100000000);
  const bitLenLo = (len * 8) >>> 0;

  // Pad with 0x80, zeros, and 64-bit big-endian length to multiple of 64 bytes
  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  const h = new Uint32Array(SHA256_INIT);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const w16 = w[i - 16] ?? 0;
      const w7 = w[i - 7] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = (w16 + s0 + w7 + s1) >>> 0;
    }

    let a = h[0] ?? 0;
    let b = h[1] ?? 0;
    let c = h[2] ?? 0;
    let d = h[3] ?? 0;
    let e = h[4] ?? 0;
    let f = h[5] ?? 0;
    let g = h[6] ?? 0;
    let hh = h[7] ?? 0;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + (SHA256_K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = ((h[0] ?? 0) + a) >>> 0;
    h[1] = ((h[1] ?? 0) + b) >>> 0;
    h[2] = ((h[2] ?? 0) + c) >>> 0;
    h[3] = ((h[3] ?? 0) + d) >>> 0;
    h[4] = ((h[4] ?? 0) + e) >>> 0;
    h[5] = ((h[5] ?? 0) + f) >>> 0;
    h[6] = ((h[6] ?? 0) + g) >>> 0;
    h[7] = ((h[7] ?? 0) + hh) >>> 0;
  }

  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += (h[i] ?? 0).toString(16).padStart(8, '0');
  }
  return hex;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes lowercase SHA-256 hex digest of canonical JSON representation of `payload`.
 * Uses WebCrypto `crypto.subtle.digest` when available and falls back to pure-TS SHA-256.
 */
export async function computeCanonicalSha256(payload: unknown): Promise<string> {
  const canonical = canonicalJsonStringify(payload);
  const bytes = new TextEncoder().encode(canonical);

  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === 'function') {
    try {
      const digest = await subtle.digest('SHA-256', bytes);
      return bufferToHex(digest);
    } catch {
      // Fall back to pure-TS SHA-256 if subtle fails in restricted contexts
    }
  }
  return sha256PureTs(bytes);
}
