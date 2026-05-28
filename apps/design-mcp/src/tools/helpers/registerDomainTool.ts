import { makeToolError } from './toolResponse.js';

/**
 * 领域工具注册器 — 将多个同领域操作合并为单个带 action 参数的 MCP 工具。
 *
 * ⚡ 加固策略：
 *   不依赖 MCP SDK 的自动 Zod 验证（SDK 层验证失败会绕过我们的 try-catch，
 *   导致 AI 看到原始 "MCP tool execution failed" 而非结构化错误）。
 *   改为：向 SDK 注册宽松 schema（accepts any object），
 *   在 handler 内部手动 safeParse，捕获所有 Zod 错误并转为 ToolError。
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** MCP tool handler return type */
type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

/**
 * 递归判断一个 Zod schema 是否期望 object 或 array 类型的值。
 * 支持 unwrap：ZodOptional / ZodNullable / ZodDefault / ZodUnion / ZodDiscriminatedUnion。
 */
function isObjectOrArraySchema(schema: z.ZodTypeAny): boolean {
  if (!schema || !schema._def) return false;
  const typeName = schema._def.typeName as string;

  // 直接是 object/array/record 类型
  if (
    typeName === 'ZodObject' ||
    typeName === 'ZodArray' ||
    typeName === 'ZodRecord' ||
    typeName === 'ZodTuple'
  ) {
    return true;
  }

  // Wrapper 类型：递归检查内部
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
    return isObjectOrArraySchema(schema._def.innerType);
  }

  // Union：任一分支是 object/array 即视为需要 parse
  if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
    const options: z.ZodTypeAny[] = schema._def.options ?? [];
    return options.some(opt => isObjectOrArraySchema(opt));
  }

  return false;
}

/**
 * 递归判断一个 Zod schema 是否期望 number 类型的值。
 */
function isNumberSchema(schema: z.ZodTypeAny): boolean {
  if (!schema || !schema._def) return false;
  const typeName = schema._def.typeName as string;

  if (typeName === 'ZodNumber') return true;

  // Wrapper 类型：递归检查内部
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
    return isNumberSchema(schema._def.innerType);
  }

  return false;
}

/**
 * 递归判断一个 Zod schema 是否期望 boolean 类型的值。
 */
function isBooleanSchema(schema: z.ZodTypeAny): boolean {
  if (!schema || !schema._def) return false;
  const typeName = schema._def.typeName as string;

  if (typeName === 'ZodBoolean') return true;

  if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
    return isBooleanSchema(schema._def.innerType);
  }

  return false;
}

/**
 * 预处理参数：将 MCP 客户端误传为 JSON 字符串的 object/array 字段还原为对象。
 * 同时处理 number 和 boolean 类型的字符串→原始类型转换。
 *
 * 仅对标记的字段执行尝试；若 parse 失败则保持原值
 * （让后续 Zod 校验给出精确错误信息）。
 */
function coerceStringifiedObjects(
  params: Record<string, unknown>,
  objectFields: Set<string>,
  numberFields?: Set<string>,
  booleanFields?: Set<string>,
): Record<string, unknown> {
  // 处理 object/array 字段
  for (const field of objectFields) {
    const val = params[field];
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          params[field] = JSON.parse(val);
        } catch {
          // parse 失败保持原值，由 Zod 报错
        }
      }
    }
  }

  // 处理 number 字段
  if (numberFields) {
    for (const field of numberFields) {
      const val = params[field];
      if (typeof val === 'string' && val.trim() !== '') {
        const num = Number(val);
        if (!isNaN(num)) {
          params[field] = num;
        }
      }
    }
  }

  // 处理 boolean 字段
  if (booleanFields) {
    for (const field of booleanFields) {
      const val = params[field];
      if (typeof val === 'string') {
        if (val === 'true') params[field] = true;
        else if (val === 'false') params[field] = false;
      }
    }
  }

  return params;
}

/**
 * 单个 action 定义，handler 参数类型从 schema 的 z.infer<S> 自动推导。
 *
 * schema 约束为 z.ZodObject — 保证：
 *   1. handler(params) 拥有精确字段类型
 *   2. registerDomainTool 内部可安全访问 schema.shape 构造 discriminatedUnion
 */
