import {
  WorldSim,
  applyDeltaToState,
  cloneState,
  computeStateSha256,
} from '../sim/index.js';
import type { WorldSimInit, WorldSimState } from '../sim/types.js';
import type { RunEvent } from '../runtime/protocol.js';
import type { ActionTick, VariableEntry } from '../stores/useEditorStore.js';

export const CHECKPOINT_INTERVAL = 200;

export interface TimelineSnapshot {
  eventIndex: number;
  seq: number;
  simState: WorldSimState;
  simHash: string;
  currentLine: number | null;
  variables: VariableEntry[];
  loopIterations: Record<number, { current: number; final: number }>;
  stdoutLines: string[];
}

interface TimelineCheckpoint {
  eventIndex: number;
  seq: number;
  simState: WorldSimState;
  simHash: string;
  currentLine: number | null;
  varsMap: Map<string, VariableEntry>;
  loopIterations: Record<number, { current: number; final: number }>;
  stdoutLines: string[];
}

function cloneLoopIterations(
  src: Record<number, { current: number; final: number }>,
): Record<number, { current: number; final: number }> {
  const out: Record<number, { current: number; final: number }> = {};
  for (const key of Object.keys(src)) {
    const numKey = Number(key);
    const val = src[numKey];
    if (val) {
      out[numKey] = { current: val.current, final: val.final };
    }
  }
  return out;
}

function cloneVarsMap(src: Map<string, VariableEntry>): Map<string, VariableEntry> {
  const out = new Map<string, VariableEntry>();
  for (const [k, v] of src.entries()) {
    out.set(k, { ...v });
  }
  return out;
}

function applyEventToMutableState(
  ev: RunEvent,
  simState: WorldSimState,
  varsMap: Map<string, VariableEntry>,
  loopIterations: Record<number, { current: number; final: number }>,
  stdoutLines: string[],
  currentLineRef: { value: number | null },
): void {
  switch (ev.type) {
    case 'line':
      currentLineRef.value = ev.line;
      break;
    case 'vars':
      for (const ch of ev.changes) {
        const key = `${ch.scope}:${ch.name}`;
        if (ch.deleted) {
          varsMap.delete(key);
        } else {
          varsMap.set(key, {
            scope: ch.scope,
            name: ch.name,
            typeName: ch.typeName,
            repr: ch.repr,
            changedAtSeq: ev.seq,
          });
        }
      }
      break;
    case 'loop': {
      const prev = loopIterations[ev.line];
      loopIterations[ev.line] = {
        current: ev.iteration,
        final: ev.done ? ev.iteration : (prev?.final ?? ev.iteration),
      };
      break;
    }
    case 'stdout':
      stdoutLines.push(ev.text);
      break;
    case 'action':
      applyDeltaToState(simState, ev.delta);
      break;
    case 'error':
      if (ev.error.line !== null) {
        currentLineRef.value = ev.error.line;
      }
      break;
    case 'call':
    case 'return':
    case 'warning':
      break;
  }
}

export class TimelineIndex {
  private initialSimState: WorldSimState | null = null;
  private events: RunEvent[] = [];
  private checkpoints: TimelineCheckpoint[] = [];
  private actionTicks: ActionTick[] = [];

  reset(initialState: WorldSimInit | WorldSimState): void {
    const sim = new WorldSim(initialState);
    const baseState = sim.getState();
    this.initialSimState = baseState;
    this.events = [];
    this.actionTicks = [];
    this.checkpoints = [
      {
        eventIndex: -1,
        seq: 0,
        simState: cloneState(baseState),
        simHash: computeStateSha256(baseState),
        currentLine: null,
        varsMap: new Map(),
        loopIterations: {},
        stdoutLines: [],
      },
    ];
  }

  build(initialState: WorldSimInit | WorldSimState, events: RunEvent[]): void {
    this.reset(initialState);
    this.appendEvents(events);
  }

