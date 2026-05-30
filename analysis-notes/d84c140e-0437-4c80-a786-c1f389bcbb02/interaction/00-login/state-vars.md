> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-state-vars
> 对应 schema 字段：screen.stateInit.view（通过 state/view_add 增量添加）
> expectedArtifacts：[{ kind: "nonEmpty", path: "stateInit.view" }]

# Step I-state-vars: 00-login — view 派生态完整化

> 详细规范见 `schema-spec/state-completion.md` §1。
> 上游依赖：statemachine.md（9 状态用到的 view）+ operations.md（16 条 op 涉及的 state 变更）+ errors.md（§6 5 个错误相关变量清单）+ loading.md（决策 L2）+ boundaries.md（决策 D-B5/D-B9）。

## 推理过程

### 0. 派生态需求来源溯源

把"哪个任务推出哪个变量"逐条标注，避免遗漏：

| 来源任务 | 推出的派生态需求 | 用途 |
|---|---|---|
| statemachine.md → states[] | locked 持续态 | `lockedUntil` + `lockedCountdown` |
| statemachine.md → code-countdown 状态 | 验证码倒计时 | `codeCountdown` |
| operations.md #9 切换密码显隐 | 密码可见切换 | `passwordVisible` |
| operations.md #3 / #7 失焦校验 | 行内错误文案 | `errors.phone` / `errors.credential` |
| operations.md #13 决策 D6 | 失败累加 / 第 5 次锁 | `failureCount` + `lockedUntil` |
| errors.md §6 清单 | 同上 | 同上 |
| loading.md 决策 L2 | GetCodeBtn loading 不建变量 | ❌ 不建 codeSending（用 effects.status） |
| boundaries.md #X4 决策 D-B10 | authRedirectTo 消费 | （这是 globalView，不在本屏 view） |
| boundaries.md decision D-B9 | locked 整表单 disabled 触发 | 由 lockedUntil 派生（visibleWhen 判断），无需独立变量 |

### 1. 已有 vs 待补盘点（基于真实 schema）

**product 阶段已声明（来自 screen_schema 查询，绝不重复 add）：**

```jsonc
view: {
  loginMode:  { name, label, defaultValue: "code", enum: [{label,value}] x2 },
  form:       { name, label, defaultValue: { phone:"", credential:"", policy:false } },
  submitting: { name, label, defaultValue: false }
}
```

**本任务待补的 7 个变量：**

| 变量 | defaultValue | 类型 | 用途锚点 |
|---|---|---|---|
| `errors` | `{ phone: "", credential: "" }` | object | PhoneError/CredentialError 节点 textContent + visibleWhen 驱动 |
| `passwordVisible` | `false` | boolean | CredentialInput type 派生 + EyeIcon 显隐切换 |
| `failureCount` | `0` | number | ds-login.onError CREDENTIAL 累加 |
| `lockedUntil` | `null` | number\|null | 锁定截止毫秒时间戳；驱动 NormalForm/LockedView 互斥 |
| `lockedCountdown` | `0` | number | locked 态显示剩余秒；由 ui.startTimer 维护 |
| `codeCountdown` | `0` | number | 验证码 60s 冷却；由 ui.startTimer 维护 |
| ~~`canSubmit`~~ | — | — | **不建**——决策 D-S1 |
| ~~`codeSending`~~ | — | — | **不建**——loading.md 决策 L2 |
| ~~`refreshing` / `loadingMore`~~ | — | — | **不建**——loading.md 5 场景仅 button 适用，不需要 |

### 2. defaultValue 设计逐条理由

| 变量 | defaultValue | 理由 / 红线 |
|---|---|---|
| `errors` | `{ phone: "", credential: "" }` | state-completion §4：错误用 `""` 而非 null，避免 `!!view.errors.x` 与渲染逻辑冲突；嵌套对象必须填完整子结构（red line：禁止 `null` 然后 events 里再 set） |
| `passwordVisible` | `false` | 默认密码隐藏（移动端公共场所习惯） |
| `failureCount` | `0` | number 类默认 0 |
| `lockedUntil` | `null` | **不是 0** —— 0 会让 `lockedUntil > now()` 永远 false（看上去对），但条件 `view.lockedUntil && view.lockedUntil > now()` 中 0 是 falsy，等价 null；选 null 语义更明确（"无锁定"） |
| `lockedCountdown` | `0` | locked 态启动 timer 时再 state.set 30*60 起算 |
| `codeCountdown` | `0` | 0 表示按钮可按 / 60 表示倒计时启动 |

⚠️ `errors` 字段集决策：**只放 phone / credential 两个键**——不预留 login / policy
- login：决策 D-E1（错误用 Toast 不用行内）
- policy：协议未勾不报错，仅 SubmitBtn disabled 守卫

### 3. canSubmit 的取舍（决策 D-S1）

