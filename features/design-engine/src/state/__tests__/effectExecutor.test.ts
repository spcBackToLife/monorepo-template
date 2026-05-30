/**
 * EffectExecutor + MockDriver 单测
 */

import { describe, expect, it } from 'bun:test';
import type { ApiDataSource } from '@globallink/design-schema';
import { EffectExecutor, MockDriver } from '../index';

function makeDs(overrides: Partial<ApiDataSource> = {}): ApiDataSource {
  return {
    id: 'chat-list',
    type: 'api',
    name: 'chatList',
    endpoint: { method: 'GET', path: '/chat/list' },
    mock: {
      scenarios: [
        {
          id: 'ok',
          name: 'ok',
          statusCode: 200,
          delay: 10,
          responseBody: { messages: [{ role: 'user', text: 'hi' }] },
        },
      ],
      activeScenarioId: 'ok',
    },
    ...overrides,
  };
}

describe('EffectExecutor + MockDriver', () => {
  it('默认返回 success + responseBody', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const status = await exec.run(makeDs());
    expect(status.status).toBe('success');
    expect(status.data).toEqual({ messages: [{ role: 'user', text: 'hi' }] });
    expect(status.startedAt).toBeGreaterThan(0);
    expect(status.finishedAt).toBeGreaterThanOrEqual(status.startedAt!);
  });

  it('statusCode 5xx 归一化为 SERVER_ERROR', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      mock: {
        activeScenarioId: 'err',
        scenarios: [{ id: 'err', name: 'err', statusCode: 500, delay: 0, responseBody: 'oops' }],
      },
    });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
    expect(status.error?.code).toBe('SERVER_ERROR');
  });

  it('statusCode 4xx 业务错保留原数字 code', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      mock: {
        activeScenarioId: 'biz',
        scenarios: [{ id: 'biz', name: 'biz', statusCode: 401, delay: 0, responseBody: { code: 'CREDENTIAL' } }],
      },
    });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
    expect(status.error?.code).toBe(401);
  });

  it('isTimeout 走 error', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      mock: {
        activeScenarioId: 'to',
        scenarios: [
          { id: 'to', name: 'to', statusCode: 200, delay: 0, isTimeout: true, responseBody: null },
        ],
      },
    });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
    expect(status.error?.code).toBe('TIMEOUT');
  });

  it('无 mock 配置返回 error', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({ mock: undefined });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
  });

  it('cancel 进行中的请求', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      mock: {
        activeScenarioId: 'slow',
        scenarios: [{ id: 'slow', name: 'slow', statusCode: 200, delay: 50, responseBody: 1 }],
      },
    });
    const p = exec.run(ds);
    expect(exec.isPending(ds.id)).toBe(true);
    exec.cancel(ds.id);
    const status = await p;
    expect(status.status).toBe('idle');
    expect(exec.isPending(ds.id)).toBe(false);
  });

  it('再次发起同一 id 会取消旧请求', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      mock: {
        activeScenarioId: 'slow',
        scenarios: [{ id: 'slow', name: 'slow', statusCode: 200, delay: 30, responseBody: 1 }],
      },
    });
    const p1 = exec.run(ds);
    const p2 = exec.run(ds);
    const [s1, s2] = await Promise.all([p1, p2]);
    expect(s1.status).toBe('idle'); // 被后一次挤掉
    expect(s2.status).toBe('success');
  });

  it('static 源返回 error（不是 api）', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const status = await exec.run({
      id: 'x',
      type: 'static',
      name: 'x',
      initial: { a: 1 },
    });
    expect(status.status).toBe('error');
  });

  it('setEnv 切换', () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    expect(exec.getEnv()).toBe('mock');
    exec.setEnv('http');
    expect(exec.getEnv()).toBe('http');
  });
});

