import { getAvailableOperations } from '@globallink/design-operations';
import { DESIGN_SCHEMA_VERSION } from '@globallink/design-schema';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// ── 领域工具（v2 op 名）────────────────────────────
import { registerQueryTools } from './tools/domain/query-grouped.js';
import { registerElementTools } from './tools/domain/element.js';
import { registerStyleTools } from './tools/domain/style.js';
import {
  registerVisualStateTools,
  registerEventTools,
  registerScreenTools,
  registerViewportTools,
  registerAnnotationTools,
} from './tools/domain/misc-grouped.js';
import { registerAssetTools } from './tools/domain/asset.js';
import { registerHistoryTools } from './tools/domain/history-grouped.js';
import { registerStateTools } from './tools/domain/state.js';
import { registerDataSourceTools } from './tools/domain/data-source.js';
import { registerComponentPropsTools } from './tools/domain/component-prop.js';

// ── 素材相关领域工具 ──
import { registerMaterialTools } from './tools/domain/material.js';
import { registerMaterialProjectTools } from './tools/domain/material-project.js';
import { registerMaterialSlotTools } from './tools/domain/material-slot.js';
import { registerCanvasTools } from './tools/domain/canvas.js';

// ── 主题工具 ──
import { registerThemeTools } from './tools/domain/theme.js';

// ── Meta 工具（Schema-First：设计意图/溯源/完成度） ──
import { registerMetaTools } from './tools/domain/meta.js';

// ── 保留的快捷工具（不合并，高频使用）──────────
import { registerSnapshotTools } from './tools/snapshot-tools.js';
import { registerBatchTool } from './tools/batch.js';
import { registerComponentRecipeTools } from './tools/component-recipes.js';

const server = new McpServer({
  name: '@globallink/design-mcp',
  version: '0.3.0',
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

// ===== Register all domain tools =====

registerQueryTools(server);                    // query
registerElementTools(server);                  // element
registerStyleTools(server);                    // style
registerVisualStateTools(server);              // visual_state
registerEventTools(server);                    // event
registerScreenTools(server);                   // screen
registerViewportTools(server);                 // viewport
registerAnnotationTools(server);               // annotation
registerAssetTools(server);                    // asset
registerHistoryTools(server);                  // history
registerStateTools(server);                    // state（v2，取代 domain_state + environment_state）
registerDataSourceTools(server);               // data_source（v2 endpoint+mock 共存）
registerComponentPropsTools(server);           // component_prop
registerMaterialTools(server);                 // material
registerMaterialProjectTools(server);          // material_project
registerMaterialSlotTools(server);             // material_slot
registerCanvasTools(server);                   // canvas
registerThemeTools(server);                    // theme
registerMetaTools(server);                     // meta（Schema-First 设计意图/溯源/完成度）

// ===== Shortcut / Recipe tools =====
registerSnapshotTools(server);                 // generate_snapshots
registerBatchTool(server);                     // execute_operations_batch
registerComponentRecipeTools(server);          // create_primary_button

// ===== Start =====
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
