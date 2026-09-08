# 车头英雄系统

车头每个兵种一个槽位，英雄兵种必须与槽位匹配；车头读取该英雄全部远征技能，车身只读取 bodySkill。两类技能最终进入同一个 SkillResolver 和十回合概率引擎，同乘区仍加算。

英雄远征技能统一采用 5 级数据。单个车头可同时包含 supported、pending 和 notApplicable 技能：supported 参与计算，pending 跳过并报告原因，notApplicable 只保留说明。

## 当前车头

- 盾：赫克托、尼莫。尼莫的三个5级远征技能均正式生效：战前宣言常驻全军穿透+25%，剑术指导常驻全军攻击+25%，精湛剑术在 round5/6/9/10 提供全军基础增伤+30%。尼莫可手动选择并进入自动优化，其专武 `attack` Buff 正常生效。三断斩、剑气、孤傲只存在于 explorationSkills，不进入打熊 SkillResolver。
- 矛：米娅。
- 射：阿隆索(2代)、格温(5代)、布拉德利(7代)、亨德里克(8代)、布兰琪(10代)、鲁弗斯(11代)。

鲁弗斯统一显示名为“鲁弗斯”，稳定 ID 暂保留 hero.head.lufusi 以兼容已有存档。米娅的槽位为 lancer。专武类型由 exclusiveWeaponBuffType 数据驱动，不按英雄名判断。

普通 vulnerable 默认下一回合生效。格温第6次普通攻击附加100% extraDamage，不产生 extraAttack 或新的 AttackEvent；第6次攻击后的下下次攻击（第8次普通攻击）所在回合使用15% vulnerable replace，覆盖当回合其他易伤；下一回合恢复正常状态演化。格温没有 pending 远征技能。
