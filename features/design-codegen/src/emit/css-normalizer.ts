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
 * 1. Token reference "$token:xxx" → CSS var(--xxx)
 * 2. Pure numeric value + property that requires unit → append "px"
 * 3. Pure numeric 0 → "0" (no unit needed)
 * 4. Value already has unit/is not pure numeric → return as-is
 * 5. Special keywords (auto, none, inherit, etc.) → return as-is
 *
 * @param property CSS property name (camelCase or kebab-case)
 * @param value    String representation of the value
 */
export function normalizeCssValue(property: string, value: string): string {
  // Token reference → CSS var()
  if (value.includes('$token:')) {
    return resolveTokenToCssVar(value);
  }

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
 * Convert $token:xxx references to CSS var(--xxx).
 *
 * Mapping rules:
 *   - Colors (no prefix): "$token:primary" → "var(--color-primary)"
 *   - Spacing: "$token:spacing-md" → "var(--spacing-md)"
 *   - Radius: "$token:radius-md" → "var(--radius-md)"
 *   - Shadow: "$token:shadow-sm" → "var(--shadow-sm)"
 *   - Transition: "$token:transition-fast" → "var(--transition-fast)"
 *   - Font sub-property: "$token:font-body.fontSize" → "var(--font-body-fontSize)"
 *
 * Supports compound values: "$token:spacing-sm $token:spacing-md" → "var(--spacing-sm) var(--spacing-md)"
 */
function resolveTokenToCssVar(value: string): string {
  return value.replace(/\$token:([a-zA-Z0-9_.-]+)/g, (_match, tokenName: string) => {
    const cssVarName = tokenToCssVarName(tokenName);
    return `var(--${cssVarName})`;
  });
}

/**
 * Map a token name to a CSS custom property name.
 *
 * - "primary" → "color-primary" (bare names are colors)
 * - "spacing-md" → "spacing-md" (already prefixed)
 * - "radius-lg" → "radius-lg"
 * - "shadow-sm" → "shadow-sm"
 * - "transition-fast" → "transition-fast"
 * - "font-body.fontSize" → "font-body-fontSize"
 */
function tokenToCssVarName(tokenName: string): string {
  // Replace dots with hyphens (for font sub-properties)
  const normalized = tokenName.replace(/\./g, '-');

  // If already prefixed with a category, use as-is
  const categories = ['spacing-', 'radius-', 'shadow-', 'transition-', 'font-'];
  for (const cat of categories) {
    if (normalized.startsWith(cat)) return normalized;
  }

  // Bare name (e.g. "primary", "textPrimary", "surface") → prefix with "color-"
  return `color-${camelToKebab(normalized)}`;
}

/**
 * Convert camelCase property name to kebab-case.
 * E.g., "fontSize" → "font-size", "borderTopLeftRadius" → "border-top-left-radius"
 */
export function camelToKebab(property: string): string {
  return property.replace(/([A-Z])/g, '-$1').toLowerCase();
}
