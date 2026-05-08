/**
 * ExpressionEditor — 表达式 / 模板编辑器（D.4）
 *
 * 替换 v2 面板里所有手写 input 编辑表达式的位置：
 *   - InteractionsTab 的 state.* / ui.* / custom action 参数表单
 *   - EventCard 的 condition.when
 *   - DataTab 的 endpoint.path / endpoint.body / defaultParams / mock params
 *
 * 特性：
 *   1. 单/多行受控输入（multiline 切 <textarea>）
 *   2. 实时调用 `@globallink/design-engine` 的 parse 做校验，错误在下方 1 行展示
 *   3. 轻量自动补全浮层：根据光标前缀匹配 state / item / $ / $last / 用户 view 变量
 *   4. mode='template'（混合文本）vs 'expression'（裸表达式或单段 `{{...}}`）
 *
 * 为什么不用 codemirror：
 *   codemirror v6 会引入 ~6 个依赖 ~200KB；此处需求较轻（前缀补全 + parse 错误），
 *   用原生 input + 浮层即可覆盖。若后续需要括号匹配/语法高亮再升级。
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { CSSProperties, ChangeEvent, KeyboardEvent } from 'react';
import {
  getSuggestions,
  getTokenPrefix,
  isInsideInterpolation,
  type ExprScope,
  type Suggestion,
} from './suggestions';
import { validateExpressionField, type ExpressionMode } from './validate';

export interface ExpressionEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** 触发提交（失焦 / Enter）时的回调；默认只同步 onChange */
  onCommit?: (finalValue: string) => void;
  scope: ExprScope;
  /** 解析模式：template 允许混合文本；expression 走裸表达式或单段 `{{...}}` */
  mode?: ExpressionMode;
  /** 多行模式（textarea） */
  multiline?: boolean;
  placeholder?: string;
  /** 附加 className（供调用方按需加 font-mono 等） */
  className?: string;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
  /** 是否展示校验错误（默认 true） */
  showError?: boolean;
  /** textarea 高度（仅 multiline 生效） */
  rows?: number;
  style?: CSSProperties;
  /** 测试/调试用 — 禁止弹补全 */
  disableSuggestions?: boolean;
}

export function ExpressionEditor(props: ExpressionEditorProps) {
  const {
    value,
    onChange,
    onCommit,
    scope,
    mode = 'expression',
    multiline = false,
    placeholder,
    className = '',
    autoFocus = false,
    showError = true,
    rows = 3,
    style,
    disableSuggestions = false,
  } = props;

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [cursor, setCursor] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSug, setShowSug] = useState(false);
  const validation = validateExpressionField(value, mode);

  // 根据光标位置重建补全候选
  const refreshSuggestions = useCallback(
    (nextValue: string, nextCursor: number) => {
      if (disableSuggestions) return;
      // template 模式：仅在 `{{ ... }}` 内触发
      if (mode === 'template' && !isInsideInterpolation(nextValue, nextCursor)) {
        setSuggestions([]);
        setShowSug(false);
        return;
      }
      const { prefix } = getTokenPrefix(nextValue, nextCursor);
      const list = getSuggestions(prefix, scope);
      setSuggestions(list);
      setActiveIdx(0);
      setShowSug(list.length > 0);
    },
    [mode, scope, disableSuggestions],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = e.target.value;
      const pos = e.target.selectionStart ?? next.length;
      setCursor(pos);
      onChange(next);
      refreshSuggestions(next, pos);
    },
    [onChange, refreshSuggestions],
  );

  const handleSelect = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    setCursor(pos);
    refreshSuggestions(value, pos);
  }, [value, refreshSuggestions]);

  const applySuggestion = useCallback(
    (sug: Suggestion) => {
      const el = inputRef.current;
      if (!el) return;
      const { prefix, start } = getTokenPrefix(value, cursor);
      // 若 prefix 以 "." 结尾，只替换最后一段；否则替换整个 token
      const lastDot = prefix.lastIndexOf('.');
      const replaceStart = lastDot >= 0 ? start + lastDot + 1 : start;
      const before = value.slice(0, replaceStart);
      const after = value.slice(cursor);
      const nextValue = before + sug.insertText + after;
      const nextCursor = (before + sug.insertText).length;
      onChange(nextValue);
      setCursor(nextCursor);
      // 在下一个 tick 里把光标挪回补全后位置 + 关掉浮层
      requestAnimationFrame(() => {
        el.setSelectionRange(nextCursor, nextCursor);
        el.focus();
        refreshSuggestions(nextValue, nextCursor);
      });
    },
    [value, cursor, onChange, refreshSuggestions],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (showSug && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIdx((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          applySuggestion(suggestions[activeIdx]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSug(false);
          return;
        }
      }
      if (!multiline && e.key === 'Enter') {
        e.preventDefault();
        onCommit?.(value);
        (e.target as HTMLInputElement).blur();
      }
    },
    [showSug, suggestions, activeIdx, applySuggestion, multiline, onCommit, value],
  );

  // autoFocus：挂载后聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const commonProps = {
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRef.current = el;
    },
    value,
    onChange: handleChange,
    onSelect: handleSelect,
    onKeyDown: handleKeyDown,
    onBlur: () => {
      // 给 suggestion item 的 onMouseDown 一个点击机会再关
      setTimeout(() => setShowSug(false), 150);
      onCommit?.(value);
    },
    placeholder,
    className: `w-full px-1.5 border rounded text-xs outline-none font-mono ${
      validation.ok ? 'border-gray-200 focus:border-blue-400' : 'border-red-300 focus:border-red-500'
    } ${className}`,
    style,
  };

  return (
    <div className="relative flex-1 min-w-0">
      {multiline ? (
        <textarea {...commonProps} rows={rows} className={`${commonProps.className} py-1 resize-y bg-gray-50`} />
      ) : (
        <input {...commonProps} type="text" className={`${commonProps.className} h-6`} />
      )}

      {showSug && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-0.5 left-0 right-0 max-h-40 overflow-auto bg-white border border-gray-200 rounded shadow-sm text-[11px]">
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}:${s.label}:${i}`}
              className={`px-1.5 py-1 cursor-pointer flex items-center gap-2 ${
                i === activeIdx ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // 避免 input blur
                applySuggestion(s);
              }}
              title={s.detail}
            >
              <span
                className={`inline-block w-10 text-[9px] uppercase tracking-wide ${
                  s.kind === 'fn'
                    ? 'text-emerald-500'
                    : s.kind === 'var'
                      ? 'text-purple-500'
                      : s.kind === 'keyword'
                        ? 'text-orange-500'
                        : 'text-gray-400'
                }`}
              >
                {s.kind}
              </span>
              <span className="font-mono text-gray-700">{s.label}</span>
              {s.detail && <span className="ml-auto text-[10px] text-gray-400 truncate">{s.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      {showError && !validation.ok && (
        <div className="mt-0.5 text-[10px] text-red-500 leading-tight truncate" title={validation.error}>
          {validation.error}
        </div>
      )}
    </div>
  );
}

export default ExpressionEditor;
