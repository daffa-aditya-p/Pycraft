import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
  computeLayoutClass,
  contrastRatio,
  toStoreLayoutClass,
} from '@/ui/index';
import { GameModesScreen } from '@/ui/screens/GameModesScreen';
import { TitleScreen } from '@/ui/screens/TitleScreen';
import { CinematicIntroOverlay } from '@/ui/screens/CinematicIntroOverlay';
import { WorldProgressScreen } from '@/ui/screens/WorldProgressScreen';
import { GameplayHud } from '@/ui/hud/GameplayHud';
import { JournalModal } from '@/ui/panels/JournalModal';
import { TouchControls } from '@/ui/hud/TouchControls';
import { EditorWorkspace } from '@/ui/panels/EditorWorkspace';
import { NewAdventureScreen } from '@/ui/screens/NewAdventureScreen';
import { MissionCompleteModal } from '@/ui/screens/MissionCompleteModal';
import { PortraitOrientationGuard } from '@/ui/components/PortraitOrientationGuard';
import { InputManager } from '@/engine/input/InputManager';
import {
  guidedBlanksExtension,
  guidedBlanksField,
  parseBlankTemplate,
  setGuidedBlanksEffect,
} from '@/editor/blankWidgets';
import {
  filterAllowedApiSpecs,
  getUnlockedSnippetChips,
} from '@/editor/autocomplete';
import { EventBus, useEditorStore, useGameStore, useSettingsStore, useUIStore } from '@/stores';
import { AWAKENING_QUESTS } from '@/content/awakening/quests';

// Ensure React 19 act() works cleanly in jsdom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(element: React.ReactElement): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(element);
  });
  return container;
}

afterEach(() => {
  if (root) {
    act(() => {
      root!.unmount();
    });
    root = null;
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    container = null;
  }
  vi.restoreAllMocks();
});

beforeEach(() => {
  useSettingsStore.getState().resetAll();
  useUIStore.setState({
    screen: 'title',
    inGameOverlay: 'explore',
    layoutClass: 'D',
    inputMode: 'mouse+keyboard',
    keyboardOpen: false,
    mobileSheetSnap: 'peek',
    editorDockOpen: false,
    editorAutoCollapsedForRestoration: false,
    slotSummaries: [],
    announcements: '',
    toasts: [],
  });
  useEditorStore.getState().loadStepEditor('m1_1', 'print("___")', 'guided');
});

