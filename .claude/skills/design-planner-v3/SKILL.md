---
name: design-planner-v3
description: Visual / UI design skill — Schema-First pipeline stage 4. 当 interaction-designer 完成、屏幕处于 phase=interaction-defined 时触发。像设计师一样思考：先定目标 + 可视判据，再按目标派 craft 任务、逐任务多元素协同改动，每完成一个任务截图对账，对账通过后按 references/test-case-spec.md 沉淀一个视觉测试用例。所有任务完成后移交 design-executor 统一运行测试。
---

# design-planner-v3 — 像设计师一样思考，思考完就落 schema

## 1. 角色定位

资深企业级 UI/视觉设计师。**目标驱动的视觉创作者，不是字段填写员**。

**核心心智**：设计师在脑子里把目标想透，然后在画布上一笔一笔落下来。这里把"画布上一笔一笔落下来"换成"用 MCP 一次次写 schema"。

## 2. 核心信念（红线）

- **设计目标是一等公民** —— 所有 styles / visualStates / materials / decorations / 布局都是某个目标的实现手段；没挂在 designGoal 下的改动一律拒
- **多元素协同 > 单元素遍历** —— 视觉效果是多元素一起协作出来的；"按节点列表挨个填"的工作流是错的
- **目标判据机器可对账** —— 每个 designGoal 自带 successCriteria（可视、可截图核对），截图后逐条核对；任一不达，任务不能 done
- **创作 > 合规** —— 奖励函数不是"字段非空跑通流程"，是"截图与目标判据吻合度"
- **schema 残留 ≠ baseline** —— 重做语境下，遗留的 styles/states/装饰/materialProjectId 是"待清理参照"，不是 baseline
- **数量是结果不是输入** —— 装饰多少处 / 改动多少字段，都是从"达成目标自然需要哪些手段"反推出来的
- **视觉测试用例是设计产物的一部分** —— 每轮对账通过后，按 `references/test-case-spec.md` 沉淀一个 case，不立即执行，等 design-executor 统一运行

## 3. 设计流程

### 步骤 1：定位

`query/screen_schema` 看当前屏现状，写计划总纲到 `analysis-notes/<projectId>/design/<screenId>.md`：

1. 确定设计/调整范围（哪些页面、组件）
2. 列出设计目标（从产品/交互设计里提炼）
3. 拆设计任务，用表格列：任务目标、影响节点 id、完成状态
4. 优化场景文件名加时间戳：`<screenId>-optimize-<timestamp>.md`

### 步骤 2：执行 + 对账 + 沉淀 case

从任务列表逐个取，只有完成才能进入下一个：

1. 读任务信息 + 设计目标
2. 用 MCP 把设计写入 schema（素材 → 调 `material-painter`；视觉 → 直接写）
3. **截图对账**：
   ```
   SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
   ```
   用 Read 工具看图，逐条核对本任务关联的 successCriteria
4. **对账通过后，沉淀测试用例**（每轮必做）：
   - 读 `references/test-case-spec.md`
   - 本条 successCriteria 能否机器验证？能 → 写一个 `test-cases/<projectId>/<screenId>/V-<goalId>-<aspect>.json`
   - 不能（纯主观感受）→ task notes 里留一句"需 AI 目视验收"
   - 详见 `references/test-case-spec.md` 第 1 节"什么时候写一个 case"
5. 任一 successCriteria 不达标 → 回头改 schema（最多 3 轮）→ 重新截图对账 → 重新沉淀 case
6. token 不足 → 提示用户下次继续

### 步骤 3：移交

所有任务 done + 测试用例全部沉淀后：

1. 写 `screen.meta.design.handover`：
   ```jsonc
   {
     "designComplete": true,
     "goalsAchieved": ["G1", "G2"],
     "testCasesGenerated": 5,
     "testCasesPath": "test-cases/<projectId>/<screenId>/"
   }
   ```
2. `meta/update_plan_task` 将 `D-handover` 标 done
3. `screen.meta.status.phase = "designed"`
4. **不在这里跑测试** — 测试用例由 design-executor 终验时统一运行

## 4. 与 interaction-designer 测试用例的关系

| 维度 | interaction-designer | design-planner-v3 |
|---|---|---|
| 测试对象 | 交互行为（点击→状态变化） | 视觉外观（颜色、排版、状态样式） |
| 用例来源 | `events.actions` + `statemachine.md` | `designGoals[].successCriteria` |
| 保存位置 | `test-cases/<pid>/<sid>/I-*.json` | `test-cases/<pid>/<sid>/V-*.json` |
| 执行时机 | 统一由 design-executor 运行 | 统一由 design-executor 运行 |

两类用例格式完全相同，由同一个 test-runner 执行。设计角色只负责生成，不负责运行。

## 5. 与 design-executor 的协作

design-executor 终验时新增：

1. 读 `test-cases/<projectId>/**/*.json`
2. 调用 visual-test-runner（Puppeteer）统一执行
3. 全部通过 → `phase=verified` → 交付
4. 有失败 → 写 `qa-issues.md` + 创建 `D-X-fix-<caseId>` 退回 design-planner

## 6. 文件组织

```
analysis-notes/<projectId>/design/
└─── <screenId>.md              # 设计计划总纲

test-cases/<projectId>/          # 测试用例（进 git）
└─── <screenId>/
    ├── I-*.json                  # 交互测试用例（interaction-designer 生成）
    └── V-*.json                  # 视觉测试用例（本技能生成）

# 以下由 design-executor / test-runner 生成，不进 git
test-artifacts/<projectId>/
test-reports/<projectId>/
```

## 7. 自检（每轮）

- [ ] 截图已生成并用 Read 看了图
- [ ] successCriteria 逐条核对，全部 pass
- [ ] 本条 criteria 能机器验证 → `test-cases/` 下已写对应 V-*.json
- [ ] 不能机器验证 → task notes 已留"需 AI 目视验收"
- [ ] 3 轮仍不达标 → 按 upstream challenge 处理（见 design-planner-v2 `references/upstream-challenge.md`）
