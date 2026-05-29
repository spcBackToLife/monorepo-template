---
name: design-executor
description: 应用 UI 设计的最终交付阶段（Schema-First）。前序 product/interaction/design 阶段已经把所有结构/样式/事件/状态/主题落到 schema，本阶段只做三件事：① 给需要素材的节点应用素材（material-painter）② 整体 integrity 0 error 校验 ③ 出快照交付。触发词："执行设计"、"做出来"、"交付"、"出图"。
---

# design-executor（Schema-First）

> **重要变化**：Schema-First 改造后，executor **不再做结构/样式/事件的"翻译"**——这些已经在 design-planner / interaction-designer 阶段直接落 schema。executor 收敛为：**素材应用 + 终验 + 快照**。

---

## 触发 / 不触发

**触发**：用户说"执行设计 / 搭建页面 / 把设计做出来 / 开始实现 / 出图 / 交付"

**不触发**：
- schema 还没有结构/样式 → 先走 design-planner
- 只改单个节点 → 直接用 element/style/event MCP 工具
- 只画一个素材 → 直接调 material-painter

---

## Phase 0：入场门禁

### 0.1 schema 上下文摸排

```
1. query/project_info { projectId } → 确认项目存在
2. query/list_screens { projectId } → 屏幕清单
3. query/integrity { projectId } → ★ 关键门禁
```

### 0.2 入场判定

依据 `query/integrity` 报告决定是否能进 Phase 1：

| integrity 状况 | 处置 |
|---------------|------|
| 0 error | ✅ 进 Phase 1 |
| 有 R-EVENTS-01/02 | ❌ 退回 interaction-designer 补 events.actions |
| 有 R-STATUS-02/03 | ❌ 退回 design-planner 补 styles / visualStates |
| 仅 W 级（warning） | ⚠️ 可以继续，但记录到对话回复中 |

**绝不允许"将就开始"**——上游漏的字段在 executor 阶段无法补回来（executor 不再做翻译）。

### 0.3 主题门禁

```
theme/check { projectId }
→ customized = false → 异常情况，退回 design-planner（主题是 planner 的职责）
→ customized = true → 继续
```

---

## Phase 1：素材应用（每屏一轮）

> 这是 executor 阶段唯一会修改 schema 的实质动作——其他阶段已经把结构/样式做好了，这里只补素材。

对每屏：

### Step 1：列出本屏需要素材的节点

```
1. query/screen_schema { projectId, screenId }
2. 遍历节点树，找出所有声明了素材需求的节点：
   - meta.design.visualRef 有值（指向素材描述）
   - 或 styles.backgroundImage 是占位（如 "url(placeholder)"）
   - 或 design-planner 阶段在 meta 里明确标记了 "needsMaterial"
3. 列出对话回复中：本屏需要素材的节点清单
```

### Step 2：逐节点调用 material-painter

```
对每个素材节点：
  Skill("material-painter") + 上下文：
    - projectId, screenId, nodeId
    - 节点的尺寸（从 styles 读 width/height）
    - 节点的 design 意图（从 meta.design.summary / rationale 读）
    - 视觉风格指引（从 project.meta.styleDirection + ThemeConfig 读）
    - 应用方式：默认 export_and_apply（material-painter 内部会走 canvas → PNG → 槽位绑定）
```

> ⚠️ material-painter 内部已经处理了：
> - canvas 绘制 / SVG 内联的选择
> - `node_material_slots` 槽位建立（让编辑器可识别 / 可替换）
> - export_and_apply 时的样式覆盖清理（避免追加污染）
> 
> executor 只负责"调度"，不负责"绘制"。

### Step 3：每节点收尾

每个素材节点完成后：

```
meta/set_node_status {
  projectId, nodeId,
  status: { phase: "verified" }
}
⚠️ 不传 ready 字段——ready 由 integrity 自动核验，不允许人工自报
```

### Step 4：本屏小结 + 截图

