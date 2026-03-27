# design-schema — UI Schema 协议

> **包名：** `@globallink/design-schema` · **模板：** `features/lib-sdk` · **运行环境：** browser
>
> **核心理念：用 CSS 的语言描述样式，用组件树描述结构，用事件描述交互，用资产描述复用。**
>
> 相关文档：[整体架构](./architecture.md) | [design-engine](./design-engine.md) | [design-operations](./design-operations.md) | [design-codegen](./design-codegen.md)

---

## 类型定义

```typescript
// ===== 节点类型 =====
// type 分为两类：原子元素（HTML 标签）和组件实例（来自资产库）
type NodeType =
  // 原子元素 — 直接映射 HTML 标签
  | "div" | "span" | "p" | "h1" | "h2" | "h3"
  | "button" | "input" | "textarea" | "select"
  | "img" | "a" | "ul" | "ol" | "li"
  | "nav" | "header" | "footer" | "section" | "main"
  // 组件实例 — 引用资产库中的模板
  | `component:${string}`;  // e.g. "component:LoginForm", "component:NavBar"

interface ComponentNode {
  id: string;
  type: NodeType;
  name?: string;                // 设计师给的名字
  styles: CSSProperties;       // 直接用 CSS 属性，不发明新语法
  children?: ComponentNode[];   // 子节点
  props: Record<string, any>;   // 元素属性（如 img 的 src、input 的 placeholder）
  states: ComponentState[];     // 组件状态集
  activeState: string;          // 当前激活状态
  events: ComponentEvent[];     // 绑定的事件
  constraints?: LayoutConstraints; // 布局约束
  // 如果是组件实例，记录来源
  templateRef?: {
    templateId: string;         // 引用的 ComponentTemplate.id
    mode: "reference" | "detached"; // 引用模式（同步更新）或 脱离模式（独立修改）
  };
}

// ===== 组件状态 =====
interface ComponentState {
  name: string;                 // "default" | "hover" | "pressed" | "disabled" | 自定义
  styles: Partial<CSSProperties>; // 该状态下的样式覆盖
  props?: Partial<Record<string, any>>; // 该状态下的属性覆盖
}

// ===== 事件/交互 =====
interface ComponentEvent {
  trigger: "click" | "hover" | "focus" | "blur" | "longPress";
  action: EventAction;
}

type EventAction =
  | { type: "navigate"; targetScreenId: string; animation?: TransitionAnimation }
  | { type: "setState"; targetId: string; state: string }
  | { type: "openUrl"; url: string }
  | { type: "custom"; handler: string };

// ===== 组件资产模板 =====
interface ComponentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;             // "表单" | "导航" | "卡片" | "布局" | ...
  tags: string[];
  thumbnail?: string;           // 缩略图 base64/url
  schema: ComponentNode;        // 组件的 Schema 片段（子树）
  scope: "project" | "team" | "global";
  createdAt: string;
  updatedAt: string;
}

// ===== 视口预设 =====
interface Viewport {
  name: string;                 // "iPhone 15 Pro"
  width: number;
  height: number;
  devicePixelRatio?: number;
  platform: "pc" | "mobile" | "tablet";
}

// ===== 屏幕 =====
interface Screen {
  id: string;
  name: string;
  rootNode: ComponentNode;
  backgroundColor?: string;
}

// ===== 设计项目 =====
interface DesignProject {
  id: string;
  name: string;
  platform: "pc" | "mobile";
  defaultViewport: Viewport;              // 初始选择的视口
  currentViewport: Viewport;              // 当前正在预览的视口（可切换）
  viewportPresets: Viewport[];            // 快速切换列表
  screens: Screen[];
  componentAssets: ComponentTemplate[];   // 项目级组件资产
  createdAt: string;
  updatedAt: string;
}
```

---

## 导出内容

本包导出以下内容：

- **TypeScript 类型定义** — 上述所有 interface（`NodeType`, `ComponentNode`, `ComponentState`, `ComponentEvent`, `EventAction`, `ComponentTemplate`, `Viewport`, `Screen`, `DesignProject`）
- **Schema 校验函数** — `validateProject()`, `validateNode()`
- **原子元素注册表** — 所有支持的 HTML 标签及其默认属性/样式
- **组件资产管理工具** — `saveAsTemplate()`, `instantiateTemplate()`, `detachInstance()`
- **序列化/反序列化工具** — JSON ↔ Schema 对象
- **内置视口预设库** — iPhone 系列、Android 系列、iPad、PC 分辨率等 20+ 种
