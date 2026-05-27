---
name: design-executor
description: 将 design-plan/ 规划文档转化为设计编辑器中的实际项目。核心模式：深度检索设计文档 → 生成细粒度执行清单 → 逐项执行（加载对应子技能）→ 验证+回读确认 → 关闭。支持中断续做、组件/素材并行。触发词："执行设计"、"搭建页面"、"新建项目开始设计"、"把设计做出来"、"开始实现"。
---

# design-executor

**设计规划 → 设计 Schema 的逐项执行器**。

核心哲学：**深度检索、逐项执行、回读验证、零遗漏**。

```
❌ 旧模式（粗略浏览→批量执行）:
  扫一眼 plan.md → 凭印象创建几个大区块 → 样式笼统/组件缺失/状态丢失
  
✅ 新模式（深度检索→逐项执行→回读验证）:
  逐文件深度检索 → 提取每个节点+样式+事件 → 展开组件内部结构
  → 生成精确到节点级的执行清单 → 逐项执行+每项回读设计文档验证
```

---

## 角色定位

本技能是**项目经理 + QA + 需求分析师**：

| 职责 | 说明 |
|------|------|
| 🔍 深度检索 | 逐文件读取设计文档，提取每个节点、样式、事件、绑定 |
| 📋 精确拆解 | 生成节点级执行清单，展开组件内部结构 |
| 🎯 逐项派发 | 加载子技能，给足精确上下文（样式具体值、不是"参考设计"） |
| ✅ 回读验证 | 每完成一个区块，回读 index.md/visual.md 确认无遗漏 |
| 📊 进度追踪 | 维护 EXEC-CHECKLIST.md，支持中断续做 |

---

## 触发条件

- 用户说"执行设计"、"搭建页面"、"把设计做出来"、"新建项目"、"开始实现"
- 存在 `design-plan/` 文件夹（至少有 design-system.md + 1 个页面文件夹）

## 不触发

- 没有 design-plan/ → 先触发 `design-planner`
- 只想改单个样式 → 直接用 `page-builder`
- 只想画一个素材 → 直接用 `material-painter`

---

## 输入源（不再依赖 plan.md）

executor 的唯一输入是 design-plan/ 下的**详细设计文档**：

```
design-plan/
├── design-system.md              ← 全局 Token（ThemeConfig 来源）
└── pages/[NN]-[name]/
    ├── index.md                  ← 核心！节点树+样式+数据+事件
    ├── visual.md                 ← 样式规格清单+装饰策略
    ├── components/[name].md      ← 组件内部结构+交互
    ├── components/[name].visual.md ← 组件视觉规格
    └── materials/[ID]-[name].md  ← 素材绘制指令
```

**⚠️ plan.md 不是必需文件，executor 不依赖它。**
如果存在可作为概览参考，但任务提取必须从详细文档中进行。

---

## 工作流

### Phase 0: 上下文收集

```
1. 定位 design-plan/ 路径
2. 列出所有页面文件夹（pages/*/）
3. 读 EXEC-CHECKLIST.md（如存在）→ 恢复进度
4. MCP: query/project_info → 确认项目是否已创建
5. MCP: theme/check → 确认主题已定制
6. 告知用户当前进度 + 本次计划执行哪些任务
```

---

### Phase 1: 深度检索 & 生成执行清单

**这是最关键的阶段。必须深度读取，不可跳步。**

#### 1.1 文档检索策略（每个页面必须执行）

