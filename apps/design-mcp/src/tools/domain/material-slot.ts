/**
 * 素材槽位管理 — 合并原 4 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerMaterialSlotTools(server: McpServer): void {
  registerDomainTool(server, 'material_slot', '素材槽位 CRUD（节点 ↔ 素材工程多对多绑定）', {
    list_by_node: defineAction({
      description: '查询节点的所有素材槽位（含工程摘要、cssTarget、isActive 等）',
      schema: z.object({ projectId: z.string(), nodeId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.findSlotsByNode(p.projectId, p.nodeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    create: defineAction({
      description: '创建槽位，将素材工程绑定到节点的某个用途（default/hover/decoration 等）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), materialProjectId: z.string(),
        slotName: z.string().optional().describe('默认 "default"'),
        sortOrder: z.number().optional(), cssTarget: z.string().optional().describe('默认 "background-image"'),
        isActive: z.boolean().optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.createSlot(p.projectId, { nodeId: p.nodeId, materialProjectId: p.materialProjectId, slotName: p.slotName, sortOrder: p.sortOrder, cssTarget: p.cssTarget, isActive: p.isActive });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    update: defineAction({
      description: '更新槽位的属性（名称/绑定的工程/CSS目标/激活状态）',
      schema: z.object({
        projectId: z.string(), slotId: z.string(),
        slotName: z.string().optional(), materialProjectId: z.string().optional(),
        sortOrder: z.number().optional(), cssTarget: z.string().optional(), isActive: z.boolean().optional(),
      }),
      handler: async (p) => {
        const { slotId, ...rest } = p;
        const result = await apiClient.updateSlot(p.projectId, slotId, rest);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    delete: defineAction({
      description: '删除槽位（解除关联，不删素材工程本身）',
      schema: z.object({ projectId: z.string(), slotId: z.string() }),
      handler: async (p) => {
        await apiClient.deleteSlot(p.projectId, p.slotId);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
      },
    }),
  });
}
