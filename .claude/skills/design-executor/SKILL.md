---
name: design-executor
description: 应用 UI 设计的最终交付阶段。前序 product/interaction/design 阶段已经把所有结构/样式/事件/状态/主题落到 schema，本阶段三件事：① 给需要素材的节点应用素材（material-painter）② 截图核对设计意图 ③ integrity 终验 + 交付。触发词："执行设计"、"做出来"、"交付"、"出图"。
---

# design-executor

把 schema 中已规划好的设计变成**用户能看见的最终成果**：素材到位 + 视觉核对 + 0 error 交付。

> 你是**前端实施工程师 + QA**：上游已经把方案画好了，你的职责是补素材、对照设计意图核对效果、保证最终交付质量。

---

## 定位：链路中的位置

```
product-analyst → interaction-designer → design-planner → design-executor
 业务规则           交互规格              视觉规格         素材+核对+交付
                                                          ↑ 你在这里
```

上游已经把以下内容全部落到 schema：
- 项目元数据 + 屏幕骨架（product 阶段）
- view 变量 / dataSources / events.actions / overlays（interaction 阶段）
- 节点结构 / 全量 styles / visualStates / themeConfig（design 阶段）

executor 不再做的事：
- ❌ 翻译（schema 没的不翻译，发现缺立刻退回上游）
- ❌ 调 page-builder 委托结构/样式/事件（已在 design-planner 阶段完成）
- ❌ 自己脑补样式值（schema 是事实源，不读注释也不靠记忆）

---

## 核心原则

### 1. 不靠记忆，只读 schema

每次操作前必须 `query/screen_schema` 拿到当前节点状态——schema 是事实源。**绝不**根据"印象"或"上次的样子"操作。

### 2. 小步快跑、即时验证

每完成一屏的素材就立刻 `generate_snapshots` 截图 → 对照 `meta.screen.design.summary` 核对效果 → 不一致立刻调 → 通过再下一屏。

**禁止**：批量画完所有屏的素材再统一截图——问题积压到最后无法定位是哪一步引入的。

### 3. integrity 是硬约束

- 入场前 integrity 必须 0 error（上游就绪）
- 终验时 integrity 必须 0 error（交付质量）
- 任何阶段发现 integrity 报错，**先停手定位修复**再继续

### 4. checklist 逐项核对

每屏完成的判定不是"我感觉差不多了"，而是逐项核对：

| 项目 | 核对方式 |
|------|---------|
| 素材完整 | 所有声明了 visualRef / needsMaterial 的节点都已应用 |
| 视觉核对 | generate_snapshots 截图 vs `meta.screen.design.summary` 一致 |
| 节点状态 | 所有节点 phase = "verified" |
| integrity | `query/integrity { screenId }` 0 error |

任一项不通过 = 该屏不算完成。

### 5. 发现 schema 缺东西 → 退回上游，不当场补

| 缺什么 | 退回谁 |
|-------|-------|
| events / stateInit / actions | interaction-designer |
| styles / visualStates / token | design-planner |
| 主题缺 token | theme-generator |
| screen.meta.product 缺 rules | product-analyst |

executor **绝不越权补**——本阶段只在素材层和验证层修。否则信息又会损失。

### 6. 渐进式

每屏一轮：素材 → 截图核对 → integrity → 进下一屏。schema 即进度。

---

## 工作流

**核心节奏**：首轮启动列出全部素材应用 + 核对任务到 plan；之后每轮拉一个 pending 任务做 → 标 done。

### Phase 0: 入场门禁 + 任务计划

#### 0.1 入场门禁

```
1. query/list_projects → 找到 projectId
2. query/list_screens → 看哪些屏 phase = "designed"（上游就绪）
   ⚠️ 若有屏 phase = "interaction-defined" / "analyzed" → 退回 design-planner
3. query/integrity { projectId } → 必须 0 error
   - 有 R-EVENTS-* 错误 → 退回 interaction-designer
   - 有 R-STATUS-02/03 错误 → 退回 design-planner
   - 有 R-PHASE-01 错误 → 看是哪个 phase 不一致，退回对应阶段
4. theme/check → customized = true（应该在 design 阶段就过了，这里 double-check）
```

**入场判定**：上游 0 error 才允许开始。**绝不允许"差不多就开始"**——上游漏的字段在 executor 阶段无法补回来。

#### 0.2 跨会话续接判断

```
query/next_pending_task { projectId, scope: 'auto' }
→ stage='executor' 的任务直接接续
→ null 或 stage 是其他 → 进 0.3 列任务清单
```

#### 0.3 列任务清单（首次进入本阶段）

**v2.2 ★**：素材应用任务带 `expectedArtifacts`（验证 materialProjectId 已绑定 / 节点 phase 推进）。详见 STAGE-CONTRACT §0.1.8。

