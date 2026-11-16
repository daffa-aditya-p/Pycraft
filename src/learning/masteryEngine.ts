import { getKC, type RegionId } from './kcRegistry';

export type AssistanceTier = 'guided' | 'assisted' | 'independent' | 'mastery';

export interface KCMasteryRecord {
  kcId: string;
  score: number;
  attempts: number;
  independentPasses: number;
  distinctContextsPassed: string[];
  lastPracticedAt: number;
  commonErrorTags: Record<string, number>;
}

export interface AttemptOutcome {
  stepId: string;
  tier: AssistanceTier;
  passed: boolean;
  usedRung4Solution?: boolean;
  consecutiveErrorsInStep?: number;
  errorTag?: string;
  timestamp?: number;
}

export const TIER_BASE_DELTAS: Record<AssistanceTier, number> = {
  independent: 28,
  assisted: 18,
  guided: 10,
  mastery: 15,
};

export const R1_T1_CAP = 60;
export const MASTERED_SCORE_THRESHOLD = 85;
export const MASTERED_MIN_INDEPENDENT_CONTEXTS = 2;

export function clampScore(value: number, maxScore = 100): number {
  return Math.max(0, Math.min(maxScore, Math.round(value)));
}

export function createInitialKCMastery(kcId: string): KCMasteryRecord {
  return {
    kcId,
    score: 0,
    attempts: 0,
    independentPasses: 0,
    distinctContextsPassed: [],
    lastPracticedAt: 0,
    commonErrorTags: {},
  };
}

export function getMaxScoreForKC(kcId: string, currentRegionId: RegionId = 'awakening'): number {
  const kc = getKC(kcId);
  if (!kc) return 100;
  // Section 16.2: T1 introductory KCs in Region 1 cap at 60 until their T2 home region;
  // F1-F8 have full 0..100 range in R1.
  if (currentRegionId === 'awakening' && kc.r1Tier === 'T1' && kc.homeRegion !== 'awakening') {
    return R1_T1_CAP;
  }
  return 100;
}

/**
 * Computes consecutive error penalty beyond the first error attempt in a step:
 * -3 per consecutive error beyond attempt 1, capped at -9 per step.
 */
export function computeErrorPenalty(consecutiveErrorsInStep = 0): number {
  const beyondFirst = Math.max(0, consecutiveErrorsInStep - 1);
  return Math.min(9, beyondFirst * 3);
}

/**
 * Deterministic 0-100 mastery update formula (Master Plan Section 16.2):
 *   score_{t+1} = clamp_[0, maxScore](score_t + delta_tier - delta_errors - delta_solution)
 */
export function updateKCMastery(
  record: KCMasteryRecord,
  outcome: AttemptOutcome,
  currentRegionId: RegionId = 'awakening'
): KCMasteryRecord {
  const maxScore = getMaxScoreForKC(record.kcId, currentRegionId);
  const now = outcome.timestamp ?? Date.now();
  const nextErrors = { ...record.commonErrorTags };

  if (!outcome.passed) {
    if (outcome.errorTag) {
      nextErrors[outcome.errorTag] = (nextErrors[outcome.errorTag] ?? 0) + 1;
    }
    const penalty = computeErrorPenalty(outcome.consecutiveErrorsInStep ?? 1);
    return {
      ...record,
      score: clampScore(record.score - penalty, maxScore),
      attempts: record.attempts + 1,
      lastPracticedAt: now,
      commonErrorTags: nextErrors,
    };
  }

  // Passed run
  const effectiveTier: AssistanceTier = outcome.usedRung4Solution ? 'guided' : outcome.tier;
  const rawTierGain = TIER_BASE_DELTAS[effectiveTier];
  const errorPenalty = computeErrorPenalty(outcome.consecutiveErrorsInStep ?? 0);

  // If Rung 4 worked solution was revealed, net gain for that run is capped at +5
  const netGain = outcome.usedRung4Solution
    ? Math.min(5, Math.max(0, rawTierGain - errorPenalty))
    : rawTierGain - errorPenalty;

  const isIndependentCredit =
    !outcome.usedRung4Solution && (effectiveTier === 'independent' || effectiveTier === 'mastery');

  const distinctContextsPassed =
    isIndependentCredit && !record.distinctContextsPassed.includes(outcome.stepId)
      ? [...record.distinctContextsPassed, outcome.stepId]
      : record.distinctContextsPassed;

  return {
    ...record,
    score: clampScore(record.score + netGain, maxScore),
    attempts: record.attempts + 1,
    independentPasses: isIndependentCredit ? record.independentPasses + 1 : record.independentPasses,
    distinctContextsPassed,
    lastPracticedAt: now,
    commonErrorTags: nextErrors,
  };
}

export function isKCMastered(record: KCMasteryRecord | undefined): boolean {
  if (!record) return false;
  return (
    record.score >= MASTERED_SCORE_THRESHOLD &&
    record.distinctContextsPassed.length >= MASTERED_MIN_INDEPENDENT_CONTEXTS
  );
}

/**
 * Adaptive tier recommender (Master Plan Section 16.2):
 * - First encounter (attempts === 0 for any target KC) or mean score < 35 => 'guided'
 * - 35 <= mean score < 65 => 'assisted'
 * - mean score >= 65 => 'independent'
 */
export function selectRecommendedTier(
  targetKCIds: string[],
  masteryMap: Record<string, KCMasteryRecord>
): Exclude<AssistanceTier, 'mastery'> {
  if (targetKCIds.length === 0) return 'guided';

  let totalScore = 0;
  for (const kcId of targetKCIds) {
    const rec = masteryMap[kcId];
    if (!rec || rec.attempts === 0) {
      return 'guided';
    }
    totalScore += rec.score;
  }

  const meanScore = totalScore / targetKCIds.length;
  if (meanScore < 35) return 'guided';
  if (meanScore < 65) return 'assisted';
  return 'independent';
}

export function shouldOfferStepDown(consecutiveSameErrorCount: number): boolean {
  return consecutiveSameErrorCount >= 2;
}

export function getKCVisualState(
  kcId: string,
  masteryMap: Record<string, KCMasteryRecord>,
  unlockedRegionOrder: number,
  kcRegionOrder: number,
  prereqsMet: boolean
): 'locked' | 'available' | 'learning' | 'mastered' {
  const kc = getKC(kcId);
  if (!kc) return 'locked';
  if (kc.r1Tier === 'locked' && kcRegionOrder > unlockedRegionOrder) {
    return 'locked';
  }
  const rec = masteryMap[kcId];
  if (isKCMastered(rec)) return 'mastered';
  if (rec && rec.attempts > 0) return 'learning';
  return prereqsMet ? 'available' : 'locked';
}
