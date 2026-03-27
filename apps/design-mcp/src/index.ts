import { getAvailableOperations } from '@globallink/design-operations';
import { DESIGN_SCHEMA_VERSION } from '@globallink/design-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Tools
import { registerQueryTools } from './tools/query.js';
import { registerElementTools } from './tools/element.js';
import { registerStyleTools } from './tools/style.js';
import { registerMiscTools } from './tools/misc.js';
import { registerAssetTools } from './tools/asset.js';
import { registerHistoryTools } from './tools/history.js';

// Resources
import { registerResources } from './resources/index.js';

const server = new McpServer({
  name: '@globallink/design-mcp',
  version: '0.1.0',
});

// ===== Built-in info tool =====

server.registerTool(
  'design_workspace_versions',
  {
    description: '返回 design-schema / design-operations 版本与可用操作列表。',
  },
  async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            schema: DESIGN_SCHEMA_VERSION,
            availableOperations: getAvailableOperations().map((op) => op.type),
          },
          null,
          2,
        ),
      },
    ],
  }),
);

// ===== Register all tools =====

registerQueryTools(server);
registerElementTools(server);
registerStyleTools(server);
registerMiscTools(server);
registerAssetTools(server);
registerHistoryTools(server);

// ===== Register all resources =====

registerResources(server);

// ===== Start =====

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