```
对每个页面文件夹，按以下顺序读取并提取任务：

Step 1: 读 index.md §9（节点结构树）
  → 逐行解析，每个节点变成一个搭建任务
  → 记录每个节点的: 名称、父节点、类型、样式关键词、标注
  → 特别注意标注:
    - [素材:X] → 该节点需要素材绘制
    - [组件:X] → 该节点需要展开组件内部结构（见 Step 5）
    - [event:X] → 该节点需要绑定事件
    - [visibleWhen:X] → 该节点需要条件显示
    - [repeat:X] → 该节点需要列表绑定
    - [bind:X] → 该节点需要双向绑定
    - [layoutHint:X] → 注意布局提示

Step 2: 读 index.md §4（区块详细设计）
  → 提取每个元素的精确样式值（px/色值/token）
  → 这些值直接用于 style/update 调用，不可省略或近似

Step 3: 读 visual.md §6（样式规格清单）
  → 交叉验证 Step 2 的样式是否完整
  → 补充 Step 2 可能遗漏的细节（如 glow、box-shadow、特殊效果）

Step 4: 读 index.md §7-8（数据与交互）
  → 提取数据源定义（含 mock 场景）
  → 提取 stateInit.view 所有变量
  → 提取 stateInit.data 初始值
  → 提取事件流（每个事件变成一个绑定任务）
  → 提取 visibleWhen/repeat/bind 规则

Step 5: 遍历 components/*.md（组件展开 — 核心！）
  → 对节点树中标注 [组件:X] 的位置：
  → 读取该组件的 .md 文件 §2（结构设计）
  → 把组件内部节点展开为子任务
  → 示例：
    节点树: └── visibility-sheet [组件:VisibilitySheet]
    展开为:
      - sheet-root (fixed, 毛玻璃)
        - drag-bar (居中短横条)
        - title "选择谁能看到"
        - options-list (3个选项行)
        - confirm-btn

Step 6: 遍历 materials/*.md
  → 每个素材文件变成一个绘制任务
  → 记录: 素材ID、参考框尺寸、目标节点、绘制要求

Step 7: 交互覆盖验证（防遗漏！）
  → 读 index.md §6（状态完整矩阵）
  → 对每个状态，确认节点树中有对应的 DOM 结构：
    - 状态 "exhausted" → 需要 exhausted-sheet 节点
    - 状态 "empty_result" → 需要 empty-state 节点
    - 状态 "onboarding" → 需要 onboarding-overlay 节点
    - 状态 "no_location" → 需要权限提示节点
  → 如果节点树中缺少某状态的结构：
    - 从组件文档或交互描述中推导结构
    - 添加到执行清单
```

#### 1.2 执行清单生成规则

```
按以下维度拆分任务:

一个"任务单元" = 一个区块（容器+所有直接子节点+样式）

示例: "搭建 NavBar 区块" 包含:
  - 创建容器 nav-bar（含布局样式、毛玻璃、sticky）
  - 创建 cancel-btn（含文字、颜色、点击事件）
  - 创建 title（含文字、字体、颜色）
  - 创建 publish-btn（含文字、颜色、渐变/禁用双态、点击事件）
  → 这是一个任务单元

拆分原则:
  - 同层级的兄弟容器可以独立为不同任务
  - 一个容器+它的直接子节点 = 一个任务
  - 组件展开后的内部结构 = 独立任务
  - 样式精度: 必须包含设计文档中的每个 CSS 属性值
```

#### 1.3 EXEC-CHECKLIST 必须包含的信息

每个任务条目必须包含:
- 精确的节点列表（名称+类型+父子关系）
- 精确的样式值（来自 index.md §4 + visual.md §6）
- 事件/绑定/条件显示（来自 index.md §7-8）
- 验证标准（可检查的具体条件）

```markdown
| # | 任务 | 节点数 | 关键样式 | 含事件 | 验证标准 |
|---|------|:---:|---------|:---:|---------|
| A-02 | NavBar区块 | 4 | 毛玻璃+sticky+flex-row+padding:12px 16px | cancel:click→back, publish:click→发布 | 3子元素可见+毛玻璃生效 |
```

---

### Phase 2: 逐项执行

#### 2.0 节点聚合检索（每个任务执行前的必做步骤）

**核心策略: 自下而上，为每个要实施的节点从多个文件中聚合完整规格。**

