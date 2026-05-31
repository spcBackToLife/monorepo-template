/**
 * Expression Walker — 递归扫描 schema 子树，对所有 expression 字段跑 lint。
 *
 * 真相源（字段三层强度）：
 *   - 'required'        → visibleWhen / repeat.expression / condition.when / state.remove.predicate / logic.if.when
 *   - 'literal-or-expr' → Action.value / styles[K] / props[K] / message / url / params / dataSource fields
 *   - 'template'        → endpoint.path / endpoint.headers / endpoint.body 等内嵌表达式
 *
 * 用法（ops 层落库门禁）：
 *   const issues = walkExpressionsInEvent(event);
 *   if (issues.some(i => i.level === 'error')) {
 *     return { success: false, description: 'expression lint failed', issues };
 *   }
 *
 * 设计要点：
 *   - 每条 issue 含 fieldPath（'events[0].condition.when' / 'styles.color' 等），便于 AI 定位
 *   - 不抛错，全部累积到数组返回
 *   - 复用 lintExpressionField 的三层强度判断
 */

import type {
  Action,
  ComponentEvent,
  ComponentNode,
  DataSource,
  DesignProject,
  Screen,
} from '@globallink/design-schema';
import { lintExpressionField, type LintIssue } from './Linter';

// ===== 类型 =====

/** 一条 lint issue 的字段定位（path 给出节点路径，nodeId 给出最近节点 id） */
export interface ExpressionFieldRef {
  /** 起始节点 id（ComponentNode）或者 dataSource id；若来自 globalOverlays 则是 overlay id */
  nodeId?: string;
  /** screenId（来自 walkExpressionsInScreen 时填入） */
  screenId?: string;
  /** 字段访问路径，如 "events[0].condition.when" / "styles.backgroundColor" */
  fieldPath: string;
  /** 实际写在该字段上的值（截断到 60 字符方便日志） */
  rawValue: string;
  /** 来自 Linter 的具体问题列表 */
  issues: LintIssue[];
}

export interface WalkOptions {
  /** 仅返回 level=error 的 ref（默认 false：error+warning 都返回） */
  errorOnly?: boolean;
}

// ===== 内部 helpers =====

function pushFieldIssues(
  refs: ExpressionFieldRef[],
  ctx: { nodeId?: string; screenId?: string; fieldPath: string; rawValue: unknown },
  issues: LintIssue[],
  options: WalkOptions | undefined,
): void {
  if (issues.length === 0) return;
  const filtered = options?.errorOnly ? issues.filter((i) => i.level === 'error') : issues;
  if (filtered.length === 0) return;
  refs.push({
    nodeId: ctx.nodeId,
    screenId: ctx.screenId,
    fieldPath: ctx.fieldPath,
    rawValue:
      typeof ctx.rawValue === 'string'
        ? ctx.rawValue.length > 60
          ? ctx.rawValue.slice(0, 60) + '…'
          : ctx.rawValue
        : JSON.stringify(ctx.rawValue).slice(0, 60),
    issues: filtered,
  });
}

