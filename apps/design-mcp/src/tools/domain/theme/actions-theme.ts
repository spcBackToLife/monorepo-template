/**
 * Theme actions — 主题级写入（scaffold / delete / switch / set_theme_*）
 *
 * 所有写入都委托给 schema 包的 applyThemeOp（唯一变更入口）。
 * MCP 这层只负责参数校验 + 调用语义包装。
 */
import { z } from 'zod';
import { defineAction } from '../../helpers/registerDomainTool.js';
import { executeThemeOp } from './helpers.js';

export const scaffoldThemeAction = defineAction({
  description:
    '在 themes[] 中创建一个新主题，并把 activeThemeId 切到新主题。\n\n' +
    '用途：\n' +
    '- 新项目首次定制：用 themeId="default"（已存在则报错，请直接改 default）\n' +
    '- 节日营销主题：themeId="spring-festival" 等\n' +
    '- 多品牌：themeId="brand-X"\n\n' +
    'copyFrom 不传时从内置 DEFAULT_THEME 派生；传了则深拷贝指定主题的结构（tokens/decorationRules/iconSpec/stateSpec/colorSchemes）后再让 T1~T5 覆盖。',
  schema: z.object({
    projectId: z.string(),
    themeId: z.string().describe('新主题 ID（kebab-case）'),
    name: z.string(),
    description: z.string().optional(),
    copyFrom: z.string().optional(),
    activate: z.boolean().optional().default(true),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'scaffold_theme',
      themeId: p.themeId,
      name: p.name,
      description: p.description,
      copyFrom: p.copyFrom,
      activate: p.activate,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const deleteThemeAction = defineAction({
  description: '删除一个主题。不能删 activeThemeId 指向的主题。',
  schema: z.object({ projectId: z.string(), themeId: z.string() }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, { type: 'delete_theme', themeId: p.themeId });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const switchThemeAction = defineAction({
  description: '切换当前激活的主题（同一项目可以有多套主题，如 default / spring-festival / brand-X）。',
  schema: z.object({ projectId: z.string(), themeId: z.string() }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, { type: 'switch_theme', themeId: p.themeId });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const setThemeIntentAction = defineAction({
  description: '设置当前 active 主题的风格意图。深合并，已有字段不传则保留。',
  schema: z.object({
    projectId: z.string(),
    summary: z.string().optional(),
    aesthetics: z.array(z.string()).optional(),
    decoration: z.enum(['minimal', 'moderate', 'rich']).optional(),
    colorTemperature: z.enum(['warm', 'neutral', 'cool']).optional(),
    brightness: z.enum(['light', 'dark', 'both']).optional(),
    seedColors: z.array(z.string()).optional(),
    audience: z.string().optional(),
    scenario: z.string().optional(),
    references: z.array(z.string()).optional(),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const intent: Record<string, unknown> = {};
    if (p.summary !== undefined) intent.summary = p.summary;
    if (p.aesthetics) intent.aesthetics = p.aesthetics;
    if (p.decoration) intent.decoration = p.decoration;
    if (p.colorTemperature) intent.colorTemperature = p.colorTemperature;
    if (p.brightness) intent.brightness = p.brightness;
    if (p.seedColors) intent.seedColors = p.seedColors;
    if (p.audience) intent.audience = p.audience;
    if (p.scenario) intent.scenario = p.scenario;
    if (p.references) intent.references = p.references;
    const result = await executeThemeOp(p.projectId, {
      type: 'set_theme_intent',
      intent,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const setThemeTokensAction = defineAction({
  description:
    '增量更新当前 active 主题的 base tokens（深合并，不传不删）。\n\n' +
    'kind ∈ colors / spacing / radius / typography / shadows / transitions。\n' +
    '别名自动映射：bgPage→background / bgCard→surface / borderDefault→border / divider→borderLight / bodyLg→body-lg。\n' +
    'values 可传裸值（"#5B6CFF" / 16 / "0 2px 4px rgba(0,0,0,0.06)"），自动包成 schema 的 { value, ... } 形态。\n' +
    '⚠️ 写入位置是 themes[<themeId 或 active>].tokens[kind]，不是顶层。',
  schema: z.object({
    projectId: z.string(),
    kind: z.enum(['colors', 'spacing', 'radius', 'typography', 'shadows', 'transitions']),
    values: z.record(z.string(), z.unknown()),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'set_theme_tokens',
      kind: p.kind,
      values: p.values,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const setThemeDecorationAction = defineAction({
  description: '设置当前 active 主题的 decorationRules（深合并）。',
  schema: z.object({
    projectId: z.string(),
    decorationRules: z.record(z.string(), z.unknown()),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'set_theme_decoration',
      decorationRules: p.decorationRules as never,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const setThemeIconSpecAction = defineAction({
  description: '设置当前 active 主题的 iconSpec（深合并）。',
  schema: z.object({
    projectId: z.string(),
    iconSpec: z.record(z.string(), z.unknown()),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'set_theme_icon_spec',
      iconSpec: p.iconSpec as never,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});

export const setThemeStateSpecAction = defineAction({
  description: '设置当前 active 主题的 stateSpec（深合并）。',
  schema: z.object({
    projectId: z.string(),
    stateSpec: z.record(z.string(), z.unknown()),
    themeId: z.string().optional(),
  }),
  handler: async (p) => {
    const result = await executeThemeOp(p.projectId, {
      type: 'set_theme_state_spec',
      stateSpec: p.stateSpec as never,
      themeId: p.themeId,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, ...result }, null, 2) }] };
  },
});
