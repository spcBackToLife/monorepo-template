/**
 * Meta 操作工具（Schema-First 架构）。
 *
 * 写入"设计意图 / 溯源 / 完成度"到 schema 的 meta 命名空间——这是 product-analyst /
 * interaction-designer / design-planner / design-executor 四个技能记录"为什么这么设计"
 * 的标准入口，替代旧 design-registry 的 product/interaction/design 层。
 *
 * 详见 SCHEMA-FIRST-REFACTOR.md。
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

const ModeSchema = z.enum(['merge', 'replace']).optional()
  .describe('写入模式：merge=深合并（默认，未提供字段保留）；replace=整体替换');

export function registerMetaTools(server: McpServer): void {
  registerDomainTool(server, 'meta',
    '设计意图 / 溯源 / 完成度（B 类信息，渲染契约不读）。' +
    '取代旧 design-registry 的 product/interaction/design 层。',
    {
      set_node: defineAction({
        description:
          '更新节点的 meta（NodeMeta：product / interaction / design / extremeCases / status）。' +
          '默认深合并；mode=replace 整体替换；patch=null 清空整个 meta。' +
          '⚠️ 注意：actions（"点了要做什么"）属 A 类一等字段，应走 event/add，不要塞 meta。',
        schema: z.object({
          projectId: z.string(),
          nodeId: z.string(),
          patch: z.record(z.string(), z.unknown()).nullable()
            .describe('NodeMeta 的 patch（部分字段也可），传 null 清空整个 meta'),
          mode: ModeSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setNode',
            params: { nodeId: p.nodeId, patch: p.patch as never, mode: p.mode },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_node_status: defineAction({
        description:
          '便捷更新节点完成度（NodeStatus：phase + ready{structure/styles/events/visualStates/materials}）。' +
          'phase: analyzed | interaction-defined | designed | built | verified。' +
          '⚠️ ready.* 的真实值会被 integrity checker 直接对账真实 schema，不接受自报。',
        schema: z.object({
          projectId: z.string(),
          nodeId: z.string(),
          status: z.object({
            phase: z.enum(['analyzed', 'interaction-defined', 'designed', 'built', 'verified']),
            ready: z.object({
              structure: z.boolean().optional(),
              styles: z.boolean().optional(),
              events: z.boolean().optional(),
              visualStates: z.boolean().optional(),
              materials: z.boolean().optional(),
            }).optional(),
            notes: z.string().optional(),
          }).nullable(),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setNodeStatus',
            params: { nodeId: p.nodeId, status: p.status as never },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_screen: defineAction({
        description:
          '更新屏幕级 meta（ScreenMeta：product/interaction/design/status）。' +
          '取代旧 design-registry _page.json。',
        schema: z.object({
          projectId: z.string(),
          screenId: z.string(),
          patch: z.record(z.string(), z.unknown()).nullable(),
          mode: ModeSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setScreen',
            params: { screenId: p.screenId, patch: p.patch as never, mode: p.mode },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_project: defineAction({
        description:
          '更新项目级 meta（ProjectMeta：targetUser/coreScenarios/styleDirection/' +
          'constraints/modules/navigation）。取代旧 design-registry _index.json。',
        schema: z.object({
          projectId: z.string(),
          patch: z.record(z.string(), z.unknown()).nullable(),
          mode: ModeSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setProject',
            params: { patch: p.patch as never, mode: p.mode },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
    },
  );
}
