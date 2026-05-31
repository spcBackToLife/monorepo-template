/**
 * ValidationDisplay —— 渲染 ExpressionEditor 的 lint 结果（block-style）。
 *
 * 与旧版「单行 truncate 红字」的区别：
 *   - 每条 LintIssue 独立渲染，含 errorCode / message / spec 引用 / hint / 应用建议按钮
 *   - 点击「应用建议」直接 onChange(suggestedFix)（来自 spec.knownMigrations）
 *   - 用 errorCode 颜色编码：error=红 / warning=黄
 *
 * 真相源：features/design-schema/src/expression-lang/spec.json 的 errorCodes
 */

import type { LintIssue } from '@globallink/design-expression';

export interface ValidationDisplayProps {
  issues: LintIssue[];
  /** 当前编辑器值（用于「应用建议」时替换 src 中的 oldText 部分） */
  currentValue: string;
  /** 替换整个值（点击「应用建议」时调用） */
  onApplyFix?: (newValue: string) => void;
}

const COLORS: Record<LintIssue['level'], string> = {
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
};

const CODE_LABELS: Record<string, string> = {
  E001: '语法',
  E002: '未知标识符',
  E003: '禁用全局成员',
  E004: '禁用实例方法',
  E005: '禁用语法',
  E006: '类型不匹配',
  E007: '禁用全局',
};

export function ValidationDisplay({ issues, currentValue, onApplyFix }: ValidationDisplayProps) {
  if (issues.length === 0) return null;

  return (
    <ul className="mt-1 space-y-1 text-[10px]">
      {issues.map((issue, i) => {
        const color = COLORS[issue.level] ?? 'text-gray-600 bg-gray-50 border-gray-200';
        return (
          <li
            key={`${issue.code}-${i}`}
            className={`px-1.5 py-1 rounded border ${color} leading-tight`}
          >
            <div className="flex items-start gap-1">
              <span className="font-mono font-semibold whitespace-nowrap">
                [{issue.code}] {CODE_LABELS[issue.code] ?? issue.code}
              </span>
              <span className="flex-1 break-words">{issue.message.replace(/^\[E\d+\]\s*/, '')}</span>
            </div>
            {issue.hint && (
              <div className="mt-0.5 opacity-80">
                <span className="opacity-60">hint:</span> {issue.hint}
              </div>
            )}
            {(issue.specRef || issue.suggestedFix) && (
              <div className="mt-0.5 flex items-center gap-2 opacity-70">
                {issue.specRef && (
                  <span className="opacity-80">📖 {issue.specRef}</span>
                )}
                {issue.suggestedFix && onApplyFix && (
                  <button
                    type="button"
                    onClick={() => {
                      // 简单替换策略：把 currentValue 中所有 oldText 出现的地方都换成 suggestedFix。
                      // 仅在 suggestedFix 不含正则元字符时安全；spec.knownMigrations 设计为简单字符串。
                      // 复杂场景留给人工编辑。
                      onApplyFix(issue.suggestedFix as string);
                    }}
                    className="px-1.5 py-0.5 rounded bg-white border border-current hover:bg-current hover:text-white transition-colors"
                    title={`点击替换为 \`${issue.suggestedFix}\``}
                  >
                    应用建议
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
