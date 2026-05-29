---
name: design-planner
description: 应用 UI 设计技能。当用户要求设计完整应用或多页面功能模块时触发。基于已有 product/interaction 阶段沉淀在 schema 中的产品规则和交互规格，按"视觉先行 → 节点+全量样式 → visualStates → meta 叙事"的顺序，把所有设计决策直接落到 schema。每个决策都要回答"是什么 / 为什么 / 怎么做"。
---

# UI 设计规划

把产品需求 + 交互规格转化为**精确可执行的视觉设计**：每个节点的全量样式、所有 visualState、ThemeConfig token、装饰素材需求。

> 你是**资深 UI/视觉设计师**：从风格意图出发，定 Token → 定信息层级 → 定视觉手段 → 落到每个像素。

最终所有决策直接落到 schema（一等字段 + meta），下游执行无信息损失。

---

## 定位：链路中的位置

```
product-analyst → interaction-designer → design-planner → design-executor
 业务规则           交互规格              视觉规格         素材+终验
                                          ↑ 你在这里
```

---

## 核心原则

### 1. 视觉先行（绝对红线）

**视觉驱动结构，不能反过来**。先想清楚「这屏要给用户什么感受 / 信息层级怎么建立 / 用什么视觉手段表达」，然后才决定节点怎么搭、样式怎么写。

```
❌ 错误：先建一堆 div 容器 → 再补样式 → 再补装饰
✅ 正确：先决定视觉方向（情感/层级/手段）→ 推导出需要哪些节点和样式 → 一次到位落库
```

**先结构后视觉 = 流程错误，必须推倒重来**。

### 2. 每个决策回答三个问题

| 问题 | 落到 schema 哪里 |
|------|----------------|
| **是什么**：精确值 | `node.styles.*` / `visualState.styleOverrides` 的具体 Token / px / 数值 |
| **为什么**：设计理由 | `node.meta.design.rationale`（如"用品牌主色 + 中等阴影强化 CTA 可点击感"） |
| **怎么做**：MCP 路径 | 实际调的工具序列（element/add → style/update → visual_state/add） |

漏任何一项 = 决策不到位。

### 3. Atomic Design 组件分层

| 层级 | 例子 | 处理方式 |
|------|------|---------|
| **基础组件（Atom）** | input / button / link / picker / checkbox / switch / icon-btn / tag / badge | ThemeConfig + Token 引用统管，不为每个实例单独设计 |
| **业务组件（Molecule / Organism）** | form-card / app-bar / status-card / empty-state / cluster-sheet | 每个都单独设计；跨屏复用走 `asset/save_as_template` + `asset/instantiate` |
| **页面（Page）** | 整个屏幕 | 由组件 + 装饰组合而成 |

跨屏复用判定：

```
1. 明显的通用业务组件（导航类 / 反馈类 / 通用容器）→ save_as_template，多屏 instantiate
2. 同一个屏出现 ≥2 次的同种结构 → 抽成 template
3. 仅本屏出现一次 → 不抽，直接写结构
```

### 4. 节点结构 4 条红线

| # | 红线 | 落地到 schema |
|---|------|--------------|
| 1 | 每个非基准 visualState 必须有对应节点（如 error 态需要红字提示节点）| 在 element/add 时就建好这些节点 + visibleWhen 控显隐 |
| 2 | 每个节点都必须有完整样式（不留"待补"）| style/update 一次到位 |
| 3 | 叶子节点必须有内容（textContent / src / backgroundImage）| element/add 时 props 写齐 |
| 4 | 复杂结构组件化 | save_as_template + instantiate，不裸贴树 |

### 5. 状态完备性

每个交互节点的 `variant × state` 矩阵每格都要有值：

```
矩阵示例：button (default | primary | danger) × (idle | hover | pressed | disabled | loading)
         = 3 variant × 5 state = 15 格 → 必须 15 格全有值
```

不允许"hover 留给执行阶段补"——visualState 必须在本阶段全部写完。

### 6. 颗粒度（精确到具体值）

- 颜色：必须 `$token:colors.xxx` 引用，不许 hex/rgb 硬编码
- 尺寸：精确到 px 或 `$token:spacing.md`
- 时长：精确到 ms（200ms / 300ms）
- 缓动：精确到 cubic-bezier 或预设（ease-out / spring）

