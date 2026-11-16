import { EventBus } from '../../stores/EventBus';
import type { Locale } from '../../mentor/types';
import type {
  DialogueAction,
  DialogueHistoryEntry,
  DialogueNode,
  DialogueTree,
} from './types';

const MAX_HISTORY_LINES = 20;

export class DialogueRunner {
  private activeTree: DialogueTree | null = null;
  private currentNodeId: string | null = null;
  private history: DialogueHistoryEntry[] = [];
  private locale: Locale = 'id';
  private onAction?: (action: DialogueAction) => void;

  constructor(options?: { locale?: Locale; onAction?: (action: DialogueAction) => void }) {
    if (options?.locale) this.locale = options.locale;
    this.onAction = options?.onAction;
  }

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  start(tree: DialogueTree, locale?: Locale): DialogueNode | null {
    if (locale) this.locale = locale;
    this.activeTree = tree;
    return this.enterNode(tree.startNodeId);
  }

  getCurrentNode(): DialogueNode | null {
    if (!this.activeTree || !this.currentNodeId) return null;
    return this.activeTree.nodes[this.currentNodeId] ?? null;
  }

  isActive(): boolean {
    return this.activeTree !== null && this.currentNodeId !== null;
  }

  getHistory(): readonly DialogueHistoryEntry[] {
    return this.history;
  }

  advance(): DialogueNode | null {
    const node = this.getCurrentNode();
    if (!node) return null;
    if (node.choices && node.choices.length > 0) {
      // Must pick a choice explicitly
      return node;
    }
    if (!node.nextNodeId) {
      this.end();
      return null;
    }
    return this.enterNode(node.nextNodeId);
  }

  choose(choiceId: string): DialogueNode | null {
    const node = this.getCurrentNode();
    if (!node || !node.choices) return null;
    const choice = node.choices.find((c) => c.id === choiceId);
    if (!choice) return node;
    if (!choice.nextNodeId) {
      this.end();
      return null;
    }
    return this.enterNode(choice.nextNodeId);
  }

  end(): void {
    this.activeTree = null;
    this.currentNodeId = null;
    EventBus.emit('dialogue.camera.request', {
      targetId: 'player',
      preset: 'release',
    });
  }

  private enterNode(nodeId: string): DialogueNode | null {
    if (!this.activeTree) return null;
    const node = this.activeTree.nodes[nodeId];
    if (!node) {
      this.end();
      return null;
    }
    this.currentNodeId = nodeId;
    this.history = [
      ...this.history.slice(-(MAX_HISTORY_LINES - 1)),
      {
        nodeId: node.id,
        speaker: node.speaker,
        text: node.text[this.locale],
        locale: this.locale,
      },
    ];

    if (node.cameraFocus) {
      EventBus.emit('dialogue.camera.request', node.cameraFocus);
    }
    if (node.onEnter) {
      for (const action of node.onEnter) {
        this.onAction?.(action);
      }
    }
    return node;
  }
}
