import { useState, useCallback, useRef, useEffect } from 'react';
import { App as AntdApp, Empty, Popconfirm, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { generateId } from '@globallink/design-schema';
import type { DataSet } from '@globallink/design-schema';
import { ApiError, getErrorMessage } from '@/api/client';
import { getSnapshotJob, postGenerateSnapshots } from '@/api/snapshots';

/** W6-051：一键替换根数据（用于列表绑定 / 演示） */
const DATA_PRESETS: { key: string; label: string; description: string; data: Record<string, unknown> }[] = [
  { key: 'empty', label: '空', description: '根对象 {}', data: {} },
  {
    key: 'items',
    label: '列表 items',
    description: '双列表项，配合 {{data.items}} 列表绑定',
    data: { items: [{ id: '1', title: '示例项' }, { id: '2', title: '第二项' }] },
  },
  {
    key: 'user',
    label: 'user',
    description: '单用户对象',
    data: { user: { name: '张三', email: 'demo@example.com' } },
  },
  {
    key: 'rows',
    label: 'rows',
    description: '表格行数组',
    data: { rows: [{ name: 'A', value: 1 }, { name: 'B', value: 2 }] },
  },
  {
    key: 'mixed',
    label: '混合',
    description: 'meta + items',
    data: { meta: { page: 1, total: 2 }, items: [{ title: '第一项' }, { title: '第二项' }] },
  },
  {
    key: 'error',
    label: '异常',
    description: 'error + empty list，用于空态/错误演示',
    data: { error: { code: 'DEMO', message: '演示错误' }, items: [] },
  },
];

/**
 * Task 3.4 — Data Tab
 *
 * Section 1: Dataset Selector — dropdown + active badge + add/delete
 * Section 2: Data editor — 树形 / JSON 切换；JSON 模式含格式化/压缩/复制（W6-051）
 * Section 2b: Preset templates — replace root data (W6-051)
 * Section 4: Global State Variables — list with current values (read-only reference)
 */
export const DataTab = observer(function DataTab() {
  const screen = editorStore.activeScreen;

  if (!screen) {
    return <Empty description="暂无活动页面" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const dataSets = screen.dataSets ?? [];
  const activeDataSetId = screen.activeDataSetId ?? '';
  const activeDataSet = dataSets.find((ds) => ds.id === activeDataSetId);

  return (
    <div className="flex flex-col gap-0.5 p-2 text-xs">
      <DataSetSelector
        screenId={screen.id}
        dataSets={dataSets}
        activeDataSetId={activeDataSetId}
      />

      {activeDataSet ? (
        <>
          <DataPresetSection screenId={screen.id} dataSet={activeDataSet} />
          <JsonEditorSection
            screenId={screen.id}
            dataSet={activeDataSet}
          />
        </>
      ) : dataSets.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-gray-400 text-[10px] px-2 text-center">
          暂无数据集，请在上方「添加数据集」中新建。
        </div>
      ) : null}

      <SnapshotJobsSection />
      <GlobalStatesReferenceSection />
    </div>
  );
});

// ===================================================================
// Section 1: Dataset Selector
// ===================================================================

interface DataSetSelectorProps {
  screenId: string;
  dataSets: DataSet[];
  activeDataSetId: string;
}

const DataSetSelector = observer(function DataSetSelector({
  screenId,
  dataSets,
  activeDataSetId,
}: DataSetSelectorProps) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const handleAdd = () => {
    const name = newName.trim() || `数据集 ${dataSets.length + 1}`;
    const id = generateId();
    editorStore.execute({
      type: 'addDataSet',
      params: {
        screenId,
        dataSet: { id, name, data: {}, description: '' },
      },
    });
    // Auto-switch to the new dataset
    if (dataSets.length === 0) {
      editorStore.execute({
        type: 'switchDataSet',
        params: { screenId, dataSetId: id },
      });
    }
    setAdding(false);
    setNewName('');
  };

  const handleSwitch = (dataSetId: string) => {
    if (dataSetId === activeDataSetId) return;
    editorStore.execute({
      type: 'switchDataSet',
      params: { screenId, dataSetId },
    });
  };

  const handleDelete = (dataSetId: string) => {
    editorStore.execute({
      type: 'removeDataSet',
      params: { screenId, dataSetId },
    });
  };

  const commitRename = (dataSetId: string) => {
    const next = renameDraft.trim();
    setRenamingId(null);
    if (!next) return;
    const ds = dataSets.find((d) => d.id === dataSetId);
    if (ds && next !== ds.name) {
      editorStore.execute({
        type: 'updateDataSet',
        params: { screenId, dataSetId, name: next },
      });
    }
  };

  return (
    <CollapsibleSection title="数据集" open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-col gap-1">
        {dataSets.map((ds) => {
          const isActive = ds.id === activeDataSetId;
          return (
            <div
              key={ds.id}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded border cursor-pointer transition-all ${
                isActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => handleSwitch(ds.id)}
            >
              {renamingId === ds.id ? (
                <input
                  type="text"
                  className="flex-1 min-w-0 h-5 px-1 border border-blue-300 rounded text-[11px] outline-none"
                  value={renameDraft}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename(ds.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === 'Escape') {
                      setRenamingId(null);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span
                  className={`flex-1 truncate ${isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(ds.id);
                    setRenameDraft(ds.name);
                  }}
                  title="双击重命名"
                >
                  {ds.name}
                </span>
              )}
              {isActive && renamingId !== ds.id && (
                <span className="text-[10px] text-blue-500 bg-blue-100 px-1 rounded flex-shrink-0">
                  当前
                </span>
              )}
              <span className="text-[10px] text-gray-400 flex-shrink-0">
                {Object.keys(ds.data).length} 项
              </span>
              <button
                type="button"
                className="text-gray-400 hover:text-blue-500 p-0.5 flex-shrink-0"
                title="重命名"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingId(ds.id);
                  setRenameDraft(ds.name);
                }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <Popconfirm
                title="确定删除该数据集？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(ds.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="删除"
                cancelText="取消"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Popconfirm>
            </div>
          );
        })}

        {adding && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              className="flex-1 h-6 px-1.5 border border-blue-300 rounded text-xs outline-none focus:border-blue-500"
              placeholder="数据集名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              autoFocus
            />
            <button
              type="button"
              className="h-6 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              onClick={handleAdd}
            >
              确定
            </button>
            <button
              type="button"
              className="h-6 px-2 border border-gray-200 text-gray-500 rounded text-xs hover:bg-gray-50"
              onClick={() => { setAdding(false); setNewName(''); }}
            >
              取消
            </button>
          </div>
        )}
      </div>

      {!adding && (
        <button
          type="button"
          className="mt-1 w-full flex items-center justify-center gap-1 py-1 border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          onClick={() => setAdding(true)}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加数据集
        </button>
      )}
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 2b: Preset data templates (W6-051)
// ===================================================================

const DataPresetSection = observer(function DataPresetSection({
  screenId,
  dataSet,
}: {
  screenId: string;
  dataSet: DataSet;
}) {
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(true);

  const apply = (data: Record<string, unknown>) => {
    editorStore.execute({
      type: 'updateDataSet',
      params: { screenId, dataSetId: dataSet.id, data },
    });
    message.success('已应用模板');
  };

  return (
    <CollapsibleSection title="预设数据模板" open={open} onToggle={() => setOpen(!open)}>
      <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">
        将<strong>整份</strong>数据集替换为预设结构（需确认）。列表绑定可配合「列表 items」模板。
      </p>
      <div className="flex flex-wrap gap-1">
        {DATA_PRESETS.map((p) => (
          <Popconfirm
            key={p.key}
            title={`用「${p.label}」替换当前数据集？`}
            description={p.description}
            onConfirm={() => apply(p.data)}
            okText="替换"
            cancelText="取消"
          >
            <button
              type="button"
              className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:border-cyan-400 hover:text-cyan-700 transition-colors"
              title={p.description}
            >
              {p.label}
            </button>
          </Popconfirm>
        ))}
      </div>
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 2: Data editor (tree + JSON)
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddKey();
          }}
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

interface JsonEditorSectionProps {
  screenId: string;
  dataSet: DataSet;
}

type DataEditorView = 'tree' | 'json';

function JsonEditorSection({ screenId, dataSet }: JsonEditorSectionProps) {
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(true);
  const [view, setView] = useState<DataEditorView>('tree');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(dataSet.data, null, 2));
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const jsonFocusedRef = useRef(false);
  const dataFingerprint = JSON.stringify(dataSet.data);

  useEffect(() => {
    if (jsonFocusedRef.current) return;
    setJsonText(JSON.stringify(dataSet.data, null, 2));
    setError(null);
  }, [dataSet.id, dataFingerprint]);

  const handleChange = useCallback(
    (value: string) => {
      setJsonText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            setError('root-object');
            return;
          }
          setError(null);
          editorStore.execute({
            type: 'updateDataSet',
            params: { screenId, dataSetId: dataSet.id, data: parsed },
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }, 500);
    },
    [screenId, dataSet.id],
  );

  const commitTreeData = useCallback(
    (newData: Record<string, unknown>) => {
      editorStore.execute({
        type: 'updateDataSet',
        params: { screenId, dataSetId: dataSet.id, data: newData },
      });
    },
    [screenId, dataSet.id],
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

  const minifyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        message.warning('根节点须为 JSON 对象');
        return;
      }
      setJsonText(JSON.stringify(parsed));
      setError(null);
    } catch {
      message.error('当前内容不是合法 JSON');
    }
  }, [jsonText, message]);

  const copyJson = useCallback(async () => {
    const text = view === 'json' ? jsonText : JSON.stringify(dataSet.data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  }, [jsonText, message, view, dataSet.data]);

  return (
    <CollapsibleSection title="数据编辑" open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-wrap items-center gap-1 mb-1">
        <div className="flex rounded border border-gray-200 overflow-hidden text-[10px]">
          <button
            type="button"
            className={`px-2 h-6 ${view === 'tree' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setView('tree')}
          >
            树形
          </button>
          <button
            type="button"
            className={`px-2 h-6 ${view === 'json' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setView('json')}
          >
            JSON
          </button>
        </div>
        {view === 'json' ? (
          <>
            <button
              type="button"
              className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
              onClick={formatJson}
            >
              格式化
            </button>
            <button
              type="button"
              className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
              onClick={minifyJson}
            >
              压缩
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
          onClick={() => void copyJson()}
        >
          复制
        </button>
      </div>
      {view === 'tree' ? (
        <div className="max-h-60 overflow-y-auto border border-gray-100 rounded px-0.5 py-1 bg-white">
          <JsonTreeEditor data={dataSet.data} onChange={commitTreeData} />
        </div>
      ) : (
        <textarea
          className="w-full h-40 px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 resize-y font-mono bg-gray-50 leading-relaxed"
          value={jsonText}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            jsonFocusedRef.current = true;
          }}
          onBlur={() => {
            jsonFocusedRef.current = false;
          }}
          spellCheck={false}
        />
      )}
      {view === 'json' && error ? (
        <div className="mt-1 text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded">
          {error === 'root-object' ? '根节点须为 JSON 对象' : error}
        </div>
      ) : null}
    </CollapsibleSection>
  );
}

// ===================================================================
// Section 3b: Server snapshot jobs (design-api snapshots module)
// ===================================================================

const SnapshotJobsSection = observer(function SnapshotJobsSection() {
  const { message } = AntdApp.useApp();
  const project = editorStore.project;
  const projectId = project?.id;
  const screens = project?.screens ?? [];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [jobSummary, setJobSummary] = useState<string | null>(null);

  const run = async () => {
    if (!projectId || screens.length === 0) {
      message.warning('请先加载含页面的项目');
      return;
    }
    setLoading(true);
    setJobSummary(null);
    try {
      const { jobId } = await postGenerateSnapshots(projectId, {
        screenIds: screens.map((s) => s.id),
        format: 'png',
      });
      setLastJobId(jobId);
      const job = await getSnapshotJob(projectId, jobId);
      const lines = job.results.map(
        (r) => `${r.screenId.slice(0, 8)}… → ${r.url} (${r.width}×${r.height})`,
      );
      setJobSummary(lines.join('\n'));
      message.success('快照任务已创建（服务端 MVP 为占位 URL）');
    } catch (e) {
      message.error(e instanceof ApiError ? getErrorMessage(e.body) : e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CollapsibleSection title="全景截图任务" open={open} onToggle={() => setOpen(!open)}>
      <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">
        调用后端 <code className="text-purple-600">POST …/snapshots/generate</code>，为当前项目全部页面创建截图任务（当前为占位结果，后续可接 Puppeteer）。
      </p>
      <Button type="primary" size="small" loading={loading} disabled={!projectId} onClick={() => void run()}>
        生成全部页面快照
      </Button>
      {lastJobId && (
        <div className="mt-2 text-[10px] text-gray-600 font-mono break-all">
          jobId: {lastJobId}
        </div>
      )}
      {jobSummary && (
        <pre className="mt-1 max-h-32 overflow-y-auto text-[10px] text-gray-700 bg-gray-50 rounded p-1.5 whitespace-pre-wrap">
          {jobSummary}
        </pre>
      )}
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 4: Global States Reference
// ===================================================================

const GlobalStatesReferenceSection = observer(function GlobalStatesReferenceSection() {
  const screen = editorStore.activeScreen;
  const [open, setOpen] = useState(false);

  if (!screen) return null;
  const globalStates = screen.globalStates ?? [];

  if (globalStates.length === 0) return null;

  return (
    <CollapsibleSection title="全局状态变量" open={open} onToggle={() => setOpen(!open)}>
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
// Shared: Collapsible Section
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
