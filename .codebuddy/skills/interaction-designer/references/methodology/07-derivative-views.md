# 方法论 7：7 类衍生视图节点

> 适用任务：所有 `I-X-view-*`、`I-X-overlays`、`I-X-coverage`

product 阶段已经建好**稳态业务骨架**——也就是"页面正常情况下用户看到的样子"。但页面有大量**非稳态视图**：未登录怎么看、加载中怎么看、加载失败怎么看、列表为空怎么看……这些都是 interaction 阶段的职责。

按"衍生原因"分 **7 大类**（每类都通过 `visibleWhen` 控制显隐，**不删 / 不移**上游节点）。

---

## 类 1：数据加载态视图（vs 数据就绪态）

> 任务 `I-X-view-loading`。让用户感知"系统正在为我工作"，而不是"卡死了"。

| 节点类型 | 例子 | visibleWhen 表达式 |
|---------|------|--------------------|
| 全屏骨架屏 | `FeedSkeleton` / `ProfileSkeleton` | `{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}` |
| 局部骨架屏 | `CardSkeleton` / `AvatarSkeleton` | `{{ state.effects[xxx].status === 'pending' }}` |
| 翻页 loading | `ListLoadingMore` | `{{ state.view.loadingMore }}` |
| 下拉刷新 | `RefreshIndicator` | `{{ state.view.refreshing }}` |
| 全屏 spinner | `LoadingOverlay` | `{{ state.view.submitting }}` |
| 按钮内 spinner | `SubmitSpinner` | `{{ state.view.submitting }}`（在按钮 children 内）|

**设计要点**：
- 首屏 / cold-start → 用骨架屏（占位结构和最终内容形状对应）
- 局部 fetch → 用 contentSkeleton 替代该区域，不影响其他区域
- 关键提交 → 用全屏 LoadingOverlay 屏蔽其他操作
- 静默刷新 → 不显式 loading，但需处理"刚才的数据已变"

---

## 类 2：空态视图（EmptyState）

> 任务 `I-X-view-empty`。**沉默 = 产品坏了**。列表空、搜索无结果、暂无权限等，都必须有"主动告知 + 引导操作"。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 列表空态 | `EmptyFeedState` / `EmptyHistoryState` | `{{ state.data.list && state.data.list.length === 0 }}` |
| 搜索无结果 | `NoSearchResultState` | `{{ state.view.searchKw && state.data.results.length === 0 }}` |
| 筛选无结果 | `NoFilterMatchState` | `{{ state.view.filterActive && state.data.filtered.length === 0 }}` |
| 离线无缓存 | `OfflineNoDataState` | `{{ state.view.networkStatus === 'offline' && !state.data.cached }}` |

**设计要点**：
- 空态必须含：图示 + 标题 + 描述 + **行动按钮**（如"去发现"/"清空筛选"/"重新搜索"）
- 不同空态原因 → 不同节点，**不能复用一个 EmptyState 多种文案**（design 阶段要为每个空态做独立视觉规格）

---

## 类 3：错误态视图（vs 反馈 Toast）

> 任务 `I-X-view-error`。错误分两层：**Toast/Banner** 是瞬时反馈（关闭后页面恢复），**ErrorView** 是页面态错误（整页或整区域被错误替代）。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 整页错误 | `ServerErrorPage` / `MaintenancePage` | `{{ state.effects['ds-feed'].status === 'error' && state.effects['ds-feed'].error.code >= 500 }}` |
| 网络错误页 | `NetworkErrorState` | `{{ state.view.networkStatus === 'offline' \|\| state.effects[xxx].error?.code === 'NETWORK' }}` |
| 区域错误 | `SectionErrorBlock` | `{{ state.effects['ds-section'].status === 'error' }}` |
| 表单错误条 | `FormErrorBanner` | `{{ state.view.errors.global }}` |
| 字段行内错误 | `InlineFieldError` | `{{ state.view.errors[fieldName] }}` |
| 错误 Toast | `ErrorToast`（一般用 `ui.showToast` 实现）| actions 触发，无需节点 |

**设计要点**：
- 错误页必须含：图示 + 错误原因 + **重试按钮** + 客服入口
- 行内错误要可访问性（aria-live + 红字 + 红框）
- 5xx → 整页错误；4xx 业务错 → Banner / Toast；4xx 校验错 → 行内

---

## 类 4：权限/身份态视图（vs 业务态）

