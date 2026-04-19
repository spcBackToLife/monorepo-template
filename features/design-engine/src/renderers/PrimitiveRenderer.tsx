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
 */
function readInlineTextFromProps(resolvedProps: Record<string, unknown>): string | undefined {
  const a = resolvedProps.textContent ?? resolvedProps.text;
  if (typeof a === 'string' || typeof a === 'number') return String(a);
  const c = resolvedProps.children;
  if (typeof c === 'string' || typeof c === 'number') return String(c);
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
  const commonProps = {
    'data-node-id': node.id,
    'data-node-instance-key': instanceKey,
    'data-node-type': node.type,
    style,
  };

  switch (node.type) {
    // --- Self-closing / void elements ---
    case 'img':
      return (
        <img
          {...commonProps}
          src={String(resolvedProps.src ?? '')}
          alt={resolvedProps.alt as string ?? ''}
          loading={(resolvedProps.loading as 'lazy' | 'eager') ?? 'lazy'}
        />
      );

    case 'input': {
      const inputType = (resolvedProps.type as string) ?? 'text';
      const isCheckbox = inputType === 'checkbox' || inputType === 'radio';
      if (interactive) {
        return isCheckbox ? (
          <input
            {...commonProps}
            type={inputType}
            defaultChecked={resolvedProps.checked as boolean ?? resolvedProps.value as boolean ?? false}
            disabled={resolvedProps.disabled as boolean}
          />
        ) : (
          <input
            {...commonProps}
            placeholder={resolvedProps.placeholder as string}
            type={inputType}
            defaultValue={resolvedProps.value as string}
            disabled={resolvedProps.disabled as boolean}
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
    case 'a':
      return (
        <a
          {...commonProps}
          href={resolvedProps.href as string}
          target={resolvedProps.target as string}
          rel={resolvedProps.rel as string}
          onClick={(e) => e.preventDefault()}
        >
          {resolvedInlineOrTreeChildren(resolvedProps, children)}
        </a>
      );

    // --- Container / structural elements ---
    case 'button':
      return (
        <button
          {...commonProps}
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
