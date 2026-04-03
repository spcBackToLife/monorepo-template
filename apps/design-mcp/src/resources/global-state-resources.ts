import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

interface DesignProject {
  id: string;
  screens: Array<{
    id: string;
    name: string;
    globalStates: Array<{
      name: string;
      values: string[];
      defaultValue: string;
    }>;
  }>;
}

/** Extract path segments from a resource URI */
function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Task 4.7.4 — Global State Resources
 *
 * Resource: globalstates://{projectId}/{screenId}
 * Returns the global state variables for a screen.
 */
export function registerGlobalStateResources(server: McpServer): void {
  server.resource(
    'globalstates/{projectId}/{screenId}',
    'globalstates://{projectId}/{screenId}',
    {
      description: '获取指定屏幕的全局状态变量列表（name, values, defaultValue）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      // globalstates://{projectId}/{screenId} → segments = ["<projectId>", "<screenId>"]
      const projectId = segments[0] ?? '';
      const screenId = segments[1] ?? '';
      const project = (await api.getProject(projectId)) as DesignProject;
      const screen = project.screens.find((s) => s.id === screenId);

      const content = screen
        ? {
            screenId: screen.id,
            screenName: screen.name,
            globalStates: screen.globalStates ?? [],
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
