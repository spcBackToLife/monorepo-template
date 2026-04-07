# 素材编辑器（Material Editor）— 完善 Roadmap

> **状态**：基于 2026-04-07 的全面差距分析
>
> 本文档列出设计文档 `README.md` 中要求但尚未完成/存在差距的所有事项，按优先级排序，逐项跟踪进度。

---

## 📊 整体完成度概览

| 维度 | 当前完成度 | 目标 |
|------|-----------|------|
| Feature 包核心 | **90%** ✅ | 100% |
| 编辑器集成（入口+跳转+数据传递） | **95%** ✅ | 100% |
| 后端 API | **95%** ✅ | 100% |
| 数据库/持久化 | 0% | 100% |
| Schema 集成 | **95%** ✅ | 100% |
| MCP 工具集成 | **100%** ✅ | 100% |
| 前端入口 | **90%** ✅ | 100% |
| 导出能力 | **90%** ✅ | 100% |
| 预览/渲染集成 | 20% | 100% |
| 预设模板 | **95%** ✅ | 100% |
| 容错/恢复 | **70%** ✅ | 100% |

---

## 🔥 Step 1: 编辑器集成（最高优先级）

> **核心问题**：素材编辑器虽然代码存在，但与主编辑器的集成是断裂的。
> 右键菜单只是占位符，没有弹窗/模态框机制，缺失数据双向流转。

### Task 1.1 — 右键菜单「设计素材…」真正跳转

- [x] **1.1.1** `buildMenuItems.tsx` 中 `key: 'asset'` 的点击处理：
  - ~~当前代码：`message.info('素材设计器将在资产 Phase 接入');`（纯占位）~~
  - 已改为 `editorStore.openMaterialEditor(targetNodeId)` ✅ (2026-04-07)
- [x] **1.1.2** 在 `EditorStore` 中新增素材编辑器弹窗状态 ✅ (2026-04-07)：
  ```typescript
  materialEditorOpen: boolean = false;
  materialEditorTargetNodeId: string | null = null;
  materialEditorInitTab: string = 'gradient';
  
  openMaterialEditor(nodeId, tab): void { ... }
  closeMaterialEditor(): void { ... }
  ```
- [x] **1.1.3** 在编辑器主布局中渲染素材编辑器 Modal 组件 ✅ (2026-04-07)

### Task 1.2 — 素材编辑器弹窗/模态框组件

- [x] **1.2.1** 创建 `MaterialEditorModal.tsx` ✅ (2026-04-07)：可拖拽浮动面板
  - 接收 `targetNodeId` + `initialTab` props
  - 包含完整的 Tab（渐变 / 阴影 / 滤镜 / 画布 / 动画 / 素材库）
  - 标题栏显示目标节点信息
  - Escape 关闭 + 遮罩点击关闭
- [x] **1.2.2** 在编辑器主页面 `EditorWorkspace` 中挂载 `MaterialEditorModal` ✅ (2026-04-07)

### Task 1.3 — 右键菜单连通素材编辑器弹窗

- [x] **1.3.1** `handleEditorContextMenuClick` 中 `key === 'asset'` 分支改为 `editorStore.openMaterialEditor(targetNodeId)` ✅ (2026-04-07)
- [ ] **1.3.2** 测试：选中元素 → 右键 → "设计素材…" → 弹窗打开 + 预填充当前元素样式

### Task 1.4 — 「高级编辑」按钮优化

- [x] **1.4.1** StylesTab 中的「高级编辑」按钮改为 `editorStore.openMaterialEditor(null, 'gradient')` 打开弹窗 ✅ (2026-04-07)
- [x] **1.4.2** 弹窗模式作为默认入口（符合设计文档 §4.1 "打开素材编辑器 Overlay"） ✅ (2026-04-07)

### Task 1.5 — 底部工具栏「🎨 素材」按钮入口

- [x] **1.5.1** 底部工具栏「素材」按钮改为打开素材编辑器弹窗 ✅ (2026-04-07)
  - 原来打开的是 `MediaMaterialsPanel` 简单面板，现改为 `editorStore.openMaterialEditor(null, 'gradient')`
- [x] **1.5.2** 清理不再使用的 `MediaMaterialsPanel` 导入和 `materialsOpen` 状态 ✅ (2026-04-07)

### Task 1.6 — 编辑器输出到 Schema 的数据流

