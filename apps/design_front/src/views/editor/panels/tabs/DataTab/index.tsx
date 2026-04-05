import { useState, useCallback, useRef, useEffect } from 'react';
import { App as AntdApp, Empty, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { generateId } from '@globallink/design-schema';
import type { DataSource } from '@globallink/design-schema';

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
        在下方编辑当前页面的 Mock 数据（JSON 对象）。<br />
        画布上用 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{{data.字段名}}'}</code> 引用。<br />
        例如填 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{ "tasks": [...] }'}</code>，
        画布上写 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{{data.tasks}}'}</code>。
      </div>

      {/* JSON 编辑器 */}
      <PageDataEditor screenId={screen.id} dataSource={activeDs} />

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

function getActiveData(ds: DataSource): Record<string, unknown> {
  const scenarios = ds.scenarios ?? [];
  return scenarios.find((s) => s.id === ds.activeScenarioId)?.data ?? {};
}

type DataEditorView = 'tree' | 'json';

const PageDataEditor = observer(function PageDataEditor({
  screenId,
  dataSource,
}: {
  screenId: string;
  dataSource: DataSource;
}) {
  const { message } = AntdApp.useApp();
  const [view, setView] = useState<DataEditorView>('json');
  const activeData = getActiveData(dataSource);
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
