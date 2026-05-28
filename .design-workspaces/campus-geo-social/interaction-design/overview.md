# 校园地理社交 · 全局交互规范（Overview）

> **范围**：本文档是全部 64 个页面级交互规格的**共同基线**。每个 `pages/<id>.md` 在涉及反馈层级、加载、错误、转场、动效参数时**只引用本文 #锚点**，不再重复定义。
>
> **来源**：合并 `interaction-patterns.md`（skill 默认规范）+ `design-system/theme.json#transitions`（项目动效参数）+ `_index.json#globalState`（全局状态变量）+ `product-analysis/PRD.md#非功能需求`。
>
> **版本**：v1.0 · 2026-05-28

---

## 一、反馈层级体系（L0–L5）

所有操作反馈分为 6 层，**层级必须匹配操作的重要性**。各页 md 中引用本表，禁止自创层级。

| 层级 | 适用场景 | UI 形式 | 时长/触发 | 项目对齐 |
|:---:|---------|---------|---------|---------|
| **L0** 即时 | 任意点击 / 触摸 / 长按 | `scale(0.97)` + shadow 降级 + 涟漪（圆按钮）/ 颜色加深（普通元素）| 100-150ms `transitions.fast` | 触觉：iOS Selection / Android impactLight |
| **L1** 微反馈 | 点赞 / 收藏 / 切换 Tab / 数字跳动 | 图标弹动 + 颜色变化（草莓粉/薄荷绿）+ 数字 +1 上飘 200ms | 200-400ms `transitions.normal` | 不阻塞，不发请求时 100% 乐观更新 |
| **L2** 轻提示 | 操作成功 / 信息确认 / 弱失败 | Toast（顶部下滑） / Snackbar（底部上滑） | 2-3s 自动消失 | 文案不超 14 字，icon 用 success / info / warning |
| **L3** 中反馈 | 表单提交 / 网络请求 / 上传 | 按钮内 spinner + 表单禁用 + 进度条 | 与异步操作同步，超时 15s | spinner 用项目 token `motion.strategy=spring` |
| **L4** 强确认 | 不可逆 / 重大变更（拉黑 / 删除 / 注销 / 充值 / 加好友 / 解锁胶囊）| Modal 二次确认（cta 倒计时 3s）+ 标题红色（删除类）/ 主色（确认类）| 用户主动关闭 | 必须有"取消"按钮，且默认聚焦"取消"（防误触）|
| **L5** 全屏状态 | 空数据 / 网络断开 / 严重错误 / Loading 占位 | 全屏 EmptyState / ErrorState / SkeletonScreen + 引导操作 | 持续到状态恢复 | 配青春治愈风手绘插画，文案要温暖 |

### 触觉反馈约定（移动端）

| 场景 | 强度 | iOS API | Android |
|------|-----|---------|---------|
| 普通按钮 click | 轻 | `UIImpactFeedbackGenerator.light` | `HapticFeedbackConstants.KEYBOARD_TAP` |
| 撒网/埋胶囊/解锁 | 中 | `medium` | `IMPACT_TAP` |
| 错误/失败 shake | 重 | `notification.error` | `IMPACT_REJECT` |
| 长按 / 开关 toggle | 选择 | `Selection` | `CLOCK_TICK` |

---

## 二、加载策略

### 2.1 加载模式选择

| 场景 | 策略 | 实现要点 |
|------|------|----------|
| **首次进入页面** | Skeleton 骨架屏 | 占位形状=最终布局；动画 1.2s 移动渐变；3s 仍未加载完成切到 ErrorState |
| **下拉刷新** | 顶部 PullIndicator | 不清空已有内容；下拉触发阈值 60px；释放回弹用 `transitions.normal`（spring）|
| **上拉加载更多** | 底部 LoadingFooter | 距底部 200px 触发；3 种态："loading 中" / "加载失败 点击重试" / "没有更多了" |
| **按钮触发请求** | 按钮内 Spinner | 按钮禁用 + 文字隐藏 + 24x24 spinner 居中；超时 15s 强制恢复 |
| **后台静默刷新** | 无 UI 变化 | 数据原地替换；轻微数字跳动用 L1；用户正在编辑时**禁止刷新**（保留草稿） |
| **>5s 长加载** | 进度条 + 阶段文案 | 文案如「正在打捞…」「正在解锁胶囊…」「正在通过学信网验证…」|

