# 12 — 业务态视觉映射

> 必读时机：执行 `D-X-G<N>-craft` 任务涉及 visualStates 时;`D-X-coverage-fallback` 兜底交互节点时。
> 任务目的：把 interaction 阶段定义的 `state.view` 字段（业务态）翻译成 `node.states[]` 视觉变化。
>
> 关键约束：每个 visualState 改动**必须服务某 designGoal**,不能"为做态而做"。

---

## 1. 业务态 vs DOM 事件态

```
DOM 事件态:    hover / pressed / focus / disabled (浏览器原生交互态)
               固定枚举,所有交互节点必备

业务态:        loginMode='code' / lockedUntil != null / errors.phone != null (业务定义)
               来自 interaction.state.view 字段或 dataSources 的派生
               每屏不同
```

两类都通过 `node.states[]` 表达,但触发机制不同：
- DOM 事件态: 浏览器自动触发（用户 hover / focus / 点击）
- 业务态: 通过 `activeWhen` 表达式与 state.view / dataSources 联动

---

## 2. 业务态视觉化的 5 步流程

```
Step 1: 扫 interaction 给的 state.view 字段
Step 2: 每字段服务于哪个 designGoal? (强制问)
Step 3: 视觉差异方案 (本字段切换前后,哪些节点的视觉变化)
Step 4: 写 visualState (含 activeWhen 表达式 + styleOverrides + childrenStates)
Step 5: 截图核对前后视觉差异（≥ 显著）
```

### Step 1: 扫字段

读 `screen.stateInit.view` + `interaction` 阶段定义的 view 变量。

例（登录页）：
```
view 字段:
  loginMode: 'code' | 'password'         // 验证码 / 密码登录切换
  form.policy: boolean                   // 协议是否勾选
  errors.phone: string | null            // 手机号错误
  errors.credential: string | null       // 凭证错误
  submitting: boolean                    // 提交中
  lockedUntil: number | null             // 锁定到期时间
  passwordVisible: boolean               // 密码显隐
```

### Step 2: 服务于哪个 designGoal?

强制问每个字段：

| view 字段 | 服务 goal | 为什么 |
|---|---|---|
| loginMode | G4 state-feedback | 模式切换可见性是状态反馈 |
| form.policy | G3 trust-signal | 勾选 = 主动同意,降焦虑 |
| errors.phone/credential | G3 trust-signal | 错误态降焦虑 |
| submitting | G2 cta-clarity | CTA 在 loading 不黯淡 |
| lockedUntil | G4 state-feedback (锁定温和) | 锁定态温和 |
| passwordVisible | (跳过,辅助态,无 goal 直接关联) | 由 coverage-fallback 兜底 |

⚠️ 不服务任何 goal 的字段 → 由 coverage-fallback 任务做最小可见态。

### Step 3: 视觉差异方案

每字段切换时,涉及哪些节点的视觉变化（多元素协同）：

```
loginMode='code' → 'password':
  - CodeModeBtn: active 字色 + 字重 + 下划线（消失）
  - PasswordModeBtn: inactive → active 字色 + 字重 + 下划线（显现）
  - TabIndicator: 滑动到 PasswordModeBtn 下方
  - CredentialInput: placeholder 文案变化 + 类型变 password
  - GetCodeBtn: 显示 → 隐藏
  - PasswordToggleEye: 隐藏 → 显示

form.policy=false → true:
  - PolicyCheckVisual: 边框态 → 主色填充 + 白对勾
  - SubmitBtn: disabled 灰 → enabled 主色
  - 提交错误提示: "请勾选" → 消失

submitting=false → true:
  - SubmitBtn: 主色不变 + 内嵌 spinner 显示 + 文字"登录中..."
  - SubmitSpinner: hidden → visible
  - 表单字段: enabled → disabled

lockedUntil=null → number:
  - NormalFormView: visible → hidden
  - LockedView: hidden → visible
  - LockedCountdown: 倒计时数字大尺寸主色
```

### Step 4: 写 visualState

每个 view 字段的视觉差异翻译成 visualState：

