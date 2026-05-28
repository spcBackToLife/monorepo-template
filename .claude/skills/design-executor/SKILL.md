---
name: design-executor
description: 将 design-registry Schema 中的节点树逐项实施为设计编辑器中的实际项目。通过遍历分片 JSON 节点文件，读取每个节点上所有层的信息（product/interaction/design/logic/materials），结合 ref 指向的详细 md 文档获取精确规格，调用 page-builder 和 material-painter 子技能执行。触发词："执行设计"、"搭建页面"、"把设计做出来"、"开始实现"。
---

# design-executor

将 design-registry 中的节点树逐项实施为设计编辑器 Schema。

核心模式：**逐节点串行：读文件 → 提取精确值 → 调用子技能 → 真实验证 → 回写**。

---

## ⛔ 硬性约束（HARD GATES）

以下规则通过流程结构强制执行，不依赖自律。违反任何一条将导致实现结果错误。

### Gate 1：逐节点读取（不可批量）

```
禁止: 一次性读取页面级文档后批量搭建所有节点
要求: 每个节点执行前，必须 read_file 该节点的 JSON 文件
验证: Step 3 中引用的值必须能追溯到 Step 1 读取的 JSON 中的精确字段
```

### Gate 2：精确值来源（不可推断）

```
禁止: 从 design.summary 推断样式值（summary 是给人看的摘要，不是精确规格）
要求: 所有样式值必须来自以下来源之一：
  - node.json 中的 design.keyStyles 对象
  - node.design.ref / node.design.visualRef 指向的 md 文档中的精确 CSS 表格
验证: 每个样式属性旁注释其来源（如 "← keyStyles.height" 或 "← visual.md §6 表格"）
```

### Gate 3：素材应用条件（不可忽略 condition）

```
禁止: 将有 condition 字段的素材直接 export_and_apply 到节点默认态
要求: 读取 node.materials[].condition 字段
  - 无 condition → 可应用到默认态
  - 有 condition → 素材只能用于对应 visualState，不能应用到默认态
          正确做法: 先 export 获得 URL，再将 URL 写入对应 visualState 的样式中
验证: 对照 node.json materials[].condition 与实际应用位置
```

### Gate 4：子技能委托（不可直接调 MCP）

```
禁止: executor 直接调用 element/insert_subtree 批量创建节点
禁止: executor 直接调用 canvas/add_object 绘制素材
要求: 
  - 页面结构/样式/事件 → 必须调用 page-builder 子技能
  - 素材绘制/导出 → 必须调用 material-painter 子技能
验证: 执行日志中只应出现子技能调用，不应出现直接 MCP 调用（query 类除外）
```

### Gate 5：验证后标记（不可自报完成）

```
禁止: 未经验证就将 checklist 项标为 true
要求: 每项 checklist 必须有对应的验证动作：
  - structure: query/screen_schema 确认节点存在
  - styles: 对照 keyStyles 逐属性检查
  - events: 确认事件数量和 trigger 类型匹配
  - materials: 确认素材已绘制且应用位置正确（对照 condition）
  - visualStates: query/screen_schema 确认 states 数组长度匹配
  - dataBinding: 确认 visibleWhen/bind/repeat 已设置
验证: 每项标 true 前，文档中必须有对应的验证输出
```

### Gate 6：批量限制

```
禁止: 连续执行超过 3 个节点后才做阶段验证
要求: 每完成 3 个节点（或完成一个组件目录），必须执行：
  1. generate_snapshots 截图
  2. 对照设计文档视觉检查
  3. 如有偏差立即修复
```

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

**关键字段速查**（这些字段决定实现方式，必须在 Step 1 中提取）：

| 字段 | 决定什么 | 不读的后果 |
|------|---------|-----------|
| `interaction.trigger` | 元素的 HTML 类型（input/button/div） | 用错元素类型（如 div 代替 input） |
| `materials[].condition` | 素材应用到哪个状态 | 素材覆盖默认态，破坏节点 |
| `design.visualStates` | 需要创建哪些视觉状态 | 缺少状态切换能力 |
| `design.keyStyles` | 精确的样式值 | 从 summary 推断导致值不精确 |
| `interaction.states` | 节点有哪些业务状态 | 遗漏状态实现 |
| `interaction.condition` | 事件触发的前置条件 | 遗漏条件判断 |

