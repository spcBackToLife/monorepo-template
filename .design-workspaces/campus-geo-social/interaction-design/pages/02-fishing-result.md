# 02-fishing-result · 撒网结果 · 交互规格

> **产品来源**：`product-analysis/modules/M2-fishing-net.md#b1-开网主线`
> **全局规范**：`interaction-design/overview.md`
> **核心交互**：Tinder 风格卡片堆叠 + 四方向手势

---

## 状态机

### States

| State | 含义 |
|------|------|
| `ceremony` | 撒网仪式动画播放中（2-3s）|
| `presenting` | 卡片堆叠就绪，可滑动 |
| `swiping:right` | 右滑中（打招呼） |
| `swiping:left` | 左滑中（无视）|
| `swiping:up` | 上滑中（收藏）|
| `card-decided` | 卡片决策完成，下一张就位 |
| `empty-net` | 空网 → 治愈插画 + 50% 返还提示 + 「再撒一网」 |
| `finished` | 全部卡片处理完 / 用户跳过 |
| `composing-greet` | 跳转 02-greet-compose |

### Transitions

```
ceremony → presenting:           动画结束 + 数据返回（≥1 卡片）
ceremony → empty-net:            动画结束 + 0 卡片
presenting → swiping:*:          touch start
swiping:* → card-decided:        手势完成（角度 + 距离阈值）
card-decided → presenting:        下一张就位
card-decided → finished:         无更多卡片
card-decided → composing-greet:  right swipe → push 02-greet-compose
finished → routed:              pop 回 fishing-cast
```

### Effects

| 转换 | UI |
|-----|----|
| → ceremony | 全屏渔网动画 + 海面波纹 + 触觉 success（1.5s 处）|
| → presenting | 卡片 stagger 入场（背景卡 0.92x 0.96x 1.0x 缩放） |
| → swiping | 卡片跟手 + 旋转角度 ±15° + 方向 hint 显示（绿/红/黄）|
| → card-decided | 当前卡片飞出 400ms + 下一张 scale 1→1.02 |
| → empty-net | 治愈空网插画 + 文案「这次没捞到 · 道具已 50% 返还」+ 「再撒一网」CTA |
| → composing-greet | 卡片飞向右上→push 02-greet-compose（fade）|

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 跳过/退出 | click `skip-btn` | presenting | press | L2 Confirm「跳过将不能再次查看」→ pop | — | 已决策卡片不可撤销 |
| 2 | 右滑打招呼 | swipe right on `card-stack/items` | presenting | 卡片跟手 + 绿色 ✓ hint 渐显 + 触觉 light（决策时）| 阈值不够→回弹 | 卡片飞出 → push greet-compose 携带 targetUserId |
| 3 | 点击打招呼按钮 | click `action-buttons/greet-btn` | presenting | 触觉 light + 卡片右飞出 | 同 #2 | 等同右滑 |
| 4 | 左滑无视 | swipe left on `card-stack/items` | presenting | 卡片跟手 + 红色 ✗ hint 渐显 | 阈值不够→回弹 | 写入 30 天 blacklist；不告知对方 |
| 5 | 点击无视按钮 | click `action-buttons/ignore-btn` | presenting | 触觉 light + 卡片左飞出 | 同 #4 | — |
| 6 | 上滑收藏 | swipe up on `card-stack/items` | presenting | 卡片跟手 + 黄色 ★ hint | 阈值不够→回弹 | 加入收藏（30 天）|
| 7 | 点击收藏按钮 | click `action-buttons/collect-btn` | presenting | 触觉 light + 卡片上飞 + 角标 star 动画 | 收藏满 100→Toast「收藏已满」+ 视为无视 | — |
| 8 | 点击卡片查看详情 | click `card-stack/items` | presenting | press | 卡片轻微 flip 显示更多详情（最近一条动态预览扩展）| — | 再次 click 收起 |
| 9 | 再撒一网（空网时）| click `empty-state/cast-again-btn` | empty-net | press + 触觉 medium | pop 回 fishing-cast + 自动 trigger 撒网 | cooldown→Toast | — |

---

## 加载策略

- 撒网动画：固定 2-3s（仪式感优先于速度）
- 卡片头像：进入 presenting 时已预加载完成（动画期间并行加载）
- 卡片间切换：本地预渲染下一张

---

## 错误处理

| 错误 | UI |
|------|----|
| 撒网仪式期接口失败 | 动画结束后 Toast「网络异常，请重撒」+ 道具不扣除 |
| 单张卡片信息失败 | 该位置占位「该用户已不可见」+ 自动滑过 |
| 决策接口失败（打招呼/无视/收藏）| 静默重试 1 次；仍失败→Toast，但本地操作不回滚（避免破坏沉浸感）|
| 收藏已满 | 上滑后弹 Toast「收藏已满，先清理一下吧」+ 视为无视 |

---

## 边界情况

- 进入页时网络断开 → 仪式动画照常播放，结束后显示 empty-net + Toast
- 用户在第一张就跳过 → 已撒道具不退还
- 决策中接到推送 → 通知非阻塞展示，不打断卡片堆叠
- 收藏卡片对应用户在用户决策期间被封禁 → 仪式期已扣道具，但 fishing-result 进入后该卡片被剔除
- App 后台 → 暂停动画，前台后继续
- 隐私模式被捞到的用户 → 其本身不入候选池（API 层处理）

---

## 节点骨架

```
02-fishing-result/
├── _page.json
├── app-bar/
│   ├── _block.json              (透明顶部)
│   └── back-btn.json            (返回 fishing-cast，需确认)
├── skip-btn.json                (右上跳过)
├── ceremony-animation.json      (撒网仪式 lottie，state-driven 动画)
├── card-stack/
│   ├── _block.json              (component: 卡片堆叠容器)
│   └── items.json               (单张卡片，含 swipe gesture + click 详情)
├── action-buttons/
│   ├── _block.json              (底部三按钮)
│   ├── greet-btn.json           (打招呼)
│   ├── ignore-btn.json          (无视)
│   └── collect-btn.json         (收藏)
└── empty-state/
    ├── _block.json              (component, 治愈空网)
    └── cast-again-btn.json
```

通用组件：`Toast`、`ConfirmDialog`、`EmptyState`

---

## 产品需求覆盖

- ✅ 规则 1 (拍立得卡片含头像/简介/动态预览/共同好友) → `card-stack/items` 描述
- ✅ 规则 2 (右滑打招呼/左滑无视/上滑收藏/跳过) → 操作 #2-#7
- ✅ 规则 3 (空网治愈状态 + 道具 50% 返还 + 再撒一网) → state `empty-net`
- ✅ 规则 4 (静默不通知对方) → API 层处理（客户端无显式 UI）
- ✅ 规则 5 (FishingCatch 写入 + 24h 防重复) → API 层处理
