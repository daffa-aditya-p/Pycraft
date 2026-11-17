import {
  WorldSim,
  canonicalJson,
  cloneState,
} from '../sim/index.js';
import type {
  SimCommandKind,
  WorldSimInit,
  WorldSimState,
} from '../sim/types.js';
import type { ActionRunEvent, PyErrorInfo, RunEvent } from '../runtime/protocol.js';
import { EventBus, type AudioCueId } from '../stores/EventBus.js';
import {
  useEditorStore,
  type PlaybackSpeed,
  type VariableEntry,
} from '../stores/useEditorStore.js';
import { TimelineIndex, type TimelineSnapshot } from './TimelineIndex.js';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'finished' | 'fault';

export interface ActionPlayerCallbacks {
  onStateChange?: (state: PlaybackState, snapshot: { seq: number; line: number | null }) => void;
  onObservationModeChange?: (observing: boolean) => void;
  onWorldStateChange?: (simState: WorldSimState) => void;
  onActionAnimate?: (event: ActionRunEvent, simState: WorldSimState, durationMs: number) => void;
  onErrorEvent?: (error: PyErrorInfo) => void;
  onFault?: (reason: string) => void;
}

export interface ActionPlayerOptions {
  speed?: PlaybackSpeed;
  stepMode?: boolean;
  syncEditorStore?: boolean;
  callbacks?: ActionPlayerCallbacks;
}

function speedMultiplier(speed: PlaybackSpeed): number {
  if (speed === 'instant') return Infinity;
  return speed;
}

function mapActionToAudioCue(ev: ActionRunEvent): AudioCueId | null {
  if (ev.warningCode === 'move_blocked' || ev.warningCode === 'move_blocked_elevation') {
    return 'bit_bump';
  }
  switch (ev.kind) {
    case 'robot.move':
      return 'bit_move';
    case 'robot.turn':
    case 'robot.say':
    case 'robot.scan':
    case 'robot.measure':
    case 'robot.can_move':
    case 'robot.front':
      return 'bit_chirp';
    case 'robot.plant':
      return 'bit_plant';
    case 'robot.place_block':
      return 'bit_place';
    case 'robot.collect':
      return 'bit_collect';
    case 'bridge.build':
      return 'bridge_plank';
    case 'gate.open':
      return 'gate_open';
    case 'gate.close':
      return 'gate_close';
    case 'beacon.print':
    case 'beacon.sign':
    case 'beacon.engrave':
      return 'beacon_chime';
    default:
      return null;
  }
}

function formatActionNarration(ev: ActionRunEvent): string {
  const argsStr = ev.args.map((a) => JSON.stringify(a)).join(', ');
  const resultSuffix =
    ev.result === null || ev.result === undefined ? '' : ` -> ${String(ev.result)}`;
  if (ev.warningCode) {
    return `${ev.kind}(${argsStr})${resultSuffix} [${ev.warningCode}]`;
  }
  return `${ev.kind}(${argsStr})${resultSuffix}`;
}

export class ActionPlayer {
  private mainSim: WorldSim | null = null;
  private initialStateSnapshot: WorldSimState | null = null;
  private timeline = new TimelineIndex();
  private callbacks: ActionPlayerCallbacks;
  private syncEditorStore: boolean;

  private playbackState: PlaybackState = 'idle';
  private speed: PlaybackSpeed;
  private stepMode: boolean;
  private observing = false;

  private cursorIndex = -1;
  private streamClosed = false;
  private expectedFinalHash: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private faultReason: string | null = null;

  constructor(options: ActionPlayerOptions = {}) {
    this.speed = options.speed ?? 1;
    this.stepMode = options.stepMode ?? false;
    this.syncEditorStore = options.syncEditorStore ?? true;
    this.callbacks = options.callbacks ?? {};
  }

  getState(): PlaybackState {
    return this.playbackState;
  }

  isObservingPlayback(): boolean {
    return this.observing;
  }

  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  isStepMode(): boolean {
    return this.stepMode;
  }

  getFaultReason(): string | null {
    return this.faultReason;
  }

  getCurrentIndex(): number {
    return this.cursorIndex;
  }

  getCurrentSeq(): number {
    const events = this.timeline.getEvents();
    if (this.cursorIndex < 0 || this.cursorIndex >= events.length) return 0;
    return events[this.cursorIndex]!.seq;
  }

  getTimeline(): TimelineIndex {
    return this.timeline;
  }

  getMainSimState(): WorldSimState | null {
    return this.mainSim ? this.mainSim.getState() : null;
  }

  getMainSimHash(): string | null {
    return this.mainSim ? this.mainSim.computeStateHash() : null;
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
    if (this.syncEditorStore) {
      useEditorStore.getState().setPlaybackSpeed(speed);
    }
  }

