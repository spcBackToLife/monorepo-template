import type { ApiEndpoint } from '@globallink/design-schema';
import type { MockResponse } from './EventExecutionEngine';

/**
 * MockExecutor simulates API requests in preview mode.
 * It looks up the active scenario for a given requestId and returns
 * the corresponding mock response after the configured delay.
 */
export class MockExecutor {
  private endpoints: Map<string, ApiEndpoint> = new Map();
  /** Track pending request timeouts so they can be cancelled */
  private pendingTimers: Map<string, { reject: (reason: string) => void }> = new Map();
  private requestCounter = 0;

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

    // Track this request for cancellation
    const trackingKey = `${requestId}_${++this.requestCounter}`;

    if (scenario.delay > 0) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.pendingTimers.set(trackingKey, { reject: (r) => reject(new Error(r)) });
          setTimeout(() => {
            this.pendingTimers.delete(trackingKey);
            resolve();
          }, scenario.delay);
        });
      } catch {
        // Request was cancelled during delay
        return { success: false, status: 0, data: null, message: 'Request cancelled' };
      }
    }
    this.pendingTimers.delete(trackingKey);

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

  /** Cancel a specific pending request, or all if no requestId given */
  cancel(requestId?: string): void {
    if (requestId) {
      // Cancel all pending timers whose key starts with this requestId
      for (const [key, pending] of this.pendingTimers) {
        if (key.startsWith(`${requestId}_`)) {
          pending.reject('cancelled');
          this.pendingTimers.delete(key);
        }
      }
    } else {
      this.cancelAll();
    }
  }

  /** Cancel all pending requests */
  cancelAll(): void {
    for (const [key, pending] of this.pendingTimers) {
      pending.reject('cancelled');
      this.pendingTimers.delete(key);
    }
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
