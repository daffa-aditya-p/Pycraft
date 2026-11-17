import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_AWAKENING_STEPS,
  AWAKENING_DIALOGUES,
  AWAKENING_QUESTS,
  getMissionById,
  getStepById,
  type MissionStepManifest,
} from '@/content';
import {
  AWAKENING_ZONES,
  GameCanvas,
  clearBitVisualOverride,
  globalInputManager,
  syncBitVisualFromSim,
} from '@/engine';
import {
  DialogueRunner,
  ProgressionController,
  QuestRunner,
  type DialogueAction,
} from '@/game';
import {
  createInitialKCMastery,
  evaluateValidationPipeline,
  selectRecommendedTier,
  updateKCMastery,
} from '@/learning';
import { CuratedMentorProvider, type MentorContext } from '@/mentor';
import {
  commitImportedBundle,
  createStoreBoundSaveManager,
  exportSlotBundle,
  formatExportFilename,
  validateAndPreviewImport,
  type SaveManager,
  type SlotHeaderRecord,
} from '@/persistence';
import { ActionPlayer } from '@/playback';
import { RuntimeClient, type RunEndWorkerEvent } from '@/runtime';
import {
  EventBus,
  useEditorStore,
  useGameStore,
  useSettingsStore,
  useUIStore,
  type ArchitectAppearance,
  type AssistanceTier,
  type KCMasteryRecord,
  type SlotId,
  type SlotSummary,
} from '@/stores';
import {
  CinematicIntroOverlay,
  DialogueBox,
  GameModesScreen,
  GameplayHud,
  JournalModal,
  LearningIntroModal,
  MissionCompleteModal,
  NewAdventureScreen,
  PauseMenu,
  SaveManagementScreen,
  SettingsScreen,
  TitleScreen,
  TouchControls,
  WorldProgressScreen,
  EditorWorkspace,
  type PracticedConceptSummary,
} from '@/ui';
import { BootGate } from './BootGate';
import { CanvasErrorBoundary, EditorErrorBoundary, RootErrorBoundary } from './ErrorBoundaries';

function mapSlotHeadersToSummaries(headers: SlotHeaderRecord[]): SlotSummary[] {
  const byId = new Map<SlotId, SlotHeaderRecord>();
  for (const h of headers) {
    byId.set(h.slotId, h);
  }
  const slots: SlotId[] = [1, 2, 3];
  return slots.map((slotId) => {
    const h = byId.get(slotId);
    if (!h) {
      return {
        schemaVersion: 1,
        slotId,
        occupied: false,
        playerName: '',
        architectRank: 1,
        xp: 0,
        currentRegionId: 'awakening',
        activeQuestId: '',
        completedMissionCount: 0,
        playtimeSeconds: 0,
        updatedAt: 0,
        sha256: '',
      };
    }
    return {
      schemaVersion: 1,
      slotId,
      occupied: h.occupied,
      playerName: h.playerName,
      architectRank: h.architectRank,
      xp: h.xp,
      currentRegionId: h.currentRegionId,
      activeQuestId: h.activeQuestId,
      completedMissionCount: h.completedMissionCount,
      playtimeSeconds: h.playtimeSeconds,
      updatedAt: h.updatedAt,
      sha256: h.sha256,
    };
  });
}

function getZoneCenter(islandId: string): [number, number, number] {
  const zone = AWAKENING_ZONES.find((z) => z.id === islandId);
  if (!zone) return [0, 1, 0];
  return zone.puzzleZoneCenter ?? zone.center;
}

