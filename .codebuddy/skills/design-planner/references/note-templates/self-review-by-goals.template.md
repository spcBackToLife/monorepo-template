> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{screenId}-self-review-by-goals
> 必读方法论：methodology/09-self-review-by-goals.md
> 必读其他：../common/references/screenshot-tool.md

# D-{screenId}-self-review-by-goals — 整屏按目标对账（Phase G）

## 1. 整屏截图证据

```bash
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
```

截图路径: <填入实际路径>

[Read 看图后,填入下面的逐 goal 对账]

---

## 2. 逐 goal 对账

### Goal G1 (P0): mood-conveyance — <statement>

#### successCriteria 核对

- ✅ Criteria 1: <复述> — <像素级观察>
- ✅ Criteria 2: <复述> — <像素级观察>
- ❌ Criteria 3: <复述> — <像素级观察 + 失败原因>

#### forbiddenSignals 核对

- ✅ Forbidden 1: 未触发 — <观察>
- ✅ Forbidden 2: 未触发 — <观察>

#### G1 通过率

- 通过条数: 2/3
- P0 goal 100% 要求: 不达
- **判定**: ❌ 不通过 → 回 craft-G1 重做 Criteria 3

### Goal G2 (P0): cta-clarity — <statement>

[同上结构]

### Goal G3 (P1): trust-signal — <statement>

[同上结构]

### Goal G4 (P1): state-feedback — <statement>

[同上结构]

### Goal G5 (P0): brand-recognition — <statement>

[同上结构]

---

## 3. 跨 goal 协调度核查

### 3.1 weightPyramid 实测 vs 声明

| 元素 | 声明 weight | 实测 weight | 偏差 | 是否合规 |
|---|---|---|---|---|
| <node1> | 9 | 8 | -1 | ✅ |
| <node2> | 9 | 9 | 0 | ✅ |
| <node3> | 7 | 5 | -2 | ✅（≤ 2 容差）|
| ... | | | | |

**约束**: 偏差 ≤ 2 视为合规。

### 3.2 decorationSystem 单一族

- 声明: <族>
- 实测: <从截图看实际装饰类型>
- 是否混入其他族: <是 / 否>
- **判定**: ✅ / ❌

### 3.3 colorRatio 60-30-10 实测

| 比例 | 声明 token | 实测占比 | 是否合规（±10%）|
|---|---|---|---|
| 60% | $token:colors.X | <从截图估算> | ✅ / ❌ |
| 30% | $token:colors.Y | | |
| 10% | $token:colors.Z | | |

### 3.4 accentUsage 数量

- 声明 N 处: <list>
- 实测 N 处: <从截图估算>
- **约束**: ≤ 6 处
- **判定**: ✅ / ❌

---

## 4. 总评

### 4.1 通过率

- 总 successCriteria 条数: <计算>
- 总通过条数: <计算>
- **allGoalsCriteriaMet**: <X% / 80% 阈值>

### 4.2 P0 检查

- P0 goal 列表: <list>
- 每个 P0 是否 100% pass: <详情>
- **P0 全过**: ✅ / ❌

### 4.3 跨 goal 协调度

- weightPyramid: ✅ / ❌
- decorationSystem 单一族: ✅ / ❌
- colorRatio 60-30-10: ✅ / ❌
- accentUsage ≤ 6 处: ✅ / ❌

### 4.4 整屏判定

```
通过条件 (全部满足):
  - allGoalsCriteriaMet ≥ 80%
  - 所有 P0 goal 100% pass
  - 跨 goal 协调度 4 项全过

任一未满足 → 整屏不通过 → 回对应 craft 任务重做
```

**本屏判定**: ✅ 通过 / ❌ 不通过

---

## 5. 不达 goal 重做计划（如有）

| Goal | 不达 Criteria | 重做计划 | 回到任务 |
|---|---|---|---|
| G1 (P0) | Criteria 3 | <方案> | D-X-G1-craft |
| G3 (P1) | Criteria 2 | <方案> | D-X-G3-craft |

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/update_plan_task
{
  taskId: "D-{screenId}-self-review-by-goals",
  patch: {
    status: "done",  // 仅当 4.4 整屏判定 = 通过
    notes: "md: design/{screenId}/self-review-by-goals.md  通过率 X/Y  P0 全过"
  }
  // service 端跑 expectedArtifacts: { kind: 'allGoalsCriteriaMet', minScoreRatio: 0.8 }
}

// 如不通过,不标 done,改对应 craft 任务回 doing 状态
```

---

## 7. 自检

- [ ] 截图已跑 + Read 看过
- [ ] 每 goal 的 successCriteria 全部逐条核对
- [ ] 每条都有"像素级观察"（不"4/5"模板）
- [ ] forbiddenSignals 全检
- [ ] weightPyramid / decorationSystem / colorRatio / accentUsage 全核
- [ ] 通过率 + P0 状态正确计算
- [ ] 不达 goal 列重做计划
- [ ] 整屏判定明确（通过 / 不通过）
