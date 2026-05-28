# 02-fishing-collections · 我的捞捕收藏 · 交互规格

> **产品来源**：`product-analysis/modules/M2-fishing-net.md#b1-开网主线`
> **全局规范**：`interaction-design/overview.md`
> **入口**：02-fishing-cast 顶部「我的收藏」

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading:initial` / `loading:refresh` | 加载 |
| `visible` | 卡片网格展示 |
| `empty` | 暂无收藏 |
| `detail-expanded` | 某张卡片展开详情（sheet 模式）|
| `greeting` | 跳转 02-greet-compose 中 |
| `removing` | 移除中（乐观更新）|
| `clearing-expired` | 清理过期项中 |
| `error:network` | — |

### Item 子状态

| 子状态 | 含义 |
|------|------|
| `active` | 30 天内有效 |
| `expired` | 已过期，置灰不可操作 |
| `target-unavailable` | 目标用户已封禁/注销，置灰不可操作 |
| `already-greeted` | 已对其打过招呼，按钮变「再次打招呼」|

### Transitions

```
loading:initial → visible / empty:   数据返回
visible → detail-expanded:           点击卡片
detail-expanded → visible:           关闭 sheet
visible → greeting → routed:        点打招呼 → push 02-greet-compose
visible → removing:                 点移除 → 项 fade out
removing → visible:                 完成
visible → clearing-expired:          点清理过期
```

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | pop | — | — |
| 2 | 清理过期 | click `app-bar/clear-expired-btn` | 有过期项 | L4 Confirm | clearing-expired → 项 fade out | network → Toast | 仅清理 expired + target-unavailable |
| 3 | 点击卡片查看详情 | click `collections-grid/items` | item:active | press | detail-expanded sheet 弹起，含完整卡片信息 | — | expired 项点击仅 Toast「该收藏已过期」|
| 4 | 关闭详情 | click `collections-grid/sheet-mask` 或下滑 | detail-expanded | press | 关 sheet → visible | — | — |
| 5 | 打招呼 | click `collections-grid/actions/greet-btn` | item:active | press + 触觉 light | greeting → push 02-greet-compose（携带 targetUserId）| 见 greet-compose 错误 | 返回后该项标 already-greeted |
| 6 | 移除 | click `collections-grid/actions/remove-btn` | — | press + L3 Toast Confirm + Undo | 项 fade out 300ms + 列表重排 | network → 静默重试 1 次后回滚 | 支持长按移除（替代手势删除）|
| 7 | 下拉刷新 | pull | visible | indicator | refetch | network → Toast | — |
| 8 | 上拉加载更多 | scroll | visible | bottom-spinner | append | network → Toast | 默认收藏上限 100 |

---

## 加载策略

- 进入：skeleton 4 张卡片占位
- 网格布局：2 列 / 卡片同 fishing-result 拍立得风格但比例更紧凑
- 头像/动态预览图片懒加载

---

## 错误处理

| 错误 | UI |
|------|----|
| 列表失败 | 全屏 ErrorView + 重试 |
| 单卡片图片失败 | 头像占位 |
| 单卡片对应用户已注销/封禁 | 灰显示 + 角标「不可达」+ 仅可移除 |
| 单卡片过期（30 天）| 灰显示 + 角标「已过期」+ 不可打招呼 |
| 收藏已满（上游收藏时触发，本页只展示）| 顶部 banner「收藏已满 100，建议清理」|

---

## 边界情况

- 用户在打招呼后返回 → 该项立即标记 already-greeted（不需 refetch）
- 收藏自动过期不主动通知用户 → 仅当用户进入本页才看到过期标记
- 30 天过期清理为软删除 → 后端保留 30 天后再硬删
- 同一目标在 fishing-result 多次上滑收藏 → 后端去重，仅保留最近一次
- 移除后 5s 内可点 Toast Undo 撤销 → 重新加入列表
- 网格中长按某项 → 进入多选模式（批量移除），点其他空白处退出

---

## 节点骨架

```
02-fishing-collections/
├── _page.json
├── app-bar/
│   ├── _block.json
│   ├── back-btn.json
│   └── clear-expired-btn.json
├── collections-grid/
│   ├── _block.json
│   ├── items.json               (卡片，含 click 展开 + long-press 多选)
│   ├── sheet-mask.json          (详情 sheet 遮罩)
│   └── actions/
│       ├── _block.json          (展开详情 sheet 内的操作)
│       ├── greet-btn.json
│       └── remove-btn.json
└── empty-state/
    └── _block.json              (component)
```

通用组件：`Toast`、`ConfirmDialog`、`EmptyState`、`Sheet`、`ErrorView`

---

## 产品需求覆盖

- ✅ 规则 1 (卡片与撒网结果一致+可展开详情) → `collections-grid/items` + `detail-expanded`
- ✅ 规则 2 (30 天有效+过期清理) → 子状态 expired + 操作 #2
- ✅ 规则 3 (打招呼 / 移除) → 操作 #5/#6
- ✅ 规则 4 (不告知对方) → API 层
- ✅ 规则 5 (注销/封禁置灰) → 子状态 target-unavailable
