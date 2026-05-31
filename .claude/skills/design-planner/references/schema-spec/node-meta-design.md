# schema-spec：node.meta.design 完整字段

> 适用任务：`D-X-meta`、`D-X-materials`、`D-system-baseline`

## 1. NodeMeta.design 接口

```typescript
interface NodeMetaDesign {
  /** 一句话设计意图（必填） */
  summary?: string;            // "主 CTA 按钮：药丸 / 草莓粉 / 白字 / spring hover 抬升 / 6 态完备"

  /** 设计理由（必填，回答"为什么这么设计"） */
  rationale?: string;          // "登录页核心 CTA，视觉权重最高。圆角 full 呼应 organic 主题。spring 动效呼应 playful aesthetics。"

  /** 视觉规格（权重 / 层级 / 角色） */
  visualSpec?: {
    weight?: 'Lightest' | 'Light' | 'Medium' | 'Heavy' | 'Heaviest';
    zIndex?: number;
    role?: '主角-CTA' | '主角-内容' | '主角-品牌'
         | '配角-信息' | '配角-容器'
         | '工具-导航' | '工具-输入'
         | '氛围-装饰';
  };

  /** 素材规格（仅当节点需要素材时填，详见 material-spec.md） */
  materialSpec?: MaterialSpec;

  /** 外部权威参考（可选） */
  ref?: string;                // figma 链接 / 设计稿 URI
}
```

**MCP**：
```jsonc
meta/set_node {
  projectId, nodeId,
  patch: {
    design: { summary: "...", rationale: "...", visualSpec: {...}, materialSpec: {...} }
  }
}
```

## 2. summary 规范

**约束**：
- 必填
- ≤ 60 字
- 必须包含：核心视觉特征 + 主要手段
- 不能是"漂亮"、"好看"、"现代"等空话

**好例**：
```
"主 CTA 按钮：药丸 / 草莓粉 / 白字 / spring hover 抬升 / 6 态完备"
"登录卡：圆角 16px / 中等阴影 / 白底 / 顶部留 lg 间距 / 内 md 间距"
"右上角粉色光晕：CSS radial-gradient / 12% 透明度 / 180×180 / blur 高度模糊"
"薄荷叶装饰：左下角 / PNG 素材 / 三叶错落 / 8% 透明度 / 平衡构图"
```

**坏例**：
```
"按钮"          → 太短，无信息
"漂亮的按钮"    → 空话
"主按钮，看起来很现代"  → 没视觉特征
```

## 3. rationale 规范

**约束**：
- 必填
- 回答**为什么**（视觉决策依据）
- 引用 budget 表 + 主题 + 情感目标
- ≥ 30 字

**好例**：
```
"登录页核心 CTA，视觉权重最高（budget weight=9）。圆角 full 呼应 organic aesthetics 主题，
spring 动效呼应 playful 情感（用户输入信息时的轻松感）。6 态完备保证清晰交互反馈。"
```

```
"对照视觉预算 weight=4 / 氛围-装饰 / 允许渐变+blur。
此装饰功能：引导视线从 BrandLogo 流向 FormCard 顶部，配合右上角光源暗示。"
```

**坏例**：
```
"用品牌色 + 中等阴影"          → 只说了"是什么"，没说"为什么"
"看起来好"                       → 空话
"参考了类似产品"                 → 不具体
```

## 4. visualSpec 规范

```jsonc
visualSpec: {
  weight: "Heaviest",      // 与 budget 表中 weight 数值对齐：1-2=Lightest, 3-4=Light, 5-6=Medium, 7-8=Heavy, 9-10=Heaviest
  zIndex: 2,                // 与 layers 配置对齐
  role: "主角-CTA"          // 与 budget 表中 role 一致
}
```

**约束**：
- weight 文字阶必须与 componentBudgets[*].weight 数字阶一致
- zIndex 必须与 styles.zIndex 一致 + 在 layers 中能找到
- role 必须是 8 个枚举之一，且与 budget 表一致

## 5. materialSpec（仅需要素材的节点）

详见 `material-spec.md`。简要：
- kind: brand / icon / decoration / illustration / background
- referenceFrame / styleAnalysis / colorStrategy / lineStyle / composition / layers / variants / qualityChecklist / renderHint

## 6. 完整示例

### 主按钮（无素材）
```jsonc
n9 (SubmitBtn).meta.design = {
  summary: "主 CTA 按钮：药丸 / 草莓粉 / 白字 / spring hover 抬升 / 6 态完备",
  rationale: "登录页核心 CTA，视觉权重最高（budget weight=9）。圆角 full 呼应 organic 主题，spring 动效呼应 playful 情感。6 态完备保证清晰交互反馈。",
  visualSpec: {
    weight: "Heaviest",
    zIndex: 2,
    role: "主角-CTA"
  }
  // materialSpec 不填（按钮自身用 CSS 实现）
}
```

