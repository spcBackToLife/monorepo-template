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

---

## ★ 翻译契约（Decision-to-Artifact Mapping）

> 上游分析 md 强制段落（v2.5 §0.1.10）。loading 决策的 5 类场景中，**适用** 的场景必须各对应一个 schema 产物（视图节点 / 动态文案 / spinner 节点）。

| 决策 ID | 决策内容（一句话）| 应翻译为 schema 产物 | 落库任务 | nodeId | 期望指纹 |
|---------|------------------|---------------------|---------|--------|---------|
| L-1 | initial 适用 → FeedSkeleton 节点 | FeedSkeleton 节点 + visibleWhen `state.effects['ds-xxx'].status==='pending' && !data.loaded` + minimal-debug styles ☆ | `I-X-view-loading` | FeedSkeleton | `nonEmpty path: visibleWhen` |
| L-2 | initial 不适用 | （无 schema 产物，决策记录即足）| — | — | — |
| L-3 | button 适用（关键提交）| (1) SubmitBtn 内 spinner 子节点 + visibleWhen<br>(2) SubmitBtn props.textContent 动态文案（"登录中..."）<br>(3) SubmitBtn click actions 首步 state.set submitting=true | (1) `I-X-view-loading`<br>(2) `I-X-events`<br>(3) `I-X-events` | (1) SubmitSpinner<br>(2)(3) SubmitBtn | (1) `nonEmpty path: visibleWhen`<br>(2) `nonEmpty path: SubmitBtn.props.textContent` |
| L-4 | refresh / pagination / silent 不适用 | （无产物）| — | — | — |

> ☆ minimal-debug styles 适用：spinner 类（按钮内 spinner 子节点）允许写 7 属性白名单。

字段说明见 `STAGE-CONTRACT.md §0.1.10`。
