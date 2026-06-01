# 模板：D-X-materials（素材规格）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/materials.md`

## ⚠️ v3.1 ★ Spec 与 Brief 的边界

本 md 含两类内容，**用途不同，不可混淆**：

| 类型 | 用途 | 受众 | 形态 |
|---|---|---|---|
| **materialSpec**（§3-§5）| 落库到 `node.meta.design.materialSpec` 字段，供后续 executor / 设计师 review 时回看"我们要什么"| 留给自己 + 团队 | 文档化的目标 + 风格 4 维度（可含 composition 文字描述、colorStrategy 等定调，但**禁止**写 pathData / 具体坐标 / strokeWidth 像素值；hex 必须 `$token:` 引用名）|
| **Painter Brief**（§7 新增）| 实时调 material-painter 子技能时**作为 prompt 文本**发给 painter | 留给 painter | **只给目标 + 概念 + 节点尺寸 + token 池引用名 + 失败案例**（详见 §7 模板）|

**核心红线**：调 painter 时**不要把 materialSpec 整个 jsonc 塞给 painter**，更不要在 brief 里加 pathData / 坐标 / strokeWidth 像素值。详见 SKILL.md §5.5 + methodology/12 §3.0。

---

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-materials
> 对应 schema 字段：每节点 meta.design.materialSpec

## 1. 本屏素材识别

| 节点 | kind | 是否需要 materialSpec | renderHint |
|------|------|:---------------------:|:----------:|
| BrandLogo | brand | ✅ | png |
| MintLeafDeco | decoration | ✅ | png |
| PinkCircleDeco | decoration | ✅ | css-gradient |
| SubmitIcon | icon | ✅ | svg |
| EmptyStateIllustration | illustration | ✅ | png |

## 2. 主题风格定调（4 维度，所有素材共享）

| 维度 | 选择 | 理由 |
|------|------|------|
| simpleToRich | 简洁偏中 | 与 minimal aesthetics 一致 |
| geometricToOrganic | 有机为主 | 与 organic + playful aesthetics 一致 |
| flatTo3D | 平面 | 与 flat decoration 一致 |
| orderlyToCasual | 略随意 | 与 playful 情感一致 |

## 3. 每个素材的 materialSpec（schema 字段，文档化目标）

### BrandLogo（kind: brand）

#### 3.1 基本信息
- referenceFrame: 64×64（建议尺寸，painter 可在 Step 0b 重决策）
- background: transparent
- renderHint: png

#### 3.2 风格分析
（沿用 §2 主题风格定调）

#### 3.3 色彩策略（用 token 引用名，不展开 hex）
```jsonc
colorStrategy: {
  primary:   { value: "$token:colors.primary",   role: "主体气泡" },
  secondary: { value: "$token:colors.secondary", role: "右上装饰点" },
  neutral:   { value: "$token:colors.textInverse", role: "内部白色弧线" }
}
```

#### 3.5 构图（**目标层文字描述，不是施工指令**）
"地图气泡造型 + 内部社交连接符号 + 右上点缀"——painter 自己决定具体形状/坐标/笔触粗细。

⚠️ **不要写**："底部尖角圆润，居中，40×48px / 内部两段白色弧 120° 20×16 / 右上 8px 圆点"——这些是 painter 的构成规划职责。

#### 3.7 变体
```jsonc
variants: [
  { name: "dark",  scenario: "暗色 colorScheme", diff: "primary → primaryHover; 其他色相应反相" },
  { name: "small", scenario: "32×32 小尺寸",    diff: "省略装饰，仅保留主体 + 关键符号" }
]
```

#### 3.8 质量核对（painter 输出后用来对账）
```jsonc
qualityChecklist: [
  "64×64 参考框内居中",
  "造型可辨识（一眼识别为'校园社交品牌'）",
  "小尺寸下关键符号可读",
  "透明通道正确",
  "色彩全部 $token: 引用，无硬编码 hex",
  "与装饰系统单一族（soft-glow）协调"
]
```

#### 3.9 候选方案对比（设计阶段决定哪种隐喻方向，不决定具体构图）

方案 A: 地图气泡 + 连接弧 + 装饰点（采用）
- 优点：传达"地理 + 社交"双重含义
- 缺点：元素较多，painter 需平衡小尺寸可读性

方案 B: 单一气泡符号
- 优点：简洁
- 缺点：失去"社交"暗示

→ 采用 A，**painter 按 A 隐喻方向自由决定具体几何形态**

---

