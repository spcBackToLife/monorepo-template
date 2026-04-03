import { z } from 'zod';
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

/**
 * Task 4.7.1 — Global State MCP Tools
 *
 * Tools for managing global state variables via MCP:
 * - list_global_states
 * - set_global_state
 * - add_global_state_binding
 */
export function registerGlobalStateTools(server: McpServer): void {
  server.registerTool(
    'list_global_states',
    {
      description:
        '列出指定屏幕的所有全局状态变量（globalStates）。返回每个变量的 name、values、defaultValue。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
      },
    },
    async ({ projectId, screenId }) => {
      const project = (await api.getProject(projectId)) as DesignProject;
      const screen = project.screens.find((s) => s.id === screenId);
      const globalStates = screen?.globalStates ?? [];
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(globalStates, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_global_state',
    {
      description:
        '设置指定屏幕的全局状态变量值（运行时切换）。通过 setGlobalState 操作实现。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        variableName: z.string().describe('全局状态变量名'),
        value: z.string().describe('目标值'),
      },
    },
    async ({ projectId, screenId, variableName, value }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setGlobalState',
        params: { screenId, variableName, value },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_global_state_binding',
    {
      description:
        '为指定节点添加全局状态绑定。当全局状态变量匹配指定值时，应用样式/属性/可见性覆盖。',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        variableName: z.string().describe('全局状态变量名'),
        value: z.string().describe('匹配值'),
        styles: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .optional()
          .describe('样式覆盖'),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('属性覆盖'),
        visible: z.boolean().optional().describe('可见性覆盖'),
      },
    },
    async ({ projectId, nodeId, variableName, value, styles, props, visible }) => {
      const bindingId = `gsb_${Date.now().toString(36)}`;
      const result = await api.executeOperation(projectId, {
        type: 'addGlobalStateBinding',
        params: {
          nodeId,
          binding: {
            id: bindingId,
            variableName,
            value,
            styles,
            props,
            visible,
          },
        },
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ bindingId, ...(result as object) }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'add_global_state_variable',
    {
      description: '为屏幕添加全局状态变量',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        name: z.string().describe('变量名'),
        values: z.array(z.string()).describe('可选值列表'),
        defaultValue: z.string().describe('默认值'),
        description: z.string().optional().describe('变量描述'),
      },
    },
    async ({ projectId, screenId, name, values, defaultValue, description }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addGlobalStateVariable',
        params: { screenId, name, values, defaultValue, description },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_global_state_variable',
    {
      description: '删除屏幕上的全局状态变量',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        variableName: z.string().describe('变量名'),
      },
    },
    async ({ projectId, screenId, variableName }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeGlobalStateVariable',
        params: { screenId, variableName },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_global_state_binding',
    {
      description: '删除节点上的全局状态绑定',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        bindingId: z.string().describe('绑定 ID'),
      },
    },
    async ({ projectId, nodeId, bindingId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeGlobalStateBinding',
        params: { nodeId, bindingId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_global_state_binding',
    {
      description: '更新节点上的全局状态绑定配置',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        bindingId: z.string().describe('绑定 ID'),
        patch: z.record(z.string(), z.unknown()).describe('要更新的字段'),
      },
    },
    async ({ projectId, nodeId, bindingId, patch }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateGlobalStateBinding',
        params: { nodeId, bindingId, patch },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
