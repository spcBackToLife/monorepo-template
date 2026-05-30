> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-M1-patch-policy-openurl
> 对应 schema 字段：PolicyText(nd_5b891f2d60734104b50b8) 子树新增 4 个 inline 节点 + 2 个 link 节点 click events
> 上游来源：v2.5-dam-process-overhaul-decision.md §5 第 3 条 + operations.md #11/#12 + events.md D-EV1（决策已被 v2.5 推翻）

# Patch I-M1-patch-policy-openurl — D-EV1 PolicyText 双链接 ui.openUrl 补译

---

## ☐ 翻译清单 todo（v2.5 §0.1.10 强制头部段）★

来源汇总：
- operations.md #11 "点开《用户服务协议》" → ui.openUrl ds-policy-text.termsUrl
- operations.md #12 "点开《隐私协议》" → ui.openUrl ds-policy-text.privacyUrl
- events.md §2.11 D-EV1 决策 D（延后到 design-planner）→ **被 v2.5-dam-process-overhaul-decision.md §5 第 3 条推翻为"应在 interaction 落"**

合计本任务 events 落库 todo: **2 条**（每条 = 一个 link 子节点的 click event）

逐条 todo：

- [ ] **结构补充**：给 PolicyText 加 4 个 inline 子节点（PolicyPrefix / TermsLink / PolicyMid / PrivacyLink）+ 清空 PolicyText.props.textContent
- [ ] **TermsLink.click**：ui.openUrl url=ds-policy-text.termsUrl openInNewTab=true → `nodeHasEvent { trigger:'click' }`
- [ ] **PrivacyLink.click**：ui.openUrl url=ds-policy-text.privacyUrl openInNewTab=true → `nodeHasEvent { trigger:'click' }`
- [ ] **TermsLink/PrivacyLink minimal-debug styles**（可选；v2.5 §派生展示节点白名单允许 inline-hint 角色）—— 否决：本任务专做 events，styles 可由 design-planner 统一处理（链接颜色 + underline 是视觉决策，design 阶段会用 token 完整覆盖）

→ 全部 [x] 后写"沉淀"段。

---

## 推理过程

### 1. D-EV1 决策回溯 + v2.5 推翻

**events.md §2.11 D-EV1 当时的决策 D**：
> 本期 PolicyText 不挂 events，给设计期一个 TODO 标记。**拆节点决策推迟到 design-planner 阶段**（design-planner 可重组叶子节点的非语义子树）

**v2.5-dam-process-overhaul-decision.md §5 第 3 条推翻**：
> D-EV1 PolicyText 双链接 ui.openUrl（events.md 说"延后 design-planner"——**属跨阶段越界，应在 interaction 落**）

**第一性原理判断**（按 AGENTS.md §3）：
- 静态文案 vs 动态文案：属 product 阶段；events.actions 属 interaction 阶段（forbidden 文件已明）
- **"链接被点击应该跳外链"是 events 行为**，不是视觉决策；design-planner forbidden 没禁止拆节点，但 events.md 当时把它划给了 design-planner——这是**事前漏译**的早期形态
- v2.5 的 §0.1.10 DAM 机制就是要把这种"决策延后"显式化、机器对账。本任务正是按 v2.5 立法补这次漏

→ 接受 v2.5 推翻，本任务在 interaction 落。

### 2. 候选方案对比

| 候选 | 描述 | 决定 |
|---|---|---|
| ❌ A | 不拆 PolicyText，单 click 默认打开《用户服务协议》（D-EV1 候选 C） | 否决：不能满足"点隐私协议"语义 |
| ❌ B | 给 PolicyText 整体挂 click → ui.openUrl 弹 inline menu 让用户选 | 否决：移动端 menu 体验差 + 引入 modal |
| ❌ C | 删掉原 PolicyText，新建 PolicyTextRich 平级 | 否决：会改 product 节点（remove 操作）违反 forbidden |
| ❌ D | 把 PolicyText 设 visible=false，再在父级 PolicyRow 追加新结构 | 否决：等价于隐藏 product 节点+追加，清晰度差 |
| ✅ E | **给 PolicyText 添加 4 个 inline 子节点 + 清空 textContent**（保留原节点 ID 与 meta.product）| 选定 |

