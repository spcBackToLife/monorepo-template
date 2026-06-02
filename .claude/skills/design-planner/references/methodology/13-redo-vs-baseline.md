# 13 — 重做 vs 增量（schema 残留处理）

> 必读时机：Phase 0 入场门禁后、Phase A 开始前。
> 任务目的：识别 "用户期望重做" vs "schema 残留是 baseline" 的边界，避免把上次失败设计当起点。
>
> ★ **这是 design-planner 最容易掉进的心智陷阱**——必看。

---

## 1. 心智陷阱：把 schema 残留当 baseline

### 1.1 典型场景

```
用户：重构了视觉设计技能，删除了之前的设计，请重新做下视觉设计

design-planner 的错误反应：
  Step 1: read screen_schema → 看到 styles / states / 装饰 / materialProjectId 都还在
  Step 2: "v3 已落库基线完整,我做增量补 v8 metadata 字段就好"
  Step 3: craft 任务退化为 "verify v3 + 改 1-2 处属性"
  Step 4: 最终视觉与 v3 几乎一致 → 用户："没任何变化??"
```

**根因**：
- md 删了 ≠ schema 残留也清了（schema 是 service 端持久化数据，md 是过程留痕）
- design-planner 看到 schema 字段在，主观脑补"v3 是有效产物 + 我应该兼容/复用"
- 用户的"删除"语境被 AI 解读为"删 md 不删 schema"

### 1.2 为什么这是错的

```
用户语境的真实意图:
  "重做" = 推翻上一版,重新设计,允许出现完全不同的视觉效果
  
schema 残留的真实身份:
  上一版失败设计的"待清理 / 重做参照物" — NOT baseline,NOT verified 起点
  
craft 阶段的真实工作:
  在 Phase D 跨目标策略指导下,**重新决策每个节点该长什么样**
  schema 残留 styles 只是"参考此前是什么样,以便决定要不要变 / 怎么变"
```

把 schema 残留当 baseline = 把"上一版的失败"当"成功的起点" = 永远不会出现真正的 v8。

---

## 2. 重做 vs 增量判别（Phase 0 第 ⑥ 步必跑）

### 2.1 判别 5 信号

| 信号 | 重做语境 | 增量语境 |
|---|---|---|
| 用户措辞 | "重新做 / 重做 / 删了重来 / 重构后再试" | "调一下 / 优化下 / 改改 X / 加个 Y" |
| md 状态 | analysis-notes/.../design/ 大部分 / 全部缺失 | md 完整,只是某几处需要补 |
| 屏 phase | "interaction-defined"（被人工 reset）或 "designed" 但用户不满意 | "designed" 且用户满意大部分 |
| schema 残留量 | 大量字段（styles / states / 装饰 / materialProjectId）均在 | 大致已落 |
| 用户对 v 几结果的态度 | 否定 / 不满 / 没感觉 | 满意 / 局部需调 |

**≥ 3 信号命中 → 重做语境** → 按 §3 处理；否则 → 增量语境，按 §4 处理。

### 2.2 重做语境识别后,SKILL 必跑动作

```
1. 在入场回复中明确报告:
   "识别为重做语境(信号 X/Y/Z 命中),将把 schema 残留视为'上一版失败,待重做参照物'"

2. 在 Phase A positioning 时:
   - 不复用 schema 现有 meta.design.summary / palette / layers / componentBudgets
   - 不用"v3 已落库 / v7 既定"等措辞接受残留

3. 在 Phase B designGoals 提取 successCriteria 时:
   - 阈值不能"贴合 schema 现状"(避免现状自动达标)
   - 见 schema-spec/goal-success-criteria.md §"阈值定法 — 上一个台阶原则"

4. 在 Phase F craft 时:
   - schema 残留 styles 只是"上一版参照",不是"v3 baseline 维持"
   - craft 应大胆改 — 见 methodology/14-anti-kpi-thinking.md
```

---

## 3. 重做语境的 schema 处理协议

### 3.1 步骤 1：reset 残留 design 字段（推荐）

```jsonc
// 在 Phase A 开始前,先 reset schema 残留 design 字段
// 这让 craft 时心智清晰: "白板,从头画"

meta/set_screen {
  patch: {
    design: {
      // 把旧的浓缩字段 reset 为 null,让 v8 重新填
      summary: null,
      palette: null,
      layers: null,
      componentBudgets: null,
      briefing: null,         // 旧 v3 字段
      visualConcept: null,    // 旧 v3 字段
      visualStrategy: null,   // 会被新版重写,但显式 reset 防止误用
      // positioning / designGoals / goalElementMap 是新版字段,不需 reset
    }
  }
}

// 节点级 styles / states / materialProjectId 是否 reset:
//   选项 A (强重做): 整批 batch_update 把所有节点 styles reset 为最小值或 null
//                     再在 craft 阶段重新填 — 心智最清晰但工作量大
//   选项 B (温和重做): 不 reset 节点字段,但 craft 阶段把残留视为"对比参照"
//                     不复用残留值,而是基于 visualStrategy 重新决策
//   选项 C (探索式重做): 先做 Phase A-D,在 D 之后由 SKILL 决定哪些节点 reset
```

⚠️ 选项 A/B/C 选择由用户在 Phase 0 入场时显式询问；不询问 → 默认 B（温和重做）。

### 3.2 步骤 2：明确告知下游"不接受 v 几 baseline"

```
Phase B craft md 起手必写:
  "## 0. baseline 处理
   本 craft 视 schema 残留 styles 为 v 几失败设计,**不作为 baseline**.
   重新基于 G<N>.successCriteria + visualStrategy 决策每个属性应填什么."
```

### 3.3 步骤 3：craft 改动幅度门槛

重做语境下 craft 改动量必须显著（参考 methodology/14-anti-kpi-thinking.md §3）：
- 通常每个 craft 任务涉及 10-30 个 schema 字段改动（含 styles / states / structure / materials）
- 如果 craft 改动 < 5 字段 + 截图与 reset 前对比无显著差异 → 触发"假改动"自检

---

## 4. 增量语境的 schema 处理（对照参考）

增量语境（不是本文重点）：

```
- schema 残留是"已验证 baseline",可以 verify 维持
- craft 仅做用户指定的局部改动
- successCriteria 阈值可贴合现状 + 提升一档
- 改动量小是正常的（每 craft 1-5 字段都合理）
```

---

## 5. 反例（错误处理重做语境）

❌ 错（v8 重做时的实际错误）:
```
- read schema 看到 styles / states / 装饰 / materialProjectId 都还在
- craft md 写: "v3 已落 styles 完整,verify 维持;v8 仅补 marginTop 1 个字段"
- 截图与 v3 几乎一致 → 用户失望
```

✅ 对：
```
- read schema 看到 styles 还在 → 提问: "用户语境是重做还是增量?"
- 信号识别 (md 全删 + 用户措辞"重做" + ≥3 信号) → 判定重做
- Phase 0 入场报告: "识别重做语境,将 schema 残留视为参照而非 baseline"
- Phase B successCriteria 阈值定法不贴合现状 (装饰 alpha 不能写 "8-15%" 让 v3 自动达标)
- Phase F craft md 起手必写"不作为 baseline"声明
- craft 改动 10+ 字段,大胆使用六项创作权
- 截图与 reset 前对比 → 显著视觉差异 → 用户满意
```

---

## 6. 一句话总结

> **"用户说删了" + "schema 残留还在" = 重做语境的标准信号. 把残留当 baseline = 把上次失败当成功起点 = 永远不会有真正的下一版. SKILL Phase 0 必须显式判别并报告.**
