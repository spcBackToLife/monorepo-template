> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-errors
> 对应 schema 字段：screen.meta.interaction.errorHandling

# Step I-errors: 00-login — 错误处理 6 类 + 表单校验 4 时机

> 详细方法见 `methodology/04-error-handling.md`。
> 上游依赖：operations.md（#3/#7 失焦校验、#8 GetCode 失败、#13 Submit 失败决策 D6）；statemachine.md（error/locked 两个状态）；product rules 错误码集合 {CREDENTIAL / LOCKED / LIMIT_EXCEEDED / NETWORK / 5xx}。

## 推理过程

### 0. 错误源穷举（决定 6 类适用性）

本屏会产生错误的来源：

| 来源 | 错误形态 | 错误类归属 |
|---|---|---|
| PhoneInput blur 校验 | 手机号格式不对 | 校验错（前端）|
| CredentialInput blur 校验（code 模式）| 6 位数字不符 | 校验错（前端）|
| CredentialInput blur 校验（password 模式）| 长度 / 含字母+数字 | 校验错（前端）|
| ds-send-code onError | LIMIT_EXCEEDED（同号 60s 内 / 当日>10 次）| 业务错 |
| ds-send-code onError | NETWORK_ERROR | 网络错 |
| ds-send-code onError | 5xx | 服务错 |
| ds-send-code onError | 兜不住 | 未知错 |
| ds-login onError | CREDENTIAL（账密错）| 业务错 |
| ds-login onError | LOCKED（后端判定锁定）| 业务错（锁定子类，转 locked 态） |
| ds-login onError | LIMIT_EXCEEDED（登录尝试限流）| 业务错 |
| ds-login onError | NETWORK_ERROR | 网络错 |
| ds-login onError | 5xx | 服务错 |
| ds-login onError | 兜不住 | 未知错 |
| 离线触发提交（前端拦） | network.status==='offline' | 网络错（前端阻断）|
| 协议未勾 | — | **不归错误处理**（守卫让按钮 disabled；不让用户提交也就没"错误"） |

✅ 错误源穷举完。下面 6 类逐项判断 UI 模式 + actions 链锚点。

### 1. 6 类错误逐项判断

#### 类 1：校验错误（validation）

- **场景**：PhoneInput / CredentialInput 失焦后格式不对
- **UI 模式**：行内红字（PhoneError / CredentialError 节点）+ 输入框红框（design 阶段 visualState）+ aria-live=polite
  - **不 focus**：决策见下 D-E1
- **触发链锚点**：
  - PhoneInput blur event → `logic.if !正则匹配 then state.set view.errors.phone='请输入正确的手机号' else state.set view.errors.phone=''`
  - CredentialInput blur event → 按 `view.loginMode` 分支两套校验文案
- **配套 view 变量**：`view.errors = { phone: '', credential: '' }` —— 在 I-M1-state-vars 任务建
- **配套节点**：PhoneError / CredentialError（已在 product 阶段建，`textContent` 由 interaction 写表达式 + visibleWhen）
- **schema 描述**：`"行内红字 + 输入框红框 + aria-live；不抢 focus；表达式驱动 PhoneError/CredentialError 节点的 textContent + visibleWhen"`

#### 类 2：业务错误（business）

- **场景**：ds-login 的 CREDENTIAL / LIMIT_EXCEEDED / LOCKED；ds-send-code 的 LIMIT_EXCEEDED
- **UI 模式**：分两种子模式
  - **CREDENTIAL（账密错）**：Toast(error) "账号或密码错误" + 累加 view.failureCount + shake FormCard + focus CredentialInput
    - 第 5 次特殊处理（决策 D6 from operations）：Toast 文字改 "尝试次数过多，账号已锁 30min" + 写 view.lockedUntil = now()+30*60*1000 → 自动进 locked 态
  - **LOCKED**（后端直接判锁）：state.set view.lockedUntil = $last.error.lockedUntil（信任后端时间戳）→ 进 locked 态
  - **LIMIT_EXCEEDED**（限流）：仅 Toast(error) "今日发送次数已达上限" / "今日登录尝试已达上限"，不累加 failureCount
