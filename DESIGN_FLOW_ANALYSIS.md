# 设计执行流程问题分析（基于实际 Schema 验证）

> 基于 campus-geo-social 项目 00-login 页面的实际执行结果（2026-05-29）
> 测试链路：product-analyst → interaction-designer → design-planner → **design-executor**
> **数据来源**: MCP query/screen_schema 实际返回的完整节点树（非推测）
> 项目ID: `6454f294-487f-4cf3-bdce-7fe85b7fa08e`

---

## 一、实际 Schema 验证结果 vs 截图问题

### 截图观察到的 4 个问题及其 Schema 真因

| # | 现象 | Schema 中的实际数据 | 真正原因 |
|---|------|------|------|
| 1 | 验证码/密码切换胶囊拥挤 | 容器 `h:32px, p:2px`；两个 tab 均有 `padding: 0 16px, height:28px, flex:1` | **非样式问题** — padding 充足。问题是容器没有设 `width` 或 `minWidth`，flex:1 在无宽度约束容器中压缩 |
| 2 | 切换验证码/密码无反应 | Tab 上有条件样式表达式 `{{ state.view.loginMode === 'code' ? ... }}`，**但 events 数组为空 `[]`** | **事件完全未写入！** 两个 tab 的 `events: []`，没有 click handler 去 state.set(loginMode) |
| 3 | 底部注册/忘记密码样式问题 | Divider 节点 `minHeight:40px, minWidth:40px, flex:1, display:flex, flexDirection:column` | **Divider 被错误地设置为 flex:1 + 40x40 最小尺寸**，撑开了布局；应该是 inline text 无尺寸约束 |
| 4 | 获取验证码间距问题 | CodeInputGroup `flex:1, gap:8px`；6个 cell 各 `w:36px`；send-code-btn `padding:0 8px, flexShrink:0` | CodeCells 容器 `flex:1` 占满剩余空间，6×36=216px + gap，btn 被挤到右侧无间距 |

---

## 二、基于 Schema 的精确根因分析

### 2.1 胶囊拥挤 — 容器缺少 width 约束

**Schema 实际数据**:
```json
// 容器 nd_5ba79433c7c14ce8a88f7 "登录方式切换"
{
  "height": "32px",
  "padding": "2px",
  "alignSelf": "center",  // ← 无 width/minWidth
  "display": "flex",
  "flexDirection": "row",
  "borderRadius": "9999px"
}
// 子节点 "验证码Tab" / "密码Tab"
{
  "flex": "1",
  "height": "28px",
  "padding": "0 16px",  // ← padding 本身没问题
  "fontSize": "14px"
}
```

**真因**: 容器是 `alignSelf: center` 且无固定 width/minWidth。flex 容器收缩到内容最小宽度（两个 tab 文字宽度 + padding），在手机宽度下显得紧凑。`index.md` 中没有给 mode-toggle 一个明确的宽度约束（如 `width: 200px` 或 `padding: 0 40px`）。

**归因**: **设计规格缺失** — visual.md §6 没有定义 mode-toggle 容器的宽度/min-width。

---

### 2.2 切换无反应 — 事件根本没有写入！（最严重问题）

**Schema 实际数据**:
```json
// nd_18305963c88042a2ad79b "验证码Tab"
{ "events": [] }  // ← 完全空！

// nd_cc860c0e16b141bbaa43b "密码Tab"  
{ "events": [] }  // ← 完全空！

// 甚至整个父容器 "登录方式切换"
{ "events": [] }  // ← 也是空！
```

**但 stateInit 正确存在**:
```json
"loginMode": {
  "enum": [{"label":"验证码登录","value":"code"}, {"label":"密码登录","value":"password"}],
  "defaultValue": "code"
}
```

**条件样式表达式也正确写入了**:
```json
"backgroundColor": "{{ state.view.loginMode === 'code' ? '#FF6F91' : 'transparent' }}"
```

**visibleWhen 也正确写入了**:
```json
// CodeInputGroup
"visibleWhen": "{{ state.view.loginMode === 'code' }}"
// PasswordGroup
"visibleWhen": "{{ state.view.loginMode === 'password' }}"
```

**诊断**: 整条交互链路中，**只有 event（事件）这一环完全缺失**：
- ✅ stateInit.view.loginMode 存在且默认 'code'
- ✅ 条件样式表达式正确引用 state.view.loginMode
- ✅ visibleWhen 正确绑定
- ❌ **没有任何 click event 去执行 `state.set(view.loginMode, 'password')`**

**为什么 executor 标了 `events: true`？** 看 mode-toggle.json 的 implementation：
```json
"checklist": { "events": true }
"notes": "用条件样式表达式实现 active 高亮联动"
```
Executor 认为"条件样式表达式"就是交互实现，**混淆了"响应式样式"和"触发事件"两个概念**：
- 条件样式 = state 变化后 UI 如何响应（被动）
- 事件 = 用户操作后如何改变 state（主动触发）
- 两者缺一不可！

