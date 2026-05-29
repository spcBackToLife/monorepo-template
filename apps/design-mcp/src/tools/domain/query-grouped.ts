/**
 * 查询工具 — 合并原 3 个工具为 1 个
 * 原：get_project_info / get_screen_schema / list_screens
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerQueryTools(server: McpServer): void {
  registerDomainTool(server, 'query', '项目信息查询、屏幕列表、屏幕 Schema 获取', {
    project_info: defineAction({
      description: '获取设计项目的基本信息（名称、平台、屏幕列表、视口、资产数量）',
      schema: z.object({ projectId: z.string() }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        return { content: [{ type:'text', text: JSON.stringify({
          id: prj.id, name: prj.name, platform: prj.platform,
          currentViewport: prj.currentViewport, screenCount: prj.screens.length,
          screens: prj.screens.map(s=>({id:s.id,name:s.name})),
          componentAssetsCount: prj.componentAssets.length,
        }, null, 2) }] };
      },
    }),
    create_project: defineAction({
      description: '创建一个新的设计项目，返回 projectId',
      schema: z.object({ name: z.string(), platform: z.string().optional().default('mobile') }),
      handler: async (p) => {
        const result = await apiClient.createProject({ name: p.name, platform: p.platform });
        return { content: [{ type:'text', text: JSON.stringify(result, null, 2) }] };
      },
    }),
    list_projects: defineAction({
      description: '列出所有设计项目',
      schema: z.object({}),
      handler: async () => {
        const result = await apiClient.listProjects();
        return { content: [{ type:'text', text: JSON.stringify(result, null, 2) }] };
      },
    }),
    screen_schema: defineAction({
      description: '获取指定屏幕的完整 Schema（组件树、样式、交互、状态）',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        const scr = prj.screens.find(s => s.id === p.screenId);
        if (!scr) return { content: [{ type:'text' as const, text: JSON.stringify({ status:'error', error:{ code:'NOT_FOUND', message:`屏幕 ${p.screenId} 不存在`, toolName:'query', action:'screen_schema' } }, null, 2) }], isError: false };
        return { content: [{ type:'text', text: JSON.stringify(scr, null, 2) }] };
      },
    }),
    list_screens: defineAction({
      description: '列出项目的所有屏幕（ID、名称）',
      schema: z.object({ projectId: z.string() }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        return { content: [{ type:'text', text: JSON.stringify(prj.screens.map(s=>({id:s.id,name:s.name})), null, 2) }] };
      },
    }),
    integrity: defineAction({
      description:
        '完成度对账（Schema-First）：基于真实 schema 检查"声明 vs 产物"是否一致。' +
        '规则：R-EVENTS-01（节点声明了交互意图但 events 缺 interactive trigger）、' +
        'R-EVENTS-02（event 没 actions）、R-STATUS-01（ready.events=true 但事件空—假完成）、' +
        'R-PHASE-01（phase=verified 但 ready 仍有 false）等。' +
        '不指定 screenId 则校验整个项目。',
      schema: z.object({
        projectId: z.string(),
        screenId: z.string().optional().describe('可选：仅校验此屏'),
      }),
      handler: async (p) => {
        const result = await apiClient.getProjectIntegrity(p.projectId, p.screenId);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
