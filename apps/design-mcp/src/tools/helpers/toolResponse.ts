/**
 * MCP 工具响应辅助 — 统一成功/错误格式、结构化错误信息。
 *
 * 目标：
 * 1. AI 调用工具失败时能立刻知道「什么错 + 怎么修」
 * 2. 所有工具返回一致的结构化数据
 * 3. isError 标志让 MCP 客户端可区分成败
 */

/** 结构化错误对象 — 让 AI 能读懂并自纠 */
export interface ToolError {
  status: 'error';
  error: {
    /** 错误分类 */
    code: 'API_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'INTERNAL_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'TIMEOUT';
    /** 人可读的错误消息 */
    message: string;
    /** HTTP 状态码（如果是 API 错误） */
    statusCode?: number;
    /** 请求的 API 路径 */
    apiPath?: string;
    /** 工具名称 */
    toolName?: string;
    /** 操作 action（domain 工具用） */
    action?: string;
    /** 给 AI 的修复建议 */
    hint?: string;
    /** 原始错误栈（仅 debug 用） */
    stack?: string;
  };
  /** MCP 协议标志 */
  isError: true;
}

/** 成功的标准化响应 */
export interface ToolSuccess<T = unknown> {
  status: 'success';
  data: T;
  isError: false;
}

// ── 构造器 ──

function classifyError(err: unknown): ToolError['error']['code'] {
  if (err instanceof ApiHttpError) {
    const s = err.statusCode;
    if (s === 401 || s === 403) return 'UNAUTHORIZED';
    if (s === 404) return 'NOT_FOUND';
    if (s >= 400 && s < 500) return 'API_ERROR'; // 含 400 validation
    if (s >= 500) return 'INTERNAL_ERROR';
    // timeout / network
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) return 'NETWORK_ERROR';
  }
  if (err instanceof TypeError) return 'INTERNAL_ERROR';
  return 'INTERNAL_ERROR';
}

function buildHint(code: ToolError['error']['code'], msg: string, _toolName?: string): string | undefined {
  switch (code) {
    case 'NOT_FOUND':
      return `资源不存在。请检查 ID 是否正确，或先用 query 工具获取最新列表。`;
    case 'UNAUTHORIZED':
      return `认证/授权失败。检查 projectId 是否正确。`;
    case 'VALIDATION_ERROR':
    case 'API_ERROR':
      if (msg.includes('not found') || msg.includes('找不到'))
        return `目标节点/元素可能已被删除或 ID 有误，建议先调用 query.screen_schema 获取最新树。`;
      if (msg.includes('type') && msg.includes('undefined'))
        return `操作类型或参数格式有误，请检查 operation.type 是否在可用操作列表中。`;
      return `请求参数可能有问题。请检查必填字段是否齐全。`;
    case 'NETWORK_ERROR':
      return `后端服务 (${process.env.DESIGN_API_URL ?? 'http://localhost:3001'}) 可能未启动或网络不通。请确认服务运行状态。`;
    default:
      return undefined;
  }
}

/**
 * 将任意异常转换为结构化 ToolError 对象。
 *
 * @param toolName   - 工具名（如 element / canvas / generate_snapshots）
 * @param action     - 子操作名（如 remove / export_and_apply），domain 工具传
 * @param err        - 捕获到的异常
 * @returns          - MCP 可用的 { content, isError } 对象
 */
export function makeToolError(
  toolName: string,
  action: string | undefined,
  err: unknown,
): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const code = classifyError(err);
  const message = err instanceof Error ? err.message : String(err);
  const apiPath = err instanceof ApiHttpError ? err.apiPath : undefined;
  const statusCode = err instanceof ApiHttpError ? err.statusCode : undefined;

  const errorObj: ToolError = {
    status: 'error',
    error: {
      code,
      message,
      ...(statusCode !== undefined ? { statusCode } : {}),
      ...(apiPath !== undefined ? { apiPath } : {}),
      toolName,
      ...(action ? { action } : {}),
      hint: buildHint(code, message, toolName),
      ...(err instanceof Error && err.stack ? { stack: err.stack.split('\n').slice(0, 5).join('\n') } : {}),
    },
    isError: true,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(errorObj, null, 2) }],
    isError: true,
  };
}

/**
 * 包装任意 handler 函数，自动 catch 并返回结构化错误。
 *
 * 用法：
 * ```ts
 * handler: wrapToolHandler('canvas', 'add_object', async (params) => {
 *   // 正常逻辑直接写，不用 try/catch
 * })
 * ```
 */
export function wrapToolHandler<TArgs extends unknown[], TReturn>(
  toolName: string,
  action: string | undefined,
  fn: (...args: TArgs) => Promise<TReturn>,
) {
  return async (...args: TArgs): Promise<{ content: Array<{ type: 'text'; text: string }>; isError: boolean }> => {
    try {
      const result = await fn(...args);
      return result as { content: Array<{ type: 'text'; text: string }>; isError: boolean };
    } catch (err) {
      return makeToolError(toolName, action, err);
    }
  };
}

// ── API HTTP 错误类（供 api-client 抛出）───────────────

export class ApiHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly apiPath: string,
    public readonly method: string,
    public readonly bodyText: string,
  ) {
    super(`API ${method} ${apiPath} failed (${statusCode}): ${bodyText}`);
    this.name = 'ApiHttpError';
  }
}