### 2.2 加载失败恢复策略

| 失败场景 | UI 响应 | 用户动作 |
|---------|--------|---------|
| 首次加载失败（无旧数据）| L5 全屏 ErrorState + 重试按钮 + 错误原因 | 点击重试 |
| 刷新失败（有旧数据）| L2 Toast「刷新失败，请检查网络」+ 保留旧数据 | 用户决定是否再下拉 |
| 加载更多失败 | LoadingFooter 切「加载失败，点击重试」 | 点 footer 重试 |
| 静默刷新失败 | 忽略，不打扰用户；下次主动操作时自然重试 | 无 |
| 提交类失败（带乐观更新）| 回滚乐观更新 + L2 Toast + 受影响项标灰 + 1s 后恢复 + 红字提示 | 重新提交 |

---

## 三、错误处理模式

### 3.1 错误分类 & UI 模式

| 错误类型 | 触发码 / 场景 | UI 模式 | 用户路径 |
|---------|-------------|---------|---------|
| 表单校验错误 | 前端校验 | Inline 红字（字段下方 4px） + 字段 border-error + L0 shake | 修改输入即清错 |
| 业务逻辑错误 | 400 / 422 业务码 | Inline 红字 / L2 Toast（看是否绑字段） | 修改后重试 |
| 权限错误 | 401 未登录 / 403 无权限 | L4 Modal「请先登录」/ L2 Toast「无权操作」+ 跳转登录 | 去登录 |
| **认证状态错误** | `verificationStatus != approved` | L4 Modal「需完成认证才能使用此功能」+ 立即跳转 `00-auth-status` | 走认证流程 |
| **跨校漫游限制** | `isInRoamingMode == true` 且尝试互动 | L2 Toast「跨校漫游中，仅能浏览」+ 按钮置灰 | 切回主校园 |
| **钱包余额不足** | `wallet.coin/gem < required` | L4 Modal「积分/钻石不足」+ 「去赚」/「去充值」双按钮 | 跳任务页/充值页 |
| **位置权限拒绝** | OS 权限 deny | L5 EmptyState + 「打开定位权限」按钮 → 跳系统设置 | 系统设置授权 |
| 网络错误 | timeout / connection refused | L2 Toast「网络异常，请检查」+ 重试按钮 | 检查网络后重试 |
| 服务错误 | 500 / 502 / 503 | L2 Toast「服务繁忙，请稍后」 | 稍后重试 |
| 内容审核拦截 | M9 审核失败 | L4 Modal「内容违规，原因：xx」+ 「修改」/「申诉」双按钮 | 修改或申诉 |
| 未知错误 | 未捕获异常 | L2 Toast「出了点问题」+ 上报 Sentry | 联系客服（M11 反馈） |

### 3.2 表单校验时机

```
即时（onChange）: 格式类 — 手机号位数、邮箱、密码长度
失焦（onBlur）:   规则类 — 密码强度、昵称合规、生日范围
提交（onSubmit）:  依赖类 — 两次密码一致、必填项检查、协议勾选
异步（debounce 500ms）: 唯一性 — 昵称占用、手机号已注册、邀请码有效性
```

---

## 四、微交互 & 转场（与 `theme.json#transitions` 对齐）

### 4.1 转场 Tokens（直接引用，禁自定义）

