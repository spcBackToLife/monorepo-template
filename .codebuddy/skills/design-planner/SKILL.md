---
name: design-planner
description: 应用 UI 设计技能（Schema-First）。当用户要求设计完整应用或多页面功能模块时触发。基于已有 product/interaction 阶段的 schema（含 stateInit/events/dataSources），按"视觉先行 → 节点+全量样式 → visualStates → meta 叙事"的顺序，把所有设计决策直接落到 schema。不再产出 design-plan/*.md 作为信息源——所有产物即 schema。
---

# design-planner（Schema-First）

> **核心原则**：schema 是唯一信息源。视觉分析的思考过程在对话中给用户看；最终决策全部走 MCP 落到 `node.styles` / `visualStates` / `themeConfig` / `node.meta.design`。

---

## Phase 0：环境准备 + 上游门禁

### 0.1 强制前置阅读

每次启动必须先读：

```
read_file: .claude/skills/common/references/v2-actions-cheatsheet.md   # 表达式约定
read_file: .claude/skills/design-planner/references/visual-analysis-template.md
read_file: .claude/skills/design-planner/references/decoration-elements-guide.md
read_file: .claude/skills/design-planner/references/decoration-patterns.md
read_file: .claude/skills/design-planner/references/node-tree-redlines.md
```

### 0.2 schema 上下文摸排

```
1. query/project_info { projectId }
   → 读 project.meta：targetUser / styleDirection / coreScenarios / modules
   → 读 navigation：哪些屏、跳转关系

2. 对每屏 query/screen_schema { projectId, screenId }
   → 读 screen.meta.product：每屏定位 / 信息架构
   → 读 screen.meta.interaction：状态机 / 操作清单
   → 读 stateInit / events / dataSources：交互骨架是否齐
   → 读 rootNode（interaction-designer 阶段建好的触发节点骨架）

3. 入场门禁：query/integrity { projectId }
   → 必须 0 个 R-EVENTS-01 / R-EVENTS-02 / R-PHASE-01
   → 否则退回 interaction-designer 补，不能"将就开始"
```

### 0.3 主题门禁

```
theme/check { projectId }
→ customized = false → 必须先唤起 theme-generator 完成主题
→ customized = true → theme/get 读 ThemeConfig 拿 Token
```

---

## Phase 1：全局设计系统（项目级一次性）

### 1.1 ThemeConfig 落库

如果 theme-generator 已经完成，跳过。否则：

```
theme/set_intent { projectId, intent: "..." }
   → 让 AI 基于 project.meta.styleDirection 生成 Token

theme/update_tokens { projectId, patch: {
   colors: { primary, secondary, neutral, semantic: { success, error, ... } },
   typography: { sizes, weights, lineHeights, fontFamilies },
   spacing, radii, shadows, durations, easings
}}
```

### 1.2 基础组件规格在哪？

> ⚠️ **不再写 `design-plan/design-system.md`**。基础组件（input/button/picker/checkbox 等）的规格走两条路：

- **可复用模板**：用 `asset/save_as_template` 把第一个完整设计的按钮/输入框保存为组件模板，后续屏幕用 `asset/instantiate` 复用。
- **Token 引用**：所有 styles 写 `$token:colors.primary` / `$token:spacing.md` 等引用形式（不写硬编码颜色/尺寸），保证全局一致。

---

## Phase 2：逐屏视觉先行 + 落库（核心阶段）

> 每屏一轮，**必须**按 Step 1 → Step 5 顺序执行；Step 5 自检通过才能进下一屏。

### Step 1：视觉先行（对话中输出，不写文件）

按 `visual-analysis-template.md` 的思维框架，**在对话回复里**给用户讲清楚：

1. **情感定位**：这屏要给用户什么感受（如"温暖治愈/克制专业/活力鲜明"）
2. **层级建设**：主-次-辅信息层级如何用大小/颜色/间距体现
3. **视觉手段**：用什么手法承担情感（柔和阴影 / 渐变 / 装饰元素 / 留白节奏）
4. **装饰元素分类**：图形/插画/图标/光效——参考 `decoration-elements-guide.md` 决策
5. **素材需求清单**：列出本屏需要哪些素材（让后续 design-executor 用 material-painter 处理）
6. **样式规格清单**：每个**关键节点**的精确样式（颜色 token / 字号 / 间距 / 圆角 / 阴影 / 过渡）
7. **主题契合度核对**：用到的颜色/尺寸是否都在 ThemeConfig token 范围内

> ⚠️ Step 1 的输出**不是写到 md 文件**，而是在对话回复里简短展示视觉思考过程（情感/层级/手段一两行）+ **直接进 Step 2 开始落库**。不暂停征询——用户随时可以打断调整方向。
>
> 真有方向性分歧（如"治愈风还是商务风"）才在落库前问一次。其余按 ThemeConfig 和 styleDirection 推。

### Step 2：补全节点结构（widening 模式）

interaction-designer 阶段已经建了**触发节点骨架**（按钮/输入框等）。这一步**只补 interaction 阶段没建的纯装饰/容器节点**——**绝不破坏已有节点的 events**。

```
对每个补充节点：
  element/add {
    projectId, parentId,
    name: "...",                  // PascalCase
    label: "...",                 // 中文展示名（可选）
    tag: "div" | "img" | "h1" | ...,
    styles: { ... },              // ★ 一次到位，全量；不允许"先建空容器后补样式"
    layoutHint?: "scroll-child" | "auto-size" | "fixed-height" | "fill-parent" | "sticky-header" | "sticky-footer",
    componentBoundary?: true      // 对 Header/Footer/Card/Modal/Form 等语义容器置 true
  }
```

**关键判断**：
- 若一个组件（如 form-card / app-bar）会跨多屏复用，第一次出现时建好后立刻 `asset/save_as_template` 存模板，后续 `asset/instantiate` 复用——无需"通用 vs 专属"的目录划分。

### Step 3：全量样式落库（★ 不再有 keyStyles 概念）

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
    overflow, cursor, ...
  }
}
```

**红线**：
1. ❌ 禁止"只写关键样式留给 executor 补"——一次到位，因为 executor 阶段不再做样式翻译
2. ❌ 禁止硬编码颜色/尺寸/字号——必须用 `$token:colors.primary` / `$token:spacing.md` 形式引用 ThemeConfig
3. ❌ 禁止给纯文本叶子节点（带 textContent 的 div）写 `flex: 1`——会撑坏布局；只设固定宽或 auto

### Step 4：visualStates（hover / pressed / focus / disabled / error 等）

对所有交互节点（按钮、输入框、链接、卡片等）：

```
visual_state/add {
  projectId, nodeId,
  name: "hover" | "pressed" | "focus" | "disabled" | "error" | "<custom>",
  styleOverrides: {
    // 只写与 default 状态有差异的属性
    backgroundColor: "$token:colors.primaryHover",
    boxShadow: "$token:shadows.lg"
  },
  childStateMap?: { ... },        // 如父节点 hover 时，子节点联动的状态
  transition?: "all 200ms ease"
}
```

**红线**：所有按钮**至少**要有 hover + pressed + disabled 三态；输入框至少 focus + error 两态。

### Step 5：写 meta.design 叙事（B 类）

对每个**重要节点**（容器、组件根、关键交互节点）写设计意图：

```
meta/set_node {
  projectId, nodeId,
  patch: {
    design: {
      summary: "主按钮，体现页面 CTA",
      rationale: "用品牌主色 + 中等阴影，hover 抬升强化可点击感",
      ref?: "...",                // 可选：指向外部权威资料（如设计稿 figma 链接）
      visualRef?: "..."           // 可选：素材文件 URI（如果有）
    }
  }
}
```

对屏幕级：

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

### Step 6：本屏自检（强制门禁）

```
query/integrity { projectId, screenId }
```

**必须满足**：
- 0 个 `R-STATUS-02` 错误（声明 styles 完成但 styles 为空）
- 0 个 `R-STATUS-03` 错误（声明 visualStates 完成但 states 不一致）
- 0 个 `R-EVENTS-01/02`（应该已经在 interaction 阶段过了，这里只是 double-check）

有 error → **立即修，不允许进下一屏**。warning 可以先记录，但 phase 不能进 `designed`。

---

## Phase 3：跨屏一致性 audit

每屏都做完 Phase 2 后，整体 audit：

```
1. query/integrity { projectId }
   → 期望 0 error
   
2. 抽样核对（对话中给用户看）：
   - 同一种组件（如所有"主按钮"）在不同屏的样式是否一致
   - 颜色用得是否克制（不超过 1 主色 + 2 辅色 + N 中性灰）
   - 字号阶梯是否清晰（H1 > H2 > Body > Caption）
   - 间距是否成体系（4 / 8 / 12 / 16 / 24 / 32 这种 4 的倍数）
   
3. 不一致 → 用 style/batch_update 统一调
4. 一致性确认后：phase 仍保持 "designed"（最终 verified 由 executor 阶段写）
```

---

## Phase 4：移交 executor

```
1. query/integrity { projectId }
   → 0 error 是必要条件
   
2. 与用户确认设计完成
3. 触发 design-executor 接手（material 应用 + 终验 + 快照）
```

---

## ⛔ Schema-First 红线

1. **不允许写任何文件到工作区**：
   - ❌ `design-plan/design-system.md`
   - ❌ `design-plan/pages/<id>/visual.md`
   - ❌ `design-plan/pages/<id>/index.md`
   - ❌ `design-plan/components/<name>/<name>.md`
   - ❌ `design-plan/pages/<id>/materials/<name>.md`
   - ❌ `design-registry/pages/<id>/<node>.json` 的 design 层（registry 本身已废弃）

2. **不允许"留给 executor 补样式"**：每次 `style/update` 必须是节点的完整样式，不是关键样式子集。

3. **所有视觉值走 Token 引用**：直接写硬编码颜色/字号 → 整体被打回。

4. **本屏 integrity 不通过不进下一屏**：上游交接的纪律延续到本阶段。

5. **不破坏 interaction 阶段的 events / stateInit**：design-planner 是**广延（widening）**模式——只新增节点和样式，不删 / 不改其他阶段已落的字段。

---

## references/

- `references/visual-analysis-template.md` — ★ 视觉分析思维框架（保留，但不再产出 md 文件）
- `references/decoration-elements-guide.md` — 装饰元素分类 + 选择逻辑
- `references/decoration-patterns.md` — 装饰 CSS 实现模式速查
- `references/node-tree-redlines.md` — 节点结构红线（仍适用，但通过 schema 校验）

> ⚠️ 以下 references 在 Schema-First 改造后**已不再使用**，等 P3 一起删：
> - `references/page-design-template.md`（index.md 模板）
> - `references/component-design-template.md`（[name].md 模板）
> - `references/material-design-template.md`（素材文档模板，由 material-painter 主导）
> - `references/design-system-template.md`（design-system.md 模板）
> - `references/validation-checklist.md`（被 query/integrity 取代）
> - `references/registry-protocol.md`（registry 已废弃）

---

## 跨会话继续

```
1. query/integrity { projectId }   → 列出还有哪些 R-STATUS-02/03 错误
2. 找第一个未 designed 的屏幕（screen.meta.status.phase ≠ 'designed'）
3. 从该屏 Phase 2 Step 1 继续
```

不再依赖 PLAN.md 文件——schema 本身就是进度记录。