- [x] **1.6.1** 渐变编辑器 → `updateStyle` → `background` — ✅ 已有 `applyToElement()`
- [x] **1.6.2** 阴影编辑器 → `updateStyle` → `boxShadow/textShadow` — ✅ 已有 `applyToElement()`
- [x] **1.6.3** 滤镜编辑器 → `updateStyle` → `filter` — ✅ 已有 `applyToElement()`
- [x] **1.6.4** **Canvas 画布编辑器 → 导出 SVG/PNG → 应用到元素** ✅ (2026-04-07)
  - 新增导出菜单项：「应用为元素背景 (SVG)」→ `updateStyle({ backgroundImage })` 
  - 新增导出菜单项：「应用为图片 src (PNG)」→ `updateComponentProps({ src })` 
- [x] **1.6.5** **CSS 动画编辑器 → 应用 animation 到元素** — ✅ 已有 `handleApplyToNode()`
- [x] **1.6.6** **动画资源 → 应用 Lottie/PAG/Rive 到元素** — ✅ 已有 `handleApplyToNode()`

---

## 🏗 Step 2: Schema 集成

### Task 2.1 — 在 `design-schema` 中扩展 ComponentNode

- [x] **2.1.1** 在 `ComponentNode` 接口中新增字段 ✅ (2026-04-07)：
  ```typescript
  animation?: AnimationConfig;       // 结构化动画配置（非纯 string）
  materialProjectId?: string;        // 关联的素材工程 ID
  ```
- [x] **2.1.2** 将 `AnimationConfig` 类型定义从 `material-editor/src/types.ts` 迁移/同步到 `design-schema` ✅ (2026-04-07)
  - 定义了 `CSSKeyframeSchema`, `CSSAnimationConfigSchema`, `ExternalAnimationConfigSchema`, `AnimationConfig`
  - 从 `design-schema/src/index.ts` 导出

### Task 2.2 — `applyMaterialDesign` Operation

- [x] **2.2.1** 在 `design-operations` 中注册新 Operation ✅ (2026-04-07)：
  ```typescript
  {
    type: "applyMaterialDesign",
    params: {
      nodeId: string;
      styleUpdates?: Partial<CSSProperties>;
      propUpdates?: Record<string, any>;
      materialProjectId?: string;
    }
  }
  ```
- [x] **2.2.2** 该 Operation 的 executor 逻辑 ✅ (2026-04-07)：
  - 创建 `operations/material.ts` — `executeApplyMaterialDesign()`
  - 一次性批量更新 styles + props + materialProjectId
  - 完整的 inverse/undo 支持（`_restoreMaterialDesign`）
  - 注册到 dispatch switch + description 列表

---

## 🔧 Step 3: 后端 API 补全

### Task 3.1 — 缺失的素材操作 API

- [x] **3.1.1** `PUT /materials/:id/meta` — 更新素材元数据（名称、分类、标签） ✅ (2026-04-07)
- [x] **3.1.2** `POST /materials/:id/resize` — 服务端图片缩放（sharp） ✅ (2026-04-07)
- [x] **3.1.3** `POST /materials/:id/crop` — 服务端图片裁切 ✅ (2026-04-07)
- [x] **3.1.4** `POST /materials/:id/convert` — 格式转换（PNG→WebP 等） ✅ (2026-04-07)

### Task 3.2 — `StorageProvider` 接口抽象

- [x] **3.2.1** 定义 `StorageProvider` 接口 ✅ (2026-04-07)：
  ```typescript
  interface StorageProvider {
    upload(file: Buffer, meta: FileMeta): Promise<AssetInfo>;
    getUrl(projectId: string, assetId: string): string;
    delete(projectId: string, assetId: string): Promise<void>;
    getThumbnailUrl(projectId: string, assetId: string): string;
    read(projectId: string, assetId: string): Promise<Buffer>;
    write(projectId: string, assetId: string, data: Buffer): Promise<void>;
    exists(projectId: string, assetId: string): Promise<boolean>;
  }
  ```
- [x] **3.2.2** 实现 `LocalStorageProvider`（当前硬编码的文件系统逻辑抽取出来） ✅ (2026-04-07)
  - 注册到 `MaterialsModule` 作为 `STORAGE_PROVIDER` 提供者
- [ ] **3.2.3** 后续可扩展 `S3StorageProvider`

### Task 3.3 — 缩略图自动生成

- [x] **3.3.1** 上传图片时自动生成 128×128 缩略图 ✅ (2026-04-07)
  - 使用 sharp 生成 WebP 格式缩略图，保存在 `thumbs/` 子目录
- [x] **3.3.2** 返回 `thumbnailUrl` 字段（当前始终为 `undefined`） ✅ (2026-04-07)
  - 上传时自动填充 `thumbnailUrl`，resize/crop/convert 后自动重新生成

### Task 3.4 — 数据库迁移

- [ ] **3.4.1** 将 `materials` JSON 文件存储迁移到数据库表（或保留 JSON 但补全缺失字段）
- [ ] **3.4.2** 将 `material_projects` JSON 存储迁移
- [ ] **3.4.3** 新建 `material_references` 表 — 追踪哪些 Schema 节点引用了哪些素材

