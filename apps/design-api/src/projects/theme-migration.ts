/**
 * ThemeConfig 数据归一化迁移
 *
 * 目标：保证 themeConfig 的所有数据都在 themes[<active>].* 内部，与渲染端
 *   features/design-engine/src/styles/resolveTokens.ts 一致。
 *
 * 历史背景：早期写入路径错误地把 intent / tokens / decorationRules / iconSpec / stateSpec
 *   放到了 themeConfig 顶层。本函数把它们搬到 active 主题内部，并清空顶层。
 *
 * 入口：projects.service.findOne 在返回 project 前调用。
 * 幂等：执行后 schemaVersion='1.0'，再次调用直接返回 false。
 */
import type { ThemeConfig, ThemeDefinition } from '@globallink/design-schema';

type Mut = Record<string, unknown>;

function deepMerge(base: unknown, patch: unknown): unknown {
  if (patch === undefined || patch === null) return base;
  if (typeof patch !== 'object' || Array.isArray(patch)) return patch;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return patch;
  const result: Mut = { ...(base as Mut) };
  for (const [k, v] of Object.entries(patch as Mut)) {
    result[k] = deepMerge(result[k], v);
  }
  return result;
}

/**
 * 直接 mutate 入参（与现有 findOne 风格一致）；返回是否真的发生了迁移。
 */
export function migrateThemeConfigInPlace(cfg: ThemeConfig | undefined | null): boolean {
  if (!cfg) return false;
  const anyCfg = cfg as unknown as Mut;

  // 已归一 → 直接返回
  if (anyCfg.schemaVersion === '1.0' &&
      anyCfg.intent === undefined &&
      anyCfg.tokens === undefined &&
      anyCfg.decorationRules === undefined &&
      anyCfg.iconSpec === undefined &&
      anyCfg.stateSpec === undefined) {
    return false;
  }

  const active = cfg.themes?.find(t => t.id === cfg.activeThemeId) as ThemeDefinition | undefined;
  if (!active) {
    // 没有 active 主题：单独打 schemaVersion 即可，主题验证后续会报 R-THEME-08
    anyCfg.schemaVersion = '1.0';
    return true;
  }

  // 把顶层 5 个错位字段搬到 active 主题
  if (anyCfg.intent !== undefined) {
    active.intent = deepMerge(active.intent, anyCfg.intent) as typeof active.intent;
    delete anyCfg.intent;
  }
  if (anyCfg.tokens !== undefined && anyCfg.tokens !== null) {
    if (Object.keys(anyCfg.tokens as Mut).length > 0) {
      active.tokens = deepMerge(active.tokens, anyCfg.tokens) as typeof active.tokens;
    }
    delete anyCfg.tokens;
  }
  if (anyCfg.decorationRules !== undefined) {
    active.decorationRules = deepMerge(active.decorationRules, anyCfg.decorationRules) as typeof active.decorationRules;
    delete anyCfg.decorationRules;
  }
  if (anyCfg.iconSpec !== undefined) {
    active.iconSpec = deepMerge(active.iconSpec, anyCfg.iconSpec) as typeof active.iconSpec;
    delete anyCfg.iconSpec;
  }
  if (anyCfg.stateSpec !== undefined) {
    active.stateSpec = deepMerge(active.stateSpec, anyCfg.stateSpec) as typeof active.stateSpec;
    delete anyCfg.stateSpec;
  }

  active.updatedAt = new Date().toISOString();
  anyCfg.schemaVersion = '1.0';
  return true;
}
