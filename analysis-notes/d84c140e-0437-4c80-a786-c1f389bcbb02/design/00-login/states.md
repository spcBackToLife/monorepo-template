> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-states
> 对应 schema 字段：每节点 node.states[]（VisualState 数组）

# D-00-login-states — visualStates 完备态

## 1. 节点 × 状态矩阵核对

按 methodology/06 最低门槛核对所有交互节点：

| 节点 | 类型 | variant | 应有 states | 是否完备 |
|------|------|---------|-------------|:-------:|
| SubmitBtn | Button | primary | default / hover / pressed / focus / disabled / loading | ✅ 6 态全 |
| CodeModeBtn | Button | tab | default / hover / active(activeWhen) / disabled | ✅ 4 态 |
| PasswordModeBtn | Button | tab | default / hover / active(activeWhen) / disabled | ✅ 4 态 |
| GetCodeBtn | Button | text | default / hover / pressed / disabled / counting(activeWhen) / loading | ✅ 6 态 |
| LockedForgotLink | Button | outline | default / hover / pressed / focus / disabled | ✅ 5 态 |
| PhoneInput | Input | text | default / hover / focus / error(activeWhen) / disabled(activeWhen) | ✅ 5 态 |
| CredentialInput | Input | text | default / hover / focus / error(activeWhen) / disabled(activeWhen) | ✅ 5 态 |
| PasswordToggleEye | Icon-btn | toggle | default / hover / active(activeWhen) | ✅ 3 态 |
| PolicyCheckbox | Checkbox | default | default / focus / disabled | ✅ 3 态（checked 由 native accentColor 自动渲染）|
| RegisterLink | Link | text | default / hover / disabled | ✅ 3 态 |
| ForgotLink | Link | text | default / hover / disabled | ✅ 3 态 |
| PolicyText | Text/Link | inline | default / hover (子链接 hover) | ⚠️ 简化态：不写独立 states（链接是文本行内嵌套，hover 由子 span 处理；本期保持文字色） |

## 2. 关键 visualStates 设计

### 2.1 SubmitBtn 6 态（主 CTA）

| 态 | activeWhen | styles 关键 | childrenVisibility | disabledEvents | transition |
|----|-----------|-------------|--------------------|:---------------|------------|
| default | — | `{}`（继承 styles）| `{ submitSpinner: false }` | — | spring 250ms |
| hover | — | bg=primaryHover / shadow=md / translateY(-1px) | — | ease-out 150ms |
| pressed | — | bg=primaryActive / shadow=sm / scale 0.98 | — | ease-in 80ms |
| focus | — | boxShadow `0 0 0 2px primaryLight` | — | ease-out 150ms |
| disabled | — | bg=gray400 / opacity 0.4 / shadow=none / cursor=not-allowed | — | `["click"]` | ease-in-out 200ms |
| loading | — | cursor=wait / opacity 0.9 | `{ submitSpinner: true }` ★ | `["click"]` | ease-out 200ms |

⚠️ loading 态由 interaction 阶段写的 condition `!state.view.submitting` 守卫触发——但视觉切换由 `node.setVisualState` action 驱动（interaction 阶段写在 SubmitBtn.click → ds-login.onSuccess/onError 末尾把 submitting 切回 false 时同步切回 default）。本任务只负责把"loading"这个视觉态在 schema 中定义到位。

### 2.2 PhoneInput / CredentialInput 5 态

