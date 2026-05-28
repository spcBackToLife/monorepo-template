# 02-fishing-cast · 开网 · 交互规格

> **产品来源**：`product-analysis/modules/M2-fishing-net.md#b1-开网主线`
> **全局规范**：`interaction-design/overview.md`
> **角色**：底部 Tab 2 主页

---

## 状态机

### States

| State | 含义 |
|------|------|
| `loading` | 拉取道具数量 + 附近活跃预估 |
| `ready` | 默认：可选网类型 + 撒网按钮激活 |
| `casting` | 撒网仪式中（含动画 2-3s）→ push 02-fishing-result |
| `insufficient-balance` | 选定网类型但道具不足 → sheet 弹起 |
| `restricted:unverified` | 未认证 → 全屏占位「认证通过后即可开网」 |
| `restricted:roaming` | 跨校漫游 → 全屏占位「请先回到主校园」 |
| `restricted:cooldown` | 1 分钟内重复开网 → 顶部 Toast + 撒网按钮置灰倒计时 |
| `error:gps` | GPS 失败，无法预估活跃用户 |

### Transitions

```
loading → ready:                    数据返回
ready → insufficient-balance:        点击网卡片但余额不足
insufficient-balance → ready:        关闭 sheet
ready → casting:                    点击撒网按钮（余额充足）
casting → routed:                   动画结束 → push 02-fishing-result
ready → restricted:cooldown:         上次撒网 <1 分钟
restricted:cooldown → ready:         倒计时结束
```

### Effects

| 转换 | UI |
|-----|----|
| → loading | skeleton 网卡片 + 地图预览占位 |
| → casting | 全屏渔网动画（lottie）+ 海洋背景 + 触觉 success → 1s 后跳转 |
| → insufficient-balance | sheet 上滑「道具不足，是否前往充值?」+ 当前余额 + 缺少数量 |
| → restricted:cooldown | 撒网按钮置灰 + 倒计时文案「还需 38s 才能再次开网」|

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 切到收藏 | click `top-bar/collections-entry-btn` | — | press | push 02-fishing-collections | — | 收藏数显示徽章 |
| 2 | 切到招呼 | click `top-bar/greets-entry-btn` | — | press | push 02-greets-received | — | 未读招呼显示徽章 |
| 3 | 选择网类型 | click `net-type-cards/items` | ready | 卡片高亮 + 触觉 light + 下方撒网按钮文案变化 | 余额不足→insufficient-balance | 4 类网：普通/超大/炸弹/补网 |
| 4 | 展开网说明 | click `net-type-cards/info-btn` | — | press | sheet 弹起详细说明 + 道具来源 | — | — |
| 5 | 撒网 | click `cast-btn` | ready + 已选网 + 余额够 | press + 触觉 medium | casting：全屏动画 + 跳 fishing-result | cooldown → 倒计时禁用 | 800ms 防抖；进入 fishing-result 前埋 cast-id |
| 6 | 充值（不足时）| click `insufficient-sheet/buy-btn` | insufficient-balance | press | push 07-shop（带缺少道具 ID） | — | 返回后自动复检 |
| 7 | 取消（不足时）| click `insufficient-sheet/cancel-btn` 或下滑 | insufficient-balance | press | 关 sheet → ready | — | — |

---

## 加载策略

- 进入页：skeleton 卡片 + 地图占位
- 道具余额/活跃数预估：异步并行，先显示 `--` 占位
- 撒网动画：固定 2-3s（即使接口快返回也保留完整动画给"仪式感"）

---

## 错误处理

| 错误 | UI |
|------|----|
| GPS 失败 | 预估卡显示「无法预估，请检查定位」+ 撒网仍可用（使用默认半径）|
| 撒网接口失败 | Toast「网络异常，请重试」+ 按钮恢复 + 道具不扣除 |
| 1 分钟冷却内重复点 | 撒网按钮置灰 + 倒计时 |
| 隐私模式开启 | banner「隐私模式：你可开网但不会被他人捞到」（不阻断）|

---

## 边界情况

- 用户在 sheet 充值返回后道具增加 → 自动关闭 sheet 进入 ready
- 用户连续切换不同网类型 → 仅最后一次选择有效
- 网卡片说明 sheet 打开时点撒网 → 先关 sheet 再撒
- 隐私模式（`privacyMode == true`）→ 撒网功能正常，但 banner 提示「你不会被他人捞到」
- App 后台 ≥10 分钟回前台 → 自动 refresh 道具余额
- 撒网动画期间禁止后台切换（避免动画中断状态丢失）

---

## 节点骨架

```
02-fishing-cast/
├── _page.json
├── top-bar/
│   ├── _component.json              (顶部右侧按钮组)
│   ├── collections-entry-btn.json (我的收藏入口 + 徽章)
│   └── greets-entry-btn.json    (我的招呼入口 + 未读徽章)
├── map-preview/
│   ├── _component.json              (component: 地图预览+撒网半径圆)
│   └── radius-circle.json       (半径圈圈，跟随选定网类型变化)
├── prediction-card.json         (附近活跃人数预测，纯展示)
├── net-type-cards/
│   ├── _component.json
│   ├── items.json               (4 张网卡片，click 选择)
│   └── info-btn.json            (问号 icon，展开说明)
├── cast-btn.json                (大撒网按钮)
├── insufficient-sheet/
│   ├── _component.json              (component: 余额不足 sheet)
│   ├── buy-btn.json
│   └── cancel-btn.json
└── restricted-banner.json       (unverified/roaming/cooldown 三态)
```

通用组件：`Toast`、`Sheet`、`ConfirmDialog`

---

## 产品需求覆盖

- ✅ 规则 1 (顶部地图 + 半径预览圆 + 卡片) → `map-preview` + `net-type-cards`
- ✅ 规则 2 (卡片标注消耗/半径/预期) → `net-type-cards/items` 描述
- ✅ 规则 3 (余额不足引导购买) → `insufficient-sheet` + 操作 #6
- ✅ 规则 4 (预估活跃人数) → `prediction-card`
- ✅ 规则 5 (未认证禁开网；隐私模式可开但不入候选池) → state `restricted:unverified` + banner
- ✅ 规则 6 (漫游禁用) → state `restricted:roaming`
- ✅ 规则 7 (1 分钟冷却) → state `restricted:cooldown`
