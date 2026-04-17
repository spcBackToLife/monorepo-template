/**
 * 视觉状态 + 导航 + 事件 + 屏幕 + 视口 + 标注 — 合并原 misc.ts 中 17 个工具为 4 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ComponentEvent } from '@globallink/design-schema';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _api from '../../api-client.js';

// ── 视觉状态 ──
export function registerVisualStateTools(server: McpServer): void {
  registerDomainTool(server, 'visual_state', '组件视觉状态的 CRUD（hover/pressed/disabled 等）及预览切换', {
    add: {
      description: '为组件添加一个视觉状态，可设置该状态下的样式覆盖、子元素状态映射和 transition',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), stateName: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
        transition: z.object({ duration: z.number().optional(), easing: z.string().optional(), properties: z.array(z.string()).optional() }).optional(),
        childrenStates: z.record(z.string(), z.string()).optional(),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addState', params: { nodeId: p.nodeId, stateName: p.stateName, styles: p.styles, ...(p.transition != null ? { transition: p.transition } : {}), ...(p.childrenStates ? { childrenStates: p.childrenStates } : {}) } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    set_active: {
      description: '切换组件当前激活状态（用于预览不同状态下外观）',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), stateName: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'setActiveState', params: { nodeId: p.nodeId, stateName: p.stateName } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove: {
      description: '删除节点上的指定视觉状态',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), stateName: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await api2.default.executeOperation(p.projectId, { type: 'removeState', params: { nodeId: p.nodeId, stateName: p.stateName } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    /**
     * ⚠️ 重要：update 是【合并模式】（{ ...oldStyles, ...newStyles }）。
     * - 想修改/新增属性 ✅ 正常传
     * - 想【删除】某个已有属性 ❌ 不传没用！必须用 reset_style action
     * - 例如：hover 状态有 backgroundImage: null 想删除 → 用 reset_style，properties: ["backgroundImage"]
     */
    update: {
      description: '更新节点上某个视觉状态的样式、属性和子元素状态映射（⚠️ 合并模式：不传的属性不会删除；要删除属性请用 reset_style）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(), stateName: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()])),
        props: z.record(z.string(), z.unknown()).optional(),
        childrenStates: z.record(z.string(), z.string()).optional(),
        transition: z.object({ duration: z.number().optional(), easing: z.string().optional(), properties: z.array(z.string()).optional() }).optional(),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await api2.default.executeOperation(p.projectId, { type: 'updateState', params: { nodeId: p.nodeId, stateName: p.stateName, styles: p.styles, props: p.props, ...(p.childrenStates ? { childrenStates: p.childrenStates } : {}), ...(p.transition != null ? { transition: p.transition } : {}) } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    /**
     * 从指定视觉状态的样式中【彻底删除】指定的 CSS 属性。
     * 与 update 的区别：update 是合并模式无法删除属性；reset_style 是删除操作。
     * 典型场景：某状态误设了 backgroundImage: null 覆盖了素材图，需要移除以恢复继承。
     */
    reset_style: {
      description: '从视觉状态中删除指定的 CSS 属性（⚠️ 这是唯一能删除状态样式属性的方式；update 是合并模式，不传不会删除）',
      schema: z.object({
        projectId: z.string(),
        nodeId: z.string(),
        stateName: z.string(),
        properties: z.array(z.string()).describe('要删除的 CSS 属性名数组，如 ["backgroundImage", "backgroundColor"]'),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await api2.default.executeOperation(p.projectId, { type: 'resetStateStyle', params: { nodeId: p.nodeId, stateName: p.stateName, properties: p.properties } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}

// ── 交互事件 ──
export function registerEventTools(server: McpServer): void {
  registerDomainTool(server, 'event', '页面导航跳转与交互事件的 CRUD', {
    add_navigation: {
      description: '为元素添加页面跳转交互。targetScreenId 为 "new" 时自动创建新屏幕',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        trigger: z.enum(['click', 'hover', 'longPress']),
        targetScreenId: z.string().describe('目标屏幕 ID 或 "new"'),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addNavigation', params: { nodeId: p.nodeId, trigger: p.trigger, targetScreenId: p.targetScreenId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    add_event: {
      description: '为节点添加交互事件（含 trigger/actions 数组，可选 condition 和 description）',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        event: z.record(z.string(), z.unknown()),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addEvent', params: { nodeId: p.nodeId, event: p.event as unknown as ComponentEvent } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove_event: {
      description: '按索引删除节点上的事件',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), eventIndex: z.number() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'removeEvent', params: { nodeId: p.nodeId, eventIndex: p.eventIndex } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    update_event: {
      description: '就地更新节点上某条事件的 trigger/actions/condition 等字段',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), eventIndex: z.number(), event: z.record(z.string(), z.unknown()) }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'updateEvent', params: { nodeId: p.nodeId, eventIndex: p.eventIndex, event: p.event as unknown as Partial<ComponentEvent> } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}

// ── 屏幕管理 ──
export function registerScreenTools(server: McpServer): void {
  registerDomainTool(server, 'screen', '屏幕（页面）的增删改查与排列', {
    add: {
      description: '添加一个新的空白屏幕（页面）',
      schema: z.object({ projectId: z.string(), name: z.string().describe('如"登录页"、"首页"') }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addScreen', params: { name: p.name } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove: {
      description: '删除指定屏幕',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'removeScreen', params: { screenId: p.screenId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    activate: {
      description: '切换当前激活的屏幕',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'setActiveScreen', params: { screenId: p.screenId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    rename: {
      description: '重命名指定屏幕',
      schema: z.object({ projectId: z.string(), screenId: z.string(), name: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'renameScreen', params: { screenId: p.screenId, name: p.name } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    reorder: {
      description: '调整屏幕排列顺序',
      schema: z.object({ projectId: z.string(), screenId: z.string(), newIndex: z.number() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'reorderScreen', params: { screenId: p.screenId, newIndex: p.newIndex } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}

// ── 视口管理 ──
export function registerViewportTools(server: McpServer): void {
  registerDomainTool(server, 'viewport', '设备视口预设切换与管理', {
    switch_viewport: {
      description: '切换设备视口预设（改变画布预览尺寸）',
      schema: z.object({
        projectId: z.string(),
        viewport: z.object({
          name: z.string(), width: z.number(), height: z.number(),
          devicePixelRatio: z.number().optional(), platform: z.enum(['pc','mobile','tablet']),
        }),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'switchViewport', params: { viewport: p.viewport } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    add_preset: {
      description: '添加自定义视口预设',
      schema: z.object({ projectId: z.string(), viewport: z.record(z.string(), z.unknown()) }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addViewportPreset', params: { viewport: p.viewport } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}

// ── 标注 ──
export function registerAnnotationTools(server: McpServer): void {
  registerDomainTool(server, 'annotation', '标注/批注的增删', {
    add: {
      description: '为指定父节点添加标注/批注',
      schema: z.object({
        projectId: z.string(), parentId: z.string(), content: z.string(),
        author: z.string().optional(), styles: z.record(z.string(), z.unknown()).optional(), position: z.number().optional(),
      }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'addAnnotation', params: { parentId: p.parentId, content: p.content, author: p.author, styles: p.styles, position: p.position } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
    remove: {
      description: '删除指定标注',
      schema: z.object({ projectId: z.string(), annotationId: z.string() }),
      handler: async (p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api2 = await import('../../api-client.js');
        const result = await api2.default.executeOperation(p.projectId, { type: 'removeAnnotation', params: { annotationId: p.annotationId } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    },
  });
}
