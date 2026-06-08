> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-G{N}-craft
> 对应 schema 字段：多个（涉及 styles / states / materials / structure / layout / meta）
> 服务目标：G{N} - <goal.statement>
> 必读方法论：methodology/07-craft-execution.md + methodology/04-multi-element-coordination.md
> 必读 schema-spec：node-styles + visual-states + decoration-nodes + material-spec + node-meta-design + forbidden-fields-design
> 必读其他：../common/references/screenshot-tool.md（截图工具）

# D-{screenId}-G{N}-craft — 目标 G{N} craft（Phase F）

## 0. 重述目标

| 项 | 内容 |
|---|---|
| **goalId** | G{N} |
| **statement** | <goal.statement> |
| **whyMatters** | <goal.whyMatters> |
| **impactMode** | <impactMode> |
| **priority** | <P0/P1/P2> |
| **successCriteria** | 1. ... 2. ... 3. ... |
| **forbiddenSignals** | 1. ... 2. ... |

来自 design-goals.md G{N} + goalElementMap[G{N}]。

---

## 1. 当前 vs 目标（each involved element）

| 元素 | role / weightInGoal | 当前状态（screen_schema 实测） | 目标状态 |
|---|---|---|---|
| <node1> | 主体 / 5 | backgroundColor: "..." | backgroundColor: "$token:colors.warmCanvas" |
| <node2> | 主角 / 9 | 占位虚线 / 无 materialProjectId | 真画字标 + applyMaterialDesign |
| <node3> | 邻居 / 4 | boxShadow: "$token:shadows.sm" | boxShadow: "$token:shadows.warmSoft" |
| ... | | | |

---

## 2. 改动方案（按维度,但同一任务内执行）

### 2.1 layout / structure

```jsonc
// element/add 装饰节点
{
  action: "element/add",
  parent: "screen",
  node: { name: "BgBlobBottomLeft", type: "div", meta: { design: { kind: "decoration", servingGoals: ["G{N}"], summary: "..." } } }
}

// element/wrap (如需)
{
  action: "element/wrap",
  targets: [...],
  wrapper: { ... }
}
```

### 2.2 styles

```jsonc
// style/batch_update
{
  updates: [
    { nodeId: "<node1>", styles: { ... } },
    { nodeId: "<node3>", styles: { ... } },
    // 仅 G{N} 涉及节点
  ]
}
```

⚠️ 不能改非涉及节点 (其他 goal / 兜底 / 业务)。

### 2.3 visualStates

```jsonc
// visual_state/add 或 update
{
  nodeId: "<node>",
  states: [
    { name: "<state-name>", styleOverrides: { ... }, ... }
  ]
}
```

### 2.4 materials（如涉及）

material-painter brief（仅给目标 + 概念,不给施工图）：

```
视觉目标: 服务 G{N} <statement>
概念关键词: ["...", "...", "..."]
theme.intent: <minimal+flat / ...>
装饰系统: <soft-glow / ...>
60-30-10 角色: 10% 强调 / 30% 次要 / 60% 主导
节点尺寸: 120×120
上下文: <屏底色 / 周围节点 / 不能与什么融合>
token 池: ["primary", "primaryLight", "background", ...]
失败案例: <如有>
你需要自己决定的: 概念隐喻 / 构成规划 / 笔触粗细 / safe-zone / 构图层数
```

painter 完成后:

```jsonc
// applyMaterialDesign
{ nodeId: "<node>", materialProjectId: "<painter 给的 ID>" }
```

### 2.5 meta 更新

```jsonc
// meta/set_node (per node, 含 servingGoals)
{
  nodeId: "<node>",
  patch: {
    design: {
      summary: "...",
      servingGoals: ["G{N}", ...],   // 累加
      visualSpec: { ... }
    }
  }
}
```

---

## 3. 预期视觉效果

[一段话描述 craft 完成后,首屏视觉应该是什么样:具体到位置 + 色 + 形状 + 装饰]

---

## 4. 落库执行（Step 4）

按 §2 顺序调 MCP,**全部在本任务内完成**：

- [ ] Step 4.1 layout / structure
- [ ] Step 4.2 styles
- [ ] Step 4.3 visualStates
- [ ] Step 4.4 materials (调 painter + applyMaterialDesign)
- [ ] Step 4.5 meta 更新

---

## 5. 自审段（Step 5-6: 截图 + 对账）

### 5.1 截图

```bash
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
```

截图路径: <填入实际路径>

Read 看图后填入下面的"像素级观察"。

### 5.2 successCriteria 逐条核对

#### Criteria 1: <复述判据>
- **判定**: ✅ pass / ❌ fail
- **像素级观察**: <从截图具体观察到什么,如"取屏底中心点 RGB ≈ (248,244,238) 距 #FFFFFF 21pt ≥ 5pt 阈值">

#### Criteria 2: <复述判据>
- **判定**: ✅ pass / ❌ fail
- **像素级观察**: <...>

#### Criteria 3: <复述判据>
- **判定**: ✅ pass / ❌ fail
- **像素级观察**: <...>

### 5.3 forbiddenSignals 检查

#### Forbidden 1: <复述>
- **触发**: ❌ no / ✅ yes
- **观察**: <...>

#### Forbidden 2: <复述>
- **触发**: ❌ no / ✅ yes
- **观察**: <...>

### 5.4 总判定

- 通过条数: <X/Y>
- forbidden 触发: <0 / N>
- 当前轮次: <1/3 / 2/3 / 3/3>
- **结果**: ✅ 全过 / ❌ 重做 / ⚠️ 3 轮不达 → challenge

### 5.5 重做计划（如不达）

- 不达 Criteria <N>: <原因> → 改动方案 <具体什么改>
- 第 <N+1> 轮重做开始: <时间>

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// 多个 MCP 调用合集（与 §2 改动方案 1:1）
[
  // structure
  element/add { ... },
  
  // styles
  style/batch_update { updates: [...] },
  
  // visualStates
  visual_state/add { nodeId: "<node>", states: [...] },
  
  // materials
  // (调 material-painter SKILL → 完成后 applyMaterialDesign)
  applyMaterialDesign { nodeId: "<node>", materialProjectId: "..." },
  
  // meta
  meta/set_node { nodeId: "<node>", patch: { design: { servingGoals: ["G{N}"], ... } } },
  
  // 任务 done
  meta/update_plan_task {
    taskId: "D-{screenId}-G{N}-craft",
    patch: {
      status: "done",
      notes: "md: design/{screenId}/craft-G{N}.md  截图: <path>  自审通过 X/Y successCriteria"
    }
  }
]
```

---

## 7. 自检

- [ ] 涉及元素全部改动到目标状态
- [ ] 仅改 G{N} 涉及节点（不动其他 goal / 兜底 / 业务节点）
- [ ] styles 全 $token: 引用
- [ ] structure 新建节点挂 kind + servingGoals
- [ ] materials brief 不含 pathData / 坐标 / hex / 构图层数
- [ ] meta 更新含 servingGoals: ["G{N}"]
- [ ] 截图已跑 + Read 看过
- [ ] successCriteria 逐条像素级核对（不"4/5"模板）
- [ ] forbiddenSignals 全检
- [ ] 全过 → 标 done
- [ ] 不达 → 重做 (≤ 3 轮),3 轮仍不达 → challenge
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1
