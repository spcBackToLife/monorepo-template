/**
 * Dispatcher — 串行执行 Action 链。
 *
 * 职责：
 *   - 把一个 Action[] 串起来（不并行，保证 state 一次一次走）
 *   - `state.*`  → 走 Reducer → Store.setState
 *   - `effect.fetch` → EffectExecutor.run
 *       成功 → 把 EffectStatus 写回 store.effects[id]，同时把 data 放 store.data[dataSourceName]
 *             → 展开 onSuccess 子链
 *       失败 → 写 error → 展开 onError 子链
 *       onSuccess/onError 内部的 `$last` 可访问当次 effect 的 EffectStatus
 *   - `effect.cancel` → EffectExecutor.cancel
 *   - `nav.go / nav.back / ui.showToast / ui.openUrl / ui.delay / node.setVisualState / custom`
 *     → 通过外部注入的 `hostAdapters` 委托（运行环境决定如何响应）
 *
 * 表达式求值：
 *   - action.value / action.params / Effect.params / ui.message / ui.url / condition.when
 *     在 dispatch 前用 evaluateExpression 求值
 */

import type {
  Action,
  DataSource,
  EffectStatus,
  StateSetAction,
  StateAppendAction,
  StateRemoveAction,
  StateMergeAction,
  StateToggleAction,
  LogicIfAction,
  LogicSwitchAction,
  UiStartTimerAction,
  UiStopTimerAction,
} from '@globallink/design-schema';
import { reduceStateAction } from './Reducer';
import type { Store } from './Store';
import type { EffectExecutor } from './EffectExecutor';
import { compileExpression, evaluateExpression } from '../expression';
import type { EvalContext } from '../expression';

/**
 * 宿主环境 adapter：Dispatcher 把 nav/ui/node/custom 动词委托给宿主。
 *
 * 任一回调不实现时，Dispatcher 只记日志、不抛错（保证链继续走）。
 */
export interface HostAdapters {
  onNavGo?: (targetScreenId: string, animation?: unknown) => void;
  onNavBack?: () => void;
  onShowToast?: (args: {
    toastType: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
    position?: 'top-center' | 'bottom-center' | 'top-right';
  }) => void;
  onOpenUrl?: (url: string, openInNewTab?: boolean) => void;
  onSetVisualState?: (nodeId: string | undefined, state: string, autoRevertMs?: number) => void;
  /** CSS 动画触发 — 宿主负责给目标节点注入 animation 样式 */
  onAnimate?: (nodeId: string | undefined, animation: string, duration: number, easing: string) => void;
  /** 显示全局覆盖层 */
  onShowOverlay?: (overlayId: string) => void;
  /** 隐藏全局覆盖层 */
  onHideOverlay?: (overlayId: string | undefined) => void;
  /** 业务扩展 */
  onCustomAction?: (handler: string, payload: Record<string, unknown> | undefined) => void;
}

/** 解析 dataSourceId → DataSource；上层根据 Screen.dataSources 注入 */
export type DataSourceResolver = (id: string) => DataSource | undefined;

export interface DispatcherDeps {
  store: Store;
  effects: EffectExecutor;
  dataSources: DataSourceResolver;
  host?: HostAdapters;
}

/**
 * 计时器管理器
 * 维护所有活动的计时器，支持延迟执行和循环执行
 */
class TimerManager {
  private timers = new Map<string, {
    timeoutId: ReturnType<typeof setTimeout>;
    intervalId?: ReturnType<typeof setInterval>;
    startTime: number;
    duration: number;
  }>();

  async run(
    action: UiStartTimerAction,
    dispatcher: Dispatcher,
    ctx: EvalContext,
  ): Promise<void> {
    // 若已存在同 id 的计时器，停止旧的
    const autoCancel = action.autoCancel !== false; // 默认 true
    if (autoCancel) {
      this.stop(action.timerId);
    }

    const startTime = Date.now();

    if (action.interval && action.interval > 0) {
      // 循环执行模式：每 interval ms 执行一次 onTick，直到 duration 超时
      const intervalId = setInterval(async () => {
        if (action.onTick && action.onTick.length > 0) {
          try {
            await dispatcher.run(action.onTick, ctx);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[TimerManager] onTick execution failed:', err);
          }
        }
      }, action.interval);

      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (action.onComplete && action.onComplete.length > 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            dispatcher.run(action.onComplete, ctx);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[TimerManager] onComplete execution failed:', err);
          }
        }
        this.timers.delete(action.timerId);
      }, action.duration);

      this.timers.set(action.timerId, { timeoutId, intervalId, startTime, duration: action.duration });
    } else {
      // 单次执行模式：duration 后执行 onComplete
      const timeoutId = setTimeout(() => {
        if (action.onComplete && action.onComplete.length > 0) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            dispatcher.run(action.onComplete, ctx);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[TimerManager] onComplete execution failed:', err);
          }
        }
        this.timers.delete(action.timerId);
      }, action.duration);

      this.timers.set(action.timerId, { timeoutId, startTime, duration: action.duration });
    }
  }

  stop(timerId: string): void {
    const timer = this.timers.get(timerId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      if (timer.intervalId) {
        clearInterval(timer.intervalId);
      }
      this.timers.delete(timerId);
    }
  }

  reset(timerId: string): void {
    // 重置就是先停止再重新启动，但需要记住原始配置
    // 这里简单实现：停止旧计时器，上层调用者需要重新发起 startTimer
    this.stop(timerId);
  }

  getStatus(timerId: string): { elapsed: number; remaining: number } | null {
    const timer = this.timers.get(timerId);
    if (!timer) return null;
    const elapsed = Date.now() - timer.startTime;
    return { elapsed, remaining: Math.max(0, timer.duration - elapsed) };
  }
}

