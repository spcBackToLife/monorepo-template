---
name: design-from-screenshot
description: 按照用户提供的参考设计截图/设计稿，使用 MCP 设计工具（canvas/style/element/material）精确还原或创建素材/页面组件。当用户提供 UI 设计参考图并要求实现/还原/绘制时触发。支持场景：按钮、卡片、图标、插画、渐变背景、页面布局等视觉元素的从图还原。
---

# 截图还原设计 Skill

根据用户提供的参考设计图，使用 MCP 设计工具链精确还原视觉设计。

## 核心原则：工具驱动分析

**错误的流程**（禁止）：拿到图 → 把图中所有样式全部分析一遍 → 再想办法用工具实现

**正确的流程**（必须遵循）：
```
参考图 + 用户目标 → 确定要画什么 → 选择 MCP 工具 → 看工具需要哪些参数
→ 从图中针对性提取这些参数 → 填入参数形成方案 → 执行
```

**关键区别**：不是从图中"我能看到什么"，而是"工具需要什么，我从图里找什么"。

---

## 何时使用此技能

- 用户上传参考截图要求还原/复刻某个 UI 组件
- 用户要求按设计稿创建按钮、卡片、图标、插画等素材
- 用户要求修复现有页面使其匹配参考图样式
- 用户要求用画布工具绘制特定图形效果

---

## 工作流（四阶段）

### Phase 1: 明确目标 & 选工具

#### 1.1 理解用户要做什么

从用户的描述和截图中确定：
- **目标**：画一个按钮？修一个卡片？还是整个页面？
- **范围**：是修改已有节点，还是从零新建素材？
- **载体**：是在页面上操作 DOM 节点，还是在画布里绘制矢量图？

#### 1.2 选定 MCP 工具

根据目标选择工具组合：

| 目标类型 | 首选工具 | action |
|---------|---------|--------|
| 在**已有页面**上修改样式 | `style` | update / batch_update |
| 在页面上**增删改**节点 | `element` | add / remove / move / wrap / reorder |
| **从零画**新素材（图形/图标/插画） | `canvas` | add_object 系列 |
| 画完后**导出应用到**页面节点 | `canvas` | export_and_apply |
| **修改文字内容** | `component_prop` | update_props |
| 查看**当前页面结构** | `query` | screen_schema |

选好工具后，**逐个调用 `mcp_get_tool_description` 获取每个工具的完整参数定义**。

#### 1.3 列出参数缺口表

对每个选定的工具，列出它的**必需参数**和**可选参数**，标记来源：

```markdown
## 工具 1: canvas / add_object — 绘制圆角卡片背景
必需参数:
| 参数 | 类型 | 从图中获取方式 | 当前值 |
|------|------|---------------|--------|
| type | enum | 固定为 rect | "rect" |
| x | number | 卡片左边缘位置 → 需 get_canvas_info 后计算 | 待填 |
| y | number | 卡片顶部位置 → 同上 | 待填 |
| width | number | 图中卡片占容器宽度的比例 | ~90% of refW |
| height | number | 图中卡片高度估算 | ~280px |
| fill | string | 卡片背景色/渐变 → 观察颜色过渡 | linear-gradient(...) |
| rx | number | 圆角大小 → 目测 | ~24 |

可选参数:
| 参数 | 是否需要 | 判断依据 |
|------|----------|---------|
| stroke | 否 | 图中无边框 |
| opacity | 是 | 背景似乎半透明? → 仔细看... 不需要，纯色 |
| shadow | 否 | 无明显阴影 |
```

**这个表的每一行都是"工具需要什么 → 我从图里找什么"的映射。**

---

### Phase 2: 从图中针对性提取参数

有了 Phase 1 的参数缺口表后，**只关注表中列出的参数**，忽略图中其他无关细节。

#### 2.1 参数提取方法

| 参数类型 | 从图中分析方法 | 技巧 |
|---------|---------------|------|
| **颜色** | 观察色相+明度饱和度 | 记近似 hex；不确定就先写描述如"粉紫偏暖" |
| **尺寸** | 相对参照物比例 | 以容器宽度为 100% 推算；或以文字行高为基准 |
| **位置** | 相对容器的方位 | 居中/靠左/靠右/底部贴边；具体 px 值需结合参考框 |
| **圆角** | 视觉判断 | 小(4-8px) / 中(12-16) / 大(20-32+) / 全圆(50%) |
| **间距** | 元素间空白与字号的倍数关系 | 通常为 0.5x / 1x / 1.5x / 2x 字号 |
| **字号分级** | 文字的相对大小对比 | 最大的是标题(20-28)，中等正文(14-16)，最小辅助(11-13) |
| **字重** | 笔画粗细 | Regular(400) / Medium(500) / Semibold(600) / Bold(700) |
| **阴影** | 有无模糊光晕 + 方向 | 有则记 blur + offset + color |
| **渐变** | 色彩过渡方向 + 起止色 | 线性(方向角度) / 径向(圆心)；列出每个颜色停止点 |