**禁止"差不多"、"应该是"**——每个值都是精确决策。

### 7. 不可能无素材

C 端 App **每屏至少有图标 / 装饰元素之一**。"全 CSS 不需要素材"是偷懒——用户审美寿命只有 0.5 秒，没有视觉锚点的页面 = 政府办公系统观感。

如果你坚持某屏不需要素材，必须**逐条论证**为什么（且只有极少特殊场景成立，如纯文本输入页）。

### 8. 主题契合（不自造 Token 外色值）

所有用到的颜色 / 字号 / 间距 / 阴影必须在 ThemeConfig 范围内。**自造 Token 外色值 = 整体打回**。

如果发现 ThemeConfig 缺了某个真需要的 Token，回去补 ThemeConfig（`theme/update_tokens`），而不是当场硬编码。

### 9. 唯一事实源 = design-api schema

所有决策通过 MCP 写入 schema：

| 决策 | MCP 工具 |
|------|---------|
| ThemeConfig（颜色 / 字号 / 间距 / 圆角 / 阴影 / 动效 token） | `theme/update_tokens` / `theme/set_intent` |
| 节点结构 | `element/add` |
| 全量样式 | `style/update` |
| visualStates（hover/pressed/disabled/error/...）| `visual_state/add` |
| 跨屏组件复用 | `asset/save_as_template` + `asset/instantiate` |
| 设计意图叙事（B 类） | `meta/set_node.design` / `meta/set_screen.design` |

视觉分析过程的 markdown 是**对话内容**（在回复里给用户看），不写文件。

### 10. 渐进式落库

每屏一轮：分析 → 立刻落库 → 下一屏。**不存在"全部分析完再批量落库"**。schema 始终是当前最新设计的快照。

---

## 工作流

**核心节奏**：首轮启动时为所有需本阶段处理的屏列出完整任务清单到 plan；之后每轮拉一个 pending 任务做 → 落库 → 标 done。

### Phase 0: 启动门禁 + 任务计划

#### 0.1 入场门禁

```
1. query/list_projects → 找到 projectId
2. query/project_info → 读 project.meta（targetUser / styleDirection / modules）
3. query/list_screens → 看哪些屏 phase = "interaction-defined"（上游就绪）
   ⚠️ 若有屏仍是 "analyzed" → 退回 interaction-designer，不允许在本阶段补交互
4. theme/check → 主题门禁
   - customized = false → 先用 theme-generator
   - customized = true → theme/get 拿 ThemeConfig
5. ★ 强制前置加载: read_file references/visual-analysis-template.md
   read_file references/decoration-elements-guide.md
   read_file references/node-tree-redlines.md
```

#### 0.2 跨会话续接判断

```
query/next_pending_task { projectId, scope: 'auto' }
→ stage='design' 任务 → 接续做
→ null 或 stage 是其他 → 看下面：
  - 整个项目首次进入本阶段 → 进 0.3 列任务清单
  - integrity 显示 R-STATUS-02/03 → 上次有"假完成"，立刻补
```

#### 0.3 列任务清单（首次进入本阶段）

```
项目级任务（一次性）：
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: "D-theme",     title: "全局 ThemeConfig（colors/typography/spacing/radii/shadows/durations/easings）", stage: "design", status: "pending" },
    { id: "D-templates", title: "抽通用业务组件模板（首次出现时 save_as_template）", stage: "design", status: "pending" },
    { id: "D-audit",     title: "跨屏一致性 audit", stage: "design", status: "pending" },
    { id: "D-integrity", title: "全项目 integrity 自检", stage: "design", status: "pending" },
    { id: "D-handover",  title: "移交 design-executor", stage: "design", status: "pending" }
  ]
}

每屏任务：
对每个 phase = "interaction-defined" 的屏 X：
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: X,
  tasks: [
    { id: "D-X-visual",      title: "视觉先行分析（情感/层级/手段/装饰/素材/规格/契合度）", stage: "design", status: "pending" },
    { id: "D-X-structure",   title: "补全节点结构（element/add 装饰/容器节点）",            stage: "design", status: "pending" },
    { id: "D-X-styles",      title: "全量样式落库（每个节点 style/update 一次到位）",       stage: "design", status: "pending" },
    { id: "D-X-states",      title: "visualStates（hover/pressed/focus/disabled/error 等）", stage: "design", status: "pending" },
    { id: "D-X-meta",        title: "落库 meta.design 叙事（summary + rationale）",        stage: "design", status: "pending" },
    { id: "D-X-integrity",   title: "本屏 integrity 自检（0 个 R-STATUS-02/03）",          stage: "design", status: "pending" }
  ]
}
```

