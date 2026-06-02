# schema-spec：项目级 globalOverlays 视觉规格

> 适用任务：`D-global-overlay-styles`、`D-global-overlay-states`、`D-global-overlay-materials`、`D-global-overlay-audit`
> globalOverlays 跨屏共享渲染——视觉规格必须高度统一。

## 1. globalOverlays 结构（已由 product/interaction 阶段建好）

```jsonc
project.globalOverlays = [
  {
    id: "global-offline-banner",
    name: "全局离线条",
    type: "custom",                  // banner | modal | bottomSheet | drawer | toast | custom
    showWhen: "{{ globalView.network.status === 'offline' }}",
    rootNode: { /* 节点子树 */ },
    backdrop: undefined              // banner 不需要 backdrop
  },
  {
    id: "global-session-expired",
    name: "登录过期 Modal",
    type: "modal",
    showWhen: "{{ globalView.session.status === 'expired' }}",
    rootNode: { /* ... */ },
    backdrop: { color: "rgba(0,0,0,0.5)", dismissible: false }
  },
  {
    id: "global-app-update",
    name: "App 升级提示",
    type: "modal",
    showWhen: "{{ globalView.env.hasNewVersion && !globalView.preferences.updateDismissed }}",
    rootNode: { ... }
  },
  {
    id: "global-error-boundary",
    name: "全局错误兜底",
    type: "custom",
    showWhen: "{{ globalView.errorBoundary.crashed }}",
    rootNode: { ... }
  }
]
```

**design 阶段职责**：给每个 overlay 完整的视觉规格。**不动**结构 / showWhen / events（那是 product/interaction 已建的）。

## 2. 三套统一规格（关键 ★）

### 2.1 Modal 规格
```jsonc
overlay.rootNode.styles = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(420px, calc(100vw - $token:spacing.xl * 2))",
  padding: "$token:spacing.xl",
  backgroundColor: "$token:colors.bgCard",
  borderRadius: "$token:radius.lg",     // 12-16px
  boxShadow: "$token:shadows.xl",
  zIndex: 100,
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.md"
}

// 出入动画统一：fade + scaleIn 300ms ease-out
overlay.rootNode.animation = {
  enter: { duration: 300, easing: "ease-out", keyframes: [
    { offset: 0, styles: { opacity: 0, transform: "translate(-50%,-50%) scale(0.95)" } },
    { offset: 1, styles: { opacity: 1, transform: "translate(-50%,-50%) scale(1)" } }
  ]},
  exit: { duration: 200, easing: "ease-in" }
}

// backdrop（背景遮罩）
overlay.backdrop = { color: "rgba(0, 0, 0, 0.5)", dismissible: true }
```

### 2.2 BottomSheet 规格
```jsonc
overlay.rootNode.styles = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  paddingTop: "$token:spacing.lg",
  paddingBottom: "calc(env(safe-area-inset-bottom) + $token:spacing.lg)",     // ★ safe-area
  paddingX: "$token:spacing.lg",
  backgroundColor: "$token:colors.bgCard",
  borderTopLeftRadius: "$token:radius.xl",     // 16-24px
  borderTopRightRadius: "$token:radius.xl",
  boxShadow: "$token:shadows.xl",
  zIndex: 100
}

// drag-bar 子节点（暗示可拖动）
{ id: "dragBar", styles: {
  width: "32px",
  height: "4px",
  backgroundColor: "$token:colors.gray400",
  borderRadius: "$token:radius.full",
  margin: "0 auto $token:spacing.md auto"
}}

// 出入动画：slideUp 350ms ease-out
overlay.rootNode.animation = {
  enter: { duration: 350, easing: "ease-out", keyframes: [
    { offset: 0, styles: { transform: "translateY(100%)" } },
    { offset: 1, styles: { transform: "translateY(0)" } }
  ]}
}

overlay.backdrop = { color: "rgba(0, 0, 0, 0.45)", dismissible: true }
```

### 2.3 Drawer 规格
```jsonc
overlay.rootNode.styles = {
  position: "fixed",
  top: 0,
  bottom: 0,
  right: 0,                          // 或 left: 0（根据方向）
  width: "min(320px, 80vw)",
  paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.md)",
  paddingBottom: "env(safe-area-inset-bottom)",
  backgroundColor: "$token:colors.bgCard",
  boxShadow: "$token:shadows.xl",
  zIndex: 100
}

// 出入动画：slideRight 300ms ease-out
overlay.rootNode.animation = { /* slideRight */ }

overlay.backdrop = { color: "rgba(0, 0, 0, 0.4)", dismissible: true }
```

### 2.4 Banner 规格（如全局离线条）
```jsonc
overlay.rootNode.styles = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top) + 0px)",     // 紧贴 safe area
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
  zIndex: 90,                        // banner 比 modal 略低（modal 应覆盖 banner）
  fontSize: "$token:typography.body-sm.fontSize",
  fontWeight: "$token:typography.body-sm.fontWeight"
}

// 出入：slideDown + fade 200ms ease-out
overlay.rootNode.animation = { /* slideDown + fade */ }

overlay.backdrop = undefined         // banner 不需要 backdrop
```

