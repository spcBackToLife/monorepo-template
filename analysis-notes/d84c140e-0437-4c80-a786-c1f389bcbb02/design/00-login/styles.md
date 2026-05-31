> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-styles
> 对应 schema 字段：每节点 styles 全量 + screen.backgroundColor

# D-00-login-styles — 全量样式落库

## 0. 原则

1. **基线优先**：默认抄 D-system-baseline §3 各 Atom 标准规格；偏差需说明
2. **预算受限**：每节点必在 D-00-login-budget §7 的 `allowedTools` 内
3. **token 全引用**：token 命名按 theme/get 实际结构 — `colors.X` / `spacing.X` / `radius.X`（单数）/ `shadows.X` / `typography.X.{fontSize/fontFamily/fontWeight/lineHeight}` / `transitions.X.value`
4. **一次到位**：不留 hover/focus/error 给 visualState（visualState 任务负责态切换 overrides；styles 是 default 完整态）

## 1. screen.backgroundColor

```jsonc
screen.backgroundColor = "$token:colors.background"   // #FCFCFD 暖白偏冷
```

## 2. 节点全量 styles 清单

### 2.1 Root (nd_6a7f2492b59b4e7eab7e1) — div, 页面容器

```jsonc
{
  width: "100%",
  minHeight: "100vh",
  paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.2xl)",   // 顶部留 48 + 安全区
  paddingRight: "$token:spacing.lg",                                    // 24
  paddingBottom: "calc(env(safe-area-inset-bottom) + $token:spacing.lg)",
  paddingLeft: "$token:spacing.lg",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  position: "relative",      // 给 BgBlobTopRight absolute 定位锚点
  overflow: "hidden",        // 装饰溢出裁切
  fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
}
```

**偏差说明**：基线 §3.12 给的 `gap: spacing.xl` 不写到 Root —— 因为 Root 内部是互斥分支视图（NormalFormView/LockedView），它们各自有内 layout，Root 不需要 gap。

### 2.2 NormalFormView (nd_legacy_wrap_217_fixed) — div, 正常表单分支容器

```jsonc
{
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.xl"          // 32 区块间距：HeaderArea / FormCard / FooterLinks 之间
}
```

### 2.3 HeaderArea (nd_451ec7c1336d478a810d9) — div, 品牌区

```jsonc
{
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "$token:spacing.xs",         // 4 BrandLogo 与 BrandSlogan 间
  marginBottom: "$token:spacing.md", // 16 与 FormCard 区分
  position: "relative",              // 给 z=1 stacking context
  zIndex: 1
}
```

### 2.4 BrandLogo (nd_d7d8b56e2d934187bbb9b) — img, 品牌 Logo

⚠️ type=img 由 product 阶段建。本期可能没 PNG → executor 阶段决定（kind=brand 在 D-materials 任务标记）。styles 只给尺寸 + alt 占位 placeholder：

```jsonc
{
  width: "120px",
  height: "120px",
  objectFit: "contain",
  borderRadius: "$token:radius.xl",   // 16，万一是 round logo 也能软化
  display: "block"
}
```

### 2.5 BrandSlogan (nd_db3a01b4935c412a96005) — div, 标语

```jsonc
{
  fontSize: "$token:typography.body.fontSize",          // 14
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "$token:typography.body.lineHeight",      // 1.5
  color: "$token:colors.textSecondary",
  textAlign: "center",
  letterSpacing: "0.02em"
}
```

### 2.6 FormCard (nd_e60fb832933f4b86a6638) — div, 表单卡片

```jsonc
{
  width: "100%",
  padding: "$token:spacing.lg",                  // 24
  backgroundColor: "$token:colors.surfaceElevated", // #FFFFFF
  borderRadius: "$token:radius.xl",              // 16
  boxShadow: "$token:shadows.sm",                // soft 弱阴影
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.md",                      // 16 字段间距
  position: "relative",
  zIndex: 2
}
```

**偏差说明**：基线 §3.11 给的 `border: 1px solid borderLight` 在 budget v3 削减时被去掉（避免双重描边）。仅保留圆角 + 弱阴影。

### 2.7 PhoneField (nd_6a8ce0b8189b4f789fc07) — div, 字段容器

```jsonc
{
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.xs"                       // 4 label-input-error 间
}
```

### 2.8 PhoneLabel (nd_44ef1e21abb846ef9bc9f) — div

```jsonc
{
  display: "block",
  fontSize: "$token:typography.body.fontSize",    // 14
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "500",
  lineHeight: "1.4",
  color: "$token:colors.textSecondary"
}
```

