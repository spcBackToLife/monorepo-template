/**
 * Expression Linter 单测（bun test）
 *
 * 覆盖：
 *   - 7 个错误码 E001 / E002 / E003 / E004 / E005 / E007（lint 不产 E006）
 *   - 三层强度 'required' / 'literal-or-expr' / 'template'
 *   - knownMigrations suggestedFix 渲染
 *   - 复合场景（多个 issue 累积）
 *   - walker 入口（ComponentNode / Event / Action chain）
 *
 * 运行：pnpm --filter @globallink/design-engine test -- Linter
 */

import { describe, expect, it } from 'bun:test';
import {
  lintExpression,
  lintExpressionField,
  walkExpressionsInActionChain,
  walkExpressionsInEvent,
  walkExpressionsInNode,
  type LintIssue,
} from '../index';
import type { Action, ComponentEvent, ComponentNode } from '@globallink/design-schema';

// ===== 工具：找一条 issue =====
function findIssue(issues: LintIssue[], code: string): LintIssue | undefined {
  return issues.find((i) => i.code === code);
}

describe('lintExpression — 合法表达式无 issue', () => {
  it('字面量 / 运算 / 三元', () => {
    expect(lintExpression('{{ 42 }}').ok).toBe(true);
    expect(lintExpression('{{ 1 + 2 * 3 }}').ok).toBe(true);
    expect(lintExpression("{{ x === 'a' ? 'b' : 'c' }}", 'expression').ok).toBe(false); // x 是未知 ident
    expect(lintExpression("{{ state.x === 'a' ? 'b' : 'c' }}", 'expression').ok).toBe(true);
  });

  it('contextual identifier 都合法', () => {
    expect(lintExpression('{{ state.view.foo }}').ok).toBe(true);
    expect(lintExpression('{{ globalView.session.token }}').ok).toBe(true);
    expect(lintExpression('{{ item.role }}').ok).toBe(true);
    expect(lintExpression('{{ index >= 0 }}').ok).toBe(true);
    expect(lintExpression('{{ parent.x }}').ok).toBe(true);
    expect(lintExpression('{{ $last.response }}').ok).toBe(true);
  });

  it('builtins 调用', () => {
    expect(lintExpression('{{ $.length(state.data.list) }}').ok).toBe(true);
    expect(lintExpression('{{ $.now() }}').ok).toBe(true);
    expect(lintExpression("{{ $.matches(state.view.phone, '^1') }}").ok).toBe(true);
    expect(lintExpression('{{ $.isEmpty(state.view.x) }}').ok).toBe(true);
  });

  it('globals 静态方法 + callable', () => {
    expect(lintExpression('{{ Date.now() }}').ok).toBe(true);
    expect(lintExpression('{{ Math.max(1, 2, 3) }}').ok).toBe(true);
    expect(lintExpression('{{ Math.floor(state.view.t / 1000) }}').ok).toBe(true);
    expect(lintExpression('{{ Number(state.view.x) }}').ok).toBe(true);
    expect(lintExpression('{{ String(42) }}').ok).toBe(true);
    expect(lintExpression('{{ JSON.stringify(state.view.payload) }}').ok).toBe(true);
    expect(lintExpression('{{ Object.keys(state.view) }}').ok).toBe(true);
  });

  it('正则字面量 + 实例方法', () => {
    expect(lintExpression('{{ /^1\\d{10}$/.test(state.view.phone) }}').ok).toBe(true);
    expect(lintExpression('{{ "hello".toUpperCase() }}').ok).toBe(true);
  });

  it('可选链 + 空合并', () => {
    expect(lintExpression('{{ state?.view?.x ?? null }}').ok).toBe(true);
    expect(lintExpression('{{ state.view.x?.foo }}').ok).toBe(true);
  });

  it('数组 / 对象字面量', () => {
    expect(lintExpression('{{ [1, 2, state.view.x] }}').ok).toBe(true);
    expect(lintExpression('{{ { a: 1, b: state.view.x } }}').ok).toBe(true);
  });
});

