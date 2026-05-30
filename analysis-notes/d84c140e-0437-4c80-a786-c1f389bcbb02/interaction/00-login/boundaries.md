> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-boundaries
> 对应 schema 字段：screen.meta.interaction.boundaries[]

# Step I-boundaries: 00-login — 边界 Case 7 类

> 详细方法见 `methodology/05-boundary-cases.md`。
> 上游依赖：operations.md（#13 boundary 列、#16 离屏清理）；errors.md（NETWORK/SERVER 兜底）；statemachine.md（locked 持续态恢复路径）。

## 推理过程

### 0. 边界源穷举（不止 7 类——本屏特有边界单列）

7 类是通用模板。本屏具体场景再扫一遍——用户在登录页可能踩到的"非常规路径"：

```
A. 表单类
   A1 用户狂点提交按钮（重复点击）
   A2 提交期间网络卡（请求超时）
   A3 用户提交一半切到后台 / 退到上一屏（任务终止）
   A4 用户切回来发现还在 submitting → 重入恢复
   A5 同时点了 SubmitBtn 和 GetCodeBtn（两个 fetch 并发）
   A6 网络断开提交（离线）
   A7 极端输入：粘贴 100 字、空格、emoji、SQL 注入、超长密码
   A8 移动端软键盘弹起遮挡 SubmitBtn（键盘遮挡）

B. 验证码类
   B1 60s 倒计时期间狂点 GetCodeBtn
   B2 用户发了验证码，切走，回来倒计时还剩多少？
   B3 短信迟迟不到（用户怎么继续）
   B4 用户在 code-countdown 期间切到 password 模式

C. 锁定类
   C1 lockedUntil 30min 内反复进出本屏（锁定要持续生效）
   C2 用户在 locked 态等了 29:59 时差几秒——精度问题
   C3 设备时间被用户调过（绕过锁定）
   C4 用户在 locked 中切到 password 模式 / 切到 code 模式

D. Session 边界
   D1 用户在已登录设备打开本屏（session.status='active' 直跳）
   D2 用户从其他屏被 redirect 到本屏（authRedirectTo 待消费）
   D3 token 过期但仍在 session.status='active'（需要后端拒绝时清 session）

E. 浏览器/平台边界
   E1 浏览器自动填充手机号 / 密码
   E2 iOS 短信验证码自动填充
   E3 PWA / 小程序环境差异
   E4 主题切换（暗黑模式下错误红字对比度——design 阶段处理）
```

对照 7 类模板归纳：

| 类（模板）| 本屏对应的具体场景 |
|-----|-----|
| 重复点击 / 防抖 | A1, B1 |
| 请求超时 | A2 |
| 离开页面 / 重入恢复 | A3, A4, B2, C1 |
| 并发冲突 | A5 |
| 离线 / 离线缓存 | A6 |
| 极端数据 | A7, E1, E2 |
| 键盘遮挡 | A8 |
| **额外（不在 7 类，但本屏必想）** | C2, C3, C4, B4, D1, D2, D3 |

### 1. 7 类边界 Case 逐项判断

#### 类 1：重复点击 / 防抖

- **触发场景**：用户狂点 SubmitBtn（A1）/ GetCodeBtn（B1）
- **兜底策略**：
  - **SubmitBtn**：`event.condition.when` 包含 `!view.submitting`；click 第一步 `state.set view.submitting=true`；onSuccess/onError 末尾 `state.set view.submitting=false`；800ms 防抖（在 event 配置 `debounce: 800` 或在 condition 加时间戳）
  - **GetCodeBtn**：`condition.when` 包含 `state.effects['ds-send-code'].status !== 'pending' && view.codeCountdown === 0`（双保险）
- **schema 描述**：`"重复点击: SubmitBtn condition.when '!view.submitting' + 进入 actions 立即 state.set submitting=true（onSuccess/onError 末尾置 false）+ 800ms 防抖；GetCodeBtn condition.when 'state.effects[ds-send-code].status!==pending && view.codeCountdown===0' 双保险拦截连点。"`

#### 类 2：请求超时

- **触发场景**：A2 弱网 / 服务卡
- **兜底策略**：
  - **ds-login**：endpoint.timeout=15000（15s）+ onError 分支 NETWORK_ERROR / TIMEOUT 走相同 Toast
  - **ds-send-code**：endpoint.timeout=10000（10s，发短信比登录快得多）
  - 超时不等于失败 = 锁定，不累加 failureCount（这是关键决策 D-B1）
- **决策 D-B1**：超时不计入 failureCount——避免弱网用户被误锁
- **schema 描述**：`"请求超时: ds-login endpoint.timeout=15000ms / ds-send-code endpoint.timeout=10000ms（超时由 effect.fetch 自动转 onError，code='NETWORK_ERROR'）；超时分支不累加 view.failureCount（决策 D-B1，避免弱网误锁）；Toast '网络异常，请检查后重试'。"`

