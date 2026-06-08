# 方法论 6：visualStates 完备性矩阵

> 适用任务：`D-X-states-dom`、`D-X-states-business`、`D-X-coverage`、`D-global-overlay-states`
> visualStates **不是 hover 就够了**——交互节点必须按 variant × state 矩阵全格覆盖。
>
> §7「业务态来源（必须扫一遍 state.view）」★ 必读 —— 解决 ModeToggle 没 active、Checkbox 没 checked 视觉等问题
> §8「最低覆盖清单」含复合控件（tab/segment/stepper/accordion）
> 与 `pitfalls/composite-patterns.md`、`recipes/compositions/*.md` 配合使用

## 1. 三种 visualState

```
1. 显式状态（被 setVisualState action 触发）
   - default / hover / pressed / focus / disabled / loading
   - 由 events.actions 中的 node.setVisualState 切换

2. 自动激活状态（基于 activeWhen 表达式）
   - error 态：activeWhen: "{{!!state.view.errors.phone}}"
   - 业务态：activeWhen: "{{state.data.order.status === 'pending_payment'}}"
   - 由 schema 表达式自动求值

3. 浏览器原生状态（CSS 伪类）
   - :hover, :focus, :active（也可写到 styles 让浏览器自动）
   - 但更推荐用 visualState 显式建模，便于编辑画布预览
```

## 2. 完备性矩阵：组件 × variant × state

### 按钮（Button）
| variant | default | hover | pressed | focus | disabled | loading |
|---------|:-------:|:-----:|:-------:|:-----:|:--------:|:-------:|
| primary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| secondary | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tertiary | ✅ | ✅ | ✅ | ✅ | ✅ | (按需) |
| danger | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**最低门槛**：所有按钮 ≥ 4 态（default / hover / pressed / disabled）→ 缺一个 → R-VISUALSTATE-01

### 输入框（Input）
| variant | default | hover | focus | error | disabled | readonly |
|---------|:-------:|:-----:|:-----:|:-----:|:--------:|:--------:|
| default | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| success | ✅ | (按需) | ✅ | (互斥) | ✅ | (按需) |
| error   | ✅ | (按需) | ✅ | ✅ activeWhen | ✅ | (按需) |
| warning | ✅ | (按需) | ✅ | (按需) | ✅ | (按需) |

**最低门槛**：≥ 3 态（default / focus / error）

### 卡片（Card）
| variant | default | hover | selected | disabled |
|---------|:-------:|:-----:|:--------:|:--------:|
| default | ✅ | ✅ | (按需) | (按需) |
| selectable | ✅ | ✅ | ✅ | ✅ |

### Switch / Checkbox / Radio
| variant | unchecked | checked | disabled-unchecked | disabled-checked | focus |
|---------|:---------:|:-------:|:------------------:|:----------------:|:-----:|
| default | ✅ | ✅ | ✅ | ✅ | ✅ |

### Link
| variant | default | hover | visited | disabled |
|---------|:-------:|:-----:|:-------:|:--------:|
| default | ✅ | ✅ | (按需) | ✅ |

## 3. childrenStates / childrenVisibility（父态联动子态）

父节点状态切换时，子节点同步切换：

```jsonc
n4 (FormCard).states = [
  {
    name: "loading",
    activeWhen: "{{state.view.submitting}}",
    styles: { opacity: 0.7, pointerEvents: "none" },
    childrenStates: {
      "phoneInput":      "disabled",
      "credentialInput": "disabled",
      "modeToggle":      "disabled",
      "submitBtn":       "loading"
    }
  }
]
```

**用途**：
- 表单卡 loading 时所有子节点 disabled
- 列表项 selected 时内部 icon 高亮
- 主按钮 loading 时显示 spinner、隐藏文字

```jsonc
n9 (SubmitBtn).states = [
  {
    name: "loading",
    styles: { cursor: "wait", opacity: 0.9 },
    childrenVisibility: {       // ★ 显示 spinner、隐藏 text
      "submitSpinner": true,
      "submitText":    false
    },
    disabledEvents: ["click"]
  }
]
```

