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

      // ── 2. 手动 Zod 验证（核心加固点）──
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

      // ── 3. 执行业务逻辑 ──
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
