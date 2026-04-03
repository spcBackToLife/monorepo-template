import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Task 4.7.3 — Snapshot MCP Tools
 *
 * Tool for generating project screenshots via the API.
 * - generate_snapshots
 */
export function registerSnapshotTools(server: McpServer): void {
  server.registerTool(
    'generate_snapshots',
    {
      description:
        '生成指定屏幕的截图快照。返回 jobId 用于后续查询结果。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenIds: z.array(z.string()).describe('要截图的屏幕 ID 列表'),
        viewportIds: z
          .array(z.string())
          .optional()
          .describe('视口 ID 列表（可选，默认使用当前视口）'),
        format: z
          .enum(['png', 'jpeg', 'webp'])
          .optional()
          .describe('图片格式（默认 png）'),
      },
    },
    async ({ projectId, screenIds, viewportIds, format }) => {
      const result = await api.generateSnapshots(projectId, {
        screenIds,
        viewportIds,
        format,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
