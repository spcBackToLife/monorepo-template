# 方法论 1：状态机三要素

> 适用任务：`I-X-statemachine`、`I-X-events`（设计 actions 时回头查状态转换）

## 1. 状态机三要素

| 要素 | 定义 |
|------|-----|
| **States**（状态）| 页面 / 节点可能处于的所有状态。穷举，不允许"漏一个" |
| **Transitions**（转换）| 什么操作 / 事件触发状态切换 |
| **Effects**（效果）| 切换时 UI 发生什么变化（视觉 / 动效 / 焦点 / 数据副作用）|

> 每个状态机在 md 中以三段式输出，最后浓缩到 `screen.meta.interaction.summary` + `states[]`。

## 2. 状态命名规则

- 名字必须是**形容当前用户感知**的词，不是"按钮的视觉态"
- 不允许 `state1 / state2 / loading2 / errorEx`——必须语义化
- 推荐风格：`idle / inputting / validating / submitting / success / error / locked`

## 3. 典型例子：登录页状态机

```
States:
  idle         初始态，表单空白，按钮可点
  inputting    用户正在输入，实时校验进行
  validating   前端校验中（如手机号格式）
  submitting   请求发送中，按钮 loading
  success      登录成功，准备跳转
  error        登录失败，显示错误（短暂态）
  locked       连续失败 ≥ 5 次，账户临时锁定（持续态，倒计时结束才解）

Transitions:
  idle        → inputting:   focus 任意输入框
  inputting   → validating:  输入满足提交条件（非空 + 格式合法）
  inputting   → idle:        清空所有输入
  validating  → submitting:  click 登录按钮 + 前置 condition 通过
  submitting  → success:     ds-login.onSuccess
  submitting  → error:       ds-login.onError（401/500/timeout）
  error       → inputting:   用户修改输入
  error       → locked:      view.failureCount >= 5
  locked      → idle:        view.lockedUntil < now()（倒计时到 0）

Effects:
  → submitting: 按钮显 spinner + disabled + 文字"登录中..."；表单 disabled
  → success:    按钮 ✓ 0.5s 后 nav.go home
  → error:      按钮恢复 + 表单 shake + 错误文字淡入 + credential 框清空 + focus
  → locked:     全表单 disabled + locked Sheet 上移 + 倒计时
```

## 4. 列表型屏的状态机模式（每个 dataSource 都有 4 态）

每个 API 数据源带 4 个运行时态：

```
States:
  ds-feed.idle         首次未触发
  ds-feed.pending      请求中（首屏 = 全屏 skeleton；分页 = 列表底 spinner）
  ds-feed.success-empty 返回成功但 list.length === 0
  ds-feed.success      返回成功且有数据
  ds-feed.error        timeout / 4xx / 5xx
```

每个状态对应**一个或一组**衍生视图节点（详见 `methodology/07-derivative-views.md`）。

## 5. 业务对象状态机模式（订单 / 任务 / 工单 / 审批 / 账户 / 会话）

product 阶段已经在 `screen.meta.product.rules` 显式枚举：

```
"业务规则: 订单状态字段 order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}"
```

interaction 阶段必须为**每个 enum 值**建独立视图节点 + visibleWhen 互斥（详见 `methodology/07-derivative-views.md` 类 5）。

## 6. 状态机的 md 落地

```markdown
## 状态机三要素

### States（穷举）
- idle: ...
- inputting: ...
- ...

### Transitions（每条注明触发源）
- idle → inputting [focus 输入框]
- ...

### Effects（每个目标状态注明 UI 变化）
- → submitting:
  - 按钮 spinner（visualState: loading；design 阶段实施）
  - 表单 disabled
  - 触觉 / 阻断点击
- ...

### 候选方案与否决
- 候选 A：把 success 与 error 合并为 done 态 → 否决，因为 success 要跳转 / error 要恢复
- 候选 B：locked 用 modal 代替 overlay → 否决，因为...
```

## 7. 落 schema 路径

| 产物 | 落到哪 |
|------|-------|
| 浓缩主线 | `screen.meta.interaction.summary` |
| States 列表 | `screen.meta.interaction.states[]`（字符串数组）|
| Transitions / Effects 详描述 | md 留痕；schema 不存细节（events.actions 间接体现）|

## 8. 红线

- ❌ 状态命名非语义化（state1 / loading2）
- ❌ Transitions 漏掉异常路径（如忘了 `submitting → error`）
- ❌ Effects 段空白
- ❌ 业务对象状态机已在 product rules 枚举，但 interaction 没每个值建独立视图（违 R-VIEW-BUSINESS-01）
