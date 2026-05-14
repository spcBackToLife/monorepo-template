import type { Expression } from './expression';

// ===== Type metadata for codegen =====

/** Type field definition for codegen */
export interface TypeField {
  /** Field name */
  name: string;
  /** TypeScript type (e.g., "string", "number", "'user' | 'assistant'", "Message[]") */
  type: string;
  /** Whether the field is optional */
  optional?: boolean;
  /** Field description (for JSDoc) */
  description?: string;
}

/** Type definition metadata for a DataSource */
export interface DataSourceTypeDef {
  /** Response type name (PascalCase), e.g., "Message", "ChatSendResponse" */
  responseName: string;
  /** Whether response is array or object */
  responseShape: 'array' | 'object';
  /** Fields of the response type (if array, describes single item) */
  responseFields: TypeField[];
  /** Request params type name (for POST/PUT) */
  paramsName?: string;
  /** Request params fields */
  paramsFields?: TypeField[];
}

/** HTTP 请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 真实接口配置 */
export interface ApiEndpoint {
  method: HttpMethod;
  /** 路径，可含 {{ state.x }} 表达式参数 */
  path: string;
  headers?: Record<string, string | Expression<string>>;
  query?: Record<string, Expression | unknown>;
  /** 请求体（POST/PUT/PATCH） */
  body?: Expression | Record<string, Expression | unknown>;
  /** 响应数据结构描述（编辑器 hints + codegen 类型用） */
  responseSchema?: Record<string, unknown>;
}

/** Mock 场景 */
export interface MockScenario {
  id: string;
  name: string;
  description?: string;
  /** HTTP 状态码 */
  statusCode: number;
  /** 模拟网络延迟 ms */
  delay: number;
  /** 是否模拟 timeout */
  isTimeout?: boolean;
  /** 响应体（任意 JSON） */
  responseBody: unknown;
}

/** Mock 配置（仅 type='api' 数据源用） */
export interface MockConfig {
  scenarios: MockScenario[];
  activeScenarioId: string;
}

/**
 * 数据源 —— v2 模型。
 * 运行时由 EffectExecutor 消费：static 同步注入，api 触发 effect.fetch。
 * mock 与 endpoint 共存：编辑器/Storybook 用 mock，生产 codegen 用 endpoint。
 */
export type DataSource = StaticDataSource | ApiDataSource;

export interface StaticDataSource {
  id: string;
  type: 'static';
  name: string;
  description?: string;
  /** 启动时同步注入到 state.data[name] */
  initial: unknown;
}

export interface ApiDataSource {
  id: string;
  type: 'api';
  name: string;
  description?: string;
  endpoint: ApiEndpoint;
  /** Mock 配置：可选；缺失时编辑器/storybook 也走真实接口 */
  mock?: MockConfig;
  /** 是否在 screenEnter 时自动 fetch（默认 true） */
  autoFetchOnEnter?: boolean;
  /** 自动 fetch 时携带的默认参数 */
  defaultParams?: Record<string, Expression | unknown>;
  /**
   * 响应类型定义。
   * codegen 直接使用这里的类型名和字段，不再靠 mock 推导。
   */
  typeDef?: DataSourceTypeDef;
}