describe('UI Design Tokens & WCAG 2.1 AA Contrast', () => {
  it('enforces >= 4.5:1 contrast for Slate and Parchment text tokens including #8FA3A9', () => {
    const mutedOnBase = contrastRatio('#8FA3A9', '#1C2427');
    expect(mutedOnBase).toBeGreaterThanOrEqual(5.0);

    expect(contrastRatio('#8FA3A9', '#243034')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#8FA3A9', '#1A2225')).toBeGreaterThanOrEqual(5.0);
    expect(contrastRatio('#E8EEF0', '#1C2427')).toBeGreaterThanOrEqual(10);
    expect(contrastRatio('#A9B8BD', '#1C2427')).toBeGreaterThanOrEqual(7);
    expect(contrastRatio('#2A2420', '#F3EAD8')).toBeGreaterThanOrEqual(10);
    expect(contrastRatio('#1C2427', '#F2B544')).toBeGreaterThanOrEqual(7);
  });
});

describe('Responsive Layout Class Computation', () => {
  it('classifies Desktop, Tablet Landscape/Portrait, Phone Landscape, and Phone Portrait', () => {
    expect(computeLayoutClass(1440, 900, false)).toBe('D');
    expect(computeLayoutClass(1024, 768, true)).toBe('T-Landscape');
    expect(computeLayoutClass(900, 700, false)).toBe('T-Landscape');
    expect(computeLayoutClass(768, 1024, true)).toBe('T-Portrait');
    expect(computeLayoutClass(844, 390, true)).toBe('L');
    expect(computeLayoutClass(844, 200, true)).toBe('L');
    expect(computeLayoutClass(390, 844, true)).toBe('P');
    // Phone portrait with virtual keyboard open (height < 500 but width < height) stays P
    expect(computeLayoutClass(390, 420, true)).toBe('P');

    expect(toStoreLayoutClass('T-Landscape')).toBe('T');
    expect(toStoreLayoutClass('T-Portrait')).toBe('T');
    expect(toStoreLayoutClass('L')).toBe('L');
  });
});

describe('CodeMirror Guided Blank Widgets & Autocomplete', () => {
  it('parses ___ blank tokens with exact character offsets and line numbers', () => {
    const template = 'print("___")\nfor i in range(___):\n    robot.move(___)';
    const parsed = parseBlankTemplate(template);
    expect(parsed.blanks).toHaveLength(3);
    expect(parsed.blanks[0]).toMatchObject({ index: 0, line: 1, placeholder: '___' });
    expect(template.slice(parsed.blanks[0]!.from, parsed.blanks[0]!.to)).toBe('___');
    expect(parsed.blanks[1]).toMatchObject({ index: 1, line: 2, placeholder: '___' });
    expect(template.slice(parsed.blanks[1]!.from, parsed.blanks[1]!.to)).toBe('___');
    expect(parsed.blanks[2]).toMatchObject({ index: 2, line: 3, placeholder: '___' });
  });

  it('tracks Guided blanks while allowing free editing on Line 1 and outside blanks without lockout', () => {
    const template = 'print("___")';
    const parsed = parseBlankTemplate(template);

    let state = EditorState.create({
      doc: template,
      extensions: [guidedBlanksExtension()],
    });
    state = state.update({
      effects: setGuidedBlanksEffect.of({
        enabled: true,
        spans: parsed.blanks.map((b) => ({ index: b.index, from: b.from, to: b.to })),
      }),
    }).state;

    // Editing on Line 1 outside blanks (e.g. prepending a comment) is allowed and shifts blank spans cleanly
    const editedOutside = state.update({
      changes: { from: 0, to: 0, insert: '# header\n' },
    }).state;
    expect(editedOutside.doc.toString()).toBe('# header\nprint("___")');
    const shiftedSpans = editedOutside.field(guidedBlanksField).spans;
    expect(shiftedSpans[0]!.from).toBe(parsed.blanks[0]!.from + '# header\n'.length);
    expect(shiftedSpans[0]!.to).toBe(parsed.blanks[0]!.to + '# header\n'.length);

    // Paste/replace inside blank span 7..10 -> allowed
    const blank = parsed.blanks[0]!;
    const pastedState = state.update({
      changes: { from: blank.from, to: blank.to, insert: 'Halo Aetheria' },
    }).state;
    expect(pastedState.doc.toString()).toBe('print("Halo Aetheria")');

    // Blank span expands dynamically to cover inserted text
    const spans = pastedState.field(guidedBlanksField).spans;
    expect(spans[0]!.from).toBe(blank.from);
    expect(spans[0]!.to).toBe(blank.from + 'Halo Aetheria'.length);
  });

  it('scopes autocomplete and mobile snippet chips to active step capabilities', () => {
    const m1Allowed = filterAllowedApiSpecs(['print', 'input']).map((s) => s.id);
    expect(m1Allowed).toEqual(['print', 'input']);
    expect(m1Allowed).not.toContain('robot.plant');

    const m1Chips = getUnlockedSnippetChips(['print'], ['F2']).map((c) => c.id);
    expect(m1Chips).toContain('print');
    expect(m1Chips).not.toContain('for');
    expect(m1Chips).not.toContain('robot.plant');

    const m4Chips = getUnlockedSnippetChips(
      ['print', 'robot.move', 'robot.plant'],
      ['L1']
    ).map((c) => c.id);
    expect(m4Chips).toContain('for');
    expect(m4Chips).toContain('robot.plant');
  });
});

describe('UI Screens, Accessibility & RC-10 Behaviors', () => {
  it('renders TitleScreen with Pilih Petualangan routing and disabled Continue when empty', () => {
    const el = mount(React.createElement(TitleScreen));
    expect(el.textContent).toContain('PYCRAFT');
    expect(el.textContent).toContain('Code Your World');
    expect(el.textContent).toContain('Belum ada petualangan tersimpan');

    const continueBtn = el.querySelector<HTMLButtonElement>('[data-testid="btn-continue-adventure"]');
    expect(continueBtn?.disabled).toBe(true);

    const selectBtn = el.querySelector<HTMLButtonElement>('[data-testid="btn-select-adventure"]');
    expect(selectBtn?.textContent).toContain('Pilih Petualangan');
    act(() => {
      selectBtn!.click();
    });
    expect(useUIStore.getState().screen).toBe('save_management');
  });

  it('enforces aria-disabled="true" and tabIndex=-1 on future GameModes rows', () => {
    const el = mount(React.createElement(GameModesScreen));

    const adventure = el.querySelector<HTMLButtonElement>('[data-testid="mode-row-adventure"]');
    expect(adventure?.tagName).toBe('BUTTON');
    expect(adventure?.getAttribute('aria-disabled')).toBeNull();

    for (const id of ['automation', 'sandbox', 'challenge']) {
      const row = el.querySelector<HTMLElement>(`[data-testid="mode-row-${id}"]`);
      expect(row).not.toBeNull();
      expect(row?.tagName).toBe('DIV');
      expect(row?.getAttribute('aria-disabled')).toBe('true');
      expect(row?.tabIndex).toBe(-1);
      expect(row?.textContent).toContain('[Segera Hadir]');
    }
  });

  it('displays all 8 Aetheria regions in WorldProgressScreen', () => {
    const el = mount(React.createElement(WorldProgressScreen));
    const regionItems = el.querySelectorAll('[data-testid^="region-item-"]');
    expect(regionItems.length).toBe(8);
    expect(el.textContent).toContain('Kebangkitan');
    expect(el.textContent).toContain('Benteng Inti');
  });

  it('updates #game-announcements aria-live="polite" on EventBus milestones', () => {
    const el = mount(React.createElement(GameplayHud));
    const live = el.querySelector('#game-announcements');
    expect(live?.getAttribute('aria-live')).toBe('polite');

    act(() => {
      EventBus.emit('mission.step.passed', {
        missionId: 'm1',
        stepId: 'm1_1',
        tier: 'guided',
        xpAwarded: 50,
        isFirstPass: true,
      });
    });

    expect(live?.textContent).toContain('m1_1');
    expect(live?.textContent).toContain('+50 XP');
  });

  it('captures pointerId on TouchControls joystick so thumb drift never drops movement', () => {
    const onMove = vi.fn();
    const el = mount(React.createElement(TouchControls, { onJoystickMove: onMove }));
    const zone = el.querySelector<HTMLDivElement>('[data-testid="touch-joystick-zone"]')!;
    const setPointerCapture = vi.fn();
    zone.setPointerCapture = setPointerCapture;
    zone.hasPointerCapture = () => true;
    zone.releasePointerCapture = vi.fn();

    act(() => {
      const downEvt = new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 80,
        clientY: 600,
      });
      Object.defineProperty(downEvt, 'pointerId', { value: 7 });
      zone.dispatchEvent(downEvt);
    });
    expect(setPointerCapture).toHaveBeenCalledWith(7);

    // Thumb drifts far past 40% to X=700 on the right side
    act(() => {
      const moveEvt = new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 700,
        clientY: 600,
      });
      Object.defineProperty(moveEvt, 'pointerId', { value: 7 });
      zone.dispatchEvent(moveEvt);
    });
    expect(onMove).toHaveBeenLastCalledWith({ x: 1, y: 0, sprint: true });
  });

  it('auto-collapses EditorWorkspace on world.zone.restored and expands L-mode keyboard overlay', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { value: 844, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 390, configurable: true });

    useUIStore.setState({
      editorDockOpen: true,
      inGameOverlay: 'editor',
      layoutClass: 'L',
      keyboardOpen: true,
    });

    const el = mount(React.createElement(EditorWorkspace, { stepTitle: 'M1.1' }));
    const ws = el.querySelector<HTMLElement>('[data-testid="editor-workspace"]');
    expect(ws?.getAttribute('data-layout-class')).toBe('L');
    expect(ws?.getAttribute('data-keyboard-overlay')).toBe('true');
    expect(el.querySelector('[data-testid="btn-close-keyboard"]')?.textContent).toContain(
      'Tutup Keyboard'
    );

    // Close keyboard and emit restoration event -> collapses to rail for 5s
    act(() => {
      el.querySelector<HTMLButtonElement>('[data-testid="btn-close-keyboard"]')?.click();
    });
    act(() => {
      EventBus.emit('world.zone.restored', { zoneId: 'beacon', missionId: 'm1' });
    });
    expect(useUIStore.getState().editorAutoCollapsedForRestoration).toBe(true);
    expect(el.querySelector('[data-testid="editor-landscape-rail"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(useUIStore.getState().editorAutoCollapsedForRestoration).toBe(false);
    vi.useRealTimers();
  });
});

