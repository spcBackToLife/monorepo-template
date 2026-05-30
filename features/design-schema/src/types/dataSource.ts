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

/**
 * 标准化错误码枚举（NetworkPolicy / EffectStatus.error.code 共用语义边界）。
 *
 * 设计原则：按"用户该怎么处理"分类，不按 HTTP 协议分类。
 *   - TIMEOUT：链路慢 → 用户该重试 / 换时段
 *   - NETWORK_ERROR：物理断网 / DNS / connection refused → 用户该开网络
 *   - SERVER_ERROR：5xx → 服务方问题，需上报
 *   - 业务错误码（CREDENTIAL / LOCKED / LIMIT_EXCEEDED 等）：由具体业务约定，不在此枚举
 */
export type ErrorCode =
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR';

/**
 * 网络层策略（v2.6 ★）：超时 / 重试 / 取消的统一配置。
 *
 * 与 effect.cancel 的关系：
 *   - effect.cancel 主动取消 → status='idle'（与超时/失败语义不同）
 *   - networkPolicy.timeout 自动触发 → status='error' + code='TIMEOUT'
 *
 * 与 MockScenario.isTimeout 的关系：
 *   - mock 场景 isTimeout=true → 强制走超时分支（无视 timeout 阈值）
 *   - mock 场景 delay > timeout → 也走超时分支（运行时按阈值兜底）
 */
export interface NetworkPolicy {
  /**
   * 整个请求的最长时间（毫秒）。
   * undefined = 不限时（沿用浏览器/平台默认）。
   * 触发后 status='error' + error.code='TIMEOUT'。
   */
  timeout?: number;
  /**
   * 重试次数（不含首次请求）。默认 0（不重试）。
   * 仅当返回的 error.code 命中 retryOn 时才重试。
   */
  retryCount?: number;
  /**
   * 重试间隔基数（毫秒），指数退避：实际间隔 = retryDelay * 2^attempt。
   * 默认 1000ms。
   */
  retryDelay?: number;
  /**
   * 哪些错误码触发重试。默认 ['TIMEOUT', 'NETWORK_ERROR']（不重试业务错误如 CREDENTIAL/LOCKED）。
   */
  retryOn?: ErrorCode[];
}

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
  /**
   * 网络层策略（v2.6 ★）：超时 / 重试 / 取消。
   * undefined = 沿用平台默认（无超时无重试）。
   */
  networkPolicy?: NetworkPolicy;
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
