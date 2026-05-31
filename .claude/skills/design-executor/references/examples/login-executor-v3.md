# 例：登录页 v3 executor QA 样板

> 这是 design-executor v3 完整样板：从 Phase 0 入场 → Phase 1 挂任务 → Phase 2 跑每个 QA 任务 → Phase 3 交付。
>
> 配套 design 端样板：`../../design-planner/references/examples/login-design-v3.md`。
> v3 起 executor 不画素材、不写 styles——只做 QA 摄影师。

---

## 0. 样板项目

- 项目：校园社交-登录页 demo（同 design 样板）
- 上游 design-planner 已完成 v3 8-Phase（含自跑 material-painter 画 BrandLogo / 装饰素材 + applyMaterialDesign 落 9 项 background-* + self-review.md 5 维评分都 ≥ 4 + handover.md）
- 单屏：00-login

---

## Phase 0：入场门禁（六查）

```
1. query/list_projects → projectId=d84c140e-...
2. query/project_info { projectId } → 入场门禁六查
   ① project.meta.{targetUser/coreScenarios/styleDirection/modules/navigation} ✅
   ② project.meta.globalConcerns 5 类齐 ✅
   ③ project.theme.customized=true 且 theme/validate 0 error ✅
   ④ 屏 00-login phase="designed" ✅
   ⑤ design 阶段 plan 全部 done/skipped ✅
   ⑥ query/integrity { projectId } 0 error ✅
3. theme/get { projectId } → 拿 ThemeConfig（仅供截图与 token 比对参考，executor 不动 token）
4. query/list_screens → 过滤出 phase="designed" 的屏 → [00-login]
5. query/list_open_challenges { targetStage: 'design' } → 0 个（design 阶段无 open challenge）
6. query/next_pending_task { scope: 'auto' } → null（首次进 executor，进 Phase 1）
```

---

## Phase 1：挂任务清单（首次）

### 1.1 必读

```
read_file: ../../STAGE-CONTRACT.md §0.1.7 + §5
read_file: references/methodology/02-snapshot-verification.md
read_file: references/methodology/03-issue-routing.md
read_file: ../design-planner/references/note-templates/handover.template.md  // design 移交骨架
```

### 1.2 扫描 design 移交产物

```
query/screen_schema { projectId, screenId: '00-login' }

v3 ★ 检查（输出到 md：handover-check.md）：
  ① 所有 materialSpec 非空的节点：
     - BrandLogo.materialProjectId = "mat_brand_logo_001" ✅
     - DecorBlob1.materialProjectId = "mat_decor_blob_1_001" ✅
     - DecorBlob2.materialProjectId = "mat_decor_blob_2_001" ✅
  ② 9 项 background-* 都齐：
     - BrandLogo.styles：9 项齐 ✅
     - DecorBlob1.styles：9 项齐 ✅
     - DecorBlob2.styles：缺 imageRendering ⚠️ → 暂记录,Phase 2 退回 design
  ③ design 移交资料：
     - design/00-login/briefing.md ✅
     - design/00-login/concept.md ✅
     - design/00-login/strategy.md ✅
     - design/00-login/self-review.md（5 维评分都 ≥ 4）✅
     - design/system/handover.md ✅
```

### 1.3 挂任务

```jsonc
// === 屏级（00-login）===
meta/add_plan_tasks {
  projectId,
  scope: 'screen',
  screenId: '00-login',
  tasks: [
    { id: 'E-00-login-handover-check',
      title: '核对 design 移交：self-review/handover/materialProjectId/9 项 background-* 完整',
      stage: 'executor', status: 'pending' },
    { id: 'E-00-login-snapshot',
      title: '多 viewport + Frame 长图 + 各 visualState 截图',
      stage: 'executor', status: 'pending' },
    { id: 'E-00-login-qa-diff',
      title: '截图与 design self-review.md / handover.md / visualConcept 5 维度对账',
      stage: 'executor', status: 'pending' },
    { id: 'E-00-login-verified',
      title: '0 差异时标 phase=verified；有差异创建 D-X-fix-* 退回 design',
      stage: 'executor', status: 'pending',
      expectedArtifacts: [
        { kind: 'eachItem', path: 'meta.status', check: { kind: 'nonEmpty', path: '$.phase' } }
      ] }
  ]
}

// === 项目级 ===
meta/add_plan_tasks {
  projectId, scope: 'project',
  tasks: [
    { id: 'E-cross-screen-snapshot', title: '跨屏一致性核对', stage: 'executor', status: 'pending' },
    { id: 'E-integrity', title: '全项目 integrity 终验（0 error）', stage: 'executor', status: 'pending' },
    { id: 'E-snapshots', title: '全屏完整截图集 + handover 给用户', stage: 'executor', status: 'pending' }
  ]
}
```

---

## Phase 2：按 plan 任务驱动（每轮一个最小任务）