### Phase 1: 全局设计系统（项目级任务）

每轮拉一个项目级任务做。

#### 1.1 ThemeConfig 落库 —— 对应任务 `D-theme`

如果 ThemeConfig 已经齐全（theme-generator 阶段做过），直接 update_plan_task 标 done + notes "已存在"。否则：

```
theme/set_intent { projectId, intent: "<基于 project.meta.styleDirection>" }
   → AI 生成基础 Token

theme/update_tokens { projectId, patch: {
   colors: {
     primary, secondary, neutral,
     semantic: { success, error, warning, info }
   },
   typography: { sizes, weights, lineHeights, fontFamilies },
   spacing: { xs, sm, md, lg, xl, ... },
   radii: { sm, md, lg, full },
   shadows: { sm, md, lg, xl },
   durations: { instant, fast, normal, slow },
   easings: { default, bounce, spring }
}}
```

#### 1.2 通用组件模板 —— 对应任务 `D-templates`

不为每个 input / button 单独写规格——通过 ThemeConfig token 引用 + `asset/save_as_template` 让所有实例自动一致。

第一个屏设计完按钮时立刻 `asset/save_as_template`，后续屏 `asset/instantiate` 复用。该任务通常在多屏设计推进过程中持续做（每抽出一个新模板就在 notes 追加），全部抽完才标 done。

---

### Phase 2: 逐屏视觉设计（屏级任务）

每屏 6 个任务，每轮 query/next_pending_task 拉一个做。

#### 任务执行通用流程

```
1. query/next_pending_task → 拿 D-X-* 任务
2. update_plan_task status='doing'
3. 执行（按下面对应小节方法）
4. 落 schema
5. update_plan_task status='done' + notes
```

#### Step 1: 视觉先行分析 —— 对应任务 `D-<screenId>-visual`

按 `visual-analysis-template.md` 的思维框架，给用户讲清楚（**简短 5-8 行**，不要长篇大论）：

```
1. 情感定位     这屏给用户什么感受（如"温暖治愈"、"克制专业"）
2. 信息层级     主-次-辅怎么用大小/颜色/间距体现
3. 视觉手段     用什么手法（柔和阴影 / 渐变 / 装饰元素 / 留白节奏 / 微动效）
4. 装饰元素分类 图形 / 插画 / 图标 / 光效——参考 decoration-elements-guide.md 决策
5. 素材需求     列出本屏需要哪些素材（让 design-executor 用 material-painter 处理）
6. 关键样式规格 颜色 token / 字号 / 间距 / 圆角 / 阴影 / 过渡（每个都精确到值）
7. 主题契合度   用到的所有值是否都在 ThemeConfig 范围内
```

> 真有方向性分歧（如"这屏走治愈风还是商务风"）才停下问一次。其余按专业判断推。

#### Step 2: 补全节点结构（widening 模式）—— 对应任务 `D-<screenId>-structure`

interaction-designer 阶段建了**触发节点骨架**（按钮 / 输入框等）。本步**只补 interaction 阶段没建的纯装饰 / 容器节点**——绝不破坏已有节点的 events。

```
对每个补充节点：
  element/add {
    projectId, parentId,
    name: "...",                  // PascalCase
    label: "...",                 // 中文展示名（可选）
    tag: "div" | "img" | "h1" | ...,
    styles: { ... },              // ★ 一次到位，全量；不允许"先建空容器后补样式"
    layoutHint?: "scroll-child" | "auto-size" | "fixed-height" | "fill-parent" | "sticky-header" | "sticky-footer",
    componentBoundary?: true      // Header/Footer/Card/Modal/Form 等语义容器置 true
  }
```

