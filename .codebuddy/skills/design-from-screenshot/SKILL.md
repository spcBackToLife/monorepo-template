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

### 主题约束（强制）

在设置任何节点样式（`style/update`）前，必须先 `theme / check` 检查项目主题：

**⛔ 门禁规则（最高优先级）：**
- `theme / check` 返回 `customized=false` → **立即停止所有设计操作！**
- 告诉用户：「项目尚未制定主题风格。请先描述你期望的风格（如"轻奢暗色科技风"），我来帮你生成完整的主题配置，然后再开始设计。」
- 等待用户回复 → 触发 `theme-generator` Skill → 生成主题 → 之后再继续

**✅ 主题已定制（customized=true）时的约束：**
- 颜色 → 使用 `$token:xxx` 引用（如 `$token:primary`, `$token:surface`）
- 间距 → 使用 `$token:spacing-{xs|sm|md|lg|xl}`
- 圆角 → 使用 `$token:radius-{sm|md|lg}`
- ❌ 禁止直接写 hex 色值，除非 Token 中确实没有合适的语义色

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

##### 🚨🚨🚠️ canvas 绘制绝对不可跳步的完整流程 🚨🚨🚠️

> **血泪教训 (2026-04-24)**: 跳过 Step 0 直接绘制导致：
> - 波形图标跑到画布左上角（参考框在右下角）
> - 渐变圆底完全不可见
> - 导出的 PNG 有白色背景（default 白框干扰）
> - 需要全部删除重来，浪费时间 **2 轮**
>
> **根因**: 自认为"节点肯定是 48×48"就跳过了查询验证，同时忽略了 default 白框的影响

```
═══════════════════════════════════════════════════════════
  完整 Canvas 素材绘制流程（共 7 步，不可跳步）
═══════════════════════════════════════════════════════════

Step 0 ⭐⭐⭐ (最关键！90% 的bug源于跳过此步)
  ┌─────────────────────────────────────────────────────┐
  │ query / screen_schema                                │
  │   projectId + screenId                               │
  │ → 从返回的节点树中找到目标节点                       │
  │ → 记录: width, height, position, 当前样式            │
  │ → 特别注意: 是否已有 backgroundImage/materialProjectId│
  └─────────────────────────────────────────────────────┘
  ↓
Step 1 (如果需要新建素材工程)
  material_project / create
    → name, projectId, targetNodeId
    → 返回 materialId（后续所有操作都需要）
  ↓
Step 2 (设置参考框 = 必须与目标节点尺寸一致!)
  canvas / resize_reference_frame
    → width = Step 0 中获取的节点实际 width
    → height = Step 0 中获取的节点实际 height
    → ⚠️ 不是拍脑袋写数字！必须用 Step 0 的数据！
  ↓
Step 3 (获取坐标 + 处理 default 框) ← 🔥 新增关键步骤
  ├─ canvas / get_canvas_info
  │   → 记录: rfx, rfy, refW, refH
  │   → 记录: objectCount（检查是否有 default 框）
  │   → 记录: backgroundColor（检查是否为透明）
  └─ 如果有 default 白框或 backgroundColor ≠ transparent:
      canvas / set_visibility(objectId=default_xxx, visible=false)
      → 必须隐藏 default 框，否则导出会有白底！
      → 如果 set_background_color(transparent) 失败，
         用 set_visibility 隐藏 default 框作为替代方案
  ↓
Step 4 (开始绘制) — 所有 x/y 都是局部坐标 [0, refW) × [0, refH)
  canvas / add_object (可多次调用)
    → type, x(局部), y(局部), width, height, fill/stroke 等
    → MCP 自动加 rfx/rfy 偏移转换为全局坐标
  ↓
Step 5 (导出前验证)
  canvas / get_schema
    → 检查每个对象的 x/y 是否 = rfx+localX, rfy+localY
    → 检查是否有重复对象（重试时容易产生）
    → 如有重复: remove_object 清理
  ↓
Step 6 (导出并应用)
  canvas / export_and_apply
    → materialId, nodeId, projectId
    → 自动建槽位、上传 PNG、applyMaterialDesign
  ↓
Step 7 (清理节点残留样式) ← 🔥🔥 最容易出问题的一步！

  ⚠️⚠️⚠️ applyMaterialDesign (export_and_apply 内部调用) 的行为：
    它会**追加** backgroundImage 而不是替换！
    如果节点已有 background: linear-gradient(...)
    导出后会变成: url(新PNG), linear-gradient(...)   ← 多值叠加！！
    同时 background 简写和 backgroundImage 长形式共存 → CSS 解析不可预测

  正确的清理顺序（必须严格遵守！）:

  7a. style / reset — 一次性删除所有背景相关属性:
      properties: ["background", "backgroundImage", "backgroundSize",
                    "backgroundPosition", "backgroundRepeat",
                    "backgroundOrigin", "backgroundClip", "boxShadow"]

  7b. style / update — 设置干净的单值:
      { backgroundImage: "url(新PNG)", backgroundSize: "contain",
        backgroundPosition: "center", backgroundRepeat: "no-repeat" }

  7c. component_prop / update_props — 清除文字（两个都要清！）:
      { textContent: "", children: "" }
      ⚠️ textContent 和 children 是独立属性！
         只清 textContent 不清 children → emoji 还会显示
         只清 children 不清 textContent → 某些情况下文字残留
═══════════════════════════════════════════════════════════
```

