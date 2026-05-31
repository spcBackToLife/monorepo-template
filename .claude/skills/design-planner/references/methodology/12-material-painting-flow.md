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

按 SKILL tool 调用 material-painter（注意 material-painter 有 invariants，详见其 SKILL.md）：

### 3.1 准备 input

调用前准备：
- 目标节点 nodeId + width + height（来自该节点 styles）
- materialSpec（来自该节点 meta.design.materialSpec）
- theme.tokens（保证素材颜色在 token 池内）
- visualConcept.styleKeywords + decoration.system（保证素材风格统一）

### 3.2 调用方式

```
Skill tool: material-painter
prompt: |
  为节点 nodeId='n_BrandLogo' 画一个 brand logo 素材：
  - referenceFrame: 120 × 120 px
  - kind: brand
  - 风格：minimal + 暖白主题 + 单色温度（参 visualConcept.styleKeywords）
  - 主色：$token:colors.primary (#5B6CFF)
  - 构图：抽象几何符号 + 居中 + 轻量
  - materialSpec 详细：[完整 jsonc]
  - 完成后调 applyMaterialDesign 写入 node.materialProjectId
```

### 3.3 子技能产出

material-painter 完成后返回：
- materialProjectId（已写入对应节点）
- 画布工程 ID（可后续调整）
- 导出的 PNG / SVG URL

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