  appendEvents(newEvents: RunEvent[]): void {
    if (!this.initialSimState) {
      throw new Error('TimelineIndex must be reset with an initialState before appending');
    }
    if (newEvents.length === 0) return;

    const lastCheckpoint = this.checkpoints[this.checkpoints.length - 1]!;
    const simState = cloneState(lastCheckpoint.simState);
    const varsMap = cloneVarsMap(lastCheckpoint.varsMap);
    const loopIterations = cloneLoopIterations(lastCheckpoint.loopIterations);
    const stdoutLines = [...lastCheckpoint.stdoutLines];
    const currentLineRef = { value: lastCheckpoint.currentLine };

    // Catch up from last checkpoint through existing tail events before adding new ones
    for (let i = lastCheckpoint.eventIndex + 1; i < this.events.length; i++) {
      applyEventToMutableState(
        this.events[i]!,
        simState,
        varsMap,
        loopIterations,
        stdoutLines,
        currentLineRef,
      );
    }

    for (const ev of newEvents) {
      const idx = this.events.length;
      this.events.push(ev);
      applyEventToMutableState(
        ev,
        simState,
        varsMap,
        loopIterations,
        stdoutLines,
        currentLineRef,
      );

      if (ev.type === 'action') {
        this.actionTicks.push({
          seq: ev.seq,
          kind: ev.kind,
          line: ev.line,
        });
      } else if (ev.type === 'error') {
        this.actionTicks.push({
          seq: ev.seq,
          kind: 'error',
          line: ev.error.line ?? 1,
          isError: true,
        });
      }

      if ((idx + 1) % CHECKPOINT_INTERVAL === 0) {
        this.checkpoints.push({
          eventIndex: idx,
          seq: ev.seq,
          simState: cloneState(simState),
          simHash: computeStateSha256(simState),
          currentLine: currentLineRef.value,
          varsMap: cloneVarsMap(varsMap),
          loopIterations: cloneLoopIterations(loopIterations),
          stdoutLines: [...stdoutLines],
        });
      }
    }
  }

  getEvents(): readonly RunEvent[] {
    return this.events;
  }

  getLength(): number {
    return this.events.length;
  }

  getCheckpointCount(): number {
    return this.checkpoints.length;
  }

  getActionTicks(): ActionTick[] {
    return this.actionTicks;
  }

  seekToIndex(targetIndex: number): TimelineSnapshot {
    if (!this.initialSimState || this.checkpoints.length === 0) {
      throw new Error('TimelineIndex is empty');
    }

    const clampedIndex = Math.max(-1, Math.min(targetIndex, this.events.length - 1));

    // Find the last checkpoint with eventIndex <= clampedIndex
    let cp = this.checkpoints[0]!;
    for (let i = this.checkpoints.length - 1; i >= 0; i--) {
      if (this.checkpoints[i]!.eventIndex <= clampedIndex) {
        cp = this.checkpoints[i]!;
        break;
      }
    }

    const simState = cloneState(cp.simState);
    const varsMap = cloneVarsMap(cp.varsMap);
    const loopIterations = cloneLoopIterations(cp.loopIterations);
    const stdoutLines = [...cp.stdoutLines];
    const currentLineRef = { value: cp.currentLine };

    for (let i = cp.eventIndex + 1; i <= clampedIndex; i++) {
      applyEventToMutableState(
        this.events[i]!,
        simState,
        varsMap,
        loopIterations,
        stdoutLines,
        currentLineRef,
      );
    }

    const seq = clampedIndex >= 0 ? this.events[clampedIndex]!.seq : 0;
    return {
      eventIndex: clampedIndex,
      seq,
      simState,
      simHash: computeStateSha256(simState),
      currentLine: currentLineRef.value,
      variables: Array.from(varsMap.values()),
      loopIterations,
      stdoutLines,
    };
  }

  seekToSeq(seq: number): TimelineSnapshot {
    if (seq <= 0 || this.events.length === 0) {
      return this.seekToIndex(-1);
    }
    let idx = this.events.findIndex((e) => e.seq >= seq);
    if (idx === -1) {
      idx = this.events.length - 1;
    }
    return this.seekToIndex(idx);
  }

  findNextLineIndex(fromIndex: number): number | null {
    for (let i = fromIndex + 1; i < this.events.length; i++) {
      if (this.events[i]!.type === 'line') return i;
    }
    return null;
  }

  findPrevLineIndex(fromIndex: number): number | null {
    // Find the line event strictly before the active line event at or before fromIndex
    let curLineIdx = -1;
    for (let i = Math.min(fromIndex, this.events.length - 1); i >= 0; i--) {
      if (this.events[i]!.type === 'line') {
        curLineIdx = i;
        break;
      }
    }
    if (curLineIdx <= 0) return -1;
    for (let i = curLineIdx - 1; i >= 0; i--) {
      if (this.events[i]!.type === 'line') return i;
    }
    return -1;
  }

  findNextActionIndex(fromIndex: number): number | null {
    for (let i = fromIndex + 1; i < this.events.length; i++) {
      if (this.events[i]!.type === 'action') return i;
    }
    return null;
  }

  findPrevActionIndex(fromIndex: number): number | null {
    for (let i = Math.min(fromIndex - 1, this.events.length - 1); i >= 0; i--) {
      if (this.events[i]!.type === 'action') return i;
    }
    return -1;
  }
}
