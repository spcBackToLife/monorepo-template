> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-loading
> 对应 schema 字段：screen.meta.interaction.loadingStrategy

# Step I-loading: 00-login — 加载策略 5 场景

> 详细方法见 `methodology/03-loading-strategy.md`。
> 上游依赖：operations.md（#8 GetCode / #13 SubmitLogin / #16 离屏；决策 D1 提交 L2 vs L3）；statemachine.md（code-sending / submitting 状态）。

## 推理过程

### 0. 数据源全量盘点（决定 5 场景适用性的根本依据）

本屏 dataSources（取自 product 阶段已落库 schema）：

| ID | 类型 | 触发方式 | 是否需要"加载态视觉" |
|----|-----|---------|------------------|
| ds-login | api / POST | click SubmitBtn（用户主动）| ✅ 按钮内 spinner |
| ds-send-code | api / POST | click GetCodeBtn（用户主动）| ✅ 按钮内 spinner |
| ds-policy-text | static（initial 内置常量）| 无 fetch；同步可读 | ❌ 无加载态 |

**关键观察**：本屏没有"列表型 / 数据源驱动整页内容"的 dataSource——两个 api 都是"用户点了某按钮才发一次请求"的提交型。这直接决定了下面 5 场景的取舍。

### 1. 5 场景逐项判断

#### initial（首次加载 / cold start）

> 定义：进屏时为了渲染主内容必须发起的 fetch；fetch 中要给用户"系统正在加载"的视觉反馈（典型如 feed 列表骨架屏）。

- **本屏是否适用**：**否**
- **理由**：
  1. 本屏无 `autoFetchOnEnter=true` 的 dataSource（ds-login/ds-send-code 都是 false）
  2. 进屏时所有视觉内容（HeaderArea / FormCard / FooterLinks 文案）都是静态或 ds-policy-text 同步可读
  3. screenEnter 的副作用是 session 检查（同步 if 判断）+ 启动 lockedCountdown 定时器（如有）——都没有 async UI 等待
- **结论**：`"无（首屏 cold start 无异步 fetch）"`

#### refresh（下拉刷新）

- **本屏是否适用**：**否**
- **理由**：登录页是"工具屏 / 表单屏"，没有"主数据列表"概念；下拉刷新本质是 reload list，不适用
- **结论**：`"—"`（按 schema-spec 红线，必须显式写 "—" 而不是省略 key）

#### pagination（加载更多 / 分页）

- **本屏是否适用**：**否**
- **理由**：无列表节点
- **结论**：`"—"`

#### button（按钮请求 / 提交）

- **本屏是否适用**：**是**（核心场景，两个按钮都吃这套）
- **覆盖**：
  - **SubmitBtn**（ds-login）：见 operations 决策 D1 — 用 **L2 按钮内 spinner + 文字"登录中…" + 全表单 disabled**，不用 L3 全屏 LoadingOverlay
  - **GetCodeBtn**（ds-send-code）：用 **按钮内 spinner + 文字"发送中…" + 仅按钮 disabled**（不锁全表单——用户可能边等边继续输手机号）
- **配套 view 变量**：
  - `view.submitting`（已在 product 阶段 stateInit 占位）—— ds-login pending 期间为 true
  - **不需要**为 GetCodeBtn 单独建 view.codeSending —— 直接用 `state.effects['ds-send-code'].status === 'pending'` 表达即可（effect.fetch 自动维护）
  - 决策依据：state-completion 红线"避免与 effect 自动态重复声明派生 view 变量"
- **结论**：`"两类按钮请求都用按钮内 spinner：SubmitBtn=spinner+文字'登录中…'+全表单 disabled（state.view.submitting / state.effects['ds-login'].status==='pending'）；GetCodeBtn=spinner+文字'发送中…'+仅按钮 disabled（state.effects['ds-send-code'].status==='pending'）。两者均不使用全屏 LoadingOverlay（决策 D1 见 operations.md）"`

#### silent（静默刷新 / 后台同步）

- **本屏是否适用**：**否**
- **理由**：登录页用户全程主动操作；不存在"后台静默拉取"的需求
  - locked 解锁是定时器到点 → 主动 state.set，没有 fetch
  - 验证码倒计时同样是本地 timer，没有 fetch
- **结论**：`"—"`

### 2. 衍生节点对应（由 I-M1-view-loading 任务后续建）

| 场景 | 推荐节点 | visibleWhen 表达式 |
|------|---------|-------------------|
| button - SubmitBtn | `SubmitSpinner`（SubmitBtn children 内的 spinner 子节点）| `{{ state.view.submitting }}` 或 `{{ state.effects['ds-login'].status === 'pending' }}` |
| button - GetCodeBtn | `CodeSendSpinner`（GetCodeBtn children 内）| `{{ state.effects['ds-send-code'].status === 'pending' }}` |