❌ **禁止的做法**（每一条都实际踩坑验证过）：

| 禁止操作 | 实际后果 | 发生概率 |
|---------|---------|---------|
| 跳过 Step 0 直接 create + 画 | 参考框尺寸可能与节点不一致 | ⭐⭐⭐ 高 |
| 不处理 default 白框直接导出 | PNG 有白色背景/白边 | ⭐⭐⭐ 高 |
| set_background_color 失败后忽略 | 同上 | ⭐⭐ 中 |
| **不 reset 全部 background-* 就 update** | **applyMaterialDesign 追加→多值 backgroundImage 叠加** | ⭐⭐⭐ 高 |
| **只清 textContent 不清 children** | **emoji/文字残留显示** | ⭐⭐ 中 |
| background 简写与 backgroundImage 长形式同时存在 | CSS 优先级混乱，渲染结果不可预测 | ⭐⭐ 中 |
| 不清空 emoji children 文字 | 图标上方/中间显示 emoji | ⭐ 低 |

✅ **正确做法**：每次都从 Step 0 开始，即使你"觉得知道"节点尺寸
✅ **正确做法**：每次都检查并隐藏 default 框
✅ **正确做法**：导出后清理节点残留样式

##### 画布坐标系（canvas 工具必读）

**每次用 canvas add_object/update_object 前，必须在 Step 0 之后调用 `get_canvas_info`！**

