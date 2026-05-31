> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-patch-expression-v1-refresh
> 对应 schema 字段：5 个节点的 events[*]
>   - PhoneInput(nd_083c744e1699418e9d01e).events[0] (blur)
>   - CredentialInput(nd_989c02eb1f224e0c9f973).events[0] (blur)
>   - GetCodeBtn(nd_e6783f85edb3499c9f131).events[0] (click)
>   - SubmitBtn(nd_5a15fd87f060436295b4f).events[0] (click)
>   - Root(nd_6a7f2492b59b4e7eab7e1).events[0] (screenEnter)
> 触发原因：用户反馈"手机号验证 + 提交交互有问题，完善了规则表达式 expression，重新试试"
> Expression Language 版本：v1.0.0（spec hash: 4a4cf13d）

# Patch I-M1-patch-expression-v1-refresh — Phone 校验 + Submit 提交按 Expression v1.0 全面重写

---

## ☐ 翻译清单 todo（v2.5 §0.1.10 强制头部段）★

> 来源：用户口头反馈（"手机号验证 + 提交交互有问题"）+ Expression Language v1.0 cheatsheet 的 §7 Migrations 明文推荐 + 实战漏译复盘（用户输入带空格）。
>
> 这是 SKILL 阶段后期专家级判断；上游 md（events.md / errors.md / state-vars.md）的"翻译契约"段不会显式列出 expression 重构，因为这是 platform 层 expression 升级倒逼的"形式重写"+ "实战漏译修复"，不是新增产品规则。

来源汇总：
- **events.md §1 表达式片段命名表**：`IS_PHONE_VALID` / `IS_CREDENTIAL_VALID_BY_MODE` / `IS_LOCKED` / `IS_OFFLINE` 全部用 `/regex/.test()` 方法式 + `Date.now()` 直接调用 → 形式可平迁
- **errors.md D-E4 + I-M1-patch-submit-prevalidate D-E4(3)**：onSubmit 档校验已在 SubmitBtn.click actions 内重跑——本任务保持该决策不变，仅把 expression 形式升级
- **boundaries.md D-B5（动态 props 单节点 vs 双节点）+ D-B7（键盘遮挡设计阶段处理）**：不动业务面
- **实战漏译（v2.5 §0.1.10 类似事前漏译复盘点）**：iOS 输入法自动空格 / 用户复制粘贴携带前后空格——product 阶段 rules 第 1 条只写"11 位 1[3-9] 规则"，没明示 trim 预处理；events.md / errors.md 也漏译了 trim 步骤 → **本任务作为漏译修复一并补译**

逐条 todo：

- [ ] **D-EXR1** PhoneInput.blur 重写：
  - [ ] (a) Step-1 trim 预处理 `state.set view.form.phone = $.defaultTo(x, '').trim()`
  - [ ] (b) Step-2 校验单 state.set + 三元（折叠 logic.if）：`$.isEmpty(x) ? '' : ($.matches(x, /^1[3-9]\d{9}$/) ? '' : '请输入正确的手机号')`
  - [ ] (c) 期望指纹：`nodeHasEvent { nodeId: 'nd_083c744e1699418e9d01e', trigger: 'blur' }`

- [ ] **D-EXR2** CredentialInput.blur 重写：
  - [ ] (a) Step-1 trim 预处理 `state.set view.form.credential = $.defaultTo(x, '').trim()`
  - [ ] (b) Step-2 校验单 state.set + 嵌套三元（按 loginMode 分支两套规则；空跳过校验）：`$.isEmpty(x) ? '' : (loginMode==='code' ? ($.matches(x, /^\d{6}$/) ? '' : '请输入 6 位数字验证码') : ($.matches(x, /^(?=.*[A-Za-z])(?=.*\d).{6,20}$/) ? '' : '密码需 6-20 位且包含字母和数字'))`
  - [ ] (c) 期望指纹：`nodeHasEvent { nodeId: 'nd_989c02eb1f224e0c9f973', trigger: 'blur' }`

