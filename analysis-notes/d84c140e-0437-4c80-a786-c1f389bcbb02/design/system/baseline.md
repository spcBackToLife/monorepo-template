> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-system-baseline
> 对应 schema 字段：项目级，体现在每屏 D-X-styles 时引用统一规格

# D-system-baseline — 设计系统基线

## 1. theme 拉取要点（来自 theme/get）

**主题意图**："简约时尚 + 校园温度（极简留白 + 单一蓝紫强调色）"
- aesthetics: `[minimal, flat]`
- decoration: `minimal`
- colorTemperature: `neutral`
- seedColors: `["#5B6CFF"]`（蓝紫品牌主色）
- 双 colorScheme：`light` / `dark`（dark 36 个 overrides 全 APCA 6 项实测过）

### 关键 token 速查

| 类别 | token 名 | 值 | 设计角色 |
|------|---------|-----|---------|
| 品牌 | `colors.primary` | `#5B6CFF` | CTA / 链接 / 焦点边框 |
| 品牌 | `colors.primaryHover` | `#7B89FF` | hover 提亮 |
| 品牌 | `colors.primaryActive` | `#3346FF` | pressed 加深 |
| 品牌 | `colors.primaryLight` | `#EBEDFA` | 焦点光晕底 / 主色淡背 |
| 辅色 | `colors.secondary` | `#A776FF` | 紫色辅色（点缀，本期登录页极少用）|
| 状态 | `colors.error` | `#DD4747` | 错误红字 / 错误边框 |
| 状态 | `colors.success` | `#2DCC75` | 成功 ✓ |
| 状态 | `colors.warning` | `#FBBE2E` | 警告（本屏几乎不用）|
| 状态 | `colors.info` | `#2D7DD2` | 信息提示 |
| 文字 | `colors.textPrimary` | `rgba(0,0,0,0.88)` | 正文 |
| 文字 | `colors.textSecondary` | `rgba(0,0,0,0.80)` | 辅助 |
| 文字 | `colors.textTertiary` | `rgba(0,0,0,0.45)` | 占位符 |
| 文字 | `colors.textInverse` | `#FFFFFF` | 反色（按钮文字）|
| 背景 | `colors.background` | `#FCFCFD` | 页面底色（暖白偏冷一点）|
| 背景 | `colors.surface` | `#F6F7F9` | 卡片表面 |
| 背景 | `colors.surfaceElevated` | `#FFFFFF` | 悬浮面（Modal / Sheet）|
| 边框 | `colors.border` | `#DEE0E6` | 默认边框 |
| 边框 | `colors.borderLight` | `#E9EBEE` | 分割线 |
| 边框 | `colors.borderFocus` | `#5B6CFF` | 聚焦边框（= primary）|
| 灰阶 | `colors.gray100~900` | 9 阶 | disabled/skeleton 用 |
| 遮罩 | `colors.overlay` | `rgba(0,0,0,0.45)` | Modal backdrop |
| 间距 | `spacing.2xs/xs/sm/md/lg/xl/2xl/3xl` | `2/4/8/16/24/32/48/64` | 8 阶 |
| 圆角 | `radius.none/sm/md/lg/xl/full` | `0/4/8/12/16/9999` | 6 阶 |
| 阴影 | `shadows.sm/md/lg/xl` | `0 1px 3px / 0 4px 12px / 0 8px 24px / 0 12px 48px` | 4 阶（soft 策略，弱化）|
| 字号 | `typography.caption/body/body-lg/h5/h4/h3/h2/h1/display` | `12/14/16/18/20/24/28/36/48` | 9 阶 |
| 动效 | `transitions.fast/normal/slow` | `150/250/400ms` | 都用 cubic-bezier |
| 动效 | iconSpec.stroke.linecap/linejoin | `round` | 全局图标圆头 |

### iconSpec / stateSpec 摘要
- iconSpec：outline 风格，stroke-width 1.5，linecap/linejoin round，simple complexity
- stateSpec：hover scale 1.02 / pressed scale 0.98 / focus 2px primary ring offset 2px / disabled opacity 0.4 灰度 / loading opacity 0.8

## 2. 本项目用到的 Atom 类型清单（按登录屏需求列）

**仅 1 屏，但需要 atom 列表完整以便后续抽 templates / D-audit 比对**：

