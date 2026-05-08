/**
 * State 模块 — 运行时状态管理。
 *
 * 与 design-schema v2 模型对齐：
 *   - Store：ScreenState 容器（data/view/effects 三命名空间）
 *   - Reducer：纯函数处理 state.* 动词
 *   - EffectExecutor：按 env 路由 MockDriver / HttpDriver
 *   - Dispatcher：串行执行 Action 链，串 state/effect/nav/ui/custom
 *
 * 使用：
 *   const store = createStore({ data:{}, view:{}, effects:{} });
 *   const effects = new EffectExecutor({ mock, http }, 'mock');
 *   const dispatcher = new Dispatcher({ store, effects, dataSources: (id) => byId.get(id), host });
 *   await dispatcher.run(event.actions);
 */

export { createStore, createEmptyState } from './Store';
export type { Store, Listener, Updater } from './Store';

export {
  reduceStateAction,
  reduceStateSet,
  reduceStateAppend,
  reduceStateRemove,
  reduceStateMerge,
  reduceStateToggle,
  parsePath,
  getByPath,
  setByPath,
} from './Reducer';
export type { StateMutationAction } from './Reducer';

export {
  EffectExecutor,
  MockDriver,
  HttpDriver,
} from './EffectExecutor';
export type { EffectDriver, Env } from './EffectExecutor';

export { Dispatcher } from './Dispatcher';
export type {
  HostAdapters,
  DataSourceResolver,
  DispatcherDeps,
} from './Dispatcher';
