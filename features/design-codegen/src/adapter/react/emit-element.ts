import type { NodeIR } from '../../core/types';
import type { ReactAdapter } from './index';
import { resolveClassName } from '../../emit/plan-style';

/**
 * Build the attribute string for a JSX element.
 *
 * Handles: className, static props, dynamic styles, events, two-way binding, HTML props.
 *
 * Static styles are extracted to .less files and referenced via className (CSS Modules).
 * Only dynamic styles (containing expressions) are emitted as inline style={{}}.
 *
 * Uses resolveClassName() to get the disambiguated class name that matches
 * the .less file output from plan-style.ts, preventing mismatches when
 * sibling nodes share the same semantic name.
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 6, 9e
 */
export function buildAttributes(node: NodeIR, adapter: ReactAdapter): string {
  const parts: string[] = [];

  // className (via CSS Modules) — covers static styles extracted to .less file
  // Use resolveClassName() which returns the disambiguated name matching plan-style.ts
  const hasStaticStyles = node.staticStyles && Object.keys(node.staticStyles).length > 0;
  if (hasStaticStyles || node.name) {
    const className = resolveClassName(node);
    parts.push(adapter.emitClassName(className));
  }

  // Dynamic styles as inline style object (only dynamic expressions)
  if (node.dynamicStyles.length > 0) {
    parts.push(adapter.emitDynamicStyle(node.dynamicStyles));
  }

  // Event bindings
  for (const event of node.events) {
    parts.push(adapter.emitEventAttribute(event.trigger, event.handlerName));
  }

  // Two-way binding
  if (node.bind) {
    parts.push(adapter.emitBind(node.bind, node.tag));
  }

  // HTML props (src, placeholder, href, alt, type, etc.)
  if (node.htmlProps) {
    for (const [key, value] of Object.entries(node.htmlProps)) {
      if (typeof value === 'string') {
        parts.push(`${key}="${value}"`);
      } else if (value && typeof value === 'object' && 'compiled' in value) {
        parts.push(`${key}={${value.compiled}}`);
      }
    }
  }

  if (parts.length === 0) return '';
  return ' ' + parts.join(' ');
}

