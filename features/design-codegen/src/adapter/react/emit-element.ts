import type { NodeIR, DynamicStyleIR } from '../../core/types';
import type { ReactAdapter } from './index';

/**
 * Build the attribute string for a JSX element.
 *
 * Handles: className, static props, dynamic styles, events, two-way binding.
 */
export function buildAttributes(node: NodeIR, adapter: ReactAdapter): string {
  const parts: string[] = [];

  // className (via CSS Modules)
  if (node.name) {
    parts.push(adapter.emitClassName(toCssClassName(node.name)));
  }

  // Static styles as inline style object (only when staticStyles has entries)
  if (node.staticStyles && Object.keys(node.staticStyles).length > 0) {
    const inlineStyle = buildInlineStyle(node.staticStyles);
    parts.push(`style={${inlineStyle}}`);
  }

  // Dynamic styles override/extend inline style
  if (node.dynamicStyles.length > 0) {
    // If we already have static styles, merge them — otherwise emit standalone
    if (node.staticStyles && Object.keys(node.staticStyles).length > 0) {
      // The static style is already added; we'll append dynamic via spread
      // Remove the last static style entry and merge
      parts.pop();
      const merged = buildMergedStyle(node.staticStyles, node.dynamicStyles);
      parts.push(`style={${merged}}`);
    } else {
      parts.push(adapter.emitDynamicStyle(node.dynamicStyles));
    }
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

/**
 * Build a static inline style object string.
 * Input: { 'background-color': '#fff', 'font-size': '14px' }
 * Output: { backgroundColor: '#fff', fontSize: '14px' }
 */
function buildInlineStyle(styles: Record<string, string>): string {
  const entries = Object.entries(styles)
    .map(([prop, value]) => {
      const camelProp = toCamelCase(prop);
      return `${camelProp}: '${value}'`;
    })
    .join(', ');

  return `{ ${entries} }`;
}

/**
 * Build merged static + dynamic inline style.
 */
function buildMergedStyle(
  staticStyles: Record<string, string>,
  dynamicStyles: DynamicStyleIR[],
): string {
  const staticEntries = Object.entries(staticStyles)
    .map(([prop, value]) => `${toCamelCase(prop)}: '${value}'`);

  const dynamicEntries = dynamicStyles
    .map(s => `${s.property}: ${s.expression.compiled}`);

  const all = [...staticEntries, ...dynamicEntries].join(', ');
  return `{ ${all} }`;
}

/**
 * Convert kebab-case CSS property to camelCase.
 * "background-color" → "backgroundColor"
 */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
