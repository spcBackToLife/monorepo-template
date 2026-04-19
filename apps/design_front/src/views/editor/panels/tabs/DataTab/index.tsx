import { useState, useCallback, useRef, useEffect } from 'react';
import { App as AntdApp, Empty, Popconfirm } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { generateId } from '@globallink/design-schema';
import type { DataSource, ApiEndpoint, HttpMethod, MockScenario, Screen } from '@globallink/design-schema';

/**
 * 页面数据面板 — 重写版
 *
 * 核心改动：不再让用户手动「创建数据源」。
 * 打开数据面板时，若当前页面没有数据源，自动创建一个；
 * 用户只看到一个 JSON 编辑器，直接填 { tasks: [...] } 就行。
 * 画布上用 {{data.tasks}} 即可引用。
 */
export const DataTab = observer(function DataTab() {
  const screen = editorStore.activeScreen;
  const screenId = screen?.id ?? '';
  const dataSources = screen?.dataSources ?? [];
  const hasDatasource = dataSources.length > 0;

  // 所有 Hooks 必须在条件 return 之前，保证调用顺序一致
  useEffect(() => {
    if (!screenId || hasDatasource) return;
    const dsId = generateId();
    const scenarioId = generateId();
    editorStore.execute({
      type: 'addDataSource',
      params: {
        screenId,
        dataSource: {
          id: dsId,
          name: '页面数据',
          lifecycle: 'static' as const,
          description: '',
          scenarios: [{ id: scenarioId, name: '默认', data: {}, isDefault: true }],
          activeScenarioId: scenarioId,
        },
      },
    });
  }, [screenId, hasDatasource]);

  if (!screen) {
    return <Empty description="暂无活动页面" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const activeDs = dataSources[0];
  if (!activeDs) {
    return (
      <div className="p-3 text-xs text-gray-400 text-center">
        正在初始化数据…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 p-2 text-xs">
      {/* 说明 */}
      <div className="px-1 pb-2 text-[10px] text-gray-500 leading-snug border-b border-gray-100 mb-1">
        在下方编辑当前页面的 Mock 数据（JSON 对象）；展示为<strong>所有已加载数据源</strong>的合并结果，保存时写入<strong>第一个数据源</strong>的当前场景。<br />
        画布上用 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{{data.字段名}}'}</code> 引用。<br />
        例如填 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{ "tasks": [...] }'}</code>，
        画布上写 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{{data.tasks}}'}</code>。
      </div>

      {/* JSON 编辑器 */}
      <PageDataEditor screenId={screen.id} screen={screen} dataSource={activeDs} />

      {/* 接口定义 */}
      <ApiEndpointsSection screenId={screen.id} />

      {/* 预设模板 */}
      <PresetSection screenId={screen.id} dataSource={activeDs} />

      {/* 全局状态变量参考 */}
      <GlobalStatesReferenceSection />
    </div>
  );
});

// ===================================================================
// 页面数据编辑器（合并了旧 JsonEditorSection）
// ===================================================================

/** 合并当前屏所有「已加载」数据源的活跃场景数据，供 JSON 预览（与画布 getActiveData 一致） */
function mergeLoadedScenarioData(screen: Screen): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const ds of screen.dataSources ?? []) {
    if (ds.activePhase !== 'loaded') continue;
    const sc = ds.scenarios.find((s) => s.id === ds.activeScenarioId);
    if (sc?.data && typeof sc.data === 'object' && !Array.isArray(sc.data)) {
      Object.assign(merged, sc.data);
    }
  }
  return merged;
}

type DataEditorView = 'tree' | 'json';