| 态 | activeWhen | styles 关键 |
|----|-----------|-------------|
| default | — | `{}`（继承 styles）|
| hover | — | borderColor `gray300` (#B9BCC4) |
| focus | — | borderColor `primary` + boxShadow `0 0 0 3px primaryLight` |
| error | `{{!!state.view.errors.phone}}` (PhoneInput) / `{{!!state.view.errors.credential}}` (CredentialInput) | borderColor `error` + bg `rgba(221,71,71,0.04)` |
| disabled | `{{state.view.lockedUntil > $.now()}}` （锁定态整表单 disabled）| bg=surface / color=textTertiary / cursor=not-allowed | + disabledEvents=["change","focus"] |

⚠️ error 与 focus 互斥时（用户聚焦在错误字段）—— focus 优先（用户已开始修正）。activeWhen 表达式优先级：error 在表达式真时显示，但 focus 是浏览器 :focus 同时把 borderColor 覆盖为 primary。

### 2.3 ModeToggle Tab（CodeModeBtn / PasswordModeBtn）

| 态 | activeWhen | styles 关键 |
|----|-----------|-------------|
| default | — | `{}` |
| hover | — | color=textPrimary |
| active | `{{state.view.loginMode === 'code'}}` (CodeModeBtn) / `{{state.view.loginMode === 'password'}}` (PasswordModeBtn) | color=primary / fontWeight=600 / borderBottom: 2px solid primary（覆盖父容器底线在该 tab 下）|
| disabled | `{{state.view.lockedUntil > $.now()}}` | opacity 0.4 / cursor=not-allowed | disabledEvents=["click"] |

### 2.4 GetCodeBtn 6 态

| 态 | activeWhen | styles |
|----|-----------|--------|
| default | — | `{}` |
| hover | — | bg=primaryLight / color=primary |
| pressed | — | bg=primaryLight / scale 0.97 |
| counting | `{{state.view.codeCountdown > 0}}` | color=textTertiary | disabledEvents=["click"] |
| disabled | `{{!state.view.form.phone || state.view.form.phone.length<11 || state.view.lockedUntil > $.now()}}` | color=textTertiary / cursor=not-allowed | disabledEvents=["click"] |
| loading | — | color=primary / opacity 0.6 | disabledEvents=["click"] |

⚠️ 实际 `disabled` 与 `counting` 表达式有覆盖关系——counting 优先（倒计时中显示倒计时数字，不显示"获取验证码"）。运行时引擎按 states 数组顺序求值，counting 先匹配。

### 2.5 PasswordToggleEye 3 态

| 态 | activeWhen | styles |
|----|-----------|--------|
| default | — | color=textTertiary |
| hover | — | color=textSecondary / bg=gray100 |
| active | `{{state.view.passwordVisible}}` | color=primary |

### 2.6 PolicyCheckbox 3 态

native input[type=checkbox] 的 checked 由 accentColor 自动渲染。我们写 wrapper 视觉态：

| 态 | activeWhen | styles |
|----|-----------|--------|
| default | — | `{}` |
| focus | — | outline `2px solid primary` + outlineOffset 2px |
| disabled | `{{state.view.lockedUntil > $.now()}}` | opacity 0.4 / cursor=not-allowed |

### 2.7 RegisterLink / ForgotLink / LockedForgotLink

通用链接 3-5 态：
| 态 | styles |
|----|--------|
| default | `{}` |
| hover | color=primary |
| pressed | color=primaryActive |（LockedForgotLink 独有）
| focus | outline 2px primary outlineOffset 2px |（LockedForgotLink 独有）
| disabled | opacity 0.4 / cursor=not-allowed | disabledEvents=["click"] |

## 3. transition 时长决策（统一）

| 切换 | duration | easing |
|------|:------:|--------|
| default → hover | 150ms | cubic-bezier(0.4, 0, 0.2, 1) （= theme.transitions.fast） |
| hover → pressed | 80ms | cubic-bezier(0.4, 0, 1, 1) （ease-in 风味） |
| → focus | 150ms | cubic-bezier(0, 0, 0.2, 1) |
| → disabled | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |
| → loading | 200ms | cubic-bezier(0, 0, 0.2, 1) |
| activeWhen 自动态 | 200ms | cubic-bezier(0.4, 0, 0.2, 1) |

⚠️ visual_state.transition 字段是 { duration, easing }——这里 easing 用 cubic-bezier 直接值（VisualState 的 transition 是简单结构，token 引用不一定支持完整 transition 字符串）。

## 4. activeWhen 表达式清单（全集）

| 节点 | state | activeWhen |
|------|-------|------------|
| PhoneInput | error | `{{!!state.view.errors.phone}}` |
| CredentialInput | error | `{{!!state.view.errors.credential}}` |
| PhoneInput / CredentialInput / PolicyCheckbox / ModeToggle | disabled | `{{state.view.lockedUntil > $.now()}}` |
| CodeModeBtn | active | `{{state.view.loginMode === 'code'}}` |
| PasswordModeBtn | active | `{{state.view.loginMode === 'password'}}` |
| GetCodeBtn | counting | `{{state.view.codeCountdown > 0}}` |
| GetCodeBtn | disabled | `{{!state.view.form.phone || state.view.form.phone.length<11 || state.view.lockedUntil > $.now()}}` |
| PasswordToggleEye | active | `{{state.view.passwordVisible}}` |

## 5. childrenVisibility（spinner/text 切换）

仅 SubmitBtn 用：
- `loading` 态 → `{ "<SubmitSpinner id>": true }`（默认 spinner 不显示）
- `default` / `hover` / `pressed` / `focus` / `disabled` 态 → `{ "<SubmitSpinner id>": false }`

注：SubmitBtn 没有独立"SubmitText"子节点（textContent 由 interaction 阶段写在 SubmitBtn.props.textContent 表达式中）—— spinner 和 text 共存（spinner 在前，text 在后），loading 时 spinner 显示加 gap 即可。所以无需 hide text，只需 show spinner。

## 6. ★ 沉淀到 schema 的结论

将通过 visual_state/add 逐节点添加。子节点 ID 引用：
- SubmitSpinner = `nd_4363095a27b24f7a8aae6`

```jsonc
// 节点 → states 映射（落库清单）：
nd_5a15fd87f060436295b4f (SubmitBtn): 6 states (default, hover, pressed, focus, disabled, loading)
nd_083c744e1699418e9d01e (PhoneInput): 5 states (default, hover, focus, error, disabled)
nd_989c02eb1f224e0c9f973 (CredentialInput): 5 states (default, hover, focus, error, disabled)
nd_fea83ab543584619ab847 (CodeModeBtn): 4 states (default, hover, active, disabled)
nd_fc9f672d68824795b92cd (PasswordModeBtn): 4 states (default, hover, active, disabled)
nd_e6783f85edb3499c9f131 (GetCodeBtn): 6 states (default, hover, pressed, counting, disabled, loading)
nd_017aac6774174ea08b133 (PasswordToggleEye): 3 states (default, hover, active)
nd_42b79eb04cfe4a51bc3e2 (PolicyCheckbox): 3 states (default, focus, disabled)
nd_bc2793bdb54c4603a22be (RegisterLink): 3 states (default, hover, disabled)
nd_24bb133804bb40f1b2833 (ForgotLink): 3 states (default, hover, disabled)
nd_d620d7ba69e2460aa7e16 (LockedForgotLink): 5 states (default, hover, pressed, focus, disabled)

总计：48 个 visualState 写入
```

⚠️ default 态多数留 styles={} 表示"继承默认 styles"——visual_state 引擎会自动把 default 视为 `node.styles` 本身。但仍要显式 add（便于编辑画布预览切换）。
