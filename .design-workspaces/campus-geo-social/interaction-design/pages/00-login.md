# 00-login · 登录页 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b3-登录流程`
> **全局规范**：`interaction-design/overview.md`
> **默认 mode**：验证码免密（D2 决策：友好优先，降低门槛）

---

## 状态机

### States

| State | 含义 | 关键 UI |
|------|------|---------|
| `idle:code-mode` | 验证码登录（默认）| 手机号 + 验证码框 + 获取验证码 |
| `idle:password-mode` | 密码登录 | 手机号 + 密码框 |
| `inputting` | 用户正在输入（任一字段） | 实时校验 |
| `code-sending` | 验证码已发出，60s 倒计时中 | 获取按钮置灰显倒计时 |
| `submitting` | 登录请求中 | 按钮 spinner |
| `success` | 200 + token 拿到 | ✓ + 0.5s 跳目标页 |
| `error:credential` | 账号/密码/验证码错 | inline 红字 + shake |
| `error:locked` | 密码错 ≥5 次 / 验证码错 ≥3 次 | L4 Modal「账号锁定 30min」 |
| `error:banned` | 账号被封禁 | L4 Modal + 封禁原因 + 申诉入口 |
| `error:logging-off` | 注销缓冲期 | L4 Modal「正在注销，是否撤回?」 |
| `error:remote-login` | 异地登录需主设备确认 | L2 Toast「主设备已收到通知」+ 等待确认 |

### Transitions

```
idle:code-mode ↔ idle:password-mode:  点击 mode-toggle
* → inputting:                         任一字段获得焦点
inputting → idle:code-mode:            清空所有字段或 blur
idle → code-sending:                   点击「获取验证码」（手机号校验通过）
code-sending → idle:code-mode:         60s 倒计时结束
inputting → submitting:                点击登录按钮（前端校验通过）
submitting → success:                  API 200 + 校验 status==active
submitting → error:credential:         401 / 业务码 30001/30002/30003
submitting → error:locked:             业务码 30004
submitting → error:banned:             业务码 30100 + 数据 ban_reason
submitting → error:logging-off:        业务码 30101 + scheduled_clean_at
submitting → error:remote-login:       业务码 30102（需主设备确认）
error:* → inputting:                   用户修改输入 / Modal 关闭
success → routed:                      跳转目标页（首选 01-home-map；若 verificationStatus=reviewing 则跳 00-auth-status）
```

### Effects

| 转换 | UI |
|-----|----|
| → idle:code-mode | 验证码输入框 + 获取按钮，密码框淡出 |
| → idle:password-mode | 密码框 + 眼睛切换，验证码输入框淡出；mode-toggle 滑块右移 200ms spring |
| → code-sending | 「获取验证码」按钮置灰 + 文案「60s」倒计时 |
| → submitting | 登录按钮内 spinner + 表单全禁用 |
| → success | 按钮 spinner → ✓ 背景变薄荷绿 + 触觉 success + 0.5s 后 fade 跳转 |
| → error:credential | 按钮恢复 + 表单 shake (X ±4px ×3) + 错字段下方红字 + 密码/验证码清空并聚焦 + 触觉 error |
| → error:locked/banned/logging-off | L4 Modal 上滑 350ms + 蒙层 fade |
| → error:remote-login | Toast 顶部下滑 + 「等待主设备确认」按钮（轮询 30s）|

---

## 操作清单

| # | 操作 | 触发 | 前置 | 即时反馈 | 进行中 | 成功 | 失败 | 边界 |
|---|------|------|-----|---------|-------|------|------|------|
| 1 | 切换登录方式 | click `mode-toggle` | — | toggle 滑块 spring 移动 | — | 切到对应表单（淡入 200ms）| — | inputting 中切换保留手机号 |
| 2 | 输入手机号 | input `form-card/phone-input` | — | label 上浮 + 字号实时显示 | 输够 11 位即时格式校验 | 校验通过则解锁验证码/登录按钮 | 格式错→红字「请输入正确的手机号」 | iOS 自动从短信预填 +86 |
| 3 | 获取验证码 | click `form-card/send-code-btn` | 手机号格式 OK + state!=code-sending | 按钮 press + 触觉 light | code-sending：spinner 200ms → 倒计时 60s | Toast「已发送，注意查收」+ 按钮变倒计时 | 手机号格式错→inline；接口失败→Toast + 按钮恢复 | 60s 内重复点击忽略；24h 单号 10 次后接口拒绝 |
| 4 | 输入验证码 | input `form-card/code-input` | code-mode | 6 格自动跳焦点；最后一位填完自动 trigger 提交 | — | submit-btn 自动激活 | 格式错（非数字）→ 拒绝输入 | 短信预填权限自动一键填充 |
| 5 | 输入密码 | input `form-card/password-input` | password-mode | label 上浮；密度条实时变化 | onBlur 强度提示 | 长度满足激活 submit | 弱密码 → 仅提示不阻断 | 眼睛按钮内联在输入框右侧 toggle 明/暗 |
| 6 | 点击登录 | click `submit-btn` | 表单校验通过 | 按钮 press + 触觉 light | submitting：按钮 spinner + 表单禁用 | success effect → 跳目标页 | 见 error:* 状态机 | 重复点击防抖 800ms；15s 超时恢复 + Toast |
| 7 | 点击注册 | click `footer/register-link` | — | text underline 变色 | push 00-register | — | — | 当前手机号自动带过去 |
| 8 | 点击忘记密码 | click `footer/forgot-link` | — | text underline 变色 | push 00-forgot-password | — | — | 当前手机号自动带过去 |
| 9 | 异地登录确认 | 主设备 push 通知 → 主设备点击「是」 | error:remote-login | — | 主设备通过 → 本设备 success | 主设备拒绝/30s 超时 → error:credential 提示「确认失败」| — | 轮询每 3s 查询 |

