> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-view-feedback
> 对应 schema 字段：本屏判定不新建节点（详见下文 §2 主动审视）

# Step I-M1-view-feedback: 00-login — 过渡反馈节点

> 详细方法见 `methodology/07-derivative-views.md` 类 6。
> 上游依赖：events.md（actions 形式的 Toast / 动态 textContent 倒计时）/ view-business.md（LockedCountdown 节点）。

## 1. 主动 UX 缺口审视（不只是盘点现状）

> 不是"看看现状有什么、没什么也不补"——而是**站在用户视角穷举每一个用户动作的瞬间，问：UI 反馈到位吗？**

### 1.1 用户动作 ↔ 反馈到位度全表

| # | 用户动作 | 当前反馈 | 评估 |
|---|---|---|---|
| 1 | 输入手机号 → 失焦 | PhoneError 行内（红字） | ✓ 已落 |
| 2 | 输入凭证 → 失焦 | CredentialError 行内 | ✓ 已落 |
| 3 | 切换登录方式 | UI 模式切换（label/placeholder/visibleWhen 联动） | ✓ 已落 |
| 4 | 勾选/取消协议 | bind 自动同步；SubmitBtn condition 守 | ✓ 已落 |
| 5 | 点击眼睛切显隐 | passwordVisible 切换 + input.type 切换 | ✓ 已落 |
| 6 | **点 SubmitBtn 但 condition 不满足** | **disabled 静默拦截**（无 tooltip）| ⚠️ 见 §1.2A |
| 7 | 点 SubmitBtn 提交中 | SubmitSpinner + "登录中…" 文字 | ✓ view-loading |
| 8 | 提交成功 | nav.go("01-home") 直接离屏 | ✓ events |
| 9 | 提交失败（5 种）| Toast | ✓ events.actions |
| 10 | 点 GetCodeBtn 发送中 | CodeSendSpinner + "发送中…" | ✓ view-loading |
| 11 | GetCodeBtn 发送成功 | **Toast "验证码已发送"** + 倒计时按钮文案 | ✓ events.actions（见 §1.2B 选型论证）|
| 12 | GetCodeBtn 倒计时（每秒变化）| 按钮 textContent 动态 "重新获取 (Ns)" | ✓ events 动态文案 |
| 13 | GetCodeBtn 失败（4 种）| Toast | ✓ events.actions |
| 14 | 锁定中点任意按钮 | NormalFormView 整体被 LockedView 替换 | ✓ view-business |
| 15 | 锁定倒计时（每秒）| LockedCountdown 节点 mm:ss 实时显示 | ✓ view-business |
| 16 | 锁定倒计时归零 | NormalFormView 自动重现 | ✓ view-business（visibleWhen 自动判）|
| 17 | 进屏 / 离屏 | screenEnter 副效果 / screenExit 清理 | ✓ events |
| 18 | 离线 / 弱网 | 全局 globalOverlays banner（network 共享） | ✓ project.globalOverlays |
| 19 | 点底部链接（注册 / 忘记密码）| nav.go 跳转 | ✓ events |
| 20 | 点协议链接 | ui.openUrl 打开富文本 | ✓ events（PolicyText 延后到 design 拆 3 子节点）|

20 个用户动作的反馈到位度审视后，**只有 #6 是潜在缺口**。

### 1.2 两个值得专门论证的 UX 决策

#### A. #6 condition 静默拦截无 inline 反馈

**潜在缺口**：用户填了手机号但忘勾协议，反复点 SubmitBtn 没反应——用户疑惑"为什么按钮点不动"。

**候选方案**：
- 候选 A1：保持现状（disabled 视觉 + cursor:not-allowed 视觉提示由 design 阶段补）
- 候选 A2：建 SubmitBtnTooltip 节点，visibleWhen 接 "用户尝试点击但 condition 不满足"，显示拦截原因（"请先同意协议" / "请输入正确手机号"）
- 候选 A3：保留 disabled，但 design 阶段加 hover tooltip（动机文字浮层）

**决策：A1** —— 理由：
1. **阶段责任划分**：condition 静默拦截是 events 任务的决策（D-EV2），用 disabled 视觉态告知是 design 阶段的决策。本任务（view-feedback）不应跨界改 events 行为
2. **真要改属于 challenge 范畴**：要让点击 disabled 按钮触发 tooltip，需要给 SubmitBtn 加非 disabled state 的 click event + 在 condition.when=false 时分支处理——这是**改 events 已锁定决策**，应走 UpstreamChallenge 协议（§5.5），而本审视判定动机不充分（disabled 视觉 + product rules 第 6 条 "协议必勾"已经在表单顶部 PolicyRow 做了视觉前置）
3. **错误前置**：手机号 / 凭证错误已通过 onBlur 行内提示提前给反馈，到点 SubmitBtn 时只剩"协议未勾"这一个原因——而 PolicyRow 就在 SubmitBtn 上方，视线不需要远跳

→ 不引入新节点，由 design 阶段处理 disabled 视觉态。

#### B. #11 验证码发送成功用 Toast 还是 InlineSuccess？

