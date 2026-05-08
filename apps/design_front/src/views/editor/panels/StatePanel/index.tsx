/**
 * StatePanel — 屏幕级运行时状态编辑面板（v2 state.view + state.data）
 *
 * 关联 RFC：design_docs/03-tech/state-action-expression-rfc.md §3.1
 * D.1 任务：替代 v1 的 DomainStatePanel / EnvironmentStatePanel。
 *
 * 两块编辑区：
 *   1. state.view — UI 临时态变量（输入草稿、当前 tab、modal 开关等）
 *      - 可增删变量（name / label / defaultValue / enum）
 *      - 可切换"预览值"用于设计态下查看不同 UI
 *      走 op：screenState.addViewVariable / removeViewVariable /
 *             updateViewVariable / setViewPreview
 *
 *   2. state.data — 屏幕级 data 初始常量（dataSource 通常会覆盖，这里仅加手动常量）
 *      走 op：screenState.setDataInit / removeDataInit
 *
 * 使用：在 RightPanel 的"高级"或"页面"入口挂载即可。
 */

import { useState, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type {
  ViewVariableDef,
  ScreenStateInit,
} from '@globallink/design-schema';
import { CollapsibleSection } from '../RightPanel/CollapsibleSection';

// ===== 入口 =====

export const StatePanel = observer(function StatePanel() {
  const screen = editorStore.activeScreen;
  if (!screen) {
    return (
      <div className="p-3 text-[11px] text-gray-400 text-center">
        暂无活动页面
      </div>
    );
  }
  const stateInit: ScreenStateInit = screen.stateInit ?? {};

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <div className="px-2 pb-2 text-[10px] text-gray-500 leading-snug border-b border-gray-100 mb-1">
        页面状态分两层：
        <strong className="text-gray-700">view</strong> = UI 临时态（可绑定输入/切换），
        <strong className="text-gray-700">data</strong> = 业务数据初始值（通常由数据源覆盖）。
        在画布表达式里用 <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{{ state.view.x }}'}</code>
        / <code className="text-purple-600 bg-purple-50 px-0.5 rounded">{'{{ state.data.y }}'}</code> 引用。
      </div>

      <ViewVariablesSection
        screenId={screen.id}
        variables={stateInit.view ?? {}}
      />

      <DataInitSection
        screenId={screen.id}
        data={stateInit.data ?? {}}
      />
    </div>
  );
});

// ===== state.view 变量区 =====

