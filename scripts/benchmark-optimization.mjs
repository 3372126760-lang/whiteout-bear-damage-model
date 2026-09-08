import {
  optimizeBattleSetup,
  optimizeBodyHeroes,
  optimizeFullBattleSetup,
  optimizeTroopRatio,
} from "../dist-core/damage-model.js";

const troopSettings = {
  shield: {
    troopLevelId: "T10",
    stats: { attackPercent: 444.35, defensePercent: 200, penetrationPercent: 123.45, healthPercent: 200 },
  },
  lancer: {
    troopLevelId: "T11",
    stats: { attackPercent: 420, defensePercent: 210, penetrationPercent: 130, healthPercent: 210 },
  },
  marksman: {
    troopLevelId: "T12-FC6",
    stats: { attackPercent: 480, defensePercent: 190, penetrationPercent: 145, healthPercent: 190 },
  },
};

const troops = [
  { troopType: "shield", troopLevelId: "T10", troopCount: 20_000, stats: troopSettings.shield.stats },
  { troopType: "lancer", troopLevelId: "T11", troopCount: 30_000, stats: troopSettings.lancer.stats },
  { troopType: "marksman", troopLevelId: "T12-FC6", troopCount: 50_003, stats: troopSettings.marksman.stats },
];

function measured(run) {
  const startedAt = performance.now();
  const result = run();
  return { result, wallClockMs: performance.now() - startedAt };
}

const ratio = measured(() => optimizeTroopRatio({
  totalTroopCount: 100_003,
  troopSettings,
  bodyHeroIds: ["hero.body.jiexi"],
}));

// 基准保持完整穷举语义，但限制为4个真实确定性supported候选：C(7,4)=35。
// 全24人池的理论规模单独报告，避免benchmark自身因概率状态笛卡尔积长期占用近1GB内存。
const body = measured(() => optimizeBodyHeroes(
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
));

// 1%完整比例网格；四车身允许重复。候选池限制为两个真实supported英雄，
// 因而车身组合为C(2+4-1,4)=5，仍对25,755项做精确全量评估。
const joint = measured(() => optimizeBattleSetup(
  { totalTroopCount: 100_003, troopSettings },
  {
    ratioStepPercent: 1,
    bodyCount: 4,
    candidateHeroIds: ["hero.body.jiexi", "hero.body.suoniya"],
  },
));

// 10%比例 × 2车身 × 1个可用盾头 × 2个显式兼容配置 = 264。
// 兵种/火晶技能已按等级自动解锁；显式配置仅验证兼容去重路径。
const full = measured(() => optimizeFullBattleSetup(
  { totalTroopCount: 100_003, troopSettings },
  {
    ratio: { mode: "optimize", stepPercent: 10 },
    body: {
      mode: "optimize",
      bodyCount: 1,
      candidateHeroIds: ["hero.body.jiexi", "hero.body.suoniya"],
    },
    head: {
      shield: {
        mode: "optimize",
        candidateHeroIds: ["hero.head.heketuo"],
        includeEmpty: false,
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
));

const report = {
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    note: "elapsedMs只用于开发观察，不参与伤害或排序。",
  },
  ratio: {
    candidateCount: ratio.result.evaluatedRatioCount,
    evaluatedCount: ratio.result.stats.evaluatedCount,
    cacheHits: ratio.result.stats.cacheHits,
    cacheMisses: ratio.result.stats.cacheMisses,
    probabilityStateCount: ratio.result.stats.probabilityStateCount,
    elapsedMs: ratio.result.stats.elapsedMs,
    wallClockMs: ratio.wallClockMs,
  },
  body: {
    candidateHeroCount: body.result.candidateHeroCount,
    combinationCount: body.result.combinationCount,
    evaluatedCount: body.result.stats.evaluatedCount,
    cacheHits: body.result.stats.cacheHits,
    cacheMisses: body.result.stats.cacheMisses,
    probabilityStateCount: body.result.stats.probabilityStateCount,
    elapsedMs: body.result.stats.elapsedMs,
    wallClockMs: body.wallClockMs,
  },
  joint: {
    ratioCandidateCount: joint.result.ratioCandidateCount,
    bodyCombinationCount: joint.result.bodyCombinationCount,
    cartesianCandidateCount: joint.result.cartesianCandidateCount,
    evaluatedCount: joint.result.stats.evaluatedCount,
    cacheHits: joint.result.stats.cacheHits,
    cacheMisses: joint.result.stats.cacheMisses,
    probabilityStateCount: joint.result.stats.probabilityStateCount,
    elapsedMs: joint.result.stats.elapsedMs,
    wallClockMs: joint.wallClockMs,
  },
  full: {
    ratioCandidateCount: full.result.ratioCandidateCount,
    bodyCombinationCount: full.result.bodyCombinationCount,
    headCombinationCount: full.result.headCombinationCount,
    fireCrystalConfigurationCount: full.result.fireCrystalConfigurationCount,
    cartesianCandidateCount: full.result.cartesianCandidateCount,
    evaluatedCount: full.result.stats.evaluatedCount,
    cacheHits: full.result.stats.cacheHits,
    cacheMisses: full.result.stats.cacheMisses,
    probabilityStateCount: full.result.stats.probabilityStateCount,
    elapsedMs: full.result.stats.elapsedMs,
    wallClockMs: full.wallClockMs,
  },
  theoreticalSpaces: {
    ratioAtOnePercent: 5_151,
    bodyFromAll24Supported: 17_550,
    ratioAndBodyExactSpace: 5_151 * 17_550,
  },
};

for (const [name, benchmark] of Object.entries({ ratio: report.ratio, body: report.body, joint: report.joint, full: report.full })) {
  if (benchmark.evaluatedCount !== (benchmark.candidateCount ?? benchmark.combinationCount ?? benchmark.cartesianCandidateCount)) {
    throw new Error(`${name} benchmark did not evaluate its complete candidate set.`);
  }
}

console.log(JSON.stringify(report, null, 2));
