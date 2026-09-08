import { calculateTenRoundExpectedDamage } from "../app/calculateTenRoundExpectedDamage";
import type { HeadFormation } from "../domain/battleDamage";
import type {
  BodyOptimizationOptions,
  BodyOptimizationResult,
} from "../domain/bodyOptimization";
import type {
  FullBattleSetupOptimizationOptions,
  FullBattleSetupOptimizationResult,
} from "../domain/fullBattleSetupOptimization";
import type {
  BodyHeroDefinition,
  BodyHeroId,
  HeadHeroDefinition,
  HeadHeroId,
  HeroId,
  HeroSkillDefinition,
} from "../domain/hero";
import type { Skill, SkillEffect, SkillTrigger } from "../domain/skill";
import type { TenRoundExpectedDamageResult } from "../domain/tenRoundExpectedDamage";
import type {
  TroopCounts,
  TroopRatioOptimizationOptions,
  TroopRatioOptimizationResult,
  TroopRatios,
  TroopRatioSettings,
} from "../domain/troopRatioOptimization";
import type { TroopLevelId, TroopType } from "../domain/troop";
import type { TroopSkillId } from "../domain/troopSkill";
import type { BattlePreparationConfig, TownBuffSize } from "../domain/preparation";
import { getAllBodyHeroes, getHeroById, getSupportedBodyHeroes } from "../game-data/heroes/bodyHeroQueries";
import { getAllHeadHeroes, getHeadHeroById, getHeadHeroesByTroopType } from "../game-data/heroes/headHeroQueries";
import { troopLevels } from "../game-data/troops/troopLevels";
import { getFireCrystalSkills, getTroopSkillById } from "../game-data/troop-skills/troopSkillQueries";
import {
  BEAR_SLAYER_CAPACITY_PER_LEVEL,
  EXCLUSIVE_WEAPON_RATES,
  HUNTER_HEART_RATES,
  PET_BUFF_RATES,
  PET_CAPACITY_PER_LEVEL,
} from "../game-data/systems/progression";
import { optimizeBodyHeroes } from "../optimizer/body-heroes";
import { combinationsWithReplacement } from "../optimizer/combinationsWithReplacement";
import { optimizeFullBattleSetup } from "../optimizer/full-setup";
import {
  allocateTroopsByRatio,
  generateTroopRatioGrid,
  optimizeTroopRatio,
} from "../optimizer/troop-ratio";
import { calculateBaseTroopDamage } from "../rulesets/bear/base-damage";

export const TROOP_TYPES = ["shield", "lancer", "marksman"] as const;
export const TROOP_LABELS: Readonly<Record<TroopType, string>> = {
  shield: "盾兵",
  lancer: "矛兵",
  marksman: "射手",
};

export interface TroopFormValues {
  readonly count: string;
  readonly troopLevelId: string;
  readonly attackPercent: string;
  readonly defensePercent: string;
  readonly penetrationPercent: string;
  readonly healthPercent: string;
}

export interface CalculatorFormState {
  readonly troops: Readonly<Record<TroopType, TroopFormValues>>;
  readonly bodyHeroIds: readonly string[];
  readonly headHeroIds: Readonly<Record<TroopType, string>>;
  readonly fireCrystalSkillIds: readonly string[];
  readonly topK: string;
  readonly ratioStepPercent: string;
  readonly optimizeHead: boolean;
  readonly optimizeFireCrystal: boolean;
  readonly preparation: {
    readonly hunterHeartLevel: string;
    readonly bearSlayerLevel: string;
    readonly town: Readonly<Record<"attack" | "penetration" | "defenseReduction" | "marchCapacity", TownBuffSize>>;
    readonly pet: Readonly<Record<"attackLevel" | "penetrationLevel" | "defenseReductionLevel" | "capacityLevel", string>>;
    readonly weaponLevels: Readonly<Record<TroopType, string>>;
    readonly marksmanBlazingStarLevel: string;
    readonly lancerT12SkillLevel: string;
  };
}

export interface PercentageNormalization {
  readonly displayPercent: number;
  readonly decimal: number;
  readonly multiplier: number;
}

export interface UiSkillNotice {
  readonly source: "body" | "head" | "fireCrystal";
  readonly ownerId: string;
  readonly ownerName: string;
  readonly skillName: string;
  readonly status: "pending" | "unsupported";
  readonly reason: string;
}

export interface UiSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface UiHeroSkillDetail {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly skillName: string;
  readonly status: "applied" | "pending" | "notApplicable" | "information";
  readonly summary: string;
  readonly sourceSummary?: string;
  readonly totalSummary?: string;
  readonly reason?: string;
}

export interface UiCalculationResult {
  readonly totalTroopCount: number;
  readonly expectedTotalDamage: number;
  readonly baseExpectedTotalDamage: number;
  readonly improvementAbsolute: number;
  readonly improvementRatio: number | null;
  readonly averageRoundDamage: number;
  readonly expectedDamageByTroop: Readonly<Record<TroopType, number>>;
  /** 使用最终出征容量与整数分配后的兵数，经正式基础引擎得到的单回合 D0。 */
  readonly baseDamageByTroop: Readonly<Record<TroopType, number>>;
  readonly percentageNormalization: Readonly<
    Record<TroopType, { readonly attack: PercentageNormalization; readonly penetration: PercentageNormalization }>
  >;
  readonly appliedSkills: readonly { readonly source: string; readonly skillName: string; readonly ownerId: string }[];
  readonly skippedSkills: readonly UiSkillNotice[];
  readonly result: TenRoundExpectedDamageResult;
}

type UiBattleInput = Parameters<typeof calculateTenRoundExpectedDamage>[0] & {
  readonly preparation: BattlePreparationConfig;
};

export type UiOptimizationKind = "body" | "ratio" | "full";