- [ ] **D-EXR3** GetCodeBtn.click condition 表达式迁移：
  - [ ] (a) `Date.now()` → `$.now()`
  - [ ] (b) `/regex/.test()` → `$.matches(x, /regex/)`
  - [ ] (c) actions 内 onSuccess/onError 业务逻辑 100% 保留
  - [ ] (d) 期望指纹：`nodeHasEvent { nodeId: 'nd_e6783f85edb3499c9f131', trigger: 'click' }`

- [ ] **D-EXR4** SubmitBtn.click 重写：
  - [ ] (a) condition：`Date.now()` → `$.now()`；3 守卫语义不变（!submitting / !offline / !locked）
  - [ ] (b) actions Step-1：phone trim 预处理（写回 view.form.phone）
  - [ ] (c) actions Step-2：phone 校验（用 $.matches + $.isEmpty）
  - [ ] (d) actions Step-3：credential trim 预处理
  - [ ] (e) actions Step-4：credential 校验（按 loginMode 分支）
  - [ ] (f) actions Step-5：原 logic.if then=反馈+focus / else=fetch 主流程，仅替换内部 expression（Date.now → $.now、`!!x` 用法保留——cheatsheet 没明示否决）
  - [ ] (g) onSuccess 内 `Date.now()` 全部替换 `$.now()`（globalView.session.expiresAt + lastActivityAt）
  - [ ] (h) onError CREDENTIAL 内 `Date.now() + 30*60*1000` 替换 `$.now() + 30*60*1000`
  - [ ] (i) 期望指纹：`nodeHasEvent { nodeId: 'nd_5a15fd87f060436295b4f', trigger: 'click' }`

- [ ] **D-EXR5** Root.screenEnter 内 lockedCountdown 重启逻辑：
  - [ ] (a) `Date.now()` → `$.now()`（3 处：when / Math.max-floor / duration）
  - [ ] (b) Math.max / Math.floor 不变（spec §3.2 已是 globals 白名单）
  - [ ] (c) 期望指纹：`nodeHasEvent { nodeId: 'nd_6a7f2492b59b4e7eab7e1', trigger: 'screenEnter' }`

→ 全部 [x] 才能写"沉淀"段。

---

## 推理过程

### 1. 现状盘点（基于 query/screen_schema 真实落库）

| 节点 | 事件 | 表达式现状 | 形式问题 |
|---|---|---|---|
| PhoneInput | blur | `state.view.form.phone && state.view.form.phone.length > 0` + `/^1[3-9]\d{9}$/.test(...)` | 啰嗦判空 + regex 方法式 + 无 trim |
| CredentialInput | blur | 同上 + 内层 `/^\d{6}$/.test()` 等 | 同上 |
| GetCodeBtn | click condition | `Date.now()` + `/^1[3-9]\d{9}$/.test()` | 直接 `Date.now()` + regex 方法式 |
| SubmitBtn | click condition + actions + onSuccess + onError | 多处 `Date.now()` + 多处 `/regex/.test()` + 啰嗦判空 | 全套需要 |
| Root | screenEnter | 多处 `Date.now()` | 同上 |

### 2. 改造选型对比

#### 2.1 `Date.now()` vs `$.now()`

| 候选 | 内容 | 决定 |
|---|---|---|
| ❌ A | 维持 `Date.now()` | 否决：spec.json §7 Migrations 明文 `Date.now() → $.now()`；保持是技术债，不符合"用 v1.0 完善 expression"要求 |
| ✅ B | 全部换 `$.now()` | 选定。spec §4 builtins 主推 `$.now()`；语义等价（都返回 ms 时间戳）；platform 工程师在 v1.0 设计时把 `$.*` namespace 做成第一公民，是平台演进方向 |

#### 2.2 `/regex/.test(x)` vs `$.matches(x, /regex/)`

