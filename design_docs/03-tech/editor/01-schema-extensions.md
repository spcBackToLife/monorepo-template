# Schema 扩展 — design-schema 包的编辑器类型增补

> **包名：** `@globallink/design-schema` · **路径：** `features/design-schema` · **运行环境：** browser + node
>
> **核心理念：Schema 是最底层——所有编辑器功能的数据形状都从这里定义，其他模块只消费不修改。**
>
> 相关文档：[design-schema 基础](../design-schema.md) | [编辑器技术总纲](./README.md) | [Operations 扩展](./02-operations-extensions.md) | [渲染管线](./03-engine-rendering.md)
>
> 产品来源：[04-状态系统](../../02-product/editor/04-state-system/README.md) | [05-数据驱动](../../02-product/editor/05-data-driven/README.md) | [06-组件 Props](../../02-product/editor/06-component-props/README.md) | [07-资产管理](../../02-product/editor/07-asset-management/README.md) | [08-组件树](../../02-product/editor/08-layer-tree/README.md) | [09-交互事件](../../02-product/editor/09-interaction-bindding/README.md) | [11-协作同步](../../02-product/editor/11-collaboration/README.md)

---

## 1. 第一性原理 / First Principle

编辑器的每一个功能最终都会体现为**数据的变化**。在我们的架构中，数据形状由 `design-schema` 定义，修改路径由 `design-operations` 执行。因此本文档解决的根本问题是：

> **"为了支撑编辑器全部产品功能，我们需要哪些新的数据形状（类型、字段、校验器、注册表）？"**

Schema 是依赖链的最底层——零依赖、纯类型定义。所有其他模块（Operations、Engine、Frontend、Backend、MCP）都依赖它，但它不依赖任何人。任何新功能的开发都从这里开始：先定义类型，再定义操作，再实现 UI。

---

## 2. 来自产品子系统的需求映射 / Requirements Mapping

| 产品子系统 | 需要的新类型 / 字段 | 优先级 |
|-----------|---------------------|--------|
| **04-状态系统** | `GlobalStateVariable`、`GlobalStateBinding`、ComponentNode `visible` 字段、Screen `globalStates` | Phase 2-3 |
| **05-数据驱动** | `DataSet`、Screen `dataSets[]`、Screen `activeDataSetId` | Phase 3 |
| **06-组件 Props** | `ComponentPropDefinition`、`PropBinding`、`PropType`、ComponentTemplate `propDefinitions` / `propBindings` | Phase 2 |
| **07-资产管理** | ComponentTemplate `kind`（skeleton / styled）、ComponentTemplate `version` | Phase 4 |
| **08-组件树** | ComponentNode `locked`、ComponentNode `visible` | Phase 1 |
| **09-交互事件** | `ComponentEventV2`、`EventActionV2`（SetGlobalState、ToggleVisible）、`EventCondition` | Phase 4 |
| **11-协作同步** | `OperationEnvelope`（fingerprint、author、seq） | Phase 5 |

> **原则：** 已有类型能扩展字段的就扩展，不重新定义；需要向后兼容的新建 V2 类型。

---

## 3. ComponentNode 扩展 / ComponentNode Extensions

在现有 `ComponentNode` 接口上新增 3 个字段：

```typescript
interface ComponentNode {
  // ===== 现有字段（不变）=====
  id: string;
  type: NodeType;
  name?: string;
  styles: CSSProperties;
  children?: ComponentNode[];
  props: Record<string, unknown>;
  states: ComponentState[];
  activeState: string;
  events: ComponentEvent[];
  constraints?: LayoutConstraints;
  templateRef?: TemplateRef;

  // ===== 新增字段 =====

  /** 是否锁定（锁定后不可选中 / 拖拽 / 编辑）
   *  来源：08-组件树 — 图层锁定功能 */
  locked: boolean;

  /** 是否可见（控制渲染时 display: none）
   *  来源：04-状态系统 — 条件可见性；08-组件树 — 图层可见性切换 */
  visible: boolean;

  /** 全局状态绑定列表（当全局状态匹配时覆盖样式 / 属性 / 可见性）
   *  来源：04-状态系统 — 三层状态叠加中的"全局状态层" */
  globalStateBindings: GlobalStateBinding[];
}
```

