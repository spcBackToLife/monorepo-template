# 07 - Frontend Canvas Component

> design_front 画布组件技术设计

---

## 1. 第一性原理 / First Principle

Canvas component answers: **"How to translate user intent into Operations?"**

It's the bridge between **physical input** (mouse, keyboard, trackpad) and **logical operations** (create node, move node, select, zoom). Every gesture must map unambiguously to an operation.

画布组件是物理输入与逻辑操作之间的桥梁，每一个手势都必须无歧义地映射到一个操作。

---

## 2. 来自产品需求 / Product Requirements

| PRD | 关联内容 |
|-----|---------|
| `01-canvas` | Zoom/pan, drawing — 缩放/平移、绘制 |
| `02-toolbar` | Tool switching, keyboard shortcuts — 工具切换、快捷键 |
| All tool interactions | 各工具的交互行为 |

---

## 3. ToolStateMachine

工具状态机 — 管理当前激活的工具及其状态转换。

```typescript
type ToolType =
  | 'select'
  | 'container'
  | 'element'
  | 'text'
  | 'component'
  | 'annotation'
  | 'hand';

interface ToolStateMachine {
  /** 当前工具 */
  current: ToolType;

  /** 上一个工具（用于临时切换恢复） */
  previous: ToolType;

  /** 是否锁定（双击工具锁定） */
  locked: boolean;

  /** 激活工具 */
  activate(tool: ToolType): void;

  /** 临时激活（如 Space → hand） */
  activateTemporary(tool: ToolType): void;

  /** 取消临时激活（Space 释放 → 恢复上一个工具） */
  deactivateTemporary(): void;

  /** 锁定当前工具（双击工具图标） */
  lock(): void;

  /** 解锁 */
  unlock(): void;

  /** 自动回归 select（绘制完一个元素后） */
  autoReturn(): void;
}
```

**状态转换规则 / State Transition Rules:**

| 触发条件 | 行为 |
|---------|------|
| 绘制完一个元素 | `autoReturn()` → 自动回到 `select` |
| Space 按住 | `activateTemporary('hand')` → 临时切换为抓手工具 |
| Space 释放 | `deactivateTemporary()` → 恢复之前的工具 |
| 双击工具图标 | `lock()` → 锁定当前工具，绘制后不自动回归 |
| 点击其他工具 | `activate(tool)` → 切换工具，解除锁定 |

---

## 4. useCanvasInteractions Hook

根据 `activeTool` 分发交互行为 / Dispatches interaction behavior based on activeTool.

| Tool | Click | Drag | Shift+Click | Notes |
|------|-------|------|-------------|-------|
| `select` | Select element 选中元素 | Move element 移动元素 | Multi-select 多选 | Drag on empty = marquee selection 框选 |
| `container` | — | Draw rectangle, release to create container | — | 绘制容器 |
| `element` | — | Draw rectangle, release to create element | — | 绘制元素 |
| `text` | — | Draw rectangle, release to create text | — | 绘制文本 |
| `hand` | — | Pan canvas 平移画布 | — | 拖拽平移 |
| `annotation` | — | Draw annotation area 绘制标注区域 | — | 绘制标注 |

**Hook 签名：**

```typescript
function useCanvasInteractions(
  toolState: ToolStateMachine,
  canvasRef: RefObject<HTMLDivElement>
): {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
};
```

---

## 5. useKeyboardShortcuts Hook

全局键盘快捷键系统 / Global keyboard shortcut system.

### Tool Shortcuts / 工具快捷键

| Key | Action | 说明 |
|-----|--------|------|
| `V` | Select tool | 选择工具 |
| `F` | Container tool | 容器工具 |
| `R` | Element tool | 元素工具 |
| `T` | Text tool | 文本工具 |
| `C` | Component tool | 组件工具 |
| `A` | Annotation tool | 标注工具 |
| `H` | Hand tool | 抓手工具 |

### History / 历史操作

| Shortcut | Action | 说明 |
|----------|--------|------|
| `Cmd+Z` | Undo | 撤销 |
| `Cmd+Shift+Z` | Redo | 重做 |

### Element Operations / 元素操作

| Shortcut | Action | 说明 |
|----------|--------|------|
| `Backspace` / `Delete` | Delete selected | 删除选中 |
| `Cmd+C` | Copy | 复制 |
| `Cmd+V` | Paste | 粘贴 |
| `Cmd+X` | Cut | 剪切 |
| `Cmd+D` | Duplicate | 原地复制 |

### Zoom / 缩放

| Shortcut | Action | 说明 |
|----------|--------|------|
| `Cmd+=` | Zoom in | 放大 |
| `Cmd+-` | Zoom out | 缩小 |
| `Cmd+0` | Fit to screen | 适应画布 |
| `Cmd+1` | Zoom to 100% | 缩放至 100% |

### Global / 全局

| Shortcut | Action | 说明 |
|----------|--------|------|
| `Cmd+P` | Toggle preview | 切换预览模式 |
| `Cmd+S` | Save | 保存 |