> 任务 `I-X-view-auth`。页面整体根据用户身份切换布局——常见于"未登录占位"、"游客限制"、"非 VIP 提示"。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 未登录占位 | `NotLoggedInPlaceholder` | `{{ !globalView.session.user \|\| globalView.session.status === 'anonymous' }}` |
| 已登录主体 | `LoggedInMainView` | `{{ globalView.session.status === 'authenticated' }}` |
| 游客横幅 | `GuestModeBanner` | `{{ globalView.session.user?.isGuest }}` |
| VIP 升级提示 | `VipUpgradePrompt` | `{{ !globalView.session.user?.isVip && state.data.contentType === 'premium' }}` |
| 实名认证提示 | `RealNameRequiredView` | `{{ !globalView.session.user?.realNameVerified }}` |

**设计要点**：
- 未登录态要**保留页面信息架构**（如 nav-bar / 标题），只把核心内容区换成"登录引导"
- 不要全屏遮罩（用户会迷失）

---

## 类 5：业务状态分支视图（状态机的视觉化）★ 重要

> 任务 `I-X-view-business`。承载有状态业务对象（订单/任务/工单/审批）的屏，**每个状态一个独立节点 + visibleWhen 互斥**。

| 节点类型 | 例子 | visibleWhen |
|---------|------|-------------|
| 订单待付款 | `OrderPendingPaymentView` | `{{ state.data.order.status === 'pending_payment' }}` |
| 订单待发货 | `OrderAwaitingShipmentView` | `{{ state.data.order.status === 'awaiting_shipment' }}` |
| 订单运输中 | `OrderShippingView` | `{{ state.data.order.status === 'shipping' }}` |
| 订单已完成 | `OrderCompletedView` | `{{ state.data.order.status === 'completed' }}` |
| 订单已取消 | `OrderCancelledView` | `{{ state.data.order.status === 'cancelled' }}` |
| 账户锁定 | `AccountLockedView` | `{{ state.view.lockedUntil > now() }}` |

**设计要点**：
- product 阶段在 `screen.meta.product.rules` 里穷举的"状态转换"必须在这里**每个状态一个节点**
- 避免"一个节点 + 大量条件样式"——不可维护
- 这是 product/interaction 阶段最容易被低估的工作量
- **三轴覆盖核对轴 2** 强制每个 enum 值有节点（违 R-VIEW-BUSINESS-01）

---

## 类 6：过渡反馈节点（瞬时态）

> 任务 `I-X-view-feedback`。操作触发的临时反馈，自动消失或手动关闭。

| 节点类型 | 例子 | 触发方式 |
|---------|------|---------|
| Toast | 任意 | `ui.showToast` action（运行时注入，可以是全局 service）|
| Snackbar | 带操作按钮的 Toast | `visibleWhen: {{state.view.snackbar.show}}` |
| InlineSuccess | 操作成功行内提示 | `visibleWhen: {{state.view.successMsg}}` + ui.delay 后清空 |
| ProgressBar | 上传 / 操作进度 | `visibleWhen: {{state.view.uploading}}` |
| Countdown | 倒计时（验证码 / 锁定）| `visibleWhen: {{state.view.codeCountdown > 0}}` |

**设计要点**：
- Toast 一般用 `ui.showToast` action 直接发起，不需要落节点
- Snackbar / Inline / Progress / Countdown 是页面态节点（需要建节点 + visibleWhen）

---

## 类 7：全局覆盖层（屏级 overlays）

> 任务 `I-X-overlays`。用 `screen.overlays` 数组定义，**不在 rootNode 树中**，渲染在最顶层 z-index。

| 类型 | 例子 | 控制方式 |
|------|------|---------|
| modal | 登录弹窗 / 确认对话框 | `showWhen` 表达式 或 `ui.showOverlay/hideOverlay` actions |
| bottomSheet | 操作菜单 / 锁定提示 Sheet | 同上 |
| drawer | 侧边导航 / 筛选抽屉 | 同上 |
| toast | 全局轻提示（如有定制）| 一般用 `ui.showToast` action |
| custom | 自定义复杂浮层（如蒙层教学）| 同上 |

详细 schema 见 `schema-spec/overlays.md`。

---

## 节点骨架补充的总原则

1. **整页 / 整区域切换视图 → 用 `visibleWhen` 切多棵子树**（不要塞进 visualState 的 childrenVisibility，那是节点内视觉态）
2. **同一节点的不同样式态 → 用 visualState**（hover/focus/error 边框等，design 阶段写）
3. **业务对象状态机 → 每个状态一个独立节点 + visibleWhen 互斥**
4. **必须做三轴覆盖核对**：每条 `screen.meta.product.rules` 涉及的状态都要有对应节点

## 禁止

- ❌ 重组上游骨架（不能 move/wrap/remove product 已建节点）
- ❌ 把页面级视图态塞进单节点的 visualState（错误的 schema 语义）
- ❌ "一个节点 + 大量条件样式"覆盖所有业务态（不可维护，违反节点结构 4 红线）

如果发现 product 阶段缺了关键业务节点 → 退回 product-analyst 补，不在本阶段补。
