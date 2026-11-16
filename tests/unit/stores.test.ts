import { describe, it, expect, beforeEach } from 'vitest';
import {
  EventBus,
  useGameStore,
  useUIStore,
  useEditorStore,
  useSettingsStore,
  computeRankFromXP,
  createInitialSavePayload,
} from '@/stores';
import palette from '@/content/palette.json';

describe('Foundation Contracts & Stores', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('has exactly 48 unique colors in locked palette.json calibrated to reference.png', () => {
    expect(palette.colors).toHaveLength(48);
    const ids = new Set(palette.colors.map((c) => c.id));
    const indices = new Set(palette.colors.map((c) => c.index));
    expect(ids.size).toBe(48);
    expect(indices.size).toBe(48);
    expect(palette.calibratedTo).toBe('docs/art/reference.png');
  });

  it('EventBus dispatches typed events and unsubscribes cleanly', () => {
    const received: string[] = [];
    const unsub = EventBus.on('quest.objective.completed', (p) => {
      received.push(`${p.questId}:${p.objectiveId}`);
    });
    EventBus.emit('quest.objective.completed', { questId: 'm1', objectiveId: 'step_1' });
    unsub();
    EventBus.emit('quest.objective.completed', { questId: 'm1', objectiveId: 'step_2' });
    expect(received).toEqual(['m1:step_1']);
  });

  it('useGameStore awards XP idempotently per completed step and computes ranks', () => {
    expect(computeRankFromXP(0)).toBe(1);
    expect(computeRankFromXP(250)).toBe(2);
    expect(computeRankFromXP(1200)).toBe(4);
    expect(computeRankFromXP(5500)).toBe(7);

    const payload = createInitialSavePayload('Rara');
    useGameStore.getState().loadSavePayload(1, payload);

    const firstAward = useGameStore.getState().completeMissionStep('m1', '1.1', 'guided', 30);
    const secondAward = useGameStore.getState().completeMissionStep('m1', '1.1', 'independent', 30);
    expect(firstAward).toBe(30);
    expect(secondAward).toBe(0);
    expect(useGameStore.getState().learning.xp).toBe(30);
  });

  it('useUIStore goBack unwinds overlays to pause menu cleanly', () => {
    const ui = useUIStore.getState();
    ui.navigateTo('title', { pushHistory: false });
    ui.navigateTo('in_game');
    ui.setInGameOverlay('editor');
    expect(useUIStore.getState().inGameOverlay).toBe('editor');

    const handledOverlay = useUIStore.getState().goBack();
    expect(handledOverlay).toBe(true);
    expect(useUIStore.getState().inGameOverlay).toBe('explore');

    const handledPause = useUIStore.getState().goBack();
    expect(handledPause).toBe(true);
    expect(useUIStore.getState().inGameOverlay).toBe('paused');
  });

  it('useEditorStore marks timeline dirty on user code edit after run', () => {
    const ed = useEditorStore.getState();
    ed.loadStepEditor('1.1', 'print("hi")', 'guided');
    ed.updateTimeline({ totalEvents: 5, currentSeq: 5 });
    ed.setCode('print("halo")', true);
    expect(useEditorStore.getState().timeline.isDirtyAfterEdit).toBe(true);
  });

  it('useSettingsStore clamps audio sliders and resets sections', () => {
    const s = useSettingsStore.getState();
    s.updateAudio({ master: 1.8, sfx: -0.5 });
    expect(useSettingsStore.getState().audio.master).toBe(1);
    expect(useSettingsStore.getState().audio.sfx).toBe(0);
    s.resetSection('audio');
    expect(useSettingsStore.getState().audio.master).toBe(0.8);
  });
});
