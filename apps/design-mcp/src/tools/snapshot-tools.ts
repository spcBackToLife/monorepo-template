import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';
import { makeToolError } from './helpers/toolResponse.js';

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
        '生成指定屏幕的截图快照。返回 jobId 用于后续查询结果。\n' +
        'mode：viewport=按设备首屏（默认，向后兼容）；frame=按 Frame 完整高度截长页面；multi-viewport=多设备并排（P1 待实现）。',
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
        mode: z
          .enum(['viewport', 'frame', 'multi-viewport'])
          .optional()
          .describe(
            '截图模式（默认 viewport）。frame=按 Frame 完整高度截长页面，看长内容全貌；' +
              'multi-viewport=多 viewport 并排（P1 待实现，调用会报 not implemented）。',
          ),
      },
    },
    async ({ projectId, screenIds, viewportIds, format, mode }) => {
      try {
        const result = await api.generateSnapshots(projectId, {
          screenIds,
          viewportIds,
          format,
          mode,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return makeToolError('generate_snapshots', undefined, err);
      }
    },
  );
}
