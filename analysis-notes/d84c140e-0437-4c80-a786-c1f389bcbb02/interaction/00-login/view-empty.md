> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-view-empty
> 对应 schema 字段：本任务无 schema 落库（status=skipped）

# Step I-view-empty: 00-login — 空态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 2。
> 详细 schema 见 `schema-spec/derivative-views.md` §2。
> 上游依赖：datasources.md（3 个 ds 全量盘点）/ skeleton.md（24 业务节点结构）/ statemachine.md（9 状态机无空态分支）。

## 推理过程

### 1. 适用性判定（穷举 4 类空态 + 本屏特有）

| 空态场景 | 是否需要 | 节点 name | visibleWhen | 否决理由 |
|---------|---------|----------|-------------|---------|
| ① 列表空态（list empty）| ❌ | — | — | 本屏 dataSources 无列表型——ds-login(写入型)/ds-send-code(写入型)/ds-policy-text(static 常量)，全部不返回 array。无 `repeat` 节点存在（events.md 落库时 0 处 repeat）|
| ② 搜索无结果（search empty）| ❌ | — | — | 本屏无搜索框；state.view 无 searchKw 字段。登录是表单输入，不是查询场景 |
| ③ 筛选无结果（filter empty）| ❌ | — | — | 本屏无筛选 UI；state.view 无 filterActive / filterCriteria 字段 |
| ④ 离线无缓存（offline no data）| ❌ | — | — | 本屏无需 cached data：登录态本身在 globalView.session（全局），离线时 SubmitBtn 由 condition.when 含 `network.status !== 'offline'` 直接拒绝提交（events.md SubmitBtn / GetCodeBtn condition），用户看到的是按钮 disabled + 全局离线横幅（globalOverlays.global-offline-banner），不是"列表空"语义 |
| ⑤ 本屏特有：协议未勾时 SubmitBtn 不可点 | ❌ | — | — | 不属空态——属于"按钮 disabled 守卫"，由 SubmitBtn condition.when `view.form.policy === true` 守 + 视觉上 design 阶段 visualState=disabled。空态是"数据维度的空"，不是"输入未完成"|
| ⑥ 本屏特有：未输入手机号 | ❌ | — | — | 同上，输入校验/守卫语义，不是空态 |
| ⑦ 本屏特有：登录失败 0 次 | ❌ | — | — | failureCount=0 是默认初始态，不是"空"。登录页不展示历史失败列表 |

**结论**：**本任务 status=skipped**——本屏完全无空态视图需求。

### 2. 候选与否决（关键决策）

#### 决策 D-VE1：要不要给"未填手机号 / 未勾协议"建一个 EmptyFormState？

- **候选 A**：建 EmptyFormState 节点，引导用户从 0 开始（"快开始登录吧"+ 箭头指向 PhoneInput）
- **候选 B**：不建——表单本身就是引导，PhoneInput 的 placeholder "请输入手机号" 已经在指导
- **决策**：**B**——理由：
  - 表单屏的"空"是默认态，不是异常态；空态视图是为"用户预期有内容但实际没有"设计的（feed 列表空 / 搜索无果），不适用于"用户来这里就是为了输入"
  - product rules 没有"引导动画 / 引导文案"的需求；额外建节点反而增加视觉噪音，违 styleDirection.summary "极简留白"
  - 类似选择：iOS 系统登录界面、微信登录界面都没有空态引导

#### 决策 D-VE2：要不要给"未发码就提交（code 模式 credential 为空）"建提示？

- **候选 A**：建一个 NeverSentCodeHint 节点，在 loginMode='code' && !codeSent 时显示"先点'获取验证码'"
- **候选 B**：不建——errors 阶段 D-B3 已经决策"不在前端拦'未发码即登录'，由后端 ds-login 校 CREDENTIAL 兜底"；CredentialInput 失焦校验（events.md PhoneInput.blur 同款机制）也覆盖了空 credential 提示
- **决策**：**B**（沿用 boundaries D-B3）——避免与已有校验/Toast 链重复

#### 决策 D-VE3：locked 态算不算"空"？

- **候选 A**：locked 时的 LockedView 算空态（"暂时无法登录"）
- **候选 B**：locked 是业务状态机的一个 enum 值，归入 view-business 类
- **决策**：**B**——methodology/07 类 5（业务状态分支视图）明文承担状态机视觉化；boundaries D-B9 明确 LockedView 由 `I-M1-view-business` 任务建。本任务不抢

### 3. 红线自查

| 红线 | 是否触发 | 说明 |
|-----|---------|------|
| R-VIEW-EMPTY-01 | ❌ 不触发 | "列表型 dataSource 缺 empty 视图"——本屏无列表型 dataSource |
| R-VIEW-EMPTY-CONTENT-01 | ❌ 不触发 | 不建空态节点，无四要素验收对象 |
| 跳过留痕红线（skill §5.1） | ✅ 通过 | 本 md 已留逐项否决理由 + 3 个决策 |

### 4. 与 view-business 的边界

- **本任务**：抽象的"数据维度空" → 否决全部
- **view-business 任务（I-M1-view-business）**：业务状态机的 locked / locked-pending（依据 statemachine.md 9 状态）→ 由那个任务建 LockedView / NormalFormView 互斥子树
- 不重不漏 ✓

---

## ★ 沉淀到 schema 的结论

**本任务无 schema 落库**——`update_plan_task` 写：

```jsonc
meta/update_plan_task {
  projectId, scope: 'screen', screenId: 'sc_27ee2293945046b69cc00',
  taskId: 'I-M1-view-empty',
  patch: {
    status: 'skipped',
    notes: 'md: analysis-notes/d84c140e-.../interaction/00-login/view-empty.md；否决理由：本屏无列表型/搜索/筛选/离线缓存型 dataSource——ds-login/ds-send-code 都是写入型、ds-policy-text 是 static 常量；表单"空"是默认态非异常态，不需引导节点（决策 D-VE1）；未发码空 credential 由 boundaries D-B3 后端兜底（D-VE2）；locked 态归 I-M1-view-business（D-VE3）。R-VIEW-EMPTY-01/CONTENT-01 均不触发。'
  }
}
```
