/** Supported event trigger types */
export type EventTrigger = 'click' | 'hover' | 'focus' | 'blur' | 'longPress';

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
}

/** Open an external URL */
export interface OpenUrlAction {
  type: 'openUrl';
  url: string;
}

/** Custom handler (for extensibility) */
export interface CustomAction {
  type: 'custom';
  handler: string;
}

/** Union of all possible event actions */
export type EventAction = NavigateAction | SetStateAction | OpenUrlAction | CustomAction;

/** A bound interaction event on a component */
export interface ComponentEvent {
  /** What triggers this event */
  trigger: EventTrigger;
  /** What happens when triggered */
  action: EventAction;
}
