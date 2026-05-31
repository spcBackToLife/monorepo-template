> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-briefing
> 对应 schema 字段：screen.meta.design.briefing（v3 新增）
> 必读方法论：references/methodology/00-design-thinking.md + 01-briefing.md
> 触发原因：v2 已 phase=designed 但用户 v3 升级 + 截图自审发现视觉缺口 → 重新分析

---

# D-00-login-briefing — Phase A 取景（v3 ★ 新一轮）

## 0. 与 v2 的关系（v3 重做的差异说明）

v2 的 emotion.md / hierarchy.md / budget.md 已建立基本视觉骨架（克制温度风 + 4 层 z-index + 30 分预算 + 单 BgBlobTopRight 装饰），但 v3 重新分析时基于**用户提供的真实截图**发现 7 个 ISSUE（详见 system/known-issues.md），其中 **P0 两个**：

- ISSUE-2：BrandLogo PNG 未画 → 顶部「Logo」虚线占位 → 首屏品牌感失效
- ISSUE-1：snapshot 服务渲染异常 → Phase F 自审降级用户人工截图

v3 在 v2 已落实的基础上**做增量**：补 6 项创作权（特别是素材绘制 + 任务自创 + 装饰系统单一族 + visualState 业务态映射）+ 5 维 strategy 新视角。

---

## 1. 产品维度

| 维度 | 内容 |
|---|---|
| 项目名 | 校园社交-登录页（mobile，iPhone 15 Pro 393×852）|
| 目标用户 | 大学生，校园社交场景，对手机号验证码登录熟悉；对推销类登录页警惕 |
| 核心场景 | 注册账号 → 登录 → 进入主屏；连续登录失败需要安全锁定提示 |
| 本屏在用户旅程位置 | **开头**——产品首次接触点（从启动页 / 推送 / 邀请链接进入）|
| 用户来时心理 | 好奇略防备（怕被推销 / 怕诈骗）→ 期望"快速登录回到主屏"|
| 本屏要解决的问题 | (1) 手机号 + 验证码免密 / 密码两种方式互斥登录<br>(2) 失败 5 次锁 30min 安全提示<br>(3) 政策必勾合规<br>(4) 注册 / 忘记密码出口 |
| 用户用完去向 | 登录成功 → 01-home（消费 authRedirectTo 跳回原路径）<br>注册 → 注册页<br>忘记密码 → 找回密码页 |
| 本屏角色 | **招呼 + 工具 + 安抚**——招呼是首次品牌印象，工具是核心表单，安抚是 locked 态时降低焦虑 |
| 业务约束（rules）| 6 条：手机号 11 位、验证码 6 位、密码 6-20 位含字母+数字、政策必勾、60s 冷却、5 次锁 30min |

**3 个关键问题答**：

- **用户来这屏是为了什么？** → 用最小阻力路径（手机号+短信验证码免密）回到主屏。所以视觉要"克制不抢戏"。
- **这屏在产品体验链中的角色？** → 开头（首次接触）+ 安抚（失败 lock 态）。开头需要品牌感（BrandLogo + Slogan）、安抚需要明确的倒计时反馈（LockedView）。
- **截图实测最违和的是什么？** → 顶部「Logo」虚线占位 + 整屏冷灰底 + 装饰看不出来 → 首屏品牌感为 0，整体像未完工 demo。

---

## 2. 主题维度

| 维度 | 内容 |
|---|---|
| theme.intent.summary | 简约时尚 + 校园温度（极简留白 + 单一蓝紫强调色）|
| theme.intent.aesthetics | minimal + flat |
| theme.intent.brightness | both（默认 light，dark 已配齐 32 colors）|
| theme.intent.decoration | minimal（装饰极少）|
| theme.intent.colorTemperature | neutral |
| theme.intent.seedColors | #5B6CFF（主色）|

**主调色板已有**（38 token，全充足）：
- 主色族：primary / primaryHover / primaryActive / primaryLight（#EBEDFA 极浅）
- 辅色：secondary #A776FF（紫，未在 v2 使用过）
- 文字：textPrimary 0.88α / textSecondary 0.80α / textTertiary 0.45α / textInverse #fff
- 底：background #FCFCFD / surface #F6F7F9 / surfaceElevated #fff
- 边：border #DEE0E6 / borderLight #E9EBEE / borderFocus #5B6CFF
- 状态：error #DD4747 / warning #FBBE2E / success #2DCC75 / info #2D7DD2

**字号梯度**（9 档）：display 48 / h1 36 / h2 28 / h3 24 / h4 20 / h5 18 / body-lg 16 / body 14 / caption 12 / overline 10

**圆角**：sm 4 / md 8 / lg 12 / xl 16 / full

