> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：（v2.6 NetworkPolicy 配套补译，并入 ds-timeouts 任务范围）
> 对应 schema 字段：
>   - GetCodeBtn(nd_e6783f85edb3499c9f131).events[0].onError.logic.switch.cases 加 TIMEOUT case
>   - SubmitBtn(nd_5a15fd87f060436295b4f).events[0].actions[2].else[2].effect.fetch.onError.logic.switch.cases 加 TIMEOUT case

# Patch v2.6 配套 — 错误码 TIMEOUT 独立 case 补译

---

## 背景

v2.6 NetworkPolicy 改造把 `TIMEOUT` 从 `NETWORK_ERROR` 拆分独立——但现有 SubmitBtn / GetCodeBtn 的 onError logic.switch 只有 NETWORK_ERROR case，没有 TIMEOUT case。

**事实链**（grep 出来的）：
- MockDriver 第 77 行已用 `code: 'TIMEOUT'`（早就这样写）
- 现有 events 落库时 `errors.md` 的 6 类错误把"超时"归到 NETWORK_ERROR → AI 写的 onError logic.switch 没有 TIMEOUT case
- 当 mock 触发 networkTimeout 场景（delay=16000+isTimeout=true）→ runtime 返 code='TIMEOUT' → 进 default 分支兜底（"出了点问题，请稍后重试"）
- 用户体验上"超时"被错误地归类为"未知错误"

**根本性**：这是 v2.6 错误码标准化的"上层未对齐"问题——runtime 已经分了，UI 反馈层没分。补这一刀让 v2.6 真正闭环。

## 改动清单

### GetCodeBtn (nd_e6783f85edb3499c9f131) onError 增加 TIMEOUT case

新加 case 顺序在 LIMIT_EXCEEDED 之后、NETWORK_ERROR 之前：
```jsonc
{ when: "TIMEOUT", actions: [
  { type: "ui.showToast", message: "请求超时，请检查网络后重试", toastType: "error" }
]}
```

文案与 NETWORK_ERROR 区分：
- TIMEOUT：「请求超时，请检查网络后重试」（链路慢，用户该重试）
- NETWORK_ERROR：「网络异常，请检查后重试」（断网/DNS，用户该开网络）

### SubmitBtn (nd_5a15fd87f060436295b4f) onError 增加 TIMEOUT case

同位置加 case，case 顺序：CREDENTIAL → LOCKED → LIMIT_EXCEEDED → **TIMEOUT** → NETWORK_ERROR → SERVER_ERROR。

文案与 GetCodeBtn 一致。

⚠️ TIMEOUT 不累加 view.failureCount（与 NETWORK_ERROR 一致）—— 弱网误锁是 D-B1 边界设计的关键之一，超时也属于"非用户责任"的失败。

## 验证（mock 跑通验证）

| 触发场景 | 期望 onError 走 case | 期望 Toast 文案 |
|---|---|---|
| ds-login mock=networkTimeout（delay 16000ms + isTimeout=true）| TIMEOUT | "请求超时，请检查网络后重试" |
| ds-send-code mock=networkTimeout（delay 11000ms + isTimeout=true）| TIMEOUT | 同上 |
| 真接口超过 networkPolicy.timeout（15000/10000ms）| TIMEOUT | 同上 |
| 真接口断网（DNS 失败 / connection refused）| NETWORK_ERROR | "网络异常，请检查后重试" |

之前的兜底分支（"出了点问题"）现在专门兜真"未知错误码"，符合 errors.md 决策 D-E3。

## 与 v2.6 平台改造的对应关系

| Layer | 配套改动 |
|---|---|
| L1 schema | ✓ ErrorCode = 'TIMEOUT' \| 'NETWORK_ERROR' \| 'SERVER_ERROR'（已加）|
| L4 runtime | ✓ MockDriver/HttpDriver 5xx 归一化 SERVER_ERROR + AbortController.abort(reason=timeout) → TIMEOUT |
| **业务侧 events** | **✓ 本 patch：SubmitBtn / GetCodeBtn onError 加 TIMEOUT case + 文案区分** |
| 文档 | ✓ errors.template.md 6 类错误表已加 TIMEOUT 行；events.template.md SubmitBtn 示例已加 TIMEOUT case 注释 |

→ v2.6 错误码标准化端到端闭环。
