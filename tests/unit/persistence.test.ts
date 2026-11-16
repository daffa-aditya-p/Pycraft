import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOSAVE_DEBOUNCE_MS,
  EXPORT_MAGIC,
  LEASE_REFRESH_MS,
  LEASE_TTL_MS,
  MAX_IMPORT_BYTES,
  MAX_TELEMETRY_ENTRIES,
  SCHEMA_VERSION,
  SaveManager,
  TabLockManager,
  canonicalJsonStringify,
  commitImportedBundle,
  computeCanonicalSha256,
  createDefaultGlobalSettings,
  createDefaultSavePayload,
  exportSlotBundle,
  formatExportFilename,
  openPycraftDb,
  runMigrations,
  serializeExportBundle,
  sha256PureTs,
  validateAndPreviewImport,
  type BroadcastChannelLike,
  type LockManagerLike,
  type PycraftDB,
  type SaveStatusEvent,
  type StorageLike,
} from '../../src/persistence';

let dbCounter = 0;
function nextDbName(): string {
  dbCounter += 1;
  return `pycraft_test_db_${Date.now()}_${dbCounter}`;
}

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

class MockBroadcastBus {
  private channels = new Map<string, Set<MockBroadcastChannel>>();

  create(name: string): MockBroadcastChannel {
    const ch = new MockBroadcastChannel(name, this);
    let set = this.channels.get(name);
    if (!set) {
      set = new Set();
      this.channels.set(name, set);
    }
    set.add(ch);
    return ch;
  }

  broadcast(name: string, sender: MockBroadcastChannel, data: unknown): void {
    const set = this.channels.get(name);
    if (!set) return;
    for (const target of set) {
      if (target !== sender && target.onmessage) {
        target.onmessage({ data } as MessageEvent);
      }
    }
  }

  remove(name: string, ch: MockBroadcastChannel): void {
    this.channels.get(name)?.delete(ch);
  }
}

class MockBroadcastChannel implements BroadcastChannelLike {
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(
    private readonly name: string,
    private readonly bus: MockBroadcastBus
  ) {}
  postMessage(message: unknown): void {
    this.bus.broadcast(this.name, this, message);
  }
  close(): void {
    this.bus.remove(this.name, this);
  }
}

class MockLockManager implements LockManagerLike {
  private held = new Set<string>();

  async request<T>(
    name: string,
    options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean },
    callback: (lock: unknown | null) => Promise<T>
  ): Promise<T> {
    if (this.held.has(name)) {
      if (options.ifAvailable) {
        return callback(null);
      }
      throw new Error(`Lock ${name} already held`);
    }
    this.held.add(name);
    try {
      return await callback({ name, mode: options.mode ?? 'exclusive' });
    } finally {
      this.held.delete(name);
    }
  }
}

