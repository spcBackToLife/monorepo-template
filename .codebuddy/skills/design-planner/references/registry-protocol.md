# Design Registry 读写协议

> 每完成一个页面/组件/素材的 md 文档分析后，必须同步写入 design-registry。

## 脚本位置

所有脚本统一在 `.cursor/skills/common/scripts/`。调用必须带 `--project tsconfig.json`：

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"

# 标准调用形式
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/<script>.ts ...
```

> 阶段门禁(`stage-gate.ts`) 与 任务清单(`plan-gen.ts`) 详见 `../../common/references/stage-gate.md`

## 读取（生成待设计任务列表）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/task-gen.ts --registry $REGISTRY --for planner
# → 输出: 所有有 interaction 但无 design 的节点列表
```

## 写入命令速查

### 创建新节点文件（展开组件/新增装饰时）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/create-node.ts \
  --registry $REGISTRY \
  --path pages/<page>/<block>/<element> \
  --data '{
    "id": "节点ID",
    "type": "element",
    "name": "节点名",
    "design": {
      "summary": "tag + 关键样式摘要",
      "ref": "design-plan/pages/<page>/index.md#§3.N:节点名",
      "visualRef": "design-plan/pages/<page>/visual.md#§6:对应行"
    },
    "content": { "type": "text", "value": "确认" },
    "materials": null
  }'
```

### 追加 design 层到已有节点

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY \
  --path pages/<page>/<block>/<element> \
  --layer design \
  --data '{
    "summary": "...",
    "ref": "...",
    "visualRef": "...",
    "visualStates": {...},
    "layoutHint": "..."
  }'
```

### 追加 logic 层

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY \
  --path pages/<page>/<block>/<element> \
  --layer logic \
  --data '{ "displayCondition": "{{ ... }}", "businessRules": [...] }'
```

### 更新素材索引

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY \
  --path pages/<page>/_materials \
  --layer materials \
  --data '{ "I-07": { "name": "vis-public", "ref": "materials/I-07-vis-public.md", "status": "pending" } }'
```

### 更新页面状态

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY \
  --path pages/<page>/_page \
  --field status \
  --value ready
```

### 校验

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/validate.ts --registry $REGISTRY --page <page-id>
```

## 写入时机

| 完成什么 md 分析 | 执行什么写入命令 |
|-----------------|---------------|
| 页面 visual.md + index.md | `write-node --layer design` 追加 design + dataLayer 到 _page |
| index.md §8 节点树完成 | `create-node` 逐个创建区块目录和节点文件 |
| 组件 .md 完成 | `create-node` 展开组件内部子节点 + `write-node --layer design` |
| 素材 .md 完成 | `write-node --path _materials` 追加条目 |
| 完整性验证通过 | `write-node --path _page --field status --value ready` |

## 节点文件 design 层结构

```jsonc
{
  "id": "节点ID",
  "type": "block | element | component",
  "name": "节点名",

  // 上游已写入（不可动）
  "product": { "summary": "...", "ref": "..." },
  "interaction": { "summary": "...", "ref": "...", "trigger": "..." },

  // ★ 本技能写入
  "design": {
    "summary": "tag + 关键样式摘要",
    "ref": "design-plan/pages/<page>/index.md#§3.N:节点名",
    "visualRef": "design-plan/pages/<page>/visual.md#§6:对应行",
    "visualStates": { "状态名": { "summary": "样式差异", "ref": "..." } },
    "interactionStates": { "hover": { "summary": "...", "ref": "..." } },
    "layoutHint": "sticky-header | scroll-child | ..."
  },

  "logic": {
    "displayCondition": "{{ 表达式 }}",
    "enableCondition": "{{ 表达式 }}",
    "dataBinding": "{{ 表达式 }}",
    "repeat": "{{ 表达式 }}",
    "businessRules": [{ "rule": "...", "ref": "..." }]
  },

  "extremeCases": [{ "case": "...", "handling": "...", "ref": "..." }],
  "content": { "type": "text|none|css-decoration|dynamic", "value": "..." },
  "materials": [{ "id": "I-07", "summary": "...", "ref": "materials/I-07.md", "condition": "..." }]
}
```

## 产出文件结构

### md 详情文档

```
.design-workspaces/<task>/design-plan/
├── design-system.md
├── pages/
│   ├── 01-home-map/
│   │   ├── visual.md              ← ★ 页面视觉分析
│   │   ├── index.md               ← 页面骨架
│   │   ├── components/
│   │   │   ├── [name].visual.md   ← ★ 组件视觉分析
│   │   │   └── [name].md          ← 组件结构+交互
│   │   └── materials/
│   │       └── [ID]-[name].md     ← 素材绘制指令
│   └── ...
└── components/                     ← 通用组件（跨页面复用）
    └── [NN]-[name]/
        ├── index.md / visual.md / materials/
```

### design-registry（结构化索引）

```
.design-workspaces/<task>/design-registry/
├── _index.json
├── pages/
│   ├── _index.json
│   └── <page-id>/
│       ├── _page.json / _materials.json
│       └── <block>/ → _block.json + <element>.json
```

**关系**: md = 完整信息载体 | registry = 结构化索引+摘要+ref引用 | ref 连接两者
