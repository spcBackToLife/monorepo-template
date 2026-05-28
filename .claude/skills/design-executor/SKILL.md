---
name: design-executor
description: 将 design-registry Schema 中的节点树逐项实施为设计编辑器中的实际项目。通过遍历分片 JSON 节点文件，读取每个节点上所有层的信息（product/interaction/design/logic/materials），结合 ref 指向的详细 md 文档获取精确规格，调用 page-builder 和 material-painter 子技能执行。触发词："执行设计"、"搭建页面"、"把设计做出来"、"开始实现"。
---

# design-executor

将 design-registry 中的节点树逐项实施为设计编辑器 Schema。

核心模式：**遍历节点文件 → 读取多层信息 → 读 ref 获取精确规格 → 调用子技能执行 → 回写 implementation**。

---

## 触发条件

- 存在 `design-registry/` 目录（至少有 `_index.json` + `pages/` 目录）
- 用户说"执行设计"、"搭建页面"、"把设计做出来"、"开始实现"

## 不触发

- 无 design-registry → 先触发上游技能链（product-analyst → interaction-designer → design-planner）
- 只改单个样式 → 直接用 `page-builder`
- 只画一个素材 → 直接用 `material-painter`

---

## 输入源

```
design-registry/
├── _index.json                ← 全局：项目/导航/全局状态/模块索引
├── pages/
│   ├── _index.json            ← 页面列表摘要（状态/节点数）
│   └── <page-id>/
│       ├── _page.json         ← 页面级信息（product/interaction/dataLayer）
│       ├── _materials.json    ← 该页面素材索引
│       └── <component>/       ← 组件目录
│           ├── _component.json    ← 组件根节点信息
│           └── <element>.json     ← 叶子节点文件
└── scripts/                   ← 校验/查询/任务生成脚本
```

每个节点 JSON 文件（15-40行）包含：
- `product`（summary + ref + rules）
- `interaction`（summary + ref + trigger + flows + states）
- `design`（summary + ref + visualRef + visualStates + interactionStates）
- `logic`（displayCondition + enableCondition + dataBinding + businessRules）
- `extremeCases`
- `content` / `materials`
- `implementation`（nodeId + status + checklist）

---

## 工作流

### Phase 0: 启动门禁 & 任务生成

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"
```

#### 0.1 上游门禁（★ 必须通过才能开始执行）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage implementation --mode entry
```

退出码 0/2 才能继续。退出码 1（有 ❌）→ 回 design-planner 补完。

#### 0.2 任务生成与环境就绪

```
1. 运行脚本生成任务列表:
   npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/task-gen.ts \
     --registry $REGISTRY --for executor [--page <target>]
   → 输出有序任务列表（已按依赖排序，父先于子）
   → 每个任务附带: 节点路径 + summary + 需要读的 ref 文件列表

2. MCP: theme/check → 确认主题已定制
3. MCP: query/list_screens → 确认屏幕存在
4. 告知用户: 本次计划执行的任务列表
```

### Phase 1: 逐节点执行

对任务列表中的每个节点：

```
Step 1: 读取节点信息
  read_file design-registry/pages/<path>/<node>.json → 获取全部层信息（15-40行）

Step 2: 读取 ref 指向的完整 md 文档（获取精确规格）
  read_file node.design.ref 指向的文件位置 → 精确样式值
  read_file node.design.visualRef 指向的文件位置 → 视觉规格
  如果有 interaction.trigger:
    read_file node.interaction.ref → 交互细节（事件参数/flows）
  如果 materials 不为空:
    read_file material[n].ref → 素材绘制指令

Step 3: 加载子技能并执行
  如果是结构+样式: use_skill page-builder
  如果是素材绘制: use_skill material-painter
  
  向子技能提供的上下文（从 Step 1+2 中提取）:
    - 节点的 design.summary（快速理解）
    - ref md 文档中摘录的精确值（完整 CSS 属性对象、事件 actions 数组）
    - logic 层信息（visibleWhen/bind/repeat 表达式）
    - materials 信息（如需绘制）

Step 4: 验证 checklist 各项
  对照 implementation.checklist 逐项确认:
    - structure: 节点已创建（MCP query/screen_schema 确认有此 nodeId）
    - styles: 样式已设置（对照 md 中的精确值）
    - events: 事件已绑定（对照 interaction.trigger + flows）
    - materials: 素材已绘制+应用（如有 materials 字段）
    - visualStates: 业务视觉状态已添加（对照 design.visualStates）
    - interactionStates: CSS交互态已添加（hover/pressed/focus）
    - dataBinding: bind/repeat/visibleWhen 已设置（对照 logic 层）
    - extremeCases: 溢出/空态/极端数据已处理（如有 extremeCases 字段）

Step 5: 回写实施结果（通过脚本，确保格式正确）
  execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
    --registry $REGISTRY \
    --path pages/<page>/<component>/<node> \
    --layer implementation \
    --data '{"nodeId":"nd_xxx","status":"completed","checklist":{"structure":true,"styles":true,...}}'
```