describe('PYCRAFT IndexedDB Persistence (T-DB-01 & T-DB-02)', () => {
  const managers: SaveManager[] = [];
  const dbs: PycraftDB[] = [];

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    while (managers.length > 0) {
      await managers.pop()?.dispose();
    }
    while (dbs.length > 0) {
      dbs.pop()?.close();
    }
  });

  it('opens pycraft_db v1 with all 5 required object stores and indexes', async () => {
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);

    expect(Array.from(db.objectStoreNames).sort()).toEqual([
      'backups',
      'local_telemetry',
      'save_states',
      'settings',
      'slots',
    ]);

    const tx = db.transaction(
      ['slots', 'backups', 'local_telemetry'],
      'readonly'
    );
    expect(tx.objectStore('slots').indexNames.contains('updatedAt')).toBe(true);
    expect(tx.objectStore('backups').indexNames.contains('by_slot')).toBe(true);
    expect(tx.objectStore('local_telemetry').indexNames.contains('createdAt')).toBe(
      true
    );
    await tx.done;
  });

  it('computes identical canonical SHA-256 digests across WebCrypto and pure-TS fallback', async () => {
    const a = { z: 1, a: { d: 'halo', b: [1, undefined, 2] }, c: true };
    const b = { c: true, a: { b: [1, undefined, 2], d: 'halo' }, z: 1 };

    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));

    const webCryptoHash = await computeCanonicalSha256(a);
    const webCryptoHashB = await computeCanonicalSha256(b);
    expect(webCryptoHash).toMatch(/^[a-f0-9]{64}$/);
    expect(webCryptoHash).toBe(webCryptoHashB);

    const bytes = new TextEncoder().encode(canonicalJsonStringify(a));
    const pureHash = sha256PureTs(bytes);
    expect(pureHash).toBe(webCryptoHash);
  });

  it('executes Pre-Transaction SHA-256 pipeline before opening IDB transaction and saves atomically', async () => {
    const dbName = nextDbName();
    const db = await openPycraftDb(dbName);
    dbs.push(db);

    const callOrder: string[] = [];
    const origTx = db.transaction.bind(db);
    vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
      callOrder.push('idb.transaction');
      return (origTx as (...a: unknown[]) => unknown)(...args) as ReturnType<
        typeof origTx
      >;
    }) as typeof db.transaction);

    if (globalThis.crypto?.subtle) {
      const origDigest = globalThis.crypto.subtle.digest.bind(
        globalThis.crypto.subtle
      );
      vi.spyOn(globalThis.crypto.subtle, 'digest').mockImplementation(
        async (alg, data) => {
          callOrder.push('sha256.digest');
          return origDigest(alg, data);
        }
      );
    }

    const persistMock = vi.fn().mockResolvedValue(true);
    const statuses: SaveStatusEvent[] = [];
    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
      storagePersist: persistMock,
      onSaveStatus: (ev) => statuses.push(ev),
    });
    managers.push(manager);

    const payload = createDefaultSavePayload('Nadia', { skinTone: 2 });
    payload.learning.xp = 320;
    payload.learning.rank = 2;

    const saveRes = await manager.saveSlot(1, payload);
    expect(saveRes.ok).toBe(true);
    expect(persistMock).toHaveBeenCalledTimes(1);

    // SHA-256 digest MUST complete before the ['slots', 'save_states'] transaction opens
    if (callOrder.includes('sha256.digest')) {
      expect(callOrder.indexOf('sha256.digest')).toBeLessThan(
        callOrder.indexOf('idb.transaction')
      );
    }

    const header = await db.get('slots', 1);
    const state = await db.get('save_states', 1);
    expect(header?.playerName).toBe('Nadia');
    expect(header?.xp).toBe(320);
    expect(header?.sha256).toBe(state?.sha256);
    expect(statuses.some((s) => s.state === 'saved')).toBe(true);

    // Second save should not re-call navigator.storage.persist()
    await manager.saveSlot(1, payload);
    expect(persistMock).toHaveBeenCalledTimes(1);
  });

  it('detects SHA-256 tampering and Zod corruption, and recovers in 1 click from latest valid backup', async () => {
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);
    const statuses: SaveStatusEvent[] = [];

    let clock = 1_000_000;
    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
      onSaveStatus: (ev) => statuses.push(ev),
      now: () => clock,
    });
    managers.push(manager);

    const payload = createDefaultSavePayload('Bima');
    payload.learning.xp = 150;
    await manager.saveSlot(1, payload);

    clock += 5000;
    payload.learning.xp = 450;
    await manager.saveSlot(1, payload, { createPeriodicBackup: true });

    // Tamper with save_states XP directly in IDB without updating sha256
    const raw = await db.get('save_states', 1);
    expect(raw).toBeDefined();
    raw!.payload.learning.xp = 99999;
    await db.put('save_states', raw!);

    const corruptLoad = await manager.loadSlot(1);
    expect(corruptLoad.ok).toBe(false);
    expect(corruptLoad.corrupted).toBe(true);
    expect(corruptLoad.errorCode).toBe('CORRUPT_SAVE');
    expect(corruptLoad.availableBackupsCount).toBeGreaterThan(0);
    expect(statuses.some((s) => s.state === 'error' && s.color === '#E0603F')).toBe(
      true
    );

    // 1-click corruption recovery
    const restored = await manager.restoreFromLatestBackup(1);
    expect(restored.ok).toBe(true);
    expect(restored.state?.payload.learning.xp).toBe(450);

    const cleanLoad = await manager.loadSlot(1);
    expect(cleanLoad.ok).toBe(true);
    expect(cleanLoad.state?.payload.learning.xp).toBe(450);

    // Also verify Zod schema rejection when record shape is malformed
    await db.put('save_states', {
      schemaVersion: 1,
      slotId: 1,
      sha256: 'bad',
      payload: {} as never,
    });
    const invalidZodLoad = await manager.loadSlot(1);
    expect(invalidZodLoad.ok).toBe(false);
    expect(invalidZodLoad.corrupted).toBe(true);
  });

  it('rotates rolling backups across 3 slots (${slotId}_0..2)', async () => {
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);
    let clock = 10_000;
    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
      now: () => (clock += 1000),
    });
    managers.push(manager);

    const payload = createDefaultSavePayload('Rani');
    await manager.saveSlot(2, payload); // creates baseline backup at 2_0

    for (let i = 1; i <= 4; i++) {
      payload.learning.xp = i * 100;
      await manager.saveSlot(2, payload);
      await manager.createBackup(2, 'manual');
    }

    const backups = await manager.listBackups(2);
    expect(backups).toHaveLength(3);
    expect(backups.map((b) => b.backupId).sort()).toEqual(['2_0', '2_1', '2_2']);
    // Newest backup should have latest XP = 400
    expect(
      (backups[0]?.state as { payload: { learning: { xp: number } } } | undefined)
        ?.payload.learning.xp
    ).toBe(400);
  });

  it('handles QuotaExceededError by emitting red status and prompting JSON export', async () => {
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);
    const statuses: SaveStatusEvent[] = [];

    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
      onSaveStatus: (ev) => statuses.push(ev),
    });
    managers.push(manager);

    vi.spyOn(db, 'transaction').mockImplementationOnce(() => {
      const err = new Error('Storage quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    });

    const res = await manager.saveSlot(1, createDefaultSavePayload('Sari'));
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe('QUOTA_EXCEEDED');
    expect(res.promptJsonExport).toBe(true);

    const quotaEv = statuses.find((s) => s.state === 'quota_exceeded');
    expect(quotaEv).toBeDefined();
    expect(quotaEv?.color).toBe('#E0603F');
    expect(quotaEv?.promptJsonExport).toBe(true);
  });

  it('migrates v0 records sequentially and idempotently, creating a pre_migration backup', async () => {
    const legacyV0 = {
      schemaVersion: 0,
      slotId: 3,
      payload: {
        profile: { name: 'Tama', createdAt: 12345, playtimeSeconds: 90 },
        world: { regionId: 'awakening', islandId: 'beacon', playerPosition: [4, 3, -2] },
        quests: { states: { prologue: 'completed', m1: 'active' }, completedStepIds: ['1.1'] },
        learning: { xp: 200, rank: 2 },
        inventory: { items: { blue_crystal: 3 } },
      },
    };

    // Direct runner idempotency test
    const migratedOnce = runMigrations(legacyV0, 0, SCHEMA_VERSION);
    const migratedTwice = runMigrations(migratedOnce, 1, SCHEMA_VERSION);
    const migratedIdempotent = runMigrations(migratedOnce, 0, SCHEMA_VERSION);
    expect(migratedTwice).toEqual(migratedOnce);
    expect(migratedIdempotent).toEqual(migratedOnce);

    // Full SaveManager v0 -> v1 load migration with pre_migration backup
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);
    await db.put('save_states', legacyV0 as never);

    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
    });
    managers.push(manager);

    const loaded = await manager.loadSlot(3);
    expect(loaded.ok).toBe(true);
    expect(loaded.state?.schemaVersion).toBe(1);
    expect(loaded.state?.payload.profile.name).toBe('Tama');
    expect(loaded.state?.payload.world.discoveredLoreNoteIds).toEqual([]);
    expect(loaded.state?.payload.profile.cosmetics.bitPaint).toBe('moss');
    expect(loaded.state?.sha256).toMatch(/^[a-f0-9]{64}$/);

    const backups = await manager.listBackups(3);
    expect(backups.some((b) => b.reason === 'pre_migration' && b.schemaVersion === 0)).toBe(
      true
    );
  });

  it('supports .pycraft.json export/import round-trip, tamper/size rejection, and pre_overwrite backup', async () => {
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);
    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
    });
    managers.push(manager);

    const slot1Payload = createDefaultSavePayload('Kira');
    slot1Payload.learning.xp = 650;
    slot1Payload.learning.rank = 3;
    slot1Payload.world.restoredZoneIds = ['shrine', 'beacon'];
    await manager.saveSlot(1, slot1Payload);

    const slot2Payload = createDefaultSavePayload('OldHero');
    slot2Payload.learning.xp = 50;
    await manager.saveSlot(2, slot2Payload);

    const filename = formatExportFilename(1, new Date('2026-11-13T00:00:00Z'));
    expect(filename).toBe('pycraft-slot-1-20261113.pycraft.json');

    const bundle = await exportSlotBundle(db, 1);
    expect(bundle.magic).toBe(EXPORT_MAGIC);
    const jsonText = serializeExportBundle(bundle);

    const previewRes = await validateAndPreviewImport(jsonText);
    expect(previewRes.ok).toBe(true);
    if (previewRes.ok) {
      expect(previewRes.preview.playerName).toBe('Kira');
      expect(previewRes.preview.xp).toBe(650);

      // Import into occupied slot 2 -> must create pre_overwrite backup first
      const commitRes = await commitImportedBundle(manager, 2, previewRes.bundle);
      expect(commitRes.ok).toBe(true);
      const slot2Backups = await manager.listBackups(2);
      expect(slot2Backups.some((b) => b.reason === 'pre_overwrite')).toBe(true);

      const loadedSlot2 = await manager.loadSlot(2);
      expect(loadedSlot2.ok).toBe(true);
      expect(loadedSlot2.state?.payload.profile.name).toBe('Kira');
      expect(loadedSlot2.state?.payload.world.restoredZoneIds).toEqual([
        'shrine',
        'beacon',
      ]);
    }

    // Reject oversized (> 1 MB)
    const oversized = new Uint8Array(MAX_IMPORT_BYTES + 1);
    const tooBig = await validateAndPreviewImport(oversized);
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.errorCode).toBe('FILE_TOO_LARGE');

    // Reject wrong magic
    const wrongMagic = JSON.stringify({ ...bundle, magic: 'OTHER_GAME' });
    const badMagicRes = await validateAndPreviewImport(wrongMagic);
    expect(badMagicRes.ok).toBe(false);
    if (!badMagicRes.ok) expect(badMagicRes.errorCode).toBe('INVALID_MAGIC');

    // Reject tampered payload (SHA-256 mismatch)
    const tampered = structuredClone(bundle);
    tampered.payload.learning.xp = 9999;
    const tamperedRes = await validateAndPreviewImport(JSON.stringify(tampered));
    expect(tamperedRes.ok).toBe(false);
    if (!tamperedRes.ok) expect(tamperedRes.errorCode).toBe('CHECKSUM_MISMATCH');
  });

  it('enforces multi-tab lock contention via Web Locks and localStorage + BroadcastChannel fallback', async () => {
    // 1. Web Locks contention
    const sharedLocks = new MockLockManager();
    const bus = new MockBroadcastBus();

    const lockMgrA = new TabLockManager({
      tabId: 'tab-A',
      locks: sharedLocks,
      storage: null,
      createChannel: (name) => bus.create(name),
    });
    const lockMgrB = new TabLockManager({
      tabId: 'tab-B',
      locks: sharedLocks,
      storage: null,
      createChannel: (name) => bus.create(name),
    });

    const lockA = await lockMgrA.acquire(1);
    expect(lockA.acquired).toBe(true);
    expect(lockA.readOnly).toBe(false);
    expect(lockA.mechanism).toBe('web_locks');

    const lockB = await lockMgrB.acquire(1);
    expect(lockB.acquired).toBe(false);
    expect(lockB.readOnly).toBe(true);
    expect(lockB.mechanism).toBe('web_locks');

    // SaveManager on Tab B refuses write while Read-Only
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);
    const managerB = new SaveManager({ db, tabLockManager: lockMgrB });
    managers.push(managerB);
    const blockedSave = await managerB.saveSlot(1, createDefaultSavePayload('TabB'));
    expect(blockedSave.ok).toBe(false);
    expect(blockedSave.errorCode).toBe('READ_ONLY_TAB');

    await lockA.release();
    const lockBAfter = await lockMgrB.acquire(1);
    expect(lockBAfter.acquired).toBe(true);
    expect(lockBAfter.readOnly).toBe(false);

    await lockMgrA.dispose();
    await lockMgrB.dispose();

    // 2. localStorage heartbeat lease (3000 ms TTL, 1000 ms refresh) + BroadcastChannel fallback
    vi.useFakeTimers();
    const sharedStorage = new MemoryStorage();
    const fallbackBus = new MockBroadcastBus();
    let nowMs = 10_000;
    const readOnlyEvents: Array<{ tab: string; readOnly: boolean }> = [];

    const fbA = new TabLockManager({
      tabId: 'fb-A',
      forceFallback: true,
      storage: sharedStorage,
      createChannel: (name) => fallbackBus.create(name),
      now: () => nowMs,
      onReadOnlyChange: (ro) => readOnlyEvents.push({ tab: 'A', readOnly: ro }),
    });
    const fbB = new TabLockManager({
      tabId: 'fb-B',
      forceFallback: true,
      storage: sharedStorage,
      createChannel: (name) => fallbackBus.create(name),
      now: () => nowMs,
      onReadOnlyChange: (ro) => readOnlyEvents.push({ tab: 'B', readOnly: ro }),
    });

    const fbLockA = await fbA.acquire(2);
    expect(fbLockA.acquired).toBe(true);
    expect(fbLockA.mechanism).toBe('local_storage_lease');

    // Advance 2500 ms (past half TTL, triggering 1000 ms heartbeat refreshes)
    nowMs += 2500;
    vi.advanceTimersByTime(LEASE_REFRESH_MS * 2);

    // Tab B should STILL see Tab A's active refreshed lease and enter Read-Only
    const fbLockB = await fbB.acquire(2);
    expect(fbLockB.acquired).toBe(false);
    expect(fbLockB.readOnly).toBe(true);
    expect(readOnlyEvents.some((e) => e.tab === 'B' && e.readOnly)).toBe(true);

    // Simulate Tab A crashing (stop its timers without calling release) and advance past 3000 ms TTL
    await fbA.dispose();
    nowMs += LEASE_TTL_MS + 100;
    const fbLockBReclaimed = await fbB.acquire(2);
    expect(fbLockBReclaimed.acquired).toBe(true);
    expect(fbLockBReclaimed.readOnly).toBe(false);

    await fbB.dispose();
  });

  it('debounces draft/movement autosaves (2000 ms), flushes immediately on events and lifecycle hooks, retains settings on slot delete, and caps telemetry at 50', async () => {
    const db = await openPycraftDb(nextDbName());
    dbs.push(db);

    let currentXp = 10;
    const manager = new SaveManager({
      db,
      tabLockManager: new TabLockManager({
        forceFallback: true,
        storage: new MemoryStorage(),
        createChannel: () => null,
      }),
      getSnapshot: () => {
        const p = createDefaultSavePayload('Dewi');
        p.learning.xp = currentXp;
        return { slotId: 1, payload: p };
      },
    });
    managers.push(manager);

    // 1. Verify exact 2,000 ms debounce timing using fake timers on the scheduler
    const saveSpy = vi.spyOn(manager, 'saveSlot').mockResolvedValue({ ok: true });
    vi.useFakeTimers();

    manager.scheduleDebouncedSave('draft');
    vi.advanceTimersByTime(1500);
    expect(saveSpy).not.toHaveBeenCalled();

    // Subsequent movement update resets the 2,000 ms debounce window
    currentXp = 25;
    manager.scheduleDebouncedSave('movement');
    vi.advanceTimersByTime(1500);
    expect(saveSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1500);
    expect(saveSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    saveSpy.mockRestore();

    // 2. Verify real IDB persistence on immediate flush and lifecycle listeners (visibilitychange & pagehide)
    currentXp = 99;
    manager.scheduleDebouncedSave('draft');
    await manager.flushImmediateSave('step_completed');
    expect((await db.get('save_states', 1))?.payload.learning.xp).toBe(99);

    const fakeDoc = new EventTarget() as Document & { visibilityState: DocumentVisibilityState };
    fakeDoc.visibilityState = 'hidden';
    const fakeWin = new EventTarget() as Window;
    const detach = manager.attachLifecycleListeners(fakeDoc, fakeWin);

    currentXp = 120;
    fakeDoc.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 50));
    expect((await db.get('save_states', 1))?.payload.learning.xp).toBe(120);

    currentXp = 145;
    fakeWin.dispatchEvent(new Event('pagehide'));
    await new Promise((r) => setTimeout(r, 50));
    expect((await db.get('save_states', 1))?.payload.learning.xp).toBe(145);
    detach();

    // 3. Global settings retained across slot deletion
    const settings = createDefaultGlobalSettings();
    settings.locale = 'en';
    await manager.saveSettings(settings);
    await manager.deleteSlot(1);
    expect(await db.get('save_states', 1)).toBeUndefined();
    expect((await manager.loadSettings()).locale).toBe('en');

    // 4. Telemetry ring buffer capped at 50 entries
    for (let i = 0; i < 60; i++) {
      await manager.recordTelemetry({
        kind: 'info',
        message: `event_${i}`,
        createdAt: 1000 + i,
      });
    }
    const telemetry = await manager.listTelemetry();
    expect(telemetry).toHaveLength(MAX_TELEMETRY_ENTRIES);
    expect(telemetry[0]?.message).toBe('event_59');
  });
});
