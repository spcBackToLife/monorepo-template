import { observer } from 'mobx-react-lite';
import { Checkbox } from 'antd';
import type { ComponentNode } from '@globallink/design-schema';
import { editorStore } from '@/stores/editor';

type Props = {
  node: ComponentNode;
};

const BUILT_IN_STATES = new Set(['default', 'hover', 'pressed', 'focus', 'disabled']);

/**
 * 子元素可见性编辑（状态感知版本）。
 *
 * 遵循「默认 + 差异」模型：
 * - 显示当前编辑状态下各子元素的可见性
 * - default 状态的修改作为基线
 * - 非 default 状态的修改作为覆盖
 * - 标注哪些子元素的可见性是继承默认、哪些是当前状态覆盖
 */
export const ChildrenVisibilitySection = observer(function ChildrenVisibilitySection({ node }: Props) {
  const children = node.children ?? [];
  if (children.length === 0) return null;

  const ctx = editorStore.stateContext;
  const currentEditState = ctx.componentStateEditing ?? 'default';
  const isEditingDefault = currentEditState === 'default';

  const defaultStateDef = (node.states ?? []).find((s) => s.name === 'default');
  const activeStateDef = !isEditingDefault
    ? (node.states ?? []).find((s) => s.name === currentEditState)
    : undefined;

  const customStates = (node.states ?? []).filter((s) => !BUILT_IN_STATES.has(s.name));
  const hasCustomStates = customStates.length > 0;

  return (
    <div className="space-y-1 px-2">
      {!isEditingDefault && (
        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 mb-1">
          当前状态: <strong>{currentEditState}</strong> — 修改将作为此状态的覆盖
        </div>
      )}
      {children.map((c) => (
        <ChildVisibilityRow
          key={c.id}
          child={c}
          parentNode={node}
          currentEditState={currentEditState}
          isEditingDefault={isEditingDefault}
          defaultStateDef={defaultStateDef}
          activeStateDef={activeStateDef}
          hasCustomStates={hasCustomStates}
        />
      ))}
    </div>
  );
});

const ChildVisibilityRow = observer(function ChildVisibilityRow({
  child,
  parentNode,
  currentEditState,
  isEditingDefault,
  defaultStateDef,
  activeStateDef,
  _hasCustomStates,
}: {
  child: ComponentNode;
  parentNode: ComponentNode;
  currentEditState: string;
  isEditingDefault: boolean;
  defaultStateDef: import('@globallink/design-schema').ComponentState | undefined;
  activeStateDef: import('@globallink/design-schema').ComponentState | undefined;
  hasCustomStates: boolean;
}) {
  // Compute effective visibility
  const defaultVisible = defaultStateDef?.childrenVisibility?.[child.id] !== false;
  const activeExplicit = activeStateDef?.childrenVisibility?.[child.id];
  const isInherited = !isEditingDefault && activeExplicit === undefined;
  const effectiveVisible = isEditingDefault
    ? defaultVisible
    : (isInherited ? defaultVisible : activeExplicit !== false);

  const handleToggle = (checked: boolean) => {
    if (isEditingDefault) {
      editorStore.execute({
        type: 'setChildVisibility',
        params: {
          parentNodeId: parentNode.id,
          childNodeId: child.id,
          stateName: 'default',
          visible: checked ? true : false,
        },
      } as never);
    } else {
      editorStore.execute({
        type: 'setChildVisibility',
        params: {
          parentNodeId: parentNode.id,
          childNodeId: child.id,
          stateName: currentEditState,
          visible: checked,
        },
      } as never);
    }
  };

  const handleResetToDefault = () => {
    if (isEditingDefault) return;
    editorStore.execute({
      type: 'setChildVisibility',
      params: {
        parentNodeId: parentNode.id,
        childNodeId: child.id,
        stateName: currentEditState,
        visible: undefined,
      },
    } as never);
  };

  return (
    <div className="border-b border-gray-50 pb-1 last:border-0">
      <div className="flex items-center gap-2 text-xs text-gray-700">
        <Checkbox
          checked={effectiveVisible}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        <span className="truncate flex-1">{child.name || child.type}</span>
        {!isEditingDefault && !isInherited && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" title="此状态有显式覆盖" />
        )}
        {!isEditingDefault && isInherited && (
          <span className="text-[9px] text-gray-400">(继承)</span>
        )}
        {!isEditingDefault && !isInherited && (
          <button
            type="button"
            className="text-[9px] text-blue-500 hover:text-blue-700 px-1"
            onClick={handleResetToDefault}
            title="重置为继承默认"
          >
            ↩
          </button>
        )}
        <code className="text-[10px] text-gray-400">{child.id.slice(0, 6)}</code>
      </div>
    </div>
  );
});
