/** Supported event trigger types */
export type EventTrigger = 'click' | 'hover' | 'focus' | 'blur' | 'longPress' | 'screenEnter';

/** Transition animation configuration for navigation */
export interface TransitionAnimation {
  type: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'none';
  duration?: number;
  easing?: string;
}

/** Navigate to another screen */
export interface NavigateAction {
  type: 'navigate';
  targetScreenId: string;
  animation?: TransitionAnimation;
}

/** Set the active state of a component */
export interface SetStateAction {
  type: 'setState';
  targetId: string;
  state: string;
  /** Auto-revert to previous state after N ms (e.g. Toast disappears after 3000ms) */
  autoRevertMs?: number;
}

/** Open an external URL */
export interface OpenUrlAction {
  type: 'openUrl';
  url: string;
}

/** Delay before next action in chain (ms) */
export interface DelayAction {
  type: 'delay';
  duration: number; // milliseconds
}

/** Custom handler (for extensibility) */
export interface CustomAction {
  type: 'custom';
  handler: string;
}

/** Set a domain state variable value */
export interface SetDomainStateAction {
  type: 'setDomainState';
  variableName: string;
  value: string;
}

/** Set an environment state variable value */
export interface SetEnvironmentStateAction {
  type: 'setEnvironmentState';
  variableName: string;
  value: string;
}

/** Toggle a node's visibility */
export interface ToggleVisibleAction {
  type: 'toggleVisible';
  targetId: string;
}

/** Toast display position */
export type ToastPosition = 'top-center' | 'bottom-center' | 'top-right';

/** Toast visual type */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Show a toast notification */
export interface ShowToastAction {
  type: 'showToast';
  toastType: ToastType;
  /** Message content — supports {{response.xxx}} expressions */
  message: string;
  /** Duration in ms, default 3000 */
  duration?: number;
  position?: ToastPosition;
}

/** Send an API request with success/failure branching */
export interface ApiRequestAction {
  type: 'apiRequest';
  /** References Screen.apiEndpoints[].definition.id */
  requestId: string;
  /** Runtime parameter overrides */
  paramOverrides?: Record<string, string>;
  /** Actions to execute on success (2xx status) */
  onSuccess: EventAction[];
  /** Actions to execute on failure (non-2xx or timeout) */
  onFailure: EventAction[];
}

/** Union of all possible event actions */
export type EventAction =
  | NavigateAction
  | SetStateAction
  | OpenUrlAction
  | DelayAction
  | CustomAction
  | SetDomainStateAction
  | SetEnvironmentStateAction
  | ToggleVisibleAction
  | ShowToastAction
  | ApiRequestAction;

/** Condition for conditional event execution */
export interface EventCondition {
  type: 'domainState' | 'environmentState' | 'dataBinding' | 'propValue';
  variableName: string;
  value: string;
}

/** A bound interaction event on a component */
export interface ComponentEvent {
  /** What triggers this event */
  trigger: EventTrigger;
  /** Ordered list of actions to execute when triggered */
  actions: EventAction[];
  /** Optional: only execute when condition is met */
  condition?: EventCondition;
  /** Optional: human-readable description */
  description?: string;
  /** Optional: disable without removing */
  disabled?: boolean;
}