describe('Cinematic Intro Overlay & Lore Narration', () => {
  it('renders letterbox bars, subtitle card, speaker badge, and skip button', () => {
    const onComplete = vi.fn();
    const el = mount(React.createElement(CinematicIntroOverlay, { onComplete }));

    const overlay = el.querySelector('[data-testid="cinematic-intro-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Aetheria: Chronicles');
    expect(overlay?.textContent).toContain('Suara Purba Aetheria');
    expect(overlay?.textContent).toContain('Lewati');
  });

  it('completes cinematic on skip button click and emits camera release', () => {
    const onComplete = vi.fn();
    let shotEvent: unknown = 'init';
    EventBus.on('cinematic.shot', (s) => {
      shotEvent = s;
    });

    const el = mount(React.createElement(CinematicIntroOverlay, { onComplete }));
    const skipBtn = el.querySelector<HTMLButtonElement>('button.btn-primary-chamfer');
    expect(skipBtn).not.toBeNull();

    act(() => {
      skipBtn?.click();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(shotEvent).toBeNull();
  });

  it('completes cinematic on Escape or Space keydown', () => {
    const onComplete = vi.fn();
    mount(React.createElement(CinematicIntroOverlay, { onComplete }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('JournalModal & Quest Objectives System (Acts 1-4)', () => {
  it('renders all 4 Acts in sequence with titles, summaries, and objective checklists', () => {
    useUIStore.setState({
      screen: 'in_game',
      inGameOverlay: 'journal',
      journalTab: 'quests',
    });

    const el = mount(React.createElement(JournalModal, {}));
    const modal = el.querySelector('[data-testid="journal-modal"]');
    expect(modal).not.toBeNull();

    // Verify Act 1 - Act 4 headers exist
    expect(modal?.textContent).toContain('Babak 1: Prolog & Menara Suar');
    expect(modal?.textContent).toContain('Babak 2: Hutan Pasokan & BIT');
    expect(modal?.textContent).toContain('Babak 3: Gerbang Terkunci & Ladang');
    expect(modal?.textContent).toContain('Babak 4: Bengkel & Puncak Inti');

    // Verify quests exist
    expect(modal?.textContent).toContain('Prolog: Bangun');
    expect(modal?.textContent).toContain('Misi 1: Halo Arsitek');
    expect(modal?.textContent).toContain('Selingan: Mencari BIT');
    expect(modal?.textContent).toContain('Misi 2: Pengumpul Data');
    expect(modal?.textContent).toContain('Misi 3: Gerbang Terkunci');
    expect(modal?.textContent).toContain('Misi 4: Ladang Otomatis');
    expect(modal?.textContent).toContain('Misi 5: Cetak Biru');
    expect(modal?.textContent).toContain('Tantangan Inti: Inti yang Terbangun');

    // Verify objective label exists
    expect(modal?.textContent).toContain('Lompati undakan batu di Kuil Stasis');
  });

  it('highlights the active objective with in-progress badge and glowing indicator', () => {
    useUIStore.setState({
      screen: 'in_game',
      inGameOverlay: 'journal',
      journalTab: 'quests',
    });
    useGameStore.setState({
      objectiveLabel: 'Lompati undakan batu di Kuil Stasis',
    });

    const el = mount(React.createElement(JournalModal, {}));
    expect(el.textContent).toContain('SEDANG DIKERJAKAN');
  });

  it('clicking hud-objective-badge in GameplayHud opens Journal on quests tab', () => {
    useUIStore.setState({
      screen: 'in_game',
      inGameOverlay: 'explore',
      journalTab: 'inventory',
    });

    const el = mount(React.createElement(GameplayHud, {}));
    const badge = el.querySelector<HTMLButtonElement>('[data-testid="hud-objective-badge"]');
    expect(badge).not.toBeNull();

    act(() => {
      badge?.click();
    });

    expect(useUIStore.getState().inGameOverlay).toBe('journal');
    expect(useUIStore.getState().journalTab).toBe('quests');
  });

  it('renders stepGoal task banner and btn-next-step CTA when runtimeStatus is completed', () => {
    const onNextStep = vi.fn();
    useUIStore.setState({
      editorDockOpen: true,
      inGameOverlay: 'editor',
      layoutClass: 'D',
    });
    useEditorStore.setState({
      runtimeStatus: 'completed',
    });

    const el = mount(
      React.createElement(EditorWorkspace, {
        stepTitle: '1.1 Suara Pertama',
        stepGoal: 'Cetak "Halo Aetheria" di Terminal Suar.',
        hasNextStep: true,
        nextStepTitle: '1.2 Urutan Boot',
        onNextStep,
      })
    );

    expect(el.querySelector('[data-testid="editor-step-goal"]')?.textContent).toContain(
      'Cetak "Halo Aetheria" di Terminal Suar.'
    );
    const nextBtn = el.querySelector<HTMLButtonElement>('[data-testid="btn-next-step"]');
    expect(nextBtn).not.toBeNull();
    act(() => {
      nextBtn?.click();
    });
    expect(onNextStep).toHaveBeenCalledTimes(1);
  });

  it('maps upward virtual joystick drag to positive forward movement (not inverted)', () => {
    const input = new InputManager();
    useUIStore.setState({
      screen: 'in_game',
      inGameOverlay: 'explore',
      inputMode: 'touch',
    });

    const onMove = (vec: { x: number; y: number; sprint: boolean }) => {
      input.setTouchJoystick(vec.x, vec.y, vec.sprint);
    };
    const el = mount(React.createElement(TouchControls, { onJoystickMove: onMove }));
    const zone = el.querySelector<HTMLDivElement>('[data-testid="touch-joystick-zone"]')!;
    zone.setPointerCapture = vi.fn();
    zone.hasPointerCapture = () => true;
    zone.releasePointerCapture = vi.fn();

    act(() => {
      const downEvt = new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 250,
      });
      Object.defineProperty(downEvt, 'pointerId', { value: 11 });
      zone.dispatchEvent(downEvt);
    });

    // Drag thumb UP on screen (clientY decreases: 250 -> 150) => forward
    act(() => {
      const upDrag = new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 100,
        clientY: 150,
      });
      Object.defineProperty(upDrag, 'pointerId', { value: 11 });
      zone.dispatchEvent(upDrag);
    });

    const forwardSnap = input.getMovementInput();
    expect(forwardSnap.moveZ).toBeGreaterThan(0.9);
    expect(Math.abs(forwardSnap.moveX)).toBeLessThan(0.05);

    // Drag thumb DOWN on screen (clientY increases: 250 -> 350) => backward
    act(() => {
      const downDrag = new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 100,
        clientY: 350,
      });
      Object.defineProperty(downDrag, 'pointerId', { value: 11 });
      zone.dispatchEvent(downDrag);
    });

    const backwardSnap = input.getMovementInput();
    expect(backwardSnap.moveZ).toBeLessThan(-0.9);
  });

  it('shows PortraitOrientationGuard on portrait mobile viewport and clears on landscape', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });

    const el = mount(React.createElement(PortraitOrientationGuard));
    expect(el.querySelector('[data-testid="portrait-orientation-guard"]')).not.toBeNull();

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 844, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 390, configurable: true });
      window.dispatchEvent(new Event('resize'));
    });
    expect(el.querySelector('[data-testid="portrait-orientation-guard"]')).toBeNull();
  });

  it('all 8 Awakening quests and all 36 objectives contain localized hints in id and en', () => {
    expect(AWAKENING_QUESTS.length).toBe(8);
    let totalObjectives = 0;
    for (const q of AWAKENING_QUESTS) {
      expect(q.hint).toBeDefined();
      expect(q.hint?.id.length).toBeGreaterThan(10);
      expect(q.hint?.en.length).toBeGreaterThan(10);
      totalObjectives += q.objectives.length;
      for (const obj of q.objectives) {
        expect(obj.hint).toBeDefined();
        expect(obj.hint?.id.length).toBeGreaterThan(5);
        expect(obj.hint?.en.length).toBeGreaterThan(5);
      }
    }
    expect(totalObjectives).toBe(36);
  });

  it('renders quest hint and prerequisite lock warning in JournalModal', () => {
    useUIStore.setState({
      screen: 'in_game',
      inGameOverlay: 'journal',
      journalTab: 'quests',
    });
    useGameStore.setState((s) => ({
      ...s,
      quests: {
        ...s.quests,
        states: {
          prologue: 'active',
          m1_hello_architect: 'locked',
        },
      },
    }));

    const el = mount(React.createElement(JournalModal, {}));
    expect(el.textContent).toContain('Petunjuk Quest & Konsep Python:');
    // m1_hello_architect has prerequisite 'prologue'
    expect(el.textContent).toContain('Terkunci: Harus menyelesaikan quest');
  });

  it('renders objective hint in GameplayHud when objectiveHint is present in store', () => {
    useUIStore.setState({
      screen: 'in_game',
      inGameOverlay: 'explore',
    });
    useGameStore.setState((s) => ({
      ...s,
      objectiveLabel: 'Hidupkan NEO di alas batu',
      objectiveHint: 'Dekati alas batu silinder tempat kapsul stasis NEO berada, lalu tekan [E].',
    }));

    const el = mount(React.createElement(GameplayHud, {}));
    const badge = el.querySelector('[data-testid="hud-objective-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('Hidupkan NEO di alas batu');
    expect(badge?.textContent).toContain('Dekati alas batu silinder tempat kapsul stasis NEO berada');
  });

  it('renders live ArchitectAvatarPreview in NewAdventureScreen with 10 hair and 10 scarf colors', () => {
    useSettingsStore.setState({ locale: 'id' });
    useUIStore.setState({ screen: 'new_adventure', slotSummaries: [] });

    const el = mount(React.createElement(NewAdventureScreen, {}));
    const preview = el.querySelector('[data-testid="architect-avatar-preview"]');
    expect(preview).not.toBeNull();

    // Expanded palette options exist and update preview dynamically when clicked
    const crimsonHairBtn = el.querySelector('button[aria-label="Merah Crimson"]') as HTMLButtonElement | null;
    const purpleScarfBtn = el.querySelector('button[aria-label="Ungu Royal"]') as HTMLButtonElement | null;
    const snowScarfBtn = el.querySelector('button[aria-label="Putih Salju"]') as HTMLButtonElement | null;
    const emeraldHairBtn = el.querySelector('button[aria-label="Hijau Zamrud"]') as HTMLButtonElement | null;
    expect(crimsonHairBtn).not.toBeNull();
    expect(purpleScarfBtn).not.toBeNull();
    expect(snowScarfBtn).not.toBeNull();
    expect(emeraldHairBtn).not.toBeNull();

    act(() => {
      crimsonHairBtn!.click();
      purpleScarfBtn!.click();
    });

    expect(preview?.textContent).toContain('Merah Crimson');
    expect(preview?.textContent).toContain('Ungu Royal');
  });

  it('resolves human-readable KC titles via getKC inside MissionCompleteModal instead of F6 — F6', () => {
    useSettingsStore.setState({ locale: 'id' });

    const el = mount(
      React.createElement(MissionCompleteModal, {
        open: true,
        missionTitle: 'Misi 1: Halo Arsitek',
        xpGained: 35,
        conceptsPracticed: [
          { kcId: 'F6', title: 'F6', previousScore: 0, newScore: 10 },
          { kcId: 'V1', title: 'V1', previousScore: 0, newScore: 10 },
          { kcId: 'F2', title: 'F2', previousScore: 20, newScore: 30 },
        ],
        rewardsUnlocked: [],
        playerCodeSnippet: 'nama = input("siapa namamu?")\nprint("Selamat datang,", nama)',
        neoLine: 'Kerja bagus, Arsitek!',
        onContinue: () => undefined,
      })
    );

    expect(el.textContent).toContain('Membaca Masukan dengan input()');
    expect(el.textContent).toContain('Menampilkan Output dengan print()');
    expect(el.textContent).not.toContain('F6 — F6');
  });
});
