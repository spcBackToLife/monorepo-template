# 02-greet-compose · 招呼输入 · 交互规格

> **产品来源**：`product-analysis/modules/M2-fishing-net.md#b2-被捞到--收到招呼流程`
> **全局规范**：`interaction-design/overview.md`
> **入口**：02-fishing-result / 02-fishing-collections → 打招呼

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 拉取每日剩余次数 + 钻石余额 |
| `visible` | 默认：预设话术 + 自定义输入 |
| `composing` | 自定义文本输入中 |
| `emoji-picking` | 表情选择器弹起 |
| `submitting` | 发送中 |
| `success` | Toast「招呼已发送」+ pop |
| `error:rate-limit` | 今日 3 次免费用完 → sheet 显示「再发需消耗 X 钻石」 |
| `error:insufficient-diamonds` | 钻石不足，引导购买 |
| `error:violation` | 招呼内容触发 M9 文本审核违规 |
| `error:blacklisted-by-target` | 该用户 30 天内拒绝过你 |
| `error:network` | 网络异常 |

### Transitions

```
loading → visible:                  数据返回
visible → composing:                输入框聚焦
composing → emoji-picking:           点表情按钮
emoji-picking → composing:           选定/关闭
visible → submitting:               点预设话术（直接发送）
composing → submitting:              点发送按钮
submitting → success → routed:      pop 回上游页
submitting → error:rate-limit:        免费次数用完→sheet 确认消耗钻石
error:rate-limit → submitting:        用户确认消耗钻石
submitting → error:insufficient-diamonds: 钻石不足
```

### Effects

| 转换 | UI |
|-----|----|
| → composing | 键盘弹起 + 字符计数显示 |
| → emoji-picking | 表情面板从底部滑入 250ms |
| → submitting | 发送按钮 spinner + 表单禁用 |
| → success | ✓ 动画 + 触觉 success + Toast「已发送」+ 0.5s pop |
| → error:rate-limit | L4 Sheet「再发一条招呼需消耗 1 钻石，确认?」+ 当前余额 |
| → error:violation | L4 Modal「招呼内容不符合公约，请修改」+ 关键词高亮 |
| → error:blacklisted-by-target | L4 Modal「对方暂不希望被打招呼」+ 单按钮 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | 有输入→Confirm「内容未发送」+ Yes pop / No 取消 | — | 系统返回手势同效 |
| 2 | 点击预设话术 | click `preset-list/items` | visible | press + 触觉 light | submitting（不打开 composing）→ 直接发送 | 见 error:* | 8-10 条预设，每条 ≤30 字 |
| 3 | 输入自定义 | input `custom-input` | — | label 上浮 + 字符计数 N/50 | >50 字→拒绝输入 | emoji 支持；含 emoji 计 1 字符 |
| 4 | 选表情 | click `emoji-trigger` | — | press | emoji-picking 面板上滑 | — | 仅 1 个表情上限 |
| 5 | 选定表情 | click `emoji-picker/items` | emoji-picking | press + 触觉 light | 插入 emoji + 关 picker | 已有 1 个表情→替换 | — |
| 6 | 关闭表情面板 | click `emoji-picker/mask` 或下滑 | emoji-picking | press | 关 picker | — | — |
| 7 | 发送自定义 | click `send-btn` | text 非空 | press + 触觉 light | submitting | 见 error:* | 800ms 防抖 |
| 8 | 确认消耗钻石（rate-limit）| click `confirm-cost-sheet/yes-btn` | error:rate-limit | press | 提交 + 扣钻石 | 钻石不足→error:insufficient-diamonds | — |
| 9 | 取消消耗（rate-limit）| click `confirm-cost-sheet/no-btn` | error:rate-limit | press | 关 sheet 回 visible | — | — |
| 10 | 充值（钻石不足）| click `insufficient-diamonds-sheet/buy-btn` | error:insufficient-diamonds | press | push 07-shop | 返回后自动复检 | — |

---

## 加载策略

- 进入页：< 200ms（异步拉余额，先用本地缓存）
- 发送：按钮 spinner + 表单禁用
- M9 审核：异步（提交时不阻断），违规则推送通知 + 撤回招呼

---

## 错误处理

| 错误 | UI |
|------|----|
| 文本审核违规 | L4 Modal + 关键词高亮 + 「修改」按钮 |
| 对方拒绝过 | L4 Modal + 仅「确定」按钮（不暴露具体原因） |
| 钻石不足 | sheet 引导购买 |
| 网络失败 | inline 红字「发送失败」+ 重试按钮 + 保留输入 |
| 撤回（1h 内）| 在 02-greets-sent 完成，不在本页 |

---

## 边界情况

- 同一用户已发送过未读招呼 → 进入本页时 banner「上一条招呼对方尚未阅读，是否替换?」+ Yes 替换 / No 返回
- 用户在打招呼过程中道具/钻石变化（其他设备）→ 实时检测，发送时再校验
- 表情面板键盘冲突 → 表情面板替换键盘高度，键盘自动收起
- 自定义文本 + 1 表情同时使用 → 上限 50 字 + 1 emoji
- 预设话术若含动态变量（如「在 {{location}} 想认识你」）→ 客户端自动注入

---

## 节点骨架

```
02-greet-compose/
├── _page.json
├── app-bar/
│   ├── _block.json
│   ├── back-btn.json
│   └── target-info.json         (右侧迷你头像+昵称，纯展示)
├── diamond-cost-info.json       (剩余 3/3 免费次数 + 钻石消耗，纯展示)
├── preset-list/
│   ├── _block.json
│   └── items.json               (预设话术，click 直接发送)
├── divider.json                 (or 分隔线，纯展示)
├── custom-input.json            (自定义文本输入)
├── emoji-trigger.json           (表情触发按钮)
├── emoji-picker/
│   ├── _block.json              (component: 表情面板)
│   ├── mask.json
│   └── items.json
├── send-btn.json
├── confirm-cost-sheet/
│   ├── _block.json              (component: rate-limit 时的钻石消耗确认)
│   ├── yes-btn.json
│   └── no-btn.json
└── insufficient-diamonds-sheet/
    ├── _block.json
    └── buy-btn.json
```

通用组件：`Toast`、`ConfirmDialog`、`Sheet`

---

## 产品需求覆盖

- ✅ 规则 1 (8-10 条预设破冰话术) → `preset-list/items`
- ✅ 规则 2 (自定义 ≤50 字 + 1 表情) → `custom-input` + `emoji-picker`
- ✅ 规则 3 (每日 3 次免费 + 超出钻石) → `diamond-cost-info` + state `error:rate-limit`
- ✅ 规则 4 (30 天黑名单) → state `error:blacklisted-by-target`
- ✅ 规则 5 (1h 内可撤回) → 在 greets-sent 完成
- ✅ 规则 6 (M9 异步审核) → state `error:violation`（异步通知）