- **触发链锚点**：onError 内 logic.switch by `$last.error.code`
- **配套节点**：无新节点；LockedView 子树由 I-M1-view-business 任务建；shake 是 ui.animate 不需节点
- **schema 描述**：`"Toast(error) + 按子类分支：CREDENTIAL→failureCount++ + shake + focus credential（≥5→写 lockedUntil 进 locked）；LOCKED→直接进 locked；LIMIT_EXCEEDED→仅 Toast 不累加 failureCount"`

#### 类 3：权限错误（permission）

- **场景**：登录页本身就是 anonymous 入口；本屏 dataSources 不会返回 401/403（业务上没意义）
- **决策**：标 "—"（schema-spec 红线允许 "—" 表示本屏不适用，但 key 必须显式存在）
- **schema 描述**：`"—（登录页即 anonymous 入口；ds-login/ds-send-code 接口设计上不会返回 401/403）"`

#### 类 4：网络错误（network）

- **场景**：
  - **前置阻断**：`globalView.network.status === 'offline'` 时 SubmitBtn / GetCodeBtn 守卫拒绝提交
  - **运行时触发**：fetch 中途断网（timeout / status=0）→ onError 拿到 NETWORK_ERROR
- **UI 模式**：
  - 前置阻断：用户点 SubmitBtn 时通过 condition.when 拒绝；同时显示一个**轻量行内提示**（不一定要 Toast）—— 决策 D-E2
  - 运行时触发：Toast(error) "网络异常，请检查后重试" + 不切 globalView.network.status（让全局 network 监听器去判，避免本屏自己改导致与 globalOverlays 冲突）
- **复用 globalOverlays**：项目级有 `global-offline-banner`（在 product 阶段挂的）—— 顶部全局横幅由全局 listener 维护；**本屏不再单独建 banner**
- **schema 描述**：`"运行时 NETWORK_ERROR → Toast(error) '网络异常'（不本地改 globalView.network.status，由全局监听器维护）；前置 globalView.network.status==='offline' → SubmitBtn/GetCodeBtn condition 守卫拒绝；离线全局横幅复用 globalOverlays.global-offline-banner"`

#### 类 5：服务错误（server）

- **场景**：5xx
- **UI 模式**：Toast(error) "服务繁忙，请稍后重试"
  - **不用整页 ErrorView**：决策 D-E3
- **配套**：custom platform.reportError 上报（同未知错合用一条 custom）
- **schema 描述**：`"5xx → Toast(error) '服务繁忙，请稍后重试' + custom platform.reportError 上报；不切整页 ErrorView（登录页关键路径短，给 retry 按钮即可，整页错误反而让用户找不到表单）"`

#### 类 6：未知错误（unknown）

- **场景**：error.code 不在已知集合内 / fetch 抛出非业务异常
- **UI 模式**：Toast(error) "出了点问题，请稍后重试" + custom platform.reportError 上报
- **schema 描述**：`"logic.switch default 分支 → Toast(error) '出了点问题，请稍后重试' + custom platform.reportError"`

### 2. 表单校验 4 时机分配

| 字段 | 时机 | 校验内容 | 触发链 |
|------|------|---------|---------|
| phone | **onBlur** | `/^1[3-9]\d{9}$/` 正则 | PhoneInput blur → state.set view.errors.phone |
| phone | onChange（隐式）| maxLength=11 截断（HTML 原生属性，不需 event）| props.maxLength=11 |
| credential（code 模式）| **onBlur** | 6 位数字 `/^\d{6}$/` | CredentialInput blur + view.loginMode==='code' |
| credential（password 模式）| **onBlur** | 6-20 位含字母+数字 `/^(?=.*[A-Za-z])(?=.*\d).{6,20}$/` | CredentialInput blur + view.loginMode==='password' |
| policy | **onSubmit** | 必勾（policy===true）| SubmitBtn condition.when |
| 整体表单 | **onSubmit** | 所有字段同时合法 + policy + !submitting + network online + !lockedUntil | SubmitBtn condition.when |
| —（不用 onChange）| — | 决策 D-E4 | — |
| —（不用 debounce）| — | 决策 D-E5 | — |

**决策**：本屏 4 时机选 **onBlur + onSubmit 两档**，**不用 onChange**（除 maxLength HTML 原生），**不用 debounce**。

### 3. 候选与否决（关键决策）

#### 决策 D-E1：校验错抢 focus 还是不抢？

- **候选 A**：blur 后立刻把 focus 抢回失败字段
  - 劣势：用户从 phone blur 想去 credential，被抢回 phone，体验崩