export interface UiOptimizationRow {
  readonly rank: number;
  readonly expectedTenRoundDamage: number;
  readonly improvementRatio: number | null;
  readonly troopCounts: TroopCounts;
  readonly ratios: TroopRatios;
  readonly bodyHeroIds: readonly string[];
  readonly bodyHeroNames: readonly string[];
  readonly headFormation: HeadFormation;
  readonly headHeroNames: readonly string[];
  readonly fireCrystalSkillIds: readonly string[];
  readonly fireCrystalNames: readonly string[];
}

export interface UiOptimizationResult {
  readonly kind: UiOptimizationKind;
  readonly title: string;
  readonly rows: readonly UiOptimizationRow[];
  readonly candidateCount: number;
  readonly evaluatedCount: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly elapsedMs: number;
  readonly performanceWarning: string | null;
}

export type UiOptimizationCoreRequest =
  | {
      readonly kind: "body";
      readonly input: Parameters<typeof optimizeBodyHeroes>[0];
      readonly options: BodyOptimizationOptions;
    }
  | {
      readonly kind: "ratio";
      readonly input: Parameters<typeof optimizeTroopRatio>[0];
      readonly options: TroopRatioOptimizationOptions;
    }
  | {
      readonly kind: "full";
      readonly input: Parameters<typeof optimizeFullBattleSetup>[0];
      readonly options: FullBattleSetupOptimizationOptions;
    };

export type UiOptimizationCoreResult =
  | { readonly kind: "body"; readonly result: BodyOptimizationResult }
  | { readonly kind: "ratio"; readonly result: TroopRatioOptimizationResult }
  | { readonly kind: "full"; readonly result: FullBattleSetupOptimizationResult };

export class UiInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UiInputError";
  }
}

