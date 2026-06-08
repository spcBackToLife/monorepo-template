# 入场 / 出场门禁 + 重做语境判别

> 本文件适用任务：入场启动时必读 / 出场移交前必读 / 新会话续接时必读。

---

## 1. 入场门禁（Phase 0）

### 1.1 入场六查

入场必跑 `query/project_info { projectId }`，逐条核对：

| # | 检查项 | 不通过的处理 |
|---|---|---|
| ① | project.meta.targetUser / coreScenarios / styleDirection / modules / navigation 已写 | 退回 product-analyst 补 |
| ② | project.meta.globalConcerns 5 类齐 | 退回 product-analyst 补 |
| ③ | project.theme.customized=true 且 theme/validate 0 error | 退回 theme-generator |
| ④ | 所有屏 phase ≥ "interaction-defined" | 退回 interaction-designer |
| ⑤ | query/integrity 0 个 R-EVENTS-* / R-PHASE-* / R-PLAN-* 错误 | 退回上游对应阶段 |
| ⑥ | project.meta.styleDirection / targetUser 含足够"产品价值"信号；缺位（如 targetUser 无 dailyApps 或 styleDirection 仅一句"简洁"）| 退回 product-analyst 补 |

### 1.2 入场必跑步骤

```
1. query/list_projects → 找到 projectId
2. query/project_info { projectId } → 入场六查（见 §1.1）
3. theme/get { projectId } → 拉 ThemeConfig 完整快照
4. query/list_screens → 过滤 phase=interaction-defined
5. query/list_open_challenges { projectId, targetStage: 'design' } → 有 open 跳 upstream-challenge.md §接管
6. ★ 重做 vs 增量判别（见 §2）
7. query/next_pending_task → 拿任务
```

### 1.3 入场红线

- ❌ 入场门禁未过就开始落 schema
- ❌ theme.customized=false 就开始写 styles → 必然出现硬编码
- ❌ 跨屏批量做：每屏一轮，全部任务做完才进下一屏
- ❌ **重做语境未识别 → 把 schema 残留当 baseline**

---

## 2. 重做 vs 增量判别（强制场景）

### 2.1 何时强制跑判别

任一命中就要跑 methodology/13 §2.1 的 5 信号判别：

- 新会话续接（Phase 0 第 1 次执行）
- 用户消息含"重做" / "重设计" / "再来一次" / "推倒重来"等关键词
- schema 里 design 字段非空但 plan tasks 仍有大量 pending
- schema 残留疑似失败状（颜色全是 token 但视觉单调 / 装饰 0 处 / 所有节点 styles ≥10 字段但没截图证据）

### 2.2 判别结果

- ≥3 信号命中 → **重做语境**
- < 3 信号 → 增量语境

### 2.3 入场回复必须显式报告

```
"识别为 <重做/增量> 语境，schema 残留视为 <待清理参照/baseline 起点>"
```

### 2.4 重做语境特殊处理

- **Phase A 开始前 reset schema 残留 design 字段**（见 methodology/13 §3.1 选项 A/B/C）
- 每个 craft 任务起手心里默念："不作为 baseline"
- craft Step 6.5.4 反 KPI 自检必跑（见 SKILL.md Phase 2 Step 6.5.4）

---

## 3. 出场门禁

所有屏的 plan 任务全部 done / skipped 后逐条核对：

| # | 检查项 |
|---|---|
| ① | 所有屏 phase = "designed" |
| ② | 每屏 designGoals ≥ 3 + goalElementMap 完整 + 每 goal 都有对应 craft 任务 done |
| ③ | goalSuccessCriteriaMet 全过（每屏 allGoalsCriteriaMet ≥ 0.8）|
| ④ | coverage-fallback 已 done |
| ⑤ | 所有装饰节点 / 视觉容器节点 servingGoals 非空 |
| ⑥ | 需要素材节点 materialProjectId 非空 |
| ⑦ | 跨屏一致性 audit 通过 |
| ⑧ | $token: 引用率 ≥ 95% |
| ⑨ | 所有 plan 任务 status ∈ {done, skipped} |
| ⑩ | skipped 任务 notes 含否决理由 |
| ⑪ | query/integrity 0 个 R-* 错误 |
| ⑫ | analysis-notes/<projectId>/design/* 不存在或为空（无 md 残留） |

### 3.1 出场必跑步骤

```
1. query/integrity { projectId } 全项目自检
2. 跑 D-token-coverage —— $token: 引用率必须 ≥ 95%
3. 跑 D-audit —— 跨屏一致性核对
4. 出场门禁全部通过（§3）
5. 标 D-handover 任务 done（notes 写一句"已交付，本屏 X 个 goal，跨屏一致性通过"）
6. 通知用户：视觉设计阶段完成 → 进入 design-executor
```
