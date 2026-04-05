import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Resource: datasources://project/{projectId}/{screenId}
 */
export function registerDatasourceResources(server: McpServer): void {
  server.resource(
    'datasources/project/{projectId}/{screenId}',
    'datasources://project/{projectId}/{screenId}',
    {
      description: '指定屏幕的数据源列表（含阶段、场景、当前激活项）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      const projectId = segments[1] ?? '';
      const screenId = segments[2] ?? '';
      const list = (await api.listDataSources(projectId, screenId)) as unknown[];
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ projectId, screenId, dataSources: list }, null, 2),
          },
        ],
      };
    },
  );
}
