import type {
  HeadHeroDefinition,
  HeadHeroId,
  HeroSkillDefinition,
  SupportedHeroSkillDefinition,
} from "../../domain/hero";
import type { Skill, SkillEffectData } from "../../domain/skill";
import type { TroopType } from "../../domain/troop";

const SOURCE = "用户最新统一规则（2026-09-09）";

export const headHeroes = {
  "hero.head.heketuo": head({
    id: "hero.head.heketuo", name: "赫克托", troopType: "shield", generation: null,
    weapon: "attack", exclusiveGroupIds: ["head-exclusive.shield-primary"],
    skills: [
      supported("head-skill.heketuo.thunder-strike", "雷霆出击", {
        id: "skill.head.heketuo.thunder-strike", name: "雷霆出击（5级）", trigger: { type: "always" },
        effects: [
          { type: "baseDamageIncrease", value: 2, valueByRound: decay(2), targetTroop: "shield" },
          { type: "baseDamageIncrease", value: 1, valueByRound: decay(1), targetTroop: "marksman" },
        ],
      }, "5级：第1回合盾兵伤害+200%、射手伤害+100%，之后每回合为上一回合的85%，至第10回合。"),
      supported("head-skill.heketuo.gale-strike", "疾风猛击", {
        id: "skill.head.heketuo.gale-strike", name: "疾风猛击（5级）",
        trigger: probability(.25), effects: [extraDamage(1, "all")],
      }, "5级：每回合判定一次，25%概率造成200%总伤害；extraDamage为+100%D，不产生extraAttack。"),
    ],
    notApplicable: [{ name: "生存本能", rawDescription: "降低我方受到的伤害，属于生存效果。" }],
  }),
  "hero.head.fulinte": head({
    id: "hero.head.fulinte", name: "弗林特", troopType: "shield", generation: 2,
    weapon: "none", exclusiveGroupIds: ["head-exclusive.shield-primary"],
    skills: [
      supported("head-skill.fulinte.wildfire", "野火燎原", {
        id: "skill.head.fulinte.wildfire", name: "野火燎原（5级）", trigger: { type: "always" },
        effects: [{ type: "shieldDamage", value: 1, targetTroop: "shield" }],
      }, "5级：使我方盾兵造成伤害提升100%；只作用于盾兵。"),
      supported("head-skill.fulinte.burning-will", "燃烧意志", {
        id: "skill.head.fulinte.burning-will", name: "燃烧意志（5级）", trigger: { type: "always" },
        effects: [{ type: "attack", value: .25, targetTroop: "all" }],
      }, "5级：我军全体部队攻击力提升25%，常驻生效。"),
      supported("head-skill.fulinte.endless-fire", "无尽烈火", {
        id: "skill.head.fulinte.endless-fire", name: "无尽烈火（5级）", trigger: { type: "always" },
        effects: [{ type: "penetration", value: .25, targetTroop: "all" }],
      }, "5级：我军全体部队穿透力提升25%，常驻生效。"),
    ],
  }),
  "hero.head.nimo": head({
    id: "hero.head.nimo", name: "尼莫", troopType: "shield", generation: null,
    weapon: "attack", exclusiveGroupIds: ["head-exclusive.shield-primary"], skills: [
      supported("head-skill.nimo.prebattle-declaration", "战前宣言", {
        id: "skill.head.nimo.prebattle-declaration", name: "战前宣言（5级）", trigger: { type: "always" },
        effects: [{ type: "penetration", value: .25, targetTroop: "all" }],
      }, "5级：全体部队穿透+25%，常驻生效。"),
      supported("head-skill.nimo.swordsmanship-guidance", "剑术指导", {
        id: "skill.head.nimo.swordsmanship-guidance", name: "剑术指导（5级）", trigger: { type: "always" },
        effects: [{ type: "attack", value: .25, targetTroop: "all" }],
      }, "5级：全体部队攻击+25%，常驻生效。"),
      supported("head-skill.nimo.exquisite-swordsmanship", "精湛剑术", {
        id: "skill.head.nimo.exquisite-swordsmanship", name: "精湛剑术（5级）", trigger: { type: "always" },
        effects: [{ type: "baseDamageIncrease", value: .30, targetTroop: "all", activeRounds: [5, 6, 9, 10] }],
      }, "5级：每4回合触发一次、持续2回合，首次round5；round5、6、9、10全体部队造成伤害+30%。"),
    ],
    exploration: ["三断斩", "剑气", "孤傲"].map((name) => ({ name, rawDescription: "已确认属于探险技能，不是远征技能。" })),
  }),
  "hero.head.miya": head({
    id: "hero.head.miya", name: "米娅", troopType: "lancer", generation: null, weapon: "attack",
    skills: [
      supported("head-skill.miya.doom-entanglement", "厄运缠身", miaVulnerableSkill("skill.head.miya.doom-entanglement"), "5级：三兵种每回合各一次普通攻击，每次50%独立触发；同回合不叠加，下一回合vulnerable+50%。"),
      supported("head-skill.miya.lucky-blessing", "幸运加护", {
        id: "skill.head.miya.lucky-blessing", name: "幸运加护（5级）", trigger: probability(.5),
        effects: [{ type: "baseDamageIncrease", value: .5, targetTroop: "all" }],
      }, "5级：每回合独立判定一次，50%概率使当前回合基础增伤+50%；仅当回合生效。"),
    ],
    notApplicable: [{ name: "秘火解读", rawDescription: "40%概率降低敌方伤害，只影响敌方输出。" }],
  }),
  "hero.head.alongsuo": marksmanHead("hero.head.alongsuo", "阿隆索", 2, "penetration", [
    supported("head-skill.alongsuo.penetration", "穿透提升", {
      id: "skill.head.alongsuo.penetration", name: "穿透提升（5级）", trigger: probability(.4),
      effects: [{ type: "penetration", value: .5, targetTroop: "all" }],
    }, "5级：每回合40%概率使全军穿透+50%，当回合生效，持续1回合。"),
  ], [{ name: "降低敌军伤害", rawDescription: "只影响敌方输出。" }]),
  "hero.head.gewen": marksmanHead("hero.head.gewen", "格温", 5, "penetration", [
    supported("head-skill.gewen.vulnerable", "易伤", {
      id: "skill.head.gewen.vulnerable", name: "易伤（5级）",
      trigger: { type: "probability", probability: 1, triggerPhase: "roundStart", frequency: "oncePerBattle", durationRounds: 9 },
      lifecycle: { durationRounds: 9, activationTiming: "nextRound", refreshMode: "replace" },
      effects: [{ type: "vulnerable", value: .25, targetTroop: "all" }],
    }, "5级：round1施加，round2开始vulnerable+25%。"),
    supported("head-skill.gewen.special-damage", "第6次攻击特殊伤害", {
      id: "skill.head.gewen.special-damage", name: "第6次攻击特殊伤害（5级）", trigger: { type: "always" },
      effects: [{ ...extraDamage(1, "all"), activeRounds: [6] }],
    }, "每个兵种第6次普通攻击造成100% extraDamage；以该次普通攻击的当前基础伤害为basis，不产生extraAttack或新的AttackEvent。"),
    supported("head-skill.gewen.override", "第8次攻击易伤覆盖", {
      id: "skill.head.gewen.override", name: "第8次攻击易伤覆盖（5级）",
      trigger: { type: "probability", probability: 1, triggerPhase: "roundStart", frequency: "explicitSchedule", triggerRounds: [8] },
      effects: [{ type: "vulnerable", value: .15, targetTroop: "all", zoneAggregation: "replace" }],
    }, "每个兵种第6次普通攻击后的下下次攻击（第8次普通攻击）所在回合，将当回合全部vulnerable替换为15%；不与其他vulnerable相加，下一回合恢复正常。"),
  ]),
  "hero.head.buladeli": marksmanHead("hero.head.buladeli", "布拉德利", 7, "none", [
    supported("head-skill.buladeli.troop-counter", "兵种克制增伤", {
      id: "skill.head.buladeli.troop-counter", name: "兵种克制增伤（5级）", trigger: { type: "always" },
      effects: [{ type: "troopVsTroopDamage", value: .25, valueByEnemyTroop: { shield: .25, lancer: .30 }, targetTroop: "all" }],
    }, "5级：对矛伤害+30%，对盾伤害+25%；巨熊为盾。"),
    supported("head-skill.buladeli.cycle", "三技能循环", {
      id: "skill.head.buladeli.cycle", name: "三技能循环（5级）", trigger: { type: "always" },
      effects: [{ type: "baseDamageIncrease", value: .30, targetTroop: "all", activeRounds: [5, 6, 9, 10] }],
    }, "5级：round5、round6、round9、round10的基础增伤+30%。"),
  ]),
  "hero.head.hengdelike": marksmanHead("hero.head.hengdelike", "亨德里克", 8, "attack", [
    supported("head-skill.hengdelike.defense-reduction", "减防", {
      id: "skill.head.hengdelike.defense-reduction", name: "减防（5级）", trigger: { type: "always" },
      effects: [{ type: "defenseReduction", value: .25, targetTroop: "all" }],
    }, "5级：敌方防御降低25%，等效倍率1.25。"),
    supported("head-skill.hengdelike.round3-extra", "第三技能", {
      id: "skill.head.hengdelike.round3-extra", name: "第三技能（5级）", trigger: { type: "always" },
      effects: [{ ...extraDamage(.40, "all"), activeRounds: [3] }],
    }, "5级：round3造成40% extraDamage，以当前普通攻击伤害为basis，不产生额外攻击事件。"),
  ], [{ name: "第二技能", rawDescription: "只影响敌方输出。" }]),
  "hero.head.bulanqi": marksmanHead("hero.head.bulanqi", "布兰琪", 10, "penetration", [
    supported("head-skill.bulanqi.penetration", "全军穿透", {
      id: "skill.head.bulanqi.penetration", name: "全军穿透（5级）", trigger: { type: "always" },
      effects: [{ type: "penetration", value: .25, targetTroop: "all" }],
    }, "5级：全军穿透+25%。"),
    supported("head-skill.bulanqi.extra-damage", "额外伤害", {
      id: "skill.head.bulanqi.extra-damage", name: "额外伤害（5级）", trigger: { type: "always" },
      effects: [extraDamage(.75, "all")],
    }, "5级：75% extraDamage，不产生extraAttack。"),
  ], [{ name: "第三技能", rawDescription: "只针对矛兵/射手目标；巨熊为盾，不适用。" }]),
  "hero.head.lufusi": marksmanHead("hero.head.lufusi", "鲁弗斯", 11, "attack", [
    supported("head-skill.lufusi.fire-warband", "火焰战团", {
      id: "skill.head.lufusi.fire-warband", name: "火焰战团（5级）", trigger: { type: "always" },
      effects: [{ type: "attack", value: .25, targetTroop: "all" }],
    }, "5级：全军攻击+25%。"),
    supported("head-skill.lufusi.armor-breaking-extra", "碎甲一击·额外伤害", {
      id: "skill.head.lufusi.armor-breaking-extra", name: "碎甲一击·额外伤害（5级）", trigger: { type: "always" },
      effects: [extraDamage(.60, "all")],
    }, "5级：每次普通攻击造成60% extraDamage，不产生extraAttack。"),
    supported("head-skill.lufusi.armor-breaking-vulnerable", "碎甲一击·易伤", {
      id: "skill.head.lufusi.armor-breaking-vulnerable", name: "碎甲一击·易伤（5级）",
      trigger: { type: "probability", probability: 1, triggerPhase: "roundStart", frequency: "oncePerRound", durationRounds: 1 },
      lifecycle: { durationRounds: 1, activationTiming: "nextRound", refreshMode: "refresh" },
      effects: [{ type: "vulnerable", value: .25, targetTroop: "all" }],
    }, "5级：每回合施加vulnerable+25%，下一回合生效，持续1回合；round10施加的效果不进入本场。"),
  ], [{ name: "暴烈震慑", rawDescription: "降低敌方穿透，只影响敌方输出。" }]),
} as const satisfies Record<HeadHeroId, HeadHeroDefinition>;