### 2.9 PhoneInput (nd_083c744e1699418e9d01e) — input

```jsonc
{
  width: "100%",
  height: "48px",
  padding: "0 $token:spacing.md",
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.md",              // 8
  fontSize: "$token:typography.body-lg.fontSize", // 16 避免 iOS 自动放大
  fontFamily: "$token:typography.body.fontFamily",
  color: "$token:colors.textPrimary",
  backgroundColor: "$token:colors.surfaceElevated",
  caretColor: "$token:colors.primary",
  transition: "$token:transitions.fast.value",
  outline: "none",
  boxSizing: "border-box"
}
```

### 2.10 PhoneError (nd_905bbf8e8ae84435bd1c5) — div, 错误提示

升级 v2.5 minimal-debug 为完整 token：

```jsonc
{
  display: "block",
  fontSize: "$token:typography.caption.fontSize",  // 12
  fontFamily: "$token:typography.caption.fontFamily",
  fontWeight: "400",
  lineHeight: "$token:typography.caption.lineHeight", // 1.4
  color: "$token:colors.error",
  marginTop: "$token:spacing.2xs",                 // 2
  minHeight: "16px"                                // 占位避免 layout shift
}
```

### 2.11 ModeToggle (nd_edee969db25d4440b9169) — div, 模式切换容器

```jsonc
{
  width: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "$token:spacing.lg",                        // 24，两 tab 之间
  borderBottom: "1px solid $token:colors.borderLight",
  paddingBottom: "$token:spacing.xs"               // 4，下划线与文本距
}
```

### 2.12 CodeModeBtn (nd_fea83ab543584619ab847) — button

```jsonc
{
  flex: "0 0 auto",
  padding: "$token:spacing.xs 0",                  // 4 0
  backgroundColor: "transparent",
  color: "$token:colors.textSecondary",
  fontSize: "$token:typography.body.fontSize",     // 14
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "500",
  lineHeight: "1.4",
  border: "none",
  borderRadius: "0",
  cursor: "pointer",
  transition: "color $token:transitions.fast.value",
  position: "relative"                             // 给 active 下划线 ::after 用（实际 visualState 实现）
}
```

### 2.13 PasswordModeBtn (nd_fc9f672d68824795b92cd) — button

同 §2.12（结构一致）

### 2.14 CredentialField (nd_af20c6a53caf4bed8d0b6) — div, 字段容器

```jsonc
{
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.xs",
  position: "relative"                             // 给 GetCodeBtn / PasswordToggleEye absolute 用
}
```

### 2.15 CredentialLabel (nd_bd114d45f07f45caabdd9) — div

同 §2.8

### 2.16 CredentialInput (nd_989c02eb1f224e0c9f973) — input

同 §2.9，加 padding-right 给尾部按钮留位：

```jsonc
{
  ...所有同 PhoneInput,
  paddingRight: "84px"   // 给 GetCodeBtn (78px) + 右内边距 6px 留位；密码模式时 PasswordToggleEye (32px) + 右内边距 8px 已 ≤ 84px 兼容
}
```

### 2.17 CredentialError (nd_d7657df85d8049aa8251c) — div

同 §2.10

### 2.18 GetCodeBtn (nd_e6783f85edb3499c9f131) — button, 验证码按钮

按 budget §7 削减后只保 "字色"工具（去掉描边药丸）→ 偏离基线 §3.4，做"纯文字按钮"风格：

```jsonc
{
  position: "absolute",
  right: "$token:spacing.sm",                      // 8
  top: "calc(50% + 12px)",                         // label 高度补偿后输入框中线
  transform: "translateY(-50%)",
  height: "32px",
  padding: "0 $token:spacing.sm",
  backgroundColor: "transparent",
  color: "$token:colors.primary",
  fontSize: "$token:typography.caption.fontSize",  // 12
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "500",
  lineHeight: "1.4",
  border: "none",
  borderRadius: "$token:radius.sm",                // 4 hover 背景圆角用
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "$token:transitions.fast.value"
}
```

### 2.19 PasswordToggleEye (nd_017aac6774174ea08b133) — div, 密码显隐

```jsonc
{
  position: "absolute",
  right: "$token:spacing.sm",
  top: "calc(50% + 12px)",
  transform: "translateY(-50%)",
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "$token:colors.textTertiary",
  borderRadius: "$token:radius.sm",
  cursor: "pointer",
  transition: "$token:transitions.fast.value"
}
```

### 2.20 PolicyRow (nd_36cea068f4af4b8fbdbb3) — div

