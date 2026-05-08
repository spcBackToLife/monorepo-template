# MCP 页面设计工具能力映射

本文件作为 `design-from-screenshot` 的 references 资源，提供所有页面设计相关 MCP 工具的完整能力说明和参数速查。

---

## 1. query — 项目/屏幕查询

**用途**: 调研现状、获取节点信息（Phase 0 必备）

### action: project_info
```
输入: { projectId }
输出: 项目名称、平台、屏幕列表、视口信息
```

### action: screen_schema ⭐ 最常用
```
输入: { projectId, screenId }
输出: 完整节点树（含 styles/events/states/children/materialProjectId）
用途:
  - 查看目标节点的实际 width/height/position
  - 了解现有元素层级结构
  - 确认某节点是否存在及其子元素
```

### action: list_screens
```
输入: { projectId }
输出: 所有屏幕的 ID 和名称列表
用途: 找到目标屏幕 ID
```

---

## 2. element — 元素操作

**用途**: 增删改 DOM 节点

### action: add ⭐ 核心操作
```
必需参数:
  - parentNodeId: string    — 父节点 ID
  - tag: string             — HTML 标签 (div/p/h1/h2/span/button/img/input/a)
可选参数:
  - initialStyles: object   — 初始样式
  - props: object           — 属性（textContent 推荐）
  - name: string            — 显示名称
返回: 新建节点的 ID
注意:
  - 文字内容用 props.textContent（不用 children！）
  - 数据绑定用 {{data.xxx}} 格式
```

### action: remove
```
必需参数:
  - nodeId: string          — 要删除的节点 ID
注意: 物理删除，不可逆（需 undo 恢复）
```

### action: move
```
必需参数:
  - nodeId: string          — 要移动的节点
  - newParentNodeId: string — 新父节点
```

### action: duplicate
```
必需参数:
  - nodeId: string          — 要复制的节点
返回: 新节点 ID
```

### action: insert_subtree
```
用途: 批量插入一棵完整的子树
参数包含完整的节点定义（含 children 数组）
```

### action: wrap / unwrap
```
wrap: 将多个节点包裹到新容器
  - nodeIds: string[]       — 要包裹的节点列表
  - wrapperTag: string      — 容器标签
  - initialStyles?: object  — 容器样式

unwrap: 解除包裹，子节点提升到父级
  - nodeId: string          — 要解包的容器节点
```

### action: reorder
```
调整元素在父节点中的排列顺序
```

### action: set_visibility_when
```
设置条件可见性规则（基于领域态变量）
```

### action: change_type
```
修改 HTML 标签类型 (如 div → img)
```

---

## 3. style — 样式修改

**用途**: CSS 样式的增改删

### action: update ⭐ 最常用
```
必需参数:
  - nodeId: string
  - styles: object          — CSS 属性键值对
示例:
  { backgroundColor: "#1a1a22", borderRadius: 20, padding: "16px 14px" }
⚠️ 注意:
  - 不要用 background 简写 → 会覆盖 backgroundImage！
  - 分别设 backgroundImage + backgroundColor + backgroundSize + backgroundPosition
```

### action: batch_update ⭐ 批量操作
```
必需参数:
  - updates: Array<{ nodeId, styles }>
用途: 一次修改多个节点的样式
示例:
  updates: [
    { nodeId: "nd_a", styles: { color: "#fff" } },
    { nodeId: "nd_b", styles: { fontSize: 14 } }
  ]
```

### action: reset
```
必需参数:
  - nodeId: string
  - properties: string[]    — 要删除恢复默认的 CSS 属性名数组
用途: 删除特定属性（如 boxShadow）
示例: properties: ["boxShadow", "border"]
```

---

## 4. event — 交互事件

**用途**: 点击跳转、状态切换等交互

### action: add_navigation ⭐ 常用
```
必需参数:
  - nodeId: string
  - targetScreenId: string  — 目标屏幕 ID（传 "new" 自动创建新屏幕）
用途: 为元素添加点击跳转
```

### action: add_event
```
必需参数:
  - nodeId: string
  - trigger: string         — 触发方式 (click/hover/focus/...)
  - actions: Array<{        // 动作列表
      type: string,         — navigate/setState/custom
      targetScreenId?: string,
      stateName?: string,
      stateValue?: any
    }>
可选:
  - condition?: object      — 条件触发
  - description?: string    — 描述
```

### action: update_event
```
就地更新已有事件（按索引）
```

### action: remove_event
```
按索引删除事件
```

---

## 5. data_source — 数据管理

**用途**: 列表数据驱动、API Mock

### action: list
```
必需参数:
  - projectId, screenId
输出: 当前屏幕的所有数据源（含阶段和场景信息）
```

### action: add ⭐ 创建数据源
```
必需参数:
  - projectId, screenId
  - type: "static" | "api"
  - name: string
  - data: object (static 类型) — 数据内容
  或 apiUrl: string (api 类型)

示例 (static):
{
  type: "static",
  name: "featureTiles",
  data: {
    featureTiles: [
      { icon: "🎛", title: "Beat new craft", subtitle: "Create beats" },
      { icon: "🎵", title: "Lyric composer", subtitle: "Write lyrics" },
      { icon: "✂️", title: "Audio editor", subtitle: "Edit tracks" },
      { icon: "🎚", title: "Mix studio", subtitle: "Mix & master" }
    ]
  }
}
```