**默认值：**
- `locked` → `false`
- `visible` → `true`
- `globalStateBindings` → `[]`

> **兼容性说明：** 旧数据缺少这 3 个字段时，校验器和运行时应用默认值补全。

---

## 4. Screen 扩展 / Screen Extensions

在现有 `Screen` 接口上新增 3 个字段：

```typescript
interface Screen {
  // ===== 现有字段（不变）=====
  id: string;
  name: string;
  rootNode: ComponentNode;
  backgroundColor?: string;

  // ===== 新增字段 =====

  /** 当前屏幕的 Mock 数据集列表
   *  来源：05-数据驱动 — 数据集管理 */
  dataSets: DataSet[];

  /** 当前激活的数据集 ID（对应 dataSets 中某一项的 id）
   *  来源：05-数据驱动 — 数据集切换 */
  activeDataSetId: string;

  /** 屏幕级全局状态变量定义
   *  来源：04-状态系统 — 全局状态层 */
  globalStates: GlobalStateVariable[];
}
```

**默认值：**
- `dataSets` → `[]`
- `activeDataSetId` → `''`
- `globalStates` → `[]`

---

## 5. ComponentTemplate 扩展 / ComponentTemplate Extensions

在现有 `ComponentTemplate` 接口上新增 4 个字段：

```typescript
interface ComponentTemplate {
  // ===== 现有字段（不变）=====
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  schema: ComponentNode;
  scope: TemplateScope;
  createdAt: string;
  updatedAt: string;

  // ===== 新增字段 =====

  /** 资产类型：skeleton（无样式骨架）或 styled（带样式完整组件）
   *  来源：07-资产管理 — 两层资产模型 */
  kind: 'skeleton' | 'styled';

  /** 组件对外暴露的属性定义列表
   *  来源：06-组件 Props — 标准化组件 Props 接口 */
  propDefinitions: ComponentPropDefinition[];

  /** 属性绑定映射：propKey → 内部节点的某个字段
   *  来源：06-组件 Props — 属性绑定机制 */
  propBindings: PropBinding[];

  /** 模板版本号（每次保存递增）
   *  来源：07-资产管理 — 模板版本管理 */
  version: number;
}
```

**默认值：**
- `kind` → `'styled'`
- `propDefinitions` → `[]`
- `propBindings` → `[]`
- `version` → `1`

---

## 6. 新增类型定义 / New Type Definitions

### 6.1 GlobalStateVariable — 全局状态变量

来源：04-状态系统

```typescript
/** 屏幕级全局状态变量，定义可选值枚举 */
interface GlobalStateVariable {
  /** 变量名（唯一标识，如 "theme"、"language"） */
  name: string;
  /** 可选值列表，如 ["light", "dark"] */
  values: string[];
  /** 默认值（必须存在于 values 中） */
  defaultValue: string;
  /** 可选描述 */
  description?: string;
}
```

### 6.2 GlobalStateBinding — 全局状态绑定

来源：04-状态系统

```typescript
/** 节点对全局状态变量的绑定：当变量等于指定值时，覆盖样式 / 属性 / 可见性 */
interface GlobalStateBinding {
  /** 绑定唯一 ID */
  id: string;
  /** 绑定的全局状态变量名（对应 GlobalStateVariable.name） */
  variableName: string;
  /** 匹配值（对应 GlobalStateVariable.values 中的某一项） */
  value: string;
  /** 匹配时覆盖的样式 */
  styles?: Partial<CSSProperties>;
  /** 匹配时覆盖的属性 */
  props?: Record<string, unknown>;
  /** 匹配时是否可见（优先级高于 ComponentNode.visible） */
  visible?: boolean;
}
```

### 6.3 DataSet — 数据集

来源：05-数据驱动

