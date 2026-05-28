# Design Registry Scripts

这些脚本是 design-registry 驱动的全链路协作工具，供各技能（product-analyst / interaction-designer / design-planner / design-executor）统一调用。

## 调用前提

脚本目录下有 `tsconfig.json`，调用时**必须**用 `--project` 指定，否则 ts-node 会按 ESM 解析然后挂掉：

```bash
SCRIPTS=".cursor/skills/common/scripts"

npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/<script>.ts \
  --registry <path-to-registry> [options]
```

## 脚本清单

| 脚本 | 用途 | 调用方 |
|------|------|--------|
| `stage-gate.ts` | ★ **阶段门禁**（每阶段开工前/收尾必跑，未通过禁止前进） | 所有技能 |
| `plan-gen.ts` | ★ **生成节点级 PLAN.md**（任务清单，逐项打勾） | interaction-designer, design-planner |
| `create-node.ts` | 创建新的节点文件 | interaction-designer, design-planner |
| `write-node.ts` | 安全追加/更新节点的某层或字段 | 所有技能 |
| `validate.ts` | 节点级完整性校验（层级/内容/交互/引用/验收） | design-planner, design-executor |
| `task-gen.ts` | 为各技能生成有序任务列表（细粒度辅助） | interaction-designer, design-planner, design-executor |
| `query.ts` | 按条件灵活查询节点 | 调试/验证 |
| `stats.ts` | 项目整体进度统计 | 任何时候 |

## 阶段门禁与 PLAN.md（核心工作流）

详见 `../references/stage-gate.md`。要点：

- **每阶段开工前**: 跑 `stage-gate --mode entry` 检查上游
- **每阶段开工时**: 跑 `plan-gen` 生成 PLAN.md
- **每完成一项**: 把 PLAN.md 对应行 `[ ]` → `[x]`
- **每阶段收尾**: 跑 `stage-gate --mode exit`，必须 0 ❌

## 使用示例

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/my-app/design-registry"
WORKSPACE=".design-workspaces/my-app"

# 阶段门禁
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage product --mode exit

# 生成本阶段任务清单
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/plan-gen.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage design

# 生成 executor 任务列表
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/task-gen.ts \
  --registry $REGISTRY --for executor --page 02-publish-moment

# 校验某页面（节点级）
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/validate.ts \
  --registry $REGISTRY --page 02-publish-moment

# 创建节点
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/create-node.ts \
  --registry $REGISTRY \
  --path pages/02-publish-moment/nav-bar/publish-btn \
  --data '{"id":"publish-btn","type":"element","name":"发布按钮","product":{"summary":"提交发布"}}'

# 追加 interaction 层
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY \
  --path pages/02-publish-moment/nav-bar/publish-btn \
  --layer interaction \
  --data '{"summary":"click→loading→success/error","ref":"interaction-design/pages/02-publish-moment.md#发布按钮"}'

# 查询所有待实施节点
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/query.ts \
  --registry $REGISTRY --status pending

# 查看进度
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stats.ts \
  --registry $REGISTRY
```

## 路径约定

- `--registry` 指向 `.design-workspaces/<task>/design-registry/` 目录
- `--workspace` 指向 `.design-workspaces/<task>/`（默认是 registry 的上级）
- `--path` 是相对于 registry 的节点路径（不含 `.json` 后缀）
- 特殊文件用下划线前缀：`_page`, `_block`, `_materials`, `_index`
