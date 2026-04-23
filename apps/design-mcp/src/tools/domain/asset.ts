/**
 * 组件模板资产 — 合并原 asset.ts 中 9 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generateTemplateId } from '@globallink/design-schema';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
import type { DomainToolParams } from './domainToolParams.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as api from '../../api-client.js';

export function registerAssetTools(server: McpServer): void {
  registerDomainTool(server, 'asset', '组件模板资产的实例化/保存/CRUD/同步/脱离引用', {
    instantiate: {
      description: '从组件资产库实例化一个组件到指定位置',
      schema: z.object({ projectId: z.string(), templateId: z.string(), parentId: z.string(), position: z.number().optional() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'instantiateTemplate', params: { templateId: p.templateId, parentId: p.parentId, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    save_as_template: {
      description: '将节点子树保存为可复用的组件资产模板',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), name: z.string(), category: z.string(),
        tags: z.array(z.string()).optional(), description: z.string().optional(),
      }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'saveAsTemplate', params: { nodeId: p.nodeId, name: p.name, category: p.category, tags: p.tags, description: p.description, templateId: generateTemplateId() } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    list: {
      description: '列出可用组件资产（项目级/团队级/全局）',
      schema: z.object({ scope: z.enum(['project','team','global']).optional(), projectId: z.string().optional() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.listAssets(p.scope, p.projectId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    detach_instance: {
      description: '将组件实例设为脱离模板（不再随模板更新同步）',
      schema: z.object({ projectId: z.string(), nodeId: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'detachInstance', params: { nodeId: p.nodeId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    sync_instance: {
      description: '从关联模板重新同步实例结构（需仍为引用模式）',
      schema: z.object({ projectId: z.string(), nodeId: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'syncInstance', params: { nodeId: p.nodeId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    update_template: {
      description: '更新组件模板属性（名称/分类/描述）',
      schema: z.object({ projectId: z.string(), templateId: z.string(), patch: z.record(z.string(), z.unknown()) }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'updateTemplate', params: { templateId: p.templateId, patch: p.patch } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    delete_template: {
      description: '删除组件模板',
      schema: z.object({ projectId: z.string(), templateId: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'deleteTemplate', params: { templateId: p.templateId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    duplicate_template: {
      description: '复制组件模板',
      schema: z.object({ projectId: z.string(), sourceTemplateId: z.string(), newName: z.string().optional() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'duplicateTemplate', params: { sourceTemplateId: p.sourceTemplateId, newName: p.newName } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