| Token | 值 | 适用 |
|------|----|------|
| `transitions.fast` | `200ms cubic-bezier(0.34, 1.56, 0.64, 1)` | 点击 / 小切换 / 涟漪（spring 微回弹）|
| `transitions.normal` | `300ms cubic-bezier(0.34, 1.56, 0.64, 1)` | 按钮按下 / 卡片展开 / Tab 切换 |
| `transitions.slow` | `500ms cubic-bezier(0.22, 1, 0.36, 1)` | 缓慢出场（页面跳转，无回弹） |
| `transitions.page` | `transform 350ms + opacity 250ms ease-out` | 页面级 push / modalUp |

### 4.2 页面转场（与 `_index.json#navigation.flows[].transition` 对齐）

| 转场类型 | 视觉 | 时长 | 触发场景 |
|---------|------|------|---------|
| `push` | 新页面从右滑入（X: +100% → 0），旧页面同时左移 -30% 并叠盖暗化 | `transitions.page` 350ms | 进入子页面 |
| `pop` | 当前页右滑出（0 → +100%），下层页面右移 -30% → 0 | 300ms ease-in | 返回 / 左滑手势 |
| `modalUp` | 底部上滑（Y: +100% → 0）+ 背景蒙层 0 → 0.45 透明度 | `transitions.page` 350ms | sheet / 弹窗 / publish-entry |
| `fade` | 交叉淡入淡出（opacity 0 → 1 / 1 → 0） | 250ms ease-out | Tab 切换 / 地图<->列表模式 / splash → onboarding |

### 4.3 组件级微交互

| 组件 | 动作 | 动效 | 时长 |
|------|-----|------|------|
| 主按钮 hover | scale(1.02) + shadow +1 级 | `transitions.fast` | 200ms |
| 主按钮 press | scale(0.97) + shadow -1 级 | `transitions.fast` | 200ms |
| 卡片 press | scale(0.99) + border 主色微亮 | `transitions.fast` | 200ms |
| 输入框 focus | border-color: borderFocus + label 上浮 -8px + 缩小 0.85 | 200ms ease-out | 200ms |
| 开关 toggle | thumb 滑动 + track 主色填充 | spring | 200ms |
| 列表项滑动删除 | 右滑 -80px 显示删除按钮，点击后 slide-out + 后续项上移 | spring | 300ms |
| Toast 进出 | 顶部下滑 + opacity 0→1（进） / 上滑 + opacity 1→0（出） | spring | 进 300ms / 出 200ms |
| Modal 进出 | 蒙层 fade + 主体上滑（弹窗）/ scale 0.96→1（中心弹窗）| spring | 300ms |
| Tab 红点出现 | scale 0 → 1.2 → 1 弹跳 + 数字 +1 | spring | 400ms |

### 4.4 项目特色微交互（青春治愈风）

| 场景 | 特色动效 | 说明 |
|------|---------|------|
| 撒网（M2）| 网从顶部抛物线落下 + 涟漪扩散 + 触觉 medium | 1.5s 仪式感动画 |
| 埋胶囊（M3）| 胶囊从手心向下飘落到地图点 + 金色光点缩放 | 1.2s |
| 解锁胶囊（M3）| 胶囊壳裂纹 → 拆开 → 内容淡入 + 金粉飘落 | 3s 完整仪式 |
| 发送动态成功（M1）| 按钮 ✓ + 粒子从按钮飘向首页方向（导航前的过渡）| 800ms |
| 加好友通过（M6）| 双向头像中心碰撞 + 爱心闪现 | 600ms |
| 跨校切换（M4）| 当前校徽缩小 → 地球旋转 → 目标校徽放大 | 1s 转场动画 |
| 充值成功（M7）| 钻石从屏幕中央飞入右上钱包 + 数字翻牌 | 700ms |

---

## 五、全局常驻状态对交互的影响

参考 `_index.json#globalState.variables`。每页 md 必须考虑以下全局态对自己的影响：

