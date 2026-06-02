# schema-spec：7 类衍生视图节点的样式规格要点

> 适用任务：`D-X-coverage`、涉及衍生视图的 `D-X-styles`
> interaction 阶段建了 7 类衍生视图节点，每类的样式规格有特定要点。本文是落 styles 时的速查清单。

## 1. 类 1：数据加载态（Loading）

| 子类 | 样式要点 |
|------|---------|
| 全屏骨架屏（FeedSkeleton）| 占位结构与最终内容形状一致；`backgroundColor: $token:colors.gray100~gray300`；shimmer 动画 |
| 局部骨架屏（CardSkeleton）| 同上但局部 |
| 翻页 loading（ListLoadingMore）| 居中 + spinner + "加载中..."（小字号，gray500）|
| 下拉刷新（RefreshIndicator）| 顶部固定 + 旋转图标 + 进度条 |
| 全屏 spinner（LoadingOverlay）| `position: fixed` + 半透明黑底 + 居中 spinner |
| 按钮内 spinner（SubmitSpinner）| 22-24px + rotate 1s linear infinite |

### shimmer 实现
```jsonc
node.styles = {
  background: "linear-gradient(90deg, $token:colors.gray200 0%, $token:colors.gray100 50%, $token:colors.gray200 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite ease-in-out",
  borderRadius: "$token:radius.md"
}
node.animation = {
  css: { name: "shimmer", duration: "1.5s", iterationCount: "infinite", keyframes: [...] }
}
```

### LoadingOverlay 实现
```jsonc
n_loading.styles = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(255,255,255,0.7)",       // 或 token:colors.bgPage with alpha
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}
```

### 红线
- ❌ 用品牌色做骨架屏 → 抢戏
- ❌ shimmer 时长 < 1s 或 > 2.5s → 不舒适
- ❌ 骨架结构与真实卡片差距大 → 切换跳变
- ❌ visualSpec.weight > 4

## 2. 类 2：空态视图（Empty）

| 节点 | 样式要点 |
|------|---------|
| 容器 | `display: flex; flexDirection: column; alignItems: center; padding: $token:spacing.xxl` |
| 插图 | 居中 + 200×200 左右 + materialSpec kind=illustration |
| 标题 | `fontSize: $token:typography.h4.fontSize; fontWeight: semibold; color: textPrimary; marginTop: $token:spacing.md` |
| 描述 | `fontSize: body; color: textSecondary; textAlign: center; marginTop: xs` |
| 按钮 | secondary 风格 + icon 增强；marginTop: lg |

### 配色
- 插图：使用 token 色（不要鲜艳）
- 文字：textPrimary / textSecondary（标题 vs 描述）
- 按钮：secondary 不抢主流程

### 不同空态需独立节点
- EmptyFeedState（列表空）
- NoSearchResultState（搜索无）
- NoFilterMatchState（筛选无）
- OfflineNoDataState（离线无缓存）

### 红线
- ❌ 所有空态共用一个节点 + 不同文案 → 设计偷懒
- ❌ "暂无数据"四个字 + 灰色文字 → 产品力低
- ❌ 行动按钮缺失（必须有 1 个 CTA）
- ❌ visualSpec.weight：主体 5，按钮 8（按钮引导很重要）

## 3. 类 3：错误态视图（Error）

### 整页错误（5xx / 网络断）
```jsonc
n_serverError.styles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "$token:spacing.xxl",
  minHeight: "100vh"
}

// 内含：错误图示 + 标题（"服务器走神了"）+ 描述 + 重试按钮 primary + 客服入口（文字链）
```

### 区域错误（局部 fetch 失败）
```jsonc
n_sectionError.styles = {
  padding: "$token:spacing.lg",
  textAlign: "center",
  color: "$token:colors.textSecondary",
  border: "1px dashed $token:colors.borderLight",
  borderRadius: "$token:radius.md"
}
```

### 字段行内错误
```jsonc
// v2.5 minimal-debug → design 阶段 token 化补完整
n_phoneError.styles = {
  color: "$token:colors.error",                    // 替代 minimal-debug "#ef4444"
  fontSize: "$token:typography.body-sm.fontSize",  // 替代 "12px"
  lineHeight: "$token:typography.body-sm.lineHeight",
  marginTop: "$token:spacing.xs",
  minHeight: "16px"                                // 防塌陷
}
```

### 红线
- ❌ 错误页用刺眼霸屏红 → 用户被吓到
- ❌ 错误页缺重试按钮 → 用户无路可走
- ❌ 行内错误只写文字不变输入框边框 → 用户看不到关联（input.states.error 必须配合）
- ❌ minimal-debug 不升级为 token 引用

## 4. 类 4：权限/身份态视图（Auth）

### 未登录占位
```jsonc
n_notLoggedIn.styles = {
  // 保留 nav-bar 上方，仅替换核心内容区
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "$token:spacing.xl"
}

// 内含：引导插画 + 解释文案 + 登录 CTA primary
```

### 红线
- ❌ 未登录态全屏遮罩 → 用户迷失
- ❌ 不保留 nav-bar / 页面架构 → 用户不知道在哪里
- ❌ "未登录"四字打发 → 产品力低

## 5. 类 5：业务状态分支视图（Business）★

每个状态独立 layout——**绝不复用**。