const PageDataEditor = observer(function PageDataEditor({
  screenId,
  screen,
  dataSource,
}: {
  screenId: string;
  screen: Screen;
  dataSource: DataSource;
}) {
  const { message } = AntdApp.useApp();
  const [view, setView] = useState<DataEditorView>('json');
  const activeData = mergeLoadedScenarioData(screen);
  const scenarioId = dataSource.activeScenarioId;
  const [jsonText, setJsonText] = useState(() => JSON.stringify(activeData, null, 2));
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const jsonFocusedRef = useRef(false);
  const dataFingerprint = JSON.stringify(activeData);

  useEffect(() => {
    if (jsonFocusedRef.current) return;
    setJsonText(JSON.stringify(activeData, null, 2));
    setError(null);
  }, [dataSource.id, scenarioId, dataFingerprint]);

  const commitData = useCallback(
    (data: Record<string, unknown>) => {
      if (!scenarioId) return;
      editorStore.execute({
        type: 'updateDataScenario',
        params: { screenId, dataSourceId: dataSource.id, scenarioId, data },
      });
    },
    [screenId, dataSource.id, scenarioId],
  );

  const handleJsonChange = useCallback(
    (value: string) => {
      setJsonText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            setError('根节点须为 JSON 对象 { }');
            return;
          }
          setError(null);
          commitData(parsed as Record<string, unknown>);
        } catch (e) {
          setError((e as Error).message);
        }
      }, 500);
    },
    [commitData],
  );

  const formatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        message.warning('根节点须为 JSON 对象');
        return;
      }
      setJsonText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      message.error('当前内容不是合法 JSON');
    }
  }, [jsonText, message]);

  const copyJson = useCallback(async () => {
    const text = view === 'json' ? jsonText : JSON.stringify(activeData, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  }, [jsonText, message, view, activeData]);

  return (
    <div>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 mb-1">
        <div className="flex rounded border border-gray-200 overflow-hidden text-[10px]">
          <button
            type="button"
            className={`px-2 h-6 ${view === 'json' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setView('json')}
          >
            JSON
          </button>
          <button
            type="button"
            className={`px-2 h-6 ${view === 'tree' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setView('tree')}
          >
            树形
          </button>
        </div>
        {view === 'json' && (
          <button
            type="button"
            className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
            onClick={formatJson}
          >
            格式化
          </button>
        )}
        <button
          type="button"
          className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
          onClick={() => void copyJson()}
        >
          复制
        </button>
      </div>

      {/* 编辑区 */}
      {view === 'json' ? (
        <textarea
          className="w-full h-48 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 resize-y font-mono bg-gray-50 leading-relaxed"
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          onFocus={() => { jsonFocusedRef.current = true; }}
          onBlur={() => { jsonFocusedRef.current = false; }}
          spellCheck={false}
          placeholder='{\n  "tasks": [\n    { "title": "写需求", "status": "进行中" }\n  ]\n}'
        />
      ) : (
        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded px-0.5 py-1 bg-white">
          <JsonTreeEditor data={activeData} onChange={commitData} />
        </div>
      )}
      {error && (
        <div className="mt-1 text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded">{error}</div>
      )}

      {/* 字段提示 */}
      {Object.keys(activeData).length > 0 && (
        <div className="mt-2 text-[10px] text-gray-400">
          <span className="font-medium text-gray-500">可用字段：</span>
          {Object.keys(activeData).map((key) => (
            <code key={key} className="text-purple-600 bg-purple-50 px-1 rounded mx-0.5">
              {'{{data.'}{key}{'}}'}
            </code>
          ))}
        </div>
      )}
    </div>
  );
});

// ===================================================================
// 接口定义 & Mock 场景管理
// ===================================================================

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600 bg-green-50',
  POST: 'text-blue-600 bg-blue-50',
  PUT: 'text-amber-600 bg-amber-50',
  PATCH: 'text-orange-600 bg-orange-50',
  DELETE: 'text-red-600 bg-red-50',
};

