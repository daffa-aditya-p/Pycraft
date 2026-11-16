import { create } from 'zustand';
import { EventBus, type AssistanceTier, type RuntimeStatus } from './EventBus';

export type PlaybackSpeed = 0.5 | 1 | 2 | 4 | 'instant';

export interface VariableEntry {
  scope: string;
  name: string;
  typeName: string;
  repr: string;
  changedAtSeq: number;
}

export interface ConsoleEntry {
  id: string;
  kind: 'stdout' | 'action' | 'warning' | 'error' | 'system';
  text: string;
  line?: number;
  timestamp: number;
}

export interface ActionTick {
  seq: number;
  kind: string;
  line: number;
  isError?: boolean;
}

export interface ScenarioResultSummary {
  scenarioId: string;
  label: string;
  passed: boolean;
  reason?: string;
  isHidden: boolean;
}

export interface MentorPanelState {
  open: boolean;
  activeRung: 0 | 1 | 2 | 3 | 4;
  visorMood: 'neutral' | 'happy' | 'thinking' | 'surprised' | 'concerned' | 'focused' | 'proud' | 'sleepy';
  errorHeadline?: string;
  errorBody?: string;
  socraticQuestion?: string;
  highlightLines?: number[];
  codeSnippet?: string;
  rawTraceback?: string;
}

export interface InputModalState {
  open: boolean;
  mode: 'sab' | 'queue';
  prompt: string;
  expectedCount: number;
  unknownCount: boolean;
  queuedAnswers: string[];
}

export interface EditorStoreState {
  stepId: string | null;
  code: string;
  tier: AssistanceTier;
  playbackSpeed: PlaybackSpeed;
  stepMode: boolean;
  runtimeStatus: RuntimeStatus;
  pyodideProgress: { phase: string; pct: number };
  pyodideReady: boolean;
  crossOriginIsolated: boolean;
  activeRunId: string | null;
  currentLine: number | null;
  loopIterations: Record<number, { current: number; final: number }>;
  variables: VariableEntry[];
  consoleEntries: ConsoleEntry[];
  timeline: {
    totalEvents: number;
    currentSeq: number;
    isPlaying: boolean;
    isDirtyAfterEdit: boolean;
    actionTicks: ActionTick[];
  };
  scenarioResults: ScenarioResultSummary[];
  inputModal: InputModalState;
  mentorPanel: MentorPanelState;
  syntaxError: { line: number; col: number; message: string } | null;

