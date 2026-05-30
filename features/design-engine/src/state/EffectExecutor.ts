/**
 * EffectExecutor — 处理 `effect.fetch` / `effect.cancel` 副作用。
 *
 * 设计要点（对齐 RFC §2.3 + v2.6 NetworkPolicy）：
 *   - 默认走 MockDriver（编辑器/Storybook 用 mock）
 *   - 切到 HttpDriver（生产/真实接口）由 env 决定
 *   - 每个 fetch 在 store.effects[dataSourceId] 上同步写状态：
 *       pending → success | error
 *   - 支持 cancel：内部维护 AbortController；状态置回 idle
 *   - mock 通过 setTimeout 模拟 delay；isTimeout 走 reject
 *   - **NetworkPolicy（v2.6）**：endpoint.networkPolicy.timeout 触发自动 abort + code='TIMEOUT'；
 *     retryCount + retryDelay + retryOn 实现指数退避重试。
 *     主动 cancel 与超时 abort 区分：reason='cancel' → status='idle'；reason='timeout' → status='error'。
 *
 * 与 Dispatcher 协作：本 executor 只跑 fetch/cancel 本身，不展开 onSuccess/onError
 * 链 —— 那是 Dispatcher 的职责。返回 Promise<EffectStatus> 让 Dispatcher 决定接下来
 * 跑哪个分支。
 */

import type {
  ApiDataSource,
  ApiEndpoint,
  DataSource,
  EffectStatus,
  ErrorCode,
  NetworkPolicy,
} from '@globallink/design-schema';

export type Env = 'mock' | 'http';

/**
 * AbortController.abort 的 reason 类型。区分主动取消 vs 超时触发。
 */
const ABORT_REASON_TIMEOUT = '__effect_timeout__';
const ABORT_REASON_CANCEL = '__effect_cancel__';

export interface EffectDriver {
  /** 执行一次 fetch，返回最终的 EffectStatus（含 data/error/timestamps） */
  fetch(
    dataSource: ApiDataSource,
    params: Record<string, unknown> | undefined,
    signal: AbortSignal,
  ): Promise<EffectStatus>;
}

// ===== MockDriver =====

export class MockDriver implements EffectDriver {
  fetch(
    dataSource: ApiDataSource,
    _params: Record<string, unknown> | undefined,
    signal: AbortSignal,
  ): Promise<EffectStatus> {
    const mock = dataSource.mock;
    const startedAt = Date.now();
    if (!mock) {
      return Promise.resolve({
        status: 'error',
        error: { code: 'NETWORK_ERROR', message: `dataSource "${dataSource.id}" has no mock config` },
        startedAt,
        finishedAt: Date.now(),
      });
    }
    const scenario = mock.scenarios.find((s) => s.id === mock.activeScenarioId)
      ?? mock.scenarios[0];
    if (!scenario) {
      return Promise.resolve({
        status: 'error',
        error: { code: 'NETWORK_ERROR', message: `dataSource "${dataSource.id}" has no active mock scenario` },
        startedAt,
        finishedAt: Date.now(),
      });
    }

    return new Promise<EffectStatus>((resolve) => {
      const timer = setTimeout(() => {
        if (signal.aborted) {
          // 区分 abort 原因：timeout vs cancel
          if (signal.reason === ABORT_REASON_TIMEOUT) {
            resolve({
              status: 'error',
              error: { code: 'TIMEOUT', message: 'request timeout' },
              startedAt,
              finishedAt: Date.now(),
            });
          } else {
            resolve({
              status: 'idle',
              startedAt,
              finishedAt: Date.now(),
            });
          }
          return;
        }
        if (scenario.isTimeout) {
          resolve({
            status: 'error',
            error: { code: 'TIMEOUT', message: `mock timeout` },
            startedAt,
            finishedAt: Date.now(),
          });
          return;
        }
        if (scenario.statusCode >= 200 && scenario.statusCode < 300) {
          resolve({
            status: 'success',
            data: scenario.responseBody,
            startedAt,
            finishedAt: Date.now(),
          });
        } else if (scenario.statusCode >= 500) {
          resolve({
            status: 'error',
            error: {
              code: 'SERVER_ERROR',
              message: `mock status ${scenario.statusCode}`,
            },
            startedAt,
            finishedAt: Date.now(),
          });
        } else {
          // 4xx 业务错：保留原始数字 code（业务错误码由 responseBody.code 由上层 logic.switch 消费）
          resolve({
            status: 'error',
            error: {
              code: scenario.statusCode,
              message: `mock status ${scenario.statusCode}`,
            },
            startedAt,
            finishedAt: Date.now(),
          });
        }
      }, scenario.delay);

      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        if (signal.reason === ABORT_REASON_TIMEOUT) {
          resolve({
            status: 'error',
            error: { code: 'TIMEOUT', message: 'request timeout' },
            startedAt,
            finishedAt: Date.now(),
          });
        } else {
          resolve({
            status: 'idle',
            startedAt,
            finishedAt: Date.now(),
          });
        }
      });
    });
  }
}

