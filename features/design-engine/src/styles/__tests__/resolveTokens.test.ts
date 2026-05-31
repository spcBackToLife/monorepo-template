/**
 * resolveTokens 单元测试
 *
 * 锁定契约：
 *  - dot 语法（设计 SKILL 教 AI 写的） 与 dash 语法（内部 canonical）等价
 *  - 复合值（多 token 拼接）保持顺序与空格
 *  - 未识别 token / theme 缺失 → 原样透传
 *  - 复数→单数 group 映射（shadows→shadow / transitions→transition）
 *  - 尾部 .value 自动剥（兼容 SKILL 习惯写 transitions.fast.value）
 */

import { describe, expect, it } from 'bun:test';
import type { ThemeConfig } from '@globallink/design-schema';
import { resolveTokenValue, resolveTokensInStyles } from '../resolveTokens';

const themeConfig: ThemeConfig = {
  schemaVersion: '1.0',
  activeThemeId: 'default',
  themes: [
    {
      id: 'default',
      name: '默认',
      description: '',
      activeColorSchemeId: 'light',
      tokens: {
        colors: {
          primary: { value: '#5B6CFF' },
          textPrimary: { value: 'rgba(0,0,0,0.88)' },
          textInverse: { value: '#FFFFFF' },
          surfaceElevated: { value: '#FFFFFF' },
          background: { value: '#FCFCFD' },
        },
        spacing: {
          sm: { px: 8, value: '8px' },
          md: { px: 16, value: '16px' },
          lg: { px: 24, value: '24px' },
        },
        radius: {
          md: { value: '8px' },
          lg: { value: '12px' },
          xl: { value: '16px' },
          full: { value: '9999px' },
        },
        shadows: {
          sm: { value: '0 1px 3px rgba(0,0,0,0.04)' },
          md: { value: '0 4px 12px rgba(0,0,0,0.06)' },
        },
        transitions: {
          fast: { value: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)', durationMs: 150 },
          normal: { value: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)', durationMs: 250 },
        },
        typography: {
          body: { fontSize: '14px', fontFamily: 'system-ui', fontWeight: '400', lineHeight: '1.5' },
          'body-lg': { fontSize: '16px', fontFamily: 'system-ui', fontWeight: '400', lineHeight: '1.5' },
          h4: { fontSize: '20px', fontFamily: 'system-ui', fontWeight: '600', lineHeight: '1.3' },
        },
      },
      colorSchemes: [
        {
          id: 'light',
          name: 'light',
          label: 'Light',
          overrides: {},
        },
      ],
      createdAt: '',
      updatedAt: '',
    } as any,
  ],
} as any;