export function App(): React.JSX.Element {
  const screen = useUIStore((s) => s.screen);
  const inGameOverlay = useUIStore((s) => s.inGameOverlay);
  const activePrompt = useUIStore((s) => s.activePrompt);
  const dialogueState = useUIStore((s) => s.dialogue);
  const editorDockOpen = useUIStore((s) => s.editorDockOpen);
  const inputMode = useUIStore((s) => s.inputMode);
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);
  const worldLoadProgress = useUIStore((s) => s.worldLoadProgress);
  const worldLoadPhase = useUIStore((s) => s.worldLoadPhase);
  const announcements = useUIStore((s) => s.announcements);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const setInGameOverlay = useUIStore((s) => s.setInGameOverlay);

  const locale = useSettingsStore((s) => s.locale);
  const activeMissionId = useGameStore((s) => s.quests.activeMissionId);
  const activeStepId = useGameStore((s) => s.quests.activeStepId);
  const code = useEditorStore((s) => s.code);

  const saveManagerRef = useRef<SaveManager | null>(null);
  const runtimeRef = useRef<RuntimeClient | null>(null);
  const actionPlayerRef = useRef<ActionPlayer | null>(null);
  const questRunnerRef = useRef<QuestRunner | null>(null);
  const dialogueRunnerRef = useRef<DialogueRunner | null>(null);
  const progressionRef = useRef<ProgressionController | null>(null);
  const mentorRef = useRef<CuratedMentorProvider>(new CuratedMentorProvider());
  const attemptMapRef = useRef<Map<string, number>>(new Map());
  const seenIntroStepsRef = useRef<Set<string>>(new Set());
  const visibleScenarioIndexRef = useRef<number>(0);
  const pendingInputQueueResolveRef = useRef<((answers: string[] | null) => void) | null>(null);

  const [missionCompleteState, setMissionCompleteState] = useState<{
    open: boolean;
    missionTitle: string;
    xpGained: number;
    conceptsPracticed: PracticedConceptSummary[];
    rewardsUnlocked: string[];
    playerCodeSnippet: string;
    neoLine: string;
  }>({
    open: false,
    missionTitle: '',
    xpGained: 0,
    conceptsPracticed: [],
    rewardsUnlocked: [],
    playerCodeSnippet: '',
    neoLine: '',
  });

  const activeStep: MissionStepManifest = useMemo(() => {
    if (activeStepId) {
      const found = getStepById(activeStepId);
      if (found) return found;
    }
    if (activeMissionId) {
      const mission = getMissionById(activeMissionId);
      if (mission && mission.steps[0]) return mission.steps[0];
    }
    return ALL_AWAKENING_STEPS[0]!;
  }, [activeMissionId, activeStepId]);

  const refreshSlotSummaries = useCallback(async () => {
    const mgr = saveManagerRef.current;
    if (!mgr) return;
    try {
      const headers = await mgr.listSlotHeaders();
      useUIStore.getState().setSlotSummaries(mapSlotHeadersToSummaries(headers));
    } catch {
      useUIStore.getState().setIdbAvailable(false);
    }
  }, []);

  const syncQuestStore = useCallback(() => {
    const qr = questRunnerRef.current;
    if (!qr) return;
    const activeQuest = qr.getActiveQuest();
    const nextObj = activeQuest ? qr.getNextObjectiveForQuest(activeQuest.id) : undefined;
    const objLabel = nextObj ? nextObj.label[useSettingsStore.getState().locale] : null;
    const missionId = nextObj?.missionId ?? activeQuest?.id ?? null;
    const stepId = nextObj?.type === 'code_step' ? nextObj.targetId : null;
    useGameStore.getState().setActiveMissionStep(missionId, stepId, objLabel);
  }, []);

  const openStepInEditor = useCallback(
    (step: MissionStepManifest, showIntroIfFirst = true) => {
      const game = useGameStore.getState();
      const draft = game.learning.stepCodeDrafts[step.stepId];
      const tier: AssistanceTier =
        draft?.tier ?? selectRecommendedTier(step.targetKCs, game.learning.kcMastery);
      const initialCode = draft?.code ?? step.starters[tier] ?? step.starters.guided;

      visibleScenarioIndexRef.current = 0;
      useGameStore.getState().setActiveMissionStep(step.missionId, step.stepId);
      useGameStore.getState().setActivePuzzleZone(step.missionId);
      useEditorStore.getState().loadStepEditor(step.stepId, initialCode, tier);

      if (runtimeRef.current) {
        void runtimeRef.current.loadStep({
          stepId: step.stepId,
          capabilities: step.capabilities,
          scenarios: step.scenarios,
          limits: step.limits,
          astRules: step.astRules,
          functionTests: step.functionTests,
        });
      }

      if (showIntroIfFirst && step.lessonSlides.length > 0 && !seenIntroStepsRef.current.has(step.stepId)) {
        seenIntroStepsRef.current.add(step.stepId);
        setInGameOverlay('learning_intro');
      } else {
        setInGameOverlay('editor');
      }
    },
    [setInGameOverlay]
  );

  // Initialize Persistence, RuntimeClient, ActionPlayer, QuestRunner, DialogueRunner
  useEffect(() => {
    const { manager, unbind } = createStoreBoundSaveManager();
    saveManagerRef.current = manager;

    const actionPlayer = new ActionPlayer({
      syncEditorStore: true,
      callbacks: {
        onObservationModeChange: (observing) => {
          useGameStore.getState().setObservingPlayback(observing);
        },
        onWorldStateChange: (simState) => {
          const mission = getMissionById(useGameStore.getState().quests.activeMissionId ?? '');
          const origin = getZoneCenter(mission?.islandId ?? 'beacon_point');
          syncBitVisualFromSim(origin, simState);
        },
        onFault: (reason) => {
          clearBitVisualOverride();
          useUIStore.getState().pushToast({ kind: 'error', message: reason });
        },
      },
    });
    actionPlayerRef.current = actionPlayer;

    const runtime = new RuntimeClient({
      pyodideBase: '/pyodide/',
      onProgress: (phase, pct) => {
        useEditorStore.getState().setPyodideProgress(phase, pct);
      },
      onReady: ({ isolated }) => {
        useEditorStore.getState().setPyodideReady(true, isolated);
      },
      onEvents: (_runId, batch) => {
        actionPlayer.enqueue(batch);
      },
      onInputRequest: (_runId, prompt) => {
        useEditorStore.getState().setInputModal({
          open: true,
          mode: 'sab',
          prompt,
        });
      },
      onFatal: (message) => {
        useUIStore.getState().pushToast({ kind: 'error', message });
      },
    });
    runtimeRef.current = runtime;

    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!conn?.saveData) {
      runtime.spawnWhenIdle();
    }

    const handleDialogueAction = (action: DialogueAction): void => {
      const qr = questRunnerRef.current;
      if (action.type === 'unlock_quest' && qr) {
        qr.startQuest(action.questId);
        syncQuestStore();
      } else if (action.type === 'complete_objective' && qr) {
        for (const q of AWAKENING_QUESTS) {
          const obj = q.objectives.find((o) => o.id === action.objectiveId);
          if (!obj) continue;
          if (obj.type === 'interact') qr.onInteract(obj.targetId);
          else if (obj.type === 'talk_to') qr.onTalkTo(obj.targetId);
          else if (obj.type === 'go_to') qr.onGoTo(obj.targetId);
          else if (obj.type === 'cutscene') qr.onCutscene(obj.targetId);
          break;
        }
        syncQuestStore();
      } else if (action.type === 'open_mission') {
        const step =
          (action.stepId ? getStepById(action.stepId) : undefined) ??
          getMissionById(action.missionId)?.steps[0];
        if (step) {
          openStepInEditor(step, true);
        }
      } else if (action.type === 'give_item') {
        useGameStore
          .getState()
          .collectWorldItem(`dialogue_${action.itemType}`, action.itemType, action.count);
        qr?.onCollect(action.itemType, action.count);
        syncQuestStore();
      }
    };

    const dialogueRunner = new DialogueRunner({
      locale: useSettingsStore.getState().locale,
      onAction: handleDialogueAction,
    });
    dialogueRunnerRef.current = dialogueRunner;

    const questRunner = new QuestRunner(AWAKENING_QUESTS);
    questRunnerRef.current = questRunner;
    progressionRef.current = new ProgressionController();

    const unsubSaveStatus = EventBus.on('save.status', ({ state, timestamp }) => {
      useUIStore.getState().setSaveStatus(state, timestamp);
      useUIStore.getState().setSaveReadOnlyMode(state === 'readonly');
    });

    const unsubToast = EventBus.on('toast.show', (toast) => {
      useUIStore.getState().pushToast(toast);
    });

    const unsubAction = globalInputManager.onAction((action) => {
      const ui = useUIStore.getState();
      if (ui.screen !== 'in_game') return;
      switch (action) {
        case 'camera_toggle': {
          // Handled directly inside CameraRig to prevent duplicate toggles
          break;
        }
        case 'open_editor': {
          if (ui.inGameOverlay === 'editor') {
            ui.setInGameOverlay('explore');
          } else {
            const step = getStepById(useGameStore.getState().quests.activeStepId ?? '') ?? ALL_AWAKENING_STEPS[0]!;
            openStepInEditor(step, true);
          }
          break;
        }
        case 'open_journal': {
          if (ui.inGameOverlay === 'journal') {
            ui.setInGameOverlay('explore');
          } else {
            ui.setJournalTab('quests');
            ui.setInGameOverlay('journal');
          }
          break;
        }
        case 'open_map': {
          ui.navigateTo('progress');
          break;
        }
        case 'pause': {
          ui.goBack();
          break;
        }
        case 'interact': {
          const targetId = ui.activePrompt?.targetId;
          if (targetId) {
            EventBus.emit('player.interact', { targetId, kind: ui.activePrompt?.kind ?? 'device' });
          }
          break;
        }
      }
    });

    const unsubInteract = EventBus.on('player.interact', ({ targetId }) => {
      const loc = useSettingsStore.getState().locale;
      const qr = questRunnerRef.current;
      if (qr) {
        qr.onInteract(targetId);
        qr.onTalkTo(targetId);
        syncQuestStore();
      }
      const tree =
        targetId === 'neo_pedestal'
          ? AWAKENING_DIALOGUES.prologue_neo_reboot
          : targetId === 'beacon_terminal'
            ? AWAKENING_DIALOGUES.m1_beacon_intro
            : targetId === 'bit_robot'
              ? AWAKENING_DIALOGUES.interlude_bit_wake
              : undefined;

      if (tree && dialogueRunnerRef.current) {
        const node = dialogueRunnerRef.current.start(tree, loc);
        if (node) {
          useUIStore.getState().setDialogue({
            active: true,
            npcId: targetId,
            speakerName: node.speaker,
            lines: [node.text[loc]],
            lineIndex: 0,
            choices: (node.choices ?? []).map((c) => ({ id: c.id, label: c.label[loc] })),
          });
          useUIStore.getState().setInGameOverlay('dialogue');
          return;
        }
      }

      if (targetId.includes('terminal') || targetId.includes('beacon') || targetId.includes('gate') || targetId.includes('farm') || targetId.includes('depot') || targetId.includes('altar')) {
        const step = getStepById(useGameStore.getState().quests.activeStepId ?? '') ?? ALL_AWAKENING_STEPS[0]!;
        openStepInEditor(step, true);
      }
    });

    void (async () => {
      try {
        await manager.init();
        const loadedSettings = await manager.loadSettings();
        useSettingsStore.getState().hydrateSettings({
          id: 'global',
          schemaVersion: 1,
          locale: loadedSettings.locale,
          audio: loadedSettings.audio,
          graphics: loadedSettings.graphics,
          controls: loadedSettings.controls,
          accessibility: loadedSettings.accessibility,
          lastActiveSlotId: loadedSettings.lastActiveSlotId,
        });
        await refreshSlotSummaries();
      } catch {
        useUIStore.getState().setIdbAvailable(false);
      }
    })();

    return () => {
      unsubSaveStatus();
      unsubToast();
      unsubAction();
      unsubInteract();
      unbind();
      void manager.dispose();
      actionPlayer.stop();
      runtime.dispose();
    };
  }, [openStepInEditor, refreshSlotSummaries, syncQuestStore]);

  // Playtime ticker (1s resolution during active gameplay)
  useEffect(() => {
    if (screen !== 'in_game' || inGameOverlay === 'paused') return;
    const timer = window.setInterval(() => {
      useGameStore.getState().tickPlaytime(1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, inGameOverlay]);

  const enterLoadedGame = useCallback(async (isNewGame = false) => {
    const game = useGameStore.getState();
    questRunnerRef.current = new QuestRunner(AWAKENING_QUESTS, {
      states: game.quests.states,
      completedStepIds: game.quests.completedStepIds,
    });
    progressionRef.current = new ProgressionController({
      xp: game.learning.xp,
      awardedStepIds: game.quests.completedStepIds,
      awardedLoreIds: game.world.discoveredLoreNoteIds,
      unlockedCosmeticIds: game.profile.cosmetics.unlockedIds,
      restoredZoneIds: game.world.restoredZoneIds,
    });
    syncQuestStore();

    useUIStore.getState().setWorldLoadProgress(40, 'Menyiapkan pulau Aetheria…');
    navigateTo('loading_world');
    await new Promise((r) => setTimeout(r, 180));
    useUIStore.getState().setWorldLoadProgress(100, 'Siap!');
    navigateTo('in_game', { pushHistory: false });
    if (isNewGame) {
      useUIStore.getState().setInGameOverlay('cinematic');
    } else {
      useUIStore.getState().setInGameOverlay('explore');
    }
  }, [navigateTo, syncQuestStore]);

  const handleCinematicComplete = useCallback(() => {
    const loc = useSettingsStore.getState().locale;
    useUIStore.getState().setInGameOverlay('explore');
    const qr = questRunnerRef.current;
    if (qr) {
      qr.startQuest('awakening_q1');
      syncQuestStore();
    }
    const tree = AWAKENING_DIALOGUES.prologue_neo_reboot;
    if (tree && dialogueRunnerRef.current) {
      const node = dialogueRunnerRef.current.start(tree, loc);
      if (node) {
        useUIStore.getState().setDialogue({
          active: true,
          npcId: 'neo_pedestal',
          speakerName: node.speaker,
          lines: [node.text[loc]],
          lineIndex: 0,
          choices: (node.choices ?? []).map((c) => ({ id: c.id, label: c.label[loc] })),
        });
        useUIStore.getState().setInGameOverlay('dialogue');
      }
    }
  }, [syncQuestStore]);

  const handleContinueAdventure = useCallback(
    async (slot: SlotSummary) => {
      const mgr = saveManagerRef.current;
      if (!mgr) return;
      const result = await mgr.loadSlot(slot.slotId);
      if (result.corrupted) {
        useUIStore.getState().pushToast({
          kind: 'error',
          message: 'Data petualangan rusak. Pulihkan dari cadangan di Kelola Simpanan.',
        });
        navigateTo('save_management');
        return;
      }
      if (result.ok && result.state) {
        const rawPayload = result.state.payload;
        const normalizedDrafts: Record<
          string,
          { code: string; tier: AssistanceTier; updatedAt: number }
        > = {};
        for (const [stepId, draft] of Object.entries(rawPayload.learning.stepCodeDrafts)) {
          const tier: AssistanceTier =
            draft.tier === 'guided' ||
            draft.tier === 'assisted' ||
            draft.tier === 'independent' ||
            draft.tier === 'mastery'
              ? draft.tier
              : 'guided';
          normalizedDrafts[stepId] = {
            code: draft.code,
            tier,
            updatedAt: draft.updatedAt,
          };
        }
        useGameStore.getState().loadSavePayload(slot.slotId, {
          ...rawPayload,
          learning: {
            ...rawPayload.learning,
            stepCodeDrafts: normalizedDrafts,
          },
        });
        useSettingsStore.getState().setLastActiveSlotId(slot.slotId);
        useUIStore.getState().setSaveReadOnlyMode(result.readOnly);
        await enterLoadedGame(false);
      }
    },
    [enterLoadedGame, navigateTo]
  );

  const handleStartNewAdventure = useCallback(
    async (slotId: SlotId, playerName: string, appearance: ArchitectAppearance) => {
      const mgr = saveManagerRef.current;
      useGameStore.getState().resetForNewAdventure(slotId, playerName, appearance);
      useSettingsStore.getState().setLastActiveSlotId(slotId);
      if (mgr) {
        await mgr.createBackup(slotId, 'pre_overwrite');
        const res = await mgr.saveSlot(
          slotId,
          useGameStore.getState().exportSavePayload()
        );
        useUIStore.getState().setSaveReadOnlyMode(res.errorCode === 'READ_ONLY_TAB');
        await refreshSlotSummaries();
      }
      await enterLoadedGame(true);
    },
    [enterLoadedGame, refreshSlotSummaries]
  );

  const handleExportSlot = useCallback(async (slotId: SlotId) => {
    const mgr = saveManagerRef.current;
    if (!mgr) return;
    const db = await mgr.init();
    const bundle = await exportSlotBundle(db, slotId);
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = formatExportFilename(slotId);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportSlot = useCallback(
    async (slotId: SlotId, rawText: string) => {
      const mgr = saveManagerRef.current;
      if (!mgr) return;
      const preview = await validateAndPreviewImport(rawText);
      if (!preview.ok) {
        useUIStore.getState().pushToast({
          kind: 'error',
          message: preview.message,
        });
        return;
      }
      const result = await commitImportedBundle(mgr, slotId, preview.bundle);
      if (result.ok) {
        await refreshSlotSummaries();
        useUIStore.getState().pushToast({
          kind: 'success',
          message: `Slot ${slotId} berhasil diimpor.`,
        });
      } else {
        useUIStore.getState().pushToast({
          kind: 'error',
          message: result.message ?? 'Gagal mengimpor file simpanan.',
        });
      }
    },
    [refreshSlotSummaries]
  );

  const handleRestoreBackup = useCallback(
    async (slotId: SlotId) => {
      const mgr = saveManagerRef.current;
      if (!mgr) return;
      const res = await mgr.restoreFromLatestBackup(slotId);
      await refreshSlotSummaries();
      useUIStore.getState().pushToast({
        kind: res.ok ? 'success' : 'error',
        message: res.ok ? `Cadangan Slot ${slotId} dipulihkan.` : res.message ?? 'Tidak ada cadangan.',
      });
    },
    [refreshSlotSummaries]
  );

  const handleDeleteSlot = useCallback(
    async (slotId: SlotId) => {
      const mgr = saveManagerRef.current;
      if (!mgr) return;
      await mgr.deleteSlot(slotId);
      await refreshSlotSummaries();
    },
    [refreshSlotSummaries]
  );

  const handleClearAllData = useCallback(async () => {
    const mgr = saveManagerRef.current;
    if (!mgr) return;
    await mgr.clearAllData();
    await refreshSlotSummaries();
  }, [refreshSlotSummaries]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const handleRunCode = useCallback(
    async (playerCode: string) => {
      const runtime = runtimeRef.current;
      const player = actionPlayerRef.current;
      if (!runtime || !player) return;

      const step = activeStep;
      const loc = useSettingsStore.getState().locale;
      const ed = useEditorStore.getState();
      const attempt = (attemptMapRef.current.get(step.stepId) ?? 0) + 1;
      attemptMapRef.current.set(step.stepId, attempt);

      useGameStore.getState().saveCodeDraft(step.stepId, playerCode, ed.tier);
      ed.resetTraceState();
      ed.clearConsole();
      ed.setSyntaxError(null);
      ed.setMentorPanel({ open: false, activeRung: 0 });

      const visibleIdx = Math.min(
        Math.max(0, visibleScenarioIndexRef.current),
        step.scenarios.length - 1
      );
      const visibleScenario = step.scenarios[visibleIdx]!;
      player.beginRun(visibleScenario.initialState);
      player.setSpeed(ed.playbackSpeed);
      player.setStepMode(ed.stepMode);

      if (!ed.pyodideReady) {
        ed.setRuntimeStatus('preparing');
        await runtime.ensureReady();
      }

      await runtime.loadStep({
        stepId: step.stepId,
        capabilities: step.capabilities,
        scenarios: step.scenarios,
        limits: step.limits,
        astRules: step.astRules,
        functionTests: step.functionTests,
      });

      ed.setRuntimeStatus('running');

      let runEnd: RunEndWorkerEvent;
      try {
        runEnd = await runtime.run({
          code: playerCode,
          visibleScenarioIndex: visibleIdx,
          onNeedInputQueue: ({ count, unknownCount }) =>
            new Promise<string[] | null>((resolve) => {
              pendingInputQueueResolveRef.current = resolve;
              useEditorStore.getState().setInputModal({
                open: true,
                mode: 'queue',
                prompt: 'Siapkan jawaban untuk input()',
                expectedCount: count,
                unknownCount,
              });
            }),
        });
      } catch (err) {
        ed.setRuntimeStatus('error');
        ed.appendConsole({ kind: 'error', text: (err as Error).message });
        return;
      }

      player.finishStream(runEnd.finalStateHash);
      player.play();

      const validation = evaluateValidationPipeline({
        stepId: step.stepId,
        code: playerCode,
        locale: loc,
        rules: step.astRules,
        workerAstReport: runEnd.astReport,
        scenarioResults: runEnd.scenarioResults,
        functionTests: runEnd.functionTests,
        expectedScenarioCount: step.scenarios.length,
      });

      ed.setScenarioResults(
        validation.scenarioResults.map((r, idx) => ({
          scenarioId: r.scenarioId,
          label: r.label ?? step.scenarios[idx]?.label ?? r.scenarioId,
          passed: r.passed,
          reason: r.failedReasons[0],
          isHidden: idx !== visibleIdx,
        }))
      );

      const game = useGameStore.getState();
      const hasPassed = runEnd.status === 'ok' && validation.passed;

      if (hasPassed) {
        ed.setRuntimeStatus('completed');
        const practicedSummaries: PracticedConceptSummary[] = [];
        for (const kcId of step.targetKCs) {
          const prev = game.learning.kcMastery[kcId] ?? createInitialKCMastery(kcId);
          const prevScore = prev.score;
          const nextRec: KCMasteryRecord = updateKCMastery(
            prev,
            {
              stepId: step.stepId,
              tier: ed.tier,
              passed: true,
              usedRung4Solution: ed.mentorPanel.activeRung === 4,
              consecutiveErrorsInStep: 0,
            },
            'awakening'
          );
          game.updateKCMastery(kcId, nextRec);
          practicedSummaries.push({
            kcId,
            title: kcId,
            previousScore: prevScore,
            newScore: nextRec.score,
          });
        }

        const xpAwarded = game.completeMissionStep(step.missionId, step.stepId, ed.tier, step.xp);
        if (step.unlocksCosmeticId) {
          game.unlockCosmetic(step.unlocksCosmeticId);
        }
        questRunnerRef.current?.onCodeStepPassed(step.missionId, step.stepId);
        syncQuestStore();

        const mission = getMissionById(step.missionId);
        const isLastMainStep =
          mission &&
          mission.steps.filter((s) => !s.isBonus).slice(-1)[0]?.stepId === step.stepId;

        if (mission && isLastMainStep) {
          // RC-10: Auto-collapse editor during 5s restoration sequence
          useUIStore.getState().collapseEditorForRestoration(true);
          game.markZoneRestored(mission.islandId, mission.missionId);
          EventBus.emit('audio.cue', { cue: 'quest_complete' });
          window.setTimeout(() => {
            useUIStore.getState().collapseEditorForRestoration(false);
            setMissionCompleteState({
              open: true,
              missionTitle: mission.title[loc],
              xpGained: xpAwarded,
              conceptsPracticed: practicedSummaries,
              rewardsUnlocked: step.unlocksCosmeticId ? [step.unlocksCosmeticId] : [],
              playerCodeSnippet: playerCode,
              neoLine:
                loc === 'id'
                  ? 'Kerja bagus, Arsitek! Mesin pulau ini kembali menyala.'
                  : 'Well done, Architect! This island’s machinery is alive again.',
            });
            useUIStore.getState().setInGameOverlay('mission_complete');
          }, 1200);
        } else {
          EventBus.emit('audio.cue', { cue: 'ui_confirm' });
        }
      } else {
        ed.setRuntimeStatus(
          runEnd.status === 'stopped'
            ? 'stopped'
            : runEnd.status === 'limit'
              ? 'limit_reached'
              : 'error'
        );
        const errorInfo = runEnd.error;
        if (errorInfo) {
          ed.setSyntaxError({
            line: errorInfo.line ?? 1,
            col: errorInfo.col ?? 1,
            message: errorInfo.msg,
          });
        }

        const ctx: MentorContext = {
          locale: loc,
          missionId: step.missionId,
          stepId: step.stepId,
          targetKCs: step.targetKCs,
          assistanceTier: ed.tier,
          playerCode,
          attemptNumber: attempt,
          lastError: errorInfo,
          failedScenarioId: validation.firstFailedScenarioId,
          astReport: runEnd.astReport,
          simSummary: {
            robotPos: [0, 0],
            actionsExecuted: 0,
            warningCodes: [],
          },
        };
        const mentorResp = await mentorRef.current.explainError(ctx);
        ed.setMentorPanel({
          open: true,
          activeRung: mentorResp.rung,
          visorMood: mentorResp.visorMood,
          errorHeadline: mentorResp.headline,
          errorBody: mentorResp.body,
          socraticQuestion: mentorResp.socraticQuestion,
          highlightLines: mentorResp.highlightLines,
          codeSnippet: mentorResp.codeSnippet,
          rawTraceback: errorInfo?.tracebackUser.join('\n'),
        });
        EventBus.emit('audio.cue', { cue: 'ui_error' });
      }
    },
    [activeStep, syncQuestStore]
  );

  const handleRequestHint = useCallback(
    async (rung: 1 | 2 | 3 | 4) => {
      const ed = useEditorStore.getState();
      const loc = useSettingsStore.getState().locale;
      const ctx: MentorContext = {
        locale: loc,
        missionId: activeStep.missionId,
        stepId: activeStep.stepId,
        targetKCs: activeStep.targetKCs,
        assistanceTier: ed.tier,
        playerCode: ed.code,
        attemptNumber: attemptMapRef.current.get(activeStep.stepId) ?? 1,
        hintLadder: activeStep.hintLadder,
        simSummary: { robotPos: [0, 0], actionsExecuted: 0, warningCodes: [] },
      };
      const resp = await mentorRef.current.getHint(ctx, rung);
      ed.setMentorPanel({
        open: true,
        activeRung: resp.rung,
        visorMood: resp.visorMood,
        errorHeadline: resp.headline,
        errorBody: resp.body,
        socraticQuestion: resp.socraticQuestion,
        highlightLines: resp.highlightLines,
        codeSnippet: resp.codeSnippet,
      });
    },
    [activeStep]
  );

  const handleSubmitInputAnswers = useCallback((answers: string[]) => {
    const ed = useEditorStore.getState();
    if (ed.inputModal.mode === 'sab') {
      runtimeRef.current?.provideInputAnswer(answers[0] ?? '');
    } else if (pendingInputQueueResolveRef.current) {
      const resolve = pendingInputQueueResolveRef.current;
      pendingInputQueueResolveRef.current = null;
      resolve(answers);
    }
    ed.setInputModal({ open: false });
  }, []);

  const currentSlide = activeStep.lessonSlides[0];

  return (
    <RootErrorBoundary>
      <BootGate>
        <div
          data-testid="pycraft-app"
          data-screen={screen}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CanvasErrorBoundary>
            <GameCanvas />
          </CanvasErrorBoundary>

          {screen === 'title' && (
            <TitleScreen
              onContinueAdventure={handleContinueAdventure}
              onToggleFullscreen={handleToggleFullscreen}
            />
          )}

          {screen === 'new_adventure' && (
            <NewAdventureScreen
              onStartNewAdventure={handleStartNewAdventure}
              onExportSlot={handleExportSlot}
            />
          )}

          {screen === 'loading_world' && (
            <div
              role="status"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(28, 36, 39, 0.85)',
                color: '#E8EEF0',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#F2B544' }}>
                {worldLoadPhase || 'Menyiapkan dunia…'} {worldLoadProgress}%
              </div>
            </div>
          )}

          {screen === 'modes' && <GameModesScreen />}
          {screen === 'progress' && <WorldProgressScreen />}
          {screen === 'settings' && (
            <SettingsScreen
              onResetPythonWorker={() => void runtimeRef.current?.restartPython()}
              onOpenSaveManagement={() => navigateTo('save_management')}
            />
          )}
          {screen === 'save_management' && (
            <SaveManagementScreen
              onLoadSlot={(slotId) => {
                const slot = useUIStore.getState().slotSummaries.find((s) => s.slotId === slotId);
                if (slot) void handleContinueAdventure(slot);
              }}
              onExportSlot={handleExportSlot}
              onImportSlot={handleImportSlot}
              onRestoreBackup={handleRestoreBackup}
              onDeleteSlot={handleDeleteSlot}
              onClearAllData={handleClearAllData}
            />
          )}

          {screen === 'in_game' && (
            <>
              {inGameOverlay === 'cinematic' && (
                <CinematicIntroOverlay onComplete={handleCinematicComplete} />
              )}

              <GameplayHud
                isCinematic={inGameOverlay === 'dialogue' || inGameOverlay === 'cinematic'}
                onInteract={(targetId) =>
                  EventBus.emit('player.interact', {
                    targetId,
                    kind: activePrompt?.kind ?? 'device',
                  })
                }
                onToggleCamera={() => globalInputManager.triggerAction('camera_toggle')}
                onRecoverSave={() => navigateTo('save_management')}
              />

              {inputMode === 'touch' && inGameOverlay === 'explore' && (
                <TouchControls
                  onJoystickMove={(vec) =>
                    globalInputManager.setTouchJoystick(vec.x, vec.y, vec.sprint)
                  }
                  onCameraDrag={(dx, dy) => globalInputManager.injectOrbitDelta(dx, dy)}
                  onCameraPinch={(delta) => globalInputManager.injectZoomDelta(delta)}
                  onJump={() => {
                    globalInputManager.setTouchJump(true);
                    window.setTimeout(() => globalInputManager.setTouchJump(false), 120);
                  }}
                  onInteract={(targetId) =>
                    EventBus.emit('player.interact', {
                      targetId,
                      kind: activePrompt?.kind ?? 'device',
                    })
                  }
                  onToggleCamera={() => globalInputManager.triggerAction('camera_toggle')}
                />
              )}

              {dialogueState.active && inGameOverlay === 'dialogue' && (
                <DialogueBox
                  onAdvance={() => {
                    const runner = dialogueRunnerRef.current;
                    if (!runner) return;
                    const next = runner.advance();
                    if (!next) {
                      useUIStore.getState().setDialogue({ active: false });
                      if (useUIStore.getState().inGameOverlay === 'dialogue') {
                        setInGameOverlay('explore');
                      }
                      return;
                    }
                    useUIStore.getState().setDialogue({
                      speakerName: next.speaker,
                      lines: [next.text[locale]],
                      lineIndex: 0,
                      choices: (next.choices ?? []).map((c) => ({ id: c.id, label: c.label[locale] })),
                    });
                  }}
                  onSelectChoice={(choiceId) => {
                    const runner = dialogueRunnerRef.current;
                    if (!runner) return;
                    const next = runner.choose(choiceId);
                    if (!next) {
                      useUIStore.getState().setDialogue({ active: false });
                      if (useUIStore.getState().inGameOverlay === 'dialogue') {
                        setInGameOverlay('explore');
                      }
                      return;
                    }
                    useUIStore.getState().setDialogue({
                      speakerName: next.speaker,
                      lines: [next.text[locale]],
                      lineIndex: 0,
                      choices: (next.choices ?? []).map((c) => ({ id: c.id, label: c.label[locale] })),
                    });
                  }}
                />
              )}

              <LearningIntroModal
                open={inGameOverlay === 'learning_intro'}
                conceptTitle={currentSlide?.title[locale] ?? activeStep.title[locale]}
                conceptSummary={currentSlide?.body[locale] ?? activeStep.goal[locale]}
                inWorldNote={activeStep.goal[locale]}
                exampleCode={currentSlide?.exampleCode ?? activeStep.referenceSolution}
                exampleOutput={activeStep.title[locale]}
                onTryExample={(exampleCode) => {
                  useEditorStore.getState().setCode(exampleCode, false);
                  setInGameOverlay('editor');
                }}
                onComplete={() => setInGameOverlay('editor')}
              />

              {(editorDockOpen || inGameOverlay === 'editor') && (
                <EditorErrorBoundary>
                  <EditorWorkspace
                    stepTitle={activeStep.title[locale]}
                    requirementChips={activeStep.requirementChips[locale]}
                    capabilities={activeStep.capabilities}
                    targetKCs={activeStep.targetKCs}
                    guidedTemplate={activeStep.starters.guided}
                    onRun={(playerCode) => void handleRunCode(playerCode)}
                    onStop={() => {
                      runtimeRef.current?.stop();
                      actionPlayerRef.current?.stop();
                    }}
                    onResetCode={() => {
                      const ed = useEditorStore.getState();
                      ed.setCode(activeStep.starters[ed.tier] ?? activeStep.starters.guided, false);
                    }}
                    onRequestHint={(rung) => void handleRequestHint(rung)}
                    onTimelinePlayPause={() => {
                      const ap = actionPlayerRef.current;
                      if (!ap) return;
                      if (ap.getState() === 'playing') ap.pause();
                      else ap.play();
                    }}
                    onTimelineSeek={(seq) => actionPlayerRef.current?.seekToSeq(seq)}
                    onTimelineStep={(dir) => {
                      if (dir > 0) actionPlayerRef.current?.stepForwardLine();
                      else actionPlayerRef.current?.stepBackLine();
                    }}
                    onTimelineJumpAction={(dir) => {
                      if (dir > 0) actionPlayerRef.current?.nextAction();
                      else actionPlayerRef.current?.prevAction();
                    }}
                    onPreviewScenario={(scenarioId) => {
                      const idx = activeStep.scenarios.findIndex((s) => s.id === scenarioId);
                      if (idx >= 0) {
                        visibleScenarioIndexRef.current = idx;
                        void handleRunCode(code);
                      }
                    }}
                    onSubmitInputAnswers={handleSubmitInputAnswers}
                  />
                </EditorErrorBoundary>
              )}

              <JournalModal
                onPracticeKC={(_kcId, stepId) => {
                  const found = getStepById(stepId);
                  if (found) openStepInEditor(found, false);
                }}
              />

              {inGameOverlay === 'paused' && (
                <PauseMenu
                  onSaveNow={async () => {
                    const mgr = saveManagerRef.current;
                    const slotId = useGameStore.getState().activeSlotId;
                    if (mgr && slotId) {
                      await mgr.saveSlot(slotId, useGameStore.getState().exportSavePayload());
                      await refreshSlotSummaries();
                    }
                  }}
                  onExportCurrentSlot={async () => {
                    const slotId = useGameStore.getState().activeSlotId;
                    if (slotId) await handleExportSlot(slotId);
                  }}
                  onReturnToTitle={() => navigateTo('title')}
                />
              )}

              <MissionCompleteModal
                open={missionCompleteState.open || inGameOverlay === 'mission_complete'}
                missionTitle={missionCompleteState.missionTitle}
                xpGained={missionCompleteState.xpGained}
                conceptsPracticed={missionCompleteState.conceptsPracticed}
                rewardsUnlocked={missionCompleteState.rewardsUnlocked}
                playerCodeSnippet={missionCompleteState.playerCodeSnippet}
                neoLine={missionCompleteState.neoLine}
                onContinue={() => {
                  setMissionCompleteState((s) => ({ ...s, open: false }));
                  setInGameOverlay('explore');
                }}
              />
            </>
          )}

          {screen !== 'in_game' && toasts.length > 0 && (
            <div
              aria-label="Notifikasi"
              style={{
                position: 'fixed',
                top: '16px',
                right: '16px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  role="status"
                  className="surface-slate"
                  style={{
                    padding: '10px 14px',
                    borderColor:
                      toast.kind === 'error'
                        ? '#E0603F'
                        : toast.kind === 'warning'
                          ? '#E9A23B'
                          : toast.kind === 'success'
                            ? '#6DBE4B'
                            : '#33434A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                  }}
                >
                  <span>{toast.message}</span>
                  <button
                    type="button"
                    aria-label="Tutup notifikasi"
                    onClick={() => dismissToast(toast.id)}
                    style={{
                      background: 'transparent',
                      color: '#8FA3A9',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {screen !== 'in_game' && (
            <div
              id="game-announcements"
              aria-live="polite"
              aria-atomic="true"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
              }}
            >
              {announcements}
            </div>
          )}
        </div>
      </BootGate>
    </RootErrorBoundary>
  );
}

export default App;
