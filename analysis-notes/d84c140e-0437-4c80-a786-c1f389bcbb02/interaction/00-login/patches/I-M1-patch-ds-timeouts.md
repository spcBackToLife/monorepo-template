> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-patch-ds-login-timeout + I-M1-patch-ds-send-code-timeout（合并写）
> 对应 schema 字段：dataSources[id=ds-login].endpoint.networkPolicy + dataSources[id=ds-send-code].endpoint.networkPolicy
> 上游来源：v2.5-dam-process-overhaul-decision.md §5 第 4/5 条 + boundaries.md D-B1 + platform-improvements/v2.6-network-policy.md（平台改造）

# Patch I-M1-patch-ds-{login,send-code}-timeout — networkPolicy 补译

---

## ☐ 翻译清单 todo

来源：boundaries.md D-B1 「ds-login timeout=15000ms / ds-send-code timeout=10000ms」+ datasources.md D-DS6 当时延后理由「schema 不支持 endpoint.timeout」。

逐条 todo：

- [x] **I-M1-patch-ds-login-timeout**：ds-login.endpoint.networkPolicy = { timeout: 15000, retryCount: 0, retryOn: ['TIMEOUT','NETWORK_ERROR'] } → `nonEmpty path: dataSources[*].endpoint.networkPolicy.timeout`
- [x] **I-M1-patch-ds-send-code-timeout**：ds-send-code.endpoint.networkPolicy = { timeout: 10000, retryCount: 0, retryOn: ['TIMEOUT','NETWORK_ERROR'] } → 同上
- [x] **平台改造**（前置完成）：扩 `ApiEndpoint.networkPolicy` + EffectExecutor 真消费 + MCP `set_network_policy` action + 编辑器 UI（详见 `analysis-notes/.../platform-improvements/v2.6-network-policy.md`）

→ 全勾 ✓ 才能写"沉淀"段。

---

## 推理过程

### 1. 历史现场还原

datasources.md D-DS6 当时的判断（v2.5 之前）：
> 跳过 endpoint.timeout 设置——data_source 工具描述里 set_endpoint 没明确支持 timeout 字段；如果未来需要，会在专项任务里改 schema + 工具。**本任务记下决策，不动 schema**

v2.5 §5 第 4/5 条复盘：
> 应在本阶段落

→ 但 v2.5 写复盘时**没核实 schema 是否支持** —— 查 grep 后实证 `ApiEndpoint`/zod schema/ops/EffectExecutor 五层全无 timeout 字段。这不是 AI 漏译，是**平台缺一等公民字段**。

### 2. 第一性原理决策

按"做对"（不是"够用"）原则：扩抽象一次到位，避免下次又得改 N 个地方。

**抽象层次**：
- ❌ 平铺 `endpoint.timeout: number` —— 下次加 retry/circuitBreaker 又得改 ApiEndpoint 顶层
- ✅ **`endpoint.networkPolicy` 子结构**：表达"网络层关注点"语义边界，与业务字段（method/path/body）解耦

**完整字段集**：
```ts
NetworkPolicy = {
  timeout?: number;           // 整请求超时；触发 onError code='TIMEOUT'
  retryCount?: number;        // 重试次数（不含首次）；默认 0
  retryDelay?: number;        // 指数退避基数；间隔 = base × 2^attempt
  retryOn?: ErrorCode[];      // 默认 ['TIMEOUT', 'NETWORK_ERROR']
}
```

**错误码标准化（同步 v2.6）**：
- TIMEOUT 从 NETWORK_ERROR 拆分（"用户该重试" vs "用户该开网络"语义不同）
- HttpDriver / MockDriver 5xx 归一化为 SERVER_ERROR；4xx 保留原数字 code
- AbortController.abort(reason) 区分 cancel vs timeout

详见 `analysis-notes/.../platform-improvements/v2.6-network-policy.md`。

### 3. 取值决策（参考 mock-scenarios.md §4.5 取值建议表）

| ds | timeout | retryCount | 理由（按"关键认证流"档位）|
|---|---|---|---|
| ds-login | 15000 ms | 0 | 重试登录 = 多次锁账号风险；用户主动重试更安全；与 boundaries D-B1 一致 |
| ds-send-code | 10000 ms | 0 | 重试发短信 = 重复扣费 / 短信轰炸；同上 |

retryOn 使用默认值显式声明（['TIMEOUT', 'NETWORK_ERROR']）—— 即使 retryCount=0 不会真重试，显式声明让 review 时一眼知道"如果改 retryCount=N 时哪些错触发重试"。

### 4. 不动的字段

- mock.scenarios（含 networkTimeout 场景的 delay=16000/11000 + isTimeout=true）→ 保留，与 networkPolicy.timeout 是"独立两套机制"（mock 行为 vs 真接口阈值），共存合法
- endpoint.body / method / path / responseSchema → 100% 不动（用 set_network_policy 而非 set_endpoint，正是为了避免误重置）
- defaultParams / autoFetchOnEnter / typeDef → 不动

### 5. 三轴覆盖核对（仅本 patch）

| 决策 | 体现 | ✓/❌ |
|---|---|---|
| boundaries D-B1 ds-login timeout=15000 | dataSources[id=ds-login].endpoint.networkPolicy.timeout=15000 | ✓ |
| boundaries D-B1 ds-send-code timeout=10000 | dataSources[id=ds-send-code].endpoint.networkPolicy.timeout=10000 | ✓ |
| 超时不计 failureCount | SubmitBtn.onError 现有 NETWORK_ERROR 分支不动 failureCount → 也覆盖 TIMEOUT 兜底（v2.6 后续可独立 TIMEOUT case 优化文案） | ✓（兜底） |

⚠️ **后续配套（不在本 patch，由 events 模板已记录）**：SubmitBtn.onError + GetCodeBtn.onError 的 logic.switch 加独立 TIMEOUT case（Toast"请求超时，请检查网络后重试" vs NETWORK_ERROR Toast"网络异常..."）。当前 mock 走 networkTimeout 场景仍能命中——会落到 default 分支兜底（"出了点问题"+ reportError）；不影响 demo 跑通，但用户体验上 TIMEOUT 文案应独立。

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) ds-login networkPolicy
data_source/set_network_policy {
  projectId, screenId,
  dataSourceId: "ds-login",
  networkPolicy: { timeout: 15000, retryCount: 0, retryOn: ["TIMEOUT","NETWORK_ERROR"] }
}

// 2) ds-send-code networkPolicy
data_source/set_network_policy {
  projectId, screenId,
  dataSourceId: "ds-send-code",
  networkPolicy: { timeout: 10000, retryCount: 0, retryOn: ["TIMEOUT","NETWORK_ERROR"] }
}

// 3) 解 blocked + 标 done
meta/update_plan_task { taskId: "I-M1-patch-ds-login-timeout",     patch: { status: "done", notes: "..." } }
meta/update_plan_task { taskId: "I-M1-patch-ds-send-code-timeout", patch: { status: "done", notes: "..." } }
```

### 后置自检

- [x] 两个 ds 各自 networkPolicy 已写
- [x] timeout 数值与 boundaries D-B1 一致
- [x] retryCount=0（关键认证流不重试）
- [x] retryOn 显式声明，留扩展位
- [x] mock scenarios / endpoint 其他字段 100% 不动
