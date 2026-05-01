import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/** Extract path segments from a resource URI */
function extractSegments(uri: URL): string[] {
  return uri.pathname.split('/').filter(Boolean);
}

/**
 * Task 4.7.4 — Template Resources
 *
 * Resource: template://{projectId}/{templateId}
 * Returns a template with its propDefinitions.
 */
export function registerTemplateResources(server: McpServer): void {
  server.resource(
    'template/{projectId}/{templateId}',
    'template://{projectId}/{templateId}',
    {
      description: '获取指定组件模板的完整信息（rootNode, propDefinitions, kind）',
      mimeType: 'application/json',
    },
    async (uri) => {
      const segments = extractSegments(uri);
      // template://{projectId}/{templateId} → segments = ["<projectId>", "<templateId>"]
      const projectId = segments[0] ?? '';
      const templateId = segments[1] ?? '';
      const project = await api.getProject(projectId);
      const template = project.componentAssets?.find((t) => t.id === templateId);

      const content = template
        ? {
            templateId: template.id,
            name: template.name,
            kind: template.kind,
            propDefinitions: template.propDefinitions,
            schema: template.schema,
          }
        : { error: `Template ${templateId} not found` };

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