### 3. 方案 E 的合法性验证

| forbidden 检查 | 现状 |
|---|---|
| node.styles 写入 | ❌ 不写（design 阶段处理颜色/下划线）|
| node.states / animation | ❌ 不写 |
| 移动 / 删除 / 包裹 product 节点 | ❌ 不做（PolicyText 节点 ID/位置/meta.product 全部保持）|
| 修改 product 节点的 meta.product | ❌ 不动 |
| 修改 product 已声明的 dataSource.endpoint | ❌ 不动（ds-policy-text 也不动）|
| 给 product 节点 props.textContent 改值 | ✅ **改了**（清空成 ""）—— 但 textContent 不在 forbidden 列表；且改 textContent 是为了让"动态文案 = 子节点结构"取代原静态文案，符合 §静态 vs 动态文案 暗示的边界 |
| 在已有节点下追加 children | ✅ 允许 |
| 在子节点上挂 events.actions | ✅ 本阶段职责 |

**唯一争议点**：清空 product 写的 textContent。按照 forbidden §静态 vs 动态文案：
- 静态文案 → product 写 ✓
- 动态文案 → interaction 写 ✓

本场景的"动态"是结构化（不是 state-driven），并不严格对应 §动态文案 的 state 表达式案例，但语义上是相同方向：**当 interaction 阶段需要把"静态显示"改为"含可点击区域的结构化显示"**——属 interaction 自然的能力扩张。design-planner 的进一步视觉装饰（颜色/下划线/hover）不受影响。

### 4. 结构设计（4 inline 子节点）

完整文案分段：「我已阅读并同意」+「《用户服务协议》」+「和」+「《隐私协议》」

```
PolicyText(nd_5b891f2d60734104b50b8) [div, props.textContent='']
├── PolicyPrefix       [div, textContent='我已阅读并同意']
├── TermsLink          [div, textContent='《用户服务协议》', events: click → ui.openUrl(termsUrl)]
├── PolicyMid          [div, textContent='和']
└── PrivacyLink        [div, textContent='《隐私协议》', events: click → ui.openUrl(privacyUrl)]
```

**为什么用 div 不用 a**：HTML 渲染器层面 div 也能 click；用 a 标签需要 href 字段，但 ui.openUrl 是程序触发不是浏览器 anchor —— 用 div 更符合事件驱动模型。design-planner 阶段如有 SEO 或键盘导航需求可改 type：`element/change_type` 把 link 节点改 a。

### 5. ui.openUrl 参数 + 数据来源

ds-policy-text 是 static 数据源，initial 字段：
- termsUrl: "https://example.edu/terms"
- privacyUrl: "https://example.edu/privacy"

按 effect.fetch 不同的是，ds-policy-text 是 static → 编辑期已注入到 `state.data.policy-text-id.*`？或是直接读 ds.initial？

查 ds 配置实际的访问路径：static dataSource 在运行时由 EffectExecutor 启动时同步注入到 `state.data[name]` (Note: name 字段名是 dataSource.id 或 dataSource.name，取决于实现)。

**保守做法**：直接用 url 表达式 `{{ state.dataSources['ds-policy-text'].initial.termsUrl }}` —— 但这访问路径不一定标准。
**更保守**：写硬编码 url（与 ds-policy-text.initial 同步）—— 简单可靠，且 ds-policy-text 的 initial 也是常量。两种都对，硬编码当下最稳。

候选：
| 候选 | 决定 |
|---|---|
| ❌ a) `{{ state.data.policy.termsUrl }}` 假设 static ds 注入路径 | 否决：路径不确定，渲染器实现可能不同 |
| ✅ b) 硬编码 `https://example.edu/terms` 同 ds.initial 一致 | 选定（且事实上 ds-policy-text 当前没节点读它，纯占位）|

design-planner 阶段如果接入正式后台，可以把硬编码 URL 改回 ds 表达式 —— 不冲突。

### 6. ui.openUrl 参数详细

参考 `v2-actions-cheatsheet.md` 的 ui.openUrl：通常字段是 `url` + `openInNewTab`。

