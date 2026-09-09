import { useMemo, useState } from "react";
import { APP_TITLE } from "../app/version";
import { CHANGELOG_ENTRIES } from "../app/changelog";
import {
  activeTroopFormValues, applyOptimizationRow, bodySkillOptions, calculateDisplayedTotalTroops,
  calculateUiDamage, createDefaultFormState, createOptimizationRequest,
  bearSlayerLevelOptions, fireCrystalSkillOptions,
  formatBodySkillOptionLabel, formatHeadHeroOptionLabel, formatRatioPercent,
  getSelectedHeroSkillDetails, headHeroOptions, hunterHeartLevelOptions,
  knownTroopLevelOptions, petBuffLevelOptions,
  petCapacityLevelOptions, runOptimizationCore, topKOptions,
  troopSkillLevelOptions, toUiOptimizationResult, visiblePendingSkillDetails,
  TROOP_LABELS, TROOP_TYPES, type CalculatorFormState, type CalculatorInputMode,
  type UiSelectOption,
  type UiCalculationResult, type UiOptimizationKind, type UiOptimizationResult,
} from "./model";

const nf = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const pf = new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 2 });
const mf = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const errorText = (error: unknown) => error instanceof Error ? error.message : "计算发生未知异常。";
const DAMAGE_TOWN_KEYS = ["attack", "penetration", "defenseReduction"] as const;
const DAMAGE_PET_KEYS = ["attackLevel", "penetrationLevel", "defenseReductionLevel"] as const;
const townLabels = { attack: "攻击", penetration: "穿透", defenseReduction: "减防", marchCapacity: "出征" } as const;
const petLabels = { attackLevel: "攻击等级", penetrationLevel: "穿透等级", defenseReductionLevel: "减防等级", capacityLevel: "出征等级" } as const;

