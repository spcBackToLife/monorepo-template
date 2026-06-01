# schema-spec：MaterialSpec 接口完整规范

> 适用任务：`D-X-materials`、`D-global-overlay-materials`
> 这是 design 阶段交给 executor + material-painter 的"素材绘制蓝图"——精确到能照画。

## 1. MaterialSpec 接口（10 节）

```typescript
interface MaterialSpec {
  /** 1. 基本信息（必填） */
  kind: 'brand' | 'icon' | 'decoration' | 'illustration' | 'background';
  referenceFrame: { width: number; height: number };
  background: string;                  // "transparent" / "$token:colors.bgPage"

  /** 2. 风格分析（必填，4 维度） */
  styleAnalysis: {
    simpleToRich: string;              // 简洁 vs 丰富（"简洁偏中" / "中" / "丰富偏中"）
    geometricToOrganic: string;        // 几何 vs 有机
    flatTo3D: string;                  // 平面 vs 立体
    orderlyToCasual: string;           // 规整 vs 随意
  };

  /** 3. 色彩策略（必填，必须全部 token 引用，少量例外） */
  colorStrategy: {
    [role: string]: { value: string; role: string };
    // 例：primary: { value: "$token:colors.primary", role: "主体气泡" }
  };

  /** 4. 线条特征（描边类素材必填，纯填充类可省） */
  lineStyle?: {
    width: string;                     // "2px" 或 "2.5-3px"
    cap: 'butt' | 'round' | 'square';
    join: 'miter' | 'round' | 'bevel';
  };

  /** 5. 构图方案（必填） */
  composition: string;                 // 一段自然语言，描述构图概念
  safeZone?: string;                   // 安全区描述（如"四周 6px padding"）

  /** 6. 图层结构（必填，自上而下，给 material-painter 直接照画） */
  layers: Array<{
    name: string;                      // "主体" / "内部图形" / "装饰"
    shape: string;                     // "水滴气泡轮廓"
    fill?: string;                     // "$token:colors.primary"
    stroke?: string;                   // "#FFFFFF 3px round"
    position?: string;                 // "居中" / "右上角外沿"
    size?: string;                     // "40×48"
  }>;

  /** 7. 变体（如有多 variant） */
  variants?: Array<{
    name: string;                       // "dark" / "small" / "active"
    scenario: string;                   // "暗色主题切换时使用"
    diff: string;                       // "颜色 token 替换为 onPrimary"
  }>;

  /** 8. 应用效果（应用到节点上的额外样式，可选） */
  appliedStyles?: Record<string, string>;
                                       // 例：{ marginTop: "$token:spacing.lg" }

  /** 9. 质量核对清单（必填） */
  qualityChecklist: string[];          // ["64×64 参考框内居中", "透明通道正确", ...]

  /** 10. 渲染提示（必填，决定 executor 怎么处理） */
  renderHint: 'png' | 'svg' | 'css-gradient' | 'css-only';
  // png:           调 material-painter 画 + 上传 + 应用到 backgroundImage/src
  // svg:           内联 SVG（小图标、路径简单）
  // css-gradient:  design 已在 styles 写背景，executor 跳过
  // css-only:      全 CSS 实现（如纯色块装饰），executor 跳过

  /** 11. 备注（可选） */
  notes?: string;
}
```

## 2. kind 枚举（必填）

| kind | 用途 | 典型例子 |
|------|------|---------|
| `brand` | 品牌素材 | Logo / 品牌符号 / Watermark |
| `icon` | 功能图标 | 关闭 X / 切换箭头 / 提交图标 / 分享图标 |
| `decoration` | 装饰素材 | 角落 blob / 背景光晕 / 分割纹路 |
| `illustration` | 插画 | 空态插图 / 错误页插图 / 引导插图 |
| `background` | 整体背景图 | 启动屏背景 / Hero 区域大图 |

## 3. styleAnalysis 4 维度

让 material-painter 知道**风格定调**：

```
simpleToRich      "简洁" → "简洁偏中" → "中" → "丰富偏中" → "丰富"
geometricToOrganic "几何" → "几何为主" → "中" → "有机为主" → "有机"
flatTo3D          "平面" → "平面为主" → "微立体" → "立体为主" → "立体"
orderlyToCasual   "规整" → "规整偏中" → "中" → "略随意" → "随意"
```

**作用**：4 个维度组合 → 16 种风格变体。AI 画素材时按这 4 维度调整笔触/细节/边缘处理。

## 4. colorStrategy（关键 ★）

```jsonc
colorStrategy: {
  primary:   { value: "$token:colors.primary",       role: "主体气泡" },
  secondary: { value: "$token:colors.secondary",     role: "右上装饰点" },
  neutral:   { value: "#FFFFFF",                      role: "内部白色弧线" },   // 例外（白色不在 token 中也允许）
  accent:    { value: "$token:colors.accent",        role: "高光" }
}
```

