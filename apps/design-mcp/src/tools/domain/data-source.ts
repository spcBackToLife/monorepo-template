/**
 * 数据源 — 合并原 7 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generateId } from '@globallink/design-schema';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
import type { DomainToolParams } from './domainToolParams.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _api from '../../api-client.js';

export function registerDataSourceTools(server: McpServer): void {
  registerDomainTool(server, 'data_source', '数据源的 CRUD、生命周期阶段切换、场景管理与数据绑定', {
    list: {
      description: '列出指定屏幕的所有数据源（含生命周期阶段与场景）',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.listDataSources(p.projectId, p.screenId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    add: {
      description: '创建数据源（API 或 static 类型）',
      schema: z.object({ projectId: z.string(), screenId: z.string(), id: z.string(), name: z.string(), lifecycle: z.enum(['api','static']), description: z.string().optional() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const sid = generateId();
        const result = await api2.default.executeOperation(p.projectId, { type: 'addDataSource', params: { screenId:p.screenId, dataSource:{ id:p.id, name:p.name, lifecycle:p.lifecycle, description:p.description, scenarios:[{id:sid,name:'默认',data:{},isDefault:true}], activeScenarioId:sid }} });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    switch_phase: {
      description: '切换 API 数据源生命周期阶段',
      schema: z.object({ projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), phase: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'switchDataSourcePhase', params: { screenId:p.screenId, dataSourceId:p.dataSourceId, phase:p.phase } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    add_scenario: {
      description: '向数据源添加数据场景',
      schema: z.object({ projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), id: z.string(), name: z.string(), data: z.record(z.string(),z.unknown()), description: z.string().optional(), isDefault: z.boolean().optional() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addDataScenario', params: { screenId:p.screenId, dataSourceId:p.dataSourceId, scenario:{ id:p.id, name:p.name, data:p.data, description:p.description, isDefault:p.isDefault }} });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    update_scenario: {
      description: '更新数据场景',
      schema: z.object({ projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), scenarioId: z.string(), data: z.record(z.string(),z.unknown()).optional(), name: z.string().optional(), description: z.string().optional() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const baseParams:any = { screenId:p.screenId, dataSourceId:p.dataSourceId, scenarioId:p.scenarioId };
        if (p.data !== undefined) baseParams.data = p.data;
        if (p.name !== undefined) baseParams.name = p.name;
        if (p.description !== undefined) baseParams.description = p.description;
        const result = await api2.default.executeOperation(p.projectId, { type: 'updateDataScenario', params: baseParams });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    switch_scenario: {
      description: '切换数据源当前活动场景',
      schema: z.object({ projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), scenarioId: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'switchDataScenario', params: { screenId:p.screenId, dataSourceId:p.dataSourceId, scenarioId:p.scenarioId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    bind_data: {
      description: '将数据表达式绑定到节点属性（如 {{data.user.name}}）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), propKey: z.string(), expression: z.string() }),
      handler: async (p: DomainToolParams) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'bindData', params: { nodeId:p.nodeId, propKey:p.propKey, expression:p.expression } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