---

## 工作流

### Phase 0: 启动门禁 & 任务生成

```bash
SCRIPTS=".claude/skills/common/scripts"
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

#### 0.3 平台能力预检（新增）

在开始实现前，检查本次页面所需的平台能力：

```
扫描所有节点 JSON，收集：
  - 是否有 interaction.trigger=input 的节点？→ 需要 input 元素（注意平台 input 默认样式问题）
  - 是否有 materials[].condition 的节点？→ 素材有条件应用，不能 apply 到默认态
  - 是否有 design.visualStates 数量 > 2 的节点？→ 需要多 visualState + event 联动
  - 是否有需要"条件样式"的场景（如 tab 切换高亮）？→ 需要 node.setVisualState workaround
  
生成「能力匹配报告」告知用户：
  - ✅ 可完整实现的节点
  - ⚠️ 需要 workaround 的节点（标明 workaround 方案）
  - ❌ 当前无法实现的能力（标明哪些设计意图会降级）
```

---

### Phase 1: 逐节点执行（★ 核心流程，严格串行）

对任务列表中的**每个节点**，严格执行以下 5 个步骤（不可跳步、不可合并）：

#### Step 1: 读取节点文件（GATE 1 检查点）

```
read_file: design-registry/pages/<path>/<node>.json
→ 提取并记录以下关键字段（后续步骤必须引用）:

▸ element_type = 从 interaction.trigger 推断:
    trigger=input/change → type:"input"
    trigger=click（且 content.type=text）→ type:"button" 或 type:"div"
    trigger=submit → type:"button"
    无 trigger → type:"div"

▸ visual_states = design.visualStates 的 key 列表
    例: ["hover", "pressed", "disabled", "success"]

▸ material_conditions = materials[].condition
    例: "{{state.view.submitState === 'success'}}"
    → 标记此素材不能 apply 到默认态！

▸ key_styles = design.keyStyles 对象（精确值来源）
    例: { height: "48px", background: "#FF6F91", ... }

▸ interaction_states = interaction.states 列表
▸ event_trigger = interaction.trigger
▸ event_condition = interaction.condition
```

#### Step 2: 读取 ref 文档（GATE 2 检查点）

```
read_file: node.design.ref 或 node.design.visualRef 指向的 md 文档
→ 提取精确的 CSS 属性表格（完整属性名+值）

如果有 interaction.trigger:
  read_file: node.interaction.ref → 提取事件 actions 数组

如果有 materials[]:
  read_file: materials[n].ref → 提取素材绘制规格（§6 绘制要求）

★ 提取的值记录为"精确规格清单"：
  styles: { [从 md 表格逐行提取] }
  events: { trigger, condition, actions: [...] }
  materials: { ref, condition, spec_summary }
```

#### Step 3: 调用子技能执行（GATE 4 检查点）

##### 3a: 结构/样式/事件 → 委托 page-builder

向 page-builder 提供的完整上下文：

```
任务: 搭建 [节点名]
项目: projectId=[xxx], screenId=[xxx]
父节点: [parentNodeId]（从已完成的父节点获取）

─── 精确节点规格 ───

type: [从 Step 1 element_type 推断]
  ★ 如果 interaction.trigger=input → type 必须是 "input"
  ★ 如果是 input 类型 → 必须设置 backgroundColor: "#FFFFFF"（平台默认样式问题）

name: [node.name]
textContent: [content.value]

styles: {
  [逐行列出从 Step 2 提取的精确 CSS 值]
  ★ 对于 input/textarea → 追加 backgroundColor: "#FFFFFF"
  ★ 对于 position:absolute 的装饰层 → 不使用 z-index:-1（层叠上下文陷阱）
}

layoutHint: [如有]

─── 视觉状态 ───

