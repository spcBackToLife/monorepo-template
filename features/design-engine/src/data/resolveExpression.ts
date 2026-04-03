export interface DataContext {
  data: Record<string, unknown>;
  item?: unknown;
  index?: number;
  parent?: DataContext;
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

  if (result === undefined && defaultPart !== undefined) {
    const stripped = defaultPart.replace(/^["'](.*)["']$/, '$1');
    return stripped;
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

/** Check if a string contains data binding expressions */
export function hasExpression(value: unknown): boolean {
  return typeof value === 'string' && /\{\{.+?\}\}/.test(value);
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