- **候选 B**：blur 不抢 focus，仅显示行内 error；只在**点击 SubmitBtn 失败时**抢 focus 到第一个错误字段
- **决策**：**B**——blur 阶段尊重用户当前 focus 意图；submit 阶段才抢 focus 到错误字段（在 onError CREDENTIAL 分支抢 credential 字段）

#### 决策 D-E2：离线状态下 SubmitBtn / GetCodeBtn 是 disabled 还是可点然后阻断？

- **候选 A**：disabled（用户看不见反馈，疑惑为啥按不动）
- **候选 B**：可点，点击时 condition 拒绝并 Toast "当前离线"
- **决策**：**B**——离线 banner（globalOverlays）已经在顶部告诉用户"网络断了"；按钮可点 + Toast 二次确认提供完整反馈链
- 但实际上这种情况下 condition.when 直接拒绝就够了，Toast 由全局 banner 接管告知

修订决策：**condition 拒绝即可，不再额外 Toast**——避免与全局 offline banner 重复噪音。

#### 决策 D-E3：5xx 用整页 ErrorView 还是 Toast？

- **候选 A**：整页 ErrorView（替代表单）
  - 劣势：登录页关键路径很短，一旦整页错误，用户连重试都找不到（要不要重新打开 App？）
- **候选 B**：Toast + 按钮恢复，让用户原地重试
- **决策**：**B**（Toast）——登录页是工具屏不是内容屏，Toast 已经够用
- I-M1-view-error 任务执行时这条会标 skipped + 引用本决策

#### 决策 D-E4：不用 onChange 校验格式？

- **候选 A**：onChange 实时校验（用户刚输 1 位手机号就报错）
  - 劣势：输入过程中红字闪烁，烦
- **候选 B**：onBlur 校验，输入过程不打扰
- **决策**：**B**——通用最佳实践（material-ui / antd 都是这套）

#### 决策 D-E5：手机号是否做唯一性查重 debounce？

- **候选 A**：登录前 debounce 查"该手机号是否已注册"
  - 劣势：登录场景用户已经知道自己注册过；查重多余且暴露用户存在性（安全反模式）
- **候选 B**：不查，直接交给 ds-login 后端判
- **决策**：**B**——后端 CREDENTIAL 错误码已经覆盖（不区分"不存在"和"密码错"是反枚举攻击的标准做法）

#### 决策 D-E6：CREDENTIAL 错误是否清空已输入的凭证？

- **候选 A**：清空让用户重新输（防黏贴幂等错误）
- **候选 B**：保留让用户改一两个字符
- **决策**：**A 部分采用** —— **仅清 password 模式的密码**（出于安全 + 用户通常想换一个密码）；**code 模式的验证码不清**（验证码本身就是一次性的，清不清都要重发）
- 实施细节落 events 任务的 CREDENTIAL 分支

### 4. onError actions 链翻译（核心，留给 events 任务做完整版；本表只锁定结构）

**ds-login.onError 骨架**：

```jsonc
onError: [
  { "type": "state.set", "path": "view.submitting", "value": false },
  { "type": "logic.switch",
    "value": "{{ $last.error.code }}",
    "cases": [
      { "when": "CREDENTIAL", "actions": [
        { "type": "state.set", "path": "view.failureCount", "value": "{{ state.view.failureCount + 1 }}" },
        { "type": "logic.if",
          "when": "{{ state.view.failureCount >= 5 }}",
          "then": [
            { "type": "ui.showToast", "toastType": "error", "message": "尝试次数过多，账号已锁定 30 分钟" },
            { "type": "state.set", "path": "view.lockedUntil", "value": "{{ Date.now() + 30*60*1000 }}" }
          ],
          "else": [
            { "type": "ui.showToast", "toastType": "error", "message": "账号或密码错误" }
          ]
        },
        { "type": "logic.if",
          "when": "{{ state.view.loginMode === 'password' }}",
          "then": [{ "type": "state.set", "path": "view.form.credential", "value": "" }]
        },
        { "type": "ui.animate", "nodeId": "<FormCard id>", "animation": "shake", "duration": 300 }
      ]},
      { "when": "LOCKED", "actions": [
        { "type": "state.set", "path": "view.lockedUntil", "value": "{{ $last.error.lockedUntil }}" }
      ]},
      { "when": "LIMIT_EXCEEDED", "actions": [
        { "type": "ui.showToast", "toastType": "error", "message": "今日登录尝试次数已达上限" }
      ]},
      { "when": "NETWORK_ERROR", "actions": [
        { "type": "ui.showToast", "toastType": "error", "message": "网络异常，请检查后重试" }
      ]},
      { "when": "SERVER_ERROR", "actions": [
        { "type": "ui.showToast", "toastType": "error", "message": "服务繁忙，请稍后重试" },
        { "type": "custom", "handler": "platform.reportError", "payload": { "scope": "ds-login", "error": "{{ $last.error }}" } }
      ]}
    ],
    "default": [
      { "type": "ui.showToast", "toastType": "error", "message": "出了点问题，请稍后重试" },
      { "type": "custom", "handler": "platform.reportError", "payload": { "scope": "ds-login", "error": "{{ $last.error }}" } }
    ]
  }
]
```

