/**
 * 样式操作 — 合并原 3 个工具为 1 个
 * 原：update_style / reset_style / batch_update_style
 *
 * 入参合法性：通过 validateStyles helper 在写入前拒掉非法 token 引用，
 * 杜绝"语法错的 token 进 schema → 渲染失败"的契约漂移事故。
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';
import { validateStyles } from '../helpers/validateStyles.js';

/** Zod refinement: styles 入参语义校验（非法 token 拒） */
function stylesRefinement(styles: Record<string, string | number>, ctx: z.RefinementCtx): void {
  const issues = validateStyles(styles);
  for (const issue of issues) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${issue.key}: ${issue.reason}`,
      path: [issue.key],
    });
  }
}

export function registerStyleTools(server: McpServer): void {
  registerDomainTool(server, 'style', 'CSS 样式修改与批量操作。【常用模式】构建"上下固定+中间滚动"布局：容器 display:flex/flex-direction:column/height:100%；头部 position:sticky/top:0；底部 position:sticky/bottom:0；中间 flex:1/overflow:auto。', {
    update: defineAction({
      description: '修改指定元素的 CSS 样式（backgroundColor/fontSize/padding/display/flexDirection 等）。设置布局容器时常配合 flex/flex-direction/height/overflow；粘性定位需要 position:sticky + top/bottom。',
      schema: z.object({
        projectId: z.string(), nodeId: z.string(),
        styles: z.record(z.string(), z.union([z.string(), z.number()]))
          .describe('CSS 属性键值对')
          .superRefine(stylesRefinement),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'style.update', params: { nodeId: p.nodeId, styles: p.styles } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    reset: defineAction({
      description: '重置（删除）某些 CSS 属性，恢复默认值',
      schema: z.object({ projectId: z.string(), nodeId: z.string(), properties: z.array(z.string()) }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'style.reset', params: { nodeId: p.nodeId, properties: p.properties } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
    batch_update: defineAction({
      description: '批量更新多个节点的样式',
      schema: z.object({
        projectId: z.string(),
        updates: z.array(z.object({
          nodeId: z.string(),
          styles: z.record(z.string(), z.union([z.string(), z.number()])).superRefine(stylesRefinement),
        })),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, { type: 'style.batchUpdate', params: { updates: p.updates } });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
