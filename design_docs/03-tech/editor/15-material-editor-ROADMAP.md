# 素材编辑器统一重构 — 实施 ROADMAP

> **严格对照**：`design_docs/02-product/editor/12-material-editor/README.md`
>
> **技术方案**：`design_docs/03-tech/editor/15-material-editor.md`
>
> **核心目标**：将当前分散的 Tab 式面板整合为 README §4.2 定义的统一三栏式素材编辑器
>
> **增量迭代**：在已有代码上修改，不创建新版本文件

---

## 📊 总览

| 阶段 | 内容 | 对照 README 章节 | 状态 |
|------|------|----------------|------|
| Phase A | 统一布局重构 | §4.2 整体 UI 布局 | ✅ 已完成 |
| Phase B | 画布增强（栅格/尺寸感知） | §4.2 画布区域 + §5.2 初始化 | ✅ 已完成 |
| Phase C | 曲线工具（钢笔/路径） | §4.3 能力1 路径工具 | ✅ 已完成 |
| Phase D | 效果工具整合 | §4.2 工具栏下半区 + §4.3 能力2-3 | ✅ 已完成 |
| Phase E | 导出与应用优化 | §5.3-5.4 输出/Operation | ✅ 已完成 |

---

## Phase A：统一布局重构

> **对照 README §4.2**：三栏布局（左工具栏 + 中画布/图层 + 右属性面板）+ 底部导出栏
> 
> **这是最高优先级！** 不解决布局问题，其他改进都是零散的。

### A.1 — 创建左侧工具栏 `LeftToolbar.tsx`

**对照 README §4.2 左侧工具栏区域**：

```
工具栏
[▲] 选择    → select
[□] 矩形    → rect
[○] 椭圆    → ellipse
[△] 多边    → polygon
[╱] 线段    → line
[〰] 曲线   → path
[★] 星形    → star
[T] 文字    → text
[✏] 画笔    → pencil
[🖼] 图片   → image
──────
[🔲] 渐变   → gradient（点击后右侧面板切换为渐变编辑器）
[🎨] 填充   → fill（点击后右侧面板切换为填充编辑器）
[📐] 蒙版   → mask（点击后右侧面板切换为蒙版操作）
[✨] 滤镜   → filter（点击后右侧面板切换为滤镜编辑器）
```

- [ ] **A.1.1** 新建 `apps/design_front/src/views/editor/panels/MaterialEditor/LeftToolbar.tsx`
  - 垂直布局，宽度 48px
  - 上半区：10 个绘图工具按钮（图标 + Tooltip）
  - 分隔线
  - 下半区：4 个效果工具按钮
  - 选中状态高亮
  - 快捷键映射（V/R/O/P/L/C/S/T/B/I）
  - 工具切换回调：`onToolChange(tool)`
  - 效果工具切换回调：`onEffectToolChange(tool)` → 同时改变右侧面板模式

### A.2 — 创建右侧属性面板 `RightPropertyPanel.tsx`

**对照 README §4.2 右侧属性面板区域**：

```
── 图层属性 ──
类型: 渐变
渐变类型: 线性
角度: 135°
色标:
● #667eea 0%
● #764ba2 100%
[+ 添加色标]

── 通用属性 ──
透明度: ━●━ 0.8
混合: [normal▾]

── 变换 ──
旋转: 0°
缩放: 100%
位移: X:0 Y:0
```

- [ ] **A.2.1** 新建 `apps/design_front/src/views/editor/panels/MaterialEditor/RightPropertyPanel.tsx`
  - 宽度 220px，滚动区域
  - **图层属性区**：根据选中对象类型动态显示
    - 矩形：宽/高/圆角
    - 椭圆：水平/垂直半径
    - 多边形：边数
    - 星形：角数/内外径比
    - 文字：字体/字号/粗细/对齐
    - 图片：裁切/适应模式
    - 渐变对象：渐变类型/角度/色标列表
  - **通用属性区**：透明度滑块 + 混合模式下拉
  - **变换区**：旋转角度/缩放比例/X-Y位移
  - 上下文切换模式：
    - 默认模式：显示选中对象属性
    - 渐变工具模式：集成现有 `GradientEditor`
    - 滤镜工具模式：集成现有 `FilterEditor`
    - 蒙版模式：蒙版操作面板
    - 填充模式：颜色选择器

### A.3 — 创建图层面板 `LayerPanel.tsx`

**对照 README §4.2 画布区域下方的图层面板**：

