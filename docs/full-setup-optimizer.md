# 完整阵容优化器

optimizeFullBattleSetup() 在精确模式下组合比例、可重复车身、三个车头槽与显式配置，所有候选统一调用十回合期望伤害入口。默认评分为 expectedTenRoundTotalDamage，不复制基础公式。

专家、城镇、宠物、专武、兵种/火晶等级和最终出征容量作为固定输入。比例分配以 finalMarchCapacity 为总量并使用 largest remainder。RULE_UNKNOWN、DATA_SOURCE_UNCERTAIN 和 notApplicable 不产生评分收益。

当前 supported 车身为24名，恰选四名、允许重复且不计排列时组合数为 C(27,4)=17,550；1%比例网格为5,151，完整二者笛卡尔积为90,400,050。实现保持 exact search，不自动切换近似；大空间会返回性能警告，调用方可明确限制候选池或步长。

兵种与火晶技能正常由等级自动解锁。旧的显式 fireCrystal configuration 仍用于兼容及合成测试，与自动来源相同的技能会按 sourceRecordId 去重。
