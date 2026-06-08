# schema-spec：装饰节点追加规则

> 适用任务：`D-X-G<N>-craft` 涉及装饰节点时
> design 阶段**只能**追加 4 类装饰节点——不允许重组上游业务骨架。
>
> 强约束：装饰节点必挂 `meta.design.kind = 'decoration'` + `meta.design.servingGoals: [...]`,空或无效 → R-ORPHAN-DECORATION / R-INVALID-KIND 拒。

## 1. 4 类装饰节点

| 类型 | 例子 | renderHint 推荐 | 视觉权重 |
|------|------|-----------------|---------|
| 背景氛围 | BgGradient / GlowAmbient | css-gradient 或 png | 3-5 |
| 角落溢出 | BgBlobTopRight / BgBlobBottomLeft | css 或 png | 2-4 |
| 分割装饰 | DividerLine / OrnamentSeparator | css 或 svg | 1-3 |
| 品牌点缀 | BrandPattern / Watermark | png | 2-4 |

## 2. 强制约束（每个装饰节点必满足）

```jsonc
node = {
  type: "div",
  name: "<PascalCase>",                // 推荐以 Bg / Deco / Glow 等开头便于识别
  styles: {
    position: "absolute",              // ★ 必须 absolute,否则占位
    zIndex: 0,                         // ★ 0/1,不能 ≥ 5
    pointerEvents: "none",             // ★ 必须 none,否则误拦截点击
    // 位置 + 尺寸
    top/right/bottom/left: "...",
    width: "...",
    height: "...",
    // 视觉
    background / backgroundImage / borderRadius / opacity / filter / ...
  },
  props: {},
  children: [],
  states: [],
  events: [],                          // 装饰节点不应有 events（无业务/无交互）
  activeState: "default",
  locked: false,
  visible: true,

  // ★ 必挂 meta.design
  meta: {
    design: {
      kind: "decoration",              // ★ 必填,否则 R-INVALID-KIND
      servingGoals: ["G<N>"],          // ★ 必填,否则 R-ORPHAN-DECORATION
      summary: "服务 G<N> <一句话> 的 <类型> 装饰",
      rationale: "为什么需要这个装饰 + 视觉效果",
      visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
      materialSpec: { kind: "decoration", renderHint: "css-gradient" | "png", ... }
    }
  }
}
```

## 2.1 红线（service 端校验）

| 红线 | 触发 |
|---|---|
| **R-ORPHAN-DECORATION** | 装饰节点 servingGoals 空或字段缺失 |
| **R-INVALID-KIND** | 装饰节点未挂 kind=decoration |
| **R-INVALID-GOAL-REF** | servingGoals 引用 goalId 不存在于 screen.meta.design.designGoals |
| **R-DECORATION-MULTI-FAMILY** | 一屏内出现 ≥ 2 装饰族（详见 methodology/06-decoration-system.md）|

## 3. 装饰节点完整示例

### 背景光晕（CSS 渐变）
```jsonc
n14 (PinkCircleDeco) = {
  id: "pinkCircleDeco",
  type: "div",
  name: "PinkCircleDeco",
  label: "粉色光晕装饰",
  styles: {
    position: "absolute",
    top: "-40px",
    right: "-60px",
    width: "180px",
    height: "180px",
    borderRadius: "$token:radius.full",
    background: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)",
    zIndex: 0,
    pointerEvents: "none"
  },
  props: {},
  children: [],
  states: [],
  events: [],
  activeState: "default",
  locked: false,
  visible: true,
  meta: {
    design: {
      summary: "右上角粉色光晕，营造温暖氛围",
      rationale: "对照视觉预算 weight=4 / 氛围-装饰 / 允许渐变+blur。引导视线流向 FormCard 顶部。",
      visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
      materialSpec: {
        kind: "decoration",
        renderHint: "css-gradient",
        referenceFrame: { width: 180, height: 180 },
        background: "transparent",
        composition: "径向渐变圆，中心 primaryLight 50% 到边缘 0%",
        notes: "renderHint=css-gradient 时 styles 已表达全部"
      }
    }
  }
}
```

