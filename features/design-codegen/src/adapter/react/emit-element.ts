import type { NodeIR } from '../../core/types';
import type { ReactAdapter } from './index';

/**
 * Build the attribute string for a JSX element.
 *
 * Handles: className, static props, dynamic styles, events, two-way binding, HTML props.
 *
 * Static styles are extracted to .less files and referenced via className (CSS Modules).
 * Only dynamic styles (containing expressions) are emitted as inline style={{}}.
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 6, 9e
 */
export function buildAttributes(node: NodeIR, adapter: ReactAdapter): string {
  const parts: string[] = [];

  // className (via CSS Modules) — covers static styles extracted to .less file
  // For named nodes: use the name. For unnamed nodes with styles: use synthetic name.
  const hasStaticStyles = node.staticStyles && Object.keys(node.staticStyles).length > 0;
  if (node.name) {
    parts.push(adapter.emitClassName(toCssClassName(node.name)));
  } else if (hasStaticStyles && node.id) {
    // Unnamed node with styles — use synthetic class name matching plan-style.ts
    parts.push(adapter.emitClassName(`node${node.id.slice(-6)}`));
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

/**
 * Convert a semantic name to a valid CSS class name.
 * E.g. "Message Card" → "messageCard", "send-button" → "sendButton"
 */
function toCssClassName(name: string): string {
  // Already camelCase? Return as-is
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return name;

  // Convert kebab-case or space-separated to camelCase
  return name
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

