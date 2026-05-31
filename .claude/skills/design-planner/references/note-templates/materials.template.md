# 模板：D-X-materials（素材规格）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/materials.md`

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

## 3. 每个素材完整规格

### BrandLogo（kind: brand）

#### 3.1 基本信息
- referenceFrame: 64×64
- background: transparent
- renderHint: png

#### 3.2 风格分析
（沿用 §2 主题风格定调）

#### 3.3 色彩策略
```jsonc
colorStrategy: {
  primary:   { value: "$token:colors.primary",   role: "主体气泡" },
  secondary: { value: "$token:colors.secondary", role: "右上装饰点" },
  neutral:   { value: "#FFFFFF",                  role: "内部白色弧线" }
}
```

#### 3.4 线条特征
```jsonc
lineStyle: { width: "2.5-3px", cap: "round", join: "round" }
```

#### 3.5 构图
"粉色地图气泡（底部尖角圆润，居中，40×48px）+ 内部两段白色相连弧（120°，20×16px，居中偏上）+ 右上角薄荷绿小实心圆点（8px）"

#### 3.6 图层结构（自上而下）
```jsonc
layers: [
  { name: "主体",    shape: "水滴气泡",       fill: "$token:colors.primary",   stroke: "none",                position: "居中",     size: "40×48" },
  { name: "内部图形", shape: "两段相连圆弧", fill: "none",                     stroke: "#FFFFFF 3px round", position: "居中偏上", size: "20×16" },
  { name: "装饰",    shape: "实心圆",        fill: "$token:colors.secondary", stroke: "none",                position: "右上角外沿", size: "8" }
]
```

#### 3.7 变体
```jsonc
variants: [
  { name: "dark",  scenario: "暗色 colorScheme", diff: "primary → primaryDark; neutral → #1A1A1A" },
  { name: "small", scenario: "32×32 小尺寸",    diff: "省略装饰圆点，仅保留主体 + 弧线" }
]
```

#### 3.8 质量核对
```jsonc
qualityChecklist: [
  "64×64 参考框内居中",
  "气泡造型清晰可辨",
  "内部连接符号该尺寸下可读",
  "透明通道正确",
  "色彩与 token primary/secondary 一致",
  "线条圆头圆角"
]
```

#### 3.9 候选方案对比

方案 A: 地图气泡 + 连接弧 + 装饰点（采用）
- 优点：传达"地理 + 社交"双重含义
- 缺点：元素较多，小尺寸时可能模糊

方案 B: 单一气泡符号
- 优点：简洁
- 缺点：失去"社交"暗示

→ 采用 A

---

### MintLeafDeco（kind: decoration, png）

#### 4.1-4.8 同上结构

#### 4.5 构图
"三片相互交叠的薄荷叶，自然倾斜，自由形态。底层叶左下、中层叶居中、顶层叶右上。"

[完整规格...]

---

### PinkCircleDeco（kind: decoration, css-gradient）

#### 5.1 基本信息
- referenceFrame: 180×180
- renderHint: **css-gradient**（CSS 实现，executor 跳过素材绘制）

#### 5.2 风格分析
（沿用 §2）

#### 5.3 色彩
```jsonc
colorStrategy: {
  primary: { value: "$token:colors.primaryLight", role: "光晕中心" }
}
```

#### 5.5 构图
"径向渐变圆，中心 primaryLight 50% 到边缘 0%"

#### 5.6 图层（CSS 实现）
```jsonc
layers: [
  { name: "渐变光晕", shape: "径向渐变圆",
    fill: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)",
    position: "右上角溢出", size: "180×180" }
]
```

#### 5.8 质量核对
```jsonc
qualityChecklist: [
  "CSS 渲染：右上角光晕在 12% 透明度",
  "色彩与 token primaryLight 一致",
  "光晕边缘自然过渡（70% 透明度处)"
]
```

#### 5.9 备注
```jsonc
notes: "renderHint=css-gradient 时 styles.background 已表达全部，executor 跳过素材绘制"
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
        colorStrategy: {...},
        lineStyle: {...},
        composition: "...",
        layers: [...],
        variants: [...],
        qualityChecklist: [...]
      }
    }
  }
}

[每个需要素材的节点重复...]
```

⚠️ **后续任务约束**：
- executor 阶段按 renderHint 分流：
  - png → material-painter 画 + 上传 + 应用到节点
  - svg → 内联 SVG
  - css-gradient / css-only → executor 跳过，仅做截图核对
- D-audit：跨屏同种素材风格对照（如所有屏的 BrandLogo 一致）
```
