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
  ErrorCode,
  HttpMethod,
  NetworkPolicy,
} from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { ExpressionEditor } from '@/views/editor/components/ExpressionEditor';
import { useExpressionScope } from '@/views/editor/components/ExpressionEditor/useExpressionScope';
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
      <NetworkPolicySection screenId={screenId} dataSource={dataSource} />
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
  const scope = useExpressionScope();

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
        <ExpressionEditor
          value={path}
          onChange={(next) => { setPath(next); setDirty(true); }}
          scope={scope}
          mode="template"
          placeholder="/api/users/{{ state.view.userId }}"
        />
      </div>

      {showBody && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">
            请求体 (JSON，支持 <code className="font-mono text-purple-600">{'{{ state.x }}'}</code>)
          </span>
          <ExpressionEditor
            value={bodyText}
            onChange={(next) => { setBodyText(next); setDirty(true); }}
            scope={scope}
            mode="template"
            multiline
            rows={4}
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

// ===== NetworkPolicy（v2.6 ★：超时 / 重试） =====

const RETRY_ON_OPTIONS: ErrorCode[] = ['TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR'];

const NetworkPolicySection = observer(function NetworkPolicySection({
  screenId,
  dataSource,
}: Props) {
  const policy = dataSource.endpoint.networkPolicy;
  const enabled = !!policy;

  const [timeout, setTimeoutVal] = useState<string>(policy?.timeout?.toString() ?? '');
  const [retryCount, setRetryCount] = useState<string>(policy?.retryCount?.toString() ?? '0');
  const [retryDelay, setRetryDelay] = useState<string>(policy?.retryDelay?.toString() ?? '1000');
  const [retryOn, setRetryOn] = useState<Set<ErrorCode>>(
    new Set(policy?.retryOn ?? ['TIMEOUT', 'NETWORK_ERROR']),
  );

  const commit = () => {
    const next: NetworkPolicy = {};
    const t = parseInt(timeout, 10);
    if (!isNaN(t) && t > 0) next.timeout = t;
    const rc = parseInt(retryCount, 10);
    if (!isNaN(rc) && rc > 0) next.retryCount = rc;
    const rd = parseInt(retryDelay, 10);
    if (!isNaN(rd) && rd >= 0) next.retryDelay = rd;
    if (retryOn.size > 0) next.retryOn = Array.from(retryOn);

    if (Object.keys(next).length === 0) {
      // 用户清空所有字段 → 清空策略
      editorStore.execute({
        type: 'dataSource.setNetworkPolicy',
        params: { screenId, dataSourceId: dataSource.id, networkPolicy: null },
      });
      return;
    }
    editorStore.execute({
      type: 'dataSource.setNetworkPolicy',
      params: { screenId, dataSourceId: dataSource.id, networkPolicy: next },
    });
  };

  const clear = () => {
    editorStore.execute({
      type: 'dataSource.setNetworkPolicy',
      params: { screenId, dataSourceId: dataSource.id, networkPolicy: null },
    });
    setTimeoutVal('');
    setRetryCount('0');
    setRetryDelay('1000');
    setRetryOn(new Set(['TIMEOUT', 'NETWORK_ERROR']));
  };

  const toggleRetryOn = (code: ErrorCode) => {
    const next = new Set(retryOn);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setRetryOn(next);
  };

  return (
    <div className="flex flex-col gap-1 border border-gray-200 rounded bg-white p-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium text-gray-600">
          网络策略 (networkPolicy)
          {enabled
            ? <span className="ml-1 text-emerald-600">●</span>
            : <span className="ml-1 text-gray-400">○ 未配置（无超时/重试）</span>}
        </div>
        {enabled && (
          <button
            type="button"
            className="text-[10px] text-gray-500 hover:text-red-500"
            onClick={clear}
          >
            清空
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">timeout (ms)</span>
          <input
            type="number"
            min={0}
            className="h-6 px-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
            value={timeout}
            onChange={(e) => setTimeoutVal(e.target.value)}
            onBlur={commit}
            placeholder="留空=不限时"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">retryCount</span>
          <input
            type="number"
            min={0}
            max={10}
            className="h-6 px-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
            value={retryCount}
            onChange={(e) => setRetryCount(e.target.value)}
            onBlur={commit}
            placeholder="0=不重试"
          />
        </label>
        <label className="flex flex-col gap-0.5 col-span-2">
          <span className="text-[10px] text-gray-500">
            retryDelay (ms，指数退避基数：实际间隔 = base × 2^attempt)
          </span>
          <input
            type="number"
            min={0}
            className="h-6 px-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
            value={retryDelay}
            onChange={(e) => setRetryDelay(e.target.value)}
            onBlur={commit}
            placeholder="默认 1000"
          />
        </label>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-500">retryOn (哪些错误码触发重试)</span>
        <div className="flex flex-wrap gap-1">
          {RETRY_ON_OPTIONS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => { toggleRetryOn(code); }}
              onBlur={commit}
              className={
                'h-5 px-2 rounded text-[10px] border ' +
                (retryOn.has(code)
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400')
              }
            >
              {code}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
