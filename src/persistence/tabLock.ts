import type { SlotId } from './schema';

export const TAB_LOCK_PREFIX = 'pycraft_slot_' as const;
export const LEASE_KEY_PREFIX = 'pycraft_lease_slot_' as const;
export const TAB_BROADCAST_CHANNEL = 'pycraft_tabs' as const;
export const LEASE_TTL_MS = 3000;
export const LEASE_REFRESH_MS = 1000;

export type LockMechanism = 'web_locks' | 'local_storage_lease';

export interface LeasePayload {
  tabId: string;
  slotId: SlotId;
  acquiredAt: number;
  expiresAt: number;
}

export interface TabBroadcastMessage {
  type: 'slot_claimed' | 'slot_released' | 'slot_busy';
  slotId: SlotId;
  tabId: string;
  timestamp: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BroadcastChannelLike {
  postMessage(message: unknown): void;
  addEventListener?(type: 'message', listener: (ev: MessageEvent) => void): void;
  removeEventListener?(type: 'message', listener: (ev: MessageEvent) => void): void;
  onmessage: ((ev: MessageEvent) => void) | null;
  close(): void;
}

export interface LockManagerLike {
  request<T = unknown>(
    name: string,
    options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean },
    callback: (lock: unknown | null) => Promise<T>
  ): Promise<T>;
}

export interface TabLockOptions {
  tabId?: string;
  forceFallback?: boolean;
  locks?: LockManagerLike | null;
  storage?: StorageLike | null;
  createChannel?: (name: string) => BroadcastChannelLike | null;
  now?: () => number;
  onReadOnlyChange?: (readOnly: boolean, slotId: SlotId, reason?: string) => void;
}

export interface SlotLockState {
  slotId: SlotId;
  acquired: boolean;
  readOnly: boolean;
  mechanism: LockMechanism;
  tabId: string;
  reason?: string;
  release(): Promise<void>;
}

function generateTabId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSlotLockName(slotId: SlotId): string {
  return `${TAB_LOCK_PREFIX}${slotId}`;
}

export function getSlotLeaseKey(slotId: SlotId): string {
  return `${LEASE_KEY_PREFIX}${slotId}`;
}

export class TabLockManager {
  public readonly tabId: string;
  private readonly forceFallback: boolean;
  private readonly locks: LockManagerLike | null;
  private readonly storage: StorageLike | null;
  private readonly createChannel: (name: string) => BroadcastChannelLike | null;
  private readonly now: () => number;
  private readonly onReadOnlyChange?: (
    readOnly: boolean,
    slotId: SlotId,
    reason?: string
  ) => void;

  private channel: BroadcastChannelLike | null = null;
  private activeWebLocks = new Map<SlotId, () => void>();
  private activeLeases = new Map<SlotId, ReturnType<typeof setInterval>>();
  private readOnlySlots = new Set<SlotId>();
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor(options: TabLockOptions = {}) {
    this.tabId = options.tabId ?? generateTabId();
    this.forceFallback = options.forceFallback ?? false;
    this.locks =
      options.locks !== undefined
        ? options.locks
        : typeof navigator !== 'undefined' && navigator.locks
          ? (navigator.locks as unknown as LockManagerLike)
          : null;
    this.storage =
      options.storage !== undefined
        ? options.storage
        : typeof localStorage !== 'undefined'
          ? localStorage
          : null;
    this.createChannel =
      options.createChannel ??
      ((name: string) =>
        typeof BroadcastChannel !== 'undefined'
          ? (new BroadcastChannel(name) as unknown as BroadcastChannelLike)
          : null);
    this.now = options.now ?? (() => Date.now());
    this.onReadOnlyChange = options.onReadOnlyChange;

    this.initListeners();
  }

