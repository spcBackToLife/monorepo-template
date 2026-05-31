# schema-spec：node.meta.status 完整字段

> 适用任务：`E-X-verified`、`E-integrity`

## 1. NodeStatus 接口

```typescript
interface NodeStatus {
  /** 阶段（必填）*/
  phase: 'analyzed' | 'interaction-defined' | 'designed' | 'built' | 'verified';

  /** 各维度是否就绪（由 integrity 自动核验，executor 不允许人工自报） */
  ready?: {
    structure?: boolean;
    styles?: boolean;
    events?: boolean;
    visualStates?: boolean;
    materials?: boolean;
  };

  /** 备注（可选） */
  notes?: string;
}
```

## 2. phase 推进规则（生命周期）

```
"analyzed"             ← product-analyst 写入
       ↓
"interaction-defined"  ← interaction-designer 写入
       ↓
"designed"             ← design-planner 写入
       ↓
"verified" ★           ← executor 写入（最终）
```

executor 阶段**只写 phase = "verified"**，不能跳过中间阶段（如 schema 还在 designed 时直接打 verified → R-PHASE-01）。

## 3. ready 由 integrity 自动核验（关键 ★）

**executor 绝不手动设置 ready 字段**——这些由 schema 内建的 integrity checker 自动核验：

```
ready.structure    ← rootNode.children.length > 0 自动判断
ready.styles       ← Object.keys(styles).length > 0 自动判断
ready.events       ← events 数组中有非空 actions 自动判断
ready.visualStates ← states 数组非空自动判断
ready.materials    ← materialProjectId 已绑定自动判断
```

如果手动设置 ready.* = true 但实际产物不齐 → R-STATUS-02/03 / R-PHASE-01 报错。

```jsonc
// ❌ 错（人工自报，integrity 会戳穿）
meta/set_node_status {
  status: {
    phase: "verified",
    ready: { structure: true, styles: true, events: true, visualStates: true, materials: true }
  }
}

// ✅ 对（只写 phase + notes，ready 由 integrity 自动核）
meta/set_node_status {
  status: {
    phase: "verified",
    notes: "已应用素材 mat_xyz, snapshot 通过 5 维核对"
  }
}
```

## 4. notes 字段（可选但推荐）

```jsonc
notes: "已应用素材 mat_xyz, snapshot 通过 5 维核对"
notes: "executor 补默认 backgroundSize:contain（design 漏写）"
notes: "重画 2 次后通过 qualityChecklist"
notes: "renderHint=css-gradient，无需绘制"
```

用途：
- 后续维护 AI 看 phase 推进历史
- 用户验收时看素材绑定情况
- 跨会话续接时快速理解

## 5. screen.meta.status

```jsonc
screen.meta.status.phase = "verified"   // 屏所有节点都 verified 后写
screen.meta.status.notes = "全屏 N 个素材已应用，integrity 0 error"
```

**条件**：屏内所有节点（含 overlays.rootNode 子树）的 phase = "verified" 才能写屏级 phase = "verified"。

## 6. project 没有顶级 phase 字段

整体项目验收通过的标志：
- 所有 screen.meta.status.phase = "verified"
- query/integrity { projectId } 0 error

不需要 project 层面 phase 字段。

## 7. MCP 调用

```jsonc
// 节点级
meta/set_node_status {
  projectId, nodeId,
  status: { phase: "verified", notes: "..." }
}

// 屏级
meta/set_screen { 
  projectId, screenId,
  patch: { status: { phase: "verified", notes: "..." } }
}
```

## 8. expectedArtifacts 验收（E-X-verified）

```jsonc
expectedArtifacts: [
  { kind: 'nonEmpty', path: 'meta.status.phase' },          // 屏 phase 已写
  { kind: 'eachItem', path: 'rootNode.children',
    check: { kind: 'nonEmpty', path: '$.meta.status.phase' } }  // 所有子节点 phase 已写
  // R-PHASE-01 由 checker 兜底
]
```

## 9. R-PHASE-01 判定

```
R-PHASE-01 触发条件：phase = "verified" 但 ready 仍有 false
```

意思：
- `meta/set_node_status { phase: "verified" }` 写入后
- integrity checker 自动核验 ready.{structure,styles,events,visualStates,materials}
- 任意一个被自动判定为 false → R-PHASE-01

**修复**：
- 找到哪个 ready 字段为 false → 路由到对应 SKILL（参考 methodology/03-issue-routing.md）
- ready.structure=false → product / interaction（节点骨架问题）
- ready.styles=false → design（styles 缺失）
- ready.events=false → interaction（events 缺失）
- ready.visualStates=false → design（visualStates 缺失）
- ready.materials=false → executor 自己（material-painter 重画）

## 10. 红线

- ❌ executor 手动写 ready.* = true → integrity 自动核验时会撞 R-STATUS-* / R-PHASE-01
- ❌ phase 推进顺序错（如 designed → 直接 verified 但跳过素材应用）→ R-PHASE-01
- ❌ 屏内某节点未 verified 就把屏 phase=verified
- ❌ phase=verified 后还在改 styles/events 等上游字段 → 越权
- ❌ notes 空话（"OK"）→ 失去维护价值
