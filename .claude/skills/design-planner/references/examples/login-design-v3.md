# 例：登录页 v3 完整设计跑通样板

> 这是 v3 完整样板：从 Phase A 取景 → Phase B 概念 → Phase C 策略 → Phase D 任务自创 → Phase E 创作 → Phase F 自审 → Phase G audit → Phase H 出场 全跑一遍。
>
> 每个 Phase 给：①任务怎么挂 ②md 写什么 ③schema 落什么 ④自审评分。
>
> 第一次执行某类任务、不确定深度时必读本样板。

---

## 0. 样板项目

- 项目：校园社交-登录页 demo
- theme.intent：warm-minimal（暖白极简 + 蓝紫强调）
- 单屏：00-login

---

## Phase 1：挂 plan tasks（首次进入本阶段）

```jsonc
meta/add_plan_tasks { projectId, scope: 'screen', screenId: '00-login', tasks: [
  // === Phase A/B/C/D 4 个前置任务（必须按 A→B→C→D 顺序）===
  { id: "D-00-login-briefing",      title: "Phase A 取景", expectedArtifacts: [{ kind: 'nonEmpty', path: 'meta.design.briefing' }] },
  { id: "D-00-login-concept",       title: "Phase B 视觉概念", expectedArtifacts: [{ kind: 'nonEmpty', path: 'meta.design.visualConcept' }] },
  { id: "D-00-login-strategy",      title: "Phase C 视觉策略 5 维", expectedArtifacts: [{ kind: 'nonEmpty', path: 'meta.design.visualStrategy' }] },
  { id: "D-00-login-task-planning", title: "Phase D 任务自创：基于 strategy 自创 ≥3 个 craft 任务" },

  // === 4 个分析任务（保留）===
  { id: "D-00-login-emotion",     title: "情感与氛围分析" },
  { id: "D-00-login-hierarchy",   title: "视觉层级 4 层" },
  { id: "D-00-login-budget",      title: "组件视觉预算 + minSignals", expectedArtifacts: [{ kind: 'arrayMin', path: 'meta.design.componentBudgets', min: 1 }] },
  { id: "D-00-login-decorations", title: "装饰决策 + 装饰系统单一族" },

  // === Phase E craft 任务（D-00-login-task-planning 时由 AI 自创）===
  // 见 §Phase D 自创清单

  // === states/materials 拆分 ===
  { id: "D-00-login-states",       title: "visualStates DOM 事件态 + 业务态" },
  { id: "D-00-login-materials",    title: "素材规格 + 调 material-painter 画 + applyMaterialDesign" },

  // === 自审 ===
  { id: "D-00-login-self-review",  title: "整屏视觉自审 5 维度", expectedArtifacts: [{ kind: 'selfReviewAllPassed', screenId: '00-login', minScore: 4 }] },

  // === 收尾任务 ===
  { id: "D-00-login-meta", title: "meta.design 叙事落库" },
  { id: "D-00-login-tree-redlines", title: "节点结构 4 红线核对" },
  { id: "D-00-login-coverage", title: "覆盖核对" },
  { id: "D-00-login-integrity", title: "本屏 integrity 自检" }
]}
```

---

## Phase A：取景（D-00-login-briefing）

### 必读
- `methodology/00-design-thinking.md`
- `methodology/01-briefing.md`
- `note-templates/briefing.template.md`
- `schema-spec/screen-meta-design.md` §6

### md 写什么（briefing.md）