## 4. disabledEvents（状态禁用事件）

```jsonc
{
  name: "disabled",
  styles: { opacity: 0.5, cursor: "not-allowed" },
  disabledEvents: ["click", "change", "focus"]    // ★ 此态禁用这些事件
}

{
  name: "loading",
  styles: { cursor: "wait" },
  disabledEvents: ["click"]                       // ★ loading 时禁止重复点击
}
```

## 5. transition（状态切换过渡）

```jsonc
{
  name: "hover",
  styles: { backgroundColor: "$token:colors.primaryHover" },
  transition: { duration: 150, easing: "ease-out" }
}

{
  name: "pressed",
  styles: { transform: "translateY(0)" },
  transition: { duration: 80, easing: "ease-in" }   // 按下要快
}

{
  name: "focus",
  styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" },
  transition: { duration: 150, easing: "ease-out" }
}
```

**红线**：状态切换没 transition → "瞬间跳变"，体验生硬

## 6. activeWhen（自动激活态）

不需要 events 触发，直接由表达式驱动：

```jsonc
n6 (PhoneInput).states = [
  { name: "default", styles: {} },
  { name: "focus", styles: { borderColor: "$token:colors.primary" } },
  {
    name: "error",
    activeWhen: "{{!!state.view.errors.phone}}",   // ★ 自动激活
    styles: {
      borderColor: "$token:colors.error",
      backgroundColor: "rgba(237,90,90,0.05)"
    }
  }
]

n9 (SubmitBtn).states = [
  ...,
  {
    name: "code-mode",
    activeWhen: "{{state.view.loginMode === 'code'}}",
    styles: {}
  }
]
```

**用途**：
- error 态由 view.errors.* 驱动
- 业务态分支视图
- mode 切换（code/password）

## 7. ★ 业务态来源（必须扫一遍 state.view）

> visualState 的 state 不只是 DOM 事件态（hover/pressed/focus/disabled/loading）——还包含**业务态**（active/checked/selected/expanded/error/counting/...），由 interaction 阶段写的 `state.view` 字段触发。
>
> 设计师常犯的错：只写 DOM 事件态、忘了业务态——结果 ModeToggle 没 active、Checkbox 没 checked、Accordion 没 expanded、PolicyText 没 error 高亮。

### 7.1 两类 state 平级

```
DOM 事件态（5 类，由 setVisualState action 或浏览器伪类触发）：
  hover / pressed / focus / disabled / loading

业务态（来自 interaction 阶段 state.view 字段，由 activeWhen 表达式自动激活）：
  active / checked / selected / expanded / collapsed / counting / countdown
  pending / success / error / warning / locked / submitted / cancelled
  empty / loaded / loading-more / no-network
  edit-mode / preview-mode / readonly-mode
  ...（所有 state.view 字段都是潜在业务态来源）
```

### 7.2 扫描步骤（D-X-states-business 任务必做）