```jsonc
// CodeModeBtn 节点
{
  states: [
    {
      name: "active",
      activeWhen: "{{ state.view.loginMode === 'code' }}",
      styleOverrides: {
        color: "$token:colors.primary",
        fontWeight: "600"
      },
      childrenStates: [
        { nodeId: "TabIndicator", state: "underCodeBtn" }  // 联动 TabIndicator 位置
      ]
    },
    {
      name: "inactive",
      activeWhen: "{{ state.view.loginMode !== 'code' }}",
      styleOverrides: {
        color: "$token:colors.textSecondary",
        fontWeight: "500"
      }
    }
  ]
}

// SubmitBtn 节点
{
  states: [
    {
      name: "loading",
      activeWhen: "{{ state.view.submitting === true }}",
      styleOverrides: {
        // 主色不变 (G2 要求 loading 时主角不黯淡)
        backgroundColor: "$token:colors.primary",
        color: "$token:colors.textInverse"
      },
      childrenStates: [
        { nodeId: "SubmitSpinner", state: "visible" }
      ],
      childrenVisibility: {
        SubmitSpinner: true
      },
      disabledEvents: ["click"]
    },
    {
      name: "disabled",
      activeWhen: "{{ !state.view.form.policy || state.view.lockedUntil != null }}",
      styleOverrides: {
        opacity: "0.4",
        cursor: "not-allowed"
      },
      disabledEvents: ["click"]
    }
  ]
}
```

### Step 5: 截图核对

切换业务态前后跑截图（设置不同 state.view 值）,Read 看图：
- 切换前后像素差 ≥ 3% (常规状态切换)
- 切换前后像素差 ≥ 50% (整屏分支视图,如 LockedView)

---

## 3. 必备视觉态矩阵

| 节点类型 | 必备 visualStates |
|---|---|
| `<button>` | hover / pressed / focus / disabled (DOM 4 态) |
| `<input>` | focus / disabled / error (3 态) |
| `<select>` | focus / disabled |
| `<a>` 链接 | hover |
| 业务复合控件 | 业务态（按 §2 推导） |
| LockedView / NormalView 等分支 | active / inactive (基于 lockedUntil 或类似字段) |

DOM 必备态如果遗漏 → 由 `coverage-fallback` 任务兜底。
业务态如果遗漏 → 找哪个 goal 服务,补到对应 craft 任务。

---

## 4. activeWhen 表达式规范

### 4.1 支持语法

```
{{ state.view.loginMode === 'code' }}
{{ state.view.lockedUntil != null }}
{{ state.view.errors.phone != null && state.view.errors.phone !== '' }}
{{ !state.view.form.policy }}
```

### 4.2 不允许

- ❌ JavaScript 函数调用 (`Math.X / Date.now() / ...`)
- ❌ 多行表达式
- ❌ 副作用（赋值 / 修改）

### 4.3 多状态优先级

按 states 数组顺序,**前优先**：

```jsonc
states: [
  { name: "loading", activeWhen: "{{ submitting }}" },          // 优先级最高
  { name: "disabled", activeWhen: "{{ !policy || locked }}" },
  { name: "default", activeWhen: "{{ true }}" }                  // 兜底
]
```

如果 submitting=true 且 !policy=true → 显示 loading 态（前优先）。

---

## 5. 反模式

### 5.1 业务态不挂 goal

❌ 错：
```
visualState: {
  name: "loading",
  activeWhen: "{{ submitting }}",
  styleOverrides: { opacity: 0.5 }   // SubmitBtn loading 时灰掉
}
```

后果: 没问"这个视觉差异服务什么"。SubmitBtn loading 时灰掉违反 G2 cta-clarity（loading 时主角不黯淡）。

✅ 对：
```
visualState: {
  name: "loading",
  activeWhen: "{{ submitting }}",
  styleOverrides: {
    backgroundColor: "$token:colors.primary",  // G2: 主色不变
    color: "$token:colors.textInverse"
  },
  childrenVisibility: { SubmitSpinner: true }
}
```

### 5.2 单节点切换（缺多元素协同）

❌ 错：
```
loginMode 切换只改 ModeToggle 的 active 字色
```

后果: 用户看不出整屏切换了模式,体验崩坏。

✅ 对：
```
loginMode 切换涉及 ≥ 4 节点协同:
  CodeModeBtn / PasswordModeBtn 字色字重切换
  TabIndicator 位置滑动
  CredentialInput placeholder + type 变
  GetCodeBtn / PasswordToggleEye 显隐切换
```

### 5.3 切换无 transition

❌ 错：
```
visualState 直接 styleOverrides,无 transition
```

后果: 状态切换瞬间,用户感受不到变化。

✅ 对：
```
visualState: {
  ...
  transition: { duration: "$token:transitions.normal.value", easing: "$token:transitions.normal.easing" }
}
```

---

## 6. 自检（每写 visualState 前）

- [ ] 这个 visualState 服务于哪个 designGoal?
- [ ] 涉及节点 ≥ 2 个 (业务态通常需多元素协同)
- [ ] activeWhen 表达式有效
- [ ] 切换前后视觉差异 ≥ 显著
- [ ] DOM 必备态（hover/focus/disabled/error）齐全
- [ ] 切换有 transition

任一未通过 → 重做。

---

## 7. 一句话总结

> **业务态视觉化 = state.view 字段切换时多元素协同的视觉变化,每个 visualState 服务某 goal,切换前后视觉差异显著,有 transition。**