#### 类 3：离开页面 / 任务终止 + 重入恢复

- **触发场景**：A3, A4, B2, C1
- **兜底策略**：
  - **screenExit**：`effect.cancel ds-login + ds-send-code` + `ui.stopTimer codeCD + lockedCountdown`（已在 operations#16）
  - **screenEnter**（重入恢复）：
    - 检查 `globalView.session.status === 'active'`：是 → nav.go 01-home（D1）
    - 检查 `view.lockedUntil > now()`：是 → 重启 lockedCountdown 定时器（C1）
    - 检查 `view.codeCountdown > 0`：是 → ⚠️ **重要决策 D-B2** —— 不重启 codeCD 定时器
  - **决策 D-B2**：codeCountdown 不持久化跨屏——离屏归 0（已在 operations#16）。理由：
    1. 简化心智模型，避免与服务端真实冷却时间不一致
    2. 用户回来再发就再发，60s 是同号冷却而不是用户体感冷却
    3. 实际上服务端 LIMIT_EXCEEDED 兜底已能拦住"立刻又发一条"
- **schema 描述**：`"离开页面: rootNode.screenExit → effect.cancel ds-login + effect.cancel ds-send-code + ui.stopTimer codeCD + ui.stopTimer lockedCountdown；重入恢复: rootNode.screenEnter → 顺序检查 session.status==='active'(直跳 01-home) / view.lockedUntil>now()(重启 lockedCountdown) / view.codeCountdown 不恢复（决策 D-B2: 60s 是服务端同号冷却，由 LIMIT_EXCEEDED 兜底）"`

#### 类 4：并发冲突

- **触发场景**：A5（理论上同一人很难同时点两个按钮，但快速切换 → 验证码请求中又点登录）
- **兜底策略**：
  - SubmitBtn / GetCodeBtn 各自 condition 守卫已经拦
  - 两个 fetch 用不同 dataSourceId，effect.fetch 不会互相污染
  - 真正风险：用户在 ds-send-code pending 时点 SubmitBtn —— 但 SubmitBtn condition 不依赖 ds-send-code 状态，所以不会拦；登录请求会照常发出，业务上正常（ds-login 不依赖最近发的验证码 → 由后端 ds-login 自己校验该验证码是否有效）
  - **决策 D-B3**：不在前端做"必须发过验证码才能登录"的守卫——code 模式下用户可能用以前发的码（一分钟内有效）
- **schema 描述**：`"并发冲突: 两个 fetch 用不同 dataSourceId，effect.fetch 互不干扰；condition 守卫保证同一按钮同时只有一个 pending；决策 D-B3 不在前端拦'未发码却登录'，由后端 ds-login 校验验证码有效性。"`

#### 类 5：离线 / 离线缓存

- **触发场景**：A6
- **兜底策略**：
  - **前置阻断**：SubmitBtn / GetCodeBtn condition 含 `globalView.network.status !== 'offline'`
  - **运行时拦截**：fetch 中途断网由 errors.md 类 4 处理
  - **全局横幅**：`globalOverlays.global-offline-banner` 已在 product 阶段挂；本屏不需要单独建
  - **离线缓存？** 决策 D-B4：登录页**不缓存待发**——用户离线发的登录请求即便缓存重发，token 已经可能过期；体感上用户离线也不期望 App 替它代发关键凭证
- **schema 描述**：`"离线: 前置 condition.when 含 globalView.network.status!=='offline' 拦提交（决策 D-E2: 不再 Toast，避免与全局横幅噪音重复）；运行时断网走 errors.network 类；离线全局横幅复用 globalOverlays.global-offline-banner；决策 D-B4 不做离线缓存待发——登录凭证类不应离线代发。"`

#### 类 6：极端数据 / 空 / 超长 / 异常字符