**归因**: **Executor 逻辑错误** — 将"写入了条件样式"误判为"交互已完成"，跳过了写入 click event 的步骤。验证也未检测到 events 数组为空。

---

### 2.3 底部链接样式问题 — Divider 节点被创建为布局容器而非文本

**Schema 实际数据**:
```json
// nd_947ed5ea377a4d24b8ecd "Divider"
{
  "type": "div",
  "styles": {
    "display": "flex",
    "flexDirection": "column",
    "minHeight": "40px",   // ← 40px 最小高度！
    "minWidth": "40px",    // ← 40px 最小宽度！
    "flex": 1,             // ← 占满剩余空间！
    "color": "rgba(45, 36, 56, 0.42)",
    "fontSize": "14px"
  },
  "props": { "textContent": "|" }
}
```

**问题**: 
1. Divider 应该是一个无布局纯文本（`display:inline`, 无 min-width/min-height），但被创建成了 `flex:1 + 40x40 min` 的大块容器
2. `flex:1` 让它占满 "注册账号" 和 "忘记密码" 之间的所有剩余空间
3. `minWidth:40px + minHeight:40px` 是 page-builder 的**默认新元素尺寸**（创建 div 时的模板默认值）

**归因**: **page-builder 默认样式问题** — 创建纯文本 div 时，page-builder 自动注入了 `flex:1, minWidth:40, minHeight:40, display:flex, flexDirection:column`（div 的默认模板样式），但这些对一个 "|" 分隔符完全不合适。Executor 没有在创建后清除这些默认值。

---

### 2.4 获取验证码间距 — 布局计算问题

**Schema 实际数据**:
```json
// CodeInputGroup nd_b73b738c6b154a0a8a0f8
{
  "gap": "8px",
  "flex": 1,          // ← 占满 form-card 宽度
  "display": "flex",
  "flexDirection": "row",
  "alignItems": "center"
}

// CodeCells nd_5cd36beecd44405589f9e
{
  "gap": "6px",
  "flex": "1",        // ← 占满 CodeInputGroup 剩余空间（除 btn 外）
  "display": "flex",
  "flexDirection": "row"
}

// 6 个 CodeCell
{ "width": "36px", "height": "48px" }  // 每个 36px 固定

// 获取验证码按钮 nd_a85e63659e0e49bf8f92f
{
  "height": "48px",
  "padding": "0 8px",
  "flexShrink": "0",  // ← 不缩小
  "whiteSpace": "nowrap"
}
```

**计算**: form-card padding:24px 左右，剩余可用宽度 ≈ 393-32(margin)-48(padding) = 313px。6 cells × 36 + 5 gaps × 6 = 246px。btn "获取验证码" ≈ 70px。246 + 8(gap) + 70 = 324px > 313px，**溢出了！**

但 CodeCells 有 `flex:1` 所以会被压缩——这导致 6 个 cell 的实际宽度小于 36px，看起来就是格子变小、整体拥挤。

**归因**: **布局计算未校验** — Executor 设了正确的各组件尺寸，但没有验证它们在容器内是否能放下。在 393px 宽屏幕上 6 个 36px 格子 + 按钮 + padding 是放不下的，需要减少 cell 宽度或让按钮换行/另起一行。

---

## 三、流程结构性缺陷总结（基于实际 Schema 证据）

### 缺陷 1: 事件写入被跳过但 checklist 标了 true（验证形同虚设）

**证据**:
- mode-toggle 两个 Tab：`events: []`（空）
- 登录按钮：`events: []`（空）
- 获取验证码按钮：`events: []`（空）
- 注册链接：`events: []`（空）
- 忘记密码链接：`events: []`（空）

**整个页面所有节点的 events 全部为空数组！** 没有一个节点有事件。

但 `mode-toggle.json` 的 implementation 标记了 `"events": true`。

**问题本质**: Executor 的 Step 4 验证（G5）声称"确认事件数量 + trigger 类型"，但实际执行时：
1. 要么验证步骤被跳过
2. 要么验证逻辑有缺陷（检查的是 node.json 的 interaction 字段而非实际 schema 的 events）
3. 要么 page-builder 子技能在创建节点时没有设置 events，executor 也没有在 Step 4 检测到

**这是最核心的流程 Bug**: 声明完成 ≠ 实际完成，验证机制未起到兜底作用。

---

### 缺陷 2: page-builder 的默认元素样式污染

**证据**: Divider 节点（"|"）被创建后自带：
```json
{ "minHeight": "40px", "minWidth": "40px", "flex": 1, "display": "flex", "flexDirection": "column" }
```

