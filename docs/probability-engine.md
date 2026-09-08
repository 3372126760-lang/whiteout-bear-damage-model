# 精确概率引擎

十回合期望通过 WeightedBattleState 精确传播：每个 Bernoulli 事件按 p 与 1-p 分裂，未来演化完全等价的状态用稳定 key 合并，期望伤害按概率加权。不会把持续、刷新、叠层或联动技能粗略替换成 1+p×x。

状态可携带 ActiveEffect、remainingRounds、stackCount、applicationCount 与 extraDamage。概率质量逐回合保持约等于1，仅允许浮点容差；不做十进制定点取整或 Monte Carlo。extraAttack 事件能力仍保留在底层历史框架，但当前正式熊入口不会安排这类事件。

真实规则已接入：格雷格每回合20%并刷新3回合；阿隆索/琳恩每回合40%当回合穿透；米娅每回合三次独立50%并产生下一回合不叠加易伤；赫克托疾风猛击每回合25%产生+100%D extraDamage；连射、燃晶火药和炎晶战矛使用显式概率事件。

所有具体技能仍来自 catalog。概率引擎不包含英雄名称分支，也不复制基础伤害公式。
