import type { AssistanceTier } from '../learning/masteryEngine';
import type {
  ASTValidationReport as ProtocolASTValidationReport,
  PyErrorInfo as ProtocolPyErrorInfo,
} from '../runtime/protocol';

export type VisorMood =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'surprised'
  | 'concerned'
  | 'focused'
  | 'proud'
  | 'sleepy';

export type Locale = 'id' | 'en';

export type PyErrorInfo = ProtocolPyErrorInfo & {
  offendingValue?: string;
  objectName?: string;
  attributeName?: string;
};

export type ASTValidationReport = ProtocolASTValidationReport;

export interface HintRungContent {
  rung: 1 | 2 | 3 | 4;
  headline: { id: string; en: string };
  body: { id: string; en: string };
  socraticQuestion?: { id: string; en: string };
  highlightLines?: number[];
  codeSnippet?: string;
  conceptCardId?: string;
}

export interface MentorContext {
  locale: Locale;
  missionId: string;
  stepId: string;
  targetKCs: string[];
  assistanceTier: AssistanceTier;
  playerCode: string;
  attemptNumber: number;
  lastError?: PyErrorInfo;
  failedScenarioId?: string;
  astReport?: ASTValidationReport;
  allowlist?: string[];
  playerVariables?: string[];
  stepLimit?: number;
  actionLimit?: number;
  hintLadder?: HintRungContent[];
  simSummary: {
    robotPos: [number, number];
    actionsExecuted: number;
    warningCodes: string[];
  };
}

export interface MentorResponse {
  source: 'curated' | 'remote_llm';
  visorMood: VisorMood;
  headline: string;
  body: string;
  socraticQuestion?: string;
  highlightLines?: number[];
  codeSnippet?: string;
  rung: 1 | 2 | 3 | 4;
  conceptCardId?: string;
  errorTag?: string;
}

export interface ConceptCard {
  kcId: string;
  title: string;
  summary: string;
  exampleCode: string;
  exampleCaption: string;
  inWorldNote: string;
  isMicroCard?: boolean;
}

export interface MentorProvider {
  explainError(ctx: MentorContext): Promise<MentorResponse>;
  getHint(ctx: MentorContext, requestedRung: 1 | 2 | 3 | 4): Promise<MentorResponse>;
  getConceptCard(kcId: string, locale: Locale): Promise<ConceptCard>;
}
