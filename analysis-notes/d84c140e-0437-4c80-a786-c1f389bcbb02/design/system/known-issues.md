# 已知问题清单（design 阶段累积）

> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：跨任务知识沉淀
> 创建时间：2026-05-31

---

## ISSUE-1：snapshot 服务渲染与 schema 不一致（高优）

**发现时间**：2026-05-31，v3 design-planner 重新分析时
**严重度**：P0（影响 design / executor 任何依赖截图自审的工作流）

### 现象

调用 `mcp__my-design-mcp__generate_snapshots`（mode=frame / viewport 都试过）拿到的图与 editor（localhost:5174）+ 实际项目 schema 严重不一致：

| 维度 | snapshot 服务（localhost:3001）输出 | 实际 schema / editor 显示 |
|---|---|---|
| 节点 | 仅 5 个（登录标题 / 邮箱输入 / 密码输入 / 登录按钮 / 没有账号？去注册）| 39 个（HeaderArea / BrandLogo / BrandSlogan / FormCard / PhoneField / ModeToggle / CredentialField / GetCodeBtn / PasswordToggleEye / PolicyCheckLine / SubmitBtn / FooterLinks / LockedView / BgBlobTopRight 等）|
| 输入字段 | 邮箱 + 密码（账号密码登录）| 手机号 + 验证码免密 / 密码两种模式互斥 |
| 背景色 | 整屏深黑色 | `screen.backgroundColor=$token:colors.background`（应为 #FCFCFD 近白）|
| 是否有 Brand 区 | 无 | 有 BrandLogo + BrandSlogan |
| 是否有政策勾选 | 无 | 有 PolicyCheckbox + PolicyText 双链接 |
| 是否有装饰 | 无 | BgBlobTopRight 右上溢出装饰 |

### 排查路径（待 executor / 平台同学跟进）

1. snapshot 服务（localhost:3001）的 SchemaRenderer 是否在用旧版 / 默认模板兜底渲染？
2. snapshot 服务消费 schema 的链路是否能拿到最新 schema（缓存 / WebSocket / DB 来源）？
3. `$token:colors.background` 在 snapshot 渲染端是否被正确解析？黑底说明 token resolver 失败 → 整屏 fallback 黑。
4. `visibleWhen` 表达式（`{{ !state.view.lockedUntil || state.view.lockedUntil <= $.now() }}`）在 snapshot 渲染端是否生效？如果不生效，NormalFormView 可能不显示。
5. 截图前是否需要 mock state.view 默认值？snapshot 服务是否在启动时跑 stateInit？

### 临时绕行方案（v3 design 阶段采用）

- ❌ 暂不依赖 `mcp__my-design-mcp__generate_snapshots` 做自审
- ✅ 用户手动从 editor 截图喂给 design 阶段做 5 维评分
- ✅ Phase F 整屏 self-review 任务在指纹层面降级：`expectedArtifacts` 暂用 `nonEmpty path: meta.design.summary`，待 snapshot 服务修好后再补 `selfReviewAllPassed`

---

## ISSUE-2：BrandLogo PNG 未画 / 未绑 src（v2 留下的素材债务）

**发现时间**：2026-05-31，看到用户截图顶部「Logo」虚线占位
**严重度**：P0（首屏品牌感缺失，登录页核心情绪锚点失效）

### 现象

用户截图最显眼的元素：顶部一个浅灰色虚线方框，里面写着「Logo」文字。这是 SchemaRenderer 在 `<img>` 节点找不到 `src` 时显示的占位框——v2 的 `D-00-login-materials` 任务声明了 BrandLogo 的 `materialSpec`（kind=brand renderHint=png 字标"C" 240×240），但**实际没调用 material-painter 画 PNG**，也**没写 `node.materialProjectId`**。

v3 design-planner 已把"自跑 material-painter 画素材 + applyMaterialDesign"列为创作权第 6 项 + 红线（C 端每屏至少图标 / 装饰之一）——v2 这一步的债务必须 v3 补上。

### 影响

- 视觉权重金字塔顶端缺失：BrandLogo weight=5 在 budget 表里是主角-品牌，但占位框的虚线让首屏直接像未完工的 demo
- 「校园温度」情绪锚点失效：虚线占位 + 浅灰底，整体冷感重，与 emotion.md 的克制温度风背道而驰

### v3 修复路径

走自创 `D-00-login-craft-brandlogo` 任务：
1. 调 material-painter 画 BrandLogo（240×240 PNG，字标"C"，主色 #5B6CFF 或主色到辅色渐变）
2. `mcp__my-design-mcp__execute_operations_batch` → `applyMaterialDesign` 写入 `materialProjectId`
3. 顺便核对 LockedIcon / SubmitSpinner 的 materialSpec 是否落地

---

## ISSUE-3：BgBlobTopRight 装饰在浅灰底上视觉强度不够

