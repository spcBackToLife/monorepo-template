/**
 * Style 入参语义校验
 *
 * 在 style.update / batch_update 入参阶段拒掉非法的 $token:xxx 引用，
 * 防止"语法错误的 token 写进 schema → 渲染失败但 schema 校验通过"的契约漂移事故。
 *
 * 这是事前治理：与 features/design-engine/src/styles/resolveTokens.ts 共享同一份语法规则，
 * 写入时拒掉 → 未来不会再出现 demo 那种"styles 进了 schema 但渲染失败"的现象。
 *
 * 校验规则参考 resolveTokens.ts 顶部 jsdoc，支持两套等价语法（dot / dash）：
 *   颜色:      $token:primary               | $token:colors.primary
 *   间距:      $token:spacing-md            | $token:spacing.md
 *   圆角:      $token:radius-lg             | $token:radius.lg
 *   阴影:      $token:shadow-sm             | $token:shadows.sm
 *   动效:      $token:transition-fast       | $token:transitions.fast(.value)?
 *   字体:      $token:font-body[.fontSize]  | $token:typography.body[.fontSize]
 *
 * 注意：本校验只查"语法形式"是否合法，不查 ThemeConfig 中具体 token 是否存在
 * （后者由 resolveTokens 在渲染时检查，且会 console.warn）。
 */

const TOKEN_PREFIX = '$token:';

// 一个 $token:xxx 引用形式合法的正则（不查实际是否存在）
//   colors group:        colors.<key>
//   裸 color path:       <key>（如 $token:primary / $token:textPrimary）
//   spacing/radius:      spacing[-.]<key> / radius[-.]<key>
//   shadows/shadow:      shadows[-.]<key> / shadow[-.]<key>
//   transitions:         transitions[-.]<key>(.value)? / transition[-.]<key>(.value)?
//   typography/font:     typography.<key>(.<sub>)? / font-<key>(.<sub>)?
const TOKEN_REF_PATTERN =
  /^\$token:(colors\.[a-zA-Z][\w-]*|[a-zA-Z][\w-]*|(spacing|radius)[-.][\w-]+|shadows?[-.][\w-]+|transitions?[-.][\w-]+(\.value)?|typography\.[\w-]+(\.[a-zA-Z]+)?|font-[\w-]+(\.[a-zA-Z]+)?)$/;

/**
 * 验证单个样式值（可能含 token 引用、可能是复合值如 "padding: $token:spacing.sm $token:spacing.md"）
 *
 * @returns null = 合法；string = 不合法的原因
 */
export function validateStyleValue(value: string | number): string | null {
  if (typeof value === 'number') return null;
  if (!value.includes(TOKEN_PREFIX)) return null; // 普通字符串透传

  // 复合值：按空格拆开校验每段
  if (value.includes(' ')) {
    for (const part of value.split(/\s+/)) {
      if (!part.startsWith(TOKEN_PREFIX)) continue;
      if (!TOKEN_REF_PATTERN.test(part)) {
        return `非法 token 引用: "${part}"（在复合值 "${value}" 中）`;
      }
    }
    return null;
  }

  // 单值
  if (value.startsWith(TOKEN_PREFIX)) {
    if (!TOKEN_REF_PATTERN.test(value)) {
      return `非法 token 引用: "${value}"。支持语法见 features/design-engine/src/styles/resolveTokens.ts 顶部 jsdoc。`;
    }
  }
  return null;
}

/**
 * 验证一组 styles 对象。返回所有违规项。
 */
export function validateStyles(styles: Record<string, string | number>): Array<{ key: string; value: string | number; reason: string }> {
  const issues: Array<{ key: string; value: string | number; reason: string }> = [];
  for (const [key, value] of Object.entries(styles)) {
    const reason = validateStyleValue(value);
    if (reason) issues.push({ key, value, reason });
  }
  return issues;
}

/**
 * 给 zod schema 用的 refinement helper：发现非法 token 引用直接抛 ZodError。
 *
 * 用法：
 *   z.record(z.string(), z.union([z.string(), z.number()])).refine(...validateStylesRefinement)
 */
export function validateStylesRefinement(styles: Record<string, string | number>): true {
  const issues = validateStyles(styles);
  if (issues.length === 0) return true;
  const summary = issues
    .map((i) => `  • ${i.key}: ${i.reason}`)
    .join('\n');
  throw new Error(`styles 入参含非法 token 引用，已拒：\n${summary}`);
}
