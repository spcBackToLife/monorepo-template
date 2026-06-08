---
name: design-workflow
description: >
  端到端页面设计技能。当用户描述产品需求时，自动分析需求并正确使用 MCP 工具完成页面设计。
  触发场景：(1) 用户描述要做什么功能/页面 (2) 用户要求从零开始设计 (3) 用户说"帮我设计登录页/首页/..."
  (4) 用户要求分析产品需求并设计 (5) 用户要求自动化测试交互截图。
  本技能核心定位：需求分析 → 交互分析 → 视觉设计 → 实现落地。
  在实现落地阶段，通过「场景决策树」判断应该使用哪种平台能力。
---

# 设计工作流技能（design-workflow）

端到端页面设计技能，核心定位：**需求分析 → 交互分析 → 视觉设计 → 实现落地**。

在**实现落地**阶段，通过「场景决策树」判断应该使用哪种 MCP 工具。

---

## 一、任务计划机制（必读！）

复杂设计任务（多页面/多组件）必须制定计划，逐个完成，支持会话中断后继续。

### 1.1 何时需要计划

以下情况必须制定计划：
- 设计任务涉及 **≥2 个屏幕**
- 设计任务涉及 **≥5 个组件**
- 设计任务涉及 **≥3 种平台能力**（如同时需要 data_source + state + event）

### 1.2 计划格式

```markdown
# 设计计划 — <项目名称>

## 任务清单
- [ ] T1: <子任务1> → 验证: <如何验证完成>
- [ ] T2: <子任务2> → 验证: <如何验证完成>
- [ ] T3: <子任务3> → 验证: <如何验证完成>

## 当前进度
- 已完成: T1, T2
- 进行中: T3
- 待开始: T4, T5

## 关键决策记录
- <决策1>: <原因>
- <决策2>: <原因>
```

### 1.3 计划存储位置

```
analysis-notes/<projectId>/design-plan.md
```

### 1.4 执行规则

1. **制定计划**：分析需求后，先写计划再执行
2. **逐个完成**：每次只执行一个子任务
3. **更新进度**：完成一个子任务后，更新计划文件
4. **会话中断**：下次会话从计划文件的"当前进度"继续
5. **验证完成**：每个子任务必须有明确的验证标准

---

## 二、场景决策树（核心！）

```
用户需求
  ├─ 有 API 请求？
  │   └─ 是 → data_source 工具（定义 API + Mock 场景）
  │
  ├─ 有列表/表格数据？
  │   └─ 是 → element.set_repeat（v2.1 三层模型：expression + template）
  │           ├─ 需要空状态？ → 静态 children 作为空态占位
  │           ├─ 需要分页？ → state + event（view 变量 + 翻页事件）
  │           └─ 需要筛选？ → state + event（筛选条件 + 重新 fetch）
  │
  ├─ 有元素条件显示/隐藏？
  │   └─ 是 → element.set_visible_when（表达式驱动，如 state.view.showModal）
  │
  ├─ 有页面状态？（如登录模式切换）
  │   └─ 是 → state 工具（view 变量 + data 初始值）
  │
  ├─ 有表单输入？
  │   └─ 是 → element.set_bind（input/textarea/select 双向绑定）
  │           └─ 需要验证？ → event + visual_state（提交事件 + 错误态）
  │
  ├─ 有弹窗/抽屉？
  │   └─ 是 → screen 工具（添加 overlay）+ state + event（显隐控制）
  │
  ├─ 有页面跳转？
  │   └─ 是 → event.add_navigation（nav.go / nav.back）
  │
  ├─ 组件多页面复用？
  │   └─ 是 → asset 工具（save_as_template + instantiate）
  │
  ├─ 需要样式设计？
  │   └─ 是 → style 工具 + theme 工具（使用 $token: 变量）
  │
  ├─ 需要素材绘制？
  │   └─ 是 → material-painter 技能（canvas 绘制 + export_and_apply）
  │
  ├─ 有交互事件？
  │   └─ 是 → event 工具（add_event + 正确 actions）
  │
  ├─ 组件有多视觉状态？（如按钮 hover/active）
  │   └─ 是 → visual_state 工具（add + activeWhen）
  │
  └─ 有业务状态？（如成功/失败提示）
      └─ 是 → state 工具 + event 工具（状态管理 + 视觉联动）
```

---

## 三、场景速查表