```
Step 1. query/screen_schema 取本屏 state
  → 列 stateInit.view 全部字段：boolean / enum / number / string

Step 2. 对每个字段，问 3 个问题：
  Q1. 谁的视觉应该反映这个字段？（节点 ID 列表）
  Q2. 这些节点对应的 visualState 名是什么？（active/checked/expanded/error...）
  Q3. activeWhen 表达式怎么写？

Step 3. 落 stateVisualMap（写在 D-X-states-business 任务的 md 里）：
  | state.view 字段 | 类型 | affectedNodes | visualState 名 | activeWhen 表达式 |
  | activeMode | "code"\|"password" | CodeModeBtn / PasswordModeBtn / TabIndicator | active | {{state.view.activeMode === 'code'}} 等 |
  | policyAccepted | bool | PolicyCheckVisual | checked | {{state.view.policyAccepted}} |
  | submitAttempted | bool | PolicyCheckVisual / PolicyText | error | {{!state.view.policyAccepted && state.view.submitAttempted}} |
  | submitting | bool | FormCard / SubmitBtn | loading | {{state.view.submitting}} |
  | passwordVisible | bool | PasswordToggleEye | visible | {{state.view.passwordVisible}} |
  | codeCountdown | number | GetCodeBtn | counting | {{state.view.codeCountdown > 0}} |
  | activeTab | enum | TabBtn[i] | active | {{state.view.activeTab === i}} |
  | expandedKey | string | AccordionItem[i] / ChevronIcon[i] / Panel[i] | expanded | {{state.view.expandedKey === id}} |
  | currentStep | number | StepperItem[i] | completed/current/upcoming | 三态用 < / === / > 表达式 |
  | selectedIds | array | ListItem[i] | selected | {{state.view.selectedIds.includes(id)}} |
  ...

Step 4. 对每个映射调 visual_state/add（含 activeWhen 表达式）

Step 5. 落 schema 后 generate_snapshots：切每个业务态都要可见
```

### 7.3 红线

- ❌ stateInit.view 有 boolean/enum 字段，但无任何节点 visualState 引用 → R-STATEMAP-01（业务态不可见）
- ❌ tab/checkbox/accordion 等业务复合控件没业务态 visualState（仅有 hover/focus）→ R-RECOG-01
- ❌ activeWhen 表达式拼写错（== / 漏 state.view 前缀 / 字段名错）→ 表达式失效 → 业务态从未激活

### 7.4 缺字段时走 UpstreamChallenge

如果 design 阶段发现某业务节点该有视觉态、但 interaction 没暴露对应 state.view 字段（如有 PasswordToggleEye 但没 state.view.passwordVisible）→ **走 UpstreamChallenge** 让 interaction 补字段，不要在 design 阶段硬塞业务字段。

---

## 8. 按交互节点类型的最低覆盖清单（含复合控件）

```
所有按钮 ≥ 4 态
  □ default
  □ hover
  □ pressed
  □ disabled
  + (按需) focus / loading

所有输入框 ≥ 3 态
  □ default
  □ focus
  □ error (activeWhen)
  + (按需) hover / disabled / readonly

所有可点击卡片/链接 ≥ 3 态
  □ default
  □ hover
  □ disabled
  + (按需) pressed / selected / focus

所有 Switch/Checkbox/Radio ≥ 4 态
  □ unchecked
  □ checked
  □ disabled-unchecked
  □ disabled-checked
  + focus

复合控件（详见 pitfalls/composite-patterns.md + recipes/compositions/*.md）：

Tab / Segment ≥ 5 态（每个子 button）
  □ default
  □ hover
  □ pressed
  □ focus
  □ active（业务态，activeWhen: state.view.activeTab === id）
  + (可选) disabled
  + 容器内可加 TabIndicator 节点（移动指示条）

Stepper（每个 step）≥ 3 态
  □ upcoming（默认）
  □ current（activeWhen: index === state.view.currentStep）
  □ completed（activeWhen: index < state.view.currentStep）

Accordion / Collapse ≥ 4 态（header + chevron + panel）
  Header：default / hover / focus
  ChevronIcon：default + expanded（activeWhen: state.view.expandedKey === item.id；transform rotate）
  Panel：default + expanded（maxHeight + padding）

Pagination（每个 PageBtn）≥ 4 态
  □ default
  □ hover
  □ active（activeWhen: pageIndex === state.view.currentPage）
  □ disabled（首页时上一页 / 尾页时下一页）

Switch / Toggle ≥ 3 态（Track + Thumb）
  □ unchecked（thumb 在左 + track 灰）
  □ checked（thumb 滑右 + track primary，activeWhen: state.view.X）
  □ disabled
```

## 9. 矩阵覆盖核对（D-X-coverage 用）

```
对屏内每个交互节点 + 复合控件：
  1. 列出节点类型 + variant
  2. 按上面清单查最低门槛（含 §7 业务态）
  3. 缺哪个态 → R-VISUALSTATE-01 / R-STATEMAP-01 → 立刻在 D-X-states-* 补
```

