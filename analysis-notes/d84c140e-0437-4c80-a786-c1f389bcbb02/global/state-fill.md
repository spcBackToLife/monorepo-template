> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-global-state-fill
> 对应 schema 字段：project.globalStateInit.view（4 类全局态子结构完整化）
> expectedArtifacts：[{ kind: "hasKeys", path: "globalStateInit.view", keys: ["session","network","preferences","nav"] }]

# Step I-global-state-fill — 全局 view 变量子结构完整化

> 详细规范见 `schema-spec/state-completion.md` §3。
> 上游依赖：
> - `global/concerns.md`（product 阶段已定 4 类作用域：session / network / preferences / nav；fallback 是 globalOverlays 用，不是 view 变量）
> - `global/state.md`（product 阶段已 add 4 个占位，本任务仅 update 完整子结构）
> - `interaction/00-login/operations.md`（明确了 #1/#13 会读写 session.status / session.token / session.user；#8/#13 condition 读 network.status）
> - `interaction/00-login/state-vars.md`（屏级 view 已落 6 个派生态）
> - `interaction/00-login/boundaries.md` D-B10（authRedirectTo 消费协议）

## 推理过程

### 0. 范围核对（关键边界）

`expectedArtifacts.keys = ["session","network","preferences","nav"]` 与 `concerns.md` 识别到的 4 类**一一对应**。

⚠️ 模板 `references/note-templates/global-state-fill.template.md` 默认含第 5 类 `errorBoundary`，**本项目按 product 阶段决策不引入**——concerns.md 已明确：
- `error-boundary` 类 overlay 属于"框架级兜底，由 design-executor 评估"，不在 product/interaction 阶段建 view 变量
- expectedArtifacts.keys 也只列 4 项，与本决策一致

➜ 本任务**严格按 4 类**完整化，不擅自加 errorBoundary view 变量。

### 1. 命名延续性决策（D-GS1）

state-completion.md §3 推荐用 `lastVisitedScreenId` / `themeVariant` 等命名，但 product 阶段 `concerns.md` + `state.md` 已用：
- `nav.lastVisited`（非 lastVisitedScreenId）
- `preferences.theme`（非 themeVariant）

| 候选 | 优势 | 劣势 |
|------|------|------|
| A：改名为 spec 推荐 | 跨项目一致 | 破坏 product 阶段已沉淀的 5 处引用（concerns/cross-screen 矩阵 / operations 决策记录 / D-B10 / boundaries） |
| B：延续 product 已用名 | 单一来源，零迁移成本；spec 是建议非红线 | 跨项目复用时要做映射 |

**决策**：**B（延续 product 命名）**。理由：
1. spec §3 的字段名是"推荐示例"非红线（红线 R-GLOBAL-STATE-01 只要求"必要变量有子结构"，不约束字段名）
2. 改名会让 operations.md / boundaries.md 已落库的决策记录产生不一致
3. 本项目作用域单一（登录页），未来如果跨项目复用再做命名归一

### 2. 4 类子结构逐条设计

#### 2.1 session：从 null → 完整登录态对象

**当前 schema**：`defaultValue: null`
**目标 defaultValue**：

```jsonc
{
  status:         "anonymous",   // anonymous | active | expired | refreshing
  token:          null,
  refreshToken:   null,
  user:           null,
  expiresAt:      null,
  lastActivityAt: null
}
```

**字段逐条依据**：

| 字段 | 默认值 | 谁会写 | 谁会读 |
|---|---|---|---|
| `status` | `"anonymous"` | #13 onSuccess 写 `"active"`；session 过期写 `"expired"` | #1 screenEnter 门禁判断；后续屏 RouteGuard |
| `token` | `null` | #13 onSuccess 写 JWT | API 请求 header 注入 |
| `refreshToken` | `null` | #13 onSuccess 写 | token 过期自动刷新（refreshing 态） |
| `user` | `null` | #13 onSuccess 写 `{ id, phone, nickname, avatar }` | 后续主屏渲染 |
| `expiresAt` | `null` | #13 onSuccess 写 ts | 后续屏判断"是否快过期" |
| `lastActivityAt` | `null` | 任意用户操作后写 ts（本期不实现 30min 自动登出，留字段不连副作用）| 后续可做"无活动自动登出" |