```typescript
/** Mock 数据集，用于数据驱动渲染和截图矩阵 */
interface DataSet {
  /** 数据集唯一 ID */
  id: string;
  /** 数据集名称（如 "默认数据"、"空状态"、"满数据"） */
  name: string;
  /** 数据内容（扁平或嵌套 JSON，键名用于表达式绑定） */
  data: Record<string, unknown>;
  /** 可选描述 */
  description?: string;
}
```

### 6.4 ComponentPropDefinition & PropType — 组件属性定义

来源：06-组件 Props

```typescript
/** 组件属性类型枚举 */
type PropType =
  | 'string'    // 单行文本
  | 'number'    // 数字
  | 'boolean'   // 开关
  | 'enum'      // 下拉选择（配合 enumValues）
  | 'color'     // 颜色选择器
  | 'image'     // 图片上传 / URL
  | 'url'       // URL 输入
  | 'action'    // 事件绑定
  | 'textarea'  // 多行文本
  | 'options';  // 选项列表（如 select 的 option）

/** 组件对外暴露的单个属性定义 */
interface ComponentPropDefinition {
  /** 属性键名（唯一） */
  key: string;
  /** 属性类型 */
  type: PropType;
  /** 属性显示名称 */
  label: string;
  /** 默认值 */
  defaultValue: unknown;
  /** 分组名（用于面板分组显示，如 "基础"、"高级"） */
  group?: string;
  /** 属性描述 */
  description?: string;
  /** 当 type 为 'enum' 时的可选值列表 */
  enumValues?: string[];
  /** 是否必填 */
  required?: boolean;
}
```

### 6.5 PropBinding — 属性绑定

来源：06-组件 Props

```typescript
/** 将组件外部属性映射到内部节点的某个字段 */
interface PropBinding {
  /** 对应 ComponentPropDefinition.key */
  propKey: string;
  /** 目标节点路径（从组件根到目标节点的 id 路径，如 "root.header.title"） */
  targetNodePath: string;
  /** 目标字段类别 */
  targetField: 'props' | 'styles' | 'children';
  /** 目标字段的具体 key（如 targetField='styles' 时 targetKey='color'） */
  targetKey: string;
}
```

### 6.6 ComponentEventV2 — 扩展事件类型

来源：09-交互事件、04-状态系统

> **为什么新建 V2 而不是修改 ComponentEvent？** 现有 `ComponentEvent` 只支持单个 action，V2 支持 action 数组和条件表达式。为了向后兼容旧数据，保留原类型，新增 V2。

```typescript
/** 扩展事件：支持多 action + 条件 */
interface ComponentEventV2 {
  /** 触发方式（复用现有 EventTrigger） */
  trigger: EventTrigger;
  /** 动作列表（按顺序执行） */
  actions: EventActionV2[];
  /** 可选执行条件（条件不满足时跳过） */
  condition?: EventCondition;
}

/** 扩展动作类型：在原有基础上新增 setGlobalState 和 toggleVisible */
type EventActionV2 =
  | NavigateAction
  | SetStateAction
  | OpenUrlAction
  | CustomAction
  | SetGlobalStateAction
  | ToggleVisibleAction;

/** 设置全局状态变量 */
interface SetGlobalStateAction {
  type: 'setGlobalState';
  /** 目标全局状态变量名 */
  variableName: string;
  /** 要设置的值 */
  value: string;
}

/** 切换目标节点可见性 */
interface ToggleVisibleAction {
  type: 'toggleVisible';
  /** 目标节点 ID */
  targetId: string;
}

/** 事件执行条件 */
interface EventCondition {
  /** 条件类型（目前仅支持全局状态匹配） */
  type: 'globalState';
  /** 全局状态变量名 */
  variableName: string;
  /** 匹配值 */
  value: string;
}
```

### 6.7 OperationEnvelope — 操作信封

来源：11-协作同步