### 3.1 数据驱动场景

| 场景 | 使用工具 | 关键操作 | 参考 |
|------|---------|---------|------|
| 列表/表格 | `element.set_repeat` | `{ expression: "{{ state.data.messages }}", template: <ComponentNode> }` | `references/scenarios/list.md` |
| 列表空状态 | `element.add` + 静态 children | 容器 children 作为空态占位，与 template 共存 | `references/scenarios/list.md` |
| 列表分页 | `state.view_add` + `event.add_event` | 翻页按钮 → state.set + effect.fetch | `references/scenarios/list.md` |
| 表单输入 | `element.set_bind` | `{ path: "view.form.name" }` | `references/scenarios/form.md` |
| 表单验证 | `event.add_event` + `visual_state.add` | 提交事件 → 验证 → 错误态 | `references/scenarios/form.md` |
| API 数据源 | `data_source.add` | 定义 endpoint + mock 场景 | `references/scenarios/api.md` |

### 3.2 交互驱动场景

| 场景 | 使用工具 | 关键操作 | 参考 |
|------|---------|---------|------|
| 弹窗/抽屉 | `screen.add` (overlay) | 添加 overlay → state + event 控制显隐 | `references/scenarios/overlay.md` |
| Tab 切换 | `visual_state.add` + `event.add_event` | activeWhen 自动激活 + click 事件切换 | `references/scenarios/tab.md` |
| 页面跳转 | `event.add_navigation` | `nav.go` / `nav.back` | `references/scenarios/navigation.md` |
| 条件显示 | `element.set_visible_when` | `"{{ state.view.showPanel }}"` | `references/scenarios/visible.md` |

### 3.3 视觉设计场景

| 场景 | 使用工具 | 关键操作 | 参考 |
|------|---------|---------|------|
| 样式设计 | `style.update` | 使用 `$token:colors.primary` 等 | `references/scenarios/style.md` |
| 素材绘制 | `material-painter` 技能 | canvas 绘制 → export_and_apply | `references/scenarios/material.md` |
| 主题配置 | `theme-generator` 技能 | 先配置主题，再使用 token | `references/scenarios/theme.md` |
| 视觉状态 | `visual_state.add` | hover/pressed/disabled + activeWhen | `references/scenarios/visual-state.md` |

---

## 四、平台能力速查表

### 4.1 MCP 工具映射

| 能力 | MCP 工具 | 关键 action |
|------|-----------|-------------|
| API 定义 + Mock | `data_source` | `add`, `add_mock_scenario`, `switch_mock_scenario` |
| 列表绑定 | `element` | `set_repeat` |
| 条件显示 | `element` | `set_visible_when` |
| 表单绑定 | `element` | `set_bind` |
| 状态管理 | `state` | `view_add`, `data_set_init`, `global_view_add` |
| 组件复用 | `asset` | `save_as_template`, `instantiate` |
| 样式设计 | `style` + `theme` | `update`, `reset`, `batch_update` |
| 素材绘制 | `canvas` | `add_object`, `export_and_apply` |
| 事件绑定 | `event` | `add_event`, `add_navigation` |
| 视觉状态 | `visual_state` | `add`, `update`, `set_active` |
| 覆盖层 | `screen` | `add` (overlay 类型) |
| 截图验证 | `generate_snapshots` | `mode: viewport/frame/multi-viewport` |
| 完整性检查 | `query` | `integrity` |

### 4.2 主题变量清单

```markdown
## 颜色
- $token:colors.primary - 主色
- $token:colors.onPrimary - 主色上的文字色
- $token:colors.secondary - 辅助色
- $token:colors.surface - 表面色（卡片/弹窗背景）
- $token:colors.background - 页面背景色
- $token:colors.textPrimary - 主文字色
- $token:colors.textSecondary - 辅助文字色
- $token:colors.error - 错误色
- $token:colors.success - 成功色

## 间距
- $token:spacing.xs - 4px
- $token:spacing.sm - 8px
- $token:spacing.md - 16px
- $token:spacing.lg - 24px
- $token:spacing.xl - 32px
- $token:spacing.2xl - 48px
- $token:spacing.3xl - 64px

## 圆角
- $token:radius.sm - 4px
- $token:radius.md - 8px
- $token:radius.lg - 12px
- $token:radius.xl - 16px
- $token:radius.full - 9999px

## 字体
- $token:font.h1 - { fontSize: "32px", fontWeight: 700 }
- $token:font.h2 - { fontSize: "24px", fontWeight: 700 }
- $token:font.body - { fontSize: "16px", fontWeight: 400 }
- $token:font.caption - { fontSize: "14px", fontWeight: 400 }

## 阴影
- $token:shadow.sm - 0 1px 2px rgba(0,0,0,0.05)
- $token:shadow.md - 0 4px 6px rgba(0,0,0,0.1)
- $token:shadow.lg - 0 10px 15px rgba(0,0,0,0.1)
```