这是 page-builder 使用 `element/add` 创建 div 时的默认模板样式。对于一个纯文本分隔符（"|"），这些默认值完全是错误的。

**问题本质**: page-builder 创建元素后，Executor 没有**显式覆盖**所有不需要的默认值。"创建 + 设目标样式"不够，还需要"重置默认样式"这一步。

---

### 缺陷 3: 布局溢出未被检测

**证据**: 
- form-card 内容宽度 = 393 - 32(margin) - 48(padding) = 313px
- CodeInputGroup: 6 cells × 36px + 5 gaps × 6px = 246px + 8px(group gap) + ~80px(btn) = 334px
- **334px > 313px，溢出 21px**

Executor 在设置每个元素尺寸时没有做"容器内总宽度验算"。这不是文档问题，是 **Executor 缺少"布局约束验算"步骤**。

---

### 缺陷 4: 条件样式 vs 事件的认知混淆

**证据**: mode-toggle 的 implementation.notes：
> "用条件样式表达式实现 active 高亮联动（execution-rules.md 平台能力推荐方案，比 visualState 更优雅）"

Executor 正确理解了"响应"侧（用表达式让样式跟随 state 变化），但**完全遗漏了"触发"侧**（需要 click event 来改变 state）。

这说明 execution-rules.md 的"条件样式"推荐说明中，**只描述了表达式写法，没有强调"仍需配套 click event"**。Executor 误以为写了表达式就不需要事件了。

---

### 缺陷 5: 所有交互逻辑（不只是 mode-toggle）都未实现

**Schema 全局统计**:
| 节点 | 预期事件 | 实际 events |
|------|---------|:-----------:|
| 验证码Tab (click→set loginMode) | 1 | `[]` |
| 密码Tab (click→set loginMode) | 1 | `[]` |
| 手机号输入框 (change→set phone) | 已有 bind✅ | `[]` |
| 获取验证码 (click→startTimer) | 1 | `[]` |
| 登录按钮 (click→submit) | 1 | `[]` |
| 注册链接 (click→nav.go) | 1 | `[]` |
| 忘记密码 (click→nav.go) | 1 | `[]` |
| EyeToggle (click→toggle passwordVisible) | 1 | `[]` |

**唯一的"交互"**: 手机号和密码输入框有 `bind`（双向绑定），这确实能工作。但所有 click 事件全部缺失。

**结论**: Executor 可能在执行过程中被中断/超时，或者 page-builder 子技能调用时只传了结构+样式上下文而没有传事件上下文（模板 A 中 events 部分被遗漏）。

---

## 四、综合诊断

| 维度 | 诊断 | 证据 |
|------|------|------|
| 技能本身有 Bug？ | **否** — 技能流程设计合理，规则完备 | SKILL.md 的 G1-G8 规则覆盖了所有场景 |
| 执行时遵守了技能规则？ | **否** — G5(验证)被违反 | events:[] 但 checklist.events=true |
| 视觉设计有问题？ | **轻微** — 容器宽度/cell 尺寸在窄屏下溢出 | 6×36+btn > 可用宽度 |
| 交互逻辑写入了？ | **完全没有** — 所有节点 events=[] | Schema 全量验证 |
| 根本原因 | **Executor 在执行事件步骤时失败/跳过，且验证未兜底** | — |

### 最可能的执行失败原因推测

基于 Schema 显示"结构完整、样式完整、状态完整、事件全空"的模式：

1. **Executor 执行到事件步骤时可能遇到了 token 限制/上下文截断** — 前面的结构和样式已经消耗了大量 token，到事件步骤时 AI 可能因上下文限制而"总结性完成"
2. **page-builder 子技能调用时事件信息被省略** — 模板 A 很长，Executor 可能只传了结构+样式部分给 page-builder，事件部分被截断
3. **事件步骤被合并到"下一批"但从未执行** — 19 个节点串行执行，中途中断后未从断点恢复

---

## 五、改进建议（基于实际证据，按优先级）

### P0: 修复验证机制 — Step 4 必须读 Schema 验证 events 非空

```markdown
#### 当前验证（有名无实）:
Step 4: "确认事件数量 + trigger 类型"
→ 但实际只查了 node.json 的 interaction 字段，不是 schema 的真实 events

#### 修复后的验证:
Step 4 events 验证:
1. 调用 query/screen_schema 获取目标节点的实际 events 数组
2. 检查 events.length >= interaction.json 中 trigger 出现的次数
3. 对每个 event:
   - 确认 trigger 类型匹配
   - 确认 actions 数组非空
   - 如果有 state.set → 确认 stateInit 中有对应 key
4. 如果 events.length === 0 且 interaction.trigger 存在:
   ❌ 不通过！必须补写事件！
```

### P1: execution-rules.md 补充"条件样式 ≠ 事件"警告