const ApiEndpointsSection = observer(function ApiEndpointsSection({
  screenId,
}: {
  screenId: string;
}) {
  const screen = editorStore.activeScreen;
  const apiEndpoints: ApiEndpoint[] = (screen?.apiEndpoints ?? []) as ApiEndpoint[];
  const [open, setOpen] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAddEndpoint = (ep: ApiEndpoint) => {
    editorStore.execute({
      type: 'addApiEndpoint',
      params: { screenId, endpoint: ep },
    } as never);
    setAddingNew(false);
  };

  const handleRemoveEndpoint = (endpointId: string) => {
    editorStore.execute({
      type: 'removeApiEndpoint',
      params: { screenId, endpointId },
    } as never);
    if (expandedId === endpointId) setExpandedId(null);
  };

  return (
    <CollapsibleSection title={`接口定义 (${apiEndpoints.length})`} open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] text-gray-500 leading-snug">
          定义 API 接口并配置 Mock 场景，在事件中使用「发送请求」动作即可调用。
        </p>

        {apiEndpoints.map((ep) => (
          <EndpointCard
            key={ep.definition.id}
            endpoint={ep}
            screenId={screenId}
            expanded={expandedId === ep.definition.id}
            onToggle={() => setExpandedId(expandedId === ep.definition.id ? null : ep.definition.id)}
            onRemove={() => handleRemoveEndpoint(ep.definition.id)}
          />
        ))}

        {addingNew ? (
          <NewEndpointForm
            onSave={handleAddEndpoint}
            onCancel={() => setAddingNew(false)}
          />
        ) : (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-[10px]"
            onClick={() => setAddingNew(true)}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加接口
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
});

/** 新建接口表单 */
function NewEndpointForm({
  onSave,
  onCancel,
}: {
  onSave: (ep: ApiEndpoint) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!path.trim()) return;
    const defId = generateId();
    const scenarioId = generateId();
    onSave({
      definition: {
        id: defId,
        name: name.trim() || `${method} ${path}`,
        method,
        path: path.trim(),
      },
      scenarios: [
        {
          id: scenarioId,
          name: '成功',
          statusCode: 200,
          delay: 300,
          responseBody: { success: true, data: {} },
        },
      ],
      activeScenarioId: scenarioId,
    });
  };

  return (
    <div className="border border-blue-200 rounded bg-blue-50/30 p-2 flex flex-col gap-1.5">
      <div className="text-[10px] font-medium text-blue-600">新建接口</div>
      <div className="flex items-center gap-1">
        <select
          className="h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none w-20 font-mono"
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
        >
          {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
          placeholder="/api/users"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-10 flex-shrink-0">名称:</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
          placeholder="接口名称（可选）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          className="h-6 px-2 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!path.trim()}
        >
          创建
        </button>
        <button
          type="button"
          className="h-6 px-2 border border-gray-200 text-gray-500 rounded text-[10px]"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  );
}

/** 单个接口卡片 */
const EndpointCard = observer(function EndpointCard({
  endpoint,
  screenId,
  expanded,
  onToggle,
  onRemove,
}: {
  endpoint: ApiEndpoint;
  screenId: string;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const def = endpoint.definition;
  const methodColor = METHOD_COLORS[def.method] ?? 'text-gray-600 bg-gray-50';
  const [editingDef, setEditingDef] = useState(false);

  return (
    <div className="border border-gray-200 rounded bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${methodColor}`}>
          {def.method}
        </span>
        <span className="text-xs font-mono text-gray-700 flex-1 truncate">{def.path}</span>
        <span className="text-[10px] text-gray-400 truncate max-w-[60px]">{def.name}</span>
        <span className="text-[10px] text-gray-300">{endpoint.scenarios.length} 场景</span>
        <Popconfirm title="确定删除此接口？" onConfirm={(e) => { e?.stopPropagation(); onRemove(); }} onCancel={(e) => e?.stopPropagation()} okText="删除" cancelText="取消">
          <button
            type="button"
            className="text-gray-300 hover:text-red-400 p-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </Popconfirm>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Body (expanded) */}
      {expanded && (
        <div className="border-t border-gray-100 p-2 flex flex-col gap-2">
          {/* Definition editor */}
          {editingDef ? (
            <EndpointDefEditor
              endpoint={endpoint}
              screenId={screenId}
              onClose={() => setEditingDef(false)}
            />
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">ID: {def.id.slice(0, 8)}</span>
              {def.description && <span className="text-[10px] text-gray-400">— {def.description}</span>}
              <button
                type="button"
                className="text-[10px] text-blue-500 hover:text-blue-700 ml-auto"
                onClick={() => setEditingDef(true)}
              >
                编辑定义
              </button>
            </div>
          )}

          {/* Mock scenarios */}
          <MockScenariosEditor endpoint={endpoint} screenId={screenId} />
        </div>
      )}
    </div>
  );
});

/** 接口定义编辑器 */
function EndpointDefEditor({
  endpoint,
  screenId,
  onClose,
}: {
  endpoint: ApiEndpoint;
  screenId: string;
  onClose: () => void;
}) {
  const def = endpoint.definition;
  const [method, setMethod] = useState<HttpMethod>(def.method);
  const [path, setPath] = useState(def.path);
  const [name, setName] = useState(def.name);
  const [desc, setDesc] = useState(def.description ?? '');
  const [bodyText, setBodyText] = useState(def.body ? JSON.stringify(def.body, null, 2) : '');

  const handleSave = () => {
    const changes: Record<string, unknown> = {};
    if (method !== def.method) changes.method = method;
    if (path !== def.path) changes.path = path;
    if (name !== def.name) changes.name = name;
    if (desc !== (def.description ?? '')) changes.description = desc || undefined;
    if (bodyText.trim()) {
      try {
        changes.body = JSON.parse(bodyText);
      } catch {
        changes.body = bodyText;
      }
    }
    editorStore.execute({
      type: 'updateApiEndpoint',
      params: { screenId, endpointId: def.id, definition: changes },
    } as never);
    onClose();
  };

  return (
    <div className="flex flex-col gap-1.5 border border-blue-200 rounded p-1.5 bg-blue-50/20">
      <div className="flex items-center gap-1">
        <select
          className="h-6 px-1 border border-gray-200 rounded text-[10px] bg-white outline-none w-20 font-mono"
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
        >
          {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-8">名称</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-8">描述</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
          placeholder="可选"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">请求体 (JSON，支持 {'{{expression}}'})</span>
          <textarea
            className="w-full h-20 px-1.5 py-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono resize-y bg-gray-50"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={'{\n  "email": "{{data.email}}"\n}'}
          />
        </div>
      )}
      <div className="flex items-center gap-1 justify-end">
        <button type="button" className="h-5 px-2 bg-blue-500 text-white rounded text-[10px]" onClick={handleSave}>保存</button>
        <button type="button" className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]" onClick={onClose}>取消</button>
      </div>
    </div>
  );
}

