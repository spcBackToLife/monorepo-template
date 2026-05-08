/**
 * Store — 运行时 ScreenState 容器。
 *
 * 与 Redux-like 相似但更轻：
 *   - 同步 dispatch（action 是 PlainAction，由 Reducer 生成 nextState）
 *   - 订阅者收到"状态已变"通知（不传 diff，自行比对）
 *   - getState / setState / dispatch / subscribe
 *
 * 注意：effect.fetch 等副作用不直接走 dispatch，走 Dispatcher（A.3 的另一文件）。
 */

import type { ScreenState } from '@globallink/design-schema';

export type Listener = () => void;
export type Updater = (s: ScreenState) => ScreenState;

export interface Store {
  /** 读当前 state（不可变约定；调用方勿直接改） */
  getState(): ScreenState;
  /**
   * 用 updater 函数派生新 state；内部做引用替换后通知订阅者。
   * 与 Redux 的 dispatch(action) 相比更裸 —— 因为我们的"动词"在 Reducer 里，Store 只管替换。
   */
  setState(updater: Updater): void;
  /** 订阅变化，返回取消订阅函数 */
  subscribe(listener: Listener): () => void;
}

/** 创建一个空的 ScreenState */
export function createEmptyState(): ScreenState {
  return {
    data: {},
    view: {},
    effects: {},
  };
}

/** 创建一个 Store */
export function createStore(initialState: ScreenState = createEmptyState()): Store {
  let state: ScreenState = initialState;
  const listeners = new Set<Listener>();

  return {
    getState() {
      return state;
    },
    setState(updater) {
      const next = updater(state);
      if (next === state) return;
      state = next;
      for (const l of listeners) {
        // 订阅者抛错不应影响其它订阅者
        try {
          l();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[design-engine:Store] listener error:', err);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