```markdown
#### 在"条件样式"推荐段落后追加:

⚠️ 条件样式表达式只是"响应"机制（state 变化 → 样式跟随）。
它不能替代"触发"机制（用户操作 → state 变化）。

完整的交互链路 = 事件(触发) + 条件样式(响应)。两者缺一不可。

正确实现 tab 切换 = 以下全部:
  ✅ state.set click event（触发 state 变化）
  ✅ 条件样式表达式（响应 state 显示正确样式）
  ✅ visibleWhen（响应 state 显隐对应面板）
  
如果只写了条件样式没写事件 = state 永远不会变 = 一切不动。
```

### P2: page-builder 创建元素后清除默认样式

```markdown
#### 在 page-builder 中增加"创建后样式清理"规则:

当创建纯文本展示节点（如分隔符 "|"、图标 emoji）:
1. 创建后立即 style/reset: [flex, minWidth, minHeight, flexDirection, display]
2. 只保留 color, fontSize, fontFamily 等纯文本样式
3. 如果是 inline 文本，设 display: "inline"

不清理的后果: 默认的 flex:1 + 40x40 会撑开布局。
```

### P3: 增加"布局溢出检测"

```markdown
#### Step 4 增加布局验算:

对每个 flex row 容器:
1. 读取容器可用宽度 (width - paddingLeft - paddingRight)
2. 计算子元素总宽度 (Σ 子元素 width + Σ gap)
3. 如果 Σ > 可用宽度 且无 flex-shrink/wrap:
   ⚠️ 溢出警告！建议:
     a. 减小子元素尺寸
     b. 增加容器宽度
     c. 设 flex-wrap: wrap
```

### P4: 断点恢复机制

```markdown
#### Executor 中断恢复:

问题: 19 个节点串行执行，如果在第 10 个节点时 token 用完或被中断，
后续 9 个节点的事件永远不会被写入。

修复:
1. EXECUTOR-PLAN.md 增加"已完成"标记（每完成一个打 ✓）
2. 恢复时从第一个未 ✓ 的节点开始
3. 对已标 completed 的节点做"快速二检": 只验证 events 非空
4. 如果二检发现 events 为空 → 标记为"partial"重新执行事件步骤
```

### P5: 事件写入与结构/样式解耦

```markdown
#### 当前流程:
每个节点: 结构 → 样式 → 事件 → 验证（串行在一次 page-builder 调用中）

#### 建议改为两遍扫描:
第一遍: 所有节点的 结构 + 样式 + visibleWhen + bind
第二遍: 所有节点的 events + 交互联动验证

好处:
- 第一遍消耗 token 少（纯静态属性），出错概率低
- 第二遍专注交互逻辑，上下文中只需保留"哪些 nodeId 需要什么事件"
- 如果第二遍被中断，至少视觉部分是完整的
- 第二遍的验证可以一次性检查所有节点的 events
```

---

## 六、总结

**本次测试暴露的核心问题只有一个：事件全部未写入，但 checklist 标了通过。**

这背后是两个流程缺陷：
1. **Executor 在长任务中可能因 token 限制跳过了事件步骤**（执行问题）
2. **验证步骤没有去读 Schema 确认 events 实际存在**（验证问题）

其他三个样式问题（胶囊拥挤、Divider 撑开、验证码溢出）是**次要问题**，来自：
- page-builder 默认元素样式未清理
- 布局尺寸未做容器内验算
- visual.md §6 对子节点细节覆盖不够

**如果只修一个东西**：让 Step 4 验证强制调用 `query/screen_schema` 并检查 events 数组长度与预期匹配。这一个改动就能防止"标完成但事件为空"的核心问题。

---

> 文档生成时间: 2026-05-29T17:33
> 测试项目: campus-geo-social / 00-login 页面  
> 项目ID: 6454f294-487f-4cf3-bdce-7fe85b7fa08e
> 使用技能链: design-executor → page-builder + material-painter
> **数据来源: MCP query/screen_schema 实际返回（非推测）**

---

## 七、平台/工具链层面的附加问题（源码验证）

> 以下问题来自实际执行过程中观察到的工具链缺陷，经源码验证。

---

### 问题 6: 节点缺少 label/name 双字段机制

**现象**: 从截图看，节点树中混合了中英文命名（如"品牌头部"、"CodeInputGroup"、"CodeCell1"）。Executor 执行时先用英文驼峰创建（因为生成组件时需要代码友好的名称），再通过 `element/rename` 改为中文。但这导致：
- 如果 rename 步骤被跳过，节点树中会残留英文名
- 将来生成代码组件时，需要从中文名反推代码名，不可靠

**源码验证**: 

```typescript
// features/design-schema/src/types/node.ts
export interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;  // ← 只有一个 name，没有 label
  // ...
}
```

**结论**: `ComponentNode` 只有 `name` 一个字段，**没有 `label` 字段**。设计平台目前无法同时存储"展示名"和"代码名"。

