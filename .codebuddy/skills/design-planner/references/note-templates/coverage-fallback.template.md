> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-coverage-fallback
> 对应 schema 字段：未被 goalElementMap 覆盖节点的 styles + 交互节点 visualStates
> 必读方法论：methodology/12-state-visual-mapping.md（业务态映射）

# D-{screenId}-coverage-fallback — 覆盖兜底（Phase G）

## 0. 任务目的

所有 D-X-G<N>-craft 任务完成后,屏内仍有可能存在节点未被任何 goal 涉及（如纯文本叶子 / 装饰图标 / 间距容器）。

本任务的目的：给这些节点写**最小完整 styles + 必要 visualStates**,确保整屏没有"光秃秃" 的节点。

---

## 1. 未涉及节点扫描

### 1.1 计算未涉及集合

```
allScreenNodes = query/screen_schema { projectId, screenId } 全部节点
involvedNodes = union of (goalElementMap[g].involvedElements for g in designGoals)
uncoveredNodes = allScreenNodes \ involvedNodes
```

### 1.2 未涉及节点列表

| 节点 ID | 节点类型 | 当前 styles | 是交互节点？ |
|---|---|---|---|
| <node1> | div | empty / minimal | 否 |
| <node2> | input | empty | 是 (需补 focus / disabled) |
| <node3> | div | empty | 否 |
| ... | | | |

---

## 2. 兜底 styles 规则

### 2.1 通用 styles 兜底（所有未涉及节点）

```
display: 默认按节点类型定 (div=block, span=inline, ...)
font: 继承父节点
color: 继承父节点 textPrimary

不允许:
  - flex: 1 给纯文本叶子
  - 颜色硬编码（必须 $token:）
```

### 2.2 容器节点兜底

```jsonc
{
  display: "flex" / "block",  // 按上下文
  // 间距按 spacing 档位
}
```

### 2.3 文本叶子兜底

```jsonc
{
  fontSize: "$token:typography.body.fontSize",
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "$token:typography.body.lineHeight",
  color: "$token:colors.textSecondary"  // 默认弱化（避免抢戏）
}
```

### 2.4 交互节点兜底（必须）

| 节点类型 | 必有 visualStates |
|---|---|
| button | hover / pressed / disabled / focus |
| input | focus / disabled / error |
| select | focus / disabled |
| label / a | hover |

如果节点无对应 visualState,必须在本任务补齐。

---

## 3. 兜底 visualStates 规则

### 3.1 button hover/pressed/focus/disabled

```jsonc
[
  { name: "hover", styleOverrides: { opacity: 0.9, cursor: "pointer" } },
  { name: "pressed", styleOverrides: { transform: "scale(0.98)" } },
  { name: "focus", styleOverrides: { outline: "2px solid $token:colors.borderFocus" } },
  { name: "disabled", styleOverrides: { opacity: 0.4, pointerEvents: "none" } }
]
```

### 3.2 input focus/disabled/error

```jsonc
[
  { name: "focus", styleOverrides: { borderColor: "$token:colors.borderFocus", boxShadow: "0 0 0 3px $token:colors.primaryLight" } },
  { name: "disabled", styleOverrides: { backgroundColor: "$token:colors.surface", cursor: "not-allowed" } },
  { name: "error", styleOverrides: { borderColor: "$token:colors.error" } }
]
```

---

## 4. ★ 沉淀到 schema 的结论

```jsonc
// MCP: style/batch_update（仅 uncoveredNodes）
{
  updates: [
    { nodeId: "<node1>", styles: { ... } },
    { nodeId: "<node2>", styles: { ... } },
    // ...
  ]
}

// MCP: visual_state/add（交互节点必备态）
[
  { nodeId: "<button>", states: [hover, pressed, focus, disabled] },
  { nodeId: "<input>", states: [focus, disabled, error] },
  // ...
]

// 任务 done
meta/update_plan_task {
  taskId: "D-{screenId}-coverage-fallback",
  patch: {
    status: "done",
    notes: "兜底 N 个节点 styles + M 个交互节点 visualStates"
  }
  // service 端跑 expectedArtifacts: { kind: 'uncoveredNodesMinimalStyles' }
}
```

---

## 5. 自检

- [ ] 未涉及节点列表完整（与 goalElementMap 对账）
- [ ] 所有兜底节点都有 styles（不再"光秃秃"）
- [ ] 所有 styles 用 $token: 引用
- [ ] 交互节点必备态（hover/focus/disabled/error）齐全
- [ ] 兜底改动**不影响**任何 goal 涉及节点（仅改 uncoveredNodes）
- [ ] 末尾「★ 沉淀到 schema 的结论」与 MCP 调用 1:1