### 2.5 Toast 规格（如有自定义 Toast，通常用 ui.showToast 即可）
```jsonc
overlay.rootNode.styles = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top) + $token:spacing.lg)",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "$token:spacing.sm $token:spacing.md",
  backgroundColor: "$token:colors.<状态色>",
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.md",
  boxShadow: "$token:shadows.lg",
  zIndex: 110,                       // 比 modal 略高
  fontSize: "$token:typography.body-sm.fontSize",
  display: "flex",
  alignItems: "center",
  gap: "$token:spacing.xs"
}

// 出入：slideDown + fade 200ms ease-out + auto-dismiss 3s
overlay.rootNode.animation = { /* ... */ }
```

## 3. backdrop 规格

| overlay 类型 | backdrop color | dismissible |
|--------------|----------------|-------------|
| Modal（关键决策）| `rgba(0,0,0,0.5)` | false（必须显式按按钮关）|
| Modal（提示）   | `rgba(0,0,0,0.4)` | true |
| BottomSheet | `rgba(0,0,0,0.45)` | true |
| Drawer | `rgba(0,0,0,0.4)` | true |
| Banner | undefined | N/A |
| Toast | undefined | N/A |

**红线**：
- 不同 modal 用不同 backdrop 色 → 体验撕裂
- 关键决策（如 session 过期）用 dismissible:true → 用户误关跳过认证

## 4. 跨屏并存协调

globalOverlays 跨屏出现，**风格必须高度统一**。在 `D-global-overlay-audit` 任务核对：

```
□ 所有 modal 出入动画一致（fade + scaleIn 300ms）
□ 所有 BottomSheet 出入动画一致（slideUp 350ms）
□ 所有 backdrop 透明度一致（同类型）
□ 所有 Sheet drag-bar 规格一致（32×4 gray400）
□ 所有 safe-area 适配一致（顶 + 底 + 横屏）
□ 所有内部 CTA 按钮风格与全局按钮一致
```

## 5. 视觉权重计入项目级总预算

```jsonc
project.meta.designSystem.globalOverlayBudget = {
  totalWeight: 18,           // 4 个全局 overlay 总和
  byOverlay: {
    "global-offline-banner": 3,         // 工具-导航
    "global-session-expired": 6,        // 主角-阻断（关键决策）
    "global-app-update": 4,             // 配角-提示
    "global-error-boundary": 5          // 主角-阻断（兜底错误）
  }
}
```

每个 overlay 的 rootNode 子树视觉权重通常：
- Modal 关键决策：6-7（高权重，引起重视）
- Modal 提示：4-5
- BottomSheet：5-6
- Drawer：3-5
- Banner：3-4
- Toast：3

## 6. 内部素材规格（D-global-overlay-materials）

每个 overlay 内部如有需要素材的节点（如 SessionExpired Modal 内的"过期图示"插画）：

```jsonc
overlay.rootNode.children[<imageNode>].meta.design.materialSpec = {
  kind: "illustration",
  renderHint: "png",
  referenceFrame: { width: 120, height: 120 },
  ...
}
```

详见 `material-spec.md`。

## 7. visualStates（D-global-overlay-states）

overlay 内部 CTA 按钮、关闭 X 等交互节点必须有完整 visualStates：

```jsonc
// 例：SessionExpired Modal 内的"重新登录"按钮
reloginBtn.states = [
  { name: "default", styles: {...} },
  { name: "hover",   styles: {...}, transition: { duration: 150, easing: "ease-out" } },
  { name: "pressed", styles: {...}, transition: { duration: 80,  easing: "ease-in" } },
  { name: "focus",   styles: {...} },
  { name: "disabled", styles: {...}, disabledEvents: ["click"] }
]
```

## 8. md 落地（D-global-overlay-styles）

```markdown
## 全局 overlays 视觉规格（D-global-overlay-styles）

### 概述
4 个全局 overlay，分 3 种类型：
- 1 个 Banner（OfflineBanner）
- 2 个 Modal（SessionExpired / AppUpdate）  
- 1 个 custom（ErrorBoundary，按 Modal 规格）

### 统一规格
- Modal 出入：fade + scaleIn 300ms ease-out
- Banner 出入：slideDown + fade 200ms ease-out
- Modal backdrop：rgba(0,0,0,0.5) dismissible:false（关键决策）/ rgba(0,0,0,0.4) dismissible:true（提示）
- safe-area：所有 overlay 顶 / 底都用 env(safe-area-inset-*)

### 每个 overlay 的视觉规格
[逐个写 styles + meta.design]

### 跨屏并存场景
[列出在 N 个屏的截图核对计划]

### ★ 沉淀到 schema 的结论
[每个 overlay rootNode 子树的 styles 全量 + meta.design + visualStates + materialSpec]
```

## 9. 红线

- ❌ 改 globalOverlays 结构 / showWhen / events（那是上游建的）
- ❌ 不同 modal 出入动画风格不一（一个 fade 一个 slide）→ 体验撕裂
- ❌ Modal 没 backdrop / backdrop 太轻 → 失去层级
- ❌ Sheet 没 safe-area 适配 → iPhone 底部被遮
- ❌ 关键决策 modal（如 session 过期）用 dismissible:true
- ❌ 不同 modal 用不同 backdrop 色（如 0.4 / 0.5 / 0.6 混用）
- ❌ overlay 内部按钮 visualStates 缺 disabled / pressed
- ❌ overlay 内部图示节点不写 materialSpec
- ❌ overlay 视觉权重未计入项目级 globalOverlayBudget → audit 时发现总预算超
