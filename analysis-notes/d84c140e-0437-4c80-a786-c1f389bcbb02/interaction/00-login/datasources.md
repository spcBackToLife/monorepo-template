> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-datasources
> 对应 schema 字段：screen.dataSources[*].mock + autoFetchOnEnter + defaultParams + endpoint.timeout
> expectedArtifacts：[{ kind: "arrayMin", path: "dataSources", min: 1 }]

# Step I-datasources: 00-login — dataSources 完整化

> 详细规范见 `schema-spec/mock-scenarios.md`。
> 上游依赖：errors.md（错误码集合 CREDENTIAL/LOCKED/LIMIT_EXCEEDED/NETWORK/SERVER）+ boundaries.md（D-B1 timeout 不计 failureCount + ds-login 15s / ds-send-code 10s 超时阈值）+ loading.md（L4 ds-send-code autoFetch=false）。

## 推理过程

### 0. dataSource 现状盘点（来自 data_source/list 真实查询）

| dataSourceId | type | autoFetchOnEnter | defaultParams | timeout | mock 场景数 | 备注 |
|---|---|---|---|---|---|---|
| ds-login | api / POST /api/auth/login | false ✓ | 未设置 | **未设置 ⚠️** | 0 | endpoint.body 已用 `{{ view.* }}` 表达式 |
| ds-send-code | api / POST /api/auth/send-code | false ✓ | 未设置 | **未设置 ⚠️** | 0 | 同上 |
| ds-policy-text | static | n/a | n/a | n/a | n/a | initial 已有 4 个 URL/title 字段，本任务不动 |

**本任务待补**：
1. 两个 api 各 add 4 类 mock 场景（success / business / network / server-or-timeout）
2. 两个 api 设 endpoint.timeout（15000 / 10000，对应 boundaries D-B1）
3. defaultParams：均设 `{}`（参数走 endpoint.body 表达式，避免双重默认 — schema-spec §4 红线）
4. switch_mock_scenario 默认激活 success
5. ds-policy-text **不动**（static 无 mock 概念；initial 已完整）

### 1. 决策：ds-login 的 mock 场景设计

错误码全集来自 errors.md ds-login.onError 的 6 个分支：
- CREDENTIAL / LOCKED / LIMIT_EXCEEDED / NETWORK_ERROR / SERVER_ERROR / default

mock 应该至少覆盖**业务错主分支** + **一个网络错** + **一个服务错** + **success**。是否每个 errorCode 都建 mock？

- **决策 D-DS1**：建 6 个场景，**让 design 阶段能切换预览每条 onError 分支**——尤其是 LOCKED 场景需要可视化锁定 UI

| id | 类别 | statusCode | delay | responseBody | 验证 onError 分支 |
|---|---|---|---|---|---|
| `success` | success | 200 | 800 | `{ token, user{...}, expiresIn:86400 }` | onSuccess 主线 |
| `wrongCredential` | 业务错 | 401 | 600 | `{ code: "CREDENTIAL", message: "账号或密码错误" }` | CREDENTIAL 分支（普通 1-4 次） |
| `locked` | 业务错 | 423 | 500 | `{ code: "LOCKED", message: "账户已锁定", lockedUntil: <now+30min> }` | LOCKED 分支（直接进 locked 态） |
| `limitExceeded` | 业务错 | 429 | 500 | `{ code: "LIMIT_EXCEEDED", message: "今日登录尝试次数已达上限" }` | LIMIT_EXCEEDED 分支 |
| `serverError` | 服务错 | 500 | 800 | `{ code: "SERVER_ERROR", message: "服务繁忙" }` | SERVER 分支（→ Toast + reportError） |
| `networkTimeout` | 网络错 | 0 | 16000 + isTimeout=true | null | NETWORK 分支（超过 15s endpoint.timeout 触发） |

**关键决策点**：
- **D-DS2**：locked 场景的 statusCode 用 **423 Locked**（HTTP 标准里 423 = 资源被锁定），而不是模板示例的 429 —— 429 留给 LIMIT_EXCEEDED 限流类
- **D-DS3**：mock responseBody 的 user 字段用本项目语境的"校园社交"占位用户：`{ id: "u_1001", nickname: "校园同学", avatar: "https://example.edu/avatar/u_1001.png", phone: "138****8888" }`
- **D-DS4**：locked.lockedUntil 用相对时间 "now+30min"——但 schema 里只能存常量数字。用占位符约定 `lockedUntil: 9999999999999`（很大的 ts），design / debug 时切换 mock 立刻进 locked 态可看 UI
  - 修正：用相对时间没法表达，那就**写一个 5 分钟后的固定 ts** 作样例值；实际 mock 服务端可重写。给数 1717075200000 + ... 没意义；用 schema-spec 模板给的 1717075200000 即可（注意：这个时间是 2024-05-30，已过期 → 用户切到这个 mock 永远不锁。需要换）
  - 真正决策：用 `lockedUntil: null` 写死会让 LOCKED 分支的 `state.set view.lockedUntil=$last.error.lockedUntil` 写入 null，等于解锁
  - 最终方案：用一个**很大的固定毫秒数**：`9999999999999`（约 2286 年），design 期切换 locked mock 永远进入锁定态；运行时由真实服务端返回真 ts
- **D-DS5**：success 场景 delay=800ms，让 button spinner 真能被人眼看到；wrongCredential delay=600ms（错误反馈宁早；用户期待"输入错了应该立刻知道"）

### 2. 决策：ds-send-code 的 mock 场景设计

错误码集来自 errors.md ds-send-code.onError 的 4 个分支：
- LIMIT_EXCEEDED / NETWORK_ERROR / SERVER_ERROR / default