[从 Step 1 的 visual_states 逐项列出，每项含精确样式差异]
例:
  hover: { backgroundColor: "#FF89A4", transform: "scale(1.03)" }
  pressed: { backgroundColor: "#FB406F", transform: "scale(0.97)" }
  disabled: { opacity: "0.45" }
  
★ 每个 visualState 必须在创建节点后通过 visual_state/add 添加

─── 事件 ───

trigger: [click/change/input/hover/...]
condition: [{{ 表达式 }}]
actions: [
  { type: "state.set", path: "...", value: "..." },
  ★ 如果事件改变了某个 state 且有其他节点的视觉应响应此变化：
    追加 { type: "node.setVisualState", nodeId: "其他节点ID", stateName: "..." }
]

─── 数据绑定 ───

visibleWhen: [表达式]（如有 logic.displayCondition）
bind: [路径]（如 interaction.trigger=input/change）
repeat: [表达式]

─── ⚠️ 防御性规则 ───

1. input 类型必须有 backgroundColor: "#FFFFFF"
2. 装饰层不使用 z-index:-1，改用 z-index:0 + DOM 顺序（避免层叠上下文陷阱）
3. overflow:hidden 容器内的 absolute 子元素不能溢出边界
```

##### 3b: 素材 → 委托 material-painter（GATE 3 检查点）

**素材应用决策树**：

```
materials[] 字段存在？
  ├── 否 → 无素材任务，跳过
  └── 是 → 逐个检查 materials[i]：
        ├── materials[i].condition 存在？
        │     ├── 是 → ⚠️ 有条件素材！
        │     │   操作: 
        │     │     1. 委托 material-painter 绘制并 export（不 apply！）
        │     │     2. 获得素材 URL 后
        │     │     3. 将 URL 写入对应 visualState 的 styleOverrides 中
        │     │   例: condition="submitState==='success'"
        │     │     → 只在 "success" visualState 中设置 backgroundImage: url(...)
        │     │   绝对禁止: export_and_apply 到节点默认态
        │     │
        │     └── 否 → 无条件素材
        │         操作: 正常委托 material-painter 绘制 + export_and_apply
        │         注意: material-painter 会处理透明背景和清理
        │
        └── 素材类型 = Decoration 且可用 CSS 实现？
              ├── 是（纯色+opacity/简单渐变）→ 用 CSS 实现，不走素材工程
              └── 否（复杂图形/path）→ 走 material-painter
```

向 material-painter 提供的上下文：

```
任务: 绘制 [素材名]
项目: projectId=[xxx]
目标节点: [nodeId]
应用条件: [materials[i].condition 或 "无条件-直接应用"]

素材规格（从 material.ref §6 提取）:
  参考框: [W×H]
  图形描述: [...]
  色彩: [...]
  线宽: [...]
  风格: [...]

★ 如果有 condition:
  - 不要 export_and_apply
  - 只 export 获得 URL，返回给我
  - 我会将 URL 手动写入对应 visualState
```

#### Step 4: 验证（GATE 5 检查点）

**每项 checklist 的验证方法**：

```
structure: 
  → MCP query/screen_schema 中确认 nodeId 存在
  → 确认 node.type 正确（input vs div）
  
styles:
  → 对照 Step 2 精确规格清单，确认关键样式属性值一致
  → 特别检查: backgroundColor（input 必须显式白色）
  
events:
  → 确认事件数量 = interaction 层定义的数量
  → 确认每个事件有 node.setVisualState 联动（如需要）
  
materials:
  → 如果有 condition 素材: 确认 NOT apply 到默认态
  → 如果无 condition 素材: 确认已 apply 且 PNG size > 150B
  
visualStates:
  → query/screen_schema 确认 node.states 数组包含所有 design.visualStates 中的 key
  
interactionStates:
  → 确认 hover/pressed/focus 等 CSS 交互态已添加
  
dataBinding:
  → 确认 visibleWhen/bind/repeat 在 schema 中存在
  
