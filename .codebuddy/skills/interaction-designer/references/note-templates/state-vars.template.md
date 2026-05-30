> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-state-vars
> 对应 schema 字段：screen.stateInit.view

# Step I-state-vars: <屏名> — view 派生态完整化

> 详细规范见 `schema-spec/state-completion.md` §1。

## 推理过程

### 1. 派生态需求清单（基于 statemachine + operations + errors + loading 任务）

> 列出该屏运行时所有需要的 view 变量。
> ★ product 阶段已声明的（loginMode / form / submitting）保留；本任务**只补 product 没声明的派生态**。

#### product 阶段已声明（保留）
- `loginMode`：登录方式（code | password）
- `form`：表单值（phone / credential / policy）
- `submitting`：是否提交中

#### interaction 阶段补的派生态
- `errors`：字段错误信息对象 → 错误处理任务需要
- `canSubmit`：是否可提交（在 events 中维护）→ 提交按钮 condition 用
- `showPassword`：密码可见 → eye icon 切换
- `failureCount`：失败次数 → 业务规则"≥5 锁"实现
- `lockedUntil`：锁定截止时间戳 → locked 状态判断
- `codeCountdown`：验证码倒计时 → 验证码冷却

### 2. defaultValue 设计

| 变量 | defaultValue | 理由 |
|------|------------|------|
| errors | `{ phone: "", credential: "", policy: "", login: "" }` | 空字符串而非 null，避免 `!!view.errors.phone` 与渲染逻辑冲突 |
| canSubmit | false | 进入页时表单空白，不可提交 |
| showPassword | false | 默认密码隐藏 |
| failureCount | 0 | 计数从 0 起 |
| lockedUntil | null | 未锁定为 null（不是 0，避免 `now()-0 > now()` 永真）|
| codeCountdown | 0 | 0 表示按钮可按 |

### 3. 与 events 的关联（哪些 actions 会写这些变量）

```
view.errors.phone     ← onChange phone → state.set
view.canSubmit        ← onChange phone/credential/policy → state.set（每次校验）
view.showPassword     ← click eye icon → state.toggle
view.failureCount     ← submitBtn onError → state.set 累加
view.lockedUntil      ← failureCount >= 5 时 → state.set now()+30min
view.codeCountdown    ← 发送验证码 onSuccess → ui.startTimer onTick state.set
```

### 4. 候选方案与否决

- 候选 A：把 errors 拆成 phoneError / credentialError 多个变量 → 否决：嵌套对象更内聚，便于一次清空
- 候选 B：canSubmit 用计算属性表达式 → 否决：当前 schema 不支持自动派生，手动 state.set 更稳
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: 每个变量一次 state/view_add
state/view_add { projectId, screenId,
  variable: { name: "errors", label: "字段错误",
              defaultValue: { phone: "", credential: "", policy: "", login: "" } } }

state/view_add { projectId, screenId,
  variable: { name: "canSubmit", label: "可提交", defaultValue: false } }

state/view_add { projectId, screenId,
  variable: { name: "showPassword", label: "密码可见", defaultValue: false } }

state/view_add { projectId, screenId,
  variable: { name: "failureCount", label: "失败次数", defaultValue: 0 } }

state/view_add { projectId, screenId,
  variable: { name: "lockedUntil", label: "锁定截止 ts", defaultValue: null } }

state/view_add { projectId, screenId,
  variable: { name: "codeCountdown", label: "验证码倒计时秒", defaultValue: 0 } }
```

> 注：product 阶段已 add 的变量不要重复 add；如需调整 defaultValue 用 state/view_update。

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。state-vars 任务**本身就是落库任务**——它的产物就是 stateInit.view 字段；同时它声明的"哪些变量要被哪些 events 写入"是给 events 任务的关键 todo 输入。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | 字段路径 | 期望指纹 |
|---------|------------------|---------------------|---------|---------|---------|
| SV-1 | 派生变量 errors / failureCount / lockedUntil / ... 全部声明 | stateInit.view.* 各字段非空且含 defaultValue | （本任务直接落）| `stateInit.view` | `nonEmpty path: stateInit.view`（屏级总指纹） |
| SV-2 | errors.phone 由 PhoneInput.blur + SubmitBtn.click 写入 | (1) PhoneInput.blur actions 含 state.set view.errors.phone<br>(2) SubmitBtn.click 前置校验 actions 含 state.set view.errors.phone | `I-X-events` | PhoneInput / SubmitBtn | (1) `nodeHasEvent { trigger:'blur' }`<br>(2) `nodeHasEvent { trigger:'click' }` |
| SV-3 | errors.credential 由 CredentialInput.blur + SubmitBtn.click 写入 | 同 SV-2 | `I-X-events` | CredentialInput / SubmitBtn | 同 SV-2 |
| SV-4 | failureCount 由 SubmitBtn.onError CREDENTIAL 累加；onSuccess 清零 | SubmitBtn.click 含相应 state.set | `I-X-events` | SubmitBtn | （含 SV-2 主指纹）|
| SV-5 | lockedUntil 由 failureCount≥5 写入；Root.screenEnter 重启 timer；timer onComplete 清空 | (1) SubmitBtn.onError 写入<br>(2) Root.screenEnter 重启 | `I-X-events` | SubmitBtn / Root | （含主指纹）|
| SV-6 | codeCountdown 由 GetCodeBtn.onSuccess 启动 timer onTick -1 | GetCodeBtn.click.onSuccess 含 ui.startTimer | `I-X-events` | GetCodeBtn | `nodeHasEvent { trigger:'click' }` |
| SV-7 | passwordVisible 由 PasswordToggleEye.click toggle | PasswordToggleEye.click 含 state.toggle | `I-X-events` | PasswordToggleEye | `nodeHasEvent { trigger:'click' }` |

> 备注：本任务本身落 stateInit.view（产物已直接落库，**不需要给下游继续翻译**），但表中"由谁写入"列是给 events 任务的关键输入——events 必须为每个变量找到至少一个 actions 写入点，否则变量是死变量。

字段说明见 `STAGE-CONTRACT.md §0.1.10`。
