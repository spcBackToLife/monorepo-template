import type { CSSProperties, ComponentNode, ExpressionStyles } from '@globallink/design-schema';
import type { DataContext } from '../data/dataContext';
import { hasExpression, resolveExpression } from '../data/dataContext';

/**
 * Convert design-schema CSSProperties to React.CSSProperties.
 *
 * - Numeric values for dimensional properties → `${value}px`
 * - Unitless properties (opacity / zIndex / flex / fontWeight 等) keep number
 * - 含 `{{ }}` 的表达式字符串走 expression 引擎求值
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
 * 把 design-schema 的 CSSProperties（v2 中每值可为 Expression）转成 React.CSSProperties。
 *
 * 入参接受 `ExpressionStyles` 或 `CSSProperties`——二者同形状，仅每值是否可为 Expression 不同。
 * 内部先求表达式，再统一按 CSSProperties 处理。
 *
 * `dataContext` 必传：v2 渲染器统一在 ctx 下求值；编辑期用 `buildEditorPreviewState` 构造的
 * 最小 ctx 即可。
 */
export function resolveStyles(
  styles: CSSProperties | ExpressionStyles,
  dataContext: DataContext,
): React.CSSProperties {
  // `background` shorthand resets background-color when both appear on the same inline style.
  // Layer merges can leave both; prefer explicit backgroundColor unless background is a gradient/image.
  const merged: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(styles)) {
    merged[k] = v as string | number | undefined;
  }

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

  // 求表达式
  for (const key of Object.keys(merged)) {
    const v = merged[key];
    if (typeof v === 'string' && hasExpression(v)) {
      const resolved = resolveExpression(v, dataContext);
      if (typeof resolved === 'number' || typeof resolved === 'string' || resolved === undefined) {
        merged[key] = resolved;
      } else if (resolved === null) {
        merged[key] = undefined;
      } else {
        // 数组/对象不是合法 CSS 值
        merged[key] = String(resolved);
      }
    }
  }

  const resolved: Record<string, string | number | undefined> = {};

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) continue;

    if (typeof value === 'number' && !UNITLESS_PROPERTIES.has(key)) {
      resolved[key] = value === 0 ? 0 : `${value}px`;
    } else {
      resolved[key] = value;
    }
  }

  // mask-image 需要 -webkit- 前缀（Chrome/Safari）
  if (resolved.maskImage && !resolved.WebkitMaskImage) {
    resolved.WebkitMaskImage = resolved.maskImage;
  }
  if (resolved.maskSize && !resolved.WebkitMaskSize) {
    resolved.WebkitMaskSize = resolved.maskSize;
  }
  if (resolved.maskRepeat && !resolved.WebkitMaskRepeat) {
    resolved.WebkitMaskRepeat = resolved.maskRepeat;
  }
  if (resolved.maskPosition && !resolved.WebkitMaskPosition) {
    resolved.WebkitMaskPosition = resolved.maskPosition;
  }

  return resolved as React.CSSProperties;
}

/**
 * v2 节点样式解析（3 层）：
 *   1. base:        node.styles
 *   2. business:    node.states[activeState].styles（activeState ≠ 'default'）
 *   3. interaction: hover/active/focus 等 visualState（来自 panorama / preview）
 *
 * v1 的 globalStateBindings / domainStateBindings / environmentBindings 已删除 —— 那部分
 * 在 v2 中由 expression 直接表达（`backgroundColor: '{{ state.view.theme === "dark" ? ... }}'`）。
 */
export function resolveNodeStyles(
  node: ComponentNode,
  dataContext: DataContext,
  interactionState?: string | null,
  /** State override from parent's childrenStates mapping */
  parentStateOverride?: string | null,
): React.CSSProperties {
  // Layer 1: base styles
  let merged: ExpressionStyles = { ...node.styles };

  // Layer 2: business state (activeState override)
  // Priority: interactionState > parentStateOverride > node.activeState
  const effectiveStateName = parentStateOverride ?? (node.activeState ?? 'default');
  if (!interactionState && effectiveStateName !== 'default') {
    const activeState = node.states?.find((s) => s.name === effectiveStateName);
    if (activeState?.styles) {
      merged = { ...merged, ...(activeState.styles as ExpressionStyles) };
    }
    if (activeState?.transition) {
      const t = activeState.transition;
      const duration = t.duration ?? 200;
      const easing = t.easing ?? 'ease';
      const props = t.properties?.join(', ') ?? 'all';
      merged = { ...merged, transition: `${props} ${duration}ms ${easing}` };
    }
  }

  // Layer 3: interaction state (hover, active, focus, ...)
  if (interactionState) {
    let interactionStateObj = node.states?.find((s) => s.name === interactionState);
    /** 画布"交互状态预览"下拉为 active，Schema 常命名为 pressed（与 CSS :active 一致） */
    if (!interactionStateObj && interactionState === 'active') {
      interactionStateObj = node.states?.find((s) => s.name === 'pressed');
    }
    if (interactionStateObj?.styles) {
      merged = { ...merged, ...(interactionStateObj.styles as ExpressionStyles) };
    }
  }

  return resolveStyles(merged, dataContext);
}
