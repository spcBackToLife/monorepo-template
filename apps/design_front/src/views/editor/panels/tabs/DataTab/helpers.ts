/**
 * DataTab 公共工具 —— 纯函数，无组件依赖。
 *
 * 关联 RFC：design_docs/03-tech/state-action-expression-rfc.md §2.2
 * D.3 任务：为 endpoint + mock 共存模型的 v2 数据源面板服务。
 */

import {
  expr,
  generateId,
  type ApiDataSource,
  type ApiEndpoint,
  type DataSource,
  type HttpMethod,
  type MockScenario,
  type StaticDataSource,
} from '@globallink/design-schema';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-600 bg-green-50',
  POST: 'text-blue-600 bg-blue-50',
  PUT: 'text-amber-600 bg-amber-50',
  PATCH: 'text-orange-600 bg-orange-50',
  DELETE: 'text-red-600 bg-red-50',
};

// ===== 输入 ↔ JSON 值互转 =====

/** 优先尝试 JSON.parse；失败按原文本返回 */
export function parseUserInput(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
}

/** 值 → 输入框展示文本：字符串加引号、复杂类型 JSON 序列化 */
export function formatValue(value: unknown): string {
  if (value === undefined) return '""';
  if (typeof value === 'string') return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** 多行 JSON（含缩进），用于 textarea */
export function formatJsonBlock(value: unknown): string {
  if (value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

// ===== 工厂函数 =====

/** 新空 static 数据源 */
export function makeEmptyStaticDataSource(name: string): StaticDataSource {
  return {
    id: generateId(),
    type: 'static',
    name,
    description: '',
    initial: {},
  };
}

/** 新空 api 数据源（含默认 mock 场景） */
export function makeEmptyApiDataSource(name: string, method: HttpMethod, path: string): ApiDataSource {
  const scenarioId = generateId();
  const defaultScenario: MockScenario = {
    id: scenarioId,
    name: '成功',
    statusCode: 200,
    delay: 300,
    responseBody: { success: true, data: {} },
  };
  return {
    id: generateId(),
    type: 'api',
    name,
    description: '',
    endpoint: {
      method,
      path,
    },
    mock: {
      scenarios: [defaultScenario],
      activeScenarioId: scenarioId,
    },
    autoFetchOnEnter: true,
  };
}

/** 新默认 mock 场景（用于"添加场景"按钮） */
export function makeDefaultMockScenario(): MockScenario {
  return {
    id: generateId(),
    name: '新场景',
    statusCode: 200,
    delay: 300,
    responseBody: {},
  };
}

// ===== 类型辅助 =====

export function isApiDataSource(ds: DataSource): ds is ApiDataSource {
  return ds.type === 'api';
}

export function isStaticDataSource(ds: DataSource): ds is StaticDataSource {
  return ds.type === 'static';
}

/**
 * 解析 endpoint body 文本：
 * - 空字符串 → undefined
 * - 合法 JSON 对象 → 对应对象值
 * - 其它（非对象 JSON / 纯文本 / 含 `{{ }}` 模板）→ 包成 Expression 字符串，
 *   交由运行时表达式引擎按字符串求值并序列化为请求体。
 */
export function parseEndpointBody(text: string): ApiEndpoint['body'] {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return expr<unknown>(trimmed);
  } catch {
    return expr<unknown>(trimmed);
  }
}