| 候选 | 内容 | 决定 |
|---|---|---|
| A | 维持 `/regex/.test(x)` | 半决：spec v1.0 已合法（§5 regex 实例方法）；现有 schema 落库已是这种形式；可不动 |
| ✅ B | 改 `$.matches(x, /regex/)` | 选定。理由：① spec §4 把 `$.matches` 列为 builtin 主推 + 给了完整签名 + 跨语言更易移植；② cheatsheet §3 提到"$ 命名空间所有函数都是纯函数+容错"，对 null/undefined 不抛错（regex.test(null) 行为依赖底层 JS 实现）；③ 函数式风格与 `$.isEmpty` / `$.now` 等保持一致——一次重写，整体更地道；④ 第二参数仍用 regex 字面量（避免双层 \\\\ 转义恶心）|
| ❌ C | 改成 `$.matches(x, '...')` 字符串 pattern | 否决：JSON-in-JSON 转义 → `^1[3-9]\\\\d{9}$` 双层 \\，可读性反而差；spec §3.7 Migrations 也没推荐字符串 pattern |

#### 2.3 判空 `x && x.length > 0` vs `$.isEmpty(x)`

| 候选 | 内容 | 决定 |
|---|---|---|
| ❌ A | 维持 `state.view.form.phone && state.view.form.phone.length > 0` | 否决：啰嗦 + 重复 path access（性能微小但可读性差）；用 `$` 命名空间是平台一致性 |
| ✅ B | 用 `!$.isEmpty(state.view.form.phone)` | 选定。spec §4 `$.isEmpty(any) → boolean` 容错（null/undefined/''/[]/{}全返 true），语义比 `x && x.length > 0` 更明确（"有真实内容"） |
| ❌ C | 用 `state.view.form.phone.length > 0` | 否决：form.phone 是 null/undefined 时崩；尽管 stateInit defaultValue="" 保证不会，但保险起见用 `$.isEmpty` 兜底 |

#### 2.4 trim 预处理（实战漏译修复）

**问题描述**：iOS 系统输入法在输入手机号时会自动在 3-4-4 位置插入空格（138 0013 8000）；用户复制粘贴密码也常常把前后空格带进来。**当前 schema 完全没有 trim 步骤**，正则严格匹配 `^1[3-9]\d{9}$` → 用户体感"我明明输对了，为什么报错？"

**候选方案**：

| 候选 | 内容 | 决定 |
|---|---|---|
| ❌ A | 在 input 节点加属性 `pattern="[0-9]*"` 让浏览器自动滤空格 | 否决：① interaction 阶段不该写 HTML 属性（边界 R-INTERACTION-FORBIDDEN）；② iOS 自动空格不是 input 的 raw value，是显示层 mask，不靠 pattern 拦 |
| ❌ B | 改 product 阶段的正则规则放宽接受空格 | 否决：① 越界改 product 决策（违反 v2.3 跨阶段约定，要走 challenge）；② 正则放宽 = 业务规则改变，不是 expression 重构 |
| ✅ C | blur 时 trim 预处理（state.set 写回 trim 后值）+ click 提交时再 trim 一次双保险 | 选定。理由：① interaction 边界内（state.set + bind 是 interaction 一等字段）；② 用户失焦后悄悄 trim 是最自然的"自动整理"行为；③ submit 再 trim 一次防止"用户输入后没失焦直接点 submit"漏空格 |
| ❌ D | 仅 click 提交时 trim | 否决：blur 校验早于 submit，blur 时若不 trim → blur 校验报错 → 用户先看到错误反馈 → 体验下降 |

**选定 C**——双层 trim：blur 时 + click 提交内的预校验 Step 内。

**trim 用法细节**：
- `state.view.form.phone.trim()` —— 直接 string 实例方法，spec §5.1 string 白名单内 ✓
- 但 form.phone 理论上可能是 null（虽然 product 默认值是 ""，但 effect.fetch onSuccess 等异步路径可能写 null）—— 用 `$.defaultTo(x, '').trim()` 双保险
- `$.defaultTo` 是 spec §4 builtin（`(any, any) → any`）