| Atom | 出现位置 | 数量 |
|------|---------|------|
| Button-primary | SubmitBtn / 锁定页 ContactBtn(占位) | 2 |
| Button-text-tab | ModeToggle 的 CodeModeBtn / PasswordModeBtn | 2 |
| Button-link | RegisterLink / ForgotLink / PolicyText 内链 | 3 |
| Button-link-icon | GetCodeBtn（输入框尾部的次级 CTA）| 1 |
| Button-icon | PasswordToggleEye | 1 |
| Input-text | PhoneInput / CredentialInput | 2 |
| Field-label | PhoneLabel / CredentialLabel | 2 |
| Field-error | PhoneError / CredentialError | 2 |
| Checkbox | PolicyCheckbox | 1 |
| Text-h1 | BrandLogo（"Campus" 文字 logo 占位）| 1 |
| Text-body | 多处 | N |
| Text-caption | FooterLinks 间距文字 | N |
| Layout-Card | FormCard / LockedCard | 2 |
| Layout-Stack | 全屏 vertical 流 | 多 |
| Decoration-Blob | 背景装饰（D-decorations 决定后追加）| 1-2 |

## 3. 每种 Atom 的标准规格

### 3.1 Button-primary（主 CTA：SubmitBtn）

```jsonc
default: {
  width: "100%",
  height: "48px",
  padding: "0 $token:spacing.lg",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "$token:spacing.xs",
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  fontSize: "$token:typography.body-lg.fontSize",        // 16px
  fontFamily: "$token:typography.body.fontFamily",
  fontWeight: "600",                                     // semibold
  lineHeight: "1.2",
  letterSpacing: "0.01em",
  borderRadius: "$token:radius.lg",                      // 12px（决策见下文 D-S1）
  border: "none",
  boxShadow: "$token:shadows.sm",
  transition: "$token:transitions.normal.value",         // 250ms
  cursor: "pointer",
  userSelect: "none"
}

states:
  hover:    backgroundColor primaryHover (#7B89FF) + shadow:md + scale 1.02 + translateY(-1px)
  pressed:  backgroundColor primaryActive (#3346FF) + shadow:sm + scale 0.98
  focus:    boxShadow 0 0 0 2px primary outline (offset 2px)
  disabled: backgroundColor gray400 + opacity 0.4 + cursor not-allowed + 移除 shadow
  loading:  childrenVisibility(LoadingSpinner显, ButtonLabel.text 改 "登录中…") + 表单整体 disabled
  success:  backgroundColor success(#2DCC75) + childrenVisibility(✓ 显, label 隐) 0.5s 后回 default
```

**决策 D-S1：borderRadius=12 (radius.lg) 而不是 radius.full**

候选对比：
- **radius.full（药丸）**：温暖、亲和——但 hits "playful" 调性，与 minimal+flat intent 冲突
- **radius.lg=12**：克制专业 + 有亲和（不是 0/sm 的硬朗 SaaS 感）→ ✅ 采用，与 theme `cornerStyle:rounded` 契合
- **radius.md=8**：偏专业但不够"温度" → 否决

理由：theme intent 是 "简约时尚 + 校园温度"——校园温度需要圆角，但极简 minimal 又要克制；12px 是恰好的"克制圆润"。

### 3.2 Button-text-tab（mode 切换：Code/Password Tab）

```jsonc
default: {
  flex: 1,                                  // 两个 tab 平分宽度
  height: "40px",
  padding: "$token:spacing.xs $token:spacing.md",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
  color: "$token:colors.textSecondary",
  fontSize: "$token:typography.body.fontSize",    // 14px
  fontWeight: "400",
  lineHeight: "1.4",
  borderRadius: "$token:radius.md",
  border: "none",
  transition: "all $token:transitions.fast.value",
  cursor: "pointer",
  position: "relative"                      // 给 active 下划线用
}

states:
  active:   color primary + fontWeight 600 + 底部 2px primary 横线（::after 模拟，用 ::before 模拟法不可行 → 用 borderBottom 实现）
  hover:    color textPrimary + bgColor 背景轻染 (gray100)
  disabled: opacity 0.4 + cursor not-allowed（locked 时整组 disabled）
```

### 3.3 Button-link（FooterLinks 文字链接 / RegisterLink / ForgotLink）

```jsonc
default: {
  padding: "$token:spacing.xs $token:spacing.sm",
  backgroundColor: "transparent",
  color: "$token:colors.textSecondary",
  fontSize: "$token:typography.caption.fontSize",   // 12px
  lineHeight: "1.4",
  textDecoration: "none",
  transition: "color $token:transitions.fast.value",
  cursor: "pointer"
}

states:
  hover:    color primary
  pressed:  color primaryActive
  focus:    outline 2px primary + outlineOffset 2px
  disabled: color textTertiary + cursor not-allowed
```

### 3.4 Button-link-icon（GetCodeBtn：输入框尾部的次级 CTA，文字带"获取"）

