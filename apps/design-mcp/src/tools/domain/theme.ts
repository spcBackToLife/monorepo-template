/**
 * 主题风格工具 — 项目级 ThemeConfig 的读写操作
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerThemeTools(server: McpServer): void {
  registerDomainTool(server, 'theme', '项目主题风格的读写操作。包含完整的 Design Token（颜色/间距/圆角/字体/阴影/动效）、风格意图（aesthetics 标签）、装饰规则（毛玻璃/渐变/阴影策略）、组件状态规范和主题变体（light/dark）。\n\n⚠️ 重要：在执行任何设计操作（element/add、style/update 等）之前，必须先调用 theme/check 检查主题是否已定制。如果未定制，必须先引导用户制定主题。', {

    check: defineAction({
      description: '检查项目主题是否已被定制。返回 { customized: boolean, summary: string }。\n\n⚠️ 所有设计 Skill 的 Phase 0 必须先调用此 action：\n- customized=true → 继续设计，使用 Token 引用\n- customized=false → 停止设计！先引导用户使用 theme-generator Skill 制定主题风格',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
      }),
      handler: async (p) => {
        const theme = await apiClient.getTheme(p.projectId) as Record<string, unknown> | null;
        const customized = theme?.customized === true;
        const summary = (theme?.intent as Record<string, unknown> | undefined)?.summary ?? '未设置';
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              customized,
              summary,
              message: customized
                ? '✅ 主题已定制，可以继续设计。设置样式时请使用 $token:xxx 引用。'
                : '⛔ 主题尚未定制！请先引导用户描述期望的风格（如"轻奢暗色科技风"），然后使用 theme-generator Skill 生成完整主题，再开始设计。',
            }, null, 2),
          }],
        };
      },
    }),

    get: defineAction({
      description: '获取项目的完整主题配置（ThemeConfig），包含 intent、tokens、themes、decorationRules、stateSpec、customized',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
      }),
      handler: async (p) => {
        const theme = await apiClient.getTheme(p.projectId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(theme, null, 2) }] };
      },
    }),

    update: defineAction({
      description: '全量更新项目主题配置。传入完整的 ThemeConfig 对象替换当前配置。自动标记 customized=true。',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        themeConfig: z.record(z.unknown()).describe('完整的 ThemeConfig JSON 对象'),
      }),
      handler: async (p) => {
        // 自动标记为已定制
        const config = p.themeConfig as Record<string, unknown>;
        config.customized = true;
        const result = await apiClient.updateTheme(p.projectId, config);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    update_tokens: defineAction({
      description: '增量更新 Token 值。只传需要修改的 Token，其余保持不变。自动标记 customized=true。',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        colors: z.record(z.string(), z.string()).optional().describe('颜色 Token 覆盖，如 { "primary": "#667eea" }'),
        spacing: z.record(z.string(), z.string()).optional().describe('间距 Token 覆盖，如 { "md": "16px" }'),
        radius: z.record(z.string(), z.string()).optional().describe('圆角 Token 覆盖'),
        shadows: z.record(z.string(), z.string()).optional().describe('阴影 Token 覆盖'),
        transitions: z.record(z.string(), z.string()).optional().describe('动效 Token 覆盖'),
      }),
      handler: async (p) => {
        const current = await apiClient.getTheme(p.projectId) as Record<string, unknown> | null;
        if (!current) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '项目无主题配置' }) }] };
        }
        const tokens = (current.tokens ?? {}) as Record<string, unknown>;

        if (p.colors) {
          const colors = (tokens.colors ?? {}) as Record<string, unknown>;
          for (const [k, v] of Object.entries(p.colors)) {
            colors[k] = { ...(colors[k] as Record<string, unknown> ?? {}), value: v };
          }
          tokens.colors = colors;
        }
        if (p.spacing) {
          const spacing = (tokens.spacing ?? {}) as Record<string, unknown>;
          for (const [k, v] of Object.entries(p.spacing)) {
            spacing[k] = { ...(spacing[k] as Record<string, unknown> ?? {}), value: v, px: parseInt(v) };
          }
          tokens.spacing = spacing;
        }
        if (p.radius) {
          const radius = (tokens.radius ?? {}) as Record<string, unknown>;
          for (const [k, v] of Object.entries(p.radius)) {
            radius[k] = { ...(radius[k] as Record<string, unknown> ?? {}), value: v };
          }
          tokens.radius = radius;
        }
        if (p.shadows) {
          const shadows = (tokens.shadows ?? {}) as Record<string, unknown>;
          for (const [k, v] of Object.entries(p.shadows)) {
            shadows[k] = { ...(shadows[k] as Record<string, unknown> ?? {}), value: v };
          }
          tokens.shadows = shadows;
        }
        if (p.transitions) {
          const transitions = (tokens.transitions ?? {}) as Record<string, unknown>;
          for (const [k, v] of Object.entries(p.transitions)) {
            transitions[k] = { ...(transitions[k] as Record<string, unknown> ?? {}), value: v };
          }
          tokens.transitions = transitions;
        }

        current.tokens = tokens;
        // 自动标记为已定制
        current.customized = true;
        const result = await apiClient.updateTheme(p.projectId, current);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    set_intent: defineAction({
      description: '设置风格意图描述。AI 可根据此意图生成完整 Token 集。自动标记 customized=true。',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        summary: z.string().describe('一句话风格描述，如"轻奢暗色科技风，主色用电光蓝"'),
        aesthetics: z.array(z.string()).optional().describe('风格标签数组，如 ["glassmorphism", "gradient", "luxury"]'),
        decoration: z.enum(['minimal', 'moderate', 'rich']).optional(),
        colorTemperature: z.enum(['warm', 'neutral', 'cool']).optional(),
        brightness: z.enum(['light', 'dark', 'both']).optional(),
        seedColors: z.array(z.string()).optional().describe('种子色 hex 数组'),
      }),
      handler: async (p) => {
        const current = await apiClient.getTheme(p.projectId) as Record<string, unknown> | null;
        if (!current) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '项目无主题配置' }) }] };
        }
        const intent = (current.intent ?? {}) as Record<string, unknown>;
        intent.summary = p.summary;
        if (p.aesthetics) intent.aesthetics = p.aesthetics;
        if (p.decoration) intent.decoration = p.decoration;
        if (p.colorTemperature) intent.colorTemperature = p.colorTemperature;
        if (p.brightness) intent.brightness = p.brightness;
        if (p.seedColors) intent.seedColors = p.seedColors;
        current.intent = intent;
        // 自动标记为已定制
        current.customized = true;
        const result = await apiClient.updateTheme(p.projectId, current);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    switch_variant: defineAction({
      description: '切换当前预览的主题变体（如从 light 切换到 dark）',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        themeId: z.string().describe('主题变体 ID（如 "default" 或 "dark"）'),
      }),
      handler: async (p) => {
        const current = await apiClient.getTheme(p.projectId) as Record<string, unknown> | null;
        if (!current) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '项目无主题配置' }) }] };
        }
        current.activeThemeId = p.themeId;
        const result = await apiClient.updateTheme(p.projectId, current);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    set_decoration: defineAction({
      description: '设置装饰规则（背景策略/边框策略/阴影策略/动效策略/圆角风格/图标风格）。自动标记 customized=true。',
      schema: z.object({
        projectId: z.string().describe('项目 ID'),
        decorationRules: z.record(z.unknown()).describe('DecorationRules 对象，如 { background: { strategy: "glassmorphism", glassmorphism: { blur: "12px", ... } } }'),
      }),
      handler: async (p) => {
        const current = await apiClient.getTheme(p.projectId) as Record<string, unknown> | null;
        if (!current) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '项目无主题配置' }) }] };
        }
        current.decorationRules = p.decorationRules;
        // 自动标记为已定制
        current.customized = true;
        const result = await apiClient.updateTheme(p.projectId, current);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
