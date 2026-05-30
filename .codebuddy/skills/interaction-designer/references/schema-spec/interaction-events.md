# Interaction Events 规范 ★（任务 `I-X-events` 必读）

> 本文件定义节点的 events.actions / bind / repeat / visibleWhen / 动态文案 的完整 schema 写法。
>
> 配合 `../common/references/v2-actions-cheatsheet.md`（22 种 v2 动词速查）使用。

## §1. events 总结构

```jsonc
node.events = [
  {
    trigger: "click" | "doubleClick" | "hover" | "focus" | "blur" | "longPress"
           | "screenEnter" | "screenExit" | "screenVisible" | "screenHidden"
           | "scrollReachBottom" | "scrollReachTop" | "navigateBack"
           | "change" | "submit",
    description: "...本事件做什么的（必填，调试用）...",
    condition?: { when: "<前置条件表达式>" },
    actions: [ ...完整动作链... ]
  }
]
```

**红线**：
- R-EVENTS-01：节点声明交互意图但 events 缺对应 trigger
- R-EVENTS-02：event.actions 为空数组
- description 缺失 → AI / 调试器看不懂
- trigger 用非标准动词（"tap" / "submit-form"）

## §2. v2 actions 22 种动词（dot-namespace）

| 命名空间 | 动词 | 用途 |
|---------|------|------|
| state | state.set | 设置 view / data 路径值 |
| state | state.append | 数组追加 |
| state | state.remove | 数组按 predicate 删除 |
| state | state.merge | 对象浅合并 |
| state | state.toggle | boolean 取反 |
| effect | effect.fetch | 调用 dataSource 异步请求 |
| effect | effect.cancel | 取消进行中的 fetch |
| nav | nav.go | 跳转屏幕 |
| nav | nav.back | 返回 |
| node | node.setVisualState | 切换节点 visualState |
| ui | ui.showToast | 显示 toast |
| ui | ui.openUrl | 打开外部链接 |
| ui | ui.delay | 延时 |
| ui | ui.showOverlay / hideOverlay | 控制屏级 overlays |
| ui | ui.animate | 触发节点动画（shake / pulse 等）|
| ui | ui.startTimer | 启动倒计时（onTick / onComplete）|
| logic | logic.if | 条件分支 |
| logic | logic.switch | 多分支 |
| logic | logic.parallel | 并行执行 |
| custom | custom | 平台扩展（platform.checkNetwork / platform.reportError）|

完整速查见 `../common/references/v2-actions-cheatsheet.md`。

## §3. 核心模板：提交表单（最常见模式）

```jsonc
n9 (SubmitBtn).events = [{
  trigger: "click",
  description: "登录提交主流程",
  condition: { when: "{{view.canSubmit && !view.submitting && (view.lockedUntil ?? 0) < now()}}" },
  actions: [
    // 1. 进入提交态
    { type: "state.set", path: "view.submitting",   value: true },
    { type: "state.set", path: "view.errors.login", value: "" },

    // 2. 调 API
    { type: "effect.fetch", dataSourceId: "ds-login",
      params: {
        phone: "{{view.form.phone}}",
        credential: "{{view.form.credential}}",
        mode: "{{view.loginMode}}"
      },
      onSuccess: [
        // 3a. 写本地数据
        { type: "state.set", path: "data.user",    value: "{{response.user}}" },
        { type: "state.set", path: "data.session", value: { token: "{{response.token}}", expiresIn: "{{response.expiresIn}}" } },

        // 3b. 同步到全局态
        { type: "state.set", path: "globalView.session",
          value: {
            status:        "authenticated",
            token:         "{{response.token}}",
            user:          "{{response.user}}",
            expiresAt:     "{{now() + response.expiresIn * 1000}}",
            lastActivityAt:"{{now()}}"
          } },

        // 3c. 复位本地态
        { type: "state.set", path: "view.submitting",   value: false },
        { type: "state.set", path: "view.failureCount", value: 0 },

        // 3d. 跳转（含 deeplink 兜底）
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
        { type: "state.set", path: "view.submitting",   value: false },
        { type: "state.set", path: "view.failureCount", value: "{{state.view.failureCount + 1}}" },
        { type: "logic.if",
          when: "{{state.view.failureCount >= 5}}",
          then: [
            { type: "state.set", path: "view.lockedUntil", value: "{{now() + 30*60*1000}}" }
            // overlay-locked-sheet 通过 showWhen 自动显
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
}]
```

## §4. 受控输入框：set_bind（不是 event）

```
element/set_bind { projectId, nodeId, path: "view.form.phone" }
```

