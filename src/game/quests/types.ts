import type { Locale } from '../../mentor/types';

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed';

export type ObjectiveType =
  | 'talk_to'
  | 'go_to'
  | 'interact'
  | 'collect'
  | 'code_step'
  | 'cutscene';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  targetId: string;
  requiredCount?: number;
  missionId?: string;
  label: { id: string; en: string };
  islandId: string;
  markerPosition?: [number, number, number];
}

export interface QuestDefinition {
  id: string;
  order: number;
  regionId: string;
  title: { id: string; en: string };
  summary: { id: string; en: string };
  prerequisites: string[];
  objectives: QuestObjective[];
  rewardXP: number;
  unlocksZoneId?: string;
  unlocksCosmetics?: string[];
  autoActivateOnUnlock?: boolean;
}

export interface ActiveObjectiveView {
  questId: string;
  questTitle: string;
  objective: QuestObjective;
  label: string;
  progress: number;
  required: number;
}

export type QuestEventHandler = {
  onObjectiveCompleted?: (questId: string, objectiveId: string) => void;
  onQuestCompleted?: (questId: string, xpAwarded: number, unlocksZoneId?: string) => void;
  onQuestStateChanged?: (questId: string, status: QuestStatus) => void;
  getLocale?: () => Locale;
};
