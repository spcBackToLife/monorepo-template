import type { CSSProperties } from '@globallink/design-schema';

/**
 * Convert design-schema CSSProperties to React.CSSProperties.
 *
 * Handles:
 * - Numeric values that need 'px' units (width, height, fontSize, etc.)
 * - Passthrough for string values and unitless properties
 */

/** Properties that should remain unitless even if numeric */
const UNITLESS_PROPERTIES = new Set([
  'opacity',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'fontWeight',
  'lineHeight',
  'gridColumn',
  'gridRow',
]);

/**
 * Resolve design-schema CSSProperties into React-compatible CSSProperties.
 *
 * Numeric values for dimensional properties are converted to `${value}px`.
 * Unitless properties (opacity, zIndex, etc.) are kept as numbers.
 */
export function resolveStyles(styles: CSSProperties): React.CSSProperties {
  const resolved: Record<string, string | number | undefined> = {};

  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined) continue;

    if (typeof value === 'number' && !UNITLESS_PROPERTIES.has(key)) {
      // Convert numeric values to px strings for dimensional properties
      resolved[key] = value === 0 ? 0 : `${value}px`;
    } else {
      resolved[key] = value;
    }
  }

  return resolved as React.CSSProperties;
}
