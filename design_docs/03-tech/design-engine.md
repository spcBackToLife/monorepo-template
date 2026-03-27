# design-engine — 双层渲染引擎

> **包名：** `@globallink/design-engine` · **模板：** `features/ui-sdk` · **运行环境：** browser
>
> **职责：把 Schema 渲染成可视化的 UI，同时提供编辑器交互层。**
>
> 相关文档：[整体架构](./architecture.md) | [design-schema](./design-schema.md) | [design-operations](./design-operations.md)

---

## 双层架构

```
┌─────────────────────────────────────────┐
│        Canvas 覆盖层（编辑交互）          │
│  - 选区框 / hover 高亮                   │  ← 纯几何绘制
│  - 拖拽手柄 / resize handle              │     Canvas 2D API
│  - 对齐辅助线 / 吸附提示                 │     接收鼠标事件
│  - 间距标注 / 尺寸标注                   │
├─────────────────────────────────────────┤
│        React DOM 渲染层（内容预览）       │
│  - Schema → React 组件树                 │  ← 真实 DOM 渲染
│  - 直接使用 CSS 样式                     │     所见即所得
│  - 状态切换实时预览                      │     浏览器原生布局
│  - 组件实例渲染（从资产库实例化）         │
└─────────────────────────────────────────┘
     ↕ 通过坐标映射关联（getBoundingClientRect → Canvas 坐标）
```

---

## 核心模块

```typescript
// ===== 1. React DOM 内容渲染器 =====
// 将 Schema 递归渲染为真实 React 组件树
function SchemaRenderer(props: {
  screen: Screen;
  viewport: Viewport;          // 当前视口，决定画布宽高
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}): React.ReactElement;

// ===== 2. Canvas 编辑覆盖层 =====
// 透明覆盖在 DOM 层之上，处理所有编辑交互
function EditorOverlay(props: {
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  showAlignmentGuides: boolean;
  onSelect: (nodeId: string) => void;
  onDrag: (nodeId: string, deltaX: number, deltaY: number) => void;
  onResize: (nodeId: string, newWidth: number, newHeight: number) => void;
}): React.ReactElement;  // 内部使用 <canvas> 元素

// ===== 3. 原子元素渲染器 =====
// 将 Schema 中的原子元素（div, span, button...）渲染为真实 HTML 元素
interface PrimitiveRenderer {
  type: string;  // "div" | "button" | "img" | ...
  render(node: ComponentNode, children: React.ReactNode[]): React.ReactElement;
}

// ===== 4. 组件实例渲染器 =====
// 将 "component:LoginForm" 类型的节点，找到对应 template 并渲染
function resolveComponentInstance(
  node: ComponentNode,
  assets: ComponentTemplate[]
): ComponentNode;  // 展开为完整的子树

// ===== 5. 样式引擎 =====
function resolveStyles(node: ComponentNode): React.CSSProperties;

// ===== 6. 状态引擎 =====
function resolveActiveState(node: ComponentNode): {
  styles: CSSProperties;
  props: Record<string, any>;
};

// ===== 7. 视口适配 =====
// 根据当前视口调整画布容器大小，内容按比例缩放
function ViewportContainer(props: {
  viewport: Viewport;
  children: React.ReactNode;
}): React.ReactElement;
```

---

## 为什么选 ui-sdk 模板？

- 这个包需要引入 React 来渲染 DOM 层
- ui-sdk 模板自带 React + Vite + Tailwind 配置
- 同时支持作为库导出（给 design_front 使用）和独立 dev 调试