function lintRecord(
  obj: Record<string, unknown> | undefined,
  refs: ExpressionFieldRef[],
  basePath: string,
  ctx: { nodeId?: string; screenId?: string },
  options: WalkOptions | undefined,
): void {
  if (!obj) return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      const r = lintExpressionField(v, 'literal-or-expr');
      if (!r.ok || r.issues.length > 0) {
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.${k}`, rawValue: v },
          r.issues,
          options,
        );
      }
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      // 浅嵌套对象（如 endpoint.body）
      lintRecord(v as Record<string, unknown>, refs, `${basePath}.${k}`, ctx, options);
    }
  }
}

// ===== 主入口 =====

/**
 * 扫一条 Action 链中的所有表达式字段。
 */
export function walkExpressionsInActionChain(
  actions: Action[] | undefined,
  ctx: { nodeId?: string; screenId?: string; basePath?: string } = {},
  options?: WalkOptions,
): ExpressionFieldRef[] {
  const refs: ExpressionFieldRef[] = [];
  if (!Array.isArray(actions)) return refs;
  const base = ctx.basePath ?? 'actions';

  actions.forEach((a, idx) => {
    const path = `${base}[${idx}]`;
    walkAction(a, refs, path, ctx, options);
  });

  return refs;
}

function walkAction(
  a: Action,
  refs: ExpressionFieldRef[],
  basePath: string,
  ctx: { nodeId?: string; screenId?: string },
  options: WalkOptions | undefined,
): void {
  // 强 expression 字段
  switch (a.type) {
    case 'state.set':
    case 'state.append':
      if (typeof a.value === 'string') {
        const r = lintExpressionField(a.value, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.value`, rawValue: a.value },
          r.issues,
          options,
        );
      } else if (a.value && typeof a.value === 'object' && !Array.isArray(a.value)) {
        lintRecord(a.value as Record<string, unknown>, refs, `${basePath}.value`, ctx, options);
      }
      return;
    case 'state.merge':
      if (typeof a.value === 'string') {
        const r = lintExpressionField(a.value, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.value`, rawValue: a.value },
          r.issues,
          options,
        );
      } else if (a.value && typeof a.value === 'object') {
        lintRecord(a.value as Record<string, unknown>, refs, `${basePath}.value`, ctx, options);
      }
      return;
    case 'state.remove':
      if (a.predicate !== undefined) {
        const r = lintExpressionField(a.predicate, 'required');
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.predicate`, rawValue: a.predicate },
          r.issues,
          options,
        );
      }
      return;
    case 'state.toggle':
    case 'effect.cancel':
    case 'nav.go':
    case 'nav.back':
    case 'node.setVisualState':
    case 'ui.delay':
    case 'ui.stopTimer':
    case 'ui.resetTimer':
    case 'ui.showOverlay':
    case 'ui.hideOverlay':
    case 'custom':
      return; // 无表达式字段
    case 'effect.fetch':
      if (a.params) {
        lintRecord(
          a.params as Record<string, unknown>,
          refs,
          `${basePath}.params`,
          ctx,
          options,
        );
      }
      refs.push(
        ...walkExpressionsInActionChain(a.onSuccess, { ...ctx, basePath: `${basePath}.onSuccess` }, options),
      );
      refs.push(
        ...walkExpressionsInActionChain(a.onError, { ...ctx, basePath: `${basePath}.onError` }, options),
      );
      return;
    case 'ui.showToast':
      if (typeof a.message === 'string') {
        const r = lintExpressionField(a.message, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.message`, rawValue: a.message },
          r.issues,
          options,
        );
      }
      return;
    case 'ui.openUrl':
      if (typeof a.url === 'string') {
        const r = lintExpressionField(a.url, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.url`, rawValue: a.url },
          r.issues,
          options,
        );
      }
      return;
    case 'ui.startTimer':
      refs.push(
        ...walkExpressionsInActionChain(a.onTick, { ...ctx, basePath: `${basePath}.onTick` }, options),
      );
      refs.push(
        ...walkExpressionsInActionChain(a.onComplete, { ...ctx, basePath: `${basePath}.onComplete` }, options),
      );
      return;
    case 'ui.animate':
      refs.push(
        ...walkExpressionsInActionChain(a.onComplete, { ...ctx, basePath: `${basePath}.onComplete` }, options),
      );
      return;
    case 'logic.if': {
      const r = lintExpressionField(a.when, 'required');
      pushFieldIssues(
        refs,
        { ...ctx, fieldPath: `${basePath}.when`, rawValue: a.when },
        r.issues,
        options,
      );
      refs.push(
        ...walkExpressionsInActionChain(a.then, { ...ctx, basePath: `${basePath}.then` }, options),
      );
      if (a.else) {
        refs.push(
          ...walkExpressionsInActionChain(a.else, { ...ctx, basePath: `${basePath}.else` }, options),
        );
      }
      return;
    }
    case 'logic.switch':
      if (typeof a.value === 'string') {
        const r = lintExpressionField(a.value, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...ctx, fieldPath: `${basePath}.value`, rawValue: a.value },
          r.issues,
          options,
        );
      }
      a.cases.forEach((c, i) => {
        if (typeof c.match === 'string') {
          const r = lintExpressionField(c.match, 'literal-or-expr');
          pushFieldIssues(
            refs,
            { ...ctx, fieldPath: `${basePath}.cases[${i}].match`, rawValue: c.match },
            r.issues,
            options,
          );
        }
        refs.push(
          ...walkExpressionsInActionChain(
            c.actions,
            { ...ctx, basePath: `${basePath}.cases[${i}].actions` },
            options,
          ),
        );
      });
      if (a.default) {
        refs.push(
          ...walkExpressionsInActionChain(a.default, { ...ctx, basePath: `${basePath}.default` }, options),
        );
      }
      return;
  }
}

