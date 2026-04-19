import type { Screen } from '@globallink/design-schema';

export interface DataContext {
  data: Record<string, unknown>;
  item?: unknown;
  index?: number;
  parent?: DataContext;
}

/**
 * 合并当前屏所有「已加载」数据源的活跃场景数据（与 SchemaRenderer / 预览一致）。
 */
export function mergeLoadedScreenData(screen: Screen): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const ds of screen.dataSources ?? []) {
    if (ds.activePhase !== 'loaded') continue;
    const scenario = (ds.scenarios ?? []).find((s) => s.id === ds.activeScenarioId);
    if (scenario?.data && typeof scenario.data === 'object' && !Array.isArray(scenario.data)) {
      Object.assign(merged, scenario.data as Record<string, unknown>);
    }
  }
  return merged;
}

/**
 * 轮播/分页：当 Mock 或 API 提供 `data.slides`（对象数组），且画布存在页码领域态时，
 * 自动注入 `data.slide` 为当前项、`data.slideIndex` 为数字下标。
 * 页码变量名（择先）：`slideIndex` → `carouselIndex` → `welcomePagerIndex`。
 * 文案绑定写 `{{data.slide.title}}` 等，随分页与接口数据联动，无需写死三套节点。
 */
export function injectCarouselSlice(
  mergedData: Record<string, unknown>,
  globalStates: Record<string, string>,
): Record<string, unknown> {
  const slides = mergedData.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    return mergedData;
  }
  const indexKeys = ['slideIndex', 'carouselIndex', 'welcomePagerIndex'] as const;
  let idx = 0;
  for (const k of indexKeys) {
    const raw = globalStates[k];
    if (raw !== undefined && raw !== '') {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) {
        idx = n;
        break;
      }
    }
  }
  idx = Math.max(0, Math.min(slides.length - 1, idx));
  const row = slides[idx];
  const slide =
    row && typeof row === 'object' && !Array.isArray(row)
      ? { ...(row as Record<string, unknown>) }
      : {};
  return { ...mergedData, slide, slideIndex: idx };
}

/** 构建画布/预览用的 DataContext（含轮播切片） */
export function buildScreenDataContext(
  screen: Screen,
  globalStates: Record<string, string>,
  currentDataSourceId?: string,
): DataContext {
  let base: Record<string, unknown>;
  if (currentDataSourceId) {
    const ds = (screen.dataSources ?? []).find((s) => s.id === currentDataSourceId);
    if (ds && ds.activePhase === 'loaded') {
      const scenario = (ds.scenarios ?? []).find((s) => s.id === ds.activeScenarioId);
      const raw = scenario?.data;
      base =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? { ...(raw as Record<string, unknown>) }
          : {};
    } else {
      base = {};
    }
  } else {
    base = mergeLoadedScreenData(screen);
  }
  return { data: injectCarouselSlice(base, globalStates) };
}

/**
 * Navigate an object by a dot/bracket path like "user.name" or "items[0].title"
 */
function navigatePath(obj: unknown, path: string): unknown {
  // Split on dots and brackets: "items[0].title" → ["items", "0", "title"]
  const segments = path.split(/\.|\[(\d+)\]/).filter((s) => s !== '' && s !== undefined);
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Resolve inner binding text (no braces), e.g. `data.user.name` or `item.title | "x"`.
 */
function resolveBindingContent(content: string, context: DataContext): unknown {
  const pipeIndex = content.indexOf('|');
  const pathPart = pipeIndex >= 0 ? content.substring(0, pipeIndex).trim() : content.trim();
  const defaultPart = pipeIndex >= 0 ? content.substring(pipeIndex + 1).trim() : undefined;

  let result: unknown;

  if (pathPart === 'index') {
    result = context.index;
  } else if (pathPart === 'item') {
    result = context.item;
  } else if (pathPart.startsWith('item.') || pathPart.startsWith('item[')) {
    const subPath = pathPart.substring(pathPart.indexOf('.') === 4 ? 5 : 4);
    result = navigatePath(context.item, subPath);
  } else if (pathPart.startsWith('data.') || pathPart.startsWith('data[')) {
    const subPath = pathPart.substring(pathPart.indexOf('.') === 4 ? 5 : 4);
    result = navigatePath(context.data, subPath);
  } else {
    result = navigatePath(context.data, pathPart);
  }

  if (defaultPart !== undefined) {
    const missing =
      result === undefined ||
      result === null ||
      (typeof result === 'string' && result.trim() === '');
    if (missing) {
      const stripped = defaultPart.replace(/^["'](.*)["']$/, '$1');
      return stripped;
    }
  }

  return result;
}

/**
 * Resolve `{{...}}` bindings in a string.
 *
 * - **Whole string** is a single `{{...}}` → returns the resolved value with its natural type
 *   (e.g. array for lists, number, boolean).
 * - **Template / mixed text** e.g. `"欢迎, {{data.user.name}}!"` → replaces every `{{...}}`
 *   with `String(resolved)` and returns a string.
 * - **No bindings** → returns the input unchanged.
 */
export function resolveExpression(expression: string, context: DataContext): unknown {
  if (typeof expression !== 'string' || !/\{\{/.test(expression)) {
    return expression;
  }

  const fullMatch = expression.match(/^\{\{([\s\S]+?)\}\}$/);
  if (fullMatch) {
    return resolveBindingContent(fullMatch[1].trim(), context);
  }

  return expression.replace(/\{\{([\s\S]+?)\}\}/g, (_m, inner: string) => {
    const resolved = resolveBindingContent(inner.trim(), context);
    return resolved !== undefined && resolved !== null ? String(resolved) : '';
  });
}

/** Check if a string contains data绑定（须与 resolveExpression 一致，支持换行） */
export function hasExpression(value: unknown): boolean {
  return typeof value === 'string' && /\{\{[\s\S]+?\}\}/.test(value);
}

/** Resolve all expressions in a props object */
export function resolvePropsExpressions(
  props: Record<string, unknown>,
  context: DataContext,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && hasExpression(value)) {
      resolved[key] = resolveExpression(value, context);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
