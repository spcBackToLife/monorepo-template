# 方法论 10：业务态视觉化 (State-Visual Mapping)（v3 新增）

> 适用任务：`D-X-states-business`、`D-X-craft-*`
>
> **核心**：interaction 阶段写在 `state.view` 的 boolean / enum / number / string 字段，**每一个都可能要映射到节点的 visualState**。这一映射不做 = 业务态不可见 = 用户分不清当前状态。

> 与 `methodology/06-visualstates-completeness.md §7` 配套——06 §7 给概念，本方法论给完整流程。

---

## 1. 为什么必须做业务态视觉化

```
interaction 阶段写完：
  state.view.activeMode: 'code' | 'password'

如果 design 阶段不映射：
  ✗ ModeToggle 两 tab 字色一样（看不出当前选中哪个）
  ✗ 用户切换登录方式后画面无视觉变化（以为没切换成功）

正确映射后：
  ✓ activeMode='code' → CodeModeBtn 字色 primary + 字重 700 + TabIndicator 在左
  ✓ activeMode='password' → PasswordModeBtn 字色 primary + 字重 700 + TabIndicator 在右
```

---

## 2. 5 步业务态映射流程（D-X-states-business 任务必做）

### Step 1：扫 state.view 全部字段

`query/screen_schema` → 取 `screen.stateInit.view` + `project.stateInit.view`（全局）→ 列出所有字段。

### Step 2：对每个字段问 4 个问题

```
对每个 state.view.X 字段：
  Q1. 这个字段的语义是什么？（业务含义）
  Q2. 它的变化用户应该看到吗？
       → 是 → 进 Q3
       → 否（如纯内部计算的临时值）→ 跳过
  Q3. 哪些节点的视觉应该反映它？（节点 ID 列表）
  Q4. 那些节点对应的 visualState 名是什么？（active / checked / selected / expanded / counting / loading / error / ...）
```

### Step 3：写 stateVisualMap

```
| state.view 字段 | 类型 | 业务含义 | 涉及节点 | visualState 名 | activeWhen 表达式 |
| activeMode | enum | 登录方式 | CodeModeBtn / PasswordModeBtn / TabIndicator | active / code-active / password-active | {{state.view.activeMode === 'code'}} 等 |
| policyAccepted | bool | 协议同意 | PolicyCheckVisual | checked | {{state.view.policyAccepted}} |
| codeCountdown | number | 验证码倒计时 | GetCodeBtn | counting | {{state.view.codeCountdown > 0}} |
| submitting | bool | 登录中 | SubmitBtn / FormCard | loading / disabled | {{state.view.submitting}} |
| submitAttempted | bool | 是否提交过 | PolicyCheckVisual / PolicyText | error | {{!state.view.policyAccepted && state.view.submitAttempted}} |
| passwordVisible | bool | 密码可见 | PasswordToggleEye / CredentialInput | visible / type-text | {{state.view.passwordVisible}} |
| lockedUntil | number | 锁定截止 | NormalFormView / LockedView | hidden / shown | {{state.view.lockedUntil > $.now()}} |
```

### Step 4：对每个映射调 visual_state/add（含 activeWhen 表达式）

```jsonc
visual_state/add {
  nodeId: "n_CodeModeBtn",
  state: {
    name: "active",
    activeWhen: "{{state.view.activeMode === 'code'}}",
    styles: { color: "$token:colors.textPrimary", fontWeight: "700" }
  }
}
```

### Step 5：落 schema 后 generate_snapshots

切换 mock scenarios 让每个业务态都被触发，看截图——业务态视觉是否都可见？

---

## 3. activeWhen 表达式书写规范

```
✅ 正确：
  {{state.view.activeMode === 'code'}}
  {{state.view.policyAccepted}}
  {{state.view.codeCountdown > 0}}
  {{!state.view.policyAccepted && state.view.submitAttempted}}
  {{state.view.expandedKey === item.id}}              // 列表项内
  {{state.view.selectedIds.includes(id)}}             // 列表项内

❌ 错误：
  {{activeMode === 'code'}}                            // 漏 state.view 前缀
  {{state.view.activeMode == 'code'}}                  // 单等于号（要 ===）
  {{state.view.policyAccepted == true}}                // 应直接 {{state.view.policyAccepted}}
  state.view.policyAccepted                            // 漏 {{ }} 包裹
```

---

## 4. 业务态命名规范

| 业务含义 | 推荐 visualState 名 |
|---|---|
| 当前激活的 tab / segment | `active` |
| 已勾选 / 已选中 | `checked` |
| 列表项被选中 | `selected` |
| Accordion 已展开 | `expanded` |
| Stepper 已完成 | `completed` |
| Stepper 当前 | `current` |
| Stepper 未到达 | `upcoming` |
| 倒计时中 | `counting` 或 `countdown` |
| 加载中 | `loading` |
| 提交中 | `submitting` 或 `loading` |
| 错误态 | `error` |
| 成功态 | `success` |
| 警告态 | `warning` |
| 锁定 | `locked` |
| 隐藏 / 显示 | `hidden` / `shown` |
| 可见 / 不可见 | `visible` / `invisible`（如密码切换）|

避免命名歧义（如 `state1` / `state2` / `flag-true`）。

---

## 5. 处理"interaction 没暴露字段"的情况

design 阶段发现某节点该有视觉态、但 interaction 没暴露对应 state.view 字段（如 PasswordToggleEye 但没 state.view.passwordVisible）：

```
正确做法：走 UpstreamChallenge → interaction-designer 补 state.view.passwordVisible 字段 + onClick 事件
错误做法：在 design 阶段 schema/state/view_add 加字段（违反 §5.4 阶段边界）
```

---

## 6. 同节点多业务态优先级（重要）

一个节点可能有多个 visualState 同时 activeWhen 命中。优先级规则（运行时按写入顺序）：

```
PolicyCheckVisual.states 写入顺序：
  1. default（无 activeWhen）
  2. focus（DOM 事件态，最高级别）
  3. error（业务态 activeWhen: !accepted && submitAttempted）
  4. checked（业务态 activeWhen: accepted）
  5. disabled（DOM 事件态，与 error 互斥）

冲突处理：
  - error + checked 不会同时命中（accepted=true 时 error 表达式必为 false）
  - error + focus 可同时命中 → focus 视觉叠加 error 视觉（边色 error + 光晕 errorLight）
```

设计 visualStates 时**主动思考多态命中场景**——避免某种组合下视觉混乱。

---

## 7. md 落地

D-X-states-business 任务的 md 必须含完整 stateVisualMap 表 + 每个业务态的 activeWhen 表达式 + 与 interaction 阶段已写字段的拼写一致性核对。

详见 `note-templates/states.template.md`（v3 升级时加 §业务态映射段）。

---

## 8. 红线

- ❌ stateInit.view 字段未全扫一遍 → R-STATEMAP-01
- ❌ 业务复合控件（tab / checkbox / accordion）只有 DOM 事件态、无业务态 → R-RECOG-01
- ❌ activeWhen 表达式拼写错（漏 state.view 前缀 / 单 == / 字段名错）→ 表达式失效
- ❌ visualState 命名用 `state1` / `flag-true` 等无业务语义的名字
- ❌ 设计 visualStates 时未考虑多态同时命中的场景 → 运行时视觉混乱
- ❌ 发现 interaction 缺字段不挂 challenge 反而当场补 → R-BOUNDARY-01
