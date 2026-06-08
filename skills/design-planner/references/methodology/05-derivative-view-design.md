# 方法论 5：7 类衍生视图节点的视觉规格

> 适用任务：`D-X-coverage`、涉及衍生视图的 `D-X-styles` / `D-X-materials`
> interaction 阶段建了 7 类衍生视图节点（loading/empty/error/auth/business/feedback/overlays），每一类**都需要独立的视觉规格**——不允许只设计稳态主视图。

## 0. 为什么衍生视图必须独立设计

一个 app **90% 时间用户都在切换不同视图态**：
- 登录页：稳态 → 输入中 → loading → 错误 → 锁定 → 成功
- Feed 页：骨架屏 → 数据 → 空态 → 翻页 loading → 错误重试

如果只设计稳态、衍生视图留空 styles：
- 用户切到 loading 态 → 看到一片空白
- 用户切到 empty 态 → 看到默认浏览器样式（黑色 12px 文字）
- 用户切到 error 态 → 看不到错误图示，只有红字
- → **沉默 = 产品坏了**

## 1. 类 1：数据加载态视图（Loading）

### 视觉规格必备
- **占位结构形状与最终内容严格一致**（如 FeedSkeleton 的卡片大小 = 真实卡片大小）
- shimmer 动画（柔和的高光从左到右扫过）
- 不抢戏色调（灰阶为主，禁用品牌色）
- visualSpec.weight ≤ 4（绝不主角）

### 视觉手段
```
backgroundColor: $token:colors.gray100 ~ gray300（按层次递进）
borderRadius: $token:radius.md（与最终卡片一致）
animation: shimmer 1.5s infinite（CSS keyframes 实现）
```

### CSS shimmer 实现
```jsonc
node.styles = {
  backgroundColor: "$token:colors.gray200",
  background: "linear-gradient(90deg, $token:colors.gray200 0%, $token:colors.gray100 50%, $token:colors.gray200 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite ease-in-out",
  borderRadius: "$token:radius.md"
}
node.animation = {
  css: {
    name: "shimmer",
    duration: "1.5s",
    timingFunction: "ease-in-out",
    iterationCount: "infinite",
    keyframes: [
      { offset: 0,   styles: { backgroundPosition: "-200% 0" } },
      { offset: 1,   styles: { backgroundPosition: "200% 0" } }
    ]
  }
}
```

### 红线
- ❌ 用品牌色做骨架屏 → 抢戏
- ❌ shimmer 时长 < 1s 或 > 2.5s → 视觉不舒适
- ❌ 骨架结构与真实卡片差距大（如骨架是矩形但真实卡片是圆角）→ 切换时跳变

## 2. 类 2：空态视图（EmptyState）

### 视觉规格必备
- **居中插图**（kind: illustration）
- **标题** + **描述**（清晰说明"为什么空"）
- **行动按钮**（"去发现"/"刷新"/"清空筛选"）★
- 留白舒适（padding 充足）
- visualSpec.weight: 主体 5，按钮 8（引导很重要）

### 视觉手段
```
插图: 有机风格、低饱和、不超过 200×200
标题: $token:typography.h4.fontSize, fontWeight semibold, color textPrimary
描述: $token:typography.body.fontSize, color textSecondary
按钮: secondary（不抢主流程）+ icon 增强
```

### 不同空态需要不同视觉
- 列表为空 → 引导发现
- 搜索无结果 → 引导改关键词
- 筛选无结果 → 提供"清空筛选"按钮
- 离线无缓存 → 网络错误图示 + 重试

**红线**：所有空态用一个 EmptyState + 不同文案 → 设计偷懒，单独建节点 + 单独 styles

## 3. 类 3：错误态视图（Error）

### 整页错误（5xx / 网络断）
- 错误图示（不刺眼，避免过度威慑）
- 错误原因（避免技术黑话："服务器走神了" 而非 "500 Internal Error"）
- **重试按钮**（primary）
- 客服入口（secondary，文字链）
- visualSpec.weight: 重试按钮 8

### 区域错误（局部 fetch 失败）
- 区域内显示，不整页替换
- 简化版图示 + "请重试"链接
- visualSpec.weight ≤ 5

