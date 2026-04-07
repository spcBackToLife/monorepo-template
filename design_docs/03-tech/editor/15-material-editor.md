# 15 - 素材编辑器技术方案

> **对照文档**：`design_docs/02-product/editor/12-material-editor/README.md`
>
> **核心原则**：所有设计决策严格以 README.md 为准，不走偏。

---

## 一、问题诊断：当前实现 vs 设计文档的根本差距

### 1.1 布局结构对比

**设计文档要求（README §4.2）**：统一的三栏式 Overlay 编辑器

```
┌──────────────────────────────────────────────────────────┐
│  标题栏（元素名称 + 窗口控制）                              │
├──────────┬────────────────────────────┬───────────────────┤
│  左侧     │     画布区域                │    右侧            │
│  工具栏   │     (Fabric.js Canvas)     │    属性面板         │
│  [选/矩/  │                            │    (图层属性/       │
│   椭/多/  │     栅格 + 预览画布          │     通用属性/       │
│   线/曲/  │                            │     变换)           │
│   星/文/  │  ┌──图层面板──────────────┐  │                   │
│   画/图]  │  │ 图层列表 + 操作        │  │                   │
│  ──────  │  └───────────────────────┘  │                   │
│  [渐/填/  │  [撤销] [重做] [缩放]       │                   │
│   蒙/滤]  │                            │                   │
├──────────┴────────────────────────────┴───────────────────┤
│  导出栏：[应用到元素] [保存为素材] [导出SVG/PNG] [复制CSS]    │
└──────────────────────────────────────────────────────────┘
```

**当前实现**：Tab 式分散面板

```
┌─ MaterialEditorModal ──────────────────┐
│  标题栏                                 │
│  [渐变][阴影][滤镜][画布][动画][素材库]   │  ← Tab 切换
│  ┌─ Tab 内容 ───────────────────────┐  │
│  │  各功能独立渲染                    │  │  ← 画布编辑器才有三栏
│  └───────────────────────────────────┘  │     其他都是单列表单
│  底部操作栏                              │
└─────────────────────────────────────────┘
```

### 1.2 核心差距清单

| # | 差距 | 设计文档位置 | 严重度 |
|---|------|-------------|--------|
| 1 | **整体布局不对** — Tab 分散 vs 统一三栏 | §4.2 | 🔴 |
| 2 | **左侧工具栏缺失** — 工具只在画布 Tab 中 | §4.2 工具栏 | 🔴 |
| 3 | **右侧属性面板缺失** — 没有图层属性/通用属性/变换 | §4.2 属性面板 | 🔴 |
| 4 | **画布栅格/辅助线缺失** — 无栅格参考线 | §4.2 + 用户需求 | 🟡 |
| 5 | **元素尺寸感知缺失** — 画布不跟随选中元素宽高 | §5.2 + 用户需求 | 🔴 |
| 6 | **曲线工具缺失** — 无贝塞尔钢笔工具 | §4.2 [〰] 曲线 | 🟡 |
| 7 | **底部导出栏不对** — 缺少统一导出区域 | §4.2 导出区域 | 🟡 |
| 8 | **图层面板位置不对** — 在右侧而非画布区域下方 | §4.2 图层区域 | 🟡 |
| 9 | **特殊工具缺失** — 渐变工具/填充工具/蒙版工具/滤镜工具作为左侧工具 | §4.2 分隔线下方 | 🟡 |
| 10 | **自适应元素画布处理** — 宽/高 auto 元素如何确定画布尺寸 | 用户需求 | 🔴 |

---

## 二、技术架构设计

### 2.1 统一编辑器组件结构

