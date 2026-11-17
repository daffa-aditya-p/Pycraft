import { create } from 'zustand';
import { EventBus, type QualityPreset } from './EventBus';

export type LocaleCode = 'id' | 'en';
export type TextScaleOption = 100 | 125 | 150;
export type SlotId = 1 | 2 | 3;

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

export interface GraphicsSettings {
  quality: QualityPreset;
  showFps: boolean;
  autoDegrade: boolean;
}

export interface ControlSettings {
  cameraSensitivity: number;
  invertY: boolean;
  autoIsoInPuzzle: boolean;
  leftHandedTouch: boolean;
  pointerLock: boolean;
}

export interface AccessibilitySettings {
  textScale: TextScaleOption;
  reducedMotion: boolean;
  highContrastOutline: boolean;
  screenReaderHints: boolean;
}

export interface SettingsDTO {
  id: 'global';
  schemaVersion: 1;
  locale: LocaleCode;
  audio: AudioSettings;
  graphics: GraphicsSettings;
  controls: ControlSettings;
  accessibility: AccessibilitySettings;
  lastActiveSlotId: SlotId | null;
}

export const DEFAULT_SETTINGS: SettingsDTO = {
  id: 'global',
  schemaVersion: 1,
  locale: 'id',
  audio: {
    master: 0.8,
    music: 0.5,
    sfx: 0.85,
    muted: false,
  },
  graphics: {
    quality: 'high',
    showFps: false,
    autoDegrade: true,
  },
  controls: {
    cameraSensitivity: 1.0,
    invertY: false,
    autoIsoInPuzzle: false,
    leftHandedTouch: false,
    pointerLock: false,
  },
  accessibility: {
    textScale: 100,
    reducedMotion: false,
    highContrastOutline: false,
    screenReaderHints: true,
  },
  lastActiveSlotId: null,
};

export interface SettingsStoreState extends SettingsDTO {
  hydrated: boolean;
  setLocale: (locale: LocaleCode) => void;
  updateAudio: (patch: Partial<AudioSettings>) => void;
  updateGraphics: (patch: Partial<GraphicsSettings>, reason?: 'auto' | 'manual') => void;
  updateControls: (patch: Partial<ControlSettings>) => void;
  updateAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  setLastActiveSlotId: (slotId: SlotId | null) => void;
  hydrateSettings: (dto: SettingsDTO) => void;
  resetSection: (section: 'audio' | 'graphics' | 'controls' | 'accessibility') => void;
  resetAll: () => void;
  exportDTO: () => SettingsDTO;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function emitSettingsChanged(): void {
  EventBus.emit('save.requested', { reason: 'settings_changed', immediate: true });
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  setLocale: (locale) => {
    set({ locale });
    emitSettingsChanged();
  },

  updateAudio: (patch) => {
    set((state) => ({
      audio: {
        master: patch.master !== undefined ? clamp01(patch.master) : state.audio.master,
        music: patch.music !== undefined ? clamp01(patch.music) : state.audio.music,
        sfx: patch.sfx !== undefined ? clamp01(patch.sfx) : state.audio.sfx,
        muted: patch.muted !== undefined ? patch.muted : state.audio.muted,
      },
    }));
    emitSettingsChanged();
  },

  updateGraphics: (patch, reason = 'manual') => {
    const prevQuality = get().graphics.quality;
    set((state) => ({
      graphics: { ...state.graphics, ...patch },
    }));
    if (patch.quality && patch.quality !== prevQuality) {
      EventBus.emit('quality.preset.changed', { preset: patch.quality, reason });
    }
    emitSettingsChanged();
  },

  updateControls: (patch) => {
    set((state) => ({
      controls: {
        ...state.controls,
        ...patch,
        cameraSensitivity:
          patch.cameraSensitivity !== undefined
            ? Math.max(0.25, Math.min(2.5, patch.cameraSensitivity))
            : state.controls.cameraSensitivity,
      },
    }));
    emitSettingsChanged();
  },

  updateAccessibility: (patch) => {
    set((state) => ({
      accessibility: { ...state.accessibility, ...patch },
    }));
    emitSettingsChanged();
  },

  setLastActiveSlotId: (lastActiveSlotId) => {
    set({ lastActiveSlotId });
    emitSettingsChanged();
  },

  hydrateSettings: (dto) => {
    set({
      ...DEFAULT_SETTINGS,
      ...dto,
      audio: { ...DEFAULT_SETTINGS.audio, ...dto.audio },
      graphics: { ...DEFAULT_SETTINGS.graphics, ...dto.graphics },
      controls: { ...DEFAULT_SETTINGS.controls, ...dto.controls },
      accessibility: { ...DEFAULT_SETTINGS.accessibility, ...dto.accessibility },
      hydrated: true,
    });
  },

  resetSection: (section) => {
    set({ [section]: { ...DEFAULT_SETTINGS[section] } } as Partial<SettingsStoreState>);
    if (section === 'graphics') {
      EventBus.emit('quality.preset.changed', {
        preset: DEFAULT_SETTINGS.graphics.quality,
        reason: 'manual',
      });
    }
    emitSettingsChanged();
  },

  resetAll: () => {
    set({ ...DEFAULT_SETTINGS, hydrated: true });
    EventBus.emit('quality.preset.changed', {
      preset: DEFAULT_SETTINGS.graphics.quality,
      reason: 'manual',
    });
    emitSettingsChanged();
  },

  exportDTO: () => {
    const s = get();
    return {
      id: 'global',
      schemaVersion: 1,
      locale: s.locale,
      audio: { ...s.audio },
      graphics: { ...s.graphics },
      controls: { ...s.controls },
      accessibility: { ...s.accessibility },
      lastActiveSlotId: s.lastActiveSlotId,
    };
  },
}));