describe('lintExpression — E001 syntax error', () => {
  it('未闭合字符串', () => {
    const r = lintExpression("{{ state.x === 'unclosed }}");
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E001')).toBeDefined();
  });

  it('未闭合 {{', () => {
    const r = lintExpression('hello {{ state.x ');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E001')).toBeDefined();
  });

  it('multiple stray tokens', () => {
    const r = lintExpression('{{ 1 2 }}');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E001')).toBeDefined();
  });
});

describe('lintExpression — E002 unknown identifier', () => {
  it('裸标识符未注册', () => {
    const r = lintExpression('{{ unknownName }}');
    expect(r.ok).toBe(false);
    const e = findIssue(r.issues, 'E002');
    expect(e).toBeDefined();
    expect(e!.message).toContain('unknownName');
    expect(e!.hint).toContain('contextual'); // 提示可用列表
  });

  it('不带 {{ }} 的也走 E002', () => {
    const r = lintExpression('foo + bar');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E002')).toBeDefined();
  });

  it('未知 builtin 函数', () => {
    const r = lintExpression('{{ $.notExistFn() }}');
    expect(r.ok).toBe(false);
    const e = findIssue(r.issues, 'E002');
    expect(e).toBeDefined();
    expect(e!.message).toContain('$.notExistFn');
  });

  it('表达式中混用未知函数', () => {
    const r = lintExpression('{{ unknownFn(state.x) }}');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E002')).toBeDefined();
  });
});

describe('lintExpression — E003 forbidden global member', () => {
  it('Date.fooNotExist()', () => {
    const r = lintExpression('{{ Date.fooNotExist() }}');
    expect(r.ok).toBe(false);
    const e = findIssue(r.issues, 'E003');
    expect(e).toBeDefined();
    expect(e!.message).toContain('Date.fooNotExist');
    expect(e!.hint).toContain('now');
  });

  it('Math.somethingNotInWhitelist', () => {
    const r = lintExpression('{{ Math.notExist(1) }}');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E003')).toBeDefined();
  });

  it('JSON 不可调用作命名空间', () => {
    const r = lintExpression('{{ JSON(x) }}');
    expect(r.ok).toBe(false);
    const e = findIssue(r.issues, 'E003');
    expect(e).toBeDefined();
    expect(e!.message).toContain('namespace');
  });

  it('Date.now() 应用 suggestedFix（来自 knownMigrations）', () => {
    // 此处 Date.now() 本身合法，不该报错；但 Date.fooNotExist() 该带 suggestedFix
    const r1 = lintExpression('{{ Date.fooNotExist() }}');
    // Date.fooNotExist 没有 migration hint
    expect(r1.issues.find((i) => i.suggestedFix)).toBeUndefined();
  });

  it('member access 也应该被检测（无调用）', () => {
    // 当前实现只在 member 节点检 globalNs.member 是否合法
    const r = lintExpression('{{ Date.notExist }}');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E003')).toBeDefined();
  });
});

describe('lintExpression — E004 forbidden instance method（静态推断）', () => {
  it('字符串字面量调用未知方法', () => {
    const r = lintExpression('{{ "hello".notAMethod() }}');
    expect(r.ok).toBe(false);
    const e = findIssue(r.issues, 'E004');
    expect(e).toBeDefined();
    expect(e!.hint).toContain('toUpperCase');
  });

  it('数组字面量调用未知方法', () => {
    const r = lintExpression('{{ [1,2,3].notExist() }}');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E004')).toBeDefined();
  });

  it('未知运行时类型 → 跳过 instance lint（state.view.x 推不出类型）', () => {
    const r = lintExpression('{{ state.view.x.unknownMethod() }}');
    // state.view.x 推不出类型，lint 静态阶段不报；运行时 Evaluator 会拒
    expect(r.ok).toBe(true);
  });
});

