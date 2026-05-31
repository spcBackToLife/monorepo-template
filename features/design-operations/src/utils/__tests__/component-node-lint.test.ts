/**
 * Schema 字段关系 lint 单测
 *
 * 覆盖：
 *   - R-NODE-FIELD-01: textContent/text vs children 互斥
 *   - R-NODE-FIELD-02: input/textarea/select bind × change 双写
 *   - R-FIELD-DEPRECATED-01: logic.switch.cases[].when → match
 *   - R-NAV-TARGET-01: nav.go.targetScreenId 引用不存在的屏
 *
 * 运行：cd features/design-operations && bun test
 */

import { describe, expect, it } from 'bun:test';
import {
  lintComponentNodeFieldRelations,
  lintActionChain,
} from '../component-node-lint';
import type { Action, ComponentNode, DesignProject } from '@globallink/design-schema';

// ===== 工具：构造一个最小 DesignProject =====
function makeProject(screenIds: string[]): DesignProject {
  return {
    id: 'test-project',
    name: 'Test',
    platform: 'web',
    viewports: [],
    screens: screenIds.map((id) => ({
      id,
      name: id,
      rootNode: {
        id: `${id}-root`,
        type: 'div',
        styles: {},
        props: {},
        states: [],
        activeState: 'default',
        events: [],
        locked: false,
        visible: true,
      },
      dataSources: [],
    })),
    componentAssets: [],
    materialAssets: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as DesignProject;
}

function makeNode(partial: Partial<ComponentNode>): ComponentNode {
  return {
    id: 'n1',
    type: 'div',
    styles: {},
    props: {},
    states: [],
    activeState: 'default',
    events: [],
    locked: false,
    visible: true,
    ...partial,
  } as ComponentNode;
}

describe('lintComponentNodeFieldRelations — R-NODE-FIELD-01 (textContent vs children)', () => {
  it('非空 textContent + children 同时存在 → warning', () => {
    const node = makeNode({
      type: 'span',
      props: { textContent: 'hello' },
      children: [makeNode({ id: 'c1', type: 'span' })],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-NODE-FIELD-01');
    expect(refs[0].issues[0].level).toBe('warning');
    expect(refs[0].fieldPath).toContain('props.textContent');
  });

  it('空字符串 textContent + children → 不报（空字符串 fall-through）', () => {
    const node = makeNode({
      type: 'span',
      props: { textContent: '' },
      children: [makeNode({ id: 'c1', type: 'span' })],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs).toEqual([]);
  });

  it('数字 0 textContent + children → 报（数字 0 算叶子文本）', () => {
    const node = makeNode({
      type: 'span',
      props: { textContent: 0 },
      children: [makeNode({ id: 'c1', type: 'span' })],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-NODE-FIELD-01');
  });

  it('只有 textContent 无 children → 不报', () => {
    const node = makeNode({
      type: 'span',
      props: { textContent: 'hello' },
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs).toEqual([]);
  });

  it('只有 children 无 textContent/text → 不报', () => {
    const node = makeNode({
      type: 'div',
      children: [makeNode({ id: 'c1', type: 'span' })],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs).toEqual([]);
  });

  it('text 字段（与 textContent 同义）+ children → 同样报', () => {
    const node = makeNode({
      type: 'span',
      props: { text: 'hello' },
      children: [makeNode({ id: 'c1', type: 'span' })],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs.length).toBe(1);
    expect(refs[0].fieldPath).toContain('props.text');
  });
});

describe('lintComponentNodeFieldRelations — R-NODE-FIELD-02 (bind × change)', () => {
  it('input + bind.path + change event → warning', () => {
    const node = makeNode({
      type: 'input',
      bind: { path: 'view.form.phone' },
      events: [{ trigger: 'change', actions: [] }],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-NODE-FIELD-02');
    expect(refs[0].fieldPath).toContain('events[0]');
  });

  it('input + bind.path + blur event → 不报（blur 是合法补充行为）', () => {
    const node = makeNode({
      type: 'input',
      bind: { path: 'view.form.phone' },
      events: [{ trigger: 'blur', actions: [] }],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs).toEqual([]);
  });

  it('div + bind + change event → 不报（只对 form 节点检查）', () => {
    const node = makeNode({
      type: 'div',
      bind: { path: 'view.x' },
      events: [{ trigger: 'change', actions: [] }],
    });
    const refs = lintComponentNodeFieldRelations(node);
    expect(refs).toEqual([]);
  });

  it('textarea + bind + change → 报', () => {
    const node = makeNode({
      type: 'textarea',
      bind: { path: 'view.note' },
      events: [{ trigger: 'change', actions: [] }],
    });
    expect(lintComponentNodeFieldRelations(node).length).toBe(1);
  });

  it('select + bind + change → 报', () => {
    const node = makeNode({
      type: 'select',
      bind: { path: 'view.option' },
      events: [{ trigger: 'change', actions: [] }],
    });
    expect(lintComponentNodeFieldRelations(node).length).toBe(1);
  });
});

describe('lintActionChain — R-FIELD-DEPRECATED-01 (case.when → match)', () => {
  it('logic.switch.cases[].when 字段废弃 → warning', () => {
    const actions = [
      {
        type: 'logic.switch',
        on: '{{ state.view.status }}',
        cases: [
          // 故意写成废弃字段
          { when: '{{ x === 1 }}', actions: [] },
        ],
        default: [],
      },
    ] as unknown as Action[];

    const refs = lintActionChain(actions, 'events[0].actions');
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-FIELD-DEPRECATED-01');
    expect(refs[0].issues[0].suggestedFix).toBe('match');
    expect(refs[0].fieldPath).toContain('cases[0].when');
  });

  it('logic.switch.cases[].match 正确字段 → 不报', () => {
    const actions: Action[] = [
      {
        type: 'logic.switch',
        on: '{{ state.view.status }}',
        cases: [{ match: '{{ x === 1 }}' as never, actions: [] }],
        default: [],
      },
    ];
    const refs = lintActionChain(actions, 'events[0].actions');
    expect(refs).toEqual([]);
  });

  it('同时 when 和 match → 不报（已有 match,when 是冗余字段不强制迁移）', () => {
    const actions = [
      {
        type: 'logic.switch',
        on: '{{ state.view.status }}',
        cases: [{ when: 'a', match: 'b', actions: [] }],
        default: [],
      },
    ] as unknown as Action[];
    const refs = lintActionChain(actions, 'events[0].actions');
    expect(refs).toEqual([]);
  });
});

describe('lintActionChain — R-NAV-TARGET-01 (nav.go 屏存在性)', () => {
  const project = makeProject(['00-login', '01-home']);

  it('nav.go.targetScreenId 引用项目内存在的屏 → 不报', () => {
    const actions: Action[] = [{ type: 'nav.go', targetScreenId: '01-home' }];
    const refs = lintActionChain(actions, 'events[0].actions', { project });
    expect(refs).toEqual([]);
  });

  it('nav.go.targetScreenId 引用不存在的屏 → warning', () => {
    const actions: Action[] = [{ type: 'nav.go', targetScreenId: 'not-exist' }];
    const refs = lintActionChain(actions, 'events[0].actions', { project });
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-NAV-TARGET-01');
    expect(refs[0].issues[0].message).toContain('not-exist');
    expect(refs[0].fieldPath).toContain('targetScreenId');
  });

  it('nav.go.targetScreenId 是表达式（含 {{}}）→ 不报（运行时再判定）', () => {
    const actions: Action[] = [
      { type: 'nav.go', targetScreenId: '{{ state.view.next }}' as never },
    ];
    const refs = lintActionChain(actions, 'events[0].actions', { project });
    expect(refs).toEqual([]);
  });

  it('未传 project → 跳过 R-NAV-TARGET-01 检查（pure schema lint 模式）', () => {
    const actions: Action[] = [{ type: 'nav.go', targetScreenId: 'not-exist' }];
    const refs = lintActionChain(actions, 'events[0].actions');
    expect(refs).toEqual([]);
  });

  it('nav.go 嵌在 logic.if 里 → 同样检查', () => {
    const actions = [
      {
        type: 'logic.if',
        when: '{{ state.view.ok }}',
        then: [{ type: 'nav.go', targetScreenId: 'not-exist' }],
        else: [],
      },
    ] as unknown as Action[];
    const refs = lintActionChain(actions, 'events[0].actions', { project });
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-NAV-TARGET-01');
  });

  it('nav.go 嵌在 effect.fetch.onSuccess 里 → 同样检查', () => {
    const actions = [
      {
        type: 'effect.fetch',
        dataSourceId: 'foo',
        onSuccess: [{ type: 'nav.go', targetScreenId: 'not-exist' }],
        onError: [],
      },
    ] as unknown as Action[];
    const refs = lintActionChain(actions, 'events[0].actions', { project });
    expect(refs.length).toBe(1);
    expect(refs[0].issues[0].code).toBe('R-NAV-TARGET-01');
  });
});

describe('lintActionChain — 多 issue 累积', () => {
  it('一个 action 链同时含 case.when + nav.go 不存在屏', () => {
    const project = makeProject(['00-login']);
    const actions = [
      {
        type: 'logic.switch',
        on: '{{ state.view.status }}',
        cases: [
          { when: 'a', actions: [{ type: 'nav.go', targetScreenId: 'not-exist' }] },
        ],
        default: [],
      },
    ] as unknown as Action[];
    const refs = lintActionChain(actions, 'events[0].actions', { project });
    expect(refs.length).toBe(2);
    const codes = refs.flatMap((r) => r.issues.map((i) => i.code));
    expect(codes).toContain('R-FIELD-DEPRECATED-01');
    expect(codes).toContain('R-NAV-TARGET-01');
  });
});
