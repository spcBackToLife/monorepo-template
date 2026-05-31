> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-global-overlay-materials
> 对应 schema 字段：globalOverlays[*].rootNode.children[*].meta.design.materialSpec

# D-global-overlay-materials — 全局 overlays 素材规格

## 需要 materialSpec 的节点

| 节点 | kind | renderHint | 需要素材？ |
|------|------|-----------|:--:|
| OfflineBanner / SessionExpiredModal 等容器 | — | css-only | 不需 materialSpec（纯 CSS bg + radius + shadow）|
| OfflineText / ExpiredTitle / ExpiredDesc | — | text | 不需（字体由 theme.typography）|
| RetryButton / ReLoginBtn | — | css-only | 不需（纯文字按钮）|
| **WifiOffIcon** | icon | svg 或 css-only | ⚠️ 决策 |

## WifiOffIcon 决策

候选：
- 方案 A: 纯色 8px 圆点（当前 styles 已表达） + materialSpec.kind=icon renderHint=css-only → ✅ 极简方案，与 minimal+flat 完美契合
- 方案 B: SVG wifi-off 图标（带斜线表示无信号）→ 信息量更大但增加视觉负担；banner 已有"网络已断开"文字，图标重复传递信息
- 方案 C: 不写 materialSpec → 不合规（C 端每屏至少 icon/装饰之一，overlay 同理）

→ **采用 A**：圆点占位（warning 色，醒目但极简）

## WifiOffIcon materialSpec

```jsonc
{
  kind: "icon",
  renderHint: "css-only",
  referenceFrame: { width: 8, height: 8 },
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "简洁",
    geometricToOrganic: "几何",
    flatTo3D: "平面",
    orderlyToCasual: "规整"
  },
  colorStrategy: {
    primary: { value: "$token:colors.warning", role: "状态指示点" }
  },
  composition: "单纯色圆点 8×8，作为'离线状态'的视觉指示。",
  layers: [
    { name: "状态点", shape: "实心圆", fill: "$token:colors.warning", stroke: "none", position: "居中", size: "8" }
  ],
  qualityChecklist: [
    "8×8 居中",
    "warning 色与 #FBBE2E 误差 < 5%",
    "在深灰底上对比度足够清晰"
  ],
  notes: "纯 CSS 圆点（borderRadius:full + bg），styles 已表达全部，executor 跳过素材绘制。"
}
```

## ★ 沉淀

materialSpec 在 D-global-overlay-audit 任务做整组 set_global_overlays 时下发。

**自检**：
- ✅ kind="icon" 合法
- ✅ colorStrategy 用 token，无硬编码
- ✅ qualityChecklist 全部可验证
- ✅ renderHint 与 styles 表达匹配（css-only ↔ borderRadius+bg）
