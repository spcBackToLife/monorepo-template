---
name: design-planner
description: 应用设计全流程规划技能。当用户要求设计一个完整的应用（或多页面功能模块）时触发。结合上游产品分析(PRD)和交互设计(交互规格)，采用「纵向深钻」方法——从设计系统出发，逐页面递归深入，每个页面是一个文件夹，页面主体/组件/素材各自独立文档可并行分析。做完一个页面再做下一个；然后通用组件深钻；最后完整性验证确保交互状态全覆盖、组件内联展开、样式规格无遗漏。
---

# design-planner

**纵向深钻 + 独立文档式设计规划**：每个页面是一个文件夹，组件和素材各自独立文档（遵循完整模板），可并行深钻分析。

---

## 核心原则

### 独立深钻，并行分析

```
页面分析时:
  1. 先写 visual.md (视觉设计分析: 情感→视觉手段→元素清单→实现分类→素材需求)
     ★ 视觉分析是设计的灵魂，必须先于结构分析
  2. 再写 index.md (页面骨架: 结构/区块/状态/数据/节点树)
     index.md 的样式规格来自 visual.md 的"样式规格清单"
  3. 识别出页面级组件 → 每个组件一个文件夹:
     - [name].visual.md (★ 组件视觉分析，必须先于结构文档)
     - [name].md (结构/API/状态矩阵/交互，样式来自 visual.md)
  4. 素材文档来自 visual.md 和各组件 visual.md 的"素材需求清单"
     → 每个素材一个独立 .md (遵循 material-design-template)
  5. 步骤 1 完成后，2/3/4 之间可并行写入

通用组件(Phase 3):
  - 每个组件一个独立文件夹: components/[name]/
    ├── index.md (结构/API/状态)
    ├── visual.md (视觉分析 ★)
    └── materials/ (由 visual.md 推导出)

结果: 视觉设计驱动素材产出，结构设计消费视觉规格。不可能"没有素材"。
```

### 完整分析流程图

```
Phase 1: 设计系统（全局Token）

Phase 2: 逐页面递归深钻（做完一个再做下一个）
  每个页面产出一个文件夹:
  pages/[NN]-[name]/
  ├── visual.md             ← ★ 页面视觉设计分析（灵魂，先于index）
  ├── index.md              ← 页面骨架(结构/区块/状态/数据/节点树)
  ├── components/           ← 页面级组件
  │   ├── [comp-a].visual.md    ← ★ 组件视觉分析（先于结构）
  │   └── [comp-a].md           ← 组件结构+交互（消费visual的样式规格）
  └── materials/            ← 由 visual.md 推导出的素材
      ├── [I-xx]-[name].md      ← 图标素材
      └── [D-xx]-[name].md      ← 装饰素材

  visual.md 包含(遵循 visual-analysis-template):
  ├── 1.情感与氛围目标(情感定位/品牌感)
  ├── 2.视觉层级设计(空间深度/权重分配/视觉流向)
  ├── 3.视觉手段清单(色彩/光影/装饰/质感/图标/动效)
  ├── 4.实现分类(CSS样式 or Canvas素材 or 动效)
  ├── 5.素材需求清单 → 指导 materials/*.md 创建
  ├── 6.样式规格清单 → 回写到 index.md 区块样式
  └── 7.全局风格一致性检查

  index.md 包含:
  ├── 1.定位  2.结构层次  3.区块详细设计(样式来自visual.md)
  ├── 4.组件清单(通用引用表 + 页面级组件索引)
  ├── 5.素材清单(索引 → 指向 materials/*.md, 来自visual.md推导)
  ├── 6.状态完整矩阵
  ├── 7.数据与交互设计
  └── 8.节点结构树

  components/[name].visual.md 包含(★ 视觉分析，先写):
  ├── 情感定位(组件级)
  ├── 视觉层级(组件内部的前景/背景/装饰层)
  ├── 视觉手段(色彩/光影/形状/质感/图标/动效)
  ├── 实现分类(CSS vs 素材)
  ├── 素材需求 → 指向 materials/
  └── 风格一致性检查

  components/[name].md 包含(结构+交互，后写，消费visual规格):
  ├── 定位 + 结构设计
  ├── 视觉变体 × 状态矩阵(每格有值，样式来自visual.md)
  ├── 状态转换动效
  └── 交互行为

  materials/*.md 每个包含(素材深钻):
  ├── 设计意图(来源于 visual.md 的素材需求清单)
  ├── 风格分析
  ├── 构图方案
  ├── 变体设计
  ├── 应用效果
  └── 绘制指令

  → 页面A 文件夹100%闭环 → 页面B → ...

Phase 3: 通用组件深钻(跨页面复用)
  components/[NN]-[name]/
  ├── index.md              ← 组件结构+API+状态+交互
  ├── visual.md             ← ★ 组件视觉分析
  └── materials/            ← 由 visual.md 推导的素材
      └── [I-xx]-[name].md

Phase 4: 执行计划 & 调度
```

