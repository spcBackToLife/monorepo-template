import React from 'react';
import type { ComponentNode } from '@globallink/design-schema';
import { encodeNodeInstanceKey, useListInstancePath } from '../renderer/ListInstanceContext';

export interface PrimitiveRendererProps {
  /** The ComponentNode to render */
  node: ComponentNode;
  /** Resolved React CSS styles */
  style: React.CSSProperties;
  /** Resolved props (from state merge) */
  resolvedProps: Record<string, unknown>;
  /** Rendered children */
  children: React.ReactNode;
  /** When true, form elements are fully interactive (preview mode) */
  interactive?: boolean;
}

/**
 * 叶子文案在 schema 里常见写法：`props.textContent` / `props.text`（推荐），
 * 或 **`props.children` 存字符串**（含 `{{data.*}}`，且树 `children[]` 为空）。
 * 解析顺序：textContent → text → props.children；均未定义时再回退到树子节点。
 *
 * ⚠️ 渲染契约（v1.0 起明确）：
 * - 字符串值 `''`（空字符串）视为「显式无叶子文本」，让渲染层 fall through 到 `children` 树
 * - 数字 `0` 仍渲染为 `'0'`（非空叶子文本）
 *
 * 这条契约修复了一个易踩坑：如果 schema 的 `props.textContent: ''` + `children: [...]`
 * 同时存在（典型场景：把段落拆成多段子节点 + 父节点 textContent 留空让 children 接管），
 * 旧实现会把空字符串当成有效叶子，children 永远不渲染（"协议没展示"类 bug）。
 *
 * 与 codegen/reactCodegen.ts 的 pickInlinePropText 必须保持同一行为。
 *
 * export 仅供单元测试使用——本函数在文件内被 resolvedInlineOrTreeChildren 调用。
 */
export function readInlineTextFromProps(resolvedProps: Record<string, unknown>): string | undefined {
  const a = resolvedProps.textContent ?? resolvedProps.text;
  if (typeof a === 'number') return String(a);
  if (typeof a === 'string' && a !== '') return a;
  const c = resolvedProps.children;
  if (typeof c === 'number') return String(c);
  if (typeof c === 'string' && c !== '') return c;
  return undefined;
}

function resolvedInlineOrTreeChildren(
  resolvedProps: Record<string, unknown>,
  treeChildren: React.ReactNode,
): React.ReactNode {
  const inline = readInlineTextFromProps(resolvedProps);
  if (inline !== undefined) return inline;
  return treeChildren;
}

/**
 * 从 resolvedProps 抽出"可透传到 DOM 的 React 事件 handler"。
 *
 * PreviewRenderer 把 schema 事件（click / doubleClick / focus / blur / submit …）
 * 组装成 React 风格的 onClick/onDoubleClick/… 并合并进 resolvedProps；
 * PrimitiveRenderer 必须把这些函数真正绑到元素上，否则预览下点击不触发 nav.go。
 *
 * 仅透传函数类型的 `onXxx` 字段（过滤掉 children、textContent、src 等业务字段）。
 * `onChange` 单独由各分支（input/textarea/select）按需处理，不在这里自动透传，
 * 避免对非表单元素产生无效绑定。
 */
const TRANSFER_EVENT_PROP_PATTERN = /^on[A-Z][A-Za-z]*$/;
function extractDomEventHandlers(
  resolvedProps: Record<string, unknown>,
): Record<string, (e: React.SyntheticEvent) => void> {
  const out: Record<string, (e: React.SyntheticEvent) => void> = {};
  for (const [k, v] of Object.entries(resolvedProps)) {
    if (typeof v !== 'function') continue;
    if (!TRANSFER_EVENT_PROP_PATTERN.test(k)) continue;
    // onChange 归各受控分支管，onSubmit 归 form-like 分支管；此处均不自动透传
    if (k === 'onChange' || k === 'onSubmit') continue;
    out[k] = v as (e: React.SyntheticEvent) => void;
  }
  return out;
}

/**
 * Renders a primitive node type as its corresponding HTML element.
 *
 * Maps the node's `type` (div, button, img, etc.) to a real HTML element,
 * applies the resolved styles and props，并注入 `data-node-id` 与 `data-node-instance-key`（列表多实例唯一）。
 */
