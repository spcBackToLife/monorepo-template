import { makeToolError } from './toolResponse.js';

/**
 * 领域工具注册器 — 将多个同领域操作合并为单个带 action 参数的 MCP 工具。
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerDomainTool(
  server: McpServer,
  toolName: string,
  toolDescription: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions: Record<string, any>,
): void {
  const entries = Object.entries(actions);
  if (entries.length === 0) return;

  const actionList = entries.map(([k]) => k);

  // 为每个 action 构造 variant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variants = entries.map(([name, def]) =>
    z.object({
      action: z.literal(name),
      ...(def.schema.shape as any),
    }),
  );

  const fullSchema = z.discriminatedUnion('action', variants);

  const actionDescriptions = entries
    .map(([name, def]) => `  - ${name}: ${def.description}`)
    .join('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool(
    toolName,
    {
      description: `${toolDescription}\n\n可用操作 (action):\n${actionDescriptions}`,
      inputSchema: fullSchema as unknown as Record<string, z.ZodTypeAny>,
    },
    async (rawParams) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = rawParams as any;
      const actionKey = params.action;

      const def = actions[actionKey];
      if (!def) {
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify({ error: `未知操作 "${actionKey}"，可用操作: ${actionList.join(', ')}` }) },
          ],
          isError: true,
        };
      }

      const { action: _action, ...rest } = params;
      try {
        return await def.handler(rest);
      } catch (err) {
        return makeToolError(toolName, actionKey, err);
      }
    },
  );
}
