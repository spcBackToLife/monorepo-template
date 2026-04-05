import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

interface ScreenShape {
  id: string;
  name: string;
  domainStates: unknown[];
}

/**
 * Resource: domainstates://screen/{projectId}/{screenId}
 */
export function registerDomainStateResources(server: McpServer): void {
  server.resource(
    'domainstates/screen/{projectId}/{screenId}',
    'domainstates://screen/{projectId}/{screenId}',
    {
      description: '指定屏幕的领域态变量（屏幕级 domainStates）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      const projectId = segments[1] ?? '';
      const screenId = segments[2] ?? '';
      const project = (await api.getProject(projectId)) as { screens: ScreenShape[] };
      const screen = project.screens.find((s) => s.id === screenId);
      const content = screen
        ? {
            screenId: screen.id,
            screenName: screen.name,
            domainStates: screen.domainStates ?? [],
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
