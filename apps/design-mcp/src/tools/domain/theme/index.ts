/**
 * theme 工具入口
 *
 * 模型：
 *   ThemeConfig.themes[]                   ← 多主题（品牌/节日/营销）
 *     ↳ tokens / intent / decorationRules / iconSpec / stateSpec  ← 主题级
 *     ↳ colorSchemes[].overrides            ← 明暗 / 可访问性变体
 *
 * 所有写入都落到 themes[<active>] 内部，与渲染端 resolveTokens.ts 一致。
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool } from '../../helpers/registerDomainTool.js';
import { checkAction, getAction, validateAction } from './actions-read.js';
import {
  scaffoldThemeAction,
  deleteThemeAction,
  switchThemeAction,
  setThemeIntentAction,
  setThemeTokensAction,
  setThemeDecorationAction,
  setThemeIconSpecAction,
  setThemeStateSpecAction,
} from './actions-theme.js';
import {
  switchColorSchemeAction,
  addColorSchemeAction,
  updateColorSchemeOverridesAction,
  removeColorSchemeAction,
} from './actions-scheme.js';

const TOOL_DESCRIPTION =
  '项目主题风格的读写操作。\n\n' +
  '心智模型：\n' +
  '  ThemeConfig.themes[]                ← 多主题：品牌默认 / 节日营销 / 子品牌\n' +
  '    ├ tokens                          ← 主题级 base：colors/spacing/radius/typography/shadows/transitions\n' +
  '    ├ intent / decorationRules        ← 主题级风格语言\n' +
  '    ├ iconSpec / stateSpec            ← 主题级组件规范\n' +
  '    └ colorSchemes[].overrides        ← 同主题下的明暗/可访问性变体\n\n' +
  '⚠️ 入场必查：先 theme/check 看 customized。false → 引导用户用 theme-generator Skill。\n' +
  '⚠️ 所有 set_theme_* 默认写到 active 主题，多主题场景请显式传 themeId。';

export function registerThemeTools(server: McpServer): void {
  registerDomainTool(server, 'theme', TOOL_DESCRIPTION, {
    // 读取 + 校验
    check: checkAction,
    get: getAction,
    validate: validateAction,
    // 主题级
    scaffold_theme: scaffoldThemeAction,
    delete_theme: deleteThemeAction,
    switch_theme: switchThemeAction,
    set_theme_intent: setThemeIntentAction,
    set_theme_tokens: setThemeTokensAction,
    set_theme_decoration: setThemeDecorationAction,
    set_theme_icon_spec: setThemeIconSpecAction,
    set_theme_state_spec: setThemeStateSpecAction,
    // 色彩方案级
    switch_color_scheme: switchColorSchemeAction,
    add_color_scheme: addColorSchemeAction,
    update_color_scheme_overrides: updateColorSchemeOverridesAction,
    remove_color_scheme: removeColorSchemeAction,
  });
}