### 品牌 Logo（需 PNG 素材）
```jsonc
n2 (BrandLogo).meta.design = {
  summary: "品牌锚点 / 第一视觉焦点 / 粉色地图气泡+白连接弧+薄荷点",
  rationale: "登录页第一视觉接触点，需高识别度。地理符号呼应'校园社交'定位，气泡造型呼应 playful，60×60 在 360 宽设计稿上占视觉重量约 8（与 budget 一致）。",
  visualSpec: { weight: "Heavy", zIndex: 1, role: "主角-品牌" },
  materialSpec: {
    kind: "brand",
    renderHint: "png",
    referenceFrame: { width: 64, height: 64 },
    background: "transparent",
    styleAnalysis: {
      simpleToRich: "简洁偏中",
      geometricToOrganic: "有机为主",
      flatTo3D: "平面",
      orderlyToCasual: "略随意 playful"
    },
    colorStrategy: {
      primary:   { value: "$token:colors.primary",   role: "主体气泡" },
      secondary: { value: "$token:colors.secondary", role: "右上装饰点" },
      neutral:   { value: "#FFFFFF",                  role: "内部白色弧线" }   // 例外（白色不在 token 中）
    },
    lineStyle: { width: "2.5-3px", cap: "round", join: "round" },
    composition: "粉色地图气泡（底部尖角圆润，居中，40×48px）+ 内部两段白色相连弧（120°，20×16px，居中偏上）+ 右上角薄荷绿小实心圆点（8px）",
    safeZone: "四周 6px padding",
    layers: [
      { name: "主体",    shape: "水滴气泡",       fill: "$token:colors.primary",   stroke: "none", position: "居中",     size: "40×48" },
      { name: "内部图形", shape: "两段相连圆弧", fill: "none",                     stroke: "#FFFFFF 3px round", position: "居中偏上", size: "20×16" },
      { name: "装饰",    shape: "实心圆",        fill: "$token:colors.secondary", stroke: "none", position: "右上角外沿", size: "8" }
    ],
    qualityChecklist: [
      "64×64 参考框内居中",
      "气泡造型清晰可辨",
      "内部连接符号该尺寸下可读",
      "透明通道正确",
      "色彩与 token 一致"
    ]
  }
}
```

### 装饰节点（CSS 实现）
```jsonc
n14 (PinkCircleDeco).meta.design = {
  summary: "右上角粉色光晕：CSS radial-gradient / 12% 透明度 / 180×180 / blur",
  rationale: "对照视觉预算 weight=4 / 氛围-装饰 / 允许渐变+blur。引导视线从 HeaderArea 顶部流向 FormCard。CSS 实现避免 PNG 资产开销。",
  visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
  materialSpec: {
    kind: "decoration",
    renderHint: "css-gradient",          // ★ CSS 实现，executor 跳过素材绘制
    referenceFrame: { width: 180, height: 180 },
    background: "transparent",
    composition: "径向渐变圆，中心 primaryLight 50% 到边缘 0%",
    notes: "renderHint=css-gradient 时上面的 styles 已表达全部，无需画 PNG"
  }
}
```

## 7. 屏级 vs 节点级 design 字段对比

| 字段 | 屏级 (`screen.meta.design`) | 节点级 (`node.meta.design`) |
|------|----------------------------|----------------------------|
| summary | 整屏氛围浓缩（≤ 60 字）| 单节点设计意图（≤ 60 字）|
| rationale | ❌ 屏级用 summary 即可（用 layers / componentBudgets 替代深论证）| ✅ 必填，回答"为什么"|
| palette | ✅ 屏用到的 token 名 | ❌ 节点不写（在 styles 体现）|
| layers | ✅ 视觉层级 4 层 | ❌ 节点写 visualSpec.zIndex |
| componentBudgets | ✅ 视觉预算分配表 | ❌ 节点写 visualSpec.weight 引用 budget |
| visualSpec | ❌ | ✅ |
| materialSpec | ❌ | ✅（按需）|
| ref | ✅ | ✅ |

## 8. MCP 调用清单

| 字段 | MCP |
|------|-----|
| node.meta.design.{summary,rationale,visualSpec,materialSpec,ref} | `meta/set_node { patch: { design: {...} } }` |
| node.meta.status.phase | `meta/set_node_status { phase: "designed" }` |

## 9. 红线

- ❌ summary 空话 / 不含视觉特征 / > 60 字
- ❌ rationale < 30 字 / 不回答"为什么" / 不引用 budget+主题+情感
- ❌ visualSpec.weight 与 componentBudgets 不一致
- ❌ visualSpec.zIndex 与 styles.zIndex 不一致
- ❌ visualSpec.role 与 componentBudgets 不一致
- ❌ 需要素材的节点不写 materialSpec → 下游 executor 不知道画什么
- ❌ 不需要素材的节点强行写 materialSpec → 多余字段
