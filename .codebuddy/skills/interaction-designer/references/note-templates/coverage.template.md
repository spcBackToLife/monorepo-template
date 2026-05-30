> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-coverage
> 对应 schema 字段：—（覆盖核对的过程文档；若发现缺口则追加任务）

# Step I-coverage: <屏名> — 三轴覆盖核对

> 详细方法见 `methodology/06-three-axis-coverage.md`。
> 三轴任何一轴有缺 → 在 plan 里追加任务补，不允许跳过。

## 轴 1：rules → events / state / 衍生视图覆盖

遍历该屏 `screen.meta.product.rules` 每一条：

| rule | 对应实现 | ✓/❌ |
|------|---------|-----|
| 数据规则: 手机号 11 位 | PhoneInput.event.change → state.set view.errors.phone（onChange 校验）+ phoneError 节点（行内显示）| ✓ |
| 数据规则: 验证码 6 位数字 | CredentialInput.event.change（验证码模式）+ inline 错误 | ✓ |
| 业务规则: 失败状态机 | view.failureCount + SubmitBtn.onError 累加 + AccountLockedView 视图 | ✓ |
| 业务规则: ≥5 锁 30 分钟 | view.lockedUntil + locked Sheet（showWhen 自动）| ✓ |
| 安全规则: 验证码 60s 冷却 | view.codeCountdown + ui.startTimer + CountdownText 节点 | ✓ |
| 安全规则: 当日 ≤10 次 | onError business 分支 RATE_LIMITED 处理 | ❌ 缺 → 追加任务补 |
| 边界 Case: 提交防抖 800ms | SubmitBtn.event.condition.when 含 !view.submitting + 800ms 防抖 | ✓ |
| 边界 Case: screenExit cancel | rootNode.event screenExit + effect.cancel | ✓ |

## 轴 2：业务对象状态机覆盖

> 检查 product rules 是否声明业务状态机。本屏（登录页）一般不承载业务对象状态机（账户锁定算屏内派生态，不是业务对象状态机）。

| 业务状态机字段 | 枚举值 | 对应视图节点 | visibleWhen | ✓/❌ |
|-------------|-------|------------|------------|-----|
| —（本屏不承载业务对象状态机）| — | — | — | n/a |

或：

| order.status | pending_payment | OrderPendingPaymentView | `{{ state.data.order.status === 'pending_payment' }}` | ✓ |
| order.status | awaiting_shipment | OrderAwaitingShipmentView | ✓ | ✓ |
| ... | ... | ... | ... | |

## 轴 3：dataSource 三态覆盖

| dataSource | type | pending 视图 | empty 视图 | error 视图 | ✓/❌ |
|-----------|------|-------------|----------|----------|-----|
| ds-login | api（写入型）| 按钮 spinner（无独立节点）| —（写入型不需要）| Toast + locked Sheet | ✓ |
| ds-policy-text | static | n/a | n/a | n/a | n/a |

## 缺口处理

> 如有"❌"，本任务结束前需要：

1. 在 plan 中 `meta/add_plan_tasks` 追加补丁任务（如"I-X-rate-limit-handling"）
2. 标记当前 coverage 任务为 done（已识别缺口）
3. 让 next_pending_task 拿到补丁任务继续做

> 如本任务 100% ✓，本任务 done，进入 I-X-integrity。

---

## ★ 沉淀到 schema 的结论

> 本任务一般**不直接落 schema**——它是一个核对动作。如果发现缺口，通过 `meta/add_plan_tasks` 追加补丁任务即可。

```jsonc
// 例：发现轴 1 缺"当日 ≤10 次"实现 → 追加任务
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId,
  tasks: [
    {
      id: "I-X-daily-rate-limit",
      title: "实现'当日 ≤10 次'限流（onError RATE_LIMITED 分支 + dailyAttempts 计数）",
      stage: "interaction",
      status: "pending",
      notes: "由 I-X-coverage 识别"
    }
  ]
}
```

如果三轴全 ✓，沉淀段写：

```
✅ 三轴覆盖核对全通过，无缺口。下一步 → I-X-integrity 自检。
```