**约束**：
- 每个 color role 用语义化名（primary / secondary / neutral / accent / detail）
- value 必须 `$token:` 引用 → 否则 R-MATERIAL-02
- 例外：白色 `#FFFFFF` / 黑色 `#000000` / 透明 `transparent` 允许直接写
- role 必须用中文短语描述这个色用在哪（"主体气泡" / "高光" / "底层光晕"）

## 5. composition 写法

一段自然语言，描述构图概念。要点：
- 主元素在哪 / 多大
- 辅助元素在哪 / 多大
- 元素之间的视觉关系（叠加 / 错位 / 对称）
- 整体构图意图（"居中聚焦" / "对角引导" / "三角平衡"）

**好例**：
```
"粉色地图气泡（底部尖角圆润，居中，40×48px）+ 内部两段白色相连弧（120°，20×16px，居中偏上）
 + 右上角薄荷绿小实心圆点（8px）"
```

```
"三片相互交叠的薄荷叶，自然倾斜，自由形态。底层叶左下、中层叶居中、顶层叶右上，
 形成从左下向右上的视觉流向。"
```

**坏例**：
```
"画一个 logo"        → 没信息
"漂亮的图标"          → 空话
"参考某某品牌"        → 不具体
```

## 6. layers 数组（自上而下）

material-painter 按 layers 顺序逐层画。**自上而下排序**——索引 0 是最底层，索引 N 是最顶层。

每层必须含：
- `name`：图层名（中文短语）
- `shape`：形状描述
- `fill` / `stroke`：填充 / 描边（必有其一）
- `position`：位置（"居中" / "左下" / 具体坐标）
- `size`：尺寸

```jsonc
layers: [
  { name: "底色", shape: "圆形",   fill: "$token:colors.primaryLight",  stroke: "none",                position: "居中", size: "180×180" },
  { name: "主图", shape: "水滴气泡", fill: "$token:colors.primary",       stroke: "none",                position: "居中", size: "120×140" },
  { name: "高光", shape: "弧线",    fill: "none",                         stroke: "#FFFFFF 2.5px round", position: "气泡顶部内", size: "60×30" },
  { name: "装饰", shape: "实心圆",  fill: "$token:colors.secondary",     stroke: "none",                position: "右上角外沿", size: "12" }
]
```

## 7. qualityChecklist（验收标准）

executor 画完素材后，按此清单逐条核对。每条必须是**可验证**的（不能是"好看"）：

```jsonc
qualityChecklist: [
  "64×64 参考框内居中",
  "气泡造型清晰可辨",
  "内部连接符号该尺寸下可读",
  "透明通道正确（背景全透明）",
  "色彩与 token 解析后的色值一致（误差 < 5%）",
  "线条边缘干净无锯齿",
  "stroke 圆头圆角连接（lineStyle 一致）"
]
```

## 8. renderHint（决定 executor 怎么处理）

| renderHint | executor 行为 |
|-----------|---------------|
| `png` | 调 material-painter 画 + 上传 + 应用到 `node.styles.backgroundImage` 或 `props.src` |
| `svg` | 把 layers 翻译为内联 SVG 字符串，写到节点 props.svgContent（按需） |
| `css-gradient` | design 已在 styles 写好渐变，executor 跳过素材绘制（仅做截图核对）|
| `css-only` | 全 CSS 实现（纯色 / 简单几何），executor 跳过 |

**判断**：
- 复杂形状 / 多色 / 不规则 → `png`
- 简单几何 / 单色 / 路径短（< 5 段）→ `svg`
- 渐变背景 / 光晕 → `css-gradient`
- 纯色块 / 边框 / 单一图形 → `css-only`

## 9. variants（多变体）

```jsonc
variants: [
  {
    name: "dark",
    scenario: "暗色主题（colorScheme=dark）切换时使用",
    diff: "primary → primaryDark, neutral → #1A1A1A 替代 #FFFFFF"
  },
  {
    name: "small",
    scenario: "小尺寸（32×32）使用",
    diff: "省略内部装饰圆点；仅保留主体 + 高光"
  },
  {
    name: "active",
    scenario: "选中态显示",
    diff: "外层加 0 0 8px primary 50% 发光"
  }
]
```

**何时用 variants**：
- 同一 logo 需要明 / 暗主题两套
- 同一图标需要 small / large 两套
- 同一装饰需要默认 / 选中两套

## 10. 完整示例

