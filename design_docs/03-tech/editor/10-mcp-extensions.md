# 10-mcp-extensions — MCP 扩展技术设计

> Technical design for design-mcp extensions.

---

## 1. 第一性原理 / First Principles

MCP extensions answer: **"What new AI capabilities does the editor expose?"**

Every new editor feature should be accessible to AI through MCP tools. This ensures that AI assistants can manipulate datasets, global state, component props, and trigger screenshots — the same capabilities available to human users through the UI.

---

## 2. 来自产品需求 / Product Requirements Traceability

| 产品文档 | 对应 MCP 能力 |
|---------|-------------|
| 04-state-system | Global state tools |
| 05-data-driven | Dataset tools |
| 06-component-props | Component props tools |
| 07-asset-management | Snapshot tool |

---

## 3. 新增 MCP Tools / New MCP Tools

### 3.1 数据集 Tools / Dataset Tools

#### `list_datasets`

List all datasets for a screen.

```json
{
  "name": "list_datasets",
  "description": "List all datasets for a screen, showing which one is currently active.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string", "description": "Project ID" },
      "screenId": { "type": "string", "description": "Screen ID" }
    },
    "required": ["projectId", "screenId"]
  }
}
```

**Example usage:**
```
list_datasets(projectId: "proj_1", screenId: "screen_1")
→ [{ id: "ds_1", name: "Default", isActive: true }, { id: "ds_2", name: "Empty State", isActive: false }]
```

#### `switch_dataset`

Activate a specific dataset for a screen.

```json
{
  "name": "switch_dataset",
  "description": "Activate a dataset for a screen. The previously active dataset is deactivated.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "datasetId": { "type": "string", "description": "Dataset ID to activate" }
    },
    "required": ["projectId", "screenId", "datasetId"]
  }
}
```

**Example usage:**
```
switch_dataset(projectId: "proj_1", screenId: "screen_1", datasetId: "ds_2")
→ { id: "ds_2", name: "Empty State", isActive: true }
```

#### `update_dataset`

Modify the content of an existing dataset.

```json
{
  "name": "update_dataset",
  "description": "Update the data content of an existing dataset.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "datasetId": { "type": "string" },
      "data": { "type": "object", "description": "New dataset content (replaces existing)" }
    },
    "required": ["projectId", "screenId", "datasetId", "data"]
  }
}
```

**Example usage:**
```
update_dataset(projectId: "proj_1", screenId: "screen_1", datasetId: "ds_1", data: { users: [{ name: "Alice" }] })
→ { id: "ds_1", name: "Default", data: { users: [{ name: "Alice" }] } }
```

#### `add_dataset`

Create a new dataset for a screen.

```json
{
  "name": "add_dataset",
  "description": "Create a new dataset for a screen.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "name": { "type": "string", "description": "Human-readable dataset name" },
      "data": { "type": "object", "description": "Initial dataset content" }
    },
    "required": ["projectId", "screenId", "name", "data"]
  }
}
```

#### `bind_data`

Bind a node prop to a data expression.

```json
{
  "name": "bind_data",
  "description": "Bind a node property to a data expression (e.g. {{data.user.name}}).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "nodeId": { "type": "string", "description": "Target node ID" },
      "propPath": { "type": "string", "description": "Property path (e.g. 'props.textContent', 'style.color')" },
      "expression": { "type": "string", "description": "Data expression (e.g. '{{data.user.name}}')" }
    },
    "required": ["projectId", "screenId", "nodeId", "propPath", "expression"]
  }
}
```

---

### 3.2 全局状态 Tools / Global State Tools

#### `list_global_states`

List global state variables for a screen.

```json
{
  "name": "list_global_states",
  "description": "List all global state variables defined for a screen.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" }
    },
    "required": ["projectId", "screenId"]
  }
}
```

**Example usage:**
```
list_global_states(projectId: "proj_1", screenId: "screen_1")
→ [{ name: "theme", type: "string", value: "light" }, { name: "isLoggedIn", type: "boolean", value: false }]
```

#### `set_global_state`

Set the value of a global state variable.

```json
{
  "name": "set_global_state",
  "description": "Set the value of a global state variable.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "name": { "type": "string", "description": "State variable name" },
      "value": { "description": "New value (any JSON-compatible type)" }
    },
    "required": ["projectId", "screenId", "name", "value"]
  }
}
```

#### `add_global_state_binding`

Bind a node property to a global state variable.

```json
{
  "name": "add_global_state_binding",
  "description": "Bind a node property to a global state variable.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "nodeId": { "type": "string" },
      "propPath": { "type": "string" },
      "stateVariable": { "type": "string", "description": "Global state variable name" }
    },
    "required": ["projectId", "screenId", "nodeId", "propPath", "stateVariable"]
  }
}
```

