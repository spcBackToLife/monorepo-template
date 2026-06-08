> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-view-empty
> 对应 schema 字段：rootNode.children 追加空态节点 + visibleWhen + meta.interaction

# Step I-view-empty: <屏名> — 空态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 2。
> 详细 schema 见 `schema-spec/derivative-views.md` §2。

## 推理过程

### 1. 适用性判定

| 空态场景 | 是否需要 | 节点 name | visibleWhen |
|---------|---------|----------|-------------|
| 列表空态（首次加载完空）| ✅/❌ | EmptyFeedState | `{{ state.effects['ds-feed'].status === 'success' && state.data.feed && state.data.feed.length === 0 }}` |
| 搜索无结果 | ✅/❌ | NoSearchResultState | `{{ state.view.searchKw && state.data.results.length === 0 }}` |
| 筛选无结果 | ✅/❌ | NoFilterMatchState | `{{ state.view.filterActive && state.data.filtered.length === 0 }}` |
| 离线无缓存 | ✅/❌ | OfflineNoDataState | `{{ globalView.network.status === 'offline' && !state.data.cached }}` |

### 2. 空态四要素核对（每个空态节点必含）

| 要素 | 内容 |
|------|-----|
| 图示 | EmptyIllustration 子节点（design 阶段画素材）|
| 标题 | "还没有内容" / "没找到相关结果" |
| 描述 | "去发现你感兴趣的吧" |
| 行动按钮 | "去发现" / "清空筛选" / "重新搜索" |

**红线 R-VIEW-EMPTY-CONTENT-01**：四要素缺一即触发。

### 3. 候选方案与否决

- 候选 A：所有空态共用一个 EmptyState 节点 + 文案动态切换 → 否决：不同空态原因 → 不同视觉规格 / 不同 CTA，应一态一节点
- 候选 B：仅展示"暂无数据" → 否决：没行动按钮，用户卡死

---

## ★ 沉淀到 schema 的结论

```jsonc
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "emptyFeedState", type: "div", name: "EmptyFeedState",
    visibleWhen: "{{ state.effects['ds-feed'].status === 'success' && state.data.feed && state.data.feed.length === 0 }}",
    styles: {}, props: {},
    children: [
      { id: "emptyIcon",  type: "div",    name: "EmptyIllustration", styles: {}, props: {}, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "emptyTitle", type: "div",    name: "EmptyTitle",        styles: {}, props: { textContent: "还没有内容" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "emptyDesc",  type: "div",    name: "EmptyDescription",  styles: {}, props: { textContent: "去发现你感兴趣的吧" },
        children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "emptyCta",   type: "button", name: "GoExploreButton",   styles: {}, props: { textContent: "去发现" },
        events: [{
          trigger: "click",
          description: "跳转发现页",
          actions: [{ type: "nav.go", targetScreenId: "03-explore" }]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

meta/set_node {
  projectId, nodeId: "emptyFeedState",
  patch: {
    interaction: {
      summary: "ds-feed 列表为空时引导用户发现内容",
      states: ["showing","hidden"]
    }
  }
}
```

> 如本屏无列表型 dataSource，本任务可 skipped。否决理由：本屏只有写入型 ds-login，无列表 → 无空态视图需求。
