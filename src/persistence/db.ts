import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  BACKUP_SLOTS_PER_SLOT,
  DB_NAME,
  DB_VERSION,
  SCHEMA_VERSION,
  createDefaultSavePayload,
  type BackupIndex,
  type BackupReason,
  type BackupRecord,
  type GlobalSettingsRecord,
  type SaveStatePayload,
  type SaveStateRecord,
  type SlotHeaderRecord,
  type SlotId,
  type TelemetryRecord,
} from './schema';

export interface PycraftDBSchema extends DBSchema {
  settings: {
    key: 'global';
    value: GlobalSettingsRecord;
  };
  slots: {
    key: SlotId;
    value: SlotHeaderRecord;
    indexes: {
      updatedAt: number;
    };
  };
  save_states: {
    key: SlotId;
    value: SaveStateRecord;
  };
  backups: {
    key: string;
    value: BackupRecord;
    indexes: {
      by_slot: SlotId;
    };
  };
  local_telemetry: {
    key: number;
    value: TelemetryRecord;
    indexes: {
      createdAt: number;
    };
  };
}

export type PycraftDB = IDBPDatabase<PycraftDBSchema>;

export async function openPycraftDb(dbName: string = DB_NAME): Promise<PycraftDB> {
  return openDB<PycraftDBSchema>(dbName, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('slots')) {
        const slotsStore = db.createObjectStore('slots', { keyPath: 'slotId' });
        slotsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('save_states')) {
        db.createObjectStore('save_states', { keyPath: 'slotId' });
      }
      if (!db.objectStoreNames.contains('backups')) {
        const backupsStore = db.createObjectStore('backups', { keyPath: 'backupId' });
        backupsStore.createIndex('by_slot', 'slotId', { unique: false });
      }
      if (!db.objectStoreNames.contains('local_telemetry')) {
        const telemetryStore = db.createObjectStore('local_telemetry', {
          keyPath: 'id',
          autoIncrement: true,
        });
        telemetryStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    },
  });
}

export type MigrationFn = (raw: unknown) => unknown;

function asRecord(val: unknown): Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : {};
}

function asStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Migrates a legacy v0 save record (or v0 payload/envelope) to v1.
 * Designed to be idempotent if executed on an already-v1 record.
 */
