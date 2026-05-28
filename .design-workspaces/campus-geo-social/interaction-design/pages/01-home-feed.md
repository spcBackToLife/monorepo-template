# 01-home-feed · 首页 Feed 列表 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#b2-浏览动态主线`
> **全局规范**：`interaction-design/overview.md`
> **角色**：首页的另一种浏览模式（与 01-home-map 平级 Tab）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 首屏加载 skeleton |
| `visible` | 列表已渲染 |
| `empty` | 0 条结果 → 治愈插画 + 3 出口 CTA |
| `refreshing` | 下拉刷新中 |
| `loading-more` | 上拉加载更多中 |
| `no-more` | 已加载全部 → 显示「去广场看看」CTA |
| `error:network` | 拉取失败 |
| `roaming-mode` | 跨校漫游中，互动受限 |

### Transitions

```
loading → visible/empty:           接口返回
visible → refreshing:              下拉手势
visible → loading-more:             触底
loading-more → visible/no-more:    分页结果
visible → routed:                  点卡片 → push 01-moment-detail
visible ↔ map-mode:                顶部 Tab → 01-home-map (replace)
```

### Effects

| 转换 | UI |
|-----|----|
| → loading | skeleton 卡片 ×6 |
| → refreshing | 顶部下拉指示 |
| → loading-more | 底部 loading footer（spinner + 「加载中…」）|
| → no-more | 底部「已经到底啦 · 去广场看看」CTA |
| → empty | 治愈插画 + 三按钮（扩大半径/去广场/发动态）|

---

## 操作清单

| # | 操作 | 触发 | 反馈 | 失败 | 边界 |
|---|------|------|------|------|------|
| 1 | 切换 Map/Feed | click `top-tabs` | tab 滑块移动 | — | replace 01-home-map | 排序/筛选保留 |
| 2 | 切换排序 | click `sort-tabs`（距离/最新/最热） | tab 滑块 + 列表重渲染（fade）| 接口失败→Toast | 切换时 scroll-to-top |
| 3 | 校园切换 | click `app-bar/campus-btn` | press | push 04-campus-switch | — |
| 4 | 搜索 | click `app-bar/search-btn` | press | push 12-search | — |
| 5 | 通知 | click `app-bar/notify-btn` | press（含未读红点）| push 08-notification-list | — |
| 6 | 下拉刷新 | swipe down `feed-list` | 下拉指示 | 失败→保留旧数据+Toast | 5s 防抖 |
| 7 | 上拉加载更多 | scroll to bottom | loading footer | 失败→「点击重试」 | 单页 20 条 |
| 8 | 点击卡片 | click `feed-list/items` | item press | push 01-moment-detail | 卡片标记已删→Toast「该动态已不可见」+ 移除 |
| 9 | 双击点赞（卡片）| double-tap `feed-list/items` | 心形浮现 + 触觉 light | 调 like API | 未认证→引导认证 | 跨校漫游模式禁用 |
| 10 | 长按卡片 | long-press `feed-list/items` | 弹 ActionSheet：举报/屏蔽/复制链接 | — | 漫游模式仅举报可用 |
| 11 | 空状态：扩大半径 | click `empty-state/expand-radius-btn` | press | 半径升一档（如 200→500）重新拉取 | 已 500m→「去广场看看」 | — |
| 12 | 空状态：去广场 | click `empty-state/plaza-btn` | press | push 04-campus-plaza | — | — |
| 13 | 空状态：发动态 | click `empty-state/post-btn` | press | sheet 上滑 01-publish-entry | 未认证→tooltip | — |
| 14 | 点击 + 按钮 | click `fab` | press + 触觉 medium | sheet 上滑（01-publish-entry）| 未认证/漫游→tooltip | 800ms 防抖 |

---

## 加载策略

- 首次：skeleton 卡片 ×6
- 增量：底部 loading footer（不阻塞已渲染内容）
- 下拉刷新：顶部小指示器

---

## 错误处理

| 错误 | UI |
|------|----|
| 首次加载失败 | 全屏 ErrorState（重试按钮）|
| 加载更多失败 | footer「加载失败，点击重试」 |
| 网络断开 | 顶部 banner |
| 卡片图片加载失败 | 占位图（治愈风占位） |

---

## 边界情况

- 列表中某条动态被作者删除/审核下架 → 自动从列表移除并轻微 fade-out
- 滚动到底部触底时网络刚好断开 → footer 显示重试按钮
- 切换排序时已浏览到第 N 页 → 重新从第 1 页拉取
- 卡片含视频 → 仅缩略图，进详情才播放
- 长时间停留页面（>10min）回到顶部触发自动刷新

---

## 节点骨架

```
01-home-feed/
├── _page.json
├── app-bar/
│   ├── _component.json
│   ├── campus-btn.json
│   ├── search-btn.json
│   └── notify-btn.json
├── top-tabs.json                (Map/Feed 切换)
├── sort-tabs.json               (距离/最新/最热)
├── feed-list/
│   ├── _component.json              (component: 列表容器)
│   └── items.json               (动态卡片，含 click/double-tap/long-press)
├── empty-state/
│   ├── _component.json              (component, 引用 overview.md#empty-state)
│   ├── expand-radius-btn.json
│   ├── plaza-btn.json
│   └── post-btn.json
└── fab.json
```

通用组件：`Toast`、`ActionSheet`（长按卡片）、`EmptyState`、`ErrorState`

---

## 产品需求覆盖

- ✅ 规则 1 (三档排序 Tab) → `sort-tabs`
- ✅ 规则 2 (卡片含媒体/文字/距离/路过) → `feed-list/items` 描述（design 阶段细化）
- ✅ 规则 3 (点击进详情) → 操作 #8
- ✅ 规则 4 (下拉刷新/上拉加载/到底 CTA) → 操作 #6/#7 + `no-more` state
- ✅ 规则 5 (空状态三出口) → `empty-state` 三 element
