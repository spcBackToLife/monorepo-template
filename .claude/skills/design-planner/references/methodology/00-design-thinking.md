# 方法论 0：设计思维总纲（v3 新增）

> 适用任务：所有 design 阶段任务（必读，进入本阶段第一份必读 methodology）
>
> **核心**：设计师不是「字段填写员」，是「视觉创作者」。**创作权 + 任务自创权 + 整体把控** 是这一棒的本质。
>
> ⚠️ **截图工具公告（2026-06）**：本文以下所有 "generate_snapshots" 字样**当前不可用**——`mcp/generate_snapshots` 走有 bug 的 `/preview` 路由。所有自审 / 截图核对统一改用 `scripts/screenshot-screen.mjs`（Bash 调，stdout 末尾返回 PNG 路径，Read 看图）。**必读** `../../../common/references/screenshot-tool.md`。

---

## 1. 设计师 vs 字段填写员（角色边界）

```
字段填写员                          视觉创作者（v3 ★）
─────────────                       ──────────────
给我节点 → 我填 styles               接到任务 → 先理解产品+主题+情绪 → 再形成视觉概念
按 budget 表填 weight                先想本屏要让用户感受什么 → 再决定哪个组件主角配角
按模板填字段                         看到 schema 不够表达视觉时 → element/add 加视觉容器
依赖下游 executor 出素材              自己调 material-painter 画完素材
做完字段就 done                       做完一定 generate_snapshots 自审，不达标重做
```

**v3 角色契约**：design-planner 收到 phase=interaction-defined 的屏 → 必须像资深视觉设计师一样工作 → 交付**完整可识别的画面**。

---

## 2. 8 阶段工作流（漏斗式）

```
A 取景 (Briefing)        读 product / theme / interaction → briefing.md
       ↓
B 概念 (Concept)         mood / 灵魂句 / 风格关键词 3 → concept.md
       ↓
C 策略 (Strategy)        5 维：色 60-30-10 / 字号节奏 / 形状语言 / 装饰系统 / 间距+动效律 → strategy.md
       ↓
D 任务自创 (Plan)         基于 strategy 自创 craft 任务 N 个 → 挂 plan tasks
       ↓
E 创作 (Craft)            每个 craft 任务一份 md：可改布局 / 加装饰 / 画素材 / 调 styles+states
       ↓
F 自审 (Review)           每个 craft 完成后 generate_snapshots → 5 维度评分 → <4 重做
       ↓
G 跨屏 audit              decoration-system / color-ratio / weight-pyramid 三大 audit
       ↓
H 出场 (Handover)         integrity 0 错 + 全 self-review ≥4 + 移交 design-executor
```

**前一棒输出是后一棒强制输入**——A 不写 briefing 不能进 B；B 不写 concept 不能进 C；C 不写 strategy 不能进 D；D 不挂 craft 任务不能进 E。

---

## 3. 三个不变量

### 3.1 视觉先行（绝对红线）

```
❌ 错误：先想"这屏要几个 div" → 再补样式 → 再补装饰
✅ 正确：先想"这屏让用户感受什么" → 再用视觉手段实现 → 最后落到节点 + 样式
```

任何"先结构后视觉"流程 = 错误。

### 3.2 一次只做一个最小任务

每轮循环（Phase 2 八步）只做一个任务，写一份 md，落一组 schema。**不一次性写完整屏**——避免 token 焦虑、避免多任务串台、便于多会话续接。

### 3.3 自审强制

每个 craft / styles / states / self-review 类落库任务标 done 之前必须 generate_snapshots → 5 维度评分（识别 / 层次 / 状态 / 契合 / 情绪）→ 任一维 < 4/5 必须重做。

---

## 4. 创作权清单（详见 SKILL.md §5.4）

design-planner 拥有 6 项创作权：

1. **视觉概念决策权** — 为每屏定 mood / 灵魂句 / 关键词
2. **视觉策略制定权** — 5 维策略落 visualStrategy 字段
3. **视觉任务自创权** — `meta/add_plan_tasks` 创建 craft 任务
4. **布局调整权** — `element/add` / `wrap` / `move` 视觉容器（不动业务节点）
5. **装饰节点新建权** — 4 类装饰节点 + 装饰系统单一族
6. **素材绘制权** — 调 material-painter 画素材 + applyMaterialDesign

**6 项创作权 + 1 项自审契约 = v3 角色升级的全部内容**。

---

## 5. 与上下游的契约

### 5.1 上游 (theme-generator + interaction-designer)

design 阶段读：
- `theme.tokens` / `theme.intent` / `theme.decorationRules` / `theme.iconSpec`
- `screen.meta.product` / `screen.meta.interaction` / `state.view` 字段全集
- `interaction` 已建的衍生视图节点 / `screen.overlays` / `project.globalOverlays`

design 阶段不动以上字段。

发现上游不足时（缺 token / 缺 state.view 字段 / 缺衍生视图节点）→ 走 §11 UpstreamChallenge，不当场补。

### 5.2 下游 (design-executor)

design 阶段交付给 executor：
- `node.styles` 全量 / `node.states[]` / `screen.backgroundColor`
- `screen.meta.design.{summary, palette, layers, componentBudgets, visualConcept, visualStrategy}`
- `node.meta.design.{summary, rationale, visualSpec, materialSpec, kind}`
- `node.materialProjectId` 全部已写入（v3 ★：素材已画完应用）
- `project.componentAssets` 通用模板
- 装饰节点 / 视觉容器节点（必有 `meta.design.kind`）

**executor 退化为 QA 摄影师**：跑 generate_snapshots → 对照 design 期望 → 报告差异。executor 不画素材、不做设计决策。

---

## 6. 何时该停下来思考、何时该立刻动手

```
该停下来思考（必须先写 md，不要急着调 MCP）：
- 收到新屏，还没读 briefing/concept/strategy → 先写 md
- 心里没有"本屏灵魂句"就开始写 styles → 必然简陋
- 一个新任务但不知道用哪个 recipe → 先 read 对应 recipes
- 不知道某节点 minSignals 是几 → 先 read methodology/02-visual-budget.md §4

该立刻动手（不必再讨论）：
- briefing/concept/strategy 都写好了，进 D-X-craft-* → 直接落 schema
- pitfalls/web-rendering.md / composite-patterns.md 已经给了 workaround → 照写
- recipes 给了具体 CSS → 复用
- self-review <4 → 立刻回 Step 5 重做，不要陷入分析瘫痪
```

---

## 7. 设计师常犯的反模式（避免）

- ❌ **平铺式写完所有节点 styles 一次了事** → 应该先 strategy 再逐节点 craft，每个 craft 独立 md + 自审
- ❌ **把 budget weight 当装饰量上限** → weight 是视觉权重，最低识别阈值是装饰量下限
- ❌ **只写 DOM 事件态，忘了业务态** → state.view 字段必须扫一遍映射 visualState
- ❌ **看到 native checkbox 就 native input + accentColor 应付** → 必须 wrapper-label 自绘
- ❌ **装饰系统混杂多种风格**（光斑+几何+插画同屏）→ 装饰系统单一族
- ❌ **画完没截图就标 done** → 强制 generate_snapshots 自审
- ❌ **一遇到上游缺什么就硬扛** → 走 UpstreamChallenge，不要在 design 阶段塞业务字段
- ❌ **不调 material-painter 画素材，把 type=img 留空 src 给 executor** → v3 已放开素材绘制权，design 阶段必须画完
- ❌ **Phase A/B/C 跳过直接 D 自创任务** → 没有 strategy 自创出来的任务一定是无章法的
