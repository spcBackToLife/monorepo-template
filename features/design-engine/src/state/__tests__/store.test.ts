/**
 * Store 单元测试（bun test）
 */

import { describe, expect, it, mock } from 'bun:test';
import { createStore, createEmptyState } from '../index';

describe('Store', () => {
  it('getState 返回初始值', () => {
    const s = createStore(createEmptyState());
    expect(s.getState()).toEqual({ data: {}, view: {}, effects: {} });
  });

  it('setState 派发新状态并通知订阅', () => {
    const s = createStore(createEmptyState());
    const listener = mock(() => {});
    s.subscribe(listener);
    s.setState((st) => ({ ...st, view: { x: 1 } }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.getState().view.x).toBe(1);
  });

  it('相同引用不通知订阅', () => {
    const s = createStore(createEmptyState());
    const listener = mock(() => {});
    s.subscribe(listener);
    s.setState((st) => st);
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it('unsubscribe 后不再收到通知', () => {
    const s = createStore(createEmptyState());
    const listener = mock(() => {});
    const unsub = s.subscribe(listener);
    unsub();
    s.setState((st) => ({ ...st, view: { x: 1 } }));
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it('一个订阅者抛错不影响其它订阅者', () => {
    const s = createStore(createEmptyState());
    const good = mock(() => {});
    const bad = () => {
      throw new Error('boom');
    };
    s.subscribe(bad);
    s.subscribe(good);
    s.setState((st) => ({ ...st, view: { x: 1 } }));
    expect(good).toHaveBeenCalledTimes(1);
  });
});
