import type { Expression } from './expression';

// ===== State 操作动词 =====

/** state.set — 把 state 路径上的值替换为 value 求值结果 */
export interface StateSetAction {
  type: 'state.set';
  /** 路径，如 "view.inputDraft" 或 "data.messages[2].text" */
  path: string;
  /** 表达式或字面值 */
  value: Expression | unknown;
}

/** state.append — path 必须指向数组，把 value 追加进去 */
export interface StateAppendAction {
  type: 'state.append';
  path: string;
  value: Expression | unknown;
}

/** state.remove — path 数组中按索引或 predicate 删除 */
export interface StateRemoveAction {
  type: 'state.remove';
  path: string;
  /** 索引（负数表示倒数）或谓词表达式 (item, index) => boolean */
  index?: number;
  predicate?: Expression<boolean>;
}

/** state.merge — path 必须指向对象，与 value 浅合并 */
export interface StateMergeAction {
  type: 'state.merge';
  path: string;
  value: Expression | Record<string, unknown>;
}

/** state.toggle — path 必须指向 boolean，反转 */
export interface StateToggleAction {
  type: 'state.toggle';
  path: string;
}

// ===== Effect 副作用动词 =====

/**
 * effect.fetch — 触发数据源加载（mock 或真实接口由运行时按 env 决定）。
 * onSuccess/onError 在副作用结束后展开成动作链。
 */
export interface EffectFetchAction {
  type: 'effect.fetch';
  /** 引用 Screen.dataSources[].id 中的某个 api 类型源 */
  dataSourceId: string;
  /** 运行时参数（覆盖 endpoint.query / endpoint.body 默认值） */
  params?: Record<string, Expression | unknown>;
  /** 成功后串行执行的子动作链 */
  onSuccess?: Action[];
  /** 失败后串行执行的子动作链 */
  onError?: Action[];
}

/** effect.cancel — 取消进行中的 fetch */
export interface EffectCancelAction {
  type: 'effect.cancel';
  /** 不传则取消该屏幕所有 pending fetch */
  dataSourceId?: string;
}

// ===== 导航动词 =====

/** 导航过渡动画 */
export interface NavTransitionAnimation {
  type: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'none';
  duration?: number;
  easing?: string;
}

export interface NavGoAction {
  type: 'nav.go';
  targetScreenId: string;
  animation?: NavTransitionAnimation;
}

export interface NavBackAction {
  type: 'nav.back';
}

// ===== 节点视觉态动词 =====

/** 临时切换某节点的 VisualState（含可选自动回退） */
export interface NodeSetVisualStateAction {
  type: 'node.setVisualState';
  /** 目标节点 id（不传则用宿主节点） */
  nodeId?: string;
  /** 要切到的 visualState 名 */
  state: string;
  /** N ms 后自动回退到 default（不写则永久） */
  autoRevertMs?: number;
}

// ===== UI 副作用动词 =====

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-center' | 'bottom-center' | 'top-right';

export interface UiShowToastAction {
  type: 'ui.showToast';
  toastType: ToastType;
  message: Expression<string> | string;
  /** ms，默认 3000 */
  duration?: number;
  position?: ToastPosition;
}

export interface UiOpenUrlAction {
  type: 'ui.openUrl';
  url: Expression<string> | string;
  openInNewTab?: boolean;
}

export interface UiDelayAction {
  type: 'ui.delay';
  /** ms */
  duration: number;
}

/** ui.startTimer — 启动计时器，支持单次延迟或循环执行 */
export interface UiStartTimerAction {
  type: 'ui.startTimer';
  /** 计时器唯一标识 */
  timerId: string;
  /** 总运行时长（ms） */
  duration: number;
  /** 循环间隔（ms），不传或 ≤ 0 则单次执行 */
  interval?: number;
  /** 每个 interval 周期触发的动作链（仅 interval > 0 时生效） */
  onTick?: Action[];
  /** 计时完成后执行的动作链 */
  onComplete?: Action[];
  /** 启动时是否自动取消同 id 的旧计时器（默认 true） */
  autoCancel?: boolean;
}

/** ui.stopTimer — 停止指定计时器 */
export interface UiStopTimerAction {
  type: 'ui.stopTimer';
  timerId: string;
}

/** ui.resetTimer — 重置指定计时器（停止后需重新启动） */
export interface UiResetTimerAction {
  type: 'ui.resetTimer';
  timerId: string;
}

// ===== 自定义扩展 =====