---

### 3.3 组件 Props Tools / Component Props Tools

#### `get_template_props`

Get the prop definitions for a template.

```json
{
  "name": "get_template_props",
  "description": "Get propDefinitions for a template, showing all configurable props with types and defaults.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "templateId": { "type": "string" }
    },
    "required": ["projectId", "templateId"]
  }
}
```

**Example usage:**
```
get_template_props(projectId: "proj_1", templateId: "tpl_button")
→ { label: { type: "string", default: "Click me" }, variant: { type: "enum", options: ["primary", "secondary"], default: "primary" } }
```

#### `update_component_props`

Update prop values on a component instance.

```json
{
  "name": "update_component_props",
  "description": "Update prop values on a component instance node.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenId": { "type": "string" },
      "nodeId": { "type": "string", "description": "Component instance node ID" },
      "props": { "type": "object", "description": "Key-value pairs of prop updates" }
    },
    "required": ["projectId", "screenId", "nodeId", "props"]
  }
}
```

#### `list_element_props`

List available props for an element type.

```json
{
  "name": "list_element_props",
  "description": "List available HTML props for an element type from the ElementPropRegistry.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "elementType": { "type": "string", "description": "HTML element type (e.g. 'img', 'a', 'input')" }
    },
    "required": ["elementType"]
  }
}
```

---

### 3.4 截图 Tool / Snapshot Tool

#### `generate_snapshots`

Trigger screenshot matrix generation.

```json
{
  "name": "generate_snapshots",
  "description": "Trigger screenshot generation for combinations of screens, datasets, states, and viewports. Returns a job ID for polling.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string" },
      "screenIds": { "type": "array", "items": { "type": "string" } },
      "dataSetIds": { "type": "array", "items": { "type": "string" } },
      "globalStates": { "type": "array", "items": { "type": "object" }, "description": "Array of global state combinations" },
      "viewportIds": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["projectId", "screenIds"]
  }
}
```

**Example usage:**
```
generate_snapshots(projectId: "proj_1", screenIds: ["screen_1"], dataSetIds: ["ds_1", "ds_2"], viewportIds: ["mobile_375"])
→ { jobId: "job_xyz", status: "pending", totalCombinations: 2 }
```

---

## 4. 新增 MCP Resources / New MCP Resources

### `datasets://{projectId}/{screenId}`

Returns the list of datasets for a screen, including their content.

```json
{
  "uri": "datasets://proj_1/screen_1",
  "name": "Datasets for Screen 1",
  "mimeType": "application/json",
  "description": "All datasets for the specified screen"
}
```

### `globalstates://{projectId}/{screenId}`

Returns global state variables and their current values.

```json
{
  "uri": "globalstates://proj_1/screen_1",
  "name": "Global States for Screen 1",
  "mimeType": "application/json",
  "description": "All global state variables for the specified screen"
}
```

### `template://{projectId}/{templateId}`

Returns the template definition including `propDefinitions`.

```json
{
  "uri": "template://proj_1/tpl_button",
  "name": "Button Template",
  "mimeType": "application/json",
  "description": "Template definition with prop definitions"
}
```

---

## 5. 影响的文件路径 / Affected File Paths

```
apps/design-mcp/src/
├── tools/
│   ├── dataset-tools.ts          ← 🆕
│   ├── global-state-tools.ts     ← 🆕
│   ├── component-props-tools.ts  ← 🆕
│   └── snapshot-tools.ts         ← 🆕
├── resources/
│   ├── dataset-resources.ts      ← 🆕
│   ├── global-state-resources.ts ← 🆕
│   └── template-resources.ts     ← 🆕
└── api-client.ts                 ← 扩展新端点
```

---

## 6. 依赖关系 / Dependencies

- **依赖 (depends on):** 09-backend-extensions
- **被依赖 (depended by):** none

---

## 7. MVP vs 后期 / Phased Delivery

| Phase | Scope |
|-------|-------|
| **Phase 3** | Dataset tools (`list_datasets`, `switch_dataset`, `update_dataset`, `add_dataset`, `bind_data`) |
| **Phase 4** | Global state tools + component props tools + snapshot tool |

---

## 8. 技术决策 / Technical Decisions

**Decision: One tool per operation vs composite tools**

→ **One-to-one mapping** for clarity.

Rationale:
- Each tool has a single, well-defined purpose
- AI models work better with focused tools than multi-mode tools
- Easier to test and document
- Composability: AI can chain multiple simple tools to achieve complex outcomes
