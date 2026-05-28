# 子技能上下文模板（Sub-skill Context Templates）

> 本文档在 Phase 1 Step 3 委托子技能时加载。每次委托必须按此模板提供完整上下文。

---

## 模板 A: 给 page-builder 的上下文

```markdown
任务: 搭建 [节点名]
项目: projectId=[xxx], screenId=[xxx]
父节点: [parentNodeId]

═══ 元素类型决策 ═══

interaction.trigger = [值]
→ type = [input/button/div]（查 execution-rules.md R1 映射表）
★ 如果 type=input → 必须设 backgroundColor:"#FFFFFF"

═══ 精确节点规格 ═══
（每个值标注来源）

type: [tag]
name: [node.name]
textContent: [content.value]

styles: {
  [属性]: [值],   // ← 来源: keyStyles.[属性]
  [属性]: [值],   // ← 来源: [ref文件名] §[章节] 表格第N行
  ...
}

★ 防御性追加:
  - input 类型 → backgroundColor: "#FFFFFF"
  - 装饰层 → z-index: 0 或正数（不用 -1）
  - absolute 子元素 → 不超出 overflow:hidden 父级边界

═══ 视觉状态（来源: design.visualStates）═══

需要通过 visual_state/add 创建的状态:
  [状态名]: {
    [精确的 styleOverrides]
  }
例:
  hover: { backgroundColor: "#FF89A4", transform: "scale(1.03)" }
  pressed: { backgroundColor: "#FB406F", transform: "scale(0.97)" }
  active: { backgroundColor: "#FF6F91", color: "#FFFFFF" }

═══ 事件（来源: interaction.ref）═══

事件 1:
  trigger: [click/change/input/hover/...]
  condition: [{{ 表达式 }}]（来源: interaction.condition）
  actions: [
    { type: "state.set", path: "view.xxx", value: "yyy" },
    ★ 如果此 state.set 会影响其他节点的视觉:
    { type: "node.setVisualState", nodeId: "[受影响节点ID]", stateName: "[状态名]" }
  ]

═══ 数据绑定（来源: logic 层）═══

visibleWhen: [表达式]（来源: logic.displayCondition）
  ★ 设了 visibleWhen 后，styles 中不要设 display:none
bind: [路径]（如 interaction.trigger=input/change）
repeat: [表达式]（如有列表绑定）
```

---

## 模板 B: 给 material-painter 的上下文

### B-1: 无条件素材（正常 export_and_apply）

```markdown
任务: 绘制 [素材名] 并应用到 [nodeId]
项目: projectId=[xxx]
应用模式: 无条件，直接 export_and_apply

目标节点: [nodeId]
节点当前尺寸: [W×H]（从 screen_schema 读取）
参考框: [W×H]（通常 = 节点尺寸）

素材规格（来源: [material ref 文件路径] §6 绘制要求）:
  图形描述: [粘贴 §6 的"图形描述"段]
  色彩: [精确色值列表]
  线宽: [px 值]
  风格: [outline/fill/mixed]
  对齐: [居中/偏移]

★ 提醒: 
  - 必须在 Step 3 设 canvas 背景为 transparent
  - export_and_apply 会覆盖 9 个样式属性
  - 目标节点必须是纯展示节点（无重要边框/背景需保留）
```

### B-2: 有条件素材（只 export 不 apply）

```markdown
任务: 绘制 [素材名]（⚠️ 有条件！只 export 不 apply）
项目: projectId=[xxx]
应用模式: 条件应用
条件: [materials[i].condition 的值，如 "{{state.view.submitState === 'success'}}"]
对应 visualState: [从 condition 推断的状态名，如 "success"]

目标节点: [nodeId]
参考框: [W×H]

素材规格（来源: [material ref 文件路径] §6）:
  图形描述: [...]
  色彩: [...]
  线宽: [...]
  风格: [...]

★ 执行要求:
  1. 正常绘制素材
  2. 使用 canvas/export_and_apply → 获取 exportedUrl
     ❌ 但不能 apply 到节点默认态！
  3. 返回 exportedUrl 给 executor
  4. executor 将 URL 写入 visual_state/update:
     stateName: "[对应状态名]"
     styleOverrides: {
       backgroundImage: "url([exportedUrl])",
       backgroundSize: "contain",
       backgroundPosition: "center",
       backgroundRepeat: "no-repeat"
     }
```

**注意**: 如果 material-painter 的 export_and_apply 无法"只 export"，替代方案是：
1. 创建一个临时纯展示 div
2. export_and_apply 到临时 div → 获得 URL
3. 从临时 div 的样式中读取 backgroundImage URL
4. 将 URL 写入目标节点的对应 visualState
5. 删除临时 div

---

## 模板 C: 给 page-builder 的 visualState 联动模板

当一个事件需要切换多个节点的视觉状态时：

```markdown
任务: 为 [节点名] 添加事件，含跨节点 visualState 联动
项目: projectId=[xxx], screenId=[xxx]

事件定义:
  nodeId: [触发节点 ID]
  trigger: click
  actions: [
    // 1. 状态变更
    { "type": "state.set", "path": "view.loginMode", "value": "code" },
    
    // 2. 视觉联动（每个受影响节点一条）
    { "type": "node.setVisualState", "nodeId": "[code-tab-id]", "stateName": "active" },
    { "type": "node.setVisualState", "nodeId": "[password-tab-id]", "stateName": "default" }
  ]

前置要求（必须先完成）:
  - [code-tab-id] 已通过 visual_state/add 创建了 "active" 状态
  - [password-tab-id] 已通过 visual_state/add 创建了 "active" 状态
  - 两个节点的 "default" 样式就是它们的基础样式（不需要额外创建）
```

---

## 上下文模板使用清单

在 Step 3 委托前，确认以下信息已准备齐全：

```
□ 节点类型已确定（来自 R1 映射）
□ 所有样式值有精确来源标注
□ 视觉状态列表与 design.visualStates 完全匹配
□ 事件中的 node.setVisualState 已覆盖所有受影响节点
□ 素材应用条件已检查（有 condition → 用模板 B-2）
□ 防御性样式已追加（input 白背景、z-index 非负）
□ visibleWhen 设置后未额外设 display:none
```
