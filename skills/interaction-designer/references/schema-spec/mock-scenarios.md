# DataSources 完整化规范（任务 `I-X-datasources`）

product 阶段已为每个 API 建好 dataSource，含 endpoint / typeDef。interaction 阶段补：
1. **mock 场景**（4 类典型场景：success / business-error / network-error / boundary）
2. **autoFetchOnEnter**（screenEnter 自动 fetch 与否）
3. **defaultParams**（effect.fetch 不传 params 时的默认值）

## §1. 完整字段示例（登录接口）

```jsonc
screen.dataSources = [
  {
    // ===== product 阶段已写（保留不动）=====
    id: "ds-login",
    type: "api",
    name: "登录接口",
    description: "...",
    endpoint: {
      method: "POST",
      path:   "/api/login",
      headers: { ... },
      body: { phone: "{{ view.form.phone }}", ... }
    },
    typeDef: {
      params:   { ... },
      response: { ... }
    },

    // ===== interaction 阶段补 =====
    autoFetchOnEnter: false,           // 登录不自动触发
    defaultParams: {                    // 一般空对象
    },
    mock: {
      activeScenarioId: "success",
      scenarios: [
        {
          id:          "success",
          name:        "登录成功",
          description: "返回正常 token + user",
          statusCode:  200,
          delay:       800,
          responseBody: {
            token:     "fake-jwt-token-xxx",
            user:      { id: "u_1", nickname: "校园小白", avatar: "https://...", phone: "138****0000" },
            expiresIn: 86400
          }
        },
        {
          id:          "wrongCredential",
          name:        "凭证错误",
          description: "401 凭证不匹配",
          statusCode:  401,
          delay:       600,
          responseBody: { code: "WRONG_CREDENTIAL", message: "手机号或密码错误" }
        },
        {
          id:          "locked",
          name:        "账户锁定",
          description: "失败次数过多",
          statusCode:  429,
          delay:       500,
          responseBody: { code: "LOCKED", message: "账户已锁定", lockedUntil: 1717075200000 }
        },
        {
          id:          "networkError",
          name:        "网络错误",
          description: "模拟超时",
          statusCode:  0,
          delay:       15000,
          isTimeout:   true,
          responseBody: null
        }
      ]
    }
  }
]
```

## §2. mock 场景的 4 类典型设计

每个 api dataSource 至少要有这 4 类 mock 场景，方便 design 阶段切换预览：

| 类别 | id 命名 | statusCode | delay | 用途 |
|------|--------|----------|------|-----|
| success | `success` | 200 | 中等（800ms）| 主线 happy path |
| 业务错 | `<businessError>`（如 `wrongCredential` / `outOfStock`）| 4xx | 中等 | 触发 onError 业务分支 |
| 限流 | `rateLimited` | 429 | 短 | 触发限流冷却 |
| 网络错 | `networkError` | 0 | 长（15s）+ isTimeout=true | 触发 timeout |

**列表型 dataSource** 还要补：

| 类别 | id 命名 | 用途 |
|------|--------|-----|
| empty | `empty` | 200 + responseBody.list = []，触发空态视图 |
| serverError | `serverError` | 5xx，触发整页错误 |

## §3. autoFetchOnEnter 决策

```
autoFetchOnEnter = true
  - 首屏列表数据（如 ds-feed / ds-profile）
  - 进入页面就该展示的数据

autoFetchOnEnter = false
  - 用户操作触发的接口（如 ds-login / ds-submit-order / ds-search）
  - 仅在 click event 中由 effect.fetch 主动触发
```

## §4. defaultParams 决策

```jsonc
// 列表型，分页参数有默认
defaultParams: { page: 1, pageSize: 20 }

// 详情型，依赖路由参数（一般为空，从 nav 来）
defaultParams: {}

// 业务接口，从 view.form 来
defaultParams: {}        // 在 effect.fetch 时显式传 params: { phone: "{{view.form.phone}}" }
```