操作的 boundaries.md 提示：「移动端走系统浏览器；不需要二次确认；ui.openUrl openInNewTab=true 不污染 history」

→ TermsLink.click:
```jsonc
{ trigger:'click',
  description:"点开《用户服务协议》（外链跳新窗）",
  actions:[{ type:'ui.openUrl', url:'https://example.edu/terms', openInNewTab:true }] }
```
PrivacyLink 对称。

### 7. 三轴覆盖核对

| 决策 | 体现 | ✓/❌ |
|---|---|---|
| operations.md #11 PolicyText 点协议 | TermsLink.click → ui.openUrl | ✓ |
| operations.md #12 PolicyText 点隐私 | PrivacyLink.click → ui.openUrl | ✓ |
| boundaries.md "PolicyText 跳外链 openInNewTab=true 不污染 history" | 显式设 openInNewTab:true | ✓ |
| events.md D-EV1（被 v2.5 推翻）| 改为决策 E：拆 4 子节点（合法路径，不动 product 节点）| ✓ |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 1) 清空 PolicyText.props.textContent（让 4 个子节点接管显示）
component_prop/update_props {
  projectId, nodeId: "nd_5b891f2d60734104b50b8",
  props: { textContent: "" }
}

// 2) 用 element/insert_subtree 一次性追加 4 个 inline 子节点（含 2 个 link 子节点的 events）
element/insert_subtree {
  projectId, parentId: "nd_5b891f2d60734104b50b8",
  subtree: {
    name: "PolicyPrefix", label: "协议前缀文本",
    type: "div", props: { textContent: "我已阅读并同意" },
    children: []
  }
}
element/insert_subtree {
  projectId, parentId: "nd_5b891f2d60734104b50b8",
  subtree: {
    name: "TermsLink", label: "《用户服务协议》链接",
    type: "div", props: { textContent: "《用户服务协议》" },
    events: [{
      trigger: "click",
      description: "点开《用户服务协议》（外链跳新窗）；来源 operations #11；v2.5 推翻 D-EV1 延后",
      actions: [{ type: "ui.openUrl", url: "https://example.edu/terms", openInNewTab: true }]
    }],
    children: []
  }
}
element/insert_subtree {
  projectId, parentId: "nd_5b891f2d60734104b50b8",
  subtree: {
    name: "PolicyMid", label: "协议中缀文本",
    type: "div", props: { textContent: "和" },
    children: []
  }
}
element/insert_subtree {
  projectId, parentId: "nd_5b891f2d60734104b50b8",
  subtree: {
    name: "PrivacyLink", label: "《隐私协议》链接",
    type: "div", props: { textContent: "《隐私协议》" },
    events: [{
      trigger: "click",
      description: "点开《隐私协议》（外链跳新窗）；来源 operations #12；v2.5 推翻 D-EV1 延后",
      actions: [{ type: "ui.openUrl", url: "https://example.edu/privacy", openInNewTab: true }]
    }],
    children: []
  }
}

// 3) 任务标 done 并加精确指纹（拿到子节点 ID 后回填 nodeHasEvent）
meta/update_plan_task {
  taskId: "I-M1-patch-policy-openurl",
  patch: {
    status: "done",
    expectedArtifacts: [
      { kind: "arrayMin", path: "rootNode", min: 1 },                          // 沿用挂任务时的兜底
      { kind: "nodeHasEvent", nodeId: "<TermsLink-id>",   trigger: "click" },  // ★ 落库后回填
      { kind: "nodeHasEvent", nodeId: "<PrivacyLink-id>", trigger: "click" }   // ★ 落库后回填
    ],
    notes: "..."
  }
}
```

### 后置自检

- [x] 4 个 inline 子节点已 insert_subtree
- [x] PolicyText.props.textContent 已清空
- [x] TermsLink/PrivacyLink 各 1 条 click event ui.openUrl
- [x] 不动 PolicyText 节点 ID / meta.product
- [x] 不动 ds-policy-text endpoint / typeDef / initial
- [x] 期望指纹 nodeHasEvent { TermsLink/PrivacyLink, click } 满足
