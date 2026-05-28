---
name: design-executor
description: 将 design-registry Schema 中的节点树逐项实施为设计编辑器中的实际项目。通过遍历分片 JSON 节点文件，读取每个节点上所有层的信息（product/interaction/design/logic/materials），结合 ref 指向的详细 md 文档获取精确规格，调用 page-builder 和 material-painter 子技能执行。触发词："执行设计"、"搭建页面"、"把设计做出来"、"开始实现"。
---

# design-executor

将 design-registry 中的节点树逐项实施为设计编辑器 Schema。

核心模式：**逐节点串行：读文件 → 提取精确值 → 委托子技能 → 真实验证 → 回写**。

---

## ⛔ 硬性约束（HARD GATES）

以下 6 条通过流程结构强制执行。违反任何一条将导致实现结果错误。

| Gate | 规则 | 违反后果 |
|:----:|------|---------|
| **G1** | 每个节点执行前必须 `read_file` 其 JSON 文件 | 遗漏 condition/trigger/visualStates 等关键字段 |
| **G2** | 样式值必须来自 visual.md §6 完整表格（keyStyles 只是子集，不是完整规格），不可从 summary 推断 | 遗漏关键属性（fontFamily/color/transition等） |
| **G3** | 有 `materials[].condition` 的素材**绝不** apply 到默认态 | 素材覆盖节点导致核心 UI 消失 |
| **G4** | 结构搭建用 page-builder，素材绘制用 material-painter，不直接调 MCP | 丢失子技能内置的安全检查 |
| **G5** | checklist 每项标 true 前必须有验证动作输出支撑 | 虚假完成标记 |
| **G6** | 每 3 节点或每个组件目录后必须截图验证 | 问题积累到最后无法定位 |

---

## 触发 / 不触发

**触发**: 存在 `design-registry/` 目录 + 用户说"执行设计/搭建页面/开始实现"

**不触发**: 无 registry → 先走上游链；只改单个样式 → page-builder；只画一个素材 → material-painter

---

## 输入源

每个节点 JSON（15-40行）包含 7 层信息。**以下字段决定实现方式，Step 1 必须提取**：

| 字段 | 决定什么 | 不读的后果 |
|------|---------|-----------|
| `interaction.trigger` | 元素 HTML 类型（input/button/div） | 用错类型 |
| `materials[].condition` | 素材应用到哪个状态 | 素材覆盖默认态 |
| `design.visualStates` | 需创建的视觉状态 | 缺少状态切换 |
| `design.keyStyles` | 精确样式值 | 值不精确 |
| `interaction.states` | 业务状态列表 | 遗漏状态 |
| `interaction.condition` | 事件前置条件 | 遗漏条件 |

---

## 工作流

### Phase 0: 启动门禁 & 任务生成

```bash
SCRIPTS=".claude/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"
```

#### 0.1 上游门禁

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage implementation --mode entry
```

退出码 0/2 继续，退出码 1 → 回 design-planner。

#### 0.2 任务生成

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/task-gen.ts \
  --registry $REGISTRY --for executor [--page <target>]
```

#### 0.3 环境确认 + 能力预检

```
1. MCP: theme/check → 确认主题已定制
2. MCP: query/list_screens → 确认屏幕存在
3. 扫描节点 JSON，生成「能力匹配报告」:
   - ✅ 可完整实现的节点
   - ⚠️ 需 workaround 的节点（如 tab 切换高亮 → node.setVisualState）
   - ❌ 无法实现的能力（如倒计时 → 降级方案）
4. 告知用户任务列表和能力报告
```

---

### Phase 1: 逐节点执行（★ 严格串行，5 步不可跳）

对任务列表中**每个节点**：

#### Step 1: 读取节点 JSON + 全部 ref 文档（G1 + G2 检查点）

**1a: 读节点 JSON**

