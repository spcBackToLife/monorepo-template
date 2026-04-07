import type { CSSProperties, ComponentNode } from '@globallink/design-schema';
import type { DataContext } from '../data/resolveExpression';
import { hasExpression, resolveExpression } from '../data/resolveExpression';

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
 *
 * When `dataContext` is set, string values containing `{{...}}` are resolved the same way as props
 * (full `{{data.x}}` keeps primitive type; mixed templates become strings).
 */
export function resolveStyles(styles: CSSProperties, dataContext?: DataContext): React.CSSProperties {
  // `background` shorthand resets background-color when both appear on the same inline style.
  // Layer merges can leave both; prefer explicit backgroundColor unless background is a gradient/image.
  const merged = { ...styles } as Record<string, string | number | undefined>;
  const bgColor = merged.backgroundColor;
  const bgShorthand = merged.background;
  if (
    bgColor != null &&
    bgColor !== '' &&
    bgShorthand !== undefined &&
    typeof bgShorthand === 'string' &&
    !/\bgradient\b|url\s*\(/i.test(bgShorthand)
  ) {
    delete merged.background;
  }

  if (dataContext) {
    for (const key of Object.keys(merged)) {
      const v = merged[key];
      if (typeof v === 'string' && hasExpression(v)) {
        merged[key] = resolveExpression(v, dataContext) as string | number | undefined;
      }
    }
  }

  const resolved: Record<string, string | number | undefined> = {};

  for (const [key, value] of Object.entries(merged)) {
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

/**
 * 4-layer style resolution for a ComponentNode.
 *
 * Merge order (later layers override earlier):
 * 1. **base**: node.styles
 * 2. **global**: matching globalStateBindings[].styles (where current global state value matches)
 * 3. **business**: node.states[activeState].styles (if activeState is not 'default')
 * 4. **interaction**: hover/active/focus overrides from interactionState
 *
 * After merging, converts to React.CSSProperties (numeric → px).
 */
export function resolveNodeStyles(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState?: string | null,
  dataContext?: DataContext,
  /** State override from parent's childrenStates mapping */
  parentStateOverride?: string | null,
): React.CSSProperties {
  // Layer 1: base styles
  let merged: CSSProperties = { ...node.styles };

  // Layer 2: domain state bindings
  if (node.domainStateBindings?.length) {
    for (const binding of node.domainStateBindings) {
      const currentValue = globalStates[binding.variableName];
      if (currentValue === binding.value && binding.styles) {
        merged = { ...merged, ...binding.styles };
      }
    }
  }

  // Layer 2b: environment state bindings
  if (node.environmentBindings?.length) {
    for (const binding of node.environmentBindings) {
      const currentValue = globalStates[binding.variableName];
      if (currentValue === binding.value && binding.styles) {
        merged = { ...merged, ...binding.styles };
      }
    }
  }

  // Layer 3: business state (activeState override)
  // Priority: interactionState > parentStateOverride > node.activeState
  // When interactionState is provided (panorama/preview), it REPLACES the business state.
  // When parentStateOverride is provided, parent's childrenStates mapping takes precedence over node's own activeState.
  const effectiveStateName = parentStateOverride ?? (node.activeState ?? 'default');
  if (!interactionState && effectiveStateName !== 'default') {
    const activeState = node.states?.find((s) => s.name === effectiveStateName);
    if (activeState?.styles) {
      merged = { ...merged, ...activeState.styles };
    }
    if (activeState?.transition) {
      const t = activeState.transition;
      const duration = t.duration ?? 200;
      const easing = t.easing ?? 'ease';
      const props = t.properties?.join(', ') ?? 'all';
      merged = { ...merged, transition: `${props} ${duration}ms ${easing}` };
    }
  }

  // Layer 4: interaction state (hover, active, focus, etc.)
  if (interactionState) {
    let interactionStateObj = node.states?.find((s) => s.name === interactionState);
    /** 画布「交互状态预览」下拉为 active，Schema 常命名为 pressed（与 CSS :active 一致） */
    if (!interactionStateObj && interactionState === 'active') {
      interactionStateObj = node.states?.find((s) => s.name === 'pressed');
    }
    if (interactionStateObj?.styles) {
      merged = { ...merged, ...interactionStateObj.styles };
    }
  }

  return resolveStyles(merged, dataContext);
}
