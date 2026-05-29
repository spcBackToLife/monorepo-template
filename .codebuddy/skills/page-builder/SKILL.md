---
name: page-builder
description: 使用页面级 MCP 工具（element/style/event/data_source/state/asset/screen）搭建页面 DOM 结构、样式、数据驱动和交互逻辑。当用户要求搭建/修改页面布局、列表数据驱动改造、组件搭建、添加交互事件时触发。与 material-painter（素材绘制）互补：本技能关注页面结构和交互逻辑，素材绘制需求委托给 material-painter。
---

# 页面搭建 Skill（page-builder）

根据设计计划或用户提供的参考设计图，结合设计软件 MCP 能力进行**页面级/组件级**的设计实现。

## 与 material-painter 的分工

| 技能 | 职责 | 触发场景 |
|------|------|---------|
| **material-painter** | 素材/图形绘制（canvas 画矢量、导出 PNG/SVG） | "画一个按钮图标"、"给这个圆圈画渐变边框" |
| **page-builder**（本技能） | 页面结构、组件搭建、数据驱动、交互逻辑 | "按这个图搭页面"、"这个列表改成数据驱动"、"优化这个卡片组件" |

当任务同时涉及两者时：
1. 先用本技能分析方案 → 拆分出"需要绘制的素材"子任务
2. 素材子任务委托给 `material-painter`
3. 本技能继续处理页面结构和数据逻辑

---

## 核心原则

### 1. 第一性原理：先调查现状再动手

```
❌ 错误：拿到图 → 直接开始创建/修改元素 → 越改越乱
✅ 正确：查询现有结构 → 分析差异 → 制定方案 → 拆分任务 → 逐步执行
```

### 2. 聚焦分析：只分析用户关心的部分

- 用户说"看这个 Feature Grid 列表" → **只分析 Grid 及其子元素**，不分析页头页脚
- 用户说"整体页面怎么搭" → **全量分析**
- 用户说"这个按钮样式不对" → **只分析该按钮及其直接上下文**

### 3. 增量优化优先：在已有设计上改进，不从零重写

- 已有节点 → 用 style/element 修改
- 已有重复结构 → 改为数据驱动（data_source + 单模板实例）
- 确实缺失 → 才新增节点或屏幕

---

## 何时使用本技能

- 用户上传参考图要求**搭建/修改页面布局**
- 用户提到**列表/网格/卡片组**等可复用结构的实现
- 用户要求将**硬编码改为数据驱动**
- 用户要求添加/修改**交互事件**（点击跳转、状态切换）
- 用户要求**新增屏幕/页面**
- 用户要求**组件抽象和模板化**
- **design-planner 分发的页面搭建任务**

---

## 工作流（五阶段）

### Phase 0: 调查现状（不可跳步）

#### 0.1 明确分析范围

从用户描述确定聚焦范围：

```markdown
## 分析范围
- **全量分析**: 整个页面/屏幕
- **聚焦分析**: 仅 [Feature Grid] / [Hero 区域] / [某个按钮]
- **对比基准**: 当前屏幕 [sc_xxx] vs 参考图
```

#### 0.2 查询现有结构

**必须执行的操作**（按顺序）：

```bash
# 0. ⛔ 主题门禁检查（最高优先级！）
theme / check → projectId
# 如果返回 customized=false → 立即停止！不做任何设计操作！
# 告诉用户：「项目尚未制定主题风格。在开始设计之前，请先描述你期望的风格
#（如"轻奢暗色科技风"、"清新自然风"等），我来帮你生成完整的主题配置。」
# 然后等待用户回复风格描述 → 触发 theme-generator Skill → 生成主题 → 之后再继续设计

# 1. 列出所有屏幕，确认目标屏幕
query / list_screens → projectId

# 2. 查询目标屏幕完整 schema
query / screen_schema → projectId + screenId

# 3. 读取项目主题配置（设置样式时必须使用 Token 引用）
theme / get → projectId

# 4. 如涉及数据源，列出当前数据源
data_source / list → projectId + screenId

# 5. 如涉及组件资产，列出可用模板
asset / list → projectId
```

