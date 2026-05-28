# 00-onboarding · 新用户引导 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#step-b-核心流程`
> **全局规范**：`interaction-design/overview.md`
> **关键约束**：仅首次启动展示一次（`onboarding_completed=true` 后不再触发）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle:page-1` | 第 1 屏（地理动态）|
| `idle:page-2` | 第 2 屏（捞网交友）|
| `idle:page-3` | 第 3 屏（时空胶囊）|
| `idle:page-4` | 第 4 屏（跨校漫游 + 立即体验）|
| `switching` | 翻页过渡中（滑动手势或 dot 跳转）|
| `finishing` | 点击立即体验 / 跳过后正在写本地 flag + 跳转 |

### Transitions

```
idle:page-N → switching:    左右滑 / 点 dot / 点"下一页"
switching   → idle:page-M:  滑动 release / 动画结束
idle:page-1..3 → finishing: 点击"跳过"
idle:page-4    → finishing: 点击"立即体验"
finishing      → routed:    写入 onboarding_completed=true → push 00-login (fade)
```

### Effects

| 转换 | UI 效果 |
|-----|--------|
| → idle:page-N | dot indicator 第 N 个高亮（草莓粉填充 + 横向拉宽 1.5x，其余薄荷绿小圆点）|
| → switching | swiper 跟手滑动；释放后 spring 200ms 复位到目标页 |
| → idle:page-4 | 底部 CTA 文字从"下一页"切到"立即体验"，宽度增长 + 加粒子装饰 |
| → finishing | CTA 内 spinner 200ms → fade-out 整页 250ms → 跳 login |

---

## 操作清单

| # | 操作 | 触发方式 | 前置条件 | 即时反馈 (L0) | 进行中 | 成功反馈 | 失败反馈 | 边界处理 |
|---|------|---------|---------|--------------|-------|---------|---------|---------|
| 1 | 左右滑切换 | swipe horizontal `swiper` | 当前非边界页 | swiper 跟手 + dot 跟随渐变 | spring 复位 | 切到目标页 | 边界页越界 → 弹性反弹（橡皮筋）| 短促 swipe（< 50px）回弹原页 |
| 2 | 点击 dot | click `page-indicator/dot-{N}` | N != 当前页 | dot scale 1.2 一下 | swiper 滑动 300ms 切到 N | 同上 | — | 重复点当前 dot 无效 |
| 3 | 点击跳过 | click `top-bar/skip-btn` | 任意 idle 页 | 按钮 scale(0.97) | 进入 finishing 态 | 跳转 00-login | 写本地 flag 失败 → 仍跳转（容错）| 跳过仍写 `onboarding_completed=true` |
| 4 | 点击下一页 | click `bottom-cta-btn` | state = `idle:page-1..3` | 按钮 press 动画 | 切到下页（300ms）| 到下页 | — | 重复点击忽略（按钮 300ms 防抖）|
| 5 | 点击立即体验 | click `bottom-cta-btn` | state = `idle:page-4` | 按钮 press + 触觉 medium + 粒子飘散 | finishing 态 spinner 200ms | fade 250ms → push 00-login | 写本地 flag 失败 → 仍跳转 | 防重复点击 |
| 6 | 设备方向变化 | OS rotate | — | 锁定竖屏（App 全局策略）| — | — | — | 不响应横屏 |

---

## 加载策略

本页无网络请求。所有 4 屏内容（插画 + 文案）打包在 App 内（首次启动 0ms 加载）。

---

## 错误处理

| 错误 | UI 响应 |
|------|--------|
| 本地存储写入 `onboarding_completed` 失败 | 静默忽略，仍跳转 login（下次启动会再次进入 onboarding，可接受）|
| 跳转失败 | 重试 1 次；仍失败 → 显示"启动失败"全屏 + 重试按钮 |

---

## 边界情况

- **滑到第 4 屏后再右滑**：橡皮筋反弹，不切到 login（必须点 CTA）
- **第 1 屏左滑**：橡皮筋反弹
- **滑动中点击跳过**：取消当前滑动，立即进入 finishing
- **极速连点 CTA**：防抖 300ms，期间忽略后续点击
- **App 切到后台再回来**：保留当前页码，继续展示
- **首次启动但 onboarding_completed 已写入**（异常）：跳过本页（理论上 splash 已处理，此处兜底）

---

## 节点骨架

```
00-onboarding/
├── _page.json
├── top-bar/
│   ├── _block.json              顶部条
│   └── skip-btn.json            跳过按钮
├── swiper/
│   ├── _block.json              swiper 容器
│   ├── page-1.json              第 1 屏（地理动态 · 插画+标题+副标题）
│   ├── page-2.json              第 2 屏（捞网交友）
│   ├── page-3.json              第 3 屏（时空胶囊）
│   └── page-4.json              第 4 屏（跨校漫游）
├── page-indicator/
│   ├── _block.json              4 个 dot 容器
│   └── dots.json                指示器组合（4 个圆点）
└── bottom-cta-btn.json          底部 CTA（"下一页" / "立即体验"）
```

---

## 组件级交互需求

| 组件 | 触发场景 | 复杂度 | 独立文档 |
|------|---------|:------:|:-------:|
| `page-indicator` | 多 dot 跟随 swiper 实时插值 | 中 | 内联，足够 |
| `swiper` | 通用横向 swiper | 中 | 内联，足够 |

---

## 产品需求覆盖

- ✅ 规则 1 (首次启动展示，本地标记后不触发) → finishing 写 flag
- ✅ 规则 2 (4 屏 + 左右滑) → 操作 #1
- ✅ 规则 3 (右上角跳过) → 操作 #3
- ✅ 规则 4 (CTA 文案切换) → state `idle:page-4` effect
- ✅ 规则 5 (完成后写 flag) → finishing effect