```
对于即将搭建的区块中的每个节点 X:

信息聚合源:
  ┌─ index.md §9 (节点树) → 结构: type, name, parent, 标注
  ├─ index.md §4 (区块设计) → 样式表格: 该元素的CSS属性
  ├─ visual.md §6 (样式规格) → 补充: glow/shadow/特殊效果的精确值
  ├─ index.md §7-8 (数据/事件) → 行为: events, bind, visibleWhen, repeat
  ├─ components/X.md §2 (如果是组件) → 展开: 内部子节点完整结构
  ├─ components/X.md §3 (如果是组件) → 状态: visual_state 各变体样式
  └─ materials/X.md §6 (如果含素材) → 绘制: 参考框尺寸+指令

聚合后的节点规格 = {
  structure: { type, name, parent, layoutHint },
  styles: { ...精确CSS属性对象 },
  props: { textContent, children },
  events: [{ trigger, condition, actions }],
  visibleWhen: "表达式" | null,
  visualStates: { hover: {...}, active: {...}, disabled: {...} },
  bind: { path } | null,
  repeat: { expression, template } | null,
  material: { id, refSize } | null
}

❌ 禁止: 从记忆中"大概记得"某个节点的样式是什么
✅ 必须: 每次都 read_file 对应文档片段，精确提取值
```

**为什么这个策略能防止信息丢失:**
- 信息分散在 5+ 个文件中，单靠"读一遍"不可能记住所有细节
- 每次执行前的聚合步骤强制从源文件中提取，不依赖记忆
- 聚合后的规格是完整的，传给子技能时不会遗漏

#### 2.1 单任务执行流程

```
1. 从 EXEC-CHECKLIST.md 取下一个 ⬜ 任务
2. ⭐ 回读对应设计文档片段（不是从记忆中取，必须重新读文件）
   - 读 index.md 中该区块的§4描述
   - 读 visual.md §6 中该区块相关的样式规格行
3. 加载子技能 (use_skill → page-builder 或 material-painter)
4. 向子技能提供精确上下文（见下方模板）
5. 执行
6. ⭐ 完成后回读验证:
   - 重新读 index.md 该区块部分
   - 对照每个样式属性是否已设置
   - 对照每个子节点是否已创建
   - 对照每个事件是否已绑定
7. 通过 → ✅ | 缺失 → 立即补全
```

#### 2.2 给子技能的精确上下文

**给 page-builder 搭建区块**:
```
任务: 搭建 [区块名]
项目: projectId=[xxx], screenId=[xxx]
父节点: [nodeId]

✅ 精确节点清单（逐个创建）:
1. [节点名] (type:[tag]) — 样式: {具体CSS对象}
2. [子节点名] (type:[tag]) — 样式: {具体CSS对象}, 内容: "xxx"
3. ...

✅ 精确样式值（来自 visual.md §6）:
- 容器: backgroundColor:#141420, borderRadius:24px 24px 0 0, padding:20px
- 文字: fontSize:16px, color:rgba(255,255,255,0.95), lineHeight:1.6
- 按钮激活态: background:linear-gradient(135deg,#4F8CFF,#7C5CFC), boxShadow:0 0 12px rgba(79,140,255,0.3)
- 按钮禁用态: background:#252540, color:rgba(255,255,255,0.35)

✅ 事件绑定:
- cancel-btn: click → nav.back()
- publish-btn: click → condition(content!='') → effect.fetch + state.set

✅ 条件显示/绑定:
- pulse-ring: visibleWhen: {{ !state.view.locationReady }}
- textarea: bind → state.view.content

验证标准:
[每个节点存在 + 样式正确 + 事件已绑]
```

**❌ 禁止的笼统上下文**:
```
任务: 搭建编辑区
参考: 见 index.md §4.3
→ 这种指导必然导致遗漏！
```

---

### Phase 3: 回读验证（不可跳过）

每完成一个区块后，**必须回读设计文档验证**:

