# 模块 M1 — 用户认证-登录 索引

> 本项目 P0 唯一交付模块。所有 8 个子任务 done，schema phase=analyzed，integrity 0 错。

## 子任务清单

| 任务 | md 文件 | 状态 |
|------|---------|:----:|
| M1-stories | `A-stories.md` | ✅ |
| M1-flows | `B-flows.md` | ✅ |
| M1-rules ★ | `C-rules.md` | ✅ |
| M1-data | `D-data.md` | ✅ |
| M1-skeleton | `../../screens/00-login/skeleton.md` | ✅ |
| M1-state-shape | `../../screens/00-login/state-shape.md` | ✅ |
| M1-coverage | `../../screens/00-login/coverage.md` | ✅ |
| M1-integrity | （schema 中检查 phase=analyzed）| ✅ |

## 模块涉及的屏幕

- `00-login`（id `sc_27ee2293945046b69cc00`）— 项目唯一交付屏

## 模块涉及的 API

- `ds-login`（POST /api/auth/login）— LoginParams/LoginResponse 完整 typeDef
- `ds-send-code`（POST /api/auth/send-code）— SendCodeParams/SendCodeResponse 完整 typeDef
- `ds-policy-text`（static）— privacyTitle / termsTitle / privacyUrl / termsUrl

## 模块间关联

### 依赖
- **M5 协议合规**：未勾选不可提交（合规红线）
- **M6 安全防刷**：60s 验证码冷却 + 当日 10 次 + 密码错 5 次锁 30min

### 被依赖
- 所有需要登录态的后续屏（M2~M4 占位屏，本期不实现）：从 `globalView.session` 读 token + user

### 跨模块跳转
- `00-login` → `01-home`（trigger: 登录成功，transition: fade）
- `00-login` → `00-register`（trigger: 点击注册账号，transition: push）
- `00-login` → `00-forgot-password`（trigger: 点击忘记密码，transition: push）

## 关键决策（模块层面）

- **手机号 + 验证码免密 / 密码两种方式互斥切换**（D2 项目级决策）：覆盖 90%+ 校园场景
- **同一接口 ds-login 两种 mode**：减少接口数；后端按 mode 解析 credential
- **GetCodeBtn / PasswordToggleEye 始终建出**：仅 visibleWhen 由 interaction 控制；产品阶段交付完整业务原子全集
- **PolicyText 用整段 textContent 占位**：协议链接拆点击区交给 interaction（届时可能拆成多个 span 或挂坐标解析）
- **session 走全局态**（globalView.session）而非屏级 data：跨屏长期态，避免双份维护
- **不在登录页内塞替代方案**（扫码 / 第三方授权 / 生物识别）：保持极简登录页；这些是后续 P2 增强

## 完工证据

- ✅ rules 6 条覆盖 4 类齐（数据×1 / 业务×3 / 安全×1 / 边界×1）
- ✅ 4 个业务状态机字段（loginMode / failureCount+lockedUntil / codeCountdown / submitting+effects.dsLogin.status）+ 全部枚举/区间显式列出（R-PRODUCT-03 通过）
- ✅ 3 个 dataSource 含完整 typeDef（PascalCase responseName/paramsName + 全部字段类型）
- ✅ 24 个业务节点骨架建好；全部 meta.product.summary 非空（R-PRODUCT-02 通过）
- ✅ 屏级 stateInit.view 三个产品决策态占位（loginMode/form/submitting）+ data.user 类型注解
- ✅ 项目级 globalConcerns 5 类齐 + globalStateInit.view 4 个变量占位 + globalOverlays 2 个骨架（offline-banner / session-expired）
- ✅ 三轴覆盖核对通过（rules 全部对应锚点 / 状态机字段全枚举 / API 全建 dataSource+data 占位）
- ✅ `query/integrity { screenId: "sc_27ee2293945046b69cc00" }` → 0 错 0 警 0 信息
- ✅ `query/integrity { projectId }` → 0 错 0 警 0 信息
- ✅ `screen.meta.status.phase = "analyzed"`
