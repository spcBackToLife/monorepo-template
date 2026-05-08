/**
 * 表达式引擎单测（bun test）
 *
 * 运行：pnpm --filter @globallink/design-engine test -- expression
 * 或：   bun test src/expression
 */

import { describe, expect, it } from 'bun:test';
import {
  evaluateExpression,
  compileExpression,
  extractDeps,
  parseExpression,
  parseSingleExpression,
  parseTemplate,
  ExpressionEvaluationError,
  builtinFunctions,
} from '../index';

describe('evaluateExpression — 基本路径取值', () => {
  const state = {
    data: { messages: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'hey' }] },
    view: { inputDraft: 'typing…', activeTab: 'home', showModal: true },
    effects: {},
  };

  it('单表达式返回原生类型', () => {
    expect(evaluateExpression('{{ state.view.inputDraft }}', { state })).toBe('typing…');
    expect(evaluateExpression('{{ state.view.showModal }}', { state })).toBe(true);
    expect(evaluateExpression('{{ state.data.messages }}', { state })).toEqual(state.data.messages);
  });

  it('非字符串原样返回', () => {
    expect(evaluateExpression(42, { state })).toBe(42);
    expect(evaluateExpression(true, { state })).toBe(true);
    expect(evaluateExpression(null, { state })).toBe(null);
  });

  it('无 {{ }} 的字符串原样返回', () => {
    expect(evaluateExpression('plain text', { state })).toBe('plain text');
  });

  it('模板字符串（文本 + 多表达式）拼为字符串', () => {
    const out = evaluateExpression(
      'Hi {{ state.view.inputDraft }}, tab={{ state.view.activeTab }}!',
      { state },
    );
    expect(out).toBe('Hi typing…, tab=home!');
  });

  it('未定义路径返回 undefined，不抛', () => {
    expect(evaluateExpression('{{ state.view.notExist }}', { state })).toBe(undefined);
    expect(evaluateExpression('{{ state.data.messages[99].text }}', { state })).toBe(undefined);
  });
});

describe('evaluateExpression — item/index 作用域', () => {
  it('item 属性访问', () => {
    expect(
      evaluateExpression('{{ item.text }}', { item: { text: 'hello' } }),
    ).toBe('hello');
  });

  it('item 角色判断（字符串字面值比较）', () => {
    expect(
      evaluateExpression("{{ item.role === 'user' }}", { item: { role: 'user' } }),
    ).toBe(true);
    expect(
      evaluateExpression("{{ item.role === 'user' }}", { item: { role: 'assistant' } }),
    ).toBe(false);
  });

  it('三元色值切换', () => {
    const ctx = { item: { role: 'user' } };
    expect(
      evaluateExpression("{{ item.role === 'user' ? '#667eea' : '#fff' }}", ctx),
    ).toBe('#667eea');
    expect(
      evaluateExpression(
        "{{ item.role === 'user' ? '#667eea' : '#fff' }}",
        { item: { role: 'assistant' } },
      ),
    ).toBe('#fff');
  });

  it('index 可用且参与运算', () => {
    expect(evaluateExpression('{{ index + 1 }}', { index: 3 })).toBe(4);
  });
});

describe('evaluateExpression — 逻辑与默认值', () => {
  it('|| 实现默认值', () => {
    expect(evaluateExpression('{{ item.text || "无内容" }}', { item: { text: '' } })).toBe('无内容');
    expect(evaluateExpression('{{ item.text || "无内容" }}', { item: { text: 'x' } })).toBe('x');
    expect(evaluateExpression('{{ item.text || "无内容" }}', { item: {} })).toBe('无内容');
  });

  it('&& 短路', () => {
    expect(evaluateExpression('{{ state.view.showModal && "visible" }}', {
      state: { data: {}, view: { showModal: false }, effects: {} },
    })).toBe(false);
    expect(evaluateExpression('{{ state.view.showModal && "visible" }}', {
      state: { data: {}, view: { showModal: true }, effects: {} },
    })).toBe('visible');
  });

  it('! 一元取反', () => {
    expect(evaluateExpression('{{ !state.view.showModal }}', {
      state: { data: {}, view: { showModal: false }, effects: {} },
    })).toBe(true);
  });
});

describe('evaluateExpression — 内置函数 $', () => {
  const state = { data: { messages: [1, 2, 3] }, view: { name: 'tom' }, effects: {} };

  it('$.length 数组', () => {
    expect(evaluateExpression('{{ $.length(state.data.messages) }}', { state })).toBe(3);
    expect(evaluateExpression('{{ $.length(state.data.messages) > 0 }}', { state })).toBe(true);
  });

  it('$.length 字符串', () => {
    expect(evaluateExpression('{{ $.length(state.view.name) }}', { state })).toBe(3);
  });

  it('$.upper / $.lower', () => {
    expect(evaluateExpression('{{ $.upper(state.view.name) }}', { state })).toBe('TOM');
    expect(evaluateExpression('{{ $.lower("HELLO") }}', {})).toBe('hello');
  });

  it('$.format 位置参数', () => {
    expect(
      evaluateExpression("{{ $.format('hi {0}', state.view.name) }}", { state }),
    ).toBe('hi tom');
  });

  it('$.includes', () => {
    expect(evaluateExpression('{{ $.includes(state.data.messages, 2) }}', { state })).toBe(true);
    expect(evaluateExpression('{{ $.includes(state.data.messages, 99) }}', { state })).toBe(false);
  });

  it('$.first / $.last', () => {
    expect(evaluateExpression('{{ $.first(state.data.messages) }}', { state })).toBe(1);
    expect(evaluateExpression('{{ $.last(state.data.messages) }}', { state })).toBe(3);
  });

  it('$.isEmpty', () => {
    expect(evaluateExpression('{{ $.isEmpty(state.data.messages) }}', { state })).toBe(false);
    expect(evaluateExpression('{{ $.isEmpty(state.view.notExist) }}', { state })).toBe(true);
  });
});

