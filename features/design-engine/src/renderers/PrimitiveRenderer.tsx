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

  // textContent（数据绑定）优先于 text（静态默认值），兼容两种写法
  const textValue = (resolvedProps.textContent ?? resolvedProps.text) as string | undefined;

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
      return <h1 {...commonProps}>{textValue ?? children}</h1>;
    case 'h2':
      return <h2 {...commonProps}>{textValue ?? children}</h2>;
    case 'h3':
      return <h3 {...commonProps}>{textValue ?? children}</h3>;
    case 'p':
      return <p {...commonProps}>{textValue ?? children}</p>;
    case 'span':
      return <span {...commonProps}>{textValue ?? children}</span>;
    case 'a':
      return (
        <a
          {...commonProps}
          href={resolvedProps.href as string}
          target={resolvedProps.target as string}
          rel={resolvedProps.rel as string}
          onClick={(e) => e.preventDefault()}
        >
          {textValue ?? children}
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
          {textValue ?? children}
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
      return <li {...commonProps}>{textValue ?? children}</li>;

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
      return <div {...commonProps}>{children}</div>;
  }
}
