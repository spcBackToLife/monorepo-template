import { z } from 'zod';

// ===== Action (v2 动词联合) zod schemas =====
//
// 每个 Action 子类型用 z.literal('xxx') 区分，
// 用 z.discriminatedUnion('type', [...]) 聚合。
//
// EffectFetchAction 中 onSuccess/onError 内部又是 Action 数组，
// 故在 schema 内通过 z.lazy(() => ActionSchema) 自引用。

const valueSchema = z.unknown();

// ===== State 操作动词 =====

const StateSetActionSchema = z.object({
  type: z.literal('state.set'),
  path: z.string().min(1),
  value: valueSchema,
});

const StateAppendActionSchema = z.object({
  type: z.literal('state.append'),
  path: z.string().min(1),
  value: valueSchema,
});

// 注：state.remove 要求 index 或 predicate 至少一个，
// 但用 .refine() 会变 ZodEffects，无法进 discriminatedUnion。
// 因此把校验移到运行时（dispatcher 里抛错），schema 层只描述形状。
const StateRemoveActionSchema = z.object({
  type: z.literal('state.remove'),
  path: z.string().min(1),
  index: z.number().int().optional(),
  predicate: z.string().optional(),
});

const StateMergeActionSchema = z.object({
  type: z.literal('state.merge'),
  path: z.string().min(1),
  value: valueSchema,
});

const StateToggleActionSchema = z.object({
  type: z.literal('state.toggle'),
  path: z.string().min(1),
});

// ===== Effect 副作用动词 =====

const NavTransitionAnimationSchema = z.object({
  type: z.enum(['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'none']),
  duration: z.number().positive().optional(),
  easing: z.string().optional(),
});

// 导航
const NavGoActionSchema = z.object({
  type: z.literal('nav.go'),
  targetScreenId: z.string().min(1),
  animation: NavTransitionAnimationSchema.optional(),
});

const NavBackActionSchema = z.object({
  type: z.literal('nav.back'),
});

// 节点视觉态
const NodeSetVisualStateActionSchema = z.object({
  type: z.literal('node.setVisualState'),
  nodeId: z.string().optional(),
  state: z.string().min(1),
  autoRevertMs: z.number().positive().optional(),
});

// UI
const UiShowToastActionSchema = z.object({
  type: z.literal('ui.showToast'),
  toastType: z.enum(['success', 'error', 'warning', 'info']),
  message: z.string().min(1),
  duration: z.number().positive().optional(),
  position: z.enum(['top-center', 'bottom-center', 'top-right']).optional(),
});

const UiOpenUrlActionSchema = z.object({
  type: z.literal('ui.openUrl'),
  url: z.string().min(1),
  openInNewTab: z.boolean().optional(),
});

const UiDelayActionSchema = z.object({
  type: z.literal('ui.delay'),
  duration: z.number().positive(),
});

const CustomActionSchema = z.object({
  type: z.literal('custom'),
  handler: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ===== Effect.fetch (含自引用 onSuccess/onError) =====

const EffectFetchActionSchema = z.object({
  type: z.literal('effect.fetch'),
  dataSourceId: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  // 注：自引用，z.lazy 解析到下面的 ActionSchema
  onSuccess: z.array(z.lazy((): z.ZodTypeAny => ActionSchema)).optional(),
  onError: z.array(z.lazy((): z.ZodTypeAny => ActionSchema)).optional(),
});

const EffectCancelActionSchema = z.object({
  type: z.literal('effect.cancel'),
  dataSourceId: z.string().optional(),
});

// ===== 顶层 Action 联合 =====

/**
 * Action 联合 schema。
 *
 * 注意：onSuccess/onError 通过 z.lazy 解引用本 schema，
 * 因此运行时 ActionSchema 必须 export 出来供 lazy 调用。
 */
export const ActionSchema = z.discriminatedUnion('type', [
  StateSetActionSchema,
  StateAppendActionSchema,
  StateRemoveActionSchema,
  StateMergeActionSchema,
  StateToggleActionSchema,
  EffectFetchActionSchema,
  EffectCancelActionSchema,
  NavGoActionSchema,
  NavBackActionSchema,
  NodeSetVisualStateActionSchema,
  UiShowToastActionSchema,
  UiOpenUrlActionSchema,
  UiDelayActionSchema,
  CustomActionSchema,
]);

// ===== EventTrigger =====

export const EventTriggerSchema = z.enum([
  'click',
  'doubleClick',
  'hover',
  'focus',
  'blur',
  'longPress',
  'screenEnter',
  'screenExit',
  'screenVisible',
  'screenHidden',
  'scrollReachBottom',
  'scrollReachTop',
  'navigateBack',
  'change',
  'submit',
]);

// ===== EventCondition (用表达式) =====

export const EventConditionSchema = z.object({
  /** boolean 表达式（编辑期当字符串） */
  when: z.string().min(1),
});

// ===== ComponentEvent =====

export const ComponentEventSchema = z.object({
  trigger: EventTriggerSchema,
  actions: z.array(ActionSchema).default([]),
  condition: EventConditionSchema.optional(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
  scrollConfig: z
    .object({
      threshold: z.number().nonnegative().optional(),
      debounce: z.number().nonnegative().optional(),
    })
    .optional(),
});
