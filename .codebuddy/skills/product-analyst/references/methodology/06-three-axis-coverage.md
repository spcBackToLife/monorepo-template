# 三轴覆盖核对（每屏 P-X-coverage 任务）

每屏分析完成后，做三轴覆盖核对——任何一轴没覆盖完整 → 在 plan 里追加任务补，**不允许跳过**。

## 轴 1：rules → 节点骨架 / state / dataSource 至少一处对应

遍历该屏 `screen.meta.product.rules` 每一条，找对应的实现锚点：

| rules 条目 | 对应到 |
|-----------|-------|
| "数据规则: 手机号 11 位" | PhoneInput 节点 + form.phone view 变量 |
| "业务规则: 密码错 ≥5 次锁" | view.failureCount / view.lockedUntil 占位（产品阶段已知；锁定后视图节点由 interaction 阶段补）|
| "安全规则: 60s 验证码冷却" | view.codeCountdown 占位 |
| "边界 Case: 提交防抖 800ms" | 在 rules 中说清，运行时实现留 interaction |

**红线 R-COVERAGE-01**：rules 中某条没对应到任何节点 / state / dataSource → 失败。

## 轴 2：业务状态机字段必须在 rules 中显式枚举（R-PRODUCT-03）

如果本屏承载有状态业务对象（订单 / 任务 / 工单 / 审批 / 账户 / 会话），**必须**在 `rules[]` 中写清：

```
"业务规则: 订单状态字段 order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}"
```

否则 interaction 阶段不知道要建几个状态视图（每个 enum 值要建独立节点）。

## 轴 3：每个识别到的 API → dataSource 已声明 + data key 占位

```
登录功能 → ds-login + state.data.user / state.data.session 占位 ✓
获取首页 feed → ds-feed + state.data.feed 占位 ✓
```

**红线**：API 识别到了，但 dataSource 没声明 / data key 没占位 → 失败。

## 自检流程

```
for each rule in screen.meta.product.rules:
  → 找对应的 节点 / state / dataSource，缺失 → R-COVERAGE-01

for each businessStateField in 该屏识别的状态机:
  → 检查 rules 中是否显式枚举所有值，缺失 → R-PRODUCT-03

for each API in 该屏识别的接口:
  → 检查 dataSource + data key 占位，缺失 → 追加任务补
```

任何一项不通过 → 在 plan 里追加任务补全。