**红线**：defaultParams 与 endpoint.body 表达式重复 → 选其一，避免双重默认。

## §4.5 NetworkPolicy（v2.6 ★：超时 / 重试）

```jsonc
endpoint.networkPolicy = {
  timeout:    15000,                    // 整个请求最长时间（ms）；触发后 onError code='TIMEOUT'
  retryCount: 0,                         // 重试次数（不含首次）；默认 0
  retryDelay: 1000,                      // 指数退避基数（ms）；实际间隔 = base × 2^attempt
  retryOn:    ['TIMEOUT', 'NETWORK_ERROR'], // 哪些错误码触发重试；默认 ['TIMEOUT','NETWORK_ERROR']
}
```

**取值建议表**（按 ds 类型）：

| ds 类型 | timeout | retryCount | 理由 |
|---------|---------|-----------|------|
| 关键认证流（登录 / 短信码 / 支付）| 10-15s | 0 | 重试会重复扣费 / 多次发短信 / 多次锁账号 → 失败让用户主动重 |
| 列表 / 详情读 | 8-12s | 2 | 读操作幂等，弱网可重试 2 次提高成功率 |
| 后台静默上报 | 30s | 1 | 容忍长时延；偶尔重试 |
| 流式 / SSE（如有）| undefined | 0 | 不限时；不重试（长连接） |
| 文件上传 / 大请求 | 60s+ | 0 | 用户已可视化等待，长 timeout 优先于自动重试 |

**关键边界**：
- ❌ 写入业务错码（CREDENTIAL/LOCKED/LIMIT_EXCEEDED 等）到 retryOn → 业务错重试会乱套（多次写入失败计数等）
- ❌ retryCount > 0 而 retryOn 包含 TIMEOUT → 超时阈值短（如 1s）+ 重试 3 次会让用户多等很久，要平衡 timeout × (retryCount+1) 的总时长
- ✅ undefined = 沿用平台默认（无超时无重试），保持向后兼容；只有真需要才显式声明

**与 mock scenario isTimeout 的关系**：
- mock scenario.isTimeout=true → 强制走超时分支（兼容历史，无视 networkPolicy.timeout）
- networkPolicy.timeout 触发自动 abort → 与 isTimeout=true 等效（都走 onError code='TIMEOUT'）
- 推荐：mock scenario 的 networkTimeout 场景仍保留 isTimeout=true（明确表达"这个场景模拟超时"），networkPolicy.timeout 则在生产真接口时生效

## §5. MCP 操作

```
data_source/list                  { projectId, screenId }
data_source/update                { projectId, screenId, dataSourceId, patch: { autoFetchOnEnter, name, description } }
data_source/set_default_params    { projectId, screenId, dataSourceId, defaultParams }
data_source/set_network_policy    { projectId, screenId, dataSourceId, networkPolicy }   // v2.6 ★
data_source/add_mock_scenario     { projectId, screenId, dataSourceId, scenario: { id, name, statusCode, delay, responseBody, isTimeout? } }
data_source/update_mock_scenario  { projectId, screenId, dataSourceId, scenarioId, patch }
data_source/switch_mock_scenario  { projectId, screenId, dataSourceId, scenarioId }
```

product 阶段已 `data_source/add`，interaction 阶段不应该重复 add。

## 红线汇总

| 红线 | 触发 |
|------|-----|
| R-DS-MOCK-01 | api 类型 dataSource 没有任何 mock 场景 |
| R-DS-MOCK-02 | 缺典型 4 类（success / business-error / network-error）至少各 1 个 |
| R-DS-AUTOFETCH-01 | 列表型首屏数据 autoFetchOnEnter = false（应 true，否则用户进页看不到数据）|
| R-DS-POLICY-01 | networkPolicy.retryOn 含业务错码（如 'CREDENTIAL'）|
| R-DS-POLICY-02 | timeout × (retryCount+1) > 60s（总等待过长，用户已离开）|
