/**
 * ScreenState 模型 —— 新模型的核心运行时容器。
 *
 * 替代 v1 的 domainStates / environmentStates / response 临时上下文。
 */

/** 单个 effect 的运行时状态 */
export interface EffectStatus<TData = unknown> {
  /** 'idle' = 未发起；'pending' = 进行中；'success' / 'error' = 已结束 */
  status: 'idle' | 'pending' | 'success' | 'error';
  /** 上次成功响应数据（保留至下次 fetch 覆盖） */
  data?: TData;
  /** 错误信息 */
  error?: { code?: string | number; message: string };
  /** 时间戳（ms，Date.now） */
  startedAt?: number;
  finishedAt?: number;
}

/**
 * 屏幕级运行时状态。三个命名空间互不冲突：
 *   - data    = 业务数据（dataSource 加载结果、由 Action 维护）
 *   - view    = UI 临时状态（输入框值、当前 tab、modal 是否开）
 *   - effects = effect.fetch 等副作用的运行时状态
 */
export interface ScreenState {
  data: Record<string, unknown>;
  view: Record<string, unknown>;
  effects: Record<string, EffectStatus>;
}

/** 屏幕级 view 变量定义（可进 schema） */
export interface ViewVariableDef {
  /** 变量名（同时是 ScreenState.view 的 key） */
  name: string;
  /** 人类可读标签 */
  label?: string;
  /** 默认值（任意 JSON 类型） */
  defaultValue: unknown;
  /** 可选：枚举值列表（编辑器下拉提示用） */
  enum?: { value: unknown; label: string }[];
  /**
   * 编辑期"预览值" —— 用于设计师切换不同状态查看 UI 效果。
   * 不进运行时；运行时永远从 defaultValue 起。
   */
  previewValue?: unknown;
}

/** 屏幕的 stateInit：用于初始化 ScreenState（serialize 进 schema） */
export interface ScreenStateInit {
  /** data 的初始值（通常被 dataSource 覆盖；可手动加常量） */
  data?: Record<string, unknown>;
  /** view 的变量定义集合（key = 变量名） */
  view?: Record<string, ViewVariableDef>;
}

/** 项目级 globalStateInit（顶替 v1 EnvironmentVariable[]） */
export interface GlobalStateInit {
  view?: Record<string, ViewVariableDef>;
}

/** 表达式中可见的运行时 ctx —— 仅类型，便于编辑器自动补全 */
export interface ExpressionContext {
  state: ScreenState;
  /** 列表项中可见 */
  item?: unknown;
  /** 列表项中可见 */
  index?: number;
  /** 嵌套列表的父项 */
  parent?: unknown;
  /** 上一步副作用的结果（onSuccess/onError 链中可用） */
  $last?: EffectStatus;
  /** 内置工具函数命名空间 */
  $: BuiltinFunctions;
}

/** 内置函数白名单（具体实现在 design-engine） */
export interface BuiltinFunctions {
  length(v: unknown): number;
  upper(s: string): string;
  lower(s: string): string;
  format(template: string, ...args: unknown[]): string;
  includes(arr: unknown[] | string, item: unknown): boolean;
  first<T>(arr: T[]): T | undefined;
  last<T>(arr: T[]): T | undefined;
}
