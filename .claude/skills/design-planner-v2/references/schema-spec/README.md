# design-planner schema-spec/

本目录是"写 schema 时的字段精确清单"——告诉 AI **写什么字段、写到哪、必填哪些、红线是什么**。methodology 告诉 AI 怎么想;schema-spec 告诉 AI 怎么写。

---

## 文件清单

| 文件 | 内容 | 强制加载时机 |
|---|---|---|
| `screen-meta-design.md` | screen.meta.design 完整字段（positioning / designGoals / goalElementMap / visualStrategy / summary / palette / layers / componentBudgets）+ screen.backgroundColor | `D-X-positioning` / `D-X-design-goals` / `D-X-G<N>-decompose` / `D-X-cross-goal-strategy` / `D-X-meta` / `D-audit` |
| `goal-success-criteria.md` | successCriteria 接口 + 可视判据三大类（色彩 / 尺寸 / 权重）+ 各 impactMode 推荐 successCriteria 模板 + forbiddenSignals 写法 | `D-X-design-goals` / `D-X-G<N>-craft` 自审段 / `D-X-self-review-by-goals` |
| `node-styles.md` | node.styles 一次到位规范 + token 引用规则 + 完整样式维度清单 | `D-X-G<N>-craft` / `D-system-baseline` / `D-token-coverage` / `D-global-overlay-styles` |
| `visual-states.md` | VisualState 完整字段（styles / styleOverrides / childrenStates / childrenVisibility / disabledEvents / activeWhen / transition）| `D-X-G<N>-craft` 涉及 visualStates / `D-global-overlay-states` |
| `node-meta-design.md` | node.meta.design 完整字段（含 kind ∈ ['decoration','visual-container','material-frame'] + servingGoals 必填规则）| `D-X-meta` / `D-X-G<N>-craft` 落 meta 前 |
| `material-spec.md` | MaterialSpec 接口 + design 自跑 painter manifest（materialProjectId / applyMaterialDesign / 自审截图）| `D-X-G<N>-craft` 涉及素材 / `D-global-overlay-materials` |
| `decoration-nodes.md` | 装饰节点追加规则（4 类 + position:absolute 强制 + 必挂 servingGoals）| `D-X-G<N>-craft` 加装饰节点时 |
| `global-overlay-design.md` | 项目级 globalOverlays 视觉规格 | 任意 `D-global-overlay-*` |
| `derivative-view-styles.md` | 7 类衍生视图节点的样式规格要点 | `D-X-coverage` / 涉及衍生视图的 `D-X-G<N>-craft` |
| `forbidden-fields-design.md` | design 阶段字段边界（放开 6 创作权 + 收紧业务字段）+ 红线总表 | `D-X-integrity`;任何时刻发现想写非法字段 |

---

## 加载策略

- 每次落 schema 前必读对应文件（避免拼写错 / 误写非法字段）
- 可以从已加载的内存中复用上一屏的同类知识,但**字段表每次重读**（防止漂移）
- `forbidden-fields-design.md` 有"自检 mental check"段落,第一次落 schema 时建议把它读进上下文

---

## 红线总表（service 端校验）

| 红线 | 触发条件 | 落点字段 |
|---|---|---|
| **R-STATUS-02** | ready.styles=true 但 styles 空 | screen.meta.status |
| **R-STATUS-03** | ready.visualStates=true 但 states[] 空 | screen.meta.status |
| **R-PHASE-01** | screen.meta.status.phase = "designed" 但 ready 仍有 false | screen.meta.status |
| **R-PLAN-01** | 任意 done 任务的 expectedArtifacts 当前不再满足 | meta/update_plan_task |
| **R-STRUCTURE-02** | 节点 styles 用了硬编码颜色 | node.styles |
| **R-MATERIAL-01 / 02** | 素材规格红线 | node.meta.design.materialSpec |
| **R-VISUALSTATE-01** | 交互节点缺必要状态 | node.states |
| **R-TOKEN-COVERAGE** | $token: 引用率 < 95% | 全屏 styles |
| **R-GOAL-COUNT** | designGoals < 3 或 > 7 | screen.meta.design.designGoals |
| **R-GOAL-STATEMENT** | statement 不含动词+主体+视觉机制 | designGoals[].statement |
| **R-GOAL-CRITERIA** | successCriteria 含抽象描述 / < 3 条 | designGoals[].successCriteria |
| **R-GOAL-DECOMPOSE** | involvedElements < 2 / 主角 = 0 | goalElementMap[].involvedElements |
| **R-GOAL-DIMENSION** | changes 单维度 | goalElementMap[].changes |
| **R-GOAL-COVERAGE** | goal 涉及元素被 craft 没改动 | (运行时,跑 craft 时) |
| **R-ORPHAN-DECORATION** | 装饰/视觉容器/素材帧节点无 servingGoals | node.meta.design.servingGoals |
| **R-INVALID-KIND** | 设计阶段新建节点未挂 kind | node.meta.design.kind |
| **R-INVALID-GOAL-REF** | servingGoals 引用 goalId 不存在 | node.meta.design.servingGoals |
| **R-DECORATION-MULTI-FAMILY** | 一屏内出现 ≥ 2 装饰族 | screen.meta.design.visualStrategy.decorationSystem.family |

详细字段细节在各 schema-spec 文件,红线完整边界查 `forbidden-fields-design.md`。

---

## 核心信念

> **设计目标驱动 = 让"用户感受到 X"成为唯一真理；styles / states / materials / decorations / 布局都是它的实现手段。任何不挂在某个目标下的改动都是"无目的填字段",必须拒。**