```
1. query/integrity { projectId, screenId } → 必须 0 error 才能进下一屏
2. generate_snapshots { projectId, screenIds: [screenId], mode: "viewport" }
3. 对照 project.meta.styleDirection / screen.meta.design 的设计意图，
   在对话中给用户描述"看到了什么"——是否符合预期
```

---

## Phase 2：终验

所有屏 Phase 1 完成后：

### 2.1 全项目 integrity

```
query/integrity { projectId }
→ 必须 0 error
```

任何 error → 定位到具体节点 → 修复（不一定退回上游，因为 executor 也能改 schema，只是不该改）→ 重跑 integrity。

**修复优先级**：
- `R-EVENTS-*` → executor 不该自己补，退回 interaction-designer
- `R-STATUS-02/03 (styles/visualStates)` → executor 不该自己补，退回 design-planner
- `R-PHASE-01` (phase=verified 但 ready 还有 false) → 这是 executor 漏调 `meta/set_node_status` 的责任，自己修

### 2.2 项目级状态

```
meta/set_project {
  projectId,
  patch: { status?: { phase: "verified" } }   // 如果你的 ProjectMeta 设计了 status 字段
}
```

> 注：当前 `ProjectMeta` 没有 status 字段（只有 `targetUser/coreScenarios/...`）。如果需要可以追加，但不是必须。

### 2.3 完整截图集

```
generate_snapshots {
  projectId,
  screenIds: [所有屏],
  mode: "frame"   // 完整页面，不只是首屏
}
```

返回的 URL 集合给用户看 / 交付物入档。

---

## Phase 3：交付

```
1. 在对话中给用户:
   - 项目链接（design-api 项目 URL）
   - 所有屏的快照 URL
   - integrity 报告摘要（0 error，X warning 是什么）
2. 询问用户验收，等用户确认 / 反馈
3. 用户反馈调整 → 单点修（不重跑整个 executor）
   - 调样式：直接 style/update
   - 加节点：直接 element/add
   - 改素材：再调 material-painter 局部
   - 改交互：退回 interaction-designer 局部
```

---

## ⛔ Schema-First 红线

1. **绝不读 design-registry / design-plan/*.md / interaction-design/*.md**：这些产物在 Schema-First 改造后已废弃，schema 是唯一信息源。
2. **绝不调 page-builder**：page-builder 子技能在 Schema-First 改造后从 executor 链路移除——结构/样式/事件已经由 planner / designer 直接落 schema。
3. **绝不"翻译"**：executor 看到 schema 里没有的事，不试图从某个 ref 文档"补"出来——直接退回上游。
4. **不允许人工标 ready/checklist**：ready 由 integrity 自动核验，executor 只调 `meta/set_node_status` 改 phase，不传 ready。
5. **integrity 不通过不算交付**：不能"差不多了就给用户看"——0 error 是硬约束。

---

## 与其他技能的关系

```
product-analyst → interaction-designer → design-planner → design-executor
                                                          ↓
                                                  Skill("material-painter")
                                                  （唯一被 executor 委托的子技能）
```

> ❌ 旧版 `Skill("page-builder")` 不再被 executor 调用。如果 executor 阶段发现需要补节点/样式/事件，**退回上游对应阶段**，而不是自己越权。

---

## 跨会话继续

```
1. query/integrity { projectId } → 列出尚未 verified 的节点
2. query/list_screens → 找第一个 screen.meta.status.phase ≠ "verified" 的屏
3. 从该屏 Phase 1 Step 1 继续
```

不依赖任何文件——schema 即进度。

---

## references/

> ⚠️ 旧版 references 在 Schema-First 改造后**已不再使用**，等 P3 一起删：
> - `references/execution-rules.md`（元素类型映射、素材决策树等——交互/样式翻译已上移到 designer/planner）
> - `references/sub-skill-templates.md`（page-builder 上下文模板——已不再调 page-builder）
> - `references/checklist-standards.md`（checklist 验证——已被 integrity 取代）
> - `../common/references/stage-gate.md`（registry 时代的门禁规范）

executor 现在不再需要任何前置参考文档——所有规则在本 SKILL.md 内。
