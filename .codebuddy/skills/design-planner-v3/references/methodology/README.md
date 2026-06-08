# design-planner methodology/

> 视觉设计的"思维框架"——告诉 AI **怎么想问题**。
> 本目录与其他三处分工：
> - `schema-spec/` → 写什么字段
> - `note-templates/` → md 怎么填
> - `pitfalls/` → 哪里会翻车
> - `recipes/` → 可以照抄什么

---

## 文件清单

### 入场总纲

| 文件 | 内容 |
|---|---|
| `00-design-thinking.md` | 设计思维总纲 / 8 Phase 总览 / 目标驱动心智 / 心智自检 / 反模式 |

### Phase A 取景

| 文件 | 内容 |
|---|---|
| `01-positioning.md` | 三层定位（产品 / 页面 / 用户场景）+ 竞品视觉对照 + visualTiming 三档 |

### Phase B 设计目标提取

| 文件 | 内容 |
|---|---|
| `02-goal-extraction.md` | 从 positioning 提炼设计目标的 5 步法 + impactMode 7 分类 + statement / successCriteria 正反例 |
| `10-material-analysis.md` | 素材需求分析方法论（Phase B/C 必读）：从设计目标推导素材类型、元素级素材结合分析、素材风格与 theme 对齐 |

### Phase C 目标→元素拆解

### Phase C 目标→元素拆解

| 文件 | 内容 |
|---|---|
| `03-goal-decomposition.md` | 每目标拆涉及元素 + 5 维 changes + weightAllocation + coordination + measure 的 6 步法 |
| `04-multi-element-coordination.md` | 4 角色（主体/邻居/父容器/装饰）+ 7 种典型协同模式（CTA / Mood / Trust / Hierarchy / State / Brand / Decoration）|

### Phase D 跨目标统筹

| 文件 | 内容 |
|---|---|
| `05-cross-goal-audit.md` | 元素 × 目标矩阵 / 权重终值 / 装饰族选定 / 60-30-10 累积 / 形状 / 字号 / 律动累积 |
| `06-decoration-system.md` | 装饰系统单一族 + 5 系统对照,从 goal 频次推导 + 装饰透明度 ≥ 20% 强约束 |

### Phase F craft 执行

| 文件 | 内容 |
|---|---|
| `07-craft-execution.md` | goal-craft 任务的 7 步执行流（多元素一次性落库 + 截图对账 + 3 轮迭代上限）|
| `10-material-brief.md` | painter brief 边界（goal+concept+约束,禁施工图）|
| `11-layout-adjustment.md` | 布局调整边界（design 改什么 / 不改什么 / 怎么调）|
| `12-state-visual-mapping.md` | 业务态视觉化（state.view ↔ visualState）映射 5 步流程 |

### Phase G 自审与对账

| 文件 | 内容 |
|---|---|
| `09-self-review-by-goals.md` | 按 goal 对账 successCriteria 逐条核对（0/1 计分,80% 阈值,3 轮迭代,不达挂 challenge）|

### 项目级 / 跨屏

| 文件 | 内容 |
|---|---|
| `03-atomic-design.md` | Atomic Design 组件分层 + 跨屏复用判定 |
| `05-derivative-view-design.md` | 7 类衍生视图节点视觉规格 |
| `06-visualstates-completeness.md` | visualStates 完备性矩阵 |
| `07-cross-screen-audit.md` | 跨屏一致性 audit 5 维度 |
| `08-node-tree-redlines.md` | 节点结构 4 红线 |

---

## 加载策略（progressive disclosure）

1. **入场启动** → 必读 `00-design-thinking.md`（总纲,建立目标驱动心智）
2. **拿到具体任务后** → 查本文档的"什么时候读哪个"速查表,按需 read 对应 methodology 文件
3. **需要具体 CSS 配方时** → 查 `../recipes/README.md` 索引,按需 read 对应 recipes 文件
4. **连续做多个同类任务** → 内存中已有可复用,但落 schema 前重读对应文件
5. **禁止一次性全读** —— 每次只读当前任务必需的文件,避免 context 浪费

> 详细任务 → 必读文件映射见 `../../SKILL.md` §3（设计流程）。

---

## 核心信念

> **视觉设计 = 用具体可视判据的设计目标驱动多元素协同改动；不是按字段类别给所有节点遍历填值。**

详见 `00-design-thinking.md`。