  setStepMode(enabled: boolean): void {
    this.stepMode = enabled;
    if (this.syncEditorStore) {
      useEditorStore.getState().setStepMode(enabled);
    }
  }

  beginRun(initialState: WorldSimInit | WorldSimState): void {
    this.clearTimer();
    const sim = new WorldSim(initialState);
    this.initialStateSnapshot = sim.getState();
    this.mainSim = sim;
    this.timeline.reset(this.initialStateSnapshot);
    this.cursorIndex = -1;
    this.streamClosed = false;
    this.expectedFinalHash = null;
    this.faultReason = null;

    if (this.syncEditorStore) {
      useEditorStore.getState().resetTraceState();
      useEditorStore.getState().clearConsole();
    }

    this.callbacks.onWorldStateChange?.(this.mainSim.getState());
    this.setObserving(true);
    this.setPlaybackState('playing', 0, null);
  }

  enqueue(batch: RunEvent[]): void {
    if (!this.mainSim || this.playbackState === 'fault') return;
    if (batch.length === 0) return;

    this.timeline.appendEvents(batch);
    if (this.syncEditorStore) {
      useEditorStore.getState().updateTimeline({
        totalEvents: this.timeline.getLength(),
        actionTicks: this.timeline.getActionTicks(),
      });
    }

    if (this.playbackState === 'playing' && this.timer === null && !this.stepMode) {
      this.scheduleNextTick();
    }
  }

  finishStream(expectedFinalHash: string): void {
    this.streamClosed = true;
    this.expectedFinalHash = expectedFinalHash;

    if (this.playbackState === 'fault') return;

    // If all events have already been consumed (e.g. 0-action script or instant play)
    if (this.cursorIndex >= this.timeline.getLength() - 1) {
      this.finalizePlayback();
    } else if (this.playbackState === 'playing' && this.timer === null && !this.stepMode) {
      this.scheduleNextTick();
    }
  }

  loadRecording(
    initialState: WorldSimInit | WorldSimState,
    events: RunEvent[],
    expectedFinalHash?: string,
    autoPlay = true,
  ): void {
    this.beginRun(initialState);
    this.enqueue(events);
    this.streamClosed = true;
    this.expectedFinalHash = expectedFinalHash ?? null;
    if (!autoPlay) {
      this.pause();
    } else {
      this.scheduleNextTick();
    }
  }

  play(): void {
    if (this.playbackState === 'fault' || !this.mainSim) return;
    if (this.cursorIndex >= this.timeline.getLength() - 1 && this.streamClosed) {
      // Restart from beginning if already finished
      this.seekToIndex(-1);
    }
    this.setObserving(true);
    this.setPlaybackState('playing', this.getCurrentSeq(), this.getCurrentLine());
    this.scheduleNextTick();
  }

  pause(): void {
    if (this.playbackState === 'fault' || this.playbackState === 'idle') return;
    this.clearTimer();
    this.setPlaybackState('paused', this.getCurrentSeq(), this.getCurrentLine());
  }

  stop(): void {
    this.clearTimer();
    if (this.initialStateSnapshot) {
      this.mainSim = WorldSim.fromState(this.initialStateSnapshot);
      this.callbacks.onWorldStateChange?.(this.mainSim.getState());
    }
    this.cursorIndex = -1;
    this.setObserving(false);
    this.setPlaybackState('idle', 0, null);
    if (this.syncEditorStore) {
      useEditorStore.getState().updateTimeline({ isPlaying: false, currentSeq: 0 });
      useEditorStore.getState().setCurrentLine(null);
    }
  }

  stepForwardLine(): TimelineSnapshot | null {
    if (!this.mainSim || this.playbackState === 'fault') return null;
    this.pause();
    const events = this.timeline.getEvents();
    const nextLineIdx = this.timeline.findNextLineIndex(this.cursorIndex);
    if (nextLineIdx === null) {
      // Advance through remaining trailing events to the end
      while (this.cursorIndex < events.length - 1) {
        if (!this.advanceOneEvent()) return null;
      }
      if (this.streamClosed) {
        this.finalizePlayback();
      }
      return this.timeline.seekToIndex(this.cursorIndex);
    }

    // Advance up to the next line event AND any attached action/vars before the line after it
    let stopAt = nextLineIdx;
    for (let i = nextLineIdx + 1; i < events.length; i++) {
      if (events[i]!.type === 'line' || events[i]!.type === 'error') {
        break;
      }
      stopAt = i;
    }

    while (this.cursorIndex < stopAt) {
      if (!this.advanceOneEvent()) return null;
    }
    return this.timeline.seekToIndex(this.cursorIndex);
  }

