import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

interface DesignProject {
  id: string;
  name: string;
  platform: string;
  screens: Array<{ id: string; name: string; rootNode: unknown; backgroundColor?: string }>;
  currentViewport: unknown;
  componentAssets: unknown[];
}

/** Extract path segments from a resource URI */
function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

export function registerResources(server: McpServer): void {
  // Resource: 完整项目 Schema
  server.resource(
    'project/{projectId}',
    'schema://project/{projectId}',
    {
      description: '获取设计项目的完整 Schema（所有屏幕、视口、资产）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      // schema://project/{projectId} → segments = ["project", "<projectId>"]
      const projectId = segments[1] ?? '';
      const project = await api.getProject(projectId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    },
  );

  // Resource: 单屏幕 Schema
  server.resource(
    'screen/{projectId}/{screenId}',
    'schema://screen/{projectId}/{screenId}',
    {
      description: '获取指定屏幕的 Schema',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      // schema://screen/{projectId}/{screenId} → segments = ["screen", "<projectId>", "<screenId>"]
      const projectId = segments[1] ?? '';
      const screenId = segments[2] ?? '';
      const project = (await api.getProject(projectId)) as DesignProject;
      const screen = project.screens.find((s) => s.id === screenId);
      const content = screen ?? { error: `屏幕 ${screenId} 不存在` };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2),
          },
        ],
      };
    },
  );

  // Resource: 资产列表
  server.resource(
    'assets',
    'assets://list',
    {
      description: '获取所有可用的组件资产列表',
      mimeType: 'application/json',
    },
    async (uri) => {
      const assets = await api.listAssets();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(assets, null, 2),
          },
        ],
      };
    },
  );
}
