# v2 Actions Cheatsheet

> Schema-First 架构下 events.actions 写入参考。interaction-designer 必须**对照本表把用户每条操作描述映射成结构化 action 链**；不许靠记忆/猜。
>
> 22 种动词来自 `features/design-schema/src/types/action.ts`。本文档与该源码保持同步。

---

## 1. 22 种 Action 动词速查

### state.* —— 业务/UI 状态变更（5 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `state.set` | 把 path 替换为 value | `path`, `value` | `{ type: 'state.set', path: 'view.loginMode', value: 'password' }` |
| `state.append` | path 数组追加 value | `path`, `value` | `{ type: 'state.append', path: 'data.messages', value: '{{ view.draft }}' }` |
| `state.remove` | path 数组按 index/predicate 删 | `path` + `index` 或 `predicate` | `{ type: 'state.remove', path: 'data.todos', predicate: '{{ item.id === parent.targetId }}' }` |
| `state.merge` | path 对象浅合并 value | `path`, `value` | `{ type: 'state.merge', path: 'data.form', value: { name: '{{ view.draft }}' } }` |
| `state.toggle` | path 布尔取反 | `path` | `{ type: 'state.toggle', path: 'view.passwordVisible' }` |

### effect.* —— 数据副作用（2 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `effect.fetch` | 触发 data source 加载 | `dataSourceId` | `{ type: 'effect.fetch', dataSourceId: 'loginApi', params: { phone: '{{ view.phone }}' }, onSuccess: [...], onError: [...] }` |
| `effect.cancel` | 取消 pending fetch | — | `{ type: 'effect.cancel', dataSourceId: 'loginApi' }` |

### nav.* —— 导航（2 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `nav.go` | 跳转屏幕 | `targetScreenId` | `{ type: 'nav.go', targetScreenId: '01-home', animation: { type: 'fade' } }` |
| `nav.back` | 返回 | — | `{ type: 'nav.back' }` |

### node.* —— 节点视觉态（1 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `node.setVisualState` | 切节点 visualState | `state` | `{ type: 'node.setVisualState', nodeId: 'nd_xxx', state: 'success', autoRevertMs: 1500 }` |

### ui.* —— UI 副作用（8 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `ui.showToast` | 提示 | `toastType`, `message` | `{ type: 'ui.showToast', toastType: 'success', message: '已发送' }` |
| `ui.openUrl` | 打开 URL | `url` | `{ type: 'ui.openUrl', url: 'https://...', openInNewTab: true }` |
| `ui.delay` | 延时 | `duration` | `{ type: 'ui.delay', duration: 500 }` |
| `ui.startTimer` | 启动计时器（含循环） | `timerId`, `duration` | `{ type: 'ui.startTimer', timerId: 'codeCD', duration: 60000, interval: 1000, onTick: [...], onComplete: [...] }` |
| `ui.stopTimer` | 停止计时器 | `timerId` | `{ type: 'ui.stopTimer', timerId: 'codeCD' }` |
| `ui.resetTimer` | 重置计时器 | `timerId` | `{ type: 'ui.resetTimer', timerId: 'codeCD' }` |
| `ui.animate` | 触发节点 CSS 动画 | `animation` | `{ type: 'ui.animate', nodeId: 'nd_xx', animation: 'shake', duration: 300, onComplete: [...] }` |
| `ui.showOverlay` | 显示 modal/sheet | `overlayId` | `{ type: 'ui.showOverlay', overlayId: 'forgotPasswordModal' }` |
| `ui.hideOverlay` | 隐藏 modal/sheet | — | `{ type: 'ui.hideOverlay', overlayId: 'forgotPasswordModal' }` |

### logic.* —— 控制流（2 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `logic.if` | 条件分支 | `when`, `then` | `{ type: 'logic.if', when: '{{ view.phone.length === 11 }}', then: [...], else: [...] }` |
| `logic.switch` | 多分支 | `value`, `cases` | `{ type: 'logic.switch', value: '{{ $last.error.code }}', cases: [{ match: 'LOCKED', actions: [...] }], default: [...] }` |

### custom —— 业务扩展（1 种）

| 动词 | 用途 | 必填参数 | 示例 |
|------|------|---------|------|
| `custom` | 宿主侧注册的 handler | `handler` | `{ type: 'custom', handler: 'hapticFeedback', payload: { strength: 'medium' } }` |

---

## 2. 常见用户操作描述 → action 链 模板

### 2.1 双状态切换（tab/开关/眼睛切换）

**描述句式**："click→切换 A/B 模式"、"点击眼睛切换密码显隐"

```
event/add {
  nodeId, trigger: 'click',
  actions: [{ type: 'state.toggle', path: 'view.passwordVisible' }],
  description: '切换密码显隐'
}
```