**需求设计**:

```typescript
// features/design-schema/src/types/node.ts — 扩展 ComponentNode
export interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;      // 代码友好标识名（PascalCase，如 "CodeInputGroup"）— 用于代码生成
  label?: string;     // 面板展示名（如 "验证码输入组"）— 用于 UI 展示
  // 展示优先级: label > name > type
  // ...
}
```

**修复方案（代码级）**:

```markdown
Step 1: 类型扩展
  - features/design-schema/src/types/node.ts: 增加 label?: string

Step 2: MCP element/add 支持 label 参数
  - apps/design-mcp/src/tools/domain/element.ts:
    schema 增加 label: z.string().optional()
    handler 透传 label 到 operation params

Step 3: element/rename 拆分为 rename + set_label
  - rename: 修改 name（代码名，PascalCase 验证）
  - set_label: 修改 label（展示名，任意文本）
  或者保持单个 rename 但增加 field 参数:
    rename({ nodeId, field: 'name' | 'label', value })

Step 4: 前端节点树面板适配
  - apps/design_front/: 节点树渲染逻辑改为 node.label ?? node.name ?? node.type

Step 5: Executor 技能适配
  - element/add 时同时传 name(PascalCase) + label(中文)
  - 不再需要先创建后 rename 两步
```

**影响范围**:
- `features/design-schema/src/types/node.ts` — 类型定义
- `apps/design-mcp/src/tools/domain/element.ts` — add/rename 操作
- `apps/design_front/` — 节点树面板渲染（显示 label 优先、name fallback）
- 全部序列化/反序列化逻辑

**优先级**: P2（影响代码生成阶段，当前阶段可用 rename workaround）

---

### 问题 7: generate_snapshots 返回 placeholder URL，无法真实截图

**现象**: Executor 的 Phase 1.5 / Phase 2 调用 `generate_snapshots` 做视觉验证，但返回的 URL 是：
```
placeholder://snapshots/{projectId}/{screenId}.viewport.png
```
这个 URL 无法被访问，AI 无法看到实际渲染结果做对比。

**源码验证**:

```typescript
// apps/design-api/src/modules/snapshots/snapshots.service.ts (第 56-98 行)
createJob(projectId, config) {
  // ...
  const results = config.screenIds.map(screenId => ({
    url: `placeholder://snapshots/${projectId}/${screenId}.${config.mode}.${config.format}`,
    // ← placeholder 协议！不是 http://
    width: 375,
    height: config.mode === 'frame' ? 1500 : 812,
  }));
  
  return {
    jobId,
    status: 'completed',  // ← 直接标 completed，没有真实渲染
    mode: config.mode,
    note: 'Snapshot pipeline currently returns placeholder URLs; real rendering is planned...',
  };
}
```

**结论**: 截图功能是 **MVP placeholder 实现**，未集成真实截图引擎（如 Puppeteer/Playwright）。返回的 URL 使用 `placeholder://` 协议，不可访问。

**改进方案**:

```markdown
方案 A（推荐）: 集成 Puppeteer 服务端截图
  文件: apps/design-api/src/modules/snapshots/snapshots.service.ts

  实施步骤:
  1. 安装 puppeteer: pnpm add puppeteer -w --filter design-api
  2. createJob 改为异步真实截图:
     - 启动 headless browser
     - 导航到 http://localhost:5174/preview/{projectId}?screen={screenId}
     - 等待 networkidle (确保字体/图片加载完)
     - page.screenshot({ fullPage: mode==='frame', clip: mode==='viewport' ? {w:375,h:812} : undefined })
     - 保存到 apps/design-api/static/snapshots/{projectId}/{jobId}.png
     - 返回 http://localhost:3001/static/snapshots/{projectId}/{jobId}.png
  3. API 增加静态文件服务: app.useStaticAssets('static')
  4. MCP generate_snapshots 返回值改为包含真实 HTTP URL

方案 B（最轻量/过渡方案）: 返回可访问的预览 URL
  无需截图引擎，直接返回编辑器预览地址:
  1. generate_snapshots 返回:
     { url: "http://localhost:5174/preview/{projectId}?screen={screenId}" }
  2. AI 通过 preview_url 工具打开查看
  3. 人工确认视觉效果
  优点: 零依赖，立即可用
  缺点: 无法自动化对比，依赖人工
```

**优先级**: P1（验证流程的核心依赖，不解决则所有截图验证 = 空操作）

**实施建议**: 先用方案 B 解锁"至少能看到"的能力，同时并行开发方案 A。

---

### 问题 8: element.add / insert_subtree 重复创建节点 — ID 生成架构分析

**现象**: 执行过程中如果 AI 重试或网络超时重发，同一个节点会被创建多次（ID 不同但结构相同）。

