# 02 — Operations Extensions（操作扩展）

> **Package**: `@design-ui/design-operations`
> **Status**: Draft
> **Last Updated**: 2026-03-28

---

## 1. 第一性原理 / First Principles

本模块回答一个核心问题：**"编辑器还需要哪些新的状态转换？"**

This module answers: **"What new state transitions does the editor need?"**

设计规则 / Design Rules：

1. **每一个用户动作和 AI 动作都必须映射到一个 Operation**——没有"隐式"状态修改。
2. **每一个 Operation 都必须拥有逆操作 (inverse)**——保证完美的 Undo/Redo。
3. **Operation 是 serializable 的纯数据对象**——可持久化、可回放、可通过 MCP 发送。

已有的 23 种 Operations（在 `01-operations` 中定义）：

| # | Operation | # | Operation |
|---|-----------|---|-----------|
| 1 | `addElement` | 13 | `addNavigation` |
| 2 | `removeElement` | 14 | `addScreen` |
| 3 | `moveElement` | 15 | `removeScreen` |
| 4 | `duplicateElement` | 16 | `setActiveScreen` |
| 5 | `renameNode` | 17 | `renameScreen` |
| 6 | `updateStyle` | 18 | `switchViewport` |
| 7 | `resetStyle` | 19 | `addViewportPreset` |
| 8 | `addState` | 20 | `instantiateTemplate` |
| 9 | `removeState` | 21 | `saveAsTemplate` |
| 10 | `updateState` | 22 | `detachInstance` |
| 11 | `setActiveState` | 23 | `syncInstance` |
| 12 | `addEvent` / `removeEvent` | | |

本文档定义 **所有新增的 Operations**，并为每一个提供完整的 TypeScript 接口、描述和逆操作策略。

---

## 2. 来自产品子系统的需求 / Requirements from Product Subsystems

| 产品子系统 | 文档 | 需要的新 Operations |
|---|---|---|
| Canvas 画布 | `01-canvas` | `wrapInContainer`, `unwrapContainer`, `reorderElement`, `batchUpdateStyle`, `changeElementType` |
| State System 状态系统 | `04-state-system` | `setGlobalState`, `addGlobalStateVariable`, `removeGlobalStateVariable`, `addGlobalStateBinding`, `removeGlobalStateBinding`, `updateGlobalStateBinding` |
| Data-Driven 数据驱动 | `05-data-driven` | `addDataSet`, `removeDataSet`, `updateDataSet`, `switchDataSet`, `bindData` |
| Component Props | `06-component-props` | `updateComponentProps`, `addPropDefinition`, `removePropDefinition`, `updatePropDefinition`, `addPropBinding`, `removePropBinding` |
| Asset Management 资产管理 | `07-asset-management` | `updateTemplate`, `deleteTemplate`, `duplicateTemplate`, `uploadAsset` |
| Layer Tree 图层树 | `08-layer-tree` | `reorderElement`（共用 Canvas） |
| Annotation 标注 | — | `addAnnotation`, `removeAnnotation` |
| Snapshots 快照 | — | `generateSnapshots` |
| Screen 管理 | — | `reorderScreen` |

---

## 3. 新增 Operations — 完整清单 / New Operations — Full List

### 3.1 元素操作 / Element Operations（from `01-canvas`, `08-layer-tree`）

#### `wrapInContainer`

将选中的一组节点包裹到一个新的容器中。
Wrap selected nodes into a new container element.

```typescript
interface WrapInContainerOp {
  type: 'wrapInContainer';
  params: {
    /** 要包裹的节点 ID 列表 */
    nodeIds: string[];
    /** 容器标签类型，默认 'div' */
    containerTag?: PrimitiveNodeType;
    /** 容器初始样式 */
    containerStyles?: Partial<CSSProperties>;
  };
}
```

- **Description (for AI / MCP)**: Wraps the specified nodes into a new container. The container is inserted at the position of the first node, and all specified nodes become its children in their original order.
- **Inverse**: `unwrapContainer` — 传入新容器的 ID，将子节点移回原位并删除容器。

---

#### `unwrapContainer`

将容器的子节点移出到容器的父级，并删除该容器。
Unwrap a container: move its children up to the container's parent and remove the container.

