# 02-greets-sent · 发出的招呼 · 交互规格

> **产品来源**：`product-analysis/modules/M2-fishing-net.md#b2-被捞到--收到招呼流程`
> **全局规范**：`interaction-design/overview.md`
> **入口**：02-greets-received 顶部 Tab / 02-fishing-cast「我的招呼」

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading:initial` / `loading:more` / `loading:refresh` | 同 received |
| `visible` | 列表正常展示 |
| `empty` | 暂无发出 |
| `withdrawing` | 撤回中 |
| `withdraw-success` | 撤回成功 |
| `withdraw-failed:already-read` | 对方已读，撤回失败 |
| `clearing-finished` | 清空已结束中 |
| `error:network` | — |

### Item 子状态（每条招呼）

| 子状态 | 含义 |
|------|------|
| `pending` | 等待对方响应（1h 内可撤回） |
| `replied` | 对方已回复（可进入会话） |
| `declined` | 对方已拒绝 |
| `expired` | 7 天未响应过期 |
| `withdrawn` | 自己撤回 |
| `violation-removed` | M9 审核后下架（不出现在列表）|

### Transitions

```
loading:initial → visible / empty:   数据返回
visible → withdrawing:              点撤回（仅 pending）
withdrawing → withdraw-success:      成功（对方未读）
withdrawing → withdraw-failed:already-read: 对方已读
visible → clearing-finished:         点清空已结束
visible → routed (06-conversation):  点 replied 项进入会话
```

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | pop | — | — |
| 2 | 切到「收到的」 | click `top-tabs/received-tab` | — | indicator | 切回 02-greets-received | — | — |
| 3 | 清空已结束 | click `app-bar/clear-finished-btn` | 有已结束项 | L4 Confirm「将清除已拒绝/过期/已撤回的招呼记录」+ 确认 | network → Toast | 清空中 spinner + 项 fade out |
| 4 | 点击列表项展开 | click `greets-list/items` | visible | press | 展开 actions（按子状态显示不同按钮）| — | — |
| 5 | 撤回 (pending) | click `greets-list/actions/withdraw-btn` | item:pending + <1h | press + L4 Confirm | withdrawing | already-read→失败 modal | 撤回后对方看不到该招呼 |
| 6 | 进入会话 (replied) | click `greets-list/actions/open-conversation-btn` | item:replied | press | push 06-conversation | — | — |
| 7 | 查看对方主页 | click `greets-list/items/avatar` | — | press | push 02-person-card / 05-profile | 已封禁→Toast | — |
| 8 | 下拉刷新 | pull | visible | indicator | refetch | network → Toast | — |
| 9 | 上拉加载更多 | scroll | visible | bottom-spinner | append | network → Toast | — |

---

## 加载策略

- 进入：skeleton 3 行
- 子状态徽章颜色：pending=warning / replied=success / declined+expired+withdrawn=neutral
- 撤回操作：乐观更新（项立即变 withdrawn）+ 失败回滚

---

## 错误处理

| 错误 | UI |
|------|----|
| 撤回失败（已读）| L4 Modal「对方已读，无法撤回」+ 单按钮 |
| 撤回失败（已超 1h）| L4 Modal「超过 1 小时无法撤回」+ 单按钮 |
| 清空失败 | Toast retry |
| 单项对应用户已注销 | 项尾标「用户已注销」+ 仅可删除 |

---

## 边界情况

- 撤回操作的 1h 计时基于服务端时间，本地仅做近似展示
- 同一目标的多次招呼记录（曾发出→撤回→再发出）→ 分别展示，最新的在最上
- replied 状态点击进入会话时，会话可能已被对方删除 → push 后展示空会话占位
- declined 状态不暴露具体原因（产品规则 4）
- 自己被对方加入黑名单 → 历史招呼仍可见但不可再发新招呼
- 数据量大（≥100 条）→ 默认仅展示最近 50 条 + 「查看更多历史」入口

---

## 节点骨架

```
02-greets-sent/
├── _page.json
├── app-bar/
│   ├── _component.json
│   ├── back-btn.json
│   └── clear-finished-btn.json
├── top-tabs/
│   ├── _component.json
│   ├── received-tab.json
│   └── sent-tab.json
├── greets-list/
│   ├── _component.json
│   ├── items.json               (单条，按子状态展示不同 actions)
│   └── actions/
│       ├── _component.json
│       ├── withdraw-btn.json    (仅 pending 显示)
│       └── open-conversation-btn.json (仅 replied 显示)
└── empty-state/
    └── _component.json              (component)
```

通用组件：`Toast`、`ConfirmDialog`、`EmptyState`

---

## 产品需求覆盖

- ✅ 规则 1 (时间倒序 + 状态徽章) → `greets-list/items`
- ✅ 规则 2 (pending 1h 内可撤回) → 操作 #5
- ✅ 规则 3 (replied 可进入会话) → 操作 #6
- ✅ 规则 4 (declined/expired 不暴露原因) → 仅展示徽章
- ✅ 规则 5 (一键清空已结束) → 操作 #3
