import type { TroopMultiplierBreakdown } from "../../domain/battleDamage";
import type { BodySkillOption } from "../../domain/bodySkillOption";
import type {
  BodyOptimizationCandidateResult,
  BodyOptimizationInput,
  BodyOptimizationOptions,
  BodyOptimizationResult,
} from "../../domain/bodyOptimization";
import type { BodyHeroId, SupportedHeroDefinition } from "../../domain/hero";
import type { OptimizerScoringMode } from "../../domain/optimizerScoring";
import type { TroopType } from "../../domain/troop";
import { combinationsWithReplacementLimited } from "../combinationsWithReplacement";
import { aggregateBodyEffect } from "../../game-data/body-skills";
import { getHeroById } from "../../game-data/heroes/bodyHeroQueries";
import {
  createOptimizerBattleEvaluator,
  type OptimizerBattleEvaluation,
  type OptimizerBattleEvaluatorDependencies,
} from "../evaluation/evaluateBattle";
import { InvalidBodyCountError, InvalidTopKError } from "./errors";
import { resolveBodySkillOptionCandidates } from "./resolveBodySkillOptionCandidates";
import { optimisticBodyUpperBound } from "./optimisticBodyBound";

const DEFAULT_BODY_COUNT = 4;
const DEFAULT_TOP_K = 10;
const DEFAULT_SCORING_MODE: OptimizerScoringMode = "tenRoundExpected";
const MAX_BODY_COUNT = 4;
export const OPTIMIZER_MAX_COPIES_PER_BODY_SKILL = 2;
const TROOP_TYPES: readonly TroopType[] = ["shield", "lancer", "marksman"];

export interface BodyHeroOptimizerDependencies
  extends OptimizerBattleEvaluatorDependencies {
  readonly now?: () => number;
}

/** 默认按完整10回合精确期望伤害穷举，组合生成规则保持不变。 */
export const optimizeBodyHeroes = createBodyHeroOptimizer();

export function createBodyHeroOptimizer(
  dependencies: BodyHeroOptimizerDependencies = {},
): (
  input: BodyOptimizationInput,
  options?: BodyOptimizationOptions,
) => BodyOptimizationResult {
  const now = dependencies.now ?? (() => performance.now());

  return (input, options = {}) => {
    const startedAt = now();
    const bodyCount = options.bodyCount ?? DEFAULT_BODY_COUNT;
    const topK = options.topK ?? DEFAULT_TOP_K;
    const scoringMode = options.scoringMode ?? DEFAULT_SCORING_MODE;
    validateOptions(bodyCount, topK);

    const candidateOptions = resolveBodySkillOptionCandidates(
      options.candidateHeroIds,
    );
    const combinations = combinationsWithReplacementLimited(
      candidateOptions,
      bodyCount,
      OPTIMIZER_MAX_COPIES_PER_BODY_SKILL,
    );
    const evaluator = createOptimizerBattleEvaluator(dependencies);
    const { enemyBaseDefense, ...baseInput } = input;
    const evaluate = (bodyHeroIds: readonly BodyHeroId[]) =>
      evaluator.evaluate(
        { ...baseInput, bodyHeroIds },
        {
          scoringMode,
          legacyMetricId: "legacySingleRoundDamage",
          legacyScore: (singleRound) => singleRound.finalDamage,
          ...(enemyBaseDefense === undefined ? {} : { enemyBaseDefense }),
        },
      );
    const noBodyEvaluation = evaluate([]);
    const evaluationBySignature = new Map<string, OptimizerBattleEvaluation>();
    const baselineTroopDamage = getExpectedTroopDamage(noBodyEvaluation);
    const aggregatedEffects = combinations
      .map(aggregateBodyEffect)
      .map((bodyEffect) => ({
        bodyEffect,
        upperBound: optimisticBodyUpperBound(bodyEffect.skills, baselineTroopDamage),
      }))
      .sort((left, right) => right.upperBound - left.upperBound || left.bodyEffect.signature.localeCompare(right.bodyEffect.signature));
    const effectSignatureCount = new Set(
      aggregatedEffects.map(({ bodyEffect }) => bodyEffect.signature),
    ).size;
    const evaluated: Array<Omit<BodyOptimizationCandidateResult, "rank"> & { readonly rank: 0 }> = [];
    for (const { bodyEffect, upperBound } of aggregatedEffects) {
      if (
        evaluated.length >= topK &&
        upperBound < evaluated[evaluated.length - 1]!.score - Math.max(1, Math.abs(upperBound)) * 1e-12
      ) break;
      const bodySkillOptions = bodyEffect.options;
      const heroIds = bodyEffect.representativeHeroIds;
      const heroes = heroIds.map((heroId) => {
        const hero = getHeroById(heroId);
        if (hero === undefined || hero.status !== "supported") {
          throw new Error(`车身代表英雄不可用：${heroId}。`);
        }
        return hero;
      });
      const signature = bodyEffect.signature;
      let evaluation = evaluationBySignature.get(signature);
      if (evaluation === undefined) {
        evaluation = evaluate(heroIds);
        evaluationBySignature.set(signature, evaluation);
      }
      const candidate = createCandidateResult(
        heroes,
        heroIds,
        bodySkillOptions,
        evaluation,
        noBodyEvaluation.score,
      );
      insertCandidate(evaluated, candidate, topK);
    }

    const results = evaluated.slice(0, topK).map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));
    const elapsedMs = now() - startedAt;
    const cache = evaluator.cache.statistics();

    return {
      bodyCount,
      topK,
      scoringMode,
      scoreMetric:
        scoringMode === "tenRoundExpected"
          ? "expectedTenRoundTotalDamage"
          : "legacySingleRoundDamage",
      candidateHeroCount: candidateOptions.length,
      bodySkillOptionCount: candidateOptions.length,
      effectSignatureCount,
      combinationCount: combinations.length,
      evaluatedCombinationCount: evaluationBySignature.size,
      noBodyDamage: noBodyEvaluation.singleRoundResult.finalDamage,
      noBodyScore: noBodyEvaluation.score,
      noBodyExpectedTenRoundDamage:
        noBodyEvaluation.expectedTenRoundDamage,
      stats: {
        candidateCount: combinations.length,
        evaluatedCount: evaluationBySignature.size,
        cacheHits: cache.cacheHits,
        cacheMisses: cache.cacheMisses,
        probabilityStateCount: evaluator.probabilityStateCount(),
        elapsedMs,
      },
      results,
    };
  };
}

