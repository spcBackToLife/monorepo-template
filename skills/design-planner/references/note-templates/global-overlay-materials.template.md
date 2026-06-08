# 模板：D-global-overlay-materials（全局 overlays 内的素材规格）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/global/overlay-materials.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-materials
> 对应 schema 字段：project.globalOverlays[*].rootNode 内素材节点的 meta.design.materialSpec

## 1. overlay 内素材识别

| overlay | 节点 | kind | 是否需要 materialSpec | renderHint |
|---------|------|------|:---------------------:|:----------:|
| global-offline-banner | WifiOffIcon | icon | ✅ | svg |
| global-session-expired | LockIcon (头像位) | illustration | ✅ | png |
| global-app-update | UpdateIllustration | illustration | ✅ | png |
| global-error-boundary | ErrorIllustration | illustration | ✅ | png |

## 2. 每个素材完整规格

### WifiOffIcon（icon, svg）

```jsonc
materialSpec: {
  kind: "icon",
  renderHint: "svg",
  referenceFrame: { width: 16, height: 16 },
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "简洁",
    geometricToOrganic: "几何",
    flatTo3D: "平面",
    orderlyToCasual: "规整"
  },
  colorStrategy: {
    primary: { value: "$token:colors.textInverse", role: "图标主色（白色，与 banner 文字一致）" }
  },
  lineStyle: { width: "1.5px", cap: "round", join: "round" },
  composition: "WiFi 信号弧 + 斜杠（disconnect 标识）",
  layers: [
    { name: "信号弧", shape: "三段同心弧", stroke: "$token:colors.textInverse 1.5px round", position: "中下部", size: "12×8" },
    { name: "斜杠",   shape: "对角线",      stroke: "$token:colors.textInverse 1.5px round", position: "对角穿过", size: "16×16" }
  ],
  qualityChecklist: [
    "16×16 参考框内",
    "线条粗细一致 1.5px",
    "斜杠角度 45° 标准",
    "在 banner warning 底色上对比度足够"
  ]
}
```

### UpdateIllustration（illustration, png）

```jsonc
materialSpec: {
  kind: "illustration",
  renderHint: "png",
  referenceFrame: { width: 200, height: 160 },
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "中",
    geometricToOrganic: "有机为主",
    flatTo3D: "微立体",
    orderlyToCasual: "略随意"
  },
  colorStrategy: {
    primary:   { value: "$token:colors.primary",       role: "App 图标主色" },
    secondary: { value: "$token:colors.secondary",     role: "升级箭头" },
    neutral:   { value: "$token:colors.textPrimary",   role: "细节描边" },
    bg:        { value: "$token:colors.bgPage",        role: "图标内底" }
  },
  composition: "App 图标卡通形象 + 上方升级箭头光环 + 周围光点",
  layers: [
    { name: "App 图标主体", shape: "圆角矩形", fill: "$token:colors.primary",   position: "中下部",     size: "80×80" },
    { name: "微笑表情",     shape: "弧线",     stroke: "$token:colors.bgPage 3px round", position: "图标中部", size: "30×15" },
    { name: "升级箭头",     shape: "向上箭头", fill: "$token:colors.secondary", position: "图标上方",   size: "40×30" },
    { name: "光点装饰",     shape: "小圆点 ×4", fill: "$token:colors.accent",   position: "周围散布",   size: "4-6" }
  ],
  qualityChecklist: [
    "200×160 参考框内居中",
    "App 图标有'活'的感觉（微笑表情清晰）",
    "升级箭头明确传达'更新'语义",
    "色彩与 token 一致"
  ]
}
```

[继续每个素材...]

## 3. 跨 overlay 风格一致性

所有 overlay 内的 illustration 必须**风格一致**（参考 §2 的 styleAnalysis 4 维度）：
- simpleToRich: 中
- geometricToOrganic: 有机为主
- flatTo3D: 平面 / 微立体
- orderlyToCasual: 略随意

避免：一个 overlay 用扁平卡通，另一个用写实立体 → 风格断层。

## 4. ★ 沉淀到 schema 的结论

```jsonc
// 1. 每个 overlay 内素材节点的 meta.design.materialSpec
[列每个 meta/set_node 调用]
```

⚠️ **后续任务约束**：
- executor 阶段按 renderHint 分流绘制
- D-global-overlay-audit：跨 overlay 素材风格一致性核查
```