- **触发场景**：A7, E1, E2
- **兜底策略**：
  - **PhoneInput**：`maxLength=11`（HTML 原生）+ `type="tel"` 触发数字键盘 + 失焦正则校验拒非中国号段
  - **CredentialInput（code 模式）**：建议改为 `maxLength=6 + inputmode="numeric"` —— ⚠️ **修正点**：当前 product 阶段挂的是 `type="text"`，这里需要 events 任务**按 view.loginMode 动态切 props.maxLength**（变体见决策 D-B5）
  - **CredentialInput（password 模式）**：`maxLength=20`，type 由 view.passwordVisible 动态切 password/text
  - **协议链接的 PolicyText 跳外链**：用 `ui.openUrl openInNewTab=true`，避免污染当前 history
  - **iOS 自动填充**（E1, E2）：HTML autocomplete 属性："tel" / "one-time-code" / "current-password" —— 由 events 任务在 props 里设置（决策 D-B6）
  - **emoji / SQL 注入**：`maxLength` + 后端校验兜底；前端不做特殊 escape（输入框 value 自身不渲染为 HTML）
  - **决策 D-B5**：CredentialInput maxLength 用动态 props 表达式：`{{ state.view.loginMode === 'code' ? 6 : 20 }}` —— 比单独建两个节点更轻
  - **决策 D-B6**：autocomplete 属性必须设，给浏览器和密码管理器良好提示
    - PhoneInput: `autocomplete="tel"`
    - CredentialInput（code）: `autocomplete="one-time-code"` + `inputmode="numeric"`
    - CredentialInput（password）: `autocomplete="current-password"`
- **schema 描述**：`"极端数据: PhoneInput maxLength=11 + type='tel' + autocomplete='tel'；CredentialInput maxLength 动态={{loginMode==='code'?6:20}}（决策 D-B5）；code 模式 inputmode='numeric' + autocomplete='one-time-code' 启用 iOS 短信预填（E2）；password 模式 autocomplete='current-password' 启用密码管理器（决策 D-B6）；emoji/SQL 不做前端 escape，由 maxLength + 后端校验兜底；协议链接 ui.openUrl openInNewTab=true 不污染 history。"`

#### 类 7：键盘遮挡 / 软键盘适配

- **触发场景**：A8（移动端 focus 输入框时键盘弹起遮挡 SubmitBtn）
- **兜底策略**：
  - 表单卡片整体 padding-bottom 留余量（design 阶段 CSS）
  - SubmitBtn 不强制 sticky-bottom（登录页表单不长，正常布局即可），但 design 阶段在 envelope 里要测试
  - input focus 时若按钮不可见，浏览器会自动 scrollIntoView（默认行为）
- **决策 D-B7**：本屏不强制 sticky-bottom——表单短，浏览器默认 scroll 行为已足够。design 阶段验收。
- **schema 描述**：`"键盘遮挡: 表单短不强制 sticky-bottom（决策 D-B7）；依赖浏览器 focus 时默认 scrollIntoView 行为；FormCard padding-bottom 留余量（design 阶段 CSS 实施）；envelope 测试要覆盖 iOS Safari 和 Android Chrome 两种弹键盘场景。"`

### 2. 本屏特有边界（不在 7 类模板，但必须写）

#### 边界 #X1：账号锁定时间精度（C2）

- **场景**：用户在 locked 态守了倒计时；时间走到剩 0 秒，UI 必须立刻解锁
- **策略**：
  - lockedCountdown 定时器 onComplete → `state.set view.lockedUntil=null + view.failureCount=0`
  - 但 onComplete 可能比真实时间晚一帧（最多 1s）—— 不影响功能，UI 一秒内会自动刷新
- **schema 描述**：`"锁定精度: lockedCountdown ui.startTimer interval=1000 onTick state.set view.lockedCountdown-=1，onComplete state.set view.lockedUntil=null + failureCount=0 自动解锁；最多 1s 视觉滞后可接受。"`

#### 边界 #X2：设备时间被改（C3）

- **场景**：用户改本地时间绕过锁定（now() 跳到 lockedUntil 之后）
- **策略**：本屏前端只负责 UI 表现；**真锁定信任后端**
  - 用户改本地时间确实能解开 UI 锁，但提交时后端会再判一次 `lockedUntil`，返回 `LOCKED` → errors.md 类 2 LOCKED 子分支重新写 lockedUntil
  - **决策 D-B8**：不做"防改时间"的复杂逻辑（如服务端时间同步），信任后端二次校验
- **schema 描述**：`"设备时间篡改: 不做前端防改（决策 D-B8）；后端 ds-login 二次判 LOCKED 兜底，errors.business LOCKED 分支重新写 view.lockedUntil。"`

#### 边界 #X3：locked 中切登录模式（C4）

- **场景**：用户被锁后试图切到 code 模式想绕开（密码错锁，验证码登录是否也禁？）
- **策略**：locked 是账号级锁定（不是模式级）—— 切模式后 SubmitBtn 守卫 `!view.lockedUntil || view.lockedUntil < now()` 仍然拦截；可以切模式但不能提交
- **决策 D-B9**：允许在 locked 期间切 mode（输入光标可移动）—— 不强阻断 UI，让用户清楚"换模式也没用"。或者强阻断 ModeToggle —— 取后者更直接？
- 重新权衡：强阻断 ModeToggle 让用户少踩坑，决策改为：**locked 期间整个表单 disabled（含 ModeToggle / GetCodeBtn / 输入框 / SubmitBtn），仅 LockedView 子树可见**——这与 statemachine.md → locked Effects 段一致
- **决策 D-B9 修正**：locked 整表单 disabled，ModeToggle 也不让点。LockedView 子树独占视图（visibleWhen 切换）
- **schema 描述**：`"locked 中切模式: 决策 D-B9 - locked 期间整表单 disabled（含 ModeToggle/GetCodeBtn/Input/Submit），仅 LockedView 子树可见（与 statemachine.md → locked Effects 一致）；I-M1-view-business 任务建 NormalFormView/LockedView 双子树 visibleWhen 互斥。"`