### Input Focus Exemption / 输入焦点豁免

当焦点在 `<input>`, `<textarea>`, `[contenteditable]` 等文本输入字段中时，跳过所有单键快捷键（V, F, R, T 等），避免干扰正常文本输入。带修饰键的快捷键（Cmd+Z 等）仍然生效。

```typescript
function useKeyboardShortcuts(toolState: ToolStateMachine): void;
```

---

## 6. ContextMenu 右键菜单

两种上下文菜单 / Two context menus depending on click target.

### Element Context Menu / 元素右键菜单

当右键点击选中元素时显示：

| Action | Shortcut | 说明 |
|--------|----------|------|
| Copy | Cmd+C | 复制 |
| Paste | Cmd+V | 粘贴 |
| Duplicate | Cmd+D | 原地复制 |
| Delete | Delete | 删除 |
| --- | --- | --- |
| Wrap in Container | — | 包裹进容器 |
| Unwrap | — | 解除容器包裹 |
| --- | --- | --- |
| Lock / Unlock | — | 锁定/解锁 |
| Show / Hide | — | 显示/隐藏 |
| --- | --- | --- |
| Send to Back | — | 移到最底层 |
| Send to Front | — | 移到最顶层 |

### Canvas Context Menu / 画布右键菜单

当右键点击空白画布时显示：

| Action | Shortcut | 说明 |
|--------|----------|------|
| Paste | Cmd+V | 粘贴 |
| Select All | Cmd+A | 全选 |
| --- | --- | --- |
| Zoom In | Cmd+= | 放大 |
| Zoom Out | Cmd+- | 缩小 |
| Fit to Screen | Cmd+0 | 适应画布 |
| Zoom to 100% | Cmd+1 | 缩放至 100% |

---

## 7. useZoomPan Hook

缩放与平移交互 / Zoom and pan interactions.

| 交互方式 | 行为 |
|---------|------|
| `Cmd + Scroll` | Zoom centered on cursor — 以光标为中心缩放 |
| `Space + Drag` | Pan canvas — 平移画布 |
| Pinch gesture (trackpad) | Zoom — 触控板捏合缩放 |

**缩放范围 / Zoom Range:** `10%` ~ `400%`

```typescript
function useZoomPan(
  canvasRef: RefObject<HTMLDivElement>
): {
  zoom: number;
  panX: number;
  panY: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (level: number) => void;
  fitToScreen: () => void;
  resetZoom: () => void;
};
```

**实现要点：**

- `wheel` 事件监听 `e.ctrlKey` (Cmd on Mac) 判断是否为缩放
- 缩放以鼠标指针位置为中心点，而非画布中心
- 平移通过修改 `transform: translate(panX, panY) scale(zoom)` 实现
- Pinch 手势通过 `wheel` 事件的 `e.ctrlKey + deltaY` 检测（浏览器将 trackpad pinch 映射为此事件）

---

## 8. 影响的文件路径 / Affected File Paths

```
apps/design_front/src/
├── views/
│   └── editor/
│       ├── canvas/
│       │   ├── CanvasContainer.tsx      ← 🆕 or 扩展 — 画布容器
│       │   ├── ToolStateMachine.ts      ← 🆕 — 工具状态机
│       │   └── ContextMenu.tsx          ← 🆕 — 右键菜单
│       └── hooks/
│           ├── useCanvasInteractions.ts ← 🆕 — 画布交互 hook
│           ├── useKeyboardShortcuts.ts  ← 🆕 — 键盘快捷键 hook
│           └── useZoomPan.ts            ← 🆕 — 缩放平移 hook
```

---

## 9. 依赖关系 / Dependencies

- **依赖 (Depends on):** `04-engine-canvas` (画布引擎), `06-frontend-layout` (布局框架)
- **被依赖 (Depended by):** 无

---

## 10. MVP vs 后期 / Phasing

| Phase | 内容 |
|-------|------|
| **Phase 1** | ToolStateMachine, keyboard shortcuts, zoom/pan, context menu — 核心交互基础 |
| **Phase 4** | Annotation tool, advanced draw tools — 标注工具、高级绘制工具 |

---

## 11. 技术决策 / Decision Record

### Keyboard Shortcuts: Single Global Handler vs Per-Component

**Decision: Single global handler with focus exemptions**

| 方案 | 优点 | 缺点 |
|------|------|------|
| Single global handler | One place to manage all shortcuts, easy to prevent conflicts, clear priority | Must handle focus exemptions explicitly |
| Per-component handlers | Encapsulated, each component owns its shortcuts | Conflict resolution is hard, ordering ambiguous, shortcuts scattered across codebase |

**理由：** 快捷键是全局行为，分散在各组件中会导致冲突难以排查。统一的全局处理器配合输入焦点豁免机制，既保证了快捷键的可靠性，又避免了干扰文本输入。A single global handler provides a clear, maintainable source of truth for all keyboard shortcuts.