| 全局变量 | 当 != 期望时 | 对所有页面的统一行为 |
|---------|-------------|---------------------|
| `currentUser == null` | 未登录 | 自动跳 `00-login`，仅 splash/onboarding/login/register/forgot/community-guidelines/about 可访问 |
| `verificationStatus != approved` | 未通过认证 | 互动类操作（发动态/撒网/加好友/聊天/埋胶囊/充值）一律拦截 → L4 Modal「需完成认证」 |
| `verificationStatus == reviewing` | 认证中 | 显示 banner「认证审核中（预计 24h）」，浏览仍可用 |
| `verificationStatus == rejected` | 认证拒绝 | 顶部 banner 红色「认证未通过 立即重试」→ 跳 `00-auth-status` |
| `isInRoamingMode == true` | 漫游中 | 全局右上角持续显示「漫游中 · 母校」标识；所有互动按钮置灰 + L2 Toast「跨校漫游中，仅能浏览」 |
| `wallet.coin < required` | 积分不足 | 道具购买、撒网（消耗网）等触发 L4 Modal「积分不足 去赚」→ 跳 `07-tasks` |
| `wallet.gem < required` | 钻石不足 | 充值类触发 L4 Modal「钻石不足 去充值」→ 跳 `07-recharge` |
| `deviceLocation == null/denied` | 无定位 | M1/M2/M3 核心功能全部 L5 EmptyState「打开定位权限」 |
| `privacyMode == true` | 隐私模式 | 全局 banner「隐私模式开启中」；自己不出现在他人捞网；不收新招呼；个人主页对他人收紧 |
| `unreadCounts.*` | 有未读 | 对应 Tab/入口红点；数字 ≥99 显示「99+」|

---

## 六、全局快捷手势

| 手势 | 触发 | 适用范围 |
|------|------|---------|
| 左缘右滑（10°内）| iOS pop 返回 / Android 等同 | 所有非根页面 |
| 双指捏合 | 地图缩放 | `01-home-map` / `01-publish-pick-location` / `03-capsule-list`（地图模式）/ `10-footprints` |
| 长按 600ms | 上下文菜单（动态卡片→举报/屏蔽，消息→撤回/复制/转发，胶囊→分享）| 见各页 |
| 上滑收藏 | 卡片上滑入收藏（仅 `02-fishing-result`）| 见 M2 |
| 下滑关闭 | 全屏弹层下滑 60px 关闭（modalUp 类页面）| `01-publish-entry` / `02-greet-compose` / `12-search` 等 modal |

---

## 七、空状态库（手绘插画风）

| 场景 | 插画 | 文案 | CTA |
|------|-----|------|-----|
| 列表为空 | 小怪兽抱着空盒子 | 「这里还空荡荡呢」 | 「去逛逛」（视场景跳转） |
| 无网络 | 断线小图标 | 「网络好像迷路了」 | 「重试」 |
| 加载失败 | 小怪兽挠头 | 「服务器闹脾气了」 | 「再试一次」 |
| 无搜索结果 | 放大镜+问号 | 「没找到匹配的内容」 | 「换个关键词」 |
| 无好友 | 两个挥手的人 | 「先去捞网认识朋友吧」 | 「去捞网」→ `02-fishing-cast` |
| 无未读消息 | 小信封安静睡觉 | 「全都看完啦」 | — |
| 无足迹 | 脚印 + 校园 | 「快去校园打卡留下足迹吧」 | 「去发动态」 |
| 无胶囊 | 空地+铲子 | 「这里还没有胶囊」 | 「去埋一个」→ `03-capsule-bury` |
| 跨校漫游限制 | 望远镜 + 远山 | 「漫游模式仅能浏览」 | 「切回母校」 |
| 认证未通过 | 学生证 + 警示 | 「先完成学籍认证」 | 「立即认证」 |
| 隐私模式 | 隐身斗篷 | 「隐私模式开启中」 | 「调整隐私设置」 |

---

## 八、Tab 切换 & 顶部全局栏交互

### 8.1 Tab Bar（4 个）

`01-home-map · 02-fishing-cast · 06-conversation-list · 10-profile-self`

