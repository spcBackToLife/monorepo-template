# 00 — 设计思维总纲

> 这份文档是 design-planner 的**思维总纲**——读懂它,再去读其他 methodology。
> 不读这份直接干活 = 必然回退到字段填表的执行模式。
>
> 必读时机：每次入场启动时第一份 read_file;任何陷入"机械填字段"的迹象时重读。
>
> ⚠️ 文中提到「写 md / 推理段 / 自审段」时，按 `references/README.md` 阅读规则执行——这些是执行动作的别名，不是要新建 md 文件。

---

## 1. 一句话总结

> **视觉设计 = 用具体可视判据的设计目标驱动多元素协同改动；不是按字段类别给所有节点遍历填值。**

---

## 2. 目标驱动 vs 字段驱动（最重要的认知切换）

### 2.1 字段驱动（错误,禁止）

```
任务清单：
  - 写 styles 字段（按节点遍历 33 处）
  - 写 visualStates 字段（按节点遍历 48 个 state）
  - 写 materialSpec 字段（按 type=img 节点 4 处）
  - 加装饰节点（按 budget 配额 1-2 个）

执行心智：
  "我要把所有 schema 字段填满 → 任务 done → 流程通过"

后果：
  字段全填 ≠ 设计达标
  AI 永远不知道"为什么这个节点要这样"
  视觉决策无溯源,无对账,无问责
```

### 2.2 目标驱动（唯一正确）

```
任务清单（每屏）：
  - 提炼 ≥3 个具体可视判据的设计目标 (Phase B)
  - 每目标拆"涉及哪些元素 + 怎么协同改动" (Phase C)
  - 跨目标统筹（权重 / 装饰 / 调色累积）(Phase D)
  - 派发 N 个 craft 任务,每 craft 服务 1 个目标 (Phase E)
  - 每 craft 一次性改动多元素多维度 + 截图对账目标判据 (Phase F)
  - 兜底未涉及节点 + 整屏对账 (Phase G)

执行心智：
  "我要让用户在视觉上感受到 X / 让 Y 元素成为主角 / 让 Z 状态降低焦虑
   → 拆出涉及元素 + 多维度改动 → 一次性改完 → 截图看是否达成 → 不达就改"

后果：
  每个改动都有溯源（服务于 G<N>）
  截图判据是机器可对账的（successCriteria）
  视觉效果与产品价值一一对应
```

### 2.3 关键判别题

```
看到任意一个改动需求时,问自己：
  ❌ "这个 styles / state / material 写在哪个字段？"   ← 字段驱动思维,错
  ✅ "这个改动服务于哪个 designGoal？该 goal 涉及哪些元素一起协同？"  ← 目标驱动思维,对

写任何 craft md 时,问自己：
  ❌ "我要给 SubmitBtn 加 hover 态"                        ← 字段驱动,错
  ✅ "为达成 G2(SubmitBtn 主角化) 这个目标,我要让 SubmitBtn 与 GetCodeBtn 形成视觉对比,
      涉及 SubmitBtn 主色填充 + GetCodeBtn 弱化字色 + 两者权重差 ≥ 4"  ← 目标驱动,对
```

---

## 3. 8 Phase 总览

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Phase 0: 入场门禁                                               │
│           六查（含 targetUser / styleDirection 含产品价值信号）  │
│                              ↓                                   │
│  Phase A: 三层定位            positioning.md                     │
│           产品 / 页面 / 用户场景    + screen.meta.design.positioning│
│                              ↓                                   │
│  Phase B: 设计目标提取        design-goals.md                    │
│           ≥3 ≤7 个,每个 5 字段齐  + screen.meta.design.designGoals[]│
│                              ↓                                   │
│  Phase C: 目标→元素拆解       goals/G<N>.md (每目标一份)        │
│           涉及元素 + 5 维 changes  + screen.meta.design.goalElementMap│
│                              ↓                                   │
│  Phase D: 跨目标统筹          cross-goal-strategy.md             │
│           权重金字塔 + 装饰族 +     + screen.meta.design.visualStrategy│
│           60-30-10 累积                                          │
│                              ↓                                   │
│  Phase E: 任务派发            task-planning.md                   │
│           按目标自创 N 个 craft     + meta/add_plan_tasks         │
│           （含 D-X-G<N>-craft）                                  │
│                              ↓                                   │
│  Phase F: craft 任务落库      craft-G<N>.md (每目标一份)         │
│           一次性改动多元素多维度    + 多个 MCP 调用 + 截图对账    │
│           + 截图对账 successCriteria                              │
│                              ↓                                   │
│  Phase G: 整屏对账            self-review-by-goals.md            │
│           兜底 + allGoalsCriteriaMet                              │
│                              ↓                                   │
│  Phase H: 移交                handover.md                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