```typescript
/** 操作信封：为每个 Operation 附加同步元数据 */
interface OperationEnvelope {
  /** 信封唯一 ID */
  id: string;
  /** 客户端指纹（用于回声去重） */
  fingerprint: string;
  /** 包裹的操作 */
  operation: Operation;
  /** 操作来源：用户手动操作 或 AI 操作 */
  author: 'user' | 'ai';
  /** 操作者 ID（用户 ID 或 AI session ID） */
  authorId?: string;
  /** 服务端递增序列号（客户端发送时为空，服务端写入） */
  seq?: number;
  /** ISO 8601 时间戳 */
  timestamp: string;
}
```

### 6.8 NodeType 扩展 — 新增 annotation

```typescript
/** 扩展后的原子元素类型，新增 annotation 用于设计标注 */
type PrimitiveNodeType =
  | 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3'
  | 'button' | 'input' | 'textarea' | 'select'
  | 'img' | 'a' | 'ul' | 'ol' | 'li'
  | 'nav' | 'header' | 'footer' | 'section' | 'main'
  | 'annotation';  // 🆕 设计标注节点，仅在编辑模式下可见，预览和代码生成时忽略

type ComponentInstanceType = `component:${string}`;
type NodeType = PrimitiveNodeType | ComponentInstanceType;
```

> **annotation 节点特性：**
> - 不参与预览模式渲染
> - 不参与代码生成
> - 可包含文本内容和箭头指向
> - 用于设计稿交付时的标注说明

---

## 7. HTML 元素属性注册表 / Element Prop Registry

每种 `PrimitiveNodeType` 都有其固有的 HTML 属性。为了让属性面板能根据节点类型动态渲染正确的属性编辑器，我们需要一个静态注册表。

### 7.1 类型定义

```typescript
/** 单个元素属性定义（复用 PropType） */
interface ElementPropDefinition {
  /** 属性键名 */
  key: string;
  /** 属性类型 */
  type: PropType;
  /** 显示名称 */
  label: string;
  /** 默认值 */
  defaultValue: unknown;
  /** 属性描述 */
  description?: string;
  /** 当 type 为 'enum' 时的可选值列表 */
  enumValues?: string[];
}

/** 注册表：每种原子元素类型 → 其属性定义列表 */
type ElementPropRegistry = Record<PrimitiveNodeType, ElementPropDefinition[]>;
```

### 7.2 注册表示例（关键元素）

```typescript
const elementPropRegistry: ElementPropRegistry = {
  // ... 其他元素省略

  img: [
    { key: 'src',    type: 'image',   label: '图片地址',   defaultValue: '',    description: '图片 URL 或 base64' },
    { key: 'alt',    type: 'string',  label: '替代文本',   defaultValue: '',    description: '图片无法显示时的替代文本' },
  ],

  a: [
    { key: 'href',   type: 'url',     label: '链接地址',   defaultValue: '#',   description: '超链接 URL' },
    { key: 'target', type: 'enum',    label: '打开方式',   defaultValue: '_self', enumValues: ['_self', '_blank', '_parent', '_top'] },
  ],

  input: [
    { key: 'placeholder', type: 'string',  label: '占位文本',   defaultValue: '',      description: '输入框占位提示' },
    { key: 'type',        type: 'enum',    label: '输入类型',   defaultValue: 'text',  enumValues: ['text', 'password', 'email', 'number', 'tel', 'url', 'search', 'date'] },
    { key: 'disabled',    type: 'boolean', label: '禁用',       defaultValue: false,   description: '是否禁用输入' },
  ],

  button: [
    { key: 'disabled', type: 'boolean', label: '禁用', defaultValue: false, description: '是否禁用按钮' },
  ],

  select: [
    { key: 'options', type: 'options', label: '选项列表', defaultValue: [], description: '下拉选项（label + value 对）' },
  ],

  // annotation 无 HTML 属性，但有自定义属性
  annotation: [
    { key: 'text',      type: 'textarea', label: '标注内容',   defaultValue: '',  description: '标注说明文字' },
    { key: 'pointTo',   type: 'string',   label: '指向节点 ID', defaultValue: '',  description: '箭头指向的目标节点' },
  ],

  // 以下元素默认无特殊属性（继承通用属性）
  div: [], span: [], p: [], h1: [], h2: [], h3: [],
  ul: [], ol: [], li: [],
  nav: [], header: [], footer: [], section: [], main: [],
  textarea: [
    { key: 'placeholder', type: 'string',  label: '占位文本', defaultValue: '', description: '多行输入占位提示' },
    { key: 'disabled',    type: 'boolean', label: '禁用',     defaultValue: false },
  ],
};
```

