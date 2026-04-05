import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';
import { generateId } from '@globallink/design-schema';

/**
 * Phase 7 — 数据源 MCP 工具（替代 list_datasets 等）
 */
export function registerDataSourceTools(server: McpServer): void {
  server.registerTool(
    'list_data_sources',
    {
      description: '列出指定屏幕的所有数据源（DataSource），含生命周期阶段与场景。',
      inputSchema: {
        projectId: z.string(),
        screenId: z.string(),
      },
    },
    async ({ projectId, screenId }) => {
      const list = await api.listDataSources(projectId, screenId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_data_source',
    {
      description: '创建数据源（addDataSource）。',
      inputSchema: {
        projectId: z.string(),
        screenId: z.string(),
        id: z.string().describe('数据源 ID'),
        name: z.string(),
        lifecycle: z.enum(['api', 'static']),
        description: z.string().optional(),
      },
    },
    async ({ projectId, screenId, id, name, lifecycle, description }) => {
      const scenarioId = generateId();
      const result = await api.executeOperation(projectId, {
        type: 'addDataSource',
        params: {
          screenId,
          dataSource: {
            id, name, lifecycle, description,
            scenarios: [{ id: scenarioId, name: '默认', data: {}, isDefault: true }],
            activeScenarioId: scenarioId,
          },
        },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'switch_data_source_phase',
    {
      description: '切换 API 数据源生命周期阶段（switchDataSourcePhase），如 loading → loaded。',
      inputSchema: {
        projectId: z.string(),
        screenId: z.string(),
        dataSourceId: z.string(),
        phase: z.string(),
      },
    },
    async ({ projectId, screenId, dataSourceId, phase }) => {
      const result = await api.executeOperation(projectId, {
        type: 'switchDataSourcePhase',
        params: { screenId, dataSourceId, phase },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_data_scenario',
    {
      description: '向数据源添加数据场景（addDataScenario）。',
      inputSchema: {
        projectId: z.string(),
        screenId: z.string(),
        dataSourceId: z.string(),
        id: z.string().describe('场景 ID'),
        name: z.string(),
        data: z.record(z.string(), z.unknown()),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
      },
    },
    async ({ projectId, screenId, dataSourceId, id, name, data, description, isDefault }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addDataScenario',
        params: {
          screenId,
          dataSourceId,
          scenario: { id, name, data, description, isDefault },
        },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_data_scenario',
    {
      description: '更新数据场景（updateDataScenario）。',
      inputSchema: {
        projectId: z.string(),
        screenId: z.string(),
        dataSourceId: z.string(),
        scenarioId: z.string(),
        data: z.record(z.string(), z.unknown()).optional(),
        name: z.string().optional(),
        description: z.string().optional(),
      },
    },
    async ({ projectId, screenId, dataSourceId, scenarioId, data, name, description }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateDataScenario',
        params: {
          screenId,
          dataSourceId,
          scenarioId,
          ...(data !== undefined ? { data } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'switch_data_scenario',
    {
      description: '切换数据源当前场景（switchDataScenario）。',
      inputSchema: {
        projectId: z.string(),
        screenId: z.string(),
        dataSourceId: z.string(),
        scenarioId: z.string(),
      },
    },
    async ({ projectId, screenId, dataSourceId, scenarioId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'switchDataScenario',
        params: { screenId, dataSourceId, scenarioId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'bind_data',
    {
      description:
        '将数据表达式绑定到节点属性（bindData），如 {{data.user.name}}。',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        propKey: z.string(),
        expression: z.string(),
      },
    },
    async ({ projectId, nodeId, propKey, expression }) => {
      const result = await api.executeOperation(projectId, {
        type: 'bindData',
        params: { nodeId, propKey, expression },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
