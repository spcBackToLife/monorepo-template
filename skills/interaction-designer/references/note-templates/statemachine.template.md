> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-statemachine
> 对应 schema 字段：screen.meta.interaction.summary + states[]

# Step I-statemachine: <屏名> — 状态机三要素

> 详细方法见 `methodology/01-state-machine.md`。

## 推理过程

### 1. States 穷举

> 必须语义化命名，不允许 state1 / loading2。穷举所有可能状态——包括异常、边界、持续态。

- `idle`        ：...
- `inputting`   ：...
- `validating`  ：...
- `submitting`  ：...
- `success`     ：...
- `error`       ：...
- `locked`      ：...

### 2. Transitions（每条注明触发源）

| from | → | to | 触发源 |
|------|---|---|--------|
| idle | → | inputting | focus 输入框 |
| inputting | → | validating | 输入满足提交条件 |
| validating | → | submitting | click SubmitBtn + condition 通过 |
| submitting | → | success | ds-xxx.onSuccess |
| submitting | → | error | ds-xxx.onError（401/500/timeout）|
| error | → | inputting | 用户修改输入 |
| error | → | locked | view.failureCount >= 5 |
| locked | → | idle | view.lockedUntil < now() |

### 3. Effects（每个目标状态注明 UI 变化）

- → submitting:
  - 按钮 spinner（visualState: loading；design 阶段实施）
  - 表单 disabled
  - 全屏 LoadingOverlay 半透明（关键提交场景）
  - 阻断重复点击
- → success:
  - 按钮 ✓ 0.5s 后 nav.go
  - 数据本地更新
  - 同步 globalView.session
- → error:
  - 按钮恢复
  - 表单 shake
  - 错误文字淡入
  - 关键字段 focus
- → locked:
  - 全表单 disabled
  - 锁定 Sheet 弹出（showWhen 自动）
  - 倒计时显示

### 4. 候选方案与否决

- 候选 A：把 success 与 error 合并为 done 态 → 否决：success 要跳转 / error 要恢复，UI 行为完全不同
- 候选 B：locked 改用 modal → 否决：bottomSheet 更轻量，drag-bar 可拖，符合阻断但不阻塞的语义
- ...

### 5. 与 product rules / 业务对象状态机的关联

> 如果本屏承载有状态业务对象，列出 product rules 已枚举的状态字段 + 值，**确认这些会在 view-business 任务中每个建独立节点**。

```
order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}
→ 对应 6 个 OrderXxxView 节点（在 I-X-view-business 任务中建）
```

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    interaction: {
      summary: "...本屏交互叙事 1-3 句话（含主线状态流）...",
      states:  ["idle","inputting","validating","submitting","success","error","locked"]
    }
  }
}
```

> Transitions / Effects 详细描述留 md 留痕；schema 不存——会通过 events.actions 间接体现。

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。状态机的 transitions（"by 哪个 trigger 引起"）逐条对应到一个或多个 events.actions。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | nodeId | 期望指纹 |
|---------|------------------|---------------------|---------|--------|---------|
| S-T1 | idle → submitting：click SubmitBtn 通过 condition | SubmitBtn.click 含 condition 守卫 + state.set submitting=true | `I-X-events` | SubmitBtn | `nodeHasEvent { trigger:'click' }` |
| S-T2 | submitting → success：ds-xxx.onSuccess | SubmitBtn.click.actions 内 effect.fetch.onSuccess 链含 state 写入 + nav.go | `I-X-events` | SubmitBtn | （含 S-T1 主指纹）|
| S-T3 | submitting → error：ds-xxx.onError | SubmitBtn.click.actions 内 effect.fetch.onError 链含 logic.switch 分支 | `I-X-events` | SubmitBtn | （含 S-T1）|
| S-T4 | error → locked：failureCount ≥ 5 | onError CREDENTIAL 分支含 logic.if failureCount≥5 then 写 lockedUntil | `I-X-events` | SubmitBtn | （含 S-T1）|
| S-T5 | locked → idle：lockedUntil < now() | Root.screenEnter ui.startTimer onComplete 清 lockedUntil + failureCount | `I-X-events` | Root | `nodeHasEvent { trigger:'screenEnter' }` |
| S-Effect-locked | locked 整表单 disabled | NormalFormView/LockedView visibleWhen 互斥 | `I-X-view-business` | NormalFormView / LockedView | `nonEmpty path: visibleWhen` × 2 |
| S-Decl-states | states 数组完整入屏级 meta | screen.meta.interaction.states 非空数组 | （本任务直接落）| — | `arrayMin path: meta.interaction.states min: 3` |
| S-Decl-summary | summary 入屏级 meta | screen.meta.interaction.summary 非空字符串 | （本任务直接落）| — | `nonEmpty path: meta.interaction.summary` |

> 备注：状态机的 transitions/effects 多数由 events 任务承担实现；本表把"哪些状态切换在哪个节点的哪个 trigger"列清楚，让 events 任务能把它当 todo。

字段说明见 `STAGE-CONTRACT.md §0.1.10`。
