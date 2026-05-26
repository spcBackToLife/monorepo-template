/**
 * Mock Manager — 运行时 Mock 拦截管理器
 *
 * 架构设计：
 *   - 在 request.ts 的 request() 函数中拦截，对匹配的 API 请求返回 mock 数据
 *   - 开关模式：全局 enableMock() / disableMock()
 *   - 关闭时零开销：直接走真实请求
 *
 * @see schema 中的 ApiDataSource.mock.scenarios / activeScenarioId
 */

// ─── Types ────────────────────────────────────────────────

export interface MockScenario {
  id: string;
  name: string;
  description?: string;
  statusCode: number;
  delay: number;
  isTimeout?: boolean;
  responseBody: unknown;
}

export interface MockConfig {
  scenarios: MockScenario[];
  activeScenarioId: string;
}

// ─── State ────────────────────────────────────────────────

let _enabled = false;
let _config: Record<string, MockConfig> = {};

/** Per-DS active scenario override (keyed by dataSource ID) */
const _scenarioOverrides = new Map<string, string>();

// ─── Public API ────────────────────────────────────────────

/**
 * 加载 mock 配置（由 codegen 生成的 mock-data.ts 调用）
 * 必须在使用前调用一次
 */
export function initMock(config: Record<string, MockConfig>): void {
  _config = config;
}

/**
 * 启用 mock 模式 — 所有后续请求走 mock
 */
export function enableMock(): void {
  _enabled = true;
  console.log('[Mock] ✅ Mock mode ENABLED');
}

/**
 * 关闭 mock 模式 — 所有后续请求走真实 API
 */
export function disableMock(): void {
  _enabled = false;
  console.log('[Mock] ❌ Mock mode DISABLED');
}

/**
 * 查询 mock 当前是否启用
 */
export function isMockEnabled(): boolean {
  return _enabled;
}

/**
 * 切换指定数据源的激活场景
 * @param dataSourceId 数据源 ID（如 "chat-list"）
 * @param scenarioId 场景 ID
 */
export function switchScenario(dataSourceId: string, scenarioId: string): boolean {
  const cfg = _config[dataSourceId];
  if (!cfg || !cfg.scenarios.some(s => s.id === scenarioId)) return false;
  _scenarioOverrides.set(dataSourceId, scenarioId);
  return true;
}

/**
 * 重置场景覆盖，回到配置默认值
 */
export function resetScenarioOverride(dataSourceId: string): void {
  _scenarioOverrides.delete(dataSourceId);
}

// ─── Internal: used by request.ts ───────────────────────

/**
 * 尝试获取 mock 响应。
 * @returns { data, delay, statusCode } 或 null（如果不 mock / 不匹配）
 */
export function tryGetMockResponse(
  url: string,
  _method: string,
): { data: unknown; delay: number; statusCode: number } | null {
  if (!_enabled) return null;

  // Find matching dataSource by URL pattern
  const cfg = findConfigForUrl(url);
  if (!cfg) return null;

  const activeScenarioId = _scenarioOverrides.get(cfg._dsId) ?? cfg.activeScenarioId;
  const scenario = cfg.scenarios.find(s => s.id === activeScenarioId) ?? cfg.scenarios[0];
  if (!scenario) return null;

  // Non-2xx scenarios simulate error
  if (scenario.statusCode < 200 || scenario.statusCode >= 300) {
    console.warn(`[Mock] ⚠️ Scenario "${scenario.name}" → status ${scenario.statusCode}`);
    return null;
  }

  // Timeout scenario
  if (scenario.isTimeout) {
    console.warn(`[Mock] ⏱️ Scenario "${scenario.name}" → timeout`);
    return null;
  }

  return {
    data: scenario.responseBody,
    delay: scenario.delay,
    statusCode: scenario.statusCode,
  };
}

// ─── Helpers ───────────────────────────────────────────────

interface MockConfigWithDsId extends MockConfig {
  _dsId: string;
}

function findConfigForUrl(url: string): MockConfigWithDsId | null {
  for (const [dsId, cfg] of Object.entries(_config)) {
    const endpoint = _endpointMap[dsId];
    if (endpoint && url.includes(endpoint.replace(/^\/api/, ''))) {
      return { ...cfg, _dsId: dsId };
    }
    if (endpoint && url.includes(endpoint)) {
      return { ...cfg, _dsId: dsId };
    }
  }
  return null;
}

/**
 * Endpoint mapping: dataSourceId → URL path.
 * Populated by codegen-generated mock-data.ts via _setEndpointMap().
 */
let _endpointMap: Record<string, string> = {};

/**
 * Set the endpoint mapping (called from generated mock-data.ts)
 */
export function _setEndpointMap(map: Record<string, string>): void {
  _endpointMap = map;
}

// ─── Debug / Admin UI helpers ──────────────────────────────

/**
 * Get all loaded mock configs (for admin page rendering)
 */
export function getMockConfigs(): Record<string, MockConfig> {
  return _config;
}

/**
 * Get current effective scenario ID per dataSource
 */
export function getActiveScenarioIds(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [dsId, cfg] of Object.entries(_config)) {
    result[dsId] = _scenarioOverrides.get(dsId) ?? cfg.activeScenarioId;
  }
  return result;
}
