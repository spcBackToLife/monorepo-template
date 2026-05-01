import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

/**
 * Phase 7 — 环境态（项目级）MCP 工具
 */
export function registerEnvironmentTools(server: McpServer): void {
  server.registerTool(
    'list_environment_states',
    {
      description: '列出项目的所有环境变量（environmentStates）。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
      },
    },
    async ({ projectId }) => {
      const project = await api.getProject(projectId);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(project.environmentStates ?? [], null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'add_environment_state',
    {
      description: '添加项目级环境变量（addEnvironmentState）。',
      inputSchema: {
        projectId: z.string(),
        name: z.string().describe('变量名'),
        label: z.string(),
        values: z.array(z.object({ value: z.string(), label: z.string() })),
        defaultValue: z.string(),
      },
    },
    async ({ projectId, name, label, values, defaultValue }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addEnvironmentState',
        params: { name, label, values, defaultValue },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_environment_preview',
    {
      description: '切换环境态预览值（setEnvironmentPreview）。',
      inputSchema: {
        projectId: z.string(),
        variableName: z.string(),
        value: z.string(),
      },
    },
    async ({ projectId, variableName, value }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setEnvironmentPreview',
        params: { variableName, value },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_environment_binding',
    {
      description: '为节点添加环境态绑定（addEnvironmentBinding）。',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        variableName: z.string(),
        value: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        visible: z.boolean().optional(),
      },
    },
    async ({ projectId, nodeId, variableName, value, styles, props, visible }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addEnvironmentBinding',
        params: {
          nodeId,
          binding: { variableName, value, styles, props, visible },
        },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
