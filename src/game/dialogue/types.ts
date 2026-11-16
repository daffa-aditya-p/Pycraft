import type { Locale, VisorMood } from '../../mentor/types';

export interface DialogueChoice {
  id: string;
  label: { id: string; en: string };
  nextNodeId: string | null;
}

export type DialogueAction =
  | { type: 'unlock_quest'; questId: string }
  | { type: 'complete_objective'; objectiveId: string }
  | { type: 'open_mission'; missionId: string; stepId?: string }
  | { type: 'give_item'; itemType: string; count: number };

export interface DialogueCameraTarget {
  targetId: string;
  preset: 'speaker' | 'device' | 'overview' | 'release';
}

export interface DialogueNode {
  id: string;
  speaker: string;
  speakerTitle?: { id: string; en: string };
  visorMood?: VisorMood;
  cameraFocus?: DialogueCameraTarget;
  text: { id: string; en: string };
  nextNodeId?: string | null;
  choices?: DialogueChoice[];
  onEnter?: DialogueAction[];
}

export interface DialogueTree {
  id: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueHistoryEntry {
  nodeId: string;
  speaker: string;
  text: string;
  locale: Locale;
}
