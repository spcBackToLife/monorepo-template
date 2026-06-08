> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<M>-coverage
> 对应 schema 字段：screen.meta.status.phase = "analyzed"（通过自检后打）

# coverage: <screenId> — 三轴覆盖核对

> 详细方法见 `methodology/06-three-axis-coverage.md`。
>
> 三轴任何一轴没覆盖完整 → plan 里追加任务补，**不允许跳过**。

## 推理过程

### 轴 1：rules → 节点 / state / dataSource 至少一处对应

遍历 `screen.meta.product.rules` 每一条：

| rules 条目 | 对应到 | 状态 |
|-----------|-------|:----:|
| "数据规则: 手机号 11 位" | PhoneInput 节点 + state.view.form.phone | ✅ |
| "数据规则: view.loginMode ∈ {'code','password'}" | state.view.loginMode（enum 已声明）| ✅ |
| "业务规则: 失败状态机 failureCount + lockedUntil" | state.view 占位（已在 state-shape 留 placeholder 计划）| ⚠️ 待 interaction 完整化 |
| "业务规则: 成功后写 data.user / data.session, nav.go '01-home'" | state.data.user / data.session 占位 + navigation.flows 已声明 | ✅ |
| "安全规则: 验证码 60s 冷却 / 当日 ≤ 10 次" | 在 rules 中说清，view.codeCountdown 占位（待 interaction） | ⚠️ 待 interaction |
| "边界 Case: 800ms 防抖 / submitting 守卫 / screenExit cancel" | view.submitting 占位 + 在 rules 中说清 | ✅ |

**遗漏列表**：[列出未对应到锚点的 rules，并标注怎么补]

### 轴 2：业务状态机字段已显式枚举（R-PRODUCT-03）

[本屏是否承载有状态业务对象？]

- ✅ 承载会话状态机：`view.loginMode ∈ { 'code' | 'password' }` 已在 rules 显式枚举
- ✅ 承载失败状态机：`view.failureCount` / `view.lockedUntil` 已在 rules 说清

或：
- ❌ 本屏不承载业务状态机（如纯展示页）—— 该轴不适用

### 轴 3：每个识别到的 API → dataSource + data key 占位

| API | dataSource 已声明 | data key 占位 |
|-----|:----------------:|:-----------:|
| 登录 | ✅ ds-login | ✅ user / session |
| ... | | |

## 自检结论

- 轴 1：[全部对应 / 缺 X 条 → 已追加任务 P-X-rules-fix]
- 轴 2：[适用 + 已枚举 / 不适用 / 未枚举 → 退回 C-rules]
- 轴 3：[全部齐 / 缺 X 个 → 已追加任务 P-X-data-fix]

## 接下来

如果三轴全过 → 跑 `query/integrity { screenId }`，期望 0 个 R-PRODUCT-* / R-STRUCTURE-01 / R-COVERAGE-01。

如有 R-* 错误 → 修复对应任务（不打 phase=analyzed）。

如完全通过 → 打 `meta.status.phase = "analyzed"`。

---

## ★ 沉淀到 schema 的结论

本任务**不直接写新 schema 字段**——产物是"自检结论 + 后续动作"：

```jsonc
// 完全通过时：
meta/set_screen {
  projectId, screenId,
  patch: { status: { phase: "analyzed", notes: "三轴覆盖通过，integrity 0 错" } }
}

// 不通过时：在 plan 里追加补救任务
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId,
  tasks: [
    { id: "<X>-fix-rule-Y", title: "补 rules 第 Y 条对应节点", stage: "product", status: "pending" }
  ]
}
```
