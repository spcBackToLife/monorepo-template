import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generateNodeId } from '@globallink/design-schema';
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
        params: { parentId, tag, elementId: generateNodeId(), styles, props, position },
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

  server.registerTool(
    'rename_node',
    {
      description: '重命名节点的显示名称',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        name: z.string().describe('新名称'),
      },
    },
    async ({ projectId, nodeId, name }) => {
      const result = await api.executeOperation(projectId, {
        type: 'renameNode',
        params: { nodeId, name },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'insert_subtree',
    {
      description: '在指定父节点下插入一棵完整的节点子树',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        parentId: z.string().describe('父节点 ID'),
        subtree: z.record(z.string(), z.unknown()).describe('ComponentNode 子树对象'),
        position: z.number().optional().describe('插入位置索引'),
      },
    },
    async ({ projectId, parentId, subtree, position }) => {
      const result = await api.executeOperation(projectId, {
        type: 'insertSubtree',
        params: { parentId, subtree, position },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'wrap_in_container',
    {
      description: '将多个节点包裹到一个新容器中',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeIds: z.array(z.string()).describe('要包裹的节点 ID 列表'),
        containerTag: z.string().optional().describe('容器标签（默认 div）'),
        containerStyles: z.record(z.string(), z.unknown()).optional().describe('容器初始样式'),
      },
    },
    async ({ projectId, nodeIds, containerTag, containerStyles }) => {
      const result = await api.executeOperation(projectId, {
        type: 'wrapInContainer',
        params: { nodeIds, containerTag, containerStyles },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'unwrap_container',
    {
      description: '解除容器包裹，将子节点提升到父级',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        containerId: z.string().describe('要解除包裹的容器节点 ID'),
      },
    },
    async ({ projectId, containerId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'unwrapContainer',
        params: { containerId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'reorder_element',
    {
      description: '调整元素在父节点中的排列顺序',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        parentId: z.string().describe('父节点 ID'),
        newIndex: z.number().describe('新的排列索引'),
      },
    },
    async ({ projectId, nodeId, parentId, newIndex }) => {
      const result = await api.executeOperation(projectId, {
        type: 'reorderElement',
        params: { nodeId, parentId, newIndex },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_node_visibility_when',
    {
      description: '设置节点的条件可见性规则',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        visibilityWhen: z.record(z.string(), z.unknown()).nullable().describe('条件可见性规则对象，null 表示清除'),
      },
    },
    async ({ projectId, nodeId, visibilityWhen }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setNodeVisibilityWhen',
        params: { nodeId, visibilityWhen },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_node_locked',
    {
      description: '设置节点的锁定状态（锁定后不可拖拽/编辑）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        locked: z.boolean().describe('是否锁定'),
      },
    },
    async ({ projectId, nodeId, locked }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setNodeLocked',
        params: { nodeId, locked },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_node_visible',
    {
      description: '设置节点的可见性（显示/隐藏）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        visible: z.boolean().describe('是否可见'),
      },
    },
    async ({ projectId, nodeId, visible }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setNodeVisible',
        params: { nodeId, visible },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
