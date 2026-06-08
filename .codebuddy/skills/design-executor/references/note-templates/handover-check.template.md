# template：handover-check.template.md（v3 ★ 新增）

> 对应任务：`E-X-handover-check`
> 路径：`analysis-notes/<projectId>/executor/<screenId>/handover-check.md`
> 用途：v3 起 design-planner 自跑 painter + 落地素材后，executor 入场第一件事是核对 design 移交资料完整性。

---

## 1. 头部（强制）

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-handover-check
> 对应 schema 字段：（仅核对，不写 schema；如发现差异创建 D-X-fix-* 任务退回 design-planner）
```

---

## 2. 核对项（4 类，逐项打勾）

### 2.1 design 移交文档完整性

| 文件 | 必有 | 实际 | 通过 |
|------|------|------|------|
| `design/<screenId>/briefing.md` | ✅ | ? | ☐ |
| `design/<screenId>/concept.md` | ✅ | ? | ☐ |
| `design/<screenId>/strategy.md` | ✅ | ? | ☐ |
| `design/<screenId>/self-review.md`（5 维评分都 ≥ 4） | ✅ | ? | ☐ |
| `design/system/handover.md`（首屏交付时） | ✅ | ? | ☐ |

任何一项缺 → 退回 design-planner（D-X-handover-fix）。

### 2.2 schema：v3 字段非空

```jsonc
query/screen_schema { projectId, screenId } 后核对：

screen.meta.design.briefing        非空？     ☐
screen.meta.design.visualConcept   非空？     ☐
screen.meta.design.visualStrategy  非空？     ☐
screen.meta.design.componentBudgets 非空？    ☐
screen.meta.design.palette         非空？     ☐
screen.meta.design.layers          数组 ≥ 1？ ☐
```

任何一项空 → 退回 design-planner。

### 2.3 schema：素材应用完整性（v3 ★ 关键核对）

遍历 rootNode 子树 + screen.overlays：

```
对每个 meta.design.materialSpec 非空的节点 N：
  ☐ N.materialProjectId 已绑定（design 自跑 painter 落地）
  ☐ N.styles.backgroundImage 已写
  ☐ N.styles.backgroundSize 已写（cover / contain / 具体值）
  ☐ N.styles.backgroundPosition 已写
  ☐ N.styles.backgroundRepeat 已写（通常 no-repeat）
  ☐ N.styles.backgroundColor 已写（透明素材通常 transparent）
  ☐ N.styles.backgroundOrigin 已写
  ☐ N.styles.backgroundClip 已写
  ☐ N.styles.backgroundAttachment 已写
  ☐ N.styles.imageRendering 已写（icon 类用 crisp-edges，普通用 auto）

对每个 type='img' 的节点 M：
  ☐ M.props.src 非空（design 已应用）

⚠️ v3 ★ 任何一项缺 → 退回 design-planner（不亲自补）
```

### 2.4 schema：visualStates 完备性

```
对每个有 events.click / 是 button / input / 复合控件的节点：
  ☐ 至少有 default + 1 个交互态（hover / pressed / active 之一）
  ☐ 表单类节点必有 disabled 态
  ☐ 输入类节点必有 focus + invalid 态
```

任何一项缺 → 退回 design-planner。

---

## 3. 推理过程（可选）

如发现非黑白的差异（比如 9 项 background-* 写了但有 1 项明显错），在这里详述：

```
节点 N（BrandLogo）的核对：
- backgroundImage: url(...mat_xxx.png) ✅
- backgroundSize: "16px"  ⚠️ 但参考框 64×64，应该是 "contain" 或 "100%"
- ...

判断：design 写错 backgroundSize → 退回 D-X-fix-BrandLogo-bgsize
```

---

## 4. ★ 沉淀到 schema 的结论（v3 ★：通常不写 schema）

handover-check 任务**通常只写 md，不落 schema**——核对结论由后续任务承接：
- 全通过 → 进 `E-X-snapshot` 截图
- 任一不通过 → 调 `meta/add_plan_tasks` 创建 1 条 `D-X-fix-<节点>-<问题>` 退回 design-planner

```jsonc
// 仅当有差异时调用，把退回任务挂到 design 阶段
meta/add_plan_tasks {
  projectId,
  scope: 'screen',
  screenId: '<screenId>',
  tasks: [
    { id: 'D-<X>-fix-<node>-<issue>',
      title: 'design 阶段未完成 X：<具体描述>',
      stage: 'design',
      status: 'pending',
      blockedBy: [],
      notes: '由 executor 退回；详 executor/<screenId>/handover-check.md §2.X' }
  ]
}

// 然后把当前 executor 任务标 blocked
meta/update_plan_task {
  taskId: 'E-<X>-handover-check',
  patch: { status: 'blocked', blockedReason: '等待 design 修 D-<X>-fix-*' }
}
```

---

## 5. 最终结论（必填）

```markdown
- 检查结果：✅ 全通过 / ❌ N 项不通过
- 不通过项：
  - <列出每条具体问题，引用 §2.X>
- 退回任务：D-<X>-fix-<节点>-<问题>（如有）
- 下一步：✅ 进 E-X-snapshot / ❌ 等 design 修
```

---

## 红线

- ❌ 自己补 design 漏的字段（含 9 项 background-*）→ 越权
- ❌ 看到差异不退回 → 假完成
- ❌ 退回任务没写清楚问题 → design 不知道修什么
