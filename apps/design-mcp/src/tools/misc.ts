import { z } from 'zod';
import type { ComponentEvent } from '@globallink/design-schema';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as api from '../api-client.js';

export function registerMiscTools(server: McpServer): void {
  // ===== State Tools =====

  server.registerTool(
    'add_state',
    {
      description:
        '为组件添加一个视觉状态（如 hover、pressed、disabled 或自定义状态名），可设置该状态下的样式覆盖和子元素状态映射',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('目标节点 ID'),
        stateName: z.string().describe('状态名称（如 hover、pressed、disabled）'),
        styles: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .optional()
          .describe('该状态下的 CSS 样式覆盖'),
        transition: z
          .object({
            duration: z.number().optional().describe('进入该状态的过渡时长(ms)'),
            easing: z.string().optional().describe('如 ease、ease-out'),
            properties: z.array(z.string()).optional().describe('参与过渡的 CSS 属性，默认 all'),
          })
          .optional()
          .describe('进入该状态时的 CSS transition 元数据（写入 ComponentState.transition）'),
        childrenStates: z.record(z.string(), z.string()).optional().describe('该状态下子元素的状态映射（childId → stateName）'),
      },
    },
    async ({ projectId, nodeId, stateName, styles, transition, childrenStates }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addState',
        params: { nodeId, stateName, styles, ...(transition != null ? { transition } : {}), ...(childrenStates ? { childrenStates } : {}) },
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

  server.registerTool(
    'add_event',
    {
      description:
        '为节点添加交互事件（addEvent）。event 为 ComponentEvent JSON：含 trigger 与 actions 数组，可选 condition 和 description',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        event: z
          .record(z.string(), z.unknown())
          .describe('事件对象，如 { "trigger": "click", "actions": [{ "type": "navigate", "targetScreenId": "..." }], "condition": { "type": "globalState", "variableName": "...", "value": "..." } }'),
      },
    },
    async ({ projectId, nodeId, event }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addEvent',
        params: { nodeId, event: event as unknown as ComponentEvent },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_event',
    {
      description: '按索引删除节点上的事件（removeEvent）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        eventIndex: z.number().describe('事件在 node.events 中的下标，从 0 开始'),
      },
    },
    async ({ projectId, nodeId, eventIndex }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeEvent',
        params: { nodeId, eventIndex },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_event',
    {
      description:
        '就地更新节点上某条事件的 trigger、actions、condition 等字段（updateEvent），无需先删后加',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        eventIndex: z.number().describe('事件在 node.events 中的下标，从 0 开始'),
        event: z
          .record(z.string(), z.unknown())
          .describe('要更新的字段，如 { "trigger": "hover" } 或 { "actions": [{ ... }] }'),
      },
    },
    async ({ projectId, nodeId, eventIndex, event }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateEvent',
        params: { nodeId, eventIndex, event: event as unknown as Partial<ComponentEvent> },
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

  // ===== State Tools (continued) =====

  server.registerTool(
    'remove_state',
    {
      description: '删除节点上的指定视觉状态',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        stateName: z.string().describe('要删除的状态名称'),
      },
    },
    async ({ projectId, nodeId, stateName }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeState',
        params: { nodeId, stateName },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_state',
    {
      description: '更新节点上某个视觉状态的样式、属性和子元素状态映射',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        nodeId: z.string().describe('节点 ID'),
        stateName: z.string().describe('状态名称'),
        styles: z.record(z.string(), z.union([z.string(), z.number()])).describe('该状态下的 CSS 样式'),
        props: z.record(z.string(), z.unknown()).optional().describe('该状态下的属性覆盖'),
        childrenStates: z.record(z.string(), z.string()).optional().describe('该状态下子元素的状态映射（childId → stateName）'),
        transition: z
          .object({
            duration: z.number().optional().describe('进入该状态的过渡时长(ms)'),
            easing: z.string().optional().describe('如 ease、ease-out'),
            properties: z.array(z.string()).optional().describe('参与过渡的 CSS 属性，默认 all'),
          })
          .optional()
          .describe('进入该状态时的 CSS transition 元数据'),
      },
    },
    async ({ projectId, nodeId, stateName, styles, props, childrenStates, transition }) => {
      const result = await api.executeOperation(projectId, {
        type: 'updateState',
        params: { nodeId, stateName, styles, props, ...(childrenStates ? { childrenStates } : {}), ...(transition != null ? { transition } : {}) },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== Screen Tools (continued) =====

  server.registerTool(
    'remove_screen',
    {
      description: '删除指定屏幕（页面）',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('要删除的屏幕 ID'),
      },
    },
    async ({ projectId, screenId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeScreen',
        params: { screenId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_active_screen',
    {
      description: '切换当前激活的屏幕',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('目标屏幕 ID'),
      },
    },
    async ({ projectId, screenId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'setActiveScreen',
        params: { screenId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'rename_screen',
    {
      description: '重命名指定屏幕',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        name: z.string().describe('新名称'),
      },
    },
    async ({ projectId, screenId, name }) => {
      const result = await api.executeOperation(projectId, {
        type: 'renameScreen',
        params: { screenId, name },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'reorder_screen',
    {
      description: '调整屏幕的排列顺序',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        screenId: z.string().describe('屏幕 ID'),
        newIndex: z.number().describe('新的排列索引'),
      },
    },
    async ({ projectId, screenId, newIndex }) => {
      const result = await api.executeOperation(projectId, {
        type: 'reorderScreen',
        params: { screenId, newIndex },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_viewport_preset',
    {
      description: '添加自定义视口预设',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        viewport: z.record(z.string(), z.unknown()).describe('视口配置对象'),
      },
    },
    async ({ projectId, viewport }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addViewportPreset',
        params: { viewport },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ===== Annotation Tools =====

  server.registerTool(
    'add_annotation',
    {
      description: '为指定父节点添加标注/批注',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        parentId: z.string().describe('父节点 ID'),
        content: z.string().describe('标注内容'),
        author: z.string().optional().describe('作者'),
        styles: z.record(z.string(), z.unknown()).optional().describe('标注样式'),
        position: z.number().optional().describe('插入位置索引'),
      },
    },
    async ({ projectId, parentId, content, author, styles, position }) => {
      const result = await api.executeOperation(projectId, {
        type: 'addAnnotation',
        params: { parentId, content, author, styles, position },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_annotation',
    {
      description: '删除指定标注',
      inputSchema: {
        projectId: z.string().describe('项目 ID'),
        annotationId: z.string().describe('标注节点 ID'),
      },
    },
    async ({ projectId, annotationId }) => {
      const result = await api.executeOperation(projectId, {
        type: 'removeAnnotation',
        params: { annotationId },
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