```
回读验证流程:
1. 重新 read_file index.md → 定位该区块描述
2. 逐行对照:
   - □ 节点数量匹配？（设计文档说4个子元素，实际创建了4个？）
   - □ 每个节点类型正确？（span/div/button/img）
   - □ 每个样式属性已设置？（逐条对照 visual.md §6）
   - □ 文字内容正确？（textContent 值）
   - □ 事件已绑定？（trigger + actions）
   - □ 条件显示已设？（visibleWhen 表达式）
   - □ 数据绑定已设？（bind/repeat）
3. 发现缺失 → 立即补全（不等到"验证阶段"）
4. 全部通过 → 标记 ✅ 进入下一个
```

**⚠️ 组件展开验证（额外步骤）:**
```
对标注 [组件:X] 的节点:
1. 读 components/[X].md 的 §2 结构设计
2. 确认组件内部每个节点已创建
3. 读 components/[X].md 的 §3 状态矩阵 → 确认 visual_state 已添加
4. 读 components/[X].md 的 §5 交互行为 → 确认事件已绑定
```

---

### Phase 4: 页面级完整性验证

一个页面的所有区块+组件+素材完成后：

```
完整性验证清单:
1. □ 节点树完整: 对照 index.md §9 的每一行，确认节点存在
2. □ 状态覆盖: 对照 index.md §6 的每个状态，确认有对应结构
3. □ 样式完整: 对照 visual.md §6 的每一行，确认属性已设
4. □ 数据完整: 对照 index.md §7 的每个数据源/变量/事件
5. □ 素材完整: 对照 materials/ 目录，每个 .md 对应一个已绘制的素材
6. □ 组件完整: 每个 components/*.md 的结构已展开并搭建
7. generate_snapshots → 截图确认视觉效果
```

---

## 执行节奏

```
每次会话建议工作量:
  - 1个页面的1个区块（含完整样式+事件）
  - 或1-2个素材绘制
  - 每个任务完成后立即回读验证

对话开始时:
  1. 读 EXEC-CHECKLIST.md → 找到当前断点
  2. 回读对应页面的 index.md + visual.md
  3. 告知用户: "本次执行: [具体任务]，来源: index.md §X"
  4. 开始执行

单个任务执行时:
  1. read_file 对应设计文档片段（每次都读，不靠记忆）
  2. 加载子技能 (use_skill)
  3. 提供精确上下文（含每个属性的具体值）
  4. 执行
  5. 回读验证
  6. 更新 EXEC-CHECKLIST.md
  7. 反馈: "✅ A-02 NavBar | 4节点+3事件 | 下一个: A-03"
```

---

## 关键约束

### 必须遵守

- ✅ **每次执行前必须 read_file 设计文档** — 不靠记忆，不凭印象
- ✅ **样式值必须精确** — 从 visual.md §6 逐行提取，不可近似
- ✅ **组件必须展开** — 读 components/*.md 展开内部结构
- ✅ **回读验证** — 完成后重新读文档，逐行对照
- ✅ **状态全覆盖** — index.md §6 的每个状态都有对应节点

### 绝对禁止

- ❌ 不得"凭记忆"搭建 — 必须每次 read_file
- ❌ 不得笼统搭建 — "搭个NavBar"不行，必须精确到每个子节点+样式值
- ❌ 不得跳过组件展开 — 看到 [组件:X] 必须读 components/X.md
- ❌ 不得跳过状态结构 — 看到状态矩阵有9个状态，节点树里必须有对应结构
- ❌ 不得使用 plan.md 作为任务源 — 必须从详细设计文档提取

---

## 与其他技能的关系

```
design-planner (规划 what → 产出 design-plan/ 详细文档)
        ↓
design-executor (深度检索 + 调度 how → 逐项执行)
        ↓ 加载子技能
        ├── page-builder (搭建节点/样式/事件)
        └── material-painter (绘制素材/导出应用)
```