实现：value 自动取自 state.view.form.phone，change 自动 dispatch state.set。**比手写 event change → state.set 简洁且不易错**。

⚠️ 仅对 `<input>` / `<textarea>` / `<select>` 有效。其他类型用 events。

如需 onChange 之外的副作用（如校验）：

```jsonc
// PhoneInput 节点：bind 主管"值同步"，event 主管"副作用"
node.bind = { path: "view.form.phone" }                   // 值同步
node.events = [{
  trigger: "change",
  actions: [
    // ⚠️ 不要再 state.set view.form.phone（bind 已经做了）
    { type: "state.set", path: "view.errors.phone",
      value: "{{ validatePhone(event.value) ? '' : '手机号格式不正确' }}" },
    { type: "state.set", path: "view.canSubmit",
      value: "{{ validateForm(state.view.form) }}" }
  ]
}]
```

## §5. 列表绑定：repeat（v2.1 三层模型）

```jsonc
listNode.repeat = {
  expression: "{{state.data.feed}}",
  template: {
    id: "feedItemTpl",
    type: "div",
    name: "FeedItem",
    styles: {},                              // design 写
    props: { textContent: "{{item.title}} · {{item.author}}" },
    events: [{
      trigger: "click",
      actions: [
        { type: "nav.go", targetScreenId: "02-feed-detail",
          params: { id: "{{item.id}}" } }
      ]
    }],
    children: [],
    states: [], activeState: "default", locked: false, visible: true
  }
}
```

容器节点的 children 仍可保留"装饰"节点（如 list 顶部的标题）；template 渲染在容器内。

便利写法：只传 expression（已有 repeat）即可仅更新表达式。

## §6. 动态文案 props.textContent

```jsonc
n7 (CredentialInput).props = {
  placeholder: "{{state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}",
  type:        "{{state.view.loginMode === 'code' ? 'text' : (state.view.showPassword ? 'text' : 'password')}}"
}
```

⚠️ 含 `{{...}}` 表达式的 textContent / placeholder / props **是 interaction 阶段写**（forbidden-fields-interaction.md 已说明 product 不写）。

## §7. visibleWhen（用于衍生视图节点）

```jsonc
node.visibleWhen = "{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}"
```

每个衍生视图节点（loading / empty / error / business-state / auth）必须含 visibleWhen。详见 `derivative-views.md`。

```
element/set_visible_when { projectId, nodeId, visibleWhen: "<表达式>" }
```

传 null 清空。

## §8. screenEnter / screenExit 生命周期

```jsonc
// rootNode 上挂屏生命周期事件
screen.rootNode.events = [
  {
    trigger: "screenEnter",
    description: "进入登录页：复位表单，从缓存读上次手机号",
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

**红线**：
- 列表型屏没写 screenExit cancel → 切走后请求继续返回污染状态
- 首屏数据屏没在 screenEnter 重置必要 view 变量（用户从详情页 nav.back 回来后状态错乱）

## §9. effect.fetch 必有 onSuccess + onError（红线 R-EVENTS-03）

任何 effect.fetch 必须配套两个分支，**不允许只写 onSuccess**：

```jsonc
{ type: "effect.fetch", dataSourceId: "ds-xxx",
  onSuccess: [...],     // 必填
  onError:   [...]      // 必填（即使只是 ui.showToast）
}
```

## §10. MCP 操作清单

```
event/add        { projectId, nodeId, trigger, condition?, actions, description }
event/update_event { projectId, nodeId, eventIndex, patch }
event/remove_event { projectId, nodeId, eventIndex }
event/add_navigation { projectId, nodeId, targetScreenId } // 简化版（等价 click + nav.go 单 action）
element/set_bind { projectId, nodeId, path }
element/set_repeat { projectId, nodeId, repeat: { expression, template } }
element/set_visible_when { projectId, nodeId, visibleWhen }
component_prop/update_props { projectId, nodeId, props: { textContent, placeholder, ... } }
```

## 红线汇总

| 红线 | 触发 |
|------|-----|
| R-EVENTS-01 | 节点声明交互意图但 events 缺对应 trigger |
| R-EVENTS-02 | event.actions 为空数组 |
| R-EVENTS-03 | effect.fetch 缺 onSuccess 或 onError |
| R-BIND-01 | input/textarea/select 用 event.change → state.set 而不是 set_bind |
| R-EVENT-DESC-01 | event.description 缺失 |
| R-LIFECYCLE-01 | 列表型屏缺 screenExit cancel；首屏屏缺 screenEnter 重置 |
