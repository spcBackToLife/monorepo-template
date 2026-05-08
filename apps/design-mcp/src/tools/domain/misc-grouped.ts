/**
 * 视觉状态 + 事件 + 屏幕 + 视口 + 标注（v2 op 名）
 *
 * 与 design-operations 的 op 一一对应：
 *   visualState.add / remove / update / setActive / resetStyle
 *   event.add / remove / update / addNavigation
 *   screen.add / remove / setActive / rename / reorder
 *   viewport.switch / addPreset
 *   annotation.add / remove
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ComponentEvent } from '@globallink/design-schema';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

// ── 视觉状态 ──
export function registerVisualStateTools(server: McpServer): void {
  registerDomainTool(server, 'visual_state', '组件视觉状态的 CRUD（hover/pressed/disabled 等）及预览切换', {
    add: defineAction({
      description: '为组件添加一个视觉状态，可设置该状态下的样式覆盖、子元素状态映射和 transition',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), stateName: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        transition: z.object({ duration: z.number().optional(), easing: z.string().optional(), properties: z.array(z.string()).optional() }).optional(),
        childrenStates: z.record(z.string(), z.string()).optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'visualState.add', params: { nodeId: p.nodeId, stateName: p.stateName, styles: p.styles, ...(p.transition != null ? { transition: p.transition } : {}), ...(p.childrenStates ? { childrenStates: p.childrenStates } : {}) } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    set_active: defineAction({
      description: '切换组件当前激活状态（用于预览不同状态下外观）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), stateName: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'visualState.setActive', params: { nodeId: p.nodeId, stateName: p.stateName } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    remove: defineAction({
      description: '删除节点上的指定视觉状态',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), stateName: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'visualState.remove', params: { nodeId: p.nodeId, stateName: p.stateName } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    /**
     * ⚠️ 重要：update 是【合并模式】（{ ...oldStyles, ...newStyles}）。
     * - 想修改/新增属性 ✅ 正常传
     * - 想【删除】某个已有属性 ❌ 不传没用！必须用 reset_style action
     * - 例如：hover 状态有 backgroundImage: null 想删除 → 用 reset_style，properties: ["backgroundImage"]
     */
    update: defineAction({
      description: '更新节点上某个视觉状态的样式、属性和子元素状态映射（⚠️ 合并模式：不传的属性不会删除；要删除属性请用 reset_style）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), stateName: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])),
        props: z.record(z.string(), z.unknown()).optional(),
        childrenStates: z.record(z.string(), z.string()).optional(),
        transition: z.object({ duration: z.number().optional(), easing: z.string().optional(), properties: z.array(z.string()).optional() }).optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'visualState.update', params: { nodeId: p.nodeId, stateName: p.stateName, styles: p.styles, props: p.props, ...(p.childrenStates ? { childrenStates: p.childrenStates } : {}), ...(p.transition != null ? { transition: p.transition } : {}) } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    /**
     * 从指定视觉状态的样式中【彻底删除】指定的 CSS 属性。
     * 与 update 的区别：update 是合并模式无法删除属性；reset_style 是删除操作。
     * 典型场景：某状态误设了 backgroundImage: null 覆盖了素材图，需要移除以恢复继承。
     */
    reset_style: defineAction({
      description: '从视觉状态中删除指定的 CSS 属性（⚠️ 这是唯一能删除状态样式属性的方式；update 是合并模式，不传不会删除）',
      schema: z.object({
        projectId: z.string(),
        nodeId: z.string(),
        stateName: z.string(),
        properties: z.array(z.string()).describe('要删除的 CSS 属性名数组，如 ["backgroundImage", "backgroundColor"]'),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'visualState.resetStyle', params: { nodeId: p.nodeId, stateName: p.stateName, properties: p.properties } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}

// ── 交互事件 ──
export function registerEventTools(server: McpServer): void {
  registerDomainTool(server, 'event', '页面导航跳转与交互事件的 CRUD（actions 使用 v2 dot-namespace 动词）', {
    add_navigation: defineAction({
      description: '为元素添加页面跳转交互（等价于 add_event 一条 click 事件 + nav.go 单动作）。targetScreenId 为 "new" 时调用方需先创建新屏幕',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        trigger: z.enum(['click', 'doubleClick']),
        targetScreenId: z.string().describe('目标屏幕 ID 或 "new"（调用方需先创建）'),
        description: z.string().optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'event.addNavigation', params: { nodeId: p.nodeId, trigger: p.trigger, targetScreenId: p.targetScreenId, description: p.description } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    add_event: defineAction({
      description:
        '为节点添加交互事件。trigger ∈ click/doubleClick/hover/focus/blur/longPress/screenEnter/screenExit/screenVisible/screenHidden/scrollReachBottom/scrollReachTop/navigateBack/change/submit。' +
        'actions 数组使用 v2 动词（state.set/append/remove/merge/toggle、effect.fetch/cancel、nav.go/back、node.setVisualState、ui.showToast/openUrl/delay、custom）。' +
        'condition 为 { when: <表达式 string> }。',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        event: z.record(z.string(), z.unknown()),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'event.add', params: { nodeId: p.nodeId, event: p.event as unknown as ComponentEvent } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    remove_event: defineAction({
      description: '按索引删除节点上的事件',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), eventIndex: z.number() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'event.remove', params: { nodeId: p.nodeId, eventIndex: p.eventIndex } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    update_event: defineAction({
      description: '就地更新节点上某条事件（局部 patch；actions 替换式更新，不做合并）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), eventIndex: z.number(), event: z.record(z.string(), z.unknown()) }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'event.update', params: { nodeId: p.nodeId, eventIndex: p.eventIndex, event: p.event as unknown as Partial<ComponentEvent> } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}

// ── 屏幕管理 ──
export function registerScreenTools(server: McpServer): void {
  registerDomainTool(server, 'screen', '屏幕（页面）的增删改查与排列', {
    add: defineAction({
      description: '添加一个新的空白屏幕（页面）',
      schema: z.object({ projectId: z.string(), name: z.string().describe('如"登录页"、"首页"') }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'screen.add', params: { name: p.name } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    remove: defineAction({
      description: '删除指定屏幕',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'screen.remove', params: { screenId: p.screenId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    activate: defineAction({
      description: '切换当前激活的屏幕',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'screen.setActive', params: { screenId: p.screenId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    rename: defineAction({
      description: '重命名指定屏幕',
      schema: z.object({ projectId: z.string(), screenId: z.string(), name: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'screen.rename', params: { screenId: p.screenId, name: p.name } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    reorder: defineAction({
      description: '调整屏幕排列顺序',
      schema: z.object({ projectId: z.string(), screenId: z.string(), newIndex: z.number() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'screen.reorder', params: { screenId: p.screenId, newIndex: p.newIndex } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}

// ── 视口管理 ──
export function registerViewportTools(server: McpServer): void {
  registerDomainTool(server, 'viewport', '设备视口预设切换与管理', {
    switch_viewport: defineAction({
      description: '切换设备视口预设（改变画布预览尺寸）',
      schema: z.object({
        projectId: z.string(),
        viewport: z.object({
          name: z.string(), width: z.number(), height: z.number(),
          devicePixelRatio: z.number().optional(), platform: z.enum(['pc','mobile','tablet']),
        }),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'viewport.switch', params: { viewport: p.viewport } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    add_preset: defineAction({
      description: '添加自定义视口预设',
      schema: z.object({ projectId: z.string(), viewport: z.record(z.string(), z.unknown()) }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'viewport.addPreset', params: { viewport: p.viewport } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}

// ── 标注 ──
export function registerAnnotationTools(server: McpServer): void {
  registerDomainTool(server, 'annotation', '标注/批注的增删', {
    add: defineAction({
      description: '为指定父节点添加标注/批注',
      schema: z.object({
        projectId: z.string(), parentId: z.string(), content: z.string(),
        author: z.string().optional(), styles: z.record(z.string(), z.unknown()).optional(), position: z.number().optional(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'annotation.add', params: { parentId: p.parentId, content: p.content, author: p.author, styles: p.styles, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    remove: defineAction({
      description: '删除指定标注',
      schema: z.object({ projectId: z.string(), annotationId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'annotation.remove', params: { annotationId: p.annotationId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