### 从属关系

```
页面文件夹 包含:
  ├── visual.md — ★ 页面视觉灵魂(情感→手段→分类→素材需求→样式规格)
  ├── index.md — 页面骨架(结构/区块样式[来自visual]/状态/数据/节点树)
  ├── components/ — 页面级组件
  │   ├── [name].visual.md — ★ 组件视觉分析（先于结构）
  │   └── [name].md — 结构+交互（消费visual的样式规格）
  ├── materials/*.md — 素材深钻(来自 visual.md + 各组件 visual.md 的需求清单)
  └── 通用组件引用(在 index.md 组件清单表格中记录用法)

通用组件文件夹 包含:
  ├── index.md — 结构/API/状态矩阵/动效/交互/规范
  ├── visual.md — ★ 组件视觉分析(层级/手段/素材需求)
  └── materials/*.md — 组件内素材(来自 visual.md 推导)

数据流向(核心!):
  visual.md 的"素材需求清单" → 驱动 materials/*.md 的创建
  visual.md 的"样式规格清单" → 回写到 index.md 区块样式
  visual.md 的"动效规格" → 回写到 index.md 状态转换
  visual.md 的"全局一致性" → 确保与 design-system.md 契合

素材文档(无论归属于谁，模板一致):
  ├── 设计意图（来源: 对应 visual.md 的素材需求条目）
  ├── 风格分析（方向/色彩/线条/同系列统一性）
  ├── 构图方案（参考框/形状/位置/比例/空间）
  ├── 变体设计（各状态差异/过渡方式）
  ├── 应用效果（最终视觉/附加样式）
  └── 绘制指令（给 material-painter 的步骤）
```

### 并行策略

```
同一页面内的依赖链:
  visual.md (必须先完成 — 它推导出素材需求和样式规格)
      ↓
  以下三者可并行:
  ├── index.md (消费 visual.md 的样式规格清单)
  ├── components/ (各组件互不依赖，但组件内部有依赖链↓)
  │   └── [name].visual.md → [name].md (visual先行，结构消费视觉规格)
  └── materials/*.md (各素材互不依赖，来自visual.md的需求清单)

  最后: index.md 补充素材索引表(指向已完成的materials/)

跨页面:
  - 仍然逐页面顺序(上一页完成才开始下一页) — 保证设计一致性
  - 但同一页面内: visual.md 完成后，其余文档大量并行

Phase 3 的各通用组件之间也可并行(各自含 visual.md → index.md → materials/)。
```

### 每个决策回答三个问题

```
1. 是什么 → 精确描述（px/色值/token/ms/缓动函数）
2. 为什么 → 设计理由（情感/功能/可用性/品牌/层次）
3. 怎么做 → 实现路径（MCP工具/参数/顺序/依赖）
```

---

## 触发条件

- 涉及 3+ 页面的设计请求
- 已有 PRD + 交互文档，需落地为 UI 设计
- 用户说"设计规划"、"设计一个 app"、"继续执行设计"、"UI 设计"

## 不触发

- 单页样式调整 → `page-builder`
- 单个素材绘制 → `material-painter`
- 纯主题 Token → `theme-generator`

---

## 工作流

### Phase 0: 上下文收集 & 主题门禁

1. 读取上游产物：
   - `product-analysis/PRD.md`
   - `interaction-design/overview.md`
   - `interaction-design/pages/*.md`
2. `theme / check` → customized=false 则先触发 `theme-generator`
3. `theme / get` → 读取 ThemeConfig

---

### Phase 1: 全局设计系统

