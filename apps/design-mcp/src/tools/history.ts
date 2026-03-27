import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerHistoryTools(server: McpServer): void {
  server.registerTool(
    'undo',
    {
      description: '撤销最后一次操作',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
      },
    },
    async ({ projectId }) => {
      const result = await api.undo(projectId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'redo',
    {
      description:
        '重做被撤销的操作（注意：当前后端使用快照模式实现 undo，redo 暂不可用）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
      },
    },
    async ({ projectId: _projectId }) => {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Redo 功能尚未在后端实现。请使用 undo 进行撤销操作。',
          },
        ],
        isError: true,
      };
    },
  );
}
