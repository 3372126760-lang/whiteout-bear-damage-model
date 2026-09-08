# Pending 技能审计与确认清单

审计口径：2026-09-09 最新确认规则。数据仅来自 `src/game-data` 并经 `collectSkillCatalog()` 汇总。`pending` 不进入正式伤害或优化评分；`DATA_SOURCE_UNCERTAIN` 占位英雄在正常 UI 隐藏。

## 统计

| 项目 | 数量 |
|---|---:|
| pending skill | 4 |
| pending effect | 0 |
| RULE_UNKNOWN | 0 |
| ENGINE_GAP | 0 |
| DATA_SOURCE_UNCERTAIN | 4 |

## 当前清单

| 类别 | 英雄/系统 | 技能 | 原始描述 | 状态 | 原因类型 | 已支持能力 | 仍待确认规则 | 是否影响打熊伤害 |
|---|---|---|---|---|---|---|---|---|
| 车身 | 丽娅拉 | 车身技能资料待提供 | 尚未提供明确可用于打熊的车身技能数据。 | pending | DATA_SOURCE_UNCERTAIN | 通用乘区、概率、持续、周期、额外伤害 | [ ] 提供打熊车身远征技能原文、5级数值、目标和触发 | 未知 |
| 车身 | 艾丝蒂拉 | 车身技能资料待提供 | 尚未提供明确可用于打熊的车身技能数据。 | pending | DATA_SOURCE_UNCERTAIN | 同上 | [ ] 提供打熊车身远征技能原文、5级数值、目标和触发 | 未知 |
| 车身 | 埃莉诺 | 车身技能资料待提供 | 尚未提供明确可用于打熊的车身技能数据。 | pending | DATA_SOURCE_UNCERTAIN | 同上 | [ ] 提供打熊车身远征技能原文、5级数值、目标和触发 | 未知 |
| 车身 | 弗洛拉 | 车身技能资料待提供 | 当前仅确认效果与米娅相似，完整规则和数值尚未提供。 | pending | DATA_SOURCE_UNCERTAIN | 概率、nextRound 易伤 | [ ] 提供原文、5级概率、数值、频率和重复触发规则 | 未知 |

## 用户实际可见 Pending

**无（0 项）**。当前没有用户可见的 RULE_UNKNOWN 技能。

丽娅拉、艾丝蒂拉、埃莉诺、弗洛拉仅作底层数据占位，正常 UI 隐藏。

## 本轮从 Pending 移出的项目

- 韦恩：round5 首次、每4回合一次；round5/9 造成100% `extraDamage`。
- 米娅·幸运加护：每回合50%概率，当回合 `baseDamageIncrease +50%`。
- 布拉德利三技能：round5/6/9/10 `baseDamageIncrease +30%`。
- 亨德里克第三技能：round3 `extraDamage +40%`，使用正式熊模型统一的共同乘区伤害基准。
- 鲁弗斯·碎甲一击易伤：每回合施加25%，下一回合生效，持续1回合。
- 尼莫·战前宣言：常驻全军穿透+25%。
- 尼莫·剑术指导：常驻全军攻击+25%。
- 尼莫·精湛剑术：round5/6/9/10基础增伤+30%。
- 格温·第6次攻击特殊伤害：第6次普通攻击附加100% `extraDamage`，以当前该次攻击的共同乘区伤害为基准；不是 `extraAttack`，不新增 `AttackEvent`。
- 格温·特殊易伤覆盖：第6次攻击后的下下次攻击（第8次普通攻击）使当前回合 `vulnerable` 强制为15%，使用 `replace`，不与其他易伤相加；下一回合恢复正常。

尼莫当前 pending 数量：**0**。三断斩、剑气、孤傲仍是探险技能，不进入远征打熊目录，也不计为 pending。

## 当前可继续确认的规则项

当前没有 RULE_UNKNOWN 或 ENGINE_GAP。仍待补充的只有四个 DATA_SOURCE_UNCERTAIN 车身英雄原始资料。

本表是后续逐项补资料的 checklist。不得为减少 pending 数量自行选择结算语义。
