# 01-home-map · 首页地图 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#b2-浏览动态主线`
> **全局规范**：`interaction-design/overview.md`
> **角色**：App 默认主页（认证通过后落地）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `bootstrapping` | 获取定位 + 拉取首屏动态点位 |
| `visible` | 地图渲染完成，有动态点位 |
| `empty` | 当前半径内无动态 → 空气泡 + 「试试扩大半径」CTA |
| `refreshing` | 下拉刷新中 |
| `cluster-open` | 聚合气泡被点开，sheet 列表上滑 |
| `permission-denied` | 定位被拒 → 主校园中心 + 全屏引导卡 |
| `roaming-mode` | 跨校漫游中 → 顶部 banner + 互动受限 |
| `error:network` | 拉取动态失败 |
| `error:gps` | GPS 异常（信号弱/室内）|

### Transitions

```
bootstrapping → visible:        定位+数据成功
bootstrapping → empty:          定位成功但 0 个点位
bootstrapping → permission-denied: 定位被拒
bootstrapping → error:gps:      定位超时 15s
visible → refreshing:           下拉手势触发
refreshing → visible:           接口返回
visible → cluster-open:         点击聚合气泡
cluster-open → visible:         关闭 sheet
visible → routed:               点击单个 marker → push 01-moment-detail
visible ↔ feed-mode:            切到 01-home-feed（顶部 tab）
visible → roaming-mode:         跨校漫游模式（M4 触发）
permission-denied → bootstrapping: 用户授权
```

### Effects

| 转换 | UI |
|-----|----|
| → bootstrapping | 全屏 skeleton 地图 + spinner |
| → visible | 点位 stagger 淡入 200ms（按距离从近到远）|
| → refreshing | 顶部下拉指示 → 球形 spinner → 释放即转动 |
| → cluster-open | sheet 350ms 上滑 + 蒙层 fade |
| → permission-denied | 地图淡化 + 中央卡片淡入 |
| → roaming-mode | 顶部 banner 下滑 + 互动按钮置灰 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 切换 Map/Feed | click `top-tabs` | — | tab 滑块 spring 移动 | — | push 01-home-feed (replace 不堆栈) | 状态/筛选条件保留 |
| 2 | 切换半径 50/200/500m | click `radius-toggle` | — | 半径圈圈缩放动画 + 重新拉数据 | 同 #6 | 圈圈实时叠加显示覆盖范围 |
| 3 | 切换校园 | click `app-bar/campus-btn` | — | press | push 04-campus-switch | — | 跨校漫游中显示当前所在校 |
| 4 | 顶部搜索 | click `app-bar/search-btn` | — | press | push 12-search?source=home-map | — | — |
| 5 | 通知中心 | click `app-bar/notify-btn` | — | press（含未读红点）| push 08-notification-list | — | 未读 ≥99 显示 99+ |
| 6 | 下拉刷新 | swipe down on `map-canvas` | visible/empty | 顶部进度指示 | 失败→Toast「网络异常」+ 保留旧数据 | 5s 内连续下拉防抖 |
| 7 | 平移/缩放地图 | gesture on `map-canvas` | visible | 实时跟手 | — | 缩放越界回弹 | 大幅平移触发自动重新拉数据 |
| 8 | 点击 marker（单个点位）| click `map-canvas/markers` | visible | marker scale + 触觉 light | push 01-moment-detail | 已被删除/审核下架→Toast「该动态已不可见」 | 跨校漫游模式可点但只看不能互动 |
| 9 | 点击聚合气泡 | click `map-canvas/clusters` | visible (≥3 点位聚合) | bubble scale + 触觉 light | sheet 上滑展示该位置动态列表 | — | — |
| 10 | 点击 sheet 中动态 | click `cluster-sheet/items` | cluster-open | item press | push 01-moment-detail | — | — |
| 11 | 关闭聚合 sheet | click `cluster-sheet/mask` 或下滑手势 | cluster-open | sheet 下滑 250ms | — | — | — |
| 12 | 点击发布 + 按钮 | click `fab` | 非 roaming-mode + 已认证 | press + 触觉 medium | sheet 上滑（01-publish-entry）| 未认证/审核中→tooltip 提示；漫游中→tooltip「回主校园」 | 800ms 防抖 |
| 13 | 开启定位授权 | click `permission-card/grant-btn` | permission-denied | press | 跳系统设置或直接弹系统授权框 | 拒绝→保留 permission-denied 状态 | iOS/Android 行为差异 |
| 14 | 回到当前位置 | click `recenter-btn`（permission ok 时显示）| visible | press + 触觉 light | 地图平移到 GPS 中心 + 缩放级别复位 | — | 漫游模式置灰 |
| 15 | 关闭跨校漫游 banner | click `roaming-banner/exit-btn` | roaming-mode | press | 调 M4 退出漫游 → 回主校园 | — | 与 banner 同步消失 |

