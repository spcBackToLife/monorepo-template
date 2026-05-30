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
