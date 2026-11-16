import { create } from 'zustand';
import { EventBus } from './EventBus';
import type { SlotId } from './useSettingsStore';

export type ScreenState =
  | 'boot'
  | 'unsupported'
  | 'title'
  | 'new_adventure'
  | 'loading_world'
  | 'modes'
  | 'progress'
  | 'settings'
  | 'save_management'
  | 'in_game';

export type InGameOverlay =
  | 'explore'
  | 'dialogue'
  | 'editor'
  | 'journal'
  | 'map'
  | 'paused'
  | 'mission_complete'
  | 'learning_intro';

export type JournalTab = 'quests' | 'inventory' | 'skill_tree' | 'profile';
export type LayoutClass = 'D' | 'T' | 'L' | 'P';
export type InputMode = 'mouse+keyboard' | 'touch' | 'keyboard-only';
export type MobileSheetSnap = 'peek' | 'half' | 'full';
export type SaveIndicatorState = 'idle' | 'saving' | 'saved' | 'error' | 'readonly';

export interface ActiveInteractPrompt {
  targetId: string;
  label: string;
  keyHint: string;
  kind: 'npc' | 'device' | 'item' | 'lore' | 'puzzle';
}

export interface DialogueChoice {
  id: string;
  label: string;
}

export interface DialogueUIState {
  active: boolean;
  npcId: string | null;
  speakerName: string;
  lines: string[];
  lineIndex: number;
  choices: DialogueChoice[];
  history: Array<{ speaker: string; text: string }>;
}

export interface ToastItem {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface SlotSummary {
  schemaVersion: 1;
  slotId: SlotId;
  occupied: boolean;
  playerName: string;
  architectRank: number;
  xp: number;
  currentRegionId: string;
  activeQuestId: string;
  completedMissionCount: number;
  playtimeSeconds: number;
  updatedAt: number;
  sha256: string;
}

export interface UIStoreState {
  screen: ScreenState;
  inGameOverlay: InGameOverlay;
  journalTab: JournalTab;
  layoutClass: LayoutClass;
  inputMode: InputMode;
  isFullscreen: boolean;
  fullscreenSupported: boolean;
  keyboardOpen: boolean;
  mobileSheetSnap: MobileSheetSnap;
  editorDockOpen: boolean;
  editorAutoCollapsedForRestoration: boolean;
  saveReadOnlyMode: boolean;
  saveStatus: SaveIndicatorState;
  lastSavedAt: number | null;
  announcements: string;
  toasts: ToastItem[];
  bootError: string | null;
  idbAvailable: boolean;
  worldLoadProgress: number;
  worldLoadPhase: string;
  activePrompt: ActiveInteractPrompt | null;
  dialogue: DialogueUIState;
  activeSlotSelection: SlotId | null;
  slotSummaries: SlotSummary[];
  historyStack: Array<{ screen: ScreenState; overlay: InGameOverlay }>;

