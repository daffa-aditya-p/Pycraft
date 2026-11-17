import { describe, it, expect } from 'vitest';
import {
  getActiveQuestTargetInfo,
  isInteractableQuestTarget,
  INTERACTABLE_KIND_COLORS,
} from '@/engine/render/Entities';
import { generateAwakeningWorld } from '@/engine';

describe('3D Interactable & Quest Highlighting System', () => {
  it('defines distinct high-contrast colors for all 5 interactable kinds', () => {
    const kinds = ['npc', 'puzzle', 'device', 'item', 'lore'] as const;
    for (const kind of kinds) {
      expect(INTERACTABLE_KIND_COLORS[kind]).toBeDefined();
      expect(INTERACTABLE_KIND_COLORS[kind].ring).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(INTERACTABLE_KIND_COLORS[kind].glow).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('correctly identifies prologue quest target (neo_pedestal)', () => {
    const questsState = {
      states: { prologue: 'active' },
      completedStepIds: ['pro_1_move'],
      activeMissionId: 'prologue',
      activeStepId: null,
    };

    const targetInfo = getActiveQuestTargetInfo(questsState);
    expect(targetInfo.activeQuestId).toBe('prologue');

    const world = generateAwakeningWorld();
    const pedestal = world.interactables.find((i) => i.id === 'neo_pedestal')!;
    const tamo = world.interactables.find((i) => i.id === 'old_tamo')!;

    // Pedestal matches targetId or missionId
    expect(isInteractableQuestTarget(pedestal, targetInfo)).toBe(true);
    // Unrelated NPC does not match
    expect(isInteractableQuestTarget(tamo, targetInfo)).toBe(false);
  });

  it('correctly targets all 3 uncollected blue crystals in interlude_find_bit', () => {
    const questsState = {
      states: { prologue: 'completed', m1_hello_architect: 'completed', interlude_find_bit: 'active' },
      completedStepIds: ['int_1_go'],
      activeMissionId: 'interlude_find_bit',
      activeStepId: null,
    };

    const world = generateAwakeningWorld();
    const crystal1 = world.interactables.find((i) => i.id === 'awakening_crystal_1')!;
    const crystal2 = world.interactables.find((i) => i.id === 'awakening_crystal_2')!;
    const beacon = world.interactables.find((i) => i.id === 'beacon_terminal')!;

    const targetInfo = getActiveQuestTargetInfo(questsState, []);
    expect(targetInfo.targetId).toBe('blue_crystal');

    // All uncollected crystals should be highlighted
    expect(isInteractableQuestTarget(crystal1, targetInfo, [])).toBe(true);
    expect(isInteractableQuestTarget(crystal2, targetInfo, [])).toBe(true);
    expect(isInteractableQuestTarget(beacon, targetInfo, [])).toBe(false);

    // If crystal1 is already collected, it should not be targeted
    expect(isInteractableQuestTarget(crystal1, targetInfo, ['awakening_crystal_1'])).toBe(false);
    expect(isInteractableQuestTarget(crystal2, targetInfo, ['awakening_crystal_1'])).toBe(true);
  });

  it('correctly targets mission consoles for code_step objectives', () => {
    const world = generateAwakeningWorld();
    const gateConsole = world.interactables.find((i) => i.id === 'gate_console')!;
    const oldTamo = world.interactables.find((i) => i.id === 'old_tamo')!;
    const farmConsole = world.interactables.find((i) => i.id === 'farm_console')!;

    // M3 locked gate quest
    const questsState = {
      states: { m3_locked_gate: 'active' },
      completedStepIds: ['m3_tamo'],
      activeMissionId: 'm3_locked_gate',
      activeStepId: 'm3_s1',
    };

    const targetInfo = getActiveQuestTargetInfo(questsState);
    expect(targetInfo.activeQuestId).toBe('m3_locked_gate');

    expect(isInteractableQuestTarget(gateConsole, targetInfo)).toBe(true);
    expect(isInteractableQuestTarget(oldTamo, targetInfo)).toBe(false);
    expect(isInteractableQuestTarget(farmConsole, targetInfo)).toBe(false);
  });

  it('correctly targets NPCs when objective is talk_to', () => {
    const world = generateAwakeningWorld();
    const mira = world.interactables.find((i) => i.id === 'mira')!;
    const farmConsole = world.interactables.find((i) => i.id === 'farm_console')!;

    // M4 automated farm with first objective talk_to mira
    const questsState = {
      states: { m4_automated_farm: 'active' },
      completedStepIds: [],
      activeMissionId: 'm4_automated_farm',
      activeStepId: null,
    };

    const targetInfo = getActiveQuestTargetInfo(questsState);
    expect(targetInfo.targetId).toBe('mira');

    expect(isInteractableQuestTarget(mira, targetInfo)).toBe(true);
    expect(isInteractableQuestTarget(farmConsole, targetInfo)).toBe(false);
  });

  it('includes bit_robot in world interactables at supply grove', () => {
    const world = generateAwakeningWorld();
    const bitRobot = world.interactables.find((i) => i.id === 'bit_robot');
    expect(bitRobot).toBeDefined();
    expect(bitRobot!.zoneId).toBe('supply_grove');
    expect(bitRobot!.position).toEqual([18, 5.5, 14]);
  });
});
