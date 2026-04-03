import { useState } from 'react';
import { Empty, Popconfirm } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { generateId, type GlobalStateVariable } from '@globallink/design-schema';
import { StateCombinationPreview } from './StateCombinationPreview';

// ===== Interaction state presets =====
const INTERACTION_STATES = ['hover', 'active', 'focus', 'disabled'] as const;

/**
 * Tasks 2.4.2–2.4.5 — States Tab
 *
 * Section 1: Interaction states (hover, active, focus, disabled)
 * Section 2: Business states (custom named states)
 * Section 3: Global state bindings
 */
export const StatesTab = observer(function StatesTab() {
  const nodeId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;
  const screen = editorStore.activeScreen;

  if (!nodeId) {
    return (
      <div className="flex flex-col gap-2">
        <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        <StateCombinationPreview />
      </div>
    );
  }

  const node = findNodeInScreens(screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const states = node.states ?? [];
  const activeState = node.activeState ?? 'default';
  const globalStateBindings = node.globalStateBindings ?? [];
  const screenGlobalStates = screen?.globalStates ?? [];
  const visibilityWhen = node.visibilityWhen;

  return (
    <div className="flex flex-col gap-0.5 p-2 text-xs">
      {/* Section 1: Interaction States */}
      <InteractionStatesSection
        nodeId={nodeId}
        activeState={activeState}
        stateNames={states.map((s) => s.name)}
      />

      {/* Section 2: Business States */}
      <BusinessStatesSection
        nodeId={nodeId}
        states={states}
        activeState={activeState}
      />

      {/* Section 3: Global State Bindings */}
      <GlobalStateBindingsSection
        nodeId={nodeId}
        bindings={globalStateBindings}
        screenGlobalStates={screenGlobalStates}
      />

      <VisibilityWhenSection
        nodeId={nodeId}
        rule={visibilityWhen}
        screenGlobalStates={screenGlobalStates}
      />

      {/* Section 4: Global State Variable Management */}
      <GlobalStateVariableManager />

      <StateCombinationPreview />
    </div>
  );
});

// ===================================================================
// Section 1: Interaction States
// ===================================================================

interface InteractionStatesSectionProps {
  nodeId: string;
  activeState: string;
  stateNames: string[];
}

const InteractionStatesSection = observer(function InteractionStatesSection({
  nodeId,
  activeState,
  stateNames,
}: InteractionStatesSectionProps) {
  const [open, setOpen] = useState(true);

  const handleToggle = (stateName: string) => {
    if (activeState === stateName) {
      // Deactivate — go back to default
      editorStore.execute({
        type: 'setActiveState',
        params: { nodeId, stateName: 'default' },
      });
    } else {
      // If the state doesn't exist yet, add it first
      if (!stateNames.includes(stateName)) {
        editorStore.execute({
          type: 'addState',
          params: { nodeId, stateName },
        });
      }
      editorStore.execute({
        type: 'setActiveState',
        params: { nodeId, stateName },
      });
    }
  };

  return (
    <CollapsibleSection title="交互状态" open={open} onToggle={() => setOpen(!open)}>
      <div className="grid grid-cols-2 gap-1.5">
        {INTERACTION_STATES.map((state) => {
          const hasOverride = stateNames.includes(state);
          const isActive = activeState === state;
          return (
            <button
              key={state}
              type="button"
              className={`relative flex items-center justify-center gap-1 px-2 py-1.5 rounded border text-xs font-medium transition-all ${
                isActive
                  ? 'border-blue-400 bg-blue-50 text-blue-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleToggle(state)}
            >
              {hasOverride && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
              {state}
            </button>
          );
        })}
      </div>
      {INTERACTION_STATES.includes(activeState as typeof INTERACTION_STATES[number]) && (
        <div className="mt-1.5 px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px]">
          正在编辑 <strong>{activeState}</strong> 状态的样式覆盖
        </div>
      )}
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 2: Business States (Task 2.4.3)
// ===================================================================

interface BusinessStatesSectionProps {
  nodeId: string;
  states: Array<{ name: string; styles: Record<string, unknown>; props?: Record<string, unknown> }>;
  activeState: string;
}

const BusinessStatesSection = observer(function BusinessStatesSection({
  nodeId,
  states,
  activeState,
}: BusinessStatesSectionProps) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  // Custom states = everything except default + interaction states
  const customStates = states.filter(
    (s) => s.name !== 'default' && !INTERACTION_STATES.includes(s.name as typeof INTERACTION_STATES[number]),
  );

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Check duplicate
    if (states.some((s) => s.name === trimmed)) return;
    editorStore.execute({
      type: 'addState',
      params: { nodeId, stateName: trimmed },
    });
    setNewName('');
    setAdding(false);
  };

  const handleDelete = (stateName: string) => {
    if (activeState === stateName) {
      editorStore.execute({
        type: 'setActiveState',
        params: { nodeId, stateName: 'default' },
      });
    }
    editorStore.execute({
      type: 'removeState',
      params: { nodeId, stateName },
    });
  };

  const handleActivate = (stateName: string) => {
    const target = activeState === stateName ? 'default' : stateName;
    editorStore.execute({
      type: 'setActiveState',
      params: { nodeId, stateName: target },
    });
  };

  return (
    <CollapsibleSection title="业务状态" open={open} onToggle={() => setOpen(!open)}>
      {customStates.length === 0 && !adding && (
        <div className="text-gray-400 text-[10px] py-1">暂无自定义状态</div>
      )}
      <div className="flex flex-col gap-1">
        {customStates.map((state) => {
          const isActive = activeState === state.name;
          return (
            <div
              key={state.name}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer transition-all ${
                isActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => handleActivate(state.name)}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isActive ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
              <span className={`flex-1 truncate ${isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                {state.name}
              </span>
              {isActive && (
                <span className="text-[10px] text-blue-500 bg-blue-100 px-1 rounded">编辑中</span>
              )}
              <Popconfirm
                title="确定删除此状态？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(state.name);
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
              placeholder="状态名称"
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
          添加状态
        </button>
      )}
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 3: Global State Bindings (Task 2.4.4)
// ===================================================================

interface GlobalStateBindingsSectionProps {
  nodeId: string;
  bindings: Array<{
    id: string;
    variableName: string;
    value: string;
    styles?: Record<string, unknown>;
    props?: Record<string, unknown>;
    visible?: boolean;
  }>;
  screenGlobalStates: Array<{ name: string; values: string[]; defaultValue: string }>;
}

const GlobalStateBindingsSection = observer(function GlobalStateBindingsSection({
  nodeId,
  bindings,
  screenGlobalStates,
}: GlobalStateBindingsSectionProps) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  const selectedVar = screenGlobalStates.find((v) => v.name === newVarName);

  const handleAddBinding = () => {
    if (!newVarName || !newVarValue) return;
    const id = generateId();
    editorStore.execute({
      type: 'addGlobalStateBinding',
      params: {
        nodeId,
        binding: {
          id,
          variableName: newVarName,
          value: newVarValue,
        },
      },
    });
    setAdding(false);
    setNewVarName('');
    setNewVarValue('');
  };

  const handleDeleteBinding = (bindingId: string) => {
    editorStore.execute({
      type: 'removeGlobalStateBinding',
      params: { nodeId, bindingId },
    });
  };

  const handleUpdateVisibility = (bindingId: string, visible: boolean | undefined) => {
    editorStore.execute({
      type: 'updateGlobalStateBinding',
      params: {
        nodeId,
        bindingId,
        patch: { visible },
      },
    });
  };

  return (
    <CollapsibleSection title="全局状态绑定" open={open} onToggle={() => setOpen(!open)}>
      {screenGlobalStates.length === 0 && (
        <div className="text-gray-400 text-[10px] py-1">
          当前屏幕没有全局状态变量，请先添加
        </div>
      )}

      {bindings.length === 0 && screenGlobalStates.length > 0 && !adding && (
        <div className="text-gray-400 text-[10px] py-1">暂无绑定</div>
      )}

      <div className="flex flex-col gap-1">
        {bindings.map((binding) => {
          const isEditing = editingId === binding.id;
          return (
            <div key={binding.id} className="border border-gray-200 rounded bg-white">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
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
                  className={`text-gray-400 hover:text-blue-500 transition-colors p-0.5 ${
                    isEditing ? 'text-blue-500' : ''
                  }`}
                  onClick={() => setEditingId(isEditing ? null : binding.id)}
                  title="编辑覆盖"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <Popconfirm
                  title="确定删除此绑定？"
                  onConfirm={() => handleDeleteBinding(binding.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <button
                    type="button"
                    className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </Popconfirm>
              </div>

              {/* Inline edit for overrides */}
              {isEditing && (
                <div className="border-t border-gray-100 px-2 py-1.5 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-gray-500">可见性:</span>
                    <select
                      className="h-5 px-1 border border-gray-200 rounded text-[10px] bg-white outline-none"
                      value={binding.visible === undefined ? '' : String(binding.visible)}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : e.target.value === 'true';
                        handleUpdateVisibility(binding.id, val);
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
                {screenGlobalStates.map((gs) => (
                  <option key={gs.name} value={gs.name}>{gs.name}</option>
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
                  <option key={v} value={v}>{v}</option>
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

      {!adding && screenGlobalStates.length > 0 && (
        <button
          type="button"
          className="mt-1 w-full flex items-center justify-center gap-1 py-1 border border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
          onClick={() => setAdding(true)}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加绑定
        </button>
      )}
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 3.5: visibilityWhen（条件可见性，W6-041）
// ===================================================================

const VisibilityWhenSection = observer(function VisibilityWhenSection({
  nodeId,
  rule,
  screenGlobalStates,
}: {
  nodeId: string;
  rule?: { variableName: string; equals: string };
  screenGlobalStates: GlobalStateVariable[];
}) {
  const [open, setOpen] = useState(true);

  const handleVarChange = (variableName: string) => {
    const gs = screenGlobalStates.find((g) => g.name === variableName);
    const equals = gs?.values[0] ?? '';
    editorStore.execute({
      type: 'setNodeVisibilityWhen',
      params: { nodeId, visibilityWhen: { variableName, equals } },
    });
  };

  const handleEqualsChange = (equals: string) => {
    if (!rule) return;
    editorStore.execute({
      type: 'setNodeVisibilityWhen',
      params: { nodeId, visibilityWhen: { variableName: rule.variableName, equals } },
    });
  };

  const handleClear = () => {
    editorStore.execute({
      type: 'setNodeVisibilityWhen',
      params: { nodeId, visibilityWhen: null },
    });
  };

  if (screenGlobalStates.length === 0) {
    return null;
  }

  const selectedVar = screenGlobalStates.find((g) => g.name === rule?.variableName);

  return (
    <CollapsibleSection title="条件可见性" open={open} onToggle={() => setOpen(!open)}>
      <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">
        仅当全局变量等于下方取值时显示该节点（在绑定叠加之后判定）。
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">变量</span>
          <select
            className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
            value={rule?.variableName ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v) handleVarChange(v);
              else handleClear();
            }}
          >
            <option value="">（无规则）</option>
            {screenGlobalStates.map((gs) => (
              <option key={gs.name} value={gs.name}>{gs.name}</option>
            ))}
          </select>
        </div>
        {rule && selectedVar && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-[10px] w-12 flex-shrink-0">等于</span>
            <select
              className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none"
              value={rule.equals}
              onChange={(e) => handleEqualsChange(e.target.value)}
            >
              {selectedVar.values.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 4: Global State Variable Management (Task 2.4.5)
// ===================================================================

const GlobalStateVariableManager = observer(function GlobalStateVariableManager() {
  const screen = editorStore.activeScreen;
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValues, setNewValues] = useState('');
  const [newDefault, setNewDefault] = useState('');

  if (!screen) return null;

  const globalStates = screen.globalStates ?? [];

  const handleAdd = () => {
    const name = newName.trim();
    const values = newValues
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const defaultValue = newDefault.trim() || values[0] || '';
    if (!name || values.length === 0) return;
    // Check duplicate
    if (globalStates.some((gs) => gs.name === name)) return;

    editorStore.execute({
      type: 'addGlobalStateVariable',
      params: {
        screenId: screen.id,
        name,
        values,
        defaultValue,
      },
    });
    // Update runtime
    editorStore.setCurrentGlobalState(name, defaultValue);
    setAdding(false);
    setNewName('');
    setNewValues('');
    setNewDefault('');
  };

  const handleDelete = (varName: string) => {
    editorStore.execute({
      type: 'removeGlobalStateVariable',
      params: { screenId: screen.id, variableName: varName },
    });
    // Clean up runtime
    const next = { ...editorStore.currentGlobalStates };
    delete next[varName];
    editorStore.currentGlobalStates = next;
  };

  const handleRuntimeChange = (varName: string, value: string) => {
    editorStore.setCurrentGlobalState(varName, value);
  };

  return (
    <CollapsibleSection title="全局状态变量" open={open} onToggle={() => setOpen(!open)}>
      {globalStates.length === 0 && !adding && (
        <div className="text-gray-400 text-[10px] py-1">暂无全局状态变量</div>
      )}

      <div className="flex flex-col gap-1">
        {globalStates.map((gs) => (
          <div key={gs.name} className="border border-gray-200 rounded px-2 py-1.5 bg-white">
            <div className="flex items-center gap-1.5">
              <code className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded font-mono font-medium">
                {gs.name}
              </code>
              <span className="flex-1" />
              <Popconfirm
                title="删除此全局状态变量？关联的绑定可能失效。"
                onConfirm={() => handleDelete(gs.name)}
                okText="删除"
                cancelText="取消"
              >
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </Popconfirm>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] text-gray-500">当前值:</span>
              <select
                className="flex-1 h-5 px-1 border border-gray-200 rounded text-[10px] bg-white outline-none focus:border-blue-400"
                value={editorStore.currentGlobalStates[gs.name] ?? gs.defaultValue}
                onChange={(e) => handleRuntimeChange(gs.name, e.target.value)}
              >
                {gs.values.map((v) => (
                  <option key={v} value={v}>{v}{v === gs.defaultValue ? ' (默认)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400">
              可选值: {gs.values.join(', ')}
            </div>
          </div>
        ))}

        {adding && (
          <div className="border border-blue-200 rounded bg-blue-50/30 p-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-10 flex-shrink-0">名称:</span>
              <input
                type="text"
                className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                placeholder="例: theme"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-10 flex-shrink-0">可选值:</span>
              <input
                type="text"
                className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                placeholder="逗号分隔，如: light, dark"
                value={newValues}
                onChange={(e) => setNewValues(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] w-10 flex-shrink-0">默认值:</span>
              <input
                type="text"
                className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                placeholder="留空取第一个值"
                value={newDefault}
                onChange={(e) => setNewDefault(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 justify-end">
              <button
                type="button"
                className="h-6 px-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                onClick={handleAdd}
                disabled={!newName.trim() || !newValues.trim()}
              >
                添加
              </button>
              <button
                type="button"
                className="h-6 px-2 border border-gray-200 text-gray-500 rounded text-xs hover:bg-gray-50"
                onClick={() => { setAdding(false); setNewName(''); setNewValues(''); setNewDefault(''); }}
              >
                取消
              </button>
            </div>
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
          添加变量
        </button>
      )}
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
