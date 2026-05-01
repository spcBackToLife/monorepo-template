/**
 * 领域态 — 合并原 7 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
import type { DomainToolParams } from './domainToolParams.js';

function walkCollect(node: { id:string; domainStates?:unknown[]; children?:unknown[] }, out:Array<{ownerType:'node';ownerId:string;variables:unknown[]}>) {
  if (node.domainStates?.length) out.push({ ownerType:'node', ownerId: node.id, variables: node.domainStates });
  for (const c of (node.children??[]) as typeof node[]) walkCollect(c, out);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _api from '../../api-client.js';

export function registerDomainStateTools(server: McpServer): void {
  registerDomainTool(server, 'domain_state', '屏幕级/节点级领域态变量的 CRUD、预览值切换、绑定管理', {
    list: {
      description: '列出指定屏幕上的领域态变量（含屏幕级定义及各容器节点上的 domainStates）',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js') as typeof import('../../api-client.js');
        const proj = await api2.default.getProject(p.projectId);
        const scr = proj.screens?.find((s: { id: string }) => s.id === p.screenId);
        if (!scr) return { content: [{ type:'text', text: JSON.stringify({error:'not found'}) }] };
        const onNodes: Array<{ownerType:'node';ownerId:string;variables:unknown[]}> = [];
        walkCollect(scr.rootNode, onNodes);
        return { content: [{ type:'text', text: JSON.stringify({screenId: scr.id, screenName: scr.name, screenLevel: scr.domainStates ?? [], onNodes }, null, 2) }] };
      },
    },
    add: {
      description: '在屏幕或容器节点上添加领域态变量',
      schema: z.object({
        projectId: z.string(), ownerType: z.enum(['screen','node']), ownerId: z.string(),
        name: z.string(), label: z.string(),
        values: z.array(z.object({ value: z.string(), label: z.string() })), defaultValue: z.string(),
      }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addDomainState', params: { ownerType: p.ownerType, ownerId: p.ownerId, name: p.name, label: p.label, values: p.values, defaultValue: p.defaultValue } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove: {
      description: '删除领域态变量',
      schema: z.object({ projectId: z.string(), ownerType: z.enum(['screen','node']), ownerId: z.string(), variableName: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'removeDomainState', params: { ownerType: p.ownerType, ownerId: p.ownerId, variableName: p.variableName } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    set_preview: {
      description: '切换领域态预览值',
      schema: z.object({ projectId: z.string(), ownerType: z.enum(['screen','node']), ownerId: z.string(), variableName: z.string(), value: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'setDomainStatePreview', params: { ownerType: p.ownerType, ownerId: p.ownerId, variableName: p.variableName, value: p.value } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    add_binding: {
      description: '为节点添加领域态绑定',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), variableName: z.string(), value: z.string(),
        ownerNodeId: z.string().optional(), styles: z.record(z.string(), z.union([z.string(),z.number()])).optional(),
        props: z.record(z.string(), z.unknown()).optional(), visible: z.boolean().optional(),
      }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addDomainStateBinding', params: { nodeId:p.nodeId, binding:{ variableName:p.variableName, value:p.value, ownerNodeId:p.ownerNodeId, styles:p.styles, props:p.props, visible:p.visible } } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    update_binding: {
      description: '更新领域态绑定',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), variableName: z.string(), value: z.string(), patch: z.object({ styles: z.record(z.string(), z.union([z.string(),z.number()])).optional(), props: z.record(z.string(), z.unknown()).optional(), visible: z.boolean().optional() }) }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'updateDomainStateBinding', params: { nodeId:p.nodeId, variableName:p.variableName, value:p.value, patch:p.patch } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove_binding: {
      description: '删除领域态绑定',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), variableName: z.string(), value: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'removeDomainStateBinding', params: { nodeId:p.nodeId, variableName:p.variableName, value:p.value } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