describe('NetworkPolicy (v2.6)', () => {
  it('endpoint.networkPolicy.timeout 触发自动 abort + code=TIMEOUT', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      endpoint: {
        method: 'GET',
        path: '/slow',
        networkPolicy: { timeout: 30 },
      },
      mock: {
        activeScenarioId: 'slow',
        scenarios: [{ id: 'slow', name: 'slow', statusCode: 200, delay: 200, responseBody: 1 }],
      },
    });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
    expect(status.error?.code).toBe('TIMEOUT');
  });

  it('TIMEOUT 触发后按 retryCount 重试，最终成功', async () => {
    // 先快速失败一次（mock isTimeout），然后切场景模拟"重试时网络变好"——
    // 因为 mock 是按 activeScenarioId 静态返回，重试同 ds 也会走同一场景。
    // 所以这里只测"重试发生"——retryCount=2，timeout 触发，最终仍 TIMEOUT，但发生过 3 次尝试。
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    let invocations = 0;
    const driver: MockDriver = {
      fetch: async () => {
        invocations++;
        return {
          status: 'error',
          error: { code: 'TIMEOUT', message: 'forced' },
          startedAt: Date.now(),
          finishedAt: Date.now(),
        };
      },
    } as MockDriver;
    const exec2 = new EffectExecutor({ mock: driver }, 'mock');
    const ds = makeDs({
      endpoint: {
        method: 'GET',
        path: '/r',
        networkPolicy: { retryCount: 2, retryDelay: 1, retryOn: ['TIMEOUT'] },
      },
    });
    const status = await exec2.run(ds);
    expect(status.status).toBe('error');
    expect(status.error?.code).toBe('TIMEOUT');
    expect(invocations).toBe(3); // 1 次首发 + 2 次重试
    void exec; // 避开未使用警告
  });

  it('retryOn 不包含返回的 code → 不重试', async () => {
    let invocations = 0;
    const driver = {
      fetch: async () => {
        invocations++;
        return {
          status: 'error' as const,
          error: { code: 'CREDENTIAL', message: '401' },
        };
      },
    } as MockDriver;
    const exec = new EffectExecutor({ mock: driver }, 'mock');
    const ds = makeDs({
      endpoint: {
        method: 'POST',
        path: '/x',
        networkPolicy: { retryCount: 3, retryOn: ['TIMEOUT', 'NETWORK_ERROR'] },
      },
    });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
    expect(invocations).toBe(1); // 业务错不重试
  });

  it('retry 间隔走指数退避', async () => {
    const callTimes: number[] = [];
    const driver = {
      fetch: async () => {
        callTimes.push(Date.now());
        return {
          status: 'error' as const,
          error: { code: 'TIMEOUT', message: 'x' },
        };
      },
    } as MockDriver;
    const exec = new EffectExecutor({ mock: driver }, 'mock');
    const ds = makeDs({
      endpoint: {
        method: 'GET',
        path: '/x',
        networkPolicy: { retryCount: 2, retryDelay: 20, retryOn: ['TIMEOUT'] },
      },
    });
    await exec.run(ds);
    expect(callTimes.length).toBe(3);
    // attempt 0→1 间隔 ~20ms（base*2^0），attempt 1→2 间隔 ~40ms（base*2^1）
    expect(callTimes[1]! - callTimes[0]!).toBeGreaterThanOrEqual(15);
    expect(callTimes[2]! - callTimes[1]!).toBeGreaterThanOrEqual(35);
  });

  it('主动 cancel vs 自动 timeout 区分：cancel→idle, timeout→error', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      endpoint: {
        method: 'GET', path: '/y',
        networkPolicy: { timeout: 200 },
      },
      mock: {
        activeScenarioId: 'slow',
        scenarios: [{ id: 'slow', name: 'slow', statusCode: 200, delay: 100, responseBody: 1 }],
      },
    });
    const p = exec.run(ds);
    exec.cancel(ds.id); // 主动取消（早于 timeout）
    const status = await p;
    expect(status.status).toBe('idle');
  });
});
