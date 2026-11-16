import { create } from 'zustand';
import { EventBus, type AssistanceTier } from './EventBus';
import type { SlotId } from './useSettingsStore';

export interface KCMasteryRecord {
  kcId: string;
  score: number;
  attempts: number;
  independentPasses: number;
  distinctContextsPassed: string[];
  lastPracticedAt: number;
  commonErrorTags: Record<string, number>;
}

export interface ArchitectAppearance {
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  scarfColor: number;
}

export interface CosmeticsState {
  bitPaint: string;
  bitAccessory: string | null;
  neoVisor: string;
  unlockedIds: string[];
}

export interface SaveStatePayload {
  profile: {
    name: string;
    createdAt: number;
    playtimeSeconds: number;
    appearance: ArchitectAppearance;
    cosmetics: CosmeticsState;
  };
  world: {
    regionId: string;
    islandId: string;
    safeAnchorId: string;
    playerPosition: [number, number, number];
    playerYaw: number;
    cameraMode: 'third_person' | 'isometric';
    restoredZoneIds: string[];
    collectedWorldItemIds: string[];
    discoveredLoreNoteIds: string[];
  };
  quests: {
    states: Record<string, 'locked' | 'available' | 'active' | 'completed'>;
    completedStepIds: string[];
    activeMissionId: string | null;
    activeStepId: string | null;
  };
  learning: {
    xp: number;
    rank: number;
    kcMastery: Record<string, KCMasteryRecord>;
    stepCodeDrafts: Record<string, { code: string; tier: AssistanceTier; updatedAt: number }>;
  };
  inventory: {
    items: Record<string, number>;
  };
}

export const RANK_THRESHOLDS = [
  { rank: 1, xp: 0, id: 'Perintis', en: 'Initiate' },
  { rank: 2, xp: 250, id: 'Magang', en: 'Apprentice' },
  { rank: 3, xp: 600, id: 'Pembangun', en: 'Builder' },
  { rank: 4, xp: 1200, id: 'Insinyur', en: 'Engineer' },
  { rank: 5, xp: 2200, id: 'Perajin', en: 'Artisan' },
  { rank: 6, xp: 3600, id: 'Ahli', en: 'Master' },
  { rank: 7, xp: 5500, id: 'Arsitek Agung', en: 'Grand Architect' },
] as const;

export function computeRankFromXP(xp: number): number {
  let rank = 1;
  for (const tier of RANK_THRESHOLDS) {
    if (xp >= tier.xp) rank = tier.rank;
  }
  return rank;
}

