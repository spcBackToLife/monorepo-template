import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Resource: environmentstates://project/{projectId}
 */
export function registerEnvironmentStateResources(server: McpServer): void {
  server.resource(
    'environmentstates/project/{projectId}',
    'environmentstates://project/{projectId}',
    {
      description: '项目级环境变量（environmentStates）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      const projectId = segments[1] ?? '';
      const project = (await api.getProject(projectId)) as {
        environmentStates?: unknown[];
      };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              { projectId, environmentStates: project.environmentStates ?? [] },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
