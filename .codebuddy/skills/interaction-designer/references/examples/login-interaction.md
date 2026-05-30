> 本文件是登录页（00-login）interaction 阶段的"完整跑通参照"。
> 不是模板，是**一个真实跑过 17 任务后的 analysis-notes 索引**——AI 在第一次执行某类任务、不确定深度时 read 此文，看真实样板。

# 登录模块 interaction 完整样板

## 任务清单（17 屏级 + 3 项目级）

| 顺序 | 任务 ID | 状态 | md 路径 | schema 字段（核心）|
|------|--------|-----|--------|----------------|
| 1 | I-00-login-statemachine | done | `analysis-notes/<pid>/interaction/00-login/statemachine.md` | `screen.meta.interaction.summary` + `states[]` |
| 2 | I-00-login-operations | done | `interaction/00-login/operations.md` | `screen.meta.interaction.operations[]`（7 列 × N 操作）|
| 3 | I-00-login-loading | done | `interaction/00-login/loading.md` | `screen.meta.interaction.loadingStrategy`（5 场景）|
| 4 | I-00-login-errors | done | `interaction/00-login/errors.md` | `screen.meta.interaction.errorHandling`（6 类）|
| 5 | I-00-login-boundaries | done | `interaction/00-login/boundaries.md` | `screen.meta.interaction.boundaries[]`（7 类）|
| 6 | I-00-login-state-vars | done | `interaction/00-login/state-vars.md` | `screen.stateInit.view`：errors / canSubmit / showPassword / failureCount / lockedUntil / codeCountdown |
| 7 | I-00-login-datasources | done | `interaction/00-login/datasources.md` | `ds-login.mock`（4 场景）+ `autoFetchOnEnter=false` |
| 8 | I-00-login-events ★ | done | `interaction/00-login/events.md` | 9 个节点的 events / bind / 动态 props（最长，含 SubmitBtn 主流程 + onError logic.if 锁定）|
| 9 | I-00-login-view-loading | done | `interaction/00-login/view-loading.md` | `LoadingOverlay` 节点 + visibleWhen |
| 10 | I-00-login-view-empty | skipped | `interaction/00-login/view-empty.md` | —（登录页无列表型 ds，无空态需求）|
| 11 | I-00-login-view-error | done | `interaction/00-login/view-error.md` | `phoneError` / `credentialError` / `loginErrorBanner` 三个行内/banner 节点 |
| 12 | I-00-login-view-auth | skipped | `interaction/00-login/view-auth.md` | —（登录页本身就是登录入口，无未登录态视图）|
| 13 | I-00-login-view-business | skipped | `interaction/00-login/view-business.md` | —（登录页不承载业务对象状态机；账户锁定是屏内派生态用 view.lockedUntil 控制）|
| 14 | I-00-login-view-feedback | done | `interaction/00-login/view-feedback.md` | `codeCountdownText` 节点（验证码倒计时）|
| 15 | I-00-login-overlays | done | `interaction/00-login/overlays.md` | `forgotPasswordModal` 节点 + `view.forgotModalOpen` 变量 + `lockedSheet` 节点 + `view.lockedUntil` 间接控制 |
| 16 | I-00-login-meta | done | `interaction/00-login/meta.md` | 9 个节点 meta.interaction（summary + states + flows）|
| 17 | I-00-login-coverage | done | `interaction/00-login/coverage.md` | —（核对动作；本屏三轴全 ✓）|
| 18 | I-00-login-integrity | done | —（无 md）| `phase = "interaction-defined"` |

项目级（一次性，不属于本屏但本样板覆盖）：

| 19 | I-global-state-fill | done | `interaction/global/state-fill.md` | 5 类 globalView 子结构完整化 |
| 20 | I-global-overlay-events | done | `interaction/global/overlay-events.md` | 3 个 globalOverlays 内按钮的 events |
| 21 | I-global-coverage | done | `interaction/global/coverage.md` | —（5 类全局态跨屏覆盖核对）|
| 22 | I-handover | done | —（直接用户回复）| —（移交 design-planner）|

## 关键决策摘录

### D-int-1：失败累加 + 锁定写在 SubmitBtn.onError 还是独立 watcher

