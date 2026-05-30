> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-events
> 对应 schema 字段：node.events[*] + bind + repeat + visibleWhen + props.textContent（动态部分）

# Step I-events: <屏名> — 节点 events.actions 落库（核心）★

> 详细规范见 `schema-spec/interaction-events.md` + `../common/references/v2-actions-cheatsheet.md`。
>
> 这是 interaction 阶段最核心、最长的任务。所有"操作 → UI 行为"的契约都在这里翻译成结构化 actions。

## 推理过程

### 1. 节点交互职责清单

> 列出本屏每个需要 events / bind / repeat / visibleWhen / 动态文案 的节点。

| 节点 name | 节点 id | 类型 | 交互职责 | 实现 |
|----------|---------|------|---------|-----|
| ModeToggle | n5 | click 切换 | 切换登录方式 | event click → state.set |
| PhoneInput | n6 | 受控输入 + onChange 校验 | 实时校验手机号 | bind + event change |
| CredentialInput | n7 | 受控输入 + 动态属性 | 实时校验 + 类型动态切换 | bind + event change + 动态 props |
| EyeIcon | n8 | click 切换 | 切换密码可见 | event click → state.toggle |
| PolicyCheckbox | n10 | 受控勾选 | 协议状态 | bind |
| SubmitBtn | n9 | 主流程 click | 登录提交 | event click（含 effect.fetch + onSuccess + onError）|
| RegisterLink | n11 | nav.go | 跳注册 | event click → nav.go |
| ForgotLink | n12 | 打开 modal | 打开找回密码 modal | event click → state.set view.forgotModalOpen |
| rootNode | — | 屏生命周期 | 进入复位 / 离开取消 | screenEnter + screenExit |

### 2. actions 链翻译过程（每个节点逐个推理）

#### ModeToggle

```jsonc
{
  trigger: "click",
  description: "切换登录方式（验证码 / 密码）",
  actions: [
    { type: "state.set", path: "view.loginMode",
      value: "{{ state.view.loginMode === 'code' ? 'password' : 'code' }}" },
    { type: "state.set", path: "view.errors", value: { phone: "", credential: "", policy: "", login: "" } }
  ]
}
```

候选 / 否决：
- A：用 state.toggle → 否决：toggle 仅适用 boolean，loginMode 是字符串枚举
- B：切换时不清错误 → 否决：错误信息可能不再适用，需清空

#### PhoneInput（受控输入 + onChange 校验）

```jsonc
// bind（值同步）
element/set_bind { nodeId: n6, path: "view.form.phone" }

// event change（副作用：校验 + 更新 canSubmit）
{
  trigger: "change",
  description: "手机号实时校验 + 更新 canSubmit",
  actions: [
    { type: "state.set", path: "view.errors.phone",
      value: "{{ /^1[3-9]\\d{9}$/.test(event.value) ? '' : '手机号格式不正确' }}" },
    { type: "state.set", path: "view.canSubmit",
      value: "{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) && state.view.form.credential && state.view.form.policy }}" }
  ]
}
```

#### CredentialInput（受控 + 动态 props）

```jsonc
// bind
element/set_bind { nodeId: n7, path: "view.form.credential" }

// 动态 props（类型 + placeholder 都依赖 view.loginMode / view.showPassword）
component_prop/update_props {
  nodeId: n7,
  props: {
    placeholder: "{{state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}",
    type: "{{state.view.loginMode === 'code' ? 'text' : (state.view.showPassword ? 'text' : 'password')}}"
  }
}

// event change（副作用）
{
  trigger: "change",
  description: "凭证实时校验",
  actions: [
    { type: "state.set", path: "view.canSubmit", value: "{{...}}" }
  ]
}
```

#### EyeIcon（密码可见切换）

```jsonc
{
  trigger: "click",
  description: "切换密码可见性",
  actions: [{ type: "state.toggle", path: "view.showPassword" }]
}
```

#### SubmitBtn（核心 main flow）★