/**
 * 扫一个事件配置（condition.when + actions 链）。
 */
export function walkExpressionsInEvent(
  event: ComponentEvent,
  ctx: { nodeId?: string; screenId?: string; basePath?: string } = {},
  options?: WalkOptions,
): ExpressionFieldRef[] {
  const refs: ExpressionFieldRef[] = [];
  const base = ctx.basePath ?? 'event';

  if (event.condition?.when !== undefined) {
    const r = lintExpressionField(event.condition.when, 'required');
    pushFieldIssues(
      refs,
      { ...ctx, fieldPath: `${base}.condition.when`, rawValue: event.condition.when },
      r.issues,
      options,
    );
  }

  refs.push(
    ...walkExpressionsInActionChain(
      event.actions,
      { ...ctx, basePath: `${base}.actions` },
      options,
    ),
  );

  return refs;
}

/**
 * 扫一个 ComponentNode 子树（递归 children + repeat.template）：
 *   - styles[K]   每个值
 *   - props[K]    每个值
 *   - visibleWhen
 *   - repeat.expression + repeat.template（递归）
 *   - events[]    （递归 walkExpressionsInEvent）
 *   - children[]  （递归）
 *   - states[].styles （递归 visualState 样式）
 */
export function walkExpressionsInNode(
  node: ComponentNode,
  ctx: { screenId?: string; basePath?: string } = {},
  options?: WalkOptions,
): ExpressionFieldRef[] {
  const refs: ExpressionFieldRef[] = [];
  const base = ctx.basePath ?? 'node';
  const innerCtx = { nodeId: node.id, screenId: ctx.screenId };

  // styles
  if (node.styles) {
    for (const [k, v] of Object.entries(node.styles)) {
      if (typeof v === 'string') {
        const r = lintExpressionField(v, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...innerCtx, fieldPath: `${base}.styles.${k}`, rawValue: v },
          r.issues,
          options,
        );
      }
    }
  }

  // props
  if (node.props) {
    for (const [k, v] of Object.entries(node.props)) {
      if (typeof v === 'string') {
        const r = lintExpressionField(v, 'literal-or-expr');
        pushFieldIssues(
          refs,
          { ...innerCtx, fieldPath: `${base}.props.${k}`, rawValue: v },
          r.issues,
          options,
        );
      }
    }
  }

  // visibleWhen
  if (node.visibleWhen !== undefined) {
    const r = lintExpressionField(node.visibleWhen, 'required');
    pushFieldIssues(
      refs,
      { ...innerCtx, fieldPath: `${base}.visibleWhen`, rawValue: node.visibleWhen },
      r.issues,
      options,
    );
  }

  // repeat
  if (node.repeat) {
    const r = lintExpressionField(node.repeat.expression, 'required');
    pushFieldIssues(
      refs,
      { ...innerCtx, fieldPath: `${base}.repeat.expression`, rawValue: node.repeat.expression },
      r.issues,
      options,
    );
    if (node.repeat.template) {
      refs.push(
        ...walkExpressionsInNode(
          node.repeat.template,
          { screenId: ctx.screenId, basePath: `${base}.repeat.template` },
          options,
        ),
      );
    }
  }

  // events
  if (Array.isArray(node.events)) {
    node.events.forEach((ev, i) => {
      refs.push(
        ...walkExpressionsInEvent(
          ev,
          { ...innerCtx, basePath: `${base}.events[${i}]` },
          options,
        ),
      );
    });
  }

  // visualStates 中的样式覆盖
  if (Array.isArray(node.states)) {
    node.states.forEach((vs, i) => {
      if (vs.styles) {
        for (const [k, v] of Object.entries(vs.styles)) {
          if (typeof v === 'string') {
            const r = lintExpressionField(v, 'literal-or-expr');
            pushFieldIssues(
              refs,
              { ...innerCtx, fieldPath: `${base}.states[${i}].styles.${k}`, rawValue: v },
              r.issues,
              options,
            );
          }
        }
      }
    });
  }

  // children
  if (Array.isArray(node.children)) {
    node.children.forEach((child, i) => {
      refs.push(
        ...walkExpressionsInNode(
          child,
          { screenId: ctx.screenId, basePath: `${base}.children[${i}]` },
          options,
        ),
      );
    });
  }

  return refs;
}

