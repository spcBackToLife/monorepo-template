import { useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import type { ComponentNode } from '@globallink/design-schema';
import { findParentInScreens } from '@globallink/design-operations';
import { editorStore } from '@/stores/editor';

type Props = { node: ComponentNode };

const BUILT_IN_STATES = new Set(['default', 'hover', 'pressed', 'focus', 'disabled']);

interface StateVisibilityRow {
  stateName: string;
  visible: boolean;
  source: 'baseline' | 'overridden' | 'inherited';
}

interface VariableCondition {
  origin: 'domain' | 'environment' | 'visibilityWhen';
  variableName: string;
  value: string;
  visible: boolean;
  label: string;
}

function computeStateRows(
  parent: ComponentNode,
  childId: string,
): StateVisibilityRow[] {
  const allStates = parent.states ?? [];
  const defaultState = allStates.find((s) => s.name === 'default');
  const defaultVisible = defaultState?.childrenVisibility?.[childId] !== false;

  const customStates = allStates.filter(
    (s) => s.name && (!BUILT_IN_STATES.has(s.name) || s.name === 'default'),
  );

  // default first, then custom states in original order
  const sorted = [
    ...customStates.filter((s) => s.name === 'default'),
    ...customStates.filter((s) => s.name !== 'default'),
  ];

  return sorted.map((state) => {
    if (state.name === 'default') {
      return { stateName: 'default', visible: defaultVisible, source: 'baseline' as const };
    }
    const explicit = state.childrenVisibility?.[childId];
    if (explicit === undefined) {
      return { stateName: state.name, visible: defaultVisible, source: 'inherited' as const };
    }
    return { stateName: state.name, visible: explicit !== false, source: 'overridden' as const };
  });
}

function collectVariableConditions(node: ComponentNode): VariableCondition[] {
  const conditions: VariableCondition[] = [];

  if (node.domainStateBindings?.length) {
    for (const b of node.domainStateBindings) {
      if (b.visible !== undefined) {
        conditions.push({
          origin: 'domain',
          variableName: b.variableName,
          value: b.value,
          visible: b.visible,
          label: '领域状态',
        });
      }
    }
  }

  if (node.environmentBindings?.length) {
    for (const b of node.environmentBindings) {
      if (b.visible !== undefined) {
        conditions.push({
          origin: 'environment',
          variableName: b.variableName,
          value: b.value,
          visible: b.visible,
          label: '环境变量',
        });
      }
    }
  }

  if (node.visibilityWhen) {
    conditions.push({
      origin: 'visibilityWhen',
      variableName: node.visibilityWhen.variableName,
      value: node.visibilityWhen.equals,
      visible: true,
      label: '变量条件',
    });
  }

  return conditions;
}

/**
 * 统一可见性条件面板 — 矩阵视图。
 *
 * 聚合展示所有影响此元素可见性的因素：
 * 1. 父容器状态条件（childrenVisibility 矩阵）
 * 2. 领域/环境状态绑定中的 visible 设置
 * 3. visibilityWhen 简单条件
 */
export const NodeVisibilityCondition = observer(function NodeVisibilityCondition({ node }: Props) {
  const parentResult = findParentInScreens(editorStore.screens, node.id);
  const parent = parentResult?.parent ?? null;

  const customStates = useMemo(
    () => (parent?.states ?? []).filter((s) => s.name && !BUILT_IN_STATES.has(s.name)),
    [parent?.states],
  );

  const stateRows = useMemo(
    () => (parent ? computeStateRows(parent, node.id) : []),
    [parent, parent?.states, node.id],
  );

  const variableConditions = useMemo(
    () => collectVariableConditions(node),
    [node.domainStateBindings, node.environmentBindings, node.visibilityWhen],
  );

  const hasParentStates = customStates.length > 0;
  const hasVariableConditions = variableConditions.length > 0;

  if (!hasParentStates && !hasVariableConditions) {
    return (
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 px-1">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          可见性: 始终可见
        </div>
      </div>
    );
  }

  const handleToggle = (stateName: string, visible: boolean) => {
    if (!parent) return;
    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parent.id,
        childNodeId: node.id,
        stateName,
        visible,
      },
    });
  };

  const handleReset = (stateName: string) => {
    if (!parent) return;
    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parent.id,
        childNodeId: node.id,
        stateName,
        visible: undefined,
      },
    });
  };

  return (
    <div className="px-2 py-1.5">
      <div className="border border-indigo-200 rounded-lg bg-indigo-50/40 p-2">
        <div className="text-[11px] font-medium text-indigo-700 mb-1.5">可见性</div>

        {/* 父容器状态条件矩阵 */}
        {hasParentStates && parent && (
          <div className="mb-2">
            <div className="text-[10px] text-gray-500 mb-1.5">
              父容器「{parent.name || parent.type}」状态条件
            </div>
            <div className="flex flex-col gap-px bg-gray-100 rounded overflow-hidden border border-gray-200">
              {stateRows.map((row, idx) => (
                <StateRow
                  key={row.stateName}
                  row={row}
                  showBaselineDivider={idx === 0 && row.source === 'baseline' && stateRows.length > 1}
                  onToggle={handleToggle}
                  onReset={handleReset}
                />
              ))}
            </div>
          </div>
        )}

        {/* 变量条件（聚合展示） */}
        {hasVariableConditions && (
          <div className={hasParentStates ? 'border-t border-indigo-200 pt-1.5 mt-1' : ''}>
            <div className="text-[10px] text-gray-500 mb-1">变量条件</div>
            <div className="flex flex-col gap-1">
              {variableConditions.map((c, i) => (
                <div
                  key={`${c.origin}-${c.variableName}-${c.value}-${i}`}
                  className="flex items-center gap-1.5 text-[10px] px-1 py-0.5 bg-white rounded border border-gray-100"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.visible ? 'bg-green-400' : 'bg-red-300'}`} />
                  <span className="text-gray-600">
                    当 <span className="font-medium text-gray-700">{c.variableName}</span>
                    {' = '}
                    <span className="font-medium text-gray-700">{c.value}</span>
                    {' → '}
                    <span className={c.visible ? 'text-green-600' : 'text-red-500'}>
                      {c.visible ? '显示' : '隐藏'}
                    </span>
                  </span>
                  <span className="ml-auto text-[9px] text-gray-300">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

function StateRow({
  row,
  showBaselineDivider: _showBaselineDivider,
  onToggle,
  onReset,
}: {
  row: StateVisibilityRow;
  showBaselineDivider: boolean;
  onToggle: (stateName: string, visible: boolean) => void;
  onReset: (stateName: string) => void;
}) {
  const isBaseline = row.source === 'baseline';
  const isInherited = row.source === 'inherited';
  const isOverridden = row.source === 'overridden';

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-[10px] ${
        isBaseline
          ? 'bg-indigo-50/60 border-b border-indigo-100'
          : 'bg-white'
      }`}
    >
      {/* State name */}
      <span
        className={`min-w-[60px] font-medium truncate ${
          isBaseline ? 'text-indigo-700' : isInherited ? 'text-gray-400' : 'text-gray-600'
        }`}
        title={row.stateName}
      >
        {row.stateName}
      </span>

      {/* Visibility toggle — baseline 用完整按钮, inherited 用弱化样式 */}
      {isBaseline ? (
        <button
          type="button"
          onClick={() => onToggle(row.stateName, !row.visible)}
          className="flex items-center gap-1 group"
          title="修改基线会影响所有继承此默认值的状态"
        >
          <ToggleSwitch on={row.visible} />
          <span className={row.visible ? 'text-green-600' : 'text-gray-400'}>
            {row.visible ? '显示' : '隐藏'}
          </span>
        </button>
      ) : isInherited ? (
        <button
          type="button"
          onClick={() => onToggle(row.stateName, !row.visible)}
          className="flex items-center gap-1 group opacity-50 hover:opacity-100 transition-opacity"
          title="点击创建此状态的独立覆盖"
        >
          <ToggleSwitch on={row.visible} />
          <span className={row.visible ? 'text-green-600' : 'text-gray-400'}>
            {row.visible ? '显示' : '隐藏'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onToggle(row.stateName, !row.visible)}
          className="flex items-center gap-1 group"
          title={`点击切换为${row.visible ? '隐藏' : '显示'}`}
        >
          <ToggleSwitch on={row.visible} />
          <span className={row.visible ? 'text-green-600' : 'text-gray-400'}>
            {row.visible ? '显示' : '隐藏'}
          </span>
        </button>
      )}

      {/* Source label */}
      <span className="ml-auto flex items-center gap-1 flex-shrink-0">
        {isBaseline && (
          <span className="text-[9px] text-indigo-400 bg-indigo-100 px-1 rounded">基线</span>
        )}
        {isInherited && (
          <span className="text-[9px] text-gray-300">继承默认</span>
        )}
        {isOverridden && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[9px] text-blue-500">覆盖</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReset(row.stateName); }}
              className="text-[9px] text-gray-400 hover:text-indigo-500 transition-colors ml-0.5"
              title="重置为继承默认"
            >
              ↩
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={`w-5 h-3 rounded-full relative transition-colors cursor-pointer ${
        on ? 'bg-green-400 group-hover:bg-green-500' : 'bg-gray-300 group-hover:bg-gray-400'
      }`}
    >
      <span
        className={`absolute top-0.5 w-2 h-2 rounded-full bg-white shadow-sm transition-transform ${
          on ? 'left-2.5' : 'left-0.5'
        }`}
      />
    </span>
  );
}
