import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ComponentNode, DomainStateVariable } from '@globallink/design-schema';
import * as api from '../api-client.js';

function walkCollectDomainStates(
  node: ComponentNode,
  out: Array<{ ownerType: 'node'; ownerId: string; variables: DomainStateVariable[] }>,
): void {
  if (node.domainStates?.length) {
    out.push({ ownerType: 'node', ownerId: node.id, variables: node.domainStates });
  }
  for (const c of (node.children ?? [])) {
    walkCollectDomainStates(c, out);
  }
}

/**
 * Phase 7 — 领域态 MCP 工具（替代旧 global-state 命名）
 */
export function registerDomainStateTools(server: McpServer): void {
  server.registerTool(
    'list_domain_states',
    {
      description:
        '列出指定屏幕上的领域态变量：包含屏幕级定义，以及画布上各容器节点上的 domainStates。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
      },
    },
    async ({ projectId, screenId }) => {
      const project = await api.getProject(projectId);
      const screen = project.screens.find((s) => s.id === screenId);
      if (!screen) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Screen not found' }, null, 2) }],
        };
      }
      const onNodes: Array<{ ownerType: 'node'; ownerId: string; variables: DomainStateVariable[] }> = [];
      walkCollectDomainStates(screen.rootNode, onNodes);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                screenId: screen.id,
                screenName: screen.name,
                screenLevel: screen.domainStates ?? [],
                onNodes,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'add_domain_state',
    {
      description: '在屏幕或容器节点上添加领域态变量（addDomainState）。',
      inputSchema: {
        projectId: z.string(),
        ownerType: z.enum(['screen', 'node']).describe('定义挂载在屏幕还是节点'),
        ownerId: z.string().describe('screenId 或 nodeId'),
        name: z.string().describe('变量名（英文标识）'),
        label: z.string().describe('显示标签'),
        values: z
          .array(z.object({ value: z.string(), label: z.string() }))
          .describe('可选值列表'),
        defaultValue: z.string(),
      },
    },
    async ({ projectId, ownerType, ownerId, name, label, values, defaultValue }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addDomainState',
        params: { ownerType, ownerId, name, label, values, defaultValue },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_domain_state',
    {
      description: '删除屏幕或节点上的领域态变量（removeDomainState）。',
      inputSchema: {
        projectId: z.string(),
        ownerType: z.enum(['screen', 'node']),
        ownerId: z.string(),
        variableName: z.string(),
      },
    },
    async ({ projectId, ownerType, ownerId, variableName }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeDomainState',
        params: { ownerType, ownerId, variableName },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_domain_state_preview',
    {
      description: '切换领域态预览值（setDomainStatePreview），影响画布/预览解析。',
      inputSchema: {
        projectId: z.string(),
        ownerType: z.enum(['screen', 'node']),
        ownerId: z.string(),
        variableName: z.string(),
        value: z.string(),
      },
    },
    async ({ projectId, ownerType, ownerId, variableName, value }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setDomainStatePreview',
        params: { ownerType, ownerId, variableName, value },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_domain_state_binding',
    {
      description: '为节点添加领域态绑定（addDomainStateBinding）。',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        variableName: z.string(),
        value: z.string(),
        ownerNodeId: z.string().optional(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        props: z.record(z.string(), z.unknown()).optional(),
        visible: z.boolean().optional(),
      },
    },
    async ({ projectId, nodeId, variableName, value, ownerNodeId, styles, props, visible }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addDomainStateBinding',
        params: {
          nodeId,
          binding: { variableName, value, ownerNodeId, styles, props, visible },
        },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_domain_state_binding',
    {
      description: '更新领域态绑定（updateDomainStateBinding）。',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        variableName: z.string(),
        value: z.string(),
        patch: z
          .object({
            styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
            props: z.record(z.string(), z.unknown()).optional(),
            visible: z.boolean().optional(),
          })
          .describe('要合并的字段'),
      },
    },
    async ({ projectId, nodeId, variableName, value, patch }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateDomainStateBinding',
        params: { nodeId, variableName, value, patch },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_domain_state_binding',
    {
      description: '删除领域态绑定（removeDomainStateBinding）。',
      inputSchema: {
        projectId: z.string(),
        nodeId: z.string(),
        variableName: z.string(),
        value: z.string(),
      },
    },
    async ({ projectId, nodeId, variableName, value }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeDomainStateBinding',
        params: { nodeId, variableName, value },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