#### 0.3 主题约束（强制）

如果 `theme / get` 返回了有效的 ThemeConfig，则后续所有样式设置**必须遵循**：

- **颜色** → 使用 `$token:primary` / `$token:textPrimary` / `$token:surface` 等 Token 引用
- **间距** → 使用 `$token:spacing-{xs|sm|md|lg|xl|2xl}`
- **圆角** → 使用 `$token:radius-{sm|md|lg|xl|full}`
- **字体** → 使用 `$token:font-{h1|h2|body|caption}.fontSize` 等
- **阴影** → 使用 `$token:shadow-{sm|md|lg}`
- **装饰** → 参考 `decorationRules` 决定是否用毛玻璃/渐变/发光等手法
- ❌ 禁止直接写 hex 色值（除非 Token 中确实没有合适的语义色）
- ❌ 禁止使用不在 Token 体系中的间距值

**输出**：整理为「现状清单」：

```markdown
## 当前状态
### 屏幕结构
- 屏幕: [名称] (id: sc_xxx)
- 根节点: nd_root (div)
  - ├─ nd_header (div) — 页头
  - ├─ nd_hero (div) — Hero 区域
  - ├─ nd_home_feat_grid (div) — Feature Grid ⬅️ 聚焦区域
  │   - ├─ nd_home_fc_0 (div) — Tile 1 (硬编码)
  │   - ├─ nd_home_fc_1 (div) — Tile 2 (硬编码)
  │   - ├─ nd_home_fc_2 (div) — Tile 3 (硬编码)
  │   - └─ nd_home_fc_3 (div) — Tile 4 (硬编码)
  - └─ nd_footer (div) — 底部

### 数据源
- 无 / 或列出已有数据源

### 组件资产
- 无 / 或列出可用模板
```

---

### Phase 1: 分析参考图 & 抽象设计方案

#### 1.1 元素识别与分类

从参考图中识别元素，按类型分类：

```markdown
## 元素清单（聚焦: Feature Grid）

### 布局容器
| 元素 | 类型 | 布局方式 | 子元素数量 | 复用性 |
|------|------|---------|-----------|--------|
| Feature Grid 容器 | div | grid (2列) | 4 个 Tile | 容器 |
| Tile 卡片 | div | flex column | icon+title+subtitle+arrow | **高复用** → 应模板化 |

### 内容元素
| 元素 | 类型 | 内容来源 | 数据绑定 |
|------|------|---------|---------|
| 图标容器 | div+emoji/icon | 固定 or 数据? | {{data.featureTiles[N].icon}} |
| 标题 | p | 数据驱动 | {{data.featureTiles[N].title}} |
| 副标题 | p | 数据驱动 | {{data.featureTiles[N].subtitle}} |
| 箭头 | div | 固定 › | 无 |

### 交互
| 元素 | 触发事件 | 动作 | 目标 |
|------|---------|------|------|
| Tile 卡片 | click | navigate | sc_bc334cb7178a4905991e6 |
```

#### 1.2 组件抽象决策

对每个可复用结构做出决策：

```markdown
## 组件化决策

### Tile 卡片 — 建议模板化 ✅
- **理由**: 4个Tile结构完全相同，仅内容不同
- **方案**: 将 nd_home_fc_0 保存为组件模板 (asset / save_as_template)
  - 定义 propDefinitions: { icon, title, subtitle, targetScreen }
  - 其余3个用 asset / instantiate 替换

### Feature Grid — 建议数据驱动 ✅
- **理由**: 4个Tile是同构数据项，可能滚动扩展
- **方案**:
  1. 创建 static 数据源 featureTiles（含4条数据）
  2. 保留1个Tile作为渲染模板
  3. 用 data_source / bind_data 绑定 {{data.featureTiles[*]}}
  4. （如需滚动）设置容器的 overflow + 数据源支持分页
```

#### 1.3 技术方案文档 ⭐ 必须落地

**Phase 1 的分析结果必须输出为文档文件**，不可只存在于对话中。

**文档落库规则**：