  stepBackLine(): TimelineSnapshot | null {
    if (!this.mainSim || this.playbackState === 'fault') return null;
    this.pause();
    const prevIdx = this.timeline.findPrevLineIndex(this.cursorIndex);
    return this.seekToIndex(prevIdx ?? -1);
  }

  nextAction(): TimelineSnapshot | null {
    if (!this.mainSim || this.playbackState === 'fault') return null;
    this.pause();
    const nextIdx = this.timeline.findNextActionIndex(this.cursorIndex);
    if (nextIdx === null) return null;
    while (this.cursorIndex < nextIdx) {
      if (!this.advanceOneEvent()) return null;
    }
    return this.timeline.seekToIndex(this.cursorIndex);
  }

  prevAction(): TimelineSnapshot | null {
    if (!this.mainSim || this.playbackState === 'fault') return null;
    this.pause();
    const prevIdx = this.timeline.findPrevActionIndex(this.cursorIndex);
    return this.seekToIndex(prevIdx ?? -1);
  }

  seekToSeq(seq: number): TimelineSnapshot | null {
    if (!this.mainSim || this.playbackState === 'fault') return null;
    this.pause();
    const snap = this.timeline.seekToSeq(seq);
    this.applySeekSnapshot(snap);
    return snap;
  }

  seekToIndex(targetIndex: number): TimelineSnapshot | null {
    if (!this.mainSim || this.playbackState === 'fault') return null;
    this.pause();
    const snap = this.timeline.seekToIndex(targetIndex);
    this.applySeekSnapshot(snap);
    return snap;
  }

  private applySeekSnapshot(snap: TimelineSnapshot): void {
    // Re-validate actions from initialState if seeking forward/arbitrary, ensuring authoritative mainSim
    if (!this.initialStateSnapshot) return;
    const sim = WorldSim.fromState(this.initialStateSnapshot);
    const events = this.timeline.getEvents();
    for (let i = 0; i <= snap.eventIndex; i++) {
      const ev = events[i]!;
      if (ev.type === 'action') {
        if (!this.validateAndApplyOnSim(sim, ev)) {
          return;
        }
      }
    }

    this.mainSim = sim;
    this.cursorIndex = snap.eventIndex;
    this.callbacks.onWorldStateChange?.(sim.getState());

    if (this.syncEditorStore) {
      const store = useEditorStore.getState();
      store.setCurrentLine(snap.currentLine);
      store.setVariables(snap.variables);
      store.updateTimeline({
        currentSeq: snap.seq,
        isPlaying: false,
      });
    }

    this.setPlaybackState(
      snap.eventIndex >= events.length - 1 && this.streamClosed ? 'finished' : 'paused',
      snap.seq,
      snap.currentLine,
    );
  }

