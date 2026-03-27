# 组件资产体系

> 本文档聚焦 DesignUI 的双层元素体系与组件资产复用机制。
>
> 相关文档：
> - [产品方案概述](./overview.md)
> - [编辑器详细设计](./editor.md)

---

## 设计原则

Figma 的做法是矩形、椭圆、文字等"图形原语"——太底层，没有语义。但如果只有 Button、Card、NavBar 这种高级组件，又不够灵活——有时候就是需要一个纯 div 容器。

**正确答案：分两层，且两层之间可以互相转化。**

---

## 双层元素体系：原子元素 vs 组件资产

```
┌──────────────────────────────────────────────────────────────┐
│                     组件添加面板                               │
│                                                              │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │  原子元素（Primitives）   │  │  组件资产（Component Assets）│ │
│  │                         │  │                            │ │
│  │  📦 div (容器)           │  │  📚 来源：                  │ │
│  │  📝 span (文本)          │  │                            │ │
│  │  🔘 button (按钮)        │  │  [我的组件] ← 当前项目沉淀   │ │
│  │  📷 img (图片)           │  │  [团队组件] ← 团队共享资产   │ │
│  │  📥 input (输入框)       │  │  [官方组件] ← 预置模板库    │ │
│  │  🔗 a (链接)             │  │                            │ │
│  │  📋 ul/ol (列表)         │  │  ┌──────────┐             │ │
│  │  ...                    │  │  │ LoginForm │ ← 之前设计的 │ │
│  │                         │  │  │ NavBar    │   Schema 片段│ │
│  │  这些是最基础的 HTML 元素 │  │  │ UserCard  │   直接复用   │ │
│  │  有完全的样式自由度       │  │  │ ...       │             │ │
│  │                         │  │  └──────────┘             │ │
│  └─────────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 原子元素

- 最基础的 HTML 元素，直接映射 HTML 标签
- 有完全的样式自由度，样式完全由 CSS 控制
- 是最灵活的构建单元

### 组件资产

- 之前设计好的 Schema 片段，作为可复用资产沉淀
- 带有名称、描述、缩略图、分类标签
- 使用时"实例化"到当前 Schema 中

---

## 数据模型

### 原子元素类型映射

```
原子元素：ComponentNode 的 type = "div" | "span" | "img" | "input" | ...
         → 直接映射 HTML 标签
         → 样式完全由 CSS 控制
         → 是最灵活的构建单元
```

完整的原子元素 `NodeType` 定义：

```typescript
type NodeType =
  // 原子元素 — 直接映射 HTML 标签
  | "div" | "span" | "p" | "h1" | "h2" | "h3"
  | "button" | "input" | "textarea" | "select"
  | "img" | "a" | "ul" | "ol" | "li"
  | "nav" | "header" | "footer" | "section" | "main"
  // 组件实例 — 引用资产库中的模板
  | `component:${string}`;  // e.g. "component:LoginForm", "component:NavBar"
```

### ComponentTemplate（组件资产模板）

```
组件资产：ComponentTemplate（一个可复用的 ComponentNode 子树）
         → 本质上就是一段保存好的 Schema 片段
         → 带有名称、描述、缩略图、分类标签
         → 使用时"实例化"到当前 Schema 中
         → 可以选择：引用模式（同步更新）或 副本模式（独立修改）
```

TypeScript 接口定义：

```typescript
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
```

---

## 三级资产来源

组件资产按作用域分为三级：

| 级别 | 来源 | 说明 |
|------|------|------|
| **我的组件** | 当前项目沉淀 | 设计师在当前项目中保存的组件，仅项目内可见 |
| **团队组件** | 团队共享资产 | 团队成员共享的组件库，团队内所有项目可用 |
| **官方组件** | 预置模板库 | 系统内置的通用组件模板，所有用户可用 |

---

## 引用模式 vs 脱离模式

组件实例化后，通过 `templateRef` 记录来源信息，支持两种模式：

```typescript
templateRef?: {
  templateId: string;         // 引用的 ComponentTemplate.id
  mode: "reference" | "detached"; // 引用模式 或 脱离模式
};
```

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| **引用模式（reference）** | 同步更新——当源模板被修改时，所有引用实例自动同步 | 需要全局一致性的组件（如 NavBar、Footer） |
| **脱离模式（detached）** | 独立修改——实例化后与源模板断开关联，自由定制 | 需要基于模板做个性化调整的场景 |

相关操作：

- `instantiateTemplate` — 从资产库实例化组件（默认引用模式）
- `detachInstance` — 从引用模式切换为脱离模式
- `syncInstance` — 重新同步到最新模板

---

## 飞轮效应

> **设计行为本身就在生产可复用的资产。**

```
设计师用原子元素设计了一个 LoginForm
       ↓
保存为组件资产（Schema 片段 + 元信息）
       ↓
下次自己或同事可以直接拖入使用
       ↓
AI 也可以调用："用我们的 LoginForm 组件"
       ↓
越用越快，组件资产库越来越丰富
```

这是一个产品生态的增长飞轮：

1. **设计** — 设计师用原子元素构建 UI
2. **沉淀** — 将设计好的子树保存为组件资产
3. **复用** — 下次设计时直接从资产库拖入，AI 也能直接调用
4. **加速** — 组件资产库越丰富，设计效率越高，进一步激励沉淀

---

## 与编辑器的集成

组件添加面板位于编辑器右侧操作面板中（详见 [编辑器详细设计](./editor.md)），同时展示原子元素列表和组件资产列表，设计师可自由选择添加方式。

AI 通过 MCP Tools 也能操作组件资产：

- `add_element` — 添加原子元素
- `instantiate_template` — 从资产库实例化组件
- `save_as_template` — 将节点子树保存为组件资产
- `get_available_assets` — 列出可用组件资产

> 完整的 MCP Tools 列表及数据模型定义见技术方案文档。
