> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：<M>-data
> 对应 schema 字段：screen.dataSources / screen.stateInit.data

# Step D: <模块名> — 数据模型 + API 契约

> 详细方法见 `methodology/04-five-step-method.md` Step D 和 `schema-spec/state-and-datasource.md`。

## 推理过程

### 1. 涉及实体（数据模型）

| 实体 | 核心字段 | 说明 |
|------|---------|------|
| User | id / phone / nickname / avatar | 用户账号实体 |
| Session | token / expiresIn | 登录会话 |
| ... | | |

### 2. 涉及接口

| 接口 | method | path | 用途 |
|------|--------|------|------|
| 登录 | POST | /api/auth/login | 提交手机号+凭证返回 token+user |
| 发送验证码 | POST | /api/auth/send-code | 发送 6 位短信验证码 |
| ... | | | |

### 3. typeDef 设计依据

对每个 API 设计 TypeScript 类型契约：

#### LoginResponse
- token: string — JWT 凭证（理由：标准 OAuth2 风格，便于 Bearer Auth）
- user: User — 嵌套用户信息（避免登录后再请求一次 /me）
- expiresIn: number — 秒为单位（约定：客户端在过期前 5 分钟刷新）

#### LoginParams
- phone: string — 11 位手机号
- credential: string — 兼容验证码 / 密码两种字段（理由：减少接口数，由 mode 区分）
- mode: 'code' | 'password' — 联合类型（前端类型严格收敛）

### 4. 静态数据源（如有）

| 数据源 | 内容 | 用途 |
|--------|------|------|
| ds-policy-text | { privacyTitle, termsTitle } | 协议文案，纯前端展示 |
| ... | | |

### 5. 留给 interaction 的字段

明确不在本阶段写：
- mock 场景（success / fail / timeout / 等场景的具体响应）
- defaultParams
- autoFetchOnEnter

## API 调用矩阵（可选）

| 屏幕 | 调用哪些 API | 时机 |
|------|------------|------|
| 00-login | ds-login | 点击登录按钮 |
| 00-login | ds-send-code | 点击获取验证码 |
| ... | | |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: data_source/add（API 类型）
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
        user: { type: "object", properties: { id, nickname, avatar, phone } },
        expiresIn: { type: "number" }
      }
    }
  }
}

// MCP: data_source/add（static 类型）
data_source/add {
  projectId, screenId,
  dataSource: {
    id: "ds-policy-text",
    type: "static",
    name: "协议文案",
    initial: { privacyTitle: "《隐私协议》", termsTitle: "《用户服务协议》" }
  }
}

// data 占位 + dataTypes
state/data_set_init { projectId, screenId, key: "user",    initial: null,
                      typeDef: { typeName: "User",    isArray: false } }
state/data_set_init { projectId, screenId, key: "session", initial: null,
                      typeDef: { typeName: "Session", isArray: false } }
```