> **设计决策：** 将注册表定义为静态数据而非运行时查询，原因：
> 1. 元素属性是有限集，不会动态变化
> 2. 静态数据可 Tree-shake，不增加包体积
> 3. 属性面板直接 lookup，O(1) 复杂度

---

## 8. Zod 校验器 / Zod Validators

所有新增类型都需要对应的 Zod schema，用于运行时校验（API 入参、WebSocket 消息、MCP 工具参数）。

### 8.1 状态相关校验器

```typescript
import { z } from 'zod';

// GlobalStateVariable
const globalStateVariableSchema = z.object({
  name: z.string().min(1, '变量名不能为空'),
  values: z.array(z.string()).min(1, '至少需要一个可选值'),
  defaultValue: z.string(),
  description: z.string().optional(),
}).refine(
  (data) => data.values.includes(data.defaultValue),
  { message: 'defaultValue 必须存在于 values 列表中' }
);

// GlobalStateBinding
const globalStateBindingSchema = z.object({
  id: z.string().min(1),
  variableName: z.string().min(1),
  value: z.string(),
  styles: z.record(z.unknown()).optional(),
  props: z.record(z.unknown()).optional(),
  visible: z.boolean().optional(),
});
```

### 8.2 数据相关校验器

```typescript
// DataSet
const dataSetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, '数据集名称不能为空'),
  data: z.record(z.unknown()),
  description: z.string().optional(),
});
```

### 8.3 属性相关校验器

```typescript
// PropType
const propTypeSchema = z.enum([
  'string', 'number', 'boolean', 'enum', 'color',
  'image', 'url', 'action', 'textarea', 'options',
]);

// ComponentPropDefinition
const componentPropDefinitionSchema = z.object({
  key: z.string().min(1),
  type: propTypeSchema,
  label: z.string().min(1),
  defaultValue: z.unknown(),
  group: z.string().optional(),
  description: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
  required: z.boolean().optional(),
}).refine(
  (data) => data.type !== 'enum' || (data.enumValues && data.enumValues.length > 0),
  { message: 'type 为 enum 时必须提供 enumValues' }
);

// PropBinding
const propBindingSchema = z.object({
  propKey: z.string().min(1),
  targetNodePath: z.string().min(1),
  targetField: z.enum(['props', 'styles', 'children']),
  targetKey: z.string().min(1),
});
```

### 8.4 事件相关校验器

```typescript
// SetGlobalStateAction
const setGlobalStateActionSchema = z.object({
  type: z.literal('setGlobalState'),
  variableName: z.string().min(1),
  value: z.string(),
});

// ToggleVisibleAction
const toggleVisibleActionSchema = z.object({
  type: z.literal('toggleVisible'),
  targetId: z.string().min(1),
});

// EventCondition
const eventConditionSchema = z.object({
  type: z.literal('globalState'),
  variableName: z.string().min(1),
  value: z.string(),
});

// EventActionV2（联合已有 action schemas）
const eventActionV2Schema = z.discriminatedUnion('type', [
  navigateActionSchema,        // 已有
  setStateActionSchema,        // 已有
  openUrlActionSchema,         // 已有
  customActionSchema,          // 已有
  setGlobalStateActionSchema,  // 新增
  toggleVisibleActionSchema,   // 新增
]);

// ComponentEventV2
const componentEventV2Schema = z.object({
  trigger: eventTriggerSchema,  // 已有
  actions: z.array(eventActionV2Schema).min(1, '至少需要一个动作'),
  condition: eventConditionSchema.optional(),
});
```