extremeCases:
  → 对照 node.extremeCases 字段，确认有对应处理
  → 如无 extremeCases 字段，此项自动为 true
```

**验证失败处理**：
```
如果任何一项验证失败：
  1. 记录失败原因
  2. 修复
  3. 重新验证
  4. 只有全部通过后才进入 Step 5
```

#### Step 5: 回写（仅在 Step 4 全部通过后）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY \
  --path pages/<page>/<component>/<node> \
  --layer implementation \
  --data '{"nodeId":"nd_xxx","status":"completed","checklist":{...}}'
```

**checklist 值必须反映 Step 4 的真实验证结果**，不得全填 true。

---

### Phase 1.5: 阶段截图验证（每 3 个节点或每完成 1 个组件）（GATE 6 检查点）

```
1. MCP: generate_snapshots → 截图
2. 对照 design.ref / design.visualRef 文档中的布局图检查
3. 检查项:
   - 节点是否可见？（防止 z-index/overflow 陷阱）
   - 颜色是否正确？（防止平台默认样式覆盖）
   - 尺寸比例是否合理？
   - 文字是否可读？
4. 如有偏差 → 立即修复 → 再次截图验证
5. 确认无误后继续下一批节点
```

---

### Phase 2: 页面级验证

全部节点完成后：

```
1. 运行校验脚本:
   npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/validate.ts \
     --registry $REGISTRY --page <page>
   → 必须 0 个 ❌

2. MCP: generate_snapshots (mode: frame) → 完整页面截图

3. 交互测试（逐个验证核心操作）:
   对照 interaction 层的 operations 列表：
   - 每个 trigger 对应的事件是否绑定？
   - 事件中的 actions 是否包含 node.setVisualState 联动？
   - visibleWhen 是否在 state 变化后正确显隐？

4. 更新页面状态:
   write-node.ts → _page → status:"completed"
```

---

### Phase 3: 收尾门禁（★ 全项目执行完后必跑）

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage implementation --mode exit
```

必须 0 ❌ 才能宣告项目交付。

---

## 子技能上下文模板

### 给 page-builder

```
任务: 搭建 [节点名]
项目: projectId=[xxx], screenId=[xxx]
父节点: [parentNodeId]

★ 元素类型决策:
  interaction.trigger = [值] → type = [input/button/div]
  (如果是 input → 必须设 backgroundColor:"#FFFFFF")

精确节点规格（来源: [文件路径] [具体行/段落]）:
  type: [tag]
  name: [name]
  textContent: [从 content.value]
  styles: {
    [逐行列出，每行标注来源]
    height: "48px",       // ← keyStyles.height
    background: "#FF6F91", // ← keyStyles.background
    ...
  }

视觉状态（来源: design.visualStates）:
  [状态名]: { [精确样式差异] }
  hover: { background: "#FF89A4", transform: "scale(1.03)" }
  ...

事件（来源: interaction.ref [具体段落]）:
  trigger: [click/change/...]
  condition: [{{ 表达式 }}]  // ← interaction.condition
  actions: [
    { type: "state.set", path: "view.xxx", value: "yyy" },
    { type: "node.setVisualState", nodeId: "nd_xxx", stateName: "active" }
    // ★ 重要: 如果 state.set 会影响其他节点的视觉，必须追加 setVisualState
  ]

数据绑定:
  visibleWhen: [表达式]  // ← logic.displayCondition
  bind: [路径]
  repeat: [表达式]

⚠️ 防御性要求:
  - input/textarea 必须有 backgroundColor: "#FFFFFF"
  - 装饰层 z-index 使用 0 或正数，不使用 -1
  - 绝对定位子元素不能超出 overflow:hidden 父级边界
```

### 给 material-painter

```
任务: 绘制 [素材名]
项目: projectId=[xxx]
应用条件: [无条件 / 有条件: "{{expression}}"]

★ 如果有条件:
  → 只 export 不 apply！
  → 返回 exportedUrl 给我
  → 我将 URL 写入节点 "[状态名]" visualState 的 backgroundImage

★ 如果无条件:
  → 正常 export_and_apply 到 nodeId