示例：

```
登录页交互节点矩阵核对：

| 节点 | 类型 | variant | states 已写 | 最低门槛 | 缺哪个 |
|------|------|---------|-----------|---------|--------|
| SubmitBtn | Button | primary | default,hover,pressed,focus,disabled,loading | 6 | ✅ 满 |
| PhoneInput | Input | default | default,hover,focus,error,disabled | 5 | ✅ 满 |
| CredentialInput | Input | default | default,focus,error | 3 | ✅ 满（hover/disabled 按需） |
| ModeToggle | Custom | (toggle) | default,active,disabled | 3 | ⚠️ 缺 hover ★ 待补 |
| RegisterLink | Link | text | default,hover | 2 | ⚠️ 缺 disabled ★ 待补 |
```

## 10. md 落地（D-X-states-dom + D-X-states-business）

### 10.1 D-X-states-dom（DOM 事件态）

```markdown
## DOM 事件态完备（D-X-states-dom）

### 节点 × DOM 事件态矩阵
[每个交互节点的 hover / pressed / focus / disabled / loading 列表]

### transition 时长决策
| 状态 | duration | easing | 理由 |
|------|---------|--------|------|
| default → hover | 150ms | ease-out | 友好响应 |
| hover → pressed | 80ms | ease-in | 按下要快 |
| → focus | 150ms | ease-out | 与 hover 一致 |
| → disabled | 200ms | ease-in-out | 平滑灰化 |

### ★ 沉淀到 schema 的结论
[每节点 states 数组 jsonc + visual_state/add 调用清单]
```

### 10.2 D-X-states-business（业务态映射）

```markdown
## 业务态映射（D-X-states-business）

### 1. 扫描 state.view 字段
[列 stateInit.view 全部字段 + 类型]

### 2. stateVisualMap（每个字段对应哪些节点的哪些 visualState）
| state.view 字段 | 类型 | affectedNodes | visualState 名 | activeWhen 表达式 |
|---|---|---|---|---|
| activeMode | enum | CodeModeBtn / PasswordModeBtn / TabIndicator | active / code-active / password-active | ... |
| policyAccepted | bool | PolicyCheckVisual | checked | {{state.view.policyAccepted}} |
| ...

### 3. 每个映射的 activeWhen 表达式
[完整表达式列表 + 与 interaction 已写字段的拼写一致性核对]

### 4. 上游缺字段（如有）→ UpstreamChallenge
[列出 design 阶段需要但 interaction 未暴露的字段，挂 challenge 让上游补]

### 5. ★ 沉淀到 schema 的结论
[visual_state/add 调用清单（含 activeWhen 表达式）]
```

## 11. 红线

- ❌ 所有按钮缺 disabled 或 pressed → R-VISUALSTATE-01
- ❌ 所有输入框缺 focus 或 error → R-VISUALSTATE-01
- ❌ "hover 留给 executor 补" → 必须本阶段全写
- ❌ 状态切换无 transition → 瞬间跳变
- ❌ visualState 写了 styles 但与 token 引用规范不符（硬编码）
- ❌ disabled 态没 disabledEvents 数组 → 用户仍可点击触发逻辑
- ❌ loading 态没 childrenVisibility 切换 spinner/text → spinner 跟 text 同时显示
- ❌ activeWhen 表达式语法错误 → 必须按 expression-language-cheatsheet 规范写
- ❌ 状态太多冗余（如同时写 hover + hover-2 + hover-3）→ 用 styles 函数式 token 解决而不是堆状态
- ❌ stateInit.view 有 boolean/enum 字段但无任何节点 visualState 引用 → R-STATEMAP-01
- ❌ 业务复合控件（tab/checkbox/accordion）只有 DOM 事件态、无业务态 → R-RECOG-01
- ❌ activeWhen 表达式拼写与 interaction 阶段已写字段不一致 → 表达式失效 → 业务态从未激活