const ViewVariablesSection = observer(function ViewVariablesSection({
  screenId,
  variables,
}: {
  screenId: string;
  variables: Record<string, ViewVariableDef>;
}) {
  const [adding, setAdding] = useState(false);
  const names = useMemo(() => Object.keys(variables), [variables]);

  return (
    <CollapsibleSection id="state-view" title={`view 变量 (${names.length})`} defaultOpen>
      <div className="flex flex-col gap-1 px-1 pb-1">
        {names.length === 0 && !adding && (
          <div className="text-[10px] text-gray-400 text-center py-2">
            还没有 view 变量
          </div>
        )}

        {names.map((name) => (
          <ViewVariableRow
            key={name}
            screenId={screenId}
            variable={variables[name]!}
          />
        ))}

        {adding ? (
          <NewViewVariableForm
            screenId={screenId}
            existingNames={names}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            className="w-full py-1 text-[10px] border border-dashed border-gray-200 rounded text-gray-400 hover:text-blue-500 hover:border-blue-300"
            onClick={() => setAdding(true)}
          >
            + 新增 view 变量
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
});

/** 单行 view 变量（展示 + 内联编辑预览值 + 展开编辑 + 删除） */
const ViewVariableRow = observer(function ViewVariableRow({
  screenId,
  variable,
}: {
  screenId: string;
  variable: ViewVariableDef;
}) {
  const [editing, setEditing] = useState(false);

  const previewDisplay = formatValue(variable.previewValue ?? variable.defaultValue);

  const handleRemove = () => {
    editorStore.execute({
      type: 'screenState.removeViewVariable',
      params: { screenId, name: variable.name },
    });
  };

  const handlePreviewChange = (text: string) => {
    const parsed = parseUserInput(text);
    editorStore.execute({
      type: 'screenState.setViewPreview',
      params: { screenId, name: variable.name, previewValue: parsed },
    });
  };

  if (editing) {
    return (
      <EditViewVariableForm
        screenId={screenId}
        variable={variable}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded border border-gray-100 bg-white hover:border-gray-200">
      <code className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded font-mono shrink-0">
        {variable.name}
      </code>
      {variable.label && (
        <span className="text-[10px] text-gray-500 truncate">{variable.label}</span>
      )}
      <span className="text-gray-300 text-[10px]">=</span>
      <input
        type="text"
        className="flex-1 min-w-0 h-5 px-1 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded text-[10px] outline-none font-mono bg-transparent"
        defaultValue={previewDisplay}
        onBlur={(e) => handlePreviewChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        title="预览值（仅编辑期）；回车或失焦提交"
      />
      <button
        type="button"
        className="text-gray-400 hover:text-blue-500 p-0.5"
        title="编辑定义"
        onClick={() => setEditing(true)}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        type="button"
        className="text-gray-300 hover:text-red-400 p-0.5"
        title="删除"
        onClick={handleRemove}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

function NewViewVariableForm({
  screenId,
  existingNames,
  onDone,
}: {
  screenId: string;
  existingNames: string[];
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [defaultText, setDefaultText] = useState('""');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('变量名不能为空'); return; }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      setError('变量名只能含字母/数字/_，且不以数字开头');
      return;
    }
    if (existingNames.includes(trimmed)) {
      setError('已有同名变量');
      return;
    }
    const variable: ViewVariableDef = {
      name: trimmed,
      label: label.trim() || undefined,
      defaultValue: parseUserInput(defaultText),
    };
    editorStore.execute({
      type: 'screenState.addViewVariable',
      params: { screenId, variable },
    });
    onDone();
  };

  return (
    <div className="flex flex-col gap-1 border border-blue-200 rounded p-1.5 bg-blue-50/20">
      <div className="text-[10px] font-medium text-blue-600">新增 view 变量</div>
      <LabeledInput label="名称" value={name} onChange={setName} placeholder="例: inputDraft" mono />
      <LabeledInput label="标签" value={label} onChange={setLabel} placeholder="可选" />
      <LabeledInput label="默认值" value={defaultText} onChange={setDefaultText} placeholder='例: "" / 0 / false / []' mono />
      {error && <div className="text-[10px] text-red-500">{error}</div>}
      <FormActions primaryLabel="添加" onPrimary={handleSubmit} onCancel={onDone} />
    </div>
  );
}

function EditViewVariableForm({
  screenId,
  variable,
  onDone,
}: {
  screenId: string;
  variable: ViewVariableDef;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(variable.label ?? '');
  const [defaultText, setDefaultText] = useState(formatValue(variable.defaultValue));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const patch: Partial<ViewVariableDef> = {
        label: label.trim() || undefined,
        defaultValue: parseUserInput(defaultText),
      };
      editorStore.execute({
        type: 'screenState.updateViewVariable',
        params: { screenId, name: variable.name, patch },
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-1 border border-blue-200 rounded p-1.5 bg-blue-50/20">
      <div className="text-[10px] font-medium text-blue-600">编辑 view 变量 · {variable.name}</div>
      <LabeledInput label="标签" value={label} onChange={setLabel} placeholder="可选" />
      <LabeledInput label="默认值" value={defaultText} onChange={setDefaultText} mono />
      {error && <div className="text-[10px] text-red-500">{error}</div>}
      <FormActions primaryLabel="保存" onPrimary={handleSave} onCancel={onDone} />
    </div>
  );
}

// ===== state.data 初始值区 =====

const DataInitSection = observer(function DataInitSection({
  screenId,
  data,
}: {
  screenId: string;
  data: Record<string, unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const keys = useMemo(() => Object.keys(data), [data]);

  return (
    <CollapsibleSection id="state-data" title={`data 初始值 (${keys.length})`} defaultOpen={false}>
      <div className="flex flex-col gap-1 px-1 pb-1">
        <div className="px-1 text-[10px] text-gray-400 leading-snug">
          数据源加载后会覆盖同名 key；此处仅用于在没有数据源时放置常量。
        </div>
        {keys.length === 0 && !adding && (
          <div className="text-[10px] text-gray-400 text-center py-2">（空）</div>
        )}

        {keys.map((key) => (
          <DataInitRow key={key} screenId={screenId} keyName={key} value={data[key]} />
        ))}

        {adding ? (
          <NewDataInitForm
            screenId={screenId}
            existingKeys={keys}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            className="w-full py-1 text-[10px] border border-dashed border-gray-200 rounded text-gray-400 hover:text-blue-500 hover:border-blue-300"
            onClick={() => setAdding(true)}
          >
            + 新增 data 初始项
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
});

const DataInitRow = observer(function DataInitRow({
  screenId,
  keyName,
  value,
}: {
  screenId: string;
  keyName: string;
  value: unknown;
}) {
  const display = formatValue(value);

  const handleChange = (text: string) => {
    const parsed = parseUserInput(text);
    editorStore.execute({
      type: 'screenState.setDataInit',
      params: { screenId, key: keyName, value: parsed },
    });
  };

  const handleRemove = () => {
    editorStore.execute({
      type: 'screenState.removeDataInit',
      params: { screenId, key: keyName },
    });
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded border border-gray-100 bg-white hover:border-gray-200">
      <code className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded font-mono shrink-0">
        {keyName}
      </code>
      <span className="text-gray-300 text-[10px]">=</span>
      <input
        type="text"
        className="flex-1 min-w-0 h-5 px-1 border border-transparent hover:border-gray-200 focus:border-blue-400 rounded text-[10px] outline-none font-mono bg-transparent"
        defaultValue={display}
        onBlur={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      <button
        type="button"
        className="text-gray-300 hover:text-red-400 p-0.5"
        title="删除"
        onClick={handleRemove}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

function NewDataInitForm({
  screenId,
  existingKeys,
  onDone,
}: {
  screenId: string;
  existingKeys: string[];
  onDone: () => void;
}) {
  const [keyName, setKeyName] = useState('');
  const [valueText, setValueText] = useState('""');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = keyName.trim();
    if (!trimmed) { setError('key 不能为空'); return; }
    if (existingKeys.includes(trimmed)) { setError('已有同名 key'); return; }
    editorStore.execute({
      type: 'screenState.setDataInit',
      params: { screenId, key: trimmed, value: parseUserInput(valueText) },
    });
    onDone();
  };

  return (
    <div className="flex flex-col gap-1 border border-emerald-200 rounded p-1.5 bg-emerald-50/20">
      <div className="text-[10px] font-medium text-emerald-600">新增 data 初始项</div>
      <LabeledInput label="key" value={keyName} onChange={setKeyName} placeholder="例: counter" mono />
      <LabeledInput label="值" value={valueText} onChange={setValueText} placeholder='"" / 0 / [] / { }' mono />
      {error && <div className="text-[10px] text-red-500">{error}</div>}
      <FormActions primaryLabel="添加" onPrimary={handleSubmit} onCancel={onDone} />
    </div>
  );
}

// ===== 工具组件 =====

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">{label}:</span>
      <input
        type="text"
        className={`flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 ${mono ? 'font-mono' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FormActions({
  primaryLabel,
  onPrimary,
  onCancel,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        type="button"
        className="h-5 px-2 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600"
        onClick={onPrimary}
      >
        {primaryLabel}
      </button>
      <button
        type="button"
        className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]"
        onClick={onCancel}
      >
        取消
      </button>
    </div>
  );
}

// ===== 用户输入 ↔ JSON 值互转 =====

/** 优先尝试 JSON.parse，失败则当作字符串字面量返回 */
function parseUserInput(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    // 裸字符串：脱去首尾引号？—— 不做，原样当字符串
    return text;
  }
}

/** 值 → 输入框展示文本：字符串加引号，复杂类型 JSON 序列化 */
function formatValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return '""';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default StatePanel;