```typescript
interface UnwrapContainerOp {
  type: 'unwrapContainer';
  params: {
    /** 要解包的容器 ID */
    containerId: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a container node and moves its children into the container's parent at the container's original position.
- **Inverse**: `wrapInContainer` — 使用保存的原始子节点 ID 列表和容器样式重新包裹。

---

#### `reorderElement`

在同一父容器内调整节点的顺序（拖拽排序）。
Reorder a node within its parent container (drag-and-drop sorting).

```typescript
interface ReorderElementOp {
  type: 'reorderElement';
  params: {
    /** 要移动的节点 ID */
    nodeId: string;
    /** 父容器 ID */
    parentId: string;
    /** 新的索引位置 */
    newIndex: number;
  };
}
```

- **Description (for AI / MCP)**: Moves a child node to a new index position within the same parent container.
- **Inverse**: `reorderElement` — 传入原始 index。InverseData 中保存 `{ originalIndex: number }`。

---

#### `batchUpdateStyle`

批量更新多个节点的样式（一次操作，一步撤销）。
Batch update styles for multiple nodes in a single operation (single undo unit).

```typescript
interface BatchUpdateStyleOp {
  type: 'batchUpdateStyle';
  params: {
    /** 每个节点的样式更新 */
    updates: Array<{
      nodeId: string;
      styles: Partial<CSSProperties>;
    }>;
  };
}
```

- **Description (for AI / MCP)**: Applies style changes to multiple nodes atomically. All changes succeed or fail together, and undo reverts all at once.
- **Inverse**: `batchUpdateStyle` — 使用保存的所有节点原始样式值。InverseData 中保存 `{ originalStyles: Array<{ nodeId: string; styles: Partial<CSSProperties> }> }`。

---

#### `changeElementType`

更改节点的 primitive 类型（例如 `div` → `section`）。
Change a node's primitive type (e.g. `div` → `section`).

```typescript
interface ChangeElementTypeOp {
  type: 'changeElementType';
  params: {
    /** 目标节点 ID */
    nodeId: string;
    /** 新的节点类型 */
    newType: PrimitiveNodeType;
  };
}
```

- **Description (for AI / MCP)**: Changes the primitive type of an element while preserving its children, styles, and bindings.
- **Inverse**: `changeElementType` — 传入原始类型。InverseData 中保存 `{ originalType: PrimitiveNodeType }`。

---

### 3.2 数据操作 / Data Operations（from `05-data-driven`）

#### `addDataSet`

向项目中添加一个数据集（本地 mock 或远程 API 连接）。
Add a dataset to the project (local mock or remote API connection).

```typescript
interface AddDataSetOp {
  type: 'addDataSet';
  params: {
    /** 数据集唯一 ID（客户端生成） */
    dataSetId: string;
    /** 数据集名称 */
    name: string;
    /** 数据集类型 */
    sourceType: 'static' | 'rest-api' | 'graphql';
    /** 初始 schema 定义 */
    schema: DataSetSchema;
    /** 静态数据 / API 配置 */
    config: DataSetConfig;
  };
}
```

- **Description (for AI / MCP)**: Creates a new dataset that can be used for data binding on elements.
- **Inverse**: `removeDataSet` — 传入 `dataSetId`。

---

#### `removeDataSet`

从项目中删除一个数据集。
Remove a dataset from the project.

```typescript
interface RemoveDataSetOp {
  type: 'removeDataSet';
  params: {
    /** 要删除的数据集 ID */
    dataSetId: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a dataset and all associated data bindings.
- **Inverse**: `addDataSet` — InverseData 中保存完整的数据集快照（name, sourceType, schema, config）及所有关联的 binding 信息。

---

#### `updateDataSet`

更新数据集的配置（schema、数据源参数等）。
Update a dataset's configuration (schema, source parameters, etc.).

```typescript
interface UpdateDataSetOp {
  type: 'updateDataSet';
  params: {
    /** 数据集 ID */
    dataSetId: string;
    /** 部分更新 */
    patch: Partial<Pick<DataSet, 'name' | 'schema' | 'config'>>;
  };
}
```

- **Description (for AI / MCP)**: Partially updates a dataset's name, schema, or configuration.
- **Inverse**: `updateDataSet` — InverseData 中保存被覆盖字段的原始值。

---

#### `switchDataSet`

切换当前活跃的数据集（用于预览不同数据上下文）。
Switch the currently active dataset for preview purposes.

```typescript
interface SwitchDataSetOp {
  type: 'switchDataSet';
  params: {
    /** 新的活跃数据集 ID */
    dataSetId: string;
  };
}
```

- **Description (for AI / MCP)**: Sets the active dataset used for the preview context.
- **Inverse**: `switchDataSet` — InverseData 中保存 `{ previousDataSetId: string }`。

---

#### `bindData`

将数据集的字段绑定到节点的某个属性上。
Bind a dataset field to a node's property.

```typescript
interface BindDataOp {
  type: 'bindData';
  params: {
    /** 目标节点 ID */
    nodeId: string;
    /** 节点属性名（如 'textContent', 'src', 'style.color'） */
    property: string;
    /** 数据集 ID */
    dataSetId: string;
    /** 数据字段路径（如 'items[0].title'） */
    fieldPath: string;
    /** 可选的转换表达式 */
    transform?: string;
  };
}
```

- **Description (for AI / MCP)**: Creates a data binding between a dataset field and a node property. When the dataset value changes, the node property updates automatically.
- **Inverse**: 删除绑定。InverseData 中保存 `{ previousBinding: DataBinding | null }`（如果之前已有绑定则恢复，否则移除）。

---

### 3.3 全局状态操作 / Global State Operations（from `04-state-system`）

#### `setGlobalState`

设置全局状态变量的值。
Set the value of a global state variable.

```typescript
interface SetGlobalStateOp {
  type: 'setGlobalState';
  params: {
    /** 变量名 */
    variableName: string;
    /** 新值 */
    value: unknown;
  };
}
```

- **Description (for AI / MCP)**: Sets a global state variable to a new value. All bindings that reference this variable will reactively update.
- **Inverse**: `setGlobalState` — InverseData 中保存 `{ previousValue: unknown }`。

---

#### `addGlobalStateVariable`

添加一个新的全局状态变量。
Add a new global state variable definition.

```typescript
interface AddGlobalStateVariableOp {
  type: 'addGlobalStateVariable';
  params: {
    /** 变量名 */
    variableName: string;
    /** 变量类型 */
    valueType: 'string' | 'number' | 'boolean' | 'object' | 'array';
    /** 默认值 */
    defaultValue: unknown;
    /** 可选描述 */
    description?: string;
  };
}
```

- **Description (for AI / MCP)**: Defines a new global state variable with a type and default value.
- **Inverse**: `removeGlobalStateVariable` — 传入 `variableName`。

---

#### `removeGlobalStateVariable`

移除一个全局状态变量。
Remove a global state variable definition.

```typescript
interface RemoveGlobalStateVariableOp {
  type: 'removeGlobalStateVariable';
  params: {
    /** 变量名 */
    variableName: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a global state variable and all associated bindings.
- **Inverse**: `addGlobalStateVariable` — InverseData 中保存完整定义（valueType, defaultValue, description）以及所有关联的 bindings。

---

#### `addGlobalStateBinding`

为节点创建一个全局状态绑定。
Create a global state binding for a node property.

```typescript
interface AddGlobalStateBindingOp {
  type: 'addGlobalStateBinding';
  params: {
    /** 绑定 ID（客户端生成） */
    bindingId: string;
    /** 目标节点 ID */
    nodeId: string;
    /** 节点属性 */
    property: string;
    /** 全局变量名 */
    variableName: string;
    /** 可选转换表达式 */
    transform?: string;
  };
}
```

- **Description (for AI / MCP)**: Binds a global state variable to a node property so the node reacts to state changes.
- **Inverse**: `removeGlobalStateBinding` — 传入 `bindingId`。

---

#### `removeGlobalStateBinding`

移除一个全局状态绑定。
Remove a global state binding.

```typescript
interface RemoveGlobalStateBindingOp {
  type: 'removeGlobalStateBinding';
  params: {
    /** 绑定 ID */
    bindingId: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a specific global state binding from a node.
- **Inverse**: `addGlobalStateBinding` — InverseData 中保存完整的 binding 信息。

---

#### `updateGlobalStateBinding`

更新已有的全局状态绑定。
Update an existing global state binding.

```typescript
interface UpdateGlobalStateBindingOp {
  type: 'updateGlobalStateBinding';
  params: {
    /** 绑定 ID */
    bindingId: string;
    /** 部分更新 */
    patch: Partial<Pick<GlobalStateBinding, 'variableName' | 'property' | 'transform'>>;
  };
}
```

- **Description (for AI / MCP)**: Partially updates a global state binding's target variable, property, or transform.
- **Inverse**: `updateGlobalStateBinding` — InverseData 中保存被覆盖字段的原始值。

---

### 3.4 组件 Props 操作 / Component Props Operations（from `06-component-props`）

#### `updateComponentProps`

更新组件实例的 props 值。
Update a component instance's props values.

```typescript
interface UpdateComponentPropsOp {
  type: 'updateComponentProps';
  params: {
    /** 组件实例节点 ID */
    nodeId: string;
    /** props 键值对 */
    props: Record<string, unknown>;
  };
}
```

- **Description (for AI / MCP)**: Sets one or more prop values on a component instance.
- **Inverse**: `updateComponentProps` — InverseData 中保存 `{ originalProps: Record<string, unknown> }`。

---

#### `addPropDefinition`

为组件模板添加 prop 定义。
Add a prop definition to a component template.

```typescript
interface AddPropDefinitionOp {
  type: 'addPropDefinition';
  params: {
    /** 组件模板 ID */
    templateId: string;
    /** prop 名称 */
    propName: string;
    /** prop 类型 */
    propType: 'string' | 'number' | 'boolean' | 'enum' | 'color' | 'object';
    /** 默认值 */
    defaultValue: unknown;
    /** 可选的枚举选项 */
    enumOptions?: string[];
    /** 可选描述 */
    description?: string;
  };
}
```

- **Description (for AI / MCP)**: Defines a new prop on a component template. All existing instances inherit the default value.
- **Inverse**: `removePropDefinition` — 传入 `templateId` + `propName`。

---

#### `removePropDefinition`

从组件模板移除 prop 定义。
Remove a prop definition from a component template.

```typescript
interface RemovePropDefinitionOp {
  type: 'removePropDefinition';
  params: {
    /** 组件模板 ID */
    templateId: string;
    /** prop 名称 */
    propName: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a prop definition and clears all instance overrides for that prop.
- **Inverse**: `addPropDefinition` — InverseData 中保存完整定义（propType, defaultValue, enumOptions, description）以及所有实例的 override 值。

---

#### `updatePropDefinition`

更新已有的 prop 定义（如修改类型、默认值）。
Update an existing prop definition (e.g. modify type, default value).

```typescript
interface UpdatePropDefinitionOp {
  type: 'updatePropDefinition';
  params: {
    /** 组件模板 ID */
    templateId: string;
    /** prop 名称 */
    propName: string;
    /** 部分更新 */
    patch: Partial<Pick<PropDefinition, 'propType' | 'defaultValue' | 'enumOptions' | 'description'>>;
  };
}
```

- **Description (for AI / MCP)**: Partially updates a prop definition's type, default value, enum options, or description.
- **Inverse**: `updatePropDefinition` — InverseData 中保存被覆盖字段的原始值。

---

#### `addPropBinding`

将 prop 绑定到节点的属性或样式上。
Bind a component prop to a node's property or style within the template tree.

```typescript
interface AddPropBindingOp {
  type: 'addPropBinding';
  params: {
    /** 绑定 ID（客户端生成） */
    bindingId: string;
    /** 组件模板 ID */
    templateId: string;
    /** prop 名称 */
    propName: string;
    /** 目标节点 ID（模板内部节点） */
    targetNodeId: string;
    /** 目标属性 */
    targetProperty: string;
    /** 可选转换表达式 */
    transform?: string;
  };
}
```

- **Description (for AI / MCP)**: Creates a binding so that when a prop value changes, the target node's property updates accordingly.
- **Inverse**: `removePropBinding` — 传入 `bindingId`。

---

#### `removePropBinding`

移除一个 prop 绑定。
Remove a prop binding.

```typescript
interface RemovePropBindingOp {
  type: 'removePropBinding';
  params: {
    /** 绑定 ID */
    bindingId: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a specific prop binding from a component template.
- **Inverse**: `addPropBinding` — InverseData 中保存完整的 binding 信息。

---

### 3.5 模板管理操作 / Template Management Operations（from `07-asset-management`）

#### `updateTemplate`

更新已有模板的内容或元信息。
Update an existing template's content or metadata.

```typescript
interface UpdateTemplateOp {
  type: 'updateTemplate';
  params: {
    /** 模板 ID */
    templateId: string;
    /** 部分更新 */
    patch: Partial<Pick<Template, 'name' | 'description' | 'tags' | 'tree' | 'thumbnail'>>;
  };
}
```

- **Description (for AI / MCP)**: Partially updates a template's name, description, tags, tree structure, or thumbnail.
- **Inverse**: `updateTemplate` — InverseData 中保存被覆盖字段的原始值。

---

#### `deleteTemplate`

删除一个模板。
Delete a template from the asset library.

```typescript
interface DeleteTemplateOp {
  type: 'deleteTemplate';
  params: {
    /** 模板 ID */
    templateId: string;
  };
}
```

- **Description (for AI / MCP)**: Removes a template from the library. Existing instances are automatically detached.
- **Inverse**: `saveAsTemplate`（已有 Operation）— InverseData 中保存完整的模板快照。

---

#### `duplicateTemplate`

复制一个模板。
Duplicate a template in the asset library.

```typescript
interface DuplicateTemplateOp {
  type: 'duplicateTemplate';
  params: {
    /** 源模板 ID */
    sourceTemplateId: string;
    /** 新模板 ID（客户端生成） */
    newTemplateId: string;
    /** 新名称（默认 "Copy of {original}"） */
    newName?: string;
  };
}
```

- **Description (for AI / MCP)**: Creates a deep copy of a template with a new ID and optional new name.
- **Inverse**: `deleteTemplate` — 传入 `newTemplateId`。

---

### 3.6 其他操作 / Miscellaneous Operations

#### `addAnnotation`

为节点添加标注 / 备注。
Add an annotation (comment / note) to a node.

```typescript
interface AddAnnotationOp {
  type: 'addAnnotation';
  params: {
    /** 标注 ID（客户端生成） */
    annotationId: string;
    /** 关联的节点 ID */
    nodeId: string;
    /** 标注内容 */
    content: string;
    /** 标注类型 */
    annotationType: 'comment' | 'todo' | 'warning' | 'info';
    /** 作者 */
    author?: string;
  };
}
```

- **Description (for AI / MCP)**: Adds an annotation to a specific node, visible in the canvas and layer tree.
- **Inverse**: `removeAnnotation` — 传入 `annotationId`。

---

#### `removeAnnotation`

移除一个标注。
Remove an annotation.

```typescript
interface RemoveAnnotationOp {
  type: 'removeAnnotation';
  params: {
    /** 标注 ID */
    annotationId: string;
  };
}
```

- **Description (for AI / MCP)**: Removes an annotation from a node.
- **Inverse**: `addAnnotation` — InverseData 中保存完整的标注信息。

---

#### `uploadAsset`

上传资产文件（图片、字体等）。
Upload an asset file (image, font, etc.) to the project.

```typescript
interface UploadAssetOp {
  type: 'uploadAsset';
  params: {
    /** 资产 ID（客户端生成） */
    assetId: string;
    /** 文件名 */
    fileName: string;
    /** MIME 类型 */
    mimeType: string;
    /** 资产类别 */
    category: 'image' | 'font' | 'icon' | 'video' | 'other';
    /** 文件 URL 或 base64（上传后由后端返回 URL） */
    url: string;
    /** 文件大小（bytes） */
    fileSize: number;
  };
}
```

- **Description (for AI / MCP)**: Uploads and registers an asset in the project's asset library.
- **Inverse**: 删除资产记录。InverseData 中保存 `{ assetId: string }`。注意：实际文件可能需要后端 soft-delete。

---

#### `generateSnapshots`

为当前屏幕生成预览快照（异步，fire-and-forget）。
Generate preview snapshots for the current screen (async, fire-and-forget).

```typescript
interface GenerateSnapshotsOp {
  type: 'generateSnapshots';
  params: {
    /** 屏幕 ID 列表 */
    screenIds: string[];
    /** 快照尺寸 */
    size: { width: number; height: number };
    /** 输出格式 */
    format: 'png' | 'webp';
  };
}
```

- **Description (for AI / MCP)**: Triggers asynchronous snapshot generation for specified screens. Does not modify the document tree.
- **Inverse**: **无需逆操作** — 快照生成是只读 side-effect，不会修改文档状态。

---

#### `reorderScreen`

调整屏幕顺序。
Reorder screens in the project.

```typescript
interface ReorderScreenOp {
  type: 'reorderScreen';
  params: {
    /** 屏幕 ID */
    screenId: string;
    /** 新的索引位置 */
    newIndex: number;
  };
}
```

- **Description (for AI / MCP)**: Moves a screen to a new position in the screen list.
- **Inverse**: `reorderScreen` — InverseData 中保存 `{ originalIndex: number }`。

---

## 4. Inverse 策略总表 / Inverse Strategy Matrix

| Operation | Inverse Operation | InverseData 需保存的内容 |
|---|---|---|
| `wrapInContainer` | `unwrapContainer` | `{ containerId }` |
| `unwrapContainer` | `wrapInContainer` | `{ nodeIds, containerTag, containerStyles, originalIndex }` |
| `reorderElement` | `reorderElement` | `{ originalIndex }` |
| `batchUpdateStyle` | `batchUpdateStyle` | `{ originalStyles[] }` |
| `changeElementType` | `changeElementType` | `{ originalType }` |
| `addDataSet` | `removeDataSet` | `{ dataSetId }` |
| `removeDataSet` | `addDataSet` | 完整的 DataSet 快照 + 关联 bindings |
| `updateDataSet` | `updateDataSet` | 被覆盖字段的原始值 |
| `switchDataSet` | `switchDataSet` | `{ previousDataSetId }` |
| `bindData` | 移除 binding / 恢复旧 binding | `{ previousBinding \| null }` |
| `setGlobalState` | `setGlobalState` | `{ previousValue }` |
| `addGlobalStateVariable` | `removeGlobalStateVariable` | `{ variableName }` |
| `removeGlobalStateVariable` | `addGlobalStateVariable` | 完整定义 + 关联 bindings |
| `addGlobalStateBinding` | `removeGlobalStateBinding` | `{ bindingId }` |
| `removeGlobalStateBinding` | `addGlobalStateBinding` | 完整 binding 信息 |
| `updateGlobalStateBinding` | `updateGlobalStateBinding` | 被覆盖字段的原始值 |
| `updateComponentProps` | `updateComponentProps` | `{ originalProps }` |
| `addPropDefinition` | `removePropDefinition` | `{ templateId, propName }` |
| `removePropDefinition` | `addPropDefinition` | 完整定义 + 所有实例 override 值 |
| `updatePropDefinition` | `updatePropDefinition` | 被覆盖字段的原始值 |
| `addPropBinding` | `removePropBinding` | `{ bindingId }` |
| `removePropBinding` | `addPropBinding` | 完整 binding 信息 |
| `updateTemplate` | `updateTemplate` | 被覆盖字段的原始值 |
| `deleteTemplate` | `saveAsTemplate` | 完整模板快照 |
| `duplicateTemplate` | `deleteTemplate` | `{ newTemplateId }` |
| `addAnnotation` | `removeAnnotation` | `{ annotationId }` |
| `removeAnnotation` | `addAnnotation` | 完整标注信息 |
| `uploadAsset` | 删除资产 | `{ assetId }` |
| `generateSnapshots` | _(none)_ | 无需逆操作 |
| `reorderScreen` | `reorderScreen` | `{ originalIndex }` |

---

## 5. Operation Union 类型扩展 / Extended Operation Union Type

```typescript
// ---- 已有 Operations（来自 01-operations） ----
type ExistingOperation =
  | AddElementOp
  | RemoveElementOp
  | MoveElementOp
  | DuplicateElementOp
  | RenameNodeOp
  | UpdateStyleOp
  | ResetStyleOp
  | AddStateOp
  | RemoveStateOp
  | UpdateStateOp
  | SetActiveStateOp
  | AddEventOp
  | RemoveEventOp
  | AddNavigationOp
  | AddScreenOp
  | RemoveScreenOp
  | SetActiveScreenOp
  | RenameScreenOp
  | SwitchViewportOp
  | AddViewportPresetOp
  | InstantiateTemplateOp
  | SaveAsTemplateOp
  | DetachInstanceOp
  | SyncInstanceOp;

// ---- 3.1 元素操作 ----
type ElementExtensionOp =
  | WrapInContainerOp
  | UnwrapContainerOp
  | ReorderElementOp
  | BatchUpdateStyleOp
  | ChangeElementTypeOp;

// ---- 3.2 数据操作 ----
type DataOp =
  | AddDataSetOp
  | RemoveDataSetOp
  | UpdateDataSetOp
  | SwitchDataSetOp
  | BindDataOp;

// ---- 3.3 全局状态操作 ----
type GlobalStateOp =
  | SetGlobalStateOp
  | AddGlobalStateVariableOp
  | RemoveGlobalStateVariableOp
  | AddGlobalStateBindingOp
  | RemoveGlobalStateBindingOp
  | UpdateGlobalStateBindingOp;

// ---- 3.4 组件 Props 操作 ----
type ComponentPropsOp =
  | UpdateComponentPropsOp
  | AddPropDefinitionOp
  | RemovePropDefinitionOp
  | UpdatePropDefinitionOp
  | AddPropBindingOp
  | RemovePropBindingOp;

// ---- 3.5 模板管理操作 ----
type TemplateExtensionOp =
  | UpdateTemplateOp
  | DeleteTemplateOp
  | DuplicateTemplateOp;

// ---- 3.6 其他操作 ----
type MiscOp =
  | AddAnnotationOp
  | RemoveAnnotationOp
  | UploadAssetOp
  | GenerateSnapshotsOp
  | ReorderScreenOp;

// ---- 完整 Union ----
export type Operation =
  | ExistingOperation
  | ElementExtensionOp
  | DataOp
  | GlobalStateOp
  | ComponentPropsOp
  | TemplateExtensionOp
  | MiscOp;
```

---

## 6. OperationExecutor 扩展 / Executor Extension

### 6.1 Handler 注册模式 / Handler Registration Pattern

```typescript
type OperationHandler<T extends Operation = Operation> = (
  state: DesignDocument,
  op: T,
) => { newState: DesignDocument; inverseData: InverseData };

class OperationExecutor {
  private handlers = new Map<Operation['type'], OperationHandler>();

  /** 注册单个 handler */
  register<T extends Operation>(
    type: T['type'],
    handler: OperationHandler<T>,
  ): void {
    this.handlers.set(type, handler as OperationHandler);
  }

  /** 批量注册一组 handlers */
  registerAll(
    handlers: Record<string, OperationHandler>,
  ): void {
    for (const [type, handler] of Object.entries(handlers)) {
      this.handlers.set(type, handler);
    }
  }

  /** 执行单个 operation */
  execute(state: DesignDocument, op: Operation): ExecutionResult {
    const handler = this.handlers.get(op.type);
    if (!handler) {
      throw new UnknownOperationError(op.type);
    }
    return handler(state, op);
  }
}
```

### 6.2 Error Handling 改进 / Error Handling Improvements

```typescript
/** Operation 执行错误基类 */
class OperationError extends Error {
  constructor(
    public readonly operationType: string,
    message: string,
    public readonly recoverable: boolean = false,
  ) {
    super(`[${operationType}] ${message}`);
  }
}

/** 未知操作类型 */
class UnknownOperationError extends OperationError {
  constructor(type: string) {
    super(type, `Unknown operation type: ${type}`, false);
  }
}

/** 节点未找到 */
class NodeNotFoundError extends OperationError {
  constructor(type: string, nodeId: string) {
    super(type, `Node not found: ${nodeId}`, false);
  }
}

/** 验证失败 */
class ValidationError extends OperationError {
  constructor(type: string, details: string) {
    super(type, `Validation failed: ${details}`, true);
  }
}
```

### 6.3 Batch Operation 支持 / Batch Operation Support

```typescript
interface BatchOperation {
  type: 'batch';
  params: {
    /** 子操作列表，按顺序执行 */
    operations: Operation[];
    /** 批量操作描述（用于 history 面板显示） */
    label: string;
  };
}

// Executor 中的批量执行：
executeBatch(
  state: DesignDocument,
  batch: BatchOperation,
): ExecutionResult {
  let currentState = state;
  const inverseOps: InverseData[] = [];

  for (const op of batch.params.operations) {
    const result = this.execute(currentState, op);
    currentState = result.newState;
    inverseOps.push(result.inverseData);
  }

  // 整个 batch 是一个 undo 单元
  return {
    newState: currentState,
    inverseData: {
      type: 'batch',
      operations: inverseOps.reverse(), // 逆序撤销
      label: batch.params.label,
    },
  };
}
```

---

## 7. 影响的文件路径 / Affected File Paths

```
features/design-operations/src/
├── types.ts                   ← 扩展 Operation union + 新增类型定义
├── operations/
│   ├── element.ts             ← 已有，新增 wrap / unwrap / reorder / batch / changeType
│   ├── data.ts                ← 🆕 数据集操作 (addDataSet, removeDataSet, updateDataSet, switchDataSet, bindData)
│   ├── global-state.ts        ← 🆕 全局状态操作 (setGlobalState, add/remove/update variable & binding)
│   ├── component-props.ts     ← 🆕 Props 操作 (updateComponentProps, add/remove/update propDef & propBinding)
│   ├── template.ts            ← 已有，新增 update / delete / duplicate
│   ├── annotation.ts          ← 🆕 标注操作 (addAnnotation, removeAnnotation)
│   └── asset.ts               ← 🆕 资产操作 (uploadAsset, generateSnapshots)
├── errors.ts                  ← 🆕 OperationError 层次结构
├── executor.ts                ← 扩展 handler 注册 + batch 支持 + 错误处理
├── history.ts                 ← 已有（无需修改，batch inverse 自动兼容）
└── index.ts                   ← 更新 re-exports
```

---

## 8. 依赖关系 / Dependencies

```
┌────────────────────────────┐
│  01-schema-extensions      │ ← 本文档依赖（类型定义来源）
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  02-operations-extensions  │ ← 本文档
└────────────┬───────────────┘
             │
     ┌───────┼───────┬───────────┐
     ▼       ▼       ▼           ▼
  07-canvas  08-panels  09-backend  10-mcp
```

- **依赖 (Depends on)**:
  - `01-schema-extensions` — `PrimitiveNodeType`, `CSSProperties`, `DataSetSchema`, `Template`, `PropDefinition` 等类型
- **被依赖 (Depended by)**:
  - `07-frontend-canvas` — Canvas 操作触发
  - `08-frontend-panels` — 面板 UI 操作触发
  - `09-backend` — 操作持久化与同步
  - `10-mcp` — AI Agent 通过 MCP 发送 Operations

---

## 9. MVP vs 后期 / Phased Rollout

| Phase | Operations | 优先级 |
|---|---|---|
| **Phase 1 — MVP** | `wrapInContainer`, `unwrapContainer`, `reorderElement`, `batchUpdateStyle`, `changeElementType`, `reorderScreen` | 🔴 P0 |
| **Phase 2** | `setGlobalState`, `addGlobalStateVariable`, `removeGlobalStateVariable`, `addGlobalStateBinding`, `removeGlobalStateBinding`, `updateGlobalStateBinding`, `updateComponentProps`, `addPropDefinition`, `removePropDefinition`, `updatePropDefinition`, `addPropBinding`, `removePropBinding` | 🟡 P1 |
| **Phase 3** | `addDataSet`, `removeDataSet`, `updateDataSet`, `switchDataSet`, `bindData` | 🟡 P1 |
| **Phase 4** | `updateTemplate`, `deleteTemplate`, `duplicateTemplate`, `addAnnotation`, `removeAnnotation`, `uploadAsset`, `generateSnapshots` | 🟢 P2 |

---

## 10. 核心技术决策 / Key Technical Decisions

| # | 决策 | 理由 |
|---|---|---|
| 1 | **每个 Op 在 InverseData 中存储足够的数据以实现完美 undo** | 不依赖全局 snapshot diff，保证 O(1) 撤销开销。 |
| 2 | **Batch ops 是单一 undo 单元** | 用户感知上"一个动作"对应"一步撤销"。例如 `batchUpdateStyle` 修改 20 个节点，一次 Ctrl+Z 全部还原。 |
| 3 | **`generateSnapshots` 是 async fire-and-forget，无需 inverse** | 快照生成是只读 side-effect，不修改文档状态树。异步完成后更新缩略图缓存即可。 |
| 4 | **Handler 注册采用 Map + register pattern** | 支持按需加载（lazy registration），Phase 后期的 handler 可以动态注册，不影响 MVP bundle size。 |
| 5 | **Error 类型层次化（`OperationError` → 子类）** | 让 UI 层和 MCP 层能根据错误类型决定是否可恢复、是否需要提示用户。 |
| 6 | **客户端生成 ID（`annotationId`, `bindingId`, `dataSetId` 等）** | 保证 Operation 是纯数据、可预测、可在离线环境中创建。使用 `nanoid()` 或 `uuid.v4()`。 |