```
┌───────────────────────────────┐
│ 图层 1: 渐变层     👁 🔒 ▲ ▼  │
│ 图层 2: 图片层     👁 🔒 ▲ ▼  │
│ 图层 3: 图案纹理   👁 🔒 ▲ ▼  │
│ [+ 添加图层]                   │
└───────────────────────────────┘
```

- [ ] **A.3.1** 新建 `apps/design_front/src/views/editor/panels/MaterialEditor/LayerPanel.tsx`
  - 从 `CanvasEditor.tsx` 中提取图层列表逻辑
  - 位于画布区域下方（非右侧面板内）
  - 可折叠（折叠时只显示一行"图层: N 个"）
  - 每个图层行：图标 + 名称 + 可见性👁 + 锁定🔒 + 上移▲ + 下移▼
  - [+ 添加图层] 按钮

### A.4 — 创建底部导出栏 `ExportBar.tsx`

**对照 README §4.2 底部区域**：

```
导出: [应用到元素] [保存为项目素材] [导出 SVG] [导出 PNG] [复制 CSS]
```

- [ ] **A.4.1** 新建 `apps/design_front/src/views/editor/panels/MaterialEditor/ExportBar.tsx`
  - 横向排列的 5 个操作按钮
  - 「应用到元素」→ 主要按钮（蓝色），调用 applyMaterialDesign Operation
  - 「保存为项目素材」→ 导出 PNG 后上传到后端
  - 「导出 SVG」→ 下载 .svg 文件
  - 「导出 PNG」→ 下拉选 1x/2x/3x
  - 「复制 CSS」→ 生成 CSS 代码到剪贴板
  - 没有选中元素时「应用到元素」按钮置灰

### A.5 — 重写 `MaterialEditorModal.tsx` 统一布局

**对照 README §4.2 完整布局**

- [ ] **A.5.1** 重写 `MaterialEditorModal.tsx` 的内部布局
  - 移除 Tab 结构（Tabs 组件不再使用）
  - 替换为三栏 flex 布局：
    ```
    ┌────────────────────────────────────────────────┐
    │  标题栏（可拖拽移动）                             │
    ├────┬────────────────────────────┬───────────────┤
    │左侧│   画布区域                  │  右侧属性面板  │
    │工具│   (CanvasArea)             │  (RightPanel)  │
    │栏  │   ┌图层面板───────────┐    │               │
    │    │   └──────────────────┘    │               │
    │    │   [撤销][重做][缩放:100%]  │               │
    ├────┴────────────────────────────┴───────────────┤
    │  底部导出栏                                       │
    └────────────────────────────────────────────────┘
    ```
  - 窗口尺寸：宽 960px，高 680px（比当前 720 更大）
  - 标题栏显示：`素材编辑器 — <元素类型> 元素名 (宽×高)`
  - 保留拖拽移动 + Escape 关闭功能

### A.6 — 重构 `CanvasEditor.tsx`

- [ ] **A.6.1** 改造 `CanvasEditor.tsx`
  - 移除顶部工具栏（已移到 LeftToolbar）
  - 移除右侧图层面板（已移到 LayerPanel + RightPropertyPanel）
  - 只保留纯画布区域 + 底部画布工具条（撤销/重做/缩放）
  - 组件更名为 `CanvasArea` 或保持文件名但精简内容
  - 接收 `editorRef` 从父组件传入（共享 MaterialEditorCore 实例）

---

## Phase B：画布增强

> **对照 README §4.2 画布区域 + §5.2 初始化**
> **用户需求**："画布应该有栅栏格子等，能让设计师尽情设计元素"

### B.1 — 画布栅格系统

- [ ] **B.1.1** 新建 `apps/design_front/src/views/editor/panels/MaterialEditor/CanvasGrid.tsx`
  - SVG 栅格叠加层，覆盖在 Fabric Canvas 上方
  - `pointer-events: none` 不阻挡画布交互
  - 细线栅格（10px 间距，#e5e5e5）
  - 粗线栅格（50px 间距，#ccc）
  - 可通过画布工具栏的开关切换显示

- [ ] **B.1.2** 栅格吸附（snap-to-grid）
  - 扩展 `MaterialEditorCore.ts` 添加 `setGridSnap(enabled, size)` 方法
  - 对象移动/绘制时自动对齐到最近的栅格点
  - 默认开启，可关闭

### B.2 — 画布尺寸感知（元素关联）

**对照 README §5.2**："画布尺寸（默认跟随元素尺寸）"
**用户需求**："元素的宽高应该合理的被放在画布上"

