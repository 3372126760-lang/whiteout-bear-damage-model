# 兵种比例与四车身联合优化器

## 搜索空间

联合优化器复用以下现有模块，不包含任何伤害公式：

- `generateTroopRatioGrid()`
- `allocateTroopsByRatio()`
- `combinationsWithReplacement()`
- `calculateTenRoundExpectedDamage()`

默认比例步长 1%、车身数量 4、返回前 20 名。18 个 supported 车身产生 5,985 个允许重复且忽略顺序的组合；5,151 个比例候选与之组成 30,828,735 个完整方案。所有方案均被评估，约束过滤发生在合法比例候选生成阶段，当前 `skippedCount = 0`。

实现只实时保留前 K 名，避免同时保存三千多万个完整战斗对象。这只是等价的内存控制，不是剪枝；每个比例与车身组合仍调用现有十回合期望伤害引擎。

## 比例和基础兵数因子

比例继续由 `allocateTroopsByRatio()` 使用 largest remainder method 转为整数兵数。实际兵数原样交给伤害引擎；三个兵种共享 `sqrt(min(N,5000))`，并分别使用未截断的 `sqrt(n)`。

## 评分

默认 `scoreMetric = expectedTenRoundTotalDamage`，即精确的十回合总期望伤害。结果同时保留：

- `singleRoundDamage`：既有伤害引擎的单回合伤害；
- `totalDamage` / `score`：当前评分模式的十回合伤害；
- `expectedTenRoundDamage` 与 `expectedDamageByRound`：正式期望评分及逐回合解释；
- `singleRoundResult` 和 `battleTotalResult`：完整解释结构。

概率、周期、持续和叠层机制通过正式期望伤害入口直接参与。`BattleSetupScorer` 只保留给 `legacy` 模式；比例生成、车身组合生成和基础伤害公式没有改变。

`improvementOverNoBody` 使用候选方案相同的实际兵种比例，移除四个车身后重新调用伤害引擎作为基准。

## 排序

首先按评分降序；并列时依次按射手、矛兵、盾兵比例降序，再按英雄 ID 的规范组合键排序。不同英雄组合即使技能效果和伤害相同也会保留。

## 更高层完整优化

本模块继续只负责“比例 × 车身”。第二十三步新增的 `optimizeFullBattleSetup()` 在不改变本 API 的前提下组合比例、车身、车头和火晶四个维度。需要固定 head/fire 并复现本优化器时，可在完整优化器中把对应维度设为 `fixed` 空配置；两者会得到相同评分与排序。详见 `docs/full-setup-optimizer.md`。
