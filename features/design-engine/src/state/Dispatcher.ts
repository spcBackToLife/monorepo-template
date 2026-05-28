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

export class Dispatcher {
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
