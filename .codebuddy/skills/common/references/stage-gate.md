# 全链路阶段门禁（Stage Gate）规范

> 这是 product-analyst / interaction-designer / design-planner / design-executor 四个技能共享的纪律文件。
> 第一性原理：**Schema 是契约，md 是详情。Schema 字段缺失 = 契约违约 = 不允许进入下一阶段。**

---

## 0. 为什么要有阶段门禁？

历史教训：
- 某次 product-analyst 把所有页面登记完后，没强制写 `rules[]`，下游交互分析没法基于规则推导异常分支。
- 某次 interaction-designer 只更新 `_page.json` 的 interaction 层 summary，没创建子节点骨架，导致 design-planner 启动时 `task-gen --for planner` 输出空清单，被迫退化成"自由创作模式"，最后产出潦草的 visual.md + index.md 就交差。
- 某次 design-planner 没生成节点级 PLAN.md，AI 写了页面级 visual.md + index.md 后就以为完成了，跳过了所有组件 .md 和素材 .md。

每一次"少东西"都不是单点失误，而是**约束不够硬**。stage-gate 就是把约束从 SKILL.md 的"建议"升级成脚本的"门禁"。

---

## 1. 四个阶段的契约表

```
product-analyst → interaction-designer → design-planner → design-executor
   (Stage 1)         (Stage 2)              (Stage 3)        (Stage 4)
```

每一阶段进入前要过上一阶段的 exit gate；每一阶段完工要过自己的 exit gate。

### Stage 1: Product

| 维度 | 必须有（缺则 ❌） | 可空（缺则 ⚠️） |
|------|---------------|----------------|
| `_index.json` | `project.{name, platform, viewport, targetUser.summary, targetUser.ref, styleDirection.summary, styleDirection.ref}` `project.coreScenarios[]` ≥ 1 `modules{}` ≥ 1 | `navigation.tabBar/flows`（单页应用可空） |
| `pages/_index.json` | `pages[]` ≥ 1，每页 `id/name` | — |
| 每个 `pages/<id>/_page.json` | `product.{summary, ref, rules[]}` 都非空 | `product.fromModules[]`（系统页可空） |

**红线**：`rules[]` 是产品规则的容器，**不可为空**。哪怕只有一条"无特殊规则"也要写出来强制思考。

### Stage 2: Interaction

| 维度 | 必须有（缺则 ❌） |
|------|----------------|
| 每个 `_page.json` | `interaction.{summary, ref, states[], operations[]}` 都非空 |
| `operations[]` | **必须是结构化对象数组** `[{ "op": "...", "triggerNodePath": "<block>/<element>" }]`，**禁止字符串数组** |
| 每个 `triggerNodePath` | 必须对应 registry 中**真实存在**的节点文件 |
| 每个页面目录 | **至少一个子节点文件**（不能只有 _page.json） |
| 每个有 `interaction.trigger` 的节点 | `interaction.flows.success` 或 `flows.error` 至少一项（⚠️ 警告级） |

**红线**：interaction-designer 必须把 md 中「操作清单」的每一行都用 `create-node.ts` 落到 registry 节点文件，**不许只更新 _page.json 的 interaction summary 就交差**。

### Stage 3: Design

| 维度 | 必须有（缺则 ❌） |
|------|----------------|
| `design-plan/design-system.md` | 存在 |
| 每个 `pages/<id>/visual.md` | 存在（视觉先行红线） |
| 每个 `pages/<id>/index.md` | 存在（最后写） |
| 每个有 `interaction` 层的节点 | 都有 `design.{summary, ref}` |
| 每个 `_materials.json` 中的素材 | 都有对应的 `materials/<id>-<name>.md` |
| 多状态节点 | `design.visualStates` 非空（⚠️ 警告级） |
| `design-plan/PLAN.md` | 100% 打勾 |

**红线**：visual.md 必须先于 index.md；组件 `[name].visual.md` 必须先于 `[name].md`。

### Stage 4: Implementation

| 维度 | 必须有（缺则 ❌） |
|------|----------------|
| 每个节点 | `implementation.status === "completed"` |
| 每个 completed 节点 | `checklist` 中所有项 = true |

---

## 2. 命令速查

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"

# 出门校验（完成本阶段后跑）
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage product|interaction|design|implementation --mode exit