// ===== HttpDriver =====

/** 简易 HttpDriver；不依赖第三方库，使用全局 fetch（Node18+/浏览器/Bun 都有） */
export class HttpDriver implements EffectDriver {
  /** 可注入的 baseUrl（编辑器内通常用相对路径） */
  constructor(private readonly baseUrl: string = '') {}

  async fetch(
    dataSource: ApiDataSource,
    params: Record<string, unknown> | undefined,
    signal: AbortSignal,
  ): Promise<EffectStatus> {
    const startedAt = Date.now();
    const ep = dataSource.endpoint;
    try {
      const { url, init } = buildRequest(this.baseUrl, ep, params);
      const res = await globalThis.fetch(url, { ...init, signal });
      const finishedAt = Date.now();
      const data = await safeJson(res);
      if (res.ok) {
        return { status: 'success', data, startedAt, finishedAt };
      }
      // HTTP 5xx → SERVER_ERROR；4xx 保留原数字 code（业务错由 responseBody.code 消费）
      return {
        status: 'error',
        error: res.status >= 500
          ? { code: 'SERVER_ERROR', message: res.statusText || `HTTP ${res.status}` }
          : { code: res.status, message: res.statusText || `HTTP ${res.status}` },
        startedAt,
        finishedAt,
      };
    } catch (err) {
      const finishedAt = Date.now();
      // AbortError：区分 timeout vs cancel
      if (err instanceof Error && err.name === 'AbortError') {
        if (signal.reason === ABORT_REASON_TIMEOUT) {
          return {
            status: 'error',
            error: { code: 'TIMEOUT', message: 'request timeout' },
            startedAt,
            finishedAt,
          };
        }
        return { status: 'idle', startedAt, finishedAt };
      }
      // 其他错误（网络层异常）→ NETWORK_ERROR
      return {
        status: 'error',
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
        startedAt,
        finishedAt,
      };
    }
  }
}

function buildRequest(
  baseUrl: string,
  ep: ApiEndpoint,
  params: Record<string, unknown> | undefined,
): { url: string; init: RequestInit } {
  const search = new URLSearchParams();
  // query：默认 + 调用时 params 覆盖
  for (const [k, v] of Object.entries(ep.query ?? {})) {
    if (v !== undefined && v !== null) search.set(k, String(v));
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) search.set(k, String(v));
    }
  }
  const qs = search.toString();
  const url = baseUrl + ep.path + (qs ? (ep.path.includes('?') ? '&' : '?') + qs : '');
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(ep.headers ?? {})) {
    headers[k] = String(v);
  }
  let body: BodyInit | undefined;
  if (ep.method !== 'GET' && ep.method !== 'DELETE') {
    if (ep.body !== undefined) {
      const merged =
        typeof ep.body === 'object' && ep.body !== null && !Array.isArray(ep.body)
          ? { ...(ep.body as Record<string, unknown>), ...(params ?? {}) }
          : ep.body;
      body = typeof merged === 'string' ? merged : JSON.stringify(merged);
      if (!headers['Content-Type'] && typeof merged !== 'string') {
        headers['Content-Type'] = 'application/json';
      }
    } else if (params) {
      body = JSON.stringify(params);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
  }
  return {
    url,
    init: { method: ep.method, headers, body },
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    const txt = await res.text();
    if (!txt) return undefined;
    try {
      return JSON.parse(txt);
    } catch {
      return txt;
    }
  } catch {
    return undefined;
  }
}