### 行内错误（字段校验）
- 红字 + 红框（v2.5 minimal-debug styles）
- design 阶段升级为 token 引用：`color: $token:colors.error`
- ARIA 可访问性（aria-live="polite"）

### 错误 Toast
- 通常用 `ui.showToast` action 实现，无需节点
- 如有定制 Toast 节点 → 圆角 + 阴影 + 状态色背景 + 出入动画

### 红线
- ❌ 错误页用刺眼的红色霸屏 → 用户被吓到
- ❌ 错误页缺重试按钮 → 用户无路可走
- ❌ 行内错误只写文字不变输入框边框 → 用户看不到关联

## 4. 类 4：权限/身份态视图（Auth）

### 视觉规格必备
- **保留页面信息架构**（如 nav-bar / 标题不动），只把核心内容区换成"登录引导"
- 引导插图 + 解释文案 + **登录/升级 CTA**
- 不要全屏遮罩（用户会迷失）

### 不同权限态视觉差异
- 未登录 → 友好引导（"登录后查看你的收藏"）
- 游客模式 → 可继续浏览但显示"升级提示" banner
- VIP 升级提示 → 价值点列表 + 升级 CTA
- 实名认证提示 → 安全感图示 + "前往认证"

### 红线
- ❌ 未登录态用"未登录"四个字打发 → 产品力低
- ❌ VIP 提示过于侵入（霸屏+多次跳出）→ 用户反感

## 5. 类 5：业务状态分支视图（Business）★ 最重要

承载有状态业务对象（订单/任务/工单/审批）的页面：**每个状态独立 layout**——不是一个组件 + 大量条件样式。

### 视觉规格必备
- 每个状态独立 layout（订单待付款 vs 已发货完全不同）
- **状态标识 badge**（用状态色：成功绿/待办蓝/警告橙/失败红）
- **对应该状态的 action 按钮**（待付款 → "去支付"；已发货 → "查看物流"）
- 时间线 / 进度条（如订单流程）
- visualSpec.weight: 状态对应按钮 9（核心 CTA）

### 状态色标准（来自 theme stateSpec）
```
pending_payment   → $token:colors.warning（橙）
awaiting_shipment → $token:colors.info（蓝）
shipping          → $token:colors.primary（品牌）
completed         → $token:colors.success（绿）
cancelled         → $token:colors.textSecondary（灰）
refunding         → $token:colors.error（红，但柔和）
```

### 红线
- ❌ "一个组件 + 大量条件样式"覆盖所有业务态（违反节点结构 4 红线，违反 R-VIEW-BUSINESS-01）
- ❌ 不同状态用同一个按钮颜色 → 失去状态识别
- ❌ 业务对象状态枚举的某个值漏建视图 → 用户切到该状态白屏

## 6. 类 6：过渡反馈节点（Feedback）

### Toast / Snackbar 统一规格
- **4 套**：success / error / warning / info
- 圆角 + 阴影 + 状态色背景 + 状态色 icon
- 出入动画统一（slideUp + fade，duration 200ms）
- 文字白色 + 阴影确保可读

```jsonc
toastStyles = {
  success: { bg: "$token:colors.success", icon: "✓", color: "$token:colors.textInverse" },
  error:   { bg: "$token:colors.error",   icon: "✕", color: "$token:colors.textInverse" },
  warning: { bg: "$token:colors.warning", icon: "!", color: "$token:colors.textInverse" },
  info:    { bg: "$token:colors.info",    icon: "i", color: "$token:colors.textInverse" }
}
```

### InlineSuccess / Countdown / Progress
- InlineSuccess: 短暂显示（visibleWhen + ui.delay 后清空），绿底白字药丸
- Countdown: 倒计时数字 + 单位，使用 mono 字体保证数字宽度一致
- Progress: 渐变填充 + 百分比文字，平滑过渡

### 红线
- ❌ Toast 4 套样式不统一 → 用户认知混乱
- ❌ Countdown 用比例字体（数字会跳变宽度）
- ❌ Toast 出入无动画 → 突兀

## 7. 类 7：全局覆盖层（Overlays）

详见 `schema-spec/global-overlay-design.md`。要点：