**红线**：
- 叶子文本节点（带 textContent 的 div）**不写 flex: 1**——会撑坏布局
- 装饰节点（背景图 / 光效 / 角标）必须用 position: absolute + z-index 分层

#### Step 3: 全量样式落库（★ 不允许 keyStyles 子集）—— 对应任务 `D-<screenId>-styles`

对每个节点（不管是 interaction 阶段建的还是 Step 2 新建的），**一次到位写完整样式**：

```
style/update {
  projectId, nodeId,
  styles: {
    // 布局
    display, flexDirection, alignItems, justifyContent, gap, padding, margin,
    width, height, minWidth, minHeight, maxWidth, maxHeight,
    position, top, right, bottom, left, zIndex,
    // 文字
    fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, color, textAlign,
    // 视觉
    backgroundColor, backgroundImage, borderRadius, border, boxShadow,
    opacity, transform,
    // 过渡
    transition,
    // 其他
    overflow, cursor
  }
}
```

**所有值必须用 Token 引用**：`$token:colors.primary` / `$token:spacing.md` / `$token:shadows.lg` / `$token:durations.normal $token:easings.default`。硬编码 → 整体打回。

#### Step 4: visualStates（状态完备性）—— 对应任务 `D-<screenId>-states`

对所有交互节点（按钮、输入框、链接、卡片等），按"variant × state"矩阵全格覆盖：

```
visual_state/add {
  projectId, nodeId,
  name: "hover" | "pressed" | "focus" | "disabled" | "error" | "loading" | "<custom>",
  styleOverrides: {
    // 只写与 default 状态有差异的属性
    backgroundColor: "$token:colors.primaryHover",
    boxShadow: "$token:shadows.lg"
  },
  childStateMap?: { ... },        // 父节点状态联动子节点（如父 hover 时子节点变色）
  transition?: "all $token:durations.fast $token:easings.default"
}
```

**红线**：
- 所有按钮**至少**：default + hover + pressed + disabled
- 所有输入框**至少**：default + focus + error
- 状态切换必须有 transition，不许"瞬间跳变"

#### Step 5: 写设计叙事到 meta（B 类）—— 对应任务 `D-<screenId>-meta`

每个**重要节点**（容器、组件根、关键交互节点）都要写设计意图：

```
meta/set_node {
  projectId, nodeId,
  patch: {
    design: {
      summary: "主按钮，体现 CTA 视觉权重",
      rationale: "用品牌主色 + 中等阴影，hover 抬升强化可点击感；圆角 12px 与卡片呼应",
      visualRef?: "...",          // 可选：素材文件 URI
      ref?: "..."                  // 可选：外部权威资料（figma 链接）
    }
  }
}
```

屏幕级：

```
meta/set_screen {
  projectId, screenId,
  patch: {
    design: {
      summary: "登录页主调温暖治愈，层级清晰，引导用户填写",
      palette: ["$token:colors.brand", "$token:colors.surface", "$token:colors.text.primary"]
    },
    status: { phase: "designed" }
  }
}
```

#### Step 6: ⛔ 自检（强制门禁）—— 对应任务 `D-<screenId>-integrity`

```
query/integrity { projectId, screenId }
```

期望：

| 规则 | 期望结果 | 不达标怎么办 |
|------|---------|------------|
| R-EVENTS-01/02 | 0 错误（应该上一阶段过了，这里 double-check） | 退回 interaction-designer |
| R-STATUS-02（声明 styles 完成但 styles 为空） | 0 错误 | 立刻补 style/update |
| R-STATUS-03（visualStates 不一致） | 0 错误 | 立刻补 visual_state/add |
| R-PHASE-01（phase 一致性） | 0 错误 | meta.status.phase 设成 "designed" |

**0 error 才允许进下一屏**；如有 error，立刻修。warning 可记录但 phase 不能进 `designed`。

---

### Phase 3: 跨屏一致性 audit —— 对应任务 `D-audit`

所有屏 Phase 2 完成后：

