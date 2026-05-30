> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：M1-data
> 对应 schema 字段：screen.dataSources / screen.stateInit.data + dataTypes

# Step D: 用户认证-登录（M1）— 数据模型 + API 契约

## 推理过程

### 1. 涉及实体（数据模型）

| 实体 | 核心字段 | 说明 |
|------|---------|------|
| `User` | `id` / `phone` / `nickname` / `avatar` | 用户账号实体；登录响应里嵌入返回，避免再请求 `/me` |
| `Session` | `token` / `expiresIn` / `user`（嵌套）| 登录会话；写到 `globalView.session`（已在 Phase 1 占位为 null）|

实体最小字段集合按"登录页能用到的"为准——昵称 / 头像主屏可能用到（不写在 00-login，但 typeDef 必须含），以避免主屏接力时再补字段。

### 2. 涉及接口

| 接口 ID | method | path | 用途 | 时机 |
|---------|--------|------|------|------|
| `ds-login` | POST | `/api/auth/login` | 提交手机号 + 凭证返回 token + user | 点击 SubmitBtn |
| `ds-send-code` | POST | `/api/auth/send-code` | 发送 6 位短信验证码 | 点击 GetCodeBtn（验证码模式才有的按钮）|

> 静态资源：登录协议文案。也建一个 static dataSource 让"用户协议"/"隐私协议"链接的标题集中管理，方便修改。

### 3. typeDef 设计依据

#### LoginResponse / LoginParams（ds-login）

- `LoginResponse.token: string` — JWT 凭证（OAuth2 风格 Bearer Token）
- `LoginResponse.user: User` — 嵌套用户信息（避免主屏再请求 `/me`，减少首屏延迟）
- `LoginResponse.expiresIn: number` — 秒为单位（约定客户端在过期前 5 分钟刷新）
- `LoginParams.phone: string` — 11 位手机号
- `LoginParams.credential: string` — 兼容验证码 / 密码两种字段（理由：减少接口数；后端按 mode 解析 credential 含义）
- `LoginParams.mode: 'code' | 'password'` — 联合类型（前端类型严格收敛）

#### SendCodeResponse / SendCodeParams（ds-send-code）

- `SendCodeResponse.success: boolean` — 是否发送成功（短信通道结果）
- `SendCodeResponse.cooldownSeconds: number` — 后端返回的冷却倒计时（默认 60；与前端值校验一致）
- `SendCodeParams.phone: string` — 11 位手机号

### 4. 静态数据源

| 数据源 | 内容 | 用途 |
|--------|------|------|
| `ds-policy-text` | `{ privacyTitle, termsTitle, privacyUrl, termsUrl }` | 协议文案 + 链接，纯前端展示，方便后续替换 |

把 URL 一起放在 static 里——方便运营改协议链接时只改一处。

### 5. 留给 interaction 阶段的字段

明确不在本阶段写：

| 字段 | 留给 |
|------|-----|
| `dataSources[*].mock.scenarios` | interaction 设计 success / CREDENTIAL / LOCKED / LIMIT_EXCEEDED / NETWORK / TIMEOUT 等 mock 场景 |
| `dataSources[*].defaultParams` | interaction 决定是否预填默认值 |
| `dataSources[*].autoFetchOnEnter` | 登录页两个 API 都不应 autoFetch（用户主动触发），但 interaction 显式确认 |

## API 调用矩阵

| 屏 | 调用哪些 API | 时机 |
|---|------------|------|
| `00-login` | `ds-send-code` | 点击 GetCodeBtn（验证码模式专属）|
| `00-login` | `ds-login`     | 点击 SubmitBtn |

### 6. state.data 占位 + dataTypes 类型注解

每个 API 响应对应一个 data key：

| key | 来源 API | 初值 | typeName | isArray |
|-----|---------|------|----------|--------|
| `user`    | `ds-login.onSuccess` 写入（部分字段；session 也存一份）| `null` | `User`    | false |
| `session` | `ds-login.onSuccess` 派生写入（合并 token+user+expiresAt）| `null` | `Session` | false |

> `ds-send-code` 响应只用于触发倒计时，不需要持久写到 `data.*`——所以不建 data key（直接在 onSuccess 里 `state.set view.codeCountdown=60`）。

> `globalView.session` 已在项目级 globalStateInit.view 声明（Phase 1 已落）；屏级 `data.session` 是给本屏的"登录刚成功一瞬间"做缓存（与 globalView.session 同步写入，本屏之后不再读）。这里**两者并存**是有意为之：
> - `globalView.session`：跨屏长期态
> - `screen.data.session`：本屏短期数据位（typeDef 注解承载契约信息，给 codegen）

> 实际上简化：本屏不需要 `data.session` 重复占位。**只留 `data.user` 给主屏接力时的 user 类型契约**——session 已经在全局态。

修正：只建一个 data key：
| key | 初值 | typeName | isArray |
|-----|------|----------|--------|
| `user` | `null` | `User` | false |

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: data_source/add（API 类型 ds-login，含 endpoint + typeDef，无 mock）
data_source/add {
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId: "sc_27ee2293945046b69cc00",
  id: "ds-login",
  type: "api",
  name: "登录接口",
  description: "提交手机号 + 凭证（验证码或密码），返回 token + user + expiresIn",
  endpoint: {
    method: "POST",
    path: "/api/auth/login",
    body: {
      phone: "{{ view.form.phone }}",
      credential: "{{ view.form.credential }}",
      mode: "{{ view.loginMode }}"
    },
    responseSchema: {
      type: "object",
      properties: {
        token: { type: "string" },
        user:  { type: "object", properties: {
          id: { type: "string" }, phone: { type: "string" },
          nickname: { type: "string" }, avatar: { type: "string" }
        }},
        expiresIn: { type: "number" }
      }
    }
  },
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

// MCP: data_source/add（API 类型 ds-send-code）
data_source/add {
  projectId, screenId,
  id: "ds-send-code",
  type: "api",
  name: "发送短信验证码",
  description: "向手机号发送 6 位短信验证码（同号 60s 冷却 + 当日 10 次）",
  endpoint: {
    method: "POST",
    path: "/api/auth/send-code",
    body: { phone: "{{ view.form.phone }}" },
    responseSchema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        cooldownSeconds: { type: "number" }
      }
    }
  },
  typeDef: {
    responseName: "SendCodeResponse",
    responseShape: "object",
    responseFields: [
      { name: "success",         type: "boolean", description: "是否发送成功" },
      { name: "cooldownSeconds", type: "number",  description: "冷却秒数（默认 60）" }
    ],
    paramsName: "SendCodeParams",
    paramsFields: [
      { name: "phone", type: "string" }
    ]
  }
}

// MCP: data_source/add（static 协议文案）
data_source/add {
  projectId, screenId,
  id: "ds-policy-text",
  type: "static",
  name: "协议文案",
  description: "登录页底部协议链接的文案 + URL",
  initial: {
    privacyTitle: "《隐私协议》",
    termsTitle:   "《用户服务协议》",
    privacyUrl:   "https://example.edu/privacy",
    termsUrl:     "https://example.edu/terms"
  }
}

// MCP: state/data_set_init（仅一个：user）
state/data_set_init {
  projectId, screenId,
  key: "user",
  value: null,
  typeAnnotation: { typeName: "User", isArray: false }
}
```

> 不写 `mock` / `defaultParams` / `autoFetchOnEnter`——留给 interaction 阶段。