---

## 加载策略

- 进入页面：无网络请求，瞬间可见
- 验证码发送：按钮内 spinner（L3）
- 登录提交：按钮内 spinner + 表单禁用（L3）

---

## 错误处理

| 错误类型 | 触发 | UI |
|---------|------|----|
| 手机号格式错 | onBlur | inline 红字 |
| 验证码错（次数 < 3）| API 30001 | inline 红字 + 框 shake + 自动清空 + 聚焦 |
| 密码错（次数 < 5）| API 30002 | inline 红字 + 表单 shake + 清密码框 + 聚焦 |
| 锁定 | API 30004 | L4 Modal「账号锁定 30 分钟」+ 「忘记密码？」按钮 |
| 封禁 | API 30100 | L4 Modal + 封禁原因/期限 + 「申诉」按钮 → push 09-appeal |
| 注销缓冲期 | API 30101 | L4 Modal「正在注销，是否撤回?」+ 撤回 / 继续注销 双按钮 |
| 网络/超时 | timeout 15s | L2 Toast「网络异常」+ 按钮恢复 |
| 短信通道异常 | API send-code 失败 | L4 Sheet「短信失败，是否改用语音验证码？」|

---

## 边界情况

- **手机号已注册但忘了**：用户走验证码登录，校验通过后正常进入（系统会识别为已注册）
- **未注册手机号 + 验证码登录**：返回 30005 → 跳出 Modal「未注册，是否注册?」→ Yes 跳 00-register
- **同时密码错 5 次 + 验证码也错 3 次**：以更严限制为准（锁定）
- **App 后台切回**：保留输入状态；如 token 已被异地登录顶替则提示
- **iPhone 自动从 SMS 预填验证码**：自动填充 6 位 + 直接提交（用户可视设置关闭）
- **键盘弹起时按钮被遮挡**：scroll 让登录按钮自动滚到键盘上方 + 8px

---

## 节点骨架（已剔除纯展示元素）

```
00-login/
├── _page.json
├── top-area/_block            (block, 内含 logo + slogan，无 trigger，不再独立建)
├── mode-toggle.json            切换登录方式（验证码/密码 双 tab）
├── form-card/
│   ├── _block.json
│   ├── phone-input.json        手机号输入框
│   ├── code-input.json         6 格验证码（code-mode）
│   ├── password-input.json     密码框（password-mode，含眼睛切换 - 内联）
│   └── send-code-btn.json      获取验证码按钮（含 60s 倒计时）
├── submit-btn.json             登录按钮
└── footer/
    ├── _block.json
    ├── register-link.json      跳注册
    └── forgot-link.json        跳忘记密码
```

通用组件（不在本目录建，引用 `overview.md#九-共享组件交互索引`）：
- `ConfirmDialog` — 锁定/封禁/注销缓冲期/未注册引导
- `Toast` — 短信发送成功/网络错/超时

---

## 产品需求覆盖

- ✅ 规则 1 (默认验证码) → state `idle:code-mode` 为初始态
- ✅ 规则 2 (密码 5 次锁 30min) → `error:locked` + 操作 #6 错误处理
- ✅ 规则 3 (异地登录二次确认) → `error:remote-login` + 操作 #9
- ✅ 规则 4 (跳注册/忘记密码) → 操作 #7/#8
- ✅ 规则 5 (封禁/注销引导处理页) → `error:banned` + `error:logging-off`
