# {taskId} — 自审评分（5 维度）

> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{X}-self-review（屏级整体自审；craft 任务的自审段写在该 craft 自己的 md 末尾）
> 对应方法论：`references/methodology/13-self-review-rubric.md`

---

## 1. 截图

- snapshot 路径（generate_snapshots 返回）：`<paste-path-here>`
- 视口：iPhone 15 Pro / Android / PC
- 模式：frame（完整长页面）

---

## 2. 机器对账先决条件（B2 工具，可选）

| query | 结果 | 是否通过 |
|---|---|:---:|
| canvas_render_status | 0 broken-image / 0 token-fail / 0 string-embedded-token-fail | ✅/❌ |
| visual_weight_audit | 金字塔成立 + weight 偏差 ≤ 1 | ✅/❌ |
| visual_state_distinctness | 业务态全有 ≥ 2 distinct override | ✅/❌ |
| color_ratio_audit | 60-30-10 落在 ±10% | ✅/❌ |
| decoration_system_audit | 装饰系统单一族 | ✅/❌ |

> B2 工具未实施时跳过本节，进 §3 主观评分。

---

## 3. 5 维度评分

### 3.1 识别度（Recognition）—— 用户 0.5 秒能否识别功能？

- **得分**：__/5
- **判据**：
  - 主 CTA 一眼可见？
  - 品牌 / Logo 是否真画？
  - 文字层级是否清晰？
- **不足**（如 <5）：

### 3.2 优先级层次（Hierarchy）—— 视觉权重金字塔成立？

- **得分**：__/5
- **判据**：
  - 眯眼模糊截图，主角是否仍突出？
  - 实测 weight vs 声明 weight 偏差 ≤ 1？
- **不足**（如 <5）：

### 3.3 状态可见性（State Visibility）—— 业务态视觉显著？

- **得分**：__/5
- **判据**：
  - 切每个 visualState 截图，是否都跟 default 有 distinct 差异？
  - 业务态（state.view 字段触发）有对应 visualState？
- **不足**（如 <5）：

### 3.4 主题契合（Theme Fit）—— 表达出 theme.intent 气质？

- **得分**：__/5
- **判据**：
  - 与 `recipes/theme-element-dict/<theme.intent>.md` 词典对照？
  - 60-30-10 调色 + 装饰系统单一族？
- **不足**（如 <5）：

### 3.5 情绪传达（Emotion）—— 给陌生人看的情绪与 concept 灵魂句一致？

- **得分**：__/5
- **判据**：
  - 拿 concept.md 3 个风格关键词，截图是否让人联想到？
- **不足**（如 <5）：

---

## 4. 综合判定

```
平均分：(识别 + 层次 + 状态 + 契合 + 情绪) / 5 = __
```

| 综合 | 操作 |
|---|---|
| 全 5 维 ≥ 4 | ✅ 任务可 done |
| 任一 <4，且重做轮次 < 3 | ⚠️ 回 Step 5 重做，记录"重做方向" |
| 任一 <4，且重做 ≥ 3 轮仍未达 | 🚧 挂 UpstreamChallenge（可能上游缺 token/字段）|
| 全 5 维 ≥ 4.5 | 🎉 优秀，进 D-handover examples 候选 |

---

## 5. 重做方向（如有）

| 不达标维度 | 当前问题 | 重做方向 | 涉及 craft 任务 |
|---|---|---|---|
| 状态可见性 | ModeToggle 两 tab 字色一样无 active | 加 active visualState：字色 primary + 字重 700 + 下划线 | D-00-login-craft-form |
| 识别度 | BrandLogo 是占位虚线框 | 调 material-painter 画几何 Logo + applyMaterialDesign | D-00-login-material-paint |

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// meta/update_plan_task
{
  taskId: "D-00-login-self-review",
  patch: {
    status: "done"|"blocked",
    notes: "md: design/00-login/self-review.md；平均分 4.4/5；重做轮次 2",
    expectedArtifacts: [
      { kind: "selfReviewAllPassed", screenId: "00-login", minScore: 4, actualMinScore: 4 }
    ]
  }
}

// 或重做：先 update_plan_task 把 craft 任务从 done → pending（service 端允许）
// 然后再做对应 craft + 再次 self-review
```
