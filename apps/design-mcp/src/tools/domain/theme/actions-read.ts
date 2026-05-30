/**
 * Theme actions — read only（check / get / validate）
 *
 * 这些 action 不改 ThemeConfig，仅做读取 + 校验。
 */
import { z } from 'zod';
import { defineAction } from '../../helpers/registerDomainTool.js';
import { validateThemeConfig } from '@globallink/design-schema';
import { loadThemeConfig } from './helpers.js';

export const checkAction = defineAction({
  description:
    '检查项目主题是否已被定制。返回 { customized, summary }。\n\n' +
    '⚠️ 所有设计 Skill 的 Phase 0 必须先调用此 action：\n' +
    '- customized=true → 继续设计，使用 $token:xxx 引用\n' +
    '- customized=false → 停止设计！先用 theme-generator Skill 制定主题风格',
  schema: z.object({
    projectId: z.string().describe('项目 ID'),
  }),
  handler: async (p) => {
    const cfg = await loadThemeConfig(p.projectId);
    const activeTheme = cfg.themes.find(t => t.id === cfg.activeThemeId);
    const summary = activeTheme?.intent?.summary ?? '未设置';
    const customized = cfg.customized === true;
    const message = customized
      ? '✅ 主题已定制，可以继续设计。设置样式时请使用 $token:xxx 引用。'
      : '⛔ 主题尚未定制！请先引导用户描述期望的风格（如"轻奢暗色科技风"），然后使用 theme-generator Skill 生成完整主题，再开始设计。';
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ customized, summary, activeThemeId: cfg.activeThemeId, themeCount: cfg.themes.length, message }, null, 2),
      }],
    };
  },
});

export const getAction = defineAction({
  description:
    '获取项目的完整主题配置（ThemeConfig）。\n\n' +
    '结构：themes[].{ intent, tokens, decorationRules, iconSpec, stateSpec, colorSchemes[] }\n' +
    '所有主题级字段在 themes[<active>] 内部，不要去顶层找。',
  schema: z.object({
    projectId: z.string().describe('项目 ID'),
  }),
  handler: async (p) => {
    const cfg = await loadThemeConfig(p.projectId);
    return { content: [{ type: 'text' as const, text: JSON.stringify(cfg, null, 2) }] };
  },
});

export const validateAction = defineAction({
  description:
    '验证主题配置合规性（跑 R-THEME-01~10 全部红线）。\n' +
    '返回 { ok, errors[], warnings[] }。\n' +
    '出场门禁：theme-generator T7 必须先看 ok=true 才能交接给下一阶段。',
  schema: z.object({
    projectId: z.string().describe('项目 ID'),
  }),
  handler: async (p) => {
    const cfg = await loadThemeConfig(p.projectId);
    const report = validateThemeConfig(cfg);
    return { content: [{ type: 'text' as const, text: JSON.stringify(report, null, 2) }] };
  },
});