describe('resolveTokens — dot/dash 双语法等价', () => {
  describe('颜色', () => {
    it('dash: $token:primary → "#5B6CFF"', () => {
      expect(resolveTokenValue('$token:primary', themeConfig)).toBe('#5B6CFF');
    });
    it('dot:  $token:colors.primary → "#5B6CFF"（设计 SKILL 写法）', () => {
      expect(resolveTokenValue('$token:colors.primary', themeConfig)).toBe('#5B6CFF');
    });
    it('dot:  $token:colors.textInverse → "#FFFFFF"', () => {
      expect(resolveTokenValue('$token:colors.textInverse', themeConfig)).toBe('#FFFFFF');
    });
    it('两种语法等价', () => {
      expect(resolveTokenValue('$token:textPrimary', themeConfig)).toBe(
        resolveTokenValue('$token:colors.textPrimary', themeConfig),
      );
    });
  });

  describe('间距', () => {
    it('dash: $token:spacing-md → "16px"', () => {
      expect(resolveTokenValue('$token:spacing-md', themeConfig)).toBe('16px');
    });
    it('dot:  $token:spacing.md → "16px"', () => {
      expect(resolveTokenValue('$token:spacing.md', themeConfig)).toBe('16px');
    });
    it('两种语法等价', () => {
      expect(resolveTokenValue('$token:spacing-lg', themeConfig)).toBe(
        resolveTokenValue('$token:spacing.lg', themeConfig),
      );
    });
  });

  describe('圆角', () => {
    it('dash: $token:radius-lg → "12px"', () => {
      expect(resolveTokenValue('$token:radius-lg', themeConfig)).toBe('12px');
    });
    it('dot:  $token:radius.lg → "12px"', () => {
      expect(resolveTokenValue('$token:radius.lg', themeConfig)).toBe('12px');
    });
    it('full → "9999px"', () => {
      expect(resolveTokenValue('$token:radius.full', themeConfig)).toBe('9999px');
    });
  });

  describe('阴影（复数 group → 单数 dash）', () => {
    it('dash 单数: $token:shadow-sm → "0 1px 3px rgba(0,0,0,0.04)"', () => {
      expect(resolveTokenValue('$token:shadow-sm', themeConfig)).toBe('0 1px 3px rgba(0,0,0,0.04)');
    });
    it('dot 复数: $token:shadows.sm → 同上（设计 SKILL 写法）', () => {
      expect(resolveTokenValue('$token:shadows.sm', themeConfig)).toBe('0 1px 3px rgba(0,0,0,0.04)');
    });
  });

  describe('动效（复数 group → 单数 dash + .value 自动剥）', () => {
    it('dash 单数: $token:transition-fast → 完整 transition 字符串', () => {
      expect(resolveTokenValue('$token:transition-fast', themeConfig)).toBe(
        'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      );
    });
    it('dot 复数: $token:transitions.fast → 同上', () => {
      expect(resolveTokenValue('$token:transitions.fast', themeConfig)).toBe(
        'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      );
    });
    it('dot 复数 + 尾部 .value: $token:transitions.fast.value → 同上（设计 SKILL 实际写法）', () => {
      expect(resolveTokenValue('$token:transitions.fast.value', themeConfig)).toBe(
        'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
      );
    });
    it('三种语法等价', () => {
      const a = resolveTokenValue('$token:transition-normal', themeConfig);
      const b = resolveTokenValue('$token:transitions.normal', themeConfig);
      const c = resolveTokenValue('$token:transitions.normal.value', themeConfig);
      expect(a).toBe(b);
      expect(b).toBe(c);
    });
  });

  describe('字体（typography group → font- dash 前缀）', () => {
    it('dash 子属性: $token:font-body.fontSize → "14px"', () => {
      expect(resolveTokenValue('$token:font-body.fontSize', themeConfig)).toBe('14px');
    });
    it('dot 子属性: $token:typography.body.fontSize → "14px"', () => {
      expect(resolveTokenValue('$token:typography.body.fontSize', themeConfig)).toBe('14px');
    });
    it('dot 子属性: $token:typography.body.fontFamily → "system-ui"', () => {
      expect(resolveTokenValue('$token:typography.body.fontFamily', themeConfig)).toBe('system-ui');
    });
    it('dot 子属性: $token:typography.h4.lineHeight → "1.3"', () => {
      expect(resolveTokenValue('$token:typography.h4.lineHeight', themeConfig)).toBe('1.3');
    });
    it('dash 整组: $token:font-body → "14px" (fontSize)', () => {
      expect(resolveTokenValue('$token:font-body', themeConfig)).toBe('14px');
    });
    it('dot 整组: $token:typography.body → "14px" (fontSize)', () => {
      expect(resolveTokenValue('$token:typography.body', themeConfig)).toBe('14px');
    });
    it('包含 dash 的 typography key: $token:typography.body-lg.fontSize → "16px"', () => {
      expect(resolveTokenValue('$token:typography.body-lg.fontSize', themeConfig)).toBe('16px');
    });
  });

  describe('复合值', () => {
    it('两个 token 拼接: "$token:spacing.sm $token:spacing.md" → "8px 16px"', () => {
      expect(resolveTokenValue('$token:spacing.sm $token:spacing.md', themeConfig)).toBe('8px 16px');
    });
    it('混合 dot/dash 拼接: "$token:spacing-sm $token:spacing.md" → "8px 16px"', () => {
      expect(resolveTokenValue('$token:spacing-sm $token:spacing.md', themeConfig)).toBe('8px 16px');
    });
    it('未识别 token 部分原样保留', () => {
      expect(resolveTokenValue('$token:spacing.md $token:unknown.x', themeConfig)).toBe(
        '16px $token:unknown.x',
      );
    });
  });

  describe('边界', () => {
    it('themeConfig=null 原样透传', () => {
      expect(resolveTokenValue('$token:colors.primary', null)).toBe('$token:colors.primary');
    });
    it('数字值原样透传', () => {
      expect(resolveTokenValue(0, themeConfig)).toBe(0);
      expect(resolveTokenValue(16, themeConfig)).toBe(16);
    });
    it('undefined 透传', () => {
      expect(resolveTokenValue(undefined, themeConfig)).toBe(undefined);
    });
    it('普通字符串（不含 $token:）透传', () => {
      expect(resolveTokenValue('#FFFFFF', themeConfig)).toBe('#FFFFFF');
      expect(resolveTokenValue('flex', themeConfig)).toBe('flex');
    });
    it('未知 group 原样透传', () => {
      expect(resolveTokenValue('$token:unknown.x', themeConfig)).toBe('$token:unknown.x');
    });
    it('未知 colors key 原样透传', () => {
      expect(resolveTokenValue('$token:colors.notExist', themeConfig)).toBe('$token:colors.notExist');
    });
  });

  describe('resolveTokensInStyles 批量', () => {
    it('混合 dot/dash 全部解析', () => {
      const styles = {
        backgroundColor: '$token:colors.primary',
        padding: '$token:spacing.lg',
        borderRadius: '$token:radius.lg',
        boxShadow: '$token:shadows.sm',
        transition: '$token:transitions.normal.value',
        fontSize: '$token:typography.body-lg.fontSize',
        // 已是值不动
        height: 48,
        // 普通字符串不动
        cursor: 'pointer',
      };
      const out = resolveTokensInStyles(styles, themeConfig);
      expect(out.backgroundColor).toBe('#5B6CFF');
      expect(out.padding).toBe('24px');
      expect(out.borderRadius).toBe('12px');
      expect(out.boxShadow).toBe('0 1px 3px rgba(0,0,0,0.04)');
      expect(out.transition).toBe('all 250ms cubic-bezier(0.4, 0, 0.2, 1)');
      expect(out.fontSize).toBe('16px');
      expect(out.height).toBe(48);
      expect(out.cursor).toBe('pointer');
    });
  });
});
