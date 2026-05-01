import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerQueryTools(server: McpServer): void {
  server.registerTool(
    'get_project_info',
    {
      description:
        '获取设计项目的基本信息（名称、平台、屏幕列表、当前视口、组件资产数量）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
      },
    },
    async ({ projectId }) => {
      const project = await api.getProject(projectId);
      const summary = {
        id: project.id,
        name: project.name,
        platform: project.platform,
        currentViewport: project.currentViewport,
        screenCount: project.screens.length,
        screens: project.screens.map((s) => ({ id: s.id, name: s.name })),
        componentAssetsCount: project.componentAssets.length,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_screen_schema',
    {
      description:
        '获取指定屏幕的完整 Schema（组件树、样式、交互、状态）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
      },
    },
    async ({ projectId, screenId }) => {
      const project = await api.getProject(projectId);
      const screen = project.screens.find((s) => s.id === screenId);
      if (!screen) {
        return {
          content: [{ type: 'text' as const, text: `屏幕 ${screenId} 不存在` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(screen, null, 2) }],
      };
    },
  );

  server.registerTool(
    'list_screens',
    {
      description: '列出项目的所有屏幕（ID、名称）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
      },
    },
    async ({ projectId }) => {
      const project = await api.getProject(projectId);
      const screens = project.screens.map((s) => ({
        id: s.id,
        name: s.name,
      }));
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(screens, null, 2) }],
      };
    },
  );
}
