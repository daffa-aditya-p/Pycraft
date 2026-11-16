import { EventBus, type SaveReason } from '../stores/EventBus';
import { useGameStore } from '../stores/useGameStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import {
  MAX_TELEMETRY_ENTRIES,
  SCHEMA_VERSION,
  SaveStatePayloadSchema,
  SaveStateRecordSchema,
  SlotHeaderRecordSchema,
  GlobalSettingsRecordSchema,
  computeCanonicalSha256,
  createDefaultGlobalSettings,
  deriveSlotHeader,
  type BackupReason,
  type BackupRecord,
  type GlobalSettingsRecord,
  type SaveStatePayload,
  type SaveStateRecord,
  type SlotHeaderRecord,
  type SlotId,
  type TelemetryRecord,
} from './schema';
import {
  migrateWithBackup,
  openPycraftDb,
  runMigrations,
  writeBackupSnapshot,
  type PycraftDB,
} from './db';
import { TabLockManager, type SlotLockState } from './tabLock';

export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const PERIODIC_BACKUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export type ImmediateSaveReason =
  | 'step_completed'
  | 'quest_progressed'
  | 'island_transition'
  | 'settings_changed'
  | 'pause_opened'
  | 'visibility_hidden'
  | 'pagehide'
  | 'manual';

export type SaveStatusState =
  | 'saving'
  | 'saved'
  | 'error'
  | 'quota_exceeded'
  | 'read_only';

export type SaveErrorCode =
  | 'CORRUPT_SAVE'
  | 'QUOTA_EXCEEDED'
  | 'READ_ONLY_TAB'
  | 'VALIDATION_ERROR'
  | 'NO_VALID_BACKUP'
  | 'STORAGE_ERROR';

export interface SaveStatusEvent {
  state: SaveStatusState;
  slotId?: SlotId;
  timestamp: number;
  sha256?: string;
  errorCode?: SaveErrorCode;
  message?: string;
  color?: string;
  promptJsonExport?: boolean;
  recoveryAvailable?: boolean;
}

export interface SaveSlotResult {
  ok: boolean;
  header?: SlotHeaderRecord;
  state?: SaveStateRecord;
  errorCode?: SaveErrorCode;
  message?: string;
  promptJsonExport?: boolean;
}

export interface LoadSlotResult {
  ok: boolean;
  empty?: boolean;
  corrupted?: boolean;
  readOnly: boolean;
  header?: SlotHeaderRecord;
  state?: SaveStateRecord;
  errorCode?: SaveErrorCode;
  message?: string;
  availableBackupsCount?: number;
}

export interface RestoreBackupResult {
  ok: boolean;
  backupId?: string;
  header?: SlotHeaderRecord;
  state?: SaveStateRecord;
  errorCode?: SaveErrorCode;
  message?: string;
}

export interface SaveManagerOptions {
  db?: PycraftDB;
  dbName?: string;
  tabLockManager?: TabLockManager;
  onSaveStatus?: (event: SaveStatusEvent) => void;
  onReadOnlyChange?: (readOnly: boolean, slotId: SlotId, reason?: string) => void;
  getSnapshot?: () => { slotId: SlotId; payload: SaveStatePayload } | null;
  getSettingsSnapshot?: () => GlobalSettingsRecord | null;
  debounceMs?: number;
  periodicBackupIntervalMs?: number;
  storagePersist?: () => Promise<boolean>;
  now?: () => number;
}

export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number; message?: string };
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014 ||
    (typeof e.message === 'string' && /quota/i.test(e.message))
  );
}

export class SaveManager {
  private db: PycraftDB | null;
  private readonly dbName?: string;
  public readonly tabLockManager: TabLockManager;
  private readonly onSaveStatus?: (event: SaveStatusEvent) => void;
  private readonly getSnapshot?: () => { slotId: SlotId; payload: SaveStatePayload } | null;
  private readonly getSettingsSnapshot?: () => GlobalSettingsRecord | null;
  private readonly debounceMs: number;
  private readonly periodicBackupIntervalMs: number;
  private readonly storagePersist?: () => Promise<boolean>;
  private readonly now: () => number;

