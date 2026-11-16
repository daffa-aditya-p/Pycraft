import { EventBus } from '../../stores/EventBus';
import type { Locale } from '../../mentor/types';
import type {
  ActiveObjectiveView,
  QuestDefinition,
  QuestEventHandler,
  QuestObjective,
  QuestStatus,
} from './types';

export class QuestRunner {
  private readonly quests: readonly QuestDefinition[];
  private readonly questMap: Map<string, QuestDefinition>;
  private states: Record<string, QuestStatus>;
  private completedObjectiveIds: Set<string>;
  private completedStepIds: Set<string>;
  private collectCounts: Record<string, number>;
  private readonly handlers: QuestEventHandler;

  constructor(
    quests: readonly QuestDefinition[],
    initial?: {
      states?: Record<string, QuestStatus>;
      completedStepIds?: string[];
      completedObjectiveIds?: string[];
      collectCounts?: Record<string, number>;
    },
    handlers: QuestEventHandler = {}
  ) {
    this.quests = [...quests].sort((a, b) => a.order - b.order);
    this.questMap = new Map(this.quests.map((q) => [q.id, q]));
    this.handlers = handlers;
    this.completedStepIds = new Set(initial?.completedStepIds ?? []);
    this.completedObjectiveIds = new Set(initial?.completedObjectiveIds ?? []);
    this.collectCounts = { ...(initial?.collectCounts ?? {}) };

    this.states = {};
    for (const q of this.quests) {
      const provided = initial?.states?.[q.id];
      if (provided) {
        this.states[q.id] = provided;
      } else {
        this.states[q.id] = q.prerequisites.length === 0 ? 'active' : 'locked';
      }
    }
    this.syncCompletedStepsToObjectives();
  }

  private syncCompletedStepsToObjectives(): void {
    for (const q of this.quests) {
      for (const obj of q.objectives) {
        if (obj.type === 'code_step' && this.completedStepIds.has(obj.targetId)) {
          this.completedObjectiveIds.add(obj.id);
        }
      }
    }
  }

  getStates(): Record<string, QuestStatus> {
    return { ...this.states };
  }

  getCompletedStepIds(): string[] {
    return Array.from(this.completedStepIds);
  }

  getCompletedObjectiveIds(): string[] {
    return Array.from(this.completedObjectiveIds);
  }

  getQuestStatus(questId: string): QuestStatus {
    return this.states[questId] ?? 'locked';
  }

  startQuest(questId: string): boolean {
    const current = this.states[questId];
    if (current !== 'available' && current !== 'active') {
      return false;
    }
    this.setState(questId, 'active');
    return true;
  }

  getActiveQuest(): QuestDefinition | undefined {
    return this.quests.find((q) => this.states[q.id] === 'active');
  }

  getNextObjectiveForQuest(questId: string): QuestObjective | undefined {
    const quest = this.questMap.get(questId);
    if (!quest) return undefined;
    return quest.objectives.find((obj) => !this.completedObjectiveIds.has(obj.id));
  }

  getCurrentObjectiveView(locale: Locale = 'id'): ActiveObjectiveView | null {
    const active = this.getActiveQuest();
    if (!active) return null;
    const obj = this.getNextObjectiveForQuest(active.id);
    if (!obj) return null;
    const required = obj.requiredCount ?? 1;
    const progress =
      obj.type === 'collect'
        ? Math.min(required, this.collectCounts[obj.targetId] ?? 0)
        : this.completedObjectiveIds.has(obj.id)
          ? 1
          : 0;
    return {
      questId: active.id,
      questTitle: active.title[locale],
      objective: obj,
      label: obj.label[locale],
      progress,
      required,
    };
  }

  onTalkTo(npcId: string): string[] {
    return this.advanceMatching('talk_to', npcId);
  }

  onGoTo(zoneId: string): string[] {
    return this.advanceMatching('go_to', zoneId);
  }

  onInteract(targetId: string): string[] {
    return this.advanceMatching('interact', targetId);
  }

  onCutscene(cutsceneId: string): string[] {
    return this.advanceMatching('cutscene', cutsceneId);
  }

  onCollect(itemType: string, amount = 1): string[] {
    this.collectCounts[itemType] = (this.collectCounts[itemType] ?? 0) + amount;
    const completed: string[] = [];

    for (const quest of this.quests) {
      if (this.states[quest.id] !== 'active') continue;
      const nextObj = this.getNextObjectiveForQuest(quest.id);
      if (!nextObj || nextObj.type !== 'collect' || nextObj.targetId !== itemType) continue;
      const req = nextObj.requiredCount ?? 1;
      if ((this.collectCounts[itemType] ?? 0) >= req) {
        this.completeObjective(quest, nextObj);
        completed.push(nextObj.id);
      }
    }
    return completed;
  }

  onCodeStepPassed(_missionId: string, stepId: string): string[] {
    this.completedStepIds.add(stepId);
    return this.advanceMatching('code_step', stepId);
  }

  private advanceMatching(type: QuestObjective['type'], targetId: string): string[] {
    const completed: string[] = [];
    for (const quest of this.quests) {
      if (this.states[quest.id] !== 'active') continue;
      const nextObj = this.getNextObjectiveForQuest(quest.id);
      if (!nextObj) continue;
      if (nextObj.type === type && nextObj.targetId === targetId) {
        this.completeObjective(quest, nextObj);
        completed.push(nextObj.id);
      }
    }
    return completed;
  }

  private completeObjective(quest: QuestDefinition, obj: QuestObjective): void {
    if (this.completedObjectiveIds.has(obj.id)) return;
    this.completedObjectiveIds.add(obj.id);
    this.handlers.onObjectiveCompleted?.(quest.id, obj.id);
    EventBus.emit('quest.objective.completed', {
      questId: quest.id,
      objectiveId: obj.id,
    });

    const allDone = quest.objectives.every((o) => this.completedObjectiveIds.has(o.id));
    if (allDone) {
      this.completeQuest(quest);
    } else {
      EventBus.emit('save.requested', { reason: 'quest_completed', immediate: true });
    }
  }

  private completeQuest(quest: QuestDefinition): void {
    if (this.states[quest.id] === 'completed') return;
    this.setState(quest.id, 'completed');

    if (quest.unlocksZoneId) {
      EventBus.emit('world.zone.restored', {
        zoneId: quest.unlocksZoneId,
        missionId: quest.id,
      });
    }

    this.handlers.onQuestCompleted?.(quest.id, quest.rewardXP, quest.unlocksZoneId);
    EventBus.emit('quest.completed', {
      questId: quest.id,
      xpAwarded: quest.rewardXP,
    });
    EventBus.emit('save.requested', { reason: 'quest_completed', immediate: true });

    // Unlock downstream quests whose prerequisites are now all completed
    for (const candidate of this.quests) {
      if (this.states[candidate.id] !== 'locked') continue;
      const prereqsDone = candidate.prerequisites.every((pid) => this.states[pid] === 'completed');
      if (prereqsDone) {
        this.setState(
          candidate.id,
          candidate.autoActivateOnUnlock !== false ? 'active' : 'available'
        );
      }
    }
  }

  private setState(questId: string, status: QuestStatus): void {
    if (this.states[questId] === status) return;
    this.states[questId] = status;
    this.handlers.onQuestStateChanged?.(questId, status);
  }
}