或三态以上：

```
actions: [{
  type: 'state.set',
  path: 'view.loginMode',
  value: "{{ state.view.loginMode === 'code' ? 'password' : 'code' }}"
}]
```

### 2.2 受控输入框（手机号/密码/搜索）

**描述句式**："输入手机号"、"输入搜索关键字"

⚠️ **不是 event，是 bind**：

```
element/set_bind {
  nodeId, path: 'view.phone'
}
```

但**配套的格式校验/错误提示**仍走 event：

```
event/add {
  nodeId, trigger: 'blur',
  actions: [{
    type: 'logic.if',
    when: "{{ !/^1[3-9]\\d{9}$/.test(state.view.phone) }}",
    then: [{ type: 'state.set', path: 'view.phoneError', value: '请输入正确的手机号' }],
    else: [{ type: 'state.set', path: 'view.phoneError', value: '' }]
  }],
  description: '失焦校验手机号格式'
}
```

### 2.3 提交表单（登录/注册/发送）

**描述句式**："click→提交登录请求"

```
event/add {
  nodeId, trigger: 'click',
  condition: { when: "{{ state.view.formValid && state.effects.loginApi.status !== 'pending' }}" },
  actions: [
    { type: 'state.set', path: 'view.submitState', value: 'submitting' },
    { type: 'effect.fetch',
      dataSourceId: 'loginApi',
      params: { phone: '{{ view.phone }}', password: '{{ view.password }}' },
      onSuccess: [
        { type: 'state.set', path: 'view.submitState', value: 'success' },
        { type: 'node.setVisualState', state: 'success' },
        { type: 'ui.delay', duration: 500 },
        { type: 'nav.go', targetScreenId: '01-home-map' }
      ],
      onError: [
        { type: 'state.set', path: 'view.submitState', value: 'error' },
        { type: 'logic.switch',
          value: '{{ $last.error.code }}',
          cases: [
            { match: 'CREDENTIAL', actions: [{ type: 'ui.showToast', toastType: 'error', message: '账号或密码错误' }] },
            { match: 'LOCKED', actions: [{ type: 'ui.showOverlay', overlayId: 'lockedModal' }] }
          ],
          default: [{ type: 'ui.showToast', toastType: 'error', message: '登录失败' }]
        }
      ]
    }
  ],
  description: '提交登录'
}
```

### 2.4 倒计时按钮（验证码 60s）

**描述句式**："点击获取验证码 + 60s 倒计时"

```
event/add {
  nodeId, trigger: 'click',
  condition: { when: "{{ /^1[3-9]\\d{9}$/.test(state.view.phone) && state.view.codeCountdown === 0 }}" },
  actions: [
    { type: 'effect.fetch', dataSourceId: 'sendCodeApi',
      params: { phone: '{{ view.phone }}' },
      onSuccess: [
        { type: 'ui.showToast', toastType: 'success', message: '已发送' },
        { type: 'state.set', path: 'view.codeCountdown', value: 60 },
        { type: 'ui.startTimer',
          timerId: 'codeCD',
          duration: 60000,
          interval: 1000,
          onTick: [{ type: 'state.set', path: 'view.codeCountdown', value: '{{ state.view.codeCountdown - 1 }}' }],
          onComplete: [{ type: 'state.set', path: 'view.codeCountdown', value: 0 }]
        }
      ],
      onError: [{ type: 'ui.showToast', toastType: 'error', message: '发送失败' }]
    }
  ],
  description: '获取验证码 + 60s 倒计时'
}
```

### 2.5 跳页导航（注册/忘记密码/返回）

**描述句式**："click→跳注册"

```
event/add {
  nodeId, trigger: 'click',
  actions: [{ type: 'nav.go', targetScreenId: '00-register' }],
  description: '跳注册页'
}
```

或返回：`actions: [{ type: 'nav.back' }]`

### 2.6 打开 / 关闭 Modal

**描述句式**："点击'忘记密码'弹出找回弹窗"

⚠️ **当前阶段使用 visibleWhen 方案**（`screen.addOverlay` op 尚未实装）：

```
event/add {
  nodeId, trigger: 'click',
  actions: [{ type: 'state.set', path: 'view.forgotModalOpen', value: true }],
  description: '打开找回密码弹窗'
}
```

弹窗节点本身：`element/set_visible_when { nodeId, visibleWhen: "{{ state.view.forgotModalOpen }}" }`
关闭按钮：`{ type: 'state.set', path: 'view.forgotModalOpen', value: false }`

> 待 `ui.showOverlay/hideOverlay` 配套的 `screen.addOverlay` op 实装后，会改用该方案——届时本表会同步更新。

### 2.7 列表追加/删除（评论、收藏）