```jsonc
default: {
  height: "32px",
  padding: "0 $token:spacing.sm",
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  color: "$token:colors.primary",
  fontSize: "$token:typography.caption.fontSize",   // 12px
  fontWeight: "500",
  borderRadius: "$token:radius.sm",
  border: "1px solid $token:colors.primary",        // 描边药丸感（与主 CTA 区分层级）
  whiteSpace: "nowrap",                              // "重新获取 (60s)" 不换行
  transition: "all $token:transitions.fast.value",
  cursor: "pointer"
}

states:
  hover:    bgColor primaryLight + color primary
  pressed:  bgColor #EBEDFA + scale 0.97
  focus:    boxShadow 0 0 0 2px primaryLight
  disabled: borderColor border + color textTertiary + bgColor surface + cursor not-allowed（倒计时中默认态）
  loading:  childrenVisibility（Spinner显 + 文字"发送中…"）
```

### 3.5 Button-icon（PasswordToggleEye：输入框尾部图标按钮）

```jsonc
default: {
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
  color: "$token:colors.textTertiary",
  borderRadius: "$token:radius.sm",
  border: "none",
  transition: "color $token:transitions.fast.value, background-color $token:transitions.fast.value",
  cursor: "pointer"
}

states:
  hover:    color textSecondary + bgColor gray100
  pressed:  scale 0.92
  focus:    boxShadow 0 0 0 2px primaryLight
  active:   color primary（passwordVisible=true 时）
```

### 3.6 Input-text（PhoneInput / CredentialInput）

```jsonc
default: {
  width: "100%",
  height: "48px",
  padding: "0 $token:spacing.md",
  border: "1px solid $token:colors.border",
  borderRadius: "$token:radius.md",
  fontSize: "$token:typography.body-lg.fontSize",   // 16px（避免 iOS 自动放大）
  fontFamily: "$token:typography.body.fontFamily",
  color: "$token:colors.textPrimary",
  backgroundColor: "$token:colors.surfaceElevated", // #FFFFFF（与 surface 形成层次）
  caretColor: "$token:colors.primary",
  transition: "border-color $token:transitions.fast.value, box-shadow $token:transitions.fast.value",
  outline: "none"
}

states:
  hover:     borderColor #C8CBD3（border 加深一档，介于 border/gray400）
  focus:     borderColor primary + boxShadow 0 0 0 3px primaryLight
  error:     borderColor error + boxShadow 0 0 0 3px rgba(error,0.15) (activeWhen view.errors.<field>)
  disabled:  backgroundColor surface + color textTertiary + cursor not-allowed（locked 时整表单 disabled）
  readonly:  backgroundColor surface + cursor default
```

**决策 D-S2：fontSize=16 而不是 body=14**

候选对比：
- **14px (body)**：与 theme caption/body 体系一致，更紧凑 → ❌ iOS Safari focus 时会自动放大页面（≥ 16px 才不放大）
- **16px (body-lg)**：移动端最佳实践 → ✅ 采用

### 3.7 Field-label（PhoneLabel / CredentialLabel）

```jsonc
default: {
  display: "block",
  fontSize: "$token:typography.body.fontSize",    // 14px
  fontWeight: "500",
  lineHeight: "1.4",
  color: "$token:colors.textSecondary",
  marginBottom: "$token:spacing.xs"               // 4px label-input 距
}
```

### 3.8 Field-error（PhoneError / CredentialError）

```jsonc
default: {
  display: "block",                              // visibleWhen 控制
  fontSize: "$token:typography.caption.fontSize", // 12px
  lineHeight: "1.4",
  color: "$token:colors.error",
  marginTop: "$token:spacing.xs",
  minHeight: "16px"                              // 占位避免 layout shift
}
```

### 3.9 Checkbox（PolicyCheckbox）

```jsonc
default: {
  width: "18px",
  height: "18px",
  border: "1.5px solid $token:colors.border",
  borderRadius: "$token:radius.sm",              // 4px 微圆角，比药丸克制
  backgroundColor: "$token:colors.surfaceElevated",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all $token:transitions.fast.value",
  flexShrink: 0                                  // 不被文字挤变形
}

states:
  hover:    borderColor primary
  checked:  backgroundColor primary + borderColor primary + 内部 ✓ icon (white)
  focus:    boxShadow 0 0 0 2px primaryLight
  disabled: opacity 0.4 + cursor not-allowed
```

### 3.10 Text-h1（BrandLogo 文字版）

