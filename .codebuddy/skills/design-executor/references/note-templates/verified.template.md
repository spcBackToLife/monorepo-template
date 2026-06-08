# 模板：E-X-verified（节点 phase + 本屏 integrity）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/<screenId>/verified.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-verified
> 对应 schema 字段：每节点 meta.status.phase + screen.meta.status.phase

## 1. 屏内节点清单

| 节点 ID | 节点名 | 上一阶段 phase | 本阶段处理 | 新 phase |
|---------|--------|---------------|-----------|---------|
| n1 | HeaderArea | designed | (容器无素材) | verified |
| n2 | BrandLogo | designed | mat 已应用 | verified |
| n4 | FormCard | designed | (容器无素材) | verified |
| n6 | PhoneInput | designed | (无素材) | verified |
| n9 | SubmitBtn | designed | (无素材) | verified |
| n14 | PinkCircleDeco | designed | css-gradient skipped | verified |
| n15 | MintLeafDeco | designed | mat 已应用 | verified |
| n16 | OrnamentSep | designed | svg 已内联 | verified |
| ... | | | | |

overlays（屏级）:
| overlay id | rootNode 子节点处理 | 新 phase |
|-----------|---------------------|---------|
| overlay-locked-sheet | 内部 LockIcon mat 已应用 | verified |

## 2. phase 推进操作

```jsonc
// 节点级
[每节点 meta/set_node_status 调用]

meta/set_node_status {
  projectId, nodeId: "n1",
  status: { phase: "verified", notes: "容器节点，无素材需求" }
}

meta/set_node_status {
  projectId, nodeId: "n2",
  status: { phase: "verified", notes: "已应用素材 mat_xyz, qualityChecklist 全通过" }
}

[继续每个节点...]

// 屏级（所有节点 verified 后写）
meta/set_screen {
  projectId, screenId,
  patch: {
    status: {
      phase: "verified",
      notes: "全屏 N 个素材已应用 / SVG 已内联，snapshot 5 维核对通过"
    }
  }
}
```

⚠️ **绝不手动设置 ready 字段**——由 integrity 自动核验。

## 3. 本屏 integrity 自检

```jsonc
query/integrity { projectId, screenId }
```

期望：0 error

如有 R-* 错误：
- R-PHASE-01：phase=verified 但 ready 仍有 false → 按 ready 分项路由（详见 methodology/03-issue-routing.md）
- R-PLAN-01：屏内 done 任务的 expectedArtifacts 不再满足 → 立刻补
- 上游 R-EVENTS-* / R-STATUS-* / R-VIEW-* / R-MATERIAL-* 等 → 按 issue-routing 退回上游

## 4. 不通过怎么办

```
R-PHASE-01 触发：phase=verified 但 ready.materials=false（某节点漏应用素材）
  ↓
1. 找到漏的节点（看是哪个 mat-* 任务漏了）
2. 重做对应任务
3. 重跑 integrity → 通过

R-STATUS-02 触发：ready.styles=true 但 styles 为空
  ↓
退回 design-planner（不在 executor 阶段补）
本任务标 status:'pending' 等用户切回再做
```

## 5. ★ 沉淀到 schema 的结论

```jsonc
// 1. 每节点 phase 推进（见 §2）
[每个 meta/set_node_status 调用]

// 2. 屏级 phase 推进
meta/set_screen { ..., patch: { status: { phase: "verified", notes: "..." } } }

// 3. integrity 0 error 验收
```

⚠️ **expectedArtifacts 验收**：
```jsonc
[
  { kind: 'nonEmpty', path: 'meta.status.phase' },          // 屏 phase 已写
  { kind: 'eachItem', path: 'rootNode.children',
    check: { kind: 'nonEmpty', path: '$.meta.status.phase' } }  // 所有子节点 phase 已写
  // R-PHASE-01 由 checker 兜底
]
```

⚠️ **后续任务约束**：
- 本任务通过 = 本屏 design 阶段完成
- E-cross-screen-snapshot / E-integrity 在所有屏完成后跑
```
