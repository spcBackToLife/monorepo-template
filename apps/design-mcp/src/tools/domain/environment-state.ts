/**
 * 环境态 — 合并原 4 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _api from '../../api-client.js';

export function registerEnvironmentTools(server: McpServer): void {
  registerDomainTool(server, 'environment_state', '项目级环境变量（environmentStates）的 CRUD、预览、绑定', {
    list: {
      description: '列出项目的所有环境变量',
      schema: z.object({ projectId: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js') as any;
        const proj = await api2.default.getProject(p.projectId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(proj.environmentStates ?? [], null, 2) }] };
      },
    },
    add: {
      description: '添加项目级环境变量',
      schema: z.object({ projectId: z.string(), name: z.string(), label: z.string(), values: z.array(z.object({ value:z.string(), label:z.string() })), defaultValue: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addEnvironmentState', params: { name:p.name, label:p.label, values:p.values, defaultValue:p.defaultValue } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    set_preview: {
      description: '切换环境态预览值',
      schema: z.object({ projectId: z.string(), variableName: z.string(), value: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'setEnvironmentPreview', params: { variableName:p.variableName, value:p.value } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    add_binding: {
      description: '为节点添加环境态绑定',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), variableName: z.string(), value: z.string(),
        styles: z.record(z.string(), z.union([z.string(),z.number()])).optional(),
        props: z.record(z.string(), z.unknown()).optional(), visible: z.boolean().optional(),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addEnvironmentBinding', params: { nodeId:p.nodeId, binding:{ variableName:p.variableName, value:p.value, styles:p.styles, props:p.props, visible:p.visible } } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