```
MaterialEditorModal (Overlay 浮层)
├── TitleBar (标题栏：元素名称 + 窗口控制)
├── EditorBody (三栏主体)
│   ├── LeftToolbar (左侧工具栏 - 固定宽度 48px)
│   │   ├── DrawingTools (绘图工具组)
│   │   │   ├── select / hand
│   │   │   ├── rect / ellipse / polygon
│   │   │   ├── line / path(曲线) / star
│   │   │   ├── text / pencil / image
│   │   ├── Separator
│   │   └── EffectTools (效果工具组)
│   │       ├── gradient (渐变)
│   │       ├── fill (填充)
│   │       ├── mask (蒙版)
│   │       └── filter (滤镜)
│   ├── CenterArea (中间区域 - flex-1)
│   │   ├── CanvasArea (画布区域)
│   │   │   ├── GridOverlay (栅格层)
│   │   │   ├── FabricCanvas (Fabric.js 画布)
│   │   │   └── RulerOverlay (标尺层)
│   │   ├── LayerPanel (图层面板 - 可折叠)
│   │   │   ├── LayerList (图层列表)
│   │   │   └── LayerActions (图层操作按钮)
│   │   └── CanvasToolbar (画布工具栏：撤销/重做/缩放)
│   └── RightPanel (右侧属性面板 - 固定宽度 220px)
│       ├── LayerProperties (图层属性：类型/渐变/色标等)
│       ├── CommonProperties (通用属性：透明度/混合模式)
│       └── TransformProperties (变换：旋转/缩放/位移)
└── ExportBar (底部导出栏)
    ├── ApplyToElement (应用到元素)
    ├── SaveAsMaterial (保存为项目素材)
    ├── ExportSVG / ExportPNG
    └── CopyCSS (复制CSS)
```

### 2.2 关键设计决策

#### 2.2.1 画布尺寸与元素关联

```typescript
/**
 * 画布尺寸确定策略（严格对照 README §5.2）
 *
 * 问题：选中元素的宽高可能是 auto、百分比、或固定 px
 * 解决：
 *   1. 固定尺寸元素 → 画布 = 元素实际渲染尺寸
 *   2. auto 宽度 → 给一个合理默认值（如容器宽度或 400px）
 *   3. auto 高度 → 同上
 *   4. 百分比尺寸 → 计算相对于父容器的实际像素值
 *   5. 独立创作模式 → 默认 800×600，用户可自定义
 */
interface CanvasSizeStrategy {
  /** 从 Schema 节点计算画布尺寸 */
  resolveCanvasSize(
    node: ComponentNode,
    parentNode?: ComponentNode,
    screenWidth?: number,
  ): { width: number; height: number; sizeInfo: string };
}

// 具体逻辑：
function resolveCanvasSize(node, parentNode, screenWidth = 1440) {
  const styles = node.styles ?? {};
  let w = parseDimension(styles.width, parentNode?.styles?.width, screenWidth);
  let h = parseDimension(styles.height, parentNode?.styles?.height, screenWidth);

  // auto / 未设置 → 给合理默认值
  if (!w || w === 'auto') w = 400;
  if (!h || h === 'auto') h = 300;

  // 限制最小/最大
  w = Math.max(100, Math.min(4096, w));
  h = Math.max(100, Math.min(4096, h));

  const sizeInfo = buildSizeInfoText(styles, w, h);
  return { width: w, height: h, sizeInfo };
}
```

#### 2.2.2 栅格系统

```typescript
/**
 * 画布栅格（README §4.2 "栅栏格子"）
 * 在 Canvas 上层叠加 SVG 栅格，不影响 Fabric.js 操作
 */
interface GridConfig {
  enabled: boolean;
  size: number;         // 栅格大小 px（默认 10）
  majorSize: number;    // 主栅格大小（默认 50，每 5 格一条粗线）
  color: string;        // 栅格线颜色
  majorColor: string;   // 主栅格线颜色
  opacity: number;      // 栅格透明度
  snap: boolean;        // 是否吸附栅格
}
```

#### 2.2.3 左侧工具栏设计

```typescript
/**
 * 工具分两组（严格对照 README §4.2）
 * 上半部分：绘图工具
 * 分隔线
 * 下半部分：效果工具（点击后右侧属性面板切换为对应编辑器）
 */
type DrawingTool =
  | 'select'     // ▲ 选择
  | 'rect'       // □ 矩形
  | 'ellipse'    // ○ 椭圆
  | 'polygon'    // △ 多边形
  | 'line'       // ╱ 线段
  | 'path'       // 〰 曲线（贝塞尔钢笔工具）
  | 'star'       // ★ 星形
  | 'text'       // T 文字
  | 'pencil'     // ✏ 画笔
  | 'image';     // 🖼 图片

type EffectTool =
  | 'gradient'   // 🔲 渐变（点击后右侧显示渐变编辑器）
  | 'fill'       // 🎨 填充（点击后右侧显示填充编辑器）
  | 'mask'       // 📐 蒙版（点击后右侧显示蒙版操作）
  | 'filter';    // ✨ 滤镜（点击后右侧显示滤镜编辑器）
```

#### 2.2.4 右侧属性面板上下文切换