```
1. query/integrity { projectId } → 期望 0 error
   
2. 抽样核对（在对话回复里展示）：
   - 同种组件（如所有"主按钮"）在不同屏的样式是否一致
   - 颜色用得是否克制（不超过 1 主色 + 2 辅色 + N 中性灰）
   - 字号阶梯是否清晰（H1 > H2 > Body > Caption）
   - 间距是否成体系（4 / 8 / 12 / 16 / 24 / 32 这种 4 倍数）
   
3. 不一致 → 用 style/batch_update 统一调
4. 一致性确认后：phase 仍保持 "designed"（最终 verified 由 executor 写）
```

---

### Phase 4: 移交 executor —— 对应任务 `D-integrity` + `D-handover`

```
1. query/integrity { projectId } → 0 error 是必要条件
2. 在对话中给用户简要总结：N 屏已设计完，主要风格元素 X / Y / Z
3. 触发 design-executor 接手（material 应用 + 终验 + 快照）
```

---

## 每轮回复格式（每个 plan 任务一轮）

```
🎯 任务：[D-... / D-<screenId>-...] [任务标题]
🎨 思考产物：[本任务的思考结论，如视觉方向 / 装饰决策 / palette 选择，简短 1-3 行]
✅ 已落库：[schema 哪个字段被写了，如 "node X 的 styles 全量 / visualStates 4 态"]

📊 进度：[完成 X/Y 任务]
➡️ 下个任务：[next_pending_task 返回的 ID + 标题]
```

---

## 必须 / 禁止

### 必须

- 每屏 Step 1 视觉先行（情感 → 层级 → 手段 → 装饰 → 素材 → 规格 → 契合度）
- 每个决策回答"是什么 / 为什么 / 怎么做"三问
- 全量样式一次到位（一个节点的 style/update 必须完整，不允许"关键样式子集"）
- 所有色值 / 尺寸 / 时长走 Token 引用
- 所有按钮 ≥ 4 态（default/hover/pressed/disabled），输入框 ≥ 3 态（default/focus/error）
- 每个 variant × state 格子都要有值
- 跨屏复用走 `asset/save_as_template` + `asset/instantiate`
- 本屏 Step 6 integrity 0 error 才进下一屏

### 禁止

- 在工作区写 `design-plan/*.md` / `design-system.md` / `_component.json` 等任何文件
- 硬编码颜色 / 字号 / 间距（必须用 Token 引用）
- 自造 ThemeConfig 外色值（缺了就回去补 Token，不当场硬编码）
- "关键样式先写 / 留给 executor 补"——一次到位
- "hover 留到执行阶段补"——visualState 在本阶段就要全写
- 给纯文本叶子节点（带 textContent 的 div）写 flex: 1
- 全 CSS 不画素材（C 端每屏至少图标 / 装饰之一，特殊场景需逐条论证）
- 破坏 interaction 阶段已落的 events / stateInit（widening 模式：只新增不修改）

---

## 与下游技能的衔接

| schema 字段 | 下游消费方 | 消费方式 |
|------------|-----------|---------|
| `node.styles` 全量 | design-executor | 直接渲染 |
| `node.states[]`（visualState）| 运行时 / executor | hover/pressed 等切换 |
| `themeConfig` | 全局 | Token 解析为具体值 |
| `meta.design.visualRef` | design-executor | 触发 material-painter 画素材 |
| `meta.design.summary/rationale` | 派生 md / 设计交付物 | 给设计师 / QA 看 |

---

## 新会话续接

```
1. query/list_projects → 找 projectId
2. query/next_pending_task { projectId, scope: 'auto' }
   → stage='design' 的任务直接接续做
   → null 时跑 query/integrity 二检：若有 R-STATUS-* 错误立刻补；否则准备移交 design-executor
```

schema 即进度。

---

## references/（按需加载）

- `references/visual-analysis-template.md` — ★ 视觉分析思维框架（情感/层级/手段/装饰/素材/规格/契合度 7 步）
- `references/decoration-elements-guide.md` — 装饰元素分类 + 选择逻辑
- `references/decoration-patterns.md` — 装饰 CSS 实现模式速查
- `references/node-tree-redlines.md` — 节点结构 4 条红线（示例 + 正反对照）
- `references/mcp-tools-cheatsheet.md` — MCP 工具与设计任务的对应关系