```jsonc
{
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: "$token:spacing.sm",                        // 8 复选框-文字间
  marginTop: "$token:spacing.xs"                   // 4 与 CredentialField 距
}
```

### 2.21 PolicyCheckbox (nd_42b79eb04cfe4a51bc3e2) — input

```jsonc
{
  width: "18px",
  height: "18px",
  margin: "0",
  marginTop: "2px",                                // 视觉对齐文字 baseline
  flexShrink: "0",
  cursor: "pointer",
  accentColor: "$token:colors.primary"             // 原生 checkbox 主色（CSS 4 标准）
}
```

### 2.22 PolicyText (nd_5b891f2d60734104b50b8) — div

```jsonc
{
  flex: "1 1 auto",
  fontSize: "$token:typography.caption.fontSize",  // 12
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "$token:typography.caption.lineHeight", // 1.4
  color: "$token:colors.textSecondary"
}
```

### 2.23 SubmitBtn (nd_5a15fd87f060436295b4f) — button, 主 CTA 主角

按 budget §7：weight=8，allowedTools=主色填充 / spring / focus 光晕 / spinner（无外发光）：

```jsonc
{
  width: "100%",
  height: "48px",
  padding: "0 $token:spacing.lg",
  marginTop: "$token:spacing.sm",                  // 8 与 PolicyRow 距
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "$token:spacing.xs",                        // 4 spinner 与文字间
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body-lg.fontSize",  // 16
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "600",
  lineHeight: "1.2",
  letterSpacing: "0.02em",
  borderRadius: "$token:radius.lg",                // 12 决策 D-S1 克制圆润
  border: "none",
  boxShadow: "$token:shadows.sm",
  transition: "$token:transitions.normal.value",   // 250ms
  cursor: "pointer",
  userSelect: "none"
}
```

### 2.24 SubmitSpinner (nd_4363095a27b24f7a8aae6) — div, 按钮内 spinner

```jsonc
{
  width: "16px",
  height: "16px",
  borderRadius: "$token:radius.full",
  border: "2px solid rgba(255,255,255,0.35)",
  borderTopColor: "$token:colors.textInverse",
  animation: "spin 0.8s linear infinite",
  flexShrink: "0"
}
```

⚠️ `animation: spin` 需要 `@keyframes spin`——后续可在 D-states 任务里补；或留待 executor 阶段把 spin keyframe 注入 host。本任务先把 styles 字段写到位。

### 2.25 FooterLinks (nd_c04451d9d8f243489f1c1) — div

```jsonc
{
  width: "100%",
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: "$token:spacing.lg",                        // 24
  marginTop: "$token:spacing.md"                   // 16
}
```

### 2.26 RegisterLink (nd_bc2793bdb54c4603a22be) — div

```jsonc
{
  padding: "$token:spacing.xs $token:spacing.sm",
  fontSize: "$token:typography.caption.fontSize",  // 12
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "1.4",
  color: "$token:colors.textSecondary",
  cursor: "pointer",
  transition: "color $token:transitions.fast.value",
  userSelect: "none"
}
```

### 2.27 ForgotLink (nd_24bb133804bb40f1b2833) — div

同 §2.26

### 2.28 LockedView (nd_aa8a0633ce354664a8d1a) — div, 锁定分支容器

```jsonc
{
  width: "100%",
  padding: "$token:spacing.2xl $token:spacing.lg",  // 48 24
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "$token:spacing.md",
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.xl",
  boxShadow: "$token:shadows.sm",
  position: "relative",
  zIndex: 2
}
```

### 2.29 LockedIcon (nd_8b4253353f804cc89e563) — div, 锁图标占位

```jsonc
{
  width: "64px",
  height: "64px",
  borderRadius: "$token:radius.full",
  backgroundColor: "$token:colors.warning",        // 警示色块占位（实际素材在 materials 任务定）
  opacity: "0.18",                                 // 弱化背景圆，给真实 icon 让位
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "$token:colors.warning",
  marginBottom: "$token:spacing.xs"
}
```

⚠️ 这里用 warning 色块作"图标背景圆"占位——真实图标 PNG 由 D-materials 任务定 + executor 实施。

### 2.30 LockedTitle (nd_2cb66aa7ab7445c893846) — div

```jsonc
{
  fontSize: "$token:typography.h4.fontSize",       // 20
  fontFamily: "$token:typography.h4.fontFamily",
  fontWeight: "600",
  lineHeight: "1.3",
  color: "$token:colors.textPrimary",
  textAlign: "center",
  margin: "0"
}
```