```typescript
/**
 * 右侧属性面板根据当前选中状态和活跃工具动态切换内容
 */
type RightPanelMode =
  | 'layer-props'    // 默认：选中图层/对象的属性
  | 'gradient-edit'  // 渐变工具激活时：渐变编辑器
  | 'fill-edit'      // 填充工具激活时：填充编辑器
  | 'filter-edit'    // 滤镜工具激活时：滤镜编辑器
  | 'mask-edit'      // 蒙版工具激活时：蒙版操作
  | 'shadow-edit'    // 阴影编辑（通过图层属性进入）
  | 'animation-edit' // 动画编辑（通过菜单进入）
  | 'no-selection';  // 未选中任何对象

// 面板内容结构（对照 README §4.2 右侧）：
// ── 图层属性 ──
//   类型: 渐变
//   渐变类型: 线性
//   角度: 135°
//   色标:
//   ● #667eea 0%
//   ● #764ba2 100%
//   [+ 添加色标]
//
// ── 通用属性 ──
//   透明度: ━●━ 0.8
//   混合: [normal▾]
//
// ── 变换 ──
//   旋转: 0°
//   缩放: 100%
//   位移: X:0 Y:0
```

### 2.3 画布区域与编辑器交互

```typescript
/**
 * 编辑器 ↔ 素材编辑器数据流（对照 README §5.1-5.3）
 *
 * 打开时：
 *   1. 获取选中节点的 styles（background/filter/boxShadow 等）
 *   2. 解析为画布初始内容（parseBackgroundToLayers）
 *   3. 计算画布尺寸（resolveCanvasSize）
 *   4. 初始化 Fabric.js Canvas
 *
 * 编辑时：
 *   1. 所有操作实时更新画布
 *   2. 右侧属性面板与画布对象双向同步
 *   3. 自动保存到 localStorage
 *
 * 输出时：
 *   1. CSS 导出 → 直接 updateStyle 写入 Schema
 *   2. SVG/PNG 导出 → 上传后 updateStyle/updateComponentProps
 *   3. 保存为素材 → 上传到后端素材库
 */
```

---

## 三、重构方案：在现有代码上增量改造

> 遵循增量迭代规则：在已有文件上修改，不创建新版本。

### 3.1 文件改动清单

| 文件 | 改动类型 | 改动内容 |
|------|---------|---------|
| `MaterialEditorModal.tsx` | **重写布局** | Tab 式 → 三栏统一布局 |
| `CanvasEditor.tsx` | **拆解重组** | 顶部工具栏移到左侧，右侧面板独立出来 |
| `GradientEditor.tsx` | **保留** | 移入右侧属性面板作为子面板 |
| `ShadowEditor.tsx` | **保留** | 移入右侧属性面板作为子面板 |
| `FilterEditor.tsx` | **保留** | 移入右侧属性面板作为子面板 |
| `AnimationEditor.tsx` | **保留** | 通过菜单入口打开（非常用功能） |
| `AnimationResourceEditor.tsx` | **保留** | 通过菜单入口打开 |
| `index.tsx` | **调整** | 左面板素材 Tab 简化为素材库浏览 |
| `MaterialEditorCore.ts` | **扩展** | 新增栅格/曲线工具/画布尺寸感知 |

### 3.2 新增文件

| 文件 | 功能 |
|------|------|
| `LeftToolbar.tsx` | 左侧工具栏组件 |
| `RightPropertyPanel.tsx` | 右侧属性面板组件 |
| `LayerPanel.tsx` | 图层面板组件（从 CanvasEditor 中提取） |
| `CanvasGrid.tsx` | 画布栅格叠加层 |
| `ExportBar.tsx` | 底部导出栏 |
| `CanvasArea.tsx` | 画布区域（含 Fabric + 栅格） |
| `canvasSizeStrategy.ts` | 画布尺寸策略（元素 → 画布尺寸计算） |

---

## 四、详细实现计划

### Phase A：统一布局重构（优先级最高）

**目标**：将分散的 Tab 式面板重构为设计文档要求的三栏统一布局

1. 创建 `LeftToolbar.tsx` — 左侧工具栏
   - 绘图工具组：select/rect/ellipse/polygon/line/path/star/text/pencil/image
   - 分隔线
   - 效果工具组：gradient/fill/mask/filter
   - 工具切换联动画布模式和右侧面板

