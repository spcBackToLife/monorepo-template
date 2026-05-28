# 01-publish-pick-location · 选择地点 · 交互规格

> **产品来源**：`product-analysis/modules/M1-location-moment.md#b1-发布动态主线`
> **全局规范**：`interaction-design/overview.md`
> **入口**：01-publish-edit → 地点 row

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 定位 + 地图初始化 |
| `map-ready` | 默认显示当前 GPS 命中 POI |
| `dragging` | 用户拖动地图中（中心 pin 跟随）|
| `pin-settled` | 拖动结束 → 反查 POI |
| `searching` | 搜索 POI 中 |
| `search-results` | 显示 POI 列表 |
| `out-of-campus-warn` | 选定点在主校园外 → 提示降级为「校外动态」 |
| `confirmed` | 已确认 → pop 回 edit |

### Transitions

```
loading → map-ready:                定位+地图就绪
map-ready → dragging:               touch start map
dragging → pin-settled:              touch end + 反查 POI
map-ready → searching:               输入搜索关键词
searching → search-results:          接口返回
search-results → pin-settled:        点击搜索结果
pin-settled → out-of-campus-warn:    新选点不在主校园
out-of-campus-warn → pin-settled:    用户确认降级
pin-settled → confirmed:             点确认按钮
confirmed → routed:                  pop 回 edit（带 location 参数）
```

### Effects

| 转换 | UI |
|-----|----|
| → loading | 全屏 skeleton 地图 |
| → dragging | 中心 pin 略微上提 + 阴影动效 + 触觉 light |
| → pin-settled | pin 落下回弹 + POI 名称卡片淡入底部 |
| → searching | 顶部输入框右侧 spinner |
| → out-of-campus-warn | L4 Modal「选定点在主校园外，将降级为校外动态」+ 确认/取消 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | pop（不保存）| — | 系统返回手势同效 |
| 2 | 拖动地图 | gesture on `map-canvas` | map-ready | 实时跟手 + pin 跟随 | — | 越界回弹 |
| 3 | 输入搜索 | input `search-input` | — | label 上浮 + 300ms debounce + spinner | 失败→Toast | M12 联动 POI 库 |
| 4 | 点击 POI 结果 | click `search-result-list/items` | search-results | item press | 地图平移到该 POI + pin-settled | — | 关闭搜索 dropdown |
| 5 | 切换半径 | click `radius-toggle`（50/200/500m）| — | 半径圈圈缩放动画 | — | 圈圈实时叠加 |
| 6 | 回到当前位置 | click `recenter-btn` | — | press + 地图平移到 GPS 中心 | 无定位→Toast「无定位权限」 | — |
| 7 | 确认 | click `confirm-btn` | pin-settled + radius 选定 | press + 触觉 medium | 检测是否在主校园→pop 回 edit / 显示 out-of-campus-warn | — | 800ms 防抖 |
| 8 | 确认降级为校外动态 | click `out-of-campus-modal/confirm-btn` | out-of-campus-warn | press | 标记 location.scope=external + pop | — | — |
| 9 | 取消降级 | click `out-of-campus-modal/cancel-btn` | out-of-campus-warn | 关 Modal | 回 pin-settled | — | — |

---

## 加载策略

- 进入页：地图 skeleton（1s 内）
- POI 搜索：debounce 300ms + 输入框 spinner
- POI 反查（拖动后）：底部卡片 spinner

---

## 错误处理

| 错误 | UI |
|------|----|
| 定位失败 | 默认显示主校园中心 + Toast「定位失败，已使用主校园中心」|
| POI 搜索失败 | 列表区 ErrorState + 重试 |
| POI 反查失败 | 底部卡片显示「未知地点」+ 重试按钮 |
| 网络断开 | 顶部 banner |
| 确认时主校园边界查询失败 | Toast「校园边界异常，请稍后重试」+ 按钮恢复 |

---

## 边界情况

- 拖动地图但 pin 反查到的 POI 与当前 GPS 完全不同（如用户拖到外校）→ out-of-campus-warn
- 同一 POI 半径设大于校园直径 → 警告「半径过大可能覆盖校外」
- 用户在小地图中放大到极限 → 退出小地图模式自动 fit-to-screen
- 主校园边界数据未加载完 → 「确认」按钮置灰 + 顶部加载提示
- 用户已认证但 GPS 显示在外地（如假期回家）→ 默认中心仍是主校园

---

## 节点骨架

```
01-publish-pick-location/
├── _page.json
├── app-bar/
│   ├── _component.json
│   └── back-btn.json
├── search-input.json
├── search-result-list/
│   ├── _component.json              (搜索结果下拉，覆盖在地图上方)
│   └── items.json
├── map-canvas/
│   ├── _component.json              (component: 地图本体)
│   ├── center-pin.json          (中心 pin，纯展示但跟随 state)
│   └── radius-overlay.json      (半径圈圈叠加层)
├── radius-toggle.json
├── recenter-btn.json            (回到当前位置)
├── poi-card.json                (底部 POI 卡片，纯展示 + 距离)
├── confirm-btn.json
└── out-of-campus-modal/
    ├── _component.json              (component)
    ├── confirm-btn.json
    └── cancel-btn.json
```

通用组件：`Toast`、`ConfirmDialog`、`ErrorState`

---

## 产品需求覆盖

- ✅ 规则 1 (默认 GPS + 拖动重选) → state `map-ready`/`dragging`
- ✅ 规则 2 (M12 POI 搜索) → 操作 #3/#4
- ✅ 规则 3 (半径圈圈实时叠加) → 操作 #5 + `radius-overlay`
- ✅ 规则 4 (主校园外降级提示) → state `out-of-campus-warn` + 操作 #8
- ✅ 规则 5 (确认回填) → 操作 #7 → pop 携带参数
