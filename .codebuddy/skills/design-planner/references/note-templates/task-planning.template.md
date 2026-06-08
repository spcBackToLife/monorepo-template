> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-task-planning
> 对应 schema 字段：N/A（meta/add_plan_tasks 挂出 N 个 D-X-G<N>-craft 任务）
> 必读方法论：methodology/07-craft-execution.md
> 必读其他：methodology/00-design-thinking.md（创作权 3：视觉任务自创权）

# D-{screenId}-task-planning — 任务派发（Phase E）

## 0. 上游输入

| 来源 | 内容 |
|---|---|
| design-goals.md | designGoals[] 全部目标 |
| goals/G<N>.md (每目标一份) | goalElementMap[] 涉及元素 + changes |
| cross-goal-strategy.md | visualStrategy 全屏策略 |

---

## 1. 派发原则（强约束）

```
✅ 每个 designGoal 派发 1 个 D-X-G<N>-craft 任务
✅ 派发兜底任务 1 个: D-X-coverage-fallback
✅ 派发整屏对账任务 1 个: D-X-self-review-by-goals

❌ 禁止派发按字段类别任务（D-X-styles / D-X-states / D-X-materials / D-X-decorations）
❌ 禁止派发 fix-issue 形式任务（如 craft-brandlogo / craft-checkbox 这类修补型）
```

---

## 2. craft 任务清单

| ID | 服务目标 | 涉及元素 | 涉及维度 | expectedArtifacts |
|---|---|---|---|---|
| D-{screenId}-G1-craft | G1 mood-conveyance | screen + Root + HeaderArea + BrandLogo + FormCard + BgBlob×2 (7 元素) | styles + structure + materials + layout | goalSuccessCriteriaMet G1 |
| D-{screenId}-G2-craft | G2 cta-clarity | SubmitBtn + GetCodeBtn + Links + FormCard + PolicyRow (5 元素) | styles + visualStates + layout | goalSuccessCriteriaMet G2 |
| D-{screenId}-G3-craft | G3 trust-signal | PolicyCheckbox + PolicyText + Errors (3 元素) | styles + structure + visualStates | goalSuccessCriteriaMet G3 |
| D-{screenId}-G4-craft | G4 state-feedback | ModeToggle + CodeModeBtn + PasswordModeBtn + TabIndicator + LockedView (5 元素) | styles + visualStates + structure | goalSuccessCriteriaMet G4 |
| D-{screenId}-G5-craft | G5 brand-recognition | BrandLogo + BrandSlogan (2 元素) | styles + materials | goalSuccessCriteriaMet G5 |

---

## 3. 兜底任务

| ID | 内容 | expectedArtifacts |
|---|---|---|
| D-{screenId}-coverage-fallback | 未被任何 goal 涉及的节点写最小 styles + 交互节点 focus/disabled | uncoveredNodesMinimalStyles |

未涉及节点列表（参 cross-goal-strategy 矩阵中"-"列）：
- [list 列出未涉及节点]

---

## 4. 整屏对账任务

| ID | 内容 | expectedArtifacts |
|---|---|---|
| D-{screenId}-self-review-by-goals | 逐 goal 截图核对 + 跨 goal 协调度 + allGoalsCriteriaMet ≥ 80% + P0 100% | allGoalsCriteriaMet |

---

## 5. 执行顺序

```
1. D-{screenId}-G1-craft  (P0 mood,先做大基调)
2. D-{screenId}-G5-craft  (P0 brand,Logo 真画)
3. D-{screenId}-G2-craft  (P0 CTA,在 mood + brand 基础上做主角)
4. D-{screenId}-G4-craft  (P1 state,模式切换)
5. D-{screenId}-G3-craft  (P1 trust,checkbox + 错误态)
6. D-{screenId}-coverage-fallback  (兜底)
7. D-{screenId}-self-review-by-goals  (整屏对账)
```

P0 优先 → P1 → 兜底 → 整屏对账。

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/add_plan_tasks
{
  projectId: "<projectId>",
  scope: "screen",
  screenId: "<screenId>",
  tasks: [
    {
      id: "D-{screenId}-G1-craft",
      title: "G1 craft: mood-conveyance — 校园温度氛围（屏底/Logo/装饰多元素协同）",
      stage: "design",
      status: "pending",
      expectedArtifacts: [
        { kind: "goalSuccessCriteriaMet", goalId: "G1", screenId: "$" }
      ]
    },
    // ... G2-G5
    {
      id: "D-{screenId}-coverage-fallback",
      title: "兜底覆盖: 未被任何 goal 涉及的节点写最小 styles + 交互节点 focus/disabled",
      stage: "design",
      status: "pending",
      expectedArtifacts: [
        { kind: "uncoveredNodesMinimalStyles", screenId: "$" }
      ]
    },
    {
      id: "D-{screenId}-self-review-by-goals",
      title: "整屏按目标对账: 逐 goal 截图核对 + 跨 goal 协调度",
      stage: "design",
      status: "pending",
      expectedArtifacts: [
        { kind: "allGoalsCriteriaMet", screenId: "$", minScoreRatio: 0.8 }
      ]
    }
  ]
}
```

---

## 7. 自检

- [ ] 每个 designGoal 都有对应 D-X-G<N>-craft 任务
- [ ] 每个 craft 任务的 expectedArtifacts.goalId 对应的 goal 在 designGoals 里存在
- [ ] coverage-fallback 任务已挂
- [ ] self-review-by-goals 任务已挂
- [ ] 执行顺序按 P0 → P1 → 兜底 → 对账
- [ ] 没有任何按字段类别的任务（styles / states / materials / decorations）
- [ ] 没有任何 fix-issue 形式的任务（craft-brandlogo / craft-checkbox 等修补型形式）
