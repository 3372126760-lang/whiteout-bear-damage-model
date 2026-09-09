export interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly changes: readonly string[];
}

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    version: "0.2",
    date: "2026-09-09",
    changes: [
      "新增战报模式 / 集结模式双输入方式",
      "集结模式支持“部队攻穿 + 对应兵种攻穿”",
      "集结模式直接使用熊车上的最终出征兵数",
      "熊坑固定攻击+25%加入基础攻击属性",
      "战报模式删除无用的防御/生命输入",
      "新增95%伤害区间",
      "新增版本更新日志",
      "优化集结模式输入与默认配置",
    ],
  },
  {
    version: "0.1",
    date: "2026-09-09",
    changes: [
      "首个公开版本",
      "支持10回合期望打熊伤害",
      "支持车头、车身、兵种、火晶、Buff、Expert",
      "支持兵种比例与车身优化",
    ],
  },
];
