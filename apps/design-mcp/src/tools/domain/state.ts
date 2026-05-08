/**
 * State 工具（v2 替代 v1 的 domain_state / environment_state）
 *
 * 与 design-operations 一一对应：
 *   屏幕级（写入 Screen.stateInit.{view,data}）：
 *     screenState.addViewVariable / removeViewVariable / updateViewVariable
 *     screenState.setViewPreview
 *     screenState.setDataInit / removeDataInit
 *   项目级（写入 DesignProject.stateInit.view）：
 *     globalState.addViewVariable / removeViewVariable / updateViewVariable
 *     globalState.setViewPreview
 *
 * 不再有 v1 的 binding 概念（domainStateBindings / environmentStateBindings）。
 * 想让 UI 跟随 state 变化 → 在 styles / props / visibleWhen 里写表达式（如
 *   `{{ state.view.tab === 'home' ? '#000' : '#666' }}`），由渲染器求值。
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

const ViewVariableSchema = z.object({
  name: z.string().min(1).describe('变量名（驼峰，如 inputDraft / activeTab）'),
  label: z.string().optional().describe('面板显示标签'),
  defaultValue: z.unknown().describe('运行时初始值（任意 JSON）'),
  enum: z
    .array(z.object({ value: z.unknown(), label: z.string() }))
    .optional()
    .describe('可选枚举值列表（编辑器面板下拉用，不强约束运行时）'),
  previewValue: z.unknown().optional().describe('编辑期预览值（不进运行时）'),
});

const ViewVariablePatchSchema = z.object({
  label: z.string().optional(),
  defaultValue: z.unknown().optional(),
  enum: z.array(z.object({ value: z.unknown(), label: z.string() })).optional(),
});

export function registerStateTools(server: McpServer): void {
  registerDomainTool(
    server,
    'state',
    'state 编辑：屏幕级 stateInit（view 变量 + data 初始值）与项目级全局 view 变量。运行时副作用（fetch/cancel）请用 event 工具的 actions: effect.fetch/effect.cancel',
    {
      // ─────── 列表查询 ───────
      list: defineAction({
        description:
          '列出指定屏幕的 stateInit（view 变量定义、data 初始 key/value）。screenId 可选；不传则只列项目级 globalState',
        schema: z.object({ projectId: z.string(), screenId: z.string().optional() }),
        handler: async (p) => {
          const proj = await apiClient.getProject(p.projectId);
          const out: Record<string, unknown> = {
            projectId: proj.id,
            globalState: proj.globalStateInit ?? { view: {} },
          };
          if (p.screenId) {
            const scr = proj.screens?.find((s) => s.id === p.screenId);
            if (!scr) {
              return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `screen ${p.screenId} not found` }) }] };
            }
            out.screen = {
              screenId: scr.id,
              screenName: scr.name,
              stateInit: scr.stateInit ?? { view: {}, data: {} },
            };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(out, null, 2) }] };
        },
      }),

      // ─────── 屏幕级 view 变量 CRUD ───────
      view_add: defineAction({
        description: '在屏幕的 stateInit.view 下新增一个 view 变量（UI 临时态，如 inputDraft / activeTab）',
        schema: z.object({ projectId: z.string(), screenId: z.string(), variable: ViewVariableSchema }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'screenState.addViewVariable',
            params: { screenId: p.screenId, variable: p.variable },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      view_remove: defineAction({
        description: '从屏幕 stateInit.view 删除一个 view 变量',
        schema: z.object({ projectId: z.string(), screenId: z.string(), name: z.string() }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'screenState.removeViewVariable',
            params: { screenId: p.screenId, name: p.name },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      view_update: defineAction({
        description: '局部更新屏幕 view 变量（label / defaultValue / enum，仅传需要改的字段）',
        schema: z.object({
          projectId: z.string(), screenId: z.string(), name: z.string(),
          patch: ViewVariablePatchSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'screenState.updateViewVariable',
            params: { screenId: p.screenId, name: p.name, patch: p.patch },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      view_set_preview: defineAction({
        description: '设置屏幕 view 变量的编辑期预览值（不进运行时；传 undefined 等价清空）',
        schema: z.object({
          projectId: z.string(), screenId: z.string(), name: z.string(),
          previewValue: z.unknown().optional(),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'screenState.setViewPreview',
            params: { screenId: p.screenId, name: p.name, previewValue: p.previewValue },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      // ─────── 屏幕级 data 初始值 ───────
      data_set_init: defineAction({
        description:
          '为屏幕 stateInit.data[<key>] 设置初始值（即运行时 state.data.<key> 的初值）。' +
          '通常 data 由 effect.fetch onSuccess: state.set 写入；本 action 仅用于手写常量初值（如默认空数组 / 空对象）',
        schema: z.object({
          projectId: z.string(), screenId: z.string(),
          key: z.string().describe('data 下的顶层 key，如 "messages"'),
          value: z.unknown(),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'screenState.setDataInit',
            params: { screenId: p.screenId, key: p.key, value: p.value },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      data_remove_init: defineAction({
        description: '从屏幕 stateInit.data 删除某个 key（运行时仍可由 state.set 动态写入）',
        schema: z.object({ projectId: z.string(), screenId: z.string(), key: z.string() }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'screenState.removeDataInit',
            params: { screenId: p.screenId, key: p.key },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      // ─────── 项目级（全局）view 变量 ───────
      global_view_add: defineAction({
        description: '添加一个项目级（所有屏幕共享）view 变量，写入 DesignProject.stateInit.view',
        schema: z.object({ projectId: z.string(), variable: ViewVariableSchema }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'globalState.addViewVariable',
            params: { variable: p.variable },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      global_view_remove: defineAction({
        description: '删除项目级 view 变量',
        schema: z.object({ projectId: z.string(), name: z.string() }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'globalState.removeViewVariable',
            params: { name: p.name },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      global_view_update: defineAction({
        description: '局部更新项目级 view 变量（label / defaultValue / enum）',
        schema: z.object({ projectId: z.string(), name: z.string(), patch: ViewVariablePatchSchema }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'globalState.updateViewVariable',
            params: { name: p.name, patch: p.patch },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),

      global_view_set_preview: defineAction({
        description: '设置项目级 view 变量的编辑期预览值',
        schema: z.object({ projectId: z.string(), name: z.string(), previewValue: z.unknown().optional() }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'globalState.setViewPreview',
            params: { name: p.name, previewValue: p.previewValue },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
    },
  );
}