export class Dispatcher {
  private timerManager = new TimerManager();

  constructor(private deps: DispatcherDeps) {}

  /**
   * 串行执行一条动作链。
   *
   * `extraCtx` 会并入表达式求值时的 ctx（例如在列表 repeat 内含 item/index/parent）。
   */
  async run(actions: Action[] | undefined, extraCtx: Partial<EvalContext> = {}): Promise<void> {
    if (!actions || actions.length === 0) return;
    for (const action of actions) {
      await this.runOne(action, extraCtx);
    }
  }

  private async runOne(action: Action, extraCtx: Partial<EvalContext>): Promise<void> {
    const ctx = this.buildCtx(extraCtx);
    switch (action.type) {
      case 'state.set':
      case 'state.append':
      case 'state.merge':
        return this.applyStateMutation(
          resolveActionValue(action, ctx) as StateSetAction | StateAppendAction | StateMergeAction,
        );
      case 'state.toggle':
        return this.applyStateMutation(action as StateToggleAction);
      case 'state.remove':
        return this.applyStateRemove(action as StateRemoveAction, ctx);

      case 'effect.fetch':
        return this.runEffectFetch(action, extraCtx);
      case 'effect.cancel':
        this.deps.effects.cancel(action.dataSourceId);
        return;

      case 'nav.go':
        this.deps.host?.onNavGo?.(action.targetScreenId, action.animation);
        return;
      case 'nav.back':
        this.deps.host?.onNavBack?.();
        return;

      case 'node.setVisualState':
        this.deps.host?.onSetVisualState?.(action.nodeId, action.state, action.autoRevertMs);
        return;

      case 'ui.showToast':
        this.deps.host?.onShowToast?.({
          toastType: action.toastType,
          message: String(evaluateExpression(action.message, ctx) ?? action.message),
          duration: action.duration,
          position: action.position,
        });
        return;
      case 'ui.openUrl':
        this.deps.host?.onOpenUrl?.(
          String(evaluateExpression(action.url, ctx) ?? action.url),
          action.openInNewTab,
        );
        return;
      case 'ui.delay':
        await delay(action.duration);
        return;

      case 'ui.startTimer':
        return this.timerManager.run(action as UiStartTimerAction, this, ctx);
      case 'ui.stopTimer':
        this.timerManager.stop((action as UiStopTimerAction).timerId);
        return;
      case 'ui.resetTimer':
        this.timerManager.reset((action as Extract<Action, { type: 'ui.resetTimer' }>).timerId);
        return;

      case 'ui.animate': {
        // 委托给宿主实现动画触发（通过 DOM 操作添加 animation class/style）
        const animAction = action as Extract<Action, { type: 'ui.animate' }>;
        this.deps.host?.onAnimate?.(
          animAction.nodeId,
          animAction.animation,
          animAction.duration ?? 300,
          animAction.easing ?? 'ease',
        );
        // 如果有 onComplete，延迟执行
        if (animAction.onComplete?.length) {
          const duration = animAction.duration ?? 300;
          setTimeout(() => {
            this.run(animAction.onComplete!, extraCtx).catch(() => {});
          }, duration);
        }
        return;
      }

      case 'ui.showOverlay': {
        const overlayAction = action as Extract<Action, { type: 'ui.showOverlay' }>;
        this.deps.host?.onShowOverlay?.(overlayAction.overlayId);
        return;
      }

      case 'ui.hideOverlay': {
        const overlayAction = action as Extract<Action, { type: 'ui.hideOverlay' }>;
        this.deps.host?.onHideOverlay?.(overlayAction.overlayId);
        return;
      }

      case 'logic.if':
        return this.runLogicIf(action as Extract<Action, { type: 'logic.if' }>, extraCtx);
      
      case 'logic.switch':
        return this.runLogicSwitch(action as Extract<Action, { type: 'logic.switch' }>, extraCtx);

      case 'custom':
        this.deps.host?.onCustomAction?.(action.handler, action.payload);
        return;

      default: {
        // 兜底：未知 action 类型；不抛错保持链健壮
        // eslint-disable-next-line no-console
        console.warn('[Dispatcher] unknown action', action);
      }
    }
  }

  // ===== state.* =====