建立视觉基础设施。每个 Token 必须有选择理由。

详见 `references/design-system-template.md`。

**产出**: `design-plan/design-system.md`

---

### Phase 2: 逐页面递归深钻（核心阶段）

做完一个页面才做下一个。但**页面内的组件和素材各自独立文档，可并行分析**。

#### 执行步骤（每个页面）

```
Step 1: 写 visual.md (视觉分析 — 灵魂，必须最先完成)
        遵循 references/visual-analysis-template.md
        产出:
        - 素材需求清单 → 指导 Step 2 创建哪些 materials/
        - 样式规格清单 → 指导 Step 2 index.md 区块样式
        - 组件视觉需求 → 指导 Step 2 各组件 visual.md
        ↓
Step 2: 【可并行】分别写:
        - index.md (结构/区块/状态/数据/节点树, 样式引用visual.md)
        - components/ 每个组件: [name].visual.md → [name].md (visual先行)
        - materials/[ID]-[name].md (由 visual.md 需求清单驱动)
        ↓
Step 3: 回到 index.md 补充素材索引表(指向已完成的materials文件)
```

#### index.md 章节内容

| 章节 | 内容 | 参考模板 |
|------|------|---------|
| 1. 页面定位 | 心理/情绪目标/视觉优先级/上下游/设计挑战 | `references/page-design-template.md` |
| 2. 结构层次设计 | 布局/空间/流向/层叠(样式值来自visual.md) | `references/page-design-template.md` |
| 3. 区块详细设计 | 逐区块元素规格/间距/微交互(样式来自visual.md) | `references/page-design-template.md` |
| 4. 组件清单 | 通用引用表 + 页面级组件索引 | 索引指向 `components/` |
| 5. 素材清单 | 素材索引表(来自visual.md推导) | 索引指向 `materials/*.md` |
| 6. 状态完整矩阵 | 页面状态视觉快照 + 转换动效 | `references/page-design-template.md` |
| 7. 数据与交互设计 | 数据源/Mock/状态管理/事件流/绑定 | `references/page-design-template.md` 第8章 |
| 8. 节点结构树 | 可搭建的完整树 | `references/page-design-template.md` 第9章 |

#### ⭐ 节点结构树写作红线（§8/§9）

**这是 executor 的直接输入，必须精确到可实施级别。**

```
红线 1: 组件必须内联展开
  节点树中标注 [组件:X] 的位置，必须展开第一层子节点。
  理由: executor 需要看到完整的节点数量才能正确估算和实施。

  ❌ 信息丢失:
    └── visibility-sheet [组件:VisibilitySheet]

  ✅ 完整展开:
    └── visibility-sheet [组件:VisibilitySheet] [visibleWhen:sheetVisible]
        (position:fixed, bottom:0, bg:Layer3, radius:24px 24px 0 0, 毛玻璃)
        ├── drag-bar (w:36, h:4, bg:text-tertiary, radius-full, mx:auto)
        ├── title (heading-md) "选择谁能看到"
        ├── options-list (flex-col)
        │   ├── option-public (h:64, flex-row) [icon:I-07] "公开"
        │   ├── option-targeted (同结构) [icon:I-08] "定向给TA"
        │   └── option-timed (同结构) [icon:I-09] "定时定向"
        └── confirm-btn "确认"

红线 2: 状态矩阵的每个非基准状态必须有对应节点
  §6列出N个状态 → §8/§9节点树必须包含每个状态特有的UI结构。
  如果状态"exhausted"需要弹窗 → 节点树里必须有完整的弹窗子树。

  ❌ 信息丢失: §6写了"exhausted: FAB灰+提示Sheet弹出"但§9没有对应节点

  ✅ 正确: §9底部有:
    └── exhausted-sheet [visibleWhen:pageState==='exhausted']
        (position:fixed, bottom:0, bg:Layer3, radius:24px top, padding:24px)
        ├── title (heading-md) "今日免费次数已用完"
        ├── buy-btn "购买额外撒网 ¥1"
        ├── item-btn "使用道具"
        └── hint (body-sm, text-tertiary) "明天00:00刷新"

红线 3: 每个节点行必须包含样式关键词
  节点树不是纯结构，必须内联关键样式信息。
  理由: executor 的聚合检索会从§4补充完整值，但§9必须提供索引线索。

  ❌ 信息不足: ├── publish-btn "发布"
  ✅ 信息充分: ├── publish-btn (body-md 500, bg:Layer3→gradient激活, radius-sm, padding:6px 16px) "发布"
                    [event:click→发布] [visualState:disabled→active]

红线 4: 叶子节点必须有内容
  无子节点的元素必须标注:
  - 文字节点: 写出具体文案 "xxx" 或绑定 {{state.xxx}}
  - 图标节点: 标注 [素材:ID] 或 [CSS:描述]
  - 图片节点: 标注 src 来源或占位方案
```