  navigateTo: (screen: ScreenState, options?: { pushHistory?: boolean }) => void;
  goBack: () => boolean;
  setInGameOverlay: (overlay: InGameOverlay) => void;
  setJournalTab: (tab: JournalTab) => void;
  setLayoutClass: (layoutClass: LayoutClass) => void;
  setInputMode: (inputMode: InputMode) => void;
  setFullscreen: (isFullscreen: boolean, supported?: boolean) => void;
  setKeyboardOpen: (open: boolean) => void;
  setMobileSheetSnap: (snap: MobileSheetSnap) => void;
  setEditorDockOpen: (open: boolean) => void;
  collapseEditorForRestoration: (collapsed: boolean) => void;
  setSaveStatus: (status: SaveIndicatorState, timestamp?: number) => void;
  setSaveReadOnlyMode: (readOnly: boolean) => void;
  announce: (text: string) => void;
  pushToast: (toast: Omit<ToastItem, 'id'> & { id?: string; durationMs?: number }) => string;
  dismissToast: (id: string) => void;
  setBootError: (message: string | null) => void;
  setIdbAvailable: (available: boolean) => void;
  setWorldLoadProgress: (pct: number, phase?: string) => void;
  setActivePrompt: (prompt: ActiveInteractPrompt | null) => void;
  setDialogue: (patch: Partial<DialogueUIState>) => void;
  setActiveSlotSelection: (slotId: SlotId | null) => void;
  setSlotSummaries: (summaries: SlotSummary[]) => void;
}

const INITIAL_DIALOGUE: DialogueUIState = {
  active: false,
  npcId: null,
  speakerName: '',
  lines: [],
  lineIndex: 0,
  choices: [],
  history: [],
};

let toastCounter = 0;

function pushBrowserHistory(screen: ScreenState, overlay: InGameOverlay): void {
  if (typeof window !== 'undefined' && window.history?.pushState) {
    try {
      window.history.pushState({ pycraftScreen: screen, pycraftOverlay: overlay }, '');
    } catch {
      // Ignore restricted history environments
    }
  }
}

export const useUIStore = create<UIStoreState>((set, get) => ({
  screen: 'boot',
  inGameOverlay: 'explore',
  journalTab: 'quests',
  layoutClass: 'D',
  inputMode: 'mouse+keyboard',
  isFullscreen: false,
  fullscreenSupported: false,
  keyboardOpen: false,
  mobileSheetSnap: 'peek',
  editorDockOpen: false,
  editorAutoCollapsedForRestoration: false,
  saveReadOnlyMode: false,
  saveStatus: 'idle',
  lastSavedAt: null,
  announcements: '',
  toasts: [],
  bootError: null,
  idbAvailable: true,
  worldLoadProgress: 0,
  worldLoadPhase: '',
  activePrompt: null,
  dialogue: INITIAL_DIALOGUE,
  activeSlotSelection: null,
  slotSummaries: [],
  historyStack: [],

  navigateTo: (nextScreen, options) => {
    const pushHistory = options?.pushHistory ?? true;
    const { screen, inGameOverlay, historyStack } = get();
    if (screen === nextScreen) return;
    const updatedStack = pushHistory
      ? [...historyStack.slice(-15), { screen, overlay: inGameOverlay }]
      : historyStack;
    if (pushHistory && screen !== 'boot') {
      pushBrowserHistory(nextScreen, 'explore');
    }
    set({
      screen: nextScreen,
      inGameOverlay: nextScreen === 'in_game' ? 'explore' : inGameOverlay,
      historyStack: updatedStack,
    });
  },

  goBack: () => {
    const { screen, inGameOverlay, historyStack } = get();
    if (screen === 'in_game') {
      if (inGameOverlay !== 'explore') {
        set({ inGameOverlay: 'explore', editorDockOpen: false, keyboardOpen: false });
        return true;
      }
      set({ inGameOverlay: 'paused' });
      EventBus.emit('save.requested', { reason: 'pause_opened', immediate: true });
      return true;
    }
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1]!;
      set({
        screen: prev.screen,
        inGameOverlay: prev.overlay,
        historyStack: historyStack.slice(0, -1),
      });
      return true;
    }
    if (screen !== 'title' && screen !== 'boot' && screen !== 'unsupported') {
      set({ screen: 'title' });
      return true;
    }
    return false;
  },

  setInGameOverlay: (overlay) => {
    const { screen, inGameOverlay } = get();
    if (overlay === inGameOverlay) return;
    if (screen === 'in_game' && overlay !== 'explore') {
      pushBrowserHistory('in_game', overlay);
    }
    if (overlay === 'paused') {
      EventBus.emit('save.requested', { reason: 'pause_opened', immediate: true });
    }
    set({
      inGameOverlay: overlay,
      editorDockOpen: overlay === 'editor',
    });
  },

  setJournalTab: (journalTab) => set({ journalTab }),
  setLayoutClass: (layoutClass) => set({ layoutClass }),
  setInputMode: (inputMode) => set({ inputMode }),
  setFullscreen: (isFullscreen, supported) =>
    set((s) => ({
      isFullscreen,
      fullscreenSupported: supported ?? s.fullscreenSupported,
    })),
  setKeyboardOpen: (keyboardOpen) => set({ keyboardOpen }),
  setMobileSheetSnap: (mobileSheetSnap) => set({ mobileSheetSnap }),
  setEditorDockOpen: (editorDockOpen) =>
    set({
      editorDockOpen,
      inGameOverlay: editorDockOpen ? 'editor' : 'explore',
    }),
  collapseEditorForRestoration: (collapsed) =>
    set({
      editorAutoCollapsedForRestoration: collapsed,
      mobileSheetSnap: collapsed ? 'peek' : get().mobileSheetSnap,
    }),

  setSaveStatus: (saveStatus, timestamp) =>
    set((s) => ({
      saveStatus,
      lastSavedAt: timestamp ?? s.lastSavedAt,
    })),

  setSaveReadOnlyMode: (saveReadOnlyMode) =>
    set({
      saveReadOnlyMode,
      saveStatus: saveReadOnlyMode ? 'readonly' : 'idle',
    }),

  announce: (text) => {
    set({ announcements: text });
    EventBus.emit('a11y.announce', { text, priority: 'polite' });
  },

  pushToast: ({ id, kind, message, durationMs = 4000 }) => {
    const toastId = id ?? `toast_${++toastCounter}`;
    set((s) => ({
      toasts: [...s.toasts.slice(-3), { id: toastId, kind, message }],
    }));
    if (durationMs > 0 && typeof window !== 'undefined') {
      window.setTimeout(() => {
        get().dismissToast(toastId);
      }, durationMs);
    }
    return toastId;
  },

  dismissToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

  setBootError: (bootError) => set({ bootError }),
  setIdbAvailable: (idbAvailable) => set({ idbAvailable }),
  setWorldLoadProgress: (worldLoadProgress, worldLoadPhase = '') =>
    set({ worldLoadProgress, worldLoadPhase }),
  setActivePrompt: (activePrompt) => set({ activePrompt }),
  setDialogue: (patch) =>
    set((s) => ({
      dialogue: { ...s.dialogue, ...patch },
    })),
  setActiveSlotSelection: (activeSlotSelection) => set({ activeSlotSelection }),
  setSlotSummaries: (slotSummaries) => set({ slotSummaries }),
}));
