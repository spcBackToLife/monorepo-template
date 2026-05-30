> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-view-loading
> 对应 schema 字段：rootNode.children 追加加载态节点 + 节点 visibleWhen + meta.interaction

# Step I-view-loading: <屏名> — 数据加载态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 1。
> 详细 schema 见 `schema-spec/derivative-views.md` §1。

## 推理过程

### 1. 适用性判定

> 列出本屏需要加载态视图的场景；如果完全没有，本任务标 `status: 'skipped'` + 在「沉淀」段写否决理由。

| dataSource / 场景 | 是否需要 | 节点类型 | visibleWhen |
|------------------|---------|---------|-------------|
| ds-feed cold start | ✅ | FeedSkeleton（全屏骨架）| `{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}` |
| ds-login submitting | ✅ | LoadingOverlay | `{{ state.view.submitting }}` |
| ds-feed pagination | ✅ | ListLoadingMore | `{{ state.view.loadingMore }}` |
| ds-feed refresh | ❌ | —（本屏无下拉刷新）| — |

### 2. 节点设计

#### FeedSkeleton（全屏占位）

```
位置：rootNode.children 末尾
结构：3-5 个 SkeletonItem（具体数量留 design）
visibleWhen：见上表
```

#### LoadingOverlay（关键提交时全屏遮罩）

```
位置：rootNode.children 末尾
结构：内含 spinner 子节点
visibleWhen：见上表
```

### 3. 候选方案与否决

- 候选 A：用 visualState.loading 替代独立节点 → 否决：visualState 是节点内视觉态，不能控制整页显隐
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: element/insert_subtree（每个节点一次）
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "feedSkeleton", type: "div", name: "FeedSkeleton",
    visibleWhen: "{{ state.effects['ds-feed'].status === 'pending' && !state.data.feed }}",
    styles: {}, props: {},
    children: [
      { id: "skItem-1", type: "div", name: "SkeletonItem", styles: {}, props: {}, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "skItem-2", type: "div", name: "SkeletonItem", styles: {}, props: {}, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "skItem-3", type: "div", name: "SkeletonItem", styles: {}, props: {}, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "loadingOverlay", type: "div", name: "LoadingOverlay",
    visibleWhen: "{{ state.view.submitting }}",
    children: [
      { id: "spinner", type: "div", name: "LoginSpinner", ... }
    ],
    ...
  }
}

// MCP: meta/set_node（每个节点一次）
meta/set_node {
  projectId, nodeId: "feedSkeleton",
  patch: {
    interaction: {
      summary: "ds-feed 首次加载占位骨架",
      states: ["showing","hidden"]
    }
  }
}

meta/set_node {
  projectId, nodeId: "loadingOverlay",
  patch: {
    interaction: {
      summary: "提交时全屏遮罩，屏蔽点击",
      states: ["showing","hidden"]
    }
  }
}
```

> ⚠️ 如果本屏完全无加载态需求（极简静态页），本任务可标 skipped。在沉淀段写否决理由。
