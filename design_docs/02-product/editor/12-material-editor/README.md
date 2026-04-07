# 12 - 素材编辑器（Material Editor）

> **根本问题：如何让设计师在不离开设计编辑器的情况下，创作和管理所有视觉素材？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [07-资产管理系统](../07-asset-management/README.md) — 素材与组件资产的整体管理
> - [03-右侧属性面板](../03-property-panel/README.md) — 素材的使用位置
> - [design-schema](../../../03-tech/design-schema.md) — Schema 中素材的承载方式
> - [09-backend-extensions](../../../03-tech/editor/09-backend-extensions.md) — 文件上传与存储

---

## 一、第一性原理分析

### 1.1 回到最底层：什么是"素材"？

```
UI 的视觉表现 = 结构(DOM) + 样式(CSS) + 素材(Media)

素材的本质：
  一切不能用纯 CSS 属性描述的视觉内容

具体来说：
  · 图形 — 矢量图标、装饰线条、自定义形状（SVG/Path）
  · 图像 — 照片、插画、纹理（PNG/JPG/WebP）
  · 渐变与纹理 — 多层渐变、混合叠加、图案填充
  · 动画 — 微交互动画、加载动画、过渡效果（Lottie/PAG/GIF）
  · 视频 — 背景视频、产品演示（MP4/WebM）
```

### 1.2 当前设计工具的痛点

```
痛点 1: 割裂的工作流
  Figma 做设计 → Illustrator 画图标 → After Effects 做动画 → 回到 Figma 贴图
  每换一个工具 → 上下文切换成本 + 资源管理混乱

痛点 2: 素材无法与 Schema 深度绑定
  传统工具中素材就是一张静态图片
  无法表达：这个素材应该放在什么 CSS 属性上？多层如何叠加？

痛点 3: 素材创作能力不足或过度
  Figma 的矢量编辑器很强 → 但它的定位是"画所有东西"，太重了
  CSS 渐变工具 → 太弱，只能单层
  没有一个"恰到好处"的素材创作工具
```

### 1.3 第一性原理推导

```
设计编辑器的核心 = Schema (结构 + 样式 + 交互)
素材 = Schema 中样式的一部分（或独立资源文件被引用）

推导链条：
  1. 素材最终要变成什么？
     → CSS 属性值（background-image, border-image, mask-image...）
     → 或资源引用（img.src, video.src）
     → 或内联 SVG

  2. 素材创作的本质是什么？
     → 构建复合的视觉效果（图层叠加 + 变换 + 滤镜）
     → 本质是一个"迷你 Photoshop"

  3. 什么程度的素材创作能力是"恰到好处"的？
     → 能覆盖 90% 日常 UI 设计需求
     → 不需要做一个完整的矢量编辑器（那是 Figma/Illustrator 的领域）
     → 聚焦：渐变 + 图形 + 图层合成 + 简单动画
     → 对于复杂矢量图：支持导入 SVG，而不是从零画

  4. 素材和 Schema 的关系？
     → CSS-first：能用 CSS 表达的就用 CSS，直接写入 Schema.styles
     → 资源文件：不能内联的素材（图片/动画）→ 上传为文件 → asset:// 引用
     → SVG 内联：简单 SVG → 可以内联到 Schema（data:image/svg+xml）
     → 复杂素材：Canvas 绘制 → 导出为 PNG/SVG → 上传为资源文件
```

### 1.4 核心洞察

> **素材编辑器不是另一个 Figma，而是一个"CSS 视觉效果构建器 + 轻量图形编辑器"。**
>
> 它的输出物是：
> - CSS 属性值（渐变、阴影、滤镜、蒙版等）→ 直接写入 Schema
> - 资源文件（PNG/SVG/Lottie）→ 上传到服务端 → 通过 asset:// 引用

---

## 二、架构定位：素材编辑器在项目中的位置

### 2.1 模块独立性

```
素材编辑器是一个独立的 Feature 模块：

monorepo/
├── features/
│   ├── design-schema          # Schema 协议（定义素材的数据结构）
│   ├── design-engine          # 渲染引擎（渲染素材效果）
│   ├── design-operations      # 操作集（素材相关 Operations）
│   ├── material-editor/       # 🆕 素材编辑器（独立模块）
│   │   ├── src/
│   │   │   ├── core/          # 核心绘图引擎
│   │   │   ├── layers/        # 图层系统
│   │   │   ├── tools/         # 绘图工具
│   │   │   ├── effects/       # 滤镜与特效
│   │   │   ├── export/        # 导出器
│   │   │   ├── animation/     # 动画编辑
│   │   │   └── ui/            # UI 组件
│   │   └── package.json
│   └── design-codegen         # 代码生成
```

### 2.2 素材的承载方式

