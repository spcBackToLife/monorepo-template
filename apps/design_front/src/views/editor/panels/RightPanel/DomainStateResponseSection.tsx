import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Popconfirm } from 'antd';
import { findNodeInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';

/**
 * 状态响应配置 — 放在「高级」section 中。
 *
 * 允许节点绑定到领域状态变量（例如：当 taskStatus=done 时 → 覆盖样式/可见性）。
 * 这是低频高级功能，不与日常编辑混在一起。
 */
export const DomainStateResponseSection = observer(function DomainStateResponseSection({
  nodeId,
}: {
  nodeId: string;
}) {
  const node = findNodeInScreens(editorStore.screens, nodeId);
  const screen = editorStore.activeScreen;
  const bindings = node?.domainStateBindings ?? [];
  const screenDomainStates = screen?.domainStates ?? [];

  const [adding, setAdding] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const selectedVar = screenDomainStates.find((v) => v.name === newVarName);

  const handleAddBinding = () => {
    if (!newVarName || !newVarValue) return;
    editorStore.execute({
      type: 'addDomainStateBinding',
      params: {
        nodeId,
        binding: { variableName: newVarName, value: newVarValue },
      },
    });
    setAdding(false);
    setNewVarName('');
    setNewVarValue('');
  };

  const handleDeleteBinding = (variableName: string, value: string) => {
    editorStore.execute({
      type: 'removeDomainStateBinding',
      params: { nodeId, variableName, value },
    });
  };

  const handleUpdateVisibility = (variableName: string, value: string, visible: boolean | undefined) => {
    editorStore.execute({
      type: 'updateDomainStateBinding',
      params: { nodeId, variableName, value, patch: { visible } },
    });
  };

  const bindingKey = (b: { variableName: string; value: string }) => `${b.variableName}::${b.value}`;

  if (screenDomainStates.length === 0 && bindings.length === 0) {
    return (
      <div className="px-2">
        <div className="text-[10px] text-gray-500 font-medium mb-1">状态响应</div>
        <div className="text-[10px] text-gray-400 py-1">
          暂无页面状态变量。在左侧「数据」中创建后，可在此处配置元素对状态变化的响应。
        </div>
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="text-[10px] text-gray-500 font-medium mb-1">状态响应</div>

      {bindings.length === 0 && !adding && (
        <div className="text-[10px] text-gray-400 py-1">
          暂无状态响应规则
        </div>
      )}

      <div className="flex flex-col gap-1">
        {bindings.map((binding) => {
          const bk = bindingKey(binding);
          const isEditing = editingKey === bk;
          return (
            <div key={bk} className="border border-gray-200 rounded bg-white">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <span className="text-[10px] text-gray-500">当</span>
                <code className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded font-mono">
                  {binding.variableName}
                </code>
                <span className="text-gray-400">=</span>
                <code className="text-[10px] text-green-600 bg-green-50 px-1 rounded font-mono">
                  {binding.value}
                </code>
                <span className="flex-1" />
                <button
                  type="button"
                  className={`text-gray-400 hover:text-blue-500 transition-colors p-0.5 ${isEditing ? 'text-blue-500' : ''}`}
                  onClick={() => setEditingKey(isEditing ? null : bk)}
                  title="编辑覆盖"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <Popconfirm
                  title="删除此状态响应？"
                  onConfirm={() => handleDeleteBinding(binding.variableName, binding.value)}
                  okText="删除"
                  cancelText="取消"
                >
                  <button type="button" className="text-gray-400 hover:text-red-500 transition-colors p-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Popconfirm>
              </div>

              {isEditing && (
                <div className="border-t border-gray-100 px-2 py-1.5 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-gray-500">可见性:</span>
                    <select
                      className="h-5 px-1 border border-gray-200 rounded text-[10px] bg-white outline-none"
                      value={binding.visible === undefined ? '' : String(binding.visible)}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : e.target.value === 'true';
                        handleUpdateVisibility(binding.variableName, binding.value, val);
                      }}
                    >
                      <option value="">不覆盖</option>
                      <option value="true">显示</option>
                      <option value="false">隐藏</option>
                    </select>
                  </div>
                  {binding.styles && Object.keys(binding.styles).length > 0 && (
                    <div className="mt-1 text-[10px] text-gray-500">
                      样式覆盖: {Object.keys(binding.styles).join(', ')}
                    </div>
                  )}
                  {binding.props && Object.keys(binding.props).length > 0 && (
                    <div className="mt-1 text-[10px] text-gray-500">
                      属性覆盖: {Object.keys(binding.props).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {adding && (
          <div className="border border-blue-200 rounded bg-blue-50/30 p-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-10 flex-shrink-0">变量:</span>
              <select
                className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                value={newVarName}
                onChange={(e) => { setNewVarName(e.target.value); setNewVarValue(''); }}
              >
                <option value="">选择变量</option>
                {screenDomainStates.map((gs) => (
                  <option key={gs.name} value={gs.name}>{gs.label || gs.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-10 flex-shrink-0">值:</span>
              <select
                className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                disabled={!selectedVar}
              >
                <option value="">选择值</option>
                {selectedVar?.values.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <button
                type="button"
                className="h-6 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                onClick={handleAddBinding}
                disabled={!newVarName || !newVarValue}
              >
                添加
              </button>
              <button
                type="button"
                className="h-6 px-2 border border-gray-200 text-gray-500 rounded text-xs hover:bg-gray-50"
                onClick={() => { setAdding(false); setNewVarName(''); setNewVarValue(''); }}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {!adding && screenDomainStates.length > 0 && (
        <button
          type="button"
          className="mt-1 w-full flex items-center justify-center gap-1 py-1 border border-dashed border-gray-300 rounded text-[10px] text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          onClick={() => setAdding(true)}
        >
          + 添加状态响应
        </button>
      )}
    </div>
  );
});
