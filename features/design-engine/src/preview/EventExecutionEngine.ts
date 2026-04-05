import type { ComponentNode, TransitionAnimation, ToastType, ToastPosition } from '@globallink/design-schema';

/** Result of a mock API request execution */
export interface MockResponse {
  success: boolean;
  status: number;
  data: unknown;
  message: string;
}

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
  /** Read current runtime state of a node (for auto-revert) */
  getNodeState?: (nodeId: string) => string;
  onShowToast?: (type: ToastType, message: string, duration: number, position?: ToastPosition) => void;
  onApiRequest?: (requestId: string, paramOverrides?: Record<string, string>) => Promise<MockResponse>;
  /** Cancel pending API request(s) */
  onCancelApiRequest?: (requestId?: string) => void;
  /** Injected by apiRequest action for child actions to resolve {{response.xxx}} */
  responseData?: unknown;
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
  autoRevertMs?: number;
  dataSourceId?: string;
  phase?: string;
  // showToast fields
  toastType?: string;
  message?: string;
  position?: string;
  // apiRequest fields
  requestId?: string;
  paramOverrides?: Record<string, string>;
  onSuccess?: LooseAction[];
  onFailure?: LooseAction[];
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
            if (action.type === 'apiRequest') {
              await this.executeApiRequestAction(action, context);
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
      // screenEnter is NOT a DOM event — handled by PreviewRenderer on mount
      // screenExit, screenVisible, screenHidden — handled by PreviewRenderer lifecycle hooks
      // scrollReachBottom, scrollReachTop — handled by PreviewRenderer scroll listener
      // navigateBack — handled by PreviewRenderer / PreviewBar
    };
    return mapping[trigger] ?? null;
  }

  /**
   * Execute a list of actions programmatically (used for screenEnter trigger).
   */
  async executeActionsAsync(actions: LooseAction[], context: PreviewContext): Promise<void> {
    for (const action of actions) {
      if (action.type === 'delay') {
        await new Promise((resolve) => setTimeout(resolve, Number(action.duration) || 0));
        continue;
      }
      if (action.type === 'apiRequest') {
        await this.executeApiRequestAction(action, context);
        continue;
      }
      this.executeAction(action, context);
    }
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
          const previousState = context.getNodeState?.(nodeId) ?? 'default';
          context.onSetState(nodeId, stateName);

          const autoRevertMs = (action as { autoRevertMs?: number }).autoRevertMs;
          if (autoRevertMs && autoRevertMs > 0 && stateName !== previousState) {
            setTimeout(() => {
              context.onSetState(nodeId, previousState);
            }, autoRevertMs);
          }
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

      case 'showToast': {
        if (context.onShowToast) {
          const msg = this.resolveResponseExpression(action.message, context);
          context.onShowToast(
            (action.toastType as ToastType) ?? 'info',
            msg,
            Number(action.duration) || 3000,
            action.position as ToastPosition | undefined,
          );
        }
        break;
      }

      case 'apiRequest': {
        // Handled in the async handler loop — should not reach here via sync path.
        // The async handler in bind() calls executeActionAsync() directly.
        break;
      }

      case 'custom':
        if (typeof action.handler === 'string') {
          window.dispatchEvent(
            new CustomEvent('design-custom-action', {
              detail: { handler: action.handler },
            }),
          );
        }
        break;

      case 'cancelApiRequest':
        if (context.onCancelApiRequest) {
          context.onCancelApiRequest(action.requestId);
        }
        break;

      default:
        // Unknown action type — silently ignore in preview
        break;
    }
  }

  /**
   * Execute an apiRequest action asynchronously, then run the appropriate branch.
   */
  async executeApiRequestAction(action: LooseAction, context: PreviewContext): Promise<void> {
    if (!context.onApiRequest || !action.requestId) return;

    const response = await context.onApiRequest(
      action.requestId as string,
      action.paramOverrides as Record<string, string> | undefined,
    );

    const branch: LooseAction[] = response.success
      ? (action.onSuccess as LooseAction[] | undefined) ?? []
      : (action.onFailure as LooseAction[] | undefined) ?? [];

    const childContext: PreviewContext = { ...context, responseData: response.data };

    for (const childAction of branch) {
      if (childAction.type === 'delay') {
        await new Promise((r) => setTimeout(r, Number(childAction.duration) || 0));
        continue;
      }
      if (childAction.type === 'apiRequest') {
        await this.executeApiRequestAction(childAction, childContext);
        continue;
      }
      this.executeAction(childAction, childContext);
    }
  }

  /**
   * Resolve {{response.xxx}} expressions in a string using the current response data.
   */
  private resolveResponseExpression(template: string | undefined, context: PreviewContext): string {
    if (!template) return '';
    if (typeof template !== 'string') return String(template);
    if (!template.includes('{{')) return template;

    return template.replace(/\{\{([\s\S]+?)\}\}/g, (_m, inner: string) => {
      const path = inner.trim();
      if (path.startsWith('response.') && context.responseData != null) {
        const subPath = path.substring('response.'.length);
        const value = this.navigatePath(context.responseData, subPath);
        return value !== undefined && value !== null ? String(value) : '';
      }
      // Fall back to globalStates for non-response expressions
      if (path.startsWith('globalState.')) {
        return context.globalStates[path.substring('globalState.'.length)] ?? '';
      }
      return '';
    });
  }

  private navigatePath(obj: unknown, path: string): unknown {
    const segments = path.split(/\.|\[(\d+)\]/).filter((s) => s !== '' && s !== undefined);
    let current: unknown = obj;
    for (const segment of segments) {
      if (current === null || current === undefined) return undefined;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }
    return current;
  }
}

export type { TransitionAnimation } from '@globallink/design-schema';