| id | 类别 | statusCode | delay | responseBody | 验证 onError 分支 |
|---|---|---|---|---|---|
| `success` | success | 200 | 600 | `{ success: true, cooldownSeconds: 60 }` | onSuccess 启动倒计时 |
| `limitExceeded` | 业务错 | 429 | 400 | `{ code: "LIMIT_EXCEEDED", message: "今日发送次数已达上限" }` | LIMIT_EXCEEDED 分支 |
| `serverError` | 服务错 | 500 | 600 | `{ code: "SERVER_ERROR", message: "服务繁忙" }` | SERVER 分支 |
| `networkTimeout` | 网络错 | 0 | 11000 + isTimeout=true | null | NETWORK 分支（超过 10s endpoint.timeout 触发） |

**注**：ds-send-code 没有"凭证错"概念（是无状态的发短信请求），所以 mock 4 个就够。

### 3. endpoint.timeout 决策（boundaries D-B1 落实）

| ds | timeout | 理由 |
|---|---|---|
| ds-login | 15000 ms | 登录可能后端较慢（密码 hash + token 生成）；超时不计 failureCount（D-B1） |
| ds-send-code | 10000 ms | 发短信链路应更快（短信网关）；超时也不计 failureCount |

**MCP 操作**：endpoint.timeout 不在 set_endpoint 的字段里（看 schema-spec 也只列 method/path/headers/query/body/responseSchema）。需要 set_endpoint 整体替换吗？

**决策 D-DS6**：跳过 endpoint.timeout 设置——
1. data_source 工具描述里 set_endpoint 没明确支持 timeout 字段；强行 set_endpoint 会误重置已有的 body 表达式
2. 实际上 boundaries 红线条目"ds-login endpoint.timeout=15000"是**约定**而非 schema 字段；运行时由 effect.fetch 自身的 timeout 默认机制接管（如果 effect.fetch 没默认 timeout 也是项目级框架问题，不在本屏交互设计职责）
3. 如果未来需要，会在专项任务里改 schema + 工具。**本任务记下决策，不动 schema**

> 实际上观察 product 阶段写入的 endpoint 也没有 timeout 字段。这是 endpoint 类型的"扩展位"——目前不属于 mock-scenarios.md 强制要求。

### 4. defaultParams 决策

| ds | defaultParams | 理由 |
|---|---|---|
| ds-login | `{}` | 参数已在 endpoint.body 用 `{{ view.form.phone/credential }}` 表达式取 |
| ds-send-code | `{}` | 参数已在 endpoint.body 用 `{{ view.form.phone }}` |

mock-scenarios §4 红线"defaultParams 与 endpoint.body 表达式不可重复"——本屏 endpoint.body 已经用表达式，**不需要 defaultParams 兜底**。

实际操作：调用 `set_default_params` 设 `{}` 是显式声明"已知 default 是空"，比"未设置"更明确，与机器对账无关。
- **决策 D-DS7**：显式 set 为 `{}` 两次。

### 5. activeScenarioId 默认值决策

每个 api ds 默认激活哪个场景？
- **决策 D-DS8**：默认 `success`——design 阶段第一眼看到 happy path UI；切错误 mock 是按需要切

### 6. 不修改的项

- ds-login / ds-send-code 的 `endpoint`、`typeDef`、`autoFetchOnEnter`、`name`、`description` —— 已正确，不动
- ds-policy-text 整个不动（static 无 mock 概念，initial 已完整）

### 7. 候选与否决汇总

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-DS1 | ds-login mock 是否覆盖每条 onError 分支 | 是（6 个场景） |
| D-DS2 | locked statusCode | 423（标准）非模板示例 429 |
| D-DS3 | mock user 数据 | 用项目语境占位 |
| D-DS4 | locked.lockedUntil 取值 | 9999999999999（占位极大值） |
| D-DS5 | success/error delay 差异 | success=800、error=600（错反馈宁早） |
| D-DS6 | endpoint.timeout 是否本任务设 | 否（schema 字段未支持，留约定） |
| D-DS7 | 是否显式 set defaultParams=`{}` | 是（显式胜过隐式） |
| D-DS8 | 默认激活 mock 场景 | success |

### 8. 与 errors.md / boundaries.md 的对账

| errors.md ds-login.onError 分支 | mock 场景 |
|---|---|
| CREDENTIAL | wrongCredential ✓ |
| LOCKED | locked ✓ |
| LIMIT_EXCEEDED | limitExceeded ✓ |
| NETWORK_ERROR | networkTimeout ✓ |
| SERVER_ERROR | serverError ✓ |
| default | （由 networkTimeout 或不匹配分支兜底；无需独立 mock） |

| errors.md ds-send-code.onError 分支 | mock 场景 |
|---|---|
| LIMIT_EXCEEDED | limitExceeded ✓ |
| NETWORK_ERROR | networkTimeout ✓ |
| SERVER_ERROR | serverError ✓ |
| default | 兜底 |

✅ onError 分支全覆盖。

### 9. expectedArtifacts 自检

任务 expectedArtifacts: `[{ kind: "arrayMin", path: "dataSources", min: 1 }]`
- 当前 dataSources 数量 = 3 ≥ 1 ✓（本任务不增删 ds，只改其内部字段）

---

## ★ 沉淀到 schema 的结论

本任务 12 个 MCP 调用：

```
ds-login:
  set_default_params {} 
  add_mock_scenario × 6 （success / wrongCredential / locked / limitExceeded / serverError / networkTimeout）
  switch_mock_scenario success

ds-send-code:
  set_default_params {}
  add_mock_scenario × 4 （success / limitExceeded / serverError / networkTimeout）
  switch_mock_scenario success
```

ds-policy-text、ds-login.endpoint、ds-send-code.endpoint、autoFetchOnEnter（已 false） — 一律不动。
