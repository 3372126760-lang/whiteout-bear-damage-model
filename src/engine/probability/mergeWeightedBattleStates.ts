import type {
  AccumulatedBattleDamage,
  WeightedBattleState,
} from "../../domain/probability";
import { validateBattleState } from "../rounds/battleState";
import { weightedBattleStateKey } from "./battleStateKey";
import { InvalidProbabilityError } from "./errors";
import { probabilityMass, validateProbability } from "./probabilityMath";

interface StateAccumulator {
  readonly state: WeightedBattleState["state"];
  readonly transientEffects: NonNullable<
    WeightedBattleState["transientEffects"]
  >;
  probability: number;
  weightedShieldDamage: number;
  weightedLancerDamage: number;
  weightedMarksmanDamage: number;
  weightedTotalDamage: number;
  weightedNormalDamage: number;
  weightedExtraDamage: number;
  weightedPrimaryAttackDamage: number;
  weightedExtraAttackDamage: number;
}

/**
 * 合并未来演化完全相同的状态。不同历史累计伤害按条件概率加权，期望不变。
 */
export function mergeWeightedBattleStates(
  states: readonly WeightedBattleState[],
): readonly WeightedBattleState[] {
  const beforeMass = probabilityMass(states);
  const groups = new Map<string, StateAccumulator>();

  for (const [index, weighted] of states.entries()) {
    validateProbability(weighted.probability, `states[${index}].probability`);
    validateBattleState(weighted.state);
    validateAccumulatedDamage(weighted.accumulatedDamage, index);
    if (weighted.probability === 0) continue;

    const key = weightedBattleStateKey(weighted);
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        state: weighted.state,
        transientEffects: weighted.transientEffects ?? [],
        probability: weighted.probability,
        weightedShieldDamage:
          weighted.probability * weighted.accumulatedDamage.shieldDamage,
        weightedLancerDamage:
          weighted.probability * weighted.accumulatedDamage.lancerDamage,
        weightedMarksmanDamage:
          weighted.probability * weighted.accumulatedDamage.marksmanDamage,
        weightedTotalDamage:
          weighted.probability * weighted.accumulatedDamage.totalDamage,
        weightedNormalDamage:
          weighted.probability * weighted.accumulatedDamage.normalDamage,
        weightedExtraDamage:
          weighted.probability * weighted.accumulatedDamage.extraDamage,
        weightedPrimaryAttackDamage:
          weighted.probability * weighted.accumulatedDamage.primaryAttackDamage,
        weightedExtraAttackDamage:
          weighted.probability * weighted.accumulatedDamage.extraAttackDamage,
      });
      continue;
    }

    existing.probability += weighted.probability;
    existing.weightedShieldDamage +=
      weighted.probability * weighted.accumulatedDamage.shieldDamage;
    existing.weightedLancerDamage +=
      weighted.probability * weighted.accumulatedDamage.lancerDamage;
    existing.weightedMarksmanDamage +=
      weighted.probability * weighted.accumulatedDamage.marksmanDamage;
    existing.weightedTotalDamage +=
      weighted.probability * weighted.accumulatedDamage.totalDamage;
    existing.weightedNormalDamage +=
      weighted.probability * weighted.accumulatedDamage.normalDamage;
    existing.weightedExtraDamage +=
      weighted.probability * weighted.accumulatedDamage.extraDamage;
    existing.weightedPrimaryAttackDamage +=
      weighted.probability * weighted.accumulatedDamage.primaryAttackDamage;
    existing.weightedExtraAttackDamage +=
      weighted.probability * weighted.accumulatedDamage.extraAttackDamage;
  }

  const merged = [...groups.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, group]): WeightedBattleState => ({
      // 独立 Bernoulli 路径反复相加时可能得到 1 + 2e-16。这里只夹紧
      // 超出端点且处于数值容差内的计算结果，不对概率做十进制取整。
      probability:
        group.probability > 1 && group.probability - 1 <= 1e-12
          ? 1
          : group.probability < 0 && -group.probability <= 1e-12
            ? 0
            : group.probability,
      state: group.state,
      transientEffects: group.transientEffects,
      accumulatedDamage: {
        shieldDamage: group.weightedShieldDamage / group.probability,
        lancerDamage: group.weightedLancerDamage / group.probability,
        marksmanDamage: group.weightedMarksmanDamage / group.probability,
        totalDamage: group.weightedTotalDamage / group.probability,
        normalDamage: group.weightedNormalDamage / group.probability,
        extraDamage: group.weightedExtraDamage / group.probability,
        primaryAttackDamage:
          group.weightedPrimaryAttackDamage / group.probability,
        extraAttackDamage:
          group.weightedExtraAttackDamage / group.probability,
      },
    }));

  const afterMass = probabilityMass(merged);
  if (Math.abs(afterMass - beforeMass) > Number.EPSILON * Math.max(1, states.length)) {
    throw new InvalidProbabilityError(
      `状态合并改变了概率和：${beforeMass} -> ${afterMass}。`,
    );
  }
  return merged;
}

function validateAccumulatedDamage(
  damage: AccumulatedBattleDamage,
  index: number,
): void {
  for (const [key, value] of Object.entries(damage)) {
    if (!Number.isFinite(value)) {
      throw new InvalidProbabilityError(
        `states[${index}].accumulatedDamage.${key} 必须是有限数。`,
      );
    }
  }
}
