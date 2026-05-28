# 11-change-password · 修改密码 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#c2-业务规则`
> **全局规范**：`interaction-design/overview.md`
> **入口**：11-account-security / 11-settings → 修改密码

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认空表单 |
| `inputting` | 输入任一字段 |
| `submitting` | 提交修改请求 |
| `success` | 成功 → Toast + 提示其他设备已下线 → pop |
| `error:wrong-old` | 旧密码错（次数 < 3）|
| `error:locked` | 旧密码连续错 3 次 → 锁 30min |
| `error:weak-new` | 新密码不达标 |
| `error:same-as-old` | 新密码 = 旧密码 |
| `error:mismatch` | 新密码与确认不一致 |

### Transitions

```
idle → inputting:              聚焦任一字段
inputting → submitting:        点击保存（全部校验通过）
submitting → success:           API 200
submitting → error:*:           按业务码分发
error:wrong-old × 3 → error:locked: 累计
error:locked → external:        强制走找回密码（pop 跳 00-forgot-password）
success → routed:               L2 Toast + 1.5s 后 pop
```

### Effects

| 转换 | UI |
|-----|----|
| → submitting | 按钮 spinner + 表单禁用 |
| → success | 触觉 success + Toast「修改成功，其他设备已下线」+ 1.5s 后 pop |
| → error:wrong-old | inline 红字「旧密码错误 (1/3)」+ shake + 清空旧密码框 |
| → error:locked | L4 Modal「错误次数过多，请通过找回密码重置」+ 单按钮「去重置」 |
| → error:weak-new | inline + 强度条标红 |
| → error:same-as-old | inline「新密码不能与旧密码相同」 |
| → error:mismatch | inline「两次输入的新密码不一致」（在确认框下方）|

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | 任意非 submitting | scale | 有输入内容→L2 Confirm「内容未保存，是否退出?」 | — | — |
| 2 | 输入旧密码 | input `form-card/old-password-input` | — | 隐藏字符（含眼睛切换）| 错次数累计→shake | — |
| 3 | 输入新密码 | input `form-card/new-password-input` | — | 实时强度条 | 不达标→inline | onBlur 触发对比是否与旧相同 |
| 4 | 输入确认密码 | input `form-card/confirm-password-input` | — | 实时与新密码比对 | 不一致→inline | onBlur 强制对比 |
| 5 | 点击眼睛切换 | click inside `form-card/*password-input` | — | icon 切换 | — | 内联在 input |
| 6 | 点击保存 | click `submit-btn` | 三字段都填 + 校验通过 | press + 触觉 medium | submitting | 见 error:* | 800ms 防抖 |
| 7 | 跳到找回密码 | click `forgot-link` | error:locked / 用户主动 | press | pop → push 00-forgot-password | — | error:locked 时强制路径 |

---

## 加载策略

- 提交：按钮 spinner（L3）

---

## 错误处理

如上 effect 表。所有错误恢复后回 inputting。

---

## 边界情况

- 用户当前 token 即将过期：提交时同时刷新 token
- 修改成功后其他设备强制下线：API 处理，本页只 Toast 提示
- 网络断开：Toast + 按钮恢复
- 长按密码字段「粘贴」：允许（用户密码管理器场景），但完成后强度校验

---

## 节点骨架

```
11-change-password/
├── _page.json
├── app-bar/
│   ├── _block.json             (含 title「修改密码」)
│   └── back-btn.json
├── security-note.json          (顶部提示「修改后所有设备需重新登录」，纯展示)
├── form-card/
│   ├── _block.json
│   ├── old-password-input.json
│   ├── new-password-input.json (含强度条 - 内联在 input)
│   └── confirm-password-input.json
├── forgot-link.json            (默认隐藏，error:locked 显示)
└── submit-btn.json
```

通用组件：`ConfirmDialog`、`Toast`

---

## 产品需求覆盖

- ✅ 规则 1 (旧密码必填且校验) → 操作 #2 + error:wrong-old
- ✅ 规则 2 (新密码 8-20 + 字母+数字 + 不与旧相同) → error:weak-new + error:same-as-old
- ✅ 规则 3 (修改成功其他设备下线) → success effect Toast
- ✅ 规则 4 (失败 3 次锁 30min 走找回密码) → error:locked + 操作 #7
- ✅ 规则 5 (记安全日志 + 强制通知) → API 处理（M8 联动）