目标节点: [nodeId]
参考框: [W×H]

素材规格（来源: [材质文档路径] §6）:
  图形描述: [...]
  色彩: [...]
  线宽: [...]
  风格: [...]
```

---

## 关键约束（强化版）

### 必须遵守

- ✅ **Gate 1**: 每个节点执行前 `read_file` 其 JSON 文件 — 不可从记忆/summary 推断
- ✅ **Gate 2**: 样式值必须来自 `keyStyles` 或 ref md 中的精确 CSS 表格
- ✅ **Gate 3**: 有 `condition` 的素材绝不 apply 到默认态 — 必须检查 materials[].condition
- ✅ **Gate 4**: 结构搭建用 page-builder，素材绘制用 material-painter — 不直接调 MCP
- ✅ **Gate 5**: checklist 每项必须有验证输出支撑 — 不可全填 true
- ✅ **Gate 6**: 每 3 节点或每个组件后截图验证 — 不可一口气做完再看

### 绝对禁止

- ❌ 不得从 `design.summary` 推断样式值 — summary 是摘要不是精确规格
- ❌ 不得跳过 checklist 验证就标 completed — 每项需要验证动作支撑
- ❌ 不得在未读节点 JSON 文件的情况下执行该节点
- ❌ 不得一次性搭建超过 3 个节点后才验证
- ❌ 不得将有 condition 的素材 export_and_apply 到节点默认态
- ❌ 不得使用 insert_subtree 批量创建整页结构（必须逐节点通过 page-builder）
- ❌ 不得跳过 material-painter 子技能直接调用 canvas 工具绘制素材

### 常见陷阱预警

| 陷阱 | 触发条件 | 正确处理 |
|------|---------|---------|
| input 默认深色背景 | 创建 type:input 元素 | 显式设置 backgroundColor:"#FFFFFF" |
| 层叠上下文导致装饰不可见 | z-index:-1 在 overflow:hidden 父级中 | 改用 z-index:0 + DOM 顺序 |
| export_and_apply 覆盖节点样式 | 对有内容的按钮/卡片 apply 素材 | 只对纯展示节点 apply；有内容的节点创建子 IconDiv |
| 素材白色背景 | 画布 backgroundColor 未设 transparent | material-painter 会处理（Step 3 设 transparent） |
| mode-toggle 不切换 | 只 state.set 不 setVisualState | 在 event actions 中追加 node.setVisualState |
| visibleWhen 与 display:none 冲突 | 节点初始 display:none + visibleWhen | 去掉 display:none，让 visibleWhen 完全管理显隐 |
| 验证码格子不可输入 | 用 div 实现可输入元素 | 检查 interaction.trigger，trigger=input → type:input |

---

## 元素类型映射表（从 interaction.trigger 推断）

| interaction.trigger | 正确的元素 type | 错误用法 | 为什么 |
|--------------------|----|---------|------|
| `input` / `change` | `input` 或 `textarea` | ❌ 用 div | div 不可输入 |
| `click`（操作类） | `button` | 可接受 div | button 有语义 |
| `click`（导航类） | `div` 或 `button` | — | 两者都可 |
| `submit` | `button` type="submit" | ❌ 用 div | form 语义 |
| `hover` / `focus` / `blur` | 任何类型 | — | 通常是辅助事件 |
| 无 trigger | `div` | — | 纯展示 |

---

## 与其他技能的关系

```
product-analyst → interaction-designer → design-planner
  (各自写入 design-registry 对应层)
                ↓
design-executor (遍历 registry 节点树逐项执行)
        ↓ 委托子技能（不直接调 MCP）
        ├── page-builder (搭建节点/样式/事件/visualState)
        └── material-painter (绘制素材/导出应用)
```

---

## references/

- `references/execution-rules.md` — 完整执行规则集（R1-R6 + 素材 SOP + 层叠检查清单）
- `references/checklist-standards.md` — implementation.checklist 各项的验收标准详细说明
- `../common/references/stage-gate.md` — ★ 全链路阶段门禁规范
