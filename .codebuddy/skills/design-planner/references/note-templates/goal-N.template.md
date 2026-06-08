> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-G{N}-decompose
> 对应 schema 字段：screen.meta.design.goalElementMap[<对应 goalId 项>]
> 服务目标：G{N} - <goal.statement>
> 必读方法论：methodology/03-goal-decomposition.md + methodology/04-multi-element-coordination.md

# D-{screenId}-G{N}-decompose — 目标 → 元素拆解（Phase C 核心）

## 0. 上游输入

| 来源 | 内容 |
|---|---|
| design-goals.md G{N} | statement / successCriteria / impactMode / forbiddenSignals |
| screen_schema | 全屏节点列表 + 当前 styles / states / structure |
| theme.tokens | 可用 token 池 |

---

## 1. Step 1 — 涉及元素扫描（≥ 2 个）

| 节点 ID | 节点类型 | 服务于本 goal 的方式 | 是否涉及 |
|---|---|---|---|
| <node1> | <type> | <说明:它的改动如何影响 successCriteria> | ✅ |
| <node2> | <type> | ... | ✅ |
| <node3> | | <跳过理由> | ❌ |
| ... | | | |

**最终 involvedElements**: [node1, node2, ..., nodeN] (共 N 个)

---

## 2. Step 2 — 元素角色分配

| 节点 | 角色 | weightInGoal | 理由 |
|---|---|---|---|
| <node1> | 主体 | 5 | <理由> |
| <node2> | 主角 | 7 | <理由> |
| <node3> | 配角 | 6 | |
| <node4> | 邻居 | 4 | |
| <node5> | 父容器 | 1 | |
| <node6> | 装饰 | 3 | |
| <node7> | 装饰 | 3 | |

**约束验证**:
- ✅ 主角 ≥ 1
- ✅ 主体 ≤ 1
- ✅ 装饰最高 ≤ 3

---

## 3. Step 3 — 5 维 changes 列举

⚠️ 必须涵盖 ≥ 2 维度。

### 3.1 styles changes

```jsonc
[
  {
    nodeId: "<node>",
    patch: { backgroundColor: "$token:colors.X", ... },
    rationale: "服务 G{N}: <为什么这样改>"
  }
  // ...
]
```

⚠️ 全部 $token: 引用,无硬编码。若 token 缺位 → §6 走 UpstreamChallenge。

### 3.2 structure changes

```jsonc
[
  {
    action: "element/add | element/wrap | element/move",
    parent: "<parentId>",   // for add
    targets: [...],          // for wrap
    node: {                  // for add
      name: "<NewNode>",
      type: "div",
      meta: {
        design: {
          kind: "decoration | visual-container | material-frame",
          servingGoals: ["G{N}"],
          summary: "..."
        }
      }
    },
    rationale: "..."
  }
]
```

### 3.3 materials changes

⚠️ brief 仅给目标 + 概念 + 节点尺寸 + token 池 + 失败案例,**禁止 pathData / 坐标 / hex / 构图层数**。

```jsonc
[
  {
    nodeId: "<node>",
    brief: {
      visualGoal: "服务 G{N}: <一句话>",
      conceptKeywords: ["<keyword1>", "<keyword2>", "<keyword3>"],
      themeIntent: "<theme.aesthetics + theme.intent>",
      decorationSystem: "<soft-glow | illustration | ...>",
      colorRoleIn603010: "<60% 主导 / 30% 次要 / 10% 强调>",
      nodeSize: "<width x height>",
      contextHint: "<屏底色 / 周围节点 / 不能与什么融合>",
      tokenPool: ["primary", "primaryLight", ...],
      failureCase: "<上一版失败案例,如有>",
      whatPainterDecides: [
        "概念隐喻",
        "构成规划",
        "笔触粗细 / safe-zone / 构图层数",
        "..."
      ]
    }
  }
]
```

### 3.4 visualStates changes

```jsonc
[
  {
    nodeId: "<node>",
    states: [
      {
        name: "<state-name>",
        styleOverrides: { ... },
        childrenStates: [...],
        activeWhen: "...",
        rationale: "服务 G{N}: <为什么这态>"
      }
    ]
  }
]
```

### 3.5 layout changes

```jsonc
[
  {
    nodeId: "<node>",
    patch: { padding: "$token:spacing.X", margin: ... },
    rationale: "服务 G{N}: <布局调整服务于哪个 successCriteria>"
  }
]
```

⚠️ 布局调整必须服务 goal,孤立改 padding 被 R-GOAL-COVERAGE 拒。

---

## 4. Step 4 — 权重分配（本 goal 内,见 §2 表）

权重金字塔约束验证：

- 主角与配角 weight 差 ≥ 2: <验证>
- 配角与邻居 weight 差 ≥ 1: <验证>
- 装饰最高 ≤ 3: <验证>
- 总和 ≤ 25: <计算>

---

## 5. Step 5 — 协同关系（4 角色）

```jsonc
coordination: {
  主体: "<screen / 大背景元素>",
  主角: "<第一视觉锚点>",
  邻居: ["<配合不抢戏的元素>"],
  父容器: "<提供视觉呼吸的容器>",
  装饰: ["<强化氛围的装饰节点>"]
}
```

**协同模式**: <参考 methodology/04 的 7 种典型模式,选 1>

---

## 6. Step 6 — 达成判据 measure

```jsonc
measure: {
  snapshotCheck: "<截图后人工 / AI 怎么核对>",
  refSimilarity: <0.0 - 1.0,可选>,
  forbiddenSignals: [
    "<出现这个信号即 fail>",
    "<...>"
  ]
}
```

---

## 7. UpstreamChallenge 触发判定（如有）

| 情况 | 是否触发 |
|---|---|
| theme.tokens 缺关键 token | ❌ 无 / ✅ 触发,详见 challenge md |
| interaction 骨架不支持 | ❌ 无 / ✅ 触发 |

如触发,先停下写 challenge md,本任务进 blocked 态。

---

## 8. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen (深合并 goalElementMap 数组,只追加 / 更新当前 G{N} 一项)
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      goalElementMap: [
        // ... 其他已 done 的 goal 项保留
        {
          goalId: "G{N}",
          involvedElements: [
            { nodeId: "...", role: "...", weightInGoal: ... },
            // ...
          ],
          changes: {
            styles: [...],
            structure: [...],
            materials: [...],
            visualStates: [...],
            layout: [...]
          },
          coordination: {
            主体: "...",
            主角: "...",
            邻居: [...],
            父容器: "...",
            装饰: [...]
          },
          measure: {
            snapshotCheck: "...",
            refSimilarity: ...,
            forbiddenSignals: [...]
          }
        }
      ]
    }
  }
}
```

---

## 9. 自检

- [ ] involvedElements ≥ 2
- [ ] 每元素 role ∈ 6 类枚举
- [ ] 主角 ≥ 1
- [ ] changes 涵盖 ≥ 2 维度
- [ ] 所有 styles patch $token: 引用
- [ ] structure 新建节点都挂 kind + servingGoals
- [ ] materials brief 不含 pathData / 坐标 / hex / 构图层数
- [ ] weightAllocation 总和 ≤ 25
- [ ] coordination 4 角色非空,符合 7 种典型协同模式之一
- [ ] measure.snapshotCheck 具体可视
- [ ] measure.forbiddenSignals ≥ 2 条
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1