#### 当前 ID 生成架构（源码完整梳理）

ID 生成分散在 **3 层**，存在冗余：

```
层级 1: MCP 工具层 (apps/design-mcp/src/tools/domain/element.ts)
  ├── element/add handler (第43行): generateNodeId() → 传 elementId
  └── insert_subtree handler (第86行): walkTree → 所有子节点 generateNodeId() 覆盖

层级 2: API Service 层 (apps/design-api/src/operations/operations.service.ts)
  └── ensureDeterministicIds() (第61-139行):
      ├── element.add: if (!p.elementId) → generateNodeId()     ← 兜底：没 ID 才生成
      ├── insertSubtree: walkTree → if (!node.id) → generateNodeId()  ← 兜底：没 ID 才生成
      ├── duplicate: if (!p.newElementId) → generateNodeId()
      └── screen.add: if (!p.rootNodeId) → generateNodeId()

层级 3: Operations 底层 (features/design-operations/src/operations/element.ts)
  └── createNode() (第171行): id = explicitId ?? generateNodeId()  ← 兜底：没传才生成
```

**还有一个「修复」逻辑**:
```
apps/design-api/src/projects/projects.service.ts (第250-268行):
  repairMissingNodeIds(): walkTree → if (!node.id) → generateNodeId()
  ← 读取项目时发现缺 ID 的节点就补上
```

#### 正确的架构理解

**后端 API Service 层（层级 2）的 `ensureDeterministicIds` 就是正确的 ID 生成入口！**

它的设计意图是：
1. 如果调用方已传 ID → 直接用（不覆盖）
2. 如果调用方没传 ID → 在**持久化前**统一生成
3. 确保 ID 在 operation 被持久化到历史记录时已确定（用于 undo/redo 确定性重放）

**问题出在 MCP 层（层级 1）多此一举地提前生成了 ID**：
- `element/add`: MCP 层 `generateNodeId()` 每次生成新 ID → API 层 `ensureDeterministicIds` 看到"已有 ID"就不兜底了 → 重试时生成不同 ID → 重复节点
- `insert_subtree`: MCP 层 `walkTree` 强制覆盖所有 ID → API 层同理 → 重试时全部是新 ID → 重复

**如果 MCP 层不生成 ID，让 API 层兜底**：
- 第一次调用：API 层 `ensureDeterministicIds` 生成 ID → 持久化 → operation 记录中包含 ID
- 重试时：**同样没有 ID → API 层又生成新 ID → 还是重复！**

所以单靠"谁生成"解决不了幂等问题。真正的幂等需要 **name+parentId 去重检查**。

---

#### ⛔ ID 管理红线

> 1. **ID 只在「创建节点」这一个时刻生成**——由后端 `ensureDeterministicIds` 统一负责
> 2. **创建后，任何环节（查询/修改/序列化/反序列化）一律禁止修改或重新生成 ID**
> 3. **MCP 层禁止调用 `generateNodeId()`** — 它不是 ID 的生成者，只是传输层
> 4. **`repairMissingNodeIds` 是历史兼容代码** — 新流程下不应再触发（如果触发说明创建有 bug）
> 5. **`insert_subtree` 的 `walkTree` 覆盖 ID 是错误行为** — 必须删除

---

#### 修复方案（代码级）

**修复 1: MCP `element/add` — 删除 generateNodeId()，让 API 层兜底**

```typescript
// apps/design-mcp/src/tools/domain/element.ts 第 43 行
// 修改前:
const result = await apiClient.executeOperation(p.projectId, {
  type: 'element.add',
  params: { parentId: p.parentId, tag: p.tag, elementId: generateNodeId(), ... }
});

// 修改后:
const result = await apiClient.executeOperation(p.projectId, {
  type: 'element.add',
  params: { parentId: p.parentId, tag: p.tag, /* elementId 不传，由 API 层生成 */ styles: p.styles, ... }
});
```

**修复 2: MCP `insert_subtree` — 删除 walkTree 覆盖 ID**

```typescript
// apps/design-mcp/src/tools/domain/element.ts 第 84-88 行
// 修改前:
handler: async (p) => {
  const tree = p.subtree as unknown as ComponentNode;
  walkTree(tree, (n: ComponentNode) => { n.id = generateNodeId(); }); // ← 删除这行！
  const result = await apiClient.executeOperation(p.projectId, { ... });
}

// 修改后:
handler: async (p) => {
  const tree = p.subtree as unknown as ComponentNode;
  // ID 由 API 层 ensureDeterministicIds 对缺失 ID 的节点兜底生成
  // MCP 层不触碰 ID
  const result = await apiClient.executeOperation(p.projectId, {
    type: 'element.insertSubtree',
    params: { parentId: p.parentId, subtree: tree, position: p.position }
  });
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
}
```

