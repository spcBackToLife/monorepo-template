/**
 * Dispatcher 端到端单测（bun test）
 *
 * 覆盖 mock 全流程：
 *   event.actions = [effect.fetch(chat-send), ...]
 *   onSuccess chain: state.append userMessage + state.append aiReply + state.set(clear draft)
 *   onError  chain: ui.showToast 等
 */

import { describe, expect, it, mock } from 'bun:test';
import type { Action, ApiDataSource, DataSource } from '@globallink/design-schema';
import {
  createStore,
  createEmptyState,
  EffectExecutor,
  MockDriver,
  Dispatcher,
} from '../index';

function setup(ds: DataSource[], hostOverrides = {}) {
  const store = createStore(createEmptyState());
  const effects = new EffectExecutor({ mock: new MockDriver() }, 'mock');
  const byId = new Map(ds.map((d) => [d.id, d]));
  const host = {
    onShowToast: mock(() => {}),
    onNavGo: mock(() => {}),
    onCustomAction: mock(() => {}),
    ...hostOverrides,
  };
  const dispatcher = new Dispatcher({
    store,
    effects,
    dataSources: (id) => byId.get(id),
    host,
  });
  return { store, effects, dispatcher, host };
}

const chatSend: ApiDataSource = {
  id: 'chat-send',
  type: 'api',
  name: 'chatSend',
  endpoint: { method: 'POST', path: '/chat/send' },
  mock: {
    activeScenarioId: 'ok',
    scenarios: [
      {
        id: 'ok',
        name: 'ok',
        statusCode: 200,
        delay: 5,
        responseBody: { reply: { role: 'assistant', text: 'hi there' } },
      },
    ],
  },
};

describe('Dispatcher — state.*', () => {
  it('state.set + state.append + state.toggle 串行', async () => {
    const { store, dispatcher } = setup([]);
    const actions: Action[] = [
      { type: 'state.set', path: 'view.inputDraft', value: 'hello' },
      { type: 'state.append', path: 'data.logs', value: 'entry1' },
      { type: 'state.toggle', path: 'view.showModal' },
    ];
    await dispatcher.run(actions);
    const s = store.getState();
    expect(s.view.inputDraft).toBe('hello');
    expect(s.data.logs).toEqual(['entry1']);
    expect(s.view.showModal).toBe(true);
  });

  it('state.set 的 value 是表达式时先求值', async () => {
    const { store, dispatcher } = setup([]);
    // 前置设 view.base = 3
    await dispatcher.run([{ type: 'state.set', path: 'view.base', value: 3 }]);
    // value 是 {{ state.view.base }} → 求值为 3
    await dispatcher.run([
      { type: 'state.set', path: 'view.copied', value: '{{ state.view.base }}' },
    ]);
    expect(store.getState().view.copied).toBe(3);
  });

  it('state.remove 用 predicate', async () => {
    const { store, dispatcher } = setup([]);
    await dispatcher.run([
      { type: 'state.set', path: 'data.list', value: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    ]);
    await dispatcher.run([
      { type: 'state.remove', path: 'data.list', predicate: '{{ item.id === 2 }}' },
    ]);
    expect(store.getState().data.list).toEqual([{ id: 1 }, { id: 3 }]);
  });
});

describe('Dispatcher — effect.fetch 成功路径', () => {
  it('effect.fetch → 写 pending → 写 success → state.data[name] 注入 → 跑 onSuccess', async () => {
    const { store, dispatcher } = setup([chatSend]);
    const actions: Action[] = [
      {
        type: 'effect.fetch',
        dataSourceId: 'chat-send',
        params: { text: '{{ state.view.inputDraft }}' },
        onSuccess: [
          {
            type: 'state.append',
            path: 'data.messages',
            value: '{{ $last.data.reply }}',
          },
          { type: 'state.set', path: 'view.inputDraft', value: '' },
        ],
      },
    ];
    // 前置 view.inputDraft
    await dispatcher.run([
      { type: 'state.set', path: 'view.inputDraft', value: 'hello' },
    ]);
    await dispatcher.run(actions);

    const s = store.getState();
    expect(s.effects['chat-send'].status).toBe('success');
    expect(s.data.chatSend).toEqual({ reply: { role: 'assistant', text: 'hi there' } });
    expect(s.data.messages).toEqual([{ role: 'assistant', text: 'hi there' }]);
    expect(s.view.inputDraft).toBe('');
  });
});

describe('Dispatcher — effect.fetch 失败路径', () => {
  const chatErr: ApiDataSource = {
    id: 'chat-err',
    type: 'api',
    name: 'chatErr',
    endpoint: { method: 'GET', path: '/err' },
    mock: {
      activeScenarioId: 'err',
      scenarios: [{ id: 'err', name: 'err', statusCode: 500, delay: 5, responseBody: 'boom' }],
    },
  };

  it('错误时跑 onError 且 host.onShowToast 被调用', async () => {
    const { store, dispatcher, host } = setup([chatErr]);
    await dispatcher.run([
      {
        type: 'effect.fetch',
        dataSourceId: 'chat-err',
        onSuccess: [{ type: 'state.set', path: 'view.ok', value: true }],
        onError: [
          {
            type: 'ui.showToast',
            toastType: 'error',
            message: '{{ $last.error.message }}',
          },
        ],
      },
    ]);
    expect(store.getState().effects['chat-err'].status).toBe('error');
    expect(store.getState().view.ok).toBeUndefined();
    expect(host.onShowToast).toHaveBeenCalledTimes(1);
    const call = (host.onShowToast as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect((call[0] as { toastType: string }).toastType).toBe('error');
  });
});

describe('Dispatcher — 未知 dataSource', () => {
  it('不存在的 dataSourceId 走 onError', async () => {
    const { store, dispatcher } = setup([]);
    await dispatcher.run([
      {
        type: 'effect.fetch',
        dataSourceId: 'nope',
        onError: [{ type: 'state.set', path: 'view.err', value: true }],
      },
    ]);
    expect(store.getState().view.err).toBe(true);
    expect(store.getState().effects['nope'].status).toBe('error');
  });
});

describe('Dispatcher — nav/ui/custom 代理', () => {
  it('nav.go / nav.back / ui.openUrl / custom 通过 host adapters', async () => {
    const host = {
      onNavGo: mock(() => {}),
      onNavBack: mock(() => {}),
      onOpenUrl: mock(() => {}),
      onCustomAction: mock(() => {}),
      onShowToast: mock(() => {}),
    };
    const { dispatcher } = setup([], host);
    await dispatcher.run([
      { type: 'nav.go', targetScreenId: 'home' },
      { type: 'nav.back' },
      { type: 'ui.openUrl', url: 'https://x.com', openInNewTab: true },
      { type: 'custom', handler: 'doThing', payload: { x: 1 } },
    ]);
    expect(host.onNavGo).toHaveBeenCalledTimes(1);
    expect(host.onNavBack).toHaveBeenCalledTimes(1);
    expect(host.onOpenUrl).toHaveBeenCalledTimes(1);
    expect(host.onCustomAction).toHaveBeenCalledTimes(1);
  });

  it('ui.delay 真的等到', async () => {
    const { dispatcher } = setup([]);
    const start = Date.now();
    await dispatcher.run([{ type: 'ui.delay', duration: 30 }]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});
