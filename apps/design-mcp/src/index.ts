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
import { registerDomainStateTools } from './tools/domain-state-tools.js';
import { registerEnvironmentTools } from './tools/environment-tools.js';
import { registerDataSourceTools } from './tools/data-source-tools.js';
import { registerComponentPropsTools } from './tools/component-props-tools.js';
import { registerSnapshotTools } from './tools/snapshot-tools.js';
import { registerBatchTool } from './tools/batch.js';
import { registerComponentRecipeTools } from './tools/component-recipes.js';
import { registerMaterialTools } from './tools/material-tools.js';

// Resources
import { registerResources } from './resources/index.js';
import { registerDatasourceResources } from './resources/datasource-resources.js';
import { registerDomainStateResources } from './resources/domain-state-resources.js';
import { registerEnvironmentStateResources } from './resources/environment-state-resources.js';
import { registerTemplateResources } from './resources/template-resources.js';
import { registerMaterialResources } from './resources/material-resources.js';

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
registerDomainStateTools(server);
registerEnvironmentTools(server);
registerDataSourceTools(server);
registerComponentPropsTools(server);
registerSnapshotTools(server);
registerBatchTool(server);
registerComponentRecipeTools(server);
registerMaterialTools(server);

// ===== Register all resources =====

registerResources(server);
registerDatasourceResources(server);
registerDomainStateResources(server);
registerEnvironmentStateResources(server);
registerTemplateResources(server);
registerMaterialResources(server);

// ===== Start =====

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