```
文档位置: design_docs/03-tech/[项目或模块名]-redesign-plan.md
命名规范: [区域/模块]-[动作]-plan.md
示例:
  - home-bottom-area-redesign-plan.md
  - feature-grid-data-driven-plan.md
  - hero-circle-material-redesign.md
```

**文档必须包含的章节**：

```markdown
# [标题]

> 项目: (projectId)
> 屏幕: (screenId + 名称)
> 聚焦区域: （用户指定的分析范围）
> 日期: YYYY-MM-DD
> 状态: 方案阶段 / 执行中 / 已完成

## 一、现状分析
### 1.1 区域当前结构（节点树）
### 1.2 数据源现状
### 1.3 组件资产现状

## 二、参考图分析（聚焦范围）
### 2.1 区域组成
### 2.2 各组件详细结构
### 2.3 关键差异表

## 三、组件拆分方案
### 3.1 组件层次图
### 3.2 各组件定义（含素材组件标注⭐）

## 四、实施任务拆分
### 任务依赖关系图
### Task 1~N 详细说明（每个含：依赖/工具/操作/预估/验收）

## 五、风险与注意事项

## 六、验收标准（功能 + 视觉 + 工程）
```

**关键要求**：
- **素材需求必须单独列出**：哪些图标/图形需要 canvas 绘制，尺寸/颜色/形状规格写清楚 → 这是给 `material-painter` 的输入
- **任务必须有依赖关系和验收条件**
- **每次执行前先读此文档确认进度**，避免重复或遗漏

---

### Phase 2: 任务拆分

将方案拆分为**有序任务列表**，每个任务包含：

```markdown
## 任务清单

### Task 1: 创建数据源 [基础]
- **依赖**: 无
- **工具**: data_source / add
- **操作**: 创建 static 类型数据源 featureTiles，含4条数据
- **预估**: 1次 MCP 调用
- **验收**: data_source / list 可查到该数据源

### Task 2: 保存 Tile 为组件模板 [基础]
- **依赖**: 无（可与 Task 1 并行）
- **工具**: asset / save_as_template
- **操作**: 将 nd_home_fc_0 保存为模板 FeatureTile
- **预估**: 1次 MCP 调用
- **验收**: asset / list 可查到该模板

### Task 3: 删除多余硬编码 Tile [清理]
- **依赖**: Task 2 完成（模板已保存）
- **工具**: element / remove
- **操作**: 删除 nd_home_fc_1, nd_home_fc_2, nd_home_fc_3
- **注意**: 保留 nd_home_fc_0 作为渲染原型！
- **预估**: 3次 MCP 调用（或批量）

### Task 4: 绑定数据到模板实例 [核心]
- **依赖**: Task 1 + Task 3
- **工具**: component_prop / update_props + data_source / bind_data
- **操作**: 
  1. 给 nd_home_fc_0 的各子元素绑定 {{data.featureTiles[0].*}}
  2. 用 asset / instantiate 创建其余3个实例
  3. 给每个实例绑定对应索引的数据
- **预估**: 4-6次 MCP 调用
- **验收**: 截图查看4个Tile显示不同内容

### Task 5: 验证 & 微调 [收尾]
- **依赖**: Task 4
- **工具**: generate_snapshots + style / update（如需）
- **操作**: 截图对照参考图，微调间距/颜色/字号
- **预估**: 1-3轮迭代
```

**并行规则**：
- 标注【可与 Task X 并行】的任务可以同时执行
- 有依赖关系的必须串行

---

### Phase 3: 逐任务执行

#### 3.1 执行顺序

严格按任务拆分的依赖顺序执行。每完成一个任务：
1. 输出完成状态
2. 如有验收条件，立即验证
3. 再进入下一个任务

#### 3.2 每个任务的执行模式

```markdown
## 执行 Task N: [任务名]

### Step 1: 获取工具参数
mcp_get_tool_description → [toolName]

### Step 2: 构造调用参数
（根据 Phase 1 方案 + 现状数据构造）

### Step 3: 执行调用
mcp_call_tool → [toolName] + 参数

### Step 4: 验证结果
- 检查返回值 success
- 必要时 query / screen_schema 确认结构变化
```

