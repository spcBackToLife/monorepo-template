# 模板：D-X-states（visualStates 完备态）★

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/states.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-states
> 对应 schema 字段：每节点 states[] + activeState

## 1. 矩阵覆盖核对（按节点类型 × variant × state）

| 节点 | 类型 | variant | states 已写 | 最低门槛 | 缺哪个 |
|------|------|---------|-----------|---------|--------|
| SubmitBtn | Button | primary | default,hover,pressed,focus,disabled,loading | 6 | ✅ 满 |
| PhoneInput | Input | default | default,hover,focus,error,disabled | 5 | ✅ 满 |
| CredentialInput | Input | default | default,focus,error | 3 | ✅ 满 |
| ModeToggle | Custom | toggle | default,active,hover,disabled | 4 | ✅ 满 |
| FormCard | Card | container | default,loading | 2 | ✅ 满（容器无需 hover）|
| RegisterLink | Link | text | default,hover,disabled | 3 | ✅ 满 |
| ForgotLink | Link | text | default,hover,disabled | 3 | ✅ 满 |

## 2. activeWhen 自动激活态清单

| 节点 | state | activeWhen | 触发场景 |
|------|-------|-----------|---------|
| PhoneInput | error | `{{!!state.view.errors.phone}}` | 校验失败 |
| CredentialInput | error | `{{!!state.view.errors.credential}}` | 校验失败 |
| FormCard | loading | `{{state.view.submitting}}` | 提交中 |
| SubmitBtn | code-mode | `{{state.view.loginMode === 'code'}}` | 切换登录方式 |

## 3. childrenStates / childrenVisibility 联动

### FormCard.loading → 子节点联动
```jsonc
n4 (FormCard).states[loading] = {
  childrenStates: {
    "<phoneInput-id>":      "disabled",
    "<credentialInput-id>": "disabled",
    "<modeToggle-id>":      "disabled",
    "<submitBtn-id>":       "loading"
  }
}
```

### SubmitBtn.loading → spinner/text 切换
```jsonc
n9 (SubmitBtn).states[loading] = {
  childrenVisibility: {
    "<submitSpinner-id>": true,
    "<submitText-id>":    false
  }
}
```

## 4. 每节点完整 states[]（逐节点）

### n9 - SubmitBtn

```jsonc
visual_state/add(以下每条) {
  projectId, nodeId: "n9",
  ...
}

states = [
  { name: "default", styles: {}, transition: { duration: 200, easing: "spring" } },
  
  { name: "hover",
    styles: {
      backgroundColor: "$token:colors.primaryHover",
      boxShadow: "$token:shadows.md",
      transform: "translateY(-1px)"
    },
    transition: { duration: 150, easing: "ease-out" } },
  
  { name: "pressed",
    styles: {
      backgroundColor: "$token:colors.primaryActive",
      boxShadow: "$token:shadows.xs",
      transform: "translateY(0)"
    },
    transition: { duration: 80, easing: "ease-in" } },
  
  { name: "focus",
    styles: { boxShadow: "0 0 0 3px $token:colors.primaryLight" },
    transition: { duration: 150, easing: "ease-out" } },
  
  { name: "disabled",
    styles: {
      backgroundColor: "$token:colors.gray400",
      boxShadow: "none",
      cursor: "not-allowed",
      opacity: 0.6
    },
    disabledEvents: ["click"] },
  
  { name: "loading",
    styles: { backgroundColor: "$token:colors.primary", cursor: "wait", opacity: 0.9 },
    childrenVisibility: { "<submitSpinner>": true, "<submitText>": false },
    disabledEvents: ["click"] },
  
  { name: "code-mode",
    activeWhen: "{{state.view.loginMode === 'code'}}",
    styles: {} }
]
```

理由：___________

### n6 - PhoneInput

```jsonc
states = [
  { name: "default", styles: {} },
  { name: "hover",   styles: { borderColor: "$token:colors.borderStrong" } },
  { name: "focus",
    styles: {
      borderColor: "$token:colors.primary",
      boxShadow: "0 0 0 3px $token:colors.primaryLight"
    },
    transition: { duration: 150, easing: "ease-out" } },
  { name: "error",
    activeWhen: "{{!!state.view.errors.phone}}",
    styles: {
      borderColor: "$token:colors.error",
      backgroundColor: "rgba(237,90,90,0.05)"
    } },
  { name: "disabled",
    styles: { opacity: 0.5, cursor: "not-allowed" },
    disabledEvents: ["change","focus"] }
]
```

理由：___________

[继续每个交互节点 ...]

## 5. transition 时长 / 缓动决策

| 切换 | duration | easing | 理由 |
|------|---------|--------|------|
| default → hover | 150ms | ease-out | 友好响应 |
| hover → pressed | 80ms | ease-in | 按下要快 |
| → focus | 150ms | ease-out | 与 hover 一致 |
| → disabled | 200ms | ease-in-out | 平滑灰化 |
| → loading | 200ms | ease-out | 启动动画 |
| → error (activeWhen) | 250ms | ease-out | 错误显眼但不刺眼 |

## 6. ★ 沉淀到 schema 的结论

汇总所有 visual_state/add 调用清单：

```jsonc
[
  { nodeId: "n9", name: "hover", styles: {...}, transition: {...} },
  { nodeId: "n9", name: "pressed", styles: {...}, transition: {...} },
  // ...
  { nodeId: "n6", name: "focus", styles: {...} },
  { nodeId: "n6", name: "error", activeWhen: "...", styles: {...} },
  // ...
]
```

⚠️ **后续任务约束**：
- D-X-coverage：核对 visualStates 矩阵完整性 + 父子联动 nodeId 引用是否真存在
- D-X-tree-redlines：核对每个非 default 状态是否有对应节点（如 error 态有 PhoneError）
```
