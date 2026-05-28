# 00-auth-status · 认证状态等待 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#c2-业务规则`（认证状态机：reviewing→approved/rejected/appealing）
> **全局规范**：`interaction-design/overview.md`
> **作用**：提交认证后的统一状态页 + 通知点击跳转入口

---

## 状态机

### States

| State | 含义 | 主 CTA |
|------|------|--------|
| `reviewing` | 审核中（默认 24h SLA）| 「去探索一下」/「联系客服」|
| `reviewing:fallback` | 人工审核（48h）| 同上 |
| `approved` | 通过 → 1.5s 后自动跳 00-profile-init | — |
| `rejected` | 驳回，含原因 | 「修改重提」/「立即申诉」 |
| `appealing` | 已提交申诉，等待复核（48h）| 「查看申诉进度」 |
| `polling` | 后台轮询状态变化 |（隐式）|

### Transitions

```
reviewing → polling:        进入页后每 30s 轮询一次状态
polling → reviewing:        状态未变
polling → approved:         状态变 approved
polling → rejected:         状态变 rejected
polling → appealing:        状态变 appealing
approved → routed:          1.5s 动画后 push 00-profile-init (fade)
rejected → resubmitting:    点击「修改重提」→ pop 到 00-auth-id-card
rejected → appealing:       点击「立即申诉」→ push 09-appeal
appealing → polling:        继续轮询
```

### Effects

| 转换 | UI |
|-----|----|
| → reviewing | 沙漏 / 时钟动画（治愈风手绘）+ 标题「审核中」+ 预计时长「约 24h」+ 进度条 |
| → reviewing:fallback | 同上 + 文案改「人工审核约 48h」 |
| → approved | 烟花动画 + ✓ + 触觉 success + 1.5s 后 push profile-init |
| → rejected | 失落小人插画 + 标题「未通过」+ 红色驳回原因卡片 + 双 CTA |
| → appealing | 信件动画 + 标题「申诉处理中」+ 估时 48h + 「查看进度」按钮 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | 非首次进入 | scale | pop | — | 注册流入口此页禁止返回（无 back btn）|
| 2 | 去探索 | click `cta-area/explore-btn` | reviewing/appealing | press | push 01-home-map（受限模式：只看广场公开内容）| — | 顶部持续显示「认证中」Banner |
| 3 | 联系客服 | click `cta-area/contact-btn` | reviewing >24h / fallback >48h | press | 跳 11-feedback?source=auth-status | — | 仅超期才显示 |
| 4 | 修改重提 | click `cta-area/resubmit-btn` | rejected | press | pop 回到 00-auth-id-card；保留原数据 | — | 用户可改学生证/学信网 |
| 5 | 立即申诉 | click `cta-area/appeal-btn` | rejected | press | push 09-appeal?type=verification&id={{userId}} | — | 一次驳回限申诉 1 次 |
| 6 | 查看申诉进度 | click `cta-area/appeal-progress-btn` | appealing | press | push 09-appeal/<id> | — | — |
| 7 | 后台轮询 | timer 30s | reviewing/appealing | 隐式 | 静默更新状态 | 接口失败→静默忽略 | — |
| 8 | 推送通知触达 | 系统通知 click | 任意 | 直接拉起 App → 本页 | 重新拉取状态 | — | 与轮询结果同步 |

---

## 加载策略

- 进入页面：先用本地缓存渲染上次状态 → 后台拉取最新（静默）
- 轮询：每 30s 一次，App 在前台才轮询
- 失败：静默不打扰

---

## 错误处理

| 错误 | UI |
|------|----|
| 拉取状态失败 | 保留上次 + L2 Toast「状态更新失败」+ 手动刷新按钮 |
| 申诉跳转失败 | Toast「跳转失败，请重试」|

---

## 边界情况

- 用户在 reviewing 中卸载/重装 App → 重新登录后自动回本页
- 审核超期 24h 仍 reviewing → 自动转 fallback 状态（服务端逻辑）
- 网络断开 → 静默轮询失败 + 用户主动操作时提示
- 一次注册流的 rejected 申诉超过 1 次 → 「立即申诉」按钮置灰 + 提示「已申诉，请等待」

---

## 节点骨架

```
00-auth-status/
├── _page.json
├── app-bar/
│   ├── _block.json             (注册流入口 back-btn 隐藏；从设置入口才显示)
│   └── back-btn.json
├── status-card/
│   ├── _block.json
│   ├── animation.json          (审核中沙漏 / 通过烟花 / 驳回失落小人 - 按 state 切换)
│   ├── title.json              (状态标题，按 state 切换文案)
│   ├── desc.json               (状态描述，含预计时长)
│   └── reason.json             (驳回原因卡片，仅 rejected 显示)
├── cta-area/
│   ├── _block.json
│   ├── explore-btn.json        (去探索，reviewing/appealing 显示)
│   ├── contact-btn.json        (联系客服，超期显示)
│   ├── resubmit-btn.json       (修改重提，rejected 显示)
│   ├── appeal-btn.json         (立即申诉，rejected 显示)
│   └── appeal-progress-btn.json(查看进度，appealing 显示)
└── refresh-trigger.json        (隐式轮询触发器，trigger=timer)
```

通用组件：`Toast`

---

## 产品需求覆盖

- ✅ 规则 1 (审核中动画 + 预计时长) → state `reviewing` Effect
- ✅ 规则 2 (通过 1.5s 自动跳) → state `approved` Effect
- ✅ 规则 3 (驳回原因 + 申诉 + 重提) → state `rejected` + 操作 #4/#5
- ✅ 规则 4 (申诉中进度 48h) → state `appealing` + 操作 #6
- ✅ 规则 5 (审核中可探索但能力受限) → 操作 #2 受限模式 + 顶部 Banner
