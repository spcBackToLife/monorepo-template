> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-view-auth
> 对应 schema 字段：本任务无 schema 落库（status=skipped）

# Step I-view-auth: 00-login — 权限/身份态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 4。
> 详细 schema 见 `schema-spec/derivative-views.md` §4。
> 上游依赖：events.md（Root.screenEnter 已落 session.status='active' 直跳 01-home 门禁）/ global/state-fill.md（globalView.session 6 字段完整）/ statemachine.md（无 auth 子状态）。

## 推理过程

### 1. 适用性判定（4 类身份态 + 本屏特有）

| 身份场景 | 是否需要 | 节点 name | visibleWhen | 否决理由 |
|---------|---------|----------|-------------|---------|
| ① 未登录占位（NotLoggedInPlaceholder）| ❌ | — | — | **登录页本身就是 anonymous 入口**——anonymous 用户来此屏的目的就是"登录"，整个表单（HeaderArea/FormCard/FooterLinks）就是"未登录引导"。不需要再嵌套一层占位说"请登录"——会语义重复 |
| ② 游客横幅（GuestModeBanner）| ❌ | — | — | 本产品 product 阶段未定义"游客模式"（globalConcerns.session 仅区分 active / anonymous / expired，无 isGuest 字段），无对应概念 |
| ③ VIP 升级提示（VipUpgradePrompt）| ❌ | — | — | 校园社交 MVP 不含付费层级（product.summary 无 VIP/premium）；登录页也不展示需要 VIP 的内容 |
| ④ 实名认证提示（RealNameRequiredView）| ❌ | — | — | 实名认证流程在登录后进入功能模块时触发（不属本期 MVP）；登录页本身不依赖实名 |
| ⑤ 本屏特有：已登录用户进入登录页 | ❌ | — | — | events.md Root.screenEnter 已落门禁：`logic.if globalView.session.status === 'active' then nav.go 01-home`——直接跳走，不留在本屏，**不需要"已登录态视图"** |
| ⑥ 本屏特有：会话过期（status='expired'）进入登录页 | ❌ | — | — | global/overlay-events.md 已建 sessionReLoginBtn（globalOverlays.global-session-expired），由全局 modal 引导用户进 00-login + 自动写 authRedirectTo——抵达本屏时 session.status 已是 expired/anonymous，等同正常登录入口；本屏不需感知 expired 子状态 |
| ⑦ 本屏特有：locked 子状态视图 | ❌ | — | — | 归入 view-business 任务（账号锁定状态机），不属 auth 范畴 |

**结论**：**本任务 status=skipped**——本屏完全无权限/身份态视图需求。

### 2. 候选与否决（关键决策）

#### 决策 D-VA1：要不要建一个"已登录用户欢迎页"提示用户已经登录？

- **候选 A**：在 active 用户误入登录页时显示"你已登录为 XXX，是否切换账号？"
- **候选 B**：直接 nav.go 01-home，不允许停留
- **决策**：**B**（沿用 events.md Root.screenEnter 门禁）—— 理由：
  - product rules 第 2 条："进屏 session.status === 'active' 立即跳 01-home 避免重登"（明文写"避免重登"）
  - 切换账号是"我"模块的功能（设置 → 退出登录 → 重登），不该耦合到登录页 screenEnter

#### 决策 D-VA2：要不要为 expired 状态在登录页特殊提示？

- **候选 A**：在登录页顶部显示 "您的会话已过期，请重新登录" banner
- **候选 B**：交给 globalOverlays.global-session-expired modal（全局 listener 触发）+ authRedirectTo 让用户登录后自动跳回 → 登录页本身是中性入口
- **决策**：**B**——理由：
  - global-session-expired 已经在 overlay-events.md 建好（含 sessionReLoginBtn click 写 authRedirectTo + 清 session + nav.go 00-login）
  - 进入本屏时 modal 已经由全局展示过；本屏再加 banner 是噪音
  - HeaderArea 已含 BrandSlogan "找到校园同好"，是中性欢迎语，不区分初次登录 / 过期重登

#### 决策 D-VA3：authRedirectTo 是否在本屏建一个 hint "登录后将跳回 X 页面"？

- **候选 A**：FormCard 上方加 banner "登录后将跳回'我的动态'"
- **候选 B**：不显示——authRedirectTo 是技术性字段（onSuccess 末尾 nav.go 消费即清），用户感知是"按了登录就跳回原来的位置"，不需要前置告知
- **决策**：**B**——避免认知噪音；用户对"无缝跳回"的体验已经是默认期望

### 3. 红线自查

| 红线 | 是否触发 | 说明 |
|-----|---------|------|
| R-VIEW-AUTH-01 | ❌ 不触发 | "需要登录的屏缺 auth 视图节点"——本屏不是"需要登录后才能看的内容屏"，是登录入口屏本身。R-VIEW-AUTH-01 适用于 01-home / 02-feed 等业务屏，不适用本屏 |
| R-VIEW-VISIBLE-01 | ❌ 不触发 | 不建节点 |
| 跳过留痕红线（skill §5.1）| ✅ 通过 | 本 md 已留 7 项穷举 + 3 决策否决理由 |

### 4. 与全局态读写一致性

| 全局态字段 | 本屏读 | 本屏写 | 是否需要 view-auth 节点 |
|-----------|--------|--------|----------------------|
| globalView.session.status | ✅ Root.screenEnter 读（'active'→跳走）| ✅ SubmitBtn onSuccess 写 'active' | 不需——读是导航门禁，写是登录结果，UI 无需 auth 视图节点承载 |
| globalView.session.user | ✅ 同上 | ✅ 同上 | 同上 |
| globalView.nav.authRedirectTo | ✅ SubmitBtn onSuccess 读并消费 | ❌ 不写（来源屏责任）| 不需——纯逻辑跳转，无 UI |

### 5. 与 view-business 的边界

- **本任务（view-auth）**：基于 globalView.session.\* 的"我是谁、有没有权限"
- **view-business 任务（I-M1-view-business）**：基于本屏 state.view.lockedUntil 的"账号锁定"业务状态机
- locked 是业务态（账号 5 次输错的安全策略），不是身份态（不是"我没权限"，而是"我暂时被惩罚")——明确归 view-business 不重不漏 ✓

---

## ★ 沉淀到 schema 的结论

**本任务无 schema 落库**——`update_plan_task` 写：

```jsonc
meta/update_plan_task {
  projectId, scope: 'screen', screenId: 'sc_27ee2293945046b69cc00',
  taskId: 'I-M1-view-auth',
  patch: {
    status: 'skipped',
    notes: 'md: analysis-notes/d84c140e-.../interaction/00-login/view-auth.md；否决理由：登录页本身即 anonymous 入口（整个表单就是未登录引导）；session.status=active 已由 Root.screenEnter 直跳 01-home（D-VA1）；expired 由 globalOverlays.global-session-expired 接管（D-VA2）；authRedirectTo 静默消费无需前置 hint（D-VA3）；MVP 无游客/VIP/实名概念。R-VIEW-AUTH-01 不适用（仅适用业务内容屏，本屏是登录入口屏）。'
  }
}
```
