# 方法论 3：加载策略 5 场景

> 适用任务：`I-X-loading`、`I-X-view-loading`（落骨架屏 / spinner / refresh 节点时回头查策略）

## 1. 5 个典型加载场景

| 场景 | 加载态 UI | 失败恢复 |
|------|----------|---------|
| 首次加载（cold start）| 全屏 skeleton（占位结构与最终内容一致）| retry 按钮 / 错误页 |
| 下拉刷新 | 顶部 spinner / 弹簧动画 | 顶部 toast，保留旧数据 |
| 加载更多（分页）| 列表底部 spinner，触底自动触发 | 底部"点击重试" |
| 按钮请求（提交 / 操作）| 按钮内 spinner + disabled + 文案变化 | shake + Toast，按钮恢复 |
| 静默刷新（后台同步）| 不打扰用户（顶部细线 / 无 UI）| 静默 retry，多次失败再提示 |

## 2. 选用决策

```
首屏 / cold-start
    ↓ 用户 0 数据
    全屏 Skeleton（结构形状与最终内容对应；shimmer 动画）

局部 fetch（用户已经在页面）
    ↓ 不影响其他区域
    contentSkeleton 替代该区域 / 该区域 spinner

关键提交（支付 / 登录 / 发布）
    ↓ 必须屏蔽其他操作
    全屏 LoadingOverlay 半透明 + spinner

静默刷新（后台同步）
    ↓ 不打扰
    无 UI / 顶部 1px 细线

下拉 / 分页
    ↓ 用户已主动触发
    交互区域局部 spinner
```

## 3. 落到 schema

`screen.meta.interaction.loadingStrategy`（5 场景对象）：

```jsonc
loadingStrategy: {
  initial:    "全屏 Skeleton —— FeedSkeleton 节点",
  refresh:    "下拉 + 顶部进度条 —— RefreshIndicator 节点",
  pagination: "底部 ListLoadingMore + 触底自动触发",
  button:     "按钮内 spinner + disabled + 文案改为'登录中...'",
  silent:     "—（本屏不需要静默刷新）"
}
```

每个有需求的场景必须有对应**衍生节点**（详见 `methodology/07-derivative-views.md` 类 1）。

## 4. 加载态视图节点对应

| 场景 | 推荐节点类型 | visibleWhen 表达式 |
|------|----------|-------------------|
| 全屏 Skeleton | `FeedSkeleton` / `ProfileSkeleton` | `{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}` |
| 局部 Skeleton | `CardSkeleton` / `AvatarSkeleton` | `{{ state.effects[xxx].status === 'pending' }}` |
| 翻页 loading | `ListLoadingMore` | `{{ state.view.loadingMore }}` |
| 下拉刷新 | `RefreshIndicator` | `{{ state.view.refreshing }}` |
| 全屏 spinner | `LoadingOverlay` | `{{ state.view.submitting }}` |
| 按钮内 spinner | `SubmitSpinner` | `{{ state.view.submitting }}` |

## 5. 配套 view 变量（落到 stateInit.view）

```jsonc
view = {
  loadingMore:  { defaultValue: false },
  refreshing:   { defaultValue: false },
  submitting:   { defaultValue: false }
}
```

`state.effects[<dsId>].status` 是 effect.fetch 自动维护的，**不需要手动声明**。

## 6. 红线

- ❌ 首屏 cold-start 用按钮 spinner（不合适，应全屏 Skeleton）
- ❌ 关键提交不阻断（用户连点导致重复请求）
- ❌ 下拉刷新清空旧数据（用户瞬间看到空白页，体验崩）
- ❌ 静默刷新触发 Toast 提示（违反"静默"语义）