**阴影**：sm soft 1px / md 4px / lg 8px / xl 12px

**transitions**：fast 150ms / normal 250ms / slow 400ms（cubic-bezier(0.4,0,0.2,1)）

**装饰用量上限（decorationRules）**：minimal（极少）+ subtle 边框 + soft 阴影 + smooth motion + rounded corner + geometric icon

**iconSpec**：outline + 1.5px stroke + uniformStrokeWidth + geometricOnly

**stateSpec**（已写）：hover scale 1.02 + active scale 0.98 + focus ring 2px primary + disabled opacity 0.4 grayscale

**缺哪些 token**：✅ 全部够用，**不需要 UpstreamChallenge theme-generator**。
- 唯一**候选**：errorSoft（#E66565 暖红）—— ISSUE-6 讨论是否要补；strategy.md 5 维"色"段决定。

---

## 3. 交互维度

### 3.1 state.view 字段全表（9 个）

| 字段名 | 类型 | 业务含义 | 涉及哪些节点的视觉态 |
|---|---|---|---|
| `loginMode` | enum 'code' \| 'password' | 登录方式互斥切换（默认 code）| CodeModeBtn.active / PasswordModeBtn.active / **TabIndicator.position（v3 新增视觉容器）** / CredentialLabel 文案 / CredentialInput placeholder + maxLength + GetCodeBtn 显隐 + PasswordToggleEye 显隐 |
| `form.phone` / `.credential` / `.policy` | object | 表单值（双向 bind）| PhoneInput.value / CredentialInput.value / **PolicyCheckVisual.checked（v3 新增视觉容器）** |
| `errors.phone` / `.credential` | object | 字段错误文案 | PhoneError.text + visibleWhen / CredentialError.text + visibleWhen |
| `submitting` | bool | 提交中 | SubmitBtn.loading（show SubmitSpinner + 禁双击）/ FormCard 整体 disabled？决策见 strategy.md |
| `lockedUntil` | number\|null | 锁定截止时间戳 | NormalFormView.visibleWhen=false / LockedView.visibleWhen=true / LockedCountdown 数字等宽显示 |
| `failureCount` | number | 失败次数 | 不直接渲染（用于触发 lockedUntil）|
| `codeCountdown` | number 0~60 | 验证码冷却秒数 | GetCodeBtn.counting（disabled + 文案"60s 后重发"）|
| `lockedCountdown` | number | 锁定剩余秒数 | LockedCountdown 显示 mm:ss |
| `passwordVisible` | bool | 密码显隐 | PasswordToggleEye.eyeOpen / .eyeClosed + CredentialInput.type='password'\|'text' |

### 3.2 衍生视图节点已建（齐）

- ✅ Loading 类：SubmitSpinner（按钮内）+ CodeSendSpinner（GetCodeBtn 内）
- ✅ Error 类：PhoneError + CredentialError（行内字段错误）
- ✅ Business 类：NormalFormView ↔ LockedView 互斥（账号锁定状态机）+ LockedView 子树 5 节点（LockedIcon / LockedTitle / LockedCountdown / LockedHint / LockedForgotLink）
- ✅ Empty / Auth / Feedback 类：本屏不适用（已 skipped）
- ✅ 装饰：BgBlobTopRight（v2 已建，weight=2）

**已建衍生视图视觉规格**：v2 styles + states 已落（39 节点 styles + 49 个 visualStates + 4 materialSpec），无 skeletonGap → **不需要 UpstreamChallenge interaction-designer**。

### 3.3 节点骨架够不够（v3 ★ 创作权 4：布局调整权 + 创作权 5：装饰节点新建权）

基于真实截图发现 ⼏个**视觉容器缺口**——design 阶段允许新增（不动业务节点）：

| 缺口 | 决策 | 计入 craft 任务 |
|---|---|---|
| ❌ ModeToggle 缺底部移动指示线 | 加 **TabIndicator** 视觉容器（2px 主色横线，transition 滑动）| ✅ D-00-login-craft-tab-indicator |
| ❌ PolicyCheckbox 是 native input 实心黑方块 | 加 **PolicyCheckLabel + PolicyCheckVisual** wrapper-label workaround | ✅ D-00-login-craft-checkbox |
| ❌ BrandLogo PNG 未画 | 调 material-painter 画 240×240 字标"C" PNG + applyMaterialDesign | ✅ D-00-login-craft-brandlogo |
| ❌ BgBlobTopRight 在浅底上太弱 | 调主色浓度 / 加第二个左下小光斑配重 | ✅ D-00-login-craft-decoration-rebalance |
| ⚠️ FooterLinks 出卡片视觉断裂 | strategy 5 维讨论，决定是优化还是 UpstreamChallenge 重组 | ⚠️ 待 strategy 决策 |
| ⚠️ SubmitBtn 缺主角光晕（hover/focus 视觉权重不够）| strategy 5 维决定是否加 ring/shadow 增强 | ⚠️ 待 strategy 决策 |