export function createInitialSavePayload(
  playerName: string,
  appearance?: Partial<ArchitectAppearance>
): SaveStatePayload {
  return {
    profile: {
      name: playerName.trim().slice(0, 16) || 'Architect',
      createdAt: Date.now(),
      playtimeSeconds: 0,
      appearance: {
        skinTone: appearance?.skinTone ?? 2,
        hairStyle: appearance?.hairStyle ?? 0,
        hairColor: appearance?.hairColor ?? 1,
        scarfColor: appearance?.scarfColor ?? 0,
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
        m1_hello_architect: 'locked',
        interlude_find_bit: 'locked',
        m2_data_collector: 'locked',
        m3_locked_gate: 'locked',
        m4_automated_farm: 'locked',
        m5_blueprint: 'locked',
        final_core_shard: 'locked',
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

export interface GameStoreState extends SaveStatePayload {
  activeSlotId: SlotId | null;
  objectiveLabel: string | null;
  isObservingPlayback: boolean;
  activePuzzleZoneId: string | null;
  dirty: boolean;

  loadSavePayload: (slotId: SlotId, payload: SaveStatePayload) => void;
  resetForNewAdventure: (
    slotId: SlotId,
    playerName: string,
    appearance?: Partial<ArchitectAppearance>
  ) => void;
  updatePlayerTransform: (
    position: [number, number, number],
    yaw: number,
    islandId?: string,
    safeAnchorId?: string
  ) => void;
  setCameraMode: (mode: 'third_person' | 'isometric') => void;
  markZoneRestored: (zoneId: string, missionId: string) => void;
  collectWorldItem: (itemId: string, itemType: string, amount?: number) => void;
  discoverLoreNote: (noteId: string) => void;
  setQuestState: (
    questId: string,
    state: 'locked' | 'available' | 'active' | 'completed'
  ) => void;
  setActiveMissionStep: (
    missionId: string | null,
    stepId: string | null,
    objectiveLabel?: string | null
  ) => void;
  completeMissionStep: (
    missionId: string,
    stepId: string,
    tier: AssistanceTier,
    xpAmount: number
  ) => number;
  updateKCMastery: (kcId: string, record: KCMasteryRecord) => void;
  saveCodeDraft: (stepId: string, code: string, tier: AssistanceTier) => void;
  awardXP: (amount: number) => void;
  equipCosmetic: (patch: Partial<Pick<CosmeticsState, 'bitPaint' | 'bitAccessory' | 'neoVisor'>>) => void;
  unlockCosmetic: (cosmeticId: string) => void;
  addInventoryItem: (itemType: string, delta: number) => void;
  setObservingPlayback: (observing: boolean) => void;
  setActivePuzzleZone: (zoneId: string | null) => void;
  tickPlaytime: (deltaSeconds: number) => void;
  markClean: () => void;
  exportSavePayload: () => SaveStatePayload;
}

const INITIAL_PAYLOAD = createInitialSavePayload('Architect');

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...INITIAL_PAYLOAD,
  activeSlotId: null,
  objectiveLabel: null,
  isObservingPlayback: false,
  activePuzzleZoneId: null,
  dirty: false,

  loadSavePayload: (slotId, payload) => {
    set({
      activeSlotId: slotId,
      profile: structuredClone(payload.profile),
      world: structuredClone(payload.world),
      quests: structuredClone(payload.quests),
      learning: structuredClone(payload.learning),
      inventory: structuredClone(payload.inventory),
      isObservingPlayback: false,
      activePuzzleZoneId: null,
      dirty: false,
    });
  },

  resetForNewAdventure: (slotId, playerName, appearance) => {
    const fresh = createInitialSavePayload(playerName, appearance);
    set({
      activeSlotId: slotId,
      ...fresh,
      objectiveLabel: null,
      isObservingPlayback: false,
      activePuzzleZoneId: null,
      dirty: true,
    });
    EventBus.emit('save.requested', { reason: 'manual', immediate: true });
  },

  updatePlayerTransform: (position, yaw, islandId, safeAnchorId) => {
    set((s) => ({
      world: {
        ...s.world,
        playerPosition: position,
        playerYaw: yaw,
        islandId: islandId ?? s.world.islandId,
        safeAnchorId: safeAnchorId ?? s.world.safeAnchorId,
      },
      dirty: true,
    }));
    if (safeAnchorId) {
      EventBus.emit('save.requested', { reason: 'anchor_reached', immediate: true });
    } else {
      EventBus.emit('save.requested', { reason: 'debounced', immediate: false });
    }
  },

  setCameraMode: (mode) => {
    set((s) => ({
      world: { ...s.world, cameraMode: mode },
      dirty: true,
    }));
    EventBus.emit('camera.mode.changed', { mode });
  },

  markZoneRestored: (zoneId, missionId) => {
    const existing = get().world.restoredZoneIds;
    if (existing.includes(zoneId)) return;
    set((s) => ({
      world: {
        ...s.world,
        restoredZoneIds: [...s.world.restoredZoneIds, zoneId],
      },
      dirty: true,
    }));
    EventBus.emit('world.zone.restored', { zoneId, missionId });
    EventBus.emit('save.requested', { reason: 'quest_completed', immediate: true });
  },

  collectWorldItem: (itemId, itemType, amount = 1) => {
    const collected = get().world.collectedWorldItemIds;
    if (collected.includes(itemId)) return;
    set((s) => ({
      world: {
        ...s.world,
        collectedWorldItemIds: [...s.world.collectedWorldItemIds, itemId],
      },
      inventory: {
        items: {
          ...s.inventory.items,
          [itemType]: (s.inventory.items[itemType] ?? 0) + amount,
        },
      },
      dirty: true,
    }));
    EventBus.emit('world.item.collected', { itemId, itemType, count: amount });
    EventBus.emit('save.requested', { reason: 'step_passed', immediate: true });
  },

  discoverLoreNote: (noteId) => {
    const notes = get().world.discoveredLoreNoteIds;
    if (notes.includes(noteId)) return;
    set((s) => {
      const nextXp = s.learning.xp + 10;
      return {
        world: {
          ...s.world,
          discoveredLoreNoteIds: [...s.world.discoveredLoreNoteIds, noteId],
        },
        learning: {
          ...s.learning,
          xp: nextXp,
          rank: computeRankFromXP(nextXp),
        },
        dirty: true,
      };
    });
    EventBus.emit('world.lore.discovered', { noteId });
    EventBus.emit('save.requested', { reason: 'step_passed', immediate: true });
  },

  setQuestState: (questId, state) => {
    set((s) => ({
      quests: {
        ...s.quests,
        states: { ...s.quests.states, [questId]: state },
      },
      dirty: true,
    }));
    if (state === 'completed') {
      EventBus.emit('quest.completed', { questId, xpAwarded: 0 });
      EventBus.emit('save.requested', { reason: 'quest_completed', immediate: true });
    }
  },

  setActiveMissionStep: (missionId, stepId, objectiveLabel) => {
    set((s) => ({
      quests: {
        ...s.quests,
        activeMissionId: missionId,
        activeStepId: stepId,
      },
      objectiveLabel: objectiveLabel !== undefined ? objectiveLabel : s.objectiveLabel,
    }));
  },

  completeMissionStep: (missionId, stepId, tier, xpAmount) => {
    const alreadyDone = get().quests.completedStepIds.includes(stepId);
    const xpAwarded = alreadyDone ? 0 : Math.max(0, xpAmount);
    set((s) => {
      const nextXp = s.learning.xp + xpAwarded;
      return {
        quests: {
          ...s.quests,
          completedStepIds: alreadyDone
            ? s.quests.completedStepIds
            : [...s.quests.completedStepIds, stepId],
        },
        learning: {
          ...s.learning,
          xp: nextXp,
          rank: computeRankFromXP(nextXp),
        },
        dirty: true,
      };
    });
    EventBus.emit('mission.step.passed', {
      missionId,
      stepId,
      tier,
      xpAwarded,
      isFirstPass: !alreadyDone,
    });
    EventBus.emit('save.requested', { reason: 'step_passed', immediate: true });
    return xpAwarded;
  },

  updateKCMastery: (kcId, record) => {
    set((s) => ({
      learning: {
        ...s.learning,
        kcMastery: {
          ...s.learning.kcMastery,
          [kcId]: record,
        },
      },
      dirty: true,
    }));
  },

  saveCodeDraft: (stepId, code, tier) => {
    set((s) => ({
      learning: {
        ...s.learning,
        stepCodeDrafts: {
          ...s.learning.stepCodeDrafts,
          [stepId]: { code, tier, updatedAt: Date.now() },
        },
      },
      dirty: true,
    }));
    EventBus.emit('save.requested', { reason: 'debounced', immediate: false });
  },

  awardXP: (amount) => {
    if (amount <= 0) return;
    set((s) => {
      const nextXp = s.learning.xp + amount;
      return {
        learning: {
          ...s.learning,
          xp: nextXp,
          rank: computeRankFromXP(nextXp),
        },
        dirty: true,
      };
    });
  },

  equipCosmetic: (patch) => {
    set((s) => ({
      profile: {
        ...s.profile,
        cosmetics: { ...s.profile.cosmetics, ...patch },
      },
      dirty: true,
    }));
    EventBus.emit('save.requested', { reason: 'settings_changed', immediate: true });
  },

  unlockCosmetic: (cosmeticId) => {
    const unlocked = get().profile.cosmetics.unlockedIds;
    if (unlocked.includes(cosmeticId)) return;
    set((s) => ({
      profile: {
        ...s.profile,
        cosmetics: {
          ...s.profile.cosmetics,
          unlockedIds: [...s.profile.cosmetics.unlockedIds, cosmeticId],
        },
      },
      dirty: true,
    }));
  },

  addInventoryItem: (itemType, delta) => {
    set((s) => {
      const nextCount = Math.max(0, (s.inventory.items[itemType] ?? 0) + delta);
      return {
        inventory: {
          items: { ...s.inventory.items, [itemType]: nextCount },
        },
        dirty: true,
      };
    });
  },

  setObservingPlayback: (isObservingPlayback) => set({ isObservingPlayback }),
  setActivePuzzleZone: (activePuzzleZoneId) => set({ activePuzzleZoneId }),

  tickPlaytime: (deltaSeconds) => {
    if (deltaSeconds <= 0) return;
    set((s) => ({
      profile: {
        ...s.profile,
        playtimeSeconds: s.profile.playtimeSeconds + deltaSeconds,
      },
    }));
  },

  markClean: () => set({ dirty: false }),

  exportSavePayload: () => {
    const s = get();
    return {
      profile: structuredClone(s.profile),
      world: structuredClone(s.world),
      quests: structuredClone(s.quests),
      learning: structuredClone(s.learning),
      inventory: structuredClone(s.inventory),
    };
  },
}));
