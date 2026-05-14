/**
 * CSS Value Normalizer
 *
 * Schema stores CSS values as raw numbers (e.g., fontSize: 14).
 * Browsers require units for most properties (e.g., font-size: 14px).
 *
 * This module normalizes CSS values to be valid CSS strings.
 *
 * @see design_docs/03-tech/codegen-quality-fix.md — Phase 1
 */

/**
 * CSS properties that accept unitless numeric values.
 * For these properties, a bare number like `14` is valid CSS.
 * All other properties need a unit suffix (typically `px`).
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/number
 */
const UNITLESS_PROPERTIES = new Set([
  // Flex
  'flex', 'flexGrow', 'flex-grow', 'flexShrink', 'flex-shrink',
  // Opacity & visibility
  'opacity',
  // Font
  'fontWeight', 'font-weight',
  // Line-height (unitless = multiplier)
  'lineHeight', 'line-height',
  // Z-index & order
  'zIndex', 'z-index', 'order',
  // Counters & columns
  'orphans', 'widows', 'columnCount', 'column-count',
  'counterIncrement', 'counter-increment', 'counterReset', 'counter-reset',
  // Tab
  'tabSize', 'tab-size',
  // Animation
  'animationIterationCount', 'animation-iteration-count',
  // SVG
  'fillOpacity', 'fill-opacity',
  'floodOpacity', 'flood-opacity',
  'stopOpacity', 'stop-opacity',
  'strokeDashoffset', 'stroke-dashoffset',
  'strokeMiterlimit', 'stroke-miterlimit',
  'strokeOpacity', 'stroke-opacity',
  'strokeWidth', 'stroke-width',
]);

/**
 * Normalize a CSS value from schema representation to valid CSS string.
 *
 * Rules:
 * 1. Pure numeric value + property that requires unit → append "px"
 * 2. Pure numeric 0 → "0" (no unit needed)
 * 3. Value already has unit/is not pure numeric → return as-is
 * 4. Special keywords (auto, none, inherit, etc.) → return as-is
 *
 * @param property CSS property name (camelCase or kebab-case)
 * @param value    String representation of the value
 */
export function normalizeCssValue(property: string, value: string): string {
  // Not a pure number → already has unit or is a keyword/expression
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;

  const num = parseFloat(value);

  // Zero never needs a unit
  if (num === 0) return '0';

  // Check both camelCase and kebab-case forms
  const kebabProp = camelToKebab(property);
  if (UNITLESS_PROPERTIES.has(property) || UNITLESS_PROPERTIES.has(kebabProp)) {
    return value;
  }

  return `${value}px`;
}

/**
 * Convert camelCase property name to kebab-case.
 * E.g., "fontSize" → "font-size", "borderTopLeftRadius" → "border-top-left-radius"
 */
export function camelToKebab(property: string): string {
  return property.replace(/([A-Z])/g, '-$1').toLowerCase();
}