export function migrateSaveV0ToV1(raw: unknown): unknown {
  const rec = asRecord(raw);
  const rawPayload = rec.payload !== undefined ? asRecord(rec.payload) : rec;

  const rawProfile = asRecord(rawPayload.profile);
  const rawAppearance = asRecord(rawProfile.appearance);
  const rawCosmetics = asRecord(rawProfile.cosmetics);
  const rawWorld = asRecord(rawPayload.world);
  const rawQuests = asRecord(rawPayload.quests);
  const rawLearning = asRecord(rawPayload.learning);
  const rawInventory = asRecord(rawPayload.inventory);

  const playerName =
    typeof rawProfile.name === 'string' && rawProfile.name.trim().length > 0
      ? rawProfile.name.trim().slice(0, 16)
      : typeof rec.playerName === 'string' && rec.playerName.trim().length > 0
        ? rec.playerName.trim().slice(0, 16)
        : 'Architect';

  const defaults = createDefaultSavePayload(
    playerName,
    {},
    typeof rawProfile.createdAt === 'number' ? rawProfile.createdAt : Date.now()
  );

  const posRaw = Array.isArray(rawWorld.playerPosition) ? rawWorld.playerPosition : [0, 2, 0];
  const playerPosition: [number, number, number] = [
    typeof posRaw[0] === 'number' ? posRaw[0] : 0,
    typeof posRaw[1] === 'number' ? posRaw[1] : 2,
    typeof posRaw[2] === 'number' ? posRaw[2] : 0,
  ];

  const questStatesRaw = asRecord(rawQuests.states);
  const questStates: SaveStatePayload['quests']['states'] = {};
  for (const [k, v] of Object.entries(questStatesRaw)) {
    if (v === 'locked' || v === 'available' || v === 'active' || v === 'completed') {
      questStates[k] = v;
    }
  }
  if (Object.keys(questStates).length === 0) {
    questStates.prologue = 'active';
  }

  const migratedPayload: SaveStatePayload = {
    profile: {
      name: defaults.profile.name,
      createdAt:
        typeof rawProfile.createdAt === 'number'
          ? rawProfile.createdAt
          : defaults.profile.createdAt,
      playtimeSeconds:
        typeof rawProfile.playtimeSeconds === 'number'
          ? Math.max(0, rawProfile.playtimeSeconds)
          : typeof rec.playtimeSeconds === 'number'
            ? Math.max(0, rec.playtimeSeconds)
            : 0,
      appearance: {
        skinTone:
          typeof rawAppearance.skinTone === 'number' ? rawAppearance.skinTone : 0,
        hairStyle:
          typeof rawAppearance.hairStyle === 'number' ? rawAppearance.hairStyle : 0,
        hairColor:
          typeof rawAppearance.hairColor === 'number' ? rawAppearance.hairColor : 0,
        scarfColor:
          typeof rawAppearance.scarfColor === 'number' ? rawAppearance.scarfColor : 0,
      },
      cosmetics: {
        bitPaint:
          typeof rawCosmetics.bitPaint === 'string' && rawCosmetics.bitPaint.length > 0
            ? rawCosmetics.bitPaint
            : 'moss',
        bitAccessory:
          typeof rawCosmetics.bitAccessory === 'string' ? rawCosmetics.bitAccessory : null,
        neoVisor:
          typeof rawCosmetics.neoVisor === 'string' && rawCosmetics.neoVisor.length > 0
            ? rawCosmetics.neoVisor
            : 'turquoise',
        unlockedIds: asStringArray(rawCosmetics.unlockedIds),
      },
    },
    world: {
      regionId:
        typeof rawWorld.regionId === 'string' && rawWorld.regionId.length > 0
          ? rawWorld.regionId
          : 'awakening',
      islandId:
        typeof rawWorld.islandId === 'string' && rawWorld.islandId.length > 0
          ? rawWorld.islandId
          : 'stasis_shrine',
      safeAnchorId:
        typeof rawWorld.safeAnchorId === 'string' && rawWorld.safeAnchorId.length > 0
          ? rawWorld.safeAnchorId
          : 'shrine_spawn',
      playerPosition,
      playerYaw: typeof rawWorld.playerYaw === 'number' ? rawWorld.playerYaw : 0,
      cameraMode:
        rawWorld.cameraMode === 'isometric' ? 'isometric' : 'third_person',
      restoredZoneIds: asStringArray(rawWorld.restoredZoneIds),
      collectedWorldItemIds: asStringArray(rawWorld.collectedWorldItemIds),
      discoveredLoreNoteIds: asStringArray(rawWorld.discoveredLoreNoteIds),
    },
    quests: {
      states: questStates,
      completedStepIds: asStringArray(rawQuests.completedStepIds),
      activeMissionId:
        typeof rawQuests.activeMissionId === 'string' || rawQuests.activeMissionId === null
          ? rawQuests.activeMissionId
          : 'prologue',
      activeStepId:
        typeof rawQuests.activeStepId === 'string' || rawQuests.activeStepId === null
          ? rawQuests.activeStepId
          : null,
    },
    learning: {
      xp:
        typeof rawLearning.xp === 'number'
          ? Math.max(0, Math.floor(rawLearning.xp))
          : 0,
      rank:
        typeof rawLearning.rank === 'number'
          ? Math.min(7, Math.max(1, Math.floor(rawLearning.rank)))
          : 1,
      kcMastery: asRecord(rawLearning.kcMastery) as SaveStatePayload['learning']['kcMastery'],
      stepCodeDrafts: asRecord(
        rawLearning.stepCodeDrafts
      ) as SaveStatePayload['learning']['stepCodeDrafts'],
    },
    inventory: {
      items: asRecord(rawInventory.items) as Record<string, number>,
    },
  };

  if (rec.payload !== undefined) {
    const slotId =
      rec.slotId === 1 || rec.slotId === 2 || rec.slotId === 3 ? rec.slotId : 1;
    return {
      ...rec,
      schemaVersion: 1,
      slotId,
      sha256: typeof rec.sha256 === 'string' ? rec.sha256 : '',
      payload: migratedPayload,
    };
  }

  return migratedPayload;
}

