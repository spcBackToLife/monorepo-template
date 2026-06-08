# stateInit + dataSources 占位声明详细规范

> 本阶段**只声明、不完整化**——完整化（含 mock 场景 / 派生态 / autoFetchOnEnter）是 interaction 阶段的事。

## §1. state.view 占位（UI 临时态）

只声明**已知的产品决策态**（如登录方式 / 表单结构），不预测交互细节。

```jsonc
// MCP: state/view_add（多次调用，每个变量一次）
state/view_add {
  projectId, screenId,
  variable: {
    name: "loginMode",
    label: "登录方式",
    defaultValue: "code",
    enum: [
      { value: "code",     label: "验证码免密" },
      { value: "password", label: "密码登录" }
    ]
  }
}

state/view_add {
  projectId, screenId,
  variable: {
    name: "form",
    label: "表单数据",
    defaultValue: { phone: "", credential: "", policy: false }
  }
}

state/view_add {
  projectId, screenId,
  variable: { name: "submitting", label: "提交中", defaultValue: false }
}
```

**留给 interaction 的派生态**（不要写）：
- `errors` / `canSubmit` / `showPassword` / `failureCount` / `lockedUntil` / `codeCountdown`

**留给 design 的字段**（不要写）：
- `previewValue`（编辑期预览值）

## §2. state.data 占位（API 响应位）★

每个 API 数据源对应一个 `data` key 占位（一般 null 或空结构），并配 PascalCase 类型注解（给 codegen 用）：

```jsonc
// MCP: state/data_set_init
state/data_set_init {
  projectId, screenId,
  key: "user",
  initial: null,
  typeDef: { typeName: "User", isArray: false }
}

state/data_set_init {
  projectId, screenId,
  key: "session",
  initial: null,
  typeDef: { typeName: "Session", isArray: false }
}
```

**红线**：每个 API 数据源都对应一个 data key 占位 + dataTypes 类型注解。typeName 必须 PascalCase，与 dataSources.typeDef.responseName 一致。

## §3. dataSources（API 契约声明）★

### 3.1 API 类型

每个识别到的 API 都写成 `dataSources` 条目，**至少含**：
- `endpoint.method` / `path` / `body` 结构
- `typeDef.responseName` + `responseFields[]`（PascalCase）
- `typeDef.paramsName` + `paramsFields[]`

```jsonc
// MCP: data_source/add (type=api)
data_source/add {
  projectId, screenId,
  dataSource: {
    id: "ds-login",
    type: "api",
    name: "登录接口",
    description: "提交手机号 + 凭证，返回 token + user",
    typeDef: {
      responseName: "LoginResponse",
      responseShape: "object",
      responseFields: [
        { name: "token",     type: "string", description: "JWT 凭证" },
        { name: "user",      type: "User",   description: "用户信息" },
        { name: "expiresIn", type: "number", description: "过期秒数" }
      ],
      paramsName: "LoginParams",
      paramsFields: [
        { name: "phone",      type: "string" },
        { name: "credential", type: "string" },
        { name: "mode",       type: "'code' | 'password'" }
      ]
    }
  }
}

// MCP: data_source/set_endpoint
data_source/set_endpoint {
  projectId, screenId,
  dataSourceId: "ds-login",
  endpoint: {
    method: "POST",
    path: "/api/auth/login",
    body: {
      phone: "<placeholder>",
      credential: "<placeholder>",
      mode: "<placeholder>"
    },
    responseSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        user:  { type: "object", properties: { id, nickname, avatar, phone } },
        expiresIn: { type: "number" }
      }
    }
  }
}
```

### 3.2 Static 类型（常量数据）

```jsonc
data_source/add {
  projectId, screenId,
  dataSource: {
    id: "ds-policy-text",
    type: "static",
    name: "协议文案",
    description: "登录页底部协议链接的文案集",
    initial: {
      privacyTitle: "《隐私协议》",
      termsTitle: "《用户服务协议》"
    }
  }
}
```

## §4. 留给 interaction 阶段的字段（严禁本阶段写）

| 字段 | 原因 |
|------|------|
| `dataSources[*].mock` | mock 场景是运行时策略 |
| `dataSources[*].defaultParams` | 默认参数是运行时策略 |
| `dataSources[*].autoFetchOnEnter` | 自动 fetch 是运行时策略 |
| `state.view.*.previewValue` | 编辑期预览值是 design 的事 |
| `state.view` 中的派生态（errors / canSubmit / ...） | 派生态是交互行为 |

## 红线

- **typeDef 是产品阶段的接口契约**——不能拖到 interaction 才补
- 每个 API 都建 dataSource 含**完整 typeDef**
- typeDef.responseName / paramsName 必须 PascalCase
- 每个 API 对应一个 state.data key + dataTypes 类型注解