**追加**（用户提交一条评论）：

```
actions: [
  { type: 'state.append', path: 'data.comments', value: {
      id: '{{ $.format("c-{}", Date.now()) }}',
      author: '{{ state.data.currentUser.name }}',
      text: '{{ view.commentDraft }}',
      createdAt: '{{ Date.now() }}'
  } },
  { type: 'state.set', path: 'view.commentDraft', value: '' }
]
```

**删除**（用户点击删除按钮 — repeat 模板内）：

```
actions: [{
  type: 'state.remove',
  path: 'data.comments',
  predicate: '{{ item.id === parent.targetId }}'
}]
```

### 2.8 拉取数据（屏幕首屏 / 下拉刷新）

**screenEnter** 时拉取：

```
event/add {
  nodeId: <screen rootNode id>, trigger: 'screenEnter',
  actions: [{ type: 'effect.fetch', dataSourceId: 'feedApi', onSuccess: [], onError: [] }],
  description: '首屏拉 feed'
}
```

下拉刷新：`event/add` 触发节点的 `trigger: 'click'` 或自定义动作。

### 2.9 触觉反馈（custom）

**描述句式**："点击有触觉反馈"

```
actions: [{ type: 'custom', handler: 'hapticFeedback', payload: { strength: 'light' } }]
```

custom 用于宿主侧需要注册具体实现的能力（震动、原生分享、扫码等）。

### 2.10 滚动到底加载更多

```
event/add {
  nodeId: <list container id>, trigger: 'scrollReachBottom',
  scrollConfig: { threshold: 100, debounce: 300 },
  condition: { when: "{{ state.effects.feedApi.status !== 'pending' && state.view.hasMore }}" },
  actions: [{ type: 'effect.fetch', dataSourceId: 'feedApi', params: { cursor: '{{ state.view.cursor }}' },
              onSuccess: [/* append + 更新 cursor */] }]
}
```

---

## 3. 写 events 前必查清单

每次 `event/add` 前回答：

- [ ] **trigger 是什么？**（click / change / submit / screenEnter / scrollReachBottom / longPress / hover / focus / blur）
- [ ] **是否有前置条件？**（formValid / 防抖 / 业务态判断 → 用 `condition.when` 表达式，而不是塞到 actions 里）
- [ ] **actions 链是单步还是多步？**（多步串行 / 分支 / 副作用 / 错误处理是否考虑齐全）
- [ ] **是否涉及 state.view 变量？**（先 `state/view_add` 注册，否则表达式求值得 undefined）
- [ ] **是否涉及 dataSource？**（先 `data_source/add`，否则 effect.fetch dataSourceId 找不到）
- [ ] **是否涉及 overlay？**（先 `screen/add_overlay`，否则 ui.showOverlay overlayId 找不到）
- [ ] **错误处理写了吗？**（effect.fetch 没写 onError → 用户看不到失败反馈）
- [ ] **description 写了吗？**（必填，给后续 schema→md 派生用）

---

## 4. 表达式（Expression）约定

- 形态：`{{ ... }}` 包裹的字符串，运行时由 evaluateExpression 解析
- 作用域：`state.data.*` / `state.view.*` / `state.effects.*` / `item` / `index` / `parent` / `$last`（上步副作用结果） / `$.*`（内置函数）
- 内置函数白名单（`BuiltinFunctions`）：`length / upper / lower / format / includes / first / last`

⚠️ 裸字符串（不带 `{{ }}`）= 字面量，不是表达式。`{{ state.view.x }}` 与 `"state.view.x"` 含义完全不同。

---

## 5. 反模式（禁止）

| 反模式 | 为什么禁止 | 正确做法 |
|--------|----------|---------|
| 在 styles 写条件表达式做高亮，**不写 click event** | 条件样式是被动响应，state 永远不会变 | 必须同时写 `state.set` event |
| effect.fetch 不写 onError | 用户看不到失败 | 至少加 `ui.showToast` 兜底 |
| 把 condition 塞到 actions 第一个 `logic.if` 里 | `condition.when` 是 event 一等字段，专门给前置条件用 | 真前置用 condition，actions 内分支才用 logic.if |
| 输入框用 `event: change → state.set` | 受控双向绑定有专用 `bind` 字段 | `element/set_bind { nodeId, path: 'view.xxx' }` |
| effect.fetch 嵌套 effect.fetch | 副作用嵌套会绕过运行时排程 | onSuccess 链可串多个 fetch，但不要 fetch 内嵌 fetch |

---

## 6. 与 design-schema 类型保持同步

本文档与 `features/design-schema/src/types/action.ts` 一一对应。若 action 类型有变更，必须同步更新本文档。Action 联合定义见 `Action` 类型。