interface ActionDef<S extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  description: string;
  schema: S;
  handler: (params: z.infer<S>) => ToolResult | Promise<ToolResult>;
}

/**
 * 工具函数：创建类型安全的 action 定义。
 * 泛型 S 由 schema 自动推导，handler 的 params 获得精确类型。
 *
 * @example
 * defineAction({
 *   description: '切换视口',
 *   schema: z.object({ projectId: z.string(), width: z.number() }),
 *   handler: async (p) => {
 *     // p.projectId: string ✅  p.width: number ✅
 *   },
 * })
 */
export function defineAction<S extends z.ZodObject<z.ZodRawShape>>(def: ActionDef<S>): ActionDef<S> {
  return def;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyActionDef = ActionDef<any>;

export function registerDomainTool(
  server: McpServer,
  toolName: string,
  toolDescription: string,
  actions: Record<string, AnyActionDef>,
): void {
  const entries = Object.entries(actions);
  if (entries.length === 0) return;

  const actionList = entries.map(([k]) => k);

  // 为每个 action 构造 variant
  const variants = entries.map(([name, def]) =>
    z.object({
      action: z.literal(name),
      ...def.schema.shape,
    }),
  );

  // Zod discriminatedUnion 要求每个 variant 的 shape 包含 discriminator key。
  // 我们显式构造了 `action: z.literal(name)`，但 TS 推导丢失了这个信息。
  // 用精确的 ZodDiscriminatedUnionOption 类型断言。
  type ActionVariant = z.ZodObject<{ action: z.ZodTypeAny } & z.ZodRawShape>;
  const fullSchema = z.discriminatedUnion(
    'action',
    variants as [ActionVariant, ...ActionVariant[]],
  );

  const actionDescriptions = entries
    .map(([name, def]) => `  - ${name}: ${def.description}`)
    .join('\n');

  // ── 提取各 action 的可用字段名，用于错误提示 ──
  const actionFieldMap: Record<string, string[]> = {};
  for (const [name, def] of entries) {
    actionFieldMap[name] = Object.keys(def.schema.shape);
  }

  // ── 提取各 action 中期望为 object/array 的字段名，用于自动 JSON.parse 字符串 ──
  //
  // 背景：looseInputSchema 用 passthrough() 不声明具体字段类型，
  // 导致 MCP 客户端生成的 JSON Schema 里 additionalProperties=true 但无类型提示。
  // 某些客户端（包括 Claude MCP）会把本应是 object/array 的参数序列化为 JSON 字符串。
  // 在此预处理阶段，根据各 action 的 Zod schema 推断哪些字段应是 object/array，
  // 若实际收到 string，则尝试 JSON.parse 还原。
  const actionObjectFields: Record<string, Set<string>> = {};
  for (const [name, def] of entries) {
    const objFields = new Set<string>();
    for (const [fieldName, fieldSchema] of Object.entries(def.schema.shape)) {
      if (isObjectOrArraySchema(fieldSchema as z.ZodTypeAny)) {
        objFields.add(fieldName);
      }
    }
    actionObjectFields[name] = objFields;
  }

  // ── 提取各 action 中期望为 number / boolean 的字段名 ──
  const actionNumberFields: Record<string, Set<string>> = {};
  const actionBooleanFields: Record<string, Set<string>> = {};
  for (const [name, def] of entries) {
    const numFields = new Set<string>();
    const boolFields = new Set<string>();
    for (const [fieldName, fieldSchema] of Object.entries(def.schema.shape)) {
      if (isNumberSchema(fieldSchema as z.ZodTypeAny)) {
        numFields.add(fieldName);
      }
      if (isBooleanSchema(fieldSchema as z.ZodTypeAny)) {
        boolFields.add(fieldName);
      }
    }
    actionNumberFields[name] = numFields;
    actionBooleanFields[name] = boolFields;
  }

  // 🔒 宽松 schema：让 SDK 放行所有参数，由我们在 handler 里手动验证
  //
  // ⚠️ 关键陷阱（2026-05-06 修复）：
  // 之前用 `Record<string, ZodTypeAny>` raw shape 形式，SDK 内部会用
  // `z.object(shape)` 包装，默认是 **strip 模式** —— 未声明的字段（如
  // projectId / nodeId 等业务参数）会在 SDK 的 validateToolInput 阶段
  // 被静默丢弃，导致我们 handler 里的 fullSchema.safeParse 永远抱怨
  // "projectId: Required (收到值: undefined)"。
  //
  // 修复：直接传一个 **完整的 ZodObject 实例 + passthrough()**，
  // SDK 的 getZodSchemaObject 检测到是 schema 实例就会原样使用，
  // 未声明字段全部透传给 handler，由我们的 fullSchema 二次校验。
  const looseInputSchema = z
    .object({ action: z.string() })
    .passthrough();

  server.registerTool(
    toolName,
    {
      description: `${toolDescription}\n\n可用操作 (action):\n${actionDescriptions}`,
      inputSchema: looseInputSchema,
    },
    async (rawParams) => {
      const params = rawParams as Record<string, unknown>;
      const actionKey = String(params.action ?? '');

      // ── 1. action 存在性检查 ──
      if (!actionKey) {
        return makeStructuredError(toolName, undefined, 'VALIDATION_ERROR',
          `缺少必填参数 "action"。可用操作: ${actionList.join(', ')}`,
          `请在参数中指定 action 字段，值为以下之一: ${actionList.join(', ')}`,
        );
      }

      const def = actions[actionKey];
      if (!def) {
        return makeStructuredError(toolName, actionKey, 'VALIDATION_ERROR',
          `未知操作 "${actionKey}"，可用操作: ${actionList.join(', ')}`,
          `action 值有误，请使用以下有效操作之一: ${actionList.join(', ')}`,
        );
      }

      // ── 2. 预处理：将 MCP 客户端误传的字符串类型还原为正确类型 ──
      const objectFields = actionObjectFields[actionKey];
      const numberFields = actionNumberFields[actionKey];
      const booleanFields = actionBooleanFields[actionKey];
      coerceStringifiedObjects(
        params,
        objectFields ?? new Set(),
        numberFields,
        booleanFields,
      );

      // ── 3. 手动 Zod 验证（核心加固点）──
      const parseResult = fullSchema.safeParse(params);
      if (!parseResult.success) {
        const zodErr = parseResult.error;
        const fieldErrors = zodErr.issues?.map(i => {
          const path = i.path.join('.');
          return `  • 字段 "${path}": ${i.message} (收到值: ${JSON.stringify(params?.[String(i.path?.[0] ?? '__root__')])})`;
        }) ?? [];

        const expectedFields = actionFieldMap[actionKey] ?? [];
        return makeStructuredError(toolName, actionKey, 'VALIDATION_ERROR',
          `参数校验失败 (${fieldErrors.length} 个问题):\n${fieldErrors.join('\n')}`,
          [
            `操作 "${actionKey}" 的必填参数: [${expectedFields.join(', ')}]`,
            `请检查参数名拼写是否正确（注意大小写和下划线风格）`,
            `常见问题: materialId vs materialProjectId, nodeId vs node_id 等`,
          ].join('\n'),
        );
      }

      // ── 4. 执行业务逻辑 ──
      const rest = Object.fromEntries(
        Object.entries(params).filter(([k]) => k !== 'action'),
      );
      try {
        return await def.handler(rest);
      } catch (err) {
        return makeToolError(toolName, actionKey, err);
      }
    },
  );
}

// ── 内联辅助：构造结构化错误（不走 makeToolError，避免重复包装）──
//
// ⚠️ 注意：返回 `isError: false` 是**有意**的。
//   某些 MCP 客户端（包括 CodeBuddy IDE）看到 isError:true 会把 content
//   整段丢弃，只给 AI 看 "MCP tool execution failed"。
//   通过 isError:false + JSON body 里的 status:"error"，AI 永远能拿到结构化错误。
//   详见 toolResponse.ts 顶部说明。
function makeStructuredError(
  toolName: string,
  action: string | undefined,
  code: 'VALIDATION_ERROR' | 'API_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR',
  message: string,
  hint: string,
): { content: Array<{ type: 'text'; text: string }>; isError: false } {
  const errorObj = {
    status: 'error' as const,
    error: {
      code,
      message,
      toolName,
      ...(action ? { action } : {}),
      hint,
    },
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(errorObj, null, 2) }],
    isError: false,
  };
}