```
素材在 Schema 中的承载方式：

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  承载方式 1: CSS 属性（最常用，零额外存储）                           │
│                                                                     │
│  node.styles.background = "linear-gradient(135deg, #667eea, #764ba2)"│
│  node.styles.backgroundImage = "url(asset://images/bg.png)"         │
│  node.styles.boxShadow = "0 4px 20px rgba(0,0,0,0.15)"            │
│  node.styles.filter = "blur(4px) brightness(1.2)"                  │
│  node.styles.maskImage = "url(asset://masks/circle.svg)"           │
│  node.styles.borderImage = "linear-gradient(45deg, red, blue) 1"   │
│                                                                     │
│  承载方式 2: 元素属性（图片/视频等）                                 │
│                                                                     │
│  node.type = "img"                                                  │
│  node.props.src = "asset://images/hero.png"                        │
│                                                                     │
│  node.type = "div" (内嵌 SVG)                                       │
│  node.props.innerHTML = "<svg>...</svg>"                            │
│                                                                     │
│  承载方式 3: 复合背景（多图层 CSS 背景）                              │
│                                                                     │
│  node.styles.background = `                                         │
│    linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)),             │
│    url(asset://images/texture.png),                                 │
│    linear-gradient(135deg, #667eea 0%, #764ba2 100%)               │
│  `                                                                   │
│  node.styles.backgroundSize = "cover, 200px 200px, cover"          │
│  node.styles.backgroundRepeat = "no-repeat, repeat, no-repeat"     │
│                                                                     │
│  承载方式 4: 动画引用                                                │
│                                                                     │
│  node.props["data-lottie"] = "asset://animations/loading.json"     │
│  node.props["data-pag"] = "asset://animations/intro.pag"           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 三、开源生态调研与技术选型

### 3.1 Canvas 绘图库对比

```
┌──────────────┬───────────────┬──────────────┬────────────────┬──────────────┐
│  库名         │  特点          │  适合场景     │  包大小         │  推荐度       │
├──────────────┼───────────────┼──────────────┼────────────────┼──────────────┤
│  Fabric.js   │ 老牌强大，     │ 图形编辑器    │ 308KB (压缩)    │ ⭐⭐⭐⭐⭐     │
│  v6+         │ 对象模型完善   │ 白板/画板     │                │ 首选          │
│              │ 内置选区/变换  │ 素材编辑      │                │              │
│              │ SVG 导入导出   │              │                │              │
├──────────────┼───────────────┼──────────────┼────────────────┼──────────────┤
│  Konva.js    │ TS 编写       │ 图形编辑器    │ 155KB (压缩)    │ ⭐⭐⭐⭐       │
│              │ 分层渲染清晰   │ 数据可视化    │                │ 备选          │
│              │ React 绑定好   │ 拖拽交互      │                │              │
├──────────────┼───────────────┼──────────────┼────────────────┼──────────────┤
│  Paper.js    │ 矢量运算强    │ 矢量编辑      │ 210KB (压缩)    │ ⭐⭐⭐         │
│              │ 路径布尔运算   │ 复杂路径      │                │ 矢量场景可选  │
│              │ 学习曲线陡     │              │                │              │
├──────────────┼───────────────┼──────────────┼────────────────┼──────────────┤
│  PixiJS      │ WebGL 渲染    │ 游戏/动画     │ 500KB+         │ ⭐⭐           │
│              │ 高性能         │ 粒子效果      │                │ 过度，不推荐  │
└──────────────┴───────────────┴──────────────┴────────────────┴──────────────┘

选型结论：Fabric.js v6+ 作为核心绘图引擎
  理由：
  · 对象模型完善（每个图形是一个对象，天然对应图层）
  · 内置选区、变换、分组、对齐等交互
  · SVG 导入/导出能力强
  · 社区成熟，生态丰富
  · 6.x 版本已重写为 TypeScript
```

### 3.2 矢量编辑开源参考

```
┌──────────────┬────────────────────────────────┬──────────────────┐
│  项目         │  特点                           │  可借鉴点         │
├──────────────┼────────────────────────────────┼──────────────────┤
│  tldraw      │ React + TypeScript 白板工具      │ 工具状态机设计    │
│              │ 极佳的编辑器交互                  │ 撤销/重做系统     │
│              │ 开源 + MIT 协议                  │ 快捷键体系       │
├──────────────┼────────────────────────────────┼──────────────────┤
│  Excalidraw  │ 手绘风格白板                     │ 协作模型         │
│              │ 极简但好用的绘图体验              │ 导出能力         │
├──────────────┼────────────────────────────────┼──────────────────┤
│  SVG-Edit    │ 纯 SVG 编辑器                   │ SVG 路径编辑     │
│              │ 老牌项目，功能全面               │ 贝塞尔曲线控制    │
├──────────────┼────────────────────────────────┼──────────────────┤
│  Penpot      │ Figma 开源替代品                 │ 矢量编辑交互设计 │
│              │ Clojure 实现，学习成本高          │ 产品设计参考      │
├──────────────┼────────────────────────────────┼──────────────────┤
│  Graphite    │ 程序化矢量编辑器 (Rust/WASM)     │ 非破坏性编辑     │
│              │ 新一代设计理念                    │ 节点式编辑       │
└──────────────┴────────────────────────────────┴──────────────────┘

结论：不需要从零造轮子！
  · 基础绘图能力 → Fabric.js 已经提供
  · 矢量路径编辑 → 参考 SVG-Edit 的路径编辑器
  · 编辑器交互 → 参考 tldraw 的状态机设计
  · 我们只需要做"胶水层"：将绘图库 + 图层系统 + 导出器组装起来
```

### 3.3 动画编辑开源参考

```
┌──────────────────┬──────────────────────────────┬──────────────────┐
│  工具/格式        │  特点                         │  推荐策略         │
├──────────────────┼──────────────────────────────┼──────────────────┤
│  Lottie          │ AE 导出 → JSON 描述动画        │ ✅ 支持导入播放   │
│  (lottie-web)    │ 体积小、跨平台、生态好          │ 不需要做编辑器    │
│                  │ 社区有大量现成动画资源           │ 导入 + 预览即可   │
├──────────────────┼──────────────────────────────┼──────────────────┤
│  Rive            │ 实时交互动画引擎               │ ✅ 支持导入播放   │
│  (rive-wasm)     │ 比 Lottie 更强（状态机驱动）    │ 考虑集成 runtime  │
│                  │ 有自己的编辑器（非开源）         │                  │
├──────────────────┼──────────────────────────────┼──────────────────┤
│  PAG             │ 腾讯开源，AE 导出格式           │ ✅ 支持导入播放   │
│  (libpag-web)    │ 性能好，支持文本替换            │ 国内项目可优先考虑│
├──────────────────┼──────────────────────────────┼──────────────────┤
│  GIF             │ 最通用的动画格式               │ ✅ 支持导入       │
│                  │ 体积大、色彩有限               │ 可选支持录制 GIF  │
├──────────────────┼──────────────────────────────┼──────────────────┤
│  CSS Animation   │ 浏览器原生支持                 │ ✅ 内置支持       │
│                  │ 简单、高效                     │ 作为基础动画能力  │
├──────────────────┼──────────────────────────────┼──────────────────┤
│  GSAP            │ 最强的 JS 动画库              │ ✅ 可选集成       │
│                  │ 时间线 + 缓动 + 插件丰富       │ 复杂动画时使用    │
└──────────────────┴──────────────────────────────┴──────────────────┘

动画策略结论：
  · MVP：不做动画编辑器！只做动画导入 + 预览播放
  · Phase 2：内置 CSS Animation 编辑器（关键帧 + 缓动曲线编辑）
  · Phase 3：考虑轻量的 Lottie 编辑器（修改颜色/文字/时间）
  · 永远不做：完整的 AE 级动画编辑（太复杂，交给专业工具）
```

---

## 四、素材编辑器产品设计

### 4.1 入口与交互方式

```
入口 1: 右键菜单
  选中任意元素 → 右键 → "素材编辑..."
  → 打开素材编辑器 Overlay，编辑当前元素的视觉素材

入口 2: 属性面板
  选中元素 → 右侧属性面板 → 外观(Appearance) 区域
  → 点击 "高级编辑" 按钮
  → 打开素材编辑器 Overlay

入口 3: 独立创作
  左侧面板 → "素材" Tab → [+ 创建素材]
  → 打开素材编辑器 Overlay（不关联任何元素）
  → 创作完成后保存为项目素材文件

入口 4: 工具栏
  底部工具栏 → [🎨 素材] 按钮
  → 打开素材编辑器（独立创作模式）
```

### 4.2 整体 UI 布局

```
┌──────────────────────────────────────────────────────────────────────────┐
│  素材编辑器 — button.submit 的背景                          [_] [□] [×] │
├──────────┬───────────────────────────────────────────┬───────────────────┤
│          │                                           │                   │
│  工具栏   │            画布区域                        │    属性面板       │
│          │                                           │                   │
│  [▲] 选择 │   ┌───────────────────────────────────┐   │  ── 图层属性 ──  │
│  [□] 矩形 │   │                                   │   │                  │
│  [○] 椭圆 │   │                                   │   │  类型: 渐变      │
│  [△] 多边 │   │                                   │   │  渐变类型: 线性   │
│  [╱] 线段 │   │       所见即所得预览画布             │   │  角度: 135°      │
│  [〰] 曲线│   │                                   │   │                  │
│  [★] 星形 │   │       (Fabric.js Canvas)           │   │  色标:           │
│  [T] 文字 │   │                                   │   │  ● #667eea 0%   │
│  [✏] 画笔 │   │                                   │   │  ● #764ba2 100% │
│  [🖼] 图片│   │                                   │   │  [+ 添加色标]    │
│          │   └───────────────────────────────────┘   │                  │
│  ──────  │                                           │  ── 通用属性 ──  │
│  [🔲] 渐变│   ┌───────────────────────────────────┐   │                  │
│  [🎨] 填充│   │ 图层 1: 渐变层        👁 🔒 ▲ ▼  │   │  透明度: ━●━ 0.8│
│  [📐] 蒙版│   │ 图层 2: 图片层        👁 🔒 ▲ ▼  │   │  混合: [normal▾]│
│  [✨] 滤镜│   │ 图层 3: 图案纹理      👁 🔒 ▲ ▼  │   │                  │
│          │   │ [+ 添加图层]                        │   │  ── 变换 ──     │
│          │   └───────────────────────────────────┘   │  旋转: 0°        │
│          │                                           │  缩放: 100%      │
│          │   [撤销] [重做] [缩放: 100%▾]             │  位移: X:0 Y:0   │
│          │                                           │                  │
├──────────┴───────────────────────────────────────────┴───────────────────┤
│                                                                          │
│  导出: [应用到元素]  [保存为项目素材]  [导出 SVG] [导出 PNG] [复制 CSS]    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 四大核心能力

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  能力 1: 图形绘制 (Shape Drawing)                                   │
│                                                                    │
│  基础图形:                                                          │
│  · 矩形（可调圆角，支持独立四角圆角）                               │
│  · 椭圆 / 圆形                                                     │
│  · 多边形（三角形、五边形、六边形...自定义边数）                     │
│  · 星形（自定义角数和内外径比）                                     │
│  · 线段 / 折线 / 箭头                                               │
│                                                                    │
│  路径工具:                                                          │
│  · 钢笔工具（贝塞尔曲线路径）                                       │
│  · 铅笔工具（自由绘制，自动平滑）                                   │
│  · 路径编辑（锚点、控制手柄、曲线调整）                              │
│                                                                    │
│  布尔运算:                                                          │
│  · 合并 (Union)                                                     │
│  · 减去 (Subtract)                                                  │
│  · 相交 (Intersect)                                                 │
│  · 排除 (Exclude)                                                   │
│                                                                    │
│  文字:                                                              │
│  · 文本对象（字体、大小、粗细、颜色、行高）                          │
│  · 文字路径（沿曲线排列文字）                                        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  能力 2: 图层合成 (Layer Compositing)                               │
│                                                                    │
│  图层类型:                                                          │
│  · 纯色层 → 单色填充                                                │
│  · 渐变层 → 线性 / 径向 / 角度 / 菱形渐变（多色标）                 │
│  · 图片层 → 导入图片，调整位置/大小/裁切                             │
│  · 图案层 → 重复平铺的纹理图案                                      │
│  · 图形层 → Canvas 绘制的矢量图形                                   │
│  · SVG 层 → 导入的 SVG 内容                                         │
│                                                                    │
│  合成属性:                                                          │
│  · 混合模式: normal / multiply / screen / overlay / darken /        │
│              lighten / color-dodge / color-burn / hard-light /      │
│              soft-light / difference / exclusion / hue /            │
│              saturation / color / luminosity                         │
│  · 透明度: 0-1 连续可调                                              │
│  · 蒙版: 图层蒙版 / 裁切蒙版                                        │
│  · 显示/隐藏 / 锁定 / 排序                                          │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  能力 3: 滤镜与特效 (Filters & Effects)                             │
│                                                                    │
│  CSS 原生滤镜（可直接映射到 CSS filter）:                            │
│  · 模糊 (blur)                                                      │
│  · 亮度 (brightness)                                                │
│  · 对比度 (contrast)                                                │
│  · 灰度 (grayscale)                                                 │
│  · 色相旋转 (hue-rotate)                                            │
│  · 反色 (invert)                                                    │
│  · 透明度 (opacity)                                                 │
│  · 饱和度 (saturate)                                                │
│  · 棕褐色 (sepia)                                                   │
│  · 阴影 (drop-shadow)                                               │
│                                                                    │
│  Canvas 增强滤镜（需要导出为图片）:                                  │
│  · 噪点 (noise)                                                     │
│  · 像素化 (pixelate)                                                │
│  · 锐化 (sharpen)                                                   │
│  · 浮雕 (emboss)                                                    │
│  · 色彩矩阵 (color matrix)                                          │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  能力 4: 导入与导出 (Import/Export)                                  │
│                                                                    │
│  导入:                                                              │
│  · SVG 文件 → 解析为可编辑的路径对象                                 │
│  · PNG / JPG / WebP → 作为图片图层                                   │
│  · 从剪贴板粘贴图片                                                  │
│  · 从 Figma / Sketch 复制 SVG 粘贴                                  │
│                                                                    │
│  导出:                                                              │
│  · 应用为 CSS → 生成 background / filter / box-shadow 等            │
│  · 导出 SVG → 保存为 asset://icons/xxx.svg                          │
│  · 导出 PNG → 指定分辨率（1x/2x/3x），保存为 asset://images/xxx.png │
│  · 导出 WebP → 更小体积的图片格式                                    │
│  · 复制 CSS 代码 → 复制到剪贴板                                      │
│  · 复制 SVG 代码 → 复制 SVG 标记到剪贴板                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 五、与设计编辑器的集成方案

### 5.1 数据流

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  设计编辑器                        素材编辑器                            │
│                                                                         │
│  ┌─────────────────┐   打开素材编辑  ┌──────────────────┐               │
│  │                 │ ──────────→  │                  │               │
│  │  Schema Node    │   传入:       │  Material Editor │               │
│  │  (div/img/span) │   · node.id   │                  │               │
│  │                 │   · 当前styles │  · Fabric Canvas │               │
│  │  styles: {      │   · 当前props  │  · 图层列表       │               │
│  │    background,  │               │  · 工具栏         │               │
│  │    filter,      │               │  · 属性面板       │               │
│  │    boxShadow,   │               │                  │               │
│  │    ...          │   应用素材     │                  │               │
│  │  }              │ ←──────────   │  输出:           │               │
│  │                 │   Operation:  │  · CSS 属性对象   │               │
│  │  props: {       │   applyMaterial│  · 资源文件引用   │               │
│  │    src,         │   Design      │  · SVG 字符串     │               │
│  │    ...          │               │                  │               │
│  │  }              │               │                  │               │
│  └─────────────────┘               └──────────────────┘               │
│         │                                   │                          │
│         ▼                                   ▼                          │
│  design-operations                  apps/design-api                    │
│  (更新 Schema)                      (上传资源文件)                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 打开素材编辑器时的初始化

```typescript
// 从 Schema Node 初始化素材编辑器
interface MaterialEditorInit {
  // 关联的 Schema 节点（可选，独立创作时为 null）
  targetNodeId?: string;
  targetNodeType?: NodeType;  // div / img / span ...

  // 初始背景图层（从 node.styles 解析）
  initialLayers?: MaterialLayer[];

  // 初始滤镜（从 node.styles.filter 解析）
  initialFilters?: FilterConfig[];

  // 画布尺寸（默认跟随元素尺寸）
  canvasWidth: number;
  canvasHeight: number;
}

// 从 CSS background 解析为图层
function parseBackgroundToLayers(styles: CSSProperties): MaterialLayer[] {
  // "linear-gradient(...), url(asset://xxx), #fff"
  // → [渐变层, 图片层, 纯色层]
}
```

### 5.3 素材编辑器的输出

```typescript
// 素材编辑器的输出结果
interface MaterialEditorOutput {
  // 方式 1: CSS 属性（直接写入 Schema.styles）
  css?: {
    background?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    filter?: string;
    boxShadow?: string;
    borderImage?: string;
    maskImage?: string;
    // ... 其他 CSS 属性
  };

  // 方式 2: 资源文件（需上传到服务端）
  assets?: {
    type: 'svg' | 'png' | 'webp';
    data: Blob;           // 文件数据
    filename: string;     // 建议文件名
    usage: 'src' | 'background' | 'icon';  // 使用方式
  }[];

  // 方式 3: 内联 SVG（小型图标）
  inlineSvg?: string;     // <svg>...</svg> 字符串
}
```

### 5.4 应用到元素的 Operation

```typescript
// 新增 Operation：应用素材设计结果
{
  type: "applyMaterialDesign",
  params: {
    nodeId: string;
    // CSS 属性更新
    styleUpdates?: Partial<CSSProperties>;
    // Props 更新（如 img.src）
    propUpdates?: Record<string, any>;
    // 需要上传的资源文件
    assetUploads?: {
      tempId: string;      // 临时 ID
      assetPath: string;   // 上传后的 asset:// 路径
    }[];
  }
}
```

---

## 六、存储方案

### 6.1 素材文件存储策略

```
┌──────────────────────────────────────────────────────────────────┐
│                        存储分层策略                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  开发阶段 (Dev):                                                  │
│  · 本地文件系统: ./uploads/{projectId}/{assetId}.{ext}           │
│  · 通过 design-api 的 /api/assets/upload 接口上传               │
│  · Nginx/Express 静态目录提供访问                                │
│  · 无需配置任何外部服务                                          │
│                                                                  │
│  测试阶段 (Staging):                                             │
│  · 同开发阶段，但部署到测试服务器                                 │
│  · 文件存放在服务器的指定目录: /data/design-uploads/              │
│  · 可选: MinIO（自托管 S3 兼容存储）                              │
│                                                                  │
│  生产阶段 (Production):                                           │
│  · S3 兼容对象存储 (AWS S3 / 腾讯云 COS / 阿里云 OSS)           │
│  · CDN 加速访问                                                   │
│  · 图片自动压缩和格式转换                                         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  统一抽象: StorageProvider 接口                                   │
│                                                                  │
│  interface StorageProvider {                                      │
│    upload(file: Buffer, meta: FileMeta): Promise<AssetInfo>;     │
│    getUrl(assetId: string): string;                              │
│    delete(assetId: string): Promise<void>;                       │
│    getThumbnailUrl(assetId: string): string;                     │
│  }                                                               │
│                                                                  │
│  class LocalStorageProvider implements StorageProvider { ... }    │
│  class S3StorageProvider implements StorageProvider { ... }       │
│                                                                  │
│  通过环境变量切换:                                                 │
│  STORAGE_PROVIDER=local  (开发)                                   │
│  STORAGE_PROVIDER=s3     (生产)                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 素材与 Schema 的关系

```
素材设计数据和 Schema 是分开存储的：

Schema（结构化数据，存 DB）:
  · node.styles.background = "linear-gradient(135deg, #667eea, #764ba2)"
  · node.styles.backgroundImage = "url(asset://abc123)"
  · node.props.src = "asset://def456"

素材文件（二进制文件，存文件系统/S3）:
  · asset://abc123 → uploads/proj_001/abc123.png
  · asset://def456 → uploads/proj_001/def456.svg

素材编辑项目文件（可选，存 DB）:
  · 保存素材编辑器的图层信息，以便后续重新编辑
  · 类似 PSD 文件，但是 JSON 格式
  · 存储在 asset 元数据中

asset 数据库记录:
  {
    id: "abc123",
    projectId: "proj_001",
    originalName: "hero-bg.png",
    mimeType: "image/png",
    size: 245000,
    width: 1920,
    height: 1080,
    storagePath: "uploads/proj_001/abc123.png",
    thumbnailPath: "uploads/proj_001/abc123_thumb.png",
    // 可选：素材编辑器的工程文件
    editorProject?: {
      layers: MaterialLayer[];
      canvasSize: { width: number; height: number };
      version: number;
    }
  }
```

---

## 七、动画支持方案

### 7.1 动画分层策略

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  第一层: CSS Animation（内置，无额外依赖）                        │
│                                                                  │
│  · 过渡动画: transition（hover/focus/active 状态切换）            │
│  · 关键帧动画: @keyframes（入场/循环/呼吸等）                     │
│  · 变换动画: transform（旋转/缩放/位移/倾斜）                    │
│                                                                  │
│  Schema 中的表达:                                                 │
│  node.styles.transition = "all 0.3s ease"                        │
│  node.styles.animation = "fadeIn 0.5s ease-out"                  │
│  node.styles.transform = "rotate(45deg)"                         │
│                                                                  │
│  素材编辑器提供: CSS 动画可视化编辑器                              │
│  · 时间轴面板                                                     │
│  · 关键帧编辑                                                     │
│  · 缓动曲线编辑（贝塞尔曲线可视化调节）                           │
│  · 实时预览                                                       │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  第二层: Lottie / PAG / Rive（导入播放）                          │
│                                                                  │
│  · 从外部工具（AE/Rive Editor）创作好的动画导入                   │
│  · 在素材编辑器中预览和调整基础参数                                │
│  · Lottie: 支持修改颜色、文字、播放速度                           │
│  · PAG: 支持修改文字图层                                          │
│  · Rive: 支持切换状态机输入                                       │
│                                                                  │
│  Schema 中的表达:                                                 │
│  node.props["data-animation"] = {                                │
│    type: "lottie",                                               │
│    src: "asset://animations/loading.json",                       │
│    autoplay: true,                                                │
│    loop: true,                                                    │
│    speed: 1.0                                                     │
│  }                                                                │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  第三层: GIF（最基础的动画素材）                                  │
│                                                                  │
│  · 导入 GIF 作为 img.src                                          │
│  · 不提供 GIF 编辑能力（太原始了，推荐用 Lottie 替代）           │
│  · 可选: Canvas 录制 → 导出 GIF（使用 gif.js 库）                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 CSS Animation 编辑器 UI

```
┌──────────────────────────────────────────────────────────────────┐
│  动画编辑                                                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │              实时动画预览区域                              │    │
│  │              (元素在此循环播放动画)                        │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ── 动画属性 ──                                                  │
│  名称: [fadeIn        ]  持续: [0.5s    ]  延迟: [0s     ]      │
│  次数: [1 ▾]  方向: [normal ▾]  填充: [forwards ▾]             │
│                                                                  │
│  ── 缓动曲线 ──                                                  │
│  [ease ▾] [ease-in ▾] [ease-out ▾] [自定义 ▾]                   │
│  ┌──────────────────┐                                            │
│  │    ╱‾‾‾‾‾‾‾╲     │  ← 贝塞尔曲线可视化编辑                  │
│  │   ╱         ╲    │     拖拽控制点调整缓动                     │
│  │  ╱           ╲   │                                            │
│  │ ╱             ╲  │  cubic-bezier(0.25, 0.1, 0.25, 1.0)      │
│  └──────────────────┘                                            │
│                                                                  │
│  ── 时间轴 ──                                                    │
│  0%    25%    50%    75%    100%                                  │
│  ├──●──��──────┼──●──┼──────┼──●                                 │
│  │ ↑   │      │  ↑  │      │  ↑                                 │
│  │ KF1 │      │ KF2 │      │ KF3                                │
│                                                                  │
│  ── 关键帧 KF1 (0%) ──                                          │
│  opacity: [0]  transform: [translateY(-20px)]                    │
│                                                                  │
│  ── 关键帧 KF2 (50%) ──                                         │
│  opacity: [0.8]  transform: [translateY(-5px)]                   │
│                                                                  │
│  ── 关键帧 KF3 (100%) ──                                        │
│  opacity: [1]  transform: [translateY(0)]                        │
│                                                                  │
│                             [生成 CSS] [应用到元素]              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 八、技术实现方案

### 8.1 核心架构

```typescript
// features/material-editor/src/core/MaterialEditorCore.ts

import { Canvas as FabricCanvas } from 'fabric';

interface MaterialEditorConfig {
  container: HTMLDivElement;       // 挂载容器
  width: number;
  height: number;
  initialLayers?: MaterialLayer[];
  onExport?: (output: MaterialEditorOutput) => void;
}

class MaterialEditorCore {
  private canvas: FabricCanvas;
  private layerManager: LayerManager;
  private toolManager: ToolManager;
  private historyManager: HistoryManager;
  private exportManager: ExportManager;

  constructor(config: MaterialEditorConfig) {
    // 初始化 Fabric.js Canvas
    this.canvas = new FabricCanvas(config.container, {
      width: config.width,
      height: config.height,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    this.layerManager = new LayerManager(this.canvas);
    this.toolManager = new ToolManager(this.canvas);
    this.historyManager = new HistoryManager(this.canvas);
    this.exportManager = new ExportManager(this.canvas);
  }

  // 核心 API
  addLayer(type: LayerType, config?: LayerConfig): string;
  removeLayer(layerId: string): void;
  updateLayer(layerId: string, updates: Partial<LayerConfig>): void;
  reorderLayers(layerIds: string[]): void;

  setActiveTool(tool: ToolType): void;
  undo(): void;
  redo(): void;

  exportToCSS(): CSSOutput;
  exportToSVG(): string;
  exportToPNG(scale?: number): Promise<Blob>;
  exportToWebP(quality?: number): Promise<Blob>;

  getEditorProject(): MaterialEditorProject; // 保存工程文件
  loadEditorProject(project: MaterialEditorProject): void; // 加载工程文件

  destroy(): void;
}
```

### 8.2 图层系统

```typescript
// features/material-editor/src/layers/LayerManager.ts

type LayerType =
  | 'solid'       // 纯色
  | 'gradient'    // 渐变
  | 'image'       // 图片
  | 'pattern'     // 图案纹理
  | 'shape'       // 矢量图形
  | 'svg'         // 导入的 SVG
  | 'text'        // 文字
  | 'group';      // 图层组

interface MaterialLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;           // 0-1
  blendMode: BlendMode;      // CSS mix-blend-mode 值
  order: number;             // 堆叠顺序
  config: LayerTypeConfig;   // 各类型的具体配置
}

// 渐变图层配置
interface GradientLayerConfig {
  gradientType: 'linear' | 'radial' | 'conic';
  angle?: number;              // 线性渐变角度
  colorStops: {
    color: string;
    position: number;          // 0-1
  }[];
  // 径向渐变特有
  centerX?: number;
  centerY?: number;
  radiusX?: number;
  radiusY?: number;
}

// 图片图层配置
interface ImageLayerConfig {
  src: string;                 // asset:// URL 或 base64
  fit: 'cover' | 'contain' | 'fill' | 'none';
  position: { x: number; y: number };
  size: { width: number; height: number };
  crop?: { x: number; y: number; width: number; height: number };
  filters?: FilterConfig[];
}

// 图形图层配置
interface ShapeLayerConfig {
  shapeType: 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'path';
  fill?: string | GradientConfig;
  stroke?: string;
  strokeWidth?: number;
  // 各图形特有属性
  cornerRadius?: number;       // 矩形圆角
  sides?: number;              // 多边形边数
  innerRadius?: number;        // 星形内径比
  points?: Point[];            // 路径点
  pathData?: string;           // SVG path d 属性
}
```

### 8.3 导出器

```typescript
// features/material-editor/src/export/ExportManager.ts

class ExportManager {
  /**
   * 将图层合成结果导出为 CSS 属性
   * 这是最核心的导出方式 —— 直接映射到 Schema.styles
   */
  exportToCSS(layers: MaterialLayer[]): CSSOutput {
    const backgrounds: string[] = [];
    const backgroundSizes: string[] = [];
    const backgroundPositions: string[] = [];
    const backgroundRepeats: string[] = [];

    // 从上到下遍历图层，合成 CSS background 简写
    for (const layer of layers.reverse()) {
      if (!layer.visible) continue;

      switch (layer.type) {
        case 'solid':
          backgrounds.push(layer.config.color);
          break;
        case 'gradient':
          backgrounds.push(this.gradientToCSS(layer.config));
          break;
        case 'image':
          backgrounds.push(`url(${layer.config.src})`);
          backgroundSizes.push(layer.config.fit);
          backgroundPositions.push(
            `${layer.config.position.x}% ${layer.config.position.y}%`
          );
          break;
        case 'pattern':
          backgrounds.push(`url(${layer.config.src})`);
          backgroundRepeats.push('repeat');
          backgroundSizes.push(
            `${layer.config.tileWidth}px ${layer.config.tileHeight}px`
          );
          break;
      }
    }

    return {
      background: backgrounds.join(', '),
      backgroundSize: backgroundSizes.join(', '),
      backgroundPosition: backgroundPositions.join(', '),
      backgroundRepeat: backgroundRepeats.join(', '),
      filter: this.filtersToCSS(layers),
      // ... 其他 CSS 属性
    };
  }

  /**
   * 导出为 SVG 字符串
   */
  exportToSVG(): string {
    return this.canvas.toSVG();
  }

  /**
   * 导出为 PNG Blob
   */
  async exportToPNG(scale: number = 2): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob!), 'image/png', scale);
    });
  }
}
```

### 8.4 Schema 扩展

```typescript
// features/design-schema 中新增的类型

// 素材引用类型（扩展 ComponentNode）
interface ComponentNode {
  // ... 现有字段 ...

  // 🆕 动画配置
  animation?: AnimationConfig;

  // 🆕 素材编辑器工程引用（可选，用于重新编辑）
  materialProjectId?: string;
}

// 动画配置
interface AnimationConfig {
  // CSS 动画
  css?: {
    name: string;                    // @keyframes 名称
    duration: string;                // "0.5s"
    timingFunction: string;          // "ease-out" 或 "cubic-bezier(...)"
    delay?: string;
    iterationCount?: string | number;// "infinite" 或具体次数
    direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
    keyframes: {
      offset: number;               // 0-1 (0%=0, 50%=0.5, 100%=1)
      styles: Partial<CSSProperties>;
    }[];
  };

  // 外部动画资源
  external?: {
    type: 'lottie' | 'pag' | 'rive' | 'gif';
    src: string;                     // asset:// URL
    autoplay?: boolean;
    loop?: boolean;
    speed?: number;
  };
}

// 素材编辑器工程文件（保存可再编辑的图层数据）
interface MaterialProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: MaterialLayer[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 九、后端扩展

### 9.1 新增 API 端点

```
# 素材文件管理（在现有 assets API 基础上扩展）
POST   /api/projects/:projectId/materials/upload     # 上传素材文件
GET    /api/projects/:projectId/materials             # 获取素材列表
GET    /api/projects/:projectId/materials/:id         # 获取素材详情
DELETE /api/projects/:projectId/materials/:id         # 删除素材
PUT    /api/projects/:projectId/materials/:id/meta    # 更新素材元数据

# 素材编辑器工程文件
POST   /api/projects/:projectId/material-projects             # 保存工程
GET    /api/projects/:projectId/material-projects/:id         # 获取工程
PUT    /api/projects/:projectId/material-projects/:id         # 更新工程
DELETE /api/projects/:projectId/material-projects/:id         # 删除工程

# 图片处理
POST   /api/projects/:projectId/materials/:id/resize    # 图片缩放
POST   /api/projects/:projectId/materials/:id/crop      # 图片裁切
POST   /api/projects/:projectId/materials/:id/convert   # 格式转换
```

### 9.2 数据库扩展

```sql
-- 素材文件表
CREATE TABLE materials (
  id           VARCHAR(36) PRIMARY KEY,
  project_id   VARCHAR(36) NOT NULL REFERENCES projects(id),
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size          INTEGER NOT NULL,          -- bytes
  width         INTEGER,                   -- 图片宽度 (px)
  height        INTEGER,                   -- 图片高度 (px)
  storage_path  VARCHAR(500) NOT NULL,     -- 存储路径
  thumbnail_path VARCHAR(500),             -- 缩略图路径
  category      VARCHAR(50) DEFAULT 'image', -- image/icon/animation/video
  tags          TEXT[],                    -- 标签数组
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- 素材编辑器工程表
CREATE TABLE material_projects (
  id           VARCHAR(36) PRIMARY KEY,
  project_id   VARCHAR(36) NOT NULL REFERENCES projects(id),
  name         VARCHAR(255) NOT NULL,
  canvas_width  INTEGER NOT NULL,
  canvas_height INTEGER NOT NULL,
  layers_json   JSONB NOT NULL,           -- MaterialLayer[] 的 JSON
  version       INTEGER DEFAULT 1,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- 素材引用表（追踪哪些 Schema 节点使用了哪些素材）
CREATE TABLE material_references (
  id            VARCHAR(36) PRIMARY KEY,
  material_id   VARCHAR(36) NOT NULL REFERENCES materials(id),
  project_id    VARCHAR(36) NOT NULL REFERENCES projects(id),
  screen_id     VARCHAR(36),
  node_id       VARCHAR(36),
  usage_type    VARCHAR(50),  -- 'background' | 'src' | 'icon' | 'animation'
  created_at    TIMESTAMP DEFAULT NOW()
);
```

---

## 十、MCP 集成（AI 操作素材）

```typescript
// design-mcp 中新增的 Tools

// 1. 搜索项目素材
{
  name: "search_materials",
  params: {
    query?: string;         // 搜索关键词
    category?: string;      // 'image' | 'icon' | 'animation' | 'video'
    tags?: string[];
  },
  returns: MaterialInfo[]
}

// 2. 上传素材（AI 生成的图片）
{
  name: "upload_material",
  params: {
    base64Data: string;     // base64 编码的文件数据
    filename: string;
    mimeType: string;
  },
  returns: { assetUrl: string }
}

// 3. 为元素设置背景渐变
{
  name: "set_element_gradient",
  params: {
    nodeId: string;
    type: 'linear' | 'radial' | 'conic';
    angle?: number;
    colorStops: { color: string; position: number }[];
  }
}

// 4. 为元素添加 CSS 动画
{
  name: "add_css_animation",
  params: {
    nodeId: string;
    animationName: string;
    duration: string;
    timingFunction: string;
    keyframes: { offset: number; styles: Partial<CSSProperties> }[];
  }
}

// 5. 为元素应用滤镜
{
  name: "apply_filters",
  params: {
    nodeId: string;
    filters: { type: string; value: string }[];
    // e.g. [{ type: "blur", value: "4px" }, { type: "brightness", value: "1.2" }]
  }
}
```

---

## 十一、分阶段实施路线

### Phase 1: 基础素材管理（W9-W10，2 周）

```
目标：让用户可以上传、管理和使用素材文件

✅ 任务清单：
  □ 素材上传 API（支持图片/SVG/视频/Lottie/PAG）
  □ StorageProvider 接口 + LocalStorageProvider 实现
  □ 素材列表面板 UI（网格展示 + 分类筛选 + 搜索）
  □ 拖拽素材到画布（创建 img 元素 + 设置 src）
  □ 素材详情面板（预览 + 元数据 + 使用位置）
  □ asset:// 协议在渲染引擎中的解析
  □ 素材删除 + 引用检查
  □ 缩略图自动生成（图片 128×128）
```

### Phase 2: CSS 视觉效果编辑器（W11-W12，2 周）

```
目标：可视化编辑渐变、阴影、滤镜等 CSS 效果

✅ 任务清单：
  □ 渐变编辑器面板（线性/径向/角度渐变）
  □ 多色标编辑器（拖拽色标位置 + 取色器）
  □ 阴影编辑器（box-shadow + text-shadow + drop-shadow）
  □ CSS 滤镜编辑器（blur/brightness/contrast/... 滑块调节）
  □ 背景图层管理器（多层 CSS background 可视化编排）
  □ 实时预览（编辑时实时看到效果）
  □ CSS 代码导出（复制到剪贴板 / 应用到元素）
  □ 从现有 node.styles 解析并初始化编辑器
```

### Phase 3: 轻量图形编辑器（W13-W14，2 周）

```
目标：可以绘制和编辑简单的矢量图形

✅ 任务清单：
  □ Fabric.js 集成 + 画布初始化
  □ 基础图形工具（矩形/椭圆/多边形/星形/线段）
  □ 钢笔工具（贝塞尔曲线绘制）
  □ 铅笔工具（自由绘制 + 自动平滑）
  □ 选择工具（选中/移动/缩放/旋转）
  □ 填充 + 描边设置
  □ 撤销/重做
  □ 导出 SVG / 导出 PNG
  □ 保存为项目素材
  □ 图层面板（排序/显示隐藏/锁定）
```

### Phase 4: 图层合成与特效（W15-W16，2 周）

```
目标：多图层叠加合成能力

✅ 任务清单：
  □ 图片图层（导入图片 + 裁切 + 调整）
  □ 图案纹理层（平铺纹理）
  □ 混合模式支持（16 种 CSS 混合模式）
  □ 图层蒙版
  □ Canvas 滤镜（噪点/像素化/锐化/浮雕）
  □ 布尔运算（合并/减去/相交/排除）
  □ 素材编辑器工程文件保存/加载
  □ 文字工具
```

### Phase 5: CSS 动画编辑器（W17-W18，2 周）

```
目标：可视化编辑 CSS 动画

✅ 任务清单：
  □ 时间轴面板 UI
  □ 关键帧添加/删除/编辑
  □ 缓动曲线可视化编辑（贝塞尔曲线控制器）
  □ 动画属性配置（duration/delay/iteration/direction/fill）
  □ 实时动画预览
  □ 生成 @keyframes CSS 代码
  □ 应用动画到 Schema 节点
  □ 预置动画模板（fadeIn/slideUp/bounce/pulse...）
```

### Phase 6: 动画资源支持（W19-W20，2 周）

```
目标：导入和播放外部动画资源

✅ 任务清单：
  □ Lottie 导入 + 预览播放（lottie-web）
  □ Lottie 参数编辑（颜色替换/文字替换/速度调节）
  □ PAG 导入 + 预览播放（libpag-web）
  □ Rive 导入 + 预览播放（@rive-app/canvas）
  □ GIF 导入支持
  □ 动画资源在预览模式中的正确播放
  □ 动画资源在代码导出时的处理
```

### Phase 7: 高级功能（W21+，持续迭代）

```
  □ S3StorageProvider 实现（生产环境存储）
  □ 图片 CDN + 自动格式转换（WebP/AVIF）
  □ AI 辅助素材生成（调用 DALL-E/Midjourney API）
  □ 素材版本管理
  □ 团队素材库共享
  □ 高级路径编辑（路径沿路径文字、路径动画）
  □ SVG 图标编辑器增强
  □ 素材市场（公共素材分享平台）
```

---

## 十二、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 素材编辑器是否独立模块？ | 是，独立 feature 包 | 解耦设计编辑器和素材编辑器，各自独立迭代 |
| 用什么绘图库？ | Fabric.js v6 | 对象模型完善，内置交互，SVG 支持好，社区成熟 |
| 是否从零实现矢量编辑？ | 不，基于 Fabric.js | 自己造等于重写 Illustrator，投入产出比极低 |
| CSS 效果优先还是图片优先？ | CSS 优先 | CSS 效果零存储成本，直接写入 Schema，性能最优 |
| 动画编辑器做多强？ | 只做 CSS Animation | AE 级动画交给专业工具；我们聚焦 CSS 动画可视化 |
| 素材文件存哪？ | Dev 本地 → Prod S3 | StorageProvider 抽象解耦，不同环境透明切换 |
| 素材数据和 Schema 分开吗？ | 分开 | Schema 存结构化数据，素材文件存文件系统/S3 |
| 素材编辑器的定位？ | CSS 视觉构建器 + 轻量图形编辑 | 不做 Figma 竞品，聚焦 UI 设计中 90% 场景 |
| 复杂矢量图怎么办？ | 导入 SVG | 复杂矢量在 Illustrator/Figma 中创作，导入到我们的编辑器 |
| 是否支持协作编辑素材？ | MVP 不支持 | 素材编辑是个人操作，完成后应用到 Schema 即进入协作流 |

---

## 十三、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| 上传超大文件 (> 限制) | 拒绝上传 + 提示具体限制 |
| 上传不支持的格式 | 拒绝 + 列出支持的格式 |
| 素材被删除但 Schema 仍引用 | 画布显示占位图 + 属性面板标红提示 |
| 服务端存储空间不足 | 上传失败 + 提示管理员 |
| 编辑大尺寸图片 (> 4096px) | 自动缩小到安全尺寸编辑，导出时恢复原始分辨率 |
| Fabric Canvas 内存溢出 | 限制单次编辑的画布大小和图层数 |
| SVG 包含外部引用 | 解析时警告 + 内联化处理 |
| 动画文件格式错误 | 解析失败 + 提示格式要求 |
| 多人同时编辑同一素材 | 非实时协作，后保存覆盖前一个（MVP）|
| 素材编辑器崩溃 | 自动保存编辑进度到 localStorage |
| 网络断开时编辑素材 | 编辑可继续（Canvas 是本地的），上传等网络恢复后重试 |
| CSS background 层数过多 (> 10) | 允许但给出性能提示 |
| 渐变色标过多 (> 20) | 允许但给出提示 |

---

## 十四、依赖关系图

```
                    ┌──────────────┐
                    │ design-schema│
                    │ (类型定义)    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌─────────────┐ ┌────────────┐ ┌──────────────┐
    │ design-     │ │ material-  │ │ design-      │
    │ operations  │ │ editor     │ │ engine       │
    │ (操作集)     │ │ (素材编辑) │ │ (渲染引擎)    │
    └──────┬──────┘ └─────┬──────┘ └──────────────┘
           │              │                 ▲
           │              │                 │
           ▼              ▼                 │
    ┌──────────────────────────────┐        │
    │      design_front            │────────┘
    │      (前端应用)               │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │      design-api              │
    │      (后端：文件存储 + API)   │
    └──────────────────────────────┘
```

---

## 附录 A: 开源库依赖清单

```json
{
  "dependencies": {
    "fabric": "^6.x",                    // Canvas 绘图引擎
    "lottie-web": "^5.12",              // Lottie 动画播放
    "@nicolo-ribaudo/chroma-js": "^3.x",// 颜色处理
    "bezier-easing": "^2.x",           // 缓动曲线
    "gif.js": "^0.2"                    // GIF 导出（可选）
  },
  "optionalDependencies": {
    "libpag": "^4.x",                   // PAG 动画播放
    "@rive-app/canvas": "^2.x"          // Rive 动画播放
  }
}
```

## 附录 B: 预置素材模板

```
素材编辑器应内置一批常用素材模板，降低使用门槛：

── 渐变模板 ──
  · 晨曦 (Sunrise): #f093fb → #f5576c
  · 海洋 (Ocean): #667eea → #764ba2
  · 森林 (Forest): #11998e → #38ef7d
  · 日落 (Sunset): #fc5c7d → #6a82fb
  · 极光 (Aurora): #a8edea → #fed6e3
  · 霓虹 (Neon): #f12711 → #f5af19
  · ... (20+ 渐变模板)

── CSS 动画模板 ──
  · fadeIn / fadeOut
  · slideInUp / slideInDown / slideInLeft / slideInRight
  · bounceIn / bounceOut
  · pulse / shake / wobble
  · zoomIn / zoomOut
  · rotateIn / rotateOut
  · flipInX / flipInY
  · ... (30+ 动画模板)

── 图案纹理 ──
  · 点阵 (Dots)
  · 斜线 (Diagonal Lines)
  · 网格 (Grid)
  · 菱形 (Diamond)
  · 波纹 (Waves)
  · ... (15+ 纹理模板)
```