#### 2.2 不确定的参数处理

- 标注为估算值（`~24px` 或 `待迭代微调`）
- 不卡住，先用合理默认值执行，Phase 4 截图验证后再调
- 对于画布坐标类参数，必须先 `get_canvas_info` 才能准确填写

---

### Phase 3: 输出方案 & 执行

#### 3.1 输出方案（等用户确认）

将 Phase 1-2 的结果整理为可执行的步骤列表：

```markdown
## 执行方案

### 步骤 1: 创建圆角渐变卡片
- 工具: canvas / add_object
- 调用 mcp_get_tool_description 确认参数格式 ✓
- 参数:
  - type: "rect"
  - x: rfx + 10   (距左 10px 边距)
  - y: rfy + 200  (在下半部分)
  - width: refW - 20
  - height: 280
  - fill: "linear-gradient(135deg, #a855f7, #ec4899, #f97316)"
  - rx: 24
- 图中依据: 底部浮动卡片，紫→粉→橙渐变，四角圆角约 24px

### 步骤 2: 添加标题文字
- 工具: element / add
- 参数:
  - parentNodeId: <步骤1的节点>
  - tag: "h1"
  - props.textContent: "Your Music, Your Imagination"
  - initialStyles: { fontSize: 22, fontWeight: 700, color: "#fff", textAlign: "center" }
- 图中依据: 白色粗体大标题，居中，字号约为正文的 1.5 倍

...（后续步骤）
```

**方案要求**：
- 步骤按依赖顺序排列
- 可并行的步骤标注「可与步骤 N 并行」
- 每个参数都注明从图中的推导依据

#### 3.2 执行规则

##### 画布坐标系（canvas 工具必读）

**每次用 canvas add_object/update_object 前，必须先调用 `get_canvas_info`！**

```
1. get_canvas_info → 获取 { referenceFrameX, referenceFrameY, referenceFrameWidth, referenceFrameHeight }
2. add_object 的 x/y = 前端大画布坐标 = referenceFrameX/Y + 局部偏移量
3. 不要把 schema 里读到的对象坐标直接传给 add_object（那是大画布坐标，再传会飞出去）
```

##### 并行原则
- 无依赖的操作 → 同一批次并行调用
- 有依赖的操作 → 串行等待
- 多个节点的样式修改 → 用 batch_update 一次搞定

##### 文字渲染（踩坑）

**渲染器只读 `props.textContent`，完全忽略 `props.children`！**

```javascript
// 正确 ✓
component_prop / update_props → { "textContent": "Hello World" }
// 错误 ✗ 文字不会显示!
{ props: { children: "Hello World" } }
```
适用所有文本元素：p / h1 / h2 / span / button / label

##### 样式覆盖陷阱

默认样式的 `minWidth: 40px`, `minHeight: 40px`, `width: fit-content` 会撑大元素。
修复：显式设 `minHeight: "auto"`, `minWidth: "auto"`。

---

### Phase 4: 截图验证 & 迭代

每轮修改后必须验证：

1. **生成截图**: `generate_snapshots` 查看效果
2. **对照参考图差异检查**：
   ```
   - [ ] 整体布局结构是否一致
   - [ ] 颜色/渐变是否接近
   - [ ] 尺寸比例是否协调
   - [ ] 圆角/间距是否匹配
   - [ ] 文字是否可见且正确
   - [ ] 元素层级顺序是否正确
   ```
3. **针对性修复**：只修有差异的部分，不动已正确的
4. **循环**直到差异可接受

---

## 常见问题速查

| 问题 | 原因 | 解决 |
|------|------|------|
| 文字不显示 | 用了 children 而非 textContent | component_prop update_props 设 textContent |
| 元素被莫名撑大 | 默认 minWidth/minHeight: 40px | 显式设 "auto" |
| 圆角不生效 | 默认样式覆盖 | batch_update 强制设置 |
| 画布元素位置飞出 | 混淆了大画布坐标 vs 局部坐标 | 先 get_canvas_info 再换算 |
| 页面白屏崩溃 | BoxInput value.replace 类型错误 | 已修复（typeof 检查） |
| export 后节点无变化 | 未建 material-slot 槽位 | 优先用 export_and_apply 自动建槽位 |

## 工具参数获取

MCP 工具详细参数通过 `mcp_get_tool_description` 动态获取。
调用前务必先查参数 schema，确保格式正确。
