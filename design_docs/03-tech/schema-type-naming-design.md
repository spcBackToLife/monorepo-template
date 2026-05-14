# Schema 类型命名系统设计方案

## 问题定义

Schema → Code 过程中需要命名的东西：

| 概念 | 代码里变成什么 | 当前 Schema 位置 | 问题 |
|---|---|---|---|
| 节点 | 组件名/CSS class | `node.name` | ✅ 已解决（PascalCase 必填） |
| DataSource 响应类型 | interface 名 | ❌ 没有 | `Record<string, unknown>` |
| DataSource 响应数组 item | interface 名 | ❌ 没有 | 猜不准 |
| stateInit.data 的值类型 | interface 名 + 泛型 | ❌ 没有 | `unknown[]` |
| Handler | 函数名 | 自动拼接 | ✅ OK（node.name + trigger） |
| Event 参数 | params 类型 | 从 endpoint.body 推导 | ⚠️ 可以改进 |

## Schema 扩展设计

### 1. DataSource 扩展：加 `typeDef`

```typescript
// features/design-schema/src/types/dataSource.ts

export interface ApiDataSource {
  id: string;
  type: 'api';
  name: string;
  description?: string;
  endpoint: ApiEndpoint;
  mock?: MockConfig;
  autoFetchOnEnter?: boolean;
  defaultParams?: Record<string, Expression | unknown>;

  // ═══ 新增：类型元数据 ═══

  /**
   * 响应类型定义。
   * codegen 直接使用这里的类型名和字段，不再靠 mock 推导。
   */
  typeDef?: DataSourceTypeDef;
}

export interface DataSourceTypeDef {
  /** 响应类型名称（PascalCase），如 "Message", "ChatSendResponse" */
  responseName: string;

  /**
   * 响应结构描述。
   * - 如果响应是数组：描述的是单个 item 的结构
   * - 如果响应是对象：描述的是整个响应的结构
   */
  responseFields: TypeField[];

  /** 响应是数组还是对象 */
  responseShape: 'array' | 'object';

  /** 请求参数类型名称（POST/PUT 时有 body 的情况） */
  paramsName?: string;
  paramsFields?: TypeField[];
}

export interface TypeField {
  /** 字段名 */
  name: string;
  /** TypeScript 类型（"string" | "number" | "boolean" | "OtherInterface" | "string[]" 等） */
  type: string;
  /** 是否可选 */
  optional?: boolean;
  /** 字段描述（生成 JSDoc 注释） */
  description?: string;
}
```

### 2. stateInit.data 扩展：加类型引用

```typescript
// features/design-schema/src/types/state.ts

export interface ScreenStateInit {
  data?: Record<string, unknown>;
  view?: Record<string, ViewVariableDef>;

  // ═══ 新增：data 字段的类型注解 ═══
  
  /**
   * data 字段的类型映射。
   * key = stateInit.data 的 key，value = 类型信息
   * 
   * 例：{ messages: { typeName: "Message", isArray: true } }
   * 生成：const [messages, setMessages] = useState<Message[]>([])
   */
  dataTypes?: Record<string, DataTypeAnnotation>;
}

export interface DataTypeAnnotation {
  /** 类型名（PascalCase），如 "Message" */
  typeName: string;
  /** 是否是数组 */
  isArray: boolean;
}
```

### 3. 最终效果示例

