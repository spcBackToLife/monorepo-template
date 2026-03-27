import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerStyleTools(server: McpServer): void {
  server.registerTool(
    'update_style',
    {
      description:
        '修改指定元素的 CSS 样式（如 backgroundColor、fontSize、padding、display、flexDirection 等）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标节点 ID'),
        styles: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .describe('要更新的 CSS 属性键值对'),
      },
    },
    async ({ projectId, nodeId, styles }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateStyle',
        params: { nodeId, styles },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'reset_style',
    {
      description: '重置（删除）指定元素的某些 CSS 属性，恢复为默认值',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标节点 ID'),
        properties: z
          .array(z.string())
          .describe('要重置的 CSS 属性名列表'),
      },
    },
    async ({ projectId, nodeId, properties }) => {
      const result = await api.executeOperation(projectId, {
        type: 'resetStyle',
        params: { nodeId, properties },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
