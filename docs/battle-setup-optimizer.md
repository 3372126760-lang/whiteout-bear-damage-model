# 兵种比例与四车身联合优化器

## 搜索空间

联合优化器复用以下现有模块，不包含任何伤害公式：

- `optimizeSeparableRatioGrid()`
- `allocateTroopsByRatio()`
- `combinationsWithReplacementLimited()`
- `calculateTenRoundExpectedDamage()`

默认比例步长 0.01%、车身数量 4、返回前 20 名。车身按九个 `BodySkillOption` 搜索、每种最多两份，共 414 个合法组合。理论比例空间为 50,015,001；联合优化不会建立两者的完整笛卡尔积。

每个预聚合 `BodyEffect` 先通过正式十回合期望入口得到 `Ks/Kl/Km`，再独立求该效果的0.01%网格 exact Top K。分支只在严格伤害上界低于当前阈值时剪掉，因此是精确搜索；最终候选仍由正式引擎复核。

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

首先按评分降序；并列时依次按射手、矛兵、盾兵比例降序，再按技能选项规范组合键排序。相同技能的来源英雄不再形成不同优化维度。

## 更高层完整优化

本模块继续只负责“比例 × 车身”。第二十三步新增的 `optimizeFullBattleSetup()` 在不改变本 API 的前提下组合比例、车身、车头和火晶四个维度。需要固定 head/fire 并复现本优化器时，可在完整优化器中把对应维度设为 `fixed` 空配置；两者会得到相同评分与排序。详见 `docs/full-setup-optimizer.md`。