- 候选 A：在 SubmitBtn.onError 内联 `logic.if state.view.failureCount >= 5 → state.set lockedUntil`
- 候选 B：单独 watcher（schema 不支持）
- ✅ 选 A。理由：当前 schema 不支持 watch；A 方案清晰可读。

### D-int-2：CredentialInput 用 bind 还是 event change

- 候选 A：bind + 副作用 event change（仅校验）
- 候选 B：纯 event change → state.set
- ✅ 选 A。理由：bind 自动同步值，省去手写 `state.set view.form.credential`，且不易错。

### D-int-3：忘记密码用屏级 modal 还是单独屏

- 候选 A：屏级 modal（visibleWhen 节点 + view.forgotModalOpen）
- 候选 B：独立屏 02-forgot-password
- ✅ 选 A。理由：交互流程简单（输入手机号 → 发送链接），单屏 overhead 大。

### D-int-4：locked 用 bottomSheet 还是 modal

- 候选 A：bottomSheet（drag-bar 可拖；半阻断）
- 候选 B：modal（全阻断 + backdrop）
- ✅ 选 A。理由：用户被锁定后还需要看到表单（不强行夺焦），半阻断更合适。

## 关键 events.actions 链速查

### SubmitBtn click（核心主流程，含锁定升级）

```jsonc
condition: { when: "{{view.canSubmit && !view.submitting && (view.lockedUntil ?? 0) < now()}}" },
actions: [
  { type: "state.set", path: "view.submitting", value: true },
  { type: "state.set", path: "view.errors.login", value: "" },
  { type: "effect.fetch", dataSourceId: "ds-login",
    params: { phone: "{{view.form.phone}}", credential: "{{view.form.credential}}", mode: "{{view.loginMode}}" },
    onSuccess: [
      { type: "state.set", path: "globalView.session", value: { status: "authenticated", token: "{{response.token}}", user: "{{response.user}}", expiresAt: "{{now() + response.expiresIn * 1000}}" } },
      { type: "state.set", path: "view.submitting", value: false },
      { type: "state.set", path: "view.failureCount", value: 0 },
      { type: "logic.if", when: "{{!!globalView.nav.authRedirectTo}}",
        then: [
          { type: "nav.go", targetScreenId: "{{globalView.nav.authRedirectTo}}" },
          { type: "state.set", path: "globalView.nav.authRedirectTo", value: null }
        ],
        else: [{ type: "nav.go", targetScreenId: "01-home" }]
      }
    ],
    onError: [
      { type: "state.set", path: "view.submitting", value: false },
      { type: "state.set", path: "view.failureCount", value: "{{state.view.failureCount + 1}}" },
      { type: "logic.if", when: "{{state.view.failureCount >= 5}}",
        then: [{ type: "state.set", path: "view.lockedUntil", value: "{{now() + 30*60*1000}}" }],
        else: [
          { type: "state.set", path: "view.errors.login", value: "{{$last.error.message}}" },
          { type: "ui.animate", nodeId: "FormCard", animation: "shake" },
          { type: "ui.showToast", toastType: "error", message: "{{$last.error.message}}" }
        ]
      }
    ]
  }
]
```

### rootNode 生命周期

```jsonc
[
  { trigger: "screenEnter", description: "复位表单 + 读上次手机号缓存",
    actions: [{ type: "state.set", path: "view.form", value: { phone: "", credential: "", policy: false } }] },
  { trigger: "screenExit", description: "取消未完成的 fetch",
    actions: [{ type: "effect.cancel", dataSourceId: "ds-login" }] }
]
```

## 三轴覆盖核对结果

- 轴 1（rules）：8 条规则 100% 覆盖（含"密码错 ≥5 锁"/"60s 验证码冷却"/"提交防抖"等）
- 轴 2（业务对象状态机）：n/a（本屏不承载业务对象状态机）
- 轴 3（dataSource 三态）：ds-login = 写入型，pending 用按钮 spinner（无独立节点），empty n/a，error 用 Toast + locked Sheet ✓

## 移交 design-planner 时的状态

```
项目: <pid>
所有屏 phase = "interaction-defined"
integrity: 0 个 R-* 错误
analysis-notes/<pid>/interaction/ 下 17+3 份 md 齐
schema: 节点 events / bind / repeat / visibleWhen 全落 / globalState 完整化 / globalOverlays events 完整
✅ 入场 design-planner
```
