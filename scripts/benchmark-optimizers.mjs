import {
  optimizeBattleSetup,
  optimizeBodyHeroes,
  optimizeFullBattleSetup,
  optimizeTroopRatio,
} from "../dist-core/damage-model.js";

const troopSettings = {
  shield: {
    troopLevelId: "T10",
    stats: { attackPercent: 400, penetrationPercent: 100 },
  },
  lancer: {
    troopLevelId: "T10",
    stats: { attackPercent: 400, penetrationPercent: 100 },
  },
  marksman: {
    troopLevelId: "T10",
    stats: { attackPercent: 400, penetrationPercent: 100 },
  },
};

const troops = [
  { troopType: "shield", troopLevelId: "T10", troopCount: 10_000, stats: troopSettings.shield.stats },
  { troopType: "lancer", troopLevelId: "T10", troopCount: 20_000, stats: troopSettings.lancer.stats },
  { troopType: "marksman", troopLevelId: "T10", troopCount: 30_000, stats: troopSettings.marksman.stats },
];

const body = optimizeBodyHeroes(
  { troops },
  {
    bodyCount: 4,
    candidateHeroIds: [
      "hero.body.jiexi",
      "hero.body.shuyun",
      "hero.body.hengdelike",
      "hero.body.suoniya",
    ],
  },
);
const ratio = optimizeTroopRatio({
  totalTroopCount: 60_000,
  troopSettings,
  bodyHeroIds: ["hero.body.jiexi"],
});

// 保持默认1%和bodyCount=4，但用单英雄候选池形成快速、可重复的联合基准。
const joint = optimizeBattleSetup(
  { totalTroopCount: 60_000, troopSettings },
  { candidateHeroIds: ["hero.body.jiexi"] },
);

// 第二十三步全维度基准：66个比例 × 1个车身 × 3个盾头 × 6个火晶配置。
// 当前真实head/fire技能均为pending，因此它们会被报告但不会改变正式评分。
const full = optimizeFullBattleSetup(
  { totalTroopCount: 60_000, troopSettings },
  {
    ratio: { mode: "optimize", stepPercent: 10 },
    body: {
      mode: "optimize",
      bodyCount: 4,
      candidateHeroIds: ["hero.body.jiexi"],
    },
    head: {
      shield: {
        mode: "optimize",
        candidateHeroIds: ["hero.head.heketuo"],
        includeEmpty: true,
      },
    },
    fireCrystal: {
      mode: "optimize",
      includeEmpty: true,
      allowedConfigurations: [
        { id: "fc.remote-strike", settings: { skillIds: ["troop-skill.marksman.remote-strike"] } },
      ],
    },
  },
);

console.log(JSON.stringify({
  body: {
    candidateHeroCount: body.candidateHeroCount,
    combinationCount: body.combinationCount,
    stats: body.stats,
  },
  ratio: {
    evaluatedRatioCount: ratio.evaluatedRatioCount,
    stats: ratio.stats,
  },
  joint: {
    ratioCandidateCount: joint.ratioCandidateCount,
    bodyCombinationCount: joint.bodyCombinationCount,
    cartesianCandidateCount: joint.cartesianCandidateCount,
    stats: joint.stats,
  },
  full: {
    ratioCandidateCount: full.ratioCandidateCount,
    bodyCombinationCount: full.bodyCombinationCount,
    headCombinationCount: full.headCombinationCount,
    fireCrystalConfigurationCount: full.fireCrystalConfigurationCount,
    cartesianCandidateCount: full.cartesianCandidateCount,
    evaluatedCandidateCount: full.evaluatedCandidateCount,
    performanceWarning: full.performanceWarning,
    stats: full.stats,
  },
  theoreticalRatioAndAllBodies: 5_151 * 14_950,
}, null, 2));