  private initListeners(): void {
    try {
      this.channel = this.createChannel(TAB_BROADCAST_CHANNEL);
      if (this.channel) {
        this.channel.onmessage = (ev: MessageEvent) => {
          this.handleBroadcastMessage(ev.data);
        };
      }
    } catch {
      this.channel = null;
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      this.storageListener = (ev: StorageEvent) => {
        if (!ev.key || !ev.key.startsWith(LEASE_KEY_PREFIX)) return;
        const slotNum = Number(ev.key.slice(LEASE_KEY_PREFIX.length));
        if (slotNum !== 1 && slotNum !== 2 && slotNum !== 3) return;
        const slotId = slotNum as SlotId;

        if (!ev.newValue) {
          return;
        }
        try {
          const parsed = JSON.parse(ev.newValue) as LeasePayload;
          if (
            parsed.tabId !== this.tabId &&
            parsed.expiresAt > this.now() &&
            this.activeLeases.has(slotId)
          ) {
            this.demoteToReadOnly(slotId, 'Slot diambil alih oleh tab lain');
          }
        } catch {
          // ignore malformed storage entry
        }
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  private handleBroadcastMessage(raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as Partial<TabBroadcastMessage>;
    if (msg.tabId === this.tabId) return;
    if (msg.slotId !== 1 && msg.slotId !== 2 && msg.slotId !== 3) return;

    const slotId = msg.slotId;

    if (msg.type === 'slot_claimed') {
      if (this.hasActiveWriteLock(slotId)) {
        // Tell the other tab this slot is already active here
        this.postBroadcast({
          type: 'slot_busy',
          slotId,
          tabId: this.tabId,
          timestamp: this.now(),
        });
      }
    } else if (msg.type === 'slot_busy') {
      if (!this.hasActiveWriteLock(slotId) && !this.readOnlySlots.has(slotId)) {
        this.readOnlySlots.add(slotId);
        this.onReadOnlyChange?.(true, slotId, 'Slot ini sedang dimainkan di tab lain');
      }
    } else if (msg.type === 'slot_released') {
      if (this.readOnlySlots.has(slotId)) {
        this.readOnlySlots.delete(slotId);
        this.onReadOnlyChange?.(false, slotId, 'Tab lain telah menutup slot ini');
      }
    }
  }

  private postBroadcast(msg: TabBroadcastMessage): void {
    try {
      this.channel?.postMessage(msg);
    } catch {
      // BroadcastChannel may be closed
    }
  }

  private demoteToReadOnly(slotId: SlotId, reason: string): void {
    const timer = this.activeLeases.get(slotId);
    if (timer !== undefined) {
      clearInterval(timer);
      this.activeLeases.delete(slotId);
    }
    this.readOnlySlots.add(slotId);
    this.onReadOnlyChange?.(true, slotId, reason);
  }

  public hasActiveWriteLock(slotId: SlotId): boolean {
    return this.activeWebLocks.has(slotId) || this.activeLeases.has(slotId);
  }

  public isReadOnly(slotId: SlotId): boolean {
    return this.readOnlySlots.has(slotId);
  }

  public async acquire(slotId: SlotId): Promise<SlotLockState> {
    if (!this.forceFallback && this.locks && typeof this.locks.request === 'function') {
      return this.acquireWithWebLocks(slotId);
    }
    return this.acquireWithLeaseFallback(slotId);
  }

  private acquireWithWebLocks(slotId: SlotId): Promise<SlotLockState> {
    if (this.activeWebLocks.has(slotId)) {
      this.readOnlySlots.delete(slotId);
      return Promise.resolve({
        slotId,
        acquired: true,
        readOnly: false,
        mechanism: 'web_locks',
        tabId: this.tabId,
        release: () => this.release(slotId),
      });
    }

    const lockName = getSlotLockName(slotId);

    return new Promise<SlotLockState>((resolve) => {
      let settled = false;
      this.locks!.request(lockName, { mode: 'exclusive', ifAvailable: true }, (lock) => {
        if (!lock) {
          this.readOnlySlots.add(slotId);
          this.onReadOnlyChange?.(true, slotId, 'Slot ini sedang dimainkan di tab lain');
          settled = true;
          resolve({
            slotId,
            acquired: false,
            readOnly: true,
            mechanism: 'web_locks',
            tabId: this.tabId,
            reason: 'Slot ini sedang dimainkan di tab lain',
            release: () => this.release(slotId),
          });
          return Promise.resolve();
        }

        return new Promise<void>((releaseLock) => {
          this.activeWebLocks.set(slotId, releaseLock);
          this.readOnlySlots.delete(slotId);
          this.onReadOnlyChange?.(false, slotId);
          this.postBroadcast({
            type: 'slot_claimed',
            slotId,
            tabId: this.tabId,
            timestamp: this.now(),
          });
          settled = true;
          resolve({
            slotId,
            acquired: true,
            readOnly: false,
            mechanism: 'web_locks',
            tabId: this.tabId,
            release: () => this.release(slotId),
          });
        });
      }).catch(() => {
        if (!settled) {
          // If Web Locks throws (e.g., restricted context), fall back deterministically
          resolve(this.acquireWithLeaseFallback(slotId));
        }
      });
    });
  }

  private acquireWithLeaseFallback(slotId: SlotId): SlotLockState {
    if (this.activeLeases.has(slotId)) {
      this.readOnlySlots.delete(slotId);
      return {
        slotId,
        acquired: true,
        readOnly: false,
        mechanism: 'local_storage_lease',
        tabId: this.tabId,
        release: () => this.release(slotId),
      };
    }

    const key = getSlotLeaseKey(slotId);
    const currentNow = this.now();

    if (this.storage) {
      const existingRaw = this.storage.getItem(key);
      if (existingRaw) {
        try {
          const existing = JSON.parse(existingRaw) as Partial<LeasePayload>;
          if (
            typeof existing.tabId === 'string' &&
            existing.tabId !== this.tabId &&
            typeof existing.expiresAt === 'number' &&
            existing.expiresAt > currentNow
          ) {
            this.readOnlySlots.add(slotId);
            const reason = 'Slot ini sedang dimainkan di tab lain';
            this.onReadOnlyChange?.(true, slotId, reason);
            this.postBroadcast({
              type: 'slot_claimed',
              slotId,
              tabId: this.tabId,
              timestamp: currentNow,
            });
            return {
              slotId,
              acquired: false,
              readOnly: true,
              mechanism: 'local_storage_lease',
              tabId: this.tabId,
              reason,
              release: () => this.release(slotId),
            };
          }
        } catch {
          // Corrupt lease entry can be reclaimed
        }
      }

      const writeLease = () => {
        const ts = this.now();
        const payload: LeasePayload = {
          tabId: this.tabId,
          slotId,
          acquiredAt: currentNow,
          expiresAt: ts + LEASE_TTL_MS,
        };
        this.storage?.setItem(key, JSON.stringify(payload));
      };

      writeLease();

      const interval = setInterval(() => {
        // Verify we still own the lease before refreshing
        const raw = this.storage?.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<LeasePayload>;
            if (parsed.tabId && parsed.tabId !== this.tabId && (parsed.expiresAt ?? 0) > this.now()) {
              this.demoteToReadOnly(slotId, 'Slot diambil alih oleh tab lain');
              return;
            }
          } catch {
            // rewrite lease
          }
        }
        writeLease();
      }, LEASE_REFRESH_MS);

      this.activeLeases.set(slotId, interval);
    }

    this.readOnlySlots.delete(slotId);
    this.onReadOnlyChange?.(false, slotId);
    this.postBroadcast({
      type: 'slot_claimed',
      slotId,
      tabId: this.tabId,
      timestamp: currentNow,
    });

    return {
      slotId,
      acquired: true,
      readOnly: false,
      mechanism: 'local_storage_lease',
      tabId: this.tabId,
      release: () => this.release(slotId),
    };
  }

  public async release(slotId: SlotId): Promise<void> {
    let released = false;

    const webLockRelease = this.activeWebLocks.get(slotId);
    if (webLockRelease) {
      this.activeWebLocks.delete(slotId);
      webLockRelease();
      released = true;
    }

    const leaseTimer = this.activeLeases.get(slotId);
    if (leaseTimer !== undefined) {
      clearInterval(leaseTimer);
      this.activeLeases.delete(slotId);
      released = true;
    }

    if (this.storage) {
      const key = getSlotLeaseKey(slotId);
      const raw = this.storage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<LeasePayload>;
          if (parsed.tabId === this.tabId) {
            this.storage.removeItem(key);
            released = true;
          }
        } catch {
          this.storage.removeItem(key);
        }
      }
    }

    this.readOnlySlots.delete(slotId);

    if (released) {
      this.postBroadcast({
        type: 'slot_released',
        slotId,
        tabId: this.tabId,
        timestamp: this.now(),
      });
    }
  }

  public async dispose(): Promise<void> {
    const heldSlots = new Set<SlotId>([
      ...this.activeWebLocks.keys(),
      ...this.activeLeases.keys(),
    ]);
    for (const slotId of heldSlots) {
      await this.release(slotId);
    }
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    try {
      this.channel?.close();
    } catch {
      // ignore
    }
    this.channel = null;
  }
}