**Schema（设计时 AI 填写）：**
```json
{
  "dataSources": [
    {
      "id": "chat-list",
      "type": "api",
      "name": "chat-list",
      "endpoint": { "method": "GET", "path": "/chat/list" },
      "typeDef": {
        "responseName": "Message",
        "responseShape": "array",
        "responseFields": [
          { "name": "id", "type": "string" },
          { "name": "role", "type": "'user' | 'assistant'" },
          { "name": "text", "type": "string" }
        ]
      }
    },
    {
      "id": "chat-send",
      "type": "api",
      "name": "chat-send",
      "endpoint": { "method": "POST", "path": "/chat/send", "body": { "text": "{{ params.text }}" } },
      "typeDef": {
        "responseName": "ChatSendResponse",
        "responseShape": "object",
        "responseFields": [
          { "name": "userMessage", "type": "Message" },
          { "name": "aiReply", "type": "Message" }
        ],
        "paramsName": "ChatSendParams",
        "paramsFields": [
          { "name": "text", "type": "string" }
        ]
      }
    }
  ],
  "stateInit": {
    "data": { "messages": [] },
    "dataTypes": {
      "messages": { "typeName": "Message", "isArray": true }
    },
    "view": {
      "inputDraft": { "name": "inputDraft", "defaultValue": "" }
    }
  }
}
```

**生成代码：**
```typescript
// types/index.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatSendResponse {
  userMessage: Message;
  aiReply: Message;
}

export interface ChatSendParams {
  text: string;
}

// page component
const [messages, setMessages] = useState<Message[]>([]);

// service
export async function chatList(): Promise<Message[]> { ... }
export async function chatSend(params: ChatSendParams): Promise<ChatSendResponse> { ... }
```

---

## MCP 层改造

### data_source.add — typeDef 必填

```typescript
// MCP data_source tool: add action
add: defineAction({
  schema: z.object({
    projectId: z.string(),
    screenId: z.string(),
    name: z.string(),
    type: z.enum(['static', 'api']),
    endpoint: z.object({ ... }),

    // ═══ 新增必填字段 ═══
    typeDef: z.object({
      responseName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/)
        .describe('响应类型名，PascalCase。如 "Message", "UserProfile", "ChatSendResponse"'),
      responseShape: z.enum(['array', 'object']),
      responseFields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        optional: z.boolean().optional(),
        description: z.string().optional(),
      })),
      paramsName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/).optional(),
      paramsFields: z.array(z.object({ ... })).optional(),
    }).describe('类型定义。AI 必须根据接口设计提供完整的 TypeScript 类型信息'),
  }),
})
```

### state.data_set_init — dataTypes 可选（创建时填写）

在 `state.data_set_init` 操作中增加 `typeAnnotation` 参数：
```typescript
data_set_init: defineAction({
  schema: z.object({
    projectId: z.string(),
    screenId: z.string(),
    key: z.string(),
    value: z.unknown(),
    // 新增
    typeAnnotation: z.object({
      typeName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/),
      isArray: z.boolean(),
    }).optional().describe('类型注解。如 { typeName: "Message", isArray: true }'),
  }),
})
```

---

## Codegen Parser 改造

```typescript
// parser 优先读取 typeDef，没有才 fallback

function extractDataState(screen: Screen): DataStateIR[] {
  const dataInit = screen.stateInit?.data;
  const dataTypes = screen.stateInit?.dataTypes;
  if (!dataInit) return [];

  return Object.entries(dataInit).map(([key, value]) => {
    // 优先用显式类型注解
    const annotation = dataTypes?.[key];
    let type: string;
    if (annotation) {
      type = annotation.isArray ? `${annotation.typeName}[]` : annotation.typeName;
    } else {
      // Fallback: 标记为需要 AI 补全
      // codegen 先用占位类型，后续通过 AI 接口一键补全
      type = `TODO_${toPascalCase(key)}${Array.isArray(value) ? '[]' : ''}`;
    }

    return { name: key, pascalName: toPascalCase(key), type, defaultValue: '[]' };
  });
}

function inferResponseType(ds: ApiDataSource): string {
  // 优先用 typeDef
  if (ds.typeDef) {
    const { responseName, responseShape } = ds.typeDef;
    return responseShape === 'array' ? `${responseName}[]` : responseName;
  }
  // Fallback: 占位标记，提示需要补全 typeDef
  return `TODO_${toPascalCase(ds.name)}Response`;
}
```

### Fallback 策略：AI 一键补全

当 Schema 中缺少 typeDef 时，codegen 不应该"猜"——应该提示用户补全，或调用 AI 接口自动补全。