#### 3.3 MCP 工具选择速查

| 设计需求 | 工具 | action | 说明 |
|---------|------|--------|------|
| 新建屏幕 | screen | add | 新页面 |
| 添加元素 | element | add | 在父节点下新建 DOM |
| 删除元素 | element | remove | 删除节点及子树 |
| 移动元素 | element | move | 调整层级 |
| 包裹元素 | element | wrap | 多节点套容器 |
| 修改样式 | style | update / batch_update | CSS 属性 |
| 重置样式 | style | reset | 删除某属性恢复默认 |
| 批量样式 | style | batch_update | 多节点一次改 |
| 添加事件 | event | add_event / add_navigation | 点击跳转等 |
| 创建数据源 | data_source | add | API 或 static |
| 绑定数据 | data_source | bind_data | {{data.*}} 表达式 |
| 领域态变量 | state | view_add / data_set_init | 状态管理 |
| 保存为模板 | asset | save_as_template | 组件复用 |
| 实例化模板 | asset | instantiate | 从模板创建实例 |
| 视觉状态 | visual_state | add / update | hover/disabled 等 |
| 组件属性 | component_prop | update_props | 文字内容等 |
| 查询结构 | query | screen_schema / list_screens | 调研必备 |
| 生成截图 | generate_snapshots | - | 验证效果 |
| **绘制素材** | **(委托)** | **material-painter** | **矢量图/PNG** |

---

### Phase 4: 验证 & 迭代

#### 4.1 截图验证

每轮修改后：

```bash
generate_snapshots → { projectId }
```

#### 4.2 对照检查表

```markdown
## 验证清单
- [ ] 结构：元素层级和数量是否符合参考图
- [ ] 布局：grid/flex 排列是否正确
- [ ] 样式：颜色/字号/圆角/间距是否匹配
- [ ] 数据：{{data.*}} 是否正确渲染（非显示原始表达式）
- [ ] 交互：点击事件是否正常工作
- [ ] 复用：模板实例是否各自独立
- [ ] 滚动：如涉及列表溢出，滚动行为是否正确
```

#### 4.3 迭代修复

- 只修有差异的部分
- 每轮修复后重新截图验证
- 超过 3 轮仍有明显差异 → 回到 Phase 1 重新分析方案

---

## 常见场景模式

### 模式 A: 硬编码列表 → 数据驱动（最常见）

**触发**: 用户有 N 个结构相同的子节点（Tile/Card/Item）

**方案**:
1. 选一个最标准的节点作为模板原型
2. `asset / save_as_template` 保存模板，定义 propDefinitions
3. `data_source / add` 创建 static 数据源
4. 删除其余 N-1 个硬编码节点
5. `asset / instantiate` × (N-1) 创建实例
6. `component_prop / update_props` + `data_source / bind_data` 绑定数据

**注意**: 保留 1 个原型节点作为第 1 个实例，不要全部删除再重建

### 模式 B: 新增屏幕

**触发**: 用户要求新页面

**方案**:
1. `screen / add` 创建空白屏幕
2. 从参考图分析页面结构（Phase 1 全量）
3. 从外到内构建：body → header → content → footer
4. 先搭骨架（container + layout），再填内容
5. 最后加交互和数据

### 模式 C: 组件样式调整

**触发**: 用户说"这个按钮/卡片样式不对"

**方案**:
1. `query / screen_schema` 定位目标节点
2. 对比参考图提取差异样式属性
3. `style / batch_update` 一次性修改
4. 截图验证

**注意**: 用独立属性（backgroundImage, backgroundColor）而非 background 简写，避免覆盖！

### 模式 D: 需要新素材

**触发**: 参考图中有复杂图形效果（渐变圆环、插画、特殊形状按钮）

**方案**:
1. 本技能暂停页面操作
2. 委托 `material-painter` 绘制素材
3. 素材完成后（export_and_apply），回到本技能继续

---

## 常见问题速查