**字段集与 concerns.md §1 对齐**：concerns 列了 `status / token / user / expiresAt` 4 项，本任务补 `refreshToken` + `lastActivityAt` 两项扩展（不破坏对齐，仅向前兼容）。

**status 枚举**：concerns 列了 3 项（anonymous/active/expired），本任务加 `refreshing`——理由：refresh 操作需要中间态，避免请求并发竞争。这是 product 阶段未细化的内容，本阶段补无冲突。

**否决候选**：
- ❌ status 默认 `null`：condition 表达式 `session.status === 'active'` 会变得啰嗦（要先判空）
- ❌ user 展开成 `{ id:"", nickname:"", avatar:"" }` 全空字符串：违反 state-completion §4"嵌套对象默认 null 然后 events 里再赋值（破坏 typeDef 一致性）"——但 user 整体是"登录后才有的实体"，整体 null 比每字段空串更语义清晰；state-completion §4 这条规则适用于"屏级已知形状"，全局 session 属于"运行时填充实体"例外

#### 2.2 network：补 lastOnlineAt

**当前 schema**：`{ status: "online", retryCount: 0 }`
**目标 defaultValue**：

```jsonc
{
  status:       "online",       // online | offline | slow
  retryCount:   0,
  lastOnlineAt: null
}
```

**新增字段**：
- `lastOnlineAt`：离线后用户能看到"上次在线于 N 分钟前"——本期不强用，但留字段为后续 offline-banner 提供素材

**status 枚举扩展**：加 `slow`——5G/弱网"慢网"提示。本期登录页不实现 slow 分支兜底，但留枚举值方便扩展。

**否决候选**：
- ❌ 加 `effectiveType` (4g/3g/wifi)：浏览器/H5 兼容性差，不跨平台稳定
- ❌ 改 retryCount 默认 -1 表示"未尝试"：0 已经能表达，无需歧义

#### 2.3 preferences：补 a11y 子对象

**当前 schema**：`{ theme: "light", fontSize: "md", lang: "zh-CN" }`
**目标 defaultValue**：

```jsonc
{
  theme:    "light",            // light | dark
  fontSize: "md",               // sm | md | lg
  lang:     "zh-CN",
  a11y: {
    highContrast: false,
    reduceMotion: false
  }
}
```

**新增 a11y 子对象**：
- `highContrast`：高对比度模式（theme-generator 后期决定是否真正绑视觉变量）
- `reduceMotion`：尊重系统 `prefers-reduced-motion`，影响 #13 提交后的 ✓ 动画 / shake 是否播放

**理由**：boundaries.md 决策 D-B 边界其实有提到"无障碍 reduceMotion 应阻止 shake"——本字段为该判定提供 condition 锚点。

**否决候选**：
- ❌ 加 `notifications: {...}`：登录页不涉及通知偏好
- ❌ 字段全部铺平（preferences_theme / preferences_a11y_reduceMotion）：放弃语义嵌套换"扁平 condition.when 更短"——但表达式引擎支持 `.` 访问，不必扁平化

#### 2.4 nav：不动（已完整）

**当前 schema**：`{ lastVisited: null, authRedirectTo: null, pendingDeepLink: null }`

3 个字段已经覆盖了：
- D-B10 authRedirectTo 消费协议 → ✓
- 后续屏写 lastVisited → ✓
- 分享深链 pendingDeepLink → ✓

无字段需要补。**但仍要发 update**——确保 schema 与 md 结论 1:1 对应、并把 schema 中字段顺序对齐（防止后续 diff 看着乱）。

### 3. 多角度验证

#### 3.1 跨任务字段引用核对

逐项检查 interaction 阶段已落库任务里的 globalView.* 引用：