  private applyStateMutation(
    action:
      | StateSetAction
      | StateAppendAction
      | StateMergeAction
      | StateToggleAction,
  ): void {
    this.deps.store.setState((s) => reduceStateAction(s, action));
  }

  private applyStateRemove(action: StateRemoveAction, ctx: EvalContext): void {
    const predicateResolver = action.predicate
      ? (predicate: string, items: unknown[]): number | undefined => {
          const compiled = compileExpression(predicate);
          for (let i = 0; i < items.length; i += 1) {
            const result = compiled({ ...ctx, item: items[i], index: i });
            if (result) return i;
          }
          return undefined;
        }
      : undefined;
    this.deps.store.setState((s) => reduceStateAction(s, action, predicateResolver));
  }

  // ===== effect.* =====

  private async runEffectFetch(
    action: Extract<Action, { type: 'effect.fetch' }>,
    extraCtx: Partial<EvalContext>,
  ): Promise<void> {
    const ds = this.deps.dataSources(action.dataSourceId);
    if (!ds || ds.type !== 'api') {
      const err: EffectStatus = {
        status: 'error',
        error: { message: `dataSource "${action.dataSourceId}" not found or not api` },
        startedAt: Date.now(),
        finishedAt: Date.now(),
      };
      this.writeEffectStatus(action.dataSourceId, err);
      await this.run(action.onError, { ...extraCtx, $last: err });
      return;
    }

    // 写入 pending
    const pending: EffectStatus = { status: 'pending', startedAt: Date.now() };
    this.writeEffectStatus(action.dataSourceId, pending);

    // 参数求值（默认 + 调用时 params 合并）
    const ctx = this.buildCtx(extraCtx);
    const merged: Record<string, unknown> = {};
    if (ds.defaultParams) {
      for (const [k, v] of Object.entries(ds.defaultParams)) {
        merged[k] = evaluateExpression(v as unknown, ctx);
      }
    }
    if (action.params) {
      for (const [k, v] of Object.entries(action.params)) {
        merged[k] = evaluateExpression(v as unknown, ctx);
      }
    }

    const finalStatus = await this.deps.effects.run(ds, merged);
    this.writeEffectStatus(action.dataSourceId, finalStatus);

    if (finalStatus.status === 'success') {
      // 把 data 暴露到 state.data[dataSource.name] 方便表达式直接读
      this.deps.store.setState((s) => ({
        ...s,
        data: { ...s.data, [ds.name]: finalStatus.data },
      }));
      await this.run(action.onSuccess, { ...extraCtx, $last: finalStatus });
    } else if (finalStatus.status === 'error') {
      await this.run(action.onError, { ...extraCtx, $last: finalStatus });
    }
    // idle 表示被 cancel，不跑任何分支
  }

  private writeEffectStatus(dataSourceId: string, status: EffectStatus): void {
    this.deps.store.setState((s) => ({
      ...s,
      effects: { ...s.effects, [dataSourceId]: status },
    }));
  }

  // ===== 逻辑控制 =====

  private async runLogicIf(
    action: Extract<Action, { type: 'logic.if' }>,
    extraCtx: Partial<EvalContext>,
  ): Promise<void> {
    const ctx = this.buildCtx(extraCtx);
    const conditionResult = evaluateExpression(action.when, ctx);
    
    // 将 false、0、''、null、undefined 视为条件不满足
    const isTrue = conditionResult !== false 
      && conditionResult !== 0 
      && conditionResult !== '' 
      && conditionResult !== null 
      && conditionResult !== undefined;
    
    const branchToExecute = isTrue ? action.then : action.else;
    if (branchToExecute && branchToExecute.length > 0) {
      await this.run(branchToExecute, extraCtx);
    }
  }

  private async runLogicSwitch(
    action: Extract<Action, { type: 'logic.switch' }>,
    extraCtx: Partial<EvalContext>,
  ): Promise<void> {
    const ctx = this.buildCtx(extraCtx);
    const switchValue = evaluateExpression(action.value, ctx);
    
    // 按顺序检查每个 case，第一个匹配的执行
    for (const caseBranch of action.cases) {
      const matchValue = evaluateExpression(caseBranch.match, ctx);
      if (switchValue === matchValue) {
        await this.run(caseBranch.actions, extraCtx);
        return;
      }
    }
    
    // 都不匹配则执行 default（如果存在）
    if (action.default && action.default.length > 0) {
      await this.run(action.default, extraCtx);
    }
  }

  // ===== 表达式 ctx =====

  private buildCtx(extra: Partial<EvalContext>): EvalContext {
    return {
      state: this.deps.store.getState(),
      ...extra,
    };
  }
}

/** 解析 action 里 `value` 字段中的表达式（state.set/append/merge 用） */
function resolveActionValue(
  action: StateSetAction | StateAppendAction | StateMergeAction,
  ctx: EvalContext,
): StateSetAction | StateAppendAction | StateMergeAction {
  return { ...action, value: evaluateExpression(action.value, ctx) } as typeof action;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// 类型导出
export type { EvalContext } from '../expression';