#### 组件文档格式

每个组件产出两个文件（★ visual 先于结构，与页面级同理）:
- `components/[name].visual.md` (视觉分析，先写) — 遵循 `references/visual-analysis-template.md`
- `components/[name].md` (结构+交互，后写，消费visual的样式规格) — 遵循 `references/component-design-template.md`

`[name].visual.md` 包含(组件级视觉分析，★ 必须先完成):
1. 情感定位(组件级)
2. 视觉层级(组件内部的前景/内容/装饰层)
3. 视觉手段清单(色彩/光影/形状/质感/图标/动效)
4. 实现分类(CSS vs Canvas素材)
5. 素材需求清单 → 指向 materials/
6. 样式规格 → 回写到 [name].md 状态矩阵
7. 风格一致性检查

`[name].md` 包含(消费 visual.md 的样式规格):
1. 定位(职责/为什么不抽为通用)
2. 结构设计(子元素层次)
3. 视觉变体 × 状态矩阵(每格有值，样式来自 visual.md)
4. 状态转换动效
5. 交互行为设计(trigger→actions)

#### 素材独立文档格式

每个 `materials/[ID]-[name].md` 遵循 `references/material-design-template.md`，包含:
1. 设计意图(类型/来源/目标感受/Token关系)
2. 风格分析(方向/色彩/线条/同系列)
3. 构图方案(参考框/图形描述/正负空间)
4. 变体设计(各状态差异/过渡)
5. 应用效果(目标节点/附加样式/技术方案)
6. 绘制指令(canvas步骤表)

**产出**: `design-plan/pages/[NN]-[page-name]/` 文件夹

---

### Phase 3: 通用组件深度设计

从 Phase 2 各页面收集的通用组件（跨 2+ 页面），逐个深度设计。各组件之间可并行。

每个组件产出一个文件夹:
```
components/[NN]-[name]/
├── index.md        ← 组件完整设计(遵循 component-design-template)
└── materials/      ← 组件内素材
    └── [ID]-[name].md
```

index.md 包含 9 章（格式见 `references/component-design-template.md`）:
1. 定位 + 使用场景汇总
2. 结构设计
3. API 设计(Props/Events/约束)
4. 尺寸变体
5. 视觉变体 × 状态矩阵
6. 状态转换动效
7. 交互行为设计
8. 素材索引(指向 materials/)
9. 使用规范

**产出**: `design-plan/components/[NN]-[component-name]/`

---

### Phase 4: 完整性验证（信息零丢失的最后防线）

**目标**: 确保从交互文档到设计文档的信息传递完整，executor 拿到文档后能无歧义地实现每个节点。

#### Step 4.1: 交互状态全覆盖验证（最关键！）

```
规则: index.md §6(状态矩阵) 中列出的每个非基准状态，
必须在 §9(节点树) 中有对应的 DOM 结构。

验证方法:
  遍历 §6 的每一行状态 → 问: "这个状态需要什么特殊UI？"
  → 如果需要弹窗 → 节点树中必须有该弹窗的完整子树
  → 如果需要覆盖层 → 节点树中必须有 overlay 节点
  → 如果需要替换内容 → 节点树中必须有替代节点 + visibleWhen

示例(捞人页面):
  状态矩阵列出9个状态:
  - idle ← 基准(节点树主结构)
  - casting ← FAB文字变化(用 visual_state 解决，不需新节点)
  - result ← 需要 fishing-card 区域(节点树必须有)
  - empty_result ← 需要空态文案(节点树必须有)
  - exhausted ← 需要弹窗提示(节点树必须有 exhausted-sheet 完整子树)
  - greeting ← 需要 GreetingSheet(节点树必须有完整子树)
  - onboarding ← 需要引导浮层(节点树必须有 onboarding-overlay)
  - no_location ← 需要权限提示(节点树必须有)
  - out_of_campus ← 需要范围提示(节点树必须有)

  → 逐个检查，缺失的必须补写节点结构到 §9
```