**ds-send-code.onError 骨架**：

```jsonc
onError: [
  { "type": "logic.switch",
    "value": "{{ $last.error.code }}",
    "cases": [
      { "when": "LIMIT_EXCEEDED", "actions": [
        { "type": "ui.showToast", "toastType": "error", "message": "今日发送次数已达上限" }
      ]},
      { "when": "NETWORK_ERROR", "actions": [
        { "type": "ui.showToast", "toastType": "error", "message": "网络异常，请检查后重试" }
      ]},
      { "when": "SERVER_ERROR", "actions": [
        { "type": "ui.showToast", "toastType": "error", "message": "服务繁忙，请稍后重试" },
        { "type": "custom", "handler": "platform.reportError", "payload": { "scope": "ds-send-code", "error": "{{ $last.error }}" } }
      ]}
    ],
    "default": [
      { "type": "ui.showToast", "toastType": "error", "message": "出了点问题，请稍后重试" },
      { "type": "custom", "handler": "platform.reportError", "payload": { "scope": "ds-send-code", "error": "{{ $last.error }}" } }
    ]
  }
]
```

> ⚠️ 这两个 onError 骨架不在本任务落 schema —— 它们是给 I-M1-events 任务的"预编译"，等 events 任务执行时直接搬过去 + 填具体 nodeId。本表只锁定**6 类对每条错误码的处理策略**。

### 5. 与 product rules 对账（错误处理视角）

| product rule（错误相关）| 本表覆盖位置 |
|---|---|
| 凭证错累加 failureCount，≥5 锁 30min | 类 2 - CREDENTIAL 子分支 + 决策 D6（操作侧）/ D-E1（focus 侧）|
| 协议必勾才能提交 | 不归错误处理（守卫前置 disabled）|
| 验证码同号 60s 冷却 | condition 守卫前置 + LIMIT_EXCEEDED 兜底（双保险）|
| 当日 ≤10 次（后端 LIMIT_EXCEEDED 兜底）| 类 2 - LIMIT_EXCEEDED |
| 离线状态阻断提交 | 类 4 - 前置 condition 守卫 + globalOverlays.global-offline-banner 复用 |

✅ 错误处理视角的 rules 全部覆盖。

### 6. 配套 view 变量清单（错误处理视角，留给 I-M1-state-vars）

- `view.errors.phone: ''`（行内错误文案，校验空字符串表示无错）
- `view.errors.credential: ''`
- `view.failureCount: 0`（业务错累加；登录成功 / locked 解锁时归 0）
- `view.lockedUntil: null`（账号锁定时间戳；ISO 数字毫秒）
- `view.lockedCountdown: 0`（locked 态显示用；由 lockedCountdown 定时器刷）

> 这些变量的完整 schema（label / defaultValue / enum / 路径）在 I-M1-state-vars 任务规范化落库；本表只对齐"错误处理需要哪些变量"。

---

## ★ 沉淀到 schema 的结论

本任务 1 个 MCP 调用（仅落 errorHandling 6 类摘要；详细 actions 链留 events 任务）：

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId:  "sc_27ee2293945046b69cc00",
  patch: {
    interaction: {
      errorHandling: {
        validation: "...（见下方 MCP 调用，含 6 类完整文案）..."
      }
    }
  }
}
```

详见下方 MCP 调用——文案与本表 §1 一一对应。