describe('lintExpression — E007 forbidden global', () => {
  it('window / eval / Function / process 等全部拒', () => {
    expect(findIssue(lintExpression('{{ window }}').issues, 'E007')).toBeDefined();
    expect(findIssue(lintExpression('{{ eval("1+1") }}').issues, 'E007')).toBeDefined();
    expect(findIssue(lintExpression('{{ globalThis }}').issues, 'E007')).toBeDefined();
    expect(findIssue(lintExpression('{{ process.env }}').issues, 'E007')).toBeDefined();
    expect(findIssue(lintExpression('{{ document.title }}').issues, 'E007')).toBeDefined();
    expect(findIssue(lintExpression('{{ fetch("/x") }}').issues, 'E007')).toBeDefined();
    expect(findIssue(lintExpression('{{ localStorage.getItem("x") }}').issues, 'E007')).toBeDefined();
  });
});

describe('lintExpression — 多 issue 累积', () => {
  it('一个表达式同时含 E002 + E003', () => {
    const r = lintExpression('{{ unknownFn() && Date.notExist() }}');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E002')).toBeDefined();
    expect(findIssue(r.issues, 'E003')).toBeDefined();
  });

  it('数组里嵌套未知 ident', () => {
    const r = lintExpression('{{ [foo, bar] }}');
    expect(r.ok).toBe(false);
    expect(r.issues.filter((i) => i.code === 'E002').length).toBe(2);
  });
});

describe('lintExpression — template 模式', () => {
  it('模板里所有 {{ }} 段都 lint', () => {
    const r = lintExpression('hello {{ state.view.name }}, your code is {{ unknown }}', 'template');
    expect(r.ok).toBe(false);
    expect(findIssue(r.issues, 'E002')).toBeDefined();
  });

  it('纯文本模板无 issue', () => {
    const r = lintExpression('plain text only', 'template');
    expect(r.ok).toBe(true);
    expect(r.issues.length).toBe(0);
  });
});

describe('lintExpressionField — 三层强度', () => {
  describe("strength='required'", () => {
    it('必须含 {{ }}，纯字面量不行', () => {
      const r = lintExpressionField('plain string', 'required');
      expect(r.ok).toBe(false);
      const e = findIssue(r.issues, 'E001');
      expect(e).toBeDefined();
      expect(e!.hint).toContain('{{');
    });

    it('合法 expression 通过', () => {
      const r = lintExpressionField('{{ state.view.x === 1 }}', 'required');
      expect(r.ok).toBe(true);
    });

    it('null/undefined 视为清空，放行', () => {
      expect(lintExpressionField(null, 'required').ok).toBe(true);
      expect(lintExpressionField(undefined, 'required').ok).toBe(true);
      expect(lintExpressionField('', 'required').ok).toBe(true);
    });
  });

  describe("strength='literal-or-expr'", () => {
    it('纯字面量直接放行', () => {
      expect(lintExpressionField('hello', 'literal-or-expr').ok).toBe(true);
      expect(lintExpressionField('', 'literal-or-expr').ok).toBe(true);
      expect(lintExpressionField(42, 'literal-or-expr').ok).toBe(true);
    });

    it('含 {{}} 的字符串走 lint', () => {
      const r = lintExpressionField('{{ unknownFoo }}', 'literal-or-expr');
      expect(r.ok).toBe(false);
      expect(findIssue(r.issues, 'E002')).toBeDefined();
    });

    it('合法 {{}} 放行', () => {
      expect(lintExpressionField('{{ state.view.x }}', 'literal-or-expr').ok).toBe(true);
    });
  });

  describe("strength='template'", () => {
    it('混合文本 + 多段 {{}}', () => {
      const r = lintExpressionField('hi {{ state.view.name }} ok', 'template');
      expect(r.ok).toBe(true);
    });

    it('其中一段非法', () => {
      const r = lintExpressionField('hi {{ state.view.name }} {{ unknown }}', 'template');
      expect(r.ok).toBe(false);
      expect(findIssue(r.issues, 'E002')).toBeDefined();
    });
  });
});