#### 2.5 logic.if 折叠为单 state.set + 三元

**当前 PhoneInput.blur**：
```
logic.if when=有内容 then=[state.set 校验] else=[state.set 清错]
```

**新版 PhoneInput.blur**：
```
state.set view.form.phone   = $.defaultTo(x, '').trim()    // Step 1
state.set view.errors.phone = $.isEmpty(...) ? '' : ($.matches(...) ? '' : '...')  // Step 2
```

| 候选 | 决定 |
|---|---|
| ❌ A | 维持 logic.if 嵌套 then/else 结构 | 否决：① 嵌套两层 actions，对人对机器都难读；② v1.0 三元已合法 + spec 鼓励；③ 折叠后 actions 数组从 1 个嵌套对象 → 2 个平铺对象，机器对账更直接 |
| ✅ B | 折叠为 2 个 state.set | 选定 |

CredentialInput.blur 同样折叠（嵌套三元处理 loginMode 分支，原 logic.if 取消）。

SubmitBtn.click actions 因为内部还有 then=反馈/else=fetch 双分支，**不折叠 logic.if**——它表达的是"做不做 fetch"两个互斥分支，folding 会破坏语义清晰度。仅替换 expression 形式。

### 3. 不改的事（边界自检）

| 字段 | 不动理由 |
|---|---|
| business 状态机 / 状态枚举 | 业务规则不变 |
| onSuccess / onError actions 链顺序 | 业务契约不变 |
| logic.switch cases (CREDENTIAL/LOCKED/LIMIT_EXCEEDED/TIMEOUT/NETWORK_ERROR/SERVER_ERROR + default) | 错误码契约不变 |
| 错误消息文案 ("请输入正确的手机号" 等) | 产品决策范围；本任务不越界 |
| condition 守卫数量（3 系统级 / GetCodeBtn 6 守卫） | 边界覆盖不变 |
| description 主体文案 | 仅在末尾追加 v1.0 expression refresh 标记 |
| node IDs / 节点结构 | 0 改动 |
| visibleWhen / bind / props（动态文案） | 形式上同样可重写但本任务限定在 events 范围；visibleWhen 只用 `!!state.view.errors.phone` 这种简单形式，重写收益有限 |
| dataSources / state vars / overlays | 0 改动 |

### 4. expectedArtifacts 自检

5 个节点 × 至少 1 个 event 与对应 trigger 配齐 actions（非空）→ checker 满足结构判断（kind=`nodeHasEvent`），路径相对 Screen 根：

```
[
  { kind: "nodeHasEvent", nodeId: "nd_083c744e1699418e9d01e", trigger: "blur" },        // PhoneInput
  { kind: "nodeHasEvent", nodeId: "nd_989c02eb1f224e0c9f973", trigger: "blur" },        // CredentialInput
  { kind: "nodeHasEvent", nodeId: "nd_e6783f85edb3499c9f131", trigger: "click" },       // GetCodeBtn
  { kind: "nodeHasEvent", nodeId: "nd_5a15fd87f060436295b4f", trigger: "click" },       // SubmitBtn
  { kind: "nodeHasEvent", nodeId: "nd_6a7f2492b59b4e7eab7e1", trigger: "screenEnter" }  // Root
]
```

### 5. ops 层 lint 风险预估

cheatsheet §"AI 落库门禁"明示：ops 层（event/element/style/data-source）写入前会跑 lint，违规直接返 `{success:false, issues:[...]}`。本任务用的所有 expression 都在 v1.0 spec 白名单：