export const DEFAULT_MIGRATIONS: Record<number, MigrationFn> = {
  0: migrateSaveV0ToV1,
};

/**
 * Sequential, idempotent schema migration runner.
 * Runs migrations step-by-step from `fromVersion` up to `toVersion`.
 */
export function runMigrations<T = unknown>(
  rawRecord: unknown,
  fromVersion: number,
  toVersion: number = SCHEMA_VERSION,
  migrations: Record<number, MigrationFn> = DEFAULT_MIGRATIONS
): T {
  const clone =
    rawRecord !== null && typeof rawRecord === 'object'
      ? structuredClone(rawRecord)
      : rawRecord;

  if (fromVersion >= toVersion) {
    return clone as T;
  }

  let current: unknown = clone;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = migrations[v];
    if (!step) {
      throw new Error(`Missing schema migration step from version ${v} to ${v + 1}`);
    }
    current = step(current);
  }
  return current as T;
}

export async function getNextBackupIndex(
  db: PycraftDB,
  slotId: SlotId
): Promise<BackupIndex> {
  const existing = await db.getAllFromIndex('backups', 'by_slot', slotId);
  if (existing.length === 0) {
    return 0;
  }
  existing.sort((a, b) => b.createdAt - a.createdAt || b.slotIndex - a.slotIndex);
  const latest = existing[0];
  if (!latest) return 0;
  const next = ((latest.slotIndex + 1) % BACKUP_SLOTS_PER_SLOT) as BackupIndex;
  return next;
}

export async function writeBackupSnapshot(
  db: PycraftDB,
  params: {
    slotId: SlotId;
    reason: BackupReason;
    schemaVersion: number;
    sha256: string;
    header?: unknown;
    state: unknown;
    createdAt?: number;
  }
): Promise<BackupRecord> {
  const slotIndex = await getNextBackupIndex(db, params.slotId);
  const backupId = `${params.slotId}_${slotIndex}`;
  const record: BackupRecord = {
    backupId,
    slotId: params.slotId,
    slotIndex,
    reason: params.reason,
    schemaVersion: params.schemaVersion,
    createdAt: params.createdAt ?? Date.now(),
    sha256: params.sha256,
    header: params.header !== undefined ? structuredClone(params.header) : undefined,
    state: structuredClone(params.state),
  };
  await db.put('backups', record);
  return record;
}

/**
 * Automatically snapshots the un-migrated raw record as a `"pre_migration"` backup
 * before executing sequential migrations from `fromVersion` to `toVersion`.
 */
export async function migrateWithBackup<T = unknown>(
  db: PycraftDB,
  slotId: SlotId,
  rawRecord: unknown,
  fromVersion: number,
  toVersion: number = SCHEMA_VERSION,
  header?: unknown,
  migrations: Record<number, MigrationFn> = DEFAULT_MIGRATIONS
): Promise<T> {
  if (fromVersion < toVersion) {
    const recObj = asRecord(rawRecord);
    const sha256 = typeof recObj.sha256 === 'string' ? recObj.sha256 : '';
    await writeBackupSnapshot(db, {
      slotId,
      reason: 'pre_migration',
      schemaVersion: fromVersion,
      sha256,
      header,
      state: rawRecord,
    });
  }
  return runMigrations<T>(rawRecord, fromVersion, toVersion, migrations);
}