```
read_file: design-registry/pages/<path>/<node>.json
→ 提取关键决策字段:
  ▸ element_type（从 interaction.trigger 推断，见 references/execution-rules.md）
  ▸ visual_states（design.visualStates 的 key 列表 + 每个状态的精确样式差异）
  ▸ material_conditions（materials[].condition —— 有值则标记"不可 apply 默认态"）
  ▸ key_styles（design.keyStyles —— ⚠️ 这只是关键样式子集，不是完整规格！）
  ▸ event_trigger + event_condition
  ▸ interaction.states（业务状态完整列表）
  ▸ 所有 ref 路径（product.ref, interaction.ref, design.ref, design.visualRef, materials[].ref）
```

**1b: 读全部设计文档（不可跳过任何一个）**

```
必读文档清单（无论节点 JSON 是否有对应 ref 字段）:

① 页面视觉文档（完整样式的唯一权威来源）:
   read_file: design-plan/pages/<page>/visual.md
   → 从 §6 样式规格清单中提取该节点的【完整】CSS 属性列表
   → ⚠️ keyStyles 只是子集（通常 5-8 个属性），visual.md §6 有完整 15-20 个属性

② 页面汇总文档:
   read_file: design-plan/pages/<page>/index.md
   → §7 节点结构树中该节点的 inline 样式注释（补充信息）

③ 交互规格文档（每个节点都必须读，不是"如果有才读"）:
   read_file: interaction-design/pages/<page>.md
   → 操作清单中该节点对应的操作行（trigger/前置/反馈/成功/失败/边界）
   → 状态机中涉及该节点的 transition

④ 如果节点有专属组件视觉文档（design.visualRef 存在）:
   read_file: [design.visualRef 路径]
   → 组件级精确样式表

⑤ 如果节点有素材（materials[] 不为空）:
   read_file: [materials[n].ref 路径]
   → §6 绘制要求（色彩/线宽/尺寸/图形描述）
```

**1c: 整合为「节点完整规格」**

```
将从 1a + 1b 中读到的所有信息整合为一份精确规格:

节点完整规格 = {
  type: [从 trigger 推断],
  name: [...],
  textContent: [...],
  
  styles: {
    // 来源: visual.md §6 的完整表格（不是 keyStyles 子集）
    // 每个属性标注来源: "← visual.md §6 第N行" 或 "← index.md §7 节点树"
    height: "48px",              // ← visual.md §6
    width: "100%",               // ← visual.md §6
    borderRadius: "12px",        // ← visual.md §6
    border: "1px solid #FFE0E8", // ← visual.md §6
    fontSize: "16px",            // ← visual.md §6
    fontFamily: "Nunito, ...",   // ← visual.md §6（keyStyles 中没有！）
    lineHeight: "1.5",           // ← visual.md §6（keyStyles 中没有！）
    color: "rgba(45,36,56,0.92)",// ← visual.md §6（keyStyles 中没有！）
    backgroundColor: "#FFFFFF",  // ← 防御性规则 R3（visual.md 可能省略）
    transition: "all 200ms ...", // ← visual.md §6（keyStyles 中没有！）
    ...
  },
  
  visualStates: {
    // 来源: node.json design.visualStates（精确样式差异）
    focus: { border: "2px solid #FF6F91", boxShadow: "..." },
    error: { border: "2px solid #ED5A5A", boxShadow: "..." },
    ...
  },
  
  events: [
    // 来源: interaction-design/pages/<page>.md 操作清单中该节点的完整行
    { trigger: "input", condition: "...", actions: [...] },
    { trigger: "blur", condition: "...", actions: [...] },
  ],
  
  materials: [
    // 来源: node.json materials[] + ref 文档
    { id: "...", condition: "...|null", spec: "..." }
  ],
  
  dataBinding: {
    // 来源: node.json logic 层 或 interaction 描述
    bind: "view.phone",
    visibleWhen: null,
  }
}
```

