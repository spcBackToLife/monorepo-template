# 00-register · 注册页 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b1-注册主线-happy-path`
> **全局规范**：`interaction-design/overview.md`
> **下一步**：注册成功自动登录并跳 `00-auth-school-select`

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认空表单 + 协议未勾 |
| `inputting` | 用户在输入任一字段 |
| `code-sending` | 验证码已发，60s 倒计时 |
| `agreement-pending` | 字段都填好但协议未勾 → submit 按钮置灰 |
| `submitting` | 提交注册请求 |
| `success` | 200 + 自动登录 → 跳 auth-school-select |
| `error:invalid-phone` | 手机号格式/已注册 |
| `error:code` | 验证码错 |
| `error:weak-password` | 密码强度不符 |
| `error:risk-control` | 同 IP 同设备风控触发 |

### Transitions

```
idle → inputting:               任一字段聚焦
inputting → agreement-pending:   所有字段填完但协议未勾
agreement-pending → inputting:   勾选协议
inputting → code-sending:        点击获取验证码（手机号合法）
code-sending → inputting:        60s 倒计时结束
inputting → submitting:          点击注册（前端校验+协议都通过）
submitting → success:            API 200
submitting → error:*:            按业务码分发
error:* → inputting:             用户修改输入
success → routed:                自动登录 → push 00-auth-school-select (push)
```

### Effects

| 转换 | UI |
|-----|----|
| → agreement-pending | submit 按钮置灰 + 协议复选框抖动 1 次提示 |
| → code-sending | 「获取验证码」灰 + 倒计时 |
| → submitting | 表单全禁用 + 按钮 spinner |
| → success | 按钮 ✓ + 触觉 success + 500ms 后 push |
| → error:invalid-phone (已注册) | L4 Modal「此手机号已注册，是否登录?」+ 跳 login 按钮 |
| → error:risk-control | L4 Modal「检测到异常，请稍后重试 / 联系客服」|

---

## 操作清单

| # | 操作 | 触发 | 前置 | 即时 | 进行中 | 成功 | 失败 | 边界 |
|---|------|------|-----|-----|-------|------|------|------|
| 1 | 输入手机号 | input `form-card/phone-input` | — | 实时校验 11 位 | onBlur 异步查重 | 通过激活下一步 | 已注册→Modal | 自动 +86 |
| 2 | 获取验证码 | click `form-card/send-code-btn` | 手机号合法 | press 态 | 倒计时 60s | Toast「已发送」| 通道异常→语音备选 | 24h 10 次上限 |
| 3 | 输入验证码 | input `form-card/code-input` | code-sending | 6 格自动跳焦 | — | 填完后激活 submit | 错 ≥3 次 → 锁 1min 重新获取 | 短信预填 |
| 4 | 输入密码 | input `form-card/password-input` | — | 实时强度条（弱/中/强）| — | 长度+组合合法激活 submit | 不达标→inline 提示 | 含眼睛切换；不强制特殊字符 |
| 5 | 勾选协议 | click `agreement-row/checkbox` | — | checkbox scale + 触觉 light | — | 状态变化 | — | 复选框默认未勾 |
| 6 | 点击协议链接 | click `agreement-row/link-user/-privacy/-guidelines` | — | text underline | push WebView / push 09-community-guidelines(source=register) | — | — | 阅读公约返回后自动勾选 checkbox |
| 7 | 点击注册 | click `submit-btn` | 全部校验通过 + 协议已勾 | press + 触觉 medium | submitting | 跳 auth-school-select | 见 error:* | 800ms 防抖 |
| 8 | 点击已有账号登录 | click `footer/login-link` | — | text underline | pop / push 00-login | — | — | 带手机号回传 |

---

## 加载策略

- 进入页：无加载
- 验证码：按钮内 spinner
- 提交：按钮 spinner + 表单禁用

---

## 错误处理

| 错误 | UI |
|------|----|
| 手机号格式错 | inline 红字 |
| 已注册 | L4 Modal「是否登录？」|
| 验证码错 < 3 | inline + shake + 清空 |
| 验证码错 ≥3 | inline「错误次数过多」+ 1min 后可重新获取 |
| 密码不达标 | inline + 强度条标红 |
| 风控触发 | L4 Modal + 客服入口 |
| 网络/超时 | Toast + 按钮恢复 |

---

## 边界情况

- 30 分钟内异常退出 → 注册进度本地缓存，重新进入提示「继续上次注册?」
- 同设备指纹一天限注册 1 个 → 第 2 次 → error:risk-control
- 协议链接打开后返回 → 自动勾上对应 checkbox 项
- iOS 短信预填覆盖手动输入
- 注册成功但跳转 auth-school-select 失败 → 提示「请重新打开 App」

---

## 节点骨架

```
00-register/
├── _page.json
├── top-area/_component            (标题/slogan，纯展示)
├── form-card/
│   ├── _component.json
│   ├── phone-input.json
│   ├── code-input.json
│   ├── send-code-btn.json
│   └── password-input.json
├── agreement-row/
│   ├── _component.json
│   ├── checkbox.json
│   ├── link-user.json         用户协议 link
│   ├── link-privacy.json      隐私政策 link
│   └── link-guidelines.json   社区公约 link
├── submit-btn.json
└── footer/
    ├── _component.json
    └── login-link.json
```

通用组件：`ConfirmDialog` (已注册引导/风控)、`Toast`

---

## 产品需求覆盖

- ✅ 规则 1 (协议必勾) → `agreement-pending` 状态 + 操作 #5/#6
- ✅ 规则 2 (已注册引导跳登录) → `error:invalid-phone` Modal
- ✅ 规则 3 (60s 不重发 / 3 次错锁 1min) → 操作 #2/#3
- ✅ 规则 4 (密码 8-20 字母+数字) → 操作 #4
- ✅ 规则 5 (注册成功跳 auth-school-select) → `success → routed`
