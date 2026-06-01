> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-handover（Phase H 出场）
> 必读 SKILL.md §6 出场门禁 + §11 UpstreamChallenge

---

# 设计阶段移交清单 (Handover)

## 1. 项目级出场对账

### 1.1 schema 完整性

| 检查项 | 工具 | 期望 | 实际 |
|---|---|---|---|
| 整体 integrity | `query/integrity { projectId }` | 0 个 R-* error | __ |
| token 引用率 | `D-token-coverage` | ≥ 95% | __% |
| 跨屏一致性 audit | `D-audit` | 5 维度通过 | __ |
| componentAssets | — | 通用模板已抽 | __ |
| 全局 overlays styles + states + materials + audit | `D-global-overlay-*` | 全 done | __ |

### 1.2 画面对账（self-review 汇总）

| 屏 | allGoalsCriteriaMet | P0 通过率 | 整屏通过 |
|---|:---:|:---:|:---:|
| 00-login | 14/18 = 78% | 4/4 = 100% | ❌ → 重做 |
| 01-... | __ | __ | __ |

任一屏 allGoalsCriteriaMet < 80% 或 P0 < 100% → 不能 handover。

### 1.3 装饰系统单一族 audit

`D-decoration-system-audit` 任务结果：
- 全屏装饰系统：__（应该单一）
- 不混杂：✅/❌

### 1.4 60-30-10 调色比例 audit

`D-color-ratio-audit` 任务结果：
- 比例（实测）：__/__/__
- 落在 ±10% 内：✅/❌

### 1.5 权重金字塔 audit

`D-weight-pyramid-audit` 任务结果：
- 金字塔结构成立：✅/❌
- 各节点 declared vs measured weight 偏差 ≤ 1：✅/❌

---

## 2. 素材落地清单

| 屏 | 素材节点 | materialProjectId | 截图验证 |
|---|---|---|:---:|
| 00-login | BrandLogo | mat_xxx | ✅ |
| 00-login | PhonePrefixIcon | mat_yyy | ✅ |
| 00-login | BgBlobTopRight | （CSS 实现）| ✅ |
| ... | ... | ... | ... |

所有 type=img 节点 / kind=brand|icon|illustration 节点 materialProjectId 非空 → ✅

---

## 3. 创作权使用清单

design 阶段实际使用了哪些创作权（让 executor / 后续设计师参考）：

| 创作权 | 是否使用 | 实例 |
|---|:---:|---|
| 视觉概念决策（Phase B designGoals）| ✅ | 每屏 ≥3 个 designGoals |
| 视觉策略制定（Phase D）| ✅ | 每屏 visualStrategy |
| 视觉任务自创（Phase E）| ✅ | 共自创 N 个 D-X-G<N>-craft 任务 |
| 布局调整 | ✅ | 加了 N 个视觉容器节点（meta.design.kind 全已挂）|
| 装饰节点新建 | ✅ | 加了 N 个装饰节点（servingGoals 全挂）|
| 素材绘制 | ✅ | 调 material-painter 共 N 次 |

---

## 4. 跨阶段回流（UpstreamChallenge）

设计期间发起的 challenge：

| challengeId | 目标上游 | 内容 | 解决状态 |
|---|---|---|---|
| ch_xxx | theme-generator | 缺 elevation-2 阴影 | resolved (accepted) |
| ch_yyy | interaction-designer | 缺 state.view.passwordVisible | resolved (accepted) |
| ... | ... | ... | ... |

所有 challenge 都需 resolved 才能 handover。

---

## 5. 已知风险 / 待 executor 关注

| 风险 | 详情 | executor 关注点 |
|---|---|---|
| 素材 fallback | BgBlob 如果浏览器不支持 currentColor → fallback 为静态色 | 截图核对时检查多浏览器 |
| 字符串内嵌 token | 已避开（B1 防护已生效）| — |
| ... | ... | ... |

---

## 6. 给 executor 的指南

executor 任务：
1. `generate_snapshots` 全屏全 viewport 截图（mode: viewport / frame / multi-viewport）
2. 对照本 handover.md §1.2 self-review 汇总，验证最终画面
3. 跑跨设备 / 跨浏览器视觉一致性核对（design 阶段未跑）
4. integrity 终验
5. 报告差异 / 提交终交付

executor **不画素材**（design 已画完）。
executor **不做设计决策**（设计已落地）。

---

## 7. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/update_plan_task
{
  taskId: "D-handover",
  patch: {
    status: "done",
    notes: "md: design/handover.md；全项目 integrity 0 错；token 引用率 96%；3 屏 self-review 平均 4.4 / 4.5 / 4.2",
    expectedArtifacts: [
      { kind: 'integrityClean', projectId: '$' },
      { kind: 'tokenCoverageMin', minPercent: 95 },
      { kind: 'selfReviewAllPassed', minScore: 4 }
    ]
  }
}
```

---

## 8. 通知用户

「视觉设计阶段已完成，所有屏 self-review ≥ 4/5，素材已应用，integrity 0 错。下一棒 → design-executor（QA 摄影师）。」
