# 边缘场景：单页项目 / 新会话续接

> 本文件适用任务：单页项目执行 / 新会话续接时。

---

## 1. 单页项目特例

仍走 8 Phase。任务挂屏幕级 + 项目级一次性挂全：

```
1. Phase 0: 入场门禁六查（见 gates.md §1）
2. Phase 1: 对单屏挂屏级任务（positioning / design-goals / cross-goal-strategy / 
   task-planning / coverage-fallback / self-review-by-goals / meta / tree-redlines / 
   coverage / integrity）+ 6 个项目级任务（D-templates 通常 skipped + 备注"单页无跨屏复用"）
3. 若有 globalOverlays → 加 4 个 D-global-overlay-* 任务
4. Phase 2: 按 plan 逐项推进（每个目标在 design-goals done 后由 task-planning 
   自创对应 G<N>-decompose + G<N>-craft）
5. 最后跑 query/integrity 自检 + 通知 design-executor
```

仪式精简，**视觉深度不减**——单页登录页同样要 ≥3 个设计目标 + 每目标涉及 ≥2 元素 + craft 截图对账 + 心智 5 问每次必答。

---

## 2. 新会话续接

新会话续接是 **Phase 0「入场门禁」自然覆盖的场景**：

```
1. query/list_projects（Phase 0 Step 1）
2. query/project_info → 入场门禁六查（gates.md §1）
3. query/list_open_challenges { targetStage: 'design' } → 若有 open 跳 upstream-challenge.md §4
4. ★ 跑重做语境判别（gates.md §2）
5. query/next_pending_task { scope: 'auto' }
   - stage='design' 的任务 → 直接接续做
   - null → query/integrity 二检：有 R-* 错误立刻补；否则准备移交 design-executor
6. 如果走重做语境（5 信号 ≥3 命中），按 methodology/13 reset schema 残留 design 字段
```

**schema 自身就是状态**——不需要外部 plan.md / progress.json。