---

## 🤖 Step 4: MCP 工具集成

> 设计文档 §10 要求 5 个 MCP Tools

- [x] **4.1** `search_materials` — AI 搜索项目素材库 ✅ (2026-04-07)
  - 支持按分类（image/icon/animation/video/other）和关键词过滤
- [x] **4.2** `upload_material` — AI 上传素材到项目 ✅ (2026-04-07)
  - 通过 URL 下载并上传到素材库，支持自定义分类和标签
- [x] **4.3** `set_element_gradient` — AI 设置元素渐变 ✅ (2026-04-07)
  - 支持 linear/radial/conic 三种渐变类型，通过 applyMaterialDesign 操作应用
- [x] **4.4** `add_css_animation` — AI 添加 CSS 动画 ✅ (2026-04-07)
  - 支持 12 种预设动画 + 自定义 animation 值
- [x] **4.5** `apply_filters` — AI 应用滤镜效果 ✅ (2026-04-07)
  - 支持 blur/brightness/contrast/grayscale/hue-rotate/invert/opacity/saturate/sepia/drop-shadow 及自定义 filter

---

## 📦 Step 5: Feature 包目录结构调整

> 设计文档 §2.1 要求的目录结构 vs 实际

- [ ] **5.1** 创建 `tools/` 子目录，从 `MaterialEditorCore.ts`（1396行）中拆出 `ToolManager`
- [ ] **5.2** 创建 `effects/` 子目录，将 `canvas/CanvasFilters.ts` 移入
- [ ] **5.3** 创建 `animation/` 子目录，将 `canvas/CSSAnimationEditor.ts`、`canvas/AnimationResourceManager.ts`、`core/animation.ts` 集中
- [ ] **5.4** 创建 `ui/` 子目录，或明确文档说明 UI 在 `apps/design_front` 中
- [ ] **5.5** `MaterialEditorCore.ts`（1396行）拆分为更小的模块

---

## 📤 Step 6: 导出能力补全

- [x] **6.1** PNG 导出支持指定分辨率（1x/2x/3x）+ Blob 输出 ✅ (2026-04-07)
  - 导出菜单已有 PNG 1x/2x/3x 三种分辨率选项
  - `MaterialEditorCore` 新增 `exportBlob()` 方法支持 Blob 输出
- [x] **6.2** WebP 导出 ✅ (2026-04-07)
  - `MaterialEditorCore` 新增 `exportWebP()` 方法
  - 导出菜单新增 "导出 WebP" 选项
- [x] **6.3** 复制 SVG 代码到剪贴板 ✅ (已有)
  - 导出菜单已有 "📋 复制 SVG 代码" 选项
- [x] **6.4** 从剪贴板粘贴图片（`paste` 事件监听 + Blob 读取） ✅ (2026-04-07)
  - Ctrl/Cmd+V 快捷键监听，读取剪贴板图片并添加到画布
- [ ] **6.5** 从 Figma/Sketch 复制 SVG 粘贴到画布
- [x] **6.6** 画布编辑器 "保存为项目素材" → 导出 + 自动上传到后端 ✅ (2026-04-07)
  - 导出菜单新增 "📦 保存为项目素材" 选项，导出 PNG 后自动上传
- [ ] **6.7** GIF 导出能力（可选，依赖 `gif.js`）

---

## 🎭 Step 7: 预览/渲染集成

- [ ] **7.1** `design-engine` 中集成动画资源播放（Lottie/PAG/Rive）
  - 预览模式下正确播放动画
- [ ] **7.2** `design-codegen` 中集成动画导出逻辑
  - 代码生成时正确输出 animation/@keyframes

---

## 🎨 Step 8: 预设模板补充

### Task 8.1 — 动画预设（当前 12 个，目标 30+）

- [x] **8.1.1** 补充缺失的动画 ✅ (2026-04-07) — 从 12 个扩充到 32 个：
  - ✅ bounceOut, wobble, zoomOut, rotateOut
  - ✅ flipInX, flipInY, flipOutX, flipOutY
  - ✅ slideOutUp, slideOutDown, slideOutLeft, slideOutRight
  - ✅ swing, tada, jello, heartBeat
  - ✅ lightSpeedInLeft, lightSpeedInRight
  - ✅ rollIn, rollOut

### Task 8.2 — 纹理模板（当前 0 个，目标 15+）