每个 Phase 在 SKILL.md §4 是 ≤ 200 字的"做什么 + 何时进入下一 Phase"。详细方法在对应 methodology 文件。

---

## 4. 设计师 7 大能力

### 4.1 能力对照

每个 Phase 兑现的能力对应资深设计师的真实工作流：

| 能力 | 兑现位置 |
|---|---|
| 何时该用素材装饰 / 用什么色 | Phase C `goalElementMap.changes.materials/structure` 必挂 goal;`coordination` 指明装饰角色;颜色由 Phase D `visualStrategy.colorRatio.{60,30,10}` 累积推导 |
| 元素契合主题 / 丰富呈现产品 | Phase C `goalElementMap[].involvedElements[].role` 显式标主体/主角/配角/邻居/装饰;Phase F craft 每次只改某 goal 涉及节点,带溯源 |
| 元素权重 / 整体和谐 | Phase C 每 goal 内 `weightAllocation`;Phase D 跨目标取最高 → `visualStrategy.weightPyramid`;P0 goal 元素权重优先采纳 |
| 一个交互效果需要多少元素协作 | `methodology/04-multi-element-coordination.md` 给出 4 角色 + 7 种协同模式;Phase C 显式列 `coordination`;< 2 元素的 goal 被 R-GOAL-DECOMPOSE 拒 |
| 基于设计目的新建任务（不是 css 调试）| Phase E 任务派发只支持 `D-X-G<N>-craft` 形式;每 craft 必涵盖 ≥2 维度;单维度被 R-GOAL-DIMENSION 拒 |
| 系统性结合产品+主题分析视觉任务 | Phase A→B→C→D 强契约链：positioning → designGoals → goalElementMap → visualStrategy;每个产物是下一个的强制输入 |
| 调整布局 / 装饰 / 整体结构 | Phase C `changes.structure` / `changes.layout` 是 goal 拆解的一等维度;`methodology/11-layout-adjustment.md` 要求"布局调整必须服务某 goal,孤立调整禁止" |

---

## 5. 创作权与边界

design-planner 的**六项创作权**（在 SKILL.md §1.2 详述）：
1. 视觉概念决策权（Phase B）
2. 视觉策略制定权（Phase D）
3. 视觉任务自创权（Phase E）
4. 布局调整权（Phase C / F）
5. 装饰节点新建权（Phase C / F）
6. 素材绘制权（Phase F 涉及素材时）

**边界精确**：
- 装饰 / 视觉容器节点必须挂 `meta.design.servingGoals: [G<N>]` —— 没有这个字段视为"无目的填字段",R-ORPHAN-DECORATION 拒
- 自创任务必须形如 `D-X-G<N>-craft`,不能是 `D-X-styles` / `D-X-fix-something` 这类按字段或按 issue 拆的任务

---

## 6. 心智模式自检（执行任意任务前必跑）

每次执行 craft 任务前,**强制自问**：

```
1. 我现在做的改动服务于哪个 designGoal？
   → 答得出 G<N> 编号 + 一句话 statement → 通过
   → 答不出 → 停下来,先做 Phase B/C/D
   
2. 这个改动涉及哪些元素？≥ 2 个吗？
   → ≥ 2 → 通过
   → 单元素 → 重新审视：这真是设计目标吗？还是只是 css 微调？
   
3. 这些元素的协同关系是什么？谁是主体 / 主角 / 配角 / 邻居 / 装饰？
   → 答得出 → 通过
   → 答不出 → read methodology/04-multi-element-coordination.md
   
4. 改完之后,怎么从截图判断目标达成？
   → 有 ≥3 条具体可视判据 → 通过
   → 只有"看起来不错"这种抽象 → 重新写 successCriteria
   
5. 如果跑 3 轮 craft 仍不达,我应该停下做什么？
   → 挂 UpstreamChallenge → 通过
   → "再试一次" → 错,要往上找根因
```