### PinkCircleDeco（kind: decoration, css-gradient）

#### 5.1 基本信息
- referenceFrame: 180×180
- renderHint: **css-gradient**（CSS 实现，无需调 material-painter）

#### 5.3 色彩
```jsonc
colorStrategy: {
  primary: { value: "$token:colors.primaryLight", role: "光晕中心" }
}
```

#### 5.5 构图（CSS 实现，design 阶段直接写 styles）
"径向渐变圆，中心 primaryLight 12% alpha 到边缘 0%"

⚠️ css-gradient 类不调 painter；design 直接写 styles 即可（注意：**styles.background 字符串内嵌 `$token:` 不渲染**，需展开为 rgba 硬编码——但这是渲染层 trade-off，不算违反 token 红线，在 craft md 中标注即可）

#### 5.8 质量核对
```jsonc
qualityChecklist: [
  "CSS 渲染：右上角光晕透明度合适",
  "色彩与 token primaryLight 语义一致",
  "光晕边缘自然过渡"
]
```

---

[继续每个素材...]

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_node 写每个素材节点的 design.materialSpec

meta/set_node {
  projectId, nodeId: "n2-BrandLogo",
  patch: {
    design: {
      // ... summary / rationale / visualSpec 已在 D-X-meta 写
      materialSpec: {
        kind: "brand",
        renderHint: "png",
        referenceFrame: { width: 64, height: 64 },
        background: "transparent",
        styleAnalysis: {...},
        colorStrategy: {...},          // 必须 $token: 引用名
        composition: "...",            // 目标层文字描述
        // ⚠️ 不要写 layers[].shape="水滴气泡 40×48" 这种施工细节
        variants: [...],
        qualityChecklist: [...]
      }
    }
  }
}

[每个需要素材的节点重复...]
```

## 7. ★ Painter Brief 模板（v3.1 ★ 调 material-painter 时用）

每个 png/svg 类素材在 D-X-craft-* 任务执行时调 painter，brief 用以下模板（**不要塞 §3 的 materialSpec jsonc**）：

```
Skill tool: material-painter
prompt: |
  为节点 '<nodeId>' 画 <kind> 素材绑定。

  ⚠️ 这是干净 brief，请你自己跑「设计思考三步 + 7 步工作流」。

  ## 视觉目标（一句话）
  <来自 visualConcept.soulSentence + 本节点定位>

  ## 概念输入（来自 concept.md / strategy.md）
  - 灵魂句：<concept.soulSentence>
  - 风格关键词 3：<concept.styleKeywords>
  - mood board：<concept.moodBoard>
  - theme.intent：<theme.intent.summary>
  - 装饰系统单一族：<strategy.decoration.system>
  - 60-30-10 调色：本素材在 ___ % 档（<理由>）

  ## 节点约束
  - 渲染尺寸：<width × height> px
  - 已有 styles：<只列必要的，如 borderRadius>
  - 屏底色：<colors.background 实际值> → logo 不能与屏底融合到看不见
  - 上下文：<位于哪个区 / 周围有什么节点>

  ## 可用 token 池（引用名）
  - colors.<primary / secondary / background / surfaceElevated / textPrimary 等>
  - shadows.<sm / md / lg>
  - 不展开 hex，让 painter 自己 theme/get 解析

  ## 你需要自己决定的
  1. 概念提取：<这素材的视觉隐喻是字标 / 几何 / 抽象 / ...>
  2. 构成规划：<底/中/顶层 + 是否要边框/阴影/光晕>
  3. 风格适配：<笔触/色比/留白>
  4. 尺寸决策：<referenceFrame / stroke / safe-zone>
  5. <额外约束，如"如何避免与 #FCFCFD 屏底融合"，painter 来想办法>

  ## 失败案例（如有 v1，请避免）
  - <列出 v1 的具体施工细节 + 为什么失败>

  ## 完成后回报
  - materialProjectId
  - 设计思考三步（让我对账）
  - 与 v1 的关键差异化决策
```

⚠️ **不要在 brief 里写**：pathData / 圆心坐标 / strokeWidth 像素值 / hex 色值 / 构图层数清单 / safe-zone 像素值 / rect/path/ellipse 选型——这些都是 painter 的职责。

⚠️ **后续任务约束**：
- executor 阶段按 renderHint 分流：
  - png → painter 已画完，executor 仅截图核对
  - svg → 同上
  - css-gradient / css-only → executor 跳过，仅做截图核对
- D-audit：跨屏同种素材风格对照
```
