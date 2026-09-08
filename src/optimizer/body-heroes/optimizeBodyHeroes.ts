import type { TroopMultiplierBreakdown } from "../../domain/battleDamage";
import type {
  BodyOptimizationCandidateResult,
  BodyOptimizationInput,
  BodyOptimizationOptions,
  BodyOptimizationResult,
} from "../../domain/bodyOptimization";
import type { BodyHeroId, SupportedHeroDefinition } from "../../domain/hero";
import type { OptimizerScoringMode } from "../../domain/optimizerScoring";
import type { TroopType } from "../../domain/troop";
import { combinationsWithReplacement } from "../combinationsWithReplacement";
import {
  createOptimizerBattleEvaluator,
  type OptimizerBattleEvaluation,
  type OptimizerBattleEvaluatorDependencies,
} from "../evaluation/evaluateBattle";
import { InvalidBodyCountError, InvalidTopKError } from "./errors";
import { resolveSupportedBodyHeroCandidates } from "./resolveSupportedBodyHeroCandidates";

const DEFAULT_BODY_COUNT = 4;
const DEFAULT_TOP_K = 10;
const DEFAULT_SCORING_MODE: OptimizerScoringMode = "tenRoundExpected";
const MAX_BODY_COUNT = 4;
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

    const candidateHeroes = resolveSupportedBodyHeroCandidates(
      options.candidateHeroIds,
    );
    const combinations = combinationsWithReplacement(candidateHeroes, bodyCount);
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
    const evaluated = combinations.map((heroes) => {
      const heroIds = heroes.map((hero) => hero.id as BodyHeroId);
      return createCandidateResult(
        heroes,
        heroIds,
        evaluate(heroIds),
        noBodyEvaluation.score,
      );
    });

    evaluated.sort(compareCandidates);
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
      candidateHeroCount: candidateHeroes.length,
      combinationCount: combinations.length,
      evaluatedCombinationCount: evaluated.length,
      noBodyDamage: noBodyEvaluation.singleRoundResult.finalDamage,
      noBodyScore: noBodyEvaluation.score,
      noBodyExpectedTenRoundDamage:
        noBodyEvaluation.expectedTenRoundDamage,
      stats: {
        candidateCount: combinations.length,
        evaluatedCount: evaluated.length,
        cacheHits: cache.cacheHits,
        cacheMisses: cache.cacheMisses,
        probabilityStateCount: evaluator.probabilityStateCount(),
        elapsedMs,
      },
      results,
    };
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
  return left.heroIds.join("|").localeCompare(right.heroIds.join("|"));
}
