> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-view-feedback
> 对应 schema 字段：rootNode.children 追加过渡反馈节点 + visibleWhen + meta.interaction

# Step I-view-feedback: <屏名> — 过渡反馈节点

> 详细方法见 `methodology/07-derivative-views.md` 类 6。
> 详细 schema 见 `schema-spec/derivative-views.md` §6。

## 推理过程

### 1. 适用性判定

| 反馈类型 | 是否需要 | 节点 name | visibleWhen / 触发方式 |
|---------|---------|----------|---------------------|
| Toast | ✅（一般所有屏都有）| —（用 ui.showToast action 直接发，不建节点）| events.actions |
| Snackbar（带操作的 Toast）| ✅/❌ | SaveSnackbar | `{{ state.view.snackbar.show }}` |
| InlineSuccess（行内成功提示）| ✅/❌ | SaveSuccessHint | `{{ state.view.successMsg }}` |
| ProgressBar（上传进度）| ✅/❌ | UploadProgressBar | `{{ state.view.uploading }}` |
| Countdown（倒计时）| ✅/❌ | CodeCountdownText | `{{ state.view.codeCountdown > 0 }}` |

### 2. 配套 view 变量（如本屏需要）

```
view.snackbar       { show: boolean, kind: string, message: string, prevValue?: any }
view.successMsg     string
view.uploading      boolean
view.codeCountdown  number  // 已在 state-vars 任务中声明
```

### 3. 候选方案与否决

- 候选 A：所有反馈都用 Toast → 否决：删除/批量操作需要"撤销"按钮，Toast 不带操作
- 候选 B：倒计时用全屏遮罩 → 否决：操作量级不匹配
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) Snackbar
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "saveSnackbar", type: "div", name: "SaveSnackbar",
    visibleWhen: "{{ state.view.snackbar.show && state.view.snackbar.kind === 'save' }}",
    styles: {}, props: {},
    children: [
      { id: "snackbarMsg", type: "div", name: "SnackbarMessage",
        styles: {}, props: { textContent: "{{state.view.snackbar.message}}" }, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "snackbarUndo", type: "button", name: "SnackbarUndoBtn",
        styles: {}, props: { textContent: "撤销" },
        events: [{
          trigger: "click",
          description: "撤销保存操作",
          actions: [
            { type: "state.set", path: "data.draft", value: "{{state.view.snackbar.prevValue}}" },
            { type: "state.set", path: "view.snackbar", value: { show: false } }
          ]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 2) 倒计时
element/insert_subtree {
  projectId, parentId: <某个父节点 id>,
  subtree: {
    id: "codeCountdownText", type: "div", name: "CodeCountdownText",
    visibleWhen: "{{ state.view.codeCountdown > 0 }}",
    styles: {}, props: { textContent: "{{state.view.codeCountdown}}s 后可重发" },
    children: [], states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 3) meta
meta/set_node { projectId, nodeId: "saveSnackbar", patch: { interaction: { summary: "保存成功后的可撤销 Snackbar", states: ["showing","hidden"] } } }
meta/set_node { projectId, nodeId: "codeCountdownText", patch: { interaction: { summary: "验证码冷却倒计时", states: ["showing","hidden"] } } }
```

> 如本屏完全无过渡反馈需求（仅 Toast）→ 本任务可 skipped。
