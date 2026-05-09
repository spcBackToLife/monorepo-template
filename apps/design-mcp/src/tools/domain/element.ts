/**
 * 元素操作（v2 op 名：element.*）—— 合并原 11 个工具为 1 个
 *
 * 与 design-operations 的 ElementOperation 一一对应：
 *   element.add / remove / move / duplicate / insertSubtree / rename /
 *   wrap / unwrap / reorder / changeType / setLocked / setVisible /
 *   setVisibleWhen / setRepeat / setBind / setRole
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { generateNodeId } from '@globallink/design-schema';
import { walkTree } from '@globallink/design-operations';
import type { ComponentNode, PrimitiveNodeType } from '@globallink/design-schema';
import { apiClient } from '../../api-client.js';

export function registerElementTools(server: McpServer): void {
  registerDomainTool(server, 'element', '元素增删改查、移动复制、包裹解包、重命名、可见性/锁定/列表绑定/受控 bind/编辑期 role/布局提示(layoutHint) 等', {
    add: defineAction({
      description:
        '在指定父节点下添加一个 HTML 原子元素（div/button/img/input 等），可设置初始样式和属性。' +
        '叶子文案请用 props.textContent（推荐）或 props.children 字符串（含 {{state.data.*}} 等表达式）；' +
        '勿把可见文字只写在树 children 却留空 props——与画布/渲染器约定一致。' +
        '可选 layoutHint 提示元素的布局意图（scroll-child/auto-size/fixed-height/fill-parent/sticky-header/sticky-footer）。' +
        '【规范模式】"上下固定+中间滚动"：容器用 display:flex、flex-direction:column、height:100%；' +
        '顶部用 sticky-header、底部用 sticky-footer、中间内容区用 layoutHint:scroll-child。' +
        '【添加后清理】创建复杂布局后需检查是否遗漏必要的容器（flex parent）、宽高约束或溢出滚动配置。',
      schema: z.object({
        projectId: z.string(), parentId: z.string(),
        tag: z.string().describe('div/span/p/h1-h3/button/input/textarea/select/img/a/ul/ol/li/nav/header/footer/section/main'),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        props: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('例: { textContent: "标题" } 或 { children: "{{state.data.x}}" }；p/h/span/button 等会渲染上述字段'),
        position: z.number().optional(),
        layoutHint: z.enum(['scroll-child', 'auto-size', 'fixed-height', 'fill-parent', 'sticky-header', 'sticky-footer']).optional().describe('布局提示：scroll-child(滚动容器内的子元素)、auto-size(内容自适应)、fixed-height(固定高度、满宽)、fill-parent(填充父容器)、sticky-header(粘性顶部)、sticky-footer(粘性底部)'),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.add', params: { parentId: p.parentId, tag: p.tag as PrimitiveNodeType, elementId: generateNodeId(), styles: p.styles, props: p.props, position: p.position, layoutHint: p.layoutHint } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    remove: defineAction({
      description: '删除指定元素及其所有子节点',
      schema: z.object({ projectId: z.string(), elementId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.remove', params: { elementId: p.elementId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    move: defineAction({
      description: '将元素移动到新的父节点下',
      schema: z.object({ projectId: z.string(), elementId: z.string(), newParentId: z.string(), position: z.number().optional() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.move', params: { elementId: p.elementId, newParentId: p.newParentId, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    duplicate: defineAction({
      description: '深拷贝元素及其子节点（生成新 ID，由 ensureDeterministicIds 注入）',
      schema: z.object({ projectId: z.string(), elementId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.duplicate', params: { elementId: p.elementId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    rename: defineAction({
      description: '重命名节点的显示名称',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), name: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.rename', params: { nodeId: p.nodeId, name: p.name } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    insert_subtree: defineAction({
      description:
        '在父节点下插入一棵完整的节点子树。文本节点：props.textContent 或 props.children（字符串，可含 {{state.data.*}}）；' +
        '勿仅用树 children 数组承载纯文案（与 SchemaRenderer 一致）。',
      schema: z.object({ projectId: z.string(), parentId: z.string(), subtree: z.record(z.string(), z.unknown()), position: z.number().optional() }),
      handler: async (p) => {
        const tree = p.subtree as unknown as ComponentNode;
        walkTree(tree, (n: ComponentNode) => { n.id = generateNodeId(); });
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.insertSubtree', params: { parentId: p.parentId, subtree: tree, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    wrap: defineAction({
      description: '将多个节点包裹到一个新容器中',
      schema: z.object({
        projectId: z.string(), nodeIds: z.array(z.string()),
        containerTag: z.string().optional().describe('默认 div'),
        containerStyles: z.record(z.string(), z.unknown()).optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.wrap', params: { nodeIds: p.nodeIds, containerTag: p.containerTag as PrimitiveNodeType | undefined, containerStyles: p.containerStyles as Record<string, string | number> | undefined } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    unwrap: defineAction({
      description: '解除容器包裹，将子节点提升到父级',
      schema: z.object({ projectId: z.string(), containerId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.unwrap', params: { containerId: p.containerId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    reorder: defineAction({
      description: '调整元素在父节点中的排列顺序',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), parentId: z.string(), newIndex: z.number() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.reorder', params: { nodeId: p.nodeId, parentId: p.parentId, newIndex: p.newIndex } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_visible_when: defineAction({
      description: '设置节点的条件可见性表达式（运行时求值得 boolean，传 null 清空）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        visibleWhen: z.string().nullable().describe('表达式字符串，如 "state.view.showPanel" 或 "item.role === \'user\'"；传 null 清空'),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.setVisibleWhen', params: { nodeId: p.nodeId, visibleWhen: p.visibleWhen } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_repeat: defineAction({
      description:
        '设置节点的列表绑定（v2.1 三层模型 { expression, template }）。\n' +
        '- expression：求值得数组的表达式，如 "{{ state.data.messages }}"\n' +
        '- template：每 item 的根节点子树（完整 ComponentNode）；其 styles/props/events 可读 item/index/parent\n' +
        '容器节点自身正常渲染，其 children 作为"静态装饰"（EmptyState 等）与 template 共存。\n' +
        '便利形式：只传 expression 时，若节点已有 repeat 则仅更新表达式；若节点没有 repeat，会自动把 children[0] 提升为默认 template（并从 children 中移出）。\n' +
        '传 null 清空整个绑定。',
      schema: z.object({
        projectId: z.string(),
        nodeId: z.string(),
        repeat: z
          .union([
            // 完整：{ expression, template }
            z.object({
              expression: z.string().min(1),
              template: z.record(z.string(), z.unknown()),
            }),
            // 便利：只更新表达式 { expression }
            z.object({
              expression: z.string().min(1),
            }),
            z.null(),
          ])
          .describe(
            '完整：{ expression: "{{state.data.messages}}", template: <ComponentNode> }；' +
              '仅表达式：{ expression: "..." }；清空：null',
          ),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'element.setRepeat',
          params: {
            nodeId: p.nodeId,
            repeat:
              p.repeat === null
                ? null
                : 'template' in p.repeat
                  ? {
                      expression: p.repeat.expression,
                      template: p.repeat.template as unknown as ComponentNode,
                    }
                  : { expression: p.repeat.expression },
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_bind: defineAction({
      description: '设置节点的受控双向绑定（input/textarea/select：value 取自 path，onChange dispatch state.set；传 null 清空）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        path: z.string().nullable().describe('如 "view.inputDraft" 或 "data.form.name"；传 null 清空 bind'),
      }),
      handler: async (p) => {
        const bind = p.path === null ? null : { path: p.path };
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.setBind', params: { nodeId: p.nodeId, bind } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_role: defineAction({
      description: '设置节点的"编辑期角色"（仅服务编辑画布视觉锚定，渲染契约不读取）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        role: z.enum(['scroll-container', 'sticky-bottom', 'sticky-top']).nullable(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.setRole', params: { nodeId: p.nodeId, role: p.role } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_locked: defineAction({
      description: '设置节点的锁定状态（锁定后不可拖拽/编辑）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), locked: z.boolean() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.setLocked', params: { nodeId: p.nodeId, locked: p.locked } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_visible: defineAction({
      description: '设置节点的可见性（显示/隐藏）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), visible: z.boolean() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.setVisible', params: { nodeId: p.nodeId, visible: p.visible } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    change_type: defineAction({
      description: '将 HTML 节点的标签类型改为另一种 primitive（如 div → img）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), newType: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'element.changeType', params: { nodeId: p.nodeId, newType: p.newType as PrimitiveNodeType } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
