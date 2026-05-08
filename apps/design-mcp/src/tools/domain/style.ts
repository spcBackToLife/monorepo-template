/**
 * 样式操作 — 合并原 3 个工具为 1 个
 * 原：update_style / reset_style / batch_update_style
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerStyleTools(server: McpServer): void {
  registerDomainTool(server, 'style', 'CSS 样式修改与批量操作', {
    update: defineAction({
      description: '修改指定元素的 CSS 样式（backgroundColor/fontSize/padding/display/flexDirection 等）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).describe('CSS 属性键值对'),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'style.update', params: { nodeId: p.nodeId, styles: p.styles } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    reset: defineAction({
      description: '重置（删除）某些 CSS 属性，恢复默认值',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), properties: z.array(z.string()) }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'style.reset', params: { nodeId: p.nodeId, properties: p.properties } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    batch_update: defineAction({
      description: '批量更新多个节点的样式',
      schema: z.object({
        projectId: z.string(),
        updates: z.array(z.object({
          nodeId: z.string(), styles: z.record(z.string(), z.union([z.string(), z.number()])),
        })),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'style.batchUpdate', params: { updates: p.updates } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