**发现时间**：2026-05-31，用户截图中找不到右上装饰
**严重度**：P2（不影响功能，但装饰预算 weight=2 等于零浪费）

### 现象

`materials.md` 写 BgBlobTopRight = css-gradient `radial-gradient(circle at 100% 0%, $token:colors.primaryLight, transparent 60%)`，在 #FCFCFD 暖白底上应该能看到淡蓝紫晕。但截图显示整屏浅灰偏冷（可能不是 `$token:colors.background` 而是 SchemaRenderer fallback 灰），加上 primaryLight `#EBEDFA` 与浅灰极为接近，导致装饰几乎不可见。

### v3 修复路径

走自创 `D-00-login-craft-decoration-rebalance`：候选方案
- A：把 primaryLight 浓度提高到 primary @ 8% alpha（仍单色装饰族），让装饰在任何底色上都识别得出
- B：换更大半径 + 更深径向渐变中心（primary @ 15% center → transparent 70%）
- C：装饰族升级到 soft-glow 系统（参 `recipes/decoration-systems/soft-glow.md`），加第二个左下小光斑配重平衡

---

## ISSUE-4：FooterLinks 出卡片视觉断裂

**发现时间**：2026-05-31，用户截图底部
**严重度**：P2

### 现象

FooterLinks（注册账号 / 忘记密码？）在 FormCard 之外的底部，灰色文字，间距大，像是单独一块。视觉链条 BrandLogo → Slogan → FormCard → SubmitBtn → ▼ 这里出现断裂 → FooterLinks。

### v3 修复路径

走自创 `D-00-login-craft-footer-cohesion`：
- A：FooterLinks 加底部安全间距 + 中心点位与 SubmitBtn 同（已是这样），优化 typography 和 hover 视觉
- B：把 FooterLinks 移到 FormCard 内部底部（需要走 UpstreamChallenge 因为是结构调整跨边界）
- C：FooterLinks 改用更弱的 textTertiary，让视觉断裂"低调"消化

---

## ISSUE-5：ModeToggle 缺视觉指示线（TabIndicator）

**发现时间**：2026-05-31
**严重度**：P1（影响用户对当前模式的辨识）

### 现象

「验证码登录 / 密码登录」当前是字重 + 颜色对比表达 active 态。用户截图显示「验证码登录」黑色加粗 + 「密码登录」灰色，但两者底部没有指示线，视觉上像是普通文字行。

### v3 修复路径

走自创 `D-00-login-craft-tab-indicator`（参 `recipes/compositions/tab-segment.md`）：
- 加 TabIndicator 视觉容器节点（design 创作权 4：layout 调整权 + 装饰节点新建权）
- 在 ModeToggle 下方加 2px 主色横线，宽度 = active tab 的字宽
- transition：active 切换时滑动到对应 tab（用 `transform: translateX(...)` + `transition: $token:transitions.fast`）

---

## ISSUE-6：错误文字红与「克制温度风」情绪不匹配

**发现时间**：2026-05-31
**严重度**：P3（候选讨论）

### 现象

用户截图中两条红色错误提示「请输入正确的手机号」+「请输入验证码」用的 `$token:colors.error = #DD4747`，在 emotion.md 的克制温度风（情绪曲线"好奇略防备 → 信任顺手 → 期待"）下显得太尖锐——用户输入手机号后失焦立刻看到刺眼红字，会从"信任"被打回"防备"。

### v3 修复路径

候选方案
- A：维持 `$token:colors.error`（标准做法，不动）
- B：错误态用 `$token:colors.error` + 0.85 alpha 软化（design 阶段允许）
- C：UpstreamChallenge theme-generator 增加 `errorSoft` token（#DD4747 → 暖红如 #E66565），让错误也保留品牌温度
- 在 strategy.md 5 维之"色"段决策

---

## ISSUE-7：政策 Checkbox 实心黑方块视觉权重偏重

**发现时间**：2026-05-31
**严重度**：P2

### 现象

用户截图中 PolicyCheckbox 显示成深黑色实心方块（看起来是 native input checkbox 默认 dark 渲染），未勾选状态下视觉权重偏重，与 budget 表 PolicyCheckbox.weight=1 的"工具-勾选"角色不符。这是 native checkbox 在 web 渲染层的典型坑（参 `pitfalls/web-rendering.md`）。

### v3 修复路径

走自创 `D-00-login-craft-checkbox`（参 `recipes/compositions/checkbox.md` 的 wrapper-label workaround）：
- 加 PolicyCheckLabel 包 native input + PolicyCheckVisual 视觉容器（design 创作权 4 + 5）
- native input opacity:0 隐藏；PolicyCheckVisual 用 1.5px 边框 + 8x8 主色对勾绘制
- visualState: checked / unchecked / focused / error 四态全配

