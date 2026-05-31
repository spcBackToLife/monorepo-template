# 模板：D-global-overlay-styles（全局 overlays 节点全量样式）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/global/overlay-styles.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-styles
> 对应 schema 字段：project.globalOverlays[*].rootNode 子树的 styles

## 1. globalOverlays 概览

| overlay id | name | type | 节点数 | 状态 |
|-----------|------|------|:------:|------|
| global-offline-banner | 全局离线条 | banner / custom | 3 | 待写 |
| global-session-expired | 登录过期 Modal | modal | 5 | 待写 |
| global-app-update | App 升级提示 | modal | 6 | 待写 |
| global-error-boundary | 全局错误兜底 | custom | 4 | 待写 |

## 2. 三套统一规格基线（Modal / BottomSheet / Drawer / Banner / Toast）

详见 `schema-spec/global-overlay-design.md`，要点：
- Modal: position fixed center / radius lg / shadow xl / fade+scaleIn 300ms / backdrop 0.5
- BottomSheet: position bottom / radius xl 顶部 / safe-area / slideUp 350ms / drag-bar
- Drawer: position right / safe-area / slideRight 300ms / backdrop 0.4
- Banner: position top / safe-area-inset-top / slideDown+fade 200ms
- Toast: position top center / radius md / 状态色 bg / 110 z-index / auto-dismiss

## 3. 每个 overlay 完整 styles 落库

### global-offline-banner（banner / custom）

```jsonc
// rootNode 容器
project.globalOverlays.find(o => o.id === "global-offline-banner").rootNode.styles = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top) + 0px)",
  left: 0,
  right: 0,
  height: "auto",
  padding: "$token:spacing.sm $token:spacing.md",
  backgroundColor: "$token:colors.warning",
  color: "$token:colors.textInverse",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$token:spacing.sm",
  zIndex: 90,
  fontSize: "$token:typography.body-sm.fontSize",
  fontWeight: "$token:typography.body-sm.fontWeight"
}

// 子节点（icon / text / retry button）
[逐个写]
```

理由：___________

### global-session-expired（modal）

```jsonc
project.globalOverlays.find(o => o.id === "global-session-expired").rootNode.styles = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(420px, calc(100vw - $token:spacing.xl * 2))",
  padding: "$token:spacing.xl",
  backgroundColor: "$token:colors.bgCard",
  borderRadius: "$token:radius.lg",
  boxShadow: "$token:shadows.xl",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.md"
}

// backdrop
overlay.backdrop = { color: "rgba(0, 0, 0, 0.5)", dismissible: false }

// 出入动画（详见 D-global-overlay-states 任务，此处仅放规格清单）
```

理由：___________

[继续每个 overlay...]

## 4. 跨 overlay 统一规格核查

| 项 | 是否统一 | 备注 |
|----|:-------:|------|
| Modal radius lg | ✅ | session-expired / app-update 都用 |
| Modal padding xl | ✅ | |
| Modal backdrop 0.5 | ✅ | |
| Banner safe-area-inset-top | ✅ | offline-banner |
| Toast safe-area-inset-top | N/A | 本项目用 ui.showToast 不建节点 |

## 5. ★ 沉淀到 schema 的结论

```jsonc
// 1. 每个 overlay rootNode + 内部子节点 style/update
[列每个 style/update 调用]

// 2. backdrop 配置（如本任务已写则确认；否则在此补）
project/set_overlay {
  projectId, overlayId: "global-session-expired",
  patch: { backdrop: { color: "rgba(0, 0, 0, 0.5)", dismissible: false } }
}
```

⚠️ **expectedArtifacts**：
```jsonc
{ kind: 'eachItem', path: 'globalOverlays',
  check: { kind: 'nonEmpty', path: '$.rootNode.styles' } }
```

⚠️ **后续任务约束**：
- D-global-overlay-states：本任务通过后写 visualStates + 出入动画
- D-global-overlay-materials：本任务通过后写 overlay 内素材规格
- D-global-overlay-audit：跨 overlay 风格统一性核查
```