```
1. get_canvas_info → 获取 { referenceFrameX, referenceFrameY, referenceFrameWidth, referenceFrameHeight }
2. add_object 的 x/y = 前端大画布坐标 = referenceFrameX/Y + 局部偏移量
3. 不要把 schema 里读到的对象坐标直接传给 add_object（那是大画布坐标，再传会飞出去）
4. update_object 同理：传入局部坐标，MCP 会自动加 rfx/rfy 偏移
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
| **画布素材位置偏移/不对齐** | **跳过 query/screen_schema 直接画，未确认节点实际尺寸** | **必须先 Step 0: query 节点信息 → 再 get_canvas_info → 最后绘制** |
| 画布元素位置飞出 | 混淆了大画布坐标 vs 局部坐标 | 先 get_canvas_info 再换算 |
| **导出的 PNG 有白色背景/白边** | **default 白框(600×400)未被隐藏，或 set_background_color(transparent)失败** | **Step 3 必须隐藏 default 框: set_visibility(default_xxx, visible=false)** |
| **素材图被渐变色覆盖/混合** | **节点残留旧 background 简写属性，新 backgroundImage 被合并** | **Step 7a 必须 style/reset 删除全部 background-* 属性** |
| **图标上方显示 emoji 文字** | **未清空 props.children（只清了 textContent）** | **Step 7c 必须 component_prop/update_props 同时清 children 和 textContent** |
| **backgroundImage 变成多值叠加** | **export_and_apply 内部的 applyMaterialDesign 是追加模式不是替换模式** | **Step 7a 先 reset 全部 background-* → Step 7b 再设干净单值** |
| **刷新后样式变回"乱七八糟"** | **background 简写与 backgroundImage 长形式同时存在 + applyMaterialDesign 追加** | **完整 reset 所有背景属性后重新设置** |
| 页面白屏崩溃 | BoxInput value.replace 类型错误 | 已修复（typeof 检查） |
| export 后节点无变化 | 未建 material-slot 槽位 | 优先用 export_and_apply 自动建槽位 |
| **get_schema 发现重复对象** | **重试绘制时未删除旧对象就新增** | **Step 5 检查后 remove_object 清理重复项** |

## 🩸 踩坑案例库

### 案例 #1: 图标飞到画布左上角 (2026-04-24)

**现象**: 参考框在右下角 (576,426)，但绘制的波形图标在左上角黑块区域
**根因链**:
1. 跳过 Step 0 (query/screen_schema)
2. 不知道 default 白框 (600×400 @ 400,400) 会影响渲染
3. set_background_color(transparent) 失败后继续操作
4. 导出时包含白框区域 → 内容偏移
**修复**: 
1. 补做 Step 0 获取节点实际尺寸
2. `set_visibility(default_xxx, visible=false)` 隐藏白框
3. 删除旧对象重绘
4. 导出后清理残留样式

### 案例 #2: Hero 区域"乱七八糟的背景" + 图标多值叠加 (2026-04-24)

**现象**: 
- Hero 圆圈刷新后出现奇怪的多层背景
- Beat craft 图标显示位置/大小异常
**根因链**:
1. Hero 节点同时存在: `background`(简写PNG) + `backgroundImage`(SVG) + 多个 background-* 子属性 → CSS 解析混乱
2. export_and_apply 的 applyMaterialDesign **追加** backgroundImage → `url(PNG), linear-gradient(...)` 
3. 只设了 `textContent=""` 但没清 `children` → emoji 🎛 还在
4. 重启后端后重新加载 schema，所有冲突样式暴露
**修复**:
1. `style/reset` 一次性清除全部 8 个 background 相关属性
2. `style/update` 设置干净的单值 backgroundImage
3. `component_prop/update_props` 同时清空 children 和 textContent

### 案例 #3: 编辑器预览偏移但 PNG 正确 (2026-04-24)

**现象**: 
- 素材编辑器中：参考框虚线（48×48）在左上角，绘制内容（图标）跑到右下角外面
- 但导出的 PNG 文件：内容完全正确！圆底+波形居中+透明背景 ✅
- 应用到页面节点后：显示也正确 ✅

**根因链**:
1. `get_canvas_info` 返回 `referenceFrameX=576, referenceFrameY=426`
2. 后端画布只有 **600×400**，default 框在 `(276, 176)`
3. `add_object(x=0,y=0)` 被 MCP 转换为全局坐标 `(576, 426)` = local + rfx/rfy
4. **前端编辑器渲染时参考框显示位置与 rfx/rfy 不同步**
5. 但 `export_and_apply` 使用后端渲染管线独立裁剪 → PNG 正确

**关键数据对比**:

| 坐标项 | 值 | 说明 |
|--------|-----|------|
| 后端画布 | 600×400 | 实际渲染/导出 |
| 前端画布 | 1200×900 | 编辑器显示 (约 2x) |
| default 框位置 | (276, 176) | schema 中系统创建的 |
| 参考框声称位置 | (576, 426) | get_canvas_info 返回 |
| 对象被转到 | (576, 426) | local(0,0) + offset |

**结论**: 
- 这是**前端编辑器的显示 bug**，不影响实际导出和应用
- add_object 传**局部坐标 (0,0)** 是正确的
- **验证方式**: 用 read_file 查看导出的 PNG 文件确认内容正确
- 不要被编辑器预览误导！

### 教训总结

> **第一性原理**: Canvas 绘制的每一步都依赖上一步的数据。
> - Step 0 的数据 → 决定 Step 2 的参考框尺寸
> - Step 3 的坐标 → 决定 Step 4 的绘制位置
> - Step 5 的验证 → 决定是否需要回退到 Step 4
>
> **CSS 背景属性的原子性**: 
> - `background` 简写会重置**所有** `background-*` 子属性
> - `backgroundImage` 是独立的长形式属性
> - 两者同时存在时，CSS 按"最后声明优先"解析，但不同浏览器行为可能不一致
> - **唯一安全的做法：只用一种方式，且先 reset 全部再设新值**
>
> **applyMaterialDesign 的追加行为**:
> - 它不会替换已有的 backgroundImage
> - 而是把新的 url(...) 追加到现有值后面（逗号分隔的多值）
> - 这导致 `url(new.png), linear-gradient(old)` 这样的混乱组合
>
> **编辑器预览 ≠ 实际导出结果**:
> - 前端画布坐标系可能与后端 rfx/rfy 不同步
> - 编辑器中看到的偏移**不一定**代表 PNG 有问题
> - **最终验证标准**: 用 read_file 查看导出的 PNG 图片文件
>
> **跳过任何一步都会导致下游步骤基于错误假设执行**，
> 而 canvas 绘制的反馈周期长（需导出→上传→应用→刷新才能看到结果），
> 所以每个错误代价都很高。

## 工具参数获取

MCP 工具详细参数通过 `mcp_get_tool_description` 动态获取。
调用前务必先查参数 schema，确保格式正确。