**修复 3: API 层增加 name+parentId 幂等检查（解决重试重复问题）**

```typescript
// apps/design-api/src/operations/operations.service.ts
// 在 ensureDeterministicIds 之后、executeOperation 之前增加幂等检查:

case 'element.add': {
  if (!p.elementId) {
    // 幂等检查: 同 parentId 下是否已有同名节点
    if (p.name) {
      const parent = findNodeInProjectApi(project, p.parentId as string);
      if (parent?.children?.some(c => c.name === p.name)) {
        // 已存在同名节点 → 返回已有节点 ID，跳过创建
        const existing = parent.children.find(c => c.name === p.name)!;
        return { success: true, description: `Node "${p.name}" already exists`, 
                 affectedNodeIds: [existing.id], skipped: true };
      }
    }
    p.elementId = generateNodeId();
  }
  break;
}
```

**修复 4: 确认 `repairMissingNodeIds` 不会被新流程触发**

```typescript
// apps/design-api/src/projects/projects.service.ts 第 253 行
// 增加日志警告，便于排查:
private repairMissingNodeIds(project: DesignProject): boolean {
  let repaired = false;
  const walkAndRepair = (node: ComponentNode) => {
    if (!node.id) {
      node.id = generateNodeId();
      repaired = true;
      // ⚠️ 新增警告日志：理论上不应再触发
      console.warn(`[repairMissingNodeIds] 节点缺失 ID (name=${node.name}, type=${node.type})，已修复。如频繁出现请排查创建流程。`);
    }
    // ...
  };
}
```

---

#### 修复后的 ID 生命周期

```
创建节点:
  调用方(AI/MCP) ──不传 elementId──→ API ensureDeterministicIds ──生成 ID──→ 持久化
                                      ↑ 唯一允许 generateNodeId() 的地方

重试:
  调用方(AI/MCP) ──不传 elementId──→ API 幂等检查(name+parentId) ──→ 已存在 → 返回已有 ID
                                                                    ──→ 不存在 → 生成新 ID

后续操作(style/event/rename/...):
  调用方传 nodeId ──→ API 按 ID 查找节点 ──→ 操作
  ⚠️ 任何操作都不会修改 node.id

查询/序列化:
  读取 node.id ──→ 原样返回
  ⚠️ 绝不重新生成
```

**优先级**: P1（直接影响执行可靠性，重试 = 乱数据）

**影响范围**:
- `apps/design-mcp/src/tools/domain/element.ts` — 删除 generateNodeId 调用（2处）
- `apps/design-api/src/operations/operations.service.ts` — 增加 name+parentId 幂等检查
- `apps/design-api/src/projects/projects.service.ts` — repairMissingNodeIds 加警告日志

---

### 问题 9: state/view_add 参数 Schema 不一致

**现象**: Executor 调用 `state/view_add` 时可能传参格式与 MCP 工具期望的不一致。

**源码验证**:

```typescript
// apps/design-mcp/src/tools/domain/state.ts
const ViewVariableSchema = z.object({
  name: z.string().min(1),           // 必填：变量名（驼峰）
  label: z.string().optional(),       // 可选：面板显示标签
  defaultValue: z.unknown(),          // 必填：运行时初始值
  enum: z.array(z.object({            // 可选：枚举列表
    value: z.unknown(), 
    label: z.string()
  })).optional(),
  previewValue: z.unknown().optional(), // 可选：编辑期预览值
});

// view_add 的调用方式:
schema: z.object({
  projectId: z.string(),
  screenId: z.string(),
  variable: ViewVariableSchema,   // ← 整体包裹在 variable 对象中
})
```

**潜在不一致点**:

| 调用方可能传的 | MCP 实际期望的 | 后果 |
|---|---|---|
| `{ projectId, screenId, name, defaultValue }` | `{ projectId, screenId, variable: { name, defaultValue } }` | Zod 验证失败 |
| `{ ..., variable: { name: "loginMode", defaultValue: "code" } }` | 同左 | ✅ 正确 |
| `{ ..., variable: { name: "errors", defaultValue: {} } }` | 同左 | ✅ 正确 |

**分析**: 关键在于 `variable` 这个嵌套层。如果 Executor/page-builder 直接展平参数（不包裹 `variable`），Zod 解析会失败。从 Schema 看 stateInit 已正确写入（view.loginMode 等都存在），说明**这次执行中 view_add 参数传对了**。

但需要注意：`ViewVariableSchema` 的 `name` 字段和 `ComponentNode` 的 `name` 字段含义不同：
- state 的 name = 代码中引用的变量标识符（如 `loginMode`）
- state 的 label = UI 面板中的显示名（如 "登录方式"）
- node 的 name = 同时承担两个角色（见问题 6）

这里 state 已经有了 name/label 分离的模式，但 node 没有。**应将 node 的设计对齐 state 的模式**。

