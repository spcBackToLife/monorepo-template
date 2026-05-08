/**
 * Expression 品牌类型 —— 运行时由 design-engine 的 evaluateExpression 解析。
 * 形如 "{{ state.data.messages }}" / "{{ item.role === 'user' ? 'red' : 'blue' }}"。
 *
 * 编辑期被当作字符串编辑；运行期被表达式引擎求值。
 * 用 brand 防止与普通字符串混用造成静态丢失。
 */
export type Expression<T = unknown> = string & {
  readonly __brand: 'Expression';
  readonly __returns?: T;
};

/**
 * 编辑期可选注解，描述表达式的预期返回类型与作用域可见性。
 * 仅用于编辑器自动补全和静态检查；运行时不读取。
 */
export interface ExpressionMeta {
  /** 期望返回类型 */
  returnType?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  /** 可见的作用域字段（编辑器补全用），如 ['state', 'item', '$'] */
  scope?: string[];
}

/** 帮助构造表达式（仅类型层，运行时按字符串处理） */
export function expr<T = unknown>(s: string): Expression<T> {
  return s as Expression<T>;
}

/** 判断是否是表达式语法（包含 `{{ }}`） */
export function isExpression(value: unknown): value is Expression {
  return typeof value === 'string' && /\{\{[^}]+\}\}/.test(value);
}

/**
 * 把"必须是表达式"的字段值规范化为 `{{ ... }}` 形态。
 *
 * 适用场景：`ComponentNode.visibleWhen` / `ComponentNode.repeat` /
 *   `EventCondition.when` / `StateRemoveAction.predicate`
 * 这类按 schema 类型必须是 `Expression<X>` 的字段。
 *
 * **不适用**于"字面量也合法"的 `Expression | unknown` 字段（如 Action.value /
 *   styles[K] / props[K] / UiShowToastAction.message / UiOpenUrlAction.url）：
 * 那些字段允许 `42` / `"hello"` / `true` 等纯字面量，不能盲目包 `{{ }}`。
 *
 * 行为：
 *   - 已含 `{{ ... }}` 段（包括混合模板）→ 原样返回
 *   - null / undefined / 空字符串 → 原样返回（语义：清空）
 *   - 非字符串 → 原样返回（不是本函数职责）
 *   - 裸字符串 → 包成 `{{ <trimmed> }}`
 */
export function normalizeExpression<T extends string | null | undefined>(
  input: T,
): T;
export function normalizeExpression(input: unknown): unknown;
export function normalizeExpression(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  if (input === '') return input;
  if (/\{\{[\s\S]+?\}\}/.test(input)) return input;
  return `{{ ${input.trim()} }}`;
}