### Modal / BottomSheet / Drawer 三套统一规格
- **圆角顶部**（Sheet 是 16px / Modal 是 12px / Drawer 是 0）
- **drag-bar**（Sheet 顶部小条暗示可拖动）
- **safe-area 适配**（底部 padding 加 `env(safe-area-inset-bottom)`）
- **backdrop**（半透明黑底，dismissible 可控）

### 出入动画
- Modal: fade + scaleIn（0.95 → 1.0），300ms ease-out
- BottomSheet: slideUp，350ms ease-out
- Drawer: slideRight，300ms ease-out
- Toast: slideDown + fade，200ms ease-out

### 跨屏共存的全局 overlays
- 风格高度统一（来自 globalOverlays，所有屏共享）
- 视觉权重计入项目级总预算
- 全局离线 banner / session 过期 / app 升级 / 全局错误兜底 等

### 红线
- ❌ 不同 overlay 出入动画风格不一（一个 fade 一个 slide）→ 体验撕裂
- ❌ overlay 占满屏（Modal 没 padding）→ 失去层次
- ❌ 没 backdrop / backdrop 太轻 → 看不到层级
- ❌ Sheet 没 safe-area 适配 → iPhone 底部被遮

## 8. 7 类衍生视图覆盖核对（D-X-coverage 用）

```
对每个屏：
  □ 类 1（loading）：节点是否有 styles？是否有 shimmer 动画？
  □ 类 2（empty）：节点是否有插图 + 标题 + 描述 + 行动按钮 4 件套？
  □ 类 3（error）：整页错误是否有 重试按钮？区域错误是否有简化图示？行内错误是否有 minimal-debug → token 升级？
  □ 类 4（auth）：未登录态是否保留 nav-bar？引导 CTA 是否清晰？
  □ 类 5（business）：业务状态机每个 enum 值是否独立 layout？状态标识 badge 是否用状态色？
  □ 类 6（feedback）：Toast 4 套样式是否统一？出入动画是否一致？
  □ 类 7（overlays）：3 套 overlay 出入动画是否统一？safe-area 是否适配？
```

每项 ❌ → 在 `D-X-coverage` md 标 R-VIEW-DESIGN-01 风险，在对应 `D-X-styles` 任务补 schema。

## 9. md 落地（D-X-coverage 段）

```markdown
## 衍生视图视觉规格覆盖

### 类 1 加载态
- FeedSkeleton (n-load-1): ✅ shimmer 1.5s infinite, gray100→gray300
- ButtonSpinner (n-load-2): ✅ rotate 1s linear infinite, primary 色

### 类 2 空态
- EmptyFeedState (n-empty-1): ✅ 插图 200x200 + 标题 + 描述 + "去发现"按钮（weight 8）

### 类 5 业务态（订单）
- OrderPendingPaymentView: ✅ orange badge + "去支付" primary 按钮
- OrderShippingView: ✅ blue badge + "查看物流" secondary 按钮
- OrderCompletedView: ✅ green badge + "再次购买" + "评价" 双按钮
- OrderCancelledView: ✅ gray badge + "重新下单" 按钮
- OrderRefundingView: ❌ 漏！必须补独立 layout

### 7 类覆盖矩阵
| 类型 | 节点数 | 是否完整 |
|------|:------:|:--------:|
| loading | 3 | ✅ |
| empty | 1 | ✅ |
| error | 4 | ✅ |
| auth | 0 | N/A |
| business | 5 | ❌ 缺 refunding |
| feedback | 4 套 toast | ✅ |
| overlays | 2 | ✅ |
```

## 10. 红线汇总

- ❌ 衍生视图节点没 styles 或没 meta.design → R-VIEW-DESIGN-01
- ❌ 把所有错误态用一个 Toast 替代 → 页面级错误必须有整页视图
- ❌ 空态用"暂无数据"四个字 + 灰色文字（违反产品力红线）
- ❌ 业务对象状态枚举漏一个状态没建视图（违反节点结构 4 红线）
- ❌ Toast 4 套规格不统一 / 出入动画不一致
- ❌ 衍生视图节点视觉权重 > 5（除空态行动按钮可达 8）→ 抢戏