```markdown
## 1. 产品维度
- 目标用户：95-00 后大学生
- 核心场景：登录回到主页继续社交
- 用户来时心理：焦虑（怕被推销）+ 期望简洁
- 本屏要解决的问题：快速登录
- 用户用完去向：首页 Feed
- 本屏角色：招呼 + 工具
- 业务约束：手机号 + 验证码 / 密码 二选一登录方式

## 2. 主题维度
- theme.intent：warm-minimal
- 主调色板：bg #FCFCFD / surface #FFFFFF / primary #5B6CFF / textPrimary #1F2937 / textSecondary #6B7280 / border #E5E7EB / error #E16A6A
- 字号梯度：display 28 / h2 22 / body-lg 16 / body 14 / caption 12
- 圆角梯度：sm 4 / md 8 / lg 12 / xl 16 / full 9999
- 阴影梯度：sm（弱）/ md / lg
- 装饰用量上限：节制（1-2 处）
- 缺哪些 token：无缺失 ✓

## 3. 交互维度
- state.view 字段：activeMode (code|password) / policyAccepted (bool) / codeCountdown (number) / submitting (bool) / submitAttempted (bool) / passwordVisible (bool) / lockedUntil (number)
- 衍生视图节点：✓ NormalFormView / ✓ LockedView（visibleWhen lockedUntil > now）
- 节点骨架够不够：⚠️ PolicyCheckbox 是 native input → 需 design 阶段 wrapper-label / ⚠️ ModeToggle 缺 TabIndicator → design 阶段加 / ⚠️ BrandLogo type=img 空 src → design 阶段调 material-painter 画
- mock scenarios：code-success / code-error / password-success / password-locked

## 4. 上下文维度
- 同种组件：SubmitBtn 跨屏（注册/找回密码）→ 需要抽 PrimaryButton 模板
- 可复用 componentAssets：暂无（首屏）

## 5. ★ 沉淀到 schema 的结论
{
  briefing: {
    userIntent: "校园用户登录回到主页",
    userMood: "焦虑(怕被推销) → 期望简洁",
    screenRole: "招呼+工具",
    themeIntent: "warm-minimal",
    missingTokens: [],
    stateViewFields: ["activeMode","policyAccepted","codeCountdown","submitting","submitAttempted","passwordVisible","lockedUntil"],
    skeletonGaps: [],
    crossScreenComponents: ["SubmitBtn → PrimaryButton 模板"]
  }
}
```

### MCP 调用
```
meta/set_screen { projectId, screenId: '00-login', patch: { design: { briefing: {...} } } }
meta/update_plan_task { taskId: "D-00-login-briefing", patch: { status: 'done', notes: 'md: design/00-login/briefing.md' } }
```

---

## Phase B：视觉概念（D-00-login-concept）

### 必读
- `methodology/02-visual-concept.md`
- `note-templates/concept.template.md`
- `schema-spec/screen-meta-design.md` §7

### md 写什么（concept.md）

```markdown
## 1. 候选风格方向（3 个）
| 候选 | 灵魂句 | 关键词 3 | mood board | 选/否决 |
| A 温暖治愈 | 清新校园温度，不浮夸不冷漠 | 暖白/极简/单色温度 | 晨光透过窗 / 笔记本上的便签 / 球场围栏的剪影 / 学校公告板 | ✅ 选 |
| B 冷静专业 | 严肃可靠的工具感 | 冷白/直角/极简 | 银行柜台 / 玻璃栏杆 / 网格 | ❌ 与「校园社交」冲突 |
| C 活泼俏皮 | 校园活力色让用户兴奋 | 多色/圆角/装饰丰富 | 涂鸦墙 / 气球 / 彩虹 | ❌ 登录页不需要活泼，活泼留首页 |

## 2. 选定方向
灵魂句：清新校园温度，不浮夸不冷漠
关键词：暖白 / 极简 / 单色温度
mood board：晨光透过窗 / 笔记本上的便签 / 球场围栏的剪影 / 学校公告板

## 3. 选定理由
- 与产品契合：用户「焦虑期望简洁」+ 本屏「招呼+工具」 → 温暖（让用户感到被欢迎）+ 克制（不警觉营销）
- 与主题契合：theme.intent=warm-minimal → 暖白 + 极简关键词直接对应；primary=#5B6CFF 蓝紫作为「单色温度」
- 与交互契合：5 个 state.view 字段都需要清晰视觉反馈，单色温度足以支撑

## 4. ★ 沉淀到 schema 的结论
{
  visualConcept: {
    soulSentence: "清新校园温度，不浮夸不冷漠",
    styleKeywords: ["暖白", "极简", "单色温度"],
    moodBoard: ["晨光透过窗","笔记本上的便签","球场围栏的剪影","学校公告板"],
    candidatesEvaluated: 3,
    selectedCandidate: "A",
    rejectionReasons: [
      { candidate: "B", reason: "冷漠与校园社交气质冲突" },
      { candidate: "C", reason: "活泼降低登录页信任度" }
    ]
  }
}
```

### MCP 调用
```
meta/set_screen { patch: { design: { visualConcept: {...} } } }
meta/update_plan_task { taskId: "D-00-login-concept", patch: { status: 'done' } }
```

---