**未建节点**（无 initial / refresh / pagination / silent，因此无对应骨架/列表底 spinner/下拉/细线）。

⚠️ I-M1-view-loading 任务在执行时要按本表的"否"项写明 status=skipped + 否决理由（理由就是本 md 的逐项判断）。

### 3. 候选与否决（关键决策）

#### 决策 L1：SubmitBtn 用按钮内 spinner 还是全屏 LoadingOverlay？

已在 operations.md 决策 D1 详细记录，本表保持一致：**按钮内 spinner**。理由摘要：风格契合（简约 + 校园温度）+ 守卫已足够（condition + submitting + 表单 disabled）。

#### 决策 L2：GetCodeBtn 用 view.codeSending 还是 state.effects['ds-send-code'].status？

- **候选 A**：派生 `view.codeSending: false`，在 click → state.set true → onSuccess/onError → state.set false
- **候选 B**：直接读 `state.effects['ds-send-code'].status === 'pending'`（effect.fetch 自动维护）
- **决策**：**B**——避免与 effect 自动态重复声明，符合 state-completion 红线
- 注意：SubmitBtn 的 `view.submitting` 之所以保留，是因为：
  - product 阶段已经在 stateInit 占位（不能凭空删 product 已建的 view）
  - 它在 condition.when 守卫里被读（"!submitting"），与 effects.status 语义略有差别（"我已经按下提交但还没真正进 fetch 的 800ms 防抖窗口"也算 submitting=true）
- 这条决策在 I-M1-state-vars 任务详细记录

#### 决策 L3：登录提交是否清空旧错误？

- 不属于 loading 范畴，留 errors.md 任务讨论。

#### 决策 L4：ds-send-code 是否启用 `autoFetchOnEnter`？

- **候选 A**：启用——自动发一条欢迎验证码
- **候选 B**：不启用（保持 product 阶段默认 false）
- **决策**：**B**——用户没主动请求就发短信会被运营商风控；产品 rules 也明确"用户点击 GetCodeBtn 才发"

### 4. 配套 view 变量验收（loading 视角）

| 变量 | 当前是否在 stateInit | 何时置 true | 何时置 false | 决策 |
|---|---|---|---|---|
| view.submitting | ✅ 已占位（product M1-state-shape）| SubmitBtn click（onSubmit 链第 1 步 state.set true）| ds-login.onSuccess / onError 第 1 步 state.set false；screenExit 也置 false | 保留（语义略宽于 effects.status）|
| view.codeCountdown | ❌ 待 I-M1-state-vars 任务补 | ds-send-code.onSuccess→60；ui.startTimer.onTick→-1 | onComplete→0；screenExit→0 | 该变量不属 loading 而属 timer 副作用，但 GetCodeBtn 的"重新获取 (Ns)" 文案靠它 |

> 派生变量的完整化在 I-M1-state-vars 任务做。本任务只确认 loading 这一维度需要哪些变量，列入清单。

### 5. 与 product rules 对账（仅 loading 相关）

| product rule | loading 视角对应 |
|---|---|
| 验证码倒计时 view.codeCountdown∈[0,60]，发送成功 0→60 启动 ui.startTimer | code-countdown 状态期间 GetCodeBtn 文字"重新获取 (Ns)"；不属于 loading 但与 GetCodeBtn 的 button 场景共享按钮 |
| 提交 800ms 防抖 + view.submitting 守卫 | button 场景守卫前置 |
| screenExit 触发 effect.cancel ds-login + ui.stopTimer codeCD | 离屏清理（在 #16 operation） |

✅ loading 维度的 product rules 全部覆盖。

---

## ★ 沉淀到 schema 的结论

本任务 1 个 MCP 调用：

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId:  "sc_27ee2293945046b69cc00",
  patch: {
    interaction: {
      loadingStrategy: {
        initial:    "无（首屏 cold start 无异步 fetch；ds-login/ds-send-code 均 autoFetchOnEnter=false）",
        refresh:    "—",
        pagination: "—",
        button:     "两类按钮请求都用按钮内 spinner——SubmitBtn=spinner+文字'登录中…'+全表单 disabled（state.view.submitting / state.effects['ds-login'].status==='pending'）；GetCodeBtn=spinner+文字'发送中…'+仅按钮 disabled（state.effects['ds-send-code'].status==='pending'）。均不使用全屏 LoadingOverlay（决策 D1）",
        silent:     "—"
      }
    }
  }
}
```

> 5 场景全部显式给值（不适用用 "—"）；button 场景描述包含两个按钮的差异化策略 + 表达式来源。
> 对应衍生节点（SubmitSpinner / CodeSendSpinner）由 I-M1-view-loading 任务建。