- [x] **8.2.1** 内置纹理模板定义（SVG 图案） ✅ (2026-04-07) — 15 种纹理：
  - ✅ 点阵 (Dots)、斜线 (Diagonal Lines)、网格 (Grid)
  - ✅ 菱形 (Diamond)、波纹 (Waves)、棋盘 (Checkerboard)
  - ✅ 六边形 (Hexagon)、三角 (Triangles)、砖墙 (Bricks)
  - ✅ 织物 (Fabric)、木纹 (Wood Grain)、大理石 (Marble)
  - ✅ 噪点 (Noise)、条纹 (Stripes)、十字 (Crosses)
  - 创建 `core/textures.ts` 模块，每种纹理生成内联 SVG data URI
  - 支持自定义颜色、背景色、尺寸、线宽、透明度
  - 从 `material-editor` 包导出 `TEXTURE_PRESETS`、`findTexturePreset()`、`textureToCSS()`

---

## 🛡 Step 9: 容错与崩溃恢复

- [x] **9.1** 素材编辑器 Canvas 编辑进度 localStorage 自动保存 ✅ (2026-04-07)
  - 每 30s 自动保存 `canvas.toJSON()` 到 localStorage
  - 下次打开时检测并恢复（24 小时内有效）
  - key 格式: `material-editor-autosave-{nodeId}`
- [ ] **9.2** 素材被删除但 Schema 仍引用时的占位图显示 + 面板标红提示
- [x] **9.3** 大尺寸图片编辑（>4096px）自动缩小到安全尺寸 ✅ (2026-04-07)
  - 上传时检测图片尺寸，>4096px 自动使用 sharp 缩放
  - 保持宽高比，使用 `fit: 'inside'` 策略

---

## ✅ 已完成清单（确认无遗漏）

以下是已确认完成的功能，无需再做：

- [x] `features/material-editor/` 独立包存在
- [x] `MaterialEditorCore` 基于 Fabric.js v6（1396行）
- [x] `LayerManager` 图层系统（213行）
- [x] `HistoryManager` 撤销/重做（125行）
- [x] `BooleanOps` 布尔运算（136行）
- [x] `CanvasFilters` 画布滤镜（217行）
- [x] 基础图形工具（矩形/椭圆/多边形/星形/线段）
- [x] 钢笔/铅笔工具（PencilBrush + 路径工具）
- [x] 选择/移动/缩放/旋转
- [x] 填充 + 描边
- [x] 16种混合模式（BLEND_MODES）
- [x] 图案纹理层（`setPatternFill` + `addPatternRect`）
- [x] 图层蒙版裁切（`applyClipMask` / `removeClipMask`）
- [x] 工程文件保存/加载（`saveProject()` / `loadProject()`）
- [x] 渐变编辑器（线性/径向/锥形 + GRADIENT_PRESETS 15+）
- [x] 阴影编辑器（box-shadow + text-shadow + SHADOW_PRESETS）
- [x] 滤镜编辑器（CSS filter 滑块）
- [x] CSS 动画关键帧编辑器 + 缓动曲线
- [x] 动画预设（ANIMATION_PRESETS 32个）
- [x] Lottie 导入/播放/颜色替换/文字替换
- [x] PAG 导入/播放（libpag canvas 渲染）
- [x] Rive 导入/播放（@rive-app/canvas）
- [x] GIF 导入（img 显示）
- [x] CSS 代码导出（`css-exporter.ts`）
- [x] CSS 解析（`css-parser.ts`）
- [x] 导出 SVG（`exportSVG()`）
- [x] 导出 PNG（`exportPNG()` DataURL + Blob）
- [x] 导出 WebP（`exportWebP()` DataURL）
- [x] 纹理预设（TEXTURE_PRESETS 15种）
- [x] 后端素材上传/列表/详情/删除 API
- [x] 后端工程文件 CRUD API
- [x] MaterialsModule 注册到 AppModule
- [x] 左侧面板「素材」Tab
- [x] 右侧属性面板「高级编辑」按钮（切换左面板）
- [x] `asset://` 协议解析（`resolveAssetUrl.ts`）
- [x] `types.ts` 中有 `AnimationConfig` / `MaterialProject` 等类型
- [x] 素材拖拽到画布（`handleDragStart`）
- [x] 右键菜单有「设计素材…」菜单项（但 handler 只是占位）

---

## 📅 建议执行顺序

```
第 1 轮（集成打通）：Step 1 (编辑器集成) → 最核心，让已有功能真正可用
第 2 轮（数据完整）：Step 2 (Schema) + Step 3.1-3.3 (后端 API)
第 3 轮（AI 能力）：Step 4 (MCP)
第 4 轮（完善体验）：Step 6 (导出) + Step 8 (预设) + Step 9 (容错)
第 5 轮（架构优化）：Step 5 (目录) + Step 3.4 (数据库) + Step 7 (预览/渲染)
```

---

*文档维护：每完成一项，在对应 `[ ]` 中改为 `[x]` 并注明完成日期。*