### 任务 1：E-00-login-handover-check

**md：`executor/00-login/handover-check.md`**（按 references/note-templates/handover-check.template.md 写）

核心结论：
```markdown
## 5. 最终结论
- 检查结果：❌ 1 项不通过
- 不通过项：
  - DecorBlob2.styles 缺 imageRendering（应有 'auto' 或 'crisp-edges'）
- 退回任务：D-00-login-fix-DecorBlob2-bg9
- 下一步：等 design 修
```

**MCP 调用**：
```jsonc
// 1. 创建退回任务
meta/add_plan_tasks {
  scope: 'screen', screenId: '00-login',
  tasks: [{
    id: 'D-00-login-fix-DecorBlob2-bg9',
    title: 'design 补 DecorBlob2.styles.imageRendering（applyMaterialDesign 9 项漏 1 项）',
    stage: 'design', status: 'pending',
    notes: '由 executor handover-check 退回；详 executor/00-login/handover-check.md §5'
  }]
}

// 2. executor 任务标 blocked
meta/update_plan_task {
  taskId: 'E-00-login-handover-check',
  patch: {
    status: 'blocked',
    blockedReason: '等 design 修 D-00-login-fix-DecorBlob2-bg9',
    notes: 'md: executor/00-login/handover-check.md'
  }
}
```

**通知用户**：
> 发现 design 漏写 1 项 background-*（DecorBlob2 缺 imageRendering），已挂 D-00-login-fix-DecorBlob2-bg9 退回 design。请切到 design-planner 处理。

---

### （等用户切到 design-planner 修完后）

design 修了 imageRendering=auto，标任务 done。用户切回 executor。

```
query/blocked_tasks → 看到 E-00-login-handover-check 仍 blocked
重读 schema → 验证 DecorBlob2.styles.imageRendering='auto' ✅
```

```jsonc
meta/update_plan_task {
  taskId: 'E-00-login-handover-check',
  patch: { status: 'done', notes: 'design 已补 imageRendering，9 项齐' }
}
```

---

### 任务 2：E-00-login-snapshot

**MCP 调用**：
```jsonc
// 多 viewport 截图
generate_snapshots {
  projectId, screenIds: ['00-login'],
  mode: 'viewport',
  viewportIds: ['mobile-portrait', 'mobile-landscape', 'tablet']
} → 拿到 3 张 PNG URL

// Frame 长图（如有滚动内容）
generate_snapshots {
  projectId, screenIds: ['00-login'],
  mode: 'frame'
} → 拿到 1 张长图

// 各 visualState 截图（手动切 state.view 后截）
// 例：state.view.errors.phone = '请输入正确手机号' 后截 → 拿 invalid 态截图
// 例：state.view.dataSources.login.status = 'pending' 后截 → 拿 loading 态截图
```

**md：`executor/00-login/snapshot.md`**（按 snapshot.template.md 写）

```markdown
## 截图集
- mobile-portrait: snapshots/00-login-mobile.png（375×812）
- mobile-landscape: snapshots/00-login-mobile-landscape.png
- tablet: snapshots/00-login-tablet.png（768×1024）
- frame: snapshots/00-login-frame.png（含完整滚动）
- invalid (phone): snapshots/00-login-invalid-phone.png
- loading: snapshots/00-login-loading.png
- error: snapshots/00-login-error.png
```

**MCP 落 schema**：
```jsonc
meta/update_plan_task {
  taskId: 'E-00-login-snapshot',
  patch: { status: 'done', notes: 'md: executor/00-login/snapshot.md' }
}
```

---

### 任务 3：E-00-login-qa-diff（v3 ★ 核心）

**md：`executor/00-login/qa-diff.md`**（按 qa-diff.template.md 写 5 维度对账）

核心对账（节选）：
```markdown
### 3.1 识别
| 检查项 | design 自评 | 截图实测 | 一致 |
|--------|------------|---------|-----|
| PrimaryButton 可识别（≥48px、对比足）| 5/5 | 5/5 | ✅ |
| PolicyCheckbox 可点（v3 craft 重设的 label-button 结构）| 5/5 | 4/5（图标偏小）| ⚠️ 接受 |

### 3.2 层次
| 检查项 | design 自评 | 截图实测 | 一致 |
|--------|------------|---------|-----|
| BrandLogo + WelcomeText 主角第 1 | ✅ | ✅ | ✅ |
| 主角与次主角 weight 差 ≥ 30 | ✅ | ✅ | ✅ |

### 3.3 状态
| 节点/状态 | design 期望 | 截图实测 | 一致 |
|----------|------------|---------|-----|
| PrimaryButton hover | translateY -2px + shadow lg | translateY -2px + shadow lg | ✅ |
| Input invalid | error border + error text | ✅ | ✅ |
| 整屏 loading | 骨架可见 | ✅ | ✅ |
| 整屏 error | 错误页可见 | ✅ | ✅ |

### 3.4 契合
- mood "信任感、清新友好" → 截图传达 4.5/5（✅）
- theme.intent.tone="trustworthy" → 蓝紫调 + 极少装饰（geometric-line 系统）✅

### 3.5 情绪
- 主 mood "信任、清新" 截图传达明显 ✅
- 无情绪冲突 ✅
```