**两条候选**：
- 候选 B1（已采纳，events D-EV* 落库）：`ui.showToast { type: "success", message: "验证码已发送" }`
- 候选 B2：建 CodeSentHint 节点（GetCodeBtn 旁边），visibleWhen 接 `view.codeSentAt + 3000 > Date.now()`

**论证 B2 是否真有优势**：
- B2 优势：贴近触发点，视线不需移动到 Toast 区域
- B2 代价：① 引入新 view 变量 codeSentAt；② 引入新 timer 在 3 秒后清；③ 与 GetCodeBtn 区域内已有的"重新获取(Ns)"文案视觉冲突（同一区域两个 success 信号叠加）；④ Toast 已经能"自动消失" + "贴近顶部"的优势 InlineSuccess 没有
- 综合：候选 B2 没有显著 UX 优势，反而引入双轨 state（codeSentAt + codeCountdown）和 timer 复杂度

**决策：B1（保持 events 已落库的 Toast）** —— 理由：
- Toast 与本屏其他 5xx / NETWORK / LIMIT 反馈风格统一
- 倒计时按钮文案 "重新获取(Ns)" 自身就是隐式成功证据（按钮变了态说明发出去了）
- 不在本任务引入新 view 变量，也不发起 challenge 改 events 决策

→ 不引入新节点。

### 1.3 5 类反馈的最终判定表

| 类 | 类型 | 本屏需求 | 落位形式 |
|---|---|---|---|
| 1 | Toast | ✓ 多场景 | actions（events.md 落，无节点）|
| 2 | Snackbar | ❌ 无可撤销动作 | — |
| 3 | InlineSuccess | ❌ 候选 B 论证后否决 | — |
| 4 | ProgressBar | ❌ 无文件上传 / 长流程 | — |
| 5 | Countdown | ✓ 两处 | GetCodeBtn 动态文案（events，无节点）+ LockedCountdown（view-business 已建节点）|

---

## 2. 候选方案与否决（综合表）

| 候选 | 决策 | 理由 |
|------|------|------|
| 给 #6 建 SubmitBtnTooltip 节点 | ❌ 否决 | 跨阶段责任（events 决策已锁）；要改走 challenge 协议；当前 disabled 视觉前置 |
| 给 #11 建 CodeSentHint 节点 | ❌ 否决 | 与按钮文案视觉冲突；Toast 已胜任；引入新双轨 state |
| 给 GetCodeBtn 失败建 InlineErrorHint | ❌ 否决 | events 已用 Toast 风格统一；Toast 4 个 case 文案各异，inline 单节点 textContent 切表达式更复杂 |
| 给 #4 协议勾选成功建 InlineHint | ❌ 否决 | bind 即时同步是隐式反馈（checkbox 视觉变化），无需重复 |

---

## 3. 决策记录

- **D-VF1**：Toast 用 `ui.showToast` action 不建节点 —— 与 methodology 类 6 一致，避免节点污染
- **D-VF2**：CodeCountdown 不建独立节点 —— 复用 GetCodeBtn 动态 textContent（events D-EV5 / state-vars D-S2 决策链）
- **D-VF3**：LockedCountdown 节点已在 view-business 任务建（id=nd_e3c2865fa1b04412936ea）—— 本任务不重建
- **D-VF4**：condition 静默拦截不引入 inline tooltip —— 阶段责任划分；真要改走 UpstreamChallenge
- **D-VF5**：验证码发送成功用 Toast 不用 InlineSuccess —— 论证后 B2 候选无显著优势 + 引入双轨 state
- **D-VF6**：本任务 status='skipped'（无 schema 产物）—— 与 view-empty / view-auth 一致约定

---

## 4. 红线自查

| 红线 | 状态 |
|------|------|
| R-VIEW-VISIBLE-01 | ✅ 通过 不新建节点 |
| 阶段边界 | ✅ 通过 不重组 product 节点；不写 styles |
| 三轴覆盖 | ✅ 20 个用户动作 / 5 类反馈全部主动审视 |

---

## 5. 与其他任务的协同

| 上游 / 兄弟任务 | 协同点 |
|----------------|-------|
| events.md SubmitBtn / GetCodeBtn onError | Toast 全部走 ui.showToast actions ✓ |
| events.md GetCodeBtn onSuccess | Toast "验证码已发送" + 倒计时启动 ✓ |
| events.md D-EV5 GetCodeBtn 动态 textContent | CodeCountdown 复用 ✓ |
| view-business LockedCountdown 节点 | LockedCountdown 已落 ✓ |
| view-loading SubmitSpinner / CodeSendSpinner | 加载反馈归 view-loading 不归本任务 ✓ |
| state-vars D-S2 不建 codeSending / codeSentAt | 与本任务 D-VF2 / D-VF5 一致 ✓ |
| project.globalOverlays network banner | 离线全局态共享，不在本屏建 ✓ |

---

## 6. 给 design-planner 的提示

design 阶段实施时：

- **SubmitBtn / GetCodeBtn disabled 态视觉**：必须明确告知不可点（cursor:not-allowed + 灰色 + opacity 等），不依赖文字提示
- **Toast 视觉规格**：与 themeConfig 协调，保证 success / error / info 三色清晰区分
- **PolicyRow 上方留白 / 视觉分组**：让"未勾协议是 SubmitBtn 不可点的唯一剩余原因"在视觉上一目了然