# 入门校验（开始本阶段前跑，等价于上一阶段的 exit）
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage interaction|design|implementation --mode entry
```

退出码语义：

| 退出码 | 含义 | 后续动作 |
|:------:|------|---------|
| 0 | 全部通过 | ✅ 可以进入下一阶段 |
| 1 | 有 ❌ 阻断项 | ❌ 必须修完所有 ❌ 才能继续 |
| 2 | 仅 ⚠️ 警告 | ✅ 可以继续，但建议修 |

---

## 3. 任务清单 PLAN.md

`plan-gen.ts` 在 interaction / design 两个阶段开始时自动生成节点级任务清单。

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/plan-gen.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage interaction|design [--page <id>]
```

产物位置：
- `interaction-design/PLAN.md`（交互阶段）
- `design-plan/PLAN.md`（设计阶段）

**纪律**：
- 每完成一项**立即**把 `[ ]` 改成 `[x]`（手动编辑或脚本辅助）
- 上游有变（registry 新增了节点）时重跑 `plan-gen.ts`，已打勾项会被保留，新任务会追加
- PLAN.md 100% 打勾是阶段完成的**必要条件**（连同 stage-gate exit 0 ❌）

---

## 4. 当门禁不通过时怎么办

### 黄金法则

> **永远从根因修，不打补丁。** 上游缺什么，就回上游补，**不要在本阶段绕过**。

### 决策树

```
跑 stage-gate exit 退出码 1
  ├─ 报错来自上游阶段（如 design 报错说 product 缺 rules）
  │  → 切换到上游技能，把 ❌ 修干净，再回来
  │
  └─ 报错来自本阶段
     ├─ 节点缺 design 层 → 在 PLAN.md 找到对应行，逐个补
     ├─ 节点结构树红线违反 → 修 index.md
     ├─ 素材 .md 缺失 → 写素材文档
     └─ visualStates 缺 → write-node 追加
```

### 典型违约场景与修复

| 阶段 | 报错 | 第一性原因 | 正确修复 |
|------|------|----------|---------|
| product | `rules[] 为空` | 产品分析没逐页梳理业务规则 | 回 product-analyst 跑模块分析五步法的 Step C |
| interaction | `没有任何子节点文件` | 跳过了 create-node 骨架步 | 回 interaction-designer Step 3.b 逐行 create-node |
| interaction | `operations[N] 是字符串` | 偷懒写法 | 重写 _page.json，把字符串改成 `{op, triggerNodePath}` |
| interaction | `triggerNodePath 文件不存在` | 路径写错或节点未建 | 检查路径拼写，必要时 create-node |
| design | `节点 X: 有 interaction 缺 design` | 漏了某个节点 | 在 PLAN.md 找到该节点行，跑 write-node --layer design |
| design | `visual.md 缺失` | 跳过了视觉先行 | 必须先写 visual.md，禁止反向工程 |
| design | `素材 X 的 md 不存在` | _materials.json 登记了但没写文档 | 写 materials/<id>.md（6 节模板） |

---

## 5. 与 validate.ts 的分工

| 脚本 | 关注点 | 何时跑 |
|------|--------|--------|
| `stage-gate.ts` | **阶段级**完整性（每一阶段的契约是否全部履行） | 阶段开工前 + 阶段收尾后 |
| `validate.ts` | **节点级**一致性（单个节点内部的层级/内容/引用一致性） | 每完成一个组件后 |
| `task-gen.ts` | **任务排序**（按依赖输出有序任务清单） | 启动时辅助查看 |
| `plan-gen.ts` | **任务清单**（生成 PLAN.md 供逐项打勾） | 阶段开工时 + 上游有变时 |

四个脚本互补，缺一不可。

---

## 6. 升级旧工程

如果某个工程是在引入 stage-gate 之前创建的，第一次跑 stage-gate 必然挂掉一片。处理流程：

```
1. 跑 stage-gate --stage product --mode exit
   → 看 ❌ 列表
   → 一个一个修（用 write-node.ts 补字段）
   → 直到 0 ❌
2. 跑 stage-gate --stage interaction --mode exit
   → 重点检查"没有子节点文件"和"operations 是字符串"
   → 用 create-node.ts 补节点骨架，重写 _page.json operations
3. 跑 stage-gate --stage design --mode exit
4. ...
```

**绝对禁止**：在 SKILL.md 里加"老工程兼容分支"。AGENTS.md 第 9 章红线明确禁止防御性兼容代码——升级旧工程的代价是一次性的，加兼容分支的代价是永久的。