/**
 * 扫一个 DataSource：endpoint.headers / query / body / responseSchema / defaultParams 中的表达式。
 */
export function walkExpressionsInDataSource(
  ds: DataSource,
  ctx: { screenId?: string } = {},
  options?: WalkOptions,
): ExpressionFieldRef[] {
  const refs: ExpressionFieldRef[] = [];
  const base = `dataSources.${ds.id}`;
  const innerCtx = { nodeId: ds.id, screenId: ctx.screenId };

  if (ds.type === 'api' && ds.endpoint) {
    const ep = ds.endpoint as unknown as Record<string, unknown>;
    // path
    if (typeof ep.path === 'string') {
      const r = lintExpressionField(ep.path, 'template');
      pushFieldIssues(
        refs,
        { ...innerCtx, fieldPath: `${base}.endpoint.path`, rawValue: ep.path },
        r.issues,
        options,
      );
    }
    // headers
    if (ep.headers) lintRecord(ep.headers as Record<string, unknown>, refs, `${base}.endpoint.headers`, innerCtx, options);
    // query
    if (ep.query) lintRecord(ep.query as Record<string, unknown>, refs, `${base}.endpoint.query`, innerCtx, options);
    // body
    if (typeof ep.body === 'string') {
      const r = lintExpressionField(ep.body, 'template');
      pushFieldIssues(
        refs,
        { ...innerCtx, fieldPath: `${base}.endpoint.body`, rawValue: ep.body },
        r.issues,
        options,
      );
    } else if (ep.body && typeof ep.body === 'object') {
      lintRecord(ep.body as Record<string, unknown>, refs, `${base}.endpoint.body`, innerCtx, options);
    }
  }

  // defaultParams
  const dsAny = ds as { defaultParams?: Record<string, unknown> };
  if (dsAny.defaultParams) {
    lintRecord(dsAny.defaultParams, refs, `${base}.defaultParams`, innerCtx, options);
  }

  return refs;
}

/**
 * 扫整个屏幕（rootNode + overlays + dataSources）。
 */
export function walkExpressionsInScreen(
  screen: Screen,
  options?: WalkOptions,
): ExpressionFieldRef[] {
  const refs: ExpressionFieldRef[] = [];
  const screenId = screen.id;

  if (screen.rootNode) {
    refs.push(
      ...walkExpressionsInNode(screen.rootNode, { screenId, basePath: 'rootNode' }, options),
    );
  }

  if (Array.isArray(screen.overlays)) {
    screen.overlays.forEach((ov, i) => {
      // overlays 复用 ComponentNode 的 rootNode 表达式扫描
      if (ov.rootNode) {
        refs.push(
          ...walkExpressionsInNode(
            ov.rootNode,
            { screenId, basePath: `overlays[${i}].rootNode` },
            options,
          ),
        );
      }
      // overlay.showWhen
      if (ov.showWhen) {
        const r = lintExpressionField(ov.showWhen, 'required');
        pushFieldIssues(
          refs,
          { nodeId: ov.id, screenId, fieldPath: `overlays[${i}].showWhen`, rawValue: ov.showWhen },
          r.issues,
          options,
        );
      }
    });
  }

  if (Array.isArray(screen.dataSources)) {
    for (const ds of screen.dataSources) {
      refs.push(...walkExpressionsInDataSource(ds, { screenId }, options));
    }
  }

  return refs;
}

/**
 * 扫整个项目（所有屏幕 + globalOverlays）。
 */
export function walkExpressionsInProject(
  project: DesignProject,
  options?: WalkOptions,
): ExpressionFieldRef[] {
  const refs: ExpressionFieldRef[] = [];

  for (const screen of project.screens) {
    refs.push(...walkExpressionsInScreen(screen, options));
  }

  if (Array.isArray(project.globalOverlays)) {
    project.globalOverlays.forEach((ov, i) => {
      if (ov.rootNode) {
        refs.push(
          ...walkExpressionsInNode(
            ov.rootNode,
            { basePath: `globalOverlays[${i}].rootNode` },
            options,
          ),
        );
      }
      if (ov.showWhen) {
        const r = lintExpressionField(ov.showWhen, 'required');
        pushFieldIssues(
          refs,
          { nodeId: ov.id, fieldPath: `globalOverlays[${i}].showWhen`, rawValue: ov.showWhen },
          r.issues,
          options,
        );
      }
    });
  }

  return refs;
}