| 问题 | 原因 | 解决 |
|------|------|------|
| 数据绑定显示原始文本 `{{data.xxx}}` | 数据源未创建或表达式错误 | 先 data_source / add 创建数据源 |
| 模板实例全部相同 | 未调用 update_props 设置不同属性 | 每个 instance 单独 update_props |
| 删了节点无法恢复 | element / remove 是物理删除 | 操作前确认；必要时 undo |
| style update 后其他属性丢失 | 用了 background 等简写属性 | 用 backgroundImage/Color 等独立属性 |
| 列表不滚动 | 容器缺 overflow 样式 | style update 加 overflow-y: auto + 固定高度 |
| 事件不响应 | 事件绑在了被遮挡的父元素上 | 检查 z-index 和 pointer-events |
| 新增屏幕看不到 | 未 switch 到该屏幕 | screen / activate 切换 |

## 防御性规则（从 design-executor 测试中总结的必须遵守项）

### 元素类型决策

当 design-executor 委托本技能搭建节点时，元素 type 的选择优先级：

```
交互行为（interaction.trigger）> 视觉外观

trigger = input/change → type 必须是 "input" 或 "textarea"
trigger = click（操作类）→ type 优先用 "button"
trigger = submit → type = "button"
无 trigger → type = "div"
```

**绝对禁止**: 因为视觉上像"格子/方块"就用 div 实现可输入元素。

### 强制背景色（平台默认样式问题）

平台对 input/textarea/select 的默认背景色可能不是白色。**必须显式设置**：

```json
// 所有 input 类型节点:
{ "backgroundColor": "#FFFFFF" }

// 所有 button 类型节点（有设计背景色时）:
{ "backgroundColor": "<设计稿色值>" }
```

### z-index 使用限制

```
❌ 禁止: z-index: -1（在有 overflow:hidden 或 position:relative 的父级中不可见）
✅ 正确: 装饰层用 z-index: 0 + pointer-events: none，内容层 z-index: 1
✅ 正确: 利用 DOM 顺序（先渲染=底层），不设 z-index
```

### visibleWhen 与 display 互斥

```
❌ 禁止: 同时设置 visibleWhen 和 styles.display: "none"
✅ 正确: 设了 visibleWhen 后，styles.display 设为该节点可见时的值（如 "flex"）
原因: visibleWhen 完全接管显隐逻辑，额外的 display:none 会冲突
```

### state.set 必须伴随视觉联动

当事件 actions 中包含 `state.set` 且该 state 变化会影响其他节点的视觉时：

```json
// ❌ 不完整（只改状态，不联动视觉）:
{"actions": [{"type": "state.set", "path": "view.loginMode", "value": "code"}]}

// ✅ 完整（状态 + 视觉联动）:
{"actions": [
  {"type": "state.set", "path": "view.loginMode", "value": "code"},
  {"type": "node.setVisualState", "nodeId": "<code-tab>", "stateName": "active"},
  {"type": "node.setVisualState", "nodeId": "<password-tab>", "stateName": "default"}
]}
```

**前提**: 被引用的节点必须先通过 `visual_state/add` 创建对应的状态。

### overflow:hidden 容器中的绝对定位

```
如果父级有 overflow:hidden:
  - 绝对定位子元素超出父级边界的部分会被裁切
  - 装饰性元素不要设置负值的 top/right/bottom/left（会被裁切不可见）
  - 如果装饰需要溢出，父级不能用 overflow:hidden（改用 overflow:visible）
```

---

## 设计能力边界

### ✅ 本技能覆盖
- 元素 CRUD（element）
- 样式修改（style）
- 事件交互（event）
- 数据源和数据绑定（data_source）
- 状态管理（state）
- 组件资产管理（asset）
- 视觉状态（visual_state）
- 属性编辑（component_prop）
- 屏幕管理（screen）
- 方案分析和任务拆分

### ❌ 本技能不覆盖（委托给 material-painter）
- Canvas 矢量绘制（add_object / profiledStroke）
- 素材导出（export_and_apply）
- 渐变/阴影生成器
- 图形坐标计算

---

## references/

详细参考资料（按需加载）：
- `references/mcp_capability_map.md` — 所有 MCP 工具的参数映射和使用示例
