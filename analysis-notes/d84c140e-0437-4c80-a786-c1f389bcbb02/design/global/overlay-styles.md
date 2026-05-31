> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-styles
> 对应 schema 字段：globalOverlays[*].rootNode.styles 整组替换（含子节点 styles）

# D-global-overlay-styles — 全局 overlays 节点全量样式

## 关键约束

- globalOverlays 在 DesignProject 顶层（不在 screen 内），唯一写入路径：`meta/set_global_overlays { overlays: [...] }` **整组替换**
- 必须把 product/interaction 阶段已落字段（id/name/type/showWhen/backdrop/rootNode 全部 meta/props/events）**原样带回**，仅在 styles 字段上写入新内容
- 4 个 plan 任务（D-global-overlay-styles/states/materials/audit）共用一次整组替换，最后 D-audit 任务执行整组写入

## 1. OfflineBanner 系列 styles 决策

**风格定调**（与项目 theme intent minimal+flat + 登录页"克制温度"一致）：
- 顶部 fixed banner，**深灰底 + 白字 + warning 色小指示点** —— 提示性而非阻断，不破坏 single seedColor
- 候选 A 黄底（warning bg）→ ❌ 太刺眼，与 minimal 冲突
- 候选 B 蓝紫底（primary bg）→ ❌ 与 SubmitBtn 主色撞色，分散主路径焦点
- 候选 C 深灰底（gray700）+ warning 状态点 → ✅ 采用，提示性 + 克制 + 双色控制（中性 + 状态指示色）

### OfflineBanner (rootNode, type=custom)
```jsonc
{
  position: "fixed",
  top: "0",
  left: "0",
  right: "0",
  zIndex: 30,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: "$token:spacing.sm",
  padding: "$token:spacing.sm $token:spacing.md",
  paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.sm)",
  backgroundColor: "$token:colors.gray800",       // 深灰
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body.fontSize",
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "500",
  lineHeight: "1.4",
  boxShadow: "$token:shadows.sm"
}
```

### WifiOffIcon (子节点)
```jsonc
{
  width: "8px",
  height: "8px",
  borderRadius: "$token:radius.full",
  backgroundColor: "$token:colors.warning",       // warning 色小圆点指示
  flexShrink: "0"
}
```

⚠️ 占位用纯色圆点；executor 阶段可决定是否补 SVG wifi-off 图标（详见 D-global-overlay-materials）

### OfflineText (子节点)
```jsonc
{
  flex: "0 1 auto",
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body.fontSize",
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "1.4"
}
```

### RetryButton (子节点)
```jsonc
{
  flexShrink: "0",
  marginLeft: "$token:spacing.xs",
  padding: "$token:spacing.2xs $token:spacing.sm",
  backgroundColor: "transparent",
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body.fontSize",
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "600",
  lineHeight: "1.4",
  border: "1px solid rgba(255,255,255,0.5)",
  borderRadius: "$token:radius.sm",
  cursor: "pointer",
  transition: "$token:transitions.fast.value"
}
```

## 2. SessionExpiredModal 系列 styles

### SessionExpiredModal (rootNode, type=modal)
```jsonc
{
  width: "320px",
  maxWidth: "90vw",
  padding: "$token:spacing.xl",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "$token:spacing.md",
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.xl",
  boxShadow: "$token:shadows.xl"
}
// modal 居中由 overlay 渲染器配合 backdrop 处理
```

### ExpiredTitle (子节点)
```jsonc
{
  fontSize: "$token:typography.h4.fontSize",      // 20
  fontFamily: "$token:typography.h4.fontFamily",
  fontWeight: "600",
  lineHeight: "1.3",
  color: "$token:colors.textPrimary",
  textAlign: "center",
  margin: "0"
}
```

### ExpiredDesc (子节点)
```jsonc
{
  fontSize: "$token:typography.body.fontSize",    // 14
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "$token:typography.body.lineHeight",
  color: "$token:colors.textSecondary",
  textAlign: "center",
  margin: "0"
}
```

### ReLoginBtn (子节点 - 主按钮)
和 00-login 屏 SubmitBtn 同款风格：
```jsonc
{
  width: "100%",
  height: "48px",
  marginTop: "$token:spacing.sm",
  padding: "0 $token:spacing.lg",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body-lg.fontSize",
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "600",
  lineHeight: "1.2",
  letterSpacing: "0.02em",
  borderRadius: "$token:radius.lg",
  border: "none",
  boxShadow: "$token:shadows.sm",
  transition: "$token:transitions.normal.value",
  cursor: "pointer",
  userSelect: "none"
}
```

## ★ 沉淀到 schema 的结论

styles 写入随 D-global-overlay-audit 任务做整组 set_global_overlays 时一次性下发。本任务在 md 里准备好规格，audit 任务做最终落库。

**自检**：
- ✅ banner 与 modal 跨主题一致（surfaceElevated / primary / textInverse 均与 00-login 共用）
- ✅ ReLoginBtn 与 SubmitBtn 同款规格 → 用户从过期 modal 点"去登录"后看到熟悉的登录按钮，无视觉断裂
- ✅ 全 token 引用，无硬编码色（rgba(255,255,255,0.5) 用于 RetryButton 半透明边框是 textInverse 派生，合理偏差）
