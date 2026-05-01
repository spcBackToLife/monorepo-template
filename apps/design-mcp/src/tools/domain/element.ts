/**
 * 元素操作 — 合并原 11 个工具为 1 个
 * 原：add_element / remove_element / move_element / duplicate_element / rename_node /
 *     insert_subtree / wrap_in_container / unwrap_container / reorder_element /
 *     set_node_visibility_when / set_node_locked / set_node_visible
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
import { generateNodeId } from '@globallink/design-schema';
import { walkTree } from '@globallink/design-operations';
import type { ComponentNode } from '@globallink/design-schema';
import { apiClient } from '../../api-client.js';

export function registerElementTools(server: McpServer): void {
  registerDomainTool(server, 'element', '元素增删改查、移动复制、包裹解包、重命名、可见性锁定等操作', {
    add: {
      description:
        '在指定父节点下添加一个 HTML 原子元素（div/button/img/input 等），可设置初始样式和属性。' +
        '叶子文案请用 props.textContent（推荐）或 props.children 字符串（含 {{data.*}}）；' +
        '勿把可见文字只写在树 children 却留空 props——与画布/渲染器约定一致。',
      schema: z.object({
        projectId: z.string(), parentId: z.string(),
        tag: z.string().describe('div/span/p/h1-h3/button/input/textarea/select/img/a/ul/ol/li/nav/header/footer/section/main'),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('例: { textContent: "标题" } 或 { children: "{{data.x}}" }；p/h/span/button 等会渲染上述字段'),
        position: z.number().optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'addElement', params: { parentId: p.parentId, tag: p.tag, elementId: generateNodeId(), styles: p.styles, props: p.props, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove: {
      description: '删除指定元素及其所有子节点',
      schema: z.object({ projectId: z.string(), elementId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'removeElement', params: { elementId: p.elementId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    move: {
      description: '将元素移动到新的父节点下',
      schema: z.object({ projectId: z.string(), elementId: z.string(), newParentId: z.string(), position: z.number().optional() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'moveElement', params: { elementId: p.elementId, newParentId: p.newParentId, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    duplicate: {
      description: '深拷贝元素及其子节点（生成新 ID）',
      schema: z.object({ projectId: z.string(), elementId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'duplicateElement', params: { elementId: p.elementId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    rename: {
      description: '重命名节点的显示名称',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), name: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'renameNode', params: { nodeId: p.nodeId, name: p.name } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    insert_subtree: {
      description:
        '在父节点下插入一棵完整的节点子树。文本节点：props.textContent 或 props.children（字符串，可含 {{data.*}}）；' +
        '勿仅用树 children 数组承载纯文案（与 SchemaRenderer 一致）。',
      schema: z.object({ projectId: z.string(), parentId: z.string(), subtree: z.record(z.string(), z.unknown()), position: z.number().optional() }),
      handler: async (p) => {
        const tree = p.subtree as unknown as ComponentNode;
        walkTree(tree, (n: any) => { n.id = generateNodeId(); });
        const result = await apiClient.executeOperation(p.projectId, { type: 'insertSubtree', params: { parentId: p.parentId, subtree: tree, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    wrap: {
      description: '将多个节点包裹到一个新容器中',
      schema: z.object({
        projectId: z.string(), nodeIds: z.array(z.string()),
        containerTag: z.string().optional().describe('默认 div'),
        containerStyles: z.record(z.string(), z.unknown()).optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'wrapInContainer', params: { nodeIds: p.nodeIds, containerTag: p.containerTag, containerStyles: p.containerStyles } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    unwrap: {
      description: '解除容器包裹，将子节点提升到父级',
      schema: z.object({ projectId: z.string(), containerId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'unwrapContainer', params: { containerId: p.containerId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    reorder: {
      description: '调整元素在父节点中的排列顺序',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), parentId: z.string(), newIndex: z.number() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'reorderElement', params: { nodeId: p.nodeId, parentId: p.parentId, newIndex: p.newIndex } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    set_visibility_when: {
      description: '设置节点的条件可见性规则',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), visibilityWhen: z.record(z.string(), z.unknown()).nullable() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'setNodeVisibilityWhen', params: { nodeId: p.nodeId, visibilityWhen: p.visibilityWhen } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    set_locked: {
      description: '设置节点的锁定状态（锁定后不可拖拽/编辑）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), locked: z.boolean() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'setNodeLocked', params: { nodeId: p.nodeId, locked: p.locked } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    set_visible: {
      description: '设置节点的可见性（显示/隐藏）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), visible: z.boolean() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'setNodeVisible', params: { nodeId: p.nodeId, visible: p.visible } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    change_type: {
      description: '将 HTML 节点的标签类型改为另一种 primitive（如 div → img）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), newType: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'changeElementType', params: { nodeId: p.nodeId, newType: p.newType } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
