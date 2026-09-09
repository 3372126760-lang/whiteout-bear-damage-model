/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CalculatorApp } from "./App";

afterEach(cleanup);

describe("计算器UI有限选项与技能说明", () => {
  it("标题从统一版本常量显示v0.2", () => {
    render(<CalculatorApp />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("无尽冬日打熊伤害模型 v0.2");
    expect(screen.getByText("缥缈制作，欢迎移民583")).toBeTruthy();
    expect(document.querySelector(".header-meta-row .author-note")).toBeTruthy();
  });

  it("所有有限等级与返回条数使用下拉选择", () => {
    render(<CalculatorApp />);
    for (const label of [
      "猎手之心",
      "巨熊克星",
      "攻击等级",
      "穿透等级",
      "减防等级",
      "出征等级",
      "炽火凝星",
      "矛兵 T12 技能",
      "盾兵车头专武技能等级",
      "矛兵车头专武技能等级",
      "射手车头专武技能等级",
      "返回方案数",
    ]) {
      expect(screen.getByLabelText(label).tagName).toBe("SELECT");
    }
    expect(screen.queryByLabelText("基础出征容量")).toBeNull();
    expect(screen.queryByText("基础出征容量")).toBeNull();
    expect(screen.getByLabelText("盾兵攻击加成").tagName).toBe("INPUT");
    expect(screen.queryByLabelText("其他固定容量")).toBeNull();
    expect(screen.queryByText("其他固定容量")).toBeNull();
    const ratioStep = screen.getByLabelText("比例步长 %") as HTMLInputElement;
    expect(ratioStep.min).toBe("0.01");
    expect(ratioStep.step).toBe("0.01");
  });

  it("尼莫可选并展示三个正式远征技能", () => {
    render(<CalculatorApp />);
    const shieldHead = screen.getByLabelText("盾兵车头") as HTMLSelectElement;
    expect([...shieldHead.options].some((option) => option.textContent === "尼莫 · 全军穿透 +25%")).toBe(true);
    fireEvent.change(shieldHead, { target: { value: "hero.head.nimo" } });
    expect(screen.getAllByText("【全军穿透 +25%】").length).toBeGreaterThan(0);
    expect(screen.getAllByText("【全军攻击 +25%】").length).toBeGreaterThan(0);
    expect(screen.getByText("【全军伤害 +30%】")).toBeTruthy();
  });

  it("弗林特可作为盾兵车头选择并展示三个正式技能", () => {
    render(<CalculatorApp />);
    const shieldHead = screen.getByLabelText("盾兵车头") as HTMLSelectElement;
    const flintOption = [...shieldHead.options].find(
      (option) => option.value === "hero.head.fulinte",
    );
    expect(flintOption?.textContent).toContain("弗林特");
    expect(flintOption?.textContent).toContain("盾兵伤害 +100%");
    fireEvent.change(shieldHead, { target: { value: "hero.head.fulinte" } });
    expect(screen.getByText("【盾兵伤害 +100%】")).toBeTruthy();
    expect(screen.getAllByText("【全军攻击 +25%】").length).toBeGreaterThan(0);
    expect(screen.getAllByText("【全军穿透 +25%】").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/弗林特.*(?:supported|pending|confirmed)/i);
  });

  it("首次渲染使用0/无/不选择的中性默认配置", () => {
    render(<CalculatorApp />);
    expect((screen.getByLabelText("盾兵兵数") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("矛兵兵数") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("射手兵数") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("盾兵攻击加成") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("盾兵穿透加成") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("盾兵等级") as HTMLSelectElement).value).toBe("T1");
    for (const label of ["盾兵车头","矛兵车头","射手车头","车身 1","车身 2","车身 3","车身 4"]) {
      expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe("");
    }
    for (const label of ["猎手之心","巨熊克星","盾兵车头专武技能等级","矛兵车头专武技能等级","射手车头专武技能等级","炽火凝星","矛兵 T12 技能"]) {
      expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe("0");
    }
    expect(screen.getByText("基础阵容兵数")).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("由盾兵、矛兵、射手原始输入自动求和")).toBeTruthy();
    expect(screen.getByText(/打熊阵容无宠无药打野怪数据/)).toBeTruthy();
    expect(screen.queryByText("【敌军防御 -25%】")).toBeNull();
  });

  it("修改三兵种输入会实时更新只读基础阵容兵数", () => {
    render(<CalculatorApp />);
    fireEvent.change(screen.getByLabelText("盾兵兵数"), { target: { value: "1" } });
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("基础出征容量")).toBeNull();
  });

  it("英雄选项不显示内部状态或确认数量，已确认的米娅幸运加护直接展示", () => {
    render(<CalculatorApp />);
    const body = screen.getByLabelText("车身 1") as HTMLSelectElement;
    const bodyLabels = [...body.options].map((option) => option.textContent);
    expect(bodyLabels).toContain("全军穿透 +25%");
    expect(bodyLabels).not.toContain("全军防御 +25%");
    expect(bodyLabels.join("\n")).not.toMatch(/supported|pending|已确认\/|\d+已确认/);
    const lancerHead = screen.getByLabelText("矛兵车头") as HTMLSelectElement;
    fireEvent.change(lancerHead, { target: { value: "hero.head.miya" } });
    expect(screen.getAllByText("【全军伤害 +50%】").length).toBeGreaterThan(0);
    expect(screen.getAllByText("来源英雄：米娅").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50%概率/).length).toBeGreaterThan(0);
  });

  it("逐回合结果只展示普通、额外伤害与最终伤害", () => {
    const { container } = render(<CalculatorApp />);
    fireEvent.click(screen.getByRole("button", { name: "计算 10 回合伤害" }));
    expect(container.textContent).toContain("额外伤害是同区加算的技能附加伤害段，不会创建额外出手");
    expect(container.textContent).not.toContain("额外攻击（额外出手）");
    expect(screen.getByText("查看当前乘区明细（战报 / Buff / Skill / Expert）")).toBeTruthy();
    expect(container.textContent).toContain("Buff攻");
    expect(container.textContent).toContain("Skill攻");
    expect(container.textContent).toContain("95%伤害区间");
  });

  it("战报与集结模式分别保存输入且集结模式隐藏容量等级", () => {
    render(<CalculatorApp />);
    expect(screen.getByRole("group", { name: "输入方式" })).toBeTruthy();
    expect(screen.queryByText("防御加成 %")).toBeNull();
    expect(screen.queryByText("生命加成 %")).toBeNull();
    fireEvent.change(screen.getByLabelText("盾兵兵数"), { target: { value: "777" } });
    fireEvent.click(screen.getByRole("button", { name: "集结模式" }));
    expect(screen.getByText(/打熊上车时的集结属性以及出征/)).toBeTruthy();
    expect(screen.getByLabelText("部队攻击")).toBeTruthy();
    expect(screen.getByLabelText("部队穿透")).toBeTruthy();
    expect(screen.queryByLabelText("集结部队攻击 Buff")).toBeNull();
    expect(screen.queryByLabelText("集结部队穿透 Buff")).toBeNull();
    expect(screen.queryByLabelText("巨熊克星")).toBeNull();
    expect(screen.queryByLabelText("出征等级")).toBeNull();
    fireEvent.change(screen.getByLabelText("盾兵兵数"), { target: { value: "888" } });
    fireEvent.change(screen.getByLabelText("部队攻击"), { target: { value: "333" } });
    fireEvent.click(screen.getByRole("button", { name: "战报模式" }));
    expect((screen.getByLabelText("盾兵兵数") as HTMLInputElement).value).toBe("777");
    fireEvent.click(screen.getByRole("button", { name: "集结模式" }));
    expect((screen.getByLabelText("盾兵兵数") as HTMLInputElement).value).toBe("888");
    expect((screen.getByLabelText("部队攻击") as HTMLInputElement).value).toBe("333");
  });

  it("更新日志从数据列表展示v0.1与v0.2", () => {
    render(<CalculatorApp />);
    expect(screen.getByText("更新日志")).toBeTruthy();
    expect(screen.getByText("v0.2 · 2026-09-09")).toBeTruthy();
    expect(screen.getByText("v0.1 · 2026-09-09")).toBeTruthy();
    expect(screen.getByText("优化集结模式输入与默认配置")).toBeTruthy();
  });
});
