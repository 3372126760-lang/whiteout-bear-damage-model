# 技能数据目录

真实技能以结构化 catalog 保存；核心引擎不按英雄姓名分支。英雄远征技能统一使用 5 级/满级数据。只有 supported 技能进入正式十回合计算和优化评分；pending 仅展示原因；notApplicable 不影响我方对熊输出。

## 技能大乘区

当前正式熊技能层包含：skill.attack、skill.penetration、skill.defenseReduction、skill.baseDamageIncrease、skill.normalAttackDamageIncrease、skill.skillDamageIncrease、skill.troopVsTroopDamage、skill.vulnerable、skill.extraDamage。兵种限定通过 `targetTroop` 表达；旧的 damageIncrease/normalAttackDamage/skillDamage 名称仅作兼容别名。

同一小乘区加算，不同小乘区乘算。troopVsTroopDamage 与 baseDamageIncrease 独立。正式伤害为 `B × common × (normalAttackMultiplier + extraDamageRate × skillDamageMultiplier)`；extraDamage rate 同区相加。

这里的 B 已含战报 `(1+A)(1+P)`。Buff 与 Skill 保持不同 major zone：例如 `buff.attack=1.24` 与 `skill.attack=1.50` 的结果为 `1.24×1.50`，不把来源加成合并为一个加法区。

## 当前真实数据摘要

- 车身：25 supported、4 pending。新增玲奈的常驻普攻伤害+30%；韦恩保留正式数据但不属于v0.1九类普通/自动车身选项；丽娅拉、艾丝蒂拉、埃莉诺、弗洛拉为 DATA_SOURCE_UNCERTAIN。
- 车头：赫克托、米娅、阿隆索、格温、布拉德利、亨德里克、布兰琪、鲁弗斯已结构化。格温第6次攻击100% extraDamage及第8次攻击15% vulnerable replace均已 supported。
- 尼莫三个远征技能战前宣言、剑术指导、精湛剑术均为 supported；三断斩、剑气、孤傲明确是探索技能，不进入打熊远征技能。
- 兵种/火晶目录：远程打击、连射、燃晶火药、火焰冲击、炽火凝星均为 supported；连射的原始目录保留 extraAttack 语义，正式熊模型映射为10%期望 extraDamage。

## 状态统计

当前完整 catalog 共 55 个技能记录：51 supported、4 pending、0 unsupported。结构化效果为 52 supported、0 pending、0 unsupported。pending 分类为 RULE_UNKNOWN 0、ENGINE_GAP 0、DATA_SOURCE_UNCERTAIN 4。明细见 pending-skill-audit.md。

## 数据维护

新增普通确定性技能只需增加数据配置。目录校验检查 ID 唯一、状态边界、概率范围、目标、额外伤害 basis 和 supported 字段完整性。旧 extraAttack 结构仍保留用于未来扩展，但当前正式熊模型不执行事件链。
