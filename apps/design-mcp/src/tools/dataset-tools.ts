import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Task 3.6.1 — Dataset MCP Tools
 *
 * Tools for managing datasets via MCP:
 * - list_datasets
 * - switch_dataset
 * - update_dataset
 * - remove_dataset
 * - add_dataset
 * - bind_data
 */
export function registerDatasetTools(server: McpServer): void {
  server.registerTool(
    'list_datasets',
    {
      description:
        '列出指定屏幕的所有数据集（DataSet）。返回每个数据集的 id、name、data 和 description。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
      },
    },
    async ({ projectId, screenId }) => {
      const datasets = await api.listDatasets(projectId, screenId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(datasets, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_dataset',
    {
      description:
        '向指定屏幕添加一个新的数据集（DataSet），可设置初始数据。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        name: z.string().describe('数据集名称（如 "Empty State", "Full Data"）'),
        data: z.record(z.string(), z.unknown()).optional().describe('初始数据（JSON 对象）'),
        description: z.string().optional().describe('数据集描述'),
      },
    },
    async ({ projectId, screenId, name, data, description }) => {
      const dataSetId = `ds_${Date.now().toString(36)}`;
      const result = await api.executeOperation(projectId, {
        type: 'addDataSet',
        params: {
          screenId,
          dataSet: {
            id: dataSetId,
            name,
            data: data ?? {},
            description,
          },
        },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ dataSetId, ...result as object }, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_dataset',
    {
      description:
        '更新数据集：可替换 data、和/或修改 name、description（至少提供一项）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        dataSetId: z.string().describe('数据集 ID'),
        data: z.record(z.string(), z.unknown()).optional().describe('新数据（完整替换 data）'),
        name: z.string().optional().describe('显示名称'),
        description: z.string().optional().describe('说明'),
      },
    },
    async ({ projectId, screenId, dataSetId, data, name, description }) => {
      if (data === undefined && name === undefined && description === undefined) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ error: '至少需要提供 data、name、description 之一' }, null, 2),
            },
          ],
        };
      }
      const result = await api.executeOperation(projectId, {
        type: 'updateDataSet',
        params: {
          screenId,
          dataSetId,
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
    'remove_dataset',
    {
      description: '从指定屏幕删除一个数据集（removeDataSet）。若删除的是当前激活集，会自动切换到剩余集合中的第一个。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        dataSetId: z.string().describe('要删除的数据集 ID'),
      },
    },
    async ({ projectId, screenId, dataSetId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeDataSet',
        params: { screenId, dataSetId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'switch_dataset',
    {
      description:
        '切换指定屏幕的激活数据集（activeDataSetId）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        dataSetId: z.string().describe('要激活的数据集 ID'),
      },
    },
    async ({ projectId, screenId, dataSetId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'switchDataSet',
        params: { screenId, dataSetId },
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
        '将数据表达式绑定到指定节点的属性上。使用 {{data.xxx}} 语法引用数据集中的值。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        propKey: z.string().describe('属性名（如 "textContent", "src"）'),
        expression: z.string().describe('数据绑定表达式（如 "{{data.user.name}}"）'),
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
