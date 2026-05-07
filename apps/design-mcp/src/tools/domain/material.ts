/**
 * 素材库工具 — 合并原 4 个独立工具为 1 个带 action 的工具
 * 原：search_materials / upload_material / get_material / update_material_meta
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerMaterialTools(server: McpServer): void {
  registerDomainTool(server, 'material', '素材库管理（搜索/上传/查询/元数据）', {
    search: defineAction({
      description: '搜索项目素材库中的素材资源。支持按分类和关键词过滤，返回匹配的素材列表',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        category: z.enum(['image', 'icon', 'animation', 'video', 'other']).optional(),
        search: z.string().optional(),
      }),
      handler: async (args) => {
        const { projectId, category, search } = args;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(await apiClient.searchMaterials(projectId, { category, search }), null, 2) }],
        };
      },
    }),
    upload: defineAction({
      description: '将素材通过 URL 上传到项目素材库。上传后可在素材库中检索和使用',
      schema: z.object({
        projectId: z.string(), url: z.string(),
        name: z.string().optional(), category: z.enum(['image','icon','animation','video','other']).optional(),
        tags: z.array(z.string()).optional(),
      }),
      handler: async (args) => {
        const { projectId, url: materialUrl, name, category, tags } = args;
        try {
          const res = await fetch(materialUrl);
          if (!res.ok) return { content: [{ type: 'text' as const, text: JSON.stringify({ status:'error', error:{ code:'NETWORK_ERROR', message:`HTTP ${res.status}`, toolName:'material', action:'upload' } }) }], isError: false };
          const ct = res.headers.get('content-type') ?? 'application/octet-stream';
          const buf = Buffer.from(await res.arrayBuffer());
          const orig = name ?? new URL(materialUrl).pathname.split('/').pop() ?? 'uploaded-material';
          const fd = new FormData(); fd.append('file', new Blob([buf], { type: ct }), orig);
          const BASE = process.env.DESIGN_API_URL ?? 'http://localhost:3001';
          const up = await fetch(`${BASE}/api/projects/${projectId}/materials/upload`, { method: 'POST', body: fd });
          if (!up.ok) return { content: [{ type: 'text' as const, text: JSON.stringify({ status:'error', error:{ code:'API_ERROR', message: await up.text(), toolName:'material', action:'upload' } }) }], isError: false };
          const result = await up.json();
          if (tags || category) { const mid = (result as Record<string,string>).id; if (mid) await apiClient.updateMaterialMeta(projectId, mid, { ...(category?{category}:{}), ...(tags?{tags}:{}) }); }
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ status:'error', error:{ code:'INTERNAL_ERROR', message: String(err), toolName:'material', action:'upload' } }) }], isError: false };
        }
      },
    }),
    get: defineAction({
      description: '获取素材的详细信息（URL、缩略图、元数据、标签等）',
      schema: z.object({ projectId: z.string(), materialId: z.string() }),
      handler: async (p) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await apiClient.getMaterial(p.projectId, p.materialId), null, 2) }] }),
    }),
    update_meta: defineAction({
      description: '更新素材的元数据（名称、分类、标签）',
      schema: z.object({ projectId: z.string(), materialId: z.string(), originalName: z.string().optional(), category: z.string().optional(), tags: z.array(z.string()).optional() }),
      handler: async (p) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await apiClient.updateMaterialMeta(p.projectId, p.materialId, { originalName: p.originalName, category: p.category, tags: p.tags }), null, 2) }] }),
    }),
  });
}
