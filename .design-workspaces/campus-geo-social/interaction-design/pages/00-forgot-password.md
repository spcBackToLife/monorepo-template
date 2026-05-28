# 00-forgot-password · 忘记密码 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b4-找回密码流程`
> **全局规范**：`interaction-design/overview.md`

---

## 状态机

### States

| State | 含义 |
|------|------|
| `step:phone` | 第 1 步：输手机号 + 验证码 |
| `step:new-password` | 第 2 步：设新密码 + 确认 |
| `code-sending` | 60s 倒计时 |
| `submitting` | 提交重置请求 |
| `success` | 重置成功，自动登录跳主页 |
| `error:not-registered` | 手机号未注册 |
| `error:code` | 验证码错 |
| `error:same-password` | 新旧密码相同 |
| `error:risk-control` | 24h ≥3 次重置 → 人工申诉 |

### Transitions

```
step:phone → step:new-password:   验证码校验通过
step:new-password → submitting:    点击重置
submitting → success:              API 200 + 自动登录
submitting → error:same-password:  新密码与旧密码相同
submitting → error:risk-control:   24h 上限触发
error:* → step:*:                  用户修改输入
success → routed:                  push 01-home-map (fade)
```

### Effects

| 转换 | UI |
|-----|----|
| step:phone → step:new-password | 顶部进度 1/2 → 2/2；表单切换动画（旧字段右滑出，新字段左滑入 300ms）|
| → error:not-registered | L4 Modal「未注册，是否去注册?」 |
| → error:risk-control | L4 Modal「请通过客服申诉」+ 联系客服按钮 |
| → success | 按钮 ✓ + 触觉 success + 500ms fade 跳主页 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 输入手机号 | input `form-card/phone-input` | step:phone | 实时校验 | 未注册→Modal | 路由参数自动带入 |
| 2 | 获取验证码 | click `form-card/send-code-btn` | 手机号合法 | 倒计时 60s | 通道异常→语音备选 | 24h 上限 10 次 |
| 3 | 输入验证码 | input `form-card/code-input` | code-sending | 6 格 → 自动 next 步 | ≥3 次错→重新获取 | 自动跳格 |
| 4 | 输入新密码 | input `form-card/new-password-input` | step:new-password | 强度条 | 不达标→inline | 含眼睛切换 |
| 5 | 输入确认密码 | input `form-card/confirm-password-input` | step:new-password | 实时比对 | 不一致→inline | onBlur 触发对比 |
| 6 | 点击重置 | click `submit-btn` | 全部校验通过 | submitting | error:same-password / risk-control | 800ms 防抖 |

---

## 加载/错误/边界

- 加载：按钮内 spinner
- 错误处理同 `overview.md#三-错误处理模式`
- 边界：跨步骤返回保留已输入数据；30 分钟内异常退出可恢复

---

## 节点骨架

```
00-forgot-password/
├── _page.json
├── app-bar/_component             (含 back 按钮，挂 _component 描述)
├── app-bar/back-btn.json
├── progress-indicator.json    (1/2 → 2/2 步骤指示，trigger=none，但作为独立 element 因为有 state 切换)
├── form-card/
│   ├── _component.json
│   ├── phone-input.json
│   ├── code-input.json
│   ├── send-code-btn.json
│   ├── new-password-input.json
│   └── confirm-password-input.json
└── submit-btn.json
```

通用组件：`ConfirmDialog`、`Toast`

---

## 产品需求覆盖

- ✅ 规则 1 (未注册引导注册) → `error:not-registered` Modal
- ✅ 规则 2 (24h ≥3 次走人工申诉) → `error:risk-control` Modal
- ✅ 规则 3 (新旧密码不能相同) → `error:same-password`
- ✅ 规则 4 (重置成功自动登录跳主页) → `success → routed`
- ✅ 规则 5 (不展示原密码) → 仅采集手机号 + 新密码
