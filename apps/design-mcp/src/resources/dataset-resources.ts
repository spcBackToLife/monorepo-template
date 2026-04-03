import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

interface DesignProject {
  id: string;
  name: string;
  screens: Array<{
    id: string;
    name: string;
    dataSets: Array<{
      id: string;
      name: string;
      data: Record<string, unknown>;
      description?: string;
    }>;
    activeDataSetId: string;
  }>;
}

/** Extract path segments from a resource URI */
function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Task 3.6.2 — Dataset Resources
 *
 * Resource: datasets://{projectId}/{screenId}
 * Returns the datasets for a screen including active dataset ID.
 */
export function registerDatasetResources(server: McpServer): void {
  server.resource(
    'datasets/{projectId}/{screenId}',
    'datasets://{projectId}/{screenId}',
    {
      description: '获取指定屏幕的数据集列表（dataSets + activeDataSetId）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      // datasets://{projectId}/{screenId} → segments = ["<projectId>", "<screenId>"]
      const projectId = segments[0] ?? '';
      const screenId = segments[1] ?? '';
      const project = (await api.getProject(projectId)) as DesignProject;
      const screen = project.screens.find((s) => s.id === screenId);

      const content = screen
        ? {
            screenId: screen.id,
            screenName: screen.name,
            activeDataSetId: screen.activeDataSetId,
            dataSets: screen.dataSets,
          }
        : { error: `Screen ${screenId} not found` };

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
}