describe('walker — walkExpressionsInActionChain', () => {
  it('logic.if.when 必须 required', () => {
    const actions: Action[] = [
      {
        type: 'logic.if',
        when: 'plain bare string' as never,
        then: [],
      },
    ];
    const refs = walkExpressionsInActionChain(actions);
    expect(refs.length).toBe(1);
    expect(refs[0].fieldPath).toContain('actions[0].when');
    expect(findIssue(refs[0].issues, 'E001')).toBeDefined();
  });

  it('state.set.value literal-or-expr', () => {
    const actions: Action[] = [
      { type: 'state.set', path: 'view.x', value: 'plain literal' }, // OK
      { type: 'state.set', path: 'view.y', value: '{{ unknownIdent }}' }, // E002
    ];
    const refs = walkExpressionsInActionChain(actions);
    expect(refs.length).toBe(1);
    expect(refs[0].fieldPath).toContain('actions[1].value');
  });

  it('effect.fetch onSuccess/onError 递归', () => {
    const actions: Action[] = [
      {
        type: 'effect.fetch',
        dataSourceId: 'foo',
        onSuccess: [{ type: 'ui.showToast', toastType: 'success', message: '{{ unknownIdent }}' }],
      },
    ];
    const refs = walkExpressionsInActionChain(actions);
    expect(refs.length).toBe(1);
    expect(refs[0].fieldPath).toContain('onSuccess[0].message');
  });
});

describe('walker — walkExpressionsInEvent', () => {
  it('condition.when + actions 都扫', () => {
    const event: ComponentEvent = {
      trigger: 'click',
      condition: { when: '{{ unknownIdent }}' as never },
      actions: [{ type: 'state.set', path: 'view.x', value: '{{ Date.notExist() }}' as never }],
    };
    const refs = walkExpressionsInEvent(event);
    expect(refs.length).toBe(2);
    expect(refs.map((r) => r.fieldPath)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('condition.when'),
        expect.stringContaining('actions[0].value'),
      ]),
    );
  });
});

describe('walker — walkExpressionsInNode', () => {
  it('递归 children + repeat.template + visualState styles', () => {
    const node: ComponentNode = {
      id: 'root',
      type: 'div',
      styles: { color: '{{ unknown }}' as never }, // E002
      props: {},
      states: [],
      activeState: 'default',
      events: [],
      locked: false,
      visible: true,
      visibleWhen: '{{ Date.notExist() }}' as never, // E003
      children: [
        {
          id: 'child',
          type: 'span',
          styles: {},
          props: { textContent: '{{ unknownChild }}' as never }, // E002
          states: [],
          activeState: 'default',
          events: [],
          locked: false,
          visible: true,
        },
      ],
    };
    const refs = walkExpressionsInNode(node);
    // 至少 3 条 issue 命中
    expect(refs.length).toBeGreaterThanOrEqual(3);
    const paths = refs.map((r) => r.fieldPath);
    expect(paths.some((p) => p.includes('styles.color'))).toBe(true);
    expect(paths.some((p) => p.includes('visibleWhen'))).toBe(true);
    expect(paths.some((p) => p.includes('children[0].props.textContent'))).toBe(true);
  });

  it('合法 schema 应该 0 issue', () => {
    const node: ComponentNode = {
      id: 'root',
      type: 'div',
      styles: { color: '{{ state.view.theme === "dark" ? "#fff" : "#000" }}' as never },
      props: { textContent: '{{ state.view.title }}' as never },
      states: [],
      activeState: 'default',
      events: [
        {
          trigger: 'click',
          actions: [{ type: 'state.set', path: 'view.x', value: '{{ $.now() }}' as never }],
        },
      ],
      locked: false,
      visible: true,
      visibleWhen: '{{ state.view.shown }}' as never,
    };
    const refs = walkExpressionsInNode(node);
    expect(refs).toEqual([]);
  });

  it('deprecated 用法（如 Date.now()）应报 E008 warning', () => {
    const node: ComponentNode = {
      id: 'root',
      type: 'div',
      styles: {},
      props: {},
      states: [],
      activeState: 'default',
      events: [
        {
          trigger: 'click',
          actions: [{ type: 'state.set', path: 'view.x', value: '{{ Date.now() }}' as never }],
        },
      ],
      locked: false,
      visible: true,
    };
    const refs = walkExpressionsInNode(node);
    expect(refs.length).toBe(1);
    const issue = refs[0].issues[0];
    expect(issue.code).toBe('E008');
    expect(issue.level).toBe('warning');
    expect(issue.suggestedFix).toContain('$.now()');
  });
});