---

## v3 design-planner 重新分析的输入清单

基于以上 7 个 ISSUE，v3 重新分析时**已知缺口**：

1. ISSUE-2（BrandLogo 素材债）→ 必入 craft 任务清单
2. ISSUE-3（装饰失效）→ 必入 craft 任务清单
3. ISSUE-5（TabIndicator 缺）→ 必入 craft 任务清单
4. ISSUE-7（Checkbox native）→ 必入 craft 任务清单
5. ISSUE-4（FooterLinks 断裂）→ strategy.md 决定要不要改
6. ISSUE-6（错误色尖锐）→ strategy.md 5 维"色"段决定
7. ISSUE-1（截图服务异常）→ Phase F self-review 临时降级

---

## ISSUE-8：visualState.activeWhen 表达式未触发或 styles 未合并（v3 craft-tab-indicator 落库后发现）

**发现时间**：2026-06-01，用户提供 editor 真实截图后对账
**严重度**：P0（影响所有"业务态 → visualState"映射，本项目核心机制）
**修复时间**：2026-06-01（同日）✅ **已修**
**修复时间**：2026-06-01（同日）✅ **已修**

### 现象

v3 craft-tab-indicator 在 CodeModeBtn / PasswordModeBtn 落库：
```jsonc
states[active]:
  activeWhen: "{{ state.view.loginMode === 'code' }}"
  styles: {
    color: "$token:colors.primary",           // 应渲染主色
    fontWeight: "600",                         // 应加粗
    borderBottomWidth: "2px", borderBottomStyle: "solid",
    borderBottomColor: "$token:colors.primary",
    marginBottom: "-1px"
  }
```

state.view.loginMode 默认值 = 'code'（schema 已确认），表达式应为 true，active state 应激活。但 editor 实际渲染：两个 tab 都是 default 态（textSecondary 字 / 500 字重 / 无 borderBottom）。

### 排查路径

1. SchemaRenderer 是否在挂载时为每个节点扫 visualState.activeWhen 并计算？
2. activeWhen 表达式 evaluator 是否支持 `===` 比较 + `state.view.X` 路径访问？
3. 是否仅响应 DOM 事件触发的 visualState（hover/focus/pressed），跳过 activeWhen 字段定义的业务态？
4. 多个 visualState 同时为 true 时（如 active + hover）合并策略是否丢失了 active 部分？

### v2 的 active visualState 同样未触发？

回顾 v2 D-00-login-states 落库时已写 active state（含 borderBottom 字符串内嵌 token）—— v2 也是没生效（v3 在 craft-tab-indicator 才发现 v2 缺 activeWhen）。即使补了 activeWhen，本次仍未生效 → 强烈怀疑 SchemaRenderer 不消费 activeWhen 字段。

### 影响范围（项目级）

- ✗ ModeToggle Tab active 切换无视觉反馈（craft-tab-indicator）
- ✗ PolicyCheckVisual checked 切换无视觉反馈（craft-checkbox 的 checked state 同样用 activeWhen=`{{state.view.form.policy === true}}`）
- ✗ 输入框 error / disabled 等用 activeWhen 的态全部失效
- ✗ NormalFormView ↔ LockedView 切换是用 visibleWhen（不是 visualState）→ 这部分应该 OK

### 修复（2026-06-01 已落地）

定位：5 处源代码全部 silent strip activeWhen 字段：

1. `features/design-schema/src/validators/index.ts` `VisualStateSchema` zod ❌ 不认 → 加 `activeWhen: z.string().optional()`
2. `features/design-operations/src/types/operations/visual-state.ts` `VisualStateAddOp.params` + `VisualStateUpdateOp.params` 类型 ❌ 没声明 → 加 `activeWhen?: string` / `string | null`
3. `features/design-operations/src/operations/visual-state.ts` `executeAddState` + `executeUpdateState` ❌ 没写入 `newState` / `state` → 补 `...(params.activeWhen != null ? { activeWhen: params.activeWhen } : {})` + update 逻辑
4. `features/design-operations/src/executor/inverse.ts` `restoreVisualState` ❌ 没还原 activeWhen → 顺手补 inverse 逻辑
5. `apps/design-mcp/src/tools/domain/misc-grouped.ts` `visual_state.add` + `update` zod ❌ 不接受 activeWhen 参数 → 加 schema + handler 透传

3 包 build + restart（design-api PID 73882/46667 + MCP PID 96329 等）后全链路打通。

**验证**：
- schema 持久化 activeWhen 字段 ✅（确认 3 节点：CodeModeBtn / PasswordModeBtn / PolicyCheckVisual）
- editor 渲染：ModeToggle 「验证码登录」显示主色字 + 主色 2px 下划线 ✅（用户截图确认）