export function PrimitiveRenderer({
  node,
  style,
  resolvedProps,
  children,
  interactive = false,
}: PrimitiveRendererProps) {
  const listPath = useListInstancePath();
  const instanceKey = encodeNodeInstanceKey(listPath, node.id);
  const domHandlers = extractDomEventHandlers(resolvedProps);
  const commonProps = {
    'data-node-id': node.id,
    'data-node-instance-key': instanceKey,
    'data-node-type': node.type,
    style,
    ...domHandlers,
  };

  switch (node.type) {
    // --- Self-closing / void elements ---
    case 'img': {
      const rawSrc = String(resolvedProps.src ?? '');
      const altText = (resolvedProps.alt as string) ?? '';
      // Fallback: 空 src（design 阶段产物，executor 还没填）→ 占位图替代 broken-image icon
      // 不依赖任何资源，纯 CSS：浅灰底 + 中央 alt 文字 + 右上角小角标
      const isEmpty = !rawSrc || rawSrc === 'placeholder' || rawSrc.startsWith('<待');
      if (isEmpty) {
        return (
          <div
            {...commonProps}
            style={{
              ...style,
              display: (style.display ?? 'inline-flex') as React.CSSProperties['display'],
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: (style.backgroundColor ?? '#F1F2F4') as string,
              color: '#8F94A0',
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              border: (style.border ?? '1px dashed #D5D7DC') as string,
              boxSizing: 'border-box',
              position: (style.position ?? 'relative') as React.CSSProperties['position'],
              overflow: 'hidden',
            }}
            data-img-placeholder="true"
            aria-label={altText || '图片占位'}
          >
            <span style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {altText || '📷 占位'}
            </span>
          </div>
        );
      }
      return (
        <img
          {...commonProps}
          src={rawSrc}
          alt={altText}
          loading={(resolvedProps.loading as 'lazy' | 'eager') ?? 'lazy'}
        />
      );
    }

    case 'svg':
      return (
        <div
          {...commonProps}
          style={{
            ...style,
            display: style.display ?? 'flex',
            alignItems: (style as Record<string, unknown>).alignItems as string ?? 'center',
            justifyContent: (style as Record<string, unknown>).justifyContent as string ?? 'center',
          }}
          dangerouslySetInnerHTML={{
            __html: (resolvedProps.svgContent as string) ?? '',
          }}
        />
      );

    case 'input': {
      const inputType = (resolvedProps.type as string) ?? 'text';
      const isCheckbox = inputType === 'checkbox' || inputType === 'radio';
      const maxLength = resolvedProps.maxLength as number | undefined;
      const inputMode = resolvedProps.inputMode as string | undefined;
      const pattern = resolvedProps.pattern as string | undefined;
      const autoFocusNext = resolvedProps.autoFocusNext as string | undefined;

      // autoFocusNext: 输入满 maxLength 后自动聚焦下一个节点
      const handleAutoAdvance = autoFocusNext && maxLength
        ? (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value.length >= maxLength) {
              const next = document.querySelector(`[data-node-id="${autoFocusNext}"] input, [data-node-id="${autoFocusNext}"]`) as HTMLElement | null;
              next?.focus();
            }
          }
        : undefined;

      if (interactive) {
        return isCheckbox ? (
          <input
            {...commonProps}
            type={inputType}
            defaultChecked={resolvedProps.checked as boolean ?? resolvedProps.value as boolean ?? false}
            disabled={resolvedProps.disabled as boolean}
            onChange={(e) => {
              // ★ 受控 checkbox/radio：从 resolvedProps 读 onChange（PreviewRenderer 通过 bind 注入）
              // 不从 domHandlers 读 —— extractDomEventHandlers 已显式排除 onChange，避免非表单节点误绑
              const onChangeFn = resolvedProps.onChange as ((e: React.SyntheticEvent) => void) | undefined;
              onChangeFn?.(e);
            }}
          />
        ) : (
          <input
            {...commonProps}
            placeholder={resolvedProps.placeholder as string}
            type={inputType}
            defaultValue={resolvedProps.value as string}
            disabled={resolvedProps.disabled as boolean}
            maxLength={maxLength}
            inputMode={inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
            pattern={pattern}
            onChange={(e) => {
              // ★ 受控 input：从 resolvedProps 读 onChange（PreviewRenderer 通过 bind 注入）
              // 不从 domHandlers 读 —— extractDomEventHandlers 已显式排除 onChange，避免非表单节点误绑
              const onChangeFn = resolvedProps.onChange as ((e: React.SyntheticEvent) => void) | undefined;
              onChangeFn?.(e);
              handleAutoAdvance?.(e);
            }}
          />
        );
      }
      return (
        <input
          {...commonProps}
          placeholder={resolvedProps.placeholder as string}
          type={inputType}
          value={resolvedProps.value as string ?? ''}
          disabled={resolvedProps.disabled as boolean}
          maxLength={maxLength}
          inputMode={inputMode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
          pattern={pattern}
          readOnly
          onChange={() => {}}
        />
      );
    }

    case 'textarea':
      if (interactive) {
        return (
          <textarea
            {...commonProps}
            placeholder={resolvedProps.placeholder as string}
            rows={resolvedProps.rows as number}
            defaultValue={resolvedProps.value as string}
            disabled={resolvedProps.disabled as boolean}
          />
        );
      }
      return (
        <textarea
          {...commonProps}
          placeholder={resolvedProps.placeholder as string}
          rows={resolvedProps.rows as number}
          disabled={resolvedProps.disabled as boolean}
          readOnly
          value={resolvedProps.value as string ?? ''}
          onChange={() => {}}
        />
      );

    case 'select':
      if (interactive) {
        return (
          <select
            {...commonProps}
            defaultValue={resolvedProps.value as string}
            disabled={resolvedProps.disabled as boolean}
          >
            {children}
          </select>
        );
      }
      return (
        <select
          {...commonProps}
          disabled={resolvedProps.disabled as boolean}
          value={resolvedProps.value as string}
          onChange={() => {}}
        >
          {children}
        </select>
      );

    // --- Text elements ---
    case 'h1':
      return <h1 {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</h1>;
    case 'h2':
      return <h2 {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</h2>;
    case 'h3':
      return <h3 {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</h3>;
    case 'p':
      return <p {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</p>;
    case 'span':
      return <span {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</span>;
    case 'a': {
      // preventDefault 避免真跳 href；若用户挂了 onClick（schema 事件），仍需执行
      const userOnClick = domHandlers.onClick;
      return (
        <a
          {...commonProps}
          href={resolvedProps.href as string}
          target={resolvedProps.target as string}
          rel={resolvedProps.rel as string}
          onClick={(e) => {
            e.preventDefault();
            userOnClick?.(e);
          }}
        >
          {resolvedInlineOrTreeChildren(resolvedProps, children)}
        </a>
      );
    }

    // --- Container / structural elements ---
    case 'button':
      // Fallback: 浏览器原生 button 带 inset shadow / appearance / 字体继承不到等"先验样式"
      // 这些样式如果不被 schema 显式覆盖，会让 design 阶段写的样式（如 backgroundColor 透明）失效
      // 这里把"reset"作为基底，schema styles 在上面叠加（schema 显式写则覆盖）
      return (
        <button
          {...commonProps}
          style={{
            // ★ Reset 基线（schema 不写时兜底；schema 写则覆盖）
            appearance: 'none',
            WebkitAppearance: 'none',
            font: 'inherit',
            boxSizing: 'border-box',
            margin: 0,
            ...style,
          }}
          disabled={resolvedProps.disabled as boolean}
          type="button"
        >
          {resolvedInlineOrTreeChildren(resolvedProps, children)}
        </button>
      );
    case 'nav':
      return <nav {...commonProps}>{children}</nav>;
    case 'header':
      return <header {...commonProps}>{children}</header>;
    case 'footer':
      return <footer {...commonProps}>{children}</footer>;
    case 'section':
      return <section {...commonProps}>{children}</section>;
    case 'main':
      return <main {...commonProps}>{children}</main>;
    case 'ul':
      return <ul {...commonProps}>{children}</ul>;
    case 'ol':
      return <ol {...commonProps}>{children}</ol>;
    case 'li':
      return <li {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</li>;

    case 'annotation':
      return (
        <div
          {...commonProps}
          style={{
            ...style,
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <span style={{ marginRight: 4 }} aria-hidden>
            📌
          </span>
          {(resolvedProps.content as string) ?? ''}
        </div>
      );

    // --- Default: div ---
    default:
      return <div {...commonProps}>{resolvedInlineOrTreeChildren(resolvedProps, children)}</div>;
  }
}
