> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-datasources
> 对应 schema 字段：screen.dataSources[*].mock + autoFetchOnEnter + defaultParams

# Step I-datasources: <屏名> — dataSources 完整化

> 详细规范见 `schema-spec/mock-scenarios.md`。

## 推理过程

### 1. 该屏的 dataSource 清单（product 已建）

| dataSourceId | type | endpoint 摘要 | typeDef 摘要 |
|--------------|------|------------|------------|
| ds-login | api | POST /api/login | { phone, credential, mode } → { token, user, expiresIn } |
| ds-policy-text | static | — | string |

### 2. autoFetchOnEnter 决策

| dataSourceId | autoFetchOnEnter | 理由 |
|--------------|------------------|------|
| ds-login | false | 用户操作触发的写入型接口 |
| ds-policy-text | n/a | static 不涉及 |

### 3. defaultParams 决策

| dataSourceId | defaultParams | 理由 |
|--------------|---------------|------|
| ds-login | {} | 参数从 view.form 来，effect.fetch 显式传 |

### 4. mock 场景设计（每个 api ds 至少 4 类）

#### ds-login 的场景

| id | 类别 | statusCode | delay | responseBody | 用途 |
|----|------|----------|------|------------|-----|
| success | success | 200 | 800 | `{ token, user, expiresIn }` | 主线 happy path |
| wrongCredential | 业务错 | 401 | 600 | `{ code: "WRONG_CREDENTIAL", message: "手机号或密码错误" }` | 触发 onError 业务分支 |
| locked | 业务错 | 429 | 500 | `{ code: "LOCKED", message: "账户已锁定", lockedUntil: 1717075200000 }` | 触发 locked 状态 |
| networkError | 网络错 | 0 | 15000 | null | 触发 timeout |

### 5. 候选方案与否决

- 候选 A：ds-login autoFetchOnEnter=true → 否决：用户没点提交就请求，违反语义
- 候选 B：mock 只设 success 场景 → 否决：design / 调试无法切换错误态
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: data_source/update（autoFetchOnEnter）
data_source/update {
  projectId, screenId, dataSourceId: "ds-login",
  patch: { autoFetchOnEnter: false }
}

// MCP: data_source/set_default_params
data_source/set_default_params {
  projectId, screenId, dataSourceId: "ds-login",
  defaultParams: {}
}

// MCP: data_source/add_mock_scenario（每个场景一次）
data_source/add_mock_scenario {
  projectId, screenId, dataSourceId: "ds-login",
  scenario: {
    id: "success", name: "登录成功",
    statusCode: 200, delay: 800,
    responseBody: { token: "fake-jwt-token-xxx", user: { id: "u_1", nickname: "校园小白" }, expiresIn: 86400 }
  }
}

data_source/add_mock_scenario {
  projectId, screenId, dataSourceId: "ds-login",
  scenario: {
    id: "wrongCredential", name: "凭证错误",
    statusCode: 401, delay: 600,
    responseBody: { code: "WRONG_CREDENTIAL", message: "手机号或密码错误" }
  }
}

data_source/add_mock_scenario {
  projectId, screenId, dataSourceId: "ds-login",
  scenario: {
    id: "locked", name: "账户锁定",
    statusCode: 429, delay: 500,
    responseBody: { code: "LOCKED", message: "账户已锁定", lockedUntil: 1717075200000 }
  }
}

data_source/add_mock_scenario {
  projectId, screenId, dataSourceId: "ds-login",
  scenario: {
    id: "networkError", name: "网络错误",
    statusCode: 0, delay: 15000, isTimeout: true,
    responseBody: null
  }
}

// MCP: data_source/switch_mock_scenario（设激活场景）
data_source/switch_mock_scenario {
  projectId, screenId, dataSourceId: "ds-login",
  scenarioId: "success"
}
```

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。datasources 任务**本身就是落库任务**——它的产物是 dataSources[].mock + autoFetchOnEnter + defaultParams + endpoint.networkPolicy（v2.6 ★）。同时它声明的"哪些 ds 由哪些 events 调用 effect.fetch"是给 events 任务的关键 todo 输入。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | 字段路径 / nodeId | 期望指纹 |
|---------|------------------|---------------------|---------|------------------|---------|
| DS-1 | 各 api ds mock ≥ 4 场景 | dataSources[id=...].mock.scenarios 数组长度 ≥ 4 | （本任务直接落）| `dataSources` | `arrayMin path: dataSources min: N` |
| DS-2 | autoFetchOnEnter=false（写入型）| dataSources[id=ds-login].autoFetchOnEnter=false | （本任务直接落）| 同上 | （随屏级 nonEmpty）|
| DS-3 | networkPolicy.timeout=15000ms / 10000ms（v2.6 ★）| dataSources[id=ds-login].endpoint.networkPolicy={timeout:15000}<br>dataSources[id=ds-send-code].endpoint.networkPolicy={timeout:10000} | （本任务直接落 via `data_source/set_network_policy`）| 同上 | `nonEmpty path: dataSources[*].endpoint.networkPolicy.timeout`（如要校验）|
| DS-4 | endpoint.body 含表达式（params 来自 view.form）| dataSources[id=ds-login].endpoint.body 非空 | （本任务直接落）| 同上 | （含主指纹）|
| DS-5 | ds-login 由 SubmitBtn.click 调用 effect.fetch | SubmitBtn.click.actions 含 effect.fetch dataSourceId='ds-login' + onSuccess + onError | `I-X-events` | SubmitBtn | `nodeHasEvent { trigger:'click' }` |
| DS-6 | ds-send-code 由 GetCodeBtn.click 调用 effect.fetch | GetCodeBtn.click.actions 含 effect.fetch dataSourceId='ds-send-code' + onSuccess + onError | `I-X-events` | GetCodeBtn | `nodeHasEvent { trigger:'click' }` |
| DS-7 | screenExit 取消所有未完成 fetch | Root.screenExit 含 effect.cancel ds-login + ds-send-code | `I-X-events` | Root | `nodeHasEvent { trigger:'screenExit' }` |

> 备注：本任务本身落 dataSources（产物直接落库），但表中 DS-5/6/7 是给 events 任务的关键 todo——若 events 漏译，会出现"ds-login 配齐了但没人调"的死接口。

字段说明见 `STAGE-CONTRACT.md §0.1.10`。
