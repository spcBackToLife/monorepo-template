/**
 * 撤销/重做 — 合并原 2 个工具为 1 个
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../helpers/registerDomainTool.js';
import * as api from '../../api-client.js';

export function registerHistoryTools(server: McpServer): void {
  registerDomainTool(server, 'history', '撤销/重做操作', {
    undo: {
      description: '撤销最后一次操作',
      schema: z.object({ projectId: z.string() }),
      handler: async (p) => ({ content: [{ type:'text', text: JSON.stringify(await api.undo(p.projectId), null, 2) }] }),
    },
    redo: {
      description: '重做被撤销的操作（当前后端使用快照模式实现 undo，redo 暂不可用）',
      schema: z.object({ projectId: z.string() }),
      handler: () => ({
        content: [{ type:'text', text: 'Redo 功能尚未在后端实现。请使用 undo 进行撤销操作。', isError:true as const }],
      }),
    },
  });
}