/** Mock 场景列表 + 管理 */
const MockScenariosEditor = observer(function MockScenariosEditor({
  endpoint,
  screenId,
}: {
  endpoint: ApiEndpoint;
  screenId: string;
}) {
  const [addingScenario, setAddingScenario] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const endpointId = endpoint.definition.id;

  const handleSwitchScenario = (scenarioId: string) => {
    editorStore.execute({
      type: 'switchMockScenario',
      params: { screenId, endpointId, scenarioId },
    } as never);
  };

  const handleRemoveScenario = (scenarioId: string) => {
    editorStore.execute({
      type: 'removeMockScenario',
      params: { screenId, endpointId, scenarioId },
    } as never);
  };

  const handleAddScenario = (scenario: MockScenario) => {
    editorStore.execute({
      type: 'addMockScenario',
      params: { screenId, endpointId, scenario },
    } as never);
    setAddingScenario(false);
  };

  const handleUpdateScenario = (scenarioId: string, changes: Partial<MockScenario>) => {
    editorStore.execute({
      type: 'updateMockScenario',
      params: { screenId, endpointId, scenarioId, changes },
    } as never);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-medium text-gray-600">Mock 场景</div>

      {endpoint.scenarios.map((sc) => {
        const isActive = sc.id === endpoint.activeScenarioId;
        if (editingId === sc.id) {
          return (
            <ScenarioEditForm
              key={sc.id}
              scenario={sc}
              onSave={(changes) => handleUpdateScenario(sc.id, changes)}
              onCancel={() => setEditingId(null)}
            />
          );
        }
        return (
          <div
            key={sc.id}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] ${
              isActive ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100 bg-white'
            }`}
          >
            <button
              type="button"
              className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white hover:border-blue-400'
              }`}
              onClick={() => handleSwitchScenario(sc.id)}
              title={isActive ? '当前激活' : '切换到此场景'}
            />
            <span className="flex-1 truncate text-gray-700">{sc.name}</span>
            <span className={`font-mono px-1 rounded ${sc.statusCode < 400 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
              {sc.statusCode}
            </span>
            <span className="text-gray-400">{sc.delay}ms</span>
            <button type="button" className="text-gray-400 hover:text-blue-500" onClick={() => setEditingId(sc.id)} title="编辑">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            {endpoint.scenarios.length > 1 && (
              <Popconfirm title="删除此场景？" onConfirm={() => handleRemoveScenario(sc.id)} okText="删除" cancelText="取消">
                <button type="button" className="text-gray-300 hover:text-red-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </Popconfirm>
            )}
          </div>
        );
      })}

      {addingScenario ? (
        <ScenarioEditForm
          onSave={(sc) => handleAddScenario(sc as MockScenario)}
          onCancel={() => setAddingScenario(false)}
          isNew
        />
      ) : (
        <button
          type="button"
          className="w-full py-1 text-[10px] border border-dashed border-gray-200 rounded text-gray-400 hover:text-blue-500 hover:border-blue-300"
          onClick={() => setAddingScenario(true)}
        >
          + 添加场景
        </button>
      )}
    </div>
  );
});

/** 场景编辑/创建表单 */
function ScenarioEditForm({
  scenario,
  onSave,
  onCancel,
  isNew,
}: {
  scenario?: MockScenario;
  onSave: (data: Partial<MockScenario> & { id?: string; name?: string; statusCode?: number; delay?: number; responseBody?: unknown }) => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  const [name, setName] = useState(scenario?.name ?? '');
  const [statusCode, setStatusCode] = useState(scenario?.statusCode ?? 200);
  const [delay, setDelay] = useState(scenario?.delay ?? 300);
  const [isTimeout, setIsTimeout] = useState(scenario?.isTimeout ?? false);
  const [responseText, setResponseText] = useState(
    scenario?.responseBody != null ? JSON.stringify(scenario.responseBody, null, 2) : '{\n  "success": true\n}'
  );
  const [bodyError, setBodyError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
      setBodyError(null);
    } catch (e) {
      setBodyError((e as Error).message);
      return;
    }
    if (isNew) {
      onSave({ id: generateId(), name: name.trim(), statusCode, delay, isTimeout: isTimeout || undefined, responseBody });
    } else {
      onSave({ name: name.trim(), statusCode, delay, isTimeout: isTimeout || undefined, responseBody });
    }
  };

  return (
    <div className="flex flex-col gap-1 border border-blue-200 rounded p-1.5 bg-blue-50/20">
      <div className="text-[10px] font-medium text-blue-600">{isNew ? '新建场景' : '编辑场景'}</div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">名称:</span>
        <input
          type="text"
          className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
          placeholder="例: 成功 / 网络错误"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">状态码:</span>
        <input
          type="number"
          className="w-16 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
          value={statusCode}
          onChange={(e) => setStatusCode(Number(e.target.value))}
        />
        <span className="text-[10px] text-gray-500 w-12 flex-shrink-0 ml-1">延迟:</span>
        <input
          type="number"
          className="w-16 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))}
        />
        <span className="text-[10px] text-gray-400">ms</span>
      </div>
      <label className="flex items-center gap-1 text-[10px] text-gray-500">
        <input
          type="checkbox"
          checked={isTimeout}
          onChange={(e) => setIsTimeout(e.target.checked)}
        />
        模拟超时
      </label>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-500">响应体 (JSON):</span>
        <textarea
          className="w-full h-20 px-1.5 py-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono resize-y bg-gray-50"
          value={responseText}
          onChange={(e) => { setResponseText(e.target.value); setBodyError(null); }}
        />
        {bodyError && <span className="text-[10px] text-red-500">{bodyError}</span>}
      </div>
      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          className="h-5 px-2 bg-blue-500 text-white rounded text-[10px] disabled:opacity-50"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {isNew ? '添加' : '保存'}
        </button>
        <button type="button" className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}

// ===================================================================
// 预设数据模板
// ===================================================================

const PRESETS: { key: string; label: string; desc: string; data: Record<string, unknown> }[] = [
  { key: 'tasks', label: '任务列表', desc: 'tasks 数组 × 3 行', data: { tasks: [{ title: '写需求', status: '进行中' }, { title: '对接接口', status: '待开始' }, { title: '联调', status: '已完成' }] } },
  { key: 'items', label: '通用列表', desc: 'items 数组 × 2 行', data: { items: [{ id: '1', title: '示例项' }, { id: '2', title: '第二项' }] } },
  { key: 'user', label: '用户', desc: '单用户对象', data: { user: { name: '张三', email: 'demo@example.com' } } },
  { key: 'empty', label: '空对象', desc: '空 {}', data: {} },
];

const PresetSection = observer(function PresetSection({
  screenId,
  dataSource,
}: {
  screenId: string;
  dataSource: DataSource;
}) {
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);

  const apply = (data: Record<string, unknown>) => {
    const scenarioId = dataSource.activeScenarioId;
    if (!scenarioId) return;
    editorStore.execute({
      type: 'updateDataScenario',
      params: { screenId, dataSourceId: dataSource.id, scenarioId, data },
    });
    message.success('已填入预设数据');
  };

  return (
    <CollapsibleSection title="快速填充" open={open} onToggle={() => setOpen(!open)}>
      <p className="text-[10px] text-gray-500 mb-1.5">
        点击下方按钮会 <strong>整体替换</strong> 当前数据：
      </p>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:border-blue-400 hover:text-blue-600 transition-colors"
            title={p.desc}
            onClick={() => apply(p.data)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
});

// ===================================================================
// JSON 树形编辑器（复用原有逻辑）
// ===================================================================

function JsonTreeEditor({
  data,
  onChange,
  path = '',
}: {
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
  path?: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState('');

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleValueChange = (key: string, value: string) => {
    const newData = { ...data };
    try {
      newData[key] = JSON.parse(value);
    } catch {
      newData[key] = value;
    }
    onChange(newData);
  };

  const handleDelete = (key: string) => {
    const newData = { ...data };
    delete newData[key];
    onChange(newData);
  };

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    const newData = { ...data, [newKey.trim()]: '' };
    onChange(newData);
    setNewKey('');
  };

  const handleNestedChange = (key: string, nestedData: Record<string, unknown>) => {
    onChange({ ...data, [key]: nestedData });
  };

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {Object.entries(data).map(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;
        const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
        const isArray = Array.isArray(value);

        return (
          <div key={key}>
            <div className="flex items-center gap-1 py-0.5 hover:bg-gray-50 rounded px-1 group">
              {isObject ? (
                <button
                  type="button"
                  className="w-3 text-gray-400 text-[10px]"
                  onClick={() => toggleCollapse(fullPath)}
                >
                  {collapsed.has(fullPath) ? '▸' : '▾'}
                </button>
              ) : (
                <span className="w-3" />
              )}
              <span className="text-purple-600 font-mono text-[10px] min-w-[60px]">{key}</span>
              <span className="text-gray-300 text-[10px]">:</span>
              {isObject ? (
                <span className="text-gray-400 text-[10px]">{`{${Object.keys(value as object).length}}`}</span>
              ) : isArray ? (
                <span className="text-gray-400 text-[10px]">{`[${(value as unknown[]).length}]`}</span>
              ) : (
                <input
                  type="text"
                  className="flex-1 h-5 px-1 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded text-[10px] outline-none font-mono bg-transparent"
                  value={String(value ?? '')}
                  onChange={(e) => handleValueChange(key, e.target.value)}
                />
              )}
              <span className="text-[8px] text-gray-300 font-mono opacity-0 group-hover:opacity-100">{`{{data.${fullPath}}}`}</span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-[10px] p-0.5"
                onClick={() => handleDelete(key)}
              >
                ×
              </button>
            </div>
            {isObject && !collapsed.has(fullPath) && (
              <div className="ml-4 border-l border-gray-100 pl-1">
                <JsonTreeEditor
                  data={value as Record<string, unknown>}
                  onChange={(nd) => handleNestedChange(key, nd)}
                  path={fullPath}
                />
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-1 px-1 py-0.5">
        <span className="w-3" />
        <input
          type="text"
          className="h-5 px-1 border border-dashed border-gray-200 rounded text-[10px] outline-none w-20"
          placeholder="+ 新键名"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddKey(); }}
        />
        {newKey ? (
          <button type="button" className="text-blue-500 text-[10px]" onClick={handleAddKey}>
            添加
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ===================================================================
// 全局状态变量参考
// ===================================================================

const GlobalStatesReferenceSection = observer(function GlobalStatesReferenceSection() {
  const screen = editorStore.activeScreen;
  const [open, setOpen] = useState(false);
  if (!screen) return null;
  const globalStates = screen.domainStates ?? [];
  if (globalStates.length === 0) return null;

  return (
    <CollapsibleSection title="页面状态变量" open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-col gap-1">
        {globalStates.map((gs) => (
          <div key={gs.name} className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 bg-white">
            <code className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded font-mono">
              {gs.name}
            </code>
            <span className="text-gray-400">=</span>
            <code className="text-[10px] text-green-600 bg-green-50 px-1 rounded font-mono">
              {editorStore.currentGlobalStates[gs.name] ?? gs.defaultValue}
            </code>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
});

// ===================================================================
// 通用折叠组件
// ===================================================================

interface CollapsibleSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900"
        onClick={onToggle}
      >
        <span>{title}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}