#### 边界 #X4：authRedirectTo 跨屏消费（D2）

- **场景**：用户从需要鉴权的屏被重定向到登录；登录后应返回原屏
- **策略**：
  - 来源屏在 nav.go 00-login 之前 `state.set globalView.nav.authRedirectTo='<sourceScreenId>'`（**这是来源屏的责任，不是本屏**）
  - 本屏 onSuccess 末尾：`logic.if globalView.nav.authRedirectTo then nav.go {{globalView.nav.authRedirectTo}} + state.set globalView.nav.authRedirectTo='' else nav.go 01-home`（消费 + 清空）
- **决策 D-B10**：消费完 authRedirectTo 必须清空，避免下次登录又跳错地方
- **schema 描述**：`"authRedirectTo 消费: SubmitBtn ds-login.onSuccess 末尾 logic.if globalView.nav.authRedirectTo then nav.go {{authRedirectTo}}+清空 else nav.go 01-home（决策 D-B10：消费即清空避免污染下次登录）；来源屏写入 authRedirectTo 是来源屏的责任，本屏只负责消费。"`

#### 边界 #X5：本屏期间 token 已存在但过期（D3）

- **场景**：本屏 screenEnter 时 session.status='active' 但 token 实际已过期
- **策略**：
  - 本屏不做 token 有效性主动校验（无 ping 接口；过早校验徒增成本）
  - 由用户在主屏触发 401 时由 global-session-expired Modal 接管
  - 本屏的 screenEnter 只看 status 字段，相信全局 listener 维护
- **schema 描述**：`"token 过期但 status='active': 本屏不做主动校验（避免无谓 ping）；由全局 401 拦截器写 globalView.session.status='expired' 触发 global-session-expired Modal；本屏 screenEnter 只信 status 字段。"`

### 3. 候选与否决汇总（决策表）

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-B1 | 超时是否计入 failureCount | 否（避免弱网误锁） |
| D-B2 | codeCountdown 是否跨屏持久化 | 否（离屏归 0，由 LIMIT_EXCEEDED 兜底） |
| D-B3 | 前端是否拦"未发码即登录" | 否（由后端校验码有效性） |
| D-B4 | 是否做离线缓存待发 | 否（凭证类不离线代发） |
| D-B5 | CredentialInput maxLength 双值 | 用动态 props 表达式（不建两节点） |
| D-B6 | 输入框 autocomplete 属性 | 必须设（tel/one-time-code/current-password） |
| D-B7 | SubmitBtn 是否 sticky-bottom | 否（表单短，依赖默认 scrollIntoView） |
| D-B8 | 是否防改设备时间 | 否（后端二次判 LOCKED 兜底） |
| D-B9 | locked 期间是否允许切 mode | 否（整表单 disabled，仅 LockedView 可见） |
| D-B10 | authRedirectTo 消费后是否清空 | 是（避免污染下次登录） |

### 4. 与 product rules 对账（边界视角）

| product rule（边界相关）| 本表覆盖位置 |
|---|---|
| 提交 800ms 防抖 + view.submitting 守卫 | 类 1 |
| screenExit 触发 effect.cancel ds-login + ui.stopTimer codeCD | 类 3 |
| PhoneInput maxLength=11 自动截断 | 类 6 |
| 验证码同号 60s 冷却 + 当日 ≤10 次 | 类 1 + 类 4（双保险）|
| 离线状态阻断提交 | 类 5 |
| 失败状态机 ≥5 锁 30min（lockedUntil） | 边界 #X1 #X2 #X3 |
| 登录成功消费 authRedirectTo 跳回 | 边界 #X4 |

✅ 边界视角的 rules 全部覆盖。

---

## ★ 沉淀到 schema 的结论

本任务 1 个 MCP 调用——boundaries 字符串数组（每条含场景 + 策略两段）：

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId:  "sc_27ee2293945046b69cc00",
  patch: {
    interaction: {
      boundaries: [ /* 12 条字符串，含 7 类标准 + 5 条本屏特有，见下方 MCP 调用 */ ]
    }
  }
}
```