- **切换动画**：`fade` 250ms，无图标位移
- **重复点击当前 Tab**：滚回顶部 + 若已在顶则触发刷新（home/list 类）
- **未读红点**：右上角，9+ 内显数字，≥10 显「N+」（实心圆 = 普通，红圆带数字 = 计数）
- **凸出 +**：可选凸出 Tab，在 `01-home-map` 与 `02-fishing-cast` 之间，触发 `01-publish-entry`

### 8.2 顶部状态栏（参考 `01-home-map`）

- 左：当前校园切换器（点击 modalUp `04-campus-switch`，漫游中显示「漫游中 · 母校」标识）
- 中：模式切换器（地图 / 列表 / 仅 home 有）
- 右：搜索（→ `12-search`）+ 铃铛（→ `08-notification-center`，带红点）

### 8.3 全局 Banner（按优先级，最多一条）

| 优先级 | 触发条件 | Banner 文案 | 配色 |
|------|---------|-----------|------|
| P0 | `verificationStatus == rejected` | 「认证未通过，立即重新提交」 | 红 |
| P1 | `verificationStatus == reviewing` | 「认证审核中（约 24h）」 | 黄 |
| P2 | `isInRoamingMode == true` | 「跨校漫游中 · 仅能浏览」 | 薄荷绿 |
| P3 | `privacyMode == true` | 「隐私模式开启中」 | 薰衣草 |
| P4 | OS 推送权限 deny + 有未读 | 「打开通知，及时收到招呼/胶囊」 | 奶油黄 |

Banner 高度 36px，点击跳对应处理页 / 设置页。

---

## 九、共享组件交互索引

为防止跨页重复定义，以下组件在 `interaction-design/components/` 单独建文档，各页只引用：

| 组件 | 引用 | 出现在 |
|------|-----|--------|
| `MomentCard` 动态卡（缩略）| `components/moment-card.md` | home-feed / home-map 卡片 / moment-detail / profile / footprints |
| `PersonCard` 人卡 | `components/person-card.md` | fishing-result / greets-* / friends-* / profile-other |
| `CapsuleCard` 胶囊卡 | `components/capsule-card.md` | capsule-list / home-map 金点 / footprints |
| `VisibilitySheet` 可见性选择器 | `components/visibility-sheet.md` | publish-visibility（行级展开多选项+子面板）|
| `MediaPicker` 媒体选择器 | `components/media-picker.md` | publish-edit / capsule-bury / profile-edit / report / feedback |
| `LocationPicker` 地点选择器 | `components/location-picker.md` | publish-pick-location / capsule-bury 子流程 |
| `MapView` 地图视图 | `components/map-view.md` | home-map / publish-pick-location / capsule-list（map 模式）/ footprints |
| `BottomTabBar` 底部导航 | `components/bottom-tab-bar.md` | 4 个 Tab 根页面共享 |
| `EmptyState` 空状态 | `components/empty-state.md` | 全局（含第七章 11 种空状态 variant） |
| `LoadingSkeleton` 骨架屏 | `components/loading-skeleton.md` | 全局（按布局类型 variants：list / grid / card / detail） |
| `ConfirmDialog` 二次确认 | `components/confirm-dialog.md` | L4 强确认场景统一组件 |
| `Toast` 轻提示 | `components/toast.md` | L2 全局共享 |

> 这些组件文档**仅在被多页引用且交互复杂度足够**时才单独建。简单的按钮 / 输入框 / 头像不需要单独文档，按本文 §4.3 通用规则即可。

---

## 十、引用约定

- 各页 md 引用本文用形式：`@overview#二-加载策略#2.1-加载模式选择`
- registry 中节点 `interaction.ref` 可指向 `interaction-design/pages/<id>.md#操作清单:<行>` 或 `interaction-design/overview.md#<锚点>`
- 当某页发现新的全局规律 / 通用组件 → **立刻回填到本文档**，不要复制粘贴

---

> **下一步**：本文档完成后，开始逐模块编写 `pages/<id>.md`，所有引用统一指向本文 §锚点。