export function CalculatorApp() {
  const [form, setForm] = useState<CalculatorFormState>(createDefaultFormState);
  const [result, setResult] = useState<UiCalculationResult | null>(null);
  const [optimization, setOptimization] = useState<UiOptimizationResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(() => calculateDisplayedTotalTroops(form), [form]);
  const activeTroops = activeTroopFormValues(form);
  const selectedHeroSkillDetails = useMemo(() => getSelectedHeroSkillDetails(form), [form]);
  const updateTroop = (type: typeof TROOP_TYPES[number], key: "count" | "troopLevelId" | "attackPercent" | "penetrationPercent", value: string) =>
    setForm((current) => current.inputMode === "battleReport"
      ? ({ ...current, battleReportInputState: { troops: { ...current.battleReportInputState.troops, [type]: { ...current.battleReportInputState.troops[type], [key]: value } } } })
      : ({ ...current, rallyInputState: { ...current.rallyInputState, troops: { ...current.rallyInputState.troops, [type]: { ...current.rallyInputState.troops[type], [key]: value } } } }));
  const switchInputMode = (inputMode: CalculatorInputMode) => {
    setForm((current) => ({ ...current, inputMode }));
    setResult(null);
    setOptimization(null);
    setError(null);
  };
  const updatePreparation = (key: "hunterHeartLevel" | "bearSlayerLevel" | "marksmanBlazingStarLevel" | "lancerT12SkillLevel", value: string) =>
    setForm((current) => ({ ...current, preparation: { ...current.preparation, [key]: value } }));
  const calculate = () => {
    setError(null); setBusy("damage");
    try { setResult(calculateUiDamage(form, { includeDamageInterval: true })); } catch (caught) { setError(errorText(caught)); } finally { setBusy(null); }
  };
  const optimize = async (kind: UiOptimizationKind) => {
    setError(null); setBusy(kind);
    try {
      setOptimization(toUiOptimizationResult(await runOptimizationInWorker(createOptimizationRequest(form, kind)), form));
    } catch (caught) { setError(errorText(caught)); } finally { setBusy(null); }
  };

  return <div className="app-shell">
    <header><p className="eyebrow">BEAR LAB / UNIFIED RULESET</p><h1>{APP_TITLE}</h1><div className="header-meta-row"><p>10 回合精确期望伤害 · 数据驱动技能 · 可解释优化</p><p className="author-note">缥缈制作，欢迎移民583</p></div></header>
    {error && <div role="alert" className="alert error">{error}</div>}
    <main>
      <section className="panel inputs">
        <div className="section-title"><div><h2>战报与阵容</h2><p className="section-help">{form.inputMode === "battleReport" ? "打熊阵容无宠无药打野怪数据；兵数视为基础阵容，网站继续计算容量增益。" : "打熊上车时的集结属性以及出征；兵数视为最终实际出征，不重复计算容量增益。"}</p></div><span className="total">{form.inputMode === "battleReport" ? "原始阵容兵数" : "最终实际出征兵数"} {nf.format(total)}</span></div>
        <div className="mode-switch" role="group" aria-label="输入方式"><button type="button" className={form.inputMode === "battleReport" ? "active" : ""} aria-pressed={form.inputMode === "battleReport"} onClick={() => switchInputMode("battleReport")}>战报模式</button><button type="button" className={form.inputMode === "rally" ? "active" : ""} aria-pressed={form.inputMode === "rally"} onClick={() => switchInputMode("rally")}>集结模式</button></div>
        {form.inputMode === "rally" && <><h3>部队属性</h3><div className="two-col"><label>部队攻击 %<input aria-label="部队攻击" type="number" value={form.rallyInputState.generalAttackPercent} onChange={(event) => setForm((current) => ({ ...current, rallyInputState: { ...current.rallyInputState, generalAttackPercent: event.target.value } }))} /></label><label>部队穿透 %<input aria-label="部队穿透" type="number" value={form.rallyInputState.generalPenetrationPercent} onChange={(event) => setForm((current) => ({ ...current, rallyInputState: { ...current.rallyInputState, generalPenetrationPercent: event.target.value } }))} /></label></div></>}
        <div className="troop-grid">{TROOP_TYPES.map((type) => <fieldset key={type}><legend>{TROOP_LABELS[type]}</legend>
          <label>{form.inputMode === "rally" ? "最终实际出征数量" : "兵数"}<input aria-label={`${TROOP_LABELS[type]}兵数`} type="number" min="0" value={activeTroops[type].count} onChange={(event) => updateTroop(type, "count", event.target.value)} /></label>
          <label>等级<select aria-label={`${TROOP_LABELS[type]}等级`} value={activeTroops[type].troopLevelId} onChange={(event) => updateTroop(type, "troopLevelId", event.target.value)}>{knownTroopLevelOptions.map((level) => <option value={level.id} key={level.id}>{level.id}</option>)}</select></label>
          <label>{form.inputMode === "rally" ? `${TROOP_LABELS[type]}攻击 %` : "攻击加成 %"}<input aria-label={`${TROOP_LABELS[type]}攻击加成`} type="number" value={activeTroops[type].attackPercent} onChange={(event) => updateTroop(type, "attackPercent", event.target.value)} /></label>
          <label>{form.inputMode === "rally" ? `${TROOP_LABELS[type]}穿透 %` : "穿透加成 %"}<input aria-label={`${TROOP_LABELS[type]}穿透加成`} type="number" value={activeTroops[type].penetrationPercent} onChange={(event) => updateTroop(type, "penetrationPercent", event.target.value)} /></label>
        </fieldset>)}</div>

        <h3>{form.inputMode === "battleReport" ? "出征容量与专家" : "专家"}</h3><div className="two-col">
          {form.inputMode === "battleReport" && <div className="capacity-summary"><span>基础阵容兵数</span><strong>{nf.format(total)}</strong><small>由盾兵、矛兵、射手原始输入自动求和</small></div>}
          <label>猎手之心<LevelSelect value={form.preparation.hunterHeartLevel} options={hunterHeartLevelOptions} onChange={(value) => updatePreparation("hunterHeartLevel", value)} /></label>
          {form.inputMode === "battleReport" && <label>巨熊克星<LevelSelect value={form.preparation.bearSlayerLevel} options={bearSlayerLevelOptions} onChange={(value) => updatePreparation("bearSlayerLevel", value)} /></label>}
        </div>
        <h3>城镇增益</h3><div className="two-col">{[...DAMAGE_TOWN_KEYS, ...(form.inputMode === "battleReport" ? ["marchCapacity" as const] : [])].map((key) => <label key={key}>{townLabels[key]}<select value={form.preparation.town[key]} onChange={(event) => setForm((current) => ({ ...current, preparation: { ...current.preparation, town: { ...current.preparation.town, [key]: event.target.value as "none" | "small" | "large" } } }))}><option value="none">无</option><option value="small">小药 10%</option><option value="large">大药 20%</option></select></label>)}</div>
        <h3>宠物增益</h3><div className="two-col">{[...DAMAGE_PET_KEYS, ...(form.inputMode === "battleReport" ? ["capacityLevel" as const] : [])].map((key) => <label key={key}>{petLabels[key]}<LevelSelect value={form.preparation.pet[key]} options={key === "capacityLevel" ? petCapacityLevelOptions : petBuffLevelOptions} onChange={(value) => setForm((current) => ({ ...current, preparation: { ...current.preparation, pet: { ...current.preparation.pet, [key]: value } } }))} /></label>)}</div>
        <h3>兵种技能等级</h3><div className="two-col"><label>炽火凝星<LevelSelect value={form.preparation.marksmanBlazingStarLevel} options={troopSkillLevelOptions} onChange={(value) => updatePreparation("marksmanBlazingStarLevel", value)} /></label><label>矛兵 T12 技能<LevelSelect value={form.preparation.lancerT12SkillLevel} options={troopSkillLevelOptions} onChange={(value) => updatePreparation("lancerT12SkillLevel", value)} /></label></div>

        <h3>车头英雄</h3><div className="three-col">{TROOP_TYPES.map((type) => <label key={type}>{TROOP_LABELS[type]}车头<select value={form.headHeroIds[type]} onChange={(event) => setForm((current) => ({ ...current, headHeroIds: { ...current.headHeroIds, [type]: event.target.value } }))}><option value="">不选择</option>{headHeroOptions.filter((hero) => hero.troopType === type).map((hero) => <option value={hero.id} key={hero.id}>{formatHeadHeroOptionLabel(hero)}</option>)}</select></label>)}</div>
        <div className="two-col">
          <label>集结专武攻击加成 %<input type="number" value={form.preparation.rallyWeaponBuff.attackPercent} onChange={(event) => setForm((current) => ({ ...current, preparation: { ...current.preparation, rallyWeaponBuff: { ...current.preparation.rallyWeaponBuff, attackPercent: event.target.value } } }))} /></label>
          <label>集结专武穿透加成 %<input type="number" value={form.preparation.rallyWeaponBuff.penetrationPercent} onChange={(event) => setForm((current) => ({ ...current, preparation: { ...current.preparation, rallyWeaponBuff: { ...current.preparation.rallyWeaponBuff, penetrationPercent: event.target.value } } }))} /></label>
        </div>
        <h3>四车身（允许重复）</h3><div className="two-col">{form.bodyHeroIds.map((id, index) => <label key={index}>车身 {index + 1}<select value={id} onChange={(event) => setForm((current) => { const ids = [...current.bodyHeroIds]; ids[index] = event.target.value; return { ...current, bodyHeroIds: ids }; })}><option value="">不选择</option>{bodySkillOptions.map((option) => <option value={option.id} key={option.id}>{formatBodySkillOptionLabel(option)}</option>)}</select></label>)}</div>
        {selectedHeroSkillDetails.length > 0 && <div className="skill-detail-panel"><h3>当前技能效果</h3>{selectedHeroSkillDetails.map((detail, index) => <div className={`skill-detail ${detail.status}`} key={`${detail.ownerId}.${detail.skillName}.${index}`}><strong>【{detail.skillName}】</strong>{detail.status !== "applied" && <span>{detail.status === "pending" ? "待确认" : detail.status === "notApplicable" ? "不影响对熊输出" : "资料说明"}</span>}{detail.sourceSummary && <p>来源英雄：{detail.sourceSummary}</p>}{detail.summary && <p>{detail.summary}</p>}{detail.totalSummary && <p>本 skill 小区合计：{detail.totalSummary}</p>}{detail.reason && <small>暂不计入原因：{detail.reason}</small>}</div>)}</div>}
        <details className="pending-catalog"><summary>查看当前待确认技能清单（{visiblePendingSkillDetails.length}项）</summary>{visiblePendingSkillDetails.map((detail) => <p key={`${detail.ownerId}.${detail.skillName}`}><strong>{detail.ownerName} · {detail.skillName}</strong><small>{detail.reason}</small></p>)}</details>
        <h3>自动解锁与射手技能</h3><p>连射按 T7 解锁；燃晶火药与火焰冲击按 FC 等级自动选择；炽火凝星按设置等级生效。</p><div className="checks">{fireCrystalSkillOptions.map((skill) => <label key={skill.id}><input type="checkbox" checked={form.fireCrystalSkillIds.includes(skill.id)} onChange={(event) => setForm((current) => ({ ...current, fireCrystalSkillIds: event.target.checked ? [...current.fireCrystalSkillIds, skill.id] : current.fireCrystalSkillIds.filter((id) => id !== skill.id) }))} /><span>{skill.name}{skill.status !== "supported" && <small> 待确认：{skill.status === "pending" ? skill.pendingReason : skill.unsupportedReason}</small>}</span></label>)}</div>

        <button className="primary" disabled={Boolean(busy)} onClick={calculate}>{busy === "damage" ? "计算中…" : "计算 10 回合伤害"}</button>
        <div className="optimizer"><h3>优化</h3><div className="two-col"><label>返回方案数<LevelSelect value={form.topK} options={topKOptions} onChange={(value) => setForm((current) => ({ ...current, topK: value }))} /></label><label>比例步长 %<input type="number" min="0.01" step="0.01" value={form.ratioStepPercent} onChange={(event) => setForm((current) => ({ ...current, ratioStepPercent: event.target.value }))} /></label></div><div className="button-row"><button disabled={Boolean(busy)} onClick={() => void optimize("body")}>优化四车身</button><button disabled={Boolean(busy)} onClick={() => void optimize("ratio")}>优化兵种比例</button><button disabled={Boolean(busy)} onClick={() => void optimize("full")}>完整联合优化</button></div>{busy && busy !== "damage" && <p className="warning">计算中…正在运行0.01%网格的exact数学搜索；计算在独立线程运行，可继续查看页面。</p>}</div>
      </section>

      <section className="panel results"><h2>计算结果</h2>{!result && !optimization && <div className="empty"><strong>等待计算</strong><p>填写左侧战报和阵容后开始计算。</p></div>}
        {result && <><div className="hero-number"><span>10 回合期望总伤害</span><strong>{nf.format(result.expectedTotalDamage)}</strong><small>平均每回合 {nf.format(result.averageRoundDamage)}</small><div className="damage-interval" title="仅反映当前模型已经纳入的随机技能触发造成的伤害波动。"><span>95%伤害区间</span><b>{nf.format(result.lower95)} ～ {nf.format(result.upper95)}</b></div></div><div className="metric-grid"><Metric n="最终出征容量" v={result.totalTroopCount} /><Metric n="盾兵贡献" v={result.expectedDamageByTroop.shield} /><Metric n="矛兵贡献" v={result.expectedDamageByTroop.lancer} /><Metric n="射手贡献" v={result.expectedDamageByTroop.marksman} /><Metric n="无英雄技能基线" v={result.baseExpectedTotalDamage} /><Metric n="提升量" v={result.improvementAbsolute} /><div className="metric"><span>提升比例</span><b>{result.improvementRatio === null ? "—" : pf.format(result.improvementRatio)}</b></div></div>
          <h3>逐回合明细</h3><p className="term-help"><strong>普通伤害</strong>已包含当回合生效的攻击、穿透、减防、增伤、兵种克制与易伤乘区；<strong>额外伤害</strong>是同区加算的技能附加伤害段，不会创建额外出手，也不会重复计入最终伤害。</p><div className="table-wrap"><table><thead><tr><th>回合</th><th>普通伤害</th><th>额外伤害</th><th>最终伤害</th></tr></thead><tbody>{result.result.expectedDamageByRound.map((round) => <tr key={round.round}><td>{round.round}</td><td>{nf.format(round.expectedNormalDamage)}</td><td>{nf.format(round.expectedExtraDamage)}</td><td>{nf.format(round.expectedTotalDamage)}</td></tr>)}</tbody></table></div>
          <details className="zone-details"><summary>查看当前乘区明细（战报 / Buff / Skill / Expert）</summary><p className="term-help">战报攻击、穿透只进入基础 D0；Buff 与 Skill 是两个独立大乘区，表中分别显示，绝不合并加算。动态技能按回合显示期望倍率。</p><div className="table-wrap"><table><thead><tr><th>回合/兵种</th><th>D0</th><th>战报攻</th><th>战报穿</th><th>Buff攻</th><th>Buff穿</th><th>Buff减防</th><th>Skill攻</th><th>Skill穿</th><th>Skill减防</th><th>基础增伤</th><th>普攻增伤</th><th>技能增伤</th><th>兵种克制</th><th>易伤</th><th>Expert</th><th>额外伤害额</th></tr></thead><tbody>{result.result.expectedDamageByRound.flatMap((round) => TROOP_TYPES.map((type) => { const multipliers = round.expectedMultipliersByTroop[type]?.byEffectType; const breakdown = round.expectedTroopDamageBreakdowns[type]; return <tr key={`${round.round}.${type}`}><td>{round.round} / {TROOP_LABELS[type]}</td><td>{nf.format(result.baseDamageByTroop[type])}</td><td>{mf.format(result.percentageNormalization[type].attack.multiplier)}</td><td>{mf.format(result.percentageNormalization[type].penetration.multiplier)}</td><td>{mf.format(multipliers?.buffAttack ?? 1)}</td><td>{mf.format(multipliers?.buffPenetration ?? 1)}</td><td>{mf.format(multipliers?.buffDefenseReduction ?? 1)}</td><td>{mf.format(multipliers?.attack ?? 1)}</td><td>{mf.format(multipliers?.penetration ?? 1)}</td><td>{mf.format(multipliers?.defenseReduction ?? 1)}</td><td>{mf.format(multipliers?.baseDamageIncrease ?? 1)}</td><td>{mf.format(multipliers?.normalAttackDamageIncrease ?? 1)}</td><td>{mf.format(multipliers?.skillDamageIncrease ?? 1)}</td><td>{mf.format(multipliers?.troopVsTroopDamage ?? 1)}</td><td>{mf.format(multipliers?.vulnerable ?? 1)}</td><td>{mf.format(multipliers?.expertBearDamage ?? 1)}</td><td>{nf.format(breakdown?.extraDamage ?? 0)}</td></tr>; }))}</tbody></table></div></details>
          <div className="skill-columns"><div><h3>已计入技能</h3>{result.appliedSkills.length ? result.appliedSkills.map((skill, index) => <p key={index}>✓ {skill.skillName.replace(/[（(](?:车身)?5级[）)]/g, "")}</p>) : <p>无</p>}</div><div><h3>待确认、未计入</h3>{result.skippedSkills.length ? result.skippedSkills.map((skill, index) => <p key={index}>○ {skill.ownerName} · {skill.skillName.replace(/[（(](?:车身)?5级[）)]/g, "")}<small>暂不计入原因：{skill.reason}</small></p>) : <p>无</p>}</div></div></>}
        {optimization && <><div className="section-title"><h2>{optimization.title}</h2><span>{optimization.evaluatedCount.toLocaleString()} 个方案 · {optimization.elapsedMs.toFixed(0)}ms</span></div>{optimization.performanceWarning && <div className="alert">{optimization.performanceWarning}</div>}{optimization.topDamageInterval && <div className="damage-interval" title="仅反映当前模型已经纳入的随机技能触发造成的伤害波动。"><span>第1名 95%伤害区间</span><b>{nf.format(optimization.topDamageInterval.lower95)} ～ {nf.format(optimization.topDamageInterval.upper95)}</b></div>}<div className="table-wrap"><table><thead><tr><th>#</th><th>期望伤害</th><th>提升</th><th>盾/矛/射比例与兵数</th><th>车身</th><th /></tr></thead><tbody>{optimization.rows.map((row) => <tr key={row.rank}><td>{row.rank}</td><td>{nf.format(row.expectedTenRoundDamage)}</td><td>{row.improvementRatio === null ? "—" : pf.format(row.improvementRatio)}</td><td><strong>{formatRatioPercent(row.ratios.shield)} / {formatRatioPercent(row.ratios.lancer)} / {formatRatioPercent(row.ratios.marksman)}</strong><small>{row.troopCounts.shield.toLocaleString()} / {row.troopCounts.lancer.toLocaleString()} / {row.troopCounts.marksman.toLocaleString()}</small></td><td>{row.bodyHeroNames.join(" / ") || "—"}</td><td><button onClick={() => { setForm((current) => applyOptimizationRow(current, row)); setResult(null); }}>应用此方案</button></td></tr>)}</tbody></table></div></>}
      </section>
    </main><footer><details className="changelog"><summary>更新日志</summary>{CHANGELOG_ENTRIES.map((entry) => <section key={entry.version}><h3>v{entry.version} · {entry.date}</h3><ul>{entry.changes.map((change) => <li key={change}>{change}</li>)}</ul></section>)}</details><p>模型保持完整浮点精度；只有战报模式最终容量按已确认规则向下取整。待确认技能会显示原因且不会进入伤害或优化。</p></footer>
  </div>;
}

function Metric({ n, v }: { readonly n: string; readonly v: number }) {
  return <div className="metric"><span>{n}</span><b>{nf.format(v)}</b></div>;
}

function LevelSelect({ value, options, onChange }: { readonly value: string; readonly options: readonly UiSelectOption[]; readonly onChange: (value: string) => void }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>;
}

function runOptimizationInWorker(
  request: Parameters<typeof runOptimizationCore>[0],
): Promise<ReturnType<typeof runOptimizationCore>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./optimizer.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<
        | { readonly ok: true; readonly result: ReturnType<typeof runOptimizationCore> }
        | { readonly ok: false; readonly message: string }
      >,
    ) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.message));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "优化线程运行失败。"));
    };
    worker.postMessage(request);
  });
}