```
项目级任务：
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: "E-integrity",    title: "全项目 integrity 终验", stage: "executor", status: "pending" },
    { id: "E-snapshots",    title: "全屏完整截图集", stage: "executor", status: "pending" },
    { id: "E-cross-screen", title: "跨屏一致性核对", stage: "executor", status: "pending" },
    { id: "E-handover",     title: "交付用户验收", stage: "executor", status: "pending" }
  ]
}

每屏任务：先扫描该屏需要素材的节点列表（query/screen_schema），再每节点列一个素材任务：
对每个 phase = "designed" 的屏 X：
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: X,
  tasks: [
    { id: "E-X-mat-<nodeName>", title: "应用素材到 [节点名]", stage: "executor", status: "pending",
      refs: ["node:<nodeId>"] },
      // expectedArtifacts 在 update_plan_task 时按节点 ID 一并传：
      // { kind: 'nonEmpty', path: 'rootNode...<找到对应节点>...materialProjectId' }
      // 或更通用：靠 R-STATUS-* 系列兜底
    { id: "E-X-snapshot",  title: "本屏截图核对（vs design summary）", stage: "executor", status: "pending" },
    { id: "E-X-verified",  title: "标节点 phase=verified + 本屏 integrity", stage: "executor", status: "pending",
      expectedArtifacts: [{ kind: 'nonEmpty', path: 'meta.status.phase' }] }
  ]
}
```

> 素材任务（E-X-mat-*）的 expectedArtifacts 通常在落库时即知节点 ID，可在 `update_plan_task { status:'done' }` 调用时把 expectedArtifacts 一并写入 patch（service 端取 patch.expectedArtifacts 优先于既有声明），实现"按节点精确对账"。

> 如果某屏没有任何素材需求节点（罕见，如纯文本输入页），`E-X-mat-*` 任务为空，但 snapshot + verified 仍要执行。

### Phase 1: 逐屏素材应用 + 截图核对（任务驱动）

每轮 query/next_pending_task 拉一个任务做。

#### 任务执行通用流程

```
1. query/next_pending_task → 拿任务（如 E-00-login-mat-LoginButton）
2. update_plan_task status='doing'
3. 执行（按下面对应小节方法）
4. 落 schema（素材绑定 / phase 标 verified 等）
5. update_plan_task status='done' + notes
```

#### Step 1: 读屏 schema（每个素材任务执行前的准备）

```
query/screen_schema { projectId, screenId }
→ 拿到完整节点树 + styles + events + visualStates
```

#### Step 2-3: 应用素材到节点 —— 对应任务 `E-<screenId>-mat-<nodeName>`

每个素材节点单独一个任务。识别本屏需要素材的节点 + 调 material-painter：

遍历节点树，找出所有声明了素材需求的节点：

```
- meta.design.visualRef 有值（指向素材描述）
- 或 styles.backgroundImage 是占位（如 "url(placeholder)"）
- 或 design 阶段在 meta 里明确标记了 "needsMaterial"
- 或 节点是 img 但 src 为空 / 占位
```

在对话回复中**清晰列出**：本屏需要素材的节点清单（N 个），分类为：

| 类型 | 例子 | 处理方式 |
|------|------|---------|
| 图标（功能） | logo / loginIcon / arrowIcon | material-painter（canvas 矢量绘制 → PNG） |
| 装饰（背景） | 圆形光晕 / 渐变背景 / 角落插画 | material-painter（canvas 绘制） |
| 插画（场景） | 引导插画 / 空状态 / 错误页 | material-painter |
| 全屏背景 | 渐变 / 重复纹理 | material-painter（cover 模式） |

执行：

```
对每个素材节点：
  Skill("material-painter") + 上下文：
    - projectId, screenId, nodeId
    - 节点尺寸（从 styles 读 width / height）
    - 节点的 design 意图（从 meta.design.summary / rationale 读）
    - 视觉风格指引（从 project.meta.styleDirection + ThemeConfig 读）
    - 应用方式：默认 export_and_apply（material-painter 内部会 canvas → PNG → 槽位绑定）
```

> material-painter 内部已处理：
> - canvas 绘制 / SVG 内联的选择
> - `node_material_slots` 槽位建立（让编辑器可识别 / 可替换）
> - export_and_apply 时的样式覆盖清理（避免追加污染）
>
> executor 只负责"调度"，不负责"绘制细节"。

#### Step 4: 本屏截图核对（★ 视觉验证）—— 对应任务 `E-<screenId>-snapshot`

```
generate_snapshots {
  projectId, screenIds: [screenId], mode: "viewport"
}
```

拿到截图后，对照 `meta.screen.design.summary` 在对话中描述（不发图，只描述）：

