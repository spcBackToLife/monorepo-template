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

interface ActionDef {
  description: string;
  schema: z.ZodType<unknown>;
  handler: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>;
}

export function registerDomainTool(
  server: McpServer,
  toolName: string,
  toolDescription: string,
  actions: Record<string, ActionDef>,
): void {
  const entries = Object.entries(actions);
  if (entries.length === 0) return;

  const actionList = entries.map(([k]) => k);

  // 为每个 action 构造 variant
  const variants = entries.map(([name, def]) =>
    z.object({
      action: z.literal(name),
      ...(def.schema.shape as Record<string, z.ZodTypeAny>),
    }),
  );

  // Zod 对 discriminatedUnion 的 tuple 推断过严；variants 已保证每项含 action literal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullSchema = z.discriminatedUnion('action', variants as any);

  const actionDescriptions = entries
    .map(([name, def]) => `  - ${name}: ${def.description}`)
    .join('\n');

  // ── 提取各 action 的可用字段名，用于错误提示 ──
  const actionFieldMap: Record<string, string[]> = {};
  for (const [name, def] of entries) {
    const shape = (def.schema?.shape ?? {}) as Record<string, z.ZodTypeAny>;
    actionFieldMap[name] = Object.keys(shape);
  }

  (server as unknown as { registerTool: (...args: Parameters<McpServer['registerTool']>) => void }).registerTool(
    toolName,
    {
      description: `${toolDescription}\n\n可用操作 (action):\n${actionDescriptions}`,
      // 🔒 宽松 schema：让 SDK 放行所有参数，由我们在 handler 里手动验证
      inputSchema: z.object({ action: z.string() }).passthrough() as unknown as Record<string, z.ZodTypeAny>,
    },
    async (rawParams: unknown) => {
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
function makeStructuredError(
  toolName: string,
  action: string | undefined,
  code: 'VALIDATION_ERROR' | 'API_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR',
  message: string,
  hint: string,
): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const errorObj = {
    status: 'error' as const,
    error: {
      code,
      message,
      toolName,
      ...(action ? { action } : {}),
      hint,
    },
    isError: true as const,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(errorObj, null, 2) }],
    isError: true,
  };
}
