# MCP 页面设计工具能力映射

本文件作为 `page-builder` 的 references 资源，提供所有页面设计相关 MCP 工具的完整能力说明和参数速查。

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

## 6. state — 状态管理

**用途**: 组件状态管理（选中/展开/Tab切换等）

### action: list
```
列出屏幕上所有状态变量
```

### action: view_add
```
创建新 view 变量:
  - screenId
  - name, defaultValue, label
```

### action: data_set_init
```
设置 data 初始值
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

---

## 12. Timer Actions — Deferred Execution ⏱️

**用途**: 延迟执行、循环计时、倒计时等时间驱动交互

### action: ui.startTimer
```
必需参数:
  - timerId: string         — 计时器唯一标识
  - duration: number        — 持续时间（毫秒）
  
可选参数:
  - interval?: number       — 重复间隔（毫秒，若设置则每 interval 触发一次）
  - onTick?: Action[]       — 每个 tick 执行的动作
  - onComplete?: Action[]   — 计时完成时执行的动作
  - autoCancel?: boolean    — 若已存在同 ID 计时器，是否自动停止

用途:
  - 延迟跳转: { duration: 3000, onComplete: [{ type: 'nav.go', ... }] }
  - 倒计时: { interval: 1000, onTick: [...], duration: 10000 }
  - 自动保存: { interval: 5000, onTick: [{ type: 'effect.fetch', ... }] }
  
⚠️ 注意:
  - timerId 必须唯一（同一节点的同一事件内）
  - 若不传 onTick，则只在 duration 后触发 onComplete
  - 若传 interval，则 onTick 会循环执行直到 duration 超时
```

### action: ui.stopTimer
```
必需参数:
  - timerId: string         — 要停止的计时器 ID
  
用途: 主动停止一个运行中的计时器（如用户关闭模态框）
```

### action: ui.resetTimer
```
必需参数:
  - timerId: string         — 要重置的计时器 ID
  
用途: 停止并重新启动相同 ID 的计时器（刷新倒计时）
```

---

## Capability Constraints & Limitations

### Input 元素默认样式
- `<input>` 元素会应用 HTML 原生样式（如 border、padding）
- 建议使用 `style/update` 显式设置 border、background 等覆盖默认值
- 某些属性（如 outline）在预览器中可能表现与编辑器不同

### export_and_apply 行为
- 素材导出目前不支持导出嵌套素材或动态绑定的内容
- 应用素材时，所有 {{data.xxx}} 表达式会被替换为静态值
- 如需动态素材，建议使用 `asset/instantiate` + 逐个设置属性

### 条件可见性 (set_visible_when)
- 条件基于当前屏幕的 state 变量（data 和 view）
- 表达式在每次 state 更新时重新计算
- 建议使用简单的比较表达式以确保性能

### 事件条件执行 (condition?.when)
- 事件条件在触发前求值
- 若条件表达式求值失败，默认行为是执行事件（fail-safe）
- 条件支持复杂表达式，如 `{{ state.data.items.length > 0 && state.view.tab === 'list' }}`

### 数据源自动加载 (autoFetchOnEnter)
- 仅在屏幕 screenEnter 生命周期触发
- 不支持条件性自动加载
- 若需条件加载，使用 `event/add_event` 监听 screenEnter 后手动 fetch

### 视觉状态 (visual_state)
- hover/focus 状态在编辑器中需通过 `set_active` 预览
- 若节点具有 disabled 状态，其他状态（如 hover）可能被禁用
- 状态转换动画需通过 transition 属性配置

### 组件属性绑定 (update_props)
- textContent 用于设置文本，不能用 children
- 数据表达式（{{...}}）仅在 textContent/attributes 中支持
- 属性值必须是 JSON-serializable（不支持 function）

### 嵌套布局建议
```
常用模式：上下固定 + 中间滚动
  容器: display: flex / flex-direction: column / height: 100%
  顶部: position: sticky / top: 0 / (layoutHint: sticky-header)
  底部: position: sticky / bottom: 0 / (layoutHint: sticky-footer)
  中间: flex: 1 / overflow: auto / (layoutHint: scroll-child)
```

---

## 常见错误与排查

### "event condition evaluation failed" 警告
- 通常是表达式语法错误或引用不存在的变量
- 检查 state 定义是否包含所需变量
- 简化表达式进行测试

### 元素不显示但无报错
- 检查元素的 display 属性是否为 none
- 验证条件可见性 (set_visible_when) 是否返回 false
- 检查层级顺序 (z-index) 和遮挡情况

### 样式未应用
- 检查 CSS 属性名是否正确（驼峰式，如 backgroundColor）
- 部分简写属性（如 background）可能覆盖其他属性，避免使用
- 验证节点是否被其他更高优先级样式覆盖

### 数据绑定不更新
- 确认数据源已正确创建并初始化
- 验证绑定表达式的路径是否与数据结构匹配
- 检查 state.set/merge 是否正确更新了数据

