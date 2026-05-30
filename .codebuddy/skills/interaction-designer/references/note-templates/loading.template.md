> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-loading
> 对应 schema 字段：screen.meta.interaction.loadingStrategy

# Step I-loading: <屏名> — 加载策略 5 场景

> 详细方法见 `methodology/03-loading-strategy.md`。

## 推理过程

### 1. 5 场景适用性判断

| 场景 | 本屏是否适用 | 用什么节点 / 策略 |
|------|------------|-----------------|
| 首次加载（cold start）| 是/否 | 全屏 FeedSkeleton 节点（在 I-X-view-loading 建）|
| 下拉刷新 | 是/否 | RefreshIndicator 节点 |
| 加载更多（分页）| 是/否 | 列表底 ListLoadingMore，触底自动触发 |
| 按钮请求 | 是 | 按钮内 spinner + disabled + 文案变化（"登录中..."）|
| 静默刷新 | 是/否 | 顶部 1px 细线 / 无 UI |

### 2. 数据源对应

| dataSourceId | 加载场景 | 对应节点 |
|--------------|---------|---------|
| ds-feed | cold start + pagination + refresh | FeedSkeleton + ListLoadingMore + RefreshIndicator |
| ds-login | button | 按钮内 spinner + LoadingOverlay |
| ds-config | silent | 顶部细线 |

### 3. 候选方案与否决

- 候选 A：cold start 用按钮 spinner → 否决：用户进页 0 数据时按钮还没意义
- 候选 B：登录提交不阻断 → 否决：用户连点会重复请求
- ...

### 4. 与 view 变量的对应

| 场景 | 控制变量 | 何时置 true | 何时置 false |
|------|---------|-----------|-----------|
| pagination | `view.loadingMore` | 触底前 | onSuccess / onError |
| refresh | `view.refreshing` | 下拉触发 | onSuccess / onError |
| button | `view.submitting` | click 后 | onSuccess / onError |

注：`state.effects[<dsId>].status` 由 effect.fetch 自动维护，不需要手动声明。

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    interaction: {
      loadingStrategy: {
        initial:    "无（首屏 cold start）",
        refresh:    "—",
        pagination: "—",
        button:     "按钮内 spinner + disabled + 文案改为'登录中...'",
        silent:     "—"
      }
    }
  }
}
```

> 对应的衍生节点（FeedSkeleton / RefreshIndicator / LoadingOverlay 等）在 `I-X-view-loading` 任务中建。