- [ ] **B.2.1** 新建 `features/material-editor/src/core/canvasSizeStrategy.ts`
  - `resolveCanvasSize(node, parentNode, screenWidth)` 函数
  - 处理固定 px / auto / 百分比 / vh-vw 等尺寸
  - auto 尺寸给合理默认值（min 200, max 1200）
  - 返回 `{ width, height, sizeInfo }` — sizeInfo 如 "400×300 px" 或 "auto(400) × 200 px"

- [ ] **B.2.2** 在 `MaterialEditorModal` 打开时调用 `resolveCanvasSize`
  - 根据目标节点的 styles.width/height 计算画布尺寸
  - 在标题栏显示尺寸信息
  - 画布区域显示元素轮廓参考线

- [ ] **B.2.3** 画布尺寸手动调整
  - 画布工具栏增加尺寸输入框（W × H）
  - 用户可手动修改画布尺寸
  - 预设尺寸按钮（常用移动端尺寸：375×667, 390×844 等）

### B.3 — 标尺（可选增强）

- [ ] **B.3.1** 画布区域顶部和左侧添加刻度标尺
  - 显示像素坐标
  - 跟随缩放同步缩放刻度

---

## Phase C：曲线工具

> **对照 README §4.3 能力1 路径工具**：
> - 钢笔工具（贝塞尔曲线路径）
> - 铅笔工具（自由绘制，自动平滑）— 已有
> - 路径编辑（锚点、控制手柄、曲线调整）

### C.1 — 贝塞尔钢笔工具

- [ ] **C.1.1** 扩展 `MaterialEditorCore.ts` 添加 `path` 工具模式
  - 点击画布添加锚点（直角点，生成直线段 L 命令）
  - 拖拽创建贝塞尔曲线控制手柄（生成三次贝塞尔 C 命令）
  - 拖拽时实时预览控制手柄线和对称手柄点
  - 回到起点时闭合路径（闭合段也支持曲线）
  - 按 Escape 取消路径绘制（自动切回选择工具）
  - 按 Enter 完成开放路径（自动切回选择工具）
  - 绘制完成后自动选中创建的路径对象

- [ ] **C.1.2** 路径编辑模式
  - 双击已有路径进入编辑模式
  - 显示锚点 + 控制手柄
  - 拖拽锚点移动位置
  - 拖拽控制手柄调整曲线弧度
  - 双击锚点在直角点/曲线点之间切换

---

## Phase D：效果工具整合

> **对照 README §4.2 工具栏分隔线下方**：渐变/填充/蒙版/滤镜
> **对照 README §4.3 能力2 图层合成 + 能力3 滤镜与特效**

### D.1 — 渐变工具整合

- [ ] **D.1.1** 点击左侧「渐变」工具
  - 右侧面板切换为 GradientEditor（复用现有组件）
  - 如果有选中对象：编辑该对象的填充渐变
  - 如果无选中对象：创建新的渐变图层
  - 画布上实时预览渐变效果

### D.2 — 填充工具整合

- [ ] **D.2.1** 点击左侧「填充」工具
  - 右侧面板显示颜色选择器 + 取色器
  - 点击画布上的对象直接应用填充颜色
  - 支持纯色 / 渐变 / 图案三种填充模式

### D.3 — 蒙版工具整合

- [ ] **D.3.1** 点击左侧「蒙版」工具
  - 右侧面板显示蒙版操作面板
  - 选中两个对象时可执行：应用蒙版 / 移除蒙版
  - 蒙版类型说明

### D.4 — 滤镜工具整合

- [ ] **D.4.1** 点击左侧「滤镜」工具
  - 右侧面板切换为滤镜编辑器
  - 上半部分：CSS 滤镜滑块（复用 FilterEditor）
  - 下半部分：Canvas 增强滤镜（仅图片对象可用）
  - 阴影编辑入口（对照 README §4.3 能力3 中的 drop-shadow）

### D.5 — 阴影编辑入口

- [ ] **D.5.1** 在右侧面板的图层属性中集成阴影编辑
  - 复用 ShadowEditor 组件
  - 通过"添加阴影"按钮进入
  - 可同时编辑多个阴影层

---

## Phase E：导出与应用优化

> **对照 README §5.3 输出 + §5.4 Operation**

### E.1 — 统一导出流程

- [ ] **E.1.1** 「应用到元素」按钮逻辑优化
  - 智能检测输出方式：
    - 只有渐变/纯色图层 → 导出为 CSS background → `updateStyle`
    - 包含图片/图形图层 → 导出为 SVG/PNG → `applyMaterialDesign`
    - 根据元素类型自动选择（img → src，div → backgroundImage）
  - 使用 `applyMaterialDesign` Operation 一次性更新

