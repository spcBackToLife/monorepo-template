# 方法论 12：素材绘制工作流 (Material Painting Flow)（v3 新增）

> 适用任务：`D-X-material-paint`、`D-X-craft-*`（含素材时）
>
> **核心**：v3 ★ design 阶段**自调 material-painter 子技能**画素材 + applyMaterialDesign 写入 `node.materialProjectId`。**executor 不再画素材，只做 QA**。
>
> 关联子技能：`.claude/skills/material-painter/SKILL.md`（必读）

---

## 1. 工作流总览

```
[D-X-material-spec 任务（保留）]
  ↓ 写 materialSpec（kind / 风格 4 维度 / colorStrategy / layers / qualityChecklist）
  ↓ 落到 node.meta.design.materialSpec

[D-X-material-paint 任务（v3 新增）]
  ↓ Step 1: 列出本屏需要画素材的节点（type=img / kind=brand / kind=icon / kind=illustration）
  ↓ Step 2: 对每个节点，read 其 materialSpec
  ↓ Step 3: 调 material-painter 子技能（Skill tool 触发）画素材
  ↓ Step 4: applyMaterialDesign 写入 node.materialProjectId
  ↓ Step 5: 生成截图自审（D-X-self-review 阶段统一对账）

[D-X-self-review 任务]
  ↓ generate_snapshots → 看素材是否真渲染出来
  ↓ 不达标 → 调 material-painter 重画
```

---

## 2. 何时画素材（决策表）

| 节点 | 应画的判定 |
|---|---|
| `type=img` 且 src 空 | ✅ 必画（不画 = 占位框出场）|
| 装饰节点 `kind=decoration` 且 `renderHint=png` 或 `renderHint=svg` | ✅ 画 |
| 装饰节点 `kind=decoration` 且 `renderHint=css-gradient` | ❌ 不画（CSS 实现）|
| 装饰节点 `kind=decoration` 且 `renderHint=css-gradient` 但 styles 用了字符串内嵌 token | ⚠️ 字符串内嵌 token 不被支持 → 改 CSS 写法（拆字段 + currentColor）或转 SVG |
| icon-button 内 `<div role=icon>` 占位 | ✅ 画 SVG 或 unicode 简版 |
| empty / error 状态节点的插画位 | ✅ 按需画（B 端可用 icon 简化）|

---

## 3. 调用 material-painter 子技能

按 SKILL tool 调用 material-painter（注意 material-painter 有 invariants，详见其 SKILL.md）。

### 3.0 ★ brief 边界铁律（v3.1，与 SKILL.md §5.5 同根）

**design-planner 是艺术总监，material-painter 是专业画家。brief 只给目标 + 概念 + 约束，禁止给施工图**。

| brief 应给 ✅ | brief 禁给 ❌ |
|---|---|
| 视觉目标（一句话）| pathData 字符串 |
| concept.md 灵魂句 + 关键词 3 + mood board | 具体坐标（圆心 / 起点 / 终点）|
| 装饰系统单一族名（soft-glow 等）| strokeWidth 像素值 |
| 60-30-10 调色定位（这素材在 10% 强调还是 60% 主导）| hex 色值（必须用 token 引用名）|
| 节点尺寸 width × height | 构图层数清单（"3 层：底层 X + 中层 Y"）|
| 节点上下文（屏底色 / 周围节点 / 不能融合的色）| safe-zone 像素值 |
| 可用 token 池（引用名 + 描述，不展开 hex）| rect/path/ellipse 选型 |
| painter "需要自己决定的"清单（≥ 3 项）| 任何"按图施工"指令 |
| 失败重画时附"上一版为什么失败" | — |

painter 收到 brief 后**自己跑「设计思考三步 + 7 步绘制工作流」**：
1. 概念提取 — 视觉隐喻
2. 构成规划 — 底/中/顶层各画什么
3. 风格适配 — 笔触/色比/留白
+ Step 0b 尺寸决策 — 参考框 / stroke / safe-zone

如果 design 替 painter 决策了 1-3 中任何一步 → painter 退化成"画板代笔"，技能价值丢失。

### 3.1 准备 input

调用前准备（这些是**目标 + 约束**，不是构图细节）：
- 目标节点 nodeId + width + height（来自该节点 styles）
- visualConcept.{soulSentence, styleKeywords, moodBoard}（来自 concept.md）
- visualStrategy.decoration.system（保证素材风格统一族）
- visualStrategy.color.ratio + 这素材在哪一档（10% / 30% / 60%）
- 屏底色 + 周围节点上下文（让 painter 判断对比策略）
- theme.tokens 引用名清单（不展开 hex，让 painter 自己 theme/get 解析）
- 失败案例（如有 v1，写明为什么失败）