function probability(probabilityValue:number){return {type:"probability" as const,probability:probabilityValue,triggerPhase:"beforeAttack" as const,frequency:"oncePerRound" as const}}
function extraDamage(value:number,targetTroop:"all"|TroopType){return {type:"extraDamage" as const,value,targetTroop,basis:"postMultiplierDamage" as const,damageCategory:"extra" as const,applicableMultiplierZones:[] as const}}
function decay(first:number){return Array.from({length:10},(_,index)=>first*.85**index)}
function miaVulnerableSkill(id:string):Skill{return{id,name:"厄运缠身（5级）",status:"supported",trigger:{type:"probability",probability:.5,triggerPhase:"onAttack",frequency:"oncePerRound",attemptsPerRound:3,durationRounds:1,instanceAggregation:{groupId:"bear.miya.next-round-vulnerable-50",stackingMode:"probabilityOnly",magnitudeStacking:false}},lifecycle:{durationRounds:1,activationTiming:"nextRound",refreshMode:"refresh"},effects:[{type:"vulnerable",value:.5,targetTroop:"all"}]}}

interface HeadInput { id:HeadHeroId; name:string; troopType:TroopType; generation:number|null; weapon:"attack"|"penetration"|"none"; skills:readonly HeroSkillDefinition[]; optimizableForBear?:boolean; exclusiveGroupIds?:readonly string[]; notApplicable?:readonly {name:string;rawDescription:string}[]; exploration?:readonly {name:string;rawDescription:string}[] }
function head(input:HeadInput):HeadHeroDefinition{return{id:input.id,name:input.name,tier:null,generation:input.generation,role:"head",troopType:input.troopType,bodySkill:null,headSkills:input.skills,notes:[],source:SOURCE,exclusiveWeaponBuffType:input.weapon,...(input.optimizableForBear===undefined?{}:{optimizableForBear:input.optimizableForBear}),...(input.exclusiveGroupIds?{exclusiveGroupIds:input.exclusiveGroupIds}:{}),...(input.notApplicable?{notApplicableToBearOutgoingDamage:input.notApplicable}:{}),...(input.exploration?{explorationSkills:input.exploration}:{})}}
function marksmanHead(id:HeadHeroId,name:string,generation:number,weapon:"attack"|"penetration"|"none",skills:readonly HeroSkillDefinition[],notApplicable?:readonly {name:string;rawDescription:string}[]){return head({id,name,generation,troopType:"marksman",weapon,skills,...(notApplicable?{notApplicable}:{})})}
function supported(id:string,name:string,input:Skill,rawDescription:string):SupportedHeroSkillDefinition{const skill:Skill={...input,level:5,status:"supported",rawDescription,source:SOURCE,effects:input.effects.map(effect=>({...effect,status:"supported" as const,rawDescription}))};return{id,name,status:"supported",supported:true,skill,effectData:skill.effects.map((effect,index)=>toEffectData(skill.id,effect,index)),rawDescription,notes:[rawDescription],source:SOURCE}}
function toEffectData(skillId:string,effect:Skill["effects"][number],index:number):SkillEffectData{return{id:`${skillId}.effect.${index}`,status:"supported",type:effect.type,value:effect.value,rawDescription:effect.rawDescription??"用户最新统一规则",...(effect.targetTroop===undefined?{}:{targetTroop:effect.targetTroop}),...(effect.basis===undefined?{}:{basis:effect.basis}),...(effect.damageCategory===undefined?{}:{damageCategory:effect.damageCategory}),...(effect.applicableMultiplierZones===undefined?{}:{applicableMultiplierZones:effect.applicableMultiplierZones}),...(effect.lifecycle===undefined?{}:{lifecycle:effect.lifecycle}),...(effect.zoneAggregation===undefined?{}:{zoneAggregation:effect.zoneAggregation}),...(effect.valueByRound===undefined?{}:{valueByRound:effect.valueByRound}),...(effect.valueByEnemyTroop===undefined?{}:{valueByEnemyTroop:effect.valueByEnemyTroop})}}
