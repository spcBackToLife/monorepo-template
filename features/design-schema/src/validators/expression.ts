import { z } from 'zod';
import type { Expression } from '../types/expression';

/**
 * Expression 的 zod schema。
 *
 * 运行时表达式语法是 `{{ ... }}`，但很多地方允许字面值（数字、布尔、对象等），
 * 因此 ExpressionSchema 仅约束「字符串」这一情形：内容必须包含一对花括号。
 *
 * 在更宽松的字段（如 styles[K]、props[K]、value）中应使用
 * `z.union([ExpressionSchema, z.unknown()])` 或直接 `z.unknown()`。
 */
export const ExpressionSchema = z
  .string()
  .regex(/\{\{[^}]+\}\}/, { message: 'expression must contain {{ ... }}' })
  .transform((s) => s as Expression);

/** 字面值或表达式（用于 styles / props / action.value 等宽容字段） */
export const ExpressionOrValueSchema = z.union([
  ExpressionSchema,
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);