## Phase C：视觉策略（D-00-login-strategy）

### 必读
- `methodology/03-color.md` + `04-typography.md` + `05-shape.md` + `06-decoration.md` + `07-rhythm.md`
- `recipes/theme-element-dict/warm.md`
- `recipes/decoration-systems/soft-glow.md`

### md 写什么（strategy.md）

```markdown
## 1. 色 60-30-10
- 60% bg #FCFCFD（screen.backgroundColor）
- 30% surface #FFFFFF + textPrimary
- 10% primary #5B6CFF（出现位置 ≤ 6 处）
  · SubmitBtn.bg
  · ModeToggle.active 字色 + TabIndicator
  · PolicyCheckVisual.checked 填充
  · PhoneInput.focus borderColor + 光晕
  · BgBlobTopRight 极淡（opacity 0.4）
  · CredentialInput.focus borderColor

## 2. 字号节奏
display 28 / h2 22 / h4 18 / body-lg 16 / body 14 / caption 12
字重：400 / 500 / 600 / 700（4 级）
lineHeight: body 1.5 / btn 1.2

## 3. 形状语言
基调：soft（圆角柔和）
radius map: card 16 / button 12 / input 8 / small 4 / full 9999

## 4. 装饰系统
系统：soft-glow（光斑系）
密度：节制（2 处）
实例：
- BgBlobTopRight（右上溢出，opacity 0.4，primaryLight）
- BrandLogo 区域 hero 渐变（极淡，可选）
否决：geometric-line（理性与温度冲突）/ illustration（重）/ texture（与极简冲突）/ organic-curve（与极简冲突）

## 5. 间距 + 动效
间距：4-8-16-24-32-48 呼吸型
动效：hover 150ms / pressed 80ms / state 200ms / transitions.normal.value

## 6. ★ 沉淀到 schema 的结论
{
  visualStrategy: {
    color: { ratio: { background: 60, surfaceAndText: 30, accent: 10 }, primary: "$token:colors.primary", background: "$token:colors.background", accentUsage: ["SubmitBtn.bg","ModeToggle.active","TabIndicator","PolicyCheckVisual.checked","PhoneInput.focus","BgBlob"] },
    typography: { sizeScale: ["caption(12)","body(14)","body-lg(16)","h4(18)","h2(22)","display(28)"], weightScale: { body: 400, label: 500, btn: 600, active: 700 }, lineHeight: { default: 1.5, btn: 1.2 } },
    shape: { baseRadius: "soft", radiusMap: { card: "xl(16)", button: "lg(12)", input: "md(8)", small: "sm(4)" } },
    decoration: { system: "soft-glow", density: "节制", instances: [{ position: "右上溢出", role: "氛围-装饰", weight: 2 }], rejectedSystems: ["geometric-line","illustration","texture","organic-curve"] },
    rhythm: { spacingScale: ["2xs(2)","xs(4)","sm(8)","md(16)","lg(24)","xl(32)","2xl(48)"], motionTimings: { hover: "150ms ease-out", pressed: "80ms ease-in", state: "200ms ease-out" } }
  }
}
```

---

## Phase D：任务自创（D-00-login-task-planning）

### 必读
- `methodology/00-design-thinking.md`
- `methodology/09-coordinated-visual.md`
- `recipes/visual-effects/*` + `recipes/compositions/*`

### task-planning.md 自创清单

基于 strategy.decoration.system=soft-glow + composite controls 扫描（PolicyCheckbox / ModeToggle）+ visual effects 需求 → 自创 6 个 craft 任务：

| 自创 craft 任务 | 视觉目标 | 参考配方 | 参与节点 |
|---|---|---|---|
| D-00-login-craft-hero | 品牌区视觉锚（Logo + Slogan + 装饰光斑） | trust + soft-glow | BrandLogo / BrandSlogan / BgBlobTopRight |
| D-00-login-craft-policy-checkbox | PolicyCheckbox wrapper-label 重构 | compositions/checkbox + warm | PolicyCheckLabel / PolicyCheckbox / PolicyCheckVisual / checkmark / PolicyText |
| D-00-login-craft-mode-toggle | ModeToggle active 视觉 + TabIndicator | compositions/tab-segment + warm | ModeToggle / CodeModeBtn / PasswordModeBtn / TabIndicator |
| D-00-login-craft-cta | 主 CTA 浮出感 | floating + warm | SubmitBtn |
| D-00-login-craft-form-fields | 表单字段聚焦感 + 字段前缀 icon | focus + warm | PhoneInput / CredentialInput / PhoneIcon / MessageIcon |
| D-00-login-craft-decoration | BgBlobTopRight + FormCard 阴影优化 | soft-glow | BgBlobTopRight / FormCard |