  private initPromise: Promise<PycraftDB> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private storagePersistRequested = false;
  private lastPeriodicBackupAt = new Map<SlotId, number>();
  private activeSlotId: SlotId | null = null;
  private pendingFlush: Promise<SaveSlotResult | null> | null = null;

  constructor(options: SaveManagerOptions = {}) {
    this.db = options.db ?? null;
    this.dbName = options.dbName;
    this.tabLockManager =
      options.tabLockManager ??
      new TabLockManager({
        onReadOnlyChange: (readOnly, slotId, reason) => {
          options.onReadOnlyChange?.(readOnly, slotId, reason);
          if (readOnly) {
            this.emitStatus({
              state: 'read_only',
              slotId,
              timestamp: this.now(),
              errorCode: 'READ_ONLY_TAB',
              message: reason ?? 'Slot ini sedang dimainkan di tab lain',
            });
          }
        },
      });
    this.onSaveStatus = options.onSaveStatus;
    this.getSnapshot = options.getSnapshot;
    this.getSettingsSnapshot = options.getSettingsSnapshot;
    this.debounceMs = options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
    this.periodicBackupIntervalMs =
      options.periodicBackupIntervalMs ?? PERIODIC_BACKUP_INTERVAL_MS;
    this.storagePersist =
      options.storagePersist ??
      (typeof navigator !== 'undefined' && navigator.storage?.persist
        ? () => navigator.storage.persist()
        : undefined);
    this.now = options.now ?? (() => Date.now());
  }

  public async init(): Promise<PycraftDB> {
    if (this.db) return this.db;
    if (!this.initPromise) {
      this.initPromise = openPycraftDb(this.dbName).then((db) => {
        this.db = db;
        return db;
      });
    }
    return this.initPromise;
  }

  private emitStatus(event: SaveStatusEvent): void {
    this.onSaveStatus?.(event);
  }

  private async ensurePersistentStorage(): Promise<void> {
    if (this.storagePersistRequested || !this.storagePersist) return;
    this.storagePersistRequested = true;
    try {
      await this.storagePersist();
    } catch {
      // Storage persistence is best-effort
    }
  }

  public async acquireSlotLock(slotId: SlotId): Promise<SlotLockState> {
    this.activeSlotId = slotId;
    return this.tabLockManager.acquire(slotId);
  }

  public async releaseSlotLock(slotId: SlotId): Promise<void> {
    if (this.activeSlotId === slotId) {
      this.activeSlotId = null;
    }
    await this.tabLockManager.release(slotId);
  }

  /**
   * Two-phase Pre-Transaction SHA-256 Atomic Save (Verifier A Finding A-3):
   * Phase 1: Validate DTO with Zod and await computeCanonicalSha256(payload) in memory.
   * Phase 2: Open IDB readwrite transaction across ['slots', 'save_states'] and issue
   *          synchronous .put() calls with zero non-IDB awaits inside the transaction.
   */
  public async saveSlot(
    slotId: SlotId,
    payload: SaveStatePayload,
    options: { skipLockCheck?: boolean; createPeriodicBackup?: boolean } = {}
  ): Promise<SaveSlotResult> {
    const db = await this.init();
    const timestamp = this.now();

    if (!options.skipLockCheck) {
      if (this.tabLockManager.isReadOnly(slotId)) {
        const msg = 'Slot ini dalam mode baca-saja karena aktif di tab lain';
        this.emitStatus({
          state: 'read_only',
          slotId,
          timestamp,
          errorCode: 'READ_ONLY_TAB',
          message: msg,
        });
        return { ok: false, errorCode: 'READ_ONLY_TAB', message: msg };
      }

      if (!this.tabLockManager.hasActiveWriteLock(slotId)) {
        const lock = await this.acquireSlotLock(slotId);
        if (lock.readOnly || !lock.acquired) {
          const msg = lock.reason ?? 'Slot ini sedang dimainkan di tab lain';
          this.emitStatus({
            state: 'read_only',
            slotId,
            timestamp,
            errorCode: 'READ_ONLY_TAB',
            message: msg,
          });
          return { ok: false, errorCode: 'READ_ONLY_TAB', message: msg };
        }
      }
    }

    this.emitStatus({ state: 'saving', slotId, timestamp });

    // Phase 1: In-memory validation + SHA-256 digest OUTSIDE IDB transaction
    const parsedPayload = SaveStatePayloadSchema.safeParse(payload);
    if (!parsedPayload.success) {
      const msg = `Save payload failed Zod validation: ${parsedPayload.error.message}`;
      this.emitStatus({
        state: 'error',
        slotId,
        timestamp,
        errorCode: 'VALIDATION_ERROR',
        message: msg,
        color: '#E0603F',
      });
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: msg };
    }

