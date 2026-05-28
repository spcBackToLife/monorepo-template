# form-card · 登录表单卡 · 组件结构设计

> **视觉来源**: `design-plan/components/form-card/form-card.visual.md`
> **交互来源**: `interaction-design/pages/00-login.md#form-card`
> **Registry**: `design-registry/pages/00-login/form-card/_component.json`

---

## 1. 组件定位

### 核心职责

承载手机号 + 验证码/密码输入字段组，作为登录/注册等认证流程的统一表单容器。

### 使用场景汇总

| 页面 | 位置 | 使用方式 | 视觉效果 |
|------|------|---------|---------|
| 00-login | 屏幕中心区 | mode=code/password, fields=[phone, code/password] | 白色卡片+阴影+圆角16 |
| 00-register（预期）| 屏幕中心区 | mode=register, fields=[phone, code, password, confirm] | 同上，更多字段 |
| 00-forgot-password（预期）| 屏幕中心区 | mode=reset, fields=[phone, code, newPassword] | 同上 |

### 为什么抽象为组件

- 出现次数: ≥3 次跨认证相关页面
- 状态复杂度: code-mode/password-mode 双模态 + 4 种输入框状态(default/focus/error/disabled)
- 变体需求: 不同页面字段组合不同，但容器样式/动效一致

---

## 2. 结构设计

### 内部层次

```
[form-card] ─── 白色卡片容器
├── [phone-input] ─── 手机号输入框（始终可见）
│   ├── [label] "手机号"
│   ├── [input] type=tel maxLength=11
│   └── [error-msg] (条件: 校验失败)
├── [code-input-group] ─── 验证码组（条件: mode=code）
│   ├── [code-input] 6格验证码
│   │   └── [digit-cell ×6] 单个数字格
│   └── [send-code-btn] "获取验证码" / "60s"
├── [password-input-group] ─── 密码组（条件: mode=password）
│   ├── [label] "密码"
│   ├── [input] type=password
│   ├── [eye-toggle] I-01/I-02 图标按钮
│   └── [error-msg] (条件: 校验失败)
└── [inline-error] ─── 行内错误提示（条件: error 态）
```

### 子元素职责

| 子元素 | 存在条件 | 职责 | 布局规则 |
|--------|---------|------|---------|
| phone-input | 始终 | 接收手机号 | width:100%, mb:12px |
| code-input-group | mode=code | 验证码+获取按钮 | width:100%, flex row |
| password-input-group | mode=password | 密码+可见切换 | width:100%, relative |
| send-code-btn | mode=code | 触发验证码发送 | absolute right, 或 flex-shrink:0 |
| eye-toggle | mode=password | 切换密码可见性 | absolute right 12px |
| error-msg | 校验失败 | 显示错误原因 | mt:4px, 红色 caption |

### 子元素内部属性（固定值）

> executor 实现时直接消费此表。这些是组件内部硬编码的 HTML 属性，不由外部 Props 传入。

| 子元素 | HTML tag | 固定属性 | 说明 |
|--------|---------|---------|------|
| phone-input | input | `type="tel"` `maxLength="11"` `placeholder="请输入手机号"` `inputMode="numeric"` `autoComplete="tel"` | 手机号输入，限 11 位数字 |
| code-input | input | `type="text"` `maxLength="6"` `placeholder="请输入验证码"` `inputMode="numeric"` `autoComplete="one-time-code"` | 6 位验证码，数字键盘 |
| password-input | input | `type="password"` `placeholder="请输入密码"` `autoComplete="current-password"` | 密码输入，支持密码管理器 |
| send-code-btn | button | `type="button"` | 文案由状态控制："获取验证码" / "{countdown}s" |
| eye-toggle | button | `type="button"` `aria-label="切换密码可见性"` | 图标由 passwordVisible 状态切换 I-01/I-02 |
| error-msg | span | `role="alert"` `aria-live="polite"` | 无障碍错误提示 |
| form-card (root) | div | `role="form"` `aria-label="登录表单"` | 表单语义容器 |

### 与外部布局的关系

- 在页面中: 固定宽度 `calc(100% - 32px)` (左右各 16px 页边距)
- 垂直位置: 位于 top-area 下方，submit-btn 上方
- margin: `0 auto`，上下间距由页面级 flex gap 控制

---

## 3. API 设计

### Props 定义

| Prop | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| mode | 'code' \| 'password' | ✅ | 'code' | 当前登录方式 |
| phoneValue | string | ✅ | '' | 手机号值 |
| codeValue | string | ❌ | '' | 验证码值 |
| passwordValue | string | ❌ | '' | 密码值 |
| codeSending | boolean | ❌ | false | 是否正在倒计时 |
| countdown | number | ❌ | 0 | 剩余秒数 |
| errors | Record<field, string> | ❌ | {} | 各字段错误信息 |
| disabled | boolean | ❌ | false | 全表单禁用(submitting) |

