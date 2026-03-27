import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerElementTools(server: McpServer): void {
  server.registerTool(
    'add_element',
    {
      description:
        '在指定父节点下添加一个 HTML 原子元素（div/button/img/input 等），可设置初始样式和属性',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        parentId: z.string().describe('父节点 ID'),
        tag: z
          .string()
          .describe(
            '元素标签：div, span, p, h1, h2, h3, button, input, textarea, select, img, a, ul, ol, li, nav, header, footer, section, main',
          ),
        styles: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .optional()
          .describe('初始 CSS 样式'),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('元素属性（如 src, placeholder）'),
        position: z.number().optional().describe('插入位置索引（默认末尾）'),
      },
    },
    async ({ projectId, parentId, tag, styles, props, position }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addElement',
        params: { parentId, tag, styles, props, position },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_element',
    {
      description: '删除指定元素及其所有子节点',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        elementId: z.string().describe('要删除的元素 ID'),
      },
    },
    async ({ projectId, elementId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeElement',
        params: { elementId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'move_element',
    {
      description: '将元素移动到新的父节点下',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        elementId: z.string().describe('要移动的元素 ID'),
        newParentId: z.string().describe('目标父节点 ID'),
        position: z.number().optional().describe('插入位置索引'),
      },
    },
    async ({ projectId, elementId, newParentId, position }) => {
      const result = await api.executeOperation(projectId, {
        type: 'moveElement',
        params: { elementId, newParentId, position },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'duplicate_element',
    {
      description: '复制指定元素及其所有子节点（深拷贝，生成新 ID）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        elementId: z.string().describe('要复制的元素 ID'),
      },
    },
    async ({ projectId, elementId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'duplicateElement',
        params: { elementId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
