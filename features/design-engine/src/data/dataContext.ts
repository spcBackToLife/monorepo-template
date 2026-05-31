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
import { evaluateExpression as evalExpr } from '@globallink/design-expression';
import type { EvalContext } from '@globallink/design-expression';

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
 * 把 Screen.stateInit + dataSources 组装成一个 ScreenState，用于：
 *   1. 编辑画布（SchemaRenderer）的表达式求值基底
 *   2. 预览模式（PreviewRenderer）的 store 初始 state
 *
 * 合并顺序（后者覆盖前者，保证 stateInit 优先级最高）：
 *   a. dataSources.static → data[ds.name] = ds.initial（v2 契约：按 ds.name 嵌套）
 *   b. dataSources.api    → data[ds.name] = scenario.responseBody（编辑/预览期 mock 预渲染）
 *   c. screen.stateInit.data.*   → 覆盖到 data（用户手写初值，最高优先级）
 *   d. screen.stateInit.view.*   → view[name] = previewValue ?? defaultValue
 *
 * 不处理运行时 effect 状态（state.effects）—— 那个由 EffectExecutor 写入 store。
 */
export function buildEditorPreviewState(screen: Screen): ScreenState {
  const data: Record<string, unknown> = {};
  const view: Record<string, unknown> = {};

  // a + b: dataSources 注入到 data[ds.name]
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

  // c: screen.stateInit.data 覆盖（用户手写初值，如 `stateInit.data.messages = [...]`）
  const dataInit = screen.stateInit?.data;
  if (dataInit && typeof dataInit === 'object') {
    for (const [k, v] of Object.entries(dataInit)) {
      data[k] = v;
    }
  }

  // d: screen.stateInit.view 注入 previewValue (编辑期) 或 defaultValue (兜底)
  const viewInit = screen.stateInit?.view;
  if (viewInit && typeof viewInit === 'object') {
    for (const [name, varDef] of Object.entries(viewInit)) {
      if (varDef && typeof varDef === 'object') {
        const def = varDef as { previewValue?: unknown; defaultValue?: unknown };
        view[name] = def.previewValue !== undefined ? def.previewValue : def.defaultValue;
      }
    }
  }

  return { data, view, effects: {} };
}
