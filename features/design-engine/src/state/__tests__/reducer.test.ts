/**
 * Reducer 单元测试（bun test）
 */

import { describe, expect, it } from 'bun:test';
import {
  reduceStateAction,
  parsePath,
  getByPath,
  setByPath,
  createEmptyState,
} from '../index';

describe('parsePath', () => {
  it('点分路径', () => {
    expect(parsePath('a.b.c')).toEqual(['a', 'b', 'c']);
  });

  it('数组下标', () => {
    expect(parsePath('a.b[2].c')).toEqual(['a', 'b', 2, 'c']);
  });

  it('纯索引', () => {
    expect(parsePath('[0].x')).toEqual([0, 'x']);
  });
});

describe('getByPath', () => {
  const obj = { a: { b: [{ c: 42 }, { c: 7 }] } };

  it('基本读', () => {
    expect(getByPath(obj, 'a.b[0].c')).toBe(42);
    expect(getByPath(obj, 'a.b[1].c')).toBe(7);
  });

  it('不存在返回 undefined', () => {
    expect(getByPath(obj, 'a.b[99].c')).toBe(undefined);
    expect(getByPath(obj, 'x.y.z')).toBe(undefined);
  });
});

describe('setByPath — 不可变', () => {
  it('修改对象不影响原对象', () => {
    const s = { a: { b: 1 } };
    const next = setByPath(s, 'a.b', 9) as { a: { b: number } };
    expect(next.a.b).toBe(9);
    expect(s.a.b).toBe(1);
    expect(next).not.toBe(s);
    expect(next.a).not.toBe(s.a);
  });

  it('自动创建中间层', () => {
    const s = {};
    const next = setByPath(s, 'a.b.c', 42) as { a: { b: { c: number } } };
    expect(next.a.b.c).toBe(42);
  });

  it('数组下标写入', () => {
    const s = { list: [1, 2, 3] };
    const next = setByPath(s, 'list[1]', 99) as { list: number[] };
    expect(next.list).toEqual([1, 99, 3]);
    expect(s.list).toEqual([1, 2, 3]);
  });

  it('路径中含数组下标时自动建数组', () => {
    const s = {};
    const next = setByPath(s, 'list[2].name', 'tom') as { list: { name: string }[] };
    expect(next.list[2].name).toBe('tom');
    expect(Array.isArray(next.list)).toBe(true);
  });
});

describe('state.set / state.append / state.remove / state.merge / state.toggle', () => {
  it('state.set 替换路径上的值', () => {
    const s = createEmptyState();
    const next = reduceStateAction(s, { type: 'state.set', path: 'view.inputDraft', value: 'hi' });
    expect(next.view.inputDraft).toBe('hi');
  });

  it('state.append 数组尾部追加', () => {
    const s = { ...createEmptyState(), data: { messages: [{ text: 'a' }] } };
    const next = reduceStateAction(s, {
      type: 'state.append',
      path: 'data.messages',
      value: { text: 'b' },
    });
    expect(next.data.messages).toEqual([{ text: 'a' }, { text: 'b' }]);
  });

  it('state.append 路径不存在时自动创建数组', () => {
    const s = createEmptyState();
    const next = reduceStateAction(s, {
      type: 'state.append',
      path: 'data.items',
      value: 1,
    });
    expect(next.data.items).toEqual([1]);
  });

  it('state.remove 按 index', () => {
    const s = { ...createEmptyState(), data: { list: [1, 2, 3] } };
    const next = reduceStateAction(s, { type: 'state.remove', path: 'data.list', index: 1 });
    expect(next.data.list).toEqual([1, 3]);
  });

  it('state.remove 负索引', () => {
    const s = { ...createEmptyState(), data: { list: [1, 2, 3] } };
    const next = reduceStateAction(s, { type: 'state.remove', path: 'data.list', index: -1 });
    expect(next.data.list).toEqual([1, 2]);
  });

  it('state.remove 越界不改原 state', () => {
    const s = { ...createEmptyState(), data: { list: [1, 2, 3] } };
    const next = reduceStateAction(s, { type: 'state.remove', path: 'data.list', index: 99 });
    expect(next).toBe(s);
  });

  it('state.merge 对象浅合并', () => {
    const s = { ...createEmptyState(), view: { user: { name: 'tom', age: 10 } } };
    const next = reduceStateAction(s, {
      type: 'state.merge',
      path: 'view.user',
      value: { age: 11, city: 'sh' },
    });
    expect(next.view.user).toEqual({ name: 'tom', age: 11, city: 'sh' });
  });

  it('state.toggle 反转 boolean', () => {
    const s = { ...createEmptyState(), view: { showModal: false } };
    const next = reduceStateAction(s, { type: 'state.toggle', path: 'view.showModal' });
    expect(next.view.showModal).toBe(true);
    const next2 = reduceStateAction(next, { type: 'state.toggle', path: 'view.showModal' });
    expect(next2.view.showModal).toBe(false);
  });

  it('state.remove 用 predicate + resolver', () => {
    const s = { ...createEmptyState(), data: { list: [{ id: 1 }, { id: 2 }, { id: 3 }] } };
    const resolver = (_p: string, items: unknown[]): number | undefined => {
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i] as { id: number };
        if (it.id === 2) return i;
      }
      return undefined;
    };
    const next = reduceStateAction(
      s,
      { type: 'state.remove', path: 'data.list', predicate: 'item.id === 2' },
      resolver,
    );
    expect((next.data.list as { id: number }[]).map((x) => x.id)).toEqual([1, 3]);
  });
});