### MCP 调用（自创任务）

```
meta/add_plan_tasks { projectId, scope: 'screen', screenId: '00-login', tasks: [
  { id: "D-00-login-craft-hero", title: "...", expectedArtifacts: [{ kind: 'nonEmpty', path: 'rootNode.descendants[name=BrandLogo].materialProjectId' }] },
  { id: "D-00-login-craft-policy-checkbox", ... },
  ...
]}
```

---

## Phase E：创作执行（每个 craft 任务一份 md）

### 例：D-00-login-craft-policy-checkbox

#### 必读
- `recipes/compositions/checkbox.md` ★
- `pitfalls/web-rendering.md` §1.1（native checkbox 限制）
- `methodology/11-layout-adjustment.md`（element/wrap 边界）

#### craft-policy-checkbox.md 写什么

```markdown
## 1. 视觉目标
PolicyCheckbox 当前 native input + accentColor → minSignals=1 不达 ≥3 阈值
重构为 wrapper-label 模式 + 自绘外框 + 勾 + 焦点光晕

## 2. 协同视觉 4 角色
- 主体：PolicyCheckVisual（自绘外框）
- 邻居：PolicyText（不动）
- 父容器：PolicyCheckLabel（新加 wrapper）
- 装饰：checkmark（自绘勾）

## 3. 落到 schema 的具体操作

### 3.1 element/wrap：包裹现有 PolicyCheckbox + PolicyText
element/wrap {
  childIds: ["nd_policy_checkbox", "nd_policy_text"],
  newParent: {
    type: "label", name: "PolicyCheckLabel",
    props: { htmlFor: "policy-check" },
    styles: { display: "flex", alignItems: "center", gap: "$token:spacing.xs", cursor: "pointer" },
    meta: { design: { kind: "visual-container" } }
  }
}

### 3.2 element/add：PolicyCheckVisual + checkmark
（参 recipes/compositions/checkbox.md §2 完整 schema）

### 3.3 style/update：native input 设 display:none

### 3.4 visual_state/add：PolicyCheckVisual.checked / .focus / .error
- checked: activeWhen "{{state.view.policyAccepted}}", styles: { backgroundColor: primary, borderColor: primary }, childrenVisibility: { checkmark: true }
- focus: { boxShadow: "0 0 0 3px primaryLight" }
- error: activeWhen "{{!state.view.policyAccepted && state.view.submitAttempted}}", styles: { borderColor: error }

## 4. minSignals 核查
| 节点 | role | minSignals | 实际 | ✓ |
| PolicyCheckLabel + Visual | 工具-勾选 | ≥3 | 4（外框 + 选中底色 + 勾 + 焦点光晕）| ✅ |

## 5. ★ 沉淀到 schema 的结论
[完整 element/wrap + element/add + style/update + visual_state/add MCP 调用]

## 6. ★【v3】视觉自审（Step 6.5）
generate_snapshots → 取截图

| 维度 | 分 | 判据 |
| 识别度 | 5/5 | 一眼看出是 checkbox + 勾选状态 |
| 优先级层次 | 4/5 | weight=2 工具角色，与配角合奏 |
| 状态可见性 | 5/5 | unchecked / checked / focus / error 4 态 distinct |
| 主题契合 | 5/5 | warm 主题 → 1.5px 边 + radius.sm + 蓝紫主色 |
| 情绪传达 | 4/5 | 与 concept "温度" 一致（不冷漠） |

平均 4.6/5 ✅ → 任务可 done

update_plan_task { D-00-login-craft-policy-checkbox, status: 'done', notes: 'md: design/00-login/craft-policy-checkbox.md；自审平均 4.6/5' }
```

### 其他 5 个 craft 任务以此类推（详细 md 略，见 examples/login-design-v3/craft-*.md）

---

## Phase F：自审（D-00-login-self-review）

### 必读
- `methodology/13-self-review-rubric.md`
- `note-templates/review.template.md`

### self-review.md 整屏对账