### 8.5 同步相关校验器

```typescript
// OperationEnvelope
const operationEnvelopeSchema = z.object({
  id: z.string().min(1),
  fingerprint: z.string().min(1),
  operation: operationSchema,  // 已有
  author: z.enum(['user', 'ai']),
  authorId: z.string().optional(),
  seq: z.number().int().positive().optional(),
  timestamp: z.string().datetime(),
});
```

---

## 9. 新增文件路径 / New File Paths

```
features/design-schema/src/
├── types/
│   ├── node.ts              ← 扩展 ComponentNode（+locked, +visible, +globalStateBindings）
│   │                           扩展 PrimitiveNodeType（+'annotation'）
│   ├── screen.ts            ← 扩展 Screen（+dataSets, +activeDataSetId, +globalStates）
│   ├── template.ts          ← 扩展 ComponentTemplate（+kind, +propDefinitions, +propBindings, +version）
│   ├── state.ts             ← 新增 GlobalStateVariable, GlobalStateBinding
│   ├── event.ts             ← 新增 ComponentEventV2, EventActionV2, SetGlobalStateAction,
│   │                           ToggleVisibleAction, EventCondition
│   ├── data.ts              ← 🆕 DataSet
│   ├── props.ts             ← 🆕 ComponentPropDefinition, PropBinding, PropType
│   ├── envelope.ts          ← 🆕 OperationEnvelope
│   └── index.ts             ← 更新 re-exports（新增类型全部从此导出）
├── registry/
│   ├── primitives.ts        ← 已有（原子元素默认样式注册表）
│   └── element-props.ts     ← 🆕 ElementPropRegistry 及 elementPropRegistry 实例
└── validators/
    ├── index.ts             ← 已有，扩展导出新增 schemas
    ├── data.ts              ← 🆕 dataSetSchema
    ├── props.ts             ← 🆕 componentPropDefinitionSchema, propBindingSchema, propTypeSchema
    └── envelope.ts          ← 🆕 operationEnvelopeSchema
```

> **命名约定：**
> - 类型文件放 `types/`，导出 interface / type
> - 注册表文件放 `registry/`，导出 const 数据
> - 校验器文件放 `validators/`，导出 zod schema
> - 所有新增导出都通过 `types/index.ts` 和 `validators/index.ts` 统一 re-export

---

## 10. 与其他模块的依赖关系 / Dependency Map

```
         ┌──────────────────────────┐
         │     design-schema        │  ← 本文档范围
         │   （零外部依赖）           │
         └──────────┬───────────────┘
                    │
      ┌─────────────┼─────────────────────────────┐
      │             │             │                │
      ▼             ▼             ▼                ▼
design-ops    design-engine  design-codegen   design-api
(02-ops)      (03/04/05)     (Phase 5)        (09-backend)
      │             │                              │
      └──────┬──────┘                              │
             ▼                                     ▼
        design_front                          design-mcp
        (06/07/08)                            (10-mcp)
```

- **依赖方向：** `design-schema` → 无（最底层）
- **被依赖者：** 所有其他 6 个包都直接或间接依赖 `design-schema`
- **import 规则：** 其他包只 `import type { ... } from '@globallink/design-schema'`，不 import 实现

---

## 11. MVP vs 后期分期 / Phased Delivery

| Phase | 新增内容 | 解锁的产品功能 |
|-------|---------|---------------|
| **Phase 1 — 基础编辑** | `locked: boolean`、`visible: boolean`、`PrimitiveNodeType + 'annotation'` | 图层锁定 / 隐藏、设计标注 |
| **Phase 2 — 状态 + 属性** | `GlobalStateVariable`、`GlobalStateBinding`、`ComponentPropDefinition`、`PropBinding`、`PropType`、`ElementPropRegistry` | 三层状态系统、组件 Props 编辑、元素属性面板 |
| **Phase 3 — 数据驱动** | `DataSet`、Screen `dataSets` / `activeDataSetId` / `globalStates` | 数据集管理、数据绑定、截图矩阵 |
| **Phase 4 — 高级编辑** | `ComponentEventV2`、`EventActionV2`、`EventCondition`、ComponentTemplate `kind` / `version` | 交互事件绑定、资产两层模型、模板版本管理 |
| **Phase 5 — 协作** | `OperationEnvelope` | 实时同步、回声去重、操作溯源 |