### Events 定义

| 事件 | 触发条件 | 回调参数 |
|------|---------|---------|
| onPhoneChange | 手机号输入 | value: string |
| onCodeChange | 验证码输入 | value: string |
| onPasswordChange | 密码输入 | value: string |
| onSendCode | 点击获取验证码 | — |
| onCodeComplete | 6 位验证码填满 | code: string |
| onTogglePassword | 点击 eye toggle | visible: boolean |

---

## 4. 尺寸变体

本组件无尺寸变体，固定规格:

| 属性 | 值 | Token |
|------|------|-------|
| 容器 padding | 24px | spacing-lg |
| 容器 border-radius | 16px | radius-lg |
| 输入框高度 | 48px | — |
| 输入框 padding | 12px 16px | sm + md |
| 输入框 border-radius | 12px | radius-md |
| 输入框 font-size | 16px | body-lg |
| 字段间距 | 12px | — |
| 错误文字 font-size | 12px | caption |
| send-code-btn height | 36px | — |

---

## 5. 视觉变体 × 状态矩阵

### 输入框状态

| 状态 | 背景 | 边框 | 阴影 | 文字色 | label色 |
|------|------|------|------|--------|---------|
| default | #FFFFFF | 1px #FFE0E8 | none | textPrimary | textTertiary(placeholder) |
| focus | #FFFFFF | 2px #FF6F91 | `0 0 0 3px rgba(255,111,145,0.1)` | textPrimary | textSecondary(浮起) |
| error | #FFFFFF | 2px #ED5A5A | `0 0 0 3px rgba(237,90,90,0.1)` | textPrimary | error |
| disabled | rgba(45,36,56,0.03) | 1px #F5EDE6 | none | textTertiary | textTertiary |

### send-code-btn 状态

| 状态 | 文字色 | 背景 | cursor |
|------|--------|------|--------|
| default | #FF6F91 | transparent | pointer |
| hover | #FF6F91 | rgba(255,111,145,0.05) | pointer |
| sending(倒计时) | textTertiary | transparent | not-allowed |
| disabled | textTertiary | transparent | not-allowed |

### 容器状态

| 状态 | 效果 |
|------|------|
| default | 正常显示 |
| error:credential | shake 动画 (X ±4px ×3, 300ms) |
| submitting | 全部输入 disabled 态 |

---

## 6. 状态转换动效

### 转换参数

| 从 → 到 | 动画属性 | 时长 | 缓动 |
|---------|---------|------|------|
| input default → focus | border-color, box-shadow | 200ms | ease-out |
| input focus → default | border-color, box-shadow | 200ms | ease-out |
| input * → error | border-color, box-shadow | 200ms | ease-out |
| label rest → float | transform, font-size, color | 200ms | ease-out |
| label float → rest | transform, font-size, color | 200ms | ease-out |
| code-mode → password-mode | opacity(0→1 / 1→0) | 200ms | ease-out |
| container → shake | translateX keyframe | 300ms | linear |

### Shake 动画规格

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
```

---

## 6.5 交互行为设计

| 交互 | trigger | condition | actions |
|------|---------|-----------|---------|
| 输入手机号 | change | — | state.set({phone: value}), 11位时校验格式 |
| 输入验证码 | change | mode=code | state.set({code: value}), 6位自动提交 |
| 输入密码 | change | mode=password | state.set({password: value}) |
| 获取验证码 | click send-code-btn | phone格式OK && !codeSending | effect.fetch(sendCode) → 成功开始60s倒计时 |
| 切换密码可见 | click eye-toggle | mode=password | state.toggle(passwordVisible) |

---

## 7. 素材索引

| 素材ID | 名称 | 文件路径 | 用途 |
|--------|------|---------|------|
| I-01 | eye-open | `materials/I-01-eye-open.md` | 密码可见状态 |
| I-02 | eye-closed | `materials/I-02-eye-closed.md` | 密码隐藏状态 |

---

## 8. 使用规范

### Token 引用清单

| 类别 | 引用的Token |
|------|-----------|
| 颜色 | surface, border, borderFocus, primary, error, textPrimary/Secondary/Tertiary |
| 间距 | spacing-sm(8), spacing-md(16), spacing-lg(24) |
| 圆角 | radius-md(12), radius-lg(16) |
| 阴影 | shadow-sm |
| 字体 | body-lg(16px), caption(12px), body(14px) |
| 动效 | 200ms ease-out, 300ms linear(shake) |