### 角落溢出（PNG）
```jsonc
n15 (MintLeafDeco) = {
  id: "mintLeafDeco",
  type: "div",
  name: "MintLeafDeco",
  label: "薄荷叶装饰",
  styles: {
    position: "absolute",
    bottom: "10%",
    left: "-20px",
    width: "120px",
    height: "120px",
    backgroundImage: "<待 executor 写入 PNG URL>",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    zIndex: 0,
    pointerEvents: "none"
  },
  props: {},
  children: [],
  states: [],
  events: [],
  activeState: "default",
  locked: false,
  visible: true,
  meta: {
    design: {
      summary: "左下角薄荷叶有机装饰，平衡构图",
      rationale: "右上角粉色重，左下需平衡。三叶错落呼应 organic + playful 主题。",
      visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
      materialSpec: {
        kind: "decoration",
        renderHint: "png",
        referenceFrame: { width: 120, height: 120 },
        background: "transparent",
        styleAnalysis: { /* 见 material-spec.md */ },
        colorStrategy: {
          primary: { value: "$token:colors.secondary", role: "叶片主色" }
        },
        composition: "三片相互交叠的薄荷叶，自然倾斜，自由形态",
        layers: [
          { name: "底层叶", shape: "椭圆+尖端", fill: "$token:colors.secondary",      position: "左下", size: "60×40" },
          { name: "中层叶", shape: "椭圆+尖端", fill: "$token:colors.secondaryLight", position: "中",   size: "70×50" },
          { name: "顶层叶", shape: "椭圆+尖端", fill: "$token:colors.secondary",      position: "右上", size: "55×35" }
        ],
        qualityChecklist: [
          "120×120 参考框内",
          "三叶清晰可辨",
          "透明通道正确",
          "色与 token 一致"
        ]
      }
    }
  }
}
```

### 分割装饰（SVG）
```jsonc
n16 (OrnamentSeparator) = {
  id: "ornamentSep",
  type: "div",
  name: "OrnamentSeparator",
  label: "分割花纹",
  styles: {
    width: "60px",
    height: "12px",
    margin: "$token:spacing.md auto",
    opacity: 0.6
    // SVG 由 executor 注入到 props.svgContent 或 backgroundImage
  },
  meta: {
    design: {
      summary: "段落间分割装饰",
      rationale: "替代普通 hr，增加 organic 风格细节。",
      visualSpec: { weight: "Lightest", zIndex: 1, role: "氛围-装饰" },
      materialSpec: {
        kind: "decoration",
        renderHint: "svg",
        referenceFrame: { width: 60, height: 12 },
        composition: "三个连接的有机点 + 居中圆点 + 两侧小弧",
        layers: [...],
        qualityChecklist: [...]
      }
    }
  }
}
```

### 品牌点缀（PNG）
```jsonc
n17 (BrandWatermark) = {
  id: "brandWatermark",
  type: "div",
  name: "BrandWatermark",
  label: "品牌水印",
  styles: {
    position: "absolute",
    bottom: "16px",
    right: "16px",
    width: "32px",
    height: "32px",
    opacity: 0.15,
    backgroundImage: "<待 executor 写入 PNG URL>",
    backgroundSize: "contain",
    pointerEvents: "none"
  },
  meta: {
    design: {
      summary: "右下角品牌水印（低调）",
      rationale: "强化品牌识别度，但用低 opacity 不抢内容焦点。",
      visualSpec: { weight: "Lightest", zIndex: 1, role: "氛围-装饰" },
      materialSpec: { kind: "brand", renderHint: "png", ... }
    }
  }
}
```

## 4. MCP 调用

```jsonc
element/add {
  projectId,
  parentId: "<screen-rootNode-id 或装饰容器 id>",
  name: "PinkCircleDeco",
  label: "粉色光晕装饰",
  type: "div",
  styles: { /* 完整 */ },
  props: {},
  // 同时通过 meta/set_node 写 design 字段（可分两步或一步）
}

meta/set_node {
  projectId, nodeId,
  patch: { design: { summary, rationale, visualSpec, materialSpec } }
}
```

## 5. 装饰节点的位置策略

```
背景氛围 → 父节点：screen.rootNode
角落溢出 → 父节点：screen.rootNode 或 HeaderArea
分割装饰 → 父节点：FormCard 内（在两段之间）
品牌点缀 → 父节点：screen.rootNode 或 FooterLinks
```

**红线**：
- ❌ 装饰节点放进 FormCard 内（影响 FormCard 布局）
- ❌ 装饰节点 z-index ≥ 5（抢占内容层）
- ❌ 装饰节点不写 pointerEvents:none

## 6. 视觉预算约束

装饰节点总和 weight ≤ 8（详见 `methodology/02-visual-budget.md`）。

```
PinkCircleDeco (4) + MintLeafDeco (3) + BrandWatermark (1) = 8 ✅
PinkCircleDeco (5) + MintLeafDeco (4) + BrandWatermark (2) + Pattern (3) = 14 ❌ 超
```

超 → 删微装饰 → 削权重 → 合并节点。

## 7. 红线汇总

- ❌ 装饰节点不放 absolute → 占据布局
- ❌ 装饰节点不写 pointerEvents:none → 拦截点击
- ❌ 装饰节点 z-index ≥ 5 → 抢内容层
- ❌ 装饰节点写 events → 装饰是无交互的
- ❌ 装饰节点没 meta.design.materialSpec → 即使是 css-gradient 也要标记 kind=decoration + renderHint=css-gradient
- ❌ 装饰类型超 3 大类 → 视觉灾难
- ❌ 装饰总 weight > 8 → R-BUDGET-01 风险
- ❌ 把"装饰"建到 FormCard 内（应建在 rootNode 平级）→ 影响布局