### Phase 2: 阶段验证

每完成一个组件目录（_component + 所有子节点）后：

```
1. 运行校验脚本:
   execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/validate.ts --registry $REGISTRY --page <page>
   → 检查该页面所有节点的完整性（层级/内容/交互/引用/验收）
   → 如有问题输出告警列表

2. MCP: generate_snapshots → 截图验证视觉效果
3. 对照该组件的 design.ref 检查截图与设计文档是否一致
4. 如有问题 → 修复 → 二次截图

5. 更新页面状态（通过脚本）:
   execute_command: npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
     --registry $REGISTRY \
     --path pages/<page>/_page \
     --layer implementation \
     --data '{"status":"in-progress"}'  // 或 completed（全部节点done时）
```

### Phase 3: 收尾门禁（★ 全项目执行完后必跑）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage implementation --mode exit
```

必须 0 ❌ 才能宣告项目交付。常见 ❌：
- 某节点 `status !== completed` → 补完执行
- 某节点 checklist 有 false 项 → 补完对应步骤后回写
- 上游 design 阶段又有变（罕见，但 stage-gate 会把上游报错也带出来） → 通知 design-planner

---

## 子技能上下文模板

### 给 page-builder

```
任务: 搭建 [节点名]
项目: projectId=[xxx], screenId=[xxx]
父节点: [parentNodeId]

精确节点规格:
  type: [tag]
  name: [name]
  textContent: [从 content.value 或 ref 文档取]
  styles: {
    [从 design.ref 指向的 md 文档中提取的精确 CSS 属性对象]
  }
  layoutHint: [如有]

事件（从 interaction 层提取）:
  trigger: [click/change/...]
  condition: [{{ 表达式 }}]
  actions: [从 ref 文档中提取的精确 actions 数组]

数据绑定（从 logic 层提取）:
  visibleWhen: [表达式]
  bind: [路径]
  repeat: [表达式]

视觉状态（从 design.visualStates 提取）:
  [状态名]: { [精确样式差异] }
```

### 给 material-painter

```
任务: 绘制 [素材名] 并应用到 [nodeId]
项目: projectId=[xxx]

素材规格（从 material.ref 文档提取）:
  [粘贴素材文档 §6 绘制要求的核心内容]

参考框: [W×H]
目标节点: [nodeId]
```

---

## 关键约束

### 必须遵守

- ✅ 每次执行前 **read_file 节点 JSON + ref 文档** — 不靠记忆
- ✅ 向子技能提供的样式值必须**精确**（从 ref md 中逐行提取）
- ✅ 每个节点完成后**逐项核对 checklist** — 不跳过任何一项
- ✅ 完成后**立即回写** implementation 到节点文件

### 绝对禁止

- ❌ 不得从 summary 推断样式值 — summary 是摘要不是精确规格
- ❌ 不得跳过 checklist 中的任何一项就标 completed
- ❌ 不得在未读 ref 文档的情况下执行
- ❌ 不得一次性搭建 10+ 节点后才验证

---

## 与其他技能的关系

```
product-analyst → interaction-designer → design-planner
  (各自写入 design-registry 对应层)
                ↓
design-executor (遍历 registry 节点树逐项执行)
        ↓ 加载子技能
        ├── page-builder (搭建节点/样式/事件)
        └── material-painter (绘制素材/导出应用)
```

---

## references/

- `references/checklist-standards.md` — implementation.checklist 各项的验收标准详细说明
- `../common/references/stage-gate.md` — ★ 全链路阶段门禁规范