---

## 加载策略

- 首次：skeleton 地图 + spinner（L4 全屏占位 1.5s 内）
- 数据增量拉取：静默替换（visible 状态保留）
- 下拉刷新：顶部小指示器（L1）
- 缩放/平移：throttled 拉取，仅 viewport 内点位

---

## 错误处理

| 错误 | UI |
|------|----|
| 定位被拒 | permission-card 全屏占位 + 「开启定位」按钮 + 「先以主校园为中心浏览」次按钮 |
| GPS 信号弱/15s 超时 | Toast「定位失败」+ 显示最近一次缓存位置 |
| 接口 5xx | L2 Toast + 保留旧数据 + 顶部下拉重试 |
| 网络断开 | 顶部 banner「无网络」+ 隐藏 marker |
| 单个 marker 失效 | 点击后 Toast「该动态已不可见」+ 移除该点位 |

---

## 边界情况

- 进入页时若 verificationStatus≠approved → 顶部 banner「认证中可浏览，不可发布」+ fab 置灰
- 半径切换后无结果 → 进入 `empty` 而非保留旧点位
- 用户在 sheet 打开时点 + → 先关 sheet 再打开 publish-entry
- App 后台 ≥10 分钟回前台 → 自动 refresh 一次
- 跨城市移动（GPS 变化 >5km）→ 弹 L4 Modal「检测到位置变化，是否进入跨校漫游?」
- 地图 SDK 加载失败 → 全屏占位 + 「点击重试」按钮

---

## 节点骨架

```
01-home-map/
├── _page.json
├── app-bar/
│   ├── _component.json
│   ├── campus-btn.json          (左上：校园切换 + 当前校园名)
│   ├── search-btn.json
│   └── notify-btn.json
├── top-tabs.json                (Map/Feed 切换 tab)
├── map-canvas/
│   ├── _component.json              (component: 地图本体)
│   ├── markers.json             (单个动态点位，含 click trigger)
│   └── clusters.json            (聚合气泡，含 click trigger)
├── radius-toggle.json           (50/200/500m 切换)
├── recenter-btn.json            (回到当前位置)
├── cluster-sheet/
│   ├── _component.json              (component: 聚合气泡展开 sheet)
│   ├── mask.json
│   └── items.json               (动态列表项)
├── fab.json                     (右下 + 按钮)
├── permission-card/
│   ├── _component.json              (定位被拒占位)
│   └── grant-btn.json
└── roaming-banner.json          (引用 overview.md#八-全局-banner，trigger=close)
```

通用组件：`Toast`、`ConfirmDialog`（跨城市检测）、`EmptyState`（无动态时）

---

## 产品需求覆盖

- ✅ 规则 1 (默认 200m + 切 50/500) → 操作 #2 + `radius-toggle`
- ✅ 规则 2 (GPS+时间+拉黑可见性过滤) → API 层处理，state visible 仅展示已过滤结果
- ✅ 规则 3 (≥3 聚合 + 点开列表) → `map-canvas/clusters` + `cluster-sheet`
- ✅ 规则 4 (顶部三按钮 + 校园/搜索/通知) → `app-bar` 三 element
- ✅ 规则 5 (+ 按钮 + 下拉刷新) → 操作 #12 + #6
- ✅ 规则 6 (未授权显示主校园中心 + 引导) → `permission-card` + 操作 #13
- ✅ 规则 7 (顶部 Tab 切换 Map/Feed) → `top-tabs` + 操作 #1
