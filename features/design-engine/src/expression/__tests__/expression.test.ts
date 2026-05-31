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

  it('禁止调用对象实例方法（不在白名单的）', () => {
    const ctx = { state: { data: { name: 'tom' }, view: {}, effects: {} } };
    // v1.0：toLocaleString / valueOf 等不在 spec.scope.instanceMethods.string 白名单 → 拒绝
    expect(() => evaluateExpression('{{ state.data.name.toLocaleString() }}', ctx)).toThrow(
      ExpressionEvaluationError,
    );
    expect(() => evaluateExpression('{{ state.data.name.valueOf() }}', ctx)).toThrow(
      ExpressionEvaluationError,
    );
  });

  it('白名单实例方法允许调用（v1.0 ★）', () => {
    const ctx = { state: { data: { name: 'tom' }, view: {}, effects: {} } };
    expect(evaluateExpression('{{ state.data.name.toUpperCase() }}', ctx)).toBe('TOM');
    expect(evaluateExpression('{{ state.data.name.length }}', ctx)).toBe(3);
    expect(evaluateExpression('{{ state.data.name.startsWith("t") }}', ctx)).toBe(true);
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

// ========== v1.0 新能力套件 ==========

describe('v1.0 ★ 正则字面量 + .test', () => {
  it('regex 字面量返回 RegExp', () => {
    const re = evaluateExpression('{{ /^abc$/ }}', {}) as RegExp;
    expect(re instanceof RegExp).toBe(true);
    expect(re.source).toBe('^abc$');
    expect(re.flags).toBe('');
  });

  it('regex 字面量 with flags', () => {
    const re = evaluateExpression('{{ /^abc$/i }}', {}) as RegExp;
    expect(re.flags).toContain('i');
  });

  it('regex.test(string) 实例方法', () => {
    const ctx = { state: { view: { form: { phone: '13812345678' } }, data: {}, effects: {} } };
    expect(
      evaluateExpression('{{ /^1[3-9]\\d{9}$/.test(state.view.form.phone) }}', ctx),
    ).toBe(true);
    expect(
      evaluateExpression('{{ /^1[3-9]\\d{9}$/.test("138") }}', ctx),
    ).toBe(false);
  });

  it('demo 场景：SubmitBtn condition 表达式', () => {
    const ctx = {
      state: { view: { form: { phone: '13812345678' } }, data: {}, effects: {} },
    };
    expect(
      evaluateExpression(
        "{{ state.view.form.phone && /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}",
        ctx,
      ),
    ).toBe('');

    const ctx2 = {
      state: { view: { form: { phone: '138' } }, data: {}, effects: {} },
    };
    expect(
      evaluateExpression(
        "{{ state.view.form.phone && /^1[3-9]\\d{9}$/.test(state.view.form.phone) ? '' : '请输入正确的手机号' }}",
        ctx2,
      ),
    ).toBe('请输入正确的手机号');
  });
});

describe('v1.0 ★ 数组 / 对象 字面量', () => {
  it('数组字面量', () => {
    expect(evaluateExpression('{{ [1, 2, 3] }}', {})).toEqual([1, 2, 3]);
    expect(evaluateExpression('{{ [state.x, state.y] }}', { state: { x: 'a', y: 'b' } as Record<string, unknown> })).toEqual(['a', 'b']);
  });

  it('对象字面量', () => {
    expect(evaluateExpression('{{ { a: 1, b: 2 } }}', {})).toEqual({ a: 1, b: 2 });
  });

  it('对象字面量含字符串 key / computed key', () => {
    const ctx = { state: { view: { k: 'dynamicKey' }, data: {}, effects: {} } };
    expect(evaluateExpression('{{ { "str-key": 1, [state.view.k]: 2 } }}', ctx)).toEqual({
      'str-key': 1,
      dynamicKey: 2,
    });
  });

  it('demo 场景：写入 globalView.session 复合对象', () => {
    const ctx = { state: {}, $last: { response: { user: 'tom', token: 'jwt-x', expiresIn: 86400 } } };
    const result = evaluateExpression(
      "{{ { user: $last.response.user, token: $last.response.token, status: 'active', expiresAt: $last.response.expiresIn * 1000 } }}",
      ctx,
    );
    expect(result).toEqual({ user: 'tom', token: 'jwt-x', status: 'active', expiresAt: 86400000 });
  });
});

describe('v1.0 ★ 可选链 + 空合并', () => {
  it('?. 路径有值', () => {
    const ctx = { state: { data: { user: { name: 'tom' } }, view: {}, effects: {} } };
    expect(evaluateExpression('{{ state.data.user?.name }}', ctx)).toBe('tom');
  });

  it('?. 路径中间 null 安全短路', () => {
    const ctx = { state: { data: { user: null }, view: {}, effects: {} } };
    expect(evaluateExpression('{{ state.data.user?.name }}', ctx)).toBeUndefined();
  });

  it('?.[expr] 计算下标可选', () => {
    const ctx = { state: { data: { arr: null }, view: {}, effects: {} } };
    expect(evaluateExpression('{{ state.data.arr?.[0] }}', ctx)).toBeUndefined();
  });

  it('?? 空合并 与 || 区分', () => {
    expect(evaluateExpression('{{ 0 ?? "fallback" }}', {})).toBe(0);        // ?? 不当 0 falsy
    expect(evaluateExpression('{{ "" ?? "fallback" }}', {})).toBe('');      // ?? 不当 "" falsy
    expect(evaluateExpression('{{ null ?? "fallback" }}', {})).toBe('fallback');
    expect(evaluateExpression('{{ undefined ?? "fallback" }}', {})).toBe('fallback');
    expect(evaluateExpression('{{ 0 || "fallback" }}', {})).toBe('fallback'); // || 当 0 falsy
  });
});

describe('v1.0 ★ Globals (Date / Math / Number / String / Boolean / JSON / Object / Array)', () => {
  it('Date.now()', () => {
    const before = Date.now();
    const r = evaluateExpression('{{ Date.now() }}', {}) as number;
    const after = Date.now();
    expect(r).toBeGreaterThanOrEqual(before);
    expect(r).toBeLessThanOrEqual(after);
  });

  it('Date.now() + 算术 — demo 锁定 30 分钟场景', () => {
    const r = evaluateExpression('{{ Date.now() + 30 * 60 * 1000 }}', {}) as number;
    expect(r).toBeGreaterThan(Date.now());
  });

  it('Math.floor / max / min', () => {
    expect(evaluateExpression('{{ Math.floor(state.x / 60) }}', { state: { x: 125 } as Record<string, unknown> })).toBe(2);
    expect(evaluateExpression('{{ Math.max(0, -5) }}', {})).toBe(0);
    expect(evaluateExpression('{{ Math.min(3, 5, 1, 8) }}', {})).toBe(1);
  });

  it('Number(x) / String(x) / Boolean(x) 类型转换', () => {
    expect(evaluateExpression('{{ Number("42") }}', {})).toBe(42);
    expect(evaluateExpression('{{ String(42) }}', {})).toBe('42');
    expect(evaluateExpression('{{ Boolean(0) }}', {})).toBe(false);
    expect(evaluateExpression('{{ Boolean(1) }}', {})).toBe(true);
  });

  it('JSON.stringify / parse', () => {
    expect(evaluateExpression('{{ JSON.stringify({ a: 1 }) }}', {})).toBe('{"a":1}');
    expect(evaluateExpression('{{ JSON.parse(\'{"a":1}\') }}', {})).toEqual({ a: 1 });
  });

  it('Object.keys / Array.isArray', () => {
    expect(evaluateExpression('{{ Object.keys(state.x) }}', { state: { x: { a: 1, b: 2 } } as Record<string, unknown> }))
      .toEqual(['a', 'b']);
    expect(evaluateExpression('{{ Array.isArray(state.x) }}', { state: { x: [1, 2] } as Record<string, unknown> }))
      .toBe(true);
  });
});

describe('v1.0 ★ globalView contextual identifier', () => {
  it('globalView.session.status', () => {
    const ctx = { state: {}, globalView: { session: { status: 'active' } } };
    expect(evaluateExpression('{{ globalView.session.status === "active" }}', ctx)).toBe(true);
  });

  it('globalView 未注入时安全返回 undefined', () => {
    expect(evaluateExpression('{{ globalView }}', {})).toBeUndefined();
    expect(evaluateExpression('{{ globalView?.session?.status }}', {})).toBeUndefined();
  });

  it('demo 场景：SubmitBtn condition 系统级守卫', () => {
    const ctx = {
      state: { view: { submitting: false, lockedUntil: null }, data: {}, effects: {} },
      globalView: { network: { status: 'online' } },
    };
    const result = evaluateExpression(
      "{{ !state.view.submitting && globalView.network.status !== 'offline' && !(state.view.lockedUntil && state.view.lockedUntil > Date.now()) }}",
      ctx,
    );
    expect(result).toBe(true);
  });
});

describe('v1.0 ★ 字符串实例方法白名单', () => {
  it('.length / .padStart / .slice / .includes / .startsWith', () => {
    const ctx = { state: { view: { name: 'hello' } as Record<string, unknown>, data: {}, effects: {} } };
    expect(evaluateExpression('{{ state.view.name.length }}', ctx)).toBe(5);
    expect(evaluateExpression('{{ state.view.name.slice(0, 3) }}', ctx)).toBe('hel');
    expect(evaluateExpression('{{ state.view.name.includes("ll") }}', ctx)).toBe(true);
    expect(evaluateExpression('{{ state.view.name.startsWith("he") }}', ctx)).toBe(true);
    expect(evaluateExpression('{{ "5".padStart(3, "0") }}', {})).toBe('005');
  });

  it('demo 场景：lockedCountdown mm:ss 格式化', () => {
    const ctx = { state: { view: { lockedCountdown: 125 } as Record<string, unknown>, data: {}, effects: {} } };
    expect(
      evaluateExpression(
        '{{ Math.floor(state.view.lockedCountdown / 60) }}:{{ String(state.view.lockedCountdown % 60).padStart(2, "0") }}',
        ctx,
      ),
    ).toBe('2:05');
  });
});

describe('v1.0 ★ 新内置 $.now / $.matches', () => {
  it('$.now() 等价 Date.now()', () => {
    const a = Date.now();
    const r = evaluateExpression('{{ $.now() }}', {}) as number;
    const b = Date.now();
    expect(r).toBeGreaterThanOrEqual(a);
    expect(r).toBeLessThanOrEqual(b);
  });

  it('$.matches with string pattern', () => {
    expect(evaluateExpression('{{ $.matches("13812345678", "^1[3-9]\\\\d{9}$") }}', {})).toBe(true);
    expect(evaluateExpression('{{ $.matches("138", "^1[3-9]\\\\d{9}$") }}', {})).toBe(false);
  });

  it('$.matches with RegExp literal', () => {
    expect(evaluateExpression('{{ $.matches("13812345678", /^1[3-9]\\d{9}$/) }}', {})).toBe(true);
  });
});

describe('v1.0 ★ 危险全局仍被拒', () => {
  it('window / globalThis / eval / Function / document 都抛 E007', () => {
    expect(() => evaluateExpression('{{ window.x }}', {})).toThrow();
    expect(() => evaluateExpression('{{ globalThis.x }}', {})).toThrow();
    expect(() => evaluateExpression('{{ eval("1+1") }}', {})).toThrow();
    expect(() => evaluateExpression('{{ Function("alert(1)") }}', {})).toThrow();
    expect(() => evaluateExpression('{{ document.cookie }}', {})).toThrow();
  });

  it('new Date() 仍被拒（parser 不支持 new）', () => {
    expect(() => evaluateExpression('{{ new Date() }}', {})).toThrow();
  });
});