describe('安全性 — 禁止访问全局', () => {
  it('globalThis 抛错', () => {
    expect(() => evaluateExpression('{{ globalThis.x }}', {})).toThrow(ExpressionEvaluationError);
  });

  it('window 抛错', () => {
    expect(() => evaluateExpression('{{ window.location }}', {})).toThrow(ExpressionEvaluationError);
  });

  it('Function 抛错', () => {
    expect(() => evaluateExpression('{{ Function("alert(1)") }}', {})).toThrow(ExpressionEvaluationError);
  });

  it('禁止调用对象实例方法', () => {
    const ctx = { state: { data: { name: 'tom' }, view: {}, effects: {} } };
    // state.data.name 是字符串，但不允许调用 .toUpperCase()
    expect(() => evaluateExpression('{{ state.data.name.toUpperCase() }}', ctx)).toThrow(
      ExpressionEvaluationError,
    );
  });

  it('不访问 __proto__', () => {
    const ctx = { state: { data: {}, view: {}, effects: {} } };
    expect(evaluateExpression('{{ state.__proto__ }}', ctx)).toBe(undefined);
    expect(evaluateExpression('{{ state.constructor }}', ctx)).toBe(undefined);
  });
});

describe('parseSingleExpression / parseTemplate', () => {
  it('单表达式', () => {
    const ast = parseSingleExpression('{{ state.x }}');
    expect(ast).toBeDefined();
  });

  it('模板中含多个 {{ }} 不被当单表达式', () => {
    expect(parseSingleExpression('a {{ x }} b {{ y }}')).toBeUndefined();
  });

  it('parseTemplate 拆段', () => {
    const segs = parseTemplate('Hi {{ name }}!');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ kind: 'text', value: 'Hi ' });
    expect(segs[1].kind).toBe('expr');
    expect(segs[2]).toEqual({ kind: 'text', value: '!' });
  });

  it('未闭合的 {{ 抛错', () => {
    expect(() => parseTemplate('Hi {{ name')).toThrow();
  });
});

describe('compileExpression 缓存', () => {
  it('编译后可多次执行', () => {
    const fn = compileExpression('{{ state.data.messages.length }}');
    expect(fn({ state: { data: { messages: [1, 2] }, view: {}, effects: {} } })).toBe(2);
    expect(fn({ state: { data: { messages: [1, 2, 3, 4] }, view: {}, effects: {} } })).toBe(4);
  });

  it('裸表达式（无 {{ }}）用作 condition', () => {
    const fn = compileExpression('state.view.enabled');
    expect(fn({ state: { data: {}, view: { enabled: true }, effects: {} } })).toBe(true);
  });
});

describe('extractDeps — 依赖提取', () => {
  it('单路径', () => {
    expect(extractDeps('{{ state.data.messages }}')).toEqual(['state.data.messages']);
  });

  it('多路径去重', () => {
    const deps = extractDeps('{{ state.view.x + state.data.y + state.view.x }}');
    expect(deps.sort()).toEqual(['state.data.y', 'state.view.x']);
  });

  it('item 作用域', () => {
    expect(extractDeps("{{ item.role === 'user' ? 'a' : 'b' }}")).toEqual(['item.role']);
  });

  it('模板字符串也能提取', () => {
    const deps = extractDeps('hi {{ state.view.name }}, msgs: {{ state.data.messages }}');
    expect(deps.sort()).toEqual(['state.data.messages', 'state.view.name']);
  });

  it('非字符串 / 无表达式返回空', () => {
    expect(extractDeps(42 as unknown as string)).toEqual([]);
    expect(extractDeps('plain text')).toEqual([]);
  });
});

describe('BuiltinFunctions — 直接调用（单元）', () => {
  it('format 按 key', () => {
    expect(builtinFunctions.format('hi {name}', { name: 'tom' })).toBe('hi tom');
  });

  it('length 对 null 容错', () => {
    expect(builtinFunctions.length(null)).toBe(0);
    expect(builtinFunctions.length(undefined)).toBe(0);
  });

  it('defaultTo', () => {
    expect(builtinFunctions.defaultTo(null, 'x')).toBe('x');
    expect(builtinFunctions.defaultTo(undefined, 'x')).toBe('x');
    expect(builtinFunctions.defaultTo('y', 'x')).toBe('y');
  });
});

describe('parseExpression 错误处理', () => {
  it('非法字符抛错', () => {
    expect(() => parseExpression('x @ y')).toThrow();
  });

  it('未闭合括号抛错', () => {
    expect(() => parseExpression('$.length(x')).toThrow();
  });
});