### 3.2 调用方式（v3.1 正确示例）

```
Skill tool: material-painter
prompt: |
  为节点 'n_BrandLogo' 画 brand logo 素材绑定。

  ⚠️ 这是干净 brief，不含施工细节——请你自己跑「设计思考三步 + 7 步工作流」。

  ## 视觉目标（一句话）
  让校园用户进登录页一眼感受到「这是个清新有温度的校园社交产品」的品牌印象。

  ## 概念输入
  - 灵魂句：像清晨教室的光，温暖但不打扰
  - 风格关键词 3：暖白米 / 大圆角柔和 / 单色光斑节制
  - mood board：晨光教室窗格 / 木桌笔记本 / 操场跑道弧线 / 公告板便签
  - theme.intent：minimal + flat + neutral，主色 #5B6CFF（C = Campus）
  - 装饰系统单一族：soft-glow（圆润+渐变+柔光+单色族）
  - 60-30-10 调色：本素材在 10% 强调档（已用 SubmitBtn 主色填充，BrandLogo 用主色作字色不撞）

  ## 节点约束
  - 渲染尺寸：120 × 120 px
  - 已有 borderRadius: $token:radius.xl (16px)
  - 屏底 = $token:colors.background = #FCFCFD（暖白米）→ logo 不能与屏底融合到看不见
  - 上下文：节点位于 HeaderArea，下方紧跟 BrandSlogan 文字

  ## 可用 token 池（引用名）
  - colors.primary / primaryHover / primaryLight / secondary
  - colors.background / surfaceElevated / textPrimary
  - shadows.sm / md / lg

  ## 你需要自己决定的
  1. 概念提取：「校园社交 + C = Campus + 清晨教室温度」→ 字标 / 字标+图形 / 抽象图形 / ...
  2. 构成规划：底/中/顶层 + 是否要边框/阴影/光晕（与 soft-glow 系统统一）
  3. 风格适配：笔触/色比/留白
  4. 尺寸决策：referenceFrame / stroke / safe-zone
  5. 如何避免与 #FCFCFD 屏底融合

  ## 失败案例（v1，请避免）
  - design 越界给了 圆心 (120,120) 半径 60 stroke 18 等坐标 → 我退化成画板代笔
  - 1.5px 边框在 240px 帧太细 → 缩到 120×120 几乎看不见
  - C 开口朝右 → 视觉重心向左偏

  ## 完成后回报
  - materialProjectId
  - 设计思考三步（概念提取 / 构成规划 / 风格适配）
  - 与 v1 的关键差异化决策
```

### 3.3 子技能产出

material-painter 完成后返回：
- materialProjectId（已写入对应节点）
- 画布工程 ID（可后续调整）
- 导出的 PNG / SVG URL
- ★ 设计思考三步 + 关键决策（让 design-planner 知道 painter 怎么想的，便于后续目标对账）

### 3.4 ★ 输出后的"目标对账"（不是"修坐标"）

design-planner 收到 painter 输出后做**目标对账**（不是改坐标）：

| 对账维度 | 判据 |
|---|---|
| 视觉目标达成？ | 进屏一眼能感受到 brief 的"清新校园温度"吗？|
| 概念契合？ | 与 concept.soulSentence 一致？关键词 3 全体现？|
| 装饰系统统一？ | 与 visualStrategy.decoration.system 一致？|
| 60-30-10 调色不破？| 没引入新的强调色 hex 让总比例失衡？|
| 与上下文协调？| 不与屏底融合？与周围节点视觉权重平衡？|

**任一维度不达标 → 把"上一版为什么失败"写清楚，调 painter 重画，不是自己改坐标**。

如果 design 自己改坐标"修一下"，等于把 painter 的设计判断推翻、回到"画板代笔"模式——v3.1 红线。

---

## 4. applyMaterialDesign 行为副作用（重要）

material-painter 的 `applyMaterialDesign` 会**追加模式**写入 9 个 CSS 属性到目标节点 styles：

```
backgroundImage: url(...)       ← 主属性
backgroundSize: contain
backgroundPosition: center
backgroundRepeat: no-repeat
border: none
boxSizing: border-box
... 共 9 个
```

**因此**：
- ⚠️ 目标节点必须是**纯展示节点**（无装饰职责）—— 否则 design 自己写的 background 会被覆盖
- ⚠️ 应用后需 `style/reset` 全部 background-* 然后设干净的 background-image 单值（避免 9 个属性混乱）—— material-painter SKILL Layer 2 invariant I-12 已说

