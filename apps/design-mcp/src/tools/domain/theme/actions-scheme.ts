/**
 * Theme actions — 色彩方案级写入
 *
 * 一个主题内部可有多个色彩方案（light / dark / high-contrast）。
 * 所有写入委托给 schema 包的 applyThemeOp（唯一变更入口）。
 */
import { z } from 'zod';
import { defineAction } from '../../helpers/registerDomainTool.js';
import { executeThemeOp } from './helpers.js';

export const switchColorSchemeAction = defineAction({
  description:
    '切换当前主题的色彩方案（如从 light 切到 dark）。\n' +
    '编辑器预览会同步切换；运行时通过 data-scheme 属性实现 CSS 变量切换。',
  schema: z.object({
    projectId: z.string(),
    schemeId: z.string(),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'switch_color_scheme',
      schemeId: p.schemeId,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const addColorSchemeAction = defineAction({
  description:
    '在当前 active 主题下追加一个色彩方案。\n\n' +
    'kind="dark" 时不传 overrides 会自动派生暗色 overrides 骨架（可后续 update_color_scheme_overrides 细化）。\n' +
    'kind="custom" 时必须显式传 overrides。',
  schema: z.object({
    projectId: z.string(),
    schemeId: z.string(),
    name: z.string().optional(),
    label: z.string().optional(),
    kind: z.enum(['dark', 'light', 'high-contrast', 'custom']).default('custom'),
    overrides: z
      .object({
        colors: z.record(z.string(), z.string()).optional(),
        spacing: z.record(z.string(), z.string()).optional(),
        shadows: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'add_color_scheme',
      schemeId: p.schemeId,
      name: p.name,
      label: p.label,
      kind: p.kind,
      overrides: p.overrides as never,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const updateColorSchemeOverridesAction = defineAction({
  description:
    '更新某个色彩方案的 overrides（深合并）。\n' +
    '支持别名映射（bgPage→background 等）。',
  schema: z.object({
    projectId: z.string(),
    schemeId: z.string(),
    kind: z.enum(['colors', 'spacing', 'radius', 'typography', 'shadows', 'transitions']),
    values: z.record(z.string(), z.unknown()),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'update_color_scheme_overrides',
      schemeId: p.schemeId,
      kind: p.kind,
      values: p.values,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const removeColorSchemeAction = defineAction({
  description: '删除一个色彩方案。不能删 activeColorSchemeId 指向的方案；也不能让 colorSchemes 少于 2 套。',
  schema: z.object({
    projectId: z.string(),
    schemeId: z.string(),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'remove_color_scheme',
      schemeId: p.schemeId,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});