### 品牌 Logo
```jsonc
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
    neutral:   { value: "#FFFFFF",                  role: "内部白色弧线" }
  },
  lineStyle: { width: "2.5-3px", cap: "round", join: "round" },
  composition: "粉色地图气泡（底部尖角圆润，居中，40×48px）+ 内部两段白色相连弧（120°，20×16px，居中偏上）+ 右上角薄荷绿小实心圆点（8px）",
  safeZone: "四周 6px padding",
  layers: [
    { name: "主体",    shape: "水滴气泡",       fill: "$token:colors.primary",   stroke: "none",                position: "居中",     size: "40×48" },
    { name: "内部图形", shape: "两段相连圆弧", fill: "none",                     stroke: "#FFFFFF 3px round", position: "居中偏上", size: "20×16" },
    { name: "装饰",    shape: "实心圆",        fill: "$token:colors.secondary", stroke: "none",                position: "右上角外沿", size: "8" }
  ],
  qualityChecklist: [
    "64×64 参考框内居中",
    "气泡造型清晰可辨",
    "内部连接符号该尺寸下可读",
    "透明通道正确",
    "色彩与 token 一致",
    "线条圆头圆角"
  ],
  variants: [
    { name: "dark", scenario: "暗色主题", diff: "primary → primaryDark; neutral → #1A1A1A" }
  ]
}
```

### 装饰（CSS 渐变）
```jsonc
materialSpec: {
  kind: "decoration",
  renderHint: "css-gradient",
  referenceFrame: { width: 180, height: 180 },
  background: "transparent",
  styleAnalysis: { simpleToRich: "简洁", geometricToOrganic: "有机", flatTo3D: "平面", orderlyToCasual: "随意" },
  colorStrategy: {
    primary: { value: "$token:colors.primaryLight", role: "光晕中心" }
  },
  composition: "径向渐变圆，中心 primaryLight 50% 到边缘 0%",
  layers: [
    { name: "渐变光晕", shape: "径向渐变圆", fill: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)", position: "右上角溢出", size: "180×180" }
  ],
  qualityChecklist: [
    "CSS 渲染：右上角光晕在 12% 透明度 + blur 效果",
    "色彩与 token primaryLight 一致",
    "光晕边缘自然过渡"
  ],
  notes: "renderHint=css-gradient 时 styles.background 已表达全部，executor 跳过素材绘制"
}
```

### 空态插画（PNG illustration）
```jsonc
materialSpec: {
  kind: "illustration",
  renderHint: "png",
  referenceFrame: { width: 240, height: 200 },
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "中",
    geometricToOrganic: "有机为主",
    flatTo3D: "平面+轻微立体",
    orderlyToCasual: "略随意"
  },
  colorStrategy: {
    primary:   { value: "$token:colors.primary",       role: "主体袋鼠" },
    secondary: { value: "$token:colors.secondary",     role: "袋中物品" },
    neutral:   { value: "$token:colors.bgPage",        role: "背景" },
    accent:    { value: "$token:colors.accent",        role: "高光点缀" }
  },
  composition: "袋鼠双手摊开，肚袋空空，表情友好不悲伤——传达'目前没有内容但很欢迎你'",
  layers: [
    { name: "袋鼠身体", shape: "椭圆形 + 长尾",  fill: "$token:colors.primary",   position: "居中", size: "180×140" },
    { name: "肚袋",     shape: "弧形开口",       fill: "$token:colors.bgPage",     position: "中下部", size: "60×40" },
    { name: "面部",     shape: "圆头 + 表情",     fill: "$token:colors.primary",   position: "顶部", size: "70×60" },
    { name: "腮红",     shape: "两个小圆",       fill: "$token:colors.accent",    position: "面部两侧", size: "8×8" }
  ],
  qualityChecklist: [
    "袋鼠表情友好（嘴角微上扬，眼神温和）",
    "肚袋开口清晰但不夸张",
    "整体色调与登录页 palette 一致",
    "240×200 参考框内居中"
  ]
}
```

## 11. 红线

- ❌ kind 不是 5 个枚举之一
- ❌ colorStrategy 用硬编码 hex（除 #FFFFFF / #000000 / transparent）→ R-MATERIAL-02
- ❌ composition 是空话（"画一个 logo"）→ R-MATERIAL-01
- ❌ layers 数组为空或顺序乱（不是自上而下）
- ❌ qualityChecklist 含主观词（"好看"）→ 不可验证
- ❌ renderHint 与实际实现不匹配（写 css-gradient 但 styles 没渐变 → executor 不知道怎么办）
- ❌ kind=brand/icon/illustration 但 colorStrategy 只有 1 个色 → 风格扁平
- ❌ kind=decoration 但 weight > 5 → 喧宾夺主

---

## 12. design 自己跑素材绘制 + 落地 manifest

### 12.1 角色定位

