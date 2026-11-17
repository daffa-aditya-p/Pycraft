export type AssistanceTier = 'guided' | 'assisted' | 'independent' | 'mastery';

export type QualityPreset = 'high' | 'medium' | 'low';

export type RuntimeStatus =
  | 'idle'
  | 'preparing'
  | 'running'
  | 'waiting_input'
  | 'paused'
  | 'completed'
  | 'error'
  | 'stopped'
  | 'limit_reached';

export type AudioCueId =
  | 'ui_click'
  | 'ui_confirm'
  | 'ui_error'
  | 'bit_chirp'
  | 'bit_move'
  | 'bit_bump'
  | 'bit_place'
  | 'bit_plant'
  | 'bit_collect'
  | 'beacon_chime'
  | 'gate_open'
  | 'gate_close'
  | 'bridge_plank'
  | 'water_restore'
  | 'quest_complete'
  | 'footstep'
  | 'jump'
  | 'land'
  | 'crystal_pickup';

export type SaveReason =
  | 'step_passed'
  | 'quest_completed'
  | 'anchor_reached'
  | 'settings_changed'
  | 'pause_opened'
  | 'visibility_hidden'
  | 'manual'
  | 'debounced';

export interface PycraftEventMap {
  'save.requested': { reason: SaveReason; immediate: boolean };
  'save.status': {
    state: 'idle' | 'saving' | 'saved' | 'error' | 'readonly';
    timestamp?: number;
    message?: string;
  };
  'quest.objective.completed': { questId: string; objectiveId: string };
  'quest.completed': { questId: string; xpAwarded: number };
  'mission.step.passed': {
    missionId: string;
    stepId: string;
    tier: AssistanceTier;
    xpAwarded: number;
    isFirstPass: boolean;
  };
  'mission.step.failed': {
    missionId: string;
    stepId: string;
    failedScenarioId?: string;
    errorTag?: string;
  };
  'world.zone.restored': { zoneId: string; missionId: string };
  'world.item.collected': { itemId: string; itemType: string; count: number };
  'world.lore.discovered': { noteId: string };
  'world.player.respawned': { anchorId: string; position: [number, number, number] };
  'player.interact': {
    targetId: string;
    kind: 'npc' | 'device' | 'item' | 'lore' | 'puzzle';
  };
  'dialogue.camera.request': {
    targetId: string;
    preset: 'speaker' | 'device' | 'overview' | 'release';
  };
  'cinematic.shot': { position: [number, number, number]; lookAt: [number, number, number]; fov?: number; driftSpeed?: number } | null;
  'camera.mode.changed': { mode: 'third_person' | 'isometric' };
  'runtime.status.changed': { status: RuntimeStatus; message?: string };
  'runtime.input.requested': { runId: string; prompt: string };
  'playback.state.changed': {
    state: 'idle' | 'playing' | 'paused' | 'finished' | 'fault';
    seq: number;
    line: number | null;
  };
  'quality.preset.changed': { preset: QualityPreset; reason: 'auto' | 'manual' };
  'audio.cue': { cue: AudioCueId; worldPos?: [number, number, number] };
  'a11y.announce': { text: string; priority?: 'polite' | 'assertive' };
  'toast.show': {
    id?: string;
    kind: 'info' | 'success' | 'warning' | 'error';
    message: string;
    durationMs?: number;
  };
}

type Listener<T> = (payload: T) => void;

class TypedEventBus {
  private listeners = new Map<keyof PycraftEventMap, Set<Listener<unknown>>>();

  on<K extends keyof PycraftEventMap>(
    event: K,
    listener: Listener<PycraftEventMap[K]>
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => this.off(event, listener);
  }

  once<K extends keyof PycraftEventMap>(
    event: K,
    listener: Listener<PycraftEventMap[K]>
  ): () => void {
    const unsub = this.on(event, (payload) => {
      unsub();
      listener(payload);
    });
    return unsub;
  }

  off<K extends keyof PycraftEventMap>(
    event: K,
    listener: Listener<PycraftEventMap[K]>
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(listener as Listener<unknown>);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit<K extends keyof PycraftEventMap>(event: K, payload: PycraftEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      (listener as Listener<PycraftEventMap[K]>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new TypedEventBus();
