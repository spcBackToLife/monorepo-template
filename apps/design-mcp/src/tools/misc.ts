import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerMiscTools(server: McpServer): void {
  // ===== State Tools =====

  server.registerTool(
    'add_state',
    {
      description:
        '为组件添加一个视觉状态（如 hover、pressed、disabled 或自定义状态名），可设置该状态下的样式覆盖',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标节点 ID'),
        stateName: z.string().describe('状态名称（如 hover、pressed、disabled）'),
        styles: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .optional()
          .describe('该状态下的 CSS 样式覆盖'),
      },
    },
    async ({ projectId, nodeId, stateName, styles }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addState',
        params: { nodeId, stateName, styles },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_active_state',
    {
      description: '切换组件的当前激活状态（用于预览不同状态下的外观）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标节点 ID'),
        stateName: z.string().describe('要激活的状态名称'),
      },
    },
    async ({ projectId, nodeId, stateName }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setActiveState',
        params: { nodeId, stateName },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== Navigation / Event Tools =====

  server.registerTool(
    'add_navigation',
    {
      description:
        '为元素添加页面跳转交互（如点击按钮跳到注册页）。targetScreenId 为 "new" 时自动创建新屏幕',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标节点 ID'),
        trigger: z
          .enum(['click', 'hover', 'longPress'])
          .describe('触发方式'),
        targetScreenId: z
          .string()
          .describe('目标屏幕 ID，或 "new" 自动创建新屏幕'),
      },
    },
    async ({ projectId, nodeId, trigger, targetScreenId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addNavigation',
        params: { nodeId, trigger, targetScreenId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== Screen Tools =====

  server.registerTool(
    'add_screen',
    {
      description: '添加一个新的空白屏幕（页面）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        name: z.string().describe('屏幕名称（如 "登录页"、"首页"）'),
      },
    },
    async ({ projectId, name }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addScreen',
        params: { name },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== Viewport Tools =====

  server.registerTool(
    'switch_viewport',
    {
      description:
        '切换设备视口预设（改变画布预览尺寸）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        viewport: z
          .object({
            name: z.string().describe('设备名称'),
            width: z.number().describe('宽度（px）'),
            height: z.number().describe('高度（px）'),
            devicePixelRatio: z.number().optional().describe('设备像素比'),
            platform: z.enum(['pc', 'mobile', 'tablet']).describe('平台'),
          })
          .describe('目标视口配置'),
      },
    },
    async ({ projectId, viewport }) => {
      const result = await api.executeOperation(projectId, {
        type: 'switchViewport',
        params: { viewport },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