#### Step 4.2: 组件内联展开验证

```
规则: 节点树中标注 [组件:X] 的位置，必须内联展开该组件的第一层子节点结构。
不可只写一句 [组件:X] 占位。

理由: executor 需要看到完整的节点数量和结构才能正确估算任务量。

格式要求:
  ❌ 错误(信息丢失):
    └── visibility-sheet [组件:VisibilitySheet]

  ✅ 正确(完整展开):
    └── visibility-sheet [组件:VisibilitySheet] [visibleWhen:sheetVisible]
        (position:fixed, bottom:0, bg:Layer3, radius:24px 24px 0 0, 毛玻璃)
        ├── drag-bar (w:36, h:4, bg:text-tertiary, radius-full, mx:auto)
        ├── title (heading-md) "选择谁能看到"
        ├── options-list (flex-col, gap:0)
        │   ├── option-public (h:64, flex-row, align:center, gap:12, padding:0 20px)
        │   │   ├── radio (18×18, border:1.5px, radius-full)
        │   │   ├── icon-div (20×20) [素材:I-07]
        │   │   └── text-group: "公开" + "任何人走到这里都能看到"
        │   ├── option-targeted (同结构) [素材:I-08]
        │   └── option-timed (同结构) [素材:I-09]
        └── confirm-btn [组件:GlowButton] "确认"
```

#### Step 4.3: 节点→样式完整性验证

```
规则: §9 节点树中的每个节点，必须能在 §4(区块详细设计) 中找到对应的样式规格。

验证方法:
  逐行扫描 §9 的节点 → 在 §4 的表格中查找 → 确认有完整的样式值
  缺失的必须补写到 §4

特别注意:
  - 文字节点必须有 color（暗色背景上不设颜色=不可见）
  - flex 容器必须有 flexDirection
  - 装饰节点必须有 position + top/left/width/height
  - 条件显示节点必须有 visibleWhen 表达式
```

#### Step 4.4: 素材+内容覆盖验证

```
1. 素材覆盖:
   遍历 §9 所有 [素材:X] 标注 → 确认 materials/ 有对应 .md
   遍历 Tab/NavBar 图标 → 确认有素材方案

2. 内容覆盖:
   遍历所有"叶子节点"(无子节点的元素):
   - span/p → 必须有 textContent 值或数据绑定表达式
   - img → 必须有 src 或占位方案
   - icon-div → 必须有素材引用或 CSS 实现说明

3. 装饰覆盖:
   visual.md 装饰策略表的每个装饰 → §9 中必须有对应节点
```

#### Step 4.5: 数据/事件完整性验证

```
1. 对照交互文档的事件列表:
   交互文档定义了 N 个交互 → §7-8 必须有对应的事件定义

2. 状态变量完整性:
   §6 状态矩阵引用的每个变量 → §7 stateInit 中必须有定义

3. 数据源完整性:
   §7 事件流中引用的每个 effect.fetch → §7 数据源定义中必须有
```

**不通过任何一项 → 回到 Phase 2 补写缺失内容**
**全部通过 → 设计文档完成，可交付给 executor**

⚠️ **plan.md 不再是必需产出**。executor 直接从上述通过验证的详细文档中提取任务。如果需要可以生成一个概览性的 plan.md 作为人类阅读参考，但它不是 executor 的输入源。

---

## 产出文件结构