**优先级**: P3（本次执行未触发此问题，但需要在文档中明确传参格式避免未来出错）

---

## 八、全部问题优先级汇总

| 优先级 | 问题 | 类型 | 影响 |
|:------:|------|:----:|------|
| **P0** | 事件全部未写入但标了 completed | 流程/验证 | 交互完全不工作 |
| **P1** | generate_snapshots 是 placeholder | 平台能力 | 所有截图验证=空操作 |
| **P1** | element.add 无幂等去重 | 平台能力 | 重试=重复节点 |
| **P1** | execution-rules.md 条件样式≠事件 | 文档 | Executor 认知误导 |
| **P2** | page-builder 默认样式污染 | 工具链 | 纯文本节点布局错乱 |
| **P2** | 节点缺少 label/name 双字段 | 平台能力 | 代码生成阶段受阻 |
| **P2** | 布局溢出无检测 | 流程 | 窄屏溢出 |
| **P3** | state/view_add 参数需文档化 | 文档 | 潜在传参错误 |
| **P3** | visual.md §6 颗粒度不足 | 上游文档 | 子节点样式缺失 |

---

## 九、回归分析：什么提交导致今天的问题

### 关键事实

**MCP 层的 `generateNodeId()` 从 2026-04-17（文件首次创建 `da427b2`）就一直存在，从未被删除过。** 所以"重复创建节点"不是今天新引入的——它一直潜在存在，只是之前使用模式没触发。

### 真正的回归点：`0b44851`（2026-05-29 15:30）

这个提交修改了 `execution-rules.md` 的"平台能力清单"：

```diff
-| 定时器/interval | ❌ 缺失 | 无法做递减倒计时 | workaround: 固定文案 |
-| 条件判断 actions (if/else) | ❌ 缺失 | 用 event.condition 做简单条件 |
+**全部 ✅ — 平台现已具备完整的交互原型能力，无结构性缺口。**
+| **定时器** | `ui.startTimer` / `ui.stopTimer` / `ui.resetTimer` |
+| **条件逻辑** | `logic.if` (when/then/else) + `logic.switch` (cases/default) |
+| **OTP 表单** | input `maxLength:1` + `autoFocusNext:"nextNodeId"` |
+  ... (大量新能力声明)
```

### `378ab61`（2026-05-29 15:49）加剧了问题

```diff
-      └── 素材类型判断:
-            ├── type=Decoration 且形状简单 → 考虑用 CSS 实现
+      └── ⚠️ 不论素材复杂度，一律走 material-painter
```

### 因果链

```
commit 0b44851: 能力清单从"部分❌缺失" → "全部✅可用"
  → Executor 尝试实现完整复杂交互（OTP 6格自动跳焦/定时器/条件逻辑）
  → 单节点实现复杂度从 3-5 个 MCP 调用暴增到 10-15 个

commit 378ab61: 简单装饰禁止 CSS → 强制素材流程
  → 每个装饰节点也要完整素材工程流程
  → token 消耗进一步增加

叠加效果:
  → 19 个节点 × (复杂结构+样式+状态+素材) 消耗了几乎全部 token/上下文
  → 事件步骤（交互逻辑）被推迟/跳过
  → AI 开始"总结性完成" → events:[] 但标 completed
```

### 为什么之前没问题

之前 execution-rules.md 标注了 "❌ 缺失"，Executor 会：
1. 用简单 workaround（固定文案代替倒计时、event.condition 代替 logic.if）
2. CSS 快速处理简单装饰（不走素材流程）
3. 每个节点实现复杂度低 → token 充足 → 事件步骤能正常执行完

### 结论

| 问题 | 真正根因 | 不是什么 |
|------|---------|---------|
| 事件全部为空 | 能力清单全改✅ → 实现复杂度暴增 → token 不足 → 事件跳过 | 不是代码 bug |
| 重复创建节点 | generateNodeId 一直在（历史遗留），之前重试概率低没暴露 | 不是今天引入的 |

### 真正需要的修复

1. **已修复(本次)**: generate_snapshots 改为 puppeteer-core 真实截图
2. **已修复(本次)**: page-builder 默认样式污染（createNode 检测 textContent 不注入 flex:1）
3. **已修复(本次)**: 节点 label/name 双字段支持
4. **已修复(此前)**: MCP 层 generateNodeId 已删除 + API 层幂等检查已添加
5. **已修复(此前)**: execution-rules.md 增加"条件样式≠事件"警告 + Step 4 验证强化

> 注：此前文档中"token 预算管理/分批策略"的 P0 结论是错误分析——
> design-executor 本来就是分批执行的（EXECUTOR-PLAN.md 逐个任务，完不成下次继续）。
> 事件为空的真正根因是 Executor 的认知误导（条件样式=交互完成），已通过文档修复解决。