| 引用位置 | 引用字段 | 本任务后是否合法 |
|---|---|---|
| operations.md #1 screenEnter | `globalView.session.status === 'active'` | ✓ status 字段存在且默认 anonymous |
| operations.md #13 onSuccess | 写 `globalView.session` | ✓ session 整体被写新对象 |
| operations.md #8 condition | `globalView.network.status !== 'offline'` | ✓ network.status 存在 |
| operations.md #13 condition | `globalView.network.status !== 'offline'` | ✓ 同上 |
| boundaries.md D-B10 / #X4 | `globalView.nav.authRedirectTo` 消费 | ✓ 字段存在 |
| state-vars.md D-S1 | `globalView.network.status !== 'offline'` | ✓ 同上 |
| state-vars.md D-S1 | `(!view.lockedUntil || view.lockedUntil < Date.now())` | — 屏级 view，无需全局核对 |

**结论**：本任务字段集**完全覆盖**已落库 7 处引用。

#### 3.2 与 concerns.md 跨屏读写矩阵核对

concerns §跨屏读写矩阵 列了 4 行（session / network / preferences / nav.authRedirectTo）——本任务 4 类完整化 + 字段集全覆盖，✓ 一致。

#### 3.3 红线 R-GLOBAL-STATE-01 自检

红线触发：必要变量缺子结构。
- session：从 null → 完整对象 ✓
- network：已有 status + 补 lastOnlineAt ✓
- preferences：已有三项 + 补 a11y ✓
- nav：已完整 ✓

➜ 不触发红线。

#### 3.4 expectedArtifacts 自检

任务声明 `hasKeys: ["session","network","preferences","nav"]`——4 项 update 后 schema.globalStateInit.view 仍包含这 4 个键 → ✓ 通过。

### 4. 决策汇总

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-GS1 | 字段命名是否改为 spec 推荐（lastVisitedScreenId / themeVariant） | 否——延续 product 已用名 |
| D-GS2 | 是否新增 errorBoundary view 变量 | 否——concerns.md 已划归 globalOverlays 范畴，本期不引入 |
| D-GS3 | session.user 默认值 null vs 全空字段对象 | null——整体是"登录后才有的实体" |
| D-GS4 | network.status 是否加 slow 枚举 | 加——扩展枚举无成本，留口 |
| D-GS5 | preferences.a11y 是否扁平化 | 否——保持嵌套，表达式引擎支持 . 访问 |
| D-GS6 | session.status 是否加 refreshing 枚举 | 加——refresh 操作并发兜底所需 |

---

## ★ 沉淀到 schema 的结论

本任务 4 个 MCP 调用（每个变量一次 state/global_view_update，全部为修改 defaultValue）：

```jsonc
// 1) session：null → 完整登录态对象
state/global_view_update {
  projectId, name: "session",
  patch: {
    defaultValue: {
      status:         "anonymous",
      token:          null,
      refreshToken:   null,
      user:           null,
      expiresAt:      null,
      lastActivityAt: null
    }
  }
}

// 2) network：补 lastOnlineAt
state/global_view_update {
  projectId, name: "network",
  patch: {
    defaultValue: {
      status:       "online",
      retryCount:   0,
      lastOnlineAt: null
    }
  }
}

// 3) preferences：补 a11y 子对象
state/global_view_update {
  projectId, name: "preferences",
  patch: {
    defaultValue: {
      theme:    "light",
      fontSize: "md",
      lang:     "zh-CN",
      a11y: {
        highContrast: false,
        reduceMotion: false
      }
    }
  }
}

// 4) nav：保持原结构，幂等 update（不动字段）
state/global_view_update {
  projectId, name: "nav",
  patch: {
    defaultValue: {
      lastVisited:     null,
      authRedirectTo:  null,
      pendingDeepLink: null
    }
  }
}
```

> errorBoundary 不引入（决策 D-GS2，与 concerns 一致）。
> 不动 product 阶段 add 时的 label / name 字段。