| 用法 | spec 章节 | 合法性 |
|---|---|---|
| `$.now()` | §4 builtin | ✓ |
| `$.matches(x, regex)` | §4 builtin (string\|RegExp 第二参数) | ✓ |
| `$.isEmpty(x)` | §4 builtin | ✓ |
| `$.defaultTo(x, '')` | §4 builtin | ✓ |
| `.trim()` | §5.1 string 实例方法 | ✓ |
| `Math.max / Math.floor` | §3.2 globals | ✓ |
| 三元 `a ? b : c` | §1.2 操作符 | ✓ |
| `regex` 字面量 `/^...$/` | §1.1 字面量 | ✓ |
| `state.view.x` / `globalView.x.y` | §2 contextual | ✓ |
| `$last.error.code` / `$last.response.x` | §2 contextual (inside-onSuccess/Error) | ✓ |

→ 0 风险预估。

### 6. 三轴覆盖核对（patch 范围）

| rule | 体现 | ✓ |
|---|---|---|
| product rules 第 1 条（手机号 11 位 1[3-9]） | $.matches 三处 | ✓ |
| product rules 第 4 条（密码 6-20 字母+数字 / 验证码 6 位） | $.matches 内层 | ✓ |
| product rules 第 3 条（5 次锁 30 分钟） | onError CREDENTIAL 内 logic.if + state.set lockedUntil 不变 | ✓ |
| state machine locked 分支 | screenEnter lockedCountdown 重启 + condition !locked 守卫 | ✓ |
| ds-login 三态 | onSuccess / onError / pending（按钮 spinner visibleWhen 引用 effects.status，本任务不动）| ✓ |
| ds-send-code 三态 | 同上 | ✓ |
| 实战漏译（用户带空格） | trim 双保险 | ✓ 本次新补 |

---

## ★ 沉淀到 schema 的结论

5 个 `event/update_event` 调用（每个节点 1 个，index=0；trigger / actions / condition 替换）：

