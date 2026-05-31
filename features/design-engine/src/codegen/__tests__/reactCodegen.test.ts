/**
 * pickInlinePropText（codegen 端）单元测试
 *
 * 必须与 PrimitiveRenderer.readInlineTextFromProps 行为完全一致
 * （否则导出的 React 代码与预览渲染不一致 → 二次构建 bug）
 */

import { describe, expect, it } from 'bun:test';
import { pickInlinePropText } from '../reactCodegen';

describe('pickInlinePropText — codegen 行为应与 PrimitiveRenderer 一致', () => {
  it('undefined props', () => {
    expect(pickInlinePropText(undefined)).toBeUndefined();
  });

  it('非空 textContent', () => {
    expect(pickInlinePropText({ textContent: 'hi' })).toBe('hi');
  });

  it('★ textContent === "" 视为无叶子文本', () => {
    expect(pickInlinePropText({ textContent: '' })).toBeUndefined();
  });

  it('数字 textContent', () => {
    expect(pickInlinePropText({ textContent: 0 })).toBe('0');
  });

  it('children-as-string 兼容', () => {
    expect(pickInlinePropText({ children: 'fallback' })).toBe('fallback');
  });

  it('★ children === "" 也 fall-through', () => {
    expect(pickInlinePropText({ children: '' })).toBeUndefined();
  });

  it('textContent="" + children 字符串 → 取 children 兜底（兼容旧写法）', () => {
    expect(pickInlinePropText({ textContent: '', children: 'cs' })).toBe('cs');
  });
});