// ===== EffectExecutor =====

/**
 * 把多个 driver 按 env 路由的执行器。
 *
 * 用法：
 *   const exec = new EffectExecutor({ mock: new MockDriver(), http: new HttpDriver() });
 *   exec.setEnv('mock');
 *   const status = await exec.run(dataSource, params);
 */
export class EffectExecutor {
  private env: Env;
  private drivers: Record<Env, EffectDriver>;
  private inflight = new Map<string, AbortController>();

  constructor(
    drivers: Partial<Record<Env, EffectDriver>> = {},
    env: Env = 'mock',
  ) {
    this.env = env;
    this.drivers = {
      mock: drivers.mock ?? new MockDriver(),
      http: drivers.http ?? new HttpDriver(),
    };
  }

  setEnv(env: Env): void {
    this.env = env;
  }
  getEnv(): Env {
    return this.env;
  }

  /**
   * 执行一次 fetch。同 dataSourceId 上一次未完成的请求会被取消。
   * 按 endpoint.networkPolicy 应用 timeout / retry 策略；详见 NetworkPolicy 注释。
   * 返回最终 EffectStatus（success/error/idle）。
   */
  async run(
    dataSource: DataSource,
    params?: Record<string, unknown>,
  ): Promise<EffectStatus> {
    if (dataSource.type !== 'api') {
      return {
        status: 'error',
        error: { code: 'NETWORK_ERROR', message: `dataSource "${dataSource.id}" is not type=api` },
      };
    }
    // 取消旧请求（区分原因为 cancel）
    this.cancel(dataSource.id);

    const policy: NetworkPolicy = dataSource.endpoint.networkPolicy ?? {};
    const maxAttempts = (policy.retryCount ?? 0) + 1;
    const retryOn = new Set<ErrorCode>(policy.retryOn ?? ['TIMEOUT', 'NETWORK_ERROR']);
    const retryDelayBase = policy.retryDelay ?? 1000;
    const driver = this.drivers[this.env];

    let lastStatus: EffectStatus | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      this.inflight.set(dataSource.id, controller);

      // 安装 timeout 定时器（如配置了）
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (policy.timeout && policy.timeout > 0) {
        timeoutId = setTimeout(() => {
          controller.abort(ABORT_REASON_TIMEOUT);
        }, policy.timeout);
      }

      let status: EffectStatus;
      try {
        status = await driver.fetch(dataSource, params, controller.signal);
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
        // 仅当当前 controller 还是活动 controller 时才清理
        if (this.inflight.get(dataSource.id) === controller) {
          this.inflight.delete(dataSource.id);
        }
      }

      lastStatus = status;

      // success / idle（idle = 主动 cancel）→ 立即返回，不重试
      if (status.status === 'success' || status.status === 'idle') {
        return status;
      }
      // error：根据 retryOn 判断是否重试
      const code = status.error?.code;
      const isRetryable =
        typeof code === 'string' && retryOn.has(code as ErrorCode);
      if (!isRetryable || attempt >= maxAttempts - 1) {
        return status;
      }
      // 指数退避后重试
      const delay = retryDelayBase * Math.pow(2, attempt);
      await sleep(delay);
    }

    // 理论不可达；兜底
    return lastStatus ?? {
      status: 'error',
      error: { code: 'NETWORK_ERROR', message: 'unknown error' },
    };
  }

  /**
   * 取消进行中的 fetch（主动取消，对应 effect.cancel action）。
   * 不传 dataSourceId 取消全部。
   * 取消触发 status='idle'（与超时区分）。
   */
  cancel(dataSourceId?: string): void {
    if (dataSourceId === undefined) {
      for (const ctrl of this.inflight.values()) ctrl.abort(ABORT_REASON_CANCEL);
      this.inflight.clear();
      return;
    }
    const ctrl = this.inflight.get(dataSourceId);
    if (ctrl) {
      ctrl.abort(ABORT_REASON_CANCEL);
      this.inflight.delete(dataSourceId);
    }
  }

  /** 是否有 dataSource 正在 pending */
  isPending(dataSourceId: string): boolean {
    return this.inflight.has(dataSourceId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
