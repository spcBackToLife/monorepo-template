# 模板：E-X-inventory（本屏素材清单）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/<screenId>/inventory.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-inventory
> 对应 schema 字段：本任务以列清单为主；产物是后续挂的 mat-* / svg-* 子任务

## 1. 扫描方法

```jsonc
query/screen_schema { projectId, screenId } → 拿完整节点树 + screen.overlays
```

遍历 rootNode + overlays.rootNode，收集所有 `meta.design.materialSpec` 非空的节点。

## 2. 素材清单（按 renderHint 分类）

| 节点 ID | 节点名 | kind | renderHint | 任务 ID | 处理 |
|---------|--------|------|-----------|---------|------|
| n2 | BrandLogo | brand | png | E-00-mat-BrandLogo | material-painter |
| n14 | PinkCircleDeco | decoration | css-gradient | E-00-mat-PinkCircleDeco | skipped（design styles 已表达）|
| n15 | MintLeafDeco | decoration | png | E-00-mat-MintLeafDeco | material-painter |
| n16 | OrnamentSep | decoration | svg | E-00-svg-OrnamentSep | 内联 SVG |
| n_loadingSpinner | (overlays) | icon | svg | E-00-svg-LoadingSpinner | 内联 SVG |

统计：
- PNG 素材：N 个 → 各挂 mat-* 任务
- SVG 素材：M 个 → 各挂 svg-* 任务
- CSS 已表达：K 个 → 直接 skipped
- 总素材节点：N + M + K = ___

## 3. 增量挂载子任务

```jsonc
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId,
  tasks: [
    { id: "E-00-mat-BrandLogo",      title: "应用素材到 BrandLogo (PNG)",      stage: "executor", status: "pending",
      expectedArtifacts: [{ kind: 'nonEmpty', path: 'rootNode...<n2>...materialProjectId' }] },
    { id: "E-00-mat-MintLeafDeco",   title: "应用素材到 MintLeafDeco (PNG)",   stage: "executor", status: "pending",
      expectedArtifacts: [{ kind: 'nonEmpty', path: 'rootNode...<n15>...materialProjectId' }] },
    { id: "E-00-mat-PinkCircleDeco", title: "PinkCircleDeco (CSS-gradient skipped)", stage: "executor", status: "pending" },
      // 此任务在执行时直接 status:skipped + notes
    { id: "E-00-svg-OrnamentSep",    title: "OrnamentSep (SVG 内联)",          stage: "executor", status: "pending",
      expectedArtifacts: [{ kind: 'nonEmpty', path: 'rootNode...<n16>...props.svgContent' }] },
    { id: "E-00-svg-LoadingSpinner", title: "LoadingSpinner (SVG 内联)",       stage: "executor", status: "pending" }
  ]
}
```

## 4. 整屏无素材的处理（罕见）

如本屏无任何 PNG/SVG 素材：
```
status: done
notes: "本屏所有素材均为 CSS 实现（renderHint=css-gradient/css-only），无需 material-painter。"
```
然后直接进 E-X-snapshot 任务。

## 5. ★ 沉淀到 schema 的结论

本任务以"挂任务清单"为产物——结论是上面 §3 的 meta/add_plan_tasks 调用。
任务执行完毕后 status:done。
```