**结论**：5 维度全部通过（个别项 4/5 但属可接受范围，已 notes）。0 阻断差异。

**MCP 落 schema**：
```jsonc
meta/update_plan_task {
  taskId: 'E-00-login-qa-diff',
  patch: { status: 'done', notes: '5 维度对账：0 阻断差异，2 项 4/5 已记录' }
}
```

---

### 任务 4：E-00-login-verified

**md：`executor/00-login/verified.md`**

```markdown
## ★ 沉淀到 schema 的结论
- 屏 phase=verified
- 节点全部 phase=verified（rootNode 子树 + 装饰节点 + 视觉容器节点）
```

**MCP 调用**：
```jsonc
// 1. 屏级 phase
meta/set_screen { projectId, screenId: '00-login',
  patch: { meta: { status: { phase: 'verified', notes: 'qa-diff 5 维度通过' } } } }

// 2. 节点级 phase（遍历 rootNode 子树）
对每个节点：
meta/set_node_status { projectId, nodeId: '<id>',
  patch: { phase: 'verified' } }

// 3. 任务 done
meta/update_plan_task {
  taskId: 'E-00-login-verified',
  patch: { status: 'done', notes: 'screen + 全节点 phase=verified' }
}
```

---

## Phase 3：项目级 + 交付

### 任务 5：E-cross-screen-snapshot

单屏项目跳过（仅 00-login 一个屏）。标 skipped + notes。

### 任务 6：E-integrity

```jsonc
query/integrity { projectId } → 期望 0 error

如真 0 error：
meta/update_plan_task {
  taskId: 'E-integrity',
  patch: { status: 'done', notes: 'integrity 0 error，全项目通过' }
}

如有 R-* 错误：
按 references/methodology/03-issue-routing.md §3 路由表退回对应阶段。
```

### 任务 7：E-snapshots

```jsonc
generate_snapshots { projectId, screenIds: ['00-login'], mode: 'frame' }
→ 拿到最终交付截图 URL

md: executor/global/snapshots.md
  ## 交付截图集
  - 00-login: <CDN URL>

meta/update_plan_task {
  taskId: 'E-snapshots',
  patch: { status: 'done', notes: '全屏 frame 长图截图集，handover 给用户' }
}
```

---

## 交付汇报

```markdown
✅ 校园社交-登录 v3 交付完成

📦 schema 状态
- 全屏 phase=verified
- 全节点 phase=verified
- query/integrity 0 error

🎬 截图集
- 00-login viewport×3（mobile-portrait/landscape, tablet）
- 00-login frame 长图
- 00-login 各 visualState（invalid/loading/error）

📝 QA 报告
- 5 维度对账：✅ 全通过
- handover-check：1 项退回 design 后修复
- 跨屏一致性：N/A（单屏）

🚀 交付物
- 项目链接：<URL>
- design 移交资料：analysis-notes/<projectId>/design/
- executor QA 资料：analysis-notes/<projectId>/executor/
```

---

## v3 vs v2 对比

| 阶段 | v2 executor 做了什么 | v3 executor 做了什么 |
|------|----------------------|----------------------|
| 入场 | 同 | 同 |
| 挂任务 | inventory + N 个 mat-* + N 个 svg-* + snapshot + verified + integrity + handover | handover-check + snapshot + qa-diff + verified + integrity + snapshots（**v3 任务总数减半**）|
| 素材绘制 | 调 material-painter 画 N 个 PNG | ❌ **v3 不画**（design 已画完）|
| 写 styles | 写 9 项 background-* | ❌ **v3 不写** |
| 截图核对 | "看起来不错就过" | **5 维度逐项对账（识别/层次/状态/契合/情绪）** |
| 发现 design 错 | 部分自己改 | **全部退回 D-X-fix-***，不亲自补 |
| 交付 | 项目链接 + 截图 + integrity 摘要 | 同 + QA 报告 5 维度评分 |

---

## v3 红线（再次强调）

- ❌ 调 material-painter 子技能 → 越权（v3 已断绝）
- ❌ 写 node.styles 任何字段（含 9 项 background-*）→ 越权（v3 改 design 写）
- ❌ 写 node.materialProjectId / props.src / svgContent → 越权
- ❌ 看到 design 漏的字段自己补 → 越权（必须创建 D-X-fix-* 退回）
- ❌ 看截图 "差不多就过" 没逐项对照 5 维度 → 漏验证
- ❌ 跳过 visualState 截图（只截 default）→ 漏验证
- ❌ 跨 viewport 不一致没 record → 漏验证
