import { beforeAll, describe, expect, it } from "vitest";
import { calculateBattleDamage } from "../../app/calculateBattleDamage";
import type {
  BodyOptimizationInput,
  BodyOptimizationResult,
} from "../../domain/bodyOptimization";
import type { BodyHeroId } from "../../domain/hero";
import {
  getPendingBodyHeroes,
  getSupportedBodyHeroes,
  getUnsupportedBodyHeroes,
} from "../../game-data/heroes/bodyHeroQueries";
import { combinationsWithReplacement } from "../combinationsWithReplacement";
import {
  UnavailableOptimizerHeroError,
} from "./errors";
import { optimizeBodyHeroes } from "./optimizeBodyHeroes";

const testInput: BodyOptimizationInput = {
  troops: [
    {
      troopType: "shield",
      troopLevelId: "T10",
      troopCount: 10_000,
      stats: { attackPercent: 400, penetrationPercent: 100 },
    },
    {
      troopType: "lancer",
      troopLevelId: "T10",
      troopCount: 20_000,
      stats: { attackPercent: 400, penetrationPercent: 100 },
    },
    {
      troopType: "marksman",
      troopLevelId: "T10",
      troopCount: 30_000,
      stats: { attackPercent: 400, penetrationPercent: 100 },
    },
  ],
};

const jiexi = "hero.body.jiexi" as const;
const jiesaier = "hero.body.jiesaier" as const;
const shuyun = "hero.body.shuyun" as const;

describe("combinationsWithReplacement", () => {
  it("允许四个相同元素", () => {
    const combinations = combinationsWithReplacement(["A", "B"], 4);

    expect(combinations).toContainEqual(["A", "A", "A", "A"]);
    expect(combinations).toContainEqual(["B", "B", "B", "B"]);
  });

  it("忽略排列顺序，不重复生成 A+B+C+D 与 D+C+B+A", () => {
    const combinations = combinationsWithReplacement(["A", "B", "C", "D"], 4);
    const keys = combinations.map((combination) => combination.join("+"));

    expect(combinations).toHaveLength(35);
    expect(new Set(keys).size).toBe(combinations.length);
    expect(keys.filter((key) => key === "A+B+C+D")).toHaveLength(1);
    expect(keys).not.toContain("D+C+B+A");
  });
});

describe("optimizeBodyHeroes", () => {
  let defaultResult: BodyOptimizationResult;

  beforeAll(() => {
    defaultResult = optimizeBodyHeroes(testInput, { bodyCount: 0 });
  });

  it("默认候选池只包含24个supported英雄，四车身理论组合数为17550", () => {
    expect(getSupportedBodyHeroes()).toHaveLength(24);
    expect(defaultResult.candidateHeroCount).toBe(24);
    expect(defaultResult.combinationCount).toBe(1);
    expect(defaultResult.evaluatedCombinationCount).toBe(1);
    expect(combinationsWithReplacement(getSupportedBodyHeroes(), 4)).toHaveLength(17_550);

    for (const result of defaultResult.results) {
      expect(result.heroes).toHaveLength(0);
      expect(result.heroes.every((hero) => hero.status === "supported")).toBe(
        true,
      );
    }
  });

  it("pending 和 unsupported 英雄不进入默认候选池", () => {
    const excludedIds = new Set([
      ...getPendingBodyHeroes().map((hero) => hero.id),
      ...getUnsupportedBodyHeroes().map((hero) => hero.id),
    ]);

    for (const result of defaultResult.results) {
      expect(result.heroIds.some((heroId) => excludedIds.has(heroId))).toBe(
        false,
      );
    }
  });

  it("手动候选池包含 pending 或 unsupported 英雄时明确报错", () => {
    for (const heroId of [
      "hero.body.liyala",
      "hero.body.aisidila",
    ] as const) {
      expect(() =>
        optimizeBodyHeroes(testInput, {
          candidateHeroIds: [heroId],
        }),
      ).toThrow(UnavailableOptimizerHeroError);
    }
  });

  it("每个返回候选的伤害都与 calculateBattleDamage 直接计算一致", () => {
    for (const result of defaultResult.results) {
      const directResult = calculateBattleDamage({
        ...testInput,
        bodyHeroIds: result.heroIds,
      });

      expect(result.totalDamage).toBe(directResult.finalDamage);
      expect(result.troopDamages.shield).toBe(
        directResult.troopDamages.shield?.finalDamage ?? 0,
      );
      expect(result.troopDamages.lancer).toBe(
        directResult.troopDamages.lancer?.finalDamage ?? 0,
      );
      expect(result.troopDamages.marksman).toBe(
        directResult.troopDamages.marksman?.finalDamage ?? 0,
      );
    }
  });

  it("结果按照 totalDamage 从高到低排序", () => {
    for (let index = 1; index < defaultResult.results.length; index += 1) {
      expect(defaultResult.results[index - 1]!.totalDamage).toBeGreaterThanOrEqual(
        defaultResult.results[index]!.totalDamage,
      );
    }
  });

  it("默认 topK=10，结果不会超过候选数", () => {
    expect(defaultResult.topK).toBe(10);
    expect(defaultResult.results).toHaveLength(1);
    expect(defaultResult.results.map((result) => result.rank)).toEqual([1]);
  });

  it.each([1, 2, 3, 4])("bodyCount=%i 能正常工作", (bodyCount) => {
    const result = optimizeBodyHeroes(testInput, {
      bodyCount,
      topK: 100,
      candidateHeroIds: [jiexi, shuyun],
    });

    expect(result.combinationCount).toBe(bodyCount + 1);
    expect(result.evaluatedCombinationCount).toBe(bodyCount + 1);
    expect(
      result.results.every((candidate) => candidate.heroIds.length === bodyCount),
    ).toBe(true);
  });

  it("improvementOverNoBody 严格按组合伤害/无车身伤害-1计算", () => {
    const result = optimizeBodyHeroes(testInput, {
      bodyCount: 1,
      topK: 1,
      candidateHeroIds: [jiexi],
    });
    const noBody = calculateBattleDamage({ ...testInput, bodyHeroIds: [] });
    const candidate = result.results[0]!;

    expect(candidate.improvementOverNoBody).toBeCloseTo(
      candidate.totalDamage / noBody.finalDamage - 1,
      12,
    );
  });

  it("两个不同但等伤害的组合不会按伤害去重", () => {
    const result = optimizeBodyHeroes(testInput, {
      bodyCount: 1,
      topK: 10,
      candidateHeroIds: [jiexi, jiesaier],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.totalDamage).toBe(result.results[1]!.totalDamage);
    expect(new Set(result.results.map((item) => item.heroIds[0])).size).toBe(2);
  });

  it("单英雄候选池能生成四个相同英雄", () => {
    const result = optimizeBodyHeroes(testInput, {
      bodyCount: 4,
      candidateHeroIds: [jiexi],
    });

    expect(result.combinationCount).toBe(1);
    expect(result.results[0]!.heroIds).toEqual([
      jiexi,
      jiexi,
      jiexi,
      jiexi,
    ] satisfies BodyHeroId[]);
  });
});
