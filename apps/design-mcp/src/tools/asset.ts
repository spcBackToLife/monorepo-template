import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerAssetTools(server: McpServer): void {
  server.registerTool(
    'instantiate_template',
    {
      description:
        '从组件资产库实例化一个组件到指定位置（如 LoginForm、NavBar 等复用组件）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        templateId: z.string().describe('模板 ID'),
        parentId: z.string().describe('父节点 ID'),
        position: z.number().optional().describe('插入位置索引'),
      },
    },
    async ({ projectId, templateId, parentId, position }) => {
      const result = await api.executeOperation(projectId, {
        type: 'instantiateTemplate',
        params: { templateId, parentId, position },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'save_as_template',
    {
      description:
        '将指定节点子树保存为可复用的组件资产模板',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('要保存为模板的根节点 ID'),
        name: z.string().describe('模板名称'),
        category: z.string().describe('分类（如 "表单"、"导航"、"卡片"）'),
        tags: z.array(z.string()).optional().describe('标签'),
        description: z.string().optional().describe('描述'),
      },
    },
    async ({ projectId, nodeId, name, category, tags, description }) => {
      const result = await api.executeOperation(projectId, {
        type: 'saveAsTemplate',
        params: { nodeId, name, category, tags, description },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_available_assets',
    {
      description: '列出可用的组件资产（项目级/团队级/全局）',
      inputSchema: {
        scope: z
          .enum(['project', 'team', 'global'])
          .optional()
          .describe('资产范围过滤'),
        projectId: z.string().optional().describe('项目 ID（scope=project 时需要）'),
      },
    },
    async ({ scope, projectId }) => {
      const assets = await api.listAssets(scope, projectId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(assets, null, 2) }],
      };
    },
  );
}