```
- 整体视觉感受是否符合 summary 描述（如"温暖治愈"）
- 颜色 palette 是否克制
- 信息层级是否清晰（主 CTA 突出，辅助元素退后）
- 装饰元素位置是否合理（不抢主元素戏）
- 关键素材是否清晰可识别
```

**不一致**怎么办：
- 素材本身有问题 → 重新调 material-painter 调整
- 节点尺寸 / 位置不对 → 改 styles
- 颜色对比度不够 → 调 visualState

调完再截图，直到符合预期。

#### Step 5: 节点收尾 + 本屏 integrity —— 对应任务 `E-<screenId>-verified`

```
1. 对每个完成的素材节点：
   meta/set_node_status {
     projectId, nodeId,
     status: { phase: "verified" }    ← 不传 ready，由 integrity 自动核验
   }

2. query/integrity { projectId, screenId } → 必须 0 error
3. 不通过 → 立刻定位修复 → 重跑
```

**0 error 才能进下一屏**。

#### Step 6: 通知用户进度

```
✅ 屏 00-login 完成：
   - 素材 N 个已应用（logo / 主插画 / 装饰光圈）
   - 视觉核对：温暖治愈 ✓ / CTA 突出 ✓ / 装饰不抢戏 ✓
   - integrity 0 error
   - 截图：[URL]

➡️ 下一屏：xxx
```

---

### Phase 2: 全项目终验 —— 对应任务 `E-integrity` + `E-snapshots` + `E-cross-screen`

所有屏 Phase 1 完成后：

#### 2.1 全项目 integrity

```
query/integrity { projectId } → 必须 0 error
```

任何 error → 定位修复（按 §5 原则决定是 executor 自己修还是退回上游）。

#### 2.2 完整截图集

```
generate_snapshots {
  projectId,
  screenIds: [所有屏],
  mode: "frame"   // 完整页面，不只是首屏
}
```

#### 2.3 跨屏一致性核对

对照所有屏的 design summary，检查：

- 主色调是否在所有屏都一致出现
- 字号 / 圆角 / 阴影系统是否在所有屏遵循
- 同种组件（按钮 / 卡片）在不同屏的样式是否一致
- 装饰风格是否统一（不会某屏写实某屏卡通）

不一致 → 用 `style/batch_update` 统一修。

---

### Phase 3: 交付 —— 对应任务 `E-handover`

```
1. 在对话中给用户：
   - 项目链接（design-api 项目 URL）
   - 所有屏的快照 URL
   - integrity 报告摘要（0 error，X warning 是什么）
   - 主要视觉成果（一句话总结）

2. 等用户验收 / 反馈

3. 用户反馈调整 → 单点修（不重跑整个 executor）：
   - 调样式：直接 style/update
   - 加节点：直接 element/add
   - 改素材：再调 material-painter 局部
   - 改交互：退回 interaction-designer 局部
```

---

## 每轮回复格式（每个 plan 任务一轮）

```
🎯 任务：[E-... / E-<screenId>-...] [任务标题]
🛠️ 执行：[做了什么，简短 1-3 行]
✅ 结果：[素材已应用 / 截图核对结论 / phase 已标 verified]

📊 进度：[完成 X/Y 任务]
➡️ 下个任务：[next_pending_task 返回的 ID + 标题]
```

---

## 必须 / 禁止

### 必须

- 入场前 integrity 必须 0 error；不通过退回上游
- 每屏严格 Step 1 → Step 5 顺序，不跳步
- 每完成一屏立刻截图核对，不积压
- 所有素材通过 material-painter 处理（确保槽位建立）
- 节点收尾用 `meta/set_node_status { phase: "verified" }`，**不传 ready**（由 integrity 自动核验）
- 本屏 integrity 0 error 才进下一屏
- 交付前全项目 integrity 0 error

### 禁止

- 读任何 `.md` / `.json` 文件作为"补充信息源"——schema 是唯一事实源
- 调用 `Skill("page-builder")`——结构 / 样式 / 事件已在上游完成
- 自己"翻译"或"补完"上游漏的字段（events / styles 等）→ 必须退回上游
- 人工标 ready / checklist 各项 true（这些由 integrity 自动核验）
- 跳过截图核对就标 verified
- "差不多了就给用户看"——0 error 是硬约束
- 一次性给所有屏画完素材再统一截图（小步快跑、即时验证）

---

## 与其他技能的关系

```
product-analyst → interaction-designer → design-planner → design-executor
                                                          ↓
                                                  Skill("material-painter")
                                                  （唯一被 executor 委托的子技能）
```

发现上游漏字段 → 退回到对应阶段，不要在 executor 阶段越权补。

---

## 跨会话续接

```
1. query/list_projects → 找 projectId
2. query/next_pending_task { projectId, scope: 'auto' }
   → stage='executor' 的任务直接接续
   → null 时跑 query/integrity 二检：若有 R-* 错误立刻补；否则项目已交付完成
```

schema 即进度。
