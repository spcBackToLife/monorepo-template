import type { ComponentNode, TransitionAnimation } from '@globallink/design-schema';

/**
 * Context provided to the EventExecutionEngine for handling actions.
 */
export interface PreviewContext {
  currentScreenId: string;
  globalStates: Record<string, string>;
  onNavigate: (screenId: string, animation?: TransitionAnimation) => void;
  onSetState: (nodeId: string, stateName: string) => void;
  /** @deprecated 兼容旧事件；与领域态共用同一运行时表 */
  onSetGlobalState: (name: string, value: string) => void;
  onSetDomainState?: (variableName: string, value: string) => void;
  onSetEnvironmentState?: (variableName: string, value: string) => void;
  /** 预览内切换数据源生命周期阶段 */
  onSwitchDataSourcePhase?: (dataSourceId: string, phase: string) => void;
  onToggleVisible: (nodeId: string) => void;
}

/** Loose shape for action — tolerant of legacy UI field aliases */
interface LooseAction {
  type: string;
  targetScreenId?: string;
  screenId?: string;
  animation?: TransitionAnimation;
  stateName?: string;
  state?: string;
  nodeId?: string;
  targetId?: string;
  variableName?: string;
  value?: string;
  url?: string;
  duration?: number;
  handler?: string;
  dataSourceId?: string;
  phase?: string;
}

interface LooseCondition {
  type?: string;
  variableName?: string;
  value?: string;
  expression?: string;
  nodeId?: string;
  propName?: string;
  propValue?: string;
  operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
}

/** Loose shape for ComponentEvent */
type LooseEvent = {
  trigger: string;
  actions?: LooseAction[];
  condition?: LooseCondition;
  disabled?: boolean;
};

/**
 * EventExecutionEngine binds real DOM event listeners to elements in the preview
 * and executes actions defined in the ComponentNode event list.
 *
 * It walks the DOM looking for elements with `data-node-id`, looks up
 * events from the ComponentNode tree, and binds real DOM event listeners.
 * On trigger, it iterates through the action list and calls the appropriate
 * context handlers.
 */
export class EventExecutionEngine {
  private listeners: Array<{ element: HTMLElement; event: string; handler: EventListener }> = [];
  private nodeMap: Map<string, ComponentNode> = new Map();

  /**
   * Bind event listeners to all interactive elements within the container.
   */
  bind(container: HTMLElement, rootNode: ComponentNode, context: PreviewContext): void {
    // First, unbind any existing listeners
    this.unbind();

    // Build a map of nodeId -> ComponentNode for quick lookup
    this.nodeMap = new Map();
    this.walkNodeTree(rootNode);

    // Find all elements with data-node-id in the DOM
    const elements = container.querySelectorAll<HTMLElement>('[data-node-id]');

    for (const element of elements) {
      const nodeId = element.getAttribute('data-node-id');
      if (!nodeId) continue;

      const node = this.nodeMap.get(nodeId);
      const evs = node?.events;
      if (!node || !evs || evs.length === 0) continue;

      for (const raw of evs) {
        const event = raw as LooseEvent;
        if (event.disabled) continue;
        const domEvent = this.triggerToDomEvent(event.trigger);
        if (!domEvent) continue;

        const handler = async (e: Event) => {
          e.stopPropagation();
          if (!this.evaluateCondition(event, context)) return;
          for (const action of event.actions ?? []) {
            if (action.type === 'delay') {
              await new Promise((resolve) =>
                setTimeout(resolve, Number(action.duration) || 0),
              );
              continue;
            }
            this.executeAction(action, context);
          }
        };

        element.addEventListener(domEvent, handler);
        this.listeners.push({ element, event: domEvent, handler });

        const hasSetState = event.trigger === 'hover' &&
          (event.actions ?? []).some((a) => a.type === 'setState');
        if (hasSetState) {
          const leaveHandler = () => {
            for (const action of event.actions ?? []) {
              if (action.type === 'setState') {
                const targetId = action.nodeId ?? action.targetId;
                if (targetId) context.onSetState(targetId, 'default');
              }
            }
          };
          element.addEventListener('mouseleave', leaveHandler);
          this.listeners.push({ element, event: 'mouseleave', handler: leaveHandler });
        }
      }
    }
  }

  /**
   * Remove all bound event listeners.
   */
  unbind(): void {
    for (const { element, event, handler } of this.listeners) {
      element.removeEventListener(event, handler);
    }
    this.listeners = [];
    this.nodeMap.clear();
  }

