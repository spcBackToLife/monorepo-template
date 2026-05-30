> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-overlays
> 对应 schema 字段：本屏判定不新建屏级 overlays（详见下文 §1 主动审视）

# Step I-M1-overlays: 00-login — 屏级 overlays（modal / bottomSheet / drawer）

> 详细方法见 `methodology/07-derivative-views.md` 类 7。
> 详细 schema 见 `schema-spec/overlays.md`。
> 上游依赖：events.md（nav.go 跳转替代 modal）/ view-business.md（LockedView 整屏切换替代 sheet）/ project.globalOverlays（全局兜底已就位）。

## 1. 主动审视：5 类 overlay × 本屏潜在需求

### 1.1 5 类穷举判定

| 类型 | 是否需要 | 论证（不只是"现状盘点"，而是"是否有更优形式"）|
|------|---------|-----------------------------------------|
| **modal** | ❌ 不需要 | 见 §1.2 A 论证 |
| **bottomSheet** | ❌ 不需要 | 见 §1.2 B 论证 |
| **drawer** | ❌ 不需要 | 登录页无侧栏导航 / 筛选场景；无任何业务诉求要从屏幕边缘滑出辅助内容 |
| **toast** | ✅ 已落 | events.md ui.showToast actions 形式（多场景）；登录场景的 Toast 风格统一已通过宿主全局服务承接 |
| **custom**（教学浮层 / 蒙层引导）| ❌ 不需要 | 登录是用户主动入口，无需新手教学；表单字段已通过 placeholder + label 自描述 |

### 1.2 两个真值得论证的候选

#### A. 忘记密码用 modal 还是整页跳转？

**当前方案（events 已落）**：ForgotLink.click → `nav.go("00-forgot-password")` 整页跳转

**候选 modal 方案**：在本屏建 ForgotPasswordModal 节点，含手机号输入 + 发送找回链接，点蒙层关闭

| 维度 | nav.go 整页（已采纳）| modal 候选 |
|------|---------------------|-----------|
| 用户心智模型 | "我去到了找回密码页"，浏览器返回可回 | "我在登录页弹出找回流程"，叉关闭即回 |
| 流程长度 | 找回是多步流程（输手机 → 收短信 → 输验证码 → 设新密码 4 步），整页承载更合理 | modal 装 4 步流程视觉局促 + 中途想看登录页又看不到 |
| 错误隔离 | 找回页有自己的 errors / loading / boundaries 套件（独立屏） | 与登录表单 view 变量混用（forgotPhone / forgotCountdown 等），命名冲突风险 |
| dataSource 复杂度 | 找回页独立 ds-forgot-* 系列接口 | 本屏要新增 ds-forgot-send / ds-forgot-verify / ds-forgot-reset 等多个 ds，ds-login 紧耦合 |
| 主流社交 App 实践 | 微信 / QQ / 小红书 / B 站登录均整页跳转 | 部分早期 PC 端用 modal，移动端罕见 |

**决策：维持 nav.go 整页**——产品分析阶段已锁定（M1 模块的 navigation 已挂 00-forgot-password 屏 ID），改 modal 要发起 challenge 改 product navigation + 大量 dataSource 重设计，不在本任务范围。

#### B. 锁定状态用 bottomSheet 还是整屏 LockedView？

**当前方案（view-business 已落）**：LockedView 节点替换 NormalFormView 整屏可见性切换

**候选 bottomSheet 方案**：表单半透明 + 锁定提示从底部滑出

| 维度 | LockedView 整屏（已采纳）| bottomSheet 候选 |
|------|------------------------|-----------------|
| 信息层级 | 锁定是"主要状态"——用户当前唯一能做的事是等 / 改密码 | bottomSheet 暗示"还能操作下面的表单"——但实际表单不能用 |
| 视觉一致性 | 与 schema-spec/overlays.md §2 示例 "overlay-locked-sheet" 模板一致 ☑️ | 同上 |
| 双层叠加风险 | 单层 LockedView 简洁 | sheet + 半透明背景 + 倒计时 + 关闭叉，视觉复杂度上升 |
| 误操作风险 | 表单完全隐藏，用户只能看 / 等 / 改密码 3 选 | 表单仍可见，用户可能误点 disabled 按钮反复疑惑 |
| boundaries.md D-B9 决策 | 明文要求 "整表单 disabled + LockedView 显示"——LockedView 整屏就是它的视觉表达 | 与 D-B9 文字 "LockedView 显示" 不直接对应 |