- [ ] **E.1.2** 「复制 CSS」按钮
  - 调用 `generateCSSCode()` 生成格式化的 CSS
  - 包含 background、filter、box-shadow、animation 等所有属性
  - 复制到系统剪贴板 + Toast 提示

- [ ] **E.1.3** 导出分辨率下拉
  - PNG 导出：1x / 2x / 3x 切换
  - 默认 2x（Retina 标准）

---

## 进度跟踪

### 当前状态

| 阶段 | 任务 | 状态 | 完成日期 |
|------|------|------|---------|
| A.1 | LeftToolbar.tsx | ✅ 已完成 | 2026-04-07 |
| A.2 | RightPropertyPanel.tsx | ✅ 已完成 | 2026-04-07 |
| A.3 | LayerPanel.tsx | ✅ 已完成 | 2026-04-07 |
| A.4 | ExportBar.tsx | ✅ 已完成 | 2026-04-07 |
| A.5 | MaterialEditorModal.tsx 重写布局 | ✅ 已完成 | 2026-04-07 |
| A.6 | CanvasEditor.tsx 精简 | ✅ 已完成 | 2026-04-07 |
| B.1 | 画布栅格系统（CanvasGrid 组件） | ✅ 已完成 | 2026-04-07 |
| B.1 | 画布栅格系统（snap-to-grid） | ✅ 已完成 | 2026-04-07 |
| B.2 | 画布尺寸感知（尺寸解析已内联到 Modal） | ✅ 已完成 | 2026-04-07 |
| B.2 | 画布尺寸感知（手动调整） | ✅ 已完成 | 2026-04-07 |
| B.3 | 标尺 | ✅ 已完成 | 2026-04-07 |
| C.1 | 贝塞尔钢笔工具（C.1.1 基础绘制 + 拖拽创建曲线控制手柄） | ✅ 已完成 | 2026-04-07 |
| C.1 | 路径编辑模式（C.1.2 双击编辑锚点） | ✅ 已完成 | 2026-04-07 |
| D.1 | 渐变工具整合（基础面板切换） | ✅ 已完成 | 2026-04-07 |
| D.1 | 渐变工具深度整合（D.1.1 Fabric 渐变填充） | ✅ 已完成 | 2026-04-07 |
| D.2 | 填充工具整合 | ✅ 已完成 | 2026-04-07 |
| D.3 | 蒙版工具整合 | ✅ 已完成 | 2026-04-07 |
| D.4 | 滤镜工具整合 | ✅ 已完成 | 2026-04-07 |
| D.5 | 阴影编辑入口 | ✅ 已完成 | 2026-04-07 |
| E.1 | 统一导出流程（智能导出+CSS+WebP+工程文件） | ✅ 已完成 | 2026-04-07 |

### 已有可复用代码（不需要重写）

以下功能在现有代码中已完整实现，重构时直接复用：

- ✅ `MaterialEditorCore.ts` — Fabric.js 封装（1422行），基础绘图引擎
- ✅ `GradientEditor.tsx` — 渐变编辑器 UI（339行），直接嵌入右侧面板
- ✅ `ShadowEditor.tsx` — 阴影编辑器 UI（314行），直接嵌入右侧面板
- ✅ `FilterEditor.tsx` — CSS 滤镜编辑器（257行），直接嵌入右侧面板
- ✅ `AnimationEditor.tsx` — CSS 动画编辑器（949行），通过菜单入口
- ✅ `AnimationResourceEditor.tsx` — 动画资源管理（980行），通过菜单入口
- ✅ `LayerManager.ts` — 图层数据管理（214行），纯数据操作
- ✅ `HistoryManager.ts` — 撤销/重做（126行）
- ✅ `BooleanOps.ts` — 布尔运算（137行）
- ✅ `CanvasFilters.ts` — Canvas 增强滤镜（218行）
- ✅ `CSSAnimationEditor.ts` — 关键帧动画管理
- ✅ `AnimationResourceManager.ts` — Lottie/PAG/Rive 管理
- ✅ `css-exporter.ts` / `css-parser.ts` — CSS 导出/解析
- ✅ `core/gradient.ts` — 渐变预设 + CSS 生成
- ✅ `core/shadows.ts` — 阴影预设 + CSS 生成
- ✅ `core/filters.ts` — 滤镜配置 + CSS 生成
- ✅ `core/animation.ts` — 动画预设 32 个
- ✅ `core/textures.ts` — 纹理预设 15 个

---

*每完成一个任务，将对应 `⬜ 未开始` 改为 `✅ 已完成` 并注明日期。*
