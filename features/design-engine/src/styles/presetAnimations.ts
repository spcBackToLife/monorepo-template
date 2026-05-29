/**
 * 预置 CSS Keyframes 动画库。
 * 覆盖设计系统中 80% 的动画需求，避免手写 keyframes。
 */

/** 预置动画的 keyframes CSS 定义 */
export const PRESET_KEYFRAMES: Record<string, string> = {
  shake: `@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}`,
  fadeIn: `@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  fadeOut: `@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
  scaleIn: `@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`,
  scaleOut: `@keyframes scaleOut {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.9); opacity: 0; }
}`,
  slideUp: `@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  slideDown: `@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  bounce: `@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}`,
  pulse: `@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}`,
  spin: `@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
};

/** 所有预置动画名称集合（用于判断是否为预置） */
export const PRESET_ANIMATION_NAMES = new Set(Object.keys(PRESET_KEYFRAMES));

/**
 * 生成完整的 <style> 标签内容，包含所有预置 keyframes。
 * 在 SchemaRenderer 的顶层注入一次即可。
 */
export function generatePresetKeyframesCSS(): string {
  return Object.values(PRESET_KEYFRAMES).join('\n\n');
}

/**
 * 将 AnimationDef 转换为 CSS animation 属性值字符串。
 */
export function buildAnimationCSSValue(
  name: string,
  duration = 300,
  easing = 'ease',
  iterationCount: number | 'infinite' = 1,
  direction: string = 'normal',
  fillMode: string = 'forwards',
): string {
  const count = iterationCount === 'infinite' ? 'infinite' : String(iterationCount);
  return `${name} ${duration}ms ${easing} ${count} ${direction} ${fillMode}`;
}