- **候选 A**：建 `view.canSubmit: false`，每次 phone/credential/policy/loginMode 变化时 state.set 一次
  - 优势：SubmitBtn condition 简单：`condition.when: "{{ view.canSubmit && !view.submitting && ... }}"`
  - 劣势：每个输入字段的 onChange 都要追加一条 state.set（4-5 处），易遗漏；canSubmit 与 form 实际值有"派生不一致"风险
- **候选 B**：不建，SubmitBtn condition 直接复合表达式
  - `condition.when: "{{ /^1[3-9]\\d{9}$/.test(view.form.phone) && (view.loginMode==='code' ? /^\\d{6}$/.test(view.form.credential) : /^(?=.*[A-Za-z])(?=.*\\d).{6,20}$/.test(view.form.credential)) && view.form.policy === true && !view.submitting && globalView.network.status !== 'offline' && (!view.lockedUntil || view.lockedUntil < Date.now()) }}"`
  - 优势：单一来源，不会派生失同步
  - 劣势：表达式长
- **决策**：**B（不建 canSubmit）**——
  1. 当前 schema 表达式引擎支持复杂表达式（v2-actions-cheatsheet §4 表达式约定）
  2. 单一来源 = 没派生不同步风险
  3. 长表达式可读性差，但只在 events.md 写一次 → 不是热点维护点
  4. 与 boundaries D-B5 决策同思路（动态 props 表达式 vs 双节点）

### 4. lockedCountdown vs lockedUntil 的双变量决策（D-S2）

- **观察**：boundaries #X1 / errors §6 都提到这两个变量
- **可能简化**：只用 lockedUntil，UI 渲染时 `Math.max(0, Math.floor((view.lockedUntil - Date.now())/1000))` 计算
- **采纳哪种**？
  - 候选 A：仅 lockedUntil，模板表达式实时计算秒数
    - 劣势：模板要在每次重渲染时算（rerender 频率高）；表达式里 `Date.now()` 不是响应式（除非有定时触发渲染的机制）
    - 关键：要让"剩余秒数"每秒更新显示，必须有"每秒触发一次重渲染"的副作用 → 需要 timer
  - 候选 B：双变量 lockedUntil + lockedCountdown
    - lockedUntil：判断"是否处于锁定"（驱动 visibleWhen 切 NormalForm/LockedView）
    - lockedCountdown：每秒由 ui.startTimer 写一次（驱动倒计时数字显示）
    - 优势：响应式 + 干净
- **决策**：**B（双变量）**——既然必须用 timer 驱动每秒刷新，不如分两个变量职责清晰

注：codeCountdown 同理（已是单变量），它本身就承担了"驱动按钮文案 (Ns)"的渲染职责。

### 5. data 增补判断

state-completion §2 提到"interaction 阶段一般保持 product 占位，仅在确实需要中间态时补"。
- product 阶段 stateInit.data 已有 `user: null`
- 本屏不需要新增 data key（验证码值不存 data，只存 view.form.credential；锁定信息也都在 view.lockedUntil）
- **决策 D-S3**：本任务**不动 data**

### 6. expectedArtifacts 自检

任务 expectedArtifacts: `[{ kind: "nonEmpty", path: "stateInit.view" }]`
- 当前 stateInit.view 已有 3 个 product 变量（loginMode/form/submitting） + 7 个本任务追加 = 10 个变量 → nonEmpty ✓

### 7. 候选与否决汇总

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-S1 | 是否建 view.canSubmit | 否（用 condition.when 复合表达式） |
| D-S2 | 锁定用单变量还是双变量 | 双（lockedUntil 判断 + lockedCountdown 显示） |
| D-S3 | 是否新增 stateInit.data key | 否（product 阶段 user:null 已够） |
| D-S4 | errors 子键集 | 仅 phone/credential（不含 login/policy） |
| D-S5 | passwordVisible 命名 | 与 operations.md 保持一致（不用模板示例的 showPassword） |

---

## ★ 沉淀到 schema 的结论

本任务 7 个 MCP 调用（每个变量一次 state/view_add）：

```jsonc
state/view_add { variable: { name: "errors",          label: "字段错误",        defaultValue: { phone: "", credential: "" } } }
state/view_add { variable: { name: "passwordVisible", label: "密码可见",        defaultValue: false } }
state/view_add { variable: { name: "failureCount",    label: "失败次数",        defaultValue: 0 } }
state/view_add { variable: { name: "lockedUntil",     label: "锁定截止时间戳",  defaultValue: null } }
state/view_add { variable: { name: "lockedCountdown", label: "锁定倒计时秒",    defaultValue: 0 } }
state/view_add { variable: { name: "codeCountdown",   label: "验证码倒计时秒",  defaultValue: 0 } }
```

> product 阶段已 add 的 loginMode / form / submitting 不重复 add。
> stateInit.data 不动（决策 D-S3）。
