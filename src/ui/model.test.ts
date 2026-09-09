import { describe, expect, it } from "vitest";
import {
  applyOptimizationRow,
  bearSlayerLevelOptions,
  bodySkillOptions,
  calculateDisplayedTotalTroops,
  calculateInputTroopTotal,
  calculateUiDamage,
  createDefaultFormState,
  displayPercentToDecimal,
  exclusiveWeaponLevelOptions,
  formatBodySkillOptionLabel,
  formatHeadHeroOptionLabel,
  formatRatioPercent,
  getSelectedHeroSkillDetails,
  headHeroOptions,
  hunterHeartLevelOptions,
  knownTroopLevelOptions,
  petBuffLevelOptions,
  petCapacityLevelOptions,
  topKOptions,
  troopSkillLevelOptions,
  visiblePendingSkillDetails,
  type UiOptimizationRow,
} from "./model";

describe("Stage 25 UI adapter",()=>{
  it("计算基础兵种数据",()=>expect(calculateUiDamage(createDefaultFormState()).expectedTotalDamage).toBeGreaterThan(0));
  it("把444.35%解释为4.4435",()=>expect(displayPercentToDecimal("444.35")).toBeCloseTo(4.4435,12));
  it("默认验证预设真正初始化为最新账号数据",()=>{
    const form=createDefaultFormState();
    expect(calculateDisplayedTotalTroops(form)).toBe(182370);
    expect(form.troops).toEqual({
      shield:{count:"1824",troopLevelId:"T11-FC10",attackPercent:"1119.9",defensePercent:"0",penetrationPercent:"521.7",healthPercent:"0"},
      lancer:{count:"1823",troopLevelId:"T10-FC7",attackPercent:"867.0",defensePercent:"0",penetrationPercent:"543.2",healthPercent:"0"},
      marksman:{count:"178723",troopLevelId:"T12-FC10",attackPercent:"1765.0",defensePercent:"0",penetrationPercent:"1551.9",healthPercent:"0"},
    });
    expect(form.preparation).toMatchObject({
      hunterHeartLevel:"10",bearSlayerLevel:"10",
      pet:{attackLevel:"9",penetrationLevel:"9",defenseReductionLevel:"10",capacityLevel:"10"},
      weaponLevels:{shield:"0",lancer:"5",marksman:"2"},marksmanBlazingStarLevel:"1",lancerT12SkillLevel:"0",
    });
    expect(form.preparation).not.toHaveProperty("baseMarchCapacity");
    expect(calculateInputTroopTotal(form)).toBe(182370);
    expect(form.headHeroIds).toEqual({shield:"hero.head.heketuo",lancer:"hero.head.miya",marksman:"hero.head.hengdelike"});
    expect(form.bodyHeroIds).toEqual([
      "body-skill.probability-penetration-50",
      "body-skill.attack-25",
      "body-skill.defense-reduction-25",
      "body-skill.defense-reduction-25",
    ]);
    expect(form.ratioStepPercent).toBe("0.01");
  });
  it("默认预设使用最终227370兵力并得到约518万射手D0",()=>{
    const result=calculateUiDamage(createDefaultFormState());
    expect(result.totalTroopCount).toBe(227370);
    expect(result.result.preparation?.troopCounts).toEqual({shield:2274,lancer:2273,marksman:222823});
    expect(result.baseDamageByTroop.marksman).toBeCloseTo(5184142.603580574,8);
    expect(result.expectedTotalDamage).toBeCloseTo(1285548065.3756616,4);
  });
  it("supported车身进入计算",()=>expect(calculateUiDamage(createDefaultFormState()).appliedSkills.length).toBeGreaterThan(0));
  it("拒绝负数兵量",()=>{const f=createDefaultFormState();const bad={...f,troops:{...f.troops,shield:{...f.troops.shield,count:"-1"}}};expect(()=>calculateUiDamage(bad)).toThrow(/非负整数/)});
  it("拒绝空百分比",()=>{const f=createDefaultFormState();const bad={...f,troops:{...f.troops,shield:{...f.troops.shield,attackPercent:""}}};expect(()=>calculateUiDamage(bad)).toThrow(/不能为空/)});
  it("防御和生命可保存但不改变当前对熊基础输出",()=>{
    const base=createDefaultFormState();
    const reserved={...base,troops:{...base.troops,shield:{...base.troops.shield,defensePercent:"999",healthPercent:"999"}}};
    expect(calculateUiDamage(reserved).expectedTotalDamage).toBe(calculateUiDamage(base).expectedTotalDamage);
  });
  it("三兵种任一原始兵数变化都会自动更新基础容量",()=>{
    const form=createDefaultFormState();
    for(const troopType of ["shield","lancer","marksman"] as const){
      const changed={...form,troops:{...form.troops,[troopType]:{...form.troops[troopType],count:String(Number(form.troops[troopType].count)+1)}}};
      expect(calculateInputTroopTotal(changed)).toBe(182371);
    }
  });
  it("优化方案只按比例写回原始总兵数，避免把扩容结果再次作为基础容量",()=>{
    const form=createDefaultFormState();
    const row={rank:1,expectedTenRoundDamage:1,improvementRatio:0,troopCounts:{shield:2274,lancer:4547,marksman:220549},ratios:{shield:1,lancer:2,marksman:97},bodyHeroIds:[],bodyHeroNames:[],headFormation:{},headHeroNames:[],fireCrystalSkillIds:[],fireCrystalNames:[]} satisfies UiOptimizationRow;
    const applied=applyOptimizationRow(form,row);
    expect(calculateInputTroopTotal(applied)).toBe(182370);
    expect(applied.troops).toMatchObject({shield:{count:"1824"},lancer:{count:"3647"},marksman:{count:"176899"}});
    expect(calculateUiDamage(applied).totalTroopCount).toBe(227370);
  });
  it("兵种等级UI严格包含最终口径且保留T10-FC6至FC10",()=>{
    const ids=knownTroopLevelOptions.map(level=>level.id);
    expect(ids).toEqual([
      "T1","T2","T3","T4","T5","T6","T7","T8","T9","T10",
      "T10-FC1","T10-FC2","T10-FC3","T10-FC4","T10-FC5","T10-FC6","T10-FC7","T10-FC8","T10-FC9","T10-FC10",
      "T11-FC5","T11-FC6","T11-FC7","T11-FC8","T11-FC9","T11-FC10","T12-FC10",
    ]);
    expect(knownTroopLevelOptions.every(level=>level.constant!==null)).toBe(true);
  });
  it("普通车身UI只展示九类技能效果，不按英雄展开",()=>{
    expect(bodySkillOptions.map(option=>option.label)).toEqual([
      "全军攻击 +25%","全军防御 +25%","敌军防御 -25%","全军伤害 +20%","易伤 +25%",
      "40%概率全军穿透 +50%","50%概率易伤 +50%","20%概率增伤 +40%（持续3回合）","普攻伤害 +30%",
    ]);
  });
  it("尼莫出现在盾兵车头选项且三个远征技能可计算，探险技能仍隔离",()=>{
    const nimo=headHeroOptions.find((hero)=>hero.id==="hero.head.nimo")!;
    expect(nimo.troopType).toBe("shield");
    expect(nimo.headSkills.map((definition)=>definition.name)).toEqual(["战前宣言","剑术指导","精湛剑术"]);
    expect(formatHeadHeroOptionLabel(nimo)).toBe("尼莫 · 全军穿透 +25%");
    const form=createDefaultFormState();
    const selected={...form,headHeroIds:{...form.headHeroIds,shield:nimo.id}};
    const details=getSelectedHeroSkillDetails(selected);
    expect(details.some((detail)=>detail.sourceSummary?.includes("尼莫")&&detail.skillName.includes("穿透 +25%"))).toBe(true);
    expect(details.some((detail)=>detail.sourceSummary?.includes("尼莫")&&detail.skillName.includes("攻击 +25%"))).toBe(true);
    expect(details.some((detail)=>detail.sourceSummary?.includes("尼莫")&&detail.skillName.includes("伤害 +30%")&&detail.summary.includes("5、6、9、10"))).toBe(true);
    expect(nimo.explorationSkills?.map((skill)=>skill.name)).toEqual(["三断斩","剑气","孤傲"]);
  });
  it("尼莫专武攻击buff仍由英雄数据生效",()=>{
    const form=createDefaultFormState();
    const selected={...form,headHeroIds:{...form.headHeroIds,shield:"hero.head.nimo"}};
    const withWeapon={...selected,preparation:{...selected.preparation,weaponLevels:{...selected.preparation.weaponLevels,shield:"5"}}};
    expect(calculateUiDamage(withWeapon).expectedTotalDamage).toBeGreaterThan(calculateUiDamage(selected).expectedTotalDamage);
  });
  it("容量配置进入UI计算并保持兵种和等于finalMarchCapacity",()=>{
    const f=createDefaultFormState();
    const configured={...f,preparation:{...f.preparation,bearSlayerLevel:"10",town:{...f.preparation.town,marchCapacity:"small" as const}}};
    const result=calculateUiDamage(configured);
    expect(result.totalTroopCount).toBe(250107);
    expect(Object.values(result.result.preparation!.troopCounts).reduce((sum,count)=>sum+count,0)).toBe(250107);
  });
  it("所有有限整数等级选项完整且无越界值",()=>{
    const values=(options:readonly {value:string}[])=>options.map((option)=>Number(option.value));
    expect(values(hunterHeartLevelOptions)).toEqual(Array.from({length:12},(_,index)=>index));
    expect(values(bearSlayerLevelOptions)).toEqual(Array.from({length:11},(_,index)=>index));
    expect(values(petBuffLevelOptions)).toEqual(Array.from({length:11},(_,index)=>index));
    expect(values(petCapacityLevelOptions)).toEqual(Array.from({length:11},(_,index)=>index));
    expect(values(exclusiveWeaponLevelOptions)).toEqual([0,1,2,3,4,5]);
    expect(values(troopSkillLevelOptions)).toEqual(Array.from({length:25},(_,index)=>index));
    expect(values(topKOptions)).toEqual(Array.from({length:100},(_,index)=>index+1));
    expect(exclusiveWeaponLevelOptions.map((option)=>option.label)).toEqual(["0级（0%）","1级（5%）","2级（7.5%）","3级（10%）","4级（12.5%）","5级（15%）"]);
  });
  it("英雄选项直接显示数据层数值且不暴露内部状态或确认计数",()=>{
    const attack=bodySkillOptions.find((option)=>option.id==="body-skill.attack-25")!;
    const hendrick=bodySkillOptions.find((option)=>option.id==="body-skill.defense-reduction-25")!;
    expect(formatBodySkillOptionLabel(attack)).toBe("全军攻击 +25%");
    expect(formatBodySkillOptionLabel(hendrick)).toBe("敌军防御 -25%");
    for(const item of [...bodySkillOptions,...headHeroOptions]){
      const label="representativeHeroId" in item?formatBodySkillOptionLabel(item):formatHeadHeroOptionLabel(item);
      expect(label).not.toMatch(/supported|pending|已确认\/|待确认$/);
    }
  });
  it("格温规则补全后用户可见待确认清单归零",()=>{
    expect(visiblePendingSkillDetails).toHaveLength(0);
    const gwen=headHeroOptions.find((hero)=>hero.id==="hero.head.gewen")!;
    expect(formatHeadHeroOptionLabel(gwen)).not.toContain("有待确认技能");
  });
  it("重复车身技能按语义合并而不是按heroId逐条显示",()=>{
    const form=createDefaultFormState();
    const details=getSelectedHeroSkillDetails({...form,headHeroIds:{shield:"",lancer:"",marksman:""}});
    const defense=details.filter((detail)=>detail.status==="applied"&&detail.skillName==="敌军防御 -25%");
    expect(defense).toHaveLength(1);
    expect(defense[0]).toMatchObject({sourceSummary:"亨德里克",totalSummary:"减防 +50%"});
  });
  it("比例统一显示到0.01%",()=>{
    expect(formatRatioPercent(7)).toBe("7.00%");
    expect(formatRatioPercent(33.333333)).toBe("33.33%");
  });
});