**★ 关键原则**: `keyStyles` 是给任务列表看的"摘要"，不是给实现用的"规格"。
实现必须用 visual.md §6 的完整表格。如果 visual.md 中有而 keyStyles 中没有的属性，
以 visual.md 为准——那个属性不是"不需要"，是 keyStyles 省略了。

#### Step 3: 委托子技能执行（G3 + G4 检查点）

**结构/样式/事件** → 委托 page-builder（上下文模板见 `references/sub-skill-templates.md`）

**素材** → 素材应用决策（详见 `references/execution-rules.md#素材应用决策树`）：
- `materials[i].condition` 为空 → 委托 material-painter 正常 export_and_apply
- `materials[i].condition` 有值 → 委托 material-painter **只 export 不 apply**，URL 写入对应 visualState

#### Step 4: 验证（G5 检查点）

每项 checklist 必须有验证动作支撑（详细标准见 `references/checklist-standards.md`）：
- structure: query/screen_schema 确认 nodeId 存在 + type 正确
- styles: 对照 keyStyles 逐属性检查
- events: 确认事件数量 + trigger 类型 + node.setVisualState 联动
- materials: 对照 condition 确认应用位置正确
- visualStates: 确认 states 数组长度匹配 design.visualStates

**验证失败 → 修复 → 重新验证 → 全部通过后才进 Step 5**

#### Step 5: 回写

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/write-node.ts \
  --registry $REGISTRY --path pages/<page>/<component>/<node> \
  --layer implementation \
  --data '{"nodeId":"nd_xxx","status":"completed","checklist":{...}}'
```

---

### Phase 1.5: 阶段截图（G6 检查点）

每完成 3 个节点或 1 个组件目录后：

```
1. generate_snapshots → 截图
2. 对照 design.ref 检查: 可见性、颜色、尺寸、文字
3. 偏差 → 修复 → 二次截图
4. 无偏差 → 继续
```

---

### Phase 2: 页面级验证

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/validate.ts \
  --registry $REGISTRY --page <page>
# 必须 0 个 ❌
```

+ generate_snapshots (mode: frame) 完整页面截图 + 交互测试

---

### Phase 3: 收尾门禁

```bash
npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage implementation --mode exit
# 必须 0 ❌
```

---

## 关键约束总结

### 必须

- ✅ 逐节点读 JSON + **全部** ref 文档（visual.md/interaction.md/material.md）后才执行
- ✅ 样式值来自 visual.md §6 完整表格（keyStyles 只是子集，不够用）
- ✅ 有 condition 的素材只 export 不 apply
- ✅ 通过子技能执行，不直接调 MCP（query 类除外）
- ✅ checklist 有验证输出才标 true

### 禁止

- ❌ 从 summary 或 keyStyles 子集推断完整样式（必须读 visual.md §6 全表）
- ❌ insert_subtree 批量创建整页
- ❌ 有 condition 的素材 export_and_apply 到默认态
- ❌ 跳过 material-painter 直接调 canvas
- ❌ 连续 3+ 节点不截图验证
- ❌ 未验证就标 completed
- ❌ "如果有才读" — 交互文档每个节点都必须读，不论 trigger 是否存在

---

## 与其他技能的关系

```
product-analyst → interaction-designer → design-planner
                ↓
design-executor（遍历节点树，逐项委托子技能）
        ├── page-builder（结构/样式/事件/visualState）
        └── material-painter（绘制/导出/应用）
```

---

## references/

按需加载的详细参考：

| 文件 | 内容 | 何时加载 |
|------|------|---------|
| `references/execution-rules.md` | 元素类型映射表、素材应用决策树、CSS 陷阱清单、防御性规则 R1-R6 | Phase 1 执行前 |
| `references/sub-skill-templates.md` | 给 page-builder 和 material-painter 的完整上下文模板 | Step 3 委托时 |
| `references/checklist-standards.md` | 每项 checklist 的精确验证方法和标准 | Step 4 验证时 |
| `../common/references/stage-gate.md` | 全链路阶段门禁规范 | Phase 0/3 |