```markdown
## 1. 截图
generate_snapshots { projectId, screenIds: ['00-login'], mode: 'frame' } → snapshots/.../00-login.png

## 2. 机器对账（B2 工具）
- canvas_render_status: 0 broken-image / 0 token-fail ✅
- visual_weight_audit: 金字塔 (主角 9+7=16 / 配角 4 / 工具 2*5=10 / 装饰 2 = 32, 略超 30)
  → 削减：装饰节点 1 个 / 总和 31 ✅
- visual_state_distinctness: 业务态全过 ✅
- color_ratio_audit: 60/30/10 ≈ 58/32/10 ✅
- decoration_system_audit: soft-glow 单一族 ✅

## 3. 5 维度评分
| 维度 | 分 | 判据 |
| 识别度 | 5/5 | Logo 真画 + CTA 紫色显眼 + 字层级清晰 |
| 优先级层次 | 5/5 | 主角 CTA + 品牌 Logo / 配角 FormCard / 工具诸字段 / 装饰 BgBlob |
| 状态可见性 | 4/5 | tab active / checkbox checked / focus / error 全有；passwordVisible 切换可见 |
| 主题契合 | 5/5 | warm-minimal 完全契合（暖白 + 蓝紫 + 圆角柔和 + 节制装饰）|
| 情绪传达 | 5/5 | 与 concept "清新校园温度" 一致 |

平均 4.8/5 ✅

## 4. update_plan_task done
expectedArtifacts: [{ kind: 'selfReviewAllPassed', screenId: '00-login', minScore: 4, actualMinScore: 4 }]
```

---

## Phase G：跨屏 audit（项目级）

仅 1 屏，跨屏 audit 简化。但 v3 ★ 三个项目级新 audit 必跑：
- D-decoration-system-audit：全屏 soft-glow 单一族 ✅
- D-color-ratio-audit：60-30-10 落在 ±10% ✅
- D-weight-pyramid-audit：金字塔成立 + 偏差 ≤1 ✅

---

## Phase H：移交（D-handover）

### handover.md 总结

```markdown
## 项目级出场对账
- integrity 0 错 ✅
- token 引用率 96% ✅
- 全屏 self-review 4.8/5 ✅
- 装饰系统单一族 ✅
- 60-30-10 调色 ✅
- 权重金字塔成立 ✅

## 素材落地
- BrandLogo materialProjectId: mat_xxx ✅（design 自调 material-painter 画）
- PhoneIcon materialProjectId: mat_yyy ✅
- MessageIcon materialProjectId: mat_zzz ✅
- BgBlobTopRight: CSS 实现 ✅

## v3 创作权使用
- visualConcept ✅
- visualStrategy ✅
- 自创 6 个 craft 任务 ✅
- element/wrap PolicyCheck + element/add TabIndicator/BgBlob ✅
- material-painter 调用 3 次 ✅

## 给 executor 指南
executor 退化为 QA 摄影师：
1. generate_snapshots 全屏 + 各 viewport
2. 跑跨设备 / 跨浏览器一致性核对
3. 终验 integrity
不画素材、不做设计决策
```

---

## 总结：v3 与 v2 输出对比

| 维度 | v2 demo（当前简陋）| v3 demo（按本样板）|
|---|---|---|
| 任务数 | 11 屏级 + 6 项目级 | 4 前置 + 6 自创 craft + 1 自审 + 4 收尾 + 9 项目级（含 3 audit） |
| 文档 | 11 份 md | 16+ 份 md（briefing/concept/strategy/task-planning + 6 craft + self-review + handover...）|
| 节点变化 | 仅 styles + states | + 装饰节点 + 视觉容器（wrapper-label / TabIndicator）+ 素材 PNG |
| 视觉信号 | minSignals 多处 < 阈值 | 全节点达 ≥ minSignals |
| 自审 | 无 | 每 craft + 整屏 self-review |
| 截图 5 维 | 1.6/5 | 4.8/5 |

---

## 提示词

第一次跑 v3 流程时复述这句给自己：

> **我是视觉创作者，不是字段填写员**。
> 取景 → 概念 → 策略 → 自创任务 → 创作（含布局调整 / 装饰新建 / 素材绘制）→ 自审 → audit → 出场。
> 每个 craft 任务一份 md + 落 schema + 5 维自审 ≥ 4。
> 不达标重做，不依赖 executor 兜底。
