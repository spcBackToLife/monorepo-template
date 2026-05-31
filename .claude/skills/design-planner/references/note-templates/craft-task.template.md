> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{X}-craft-* （Phase E 创作执行；含自创任务）
> 必读方法论：`references/methodology/00-design-thinking.md` + `09-coordinated-visual.md` + `11-layout-adjustment.md`
> 必读配方（按本任务效果 / 控件选择）：
>   - `recipes/visual-effects/<效果名>.md`（如 floating / focus / trust / urgency 等）
>   - `recipes/compositions/<复合控件名>.md`（如 checkbox / tab-segment / accordion 等）
>   - `recipes/theme-element-dict/<theme.intent>.md`（按主题查元素表达）
> 必读 pitfalls（如涉及 native 控件 / 复合控件）：
>   - `pitfalls/web-rendering.md`
>   - `pitfalls/composite-patterns.md`

---

# {taskId} — Craft（创作执行）

## 1. 视觉目标（一句话）

> 来自 D-X-task-planning 任务自创时的 title，复述一遍：

「{visualGoal}」（如：主 CTA 浮出感视觉效果 / ModeToggle 移动指示条 + active 视觉 / PolicyCheckbox wrapper-label 重构）

---

## 2. 上游输入（read 一遍）

| 维度 | 内容 |
|---|---|
| visualConcept | soulSentence / styleKeywords / moodBoard（来自 concept.md）|
| visualStrategy | 5 维（color/typography/shape/decoration/rhythm）相关部分 |
| componentBudgets | 本任务涉及节点的 weight + role + minSignals + allowedTools |
| stateVisualMap | 涉及节点的业务态映射（来自 D-X-states-business 已写或本任务一并补）|

---

## 3. 参考配方

| 配方路径 | 用途 |
|---|---|
| `recipes/visual-effects/floating.md` | 浮出感（如本任务是 hover / focus 效果）|
| `recipes/compositions/tab-segment.md` | Tab/Segment 视觉态（如本任务是 tab 重构）|
| `recipes/theme-element-dict/<theme.intent>.md` | 主题→元素词典（如 minimal/warm/trust 主题对应元素表达）|
| `pitfalls/web-rendering.md` | native 控件 workaround（如 checkbox/select）|
| `pitfalls/composite-patterns.md` | 复合控件必备视觉态 |

---

## 4. 协同视觉 4 角色（来自 methodology/09）

| 角色 | 节点 | 改什么 | 不动 |
|---|---|---|---|
| 主体 (subject) | xxx | xxx | — |
| 邻居 (sibling) | xxx | xxx | — |
| 父容器 (container) | xxx | — | ✅ 不动 |
| 装饰 (decoration) | xxx | — | ✅ 不动 |

---

## 5. 布局调整（如有）

> 详见 `methodology/11-layout-adjustment.md`。新增节点必挂 `meta.design.kind`。

| 操作 | 节点 | meta.design.kind | 用途 |
|---|---|---|---|
| element/add | TabIndicator | visual-container | 移动指示条 |
| element/wrap | PolicyCheckbox + PolicyText → PolicyCheckLabel | visual-container | 整行可点 |
| element/add | BgBlobTopRight | decoration | 右上光斑装饰 |
| material-paint | BrandLogo | material-frame | 真画 logo |

---

## 6. 落到 schema 的具体 styles + visualStates

### 6.1 节点 X (subject) styles

```jsonc
node 'X' styles:
{
  // 默认态完整 styles（按 strategy 5 维）
  width: ...
  padding: $token:spacing.md
  backgroundColor: $token:colors.primary
  // ...
}
```

### 6.2 节点 X visualStates

```jsonc
states: [
  { name: "default", styles: {} },
  { name: "hover", styles: { ... }, transition: { duration: 200, easing: "ease-out" } },
  { name: "pressed", styles: { ... }, transition: { duration: 80, easing: "ease-in" } },
  { name: "focus", styles: { ... } },
  { name: "disabled", styles: { ... }, disabledEvents: ["click"] },
  { name: "active", activeWhen: "{{state.view.X === 'Y'}}", styles: { ... } }   // 业务态
]
```

### 6.3 邻居 / 装饰节点（如有联动）

[同上结构]

---

## 7. minSignals 核查（来自 methodology/02-visual-budget.md §4）

| 节点 | role | minSignals 阈值 | 实际信号数 | 通过 |
|---|---|---:|---:|:---:|
| SubmitBtn | 主角-CTA | ≥ 4 | 5（主色 + 圆角 + 阴影 + 字重 + hover）| ✅ |
| PolicyCheckVisual | 工具-勾选 | ≥ 3 | 4（外框 + 选中底色 + 勾 + 焦点光晕）| ✅ |
| TabBtn | 工具-切换 | ≥ 2 | 3（字色 + 字重 + 移动指示条）| ✅ |

---

## 8. ★ 沉淀到 schema 的结论

```jsonc
// 1) element/add（如有）
[完整 add 调用]

// 2) element/wrap（如有）
[完整 wrap 调用]

// 3) style/update（每节点）
[完整 update 调用]

// 4) visual_state/add（每个 visualState）
[完整 add 调用，含 activeWhen 表达式]

// 5) material-paint（如有）
[调子技能 + applyMaterialDesign 调用]
```

---

## 9. ★【v3】视觉自审（Step 6.5）

> 必读 `methodology/13-self-review-rubric.md` + `note-templates/review.template.md`

落 schema 完成后：

### 9.1 Step 6.5.1：generate_snapshots

```
mcp/generate_snapshots { projectId, screenIds: [本屏], mode: 'frame' }
→ jobId: ...
→ Read 截图：snapshots/<jobId>/<screenId>.png
```

### 9.2 Step 6.5.2：5 维度评分

| 维度 | 分数 | 判据 |
|---|:---:|---|
| 识别度 (Recognition) | __/5 | 主 CTA 一眼可见？品牌真画了？ |
| 优先级层次 (Hierarchy) | __/5 | 眯眼看主角是否仍突出？ |
| 状态可见性 (State Visibility) | __/5 | 切每个 visualState 截图，distinct 差异明显？ |
| 主题契合 (Theme Fit) | __/5 | 与 theme-element-dict 对照？60-30-10 落地？ |
| 情绪传达 (Emotion) | __/5 | 与 concept.soulSentence 一致？ |

### 9.3 Step 6.5.3：判定

- 全 5 维 ≥ 4 → 进 Step 7（任务可 done）
- 任一 < 4 → 不进 Step 7，回 Step 5 重做（最多 3 轮）
- ≥ 3 轮仍未达 → 挂 UpstreamChallenge

### 9.4 重做记录（如有）

| 轮次 | 不达标维度 | 重做方向 |
|---|---|---|
| 1 | 状态可见性 (3/5) | TabBtn active 字重从 600 提到 700 + 加 TabIndicator |
| 2 | 全过 ✅ | — |

---

## 10. 自检

- [ ] 视觉目标一句话清晰
- [ ] 协同视觉 4 角色识别
- [ ] 必读配方 / 方法论 / pitfalls 已 read
- [ ] 落 schema 调用完整（每个 MCP 调用 1:1 对应 §8 结论段）
- [ ] minSignals 核查全过
- [ ] Step 6.5 自审 5 维度全 ≥ 4
- [ ] 任务 update_plan_task done 时挂了 expectedArtifacts

任一未通过 → 任务不能 done。
