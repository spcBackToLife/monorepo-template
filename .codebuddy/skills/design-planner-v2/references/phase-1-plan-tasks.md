# Phase 1 任务清单模板（jsonc）

> 本文件适用任务：**仅首次进入本阶段时**用一次。
> 用法：把下列 jsonc 模板照抄到 `meta/add_plan_tasks` 调用，把 `X` 替换为对应 screenId。
> 三段独立：屏级（每屏一组）/ 项目级（一次性）/ 全局 overlay（仅当 project.globalOverlays 非空时）。

---

## 1. 屏级任务清单（每个 phase=interaction-defined 的屏 X 各挂一组）

```jsonc
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: X,
  tasks: [
    // === Phase A 取景 ===
    { id: "D-X-positioning", title: "Phase A 三层定位（产品/页面/用户场景）→ screen.meta.design.positioning",
      stage: "design", status: "pending",
      expectedArtifacts: [{ kind: 'nonEmpty', path: 'meta.design.positioning' }] },

    // === Phase B 设计目标提取 ===
    { id: "D-X-design-goals", title: "Phase B 提炼 ≥3 个具体可视判据的设计目标 → screen.meta.design.designGoals[]",
      stage: "design", status: "pending",
      expectedArtifacts: [
        { kind: 'arrayMin', path: 'meta.design.designGoals', min: 3 },
        { kind: 'eachItem', path: 'meta.design.designGoals',
          check: { kind: 'hasKeys', path: '$', keys: ['id','statement','whyMatters','impactMode','successCriteria','priority'] } }
      ] },

    // === Phase C 目标→元素拆解（每目标 1 个任务，在 Phase B done 后由 D-X-task-planning 自创）===
    // 任务 ID 形如 D-X-G<N>-decompose

    // === Phase D 跨目标统筹 ===
    { id: "D-X-cross-goal-strategy", title: "Phase D 元素×目标矩阵 + 权重金字塔 + 装饰系统 + 60-30-10 累积 → screen.meta.design.visualStrategy",
      stage: "design", status: "pending",
      expectedArtifacts: [{ kind: 'nonEmpty', path: 'meta.design.visualStrategy' }] },

    // === Phase E 任务派发（这是元任务，执行时自创 N 个 D-X-G<N>-craft 任务）===
    { id: "D-X-task-planning", title: "Phase E 基于 designGoals + goalElementMap 派发 N 个 D-X-G<N>-craft 任务（meta/add_plan_tasks）",
      stage: "design", status: "pending" },

    // === Phase F craft 任务 ===
    // 由 D-X-task-planning 自创，每目标 1 个，任务 ID 形如 D-X-G1-craft
    // expectedArtifacts: [{ kind: 'goalSuccessCriteriaMet', goalId: 'G<N>', screenId: '$' }]

    // === Phase G 兜底 + 整屏对账 ===
    { id: "D-X-coverage-fallback", title: "Phase G 兜底覆盖：未被任何 goal 涉及的节点写最小 styles + 交互节点 focus/disabled",
      stage: "design", status: "pending",
      expectedArtifacts: [{ kind: 'uncoveredNodesMinimalStyles', screenId: '$' }] },

    { id: "D-X-self-review-by-goals", title: "Phase G 整屏对账：逐 goal 截图核对 successCriteria + 跨 goal 协调度",
      stage: "design", status: "pending",
      expectedArtifacts: [{ kind: 'allGoalsCriteriaMet', screenId: '$', minScoreRatio: 0.8 }] },

    // === 收尾 ===
    { id: "D-X-meta", title: "meta.design 叙事落库（屏 + 各重要节点 summary / rationale / visualSpec / servingGoals）",
      stage: "design", status: "pending",
      expectedArtifacts: [
        { kind: 'nonEmpty', path: 'meta.design.summary' },
        { kind: 'nonEmpty', path: 'meta.design.palette' }
      ] },
    { id: "D-X-tree-redlines", title: "节点结构 4 红线核对", stage: "design", status: "pending" },
    { id: "D-X-coverage", title: "覆盖核对（衍生视图视觉规格 + 视觉权重金字塔实测）", stage: "design", status: "pending" },
    { id: "D-X-integrity", title: "本屏 integrity 自检", stage: "design", status: "pending" }
  ]
}
```

---

## 2. 项目级任务清单（一次性挂全）

```jsonc
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: "D-system-baseline", title: "基于 theme 建立设计系统基线", stage: "design", status: "pending" },
    { id: "D-templates", title: "通用业务组件抽模板", stage: "design", status: "pending",
      expectedArtifacts: [{ kind: 'arrayMin', path: 'componentAssets', min: 1 }] },
    { id: "D-audit", title: "跨屏一致性 audit", stage: "design", status: "pending" },
    { id: "D-token-coverage", title: "$token: 引用率核查（≥ 95%）", stage: "design", status: "pending" },
    { id: "D-integrity", title: "全项目 integrity 自检", stage: "design", status: "pending" },
    { id: "D-handover", title: "移交 design-executor", stage: "design", status: "pending" }
  ]
}
```

---

## 3. 全局 overlay 视觉规格（仅当 `project.globalOverlays` 非空时挂）

```jsonc
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: "D-global-overlay-styles", title: "全局 overlays 节点全量样式", stage: "design", status: "pending",
      expectedArtifacts: [{ kind: 'eachItem', path: 'globalOverlays',
        check: { kind: 'nonEmpty', path: '$.rootNode.styles' } }] },
    { id: "D-global-overlay-states", title: "全局 overlays visualStates", stage: "design", status: "pending" },
    { id: "D-global-overlay-materials", title: "全局 overlays 内的素材规格 + 调 material-painter 画", stage: "design", status: "pending" },
    { id: "D-global-overlay-audit", title: "全局 overlays 跨屏并存的视觉协调性 audit", stage: "design", status: "pending" }
  ]
}
```

---

## 4. 自创任务规则（Phase E 执行时）

`D-X-task-planning` 任务执行时，需要根据当前 `designGoals` 与 `goalElementMap` 自创下游任务：

- 每个 goal G<N> 对应 1 个 `D-X-G<N>-decompose` 任务（Phase C 拆解）
- 每个 goal G<N> 对应 1 个 `D-X-G<N>-craft` 任务（Phase F 落库）
- craft 任务的 `expectedArtifacts` 必含 `{ kind: 'goalSuccessCriteriaMet', goalId: 'G<N>', screenId: '$' }`
- ⚠️ 禁按字段类别拆任务（`D-X-styles` / `D-X-states` / `D-X-materials` / `D-X-decorations` 等一律拒绝）
- ⚠️ 禁创建抽象推理任务（`D-X-emotion` / `D-X-hierarchy` / `D-X-budget` 等一律拒绝）