  private scheduleNextTick(): void {
    if (this.playbackState !== 'playing') return;
    this.clearTimer();

    const events = this.timeline.getEvents();
    if (this.cursorIndex >= events.length - 1) {
      if (this.streamClosed) {
        this.finalizePlayback();
      }
      return;
    }

    if (this.speed === 'instant') {
      while (this.cursorIndex < events.length - 1 && this.playbackState === 'playing') {
        if (!this.advanceOneEvent()) return;
      }
      if (this.streamClosed && this.playbackState === 'playing') {
        this.finalizePlayback();
      }
      return;
    }

    // Consume all 0-ms non-action events up to the next action (or error) in one batch
    const mult = speedMultiplier(this.speed);
    let delayMs = 0;

    while (this.cursorIndex < events.length - 1 && this.playbackState === 'playing') {
      const nextEv = events[this.cursorIndex + 1]!;
      if (!this.advanceOneEvent()) return;
      if (nextEv.type === 'action') {
        delayMs = Math.max(0, Math.round(nextEv.durationMs / mult));
        break;
      }
      if (nextEv.type === 'error') {
        this.pause();
        return;
      }
    }

    if (this.playbackState !== 'playing') return;

    if (this.cursorIndex >= events.length - 1 && this.streamClosed && delayMs === 0) {
      this.finalizePlayback();
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      this.scheduleNextTick();
    }, delayMs);
  }

  private advanceOneEvent(): boolean {
    if (!this.mainSim) return false;
    const events = this.timeline.getEvents();
    const nextIdx = this.cursorIndex + 1;
    if (nextIdx >= events.length) return false;

    const ev = events[nextIdx]!;
    if (ev.type === 'action') {
      if (!this.validateAndApplyOnSim(this.mainSim, ev)) {
        return false;
      }
    }

    this.cursorIndex = nextIdx;
    this.dispatchEventEffects(ev);
    return true;
  }

  private validateAndApplyOnSim(sim: WorldSim, ev: ActionRunEvent): boolean {
    try {
      const replayed = sim.executeCommand(ev.kind as SimCommandKind, ev.args);
      const deltaMatch = canonicalJson(replayed.delta) === canonicalJson(ev.delta);
      const inverseMatch = canonicalJson(replayed.inverse) === canonicalJson(ev.inverse);
      const resultMatch = canonicalJson(replayed.returnValue) === canonicalJson(ev.result);

      if (!deltaMatch || !inverseMatch || !resultMatch) {
        this.triggerFault(
          `Action validation mismatch on '${ev.kind}' at seq ${ev.seq}: worker delta diverged from main WorldSim.`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.triggerFault(
        `Action validation threw on '${ev.kind}' at seq ${ev.seq}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return false;
    }
  }

  private dispatchEventEffects(ev: RunEvent): void {
    const store = this.syncEditorStore ? useEditorStore.getState() : null;
    if (store) {
      store.updateTimeline({ currentSeq: ev.seq });
    }

    switch (ev.type) {
      case 'line':
        store?.setCurrentLine(ev.line);
        break;

      case 'vars': {
        if (store) {
          const map = new Map<string, VariableEntry>();
          for (const existing of store.variables) {
            map.set(`${existing.scope}:${existing.name}`, existing);
          }
          for (const ch of ev.changes) {
            const key = `${ch.scope}:${ch.name}`;
            if (ch.deleted) {
              map.delete(key);
            } else {
              map.set(key, {
                scope: ch.scope,
                name: ch.name,
                typeName: ch.typeName,
                repr: ch.repr,
                changedAtSeq: ev.seq,
              });
            }
          }
          store.setVariables(Array.from(map.values()));
        }
        break;
      }

      case 'loop':
        store?.updateLoopIteration(ev.line, ev.iteration, Boolean(ev.done));
        break;

      case 'stdout':
        store?.appendConsole({ kind: 'stdout', text: ev.text });
        break;

      case 'action': {
        const stateSnapshot = this.mainSim!.getState();
        this.callbacks.onWorldStateChange?.(stateSnapshot);
        const mult = speedMultiplier(this.speed);
        const animMs = mult === Infinity ? 0 : Math.round(ev.durationMs / mult);
        this.callbacks.onActionAnimate?.(ev, stateSnapshot, animMs);
        if (ev.kind !== 'beacon.print') {
          store?.appendConsole({
            kind: 'action',
            text: formatActionNarration(ev),
            line: ev.line,
          });
        }
        const cue = mapActionToAudioCue(ev);
        if (cue) {
          EventBus.emit('audio.cue', { cue });
        }
        break;
      }

      case 'warning':
        store?.appendConsole({
          kind: 'warning',
          text: `Peringatan (${ev.code}) di baris ${ev.line}`,
          line: ev.line,
        });
        break;

      case 'error':
        store?.setCurrentLine(ev.error.line ?? null);
        store?.appendConsole({
          kind: 'error',
          text: `${ev.error.type}: ${ev.error.msg}`,
          line: ev.error.line ?? undefined,
        });
        this.callbacks.onErrorEvent?.(ev.error);
        break;

      case 'call':
      case 'return':
        break;
    }
  }

  private finalizePlayback(): void {
    this.clearTimer();
    if (this.mainSim && this.expectedFinalHash) {
      const actualHash = this.mainSim.computeStateHash();
      if (actualHash !== this.expectedFinalHash) {
        this.triggerFault(
          `Final state hash mismatch: main=${actualHash}, worker=${this.expectedFinalHash}`,
        );
        return;
      }
    }
    this.setObserving(false);
    this.setPlaybackState('finished', this.getCurrentSeq(), this.getCurrentLine());
  }

  private triggerFault(reason: string): void {
    this.clearTimer();
    this.faultReason = reason;
    if (this.initialStateSnapshot) {
      this.mainSim = WorldSim.fromState(cloneState(this.initialStateSnapshot));
      this.callbacks.onWorldStateChange?.(this.mainSim.getState());
    }
    this.setObserving(false);
    this.setPlaybackState('fault', this.getCurrentSeq(), this.getCurrentLine());
    this.callbacks.onFault?.(reason);
  }

  private getCurrentLine(): number | null {
    if (!this.syncEditorStore) return null;
    return useEditorStore.getState().currentLine;
  }

  private setObserving(observing: boolean): void {
    if (this.observing === observing) return;
    this.observing = observing;
    this.callbacks.onObservationModeChange?.(observing);
  }

  private setPlaybackState(state: PlaybackState, seq: number, line: number | null): void {
    this.playbackState = state;
    if (this.syncEditorStore) {
      useEditorStore.getState().updateTimeline({
        isPlaying: state === 'playing',
        currentSeq: seq,
      });
    }
    this.callbacks.onStateChange?.(state, { seq, line });
    EventBus.emit('playback.state.changed', { state, seq, line });
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
