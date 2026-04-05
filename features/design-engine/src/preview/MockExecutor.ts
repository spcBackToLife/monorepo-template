import type { ApiEndpoint } from '@globallink/design-schema';
import type { MockResponse } from './EventExecutionEngine';

/**
 * MockExecutor simulates API requests in preview mode.
 * It looks up the active scenario for a given requestId and returns
 * the corresponding mock response after the configured delay.
 */
export class MockExecutor {
  private endpoints: Map<string, ApiEndpoint> = new Map();

  load(apiEndpoints: ApiEndpoint[]): void {
    this.endpoints.clear();
    for (const ep of apiEndpoints) {
      this.endpoints.set(ep.definition.id, ep);
    }
  }

  async execute(requestId: string): Promise<MockResponse> {
    const endpoint = this.endpoints.get(requestId);
    if (!endpoint) {
      return { success: false, status: 404, data: null, message: 'API endpoint not defined' };
    }

    const scenario =
      endpoint.scenarios.find((s) => s.id === endpoint.activeScenarioId) ??
      endpoint.scenarios[0];
    if (!scenario) {
      return { success: false, status: 500, data: null, message: 'No mock scenario available' };
    }

    if (scenario.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, scenario.delay));
    }

    if (scenario.isTimeout) {
      return { success: false, status: 0, data: null, message: 'Request timeout' };
    }

    const success = scenario.statusCode >= 200 && scenario.statusCode < 300;
    const responseBody = scenario.responseBody;
    const message =
      typeof responseBody === 'object' && responseBody !== null
        ? ((responseBody as Record<string, unknown>).message as string) ?? ''
        : '';

    return { success, status: scenario.statusCode, data: responseBody, message };
  }

  switchScenario(requestId: string, scenarioId: string): void {
    const ep = this.endpoints.get(requestId);
    if (ep) {
      ep.activeScenarioId = scenarioId;
    }
  }

  getEndpoints(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  clear(): void {
    this.endpoints.clear();
  }
}