---

## 五、防御性规则（强制执行）

### 5.1 元素类型决策

```
交互行为（interaction.trigger）> 视觉外观

trigger = input/change → type 必须是 "input" 或 "textarea"
trigger = click（操作类）→ type 优先用 "button"
trigger = submit → type = "button"
无 trigger → type = "div"
```

### 5.2 多子节点容器选型

```
父容器 children.length ≥ 2 ？
├── 否 → 不需要 flex（单子节点用 block 流即可）
└── 是 → 必须显式声明 display:
    ├── 子节点应水平并列（label+input / checkbox+text / icon+text）
    │   → 必填 4 字段：
    │     {
    │       display: "flex",
    │       flexDirection: "row",
    │       alignItems: "center",
    │       gap: "$token:spacing.sm"
    │     }
    │
    ├── 子节点应垂直堆叠（form fields / list items）
    │   → 必填 4 字段：
    │     {
    │       display: "flex",
    │       flexDirection: "column",
    │       gap: "$token:spacing.md",
    │       alignItems: "stretch"
    │     }
    │
    └── 子节点是网格（图片墙 / 9 宫格）
        → 用 display:grid + gridTemplateColumns + gap
```

### 5.3 禁止使用 Emoji 作为图标

```
❌ 禁止：在 textContent / children 中直接使用 emoji 字符（如 🏠 🎣 💬 👤）
✅ 正确：使用素材（material-painter 技能绘制图标 → export_and_apply）或文字标签
```

所有图标必须通过素材系统实现，禁止直接用 emoji 字符。原因：
- 不同平台 emoji 渲染差异大，视觉不可控
- 科技/专业风格产品中使用 emoji 显得不严肃
- 素材图标可精确控制颜色、大小、风格一致性

### 5.4 Token 引用 vs CSS 复合表达式

```javascript
// ✅ 合法
{ paddingTop: "$token:spacing.3xl" }
{ color: "$token:colors.primary" }

// ❌ 非法（token 解析器不递归扫描复合表达式内部）
{ paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.2xl)" }
```

### 5.5 state.set 必须伴随视觉联动

```javascript
// ❌ 不完整（只改状态，不联动视觉）
{"actions": [{"type": "state.set", "path": "view.loginMode", "value": "code"}]}

// ✅ 完整（状态 + 视觉联动）
{"actions": [
  {"type": "state.set", "path": "view.loginMode", "value": "code"},
  {"type": "node.setVisualState", "nodeId": "<code-tab>", "stateName": "active"},
  {"type": "node.setVisualState", "nodeId": "<password-tab>", "stateName": "default"}
]}
```

---

## 六、入场检查清单

### 6.1 主题门禁（必须！）

```bash
# Step 1: 检查主题是否已配置
theme / check → projectId

# 如果 customized=false → 停止设计！
# 提示用户：「项目尚未制定主题风格。请描述期望的风格
# （如"轻奢暗色科技风"、"清新自然风"），
# 我将调用 theme-generator 技能生成主题配置。」
```

### 6.2 实施前检查

- [ ] 主题已配置（theme/check → customized=true）
- [ ] 已分析需求中的关键要素（API/列表/条件显示/状态/复用/样式/素材/事件/视觉状态/业务状态）
- [ ] 已生成实施计划（按依赖顺序排列）
- [ ] 已识别可复用组件（避免重复实现）

---

## 七、常见问题排查

### 问题 1: export_and_apply 后样式混乱

**原因**: applyMaterialDesign 是追加模式不是替换模式  
**解决**: 必须先 style/reset 再 style/update

### 问题 2: 事件不触发

**原因**: trigger 与元素类型不匹配  
**解决**: 检查元素 type 是否匹配 trigger（如 input 才能 trigger=change）

### 问题 3: 视觉状态不激活

