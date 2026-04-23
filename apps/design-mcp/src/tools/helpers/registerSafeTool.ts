/**
 * 安全工具注册器 — 为 server.registerTool 添加错误加固。
 *
 * 解决的问题：
 *   MCP SDK 的 Zod 验证在 handler 执行前运行，
 *   验证失败时异常绕过 handler 的 try-catch，导致 AI 看到 "MCP tool execution failed"。
 *
 * 策略：
 *   在注册时记录原始 schema，在 handler 入口手动 safeParse，
 *   将 Zod 错误转为结构化 ToolError 返回给 AI（含字段名提示 + hint）。
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { makeToolError } from './toolResponse.js';

/** 从 inputSchema 对象提取字段名列表 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFieldNames(schemaObj: Record<string, z.ZodTypeAny>): string[] {
  return Object.keys(schemaObj);
}

/**
 * 替代 server.registerTool 的安全版本。
 *
 * 用法与原版完全一致，只是自动包裹了：
 * 1. 手动 safeParse（捕获参数校验失败）
 * 2. 业务逻辑 try-catch（捕获运行时错误）
 */
export function registerSafeTool(
  server: McpServer,
  name: string,
  config: {
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputSchema: Record<string, z.ZodTypeAny> | z.ZodType<any>;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (params: any) => Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawInput = config.inputSchema as any;
  const isZodObject = rawInput && typeof rawInput.shape === 'object';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fieldNames = isZodObject ? extractFieldNames(rawInput.shape as any) : [];

  // 用宽松 schema 注册：让 SDK 放行所有参数
  const looseSchema = z.object({}).passthrough();

  (server as any).registerTool(
    name,
    {
      description: config.description,
      inputSchema: looseSchema as unknown as Record<string, z.ZodTypeAny>,
    },
    async (rawParams: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = rawParams as any;

      // ── 手动 Zod 校验 ──
      if (isZodObject) {
        const parseResult = rawInput.safeParse(params);
        if (!parseResult.success) {
          const issues = parseResult.error.issues ?? [];
          const fieldErrors = issues.map((i: z.ZodIssue) => {
            const path = i.path.join('.');
            const received = path ? JSON.stringify((params as any)?.[path] ?? params) : JSON.stringify(params);
            return `  • 字段 "${path}": ${i.message} (收到值: ${received})`;
          });

          return makeStructuredError(
            name,
            'VALIDATION_ERROR',
            `参数校验失败 (${issues.length} 个问题):\n${fieldErrors.join('\n')}`,
            [
              `"${name}" 的必填参数: [${fieldNames.join(', ')}]`,
              `请检查参数名拼写是否正确（注意大小写和下划线风格）`,
            ].join('\n'),
          );
        }
      }

      // ── 执行业务逻辑 ──
      try {
        return await handler(params);
      } catch (err) {
        return makeToolError(name, undefined, err);
      }
    },
  );
}

function makeStructuredError(
  toolName: string,
  code: 'VALIDATION_ERROR' | 'API_ERROR' | 'INTERNAL_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED',
  message: string,
  hint: string,
): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: 'error',
        error: { code, message, toolName, hint },
        isError: true,
      }, null, 2),
    }],
    isError: true,
  };
}