/** ui.animate — 触发节点 CSS 动画（shake/fadeIn/bounce 等） */
export interface UiAnimateAction {
  type: 'ui.animate';
  /** 目标节点 id（不传则为触发事件的节点自身） */
  nodeId?: string;
  /** 预置动画名 或 自定义 keyframes CSS */
  animation: string;
  /** ms，默认 300 */
  duration?: number;
  /** 默认 'ease' */
  easing?: string;
  /** 动画结束后执行的动作链 */
  onComplete?: Action[];
}

/** ui.showOverlay — 显示全局覆盖层（Modal/Sheet/Drawer） */
export interface UiShowOverlayAction {
  type: 'ui.showOverlay';
  /** 目标 overlay 的 id（对应 Screen.overlays[].id） */
  overlayId: string;
}

/** ui.hideOverlay — 隐藏全局覆盖层 */
export interface UiHideOverlayAction {
  type: 'ui.hideOverlay';
  /** 目标 overlay 的 id；不传则隐藏所有覆盖层 */
  overlayId?: string;
}

export interface CustomAction {
  type: 'custom';
  /** 业务方实现：宿主侧注册的 handler 名 */
  handler: string;
  /** 任意附加参数 */
  payload?: Record<string, unknown>;
}

// ===== 逻辑控制动词 =====

/**
 * logic.if — 条件分支：when 为真执行 then，否则执行 else（可选）
 */
export interface LogicIfAction {
  type: 'logic.if';
  /** 条件表达式 */
  when: Expression<boolean>;
  /** 条件为真时执行的动作链 */
  then: Action[];
  /** 条件为假时执行的动作链（可选） */
  else?: Action[];
}

/**
 * logic.switch — 多分支：按 value 匹配 cases，找到 match 的执行其 actions；
 * 都不匹配则执行 default（可选）
 */
export interface LogicSwitchCaseBranch {
  /** 要匹配的值（与 value 通过 === 比较）*/
  match: Expression | unknown;
  /** 匹配时执行的动作链 */
  actions: Action[];
}

export interface LogicSwitchAction {
  type: 'logic.switch';
  /** 要判断的值 */
  value: Expression | unknown;
  /** 各分支（按顺序检查，第一个匹配的执行） */
  cases: LogicSwitchCaseBranch[];
  /** 都不匹配时执行的动作链（可选） */
  default?: Action[];
}

// ===== 动词联合 =====

export type Action =
  | StateSetAction
  | StateAppendAction
  | StateRemoveAction
  | StateMergeAction
  | StateToggleAction
  | EffectFetchAction
  | EffectCancelAction
  | NavGoAction
  | NavBackAction
  | NodeSetVisualStateAction
  | UiShowToastAction
  | UiOpenUrlAction
  | UiDelayAction
  | UiStartTimerAction
  | UiStopTimerAction
  | UiResetTimerAction
  | UiAnimateAction
  | UiShowOverlayAction
  | UiHideOverlayAction
  | LogicIfAction
  | LogicSwitchAction
  | CustomAction;

export type ActionType = Action['type'];

// ===== Event 触发器 =====

export type EventTrigger =
  | 'click'
  | 'doubleClick'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'longPress'
  | 'screenEnter'
  | 'screenExit'
  | 'screenVisible'
  | 'screenHidden'
  | 'scrollReachBottom'
  | 'scrollReachTop'
  | 'navigateBack'
  /** 受控 input 变化时触发（v2 新增） */
  | 'change'
  /** 表单提交时触发（v2 新增） */
  | 'submit';

/** 事件条件 —— 用表达式替代 v1 的 'domainState' / 'expression' 二元 */
export interface EventCondition {
  /** boolean 表达式，true 才执行 actions */
  when: Expression<boolean>;
}

/** 一个绑定在节点上的交互事件 */
export interface ComponentEvent {
  trigger: EventTrigger;
  /** 串行执行的动作链 */
  actions: Action[];
  /** 可选：only execute when condition is met */
  condition?: EventCondition;
  /** 可选：人类可读描述 */
  description?: string;
  /** 可选：暂时禁用但保留配置 */
  disabled?: boolean;
  /** 可选：滚动触发配置（scrollReachBottom/scrollReachTop 专用） */
  scrollConfig?: {
    /** 距边缘 px（默认 100） */
    threshold?: number;
    /** 防抖间隔 ms（默认 300） */
    debounce?: number;
  };
}
