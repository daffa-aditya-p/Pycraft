import { EventBus } from '../../stores/EventBus';
import { computeRankFromXP, RANK_THRESHOLDS } from '../../stores/useGameStore';
import type { Locale } from '../../mentor/types';

export interface CosmeticItem {
  id: string;
  category: 'bit_paint' | 'bit_accessory' | 'neo_visor' | 'architect_scarf';
  value: string;
  name: { id: string; en: string };
  unlockCondition: { id: string; en: string };
  swatchHex: string;
}

export const COSMETIC_CATALOG: readonly CosmeticItem[] = [
  {
    id: 'bit_paint_moss',
    category: 'bit_paint',
    value: 'moss',
    name: { id: 'Cat BIT: Lumut', en: 'BIT Paint: Moss' },
    unlockCondition: { id: 'Bawaan awal', en: 'Starter default' },
    swatchHex: '#64923C',
  },
  {
    id: 'bit_paint_clay',
    category: 'bit_paint',
    value: 'clay',
    name: { id: 'Cat BIT: Terakota', en: 'BIT Paint: Clay' },
    unlockCondition: { id: 'Bonus Misi 2: Pengumpul Data', en: 'Mission 2 Bonus: Data Collector' },
    swatchHex: '#B4533C',
  },
  {
    id: 'bit_paint_slate',
    category: 'bit_paint',
    value: 'slate',
    name: { id: 'Cat BIT: Batu Sabak', en: 'BIT Paint: Slate' },
    unlockCondition: { id: 'Capai Peringkat Pembangun (600 XP)', en: 'Reach Builder Rank (600 XP)' },
    swatchHex: '#55595D',
  },
  {
    id: 'bit_paint_sky',
    category: 'bit_paint',
    value: 'sky',
    name: { id: 'Cat BIT: Biru Langit', en: 'BIT Paint: Sky' },
    unlockCondition: { id: 'Pulihkan Serpihan Inti Kebangkitan', en: 'Restore Awakening Core Shard' },
    swatchHex: '#4CD7E0',
  },
  {
    id: 'bit_acc_lantern',
    category: 'bit_accessory',
    value: 'lantern',
    name: { id: 'Aksesori BIT: Lentera', en: 'BIT Accessory: Lantern' },
    unlockCondition: { id: 'Bonus Misi 4: Ladang Otomatis', en: 'Mission 4 Bonus: Automated Farm' },
    swatchHex: '#F2B544',
  },
  {
    id: 'bit_acc_antenna_flag',
    category: 'bit_accessory',
    value: 'antenna_flag',
    name: { id: 'Aksesori BIT: Bendera Antena', en: 'BIT Accessory: Antenna Flag' },
    unlockCondition: { id: 'Bonus Misi 5: Cetak Biru', en: 'Mission 5 Bonus: The Blueprint' },
    swatchHex: '#D9433B',
  },
  {
    id: 'neo_visor_turquoise',
    category: 'neo_visor',
    value: 'turquoise',
    name: { id: 'Visor NEO: Pirus', en: 'NEO Visor: Turquoise' },
    unlockCondition: { id: 'Bawaan awal', en: 'Starter default' },
    swatchHex: '#3CC4C0',
  },
  {
    id: 'neo_visor_amber',
    category: 'neo_visor',
    value: 'amber',
    name: { id: 'Visor NEO: Ambar', en: 'NEO Visor: Amber' },
    unlockCondition: { id: 'Bonus Misi 1: Halo Arsitek', en: 'Mission 1 Bonus: Hello Architect' },
    swatchHex: '#F2B544',
  },
  {
    id: 'scarf_teal',
    category: 'architect_scarf',
    value: 'teal',
    name: { id: 'Syal Arsitek: Hijau Laut', en: 'Architect Scarf: Teal' },
    unlockCondition: { id: 'Bawaan awal', en: 'Starter default' },
    swatchHex: '#2F7F86',
  },
  {
    id: 'scarf_amber',
    category: 'architect_scarf',
    value: 'amber',
    name: { id: 'Syal Arsitek: Ambar', en: 'Architect Scarf: Amber' },
    unlockCondition: { id: 'Bonus Misi 3: Gerbang Terkunci', en: 'Mission 3 Bonus: The Locked Gate' },
    swatchHex: '#F2B544',
  },
];

export const AWAKENING_ISLAND_ZONES = [
  'stasis_shrine',
  'beacon_point',
  'supply_grove',
  'gatehouse_rock',
  'terrace_farm',
  'bolts_workshop',
  'core_spire',
] as const;

export type AwakeningZoneId = (typeof AWAKENING_ISLAND_ZONES)[number];

export interface LoreNoteItem {
  id: string;
  islandId: AwakeningZoneId;
  xp: number;
  title: { id: string; en: string };
  body: { id: string; en: string };
  position: [number, number, number];
}

