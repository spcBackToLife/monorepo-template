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

  it('statusCode>=400 返回 error', async () => {
    const exec = new EffectExecutor({ mock: new MockDriver() }, 'mock');
    const ds = makeDs({
      mock: {
        activeScenarioId: 'err',
        scenarios: [{ id: 'err', name: 'err', statusCode: 500, delay: 0, responseBody: 'oops' }],
      },
    });
    const status = await exec.run(ds);
    expect(status.status).toBe('error');
    expect(status.error?.code).toBe(500);
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