### action: bind_data ⭐ 数据绑定
```
必需参数:
  - projectId, screenId
  - nodeId: string
  - property: string        — 要绑定的属性名 (如 textContent)
  - expression: string      — 数据表达式 (如 {{data.featureTiles[0].title}})
```

### action: switch_phase
```
切换 API 数据源生命周期 (design → develop → mock → production)
```

### action: add_scenario / update_scenario / switch_scenario
```
多场景管理（如 loading/empty/error/data 状态）
```

---

## 6. domain_state — 领域态变量

**用途**: 组件状态管理（选中/展开/Tab切换等）

### action: list
```
列出屏幕上所有领域态变量
```

### action: add
```
创建新变量:
  - screenId 或 parentNodeId
  - name, initialValue, type (boolean/string/number/object)
```

### action: set_preview
```
切换预览值，用于测试不同状态的渲染效果
```

### action: add_binding / update_binding / remove_binding
```
将领域态变量绑定到节点属性（控制显隐/样式/内容等）
```

---

## 7. asset — 组件资产管理

**用途**: 组件模板化、实例化复用

### action: list
```
列出可用组件资产（项目级/团队级/全局）
```

### action: save_as_template ⭐ 保存为模板
```
必需参数:
  - projectId, nodeId
  - name: string            — 模板名称
  - category?: string       — 分类
  - propDefinitions?: Array<{  — 属性定义
      name: string,
      type: string,
      defaultValue?: any,
      description?: string
    }>
用途: 将一个节点子树保存为可复用的组件模板
```

### action: instantiate ⭐ 实例化
```
必需参数:
  - projectId, templateId
  - parentNodeId            — 放置位置
  - props?: object          — 实例属性值
返回: 新实例节点 ID
```

### action: sync_instance / detach_instance
```
sync: 从模板重新同步实例结构
detach: 脱离模板关联（不再随模板更新）
```

---

## 8. visual_state — 视觉状态

**用途**: hover/pressed/disabled 等交互态样式

### action: add
```
添加视觉状态:
  - nodeId, stateName (hover/pressed/focused/disabled/...)
  - styleOverrides?: object  — 该状态下的样式覆盖
  - childStateMap?: object   — 子元素在该状态下切换到的状态
  - transition?: string      — 过渡动画
```

### action: update
```
更新已有状态的样式（合并模式，不传的不删除）
```

### action: reset_style
```
删除状态中指定 CSS 属性（唯一能删除的方式）
```

### action: set_active
```
切换当前激活状态用于预览
```

---

## 9. component_prop — 属性编辑

**用途**: 文字内容、自定义属性等

### action: update_props ⭐ 最常用
```
必需参数:
  - nodeId: string
  - props: object            — 属性键值对
示例:
  props: { textContent: "Hello World" }     ← 设置文字
  props: { icon: "🎛", title: "Beat craft" } ← 自定义属性
注意: 文字必须用 textContent，不能用 children！
```

### action: get_template_props
```
获取组件模板的 propDefinitions
```

### action: list_element_props
```
列出某种元素类型的可用属性
```

### action: add_prop_def / remove_prop_def
```
管理组件模板的属性定义
```

---

## 10. screen — 屏幕/页面管理

**用途**: 多页面的 CRUD

### action: add
```
创建新的空白屏幕 → 返回新 screenId
```

### action: remove / rename / activate / reorder
```
删除/重命名/切换激活/排序屏幕
```

---

## 11. generate_snapshots — 截图验证

**用途**: Phase 4 验证效果

```
输入: { projectId }
输出: jobId → 后续查询截图 URL
```

---

## 常见调用模式组合

### 组合 1: 从零搭建列表（最常用）
```bash
# 1. 创建数据源
data_source / add → { type: "static", name: "items", data: [...] }

# 2. 用 element/add 创建第一个列表项（手动搭好结构和样式）

# 3. 保存为模板
asset / save_as_template → { nodeId: "第一个列表项", name: "ListItem" }

# 4. 实例化 N-1 个副本
asset / instantiate × (N-1) → 每个 set 不同 props

# 5. 绑定数据
component_prop / update_props × N → 每个 instance 设 textContent = "{{data.items[N].title}}"
```

### 组合 2: 修改现有节点样式
```bash
# 1. 先查询确认节点
query / screen_schema → 定位目标节点

# 2. 批量修改样式
style / batch_update → updates: [{ nodeId, styles: {...} }]

# 3. 验证
generate_snapshots → { projectId }
```

### 组合 3: 添加点击跳转
```bash
event / add_navigation → { nodeId, targetScreenId }
# 或更复杂的交互
event / add_event → { nodeId, trigger: "click", actions: [{ type: "navigate", ... }] }
```

### 组合 4: 组件带 hover 效果
```bash
visual_state / add → {
  nodeId,
  stateName: "hover",
  styleOverrides: { transform: "scale(1.02)", boxShadow: "..." },
  transition: "all 0.2s ease"
}
```