export function getRankMeta(rankNumber: number, locale: Locale = 'id') {
  const found = RANK_THRESHOLDS.find((r) => r.rank === rankNumber) ?? RANK_THRESHOLDS[0];
  const next = RANK_THRESHOLDS.find((r) => r.rank === rankNumber + 1) ?? null;
  return {
    rank: found.rank,
    title: found[locale],
    minXp: found.xp,
    nextRankXp: next ? next.xp : null,
    nextRankTitle: next ? next[locale] : null,
  };
}

/**
 * Idempotent XP & unlock ledger ensuring repeated mission steps or lore notes
 * never grant duplicate XP (Master Plan Section 5.4).
 */
export class ProgressionController {
  private xp: number;
  private awardedStepIds: Set<string>;
  private awardedLoreIds: Set<string>;
  private unlockedCosmeticIds: Set<string>;
  private restoredZoneIds: Set<string>;

  constructor(initial?: {
    xp?: number;
    awardedStepIds?: string[];
    awardedLoreIds?: string[];
    unlockedCosmeticIds?: string[];
    restoredZoneIds?: string[];
  }) {
    this.xp = initial?.xp ?? 0;
    this.awardedStepIds = new Set(initial?.awardedStepIds ?? []);
    this.awardedLoreIds = new Set(initial?.awardedLoreIds ?? []);
    this.unlockedCosmeticIds = new Set(
      initial?.unlockedCosmeticIds ?? ['bit_paint_moss', 'neo_visor_turquoise', 'scarf_teal']
    );
    this.restoredZoneIds = new Set(initial?.restoredZoneIds ?? []);
  }

  getXP(): number {
    return this.xp;
  }

  getRank(): number {
    return computeRankFromXP(this.xp);
  }

  getUnlockedCosmetics(): string[] {
    return Array.from(this.unlockedCosmeticIds);
  }

  getRestoredZones(): string[] {
    return Array.from(this.restoredZoneIds);
  }

  awardStepXP(
    stepId: string,
    amount: number,
    unlockCosmeticIds: string[] = []
  ): { xpGranted: number; totalXp: number; rank: number; rankUp: boolean; newlyUnlocked: string[] } {
    const prevRank = this.getRank();
    let xpGranted = 0;
    if (!this.awardedStepIds.has(stepId) && amount > 0) {
      this.awardedStepIds.add(stepId);
      this.xp += amount;
      xpGranted = amount;
    }

    const newlyUnlocked: string[] = [];
    for (const cid of unlockCosmeticIds) {
      if (!this.unlockedCosmeticIds.has(cid)) {
        this.unlockedCosmeticIds.add(cid);
        newlyUnlocked.push(cid);
      }
    }

    // Rank milestone cosmetics
    if (this.xp >= 600 && !this.unlockedCosmeticIds.has('bit_paint_slate')) {
      this.unlockedCosmeticIds.add('bit_paint_slate');
      newlyUnlocked.push('bit_paint_slate');
    }

    const newRank = this.getRank();
    return {
      xpGranted,
      totalXp: this.xp,
      rank: newRank,
      rankUp: newRank > prevRank,
      newlyUnlocked,
    };
  }

  awardLoreNoteXP(noteId: string, amount = 10): { xpGranted: number; totalXp: number } {
    if (this.awardedLoreIds.has(noteId)) {
      return { xpGranted: 0, totalXp: this.xp };
    }
    this.awardedLoreIds.add(noteId);
    this.xp += amount;
    EventBus.emit('world.lore.discovered', { noteId });
    return { xpGranted: amount, totalXp: this.xp };
  }

  restoreZone(zoneId: string, missionId: string): boolean {
    if (this.restoredZoneIds.has(zoneId)) return false;
    this.restoredZoneIds.add(zoneId);
    EventBus.emit('world.zone.restored', { zoneId, missionId });
    return true;
  }

  getRestorationUniforms(): Record<AwakeningZoneId, number> {
    return {
      stasis_shrine: this.restoredZoneIds.has('stasis_shrine') ? 1 : 0,
      beacon_point: this.restoredZoneIds.has('beacon_point') ? 1 : 0,
      supply_grove: this.restoredZoneIds.has('supply_grove') ? 1 : 0,
      gatehouse_rock: this.restoredZoneIds.has('gatehouse_rock') ? 1 : 0,
      terrace_farm: this.restoredZoneIds.has('terrace_farm') ? 1 : 0,
      bolts_workshop: this.restoredZoneIds.has('bolts_workshop') ? 1 : 0,
      core_spire: this.restoredZoneIds.has('core_spire') ? 1 : 0,
    };
  }
}

/**
 * Computes smooth 0->1 shader restoration uniform during the <= 5s restoration sequence.
 */
export function computeRestorationProgress(
  elapsedMs: number,
  durationMs = 5000,
  reducedMotion = false
): number {
  if (reducedMotion || durationMs <= 0) return 1;
  const t = Math.max(0, Math.min(1, elapsedMs / durationMs));
  // Cubic ease-out
  return 1 - Math.pow(1 - t, 3);
}
