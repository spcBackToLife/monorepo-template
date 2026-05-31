# design-planner methodology/

> 视觉设计的"思维框架"——告诉 AI **怎么想问题**。
> 本目录与其他三处分工：
> - `schema-spec/` → 写什么字段
> - `note-templates/` → md 怎么填
> - `pitfalls/` → 哪里会翻车
> - `recipes/` → 可以照抄什么
>
> ★ = 高频；★★ = v3 新增/重写。

## v3 文件清单（21 份）

### 入场总纲

| 文件 | 内容 |
|------|------|
| `00-design-thinking.md` ★★ | 设计思维总纲 / 8-Phase 总览 / 6 项创作权 / 创作者 vs 字段填写员 |

### Phase A 取景

| 文件 | 内容 |
|------|------|
| `01-briefing.md` ★★ | 取景方法 4 维度（核心任务 / 成功标准 / mood / 关键词 ≤ 3）|

### 视觉先行 + 视觉预算

| 文件 | 内容 |
|------|------|
| `01-visual-first.md` ★ | 视觉先行原则 + 7 步思考框架 |
| `02-visual-budget.md` ★★ | 视觉权重金字塔 + minSignals + weight 量化公式（v3 重写）|

### Phase B 视觉概念

| 文件 | 内容 |
|------|------|
| `02-visual-concept.md` ★★ | mood / 灵魂句 / 关键词 3 个 / 反例 |

### Phase C 视觉策略 5 维

| 文件 | 内容 |
|------|------|
| `03-color.md` ★★ | 60-30-10 调色策略 + 主辅强用法 |
| `04-typography.md` ★★ | 字号节奏 + 字重对比 + 字距 |
| `05-shape.md` ★★ | 形状语言 4 基调 + 圆角档位 |
| `06-decoration.md` ★★ | 装饰系统单一族 + 5 系统简介 + 密度档位 |
| `07-rhythm.md` ★★ | 间距与动效律动 |

### 7 类衍生视图 + 系统设计

| 文件 | 内容 |
|------|------|
| `03-atomic-design.md` | Atomic Design 组件分层 + 跨屏复用 |
| `04-decoration-categories.md` ★ | 装饰元素 7 大类 |
| `05-derivative-view-design.md` ★ | 7 类衍生视图节点视觉规格 |

### 状态完备 + Phase E 协同视觉

| 文件 | 内容 |
|------|------|
| `06-visualstates-completeness.md` ★★ | visualStates 完备性矩阵 + §7 业务态来源（v3 升级）|
| `09-coordinated-visual.md` ★★ | 协同视觉 4 角色（主体/邻居/父容器/装饰）|
| `10-state-visual-mapping.md` ★★ | 业务态 → visualState 映射 5 步流程 |
| `11-layout-adjustment.md` ★★ | 布局调整边界（design 改什么 / 不改什么）|
| `12-material-painting-flow.md` ★★ | 素材绘制工作流（v3：design 自跑 painter）|

### 跨屏 audit + Phase F 自审

| 文件 | 内容 |
|------|------|
| `07-cross-screen-audit.md` | 跨屏一致性 audit 5 维度 |
| `08-node-tree-redlines.md` | 节点结构 4 红线 |
| `13-self-review-rubric.md` ★★ | 5 维度自审评分标尺（识别/层次/状态/契合/情绪）|

---

## 加载策略

- 第一次执行某类任务 → 必须 read 对应文件
- 入场启动 → 必读 `00-design-thinking.md`（总纲）
- 每屏首次进 Phase 2 → 必读 `01-visual-first.md` + `02-visual-budget.md`（视觉根基）
- 连续做多个同类任务 → 内存中已有可复用，但模板仍每屏重读以避免漂移

详细任务 → 必读文件映射见 `../../SKILL.md` §4.X 与 §12。
