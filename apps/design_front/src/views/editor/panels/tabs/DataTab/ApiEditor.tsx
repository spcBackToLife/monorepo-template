/**
 * ApiDataSourceEditor — API 数据源编辑器（v2）
 *
 * RFC §2.2 / §2.3：api 数据源同时持有：
 *   - endpoint：method/path/headers/query/body（生产跑真接口）
 *   - mock：scenarios + activeScenarioId（编辑器/Storybook 跑）
 *   - autoFetchOnEnter：是否 screenEnter 自动 fetch
 *   - defaultParams：自动 fetch 时默认参数
 *
 * 与 v1 差异：不再有 phase（created/loading/loaded/error），
 * 运行时状态改由 EffectExecutor 写入 state.effects[dataSourceId]。
 */

import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type {
  ApiDataSource,
  ApiEndpoint,
  HttpMethod,
} from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import {
  HTTP_METHODS,
  METHOD_COLORS,
  formatJsonBlock,
  parseEndpointBody,
} from './helpers';
import { MockScenariosSection } from './MockScenarios';

interface Props {
  screenId: string;
  dataSource: ApiDataSource;
}

export const ApiDataSourceEditor = observer(function ApiDataSourceEditor({
  screenId,
  dataSource,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <EndpointSection screenId={screenId} dataSource={dataSource} />
      <FetchOptionsSection screenId={screenId} dataSource={dataSource} />
      <MockScenariosSection screenId={screenId} dataSource={dataSource} />
    </div>
  );
});

// ===== endpoint =====

const EndpointSection = observer(function EndpointSection({
  screenId,
  dataSource,
}: Props) {
  const ep = dataSource.endpoint;
  const [method, setMethod] = useState<HttpMethod>(ep.method);
  const [path, setPath] = useState(ep.path);
  const [bodyText, setBodyText] = useState(
    ep.body !== undefined ? formatJsonBlock(ep.body) : '',
  );
  const [dirty, setDirty] = useState(false);

  const commit = () => {
    const next: ApiEndpoint = {
      ...ep,
      method,
      path: path.trim(),
      body: parseEndpointBody(bodyText),
    };
    editorStore.execute({
      type: 'dataSource.setEndpoint',
      params: { screenId, dataSourceId: dataSource.id, endpoint: next },
    });
    setDirty(false);
  };

  const showBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const methodColor = METHOD_COLORS[method];

  return (
    <div className="flex flex-col gap-1 border border-gray-200 rounded bg-white p-2">
      <div className="text-[10px] font-medium text-gray-600">接口配置 (endpoint)</div>

      <div className="flex items-center gap-1">
        <select
          className={`h-6 px-1 border border-gray-200 rounded text-[10px] outline-none w-20 font-mono font-bold ${methodColor}`}
          value={method}
          onChange={(e) => { setMethod(e.target.value as HttpMethod); setDirty(true); }}
        >
          {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-400 font-mono"
          placeholder="/api/users/{{ state.view.userId }}"
          value={path}
          onChange={(e) => { setPath(e.target.value); setDirty(true); }}
        />
      </div>

      {showBody && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">
            请求体 (JSON，支持 <code className="font-mono text-purple-600">{'{{ state.x }}'}</code>)
          </span>
          <textarea
            className="w-full h-20 px-1.5 py-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono resize-y bg-gray-50"
            value={bodyText}
            onChange={(e) => { setBodyText(e.target.value); setDirty(true); }}
            placeholder={'{\n  "email": "{{ state.view.email }}"\n}'}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="h-5 px-2 rounded bg-blue-500 text-white text-[10px] disabled:opacity-40"
          disabled={!dirty || !path.trim()}
          onClick={commit}
        >
          保存 endpoint
        </button>
      </div>
    </div>
  );
});

// ===== 自动 fetch 开关 + defaultParams =====

const FetchOptionsSection = observer(function FetchOptionsSection({
  screenId,
  dataSource,
}: Props) {
  const current = dataSource.autoFetchOnEnter !== false; // 默认 true
  const paramsText = useMemo(
    () => (dataSource.defaultParams ? formatJsonBlock(dataSource.defaultParams) : ''),
    [dataSource.defaultParams],
  );
  const [text, setText] = useState(paramsText);
  const [error, setError] = useState<string | null>(null);

  const toggleAuto = (enabled: boolean) => {
    editorStore.execute({
      type: 'dataSource.update',
      params: {
        screenId,
        dataSourceId: dataSource.id,
        autoFetchOnEnter: enabled,
      },
    });
  };

  const commitParams = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      editorStore.execute({
        type: 'dataSource.setDefaultParams',
        params: { screenId, dataSourceId: dataSource.id, defaultParams: null },
      });
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('defaultParams 必须是 JSON 对象');
        return;
      }
      editorStore.execute({
        type: 'dataSource.setDefaultParams',
        params: { screenId, dataSourceId: dataSource.id, defaultParams: parsed },
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-1 border border-gray-200 rounded bg-white p-2">
      <label className="flex items-center gap-1 text-[10px] text-gray-600">
        <input
          type="checkbox"
          checked={current}
          onChange={(e) => toggleAuto(e.target.checked)}
        />
        进入页面时自动 fetch
      </label>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-500">
          默认参数 defaultParams (JSON 对象，可选)
        </span>
        <textarea
          className="w-full h-16 px-1.5 py-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono resize-y bg-gray-50"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitParams}
          placeholder={'{\n  "pageSize": 20\n}'}
        />
        {error && <span className="text-[10px] text-red-500">{error}</span>}
      </div>
    </div>
  );
});
