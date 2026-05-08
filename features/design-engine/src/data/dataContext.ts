/**
 * v2 DataContext 与渲染期表达式求值桥接。
 *
 * v1 的 `resolveExpression.ts` / `DataContext { data, item, index, parent }` 已删除。
 *
 * v2 模型下 DataContext 实际是 expression 引擎的 `EvalContext`：
 *   `{ state, item, index, parent, $last, $ }`
 *
 * 渲染器在每帧把当前 ScreenState 注入 ctx，所有 styles/props 字段值含 `{{ }}` 时
 * 走 expression 引擎求值。
 */

import type { Screen, ScreenState, DataSource } from '@globallink/design-schema';
import { evaluateExpression as evalExpr } from '../expression';
import type { EvalContext } from '../expression';

/**
 * v2 渲染期数据上下文 —— 直接复用 EvalContext 类型。
 *
 * 之所以不再叫 `DataContext { data, item, index, parent }`：
 *   - data 已被 ScreenState.data 取代（state.data.xxx）
 *   - parent 含义不变（嵌套列表时父项）
 *   - item / index 含义不变
 */
export type DataContext = EvalContext;

/** 判断字符串是否含 `{{ }}` 表达式片段 */
export function hasExpression(value: unknown): boolean {
  return typeof value === 'string' && /\{\{[\s\S]+?\}\}/.test(value);
}

/**
 * 在给定 ctx 下求一个字段（styles 项 / props 项 / textContent 等）的值。
 *
 * 非字符串原样返回；含 `{{ }}` 的字符串走 expression 引擎；普通字符串原样返回。
 */
export function resolveExpression(value: unknown, ctx: DataContext): unknown {
  return evalExpr(value, ctx);
}

/** 批量解析 props 中含 `{{ }}` 的字段，其它原样返回（保持引用） */
export function resolvePropsExpressions(
  props: Record<string, unknown>,
  ctx: DataContext,
): Record<string, unknown> {
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (hasExpression(v)) {
      out[k] = evalExpr(v, ctx);
      changed = true;
    } else {
      out[k] = v;
    }
  }
  return changed ? out : props;
}

/**
 * 由 Screen + 当前 ScreenState 构建渲染期 DataContext。
 *
 * 与 v1 `buildScreenDataContext` 不同：v2 不再合并 dataSource 场景数据 —— 那部分在
 * Store 里维护（`state.data[name]` 由 Dispatcher 写入）。本函数只负责把 ScreenState
 * 注入 ctx；编辑期没有真实 store 时也可传一个最小 state。
 */
export function buildScreenDataContext(
  _screen: Screen,
  state: ScreenState,
): DataContext {
  return { state };
}

/**
 * 把 Screen.dataSources 中所有 static 源的 initial 注入一个空 ScreenState 的 data。
 *
 * 编辑期"无 store"渲染时使用：让画布也能看到 static 数据驱动的列表。
 * api 数据源不在此函数处理 —— 编辑期的 mock 数据由 EffectExecutor + 一次 fetch 写入 store。
 */
export function buildEditorPreviewState(screen: Screen): ScreenState {
  const data: Record<string, unknown> = {};
  for (const ds of screen.dataSources ?? []) {
    if (ds.type === 'static') {
      data[ds.name] = ds.initial;
    } else {
      // api 源：编辑期 mock 预览注入"激活场景"的 responseBody
      const mock = (ds as Extract<DataSource, { type: 'api' }>).mock;
      if (mock) {
        const scenario = mock.scenarios.find((s) => s.id === mock.activeScenarioId)
          ?? mock.scenarios[0];
        if (scenario && !scenario.isTimeout && scenario.statusCode >= 200 && scenario.statusCode < 300) {
          data[ds.name] = scenario.responseBody;
        }
      }
    }
  }
  return { data, view: {}, effects: {} };
}