| 阶段 | 谁做 |
|------|------|
| 写 spec | design |
| 调 material-painter 子技能 | **design 本人** |
| 上传/绑定 materialProjectId | **design 本人** |
| 应用 applyMaterialDesign | **design 本人** |
| 截图核对 | **design 自审 + executor 复核** |

**为什么 design 亲手跑**：design 是"创作者"。不动手画就只能写一份"幻想 spec"——画出来不像、色不对、构图崩，回头还是要返工。直接画、直接看效果、直接调，是闭环创作。

### 12.2 创作流程（5 步）

```
1. 写 spec  →  notes/D-X-materials/<node>.md（含 MaterialSpec JSON）
2. 调子技能  →  Skill: material-painter，传 spec
3. 落地 manifest  →  把 materialProjectId 写到 node.materialProjectId
4. 应用样式  →  applyMaterialDesign（注入 9 项 backgroundXxx CSS）
5. 自审截图  →  generate_snapshots → 看像不像 spec → 不像就改 → 改完再截
```

### 12.3 manifest：node.materialProjectId

落地后必须把素材工程 ID 写回节点：

```jsonc
// 节点 schema
{
  id: "BrandLogo",
  type: "div",
  materialProjectId: "mat_abc123",   // ★ design 写
  styles: {
    width: "64px",
    height: "64px",
    backgroundImage: "url(https://cdn.../mat_abc123.png)",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
    // ... 其余 6 项由 applyMaterialDesign 自动注入
  }
}
```

**为什么必填**：
- 素材编辑器要用 materialProjectId 重新打开画布二次编辑
- material-slot CRUD 要用它做"节点 ↔ 素材"多对多绑定
- audit 阶段要按 materialProjectId 查回素材工程，核对 manifest 是否仍然存在

### 12.4 applyMaterialDesign 注入的 9 项

子技能 / canvas.export_and_apply 跑完后，会往节点的 styles 里 append 这 9 项（已有则覆盖）：

```
backgroundImage         url(<cdn-png>) 或 linear-gradient(...)
backgroundSize          contain | cover | <px>
backgroundPosition      center | top left | <x y>
backgroundRepeat        no-repeat
backgroundColor         透明素材时通常 transparent
backgroundOrigin        padding-box
backgroundClip          border-box
backgroundAttachment    scroll
imageRendering          auto | crisp-edges（icon 类用 crisp-edges）
```

**清理义务（design 自己做）**：
- 同节点之前如果有 `background: linear-gradient(...)` shorthand，先删 → 否则会被新写的 9 项 partially override 留脏值
- 同节点之前如果有 `backgroundImage: 'none'`，先删
- 检查 9 项与 spec 是否一致（如 spec 说 cover 但实际写成 contain → 改回 cover）

### 12.5 自审截图（必做）

落完 9 项后立刻调 `generate_snapshots`，对照 spec 的 `composition` / `qualityChecklist` 逐条核对：

```markdown
## 自审：BrandLogo
- 截图：notes/handover/snapshots/sc_xxx-after-logo.png
- spec composition："粉色地图气泡 + 内部白色弧线 + 右上薄荷绿点"
- 实际：✅ 气泡形状对 / ❌ 内部弧线偏粗（spec 写 3px,实际看 4-5px）/ ✅ 右上点位置对
- 修正：重画(traceBack=spec)调 lineStyle.width: "2.5px"
- 第二轮截图：✅ 全部 6 条 qualityChecklist 通过
```

如果 3 轮重画后仍不能通过 spec，标 status=blocked → upstreamChallenge → product 决定是否调风格。

### 12.6 expectedArtifacts（机器对账）

D-X-materials 任务的 expectedArtifacts 必须含:

```jsonc
expectedArtifacts: [
  // 节点层面
  { kind: "hasKeys",  path: "screens.<scId>.rootNode.<nodeId>", keys: ["materialProjectId"] },
  // 样式层面（applyMaterialDesign 已跑）
  { kind: "hasKeys",  path: "screens.<scId>.rootNode.<nodeId>.styles",
    keys: ["backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat"] },
  // 截图证据（handover 期间）
  { kind: "nonEmpty", path: "notes/D-X-materials/<node>.md#self-review" }
]
```

任务标 done 时 service 端跑这 3 条对账,任意一条不通过 → 拒绝标 done。

### 12.7 红线

- ❌ design 写完 spec 但没调 material-painter / 没落地 → R-MATERIAL-FLOW-01
- ❌ 落地后没把 materialProjectId 写回节点 → R-MATERIAL-FLOW-02
- ❌ applyMaterialDesign 后没清理旧的 background shorthand → 9 项 override 不全 → 视觉脏
- ❌ 没自审截图就标 done → 大概率画错了不知道
- ❌ 自审 3 轮失败仍硬标 done → 应该 blocked + upstreamChallenge
