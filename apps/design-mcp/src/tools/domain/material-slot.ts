/**
 * 素材槽位管理 — 合并原 4 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _api from '../../api-client.js';

export function registerMaterialSlotTools(server: McpServer): void {
  registerDomainTool(server, 'material_slot', '素材槽位 CRUD（节点 ↔ 素材工程多对多绑定）', {
    list_by_node: {
      description: '查询节点的所有素材槽位（含工程摘要、cssTarget、isActive 等）',
      schema: z.object({ projectId: z.string(), nodeId: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.findSlotsByNode(p.projectId, p.nodeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    create: {
      description: '创建槽位，将素材工程绑定到节点的某个用途（default/hover/decoration 等）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), materialProjectId: z.string(),
        slotName: z.string().optional().describe('默认 "default"'),
        sortOrder: z.number().optional(), cssTarget: z.string().optional().describe('默认 "background-image"'),
        isActive: z.boolean().optional(),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.createSlot(p.projectId, { nodeId: p.nodeId, materialProjectId: p.materialProjectId, slotName: p.slotName, sortOrder: p.sortOrder, cssTarget: p.cssTarget, isActive: p.isActive });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    update: {
      description: '更新槽位的属性（名称/绑定的工程/CSS目标/激活状态）',
      schema: z.object({
        projectId: z.string(), slotId: z.string(),
        slotName: z.string().optional(), materialProjectId: z.string().optional(),
        sortOrder: z.number().optional(), cssTarget: z.string().optional(), isActive: z.boolean().optional(),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const { slotId, ...rest } = p;
        const result = await api2.default.updateSlot(p.projectId, slotId, rest as any);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    delete: {
      description: '删除槽位（解除关联，不删素材工程本身）',
      schema: z.object({ projectId: z.string(), slotId: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        await api2.default.deleteSlot(p.projectId, p.slotId);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
      },
    },
  });
}