**流程**：
```
1. codegen 发现 DataSource 缺少 typeDef
   ↓
2. 选项 A（CLI 交互模式）：
   提示用户 "chat-list 缺少类型定义，是否调用 AI 补全？[Y/n]"
   → 调用后端 AI 接口，基于 mock 数据 + endpoint 信息推导类型
   → 写入 Schema（通过 MCP data_source.update）
   → 继续 codegen
   
3. 选项 B（CI/批量模式）：
   生成带 TODO 注释的代码：
   // TODO: 请通过 AI 补全 chat-list 的 typeDef
   export type ChatListResponse = unknown[];
   
4. 选项 C（页面一键补全）：
   编辑器里点"AI 补全类型"按钮
   → 遍历所有缺失 typeDef 的 DataSource
   → AI 分析 mock 数据 → 填充 typeDef
   → 下次 codegen 就有完整类型了
```

**AI 补全接口设计**：
```typescript
// 后端 AI 接口
POST /api/ai/infer-types
Body: {
  projectId: string;
  dataSourceIds?: string[];  // 不传则补全所有缺失的
}
Response: {
  results: {
    dataSourceId: string;
    typeDef: DataSourceTypeDef;  // AI 推导出的类型定义
  }[];
}
```

AI 推导依据：
- `mock.responseBody` 的结构（最直接）
- `endpoint.body` 的参数结构
- `stateInit.data` 的初始值结构
- 同一 screen 内其他 DataSource 的类型（关联推导）

---

## AI Rules 补充

在 AI_RULES.md 增加 DataSource 类型定义规范：

```markdown
### DataSource 类型定义规范

创建 API DataSource 时，必须提供 typeDef：

✅ 正确：
```
data_source.add({
  name: "chat-list",
  type: "api",
  endpoint: { method: "GET", path: "/chat/list" },
  typeDef: {
    responseName: "Message",
    responseShape: "array",
    responseFields: [
      { name: "id", type: "string" },
      { name: "role", type: "'user' | 'assistant'" },
      { name: "text", type: "string" }
    ]
  }
})
```

❌ 错误：不填 typeDef（codegen 无法生成正确的类型定义）

命名规范：
- responseName: PascalCase，描述数据实体（"Message" 不是 "ChatListResponse"）
- 数组响应：responseName 是单个 item 的类型名
- 对象响应：responseName 是整个响应的类型名
- paramsName: PascalCase + "Params" 后缀
```

---

## 前端编辑器（后续）

1. **DataSource 编辑面板** — 新增"类型定义"区域
   - 类型名输入框
   - 字段列表（可增删改）
   - 从 Mock 数据一键推导按钮（AI 辅助）

2. **一键 AI 补全** — 全项目维度
   - 按钮：「AI 补全类型定义」
   - 遍历所有 DataSource，有 mock 数据但没 typeDef 的 → AI 分析并填充
   - 遍历所有 stateInit.data，没有 dataTypes 的 → AI 从上下文推导

---

## 实施步骤

| 步骤 | 范围 | 内容 |
|---|---|---|
| 1 | `design-schema` | 新增 `DataSourceTypeDef`、`TypeField`、`DataTypeAnnotation` 类型 |
| 2 | `design-schema` | `ApiDataSource` 加 `typeDef?` 字段，`ScreenStateInit` 加 `dataTypes?` |
| 3 | `design-operations` | 支持 `typeDef` 在 data_source.add/update 中持久化 |
| 4 | MCP `data_source.add` | typeDef 必填（Zod schema） |
| 5 | MCP `data_source.update` | typeDef 可选（修改时不强制） |
| 6 | MCP `state.data_set_init` | typeAnnotation 可选 |
| 7 | `design-codegen` parser | 优先读 typeDef/dataTypes，fallback 稳定规则 |
| 8 | `AI_RULES.md` | 补充 DataSource 类型定义规范 |
| 9 | 前端（后续） | DataSource 面板 + AI 一键补全 |