> **原则：** 每个 Phase 的类型在该 Phase 开始前合入 main，确保 Operations 和 UI 可以并行开发。

---

## 12. 核心技术决策 / Key Technical Decisions

### Decision 1：扩展现有接口 vs 新建接口

| 方案 | 优点 | 缺点 |
|------|------|------|
| **扩展现有接口（选定）** | 不影响已有代码、渐进式迁移、单一数据模型 | 接口越来越大 |
| 新建平行接口 | 类型隔离清晰 | 需要转换层、容易不同步 |

**结论：** 对 `ComponentNode`、`Screen`、`ComponentTemplate` 采用字段扩展，保持单一数据模型。新增字段提供默认值，旧数据自动补全。

### Decision 2：ComponentEventV2 vs 修改 ComponentEvent

| 方案 | 优点 | 缺点 |
|------|------|------|
| **新建 ComponentEventV2（选定）** | 向后兼容、渐进迁移 | 两套类型共存 |
| 修改 ComponentEvent | 只有一套类型 | Breaking change、旧数据失效 |

**结论：** 新建 V2 类型。ComponentNode 的 `events` 字段保持 `ComponentEvent[]` 不变，新增 `eventsV2?: ComponentEventV2[]` 字段。运行时优先读取 `eventsV2`，fallback 到 `events`。待全量迁移后移除旧字段。

### Decision 3：ElementPropRegistry 作为静态数据

| 方案 | 优点 | 缺点 |
|------|------|------|
| **静态 const 对象（选定）** | 零运行时开销、可 Tree-shake、类型安全 | 新增元素需改代码 |
| 运行时注册 API | 可扩展 | 额外复杂度、难以 Tree-shake |

**结论：** HTML 原子元素是有限集（当前 20 + annotation = 21 种），不需要运行时扩展能力。静态数据足够，简单即正义。

---

## 附录 A：类型汇总清单 / Type Summary

| 类型名 | 文件 | 新增 / 扩展 | Phase |
|--------|------|-------------|-------|
| `ComponentNode` | `types/node.ts` | 扩展 +3 字段 | 1-2 |
| `PrimitiveNodeType` | `types/node.ts` | 扩展 +annotation | 1 |
| `Screen` | `types/screen.ts` | 扩展 +3 字段 | 3 |
| `ComponentTemplate` | `types/template.ts` | 扩展 +4 字段 | 2-4 |
| `GlobalStateVariable` | `types/state.ts` | 🆕 | 2 |
| `GlobalStateBinding` | `types/state.ts` | 🆕 | 2 |
| `DataSet` | `types/data.ts` | 🆕 | 3 |
| `PropType` | `types/props.ts` | 🆕 | 2 |
| `ComponentPropDefinition` | `types/props.ts` | 🆕 | 2 |
| `PropBinding` | `types/props.ts` | 🆕 | 2 |
| `ComponentEventV2` | `types/event.ts` | 🆕 | 4 |
| `EventActionV2` | `types/event.ts` | 🆕 | 4 |
| `SetGlobalStateAction` | `types/event.ts` | 🆕 | 4 |
| `ToggleVisibleAction` | `types/event.ts` | 🆕 | 4 |
| `EventCondition` | `types/event.ts` | 🆕 | 4 |
| `OperationEnvelope` | `types/envelope.ts` | 🆕 | 5 |
| `ElementPropDefinition` | `registry/element-props.ts` | 🆕 | 2 |
| `ElementPropRegistry` | `registry/element-props.ts` | 🆕 | 2 |