**业务字段缺口**：✅ 无 → **不需要 UpstreamChallenge interaction-designer**。

### 3.4 mock scenarios（10 个）

| dataSource | scenario | 影响哪些设计 |
|---|---|---|
| ds-login | success | submitting 250ms loading → 跳转 |
| ds-login | wrongCredential | error toast + failureCount++ + CredentialInput.error 高亮 |
| ds-login | locked (423) | 写 lockedUntil → NormalFormView 隐藏 + LockedView 显示 |
| ds-login | limitExceeded | error toast |
| ds-login | serverError (5xx) | error toast |
| ds-login | networkTimeout | error toast + 重试 |
| ds-send-code | success | GetCodeBtn loading → countdown 60s |
| ds-send-code | limitExceeded | error toast "今日次数用尽"|
| ds-send-code | serverError | error toast |
| ds-send-code | networkTimeout | error toast + 重试 |

设计 loading / error 态时按对应 scenario 实现视觉。

---

## 4. 上下文维度

| 维度 | 内容 |
|---|---|
| 同种组件在其他屏 | **本项目仅 1 屏**（D-templates 已 skipped），SubmitBtn / PhoneInput / FormCard 不需要跨屏一致性约束 |
| 可复用 componentAssets | 0 个（D-templates 否决：单页项目） |
| 跨屏一致性约束 | 仅限项目级 globalOverlays（global-network-banner + global-session-expired，已在 D-global-overlay-* 任务对账，与 SubmitBtn 视觉一致：100%×48 / primary / lg / sm / 600）|
| v2 已建立的视觉锚点 | 暖白 #FCFCFD 底 + 主色 #5B6CFF + lg 12px 圆角 + body-lg 16 中文 + sm soft 阴影 |
| v3 将打破的 v2 决策 | 无（v3 是增量）；唯一可能的微调是 errorSoft token（如 strategy 决定要）|

---

## 5. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_node 写到 screen.meta.design.briefing
{
  "userIntent": "校园用户最小阻力登录回到主屏（手机号+验证码免密优先）",
  "userMood": "好奇略防备 → 信任顺手 → 期待（克制温度风）",
  "screenRole": "招呼+工具+安抚（首次品牌印象/核心表单/lock 态降焦虑）",
  "themeIntent": "minimal-flat-neutral-warm（简约时尚 + 校园温度）",
  "missingTokens": [],
  "stateViewFields": [
    "loginMode", "form", "errors",
    "submitting", "lockedUntil", "failureCount",
    "codeCountdown", "lockedCountdown", "passwordVisible"
  ],
  "skeletonGaps": [],
  "visualContainerNeeds": [
    "TabIndicator（ModeToggle 底部移动指示线）",
    "PolicyCheckLabel + PolicyCheckVisual（wrapper-label workaround for native checkbox）"
  ],
  "materialNeeds": [
    "BrandLogo 240×240 字标 C PNG（v2 留下的素材债）",
    "BgBlobTopRight 装饰浓度 / 配重 rebalance"
  ],
  "crossScreenComponents": [],
  "v2Snapshot": {
    "totalNodes": 39,
    "totalVisualStates": 49,
    "totalMaterialSpecs": 4,
    "tokenCoverage": "99.1%",
    "phase": "designed",
    "knownIssues": "system/known-issues.md（7 项 P0~P3）"
  },
  "v3Increment": [
    "Phase B concept（mood 浓缩 + 灵魂句 + 关键词 3）",
    "Phase C strategy 5 维（色 60-30-10 / 字号节奏 / 形状语言 / 装饰系统单一族 / 间距动效律）",
    "Phase D 自创 ≥4 个 craft 任务（brandlogo / tab-indicator / checkbox / decoration-rebalance）",
    "Phase E 落库（含画 PNG）",
    "Phase F 自审（用用户人工截图代替 snapshot 服务）"
  ]
}
```

---

## 6. 自检

- [x] 4 维度全有内容
- [x] state.view 9 字段全覆盖 + 标注涉及视觉节点
- [x] missingTokens=[] / skeletonGaps=[] → 不挂 UpstreamChallenge
- [x] 列出 4 个明确需要 craft 的视觉容器/素材需求 → Phase D 自创任务有依据
- [x] 与 v2 的差异说明清晰（增量而非推翻）
- [x] system/known-issues.md 已记录截图工具问题 + 6 个 v3 修复路径
- [x] 即将调 meta/set_node 写入 screen.meta.design.briefing