  /**
   * Walk the component node tree and populate the nodeMap.
   */
  private walkNodeTree(node: ComponentNode): void {
    this.nodeMap.set(node.id, node);
    if (node.children) {
      for (const child of node.children) {
        this.walkNodeTree(child);
      }
    }
  }

  /**
   * Convert a schema trigger name to a DOM event name.
   */
  private triggerToDomEvent(trigger: string): string | null {
    const mapping: Record<string, string> = {
      click: 'click',
      hover: 'mouseenter',
      focus: 'focus',
      blur: 'blur',
      longPress: 'pointerdown',
      doubleClick: 'dblclick',
    };
    return mapping[trigger] ?? null;
  }

  private evaluateCondition(event: LooseEvent, context: PreviewContext): boolean {
    const cond = event.condition;
    if (!cond || !cond.type) return true;

    if (
      (cond.type === 'globalState' ||
        cond.type === 'domainState' ||
        cond.type === 'environmentState') &&
      cond.variableName !== undefined &&
      cond.value !== undefined
    ) {
      const actual = context.globalStates[cond.variableName] ?? '';
      return this.compare(actual, cond.value, cond.operator ?? 'equals');
    }

    if (cond.type === 'nodeState' && cond.nodeId) {
      const node = this.nodeMap.get(cond.nodeId);
      const activeState = node?.activeState ?? 'default';
      return this.compare(activeState, cond.value ?? 'default', cond.operator ?? 'equals');
    }

    if (cond.type === 'prop' && cond.nodeId && cond.propName !== undefined && cond.propValue !== undefined) {
      const node = this.nodeMap.get(cond.nodeId);
      const actual = String((node?.props as Record<string, unknown>)?.[cond.propName] ?? '');
      return this.compare(actual, cond.propValue, cond.operator ?? 'equals');
    }

    if (cond.type === 'expression' && cond.expression) {
      try {
        const fn = new Function('globalStates', `return Boolean(${cond.expression})`);
        return fn(context.globalStates) as boolean;
      } catch {
        return true;
      }
    }

    return true;
  }

  private compare(actual: string, expected: string, operator: string): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'notEquals': return actual !== expected;
      case 'contains': return actual.includes(expected);
      case 'greaterThan': return Number(actual) > Number(expected);
      case 'lessThan': return Number(actual) < Number(expected);
      default: return actual === expected;
    }
  }

  private executeAction(action: LooseAction, context: PreviewContext): void {
    switch (action.type) {
      case 'navigate': {
        const target = action.targetScreenId ?? action.screenId;
        if (target) {
          context.onNavigate(target, action.animation);
        }
        break;
      }

      case 'setState': {
        const nodeId = action.nodeId ?? action.targetId;
        const stateName = action.stateName ?? action.state;
        if (nodeId && stateName) {
          context.onSetState(nodeId, stateName);
        }
        break;
      }

      case 'setGlobalState':
        if (action.variableName && action.value !== undefined) {
          context.onSetGlobalState(action.variableName, action.value);
        }
        break;

      case 'setDomainState':
        if (action.variableName && action.value !== undefined) {
          if (context.onSetDomainState) {
            context.onSetDomainState(action.variableName, action.value);
          } else {
            context.onSetGlobalState(action.variableName, action.value);
          }
        }
        break;

      case 'setEnvironmentState':
        if (action.variableName && action.value !== undefined) {
          if (context.onSetEnvironmentState) {
            context.onSetEnvironmentState(action.variableName, action.value);
          } else {
            context.onSetGlobalState(action.variableName, action.value);
          }
        }
        break;

      case 'switchDataSourcePhase':
        if (action.dataSourceId && action.phase && context.onSwitchDataSourcePhase) {
          context.onSwitchDataSourcePhase(action.dataSourceId, action.phase);
        }
        break;

      case 'toggleVisible': {
        const nodeId = action.nodeId ?? action.targetId;
        if (nodeId) {
          context.onToggleVisible(nodeId);
        }
        break;
      }

      case 'openUrl':
        if (action.url) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'custom':
        if (typeof action.handler === 'string') {
          window.dispatchEvent(
            new CustomEvent('design-custom-action', {
              detail: { handler: action.handler },
            }),
          );
        }
        break;

      default:
        // Unknown action type — silently ignore in preview
        break;
    }
  }
}

export type { TransitionAnimation } from '@globallink/design-schema';
