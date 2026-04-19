import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Operation } from '@globallink/design-operations';
import * as api from '../api-client.js';
import { makeToolError } from './helpers/toolResponse.js';

/**
 * 暴露 design-api batch 端点，便于 MCP 客户端自行编排多步（无需为每种场景单独做工具）。
 */
export function registerBatchTool(server: McpServer): void {
  server.registerTool(
    'execute_operations_batch',
    {
      description:
        '在同一请求中原子执行多条 Operation（与前端 POST .../operations/batch 一致）。若要把素材工程绑定到某 div 且可在编辑器里打开「设计素材…」，除 applyMaterialDesign 外还须写入 **material-slots**（推荐直接用 canvas.export_and_apply，会自动建槽位）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        operations: z
          .array(z.unknown())
          .describe('Operation[]，每项含 type 与 params，参见 design_workspace_versions'),
      },
    },
    async ({ projectId, operations }) => {
      try {
        const result = await api.executeBatch(projectId, operations as Operation[]);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return makeToolError('execute_operations_batch', undefined, err);
      }
    },
  );
}
