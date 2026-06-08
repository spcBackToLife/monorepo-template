> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-view-business
> 对应 schema 字段：rootNode.children 追加每个状态枚举值的独立视图节点 + visibleWhen 互斥

# Step I-view-business: <屏名> — 业务状态分支视图 ★ 重要

> 详细方法见 `methodology/07-derivative-views.md` 类 5。
> 详细 schema 见 `schema-spec/derivative-views.md` §5。
> 三轴覆盖核对见 `methodology/06-three-axis-coverage.md` 轴 2（违 R-VIEW-BUSINESS-01）。

## 推理过程

### 1. 适用性判定

> 检查本屏是否承载有状态业务对象：订单 / 任务 / 工单 / 审批 / 账户 / 会话 / 作品。

如不承载 → 本任务 skipped。

如承载，从 product 阶段沉淀的 `screen.meta.product.rules` 找到状态字段定义：

```
"业务规则: 订单状态字段 order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}"
```

### 2. 状态枚举值 → 节点对应表（必须每个 enum 值都有节点）

| 状态枚举值 | 节点 name | visibleWhen | UI 主题（一句话）|
|----------|----------|-------------|---------------|
| pending_payment | OrderPendingPaymentView | `{{ state.data.order.status === 'pending_payment' }}` | 倒计时 + 立即支付 CTA + 取消订单 |
| awaiting_shipment | OrderAwaitingShipmentView | `{{ state.data.order.status === 'awaiting_shipment' }}` | 等待提示 + 物流追踪入口 disabled + 联系客服 |
| shipping | OrderShippingView | `{{ state.data.order.status === 'shipping' }}` | 物流时间线 + 确认收货 CTA |
| completed | OrderCompletedView | `{{ state.data.order.status === 'completed' }}` | 订单详情 + 评价 / 再次购买 |
| cancelled | OrderCancelledView | `{{ state.data.order.status === 'cancelled' }}` | 取消原因 + 重新下单 |
| refunding | OrderRefundingView | `{{ state.data.order.status === 'refunding' }}` | 退款进度 + 退款说明 |

**红线 R-VIEW-BUSINESS-01**：上表"对应节点"列出现❌ → 失败。

### 3. 状态间的转换 actions

| 状态转换 | 触发 | actions |
|---------|------|---------|
| pending_payment → awaiting_shipment | "立即支付" → ds-pay onSuccess | state.set order.status = 'awaiting_shipment' |
| pending_payment → cancelled | "取消订单" → ds-cancel onSuccess | state.set order.status = 'cancelled' |
| shipping → completed | "确认收货" → ds-confirm onSuccess | state.set order.status = 'completed' |
| ... | | |

> 详细 actions 链落库在 `I-X-events` 任务。

### 4. 候选方案与否决

- 候选 A：用一个 OrderView 节点 + 大量 visualState 切换 → 否决：违反节点结构 4 红线（不可维护）
- 候选 B：仅做主流程状态（漏 cancelled / refunding）→ 否决：违 R-VIEW-BUSINESS-01

---

## ★ 沉淀到 schema 的结论

```jsonc
// 每个状态枚举值一次 element/insert_subtree
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "orderPendingPaymentView", type: "div", name: "OrderPendingPaymentView",
    visibleWhen: "{{ state.data.order.status === 'pending_payment' }}",
    styles: {}, props: {},
    children: [
      // 状态专属 children（具体内容由每个屏的产品需求决定）
      { id: "ppCountdown", type: "div", name: "PaymentCountdown",
        styles: {}, props: { textContent: "{{formatCountdown(state.data.order.expiresAt)}} 内完成支付" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "ppPayBtn", type: "button", name: "PayNowButton",
        styles: {}, props: { textContent: "立即支付" },
        events: [{
          trigger: "click",
          description: "进入支付流程",
          actions: [
            { type: "effect.fetch", dataSourceId: "ds-pay",
              params: { orderId: "{{state.data.order.id}}" },
              onSuccess: [
                { type: "state.set", path: "data.order.status", value: "awaiting_shipment" }
              ],
              onError: [
                { type: "ui.showToast", toastType: "error", message: "{{$last.error.message}}" }
              ]
            }
          ]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true }
      // ... 其他子节点
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 重复以上结构，对每个状态枚举值都建独立节点
// orderAwaitingShipmentView / orderShippingView / orderCompletedView / orderCancelledView / orderRefundingView

// meta
meta/set_node {
  projectId, nodeId: "orderPendingPaymentView",
  patch: {
    interaction: {
      summary: "订单待付款态：倒计时 + 立即支付 CTA + 取消订单",
      states: ["showing","hidden"]
    }
  }
}
// 每个状态视图节点都要 set_node
```

> ⚠️ 三轴覆盖核对会强制每个 enum 值都有节点，漏一个直接 R-VIEW-BUSINESS-01。
