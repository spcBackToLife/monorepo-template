/**
 * Theme MCP helpers — 与 schema 包 applyThemeOp 配合的轻量封装。
 *
 * 这里只负责"取数据 / 存数据"，所有变更语义都委托给 schema 包的 applyThemeOp，
 * 保证 MCP / 后端 API / 前端 store 三方语义 100% 一致。
 */
import type { ThemeConfig, ThemeOp } from '@globallink/design-schema';
import { applyThemeOp as applyOp } from '@globallink/design-schema';
import { apiClient } from '../../../api-client.js';

export async function loadThemeConfig(projectId: string): Promise<ThemeConfig> {
  const cfg = (await apiClient.getTheme(projectId)) as ThemeConfig | null;
  if (!cfg) {
    throw new Error(`项目 ${projectId} 无 themeConfig（应在创建项目时自动注入 DEFAULT_THEME_CONFIG）`);
  }
  return cfg;
}

export async function saveThemeConfig(projectId: string, cfg: ThemeConfig): Promise<void> {
  await apiClient.updateTheme(projectId, cfg);
}

/**
 * 执行单个 op：读 → apply → 写 → 返回变化字段。
 */
export async function executeThemeOp(projectId: string, op: ThemeOp): Promise<{ changed: string[] }> {
  const cfg = await loadThemeConfig(projectId);
  const { next, changed } = applyOp(cfg, op);
  await saveThemeConfig(projectId, next);
  return { changed };
}
