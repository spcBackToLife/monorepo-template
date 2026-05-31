/**
 * readInlineTextFromProps 单元测试（bun test）
 *
 * 重点核对 v1.0 渲染契约：
 * - props.textContent === '' 时 fall through 到 children（修复"协议没展示"bug）
 * - 非空字符串 / 数字 0 仍优先渲染
 * - 旧 children-as-string 写法兼容
 */

import { describe, expect, it } from 'bun:test';
import { readInlineTextFromProps } from '../PrimitiveRenderer';

describe('readInlineTextFromProps — v1.0 渲染契约', () => {
  describe('textContent 优先级', () => {
    it('非空字符串 textContent 返回原值', () => {
      expect(readInlineTextFromProps({ textContent: 'hello' })).toBe('hello');
    });

    it('数字 textContent 转 string', () => {
      expect(readInlineTextFromProps({ textContent: 42 })).toBe('42');
    });

    it('数字 0 仍当作有效叶子文本', () => {
      expect(readInlineTextFromProps({ textContent: 0 })).toBe('0');
    });

    it('★ textContent === "" 视为无叶子文本（fall-through to children）', () => {
      // 这是修复用户"协议没展示"bug 的关键契约
      expect(readInlineTextFromProps({ textContent: '' })).toBeUndefined();
    });

    it('textContent === undefined 走 fallback', () => {
      expect(readInlineTextFromProps({})).toBeUndefined();
    });
  });

  describe('text 字段（textContent 同义）', () => {
    it('text 非空字符串', () => {
      expect(readInlineTextFromProps({ text: 'hi' })).toBe('hi');
    });

    it('★ text === "" 同样 fall-through', () => {
      expect(readInlineTextFromProps({ text: '' })).toBeUndefined();
    });

    it('textContent 优先于 text', () => {
      expect(readInlineTextFromProps({ textContent: 'a', text: 'b' })).toBe('a');
    });

    it('textContent 是 "" 时退到 text', () => {
      // ?? 短路：textContent 为 '' 是 string 但非 nullish，所以 a = ''
      // 后续逻辑判定 string 非空，结果 fall-through 到 children/undefined
      // 本用例确认 text 不会被 ?? 接住（这是 ?? 与 || 的区别带来的边界）
      expect(readInlineTextFromProps({ textContent: '', text: 'fallback' })).toBeUndefined();
      // 注意：如果产品上希望 textContent='' 时降级到 text，需要改用 || 或显式处理
      // 当前 v1.0 契约：textContent='' 直接 fall-through 到 children，不降级到 text
    });
  });

  describe('children-as-string 兼容写法', () => {
    it('children 是字符串', () => {
      expect(readInlineTextFromProps({ children: 'inline' })).toBe('inline');
    });

    it('children 是数字', () => {
      expect(readInlineTextFromProps({ children: 99 })).toBe('99');
    });

    it('★ children === "" 也 fall-through', () => {
      expect(readInlineTextFromProps({ children: '' })).toBeUndefined();
    });

    it('textContent 非空 + children 字符串 → textContent 优先', () => {
      expect(readInlineTextFromProps({ textContent: 'a', children: 'b' })).toBe('a');
    });

    it('★ textContent="" + children 字符串 → 都 fall-through 到树 children', () => {
      // 父节点 textContent="" 让 fall-through，children 字符串也是 ""→fall-through，最终 undefined
      // 但 children 非空字符串时仍兜底（兼容旧写法）
      expect(readInlineTextFromProps({ textContent: '', children: '兜底' })).toBe('兜底');
    });
  });

  describe('PolicyText 真实 bug 复现场景', () => {
    it('★ 修复前 bug：textContent="" 命中 inline 而吞掉 children 树渲染', () => {
      // schema 形态：父 PolicyText.props.textContent = ''，子树 children = [4 个 inline 节点]
      // 修复后期望：readInline 返回 undefined，PrimitiveRenderer 走 treeChildren 分支
      const result = readInlineTextFromProps({ textContent: '' });
      expect(result).toBeUndefined();
      // 后续 resolvedInlineOrTreeChildren 看到 undefined 就会 return treeChildren
      // 这条断言确认这条契约在底层函数已生效
    });
  });
});