**决策：维持 LockedView 整屏切换**——boundaries D-B9 已锁定的决策，且整屏切换 UX 更清晰。模板示例的 "overlay-locked-sheet" 是参考方案而非强制——本屏选了更契合 D-B9 的整屏路径。

### 1.3 全局 overlay 在本屏的协同（已就位，本任务不重复）

本屏共享 project.globalOverlays 三个核心 overlay（已在 product 阶段建骨架 + I-global-overlay-events 任务已补 events）：

| 全局 overlay ID | 在本屏的触发 | 落位 |
|----------------|-------------|------|
| `global-offline-banner` | 网络离线时全屏顶部 banner | I-global-overlay-events 已落 events |
| `global-session-expired` | 本屏不会触发（登录页前用户本来就 anonymous，没有 session 可过期）| I-global-overlay-events 已落 events |
| `global-error-boundary` | 全局兜底错误（极端情况）| I-global-overlay-events 已落 events |

→ 本屏**不需要新建任何屏级 overlay**——全局已覆盖。

## 2. 候选方案与否决（综合表）

| 候选 | 决策 | 理由 |
|------|------|------|
| 建 ForgotPasswordModal | ❌ 否决 | events 已用 nav.go 整页；改 modal 要 challenge product navigation 决策；找回是多步流程整页更合理 |
| 建 LockedSheet | ❌ 否决 | LockedView 整屏切换更契合 boundaries D-B9；视觉双叠风险 |
| 建 RegisterModal | ❌ 否决 | 同 ForgotPasswordModal 论证（注册更是多步流程）|
| 建 PolicyDetailDrawer（点协议从右侧滑出富文本）| ❌ 否决 | events D-EV1 已决策协议链接用 ui.openUrl 跳外部页；drawer 装富文本视觉局促 |
| 建 LoginGuideOverlay（首次进登录页教学浮层）| ❌ 否决 | 登录是用户主动行为，无新手教学诉求；placeholder + label 自描述足够 |

## 3. 决策记录

- **D-OV1**：忘记密码用 nav.go 整页不用 modal —— 多步流程 + product navigation 已锁定 + 主流社交 App 移动端实践
- **D-OV2**：锁定态用 LockedView 整屏不用 bottomSheet —— boundaries D-B9 锁定 + 整屏 UX 清晰 + 不双叠
- **D-OV3**：注册同样用整页跳转 —— 同 D-OV1
- **D-OV4**：协议详情用 ui.openUrl 跳外部不用 drawer —— events D-EV1 已锁定 + drawer 容纳长富文本视觉局促
- **D-OV5**：本屏 0 新建屏级 overlay；全局 overlay 已通过 project.globalOverlays + I-global-overlay-events 覆盖
- **D-OV6**：本任务 status='skipped'（无 schema 产物）—— 与 view-empty / view-auth / view-feedback 一致约定

## 4. 红线自查

| 红线 | 状态 |
|------|------|
| R-OVERLAY-CONFLICT-01（混用 showWhen + ui.showOverlay）| ✅ 不触发（不建任何 overlay）|
| R-GLOBAL-OVERLAY-01（globalOverlays 节点存在但内部按钮缺 events）| ✅ 由 I-global-overlay-events 任务守 |
| R-GLOBAL-OVERLAY-02（三类核心全局 overlay 齐全）| ✅ 已在 product + I-global-overlay-events 落 |
| 阶段边界 | ✅ 不重组 product 节点；不写 styles |

## 5. 与其他任务的协同

| 任务 | 协同点 |
|------|--------|
| events.md ForgotLink/RegisterLink click | nav.go 整页跳转替代 modal ✓ |
| events.md ui.showToast | Toast 类 overlay 已用 actions 形式 ✓ |
| view-business.md LockedView | 锁定整屏切换替代 sheet ✓ |
| project.globalOverlays | 全局 banner/session/error 已就位 ✓ |
| I-global-overlay-events | 全局 overlay events 已挂 ✓ |
| events.md PolicyText | ui.openUrl 跳外部替代 drawer ✓ |

## 6. 给 design-planner 的提示

design 阶段实施时：

- **不需要为本屏额外预留 overlay z-index 层级** —— 仅 globalOverlays（顶层）+ Toast（globally）即可
- **LockedView 整屏切换的过渡动画**（可选）：与 NormalFormView 之间可加 fade / slide 过渡，但不是必须
- **PolicyText 链接跳外部** ui.openUrl 已在 events 决策；design 阶段可考虑给链接文字加 underline + 跳转 icon 视觉提示