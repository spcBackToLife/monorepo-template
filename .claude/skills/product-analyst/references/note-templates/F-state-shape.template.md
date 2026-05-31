> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<M>-state-shape
> 对应 schema 字段：screen.stateInit.view / screen.stateInit.data

# state-shape: <screenId> — state/dataSource 占位选择推理

> 详细规范见 `schema-spec/state-and-datasource.md`。
>
> **本任务只声明已知的产品决策态**——派生态（errors / canSubmit / 等）留给 interaction。

## 推理过程

### 1. view 变量决策

哪些是"产品阶段已知的决策态"（必须建占位）：

| 变量 | 类型 | defaultValue | 理由（为什么产品阶段就要建）|
|------|------|--------------|-------------------------|
| loginMode | enum | "code" | 业务规则: 登录方式必须二选一（已在 rules 中明确）|
| form | object | { phone:"", credential:"", policy:false } | 表单字段结构产品已确定 |
| submitting | boolean | false | 提交守卫态，rules 中"800ms 防抖"依赖此变量 |

哪些是**派生态**（不在本阶段写，留给 interaction）：

| 变量 | 派生原因 | 留给原因 |
|------|---------|---------|
| errors | 由校验规则产生 | 校验时机（onChange/onBlur/onSubmit）是交互决策 |
| canSubmit | 由 form + errors 派生 | 派生公式留给 interaction 落 events.actions |
| failureCount / lockedUntil | 由失败计数累加 | 累加逻辑由 events.onError 实现 |
| codeCountdown | 由验证码倒计时驱动 | 倒计时由 timer action 实现 |
| showPassword | 切换可见 | 纯交互态 |

### 2. data key 决策

每个 API 数据源 → 1 个 data key 占位：

| data key | 来源 API | 类型 | 默认值 |
|---------|---------|------|--------|
| user | ds-login.response.user | User | null |
| session | ds-login.response（token + expiresIn） | Session | null |

### 3. defaultValue 取值依据

| 变量 | 默认值 | 依据 |
|------|-------|------|
| loginMode | "code" | 验证码免密体验更好，作首选 |
| form.phone | "" | 空字符串便于受控 |
| form.policy | false | 安全合规：默认未勾选，强制用户主动勾 |
| user / session | null | 未登录态 |

### 4. dataTypes 注解

确认每个 data key 的 typeName 与 dataSource.typeDef.responseName 子类型一致：

| data key | typeName | isArray |
|---------|---------|:-------:|
| user | User | false |
| session | Session | false |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: state/view_add（每个变量一次）
state/view_add { projectId, screenId,
  variable: { name: "loginMode", label: "登录方式", defaultValue: "code",
              enum: [{ value: "code", label: "验证码免密" },
                     { value: "password", label: "密码登录" }] } }

state/view_add { projectId, screenId,
  variable: { name: "form", label: "表单数据",
              defaultValue: { phone: "", credential: "", policy: false } } }

state/view_add { projectId, screenId,
  variable: { name: "submitting", label: "提交中", defaultValue: false } }

// MCP: state/data_set_init（每个 API 1 个 key）
state/data_set_init { projectId, screenId, key: "user", initial: null,
                      typeDef: { typeName: "User", isArray: false } }

state/data_set_init { projectId, screenId, key: "session", initial: null,
                      typeDef: { typeName: "Session", isArray: false } }
```

> 派生态 / mock 场景 / autoFetchOnEnter 不在本阶段写——留给 interaction。
