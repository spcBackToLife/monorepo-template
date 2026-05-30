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
