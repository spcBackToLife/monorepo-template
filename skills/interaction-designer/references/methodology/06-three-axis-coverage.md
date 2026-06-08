# 方法论 6：三轴覆盖核对

> 适用任务：`I-X-coverage`、`I-global-coverage`

每屏 / 全局任务做完后，必须做**三轴覆盖核对**——任何一轴没覆盖完整 → 在 plan 里追加任务补，**不允许跳过**。

## 轴 1：四类规则 → events / state / 衍生视图至少一处对应

遍历该屏 `screen.meta.product.rules` 每一条，找对应的实现锚点：

| rules 条目 | 应对应到 |
|-----------|---------|
| "数据规则: 手机号 11 位" | onChange 校验 action（state.set view.errors.phone）+ InlineFieldError 节点 |
| "业务规则: 密码错 ≥ 5 次锁" | view.failureCount + onError 累加 + AccountLockedView 视图 + locked Sheet |
| "安全规则: 60s 验证码冷却" | view.codeCountdown + ui.startTimer + 倒计时按钮 visualState |
| "边界 Case: 提交防抖 800ms" | event.condition.when + view.submitting 守卫 |

**红线 R-COVERAGE-01**：rules 中某条没对应到任何 events / state / 衍生视图 → 失败。

## 轴 2：业务对象状态机的每个枚举值 → 都有独立视图节点 ★

如果本屏承载有状态业务对象（订单 / 任务 / 工单 / 审批 / 账户 / 会话），其每个状态都必须有**独立视图节点 + visibleWhen 互斥**：

```
订单状态机 (product rules 已枚举):
  pending_payment    → OrderPendingPaymentView    visibleWhen: {{ state.data.order.status === 'pending_payment' }} ✓
  awaiting_shipment  → OrderAwaitingShipmentView  ✓
  shipping           → OrderShippingView          ✓
  completed          → OrderCompletedView         ✓
  cancelled          → OrderCancelledView         ✓
  refunding          → OrderRefundingView         ❌ 漏！触发 R-VIEW-BUSINESS-01
```

**红线 R-VIEW-BUSINESS-01**：product 阶段 rules 显式枚举的状态字段，存在 enum 值未对应到独立 visibleWhen 节点。

## 轴 3：每个 dataSource 的运行时态 → 都有对应视图节点

每个 API 数据源都有 4 个运行时态：

```
对每个 ds-xxx：
  status='idle'    → 业务节点显示（默认稳态）          → 已存在（product 已建）
  status='pending' → 加载态视图（骨架/spinner）         → 必须有 I-X-view-loading 节点（违 R-VIEW-LOAD-01）
  status='success' 但 data 为空 → 空态视图              → 必须有 I-X-view-empty 节点（违 R-VIEW-EMPTY-01）
  status='error'   → 错误态视图（整页/区域/Toast/Banner）→ 必须有 I-X-view-error 节点（违 R-VIEW-ERROR-01）
```

**例外**：
- 写入型 dataSource（POST / 登录 / 提交）→ pending 用按钮内 spinner / 全屏 Overlay 即可，不强制独立 Skeleton 节点
- 已知非空数据（如配置）→ 不需要 empty 视图

## 自检流程（md 中必须显式写）

```markdown
## 三轴覆盖核对

### 轴 1：rules 覆盖
| rule | 对应实现 | ✓/❌ |
|------|---------|-----|
| 数据规则: ... | ... | ✓ |
| ... | | |

### 轴 2：业务状态机覆盖
| 状态枚举值 | 对应视图节点 | visibleWhen | ✓/❌ |
|-----------|------------|------------|-----|
| pending_payment | OrderPendingPaymentView | {{ state.data.order.status === 'pending_payment' }} | ✓ |
| ... | | | |

### 轴 3：dataSource 三态覆盖
| dataSource | pending 视图 | empty 视图 | error 视图 | ✓/❌ |
|-----------|-------------|----------|----------|-----|
| ds-feed | FeedSkeleton | EmptyFeedState | FeedErrorBlock | ✓ |
| ds-login | 按钮 spinner（无独立节点）| —（写入型不需要）| Toast + locked Sheet | ✓ |
```

## 红线汇总

| 红线 | 触发 |
|------|-----|
| R-COVERAGE-01 | 某条 rule 没对应实现 |
| R-VIEW-BUSINESS-01 | 业务状态机有枚举值漏建视图 |
| R-VIEW-LOAD-01 | dataSource 缺 pending 视图（且适用）|
| R-VIEW-EMPTY-01 | 列表型 dataSource 缺 empty 视图 |
| R-VIEW-ERROR-01 | dataSource 缺 error 视图（无任何整页/区域/banner/inline 兜底）|

任何一项不通过 → 在 plan 里追加任务补全。