**前端 SchemaRenderer Layer 1.5 早就支持 activeWhen** —— 只是后端 5 层全 strip 了拿不到值。frontend resolveStyles.ts 132-145 行的 `for (const state of node.states) { if (state.activeWhen ...) }` 逻辑无需改动。

### 修复（2026-06-01 已落地）

定位：5 处源代码全部 silent strip activeWhen 字段：

1. `features/design-schema/src/validators/index.ts` `VisualStateSchema` zod ❌ 不认 → 加 `activeWhen: z.string().optional()`
2. `features/design-operations/src/types/operations/visual-state.ts` `VisualStateAddOp.params` + `VisualStateUpdateOp.params` 类型 ❌ 没声明 → 加 `activeWhen?: string` / `string | null`
3. `features/design-operations/src/operations/visual-state.ts` `executeAddState` + `executeUpdateState` ❌ 没写入 `newState` / `state` → 补 `...(params.activeWhen != null ? { activeWhen: params.activeWhen } : {})` + update 逻辑
4. `features/design-operations/src/executor/inverse.ts` `restoreVisualState` ❌ 没还原 activeWhen → 顺手补 inverse 逻辑
5. `apps/design-mcp/src/tools/domain/misc-grouped.ts` `visual_state.add` + `update` zod ❌ 不接受 activeWhen 参数 → 加 schema + handler 透传

3 包 build + restart（design-api PID 73882/46667 + MCP PID 96329 等）后全链路打通。

**验证**：
- schema 持久化 activeWhen 字段 ✅（确认 3 节点：CodeModeBtn / PasswordModeBtn / PolicyCheckVisual）
- editor 渲染：ModeToggle 「验证码登录」显示主色字 + 主色 2px 下划线 ✅（用户截图确认）

**前端 SchemaRenderer Layer 1.5 早就支持 activeWhen** —— 只是后端 5 层全 strip 了拿不到值。frontend resolveStyles.ts 132-145 行的 `for (const state of node.states) { if (state.activeWhen ...) }` 逻辑无需改动。

---

## ISSUE-9：部分 color-类 CSS 属性的 $token: 引用未被 SchemaRenderer 解析

**发现时间**：2026-06-01，对账 craft-checkbox 落库渲染
**严重度**：P0（影响多处节点边框/背景色等装饰）
**结论**：误诊 ⚠️ **实际上 token resolver 没问题**——经源码核查 (`features/design-engine/src/styles/resolveTokens.ts`)，`resolveTokensInStyles` 对所有 CSS 属性等价处理，无 whitelist。borderColor / borderBottomColor 等都能解析。截图中 PolicyCheckVisual 边框看不清是因为 `$token:colors.border = #DEE0E6` 颜色本身极浅（本来就接近白）+ 1.5px 边框窄 + 屏幕分辨率/编辑器缩放导致视觉弱。后续如要更明显可改为 `colors.gray300` 但不是 bug。

### 现象

| CSS 属性 | $token 引用 | 渲染结果 |
|---|---|:---:|
| `color` | $token:colors.textSecondary | ✅ 解析 |
| `backgroundColor` | $token:colors.surfaceElevated | ✅ 解析 |
| `borderColor`（PolicyCheckVisual）| $token:colors.border | ❌ 未解析 |
| `borderBottomColor`（CodeModeBtn active）| $token:colors.primary | ❌ 未解析（同 ISSUE-8 路径）|
| `background` 字符串内嵌 token（v2 BgBlobTopRight）| ...$token:colors.primaryLight... | ❌ 整字符串无效（已知）|

### 推测根因

SchemaRenderer 的 token resolver 可能只对常用 CSS 属性白名单做 $token 替换，遗漏了 borderColor / borderBottomColor / borderTopColor 等子属性。

### 验证方法

将 PolicyCheckVisual 的 borderColor 临时改为硬编码 `#DEE0E6`，观察是否显示边框：
- 显示 → 确认是 token resolver 路径问题
- 仍不显示 → 是 visualState 渲染机制问题

### 临时绕行

将所有 v3 落库的 borderColor / borderBottomColor 改为 rgba/hex 硬编码（接受 R-STRUCTURE-02 风险），等 SchemaRenderer 修复后改回 $token。

---

## v3 重新分析后的最终诊断

| 层 | 状态 |
|---|---|
| **视觉设计（schema 落库）** | ✅ **90%+ 完善**——5 个 craft 改动 schema 全对 |
| **前端渲染管线** | 🐛 至少 3 个 bug：ISSUE-1（snapshot 服务返回 fallback 默认登录页 vs editor 渲染正常）+ ISSUE-8（activeWhen 不消费）+ ISSUE-9（部分 color 属性 $token 不解析）|

后续修复优先级：ISSUE-8 / 9（影响 editor 实际渲染） > ISSUE-1（仅影响 snapshot 服务，editor 已能查看）。
