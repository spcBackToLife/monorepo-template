# 模板：E-global-inventory（全局 overlay 内素材清单）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/inventory.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-global-inventory
> 对应 schema 字段：本任务以列清单为主；产物是后续挂的 global-mat-* 子任务

## 1. globalOverlays 概览

```jsonc
query/project_info { projectId }
→ project.globalOverlays = [
  { id: "global-offline-banner", rootNode: {...} },
  { id: "global-session-expired", rootNode: {...} },
  { id: "global-app-update", rootNode: {...} },
  { id: "global-error-boundary", rootNode: {...} }
]
```

## 2. 遍历每个 overlay 内的素材节点

| overlay | 节点 | kind | renderHint | 任务 ID | 处理 |
|---------|------|------|-----------|---------|------|
| global-offline-banner | WifiOffIcon | icon | svg | E-global-svg-OfflineBanner-WifiOffIcon | 内联 SVG |
| global-session-expired | LockIcon | illustration | png | E-global-mat-SessionExpired-LockIcon | material-painter |
| global-app-update | UpdateIllustration | illustration | png | E-global-mat-AppUpdate-Illustration | material-painter |
| global-error-boundary | ErrorIllustration | illustration | png | E-global-mat-ErrorBoundary-Illustration | material-painter |

统计：
- PNG 素材：3 个
- SVG 素材：1 个
- 总：4 个

## 3. 增量挂载子任务

```jsonc
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: "E-global-mat-SessionExpired-LockIcon", title: "应用 LockIcon (PNG)",   stage: "executor", status: "pending",
      expectedArtifacts: [...] },
    { id: "E-global-mat-AppUpdate-Illustration",  title: "应用 UpdateIllustration", stage: "executor", status: "pending", ... },
    { id: "E-global-mat-ErrorBoundary-Illustration", title: "应用 ErrorIllustration", stage: "executor", status: "pending", ... },
    { id: "E-global-svg-OfflineBanner-WifiOffIcon", title: "OfflineBanner WifiOffIcon (SVG)", stage: "executor", status: "pending", ... }
  ]
}
```

## 4. 项目无 globalOverlays（少见）

```
status: skipped
notes: "项目无 globalOverlays，无需全局素材任务"
```

## 5. ★ 沉淀到 schema 的结论

本任务以"挂任务清单"为产物——结论是 §3 的 meta/add_plan_tasks 调用。
```