任一未通过 → 当前思维处于"字段填表"状态,**回到 Phase B/C 重做**。

---

## 7. 反模式（必须识别并拒绝）

### 7.1 把 craft 写成 fix-issue

❌ 错（修补型 craft 任务）：
```
craft-brandlogo: 修 BrandLogo 占位虚线
craft-decoration-rebalance: 修装饰透明度
craft-tab-indicator: 修 ModeToggle 缺指示线
craft-checkbox: 修 native checkbox 黑块
craft-typography-refresh: 修字重过粗
```

✅ 对（目标驱动 craft 任务）：
```
craft-G1-mood-warmth: 服务 G1 校园温度,改动屏底+BrandLogo+BgBlob+FormCard 协同
craft-G2-cta-hierarchy: 服务 G2 SubmitBtn 主角化,改动 SubmitBtn+GetCodeBtn+Links 权重再分配
craft-G3-form-clarity: 服务 G3 表单清晰,改动 Inputs+Labels+Errors 协同
```

### 7.2 把抽象意图当 successCriteria

❌ 错：
```
G1.successCriteria = ["主题契合度高", "情绪传达准确", "视觉舒服"]
```

✅ 对：
```
G1.successCriteria = [
  "首屏视线热点（saliency map）落在 BrandLogo + 屏底偏暖区,而非 SubmitBtn 主色块",
  "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt（避免与白难以区分）",
  "出现 ≥ 2 个具象校园元素表征（色斑 / 插画 / 纹理）",
  "无任何冷峻 SaaS 信号（纯白底 / 直角元素 / 灰阶占比 > 40%）"
]
```

### 7.3 单元素 / 单维度的"目标"

❌ 错（这不是设计目标,是 css 微调）：
```
G4.statement = "让 SubmitBtn 圆角 12px"
G4.involvedElements = [SubmitBtn]
G4.changes = { styles: [{ nodeId: SubmitBtn, patch: { borderRadius: 12 } }] }
```

✅ 对（真目标）：
```
G2.statement = "让 SubmitBtn 成为首屏第二视觉锚点,引导用户视线从 BrandLogo 自然过渡到 CTA"
G2.involvedElements = [SubmitBtn, GetCodeBtn, Links, FormCard]
G2.changes = {
  styles: [SubmitBtn 主色填充 + GetCodeBtn 弱化字色 + Links caption 字号],
  visualStates: [SubmitBtn 5 态视觉差异 ≥ 显著],
  layout: [SubmitBtn 上方 spacing 加大,与字段视觉断开]
}
```

### 7.4 装饰不挂 servingGoals

❌ 错：
```
element/add 装饰节点 BgBlobBottomLeft,只挂 kind=decoration,没挂 servingGoals
后果: R-ORPHAN-DECORATION 拒,装饰是孤儿
```

✅ 对：
```
装饰节点必挂 meta.design.servingGoals: ["G1"] (或多个 goal)
说明这装饰服务于哪个目标,可以被对账
```

---

## 8. 与 skill-creator 规范的兼容

本 SKILL 遵守 skill-creator 的渐进披露原则：

- SKILL.md 主体 < 5k words（核心流程 + 红线）
- methodology/* 是按需加载的深度知识（< 3k words 每份）
- note-templates/* 是 md 骨架（< 1k words 每份）
- recipes/* 是按需配方（< 2k words 每份）

**写新 methodology / template / recipe 的人**：保持每份文档单一职责,过长则拆。

---

## 9. 一句话再总结

> **设计目标驱动 = 让"用户感受到 X"成为唯一真理；styles / states / materials / decorations / 布局都是它的实现手段。任何不挂在某个目标下的改动都是"无目的填字段",必须拒。**

剩余的 methodology / templates / schema-spec 都是为这一句话服务。