2. 创建 `RightPropertyPanel.tsx` — 右侧属性面板
   - 图层属性区（对象类型相关属性）
   - 通用属性区（透明度/混合模式）
   - 变换区（旋转/缩放/位移）
   - 上下文切换：选中渐变工具时显示 GradientEditor、选中滤镜时显示 FilterEditor

3. 创建 `LayerPanel.tsx` — 图层面板
   - 从 CanvasEditor 中提取图层列表
   - 图层可见性/锁定/排序/删除
   - 添加图层按钮

4. 创建 `ExportBar.tsx` — 底部导出栏
   - [应用到元素] [保存为项目素材] [导出SVG] [导出PNG] [复制CSS]

5. 重写 `MaterialEditorModal.tsx` — 统一布局
   - 标题栏 + 三栏主体 + 底部导出栏
   - 尺寸扩大到 960×680（给设计师更大操作空间）

### Phase B：画布增强

**目标**：让画布具备栅格、尺寸感知、辅助线等专业能力

1. 创建 `CanvasGrid.tsx` — 栅格叠加层
   - SVG 栅格（10px 细线 + 50px 粗线）
   - 可开关、可调整栅格大小
   - 吸附功能

2. 创建 `canvasSizeStrategy.ts` — 画布尺寸策略
   - 从选中元素的 styles 计算合适的画布尺寸
   - 处理 auto/百分比/vh/vw 等特殊值
   - 在标题栏和画布边缘显示尺寸信息

3. 扩展 `MaterialEditorCore.ts` — 新增栅格对齐
   - `setGridSnap(enabled: boolean, size: number)`
   - 移动/绘制时自动吸附栅格

### Phase C：曲线工具（钢笔工具）

**目标**：实现 README §4.3 中的路径工具

1. 扩展 `MaterialEditorCore.ts`
   - `path` 工具类型（贝塞尔曲线）
   - 点击添加锚点、拖拽创建曲线手柄
   - 路径编辑模式（双击进入编辑、拖拽控制手柄）

### Phase D：效果工具整合

**目标**：将渐变/填充/蒙版/滤镜作为左侧工具

1. 渐变工具 — 点击后右侧面板切换为 GradientEditor
   - 画布上显示渐变预览
   - 编辑完成后应用为对象填充或背景

2. 填充工具 — 颜色选择器 + 应用到选中对象

3. 蒙版工具 — 右侧面板显示蒙版操作

4. 滤镜工具 — 右侧面板显示 FilterEditor

---

## 五、关键接口定义

### 5.1 统一编辑器状态

```typescript
/** MaterialEditorModal 内部状态 */
interface MaterialEditorState {
  // 画布
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  gridEnabled: boolean;
  gridSize: number;

  // 工具
  activeTool: DrawingTool | EffectTool;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;

  // 选中对象
  selectedObjectIds: string[];
  selectedObjectProps: ObjectProps | null;

  // 右侧面板模式
  rightPanelMode: RightPanelMode;

  // 图层
  layers: LayerInfo[];
  selectedLayerIndex: number;

  // 历史
  canUndo: boolean;
  canRedo: boolean;

  // 目标节点（与编辑器关联）
  targetNodeId: string | null;
  targetNodeInfo: {
    type: string;
    name: string;
    width: number;
    height: number;
    sizeInfo: string;  // "400×300 px" 或 "auto × 200 px"
  } | null;
}
```

### 5.2 组件 Props 接口

```typescript
interface LeftToolbarProps {
  activeTool: DrawingTool | EffectTool;
  onToolChange: (tool: DrawingTool | EffectTool) => void;
  fillColor: string;
  strokeColor: string;
  onFillColorChange: (color: string) => void;
  onStrokeColorChange: (color: string) => void;
}

interface RightPropertyPanelProps {
  mode: RightPanelMode;
  selectedObject: ObjectProps | null;
  onPropertyChange: (key: string, value: unknown) => void;
  // 渐变编辑器数据
  gradientProps?: GradientEditorProps;
  // 滤镜编辑器数据
  filterProps?: FilterEditorProps;
  // 阴影编辑器数据
  shadowProps?: ShadowEditorProps;
}

interface LayerPanelProps {
  layers: LayerInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onToggleVisibility: (index: number) => void;
  onToggleLock: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDelete: (index: number) => void;
  onAddLayer: () => void;
}

interface ExportBarProps {
  targetNodeId: string | null;
  editorRef: React.RefObject<MaterialEditorCore>;
  onClose: () => void;
}
```
