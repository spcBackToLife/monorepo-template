> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：M1-state-shape
> 对应 schema 字段：screen.stateInit.view / screen.stateInit.data

# state-shape: 00-login — state/dataSource 占位选择推理

## 推理过程

### 1. view 变量决策

#### 必须建占位（产品阶段已知的决策态）

| 变量 | 类型 | defaultValue | 理由（为什么产品阶段就要建） |
|------|------|--------------|-----------------------------|
| `loginMode` | enum `'code' \| 'password'` | `"code"` | 业务规则: 登录方式必须二选一（rules 中已明确）；验证码免密体验更好作首选 |
| `form` | object | `{ phone:"", credential:"", policy:false }` | 表单字段结构产品已确定（rules 中数据规则已写）|
| `submitting` | boolean | `false` | rules 中"800ms 防抖"依赖此变量；800ms 防抖期间 submitting=true 阻断重复提交 |

#### 派生态（**不**本阶段写，留给 interaction）

按 `state-and-datasource.md` 规范明确禁止：

| 变量 | 派生原因 | 留给原因 |
|------|---------|---------|
| `phoneError` / `credentialError` | 由 form + 校验规则派生 | 校验时机（onChange / onBlur / onSubmit）是交互决策 |
| `canSubmit` | 由 form + policy + lockedUntil + network 综合派生 | 派生公式落 condition.when 表达式 |
| `failureCount` | 累加由 onError 实现 | 计数动作由 events.actions 表达 |
| `lockedUntil` | 由 failureCount≥5 触发设置 | 设置动作由 events.actions 表达 |
| `codeCountdown` | 验证码倒计时（0~60）| ui.startTimer 驱动 |
| `passwordVisible` | 密码显隐切换 | 纯交互态（state.toggle）|

### 2. data key 决策

D-data 任务已建 `data.user`（已落库）。本任务**不再追加 data key**——`session` 我们决定用全局态（`globalView.session`）而非屏级 data，避免重复维护两份。

> 重审：D-data md 已论证 → "本屏不需要 `data.session` 重复占位"。这里保持一致。

### 3. defaultValue 取值依据

| 变量 | 默认值 | 依据 |
|------|-------|------|
| `loginMode` | `"code"` | 验证码免密体验更好，且降低密码忘记痛点 |
| `form.phone` | `""` | 空字符串便于受控 |
| `form.credential` | `""` | 同上 |
| `form.policy` | `false` | 合规红线：默认未勾选，强制用户主动勾 |
| `submitting` | `false` | 启动时空闲态 |

### 4. enum / label 设计

`loginMode` 是有限枚举，给运行时 / 编辑器都提供可读 label：

```
{ value: "code",     label: "验证码免密" }
{ value: "password", label: "密码登录" }
```

### 5. dataTypes 注解（已在 D-data 落库）

| data key | typeName | isArray |
|---------|---------|:-------:|
| `user` | `User` | false |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 屏级 view 三个变量
state/view_add { projectId, screenId,
  variable: {
    name: "loginMode", label: "登录方式", defaultValue: "code",
    enum: [
      { value: "code",     label: "验证码免密" },
      { value: "password", label: "密码登录" }
    ]
  } }

state/view_add { projectId, screenId,
  variable: { name: "form", label: "表单数据",
              defaultValue: { phone: "", credential: "", policy: false } } }

state/view_add { projectId, screenId,
  variable: { name: "submitting", label: "提交中", defaultValue: false } }

// data 占位已在 M1-data 落库（data.user + dataTypes.user = User）
// 不再追加（session 走全局态）
```
