# 02-greets-received · 收到的招呼 · 交互规格

> **产品来源**：`product-analysis/modules/M2-fishing-net.md#b2-被捞到--收到招呼流程`
> **全局规范**：`interaction-design/overview.md`
> **入口**：02-fishing-cast 顶部「我的招呼」/ 通知点击

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading:initial` | 首次进入加载 |
| `loading:more` | 上拉加载更多 |
| `loading:refresh` | 下拉刷新 |
| `visible` | 列表正常展示 |
| `empty` | 暂无招呼 |
| `replying` | 跳转 06-conversation 中 |
| `adding-friend` | 跳转 06-add-friend 中 |
| `declining` | 拒绝 confirm + 提交 |
| `decline-success` | 拒绝成功，项 fade out |
| `error:network` | 列表请求失败 |

### Transitions

```
loading:initial → visible / empty:    数据返回
visible → loading:refresh:           下拉
loading:refresh → visible:           完成
visible → loading:more:              滑到底部
visible → declining:                 点拒绝
declining → decline-success:         接口成功
decline-success → visible:           项 fade out 收起 0.3s
visible → replying → routed:         点回复 → push 06-conversation
visible → adding-friend → routed:    点加好友 → push 06-add-friend
```

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | pop | — | 系统手势同效 |
| 2 | 切到「发出的」| click `top-tabs/sent-tab` | — | indicator 滑动 + 触觉 light | 切到 02-greets-sent（栈替换或同页 Tab）| — | 切换即清除"未读"|
| 3 | 点击列表项展开 | click `greets-list/items` | visible | press | 展开下方 actions 区，其他项折叠 | — | 同时仅 1 项展开 |
| 4 | 点击发起人头像 | click `greets-list/items/avatar` | visible | press | push 02-person-card（受隐私限制）| — | — |
| 5 | 回复 | click `greets-list/actions/reply-btn` | item-expanded | press + 触觉 light | replying → push 06-conversation | — | 接受招呼=建立临时会话 |
| 6 | 加好友 | click `greets-list/actions/add-friend-btn` | item-expanded | press + 触觉 light | adding-friend → push 06-add-friend | — | — |
| 7 | 拒绝 | click `greets-list/actions/decline-btn` | item-expanded | press | L4 Confirm「拒绝后该用户暂时无法再向你打招呼」→ 确认提交 | network → Toast retry | 对方仅看到「对方暂未回复」|
| 8 | 下拉刷新 | pull `greets-list` | visible | indicator | 完成 → 通过 Toast 提示新增数 | network → Toast | — |
| 9 | 上拉加载更多 | scroll `greets-list` 到底 | visible | bottom-spinner | 追加 | network → Toast | 全量加载完 → footer「没有更多了」|

---

## 加载策略

- 进入：skeleton 3 行
- 实时性：返回该页时 refetch（用户可能已在其他设备处理）
- WebSocket 推新招呼：列表顶部插入新项 + 红点角标 + 触觉 light
- ≥3 条未读时合并为一次通知（产品规则 4）→ 通知调度层处理

---

## 错误处理

| 错误 | UI |
|------|----|
| 列表失败 | 全屏 ErrorView 「加载失败」+ 重试 |
| 单项已过期/已被对方撤回 | 项灰显示「已撤回」+ 不可操作 |
| 单项对应用户已封禁/注销 | 项灰 + 文案「该用户已不可达」+ 不可操作 |
| 拒绝接口失败 | 静默重试 1 次 → 仍失败 Toast retry |
| 7 天未操作过期 | 项尾标「已过期」+ 不可操作（保留 30 天后从列表清除）|

---

## 边界情况

- 回复进入 06-conversation 后 pop 回本页 → 该项标记已读但仍在列表
- 加好友后 pop 回 → 该项替换为「已加好友」状态
- 拒绝后用户点撤销（吐司「拒绝」+ 5s 撤销）→ 撤销 → 恢复项
- 招呼对应卡片包含违规内容 → 服务端处理时已不送达，列表不出现
- 招呼到达时用户正在本页 → 顶部插入 + 触觉 light + 短 banner「+1」（非阻塞）
- 隐私模式开启 → 仍可正常收到招呼（隐私模式仅影响开网池）

---

## 节点骨架

```
02-greets-received/
├── _page.json
├── app-bar/
│   ├── _component.json
│   └── back-btn.json
├── top-tabs/
│   ├── _component.json              (received | sent)
│   ├── received-tab.json
│   └── sent-tab.json
├── greets-list/
│   ├── _component.json              (LazyList)
│   ├── items.json               (单条招呼，含展开折叠)
│   └── actions/
│       ├── _component.json          (展开后的操作区)
│       ├── reply-btn.json
│       ├── add-friend-btn.json
│       └── decline-btn.json
└── empty-state/
    └── _component.json              (component, 暂无招呼)
```

通用组件：`Toast`、`ConfirmDialog`、`EmptyState`、`ErrorView`、`Skeleton`

---

## 产品需求覆盖

- ✅ 规则 1 (收到招呼才知道被捞) → API 层保证；本页仅展示
- ✅ 规则 2 (卡片含发起人+留言+来源) → `greets-list/items` 描述
- ✅ 规则 3 (回复/加好友/拒绝三选一) → 操作 #5-#7
- ✅ 规则 4 (≥3 条合并通知) → 通知层处理
- ✅ 规则 5 (7 天未操作过期) → state 描述