function insertCandidate(
  candidates: Array<Omit<BodyOptimizationCandidateResult, "rank"> & { readonly rank: 0 }>,
  candidate: Omit<BodyOptimizationCandidateResult, "rank"> & { readonly rank: 0 },
  topK: number,
): void {
  let low = 0;
  let high = candidates.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (compareCandidates(candidate, candidates[middle]!) < 0) high = middle;
    else low = middle + 1;
  }
  candidates.splice(low, 0, candidate);
  if (candidates.length > topK) candidates.pop();
}

function getExpectedTroopDamage(
  evaluation: OptimizerBattleEvaluation,
): Readonly<Record<TroopType, number>> {
  if (evaluation.expectedResult !== undefined) return evaluation.expectedResult.expectedDamageByTroop;
  return {
    shield: evaluation.deterministicTenRoundResult.rounds.reduce((sum, round) => sum + round.shieldDamage, 0),
    lancer: evaluation.deterministicTenRoundResult.rounds.reduce((sum, round) => sum + round.lancerDamage, 0),
    marksman: evaluation.deterministicTenRoundResult.rounds.reduce((sum, round) => sum + round.marksmanDamage, 0),
  };
}

function validateOptions(bodyCount: number, topK: number): void {
  if (
    !Number.isSafeInteger(bodyCount) ||
    bodyCount < 0 ||
    bodyCount > MAX_BODY_COUNT
  ) {
    throw new InvalidBodyCountError(bodyCount);
  }
  if (!Number.isSafeInteger(topK) || topK <= 0) {
    throw new InvalidTopKError(topK);
  }
}

function createCandidateResult(
  heroes: readonly SupportedHeroDefinition[],
  heroIds: readonly BodyHeroId[],
  bodySkillOptions: readonly BodySkillOption[],
  evaluation: OptimizerBattleEvaluation,
  baselineScore: number,
): Omit<BodyOptimizationCandidateResult, "rank"> & { readonly rank: 0 } {
  const troopDamages: Record<TroopType, number> = {
    shield: 0,
    lancer: 0,
    marksman: 0,
  };
  const expectedTroopDamages: Record<TroopType, number> | null =
    evaluation.expectedResult === undefined
      ? null
      : {
          shield: evaluation.expectedResult.expectedDamageByTroop.shield,
          lancer: evaluation.expectedResult.expectedDamageByTroop.lancer,
          marksman: evaluation.expectedResult.expectedDamageByTroop.marksman,
        };
  const multipliers: Partial<Record<TroopType, TroopMultiplierBreakdown>> = {};
  for (const troopType of TROOP_TYPES) {
    const troopResult = evaluation.singleRoundResult.troopDamages[troopType];
    if (troopResult !== undefined) {
      troopDamages[troopType] = troopResult.finalDamage;
      multipliers[troopType] = troopResult.multipliers;
    }
  }
  const improvementAbsolute = evaluation.score - baselineScore;
  const improvementRatio =
    baselineScore === 0 ? null : evaluation.score / baselineScore - 1;

  return {
    rank: 0,
    heroes,
    selectedBodyHeroes: heroes,
    heroIds,
    bodySkillOptions,
    bodySkillOptionIds: bodySkillOptions.map((option) => option.id),
    totalDamage: evaluation.singleRoundResult.finalDamage,
    singleRoundDamage: evaluation.singleRoundResult.finalDamage,
    score: evaluation.score,
    expectedTenRoundDamage: evaluation.expectedTenRoundDamage,
    expectedDamageByRound:
      evaluation.expectedResult?.expectedDamageByRound ?? [],
    expectedTroopDamages,
    troopDamages,
    multipliers,
    improvementOverNoBody: improvementRatio,
    improvementAbsolute,
    improvementRatio,
    battleResult: evaluation.singleRoundResult,
    skippedPendingSkills:
      evaluation.expectedResult?.skippedPendingSkills ?? [],
    unsupportedSkills: evaluation.expectedResult?.unsupportedSkills ?? [],
  };
}

function compareCandidates(
  left: BodyOptimizationCandidateResult,
  right: BodyOptimizationCandidateResult,
): number {
  const scoreOrder = right.score - left.score;
  if (scoreOrder !== 0) return scoreOrder;
  return left.bodySkillOptionIds.join("|").localeCompare(right.bodySkillOptionIds.join("|"));
}
