import type { NodeIR } from '../../core/types';
import type { ReactAdapter } from './index';

/**
 * Build the attribute string for a JSX element.
 *
 * Handles: className, static props, dynamic styles, events, two-way binding.
 *
 * Static styles are extracted to .less files and referenced via className (CSS Modules).
 * Only dynamic styles (containing expressions) are emitted as inline style={{}}.
 */
export function buildAttributes(node: NodeIR, adapter: ReactAdapter): string {
  const parts: string[] = [];

  // className (via CSS Modules) — covers static styles extracted to .less file
  if (node.name) {
    parts.push(adapter.emitClassName(toCssClassName(node.name)));
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