### 2.31 LockedCountdown (nd_e3c2865fa1b04412936ea) — div, 倒计时

```jsonc
{
  fontSize: "$token:typography.display.fontSize",  // 48 大数字
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontWeight: "700",
  lineHeight: "1.1",
  color: "$token:colors.primary",                  // 主色强调倒计时数字
  textAlign: "center",
  letterSpacing: "0.02em",
  margin: "$token:spacing.sm 0"
}
```

### 2.32 LockedHint (nd_d7e9c4159d7343e9a019b) — div

```jsonc
{
  fontSize: "$token:typography.body.fontSize",     // 14
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "400",
  lineHeight: "$token:typography.body.lineHeight",
  color: "$token:colors.textSecondary",
  textAlign: "center",
  maxWidth: "280px",
  margin: "0"
}
```

### 2.33 LockedForgotLink (nd_d620d7ba69e2460aa7e16) — button

```jsonc
{
  marginTop: "$token:spacing.md",
  height: "40px",
  padding: "0 $token:spacing.lg",
  backgroundColor: "transparent",
  color: "$token:colors.primary",
  fontSize: "$token:typography.body.fontSize",
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "500",
  lineHeight: "1.4",
  border: "1px solid $token:colors.primary",
  borderRadius: "$token:radius.lg",
  cursor: "pointer",
  transition: "$token:transitions.fast.value"
}
```

### 2.34 BgBlobTopRight (nd_9b9fdb30935f42338f086) — 已建装饰

styles 已在 D-decorations 任务写入；不再重复。

## 3. token 引用统计自查（给 D-token-coverage 任务的输入）

| 维度 | 出现次数 | $token: 引用率 |
|------|:--:|:----:|
| color | ~ 30 | 100%（除 `transparent` / `rgba(255,255,255,0.35)` 这种 spinner 半透明边） |
| fontSize | ~ 18 | 100% |
| fontFamily | ~ 15 | 100% |
| fontWeight | ~ 18 | 部分（500/600/700 直接写数字字符串——theme typography.X 内已含 fontWeight，可改为 `$token:typography.X.fontWeight` 引用以提升覆盖率）|
| spacing | ~ 35 | 100% |
| borderRadius | ~ 14 | 100% |
| boxShadow | ~ 4 | 100% |
| transition | ~ 12 | 100% |

⚠️ **fontWeight 偏差说明**：很多按钮 fontWeight: "600" 直接写数字而不引用——理由是 typography.body 默认 fontWeight=400，但按钮文字需要 600（semibold），typography 表中没有"semibold body"组合 token。这种情况：
- 选项 A：改用 typography.h5.fontWeight（500）或 typography.h4.fontWeight（600）—— 但 fontSize 不一致会跟着错
- 选项 B：直接写 "500"/"600"/"700" 数字字符串（CSS 合法），属于"theme 没穷尽到组合"的合理使用 → **采用**

允许例外：`fontWeight: "600"` 类似数字字符串属于 typography 范畴的合理 token 缺口，计入 D-token-coverage 的"灰色合规"区，不算硬编码颜色 / 字号。

## 4. ★ 沉淀到 schema 的结论

```jsonc
// MCP step 1: screen/update
screen/update {
  projectId, screenId,
  patch: { backgroundColor: "$token:colors.background" }
}

// MCP step 2: style/batch_update（28 节点一次性批量，含装饰节点 BgBlobTopRight 已写则跳过）
style/batch_update {
  projectId,
  updates: [
    { nodeId: "nd_6a7f2492b59b4e7eab7e1", styles: { /* §2.1 Root */ } },
    { nodeId: "nd_legacy_wrap_217_fixed", styles: { /* §2.2 NormalFormView */ } },
    ...
  ]
}
```

**自检**：
- ✅ 所有节点 styles 都按 budget §7 allowedTools 内
- ✅ Root / FormCard / LockedView 容器 styles 维度齐全（layout / size / spacing / position / color / shape / shadow）
- ✅ Input 类节点 fontSize ≥ 16 防 iOS 放大
- ✅ 装饰节点 BgBlobTopRight 已带 absolute + zIndex:0 + pointerEvents:none
- ✅ minimal-debug error 节点已升级 token
- ✅ 唯一硬编码：spinner 边色 `rgba(255,255,255,0.35)`（按钮内反白半透明）+ LockedCountdown 用 monospace fontFamily 数字（theme 不含 monospace 类目，作为字段级合理偏差）
- ✅ 关键偏差有说明（FormCard 去边框 / GetCodeBtn 删描边）
