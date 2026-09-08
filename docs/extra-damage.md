# Extra Damage

extraDamage 是独立技能伤害段，不等于 baseDamageIncrease。正式熊模型把所有 supported extraDamage 的 value 视为附加伤害 rate，并按下式结算：

```text
extraDamage = B × commonMultipliers × sum(extraDamageRate) × skillDamageMultiplier
```

同回合不同来源直接相加，不彼此相乘，也不受 normalAttackDamageIncrease 放大。底层仍保留 basis、damageCategory 与 applicableMultiplierZones 字段，供历史组件与未来扩展追踪来源；正式熊分支使用统一基准，不再要求为每个真实技能猜一套 basis。

当前真实 supported：韦恩 round5/9 +100%；赫克托疾风猛击触发时 +100%D；格温第6次普通攻击 +100%D；亨德里克 round3 +40%；布兰琪 +75%；鲁弗斯碎甲一击 +60%；燃晶火药 +50%并按火焰冲击等级联动 +25%/+37.5%；炎晶战矛触发时 +100%D；连射在正式模型映射为期望 +10%。格温该效果不是 extraAttack，不新增 AttackEvent。