```jsonc
{
  trigger: "click",
  description: "登录提交主流程",
  condition: { when: "{{view.canSubmit && !view.submitting && (view.lockedUntil ?? 0) < now()}}" },
  actions: [
    { type: "state.set", path: "view.submitting",   value: true },
    { type: "state.set", path: "view.errors.login", value: "" },

    { type: "effect.fetch", dataSourceId: "ds-login",
      params: {
        phone: "{{view.form.phone}}",
        credential: "{{view.form.credential}}",
        mode: "{{view.loginMode}}"
      },
      onSuccess: [
        { type: "state.set", path: "data.user",    value: "{{response.user}}" },
        { type: "state.set", path: "globalView.session",
          value: {
            status: "authenticated",
            token:  "{{response.token}}",
            user:   "{{response.user}}",
            expiresAt: "{{now() + response.expiresIn * 1000}}",
            lastActivityAt: "{{now()}}"
          } },
        { type: "state.set", path: "view.submitting",   value: false },
        { type: "state.set", path: "view.failureCount", value: 0 },
        { type: "logic.if",
          when: "{{!!globalView.nav.authRedirectTo}}",
          then: [
            { type: "nav.go", targetScreenId: "{{globalView.nav.authRedirectTo}}" },
            { type: "state.set", path: "globalView.nav.authRedirectTo", value: null }
          ],
          else: [
            { type: "nav.go", targetScreenId: "01-home", animation: { type: "fade", duration: 300 } }
          ]
        }
      ],
      onError: [
        { type: "state.set", path: "view.submitting", value: false },
        { type: "state.set", path: "view.failureCount", value: "{{state.view.failureCount + 1}}" },
        { type: "logic.if",
          when: "{{state.view.failureCount >= 5}}",
          then: [
            { type: "state.set", path: "view.lockedUntil", value: "{{now() + 30*60*1000}}" }
          ],
          else: [
            { type: "state.set", path: "view.errors.login", value: "{{$last.error.message}}" },
            { type: "ui.animate", nodeId: "FormCard", animation: "shake", duration: 400 },
            { type: "ui.showToast", toastType: "error", message: "{{$last.error.message}}" }
          ]
        }
      ]
    }
  ]
}
```

#### rootNode 生命周期

```jsonc
[
  {
    trigger: "screenEnter",
    description: "进入登录页：复位表单",
    actions: [
      { type: "state.set", path: "view.form", value: { phone: "", credential: "", policy: false } }
    ]
  },
  {
    trigger: "screenExit",
    description: "离开登录页：取消未完成的 fetch",
    actions: [
      { type: "effect.cancel", dataSourceId: "ds-login" }
    ]
  }
]
```

### 3. 候选方案与否决（重要决策）

- 候选 A：失败 5 次锁定改在 onError 之外（如 watch 失败次数）→ 否决：当前 schema 不支持 watch，logic.if 内联清晰
- 候选 B：CredentialInput 用 event.change 替代 bind → 否决：失去受控同步，要手写 state.set + value 取值
- ...

### 4. 边界覆盖核对

| 边界（来自 boundaries 任务）| 在 events 中如何体现 | ✓/❌ |
|---------------------------|--------------------|-----|
| 重复点击防抖 | SubmitBtn condition.when 含 !view.submitting | ✓ |
| 离开页面取消 | rootNode screenExit + effect.cancel | ✓ |
| ... | ... | |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 受控绑定
element/set_bind { projectId, nodeId: <PhoneInput-id>, path: "view.form.phone" }
element/set_bind { projectId, nodeId: <CredentialInput-id>, path: "view.form.credential" }
element/set_bind { projectId, nodeId: <PolicyCheckbox-id>, path: "view.form.policy" }

// 2) 动态 props
component_prop/update_props { projectId, nodeId: <CredentialInput-id>,
  props: {
    placeholder: "{{state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}",
    type:        "{{state.view.loginMode === 'code' ? 'text' : (state.view.showPassword ? 'text' : 'password')}}"
  }
}

// 3) events（每个节点 event/add 一次或多次）
event/add { projectId, nodeId: <ModeToggle-id>, trigger: "click", description: "...", actions: [...] }
event/add { projectId, nodeId: <PhoneInput-id>, trigger: "change", description: "...", actions: [...] }
event/add { projectId, nodeId: <CredentialInput-id>, trigger: "change", description: "...", actions: [...] }
event/add { projectId, nodeId: <EyeIcon-id>, trigger: "click", description: "...", actions: [...] }
event/add { projectId, nodeId: <SubmitBtn-id>, trigger: "click", condition: {...}, description: "...", actions: [...] }
event/add { projectId, nodeId: <RegisterLink-id>, trigger: "click", description: "...", actions: [{ type: "nav.go", targetScreenId: "00-register" }] }
event/add { projectId, nodeId: <ForgotLink-id>, trigger: "click", description: "...", actions: [{ type: "state.set", path: "view.forgotModalOpen", value: true }] }
event/add { projectId, nodeId: <rootNode-id>, trigger: "screenEnter", ... }
event/add { projectId, nodeId: <rootNode-id>, trigger: "screenExit", ... }
```
