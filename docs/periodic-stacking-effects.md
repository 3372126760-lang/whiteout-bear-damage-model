# 周期、叠层与固定回合效果

引擎保留 everyNRounds、duration、refresh/replace/stack、maxStacks、decayRate、maxApplications 和 activeRounds/valueByRound 的通用表达。

当前确认的真实规则不通过英雄名称硬编码：

- 赫克托雷霆出击用 valueByRound 表示 round1 数值及每回合×0.85，直至round10；它是普通增伤，不是 extraDamage/extraAttack。
- 炽火凝星不是战斗叠层。配置 L0–24 后，仅 round6–10 使用固定 0.005×L。
- 矛兵T12技能只在 round1–5 使用固定 0.01×L。
- 布拉德利循环已知回合5、6、9、10，但效果和值未知，仍 pending。
- 韦恩已确认为 round5 首次、每4回合一次；10回合内 round5/9 造成100% extraDamage。

通用叠层框架继续为未来数据保留，但不会把未确认的真实技能强制套入某种叠层语义。