  loadStepEditor: (stepId: string, starterCode: string, tier: AssistanceTier) => void;
  setCode: (code: string, fromUserEdit?: boolean) => void;
  setTier: (tier: AssistanceTier) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setStepMode: (stepMode: boolean) => void;
  setRuntimeStatus: (status: RuntimeStatus, message?: string) => void;
  setPyodideProgress: (phase: string, pct: number) => void;
  setPyodideReady: (ready: boolean, crossOriginIsolated: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  setCurrentLine: (line: number | null) => void;
  updateLoopIteration: (line: number, iteration: number, isFinal?: boolean) => void;
  setVariables: (variables: VariableEntry[]) => void;
  appendConsole: (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => void;
  clearConsole: () => void;
  updateTimeline: (patch: Partial<EditorStoreState['timeline']>) => void;
  setScenarioResults: (results: ScenarioResultSummary[]) => void;
  setInputModal: (patch: Partial<InputModalState>) => void;
  setMentorPanel: (patch: Partial<MentorPanelState>) => void;
  setSyntaxError: (error: { line: number; col: number; message: string } | null) => void;
  resetTraceState: () => void;
}

let consoleSeq = 0;

const INITIAL_INPUT_MODAL: InputModalState = {
  open: false,
  mode: 'queue',
  prompt: '',
  expectedCount: 0,
  unknownCount: false,
  queuedAnswers: [],
};

const INITIAL_MENTOR_PANEL: MentorPanelState = {
  open: false,
  activeRung: 0,
  visorMood: 'neutral',
};

export const useEditorStore = create<EditorStoreState>((set) => ({
  stepId: null,
  code: '',
  tier: 'guided',
  playbackSpeed: 1,
  stepMode: false,
  runtimeStatus: 'idle',
  pyodideProgress: { phase: 'idle', pct: 0 },
  pyodideReady: false,
  crossOriginIsolated: typeof globalThis !== 'undefined' && Boolean(globalThis.crossOriginIsolated),
  activeRunId: null,
  currentLine: null,
  loopIterations: {},
  variables: [],
  consoleEntries: [],
  timeline: {
    totalEvents: 0,
    currentSeq: 0,
    isPlaying: false,
    isDirtyAfterEdit: false,
    actionTicks: [],
  },
  scenarioResults: [],
  inputModal: INITIAL_INPUT_MODAL,
  mentorPanel: INITIAL_MENTOR_PANEL,
  syntaxError: null,

  loadStepEditor: (stepId, starterCode, tier) =>
    set({
      stepId,
      code: starterCode,
      tier,
      playbackSpeed: tier === 'guided' ? 1 : 2,
      currentLine: null,
      loopIterations: {},
      variables: [],
      scenarioResults: [],
      syntaxError: null,
      mentorPanel: INITIAL_MENTOR_PANEL,
      timeline: {
        totalEvents: 0,
        currentSeq: 0,
        isPlaying: false,
        isDirtyAfterEdit: false,
        actionTicks: [],
      },
    }),

  setCode: (code, fromUserEdit = true) =>
    set((s) => ({
      code,
      timeline: fromUserEdit
        ? { ...s.timeline, isDirtyAfterEdit: s.timeline.totalEvents > 0 }
        : s.timeline,
    })),

  setTier: (tier) => set({ tier }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setStepMode: (stepMode) => set({ stepMode }),

  setRuntimeStatus: (runtimeStatus, message) => {
    set({ runtimeStatus });
    EventBus.emit('runtime.status.changed', { status: runtimeStatus, message });
  },

  setPyodideProgress: (phase, pct) => set({ pyodideProgress: { phase, pct } }),

  setPyodideReady: (pyodideReady, crossOriginIsolated) =>
    set({ pyodideReady, crossOriginIsolated }),

  setActiveRunId: (activeRunId) => set({ activeRunId }),
  setCurrentLine: (currentLine) => set({ currentLine }),

  updateLoopIteration: (line, iteration, isFinal = false) =>
    set((s) => ({
      loopIterations: {
        ...s.loopIterations,
        [line]: {
          current: iteration,
          final: isFinal ? iteration : (s.loopIterations[line]?.final ?? iteration),
        },
      },
    })),

  setVariables: (variables) => set({ variables }),

  appendConsole: (entry) =>
    set((s) => ({
      consoleEntries: [
        ...s.consoleEntries.slice(-249),
        {
          ...entry,
          id: `c_${++consoleSeq}`,
          timestamp: Date.now(),
        },
      ],
    })),

  clearConsole: () => set({ consoleEntries: [] }),

  updateTimeline: (patch) =>
    set((s) => ({
      timeline: { ...s.timeline, ...patch },
    })),

  setScenarioResults: (scenarioResults) => set({ scenarioResults }),

  setInputModal: (patch) =>
    set((s) => ({
      inputModal: { ...s.inputModal, ...patch },
    })),

  setMentorPanel: (patch) =>
    set((s) => ({
      mentorPanel: { ...s.mentorPanel, ...patch },
    })),

  setSyntaxError: (syntaxError) => set({ syntaxError }),

  resetTraceState: () =>
    set({
      currentLine: null,
      loopIterations: {},
      variables: [],
      scenarioResults: [],
      timeline: {
        totalEvents: 0,
        currentSeq: 0,
        isPlaying: false,
        isDirtyAfterEdit: false,
        actionTicks: [],
      },
    }),
}));