    const validatedPayload = parsedPayload.data;
    const sha256 = await computeCanonicalSha256(validatedPayload);
    const header = deriveSlotHeader(slotId, validatedPayload, sha256, timestamp);
    const stateRecord: SaveStateRecord = {
      schemaVersion: SCHEMA_VERSION,
      slotId,
      sha256,
      payload: validatedPayload,
    };

    const parsedHeader = SlotHeaderRecordSchema.safeParse(header);
    const parsedState = SaveStateRecordSchema.safeParse(stateRecord);
    if (!parsedHeader.success || !parsedState.success) {
      const msg = 'Derived save record failed schema validation';
      this.emitStatus({
        state: 'error',
        slotId,
        timestamp,
        errorCode: 'VALIDATION_ERROR',
        message: msg,
        color: '#E0603F',
      });
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: msg };
    }

    await this.ensurePersistentStorage();

    // Phase 2: Synchronous multi-store IDB transaction with ZERO non-IDB awaits
    try {
      const tx = db.transaction(['slots', 'save_states'], 'readwrite');
      void tx.objectStore('slots').put(parsedHeader.data);
      void tx.objectStore('save_states').put(parsedState.data);
      await tx.done;

      const lastBackup = this.lastPeriodicBackupAt.get(slotId) ?? 0;
      if (
        options.createPeriodicBackup ||
        (lastBackup > 0 && timestamp - lastBackup >= this.periodicBackupIntervalMs)
      ) {
        await writeBackupSnapshot(db, {
          slotId,
          reason: 'periodic_10m',
          schemaVersion: SCHEMA_VERSION,
          sha256,
          header: parsedHeader.data,
          state: parsedState.data,
          createdAt: timestamp,
        });
        this.lastPeriodicBackupAt.set(slotId, timestamp);
      } else if (lastBackup === 0) {
        // Record initial baseline periodic backup if slot had none yet
        const existingBackups = await db.getAllFromIndex('backups', 'by_slot', slotId);
        if (existingBackups.length === 0) {
          await writeBackupSnapshot(db, {
            slotId,
            reason: 'periodic_10m',
            schemaVersion: SCHEMA_VERSION,
            sha256,
            header: parsedHeader.data,
            state: parsedState.data,
            createdAt: timestamp,
          });
        }
        this.lastPeriodicBackupAt.set(slotId, timestamp);
      }

      this.emitStatus({
        state: 'saved',
        slotId,
        timestamp,
        sha256,
      });

      return {
        ok: true,
        header: parsedHeader.data,
        state: parsedState.data,
      };
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const msg = 'Penyimpanan browser penuh. Segera ekspor cadangan JSON.';
        await this.recordTelemetry({
          kind: 'save_error',
          message: 'QuotaExceededError during saveSlot',
          details: { slotId },
          createdAt: timestamp,
        }).catch(() => undefined);

        this.emitStatus({
          state: 'quota_exceeded',
          slotId,
          timestamp,
          errorCode: 'QUOTA_EXCEEDED',
          message: msg,
          color: '#E0603F',
          promptJsonExport: true,
        });
        return {
          ok: false,
          errorCode: 'QUOTA_EXCEEDED',
          message: msg,
          promptJsonExport: true,
        };
      }

      const msg = err instanceof Error ? err.message : 'Unknown IndexedDB write error';
      await this.recordTelemetry({
        kind: 'save_error',
        message: msg,
        details: { slotId },
        createdAt: timestamp,
      }).catch(() => undefined);

      this.emitStatus({
        state: 'error',
        slotId,
        timestamp,
        errorCode: 'STORAGE_ERROR',
        message: msg,
        color: '#E0603F',
      });
      return { ok: false, errorCode: 'STORAGE_ERROR', message: msg };
    }
  }

  public async loadSlot(slotId: SlotId): Promise<LoadSlotResult> {
    const db = await this.init();
    const lock = await this.acquireSlotLock(slotId);
    const readOnly = lock.readOnly || !lock.acquired;

    const rawHeader = (await db.get('slots', slotId)) as unknown;
    const rawState = (await db.get('save_states', slotId)) as unknown;

    if (!rawState && !rawHeader) {
      return { ok: true, empty: true, readOnly };
    }

    if (!rawState) {
      const backups = await this.listBackups(slotId);
      await this.recordTelemetry({
        kind: 'integrity_error',
        message: `Slot ${slotId} header exists without save_state`,
        createdAt: this.now(),
      });
      this.emitStatus({
        state: 'error',
        slotId,
        timestamp: this.now(),
        errorCode: 'CORRUPT_SAVE',
        message: 'Data simpanan rusak atau tidak lengkap',
        color: '#E0603F',
        recoveryAvailable: backups.length > 0,
        promptJsonExport: true,
      });
      return {
        ok: false,
        corrupted: true,
        readOnly,
        errorCode: 'CORRUPT_SAVE',
        message: 'Data simpanan rusak atau tidak lengkap',
        availableBackupsCount: backups.length,
      };
    }

    let candidateState: unknown = rawState;
    let candidateHeader: unknown = rawHeader;
    const stateObj =
      rawState && typeof rawState === 'object'
        ? (rawState as Record<string, unknown>)
        : {};
    const rawVersion =
      typeof stateObj.schemaVersion === 'number' ? stateObj.schemaVersion : 0;

    if (rawVersion < SCHEMA_VERSION) {
      // Snapshot raw un-migrated record as "pre_migration" before migrating
      const migrated = await migrateWithBackup<SaveStateRecord>(
        db,
        slotId,
        rawState,
        rawVersion,
        SCHEMA_VERSION,
        rawHeader
      );
      const parsedMigrated = SaveStateRecordSchema.omit({ sha256: true }).safeParse(
        migrated
      );
      if (parsedMigrated.success) {
        const newSha = await computeCanonicalSha256(parsedMigrated.data.payload);
        const v1State: SaveStateRecord = {
          ...parsedMigrated.data,
          sha256: newSha,
        };
        const v1Header = deriveSlotHeader(
          slotId,
          v1State.payload,
          newSha,
          this.now()
        );
        candidateState = v1State;
        candidateHeader = v1Header;

        if (!readOnly) {
          const tx = db.transaction(['slots', 'save_states'], 'readwrite');
          void tx.objectStore('slots').put(v1Header);
          void tx.objectStore('save_states').put(v1State);
          await tx.done;
        }
      } else {
        candidateState = migrated;
      }
    }

    const parsedState = SaveStateRecordSchema.safeParse(candidateState);
    if (!parsedState.success) {
      const backups = await this.listBackups(slotId);
      await this.recordTelemetry({
        kind: 'integrity_error',
        message: `Slot ${slotId} failed Zod schema validation`,
        details: { issues: parsedState.error.issues },
        createdAt: this.now(),
      });
      this.emitStatus({
        state: 'error',
        slotId,
        timestamp: this.now(),
        errorCode: 'CORRUPT_SAVE',
        message: 'Struktur data simpanan tidak valid',
        color: '#E0603F',
        recoveryAvailable: backups.length > 0,
        promptJsonExport: true,
      });
      return {
        ok: false,
        corrupted: true,
        readOnly,
        errorCode: 'CORRUPT_SAVE',
        message: 'Struktur data simpanan tidak valid',
        availableBackupsCount: backups.length,
      };
    }

    const expectedSha = await computeCanonicalSha256(parsedState.data.payload);
    if (parsedState.data.sha256 !== expectedSha) {
      const backups = await this.listBackups(slotId);
      await this.recordTelemetry({
        kind: 'integrity_error',
        message: `Slot ${slotId} SHA-256 mismatch`,
        details: {
          stored: parsedState.data.sha256,
          computed: expectedSha,
        },
        createdAt: this.now(),
      });
      this.emitStatus({
        state: 'error',
        slotId,
        timestamp: this.now(),
        errorCode: 'CORRUPT_SAVE',
        message: 'Checksum data simpanan tidak cocok (kemungkinan rusak)',
        color: '#E0603F',
        recoveryAvailable: backups.length > 0,
        promptJsonExport: true,
      });
      return {
        ok: false,
        corrupted: true,
        readOnly,
        errorCode: 'CORRUPT_SAVE',
        message: 'Checksum data simpanan tidak cocok (kemungkinan rusak)',
        availableBackupsCount: backups.length,
      };
    }

    const parsedHeader = SlotHeaderRecordSchema.safeParse(candidateHeader);
    const header =
      parsedHeader.success && parsedHeader.data.sha256 === expectedSha
        ? parsedHeader.data
        : deriveSlotHeader(slotId, parsedState.data.payload, expectedSha, this.now());

    return {
      ok: true,
      empty: false,
      readOnly,
      header,
      state: parsedState.data,
    };
  }

  public async createBackup(
    slotId: SlotId,
    reason: BackupReason
  ): Promise<BackupRecord | null> {
    const db = await this.init();
    const state = await db.get('save_states', slotId);
    if (!state) return null;
    const header = await db.get('slots', slotId);
    const sha256 =
      typeof (state as unknown as Record<string, unknown>).sha256 === 'string'
        ? ((state as unknown as Record<string, unknown>).sha256 as string)
        : '';
    const schemaVersion =
      typeof (state as unknown as Record<string, unknown>).schemaVersion === 'number'
        ? ((state as unknown as Record<string, unknown>).schemaVersion as number)
        : 0;

    return writeBackupSnapshot(db, {
      slotId,
      reason,
      schemaVersion,
      sha256,
      header,
      state,
      createdAt: this.now(),
    });
  }

  public async listBackups(slotId: SlotId): Promise<BackupRecord[]> {
    const db = await this.init();
    const items = await db.getAllFromIndex('backups', 'by_slot', slotId);
    return items.sort((a, b) => b.createdAt - a.createdAt || b.slotIndex - a.slotIndex);
  }

  /**
   * One-click corruption recovery from the newest valid rolling backup in `backups`.
   */
  public async restoreFromLatestBackup(slotId: SlotId): Promise<RestoreBackupResult> {
    const db = await this.init();
    const backups = await this.listBackups(slotId);

    for (const backup of backups) {
      let candidateState: unknown = backup.state;
      if (backup.schemaVersion < SCHEMA_VERSION) {
        try {
          candidateState = runMigrations(
            backup.state,
            backup.schemaVersion,
            SCHEMA_VERSION
          );
        } catch {
          continue;
        }
      }

      const parsedState = SaveStateRecordSchema.omit({ sha256: true }).safeParse(
        candidateState
      );
      if (!parsedState.success) {
        continue;
      }

      // Verify SHA-256 if backup was stored at current version with a digest
      const computedSha = await computeCanonicalSha256(parsedState.data.payload);
      if (
        backup.schemaVersion === SCHEMA_VERSION &&
        /^[a-f0-9]{64}$/.test(backup.sha256) &&
        backup.sha256 !== computedSha
      ) {
        // Backup itself was tampered/corrupt, skip to older backup
        continue;
      }

      const timestamp = this.now();
      const restoredState: SaveStateRecord = {
        schemaVersion: SCHEMA_VERSION,
        slotId,
        sha256: computedSha,
        payload: parsedState.data.payload,
      };
      const restoredHeader = deriveSlotHeader(
        slotId,
        restoredState.payload,
        computedSha,
        timestamp
      );

      try {
        const tx = db.transaction(['slots', 'save_states'], 'readwrite');
        void tx.objectStore('slots').put(restoredHeader);
        void tx.objectStore('save_states').put(restoredState);
        await tx.done;

        this.emitStatus({
          state: 'saved',
          slotId,
          timestamp,
          sha256: computedSha,
          message: 'Berhasil dipulihkan dari cadangan otomatis',
        });

        return {
          ok: true,
          backupId: backup.backupId,
          header: restoredHeader,
          state: restoredState,
        };
      } catch (err) {
        if (isQuotaExceededError(err)) {
          return {
            ok: false,
            errorCode: 'QUOTA_EXCEEDED',
            message: 'Penyimpanan penuh saat memulihkan cadangan',
          };
        }
        return {
          ok: false,
          errorCode: 'STORAGE_ERROR',
          message: err instanceof Error ? err.message : 'Gagal memulihkan cadangan',
        };
      }
    }

    return {
      ok: false,
      errorCode: 'NO_VALID_BACKUP',
      message: 'Tidak ditemukan cadangan yang valid untuk slot ini',
    };
  }

  public scheduleDebouncedSave(_reason: 'draft' | 'movement' = 'draft'): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushSnapshot();
    }, this.debounceMs);
  }

  public async flushImmediateSave(
    reason: ImmediateSaveReason
  ): Promise<SaveSlotResult | null> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (reason === 'settings_changed' && this.getSettingsSnapshot) {
      const settings = this.getSettingsSnapshot();
      if (settings) {
        await this.saveSettings(settings);
      }
    }

    return this.flushSnapshot();
  }

  private async flushSnapshot(): Promise<SaveSlotResult | null> {
    if (!this.getSnapshot) return null;
    const snap = this.getSnapshot();
    if (!snap) return null;

    const run = this.saveSlot(snap.slotId, snap.payload);
    this.pendingFlush = run;
    try {
      return await run;
    } finally {
      if (this.pendingFlush === run) {
        this.pendingFlush = null;
      }
    }
  }

  public attachLifecycleListeners(
    doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
    win: Window | undefined = typeof window !== 'undefined' ? window : undefined
  ): () => void {
    const onVisibilityChange = () => {
      if (doc?.visibilityState === 'hidden') {
        void this.flushImmediateSave('visibility_hidden');
      }
    };
    const onPageHide = () => {
      void this.flushImmediateSave('pagehide');
    };

    doc?.addEventListener('visibilitychange', onVisibilityChange);
    win?.addEventListener('pagehide', onPageHide);

    return () => {
      doc?.removeEventListener('visibilitychange', onVisibilityChange);
      win?.removeEventListener('pagehide', onPageHide);
    };
  }

  public async loadSettings(): Promise<GlobalSettingsRecord> {
    const db = await this.init();
    const raw = await db.get('settings', 'global');
    if (!raw) {
      return createDefaultGlobalSettings(this.now());
    }
    const parsed = GlobalSettingsRecordSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data;
    }
    return createDefaultGlobalSettings(this.now());
  }

  public async saveSettings(settings: GlobalSettingsRecord): Promise<void> {
    const db = await this.init();
    const validated = GlobalSettingsRecordSchema.parse({
      ...settings,
      id: 'global',
      schemaVersion: SCHEMA_VERSION,
      updatedAt: this.now(),
    });
    await db.put('settings', validated);
  }

  public async listSlotHeaders(): Promise<SlotHeaderRecord[]> {
    const db = await this.init();
    const all = await db.getAll('slots');
    return all.sort((a, b) => a.slotId - b.slotId);
  }

  public async deleteSlot(slotId: SlotId): Promise<void> {
    const db = await this.init();
    const backups = await db.getAllFromIndex('backups', 'by_slot', slotId);
    const tx = db.transaction(['slots', 'save_states', 'backups'], 'readwrite');
    void tx.objectStore('slots').delete(slotId);
    void tx.objectStore('save_states').delete(slotId);
    for (const b of backups) {
      void tx.objectStore('backups').delete(b.backupId);
    }
    await tx.done;
    await this.releaseSlotLock(slotId);
  }

  public async clearAllData(): Promise<void> {
    const db = await this.init();
    const tx = db.transaction(
      ['settings', 'slots', 'save_states', 'backups', 'local_telemetry'],
      'readwrite'
    );
    void tx.objectStore('settings').clear();
    void tx.objectStore('slots').clear();
    void tx.objectStore('save_states').clear();
    void tx.objectStore('backups').clear();
    void tx.objectStore('local_telemetry').clear();
    await tx.done;
    await this.tabLockManager.dispose();
  }

  public async recordTelemetry(entry: Omit<TelemetryRecord, 'id'>): Promise<void> {
    const db = await this.init();
    await db.add('local_telemetry', {
      ...entry,
      createdAt: entry.createdAt ?? this.now(),
    });

    // Enforce capped ring buffer <= 50 entries
    const allKeys = await db.getAllKeysFromIndex('local_telemetry', 'createdAt');
    if (allKeys.length > MAX_TELEMETRY_ENTRIES) {
      const excess = allKeys.length - MAX_TELEMETRY_ENTRIES;
      const tx = db.transaction('local_telemetry', 'readwrite');
      const store = tx.objectStore('local_telemetry');
      for (let i = 0; i < excess; i++) {
        const key = allKeys[i];
        if (key !== undefined) {
          void store.delete(key);
        }
      }
      await tx.done;
    }
  }

  public async listTelemetry(): Promise<TelemetryRecord[]> {
    const db = await this.init();
    const items = await db.getAllFromIndex('local_telemetry', 'createdAt');
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  public async dispose(): Promise<void> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.pendingFlush?.catch(() => undefined);
    await this.tabLockManager.dispose();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

function mapSaveReasonToImmediate(reason: SaveReason): ImmediateSaveReason {
  switch (reason) {
    case 'step_passed':
      return 'step_completed';
    case 'quest_completed':
      return 'quest_progressed';
    case 'anchor_reached':
      return 'island_transition';
    case 'settings_changed':
      return 'settings_changed';
    case 'pause_opened':
      return 'pause_opened';
    case 'visibility_hidden':
      return 'visibility_hidden';
    default:
      return 'manual';
  }
}

export function emitSaveStatusToEventBus(event: SaveStatusEvent): void {
  const mappedState: 'idle' | 'saving' | 'saved' | 'error' | 'readonly' =
    event.state === 'read_only'
      ? 'readonly'
      : event.state === 'quota_exceeded'
        ? 'error'
        : event.state;

  EventBus.emit('save.status', {
    state: mappedState,
    timestamp: event.timestamp,
    message: event.message,
  });

  if (event.state === 'saved') {
    useGameStore.getState().markClean();
  } else if (event.state === 'quota_exceeded' || event.errorCode === 'CORRUPT_SAVE') {
    EventBus.emit('toast.show', {
      id: event.errorCode,
      kind: 'error',
      message: event.message ?? 'Gagal menyimpan data permainan.',
      durationMs: 6000,
    });
  }
}

export function bindSaveManagerToStores(manager: SaveManager): () => void {
  const unsubSave = EventBus.on('save.requested', ({ reason, immediate }) => {
    if (immediate) {
      void manager.flushImmediateSave(mapSaveReasonToImmediate(reason));
    } else {
      manager.scheduleDebouncedSave('draft');
    }
  });
  const detachLifecycle = manager.attachLifecycleListeners();

  return () => {
    unsubSave();
    detachLifecycle();
  };
}

export function createStoreBoundSaveManager(
  overrides: Partial<SaveManagerOptions> = {}
): { manager: SaveManager; unbind: () => void } {
  const manager = new SaveManager({
    getSnapshot: () => {
      const state = useGameStore.getState();
      if (!state.activeSlotId) return null;
      return {
        slotId: state.activeSlotId,
        payload: state.exportSavePayload(),
      };
    },
    getSettingsSnapshot: () => useSettingsStore.getState().exportDTO(),
    onSaveStatus: (ev) => {
      emitSaveStatusToEventBus(ev);
      overrides.onSaveStatus?.(ev);
    },
    ...overrides,
  });
  const unbind = bindSaveManagerToStores(manager);
  return { manager, unbind };
}
