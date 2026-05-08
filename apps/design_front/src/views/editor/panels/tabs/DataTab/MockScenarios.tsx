/**
 * MockScenariosSection — api 数据源的 mock 场景 CRUD
 *
 * RFC §2.2：mock.scenarios 是 v2 中真正的数据来源，由
 * EffectExecutor.MockDriver 在预览期读取 activeScenarioId 的 responseBody。
 */

import { useState } from 'react';
import { App as AntdApp, Popconfirm } from 'antd';
import { observer } from 'mobx-react-lite';
import type { ApiDataSource, MockScenario } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';
import { formatJsonBlock, makeDefaultMockScenario } from './helpers';

interface Props {
  screenId: string;
  dataSource: ApiDataSource;
}

export const MockScenariosSection = observer(function MockScenariosSection({
  screenId,
  dataSource,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const mock = dataSource.mock;
  const scenarios = mock?.scenarios ?? [];
  const activeId = mock?.activeScenarioId ?? '';

  const handleAdd = (scenario: MockScenario) => {
    editorStore.execute({
      type: 'dataSource.addMockScenario',
      params: { screenId, dataSourceId: dataSource.id, scenario },
    });
    setAddingNew(false);
  };

  const handleUpdate = (scenarioId: string, changes: Partial<MockScenario>) => {
    editorStore.execute({
      type: 'dataSource.updateMockScenario',
      params: { screenId, dataSourceId: dataSource.id, scenarioId, changes },
    });
    setEditingId(null);
  };

  const handleRemove = (scenarioId: string) => {
    editorStore.execute({
      type: 'dataSource.removeMockScenario',
      params: { screenId, dataSourceId: dataSource.id, scenarioId },
    });
  };

  const handleSwitch = (scenarioId: string) => {
    editorStore.execute({
      type: 'dataSource.switchMockScenario',
      params: { screenId, dataSourceId: dataSource.id, scenarioId },
    });
  };

  return (
    <div className="flex flex-col gap-1 border border-gray-200 rounded bg-white p-2">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium text-gray-600">Mock 场景 ({scenarios.length})</span>
        <span className="ml-auto text-[9px] text-gray-400">编辑器默认走 mock</span>
      </div>

      {scenarios.map((sc) =>
        editingId === sc.id ? (
          <ScenarioForm
            key={sc.id}
            scenario={sc}
            onSave={(changes) => handleUpdate(sc.id, changes)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <ScenarioRow
            key={sc.id}
            scenario={sc}
            isActive={sc.id === activeId}
            canRemove={scenarios.length > 1}
            onSwitch={() => handleSwitch(sc.id)}
            onEdit={() => setEditingId(sc.id)}
            onRemove={() => handleRemove(sc.id)}
          />
        ),
      )}

      {addingNew ? (
        <ScenarioForm
          isNew
          onSave={(scenario) => handleAdd(scenario as MockScenario)}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <button
          type="button"
          className="w-full py-1 text-[10px] border border-dashed border-gray-200 rounded text-gray-400 hover:text-blue-500 hover:border-blue-300"
          onClick={() => setAddingNew(true)}
        >
          + 添加场景
        </button>
      )}
    </div>
  );
});

function ScenarioRow({
  scenario,
  isActive,
  canRemove,
  onSwitch,
  onEdit,
  onRemove,
}: {
  scenario: MockScenario;
  isActive: boolean;
  canRemove: boolean;
  onSwitch: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const statusColor = scenario.statusCode >= 400
    ? 'text-red-600 bg-red-50'
    : 'text-green-600 bg-green-50';
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] ${
        isActive ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100 bg-white'
      }`}
    >
      <button
        type="button"
        className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
          isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white hover:border-blue-400'
        }`}
        onClick={onSwitch}
        title={isActive ? '当前激活' : '切换到此场景'}
      />
      <span className="flex-1 truncate text-gray-700">{scenario.name}</span>
      <span className={`font-mono px-1 rounded ${statusColor}`}>
        {scenario.statusCode}
      </span>
      <span className="text-gray-400">{scenario.delay}ms</span>
      {scenario.isTimeout && (
        <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded">timeout</span>
      )}
      <button type="button" className="text-gray-400 hover:text-blue-500" onClick={onEdit} title="编辑">
        ✎
      </button>
      {canRemove && (
        <Popconfirm title="删除此场景？" onConfirm={onRemove} okText="删除" cancelText="取消">
          <button type="button" className="text-gray-300 hover:text-red-400">×</button>
        </Popconfirm>
      )}
    </div>
  );
}

function ScenarioForm({
  scenario,
  onSave,
  onCancel,
  isNew,
}: {
  scenario?: MockScenario;
  onSave: (data: MockScenario | Partial<MockScenario>) => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  const base = scenario ?? makeDefaultMockScenario();
  const { message } = AntdApp.useApp();
  const [name, setName] = useState(base.name);
  const [statusCode, setStatusCode] = useState(base.statusCode);
  const [delay, setDelay] = useState(base.delay);
  const [isTimeout, setIsTimeout] = useState(base.isTimeout ?? false);
  const [bodyText, setBodyText] = useState(formatJsonBlock(base.responseBody));

  const handleSave = () => {
    if (!name.trim()) {
      message.warning('请输入场景名称');
      return;
    }
    let responseBody: unknown;
    try {
      responseBody = bodyText.trim() ? JSON.parse(bodyText) : {};
    } catch (e) {
      message.error(`响应体 JSON 解析失败：${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const payload = {
      name: name.trim(),
      statusCode,
      delay,
      isTimeout: isTimeout || undefined,
      responseBody,
    };
    if (isNew) {
      onSave({ id: base.id, ...payload });
    } else {
      onSave(payload);
    }
  };

  return (
    <div className="flex flex-col gap-1 border border-blue-200 rounded p-1.5 bg-blue-50/20">
      <div className="text-[10px] font-medium text-blue-600">
        {isNew ? '新建场景' : `编辑场景 · ${base.name}`}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 shrink-0">名称:</span>
        <input
          type="text"
          className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 成功 / 网络错误"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 w-12 shrink-0">状态码:</span>
        <input
          type="number"
          className="w-20 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
          value={statusCode}
          onChange={(e) => setStatusCode(Number(e.target.value))}
        />
        <span className="text-[10px] text-gray-500 w-12 shrink-0 ml-1">延迟:</span>
        <input
          type="number"
          className="w-20 h-5 px-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono"
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))}
        />
        <span className="text-[10px] text-gray-400">ms</span>
      </div>
      <label className="flex items-center gap-1 text-[10px] text-gray-600">
        <input
          type="checkbox"
          checked={isTimeout}
          onChange={(e) => setIsTimeout(e.target.checked)}
        />
        模拟超时（走 onError）
      </label>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-gray-500">响应体 (JSON)</span>
        <textarea
          className="w-full h-24 px-1.5 py-1 border border-gray-200 rounded text-[10px] outline-none focus:border-blue-400 font-mono resize-y bg-gray-50"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          className="h-5 px-2 bg-blue-500 text-white rounded text-[10px] disabled:opacity-40"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {isNew ? '添加' : '保存'}
        </button>
        <button
          type="button"
          className="h-5 px-2 border border-gray-200 text-gray-500 rounded text-[10px]"
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  );
}
