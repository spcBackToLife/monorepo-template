/**
 * 素材工程管理 — 合并原 6 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerMaterialProjectTools(server: McpServer): void {
  registerDomainTool(server, 'material_project', '素材工程的 CRUD 与节点关联查询', {
    create: defineAction({
      description: '创建素材编辑工程（持久化到后端），返回 materialId 用于后续画布操作',
      schema: z.object({
        projectId: z.string(), name: z.string(), targetNodeId: z.string().optional(),
        canvasWidth: z.number().positive().optional(), canvasHeight: z.number().positive().optional(),
        backgroundColor: z.string().optional(), referenceFrameWidth: z.number().positive().optional(),
        referenceFrameHeight: z.number().positive().optional(), tags: z.array(z.string()).optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.createMaterialProject(p.projectId, {
          name: p.name, targetNodeId: p.targetNodeId,
          canvasWidth: p.canvasWidth ?? 600, canvasHeight: p.canvasHeight ?? 400,
          backgroundColor: p.backgroundColor,
          referenceFrameWidth: p.referenceFrameWidth, referenceFrameHeight: p.referenceFrameHeight, tags: p.tags,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    list: defineAction({
      description: '列出项目下所有素材工程摘要（可按节点/关键词过滤）',
      schema: z.object({ projectId: z.string(), targetNodeId: z.string().optional(), search: z.string().optional() }),
      handler: async (p) => {
        const result = await apiClient.listMaterialProjects(p.projectId, { targetNodeId: p.targetNodeId, search: p.search });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    get: defineAction({
      description: '获取素材工程详细信息（含画布 JSON）',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.getMaterialProject(p.projectId, p.materialId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    delete: defineAction({
      description: '删除素材工程（不可恢复）',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => {
        await apiClient.deleteMaterialProject(p.projectId, p.materialId);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
      },
    }),
    find_by_node: defineAction({
      description: '按设计 Schema 节点查找关联的素材工程（返回最近一个）',
      schema: z.object({ projectId: z.string(), nodeId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.findMaterialProjectByNode(p.projectId, p.nodeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    find_all_by_node: defineAction({
      description: '按节点查找所有关联的素材工程（一对多）',
      schema: z.object({ projectId: z.string(), nodeId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.findAllMaterialProjectsByNode(p.projectId, p.nodeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