const UI_TROOP_LEVEL_IDS = [
  ...Array.from({ length: 10 }, (_, index) => `T${index + 1}`),
  ...Array.from({ length: 10 }, (_, index) => `T10-FC${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `T11-FC${index + 5}`),
  "T12-FC10",
] as const;

export const knownTroopLevelOptions = UI_TROOP_LEVEL_IDS.map((id) => {
  const level = troopLevels[id as keyof typeof troopLevels];
  return { id: level.id, label: level.id, constant: level.constant };
});

export const missingTroopLevelOptions = Object.values(troopLevels)
  .filter((level) => level.status === "missing")
  .map((level) => level.id);

/** 普通UI按完全相同的技能语义合并英雄；value仍是可交给引擎的代表英雄ID。 */
export const bodyHeroOptions = getAllBodyHeroes().filter((hero) =>
  !(hero.status === "pending" && hero.bodySkillDefinition.effectData.length === 0),
);
// UI允许选择仍有有效英雄/专武数据但尚无可计算远征技能的英雄；
// optimizableForBear 只约束自动优化候选，不得用来隐藏手动选择。
export const headHeroOptions = getAllHeadHeroes();
// 自动解锁的燃晶火药、火焰冲击与炽火凝星不再作为手动复选项，避免重复计入。
export const fireCrystalSkillOptions = getFireCrystalSkills().filter(() => false);

export const hunterHeartLevelOptions = HUNTER_HEART_RATES.map((rate, level) =>
  levelOption(level, `${formatPercent(rate)} 对熊增伤`),
);
export const bearSlayerLevelOptions = Array.from({ length: 11 }, (_, level) =>
  levelOption(level, `+${(level * BEAR_SLAYER_CAPACITY_PER_LEVEL).toLocaleString("zh-CN")} 容量`),
);
export const petBuffLevelOptions = PET_BUFF_RATES.map((rate, level) =>
  levelOption(level, formatPercent(rate)),
);
export const petCapacityLevelOptions = Array.from({ length: 11 }, (_, level) =>
  levelOption(level, `+${(level * PET_CAPACITY_PER_LEVEL).toLocaleString("zh-CN")} 容量`),
);
export const exclusiveWeaponLevelOptions = EXCLUSIVE_WEAPON_RATES.map((rate, level) =>
  levelOption(level, formatPercent(rate)),
);
export const troopSkillLevelOptions = Array.from({ length: 25 }, (_, level) =>
  levelOption(level),
);
export const topKOptions = Array.from({ length: 100 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

export const visiblePendingSkillDetails: readonly UiHeroSkillDetail[] = [
  ...bodyHeroOptions.flatMap((hero) =>
    hero.bodySkillDefinition.status === "pending"
      ? [toPendingDetail(hero, hero.bodySkillDefinition)]
      : [],
  ),
  ...headHeroOptions.flatMap((hero) =>
    hero.headSkills.flatMap((definition) =>
      definition.status === "pending" ? [toPendingDetail(hero, definition)] : [],
    ),
  ),
];

export function formatBodyHeroOptionLabel(hero: BodyHeroDefinition): string {
  if (hero.bodySkillDefinition.status === "pending") {
    return `${hero.name}（有待确认技能）`;
  }
  if (hero.bodySkillDefinition.status === "unsupported") {
    return `${hero.name}（当前暂不计算）`;
  }
  return `${hero.name} · ${summarizeSkill(hero.bodySkillDefinition.skill)}`;
}

export function formatHeadHeroOptionLabel(hero: HeadHeroDefinition): string {
  const firstSupported = hero.headSkills.find((definition) => definition.status === "supported");
  const primary = firstSupported?.status === "supported"
    ? summarizeSkill(firstSupported.skill)
    : describeExclusiveWeapon(hero);
  const pendingSuffix = hero.headSkills.some((definition) => definition.status === "pending")
    ? "（有待确认技能）"
    : "";
  return `${hero.name}${primary ? ` · ${primary}` : ""}${pendingSuffix}`;
}

export function getSelectedHeroSkillDetails(form: CalculatorFormState): readonly UiHeroSkillDetail[] {
  const appliedEffects: AppliedEffectForUi[] = [];
  const details: UiHeroSkillDetail[] = [];
  for (const heroId of form.bodyHeroIds.filter(Boolean)) {
    const hero = getHeroById(heroId as HeroId);
    if (hero?.role !== "body") continue;
    collectSkillDefinitionEffects(hero, hero.bodySkillDefinition, appliedEffects, details);
  }
  for (const troopType of TROOP_TYPES) {
    const heroId = form.headHeroIds[troopType];
    if (!heroId) continue;
    const hero = getHeadHeroById(heroId as HeadHeroId);
    if (hero === undefined) continue;
    for (const definition of hero.headSkills) {
      collectSkillDefinitionEffects(hero, definition, appliedEffects, details);
    }
    for (const definition of hero.notApplicableToBearOutgoingDamage ?? []) {
      details.push({
        ownerId: hero.id,
        ownerName: hero.name,
        skillName: definition.name,
        status: "notApplicable",
        summary: definition.rawDescription,
        sourceSummary: hero.name,
      });
    }
    if (hero.headSkills.length === 0) {
      const explorationNames = (hero.explorationSkills ?? []).map((skill) => skill.name).join("、");
      details.push({
        ownerId: hero.id,
        ownerName: hero.name,
        skillName: "打熊远征技能",
        status: "information",
        summary: `当前数据源未提供可计算的打熊远征技能${explorationNames ? `；${explorationNames}已确认为探险技能，不参与计算` : ""}。${describeExclusiveWeapon(hero) || "未记录专武增益类型"}仍按数据配置处理。`,
        sourceSummary: hero.name,
      });
    }
  }
  return [...mergeAppliedSkillEffects(appliedEffects), ...details];
}

export function formatRatioPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function createDefaultFormState(): CalculatorFormState {
  return {
    troops: {
      shield: { count: "1824", troopLevelId: "T11-FC10", attackPercent: "1119.9", defensePercent: "0", penetrationPercent: "521.7", healthPercent: "0" },
      lancer: { count: "1823", troopLevelId: "T10-FC7", attackPercent: "867.0", defensePercent: "0", penetrationPercent: "543.2", healthPercent: "0" },
      marksman: { count: "178723", troopLevelId: "T12-FC10", attackPercent: "1765.0", defensePercent: "0", penetrationPercent: "1551.9", healthPercent: "0" },
    },
    bodyHeroIds: [
      "hero.body.jiexi",
      "hero.body.shuyun",
      "hero.body.hengdelike",
      "hero.body.hengdelike",
    ],
    headHeroIds: {
      shield: "hero.head.heketuo",
      lancer: "hero.head.miya",
      marksman: "hero.head.hengdelike",
    },
    fireCrystalSkillIds: [],
    topK: "10",
    ratioStepPercent: "1",
    optimizeHead: false,
    optimizeFireCrystal: false,
    preparation: {
      hunterHeartLevel: "10",
      bearSlayerLevel: "10",
      town: { attack: "none", penetration: "none", defenseReduction: "none", marchCapacity: "none" },
      pet: { attackLevel: "9", penetrationLevel: "9", defenseReductionLevel: "10", capacityLevel: "10" },
      weaponLevels: { shield: "0", lancer: "5", marksman: "2" },
      marksmanBlazingStarLevel: "1",
      lancerT12SkillLevel: "0",
    },
  };
}

export function displayPercentToDecimal(value: string | number): number {
  const percentage = readFiniteNumber(String(value), "百分比");
  return percentage / 100;
}

export function calculateDisplayedTotalTroops(form: CalculatorFormState): number {
  return TROOP_TYPES.reduce((sum, troopType) => {
    const raw = form.troops[troopType].count.trim();
    if (!raw) return sum;
    const count = Number(raw);
    return Number.isSafeInteger(count) && count >= 0 ? sum + count : sum;
  }, 0);
}

/**
 * 基础出征容量的唯一 UI 数据源：玩家填写的盾、矛、射原始兵数之和。
 * 与扩容后的最终兵数分离，避免把 finalMarchCapacity 再作为下一次计算的基础容量。
 */
export function calculateInputTroopTotal(form: CalculatorFormState): number {
  const counts = parseTroopCounts(form);
  return counts.shield + counts.lancer + counts.marksman;
}

export function calculateUiDamage(form: CalculatorFormState): UiCalculationResult {
  const built = buildBattleInput(form);
  const result = calculateTenRoundExpectedDamage(built.input);
  const baseline = calculateTenRoundExpectedDamage({
    troops: built.input.troops,
    bodyHeroIds: [],
    headFormation: {},
    fireCrystal: { skillIds: [] },
    preparation: {
      ...built.input.preparation,
      exclusiveWeapons: { levelsByHeroId: {} },
    },
  });
  const improvementAbsolute = result.expectedTotalDamage - baseline.expectedTotalDamage;
  const improvementRatio = baseline.expectedTotalDamage === 0
    ? null
    : result.expectedTotalDamage / baseline.expectedTotalDamage - 1;
  const finalTotalTroopCount = result.preparation?.capacity.finalMarchCapacity
    ?? built.input.troops.reduce((sum, troop) => sum + troop.troopCount, 0);
  const finalTroopCounts = result.preparation?.troopCounts;
  const baseDamageByTroop = Object.fromEntries(
    built.input.troops.map((troop) => [
      troop.troopType,
      calculateBaseTroopDamage({
        ...troop,
        totalTroopCount: finalTotalTroopCount,
        troopCount: finalTroopCounts?.[troop.troopType] ?? troop.troopCount,
      }).damage,
    ]),
  ) as Readonly<Record<TroopType, number>>;

  const coreSkipped: UiSkillNotice[] = [
    ...result.skippedPendingSkills,
    ...result.unsupportedSkills,
  ].map((skill) => ({
    source: skill.source,
    ownerId: skill.ownerId,
    ownerName: resolveOwnerName(skill.source, skill.ownerId),
    skillName: skill.skillName,
    status: skill.status,
    reason: skill.reason,
  }));

  return {
    totalTroopCount: finalTotalTroopCount,
    expectedTotalDamage: result.expectedTotalDamage,
    baseExpectedTotalDamage: baseline.expectedTotalDamage,
    improvementAbsolute,
    improvementRatio,
    averageRoundDamage: result.expectedTotalDamage / result.context.totalRounds,
    expectedDamageByTroop: result.expectedDamageByTroop,
    baseDamageByTroop,
    percentageNormalization: built.percentageNormalization,
    appliedSkills: result.appliedSkills.map((skill) => ({
      source: skill.source,
      skillName: skill.skillName,
      ownerId: skill.ownerId,
    })),
    skippedSkills: [...built.localSkippedSkills, ...coreSkipped],
    result,
  };
}

export function createOptimizationRequest(
  form: CalculatorFormState,
  kind: UiOptimizationKind,
): UiOptimizationCoreRequest {
  const built = buildBattleInput(form);
  const topK = readPositiveSafeInteger(form.topK, "Top K");
  const ratioStepPercent = readFiniteNumber(form.ratioStepPercent, "比例步长");
  if (ratioStepPercent <= 0 || ratioStepPercent > 100) {
    throw new UiInputError("比例步长必须大于0且不超过100%。");
  }
  const totalTroopCount = built.input.preparation.baseMarchCapacity;
  if (totalTroopCount <= 0) throw new UiInputError("执行优化前，总兵量必须大于0。");
  const troopSettings = Object.fromEntries(
    built.input.troops.map((troop) => [
      troop.troopType,
      { troopLevelId: troop.troopLevelId, stats: troop.stats },
    ]),
  ) as Readonly<Record<TroopType, TroopRatioSettings>>;

  if (kind === "body") {
    return {
      kind,
      input: {
        troops: built.input.troops,
        ...(built.input.headFormation ? { headFormation: built.input.headFormation } : {}),
        ...(built.input.fireCrystal ? { fireCrystal: built.input.fireCrystal } : {}),
        preparation: built.input.preparation,
      },
      options: { bodyCount: 4, topK },
    };
  }

  if (kind === "ratio") {
    return {
      kind,
      input: {
        totalTroopCount,
        troopSettings,
        bodyHeroIds: built.input.bodyHeroIds,
        ...(built.input.headFormation ? { headFormation: built.input.headFormation } : {}),
        ...(built.input.fireCrystal ? { fireCrystal: built.input.fireCrystal } : {}),
        preparation: built.input.preparation,
        baselineRatios: countsToRatios(toTroopCounts(built.input.troops)),
      },
      options: { stepPercent: ratioStepPercent, topK },
    };
  }

  const head = form.optimizeHead
    ? Object.fromEntries(TROOP_TYPES.map((troopType) => [
        troopType,
        {
          mode: "optimize" as const,
          candidateHeroIds: getHeadHeroesByTroopType(troopType)
            .filter((hero) => hero.optimizableForBear !== false)
            .map((hero) => hero.id),
          includeEmpty: true,
        },
      ]))
    : Object.fromEntries(TROOP_TYPES.map((troopType) => [
        troopType,
        form.headHeroIds[troopType]
          ? { mode: "fixed" as const, fixedHeroId: form.headHeroIds[troopType] as HeadHeroId }
          : { mode: "fixed" as const },
      ]));
  const fireCrystal: FullBattleSetupOptimizationOptions["fireCrystal"] = form.optimizeFireCrystal
    ? {
        mode: "optimize",
        includeEmpty: true,
        allowedConfigurations: fireCrystalSkillOptions.map((skill) => ({
          id: `ui.fire.${skill.id}`,
          settings: { skillIds: [skill.id] },
        })),
      }
    : {
        mode: "fixed",
        configuration: {
          id: "ui.fire.fixed",
          settings: { skillIds: built.input.fireCrystal?.skillIds ?? [] },
        },
      };

  return {
    kind,
    input: { totalTroopCount, troopSettings, preparation: built.input.preparation },
    options: {
      ratio: { mode: "optimize", stepPercent: ratioStepPercent },
      body: { mode: "optimize", bodyCount: 4 },
      head,
      fireCrystal,
      topK,
    },
  };
}

export function runOptimizationCore(request: UiOptimizationCoreRequest): UiOptimizationCoreResult {
  if (request.kind === "body") {
    return { kind: request.kind, result: optimizeBodyHeroes(request.input, request.options) };
  }
  if (request.kind === "ratio") {
    return { kind: request.kind, result: optimizeTroopRatio(request.input, request.options) };
  }
  return { kind: request.kind, result: optimizeFullBattleSetup(request.input, request.options) };
}

export function toUiOptimizationResult(
  core: UiOptimizationCoreResult,
  form: CalculatorFormState,
): UiOptimizationResult {
  const currentCounts = parseTroopCounts(form);
  const currentRatios = countsToRatios(currentCounts);
  const currentHead = formToHeadFormation(form);
  const currentFire = form.fireCrystalSkillIds;

  if (core.kind === "body") {
    return {
      kind: core.kind,
      title: "四车身优化",
      candidateCount: core.result.combinationCount,
      evaluatedCount: core.result.evaluatedCombinationCount,
      cacheHits: core.result.stats.cacheHits,
      cacheMisses: core.result.stats.cacheMisses,
      elapsedMs: core.result.stats.elapsedMs,
      performanceWarning: null,
      rows: core.result.results.map((candidate) => createOptimizationRow({
        rank: candidate.rank,
        score: candidate.score,
        improvementRatio: candidate.improvementRatio,
        troopCounts: currentCounts,
        ratios: currentRatios,
        bodyHeroIds: candidate.heroIds,
        headFormation: currentHead,
        fireCrystalSkillIds: currentFire,
      })),
    };
  }

  if (core.kind === "ratio") {
    return {
      kind: core.kind,
      title: "兵种比例优化",
      candidateCount: core.result.evaluatedRatioCount,
      evaluatedCount: core.result.stats.evaluatedCount,
      cacheHits: core.result.stats.cacheHits,
      cacheMisses: core.result.stats.cacheMisses,
      elapsedMs: core.result.stats.elapsedMs,
      performanceWarning: null,
      rows: core.result.results.map((candidate) => createOptimizationRow({
        rank: candidate.rank,
        score: candidate.score,
        improvementRatio: candidate.improvementRatio ?? null,
        troopCounts: candidate.troopCounts,
        ratios: candidate.ratios,
        bodyHeroIds: form.bodyHeroIds.filter(Boolean),
        headFormation: currentHead,
        fireCrystalSkillIds: currentFire,
      })),
    };
  }

  return {
    kind: core.kind,
    title: "完整联合优化",
    candidateCount: core.result.cartesianCandidateCount,
    evaluatedCount: core.result.evaluatedCandidateCount,
    cacheHits: core.result.stats.cacheHits,
    cacheMisses: core.result.stats.cacheMisses,
    elapsedMs: core.result.stats.elapsedMs,
    performanceWarning: core.result.performanceWarning,
    rows: core.result.results.map((candidate) => createOptimizationRow({
      rank: candidate.rank,
      score: candidate.score,
      improvementRatio: candidate.improvementRatio,
      troopCounts: candidate.troopCounts,
      ratios: candidate.ratios,
      bodyHeroIds: candidate.bodyHeroIds,
      headFormation: candidate.headFormation,
      fireCrystalSkillIds: candidate.fireCrystalConfiguration.settings.skillIds,
    })),
  };
}

export function estimateFullCandidateCount(form: CalculatorFormState): number {
  const step = readFiniteNumber(form.ratioStepPercent, "比例步长");
  const ratioCount = generateTroopRatioGrid(step).length;
  const bodyCount = combinationsWithReplacement(getSupportedBodyHeroes(), 4).length;
  const headCount = form.optimizeHead
    ? TROOP_TYPES.reduce((product, troopType) => product * (getHeadHeroesByTroopType(troopType).length + 1), 1)
    : 1;
  const fireCount = form.optimizeFireCrystal ? fireCrystalSkillOptions.length + 1 : 1;
  return ratioCount * bodyCount * headCount * fireCount;
}

export function applyOptimizationRow(
  form: CalculatorFormState,
  row: UiOptimizationRow,
): CalculatorFormState {
  const bodyHeroIds = [...row.bodyHeroIds.slice(0, 4)];
  while (bodyHeroIds.length < 4) bodyHeroIds.push("");
  // 优化结果中的 troopCounts 可能已经是扩容后的最终兵数。写回表单时只写比例，
  // 并按玩家原始三兵种总数重新分配，防止再次计算时发生二次扩容。
  const inputTroopCounts = allocateTroopsByRatio(
    calculateInputTroopTotal(form),
    row.ratios,
  );
  return {
    ...form,
    troops: Object.fromEntries(TROOP_TYPES.map((troopType) => [
      troopType,
      { ...form.troops[troopType], count: String(inputTroopCounts[troopType]) },
    ])) as Readonly<Record<TroopType, TroopFormValues>>,
    bodyHeroIds,
    headHeroIds: {
      shield: row.headFormation.shieldHeroId ?? "",
      lancer: row.headFormation.lancerHeroId ?? "",
      marksman: row.headFormation.marksmanHeroId ?? "",
    },
    fireCrystalSkillIds: [...row.fireCrystalSkillIds],
  };
}

function buildBattleInput(form: CalculatorFormState): {
  readonly input: UiBattleInput;
  readonly percentageNormalization: UiCalculationResult["percentageNormalization"];
  readonly localSkippedSkills: readonly UiSkillNotice[];
} {
  const percentageNormalization = {} as Record<
    TroopType,
    { attack: PercentageNormalization; penetration: PercentageNormalization }
  >;
  const troops = TROOP_TYPES.map((troopType) => {
    const values = form.troops[troopType];
    const troopCount = readNonNegativeSafeInteger(values.count, `${TROOP_LABELS[troopType]}数量`);
    const level = troopLevels[values.troopLevelId as keyof typeof troopLevels];
    if (level === undefined) throw new UiInputError(`${TROOP_LABELS[troopType]}等级不存在。`);
    if (level.status !== "known") throw new UiInputError(`${values.troopLevelId} 的等级常数尚未提供，不能计算。`);
    const attackPercent = readFiniteNumber(values.attackPercent, `${TROOP_LABELS[troopType]}攻击加成`);
    const defensePercent = readFiniteNumber(values.defensePercent, `${TROOP_LABELS[troopType]}防御加成`);
    const penetrationPercent = readFiniteNumber(values.penetrationPercent, `${TROOP_LABELS[troopType]}穿透加成`);
    const healthPercent = readFiniteNumber(values.healthPercent, `${TROOP_LABELS[troopType]}生命加成`);
    const attackDecimal = displayPercentToDecimal(attackPercent);
    const penetrationDecimal = displayPercentToDecimal(penetrationPercent);
    percentageNormalization[troopType] = {
      attack: { displayPercent: attackPercent, decimal: attackDecimal, multiplier: 1 + attackDecimal },
      penetration: { displayPercent: penetrationPercent, decimal: penetrationDecimal, multiplier: 1 + penetrationDecimal },
    };
    return {
      troopType,
      troopCount,
      troopLevelId: level.id as TroopLevelId,
      // Stage 24 API契约使用百分数点；decimal已在UI适配层验证并用于解释。
      stats: { attackPercent, defensePercent, penetrationPercent, healthPercent },
    };
  });

  const bodyHeroIds: BodyHeroId[] = [];
  const localSkippedSkills: UiSkillNotice[] = [];
  for (const rawHeroId of form.bodyHeroIds.filter(Boolean)) {
    const hero = getHeroById(rawHeroId as HeroId);
    if (hero === undefined) throw new UiInputError(`找不到车身英雄：${rawHeroId}。`);
    if (hero.status === "supported") {
      bodyHeroIds.push(hero.id);
    } else {
      const definition = hero.bodySkillDefinition;
      localSkippedSkills.push({
        source: "body",
        ownerId: hero.id,
        ownerName: hero.name,
        skillName: definition.name,
        status: definition.status,
        reason: definition.status === "pending"
          ? definition.pendingReason
          : definition.unsupportedReason,
      });
    }
  }

  const headFormation = formToHeadFormation(form);
  const fireCrystalSkillIds = form.fireCrystalSkillIds.map((skillId) => {
    if (getTroopSkillById(skillId as TroopSkillId) === undefined) {
      throw new UiInputError(`找不到火晶技能：${skillId}。`);
    }
    return skillId as TroopSkillId;
  });
  const preparation = buildPreparationConfig(form, headFormation);

  return {
    input: {
      troops,
      bodyHeroIds,
      headFormation,
      fireCrystal: { skillIds: fireCrystalSkillIds },
      preparation,
    },
    percentageNormalization,
    localSkippedSkills,
  };
}

function buildPreparationConfig(
  form: CalculatorFormState,
  headFormation: HeadFormation,
): BattlePreparationConfig {
  const levelsByHeroId: Partial<Record<HeadHeroId, number>> = {};
  for (const troopType of TROOP_TYPES) {
    const heroId = headFormation[`${troopType}HeroId`];
    if (heroId !== undefined) {
      levelsByHeroId[heroId] = readIntegerInRange(
        form.preparation.weaponLevels[troopType],
        `${TROOP_LABELS[troopType]}车头专武技能等级`,
        0,
        5,
      );
    }
  }
  return {
    baseMarchCapacity: calculateInputTroopTotal(form),
    otherFixedCapacity: 0,
    expert: {
      hunterHeartLevel: readIntegerInRange(form.preparation.hunterHeartLevel, "猎手之心等级", 0, 11),
      bearSlayerLevel: readIntegerInRange(form.preparation.bearSlayerLevel, "巨熊克星等级", 0, 10),
    },
    town: form.preparation.town,
    pet: {
      attackLevel: readIntegerInRange(form.preparation.pet.attackLevel, "宠物攻击等级", 0, 10),
      penetrationLevel: readIntegerInRange(form.preparation.pet.penetrationLevel, "宠物穿透等级", 0, 10),
      defenseReductionLevel: readIntegerInRange(form.preparation.pet.defenseReductionLevel, "宠物减防等级", 0, 10),
      capacityLevel: readIntegerInRange(form.preparation.pet.capacityLevel, "宠物出征等级", 0, 10),
    },
    exclusiveWeapons: { levelsByHeroId },
    troopSkillLevels: {
      marksmanBlazingStarLevel: readIntegerInRange(form.preparation.marksmanBlazingStarLevel, "炽火凝星等级", 0, 24),
      lancerT12SkillLevel: readIntegerInRange(form.preparation.lancerT12SkillLevel, "矛兵T12技能等级", 0, 24),
    },
  };
}

function formToHeadFormation(form: CalculatorFormState): HeadFormation {
  const formation: {
    shieldHeroId?: HeadHeroId;
    lancerHeroId?: HeadHeroId;
    marksmanHeroId?: HeadHeroId;
  } = {};
  for (const troopType of TROOP_TYPES) {
    const rawHeroId = form.headHeroIds[troopType];
    if (!rawHeroId) continue;
    const hero = getHeadHeroById(rawHeroId as HeadHeroId);
    if (hero === undefined) throw new UiInputError(`找不到车头英雄：${rawHeroId}。`);
    if (hero.troopType !== troopType) {
      throw new UiInputError(`${hero.name}不能放入${TROOP_LABELS[troopType]}车头槽。`);
    }
    formation[`${troopType}HeroId`] = hero.id;
  }
  return formation;
}

function parseTroopCounts(form: CalculatorFormState): TroopCounts {
  return {
    shield: readNonNegativeSafeInteger(form.troops.shield.count, "盾兵数量"),
    lancer: readNonNegativeSafeInteger(form.troops.lancer.count, "矛兵数量"),
    marksman: readNonNegativeSafeInteger(form.troops.marksman.count, "射手数量"),
  };
}

function toTroopCounts(troops: Parameters<typeof calculateTenRoundExpectedDamage>[0]["troops"]): TroopCounts {
  const counts: TroopCounts = { shield: 0, lancer: 0, marksman: 0 };
  for (const troop of troops) {
    (counts as Record<TroopType, number>)[troop.troopType] += troop.troopCount;
  }
  return counts;
}

function countsToRatios(counts: TroopCounts): TroopRatios {
  const total = counts.shield + counts.lancer + counts.marksman;
  if (total <= 0) return { shield: 0, lancer: 0, marksman: 0 };
  return {
    shield: counts.shield / total * 100,
    lancer: counts.lancer / total * 100,
    marksman: counts.marksman / total * 100,
  };
}

function createOptimizationRow(input: {
  readonly rank: number;
  readonly score: number;
  readonly improvementRatio: number | null;
  readonly troopCounts: TroopCounts;
  readonly ratios: TroopRatios;
  readonly bodyHeroIds: readonly string[];
  readonly headFormation: HeadFormation;
  readonly fireCrystalSkillIds: readonly string[];
}): UiOptimizationRow {
  const bodyHeroNames = input.bodyHeroIds.map((heroId) =>
    getHeroById(heroId as HeroId)?.name ?? heroId,
  );
  const headHeroIds = [
    input.headFormation.shieldHeroId,
    input.headFormation.lancerHeroId,
    input.headFormation.marksmanHeroId,
  ].filter((value): value is HeadHeroId => value !== undefined);
  return {
    rank: input.rank,
    expectedTenRoundDamage: input.score,
    improvementRatio: input.improvementRatio,
    troopCounts: input.troopCounts,
    ratios: input.ratios,
    bodyHeroIds: input.bodyHeroIds,
    bodyHeroNames,
    headFormation: input.headFormation,
    headHeroNames: headHeroIds.map((heroId) => getHeadHeroById(heroId)?.name ?? heroId),
    fireCrystalSkillIds: input.fireCrystalSkillIds,
    fireCrystalNames: input.fireCrystalSkillIds.map((skillId) =>
      getTroopSkillById(skillId as TroopSkillId)?.name ?? skillId,
    ),
  };
}

function resolveOwnerName(source: "head" | "fireCrystal", ownerId: string): string {
  return source === "head"
    ? getHeadHeroById(ownerId as HeadHeroId)?.name ?? ownerId
    : TROOP_LABELS[ownerId as TroopType] ?? ownerId;
}

function levelOption(level: number, detail?: string): UiSelectOption {
  return {
    value: String(level),
    label: `${level}级${detail === undefined ? "" : `（${detail}）`}`,
  };
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

function cleanSkillName(name: string): string {
  return name
    .replace(/[（(]车身?5级[）)]/g, "")
    .replace(/[（(]5级[）)]/g, "")
    .trim();
}

function describeExclusiveWeapon(hero: HeadHeroDefinition): string {
  if (hero.exclusiveWeaponBuffType === "attack") return "专武提供攻击增益";
  if (hero.exclusiveWeaponBuffType === "penetration") return "专武提供穿透增益";
  return "";
}

function summarizeSkill(skill: Skill): string {
  const effectText = skill.effects.map((effect) => summarizeEffect(effect)).join("；");
  const triggerText = summarizeTrigger(skill.trigger);
  return `${triggerText}${effectText || cleanSkillName(skill.name)}`;
}

function summarizeTrigger(trigger: SkillTrigger): string {
  if (trigger.type === "probability") return `${formatPercent(trigger.probability)}概率`;
  if (trigger.type === "everyNRounds") {
    return trigger.firstTriggerRound === undefined
      ? `每${trigger.interval}回合`
      : `第${trigger.firstTriggerRound}回合起每${trigger.interval}回合`;
  }
  return "";
}

function summarizeEffect(effect: SkillEffect): string {
  const value = effect.valueByEnemyTroop?.shield ?? effect.value;
  const percentage = formatPercent(value);
  const target = effect.targetTroop === "shield"
    ? "盾兵"
    : effect.targetTroop === "lancer"
      ? "矛兵"
      : effect.targetTroop === "marksman"
        ? "射手"
        : "全军";
  switch (effect.type) {
    case "attack": return `${target}攻击 +${percentage}`;
    case "penetration": return `${target}穿透 +${percentage}`;
    case "defenseReduction": return `敌军防御 -${percentage}`;
    case "baseDamageIncrease": return `${target}伤害 +${percentage}`;
    case "normalAttackDamageIncrease": return `${target}普通攻击伤害 +${percentage}`;
    case "skillDamageIncrease": return `${target}技能伤害 +${percentage}`;
    case "damageIncrease": return `${target}伤害 +${percentage}`;
    case "vulnerable": return `目标受到伤害 +${percentage}`;
    case "normalAttackDamage": return `${target}普通攻击伤害 +${percentage}`;
    case "skillDamage": return `${target}技能伤害 +${percentage}`;
    case "shieldDamage": return `盾兵伤害 +${percentage}`;
    case "lancerDamage": return `矛兵伤害 +${percentage}`;
    case "marksmanDamage": return `射手伤害 +${percentage}`;
    case "troopVsTroopDamage": return `对盾目标伤害 +${percentage}`;
    case "extraDamage": return `${target}额外伤害 +${percentage}`;
    case "extraAttack": return `${target}额外攻击 +${effect.count ?? effect.value}次`;
    case "buffAttack": return `Buff攻击 +${percentage}`;
    case "buffPenetration": return `Buff穿透 +${percentage}`;
    case "buffDefenseReduction": return `Buff减防 +${percentage}`;
    case "expertBearDamage": return `对熊伤害 +${percentage}`;
  }
}

interface AppliedEffectForUi {
  readonly hero: BodyHeroDefinition | HeadHeroDefinition;
  readonly skill: Skill;
  readonly effect: SkillEffect;
}

function collectSkillDefinitionEffects(
  hero: BodyHeroDefinition | HeadHeroDefinition,
  definition: HeroSkillDefinition,
  appliedEffects: AppliedEffectForUi[],
  details: UiHeroSkillDetail[],
): void {
  if (definition.status === "pending") {
    details.push(toPendingDetail(hero, definition));
    return;
  }
  if (definition.status === "unsupported") {
    details.push({
      ownerId: hero.id,
      ownerName: hero.name,
      skillName: cleanSkillName(definition.name),
      status: "pending",
      summary: definition.rawDescription,
      sourceSummary: hero.name,
      reason: definition.unsupportedReason,
    });
    return;
  }
  for (const effect of definition.skill.effects) {
    appliedEffects.push({ hero, skill: definition.skill, effect });
  }
}

function mergeAppliedSkillEffects(
  entries: readonly AppliedEffectForUi[],
): readonly UiHeroSkillDetail[] {
  const groups = new Map<string, AppliedEffectForUi[]>();
  for (const entry of entries) {
    const key = appliedEffectSemanticKey(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.values()].map((group) => {
    const first = group[0]!;
    const values = group.map(({ effect }) => effect.valueByEnemyTroop?.shield ?? effect.value);
    const sameValue = values.every((value) => value === values[0]);
    const total = values.reduce((sum, value) => sum + value, 0);
    const sourceSummary = summarizeMergedSources(group, sameValue);
    const schedule = summarizeEffectSchedule(first.skill, first.effect);
    return {
      ownerId: group.map(({ hero }) => hero.id).join("+"),
      ownerName: sourceSummary,
      skillName: effectHeading(first.effect, sameValue ? values[0]! : undefined),
      status: "applied" as const,
      summary: schedule,
      sourceSummary,
      totalSummary: `${effectTotalLabel(first.effect)} ${formatContribution(first.effect, total, true)}`,
    };
  });
}

function appliedEffectSemanticKey(entry: AppliedEffectForUi): string {
  const effect = entry.effect;
  return JSON.stringify({
    type: canonicalUiEffectType(effect.type),
    sourceRole: entry.hero.role,
    targetTroop: effect.targetTroop ?? "all",
    trigger: entry.skill.trigger,
    lifecycle: effect.lifecycle ?? entry.skill.lifecycle ?? null,
    activeRounds: effect.activeRounds ?? null,
    valueByRound: effect.valueByRound ?? null,
    valueByEnemyTroop: effect.valueByEnemyTroop ?? null,
    zoneAggregation: effect.zoneAggregation ?? "additive",
    basis: effect.type === "extraDamage" ? "formalBearCommonDamage" : null,
  });
}

function summarizeMergedSources(
  entries: readonly AppliedEffectForUi[],
  sameValue: boolean,
): string {
  const counts = new Map<string, { name: string; value: number; count: number; effect: SkillEffect }>();
  for (const entry of entries) {
    const value = entry.effect.valueByEnemyTroop?.shield ?? entry.effect.value;
    const key = `${entry.hero.role}\u0000${entry.hero.name}\u0000${value}`;
    const current = counts.get(key);
    counts.set(key, current === undefined
      ? { name: entry.hero.name, value, count: 1, effect: entry.effect }
      : { ...current, count: current.count + 1 });
  }
  return [...counts.values()].map((source) => {
    const count = source.count > 1 ? ` ×${source.count}` : "";
    const value = sameValue ? "" : ` ${formatContribution(source.effect, source.value, false)}`;
    return `${source.name}${count}${value}`;
  }).join("、");
}

function summarizeEffectSchedule(skill: Skill, effect: SkillEffect): string {
  const parts: string[] = [];
  const trigger = summarizeTrigger(skill.trigger);
  if (trigger) parts.push(trigger);
  if (effect.activeRounds?.length) {
    parts.push(`第 ${effect.activeRounds.join("、")} 回合生效`);
  }
  if (effect.valueByRound) parts.push("数值按回合变化");
  if (effect.lifecycle?.activationTiming === "nextRound" || skill.lifecycle?.activationTiming === "nextRound") {
    parts.push("本回合施加，下一回合生效");
  }
  return parts.join("；");
}

function canonicalUiEffectType(type: SkillEffect["type"]): SkillEffect["type"] {
  if (type === "damageIncrease") return "baseDamageIncrease";
  if (type === "normalAttackDamage") return "normalAttackDamageIncrease";
  if (type === "skillDamage") return "skillDamageIncrease";
  return type;
}

function effectHeading(effect: SkillEffect, value?: number): string {
  const target = effect.targetTroop === "shield"
    ? "盾兵"
    : effect.targetTroop === "lancer"
      ? "矛兵"
      : effect.targetTroop === "marksman"
        ? "射手"
        : "全军";
  const label = (() => {
    switch (canonicalUiEffectType(effect.type)) {
      case "attack": return `${target}攻击`;
      case "penetration": return `${target}穿透`;
      case "defenseReduction": return "敌军防御";
      case "baseDamageIncrease": return `${target}伤害`;
      case "normalAttackDamageIncrease": return `${target}普通攻击伤害`;
      case "skillDamageIncrease": return `${target}技能伤害`;
      case "vulnerable": return "目标受到伤害";
      case "troopVsTroopDamage": return "对盾目标伤害";
      case "extraDamage": return `${target}额外伤害`;
      default: return summarizeEffect({ ...effect, value: 0 }).replace(/\s[+-]0%$/, "");
    }
  })();
  return value === undefined ? `${label}提升` : `${label} ${formatContribution(effect, value, false)}`;
}

function effectTotalLabel(effect: SkillEffect): string {
  switch (canonicalUiEffectType(effect.type)) {
    case "attack": return "攻击";
    case "penetration": return "穿透";
    case "defenseReduction": return "减防";
    case "baseDamageIncrease": return "基础增伤";
    case "normalAttackDamageIncrease": return "普攻增伤";
    case "skillDamageIncrease": return "技能增伤";
    case "vulnerable": return "易伤";
    case "troopVsTroopDamage": return "兵种伤害";
    case "extraDamage": return "额外伤害";
    default: return "效果";
  }
}

function formatContribution(effect: SkillEffect, value: number, total: boolean): string {
  const prefix = effect.type === "defenseReduction" && !total ? "-" : "+";
  return `${prefix}${formatPercent(value)}`;
}

function toPendingDetail(
  hero: BodyHeroDefinition | HeadHeroDefinition,
  definition: Extract<HeroSkillDefinition, { readonly status: "pending" }>,
): UiHeroSkillDetail {
  return {
    ownerId: hero.id,
    ownerName: hero.name,
    skillName: cleanSkillName(definition.name),
    status: "pending",
    summary: definition.rawDescription,
    sourceSummary: hero.name,
    reason: definition.pendingReason,
  };
}

function readFiniteNumber(value: string, label: string): number {
  if (!value.trim()) throw new UiInputError(`${label}不能为空。`);
  const number = Number(value);
  if (!Number.isFinite(number)) throw new UiInputError(`${label}必须是有限数字。`);
  return number;
}

function readNonNegativeSafeInteger(value: string, label: string): number {
  const number = readFiniteNumber(value, label);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new UiInputError(`${label}必须是非负整数。`);
  }
  return number;
}

function readPositiveSafeInteger(value: string, label: string): number {
  const number = readFiniteNumber(value, label);
  if (!Number.isSafeInteger(number) || number <= 0 || number > 100) {
    throw new UiInputError(`${label}必须是1～100之间的整数。`);
  }
  return number;
}

function readIntegerInRange(value: string, label: string, minimum: number, maximum: number): number {
  const number = readFiniteNumber(value, label);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new UiInputError(`${label}必须是${minimum}～${maximum}之间的整数。`);
  }
  return number;
}