```
.design-workspaces/<task>/design-plan/
├── design-system.md                ← Phase 1
├── pages/                          ← Phase 2
│   ├── 01-home-map/
│   │   ├── visual.md              ← ★ 页面视觉分析(灵魂)
│   │   ├── index.md               ← 页面骨架(结构/区块/状态/数据/节点树)
│   │   ├── components/
│   │   │   ├── map-bubble.visual.md   ← ★ 组件视觉分析（先写）
│   │   │   ├── map-bubble.md          ← 组件结构+交互（后写）
│   │   │   ├── preview-card.visual.md
│   │   │   └── preview-card.md
│   │   └── materials/
│   │       ├── I-01-locate-pulse.md   ← 素材(来自visual.md推导)
│   │       ├── D-01-page-glow.md     ← 装饰素材
│   │       └── ...
│   ├── 02-publish-moment/
│   │   ├── visual.md
│   │   ├── index.md
│   │   ├── components/
│   │   └── materials/
│   └── ...
└── components/                     ← Phase 3 (通用组件)
    ├── 01-glow-button/
    │   ├── index.md
    │   ├── visual.md              ← ★
    │   └── materials/
    ├── 02-input-field/
    │   ├── index.md
    │   ├── visual.md
    │   └── materials/
    └── ...
```

**⚠️ plan.md 不再是必需产出文件。** executor 直接从 pages/*/index.md + visual.md + components/ + materials/ 中提取任务。
如果需要人类概览可选生成 plan.md，但它不是 executor 的输入源。

---

## 工作节奏

```
Phase 1 → 暂停确认色彩/风格
Phase 2 → 每个页面内:
          Step 1 (visual.md — 页面视觉灵魂)
            → Step 2 (并行写: index.md / 组件(visual→结构) / 素材)
            → Step 3 (index.md 补素材索引)
          完成一个页面文件夹 → 下一个
Phase 3 → 各组件可并行(各自: visual.md → index.md → materials/)
Phase 4 → 完整性验证(5项全部通过才算完成)
          → 设计文档交付给 executor
```

---

## 跨会话继续

1. 读取 `STATUS.md` → 全局进度
2. 判断当前 Phase / 页面 / 子文档进度
3. 从断点继续（可能是某个页面的某个组件/素材文档）
4. 完成后更新 STATUS.md

---

## 约束

### 视觉设计红线（不可绕过）

- **视觉先行**: visual.md 必须先于 index.md 完成，视觉设计驱动结构设计
- **每个组件必须有 visual.md**: 无论页面级还是通用组件，`[name].visual.md` 是必须产出的独立文件，不可省略、不可合并到其他文件
- **不可能无素材**: C端App的每个页面和组件都必须有视觉分析，visual.md 的素材需求清单不可能为空（至少有图标/装饰之一）。如果分析后确实全是CSS，必须在第4节逐条论证为什么CSS能达到精美效果
- **层级统筹不可跳过**: 页面 visual.md 必须包含"组件视觉预算分配表"，组件 visual.md 必须回应"页面给我的预算是多少"
- **主题契合**: visual.md 第7节必须检查与 design-system.md 的一致性，不可自造Token外的色值

### 流程约束

- **独立文档**: 每个页面/组件的视觉分析是独立 .md，每个素材也是独立 .md
- **并行优先**: visual.md 完成后，index.md/组件/素材之间无依赖，并行写入
- **逐页完成**: 一个页面文件夹全部文档完成才进入下一个页面
- **模板一致**: 视觉分析统一用 visual-analysis-template，组件结构用 component-design-template，素材用 material-design-template

### 质量约束

- **状态完备**: variant×state 每格有值
- **素材深度**: 每个素材独立文档有完整6节(意图→风格→构图→变体→应用→绘制)
- **颗粒度**: 精确到 Token/px/ms/缓动
- **数据内聚**: 数据源/状态属于页面 index.md
- 素材引用设计系统 Token
- 列表用 repeat + dataSource
- 禁止 emoji 替代素材
- 每个决策有"为什么"

---

## references/（按需加载）

- `references/design-system-template.md` — 设计系统模板（色彩/间距/圆角/字体/阴影/动效完整格式）
- `references/visual-analysis-template.md` — ★ 视觉设计分析模板（情感→层级→手段→分类→素材需求→样式规格→一致性检查）
- `references/page-design-template.md` — 页面 index.md 模板（结构/区块/状态/数据/节点树）
- `references/component-design-template.md` — 组件结构+交互模板（定位/结构/状态矩阵/动效/交互）
- `references/material-design-template.md` — 素材独立文档模板（6节：意图/风格/构图/变体/应用/绘制）
- `references/decoration-elements-guide.md` — 装饰元素分类+选择逻辑+组合规则（visual.md 必读参考）
- `references/decoration-patterns.md` — 装饰 CSS 实现模式速查