```jsonc
default: {
  fontSize: "$token:typography.h1.fontSize",     // 36px
  fontFamily: "$token:typography.h1.fontFamily",
  fontWeight: "$token:typography.h1.fontWeight", // 700
  lineHeight: "$token:typography.h1.lineHeight", // 1.2
  letterSpacing: "-0.02em",                      // 大字号收紧字距
  color: "$token:colors.textPrimary",
  textAlign: "center"
}
```

### 3.11 Layout-Card（FormCard / LockedCard）

```jsonc
default: {
  width: "100%",
  padding: "$token:spacing.lg",                  // 24
  backgroundColor: "$token:colors.surfaceElevated",
  borderRadius: "$token:radius.xl",              // 16（card 比 button 略大，强化"卡片"语义）
  boxShadow: "$token:shadows.sm",                // 主题 soft 策略，shadow 弱化
  border: "1px solid $token:colors.borderLight",
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.md"                       // 字段之间 16
}
```

### 3.12 Layout-Page（rootNode）

```jsonc
screen.backgroundColor = "$token:colors.background"   // #FCFCFD 暖白
rootNode.styles = {
  width: "100%",
  minHeight: "100vh",
  paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.2xl)",
  paddingRight: "$token:spacing.lg",
  paddingBottom: "calc(env(safe-area-inset-bottom) + $token:spacing.lg)",
  paddingLeft: "$token:spacing.lg",
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.xl",                      // 32 区块大间距
  position: "relative",                          // 给装饰节点 absolute 用
  overflow: "hidden"                             // 装饰溢出裁切
}
```

## 4. 各屏 Atom 实例化要求

后续 D-00-login-styles **必须**引用本基线：
- 写 SubmitBtn → 直接抄 §3.1 Button-primary
- 写 PhoneInput / CredentialInput → 直接抄 §3.6 Input-text
- 写 ModeToggle 子按钮 → 直接抄 §3.2 Button-text-tab
- 写 RegisterLink / ForgotLink → 直接抄 §3.3 Button-link
- 写 GetCodeBtn → 直接抄 §3.4 Button-link-icon
- 写 PasswordToggleEye → 直接抄 §3.5 Button-icon
- 写 PolicyCheckbox → 直接抄 §3.9 Checkbox
- 写 PhoneLabel / CredentialLabel → §3.7
- 写 PhoneError / CredentialError → §3.8
- 写 FormCard / LockedCard → §3.11
- rootNode → §3.12

如某节点需要特例（如 SubmitBtn 比基线大）→ 在 D-00-login-styles md 中**显式说明特例理由**。

## 5. 与 ThemeConfig 缺失项的处理

| 检查项 | 状态 |
|-------|:---:|
| colors（语义色 / 灰阶 / 状态色 / 反色） | ✅ 32 个齐 |
| typography（caption ~ display 9 阶）| ✅ 全 |
| spacing（2xs ~ 3xl 8 阶）| ✅ 全 |
| radius（none ~ full 6 阶）| ✅ 全 |
| shadows（sm/md/lg/xl 4 阶）| ✅ 全 |
| transitions（fast/normal/slow）| ✅ 全 |
| iconSpec（outline + simple）| ✅ |
| stateSpec（hover/pressed/focus/disabled/loading）| ✅ |
| Dark scheme（36 colors + 4 shadows overrides）| ✅ |

**结论**：本项目无需退回 theme-generator 补 token。

## 6. 跨屏复用判定（D-templates 预决策）

由于本项目**只有 1 个屏（00-login）**：

| 候选 | 出现次数 | 判定 |
|------|:------:|------|
| 任何 Molecule / Organism | 仅 1 屏出现 | ❌ 不抽（无跨屏复用价值）|

**结论**：D-templates 任务 → 标 `skipped` + notes "单页项目无跨屏复用需求；后续若加注册/忘记密码屏再回头补"。

## 7. ★ 沉淀到 schema 的结论

本任务以 md 留痕为主——`project.meta.designSystem.baseline` 不在标准 ProjectMeta 字段中（避免触发 set_project 顶层字段拦截），改在本 md 留完整规格表，由后续 D-00-login-styles 直接 1:1 引用。

```jsonc
// schema 直接产物：无（本任务纯分析 / 基线留痕）
// 间接约束：
//   D-00-login-styles 写 styles 时必须按本 md §3 中各 Atom 标准规格落库
//   D-00-login-states 写 visualStates 时必须按本 md §3 中各 Atom states 子段落库
//   D-templates 直接 skipped（已在 §6 决策）
```

**自检**：
- ✅ §3 涵盖了登录屏所有 Atom 类型
- ✅ 每种 Atom 给了 default + states 完整规格
- ✅ 关键决策（borderRadius / fontSize 移动端取值）有候选对比 + 否决理由
- ✅ token 缺失检查通过，无需退回上游