```jsonc
// 1) PhoneInput.blur
event/update_event {
  projectId, screenId,
  nodeId: "nd_083c744e1699418e9d01e",
  index: 0,
  patch: {
    description: "失焦校验手机号格式（v1.0 expression refresh）：(a) trim 预处理写回 view.form.phone；(b) 单 state.set + 三元判空+正则。空跳过校验；非空匹配则清错；非空不匹配则报错。来源 operations #3 + errors D-E1/D-E4。",
    actions: [
      { type: "state.set", path: "view.form.phone",
        value: "{{ $.defaultTo(state.view.form.phone, '').trim() }}" },
      { type: "state.set", path: "view.errors.phone",
        value: "{{ $.isEmpty(state.view.form.phone) ? '' : ($.matches(state.view.form.phone, /^1[3-9]\\d{9}$/) ? '' : '请输入正确的手机号') }}" }
    ]
  }
}

// 2) CredentialInput.blur
event/update_event {
  projectId, screenId,
  nodeId: "nd_989c02eb1f224e0c9f973",
  index: 0,
  patch: {
    description: "失焦校验凭证（v1.0 expression refresh）：(a) trim 预处理；(b) 单 state.set + 嵌套三元（按 loginMode 分支：code 校 6 位数字；password 校 6-20 字母+数字）。空跳过校验；不抢 focus。来源 operations #7 + errors 类 1 + D-E1。",
    actions: [
      { type: "state.set", path: "view.form.credential",
        value: "{{ $.defaultTo(state.view.form.credential, '').trim() }}" },
      { type: "state.set", path: "view.errors.credential",
        value: "{{ $.isEmpty(state.view.form.credential) ? '' : (state.view.loginMode === 'code' ? ($.matches(state.view.form.credential, /^\\d{6}$/) ? '' : '请输入 6 位数字验证码') : ($.matches(state.view.form.credential, /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/) ? '' : '密码需 6-20 位且包含字母和数字')) }}" }
    ]
  }
}

// 3) GetCodeBtn.click — condition + actions（仅 condition 表达式形式升级；actions 内业务 100% 保留）
event/update_event {
  projectId, screenId,
  nodeId: "nd_e6783f85edb3499c9f131",
  index: 0,
  patch: {
    description: "获取验证码（v1.0 expression refresh）：condition 6 守卫（code 模式 + phone 合法用 $.matches + 倒计时为 0 + ds-send-code 非 pending + 非离线 + 非锁定用 $.now）；onSuccess 启动 60s 倒计时；onError 按 logic.switch 分支（含 TIMEOUT case）。来源 operations #8 + boundaries D-B1。",
    condition: {
      when: "{{ state.view.loginMode === 'code' && $.matches(state.view.form.phone, /^1[3-9]\\d{9}$/) && state.view.codeCountdown === 0 && state.effects['ds-send-code'].status !== 'pending' && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > $.now()) }}"
    },
    actions: [
      { type: "effect.fetch", dataSourceId: "ds-send-code",
        params: { phone: "{{ state.view.form.phone }}" },
        onSuccess: [
          { type: "ui.showToast", toastType: "success", message: "验证码已发送" },
          { type: "state.set", path: "view.codeCountdown", value: 60 },
          { type: "ui.startTimer",
            timerId: "codeCD",
            duration: 60000,
            interval: 1000,
            onTick:     [{ type: "state.set", path: "view.codeCountdown", value: "{{ state.view.codeCountdown - 1 }}" }],
            onComplete: [{ type: "state.set", path: "view.codeCountdown", value: 0 }]
          }
        ],
        onError: [
          { type: "logic.switch",
            value: "{{ $last.error.code }}",
            cases: [
              { when: "LIMIT_EXCEEDED", actions: [{ type: "ui.showToast", toastType: "error", message: "今日发送次数已达上限" }] },
              { when: "TIMEOUT",        actions: [{ type: "ui.showToast", toastType: "error", message: "请求超时，请检查网络后重试" }] },
              { when: "NETWORK_ERROR",  actions: [{ type: "ui.showToast", toastType: "error", message: "网络异常，请检查后重试" }] },
              { when: "SERVER_ERROR",   actions: [
                { type: "ui.showToast", toastType: "error", message: "服务繁忙，请稍后重试" },
                { type: "custom", handler: "platform.reportError",
                  payload: { scope: "ds-send-code", error: "{{ $last.error }}" } }
              ]}
            ],
            default: [
              { type: "ui.showToast", toastType: "error", message: "出了点问题，请稍后重试" },
              { type: "custom", handler: "platform.reportError",
                payload: { scope: "ds-send-code", error: "{{ $last.error }}" } }
            ]
          }
        ]
      }
    ]
  }
}

// 4) SubmitBtn.click — 完整重写
event/update_event {
  projectId, screenId,
  nodeId: "nd_5a15fd87f060436295b4f",
  index: 0,
  patch: {
    description: "登录提交主流程（v1.0 expression refresh + v2.5 D-E4(3) onSubmit 档前置校验 + v2.6 独立 TIMEOUT case）：condition 仅守系统级（用 $.now）→ actions Step1-2 trim+校验 phone → Step3-4 trim+校验 credential → Step5 logic.if then=Toast+focus 不 fetch / else=原 ds-login 主流程；onSuccess 写 globalView.session（用 $.now）；onError 按 code 分支（CREDENTIAL 第 5 次锁用 $.now）。",
    condition: {
      when: "{{ !state.view.submitting && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > $.now()) }}"
    },
    actions: [
      // ── Step 1: phone trim 预处理 ──
      { type: "state.set", path: "view.form.phone",
        value: "{{ $.defaultTo(state.view.form.phone, '').trim() }}" },
      // ── Step 2: phone 强制重校验 ──
      { type: "state.set", path: "view.errors.phone",
        value: "{{ $.isEmpty(state.view.form.phone) ? '请输入手机号' : ($.matches(state.view.form.phone, /^1[3-9]\\d{9}$/) ? '' : '请输入正确的手机号') }}" },
      // ── Step 3: credential trim 预处理 ──
      { type: "state.set", path: "view.form.credential",
        value: "{{ $.defaultTo(state.view.form.credential, '').trim() }}" },
      // ── Step 4: credential 强制重校验 ──
      { type: "state.set", path: "view.errors.credential",
        value: "{{ $.isEmpty(state.view.form.credential) ? (state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码') : (state.view.loginMode === 'code' ? ($.matches(state.view.form.credential, /^\\d{6}$/) ? '' : '请输入 6 位数字验证码') : ($.matches(state.view.form.credential, /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/) ? '' : '密码需 6-20 位且包含字母和数字')) }}" },

      // ── Step 5: logic.if 双分支 ──
      { type: "logic.if",
        when: "{{ !$.isEmpty(state.view.errors.phone) || !$.isEmpty(state.view.errors.credential) || !state.view.form.policy }}",
        then: [
          { type: "ui.showToast", toastType: "error", message: "请检查表单后再提交" },
          { type: "logic.if",
            when: "{{ !$.isEmpty(state.view.errors.phone) }}",
            then: [
              { type: "custom", handler: "ui.focus",
                payload: { nodeId: "nd_083c744e1699418e9d01e" } }
            ],
            else: [
              { type: "logic.if",
                when: "{{ !$.isEmpty(state.view.errors.credential) }}",
                then: [
                  { type: "custom", handler: "ui.focus",
                    payload: { nodeId: "nd_989c02eb1f224e0c9f973" } }
                ],
                else: [
                  { type: "ui.animate", nodeId: "nd_36cea068f4af4b8fbdbb3",
                    animation: "shake", duration: 300 }
                ]
              }
            ]
          }
        ],
        else: [
          { type: "custom", handler: "hapticFeedback", payload: { strength: "medium" } },
          { type: "state.set", path: "view.submitting", value: true },
          { type: "effect.fetch", dataSourceId: "ds-login",
            onSuccess: [
              { type: "node.setVisualState", state: "success",
                nodeId: "nd_5a15fd87f060436295b4f", autoRevertMs: 500 },
              { type: "state.set", path: "data.user",
                value: "{{ $last.response.user }}" },
              { type: "state.set", path: "globalView.session",
                value: {
                  user: "{{ $last.response.user }}",
                  token: "{{ $last.response.token }}",
                  status: "active",
                  expiresAt: "{{ $.now() + $last.response.expiresIn * 1000 }}",
                  refreshToken: null,
                  lastActivityAt: "{{ $.now() }}"
                } },
              { type: "state.set", path: "view.submitting",   value: false },
              { type: "state.set", path: "view.failureCount", value: 0 },
              { type: "state.set", path: "view.lockedUntil",  value: null },
              { type: "ui.delay", duration: 500 },
              { type: "logic.if",
                when: "{{ !$.isEmpty(globalView.nav.authRedirectTo) }}",
                then: [
                  { type: "nav.go", targetScreenId: "{{ globalView.nav.authRedirectTo }}" },
                  { type: "state.set", path: "globalView.nav.authRedirectTo", value: null }
                ],
                else: [{ type: "nav.go", targetScreenId: "01-home" }]
              }
            ],
            onError: [
              { type: "state.set", path: "view.submitting", value: false },
              { type: "logic.switch",
                value: "{{ $last.error.code }}",
                cases: [
                  { when: "CREDENTIAL", actions: [
                    { type: "state.set", path: "view.failureCount",
                      value: "{{ state.view.failureCount + 1 }}" },
                    { type: "logic.if", when: "{{ state.view.failureCount >= 5 }}",
                      then: [
                        { type: "ui.showToast", toastType: "error",
                          message: "尝试次数过多，账号已锁定 30 分钟" },
                        { type: "state.set", path: "view.lockedUntil",
                          value: "{{ $.now() + 30*60*1000 }}" }
                      ],
                      else: [{ type: "ui.showToast", toastType: "error",
                              message: "账号或密码错误" }]
                    },
                    { type: "logic.if", when: "{{ state.view.loginMode === 'password' }}",
                      then: [{ type: "state.set", path: "view.form.credential", value: "" }] },
                    { type: "ui.animate", nodeId: "nd_e60fb832933f4b86a6638",
                      duration: 300, animation: "shake" }
                  ]},
                  { when: "LOCKED", actions: [
                    { type: "state.set", path: "view.lockedUntil",
                      value: "{{ $last.error.lockedUntil }}" }
                  ]},
                  { when: "LIMIT_EXCEEDED", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "今日登录尝试次数已达上限" }
                  ]},
                  { when: "TIMEOUT", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "请求超时，请检查网络后重试" }
                  ]},
                  { when: "NETWORK_ERROR", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "网络异常，请检查后重试" }
                  ]},
                  { when: "SERVER_ERROR", actions: [
                    { type: "ui.showToast", toastType: "error",
                      message: "服务繁忙，请稍后重试" },
                    { type: "custom", handler: "platform.reportError",
                      payload: { error: "{{ $last.error }}", scope: "ds-login" } }
                  ]}
                ],
                default: [
                  { type: "ui.showToast", toastType: "error",
                    message: "出了点问题，请稍后重试" },
                  { type: "custom", handler: "platform.reportError",
                    payload: { error: "{{ $last.error }}", scope: "ds-login" } }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

// 5) Root.screenEnter — Date.now → $.now（3 处）
event/update_event {
  projectId, screenId,
  nodeId: "nd_6a7f2492b59b4e7eab7e1",
  index: 0,
  patch: {
    description: "进屏门禁（v1.0 expression refresh）：(1) session.status='active' 直跳 01-home；(2) lockedUntil>$.now() 重启 lockedCountdown timer 同步剩余秒数；codeCountdown 不恢复（决策 D-B2）。来源 operations #1 + boundaries 重入恢复。",
    actions: [
      { type: "logic.if",
        when: "{{ globalView.session && globalView.session.status === 'active' }}",
        then: [{ type: "nav.go", targetScreenId: "01-home" }],
        else: [
          { type: "logic.if",
            when: "{{ state.view.lockedUntil && state.view.lockedUntil > $.now() }}",
            then: [
              { type: "state.set", path: "view.lockedCountdown",
                value: "{{ Math.max(0, Math.floor((state.view.lockedUntil - $.now()) / 1000)) }}" },
              { type: "ui.startTimer",
                timerId: "lockedCountdown",
                duration: "{{ state.view.lockedUntil - $.now() }}",
                interval: 1000,
                onTick: [
                  { type: "state.set", path: "view.lockedCountdown",
                    value: "{{ state.view.lockedCountdown - 1 }}" }
                ],
                onComplete: [
                  { type: "state.set", path: "view.lockedUntil",     value: null },
                  { type: "state.set", path: "view.lockedCountdown", value: 0 },
                  { type: "state.set", path: "view.failureCount",    value: 0 }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

> Root.screenExit (events[1]) 不动 —— 没有 expression。

### 后置自检（schema 落库后回填）

- [x] D-EXR1 (a) PhoneInput.blur trim 预处理
- [x] D-EXR1 (b) PhoneInput.blur 单 state.set + 三元
- [x] D-EXR2 (a) CredentialInput.blur trim 预处理
- [x] D-EXR2 (b) CredentialInput.blur 嵌套三元
- [x] D-EXR3 (a)(b)(c) GetCodeBtn.click condition 表达式迁移
- [x] D-EXR4 (a)~(h) SubmitBtn.click 完整重写
- [x] D-EXR5 (a)(b) Root.screenEnter expression 迁移
- [x] expectedArtifacts 5 条 nodeHasEvent 指纹满足
- [x] integrity 0 错（落库后跑 query/integrity 验证）
