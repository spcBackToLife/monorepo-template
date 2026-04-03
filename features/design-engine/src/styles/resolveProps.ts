import type { ComponentNode } from '@globallink/design-schema';

export interface ResolvedProps {
  props: Record<string, unknown>;
  visible: boolean;
}

/**
 * 4-layer props + visibility resolution for a ComponentNode.
 *
 * Merge order (later layers override earlier):
 * 1. **base**: node.props + node.visible
 * 2. **global**: matching globalStateBindings[].props / visible
 * 3. **business**: node.states[activeState].props (if activeState is not 'default')
 * 4. **interaction**: hover/active/focus prop overrides from interactionState
 * 5. **visibilityWhen**: optional global-state equality gate (hides if mismatch)
 *
 * Visibility is resolved through all layers — any layer can hide the node.
 */
export function resolveNodeProps(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState?: string | null,
): ResolvedProps {
  // Layer 1: base props + visible
  // undefined 必须视为「可见」：旧数据/接口若省略 visible，不能当成隐藏，否则整棵子树不渲染且无 data-node-id，选区也无法绘制
  let mergedProps: Record<string, unknown> = { ...node.props };
  let visible = node.visible !== false;

  // Layer 2: global state bindings
  if (node.globalStateBindings?.length) {
    for (const binding of node.globalStateBindings) {
      const currentValue = globalStates[binding.variableName];
      if (currentValue === binding.value) {
        if (binding.props) {
          mergedProps = { ...mergedProps, ...binding.props };
        }
        if (binding.visible !== undefined) {
          visible = binding.visible;
        }
      }
    }
  }

  // Layer 3: business state (activeState override)
  const activeStateName = node.activeState;
  if (activeStateName && activeStateName !== 'default') {
    const activeState = node.states.find((s) => s.name === activeStateName);
    if (activeState?.props) {
      mergedProps = { ...mergedProps, ...activeState.props };
    }
  }

  // Layer 4: interaction state (hover, active, focus, etc.)
  if (interactionState) {
    let interactionStateObj = node.states.find((s) => s.name === interactionState);
    if (!interactionStateObj && interactionState === 'active') {
      interactionStateObj = node.states.find((s) => s.name === 'pressed');
    }
    if (interactionStateObj?.props) {
      mergedProps = { ...mergedProps, ...interactionStateObj.props };
    }
  }

  let outVisible = visible !== false;
  if (node.visibilityWhen) {
    const { variableName, equals } = node.visibilityWhen;
    if (globalStates[variableName] !== equals) {
      outVisible = false;
    }
  }

  return { props: mergedProps, visible: outVisible };
}