**原因**: activeWhen 表达式错误或无 state 变化  
**解决**: 检查 activeWhen 表达式、确保 state 已正确设置

### 问题 4: 列表 repeat 不生效

**原因**: expression 路径错误或 template 为空  
**解决**: 检查 expression 路径（如 `state.data.messages`）、确保 template 是完整 ComponentNode

### 问题 5: 条件显示不生效

**原因**: visibleWhen 表达式错误或 state 未初始化  
**解决**: 检查表达式语法、确保 view 变量有默认值

> **详细排查指南**：见 `references/troubleshooting.md`

---

## 八、截图验证（强制执行）

用 `scripts/screenshot-screen.mjs` 截图，按检查清单逐项确认，禁止用 `generate_snapshots`。

```bash
node scripts/screenshot-screen.mjs <projectId> <screenId>
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
```

**检查清单**（截图后逐项打勾）：

| # | 检查项 | 检查要点 |
|---|---------|----------|
| 1 | 色彩 | 是否符合主题 token，配色是否符合设计规范，对比度是否足够（文字在背景上可见） |
| 2 | 交互逻辑 | 所有点击链路是否完整，是否有断链（如点击后无反应） |
| 3 | 交互反馈 | hover/active/focus 视觉反馈是否有设计，效果是否正确 |
| 4 | 状态设计 | 不同状态下（空态/加载中/有数据/错误）样式是否正确，数据绑定是否生效 |
| 5 | API 管理 | Mock 场景是否配置，autoFetchOnEnter 是否正确，loading/error 状态是否有设计 |
| 6 | 全局状态 | globalState / 跨屏状态是否设计正确，状态变化时 UI 是否联动 |
| 7 | 事件完整性 | 所有事件（点击/输入/跳转/提交）是否能正常运作，nav.go 目标屏是否存在 |
| 8 | 界面结构 | 布局是否正确（flex 方向/对齐/间距），是否该滚动的地方能滚动，不该滚动的地方不滚动 |
| 9 | 间距规范 | 间距是否使用 token（spacing.xs~3xl），是否符合 8px 网格 |
| 10 | 素材使用 | 图标是否通过 material-painter 绘制，是否用了 emoji（❌禁止） |
| 11 | 列表设计 | 是否正确使用 set_repeat，空状态是否有设计，分页/筛选是否完整 |
| 12 | 表单设计 | 输入框是否双向绑定，提交事件是否完整，验证错误态是否有设计 |
| 13 | 视觉状态 | hover/pressed/disabled/active 是否都设计了，activeWhen 表达式是否正确 |
| 14 | 组件复用 | 重复结构是否已沉淀为模板（save_as_template），其他屏是否通过 instantiate 复用 |

**验证节奏**：
1. MCP 写入 schema
2. 运行 `screenshot-screen.mjs` 截图
3. 按上表逐项检查，全部打勾才算通过
4. 有未通过项 → 改 schema → 重新截图 → 重新检查

---

## 九、工作流程总结

```
1. 用户描述需求
   ↓
2. 分析需求 → 识别关键要素（API/列表/条件显示/状态/复用/样式/素材/事件/视觉状态/业务状态）
   ↓
3. 制定计划（复杂任务）→ analysis-notes/<projectId>/design-plan.md
   ↓
4. 主题门禁检查 → customized=false ? 调用 theme-generator : 继续
   ↓
5. 按场景决策树逐步实施
   ↓
6. 每个任务完成 → 截图验证（§8.2）→ Read 看图 → 确认效果
   ↓
7. 完整性检查（query/integrity）
   ↓
8. 交付
```

---

## References

- `references/scenarios/list.md` - 列表/表格设计详细指南
- `references/scenarios/form.md` - 表单设计详细指南
- `references/scenarios/overlay.md` - 弹窗/抽屉设计详细指南
- `references/scenarios/tab.md` - Tab 切换设计详细指南
- `references/scenarios/navigation.md` - 页面跳转设计详细指南
- `references/scenarios/visible.md` - 条件显示设计详细指南
- `references/scenarios/api.md` - API 数据源设计详细指南
- `references/scenarios/style.md` - 样式设计详细指南
- `references/scenarios/material.md` - 素材绘制详细指南
- `references/scenarios/theme.md` - 主题配置详细指南
- `references/scenarios/visual-state.md` - 视觉状态设计详细指南
- `references/troubleshooting.md` - 常见问题排查指南
