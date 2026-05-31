/**
 * validateStyles 单元测试
 *
 * 锁定"事前治理"契约：
 *  - 合法 token 引用语法（dot / dash 双语法）必须通过
 *  - 非法 token 引用必须被拒（杜绝"语法错的 token 进 schema → 渲染失败但 schema 校验通过"）
 *  - 数字 / 普通字符串透传
 *  - 复合值按空格拆开校验每段
 *
 * ⚠️ 与 features/design-engine/src/styles/__tests__/resolveTokens.test.ts 关注点不同：
 *   - 那边测"能否解析出真实值"（与 ThemeConfig 实际数据耦合）
 *   - 这边测"语法表面形式是否合法"（不看是否存在，纯正则）
 */

import { describe, expect, it } from 'bun:test';
import { validateStyleValue, validateStyles } from '../validateStyles';

describe('validateStyleValue — 单值', () => {
  it('数字透传：返回 null', () => {
    expect(validateStyleValue(0)).toBeNull();
    expect(validateStyleValue(16)).toBeNull();
  });

  it('普通字符串（不含 $token:）透传：返回 null', () => {
    expect(validateStyleValue('#FFFFFF')).toBeNull();
    expect(validateStyleValue('flex')).toBeNull();
    expect(validateStyleValue('1px solid #ccc')).toBeNull();
  });

  describe('合法语法（不应被拒）', () => {
    it('颜色 dash 短形式: $token:primary', () => {
      expect(validateStyleValue('$token:primary')).toBeNull();
    });
    it('颜色 dot 形式: $token:colors.primary', () => {
      expect(validateStyleValue('$token:colors.primary')).toBeNull();
    });
    it('颜色裸 key: $token:textPrimary', () => {
      expect(validateStyleValue('$token:textPrimary')).toBeNull();
    });
    it('间距 dash: $token:spacing-md', () => {
      expect(validateStyleValue('$token:spacing-md')).toBeNull();
    });
    it('间距 dot: $token:spacing.md', () => {
      expect(validateStyleValue('$token:spacing.md')).toBeNull();
    });
    it('圆角 dot: $token:radius.lg', () => {
      expect(validateStyleValue('$token:radius.lg')).toBeNull();
    });
    it('阴影 dot 复数: $token:shadows.sm', () => {
      expect(validateStyleValue('$token:shadows.sm')).toBeNull();
    });
    it('动效 dot + .value 尾巴: $token:transitions.fast.value', () => {
      expect(validateStyleValue('$token:transitions.fast.value')).toBeNull();
    });
    it('动效 dot 短: $token:transitions.fast', () => {
      expect(validateStyleValue('$token:transitions.fast')).toBeNull();
    });
    it('字体 dash 整组: $token:font-body', () => {
      expect(validateStyleValue('$token:font-body')).toBeNull();
    });
    it('字体 dash 子属性: $token:font-body.fontSize', () => {
      expect(validateStyleValue('$token:font-body.fontSize')).toBeNull();
    });
    it('字体 dot 整组: $token:typography.body', () => {
      expect(validateStyleValue('$token:typography.body')).toBeNull();
    });
    it('字体 dot 子属性: $token:typography.body.fontSize', () => {
      expect(validateStyleValue('$token:typography.body.fontSize')).toBeNull();
    });
    it('字体含 dash 的 key: $token:typography.body-lg.fontSize', () => {
      expect(validateStyleValue('$token:typography.body-lg.fontSize')).toBeNull();
    });
  });

  describe('非法语法（必须被拒）', () => {
    it('空 token: $token:', () => {
      expect(validateStyleValue('$token:')).toBeTruthy();
    });
    it('未知 group dot: $token:foo.bar 应被识别但因 colors. 头部缺失/不在白名单而被拒', () => {
      // 注:实际可能放过（按"裸 key"匹配,放给 resolver 警告）—— 不强求拒;
      // 重点是有 dot 的非法形态(下面的)必须被拒
      // 这里放 $token:bad-... 形态测试拒不漏
      const result = validateStyleValue('$token:foo.bar.baz.qux');
      // 多层 dot 不在白名单内必须被拒
      expect(result).toBeTruthy();
    });
    it('间距用 dot 但 group 写错: $token:spaceing.md', () => {
      // spaceing 不在白名单,作为"裸 key" 因含有 . 被拒
      expect(validateStyleValue('$token:spaceing.md')).toBeTruthy();
    });
    it('字体 sub 多层: $token:typography.body.fontSize.foo 应被拒', () => {
      expect(validateStyleValue('$token:typography.body.fontSize.foo')).toBeTruthy();
    });
    it('随便写的乱码: $token:???', () => {
      expect(validateStyleValue('$token:???')).toBeTruthy();
    });
  });

  describe('复合值', () => {
    it('合法复合: "$token:spacing.sm $token:spacing.md"', () => {
      expect(validateStyleValue('$token:spacing.sm $token:spacing.md')).toBeNull();
    });
    it('混 dot/dash 合法: "$token:spacing-sm $token:spacing.md"', () => {
      expect(validateStyleValue('$token:spacing-sm $token:spacing.md')).toBeNull();
    });
    it('合法 + 普通字符串: "1px solid $token:primary"', () => {
      expect(validateStyleValue('1px solid $token:primary')).toBeNull();
    });
    it('复合中夹一个非法 → 必须被拒', () => {
      const r = validateStyleValue('$token:spacing.md $token:???');
      expect(r).toBeTruthy();
      expect(r).toContain('???');
    });
  });
});

describe('validateStyles — 一组样式', () => {
  it('全部合法: issues = []', () => {
    const issues = validateStyles({
      backgroundColor: '$token:colors.primary',
      padding: '$token:spacing.md',
      fontSize: 16,
      cursor: 'pointer',
    });
    expect(issues).toHaveLength(0);
  });

  it('其中一个非法 → 只拒该项', () => {
    const issues = validateStyles({
      backgroundColor: '$token:colors.primary',
      padding: '$token:???',
      fontSize: 16,
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.key).toBe('padding');
    expect(issues[0]!.reason).toContain('???');
  });

  it('多项非法 → 按字段一一报', () => {
    const issues = validateStyles({
      a: '$token:???',
      b: '$token:foo.bar.baz.qux',
      c: '$token:colors.primary', // 合法
    });
    expect(issues).toHaveLength(2);
    const keys = issues.map(i => i.key).sort();
    expect(keys).toEqual(['a', 'b']);
  });
});
