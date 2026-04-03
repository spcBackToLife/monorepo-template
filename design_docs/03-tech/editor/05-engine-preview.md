# 05 - Design-Engine Preview Mode

> design-engine 预览模式技术设计

---

## 1. 第一性原理 / First Principle

Preview mode answers one question: **"Does my design actually work?"**

It bridges **design-time** and **runtime** by:

- Executing real event bindings (click, hover, etc.)
- Applying CSS pseudo states (:hover, :active, :focus) natively
- Simulating page navigation with transition animations

Preview 模式在编辑态和运行态之间架起桥梁，让设计师能够验证交互逻辑是否正确。

---

## 2. 来自产品需求 / Product Requirements

| PRD | 关联内容 |
|-----|---------|
| `09-interaction-binding` | Event execution — 事件绑定与执行 |
| `10-preview-mode` | Preview renderer, navigation stack — 预览渲染器、导航栈 |

---

## 3. PreviewRenderer

Preview renderer 与编辑模式的核心区别：

| 维度 | Edit Mode | Preview Mode |
|------|-----------|-------------|
| `pointer-events` | Intercepted by EditorOverlay | `auto` — 事件直达真实 DOM |
| Overlay | EditorOverlay (selection, hover, resize handles) | **None** — 无编辑覆盖层 |
| Background | Light/grid | Deep gray `#2C2C2C` — 沉浸式感受 |
| Viewport | Canvas with infinite scroll | Centered with optional device frame |

**渲染流程 / Rendering Flow:**

1. 接收当前 Schema tree
2. 递归渲染所有节点，`pointer-events: auto`
3. 不渲染 EditorOverlay、selection handles、hover outlines、resize handles
4. 深灰背景 (`#2C2C2C`) 营造沉浸式预览体验
5. Viewport 居中显示，可选设备外框（iPhone / Android / Desktop）

---

## 4. EventExecutionEngine

事件执行引擎 — 将 Schema 中的事件绑定转换为真实 DOM 事件监听。

```typescript
class EventExecutionEngine {
  private listenerMap: Map<string, Function[]>;

  /**
   * 绑定事件 — Bind real DOM event listeners for each node's events
   */
  bind(rootNode: ComponentNode, context: PreviewContext): void;

  /**
   * 解绑所有事件 — Unbind all listeners (cleanup)
   */
  unbind(): void;

  /**
   * 执行单个 action — Execute a specific action
   */
  executeAction(action: EventActionV2, context: PreviewContext): void;
}

interface PreviewContext {
  /** 当前屏幕 ID / Current screen */
  currentScreenId: string;

  /** 全局状态 / Global state map */
  globalStates: Record<string, string>;

  /** 导航历史栈 / Navigation history */
  navigationStack: string[];

  /** 页面跳转回调 */
  onNavigate: (screenId: string, animation?: TransitionAnimation) => void;

  /** 设置节点状态回调 */
  onSetState: (nodeId: string, stateName: string) => void;

  /** 设置全局状态回调 */
  onSetGlobalState: (name: string, value: string) => void;

  /** 切换可见性回调 */
  onToggleVisible: (nodeId: string) => void;
}
```

**支持的 Action 类型 / Supported Action Types:**

| Action | 说明 |
|--------|------|
| `navigate` | 跳转到指定页面，支持过渡动画 |
| `setState` | 设置节点的组件状态（hover、active 等） |
| `setGlobalState` | 设置全局状态变量 |
| `toggleVisible` | 切换节点可见性 |
| `openUrl` | 打开外部链接 |
| `custom` | 用户自定义 action（扩展点） |

引擎遍历 Schema tree，为每个具有 `events` 属性的节点绑定真实 DOM 事件监听器。当事件触发时，按顺序执行 action 列表。

---

## 5. CSSPseudoInjector

CSS 伪类注入器 — 将交互状态转换为原生 CSS 伪类规则。

```typescript
class CSSPseudoInjector {
  private styleElement: HTMLStyleElement;

  /**
   * 注入伪类样式 — Convert interaction states to CSS pseudo-class rules
   * Injects a <style> element into the document head
   */
  inject(node: ComponentNode, states: ComponentState[]): void;

  /**
   * 清除所有注入的样式 — Remove injected <style> element
   */
  clear(): void;
}
```

**状态映射 / State-to-Pseudo Mapping:**

| Interaction State | CSS Pseudo-Class | 说明 |
|-------------------|-----------------|------|
| `hover` | `:hover` | 鼠标悬停效果 |
| `pressed` | `:active` | 按下效果 |
| `focus` | `:focus` | 聚焦效果 |

**工作原理：**

1. 遍历节点的 `states` 数组
2. 将 hover / pressed / focus 状态的样式差异提取为 CSS 规则
3. 以 `[data-node-id="xxx"]:hover { ... }` 格式注入 `<style>` 元素
4. 浏览器原生处理伪类匹配，hover 效果无需 JS 介入

This makes hover/active/focus effects work **natively** via the browser's built-in pseudo-class matching — zero JavaScript overhead for interaction feedback.

---

## 6. NavigationStack

页面跳转历史管理 / Page navigation history management.

**核心能力：**

- **Push** — 跳转到新页面，压入历史栈
- **Pop (Back)** — 返回上一页
- **Replace** — 替换当前页面（不增加历史记录）
- **Reset** — 清空历史栈，回到初始页面

**过渡动画 / Transition Animations (6 types, 300ms duration):**

| Animation | 说明 |
|-----------|------|
| `slideLeft` | 从右向左滑入（默认前进） |
| `slideRight` | 从左向右滑入（默认后退） |
| `slideUp` | 从下向上滑入 |
| `slideDown` | 从上向下滑入 |
| `fade` | 淡入淡出 |
| `none` | 无动画，直接切换 |

All transitions use `300ms` duration with `ease-out` timing function.

---

## 7. 影响的文件路径 / Affected File Paths

```
features/design-engine/src/
├── preview/
│   ├── PreviewRenderer.tsx      ← 🆕 预览渲染器
│   ├── EventExecutionEngine.ts  ← 🆕 事件执行引擎
│   ├── CSSPseudoInjector.ts     ← 🆕 CSS 伪类注入器
│   └── NavigationStack.ts       ← 🆕 导航栈管理
```

---

## 8. 依赖关系 / Dependencies

- **依赖 (Depends on):** `03-engine-rendering` — 复用 Schema 渲染管线
- **被依赖 (Depended by):** `07-frontend-canvas` — Canvas 中的预览入口

---

## 9. MVP vs 后期 / Phasing

| Phase | 内容 |
|-------|------|
| **Phase 4** | PreviewRenderer, EventExecutionEngine, CSSPseudoInjector, NavigationStack — 完整预览能力 |
| **Phase 6** | Programmatic test API — 可编程测试接口，支持自动化 UI 测试 |

---

## 10. 技术决策 / Decision Record

### Real DOM Events vs Synthetic Events

**Decision: Real DOM events**

| 方案 | 优点 | 缺点 |
|------|------|------|
| Real DOM events | Authentic behavior, CSS pseudo-classes work natively, no event simulation bugs | Must carefully bind/unbind, memory management |
| Synthetic events | Full control, easier to test | Behavior may differ from real browser, :hover won't work natively |

**理由：** Preview 的核心价值是 "authentic behavior"。使用真实 DOM 事件能确保预览行为与最终产物一致，CSS 伪类无需额外模拟。Real DOM events provide the most authentic preview experience — what you see is what you ship.
