# 模板：E-global-mat-\<overlay\>-\<node\>（全局 overlay 内素材绘制）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/mat-<overlay>-<node>.md`
> 结构与 mat.template.md 一致，仅路径与上下文不同（节点在 globalOverlays[*].rootNode 子树）。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-global-mat-<overlay>-<nodeName>
> 对应 schema 字段：globalOverlays[*].rootNode 子树内节点的 styles.backgroundImage / props.src + materialProjectId

## 1. 节点 materialSpec 摘要

```jsonc
overlay: "global-session-expired"
nodeId: "<lockIcon 节点 id>"
materialSpec: { kind: "illustration", renderHint: "png", referenceFrame: { width: 120, height: 120 }, ... }
```

## 2. token 解析
[同 mat.template.md §2]

## 3. material-painter 调用
[同 mat.template.md §3，注意 nodeId 是 globalOverlays 内的节点]

## 4. canvas 操作清单
[material-painter 内部]

## 5. qualityChecklist 核对
[同 mat.template.md §5]

## 6. 重画历史（如有）

## 7. ★ 沉淀到 schema 的结论

```jsonc
// material-painter 自动写入：
[节点 path].styles.backgroundImage = "url(...)"
[节点 path].materialProjectId = "mat_xyz"
```

⚠️ **expectedArtifacts**（注意路径要走 globalOverlays 而不是 rootNode）：
```jsonc
{ kind: 'nonEmpty', path: 'globalOverlays[<index>].rootNode...<nodeId>...materialProjectId' }
```

## 8. 后续约束
- E-global-snapshot 任务会在多个屏上验证全局 overlay 显示效果
```
