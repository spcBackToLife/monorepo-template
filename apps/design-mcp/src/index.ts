import { getAvailableOperations } from '@globallink/design-operations';
import { DESIGN_SCHEMA_VERSION } from '@globallink/design-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// ── 领域工具（合并后）─────────────────────────────
import { registerQueryTools } from './tools/domain/query-grouped.js';
import { registerElementTools } from './tools/domain/element.js';
import { registerStyleTools } from './tools/domain/style.js';
import { registerVisualStateTools } from './tools/domain/misc-grouped.js';
import { registerEventTools, registerScreenTools, registerViewportTools, registerAnnotationTools } from './tools/domain/misc-grouped.js';
import { registerAssetTools } from './tools/domain/asset.js';
import { registerHistoryTools } from './tools/domain/history-grouped.js';
import { registerDomainStateTools } from './tools/domain/domain-state.js';
import { registerEnvironmentTools } from './tools/domain/environment-state.js';
import { registerDataSourceTools } from './tools/domain/data-source.js';
import { registerComponentPropsTools } from './tools/domain/component-prop.js';

// ── 素材相关领域工具 ──
import { registerMaterialTools } from './tools/domain/material.js';
import { registerMaterialProjectTools } from './tools/domain/material-project.js';
import { registerMaterialSlotTools } from './tools/domain/material-slot.js';
import { registerCanvasTools } from './tools/domain/canvas.js';

// ── 保留的快捷工具（不合并，高频使用）──────────
import { registerSnapshotTools } from './tools/snapshot-tools.js';
import { registerBatchTool } from './tools/batch.js';
import { registerComponentRecipeTools } from './tools/component-recipes.js';

// ── Resources（不变）──────────────────────────────
import { registerResources } from './resources/index.js';
import { registerDatasourceResources } from './resources/datasource-resources.js';
import { registerDomainStateResources } from './resources/domain-state-resources.js';
import { registerEnvironmentStateResources } from './resources/environment-state-resources.js';
import { registerTemplateResources } from './resources/template-resources.js';
import { registerMaterialResources } from './resources/material-resources.js';

const server = new McpServer({
  name: '@globallink/design-mcp',
  version: '0.2.0',
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

// ===== Register all domain tools (merged) =====

registerQueryTools(server);                    // query           → 1 tool (was 3)
registerElementTools(server);                  // element         → 1 tool (was 11 + change_type)
registerStyleTools(server);                    // style           → 1 tool (was 3)
registerVisualStateTools(server);              // visual_state    → 1 tool (was 4)
registerEventTools(server);                    // event           → 1 tool (was 4)
registerScreenTools(server);                   // screen          → 1 tool (was 5)
registerViewportTools(server);                 // viewport        → 1 tool (was 2)
registerAnnotationTools(server);               // annotation      → 1 tool (was 2)
registerAssetTools(server);                    // asset           → 1 tool (was 9)
registerHistoryTools(server);                  // history         → 1 tool (was 2)
registerDomainStateTools(server);              // domain_state    → 1 tool (was 7)
registerEnvironmentTools(server);             // environment     → 1 tool (was 4)
registerDataSourceTools(server);               // data_source     → 1 tool (was 7)
registerComponentPropsTools(server);          // component_prop  → 1 tool (was 5)
registerMaterialTools(server);                // material        → 1 tool (was 4)
registerMaterialProjectTools(server);          // material_project→ 1 tool (was 6)
registerMaterialSlotTools(server);            // material_slot   → 1 tool (was 4)
registerCanvasTools(server);                   // canvas          → 1 tool (was ~30)

// ===== Shortcut / Recipe tools (kept separate) =====
registerSnapshotTools(server);                 // generate_snapshots       → 1 tool
registerBatchTool(server);                     // execute_operations_batch → 1 tool
registerComponentRecipeTools(server);         // create_primary_button    → 1 tool

// ===== Resources =====
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