### 状态 badge
```jsonc
statusBadge.styles = {
  padding: "$token:spacing.xs $token:spacing.sm",
  borderRadius: "$token:radius.full",
  fontSize: "$token:typography.caption.fontSize",
  fontWeight: "$token:typography.caption.fontWeight",
  backgroundColor: "$token:colors.<对应状态色>",
  color: "$token:colors.textInverse"
}

// 状态色：
//   pending_payment   → warning（橙）
//   awaiting_shipment → info（蓝）
//   shipping          → primary
//   completed         → success（绿）
//   cancelled         → textSecondary（灰）
//   refunding         → error（红，柔和）
```

### 时间线 / 进度条
```jsonc
timeline.styles = {
  display: "flex",
  flexDirection: "column",
  gap: "$token:spacing.sm"
}
// 每节点：圆点 + 文字（已完成圆点 success；当前 primary；未来 gray400）
```

### 红线
- ❌ "一个组件 + 大量条件样式"覆盖所有业务态 → 违反 R-VIEW-BUSINESS-01
- ❌ 不同状态用同一个按钮颜色 → 失去状态识别
- ❌ 业务对象状态枚举的某值漏建视图 → 用户切到该状态白屏

## 6. 类 6：过渡反馈节点（Feedback）

### Toast 4 套统一规格
```jsonc
toastBase.styles = {
  position: "fixed",
  top: "env(safe-area-inset-top, 16px)",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "$token:spacing.sm $token:spacing.md",
  borderRadius: "$token:radius.md",
  boxShadow: "$token:shadows.lg",
  fontSize: "$token:typography.body-sm.fontSize",
  display: "flex",
  alignItems: "center",
  gap: "$token:spacing.xs",
  color: "$token:colors.textInverse",
  zIndex: 110
}

toastVariants = {
  success: { backgroundColor: "$token:colors.success" },
  error:   { backgroundColor: "$token:colors.error" },
  warning: { backgroundColor: "$token:colors.warning" },
  info:    { backgroundColor: "$token:colors.info" }
}
```

### Snackbar / InlineSuccess / Countdown / Progress
- Snackbar：底部 / 带操作按钮 / 底色与 Toast 一致
- InlineSuccess：药丸圆角 + success 底 + 白字 + 短暂显示
- Countdown：mono 字体（防数字宽度跳变）
- Progress：渐变填充 + 百分比文字

### 红线
- ❌ Toast 4 套样式不统一 → 用户认知混乱
- ❌ Countdown 用比例字体 → 数字跳宽
- ❌ Toast 出入无动画 → 突兀

## 7. 类 7：屏级 overlays（screen.overlays）

详见 `global-overlay-design.md`（屏级 overlays 与项目级 globalOverlays 同源同规格）。

差异：
- 屏级 overlay 仅本屏渲染，随屏切换销毁
- 项目级 globalOverlays 跨屏共享、持续存在

design 阶段对屏级 overlays 的视觉规格要求与全局一致——按 Modal/BottomSheet/Drawer 三套统一规格。

## 8. 衍生视图覆盖核对（D-X-coverage）

```
对屏的每个衍生视图节点（按 7 类）：
  □ 节点 styles 是否完整（覆盖布局/尺寸/颜色/排版/间距）？
  □ 节点是否有 meta.design.summary + rationale？
  □ 节点 visualSpec.weight 是否合理（loading ≤ 4，empty 主体 5 / 按钮 8）？
  □ 节点 materialSpec（如需要素材）是否完整？
  □ 节点的相关 visualStates 是否齐？
```

## 9. md 落地（D-X-coverage 衍生视图段）

```markdown
## 衍生视图视觉规格覆盖（D-X-coverage）

### 类 1 加载态
- FeedSkeleton (n-load-1)
  - styles: ✅ shimmer 动画 + gray100→200→300 三层渐变
  - meta.design: ✅ summary "数据加载占位" / weight=3
  - 红线：N/A

### 类 2 空态
- EmptyFeedState (n-empty-1)
  - styles: ✅ flex 居中 + padding xxl
  - 子节点：插图 / 标题 / 描述 / 行动按钮 4 件套全
  - meta.design: ✅
  - materialSpec: ✅ kind=illustration

### 类 5 业务态
- OrderPendingPaymentView ✅
- OrderShippingView ✅
- OrderCompletedView ✅
- OrderCancelledView ✅
- OrderRefundingView ❌ → 必须补 / 走 UpstreamChallenge

### 7 类覆盖矩阵
| 类型 | 节点数 | styles 完整 | meta 完整 | materialSpec 完整 |
|------|:------:|:----------:|:--------:|:-----------------:|
| loading | 3 | 3/3 | 3/3 | 3/3 |
| empty | 1 | 1/1 | 1/1 | 1/1 |
| error | 4 | 4/4 | 4/4 | 4/4 |
| auth | 0 | N/A | N/A | N/A |
| business | 5 | 4/5 ❌ | 4/5 | 5/5 |
| feedback | 4 套 toast | ✅ | ✅ | N/A |
| overlays | 2 | ✅ | ✅ | ✅ |

### 不一致项 + 修复
- OrderRefundingView 缺 → 已发起 UpstreamChallenge 让 interaction 阶段补节点
```

## 10. 红线汇总

- ❌ 衍生视图节点没 styles 或没 meta.design → R-VIEW-DESIGN-01
- ❌ 把所有错误态用一个 Toast 替代 → 整页错误必须有整页视图
- ❌ 空态用"暂无数据"四字 → 产品力低
- ❌ 业务状态枚举漏一个状态没建视图 / 没设计样式
- ❌ Toast 4 套规格不统一 / 出入动画不一致
- ❌ 衍生视图节点视觉权重 > 5（除空态行动按钮）
- ❌ minimal-debug styles 不升级为 token 引用
- ❌ 同类衍生视图（如所有屏的骨架屏）跨屏配色不一致
