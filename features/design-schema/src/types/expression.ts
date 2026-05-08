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