**判定原则**：如果节点本身有 background-color / border 等装饰，需要先用 wrapper 包一层，wrapper 装装饰、内部子节点装素材。

---

## 5. 素材风格统一族（与装饰系统一致）

`visualStrategy.decoration.system` 决定**全屏所有素材**的风格族——不混杂：

| 装饰系统 | 素材风格 |
|---|---|
| soft-glow | 圆润 + 渐变 + 柔光 + 单色 |
| geometric-line | 直线 + 几何 + 单色或双色对比 |
| illustration | 多色 + 拟物或扁平插画 |
| texture | 纹理填充 + 实色边缘 |
| organic-curve | 自由曲线 + 有机形状 |

详见 `recipes/decoration-systems/<system>.md`。

---

## 6. material-painter 的已知 invariant（必懂）

不是 design-planner 的事，但调用时要懂：

```
I-7  textbox 渲染不稳定 → 用 path(pathData) 画文字 / 符号
I-6  group 不被服务端展开 → 不用 group
I-8b pathData 只支持 M / L / H / V / C / A / Z（空格分隔）
     ❌ Q / q / T / t 不被服务端渲染 → 导致空白
I-9  applyMaterialDesign 是追加模式 → 不清旧值就叠加
I-12 应用后必须 reset 全部 background-* 再设干净单值
```

**所以**：design-planner 调子技能后，应在自己的 D-X-material-paint 任务里跑一次 generate_snapshots 看素材**真的画出来了**——若是 textbox 没画出 / 路径用了 Q / T 命令空白，立刻让 material-painter 重画。

这些 invariant 也是 v3 方案 B3 代码改造要修复的——等 B3 修完，本节注意事项可简化。

---

## 7. md 落地（D-X-material-paint 任务）

```markdown
## 素材绘制清单（D-X-material-paint）

### 待画素材节点
| 节点 | 类型 | kind | 尺寸 | materialSpec 摘要 | 子技能调用 ID |
|---|---|---|---|---|---|
| n_BrandLogo | img | brand | 120×120 | 抽象几何 + 单色 primary + 居中 | mp-call-001 |
| n_PhonePrefixIcon | div | icon | 18×18 | 线条 phone icon + 单色 textTertiary | mp-call-002 |
| n_BgBlobTopRight | div | decoration | 200×200 | 径向渐变 + primaryLight + opacity 0.4 | （CSS 实现，无需 paint） |

### 调用过程
[每个调用记录：input + 子技能返回的 materialProjectId + 应用后的 styles diff]

### 应用后 styles cleanup
对每个被 applyMaterialDesign 修改的节点：
- style/reset 删除 9 个追加属性中不需要的
- 设干净的 backgroundImage 单值

### 自审（截图）
generate_snapshots → 检查每个素材是否实际渲染：
- BrandLogo 出现 ✅
- PhonePrefixIcon 出现 ✅
- BgBlob 渐变可见 ✅

### ★ 沉淀到 schema 的结论
对每个画了素材的节点：node.materialProjectId 已写入
expectedArtifacts:
- { kind: 'eachItem', path: 'rootNode.descendants[type=img|kind=brand]', check: { kind: 'nonEmpty', path: '$.materialProjectId' }}
```

---

## 8. 红线

- ❌ type=img 节点留空 src → R-IMG-EMPTY-01（v3 新增红线）
- ❌ 装饰节点 renderHint=css-gradient 但 styles 用了字符串内嵌 token → 渲染失败 + R-RENDER-CAP-01
- ❌ applyMaterialDesign 后没清旧 background-* → 9 属性混乱（material-painter Layer 2 I-9 / I-12）
- ❌ 一屏素材风格混杂多族（如同屏既有 soft-glow 又有 illustration）→ R-DECO-SYS-01
- ❌ pathData 用 Q / q / T / t 命令 → 后端渲染空白（B3 修复前必须避开）
- ❌ 调子技能后不 generate_snapshots 检查 → 素材"画了但渲染空白"无人发现
- ❌ design 阶段把素材绘制留给 executor → v3 已放开素材绘制权，design 阶段必须画完
- ❌ **【v3.1 ★】brief 含 pathData / 坐标 / strokeWidth 像素值 / hex 色值 / 构图层数清单 → painter 退化为画板代笔，整版 brief 退回重写**（详见 §3.0）
- ❌ **【v3.1 ★】painter 输出与目标偏差时 design 自己改坐标"修一下" → 应回 painter 重画并附"上一版失败原因"，不是设计阶段越界改构图**
