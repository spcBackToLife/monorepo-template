# template：qa-diff.template.md（v3 ★ 新增）

> 对应任务：`E-X-qa-diff`
> 路径：`analysis-notes/<projectId>/executor/<screenId>/qa-diff.md`
> 用途：v3 核心动作——把 generate_snapshots 截图与 design 的 self-review.md / handover.md / visualConcept 对照，找差异、不补、退回。

---

## 1. 头部（强制）

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-qa-diff
> 对应 schema 字段：（仅对账，不写 schema；如发现差异创建 D-X-fix-* 退回）
```

---

## 2. 截图集（先列出本任务用到的所有截图）

```
- viewport=mobile-portrait（375×812）：snapshots/<screenId>-mobile.png
- viewport=mobile-landscape（812×375）：snapshots/<screenId>-mobile-landscape.png
- viewport=tablet（768×1024）：snapshots/<screenId>-tablet.png
- mode=frame（长图）：snapshots/<screenId>-frame.png
- visualState=loading：snapshots/<screenId>-loading.png
- visualState=error：snapshots/<screenId>-error.png
- visualState=empty：snapshots/<screenId>-empty.png
- ...
```

---

## 3. 5 维度对账（核心）

对照 `design/<screenId>/self-review.md` 的 5 维度评分（识别 / 层次 / 状态 / 契合 / 情绪），逐维度核对截图是否真的兑现了 design 的自评。

### 3.1 识别（"用户能立刻认出每个元素是干什么的吗？"）

| 检查项 | design 自评 | 截图实测 | 一致？ |
|--------|------------|---------|-------|
| 主按钮可识别（≥ 16px、对比度足够、形状典型）| 5/5 ✅ | ☐ 看截图打分 | ☐ |
| 输入框可识别（边框 / 占位符 / focus 态可见）| 5/5 ✅ | ☐ | ☐ |
| icon 含义清晰 | ?/5 | ☐ | ☐ |
| 装饰 vs 内容可分辨 | ?/5 | ☐ | ☐ |

差异列表：
- <如有：写出具体节点 + 实测分 + 期望分>

### 3.2 层次（"主角 / 配角 / 工具 视觉权重对吗？"）

| 检查项 | design 自评 | 截图实测 | 一致？ |
|--------|------------|---------|-------|
| 主角节点 weight 排第 1 | ✅ | ☐ | ☐ |
| 主角与次主角 weight 差 ≥ 30 | ✅ | ☐ | ☐ |
| 工具 / 装饰不抢戏（z-index 正确）| ✅ | ☐ | ☐ |
| layers 4 层结构清晰 | ✅ | ☐ | ☐ |

差异列表：
- <如有>

### 3.3 状态（"hover / pressed / disabled / loading / empty / error 都对吗？"）

对照 design 的 states.md，逐 visualState 核对：

| 节点 / 状态 | design 期望视觉 | 截图实测 | 一致？ |
|------------|-----------------|---------|-------|
| 主 CTA hover | translateY -2px + shadow lg | ☐ | ☐ |
| 主 CTA pressed | scale(0.98) | ☐ | ☐ |
| 主 CTA disabled | opacity 0.4 + cursor not-allowed | ☐ | ☐ |
| 输入 focus | 2px primary outline | ☐ | ☐ |
| 输入 invalid | error border + error text | ☐ | ☐ |
| 整屏 loading | 骨架屏可见 | ☐ | ☐ |
| 整屏 empty | 空态视图可见 | ☐ | ☐ |
| 整屏 error | 错误页可见 | ☐ | ☐ |

差异列表：
- <如有>

### 3.4 契合（"theme intent.tone 与实际视觉一致吗？"）

对照 `design/<screenId>/concept.md` 的 mood / 关键词 + theme.intent.tone：

```
- mood：（design 写的）
- 关键词：（3 个）
- theme tone：（minimal / trustworthy / warm / playful / premium / clean / bold / natural）
```

| 检查项 | design 自评 | 截图实测 | 一致？ |
|--------|------------|---------|-------|
| 整屏第一眼传达 mood | 5/5 ✅ | ☐ | ☐ |
| 调色与 theme tone 一致 | ✅ | ☐ | ☐ |
| 装饰风格与 tone 匹配 | ✅ | ☐ | ☐ |
| 字体节奏与 tone 匹配 | ✅ | ☐ | ☐ |

差异列表：
- <如有>

### 3.5 情绪（"用户看了会有 design 想要的情绪反应吗？"）

| 检查项 | design 自评 | 截图实测 | 一致？ |
|--------|------------|---------|-------|
| 主 mood 传达明显（信任 / 治愈 / 惊喜 / 紧迫等）| 5/5 ✅ | ☐ | ☐ |
| 无情绪冲突（如严肃场景出现 confetti）| ✅ | ☐ | ☐ |
| 微动效情绪正确（spring vs ease-out）| ✅ | ☐ | ☐ |

差异列表：
- <如有>

---

## 4. 跨 viewport 一致性（v3 ★）

如多个 viewport 截图：

| viewport | 主 CTA 显示 | 文字溢出 | 间距协调 | 一致？ |
|----------|------------|---------|---------|-------|
| mobile-portrait | ☐ | ☐ | ☐ | ☐ |
| mobile-landscape | ☐ | ☐ | ☐ | ☐ |
| tablet | ☐ | ☐ | ☐ | ☐ |

---

## 5. 差异汇总（关键产出）

```
总差异数：N

阻断级（必须退回，截图明显不符 design 自评）：
1. <节点名>-<问题>
   - 现象：（截图与 design 期望对比一句话）
   - 责任方：design-planner
   - 期望：（让 design 怎么修）
   - 退回任务 ID：D-<X>-fix-<节点>-<问题>

2. ...

非阻断（可接受，需 notes 备注）：
- <如有：design 自评略乐观，但实际可接受的小差异>
```

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// 6.1 有阻断差异时：退回 design-planner
meta/add_plan_tasks {
  projectId, scope: 'screen', screenId: '<X>',
  tasks: [
    { id: 'D-<X>-fix-<节点>-<问题>',
      title: 'design 修 X：<具体>',
      stage: 'design', status: 'pending',
      notes: '由 executor qa-diff 退回，详 executor/<X>/qa-diff.md §5' }
  ]
}

meta/update_plan_task {
  taskId: 'E-<X>-qa-diff',
  patch: {
    status: 'blocked',
    blockedReason: '等 design 修 D-<X>-fix-* (N 条)'
  }
}

// 6.2 无差异时：直接 done，进 E-X-verified
meta/update_plan_task {
  taskId: 'E-<X>-qa-diff',
  patch: {
    status: 'done',
    notes: '5 维度对账全通过，0 差异'
  }
}
```

---

## 红线

- ❌ "看起来不错" 没逐项核对 5 维度 → 任务回退
- ❌ 发现差异自己改 → 越权（v3 ★）
- ❌ 发现差异不退回 → 假完成
- ❌ 退回任务没写清楚截图位置 / design 期望 / 责任方 → design 不知道修什么
- ❌ 跳过 visualState 核对（只截 default 态）→ 漏验证
- ❌ 跳过跨 viewport 核对（如有多 viewport）→ 漏验证
