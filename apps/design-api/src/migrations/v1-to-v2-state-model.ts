/**
 * v1 → v2 schema 迁移层（state-action-expression 模型）
 *
 * 关联 RFC：design_docs/03-tech/state-action-expression-rfc.md §四
 *
 * 设计要点：
 * 1. **纯函数**：输入 v1 schema（任意 JSON），输出 v2 schema（DesignProject）。
 *    不读 DB、不依赖 Nest、不抛异常 —— 字段缺失时回退到 v2 默认值。
 * 2. **幂等**：已是 v2 的 schema 跑过一次仍得到 v2（按字段形态判断）。
 * 3. 完整覆盖 RFC §4.2 字段映射表。
 *
 * 使用场景：
 *   - `ProjectsService.findOne()` 即时迁移（防御未升级 DB）
 *   - `scripts/migrate-v1-to-v2.ts` 批量永久升级 DB
 */

import type {
  DesignProject,
  Screen,
  ComponentNode,
  ComponentTemplate,
  DataSource,
  StaticDataSource,
  ApiDataSource,
  MockScenario,
  ScreenStateInit,
  GlobalStateInit,
  ViewVariableDef,
  Action,
  ComponentEvent,
  EventTrigger,
  Expression,
} from '@globallink/design-schema';

// ===== 入口 =====

/**
 * 迁移整个项目。
 * @param raw 任意 JSON，期望但不强制是 v1 形态
 * @returns v2 形态的 DesignProject
 */
export function migrateV1toV2(raw: unknown): DesignProject {
  const v1 = (raw ?? {}) as Record<string, unknown>;

  const screensV1 = Array.isArray(v1.screens) ? (v1.screens as unknown[]) : [];
  const componentAssetsV1 = Array.isArray(v1.componentAssets)
    ? (v1.componentAssets as unknown[])
    : [];

  return {
    id: typeof v1.id === 'string' ? v1.id : '',
    name: typeof v1.name === 'string' ? v1.name : '',
    platform:
      v1.platform === 'pc' || v1.platform === 'mobile' ? v1.platform : 'mobile',
    defaultViewport: (v1.defaultViewport ?? {}) as DesignProject['defaultViewport'],
    currentViewport: (v1.currentViewport ?? v1.defaultViewport ?? {}) as DesignProject['currentViewport'],
    viewportPresets: Array.isArray(v1.viewportPresets)
      ? (v1.viewportPresets as DesignProject['viewportPresets'])
      : [],
    screens: screensV1.map(migrateScreen),
    componentAssets: componentAssetsV1.map(migrateTemplate),
    globalStateInit: migrateGlobalStateInit(v1.environmentStates, v1.globalStateInit),
    createdAt:
      typeof v1.createdAt === 'string' ? v1.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof v1.updatedAt === 'string' ? v1.updatedAt : new Date(0).toISOString(),
  };
}

// ===== Screen =====

function migrateScreen(raw: unknown): Screen {
  const s = (raw ?? {}) as Record<string, unknown>;
  const dataSourcesV1 = Array.isArray(s.dataSources) ? (s.dataSources as unknown[]) : [];
  return {
    id: typeof s.id === 'string' ? s.id : '',
    name: typeof s.name === 'string' ? s.name : '',
    rootNode: migrateNode(s.rootNode ?? defaultRootRaw()),
    backgroundColor:
      typeof s.backgroundColor === 'string' ? s.backgroundColor : undefined,
    dataSources: dataSourcesV1.map(migrateDataSource),
    stateInit: migrateScreenStateInit(s.domainStates, s.stateInit),
  };
}

function defaultRootRaw(): Record<string, unknown> {
  return {
    id: '__root_missing__',
    type: 'div',
    name: 'Root',
    styles: {},
    props: {},
    states: [],
    activeState: 'default',
    events: [],
    locked: false,
    visible: true,
  };
}

// ===== Template / Asset =====

function migrateTemplate(raw: unknown): ComponentTemplate {
  const t = (raw ?? {}) as Record<string, unknown>;
  return {
    ...(t as Record<string, unknown>),
    id: typeof t.id === 'string' ? t.id : '',
    name: typeof t.name === 'string' ? t.name : '',
    schema: migrateNode(t.schema ?? defaultRootRaw()),
  } as ComponentTemplate;
}

// ===== DataSource =====

interface V1Scenario {
  id: string;
  name?: string;
  description?: string;
  data?: unknown;
  isDefault?: boolean;
}

function migrateDataSource(raw: unknown): DataSource {
  const ds = (raw ?? {}) as Record<string, unknown>;
  const id = typeof ds.id === 'string' ? ds.id : '';
  const name = typeof ds.name === 'string' ? ds.name : id;
  const description =
    typeof ds.description === 'string' ? ds.description : undefined;

  // 已是 v2：type 为 'static'|'api' 且无 v1 专有字段
  const isV2Static =
    ds.type === 'static' && 'initial' in ds && !('scenarios' in ds);
  const isV2Api = ds.type === 'api' && 'endpoint' in ds && !('lifecycle' in ds);

  if (isV2Static) {
    return {
      id,
      type: 'static',
      name,
      description,
      initial: ds.initial,
    } satisfies StaticDataSource;
  }
  if (isV2Api) {
    return {
      id,
      type: 'api',
      name,
      description,
      endpoint: ds.endpoint as ApiDataSource['endpoint'],
      mock: ds.mock as ApiDataSource['mock'] | undefined,
      autoFetchOnEnter:
        typeof ds.autoFetchOnEnter === 'boolean' ? ds.autoFetchOnEnter : undefined,
      defaultParams:
        (ds.defaultParams as ApiDataSource['defaultParams']) ?? undefined,
    } satisfies ApiDataSource;
  }

  // ===== v1 → v2 =====
  const lifecycle = ds.lifecycle === 'api' ? 'api' : 'static';
  const scenarios = (Array.isArray(ds.scenarios) ? ds.scenarios : []) as V1Scenario[];
  const activeScenarioId =
    typeof ds.activeScenarioId === 'string' ? ds.activeScenarioId : scenarios[0]?.id;
  const activeScenario =
    scenarios.find((sc) => sc.id === activeScenarioId) ?? scenarios[0];

  if (lifecycle === 'static') {
    return {
      id,
      type: 'static',
      name,
      description,
      initial: activeScenario?.data ?? null,
    } satisfies StaticDataSource;
  }

  // api：保留 scenarios 作为 mock
  const v2Scenarios: MockScenario[] = scenarios.map((sc) => ({
    id: typeof sc.id === 'string' ? sc.id : '',
    name: typeof sc.name === 'string' ? sc.name : sc.id ?? '',
    description: sc.description,
    statusCode: 200,
    delay: 0,
    responseBody: sc.data ?? null,
  }));

  const endpointRaw = ds.endpoint as Record<string, unknown> | undefined;
  const endpoint: ApiDataSource['endpoint'] = {
    method: ((endpointRaw?.method as ApiDataSource['endpoint']['method']) ?? 'GET'),
    path: typeof endpointRaw?.path === 'string' ? endpointRaw.path : '',
    headers: (endpointRaw?.headers as ApiDataSource['endpoint']['headers']) ?? undefined,
    query: (endpointRaw?.query as ApiDataSource['endpoint']['query']) ?? undefined,
    body: (endpointRaw?.body as ApiDataSource['endpoint']['body']) ?? undefined,
    responseSchema:
      (endpointRaw?.responseSchema as ApiDataSource['endpoint']['responseSchema']) ??
      undefined,
  };

  return {
    id,
    type: 'api',
    name,
    description,
    endpoint,
    mock:
      v2Scenarios.length > 0
        ? {
            scenarios: v2Scenarios,
            activeScenarioId: activeScenarioId ?? v2Scenarios[0]!.id,
          }
        : undefined,
    autoFetchOnEnter:
      typeof ds.autoFetchOnEnter === 'boolean' ? ds.autoFetchOnEnter : true,
  } satisfies ApiDataSource;
}

// ===== ScreenState / GlobalState =====

interface V1StateVar {
  id?: string;
  name: string;
  label?: string;
  defaultValue?: unknown;
  value?: unknown;
  enum?: { value: unknown; label: string }[];
}

function migrateScreenStateInit(
  rawDomain: unknown,
  rawStateInit: unknown,
): ScreenStateInit | undefined {
  const existing = rawStateInit as ScreenStateInit | undefined;
  const view: Record<string, ViewVariableDef> = { ...(existing?.view ?? {}) };
  const data: Record<string, unknown> = { ...(existing?.data ?? {}) };

  const arr = Array.isArray(rawDomain) ? (rawDomain as V1StateVar[]) : [];
  for (const ds of arr) {
    if (!ds || typeof ds.name !== 'string') continue;
    if (view[ds.name]) continue;
    view[ds.name] = {
      name: ds.name,
      label: typeof ds.label === 'string' ? ds.label : undefined,
      defaultValue: ds.defaultValue ?? ds.value ?? '',
      enum: Array.isArray(ds.enum) ? ds.enum : undefined,
    };
  }

  if (Object.keys(view).length === 0 && Object.keys(data).length === 0) {
    return undefined;
  }
  return {
    view: Object.keys(view).length > 0 ? view : undefined,
    data: Object.keys(data).length > 0 ? data : undefined,
  };
}

function migrateGlobalStateInit(
  rawEnv: unknown,
  rawGlobal: unknown,
): GlobalStateInit | undefined {
  const existing = rawGlobal as GlobalStateInit | undefined;
  const view: Record<string, ViewVariableDef> = { ...(existing?.view ?? {}) };

  const arr = Array.isArray(rawEnv) ? (rawEnv as V1StateVar[]) : [];
  for (const ev of arr) {
    if (!ev || typeof ev.name !== 'string') continue;
    if (view[ev.name]) continue;
    view[ev.name] = {
      name: ev.name,
      label: typeof ev.label === 'string' ? ev.label : undefined,
      defaultValue: ev.defaultValue ?? ev.value ?? '',
      enum: Array.isArray(ev.enum) ? ev.enum : undefined,
    };
  }

  if (Object.keys(view).length === 0) return undefined;
  return { view };
}

// ===== Node tree =====

function migrateNode(raw: unknown): ComponentNode {
  const n = (raw ?? {}) as Record<string, unknown>;
  const id = typeof n.id === 'string' ? n.id : '';
  const type =
    typeof n.type === 'string' ? (n.type as ComponentNode['type']) : 'div';

  const stylesV1 = (n.styles ?? {}) as Record<string, unknown>;
  const propsV1 = (n.props ?? {}) as Record<string, unknown>;
  const eventsV1 = Array.isArray(n.events) ? (n.events as unknown[]) : [];
  const childrenV1 = Array.isArray(n.children)
    ? (n.children as unknown[])
    : undefined;

  // v1 props.__listData / v2.0 node.repeat(string) → v2.1 node.repeat({ expression, template })
  let repeatExpression: string | undefined;
  if (typeof propsV1.__listData === 'string') {
    repeatExpression = propsV1.__listData;
  } else if (typeof n.repeat === 'string') {
    repeatExpression = n.repeat;
  } else if (
    n.repeat &&
    typeof n.repeat === 'object' &&
    typeof (n.repeat as Record<string, unknown>).expression === 'string'
  ) {
    // 已是 v2.1 结构，直接保留
    repeatExpression = (n.repeat as Record<string, unknown>).expression as string;
  }
  const propsV2: Record<string, Expression | unknown> = {};
  for (const [k, v] of Object.entries(propsV1)) {
    if (k === '__listData') continue;
    propsV2[k] = v;
  }

  // visibilityWhen → visibleWhen
  let visibleWhen: Expression<boolean> | undefined;
  if (typeof n.visibleWhen === 'string') {
    visibleWhen = n.visibleWhen as Expression<boolean>;
  } else if (n.visibilityWhen) {
    visibleWhen = convertVisibilityWhen(n.visibilityWhen);
  }

  // bind：v1 无此字段，保留 v2 的
  const bind =
    n.bind && typeof (n.bind as Record<string, unknown>).path === 'string'
      ? { path: String((n.bind as Record<string, unknown>).path) }
      : undefined;

  const events: ComponentEvent[] = eventsV1.map(migrateEvent).filter(Boolean) as ComponentEvent[];

  // v2.1 RepeatBinding：template = children[0]（并从 children 中移出）；无 children 则不设 repeat
  const migratedChildren = childrenV1 ? childrenV1.map(migrateNode) : undefined;
  let repeatBinding: ComponentNode['repeat'];
  let finalChildren = migratedChildren;
  if (repeatExpression) {
    // 如果原本已有 v2.1 对象 repeat 且带 template，则直接用
    const existing = n.repeat as Record<string, unknown> | undefined;
    if (existing && typeof existing === 'object' && existing.template) {
      repeatBinding = {
        expression: repeatExpression as Expression<unknown[]>,
        template: migrateNode(existing.template),
      };
    } else if (migratedChildren && migratedChildren.length > 0) {
      repeatBinding = {
        expression: repeatExpression as Expression<unknown[]>,
        template: migratedChildren[0],
      };
      finalChildren = migratedChildren.slice(1);
    } else {
      // 没有 children 可作为 template —— 保守起见不设 repeat，避免破坏节点树
      // （可打日志，但迁移脚本无标准 logger；静默跳过）
    }
  }

  return {
    id,
    type,
    name: typeof n.name === 'string' ? n.name : undefined,
    styles: stylesV1 as ComponentNode['styles'],
    children: finalChildren,
    props: propsV2,
    states: Array.isArray(n.states) ? (n.states as ComponentNode['states']) : [],
    activeState: typeof n.activeState === 'string' ? n.activeState : 'default',
    events,
    constraints: n.constraints as ComponentNode['constraints'],
    templateRef: n.templateRef as ComponentNode['templateRef'],
    locked: Boolean(n.locked),
    visible: n.visible === undefined ? true : Boolean(n.visible),
    visibleWhen,
    repeat: repeatBinding,
    bind,
    animation: n.animation as ComponentNode['animation'],
    materialProjectId:
      typeof n.materialProjectId === 'string' ? n.materialProjectId : undefined,
    editorMetadata: n.editorMetadata as ComponentNode['editorMetadata'],
  };
}

/** v1 visibilityWhen 结构（equals/字面量）→ v2 expression 字符串 */
function convertVisibilityWhen(raw: unknown): Expression<boolean> | undefined {
  const cond = raw as Record<string, unknown> | undefined;
  if (!cond) return undefined;
  // v1 常见形态：{ variableName: 'x', op: 'equals', value: 'user' }
  const variableName = typeof cond.variableName === 'string' ? cond.variableName : undefined;
  const value = cond.value;
  if (!variableName) return undefined;
  const valExpr = typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : JSON.stringify(value);
  return `{{ state.view.${variableName} === ${valExpr} }}` as Expression<boolean>;
}

// ===== Event / Action =====

function migrateEvent(raw: unknown): ComponentEvent | null {
  const ev = (raw ?? {}) as Record<string, unknown>;
  const trigger = typeof ev.trigger === 'string' ? (ev.trigger as EventTrigger) : 'click';
  const actionsV1 = Array.isArray(ev.actions) ? (ev.actions as unknown[]) : [];
  const actions: Action[] = [];
  for (const a of actionsV1) {
    const migrated = migrateAction(a);
    if (migrated) actions.push(migrated);
  }
  return {
    trigger,
    actions,
    condition: ev.condition as ComponentEvent['condition'],
    description: typeof ev.description === 'string' ? ev.description : undefined,
    disabled: typeof ev.disabled === 'boolean' ? ev.disabled : undefined,
    scrollConfig: ev.scrollConfig as ComponentEvent['scrollConfig'],
  };
}

/**
 * v1 action → v2 action。
 * 返回 null 表示这条 action 已弃用且无对应语义（例如 switchDataSourcePhase）。
 */
function migrateAction(raw: unknown): Action | null {
  const a = (raw ?? {}) as Record<string, unknown>;
  const type = typeof a.type === 'string' ? a.type : '';

  // 已经是 v2 动词
  if (
    type.startsWith('state.') ||
    type.startsWith('effect.') ||
    type.startsWith('nav.') ||
    type.startsWith('node.') ||
    type.startsWith('ui.') ||
    type === 'custom'
  ) {
    return a as unknown as Action;
  }

  switch (type) {
    case 'setDomainState': {
      // v1: { type, variableName, value } → state.set view.<name>
      const name = String(a.variableName ?? a.name ?? '');
      return {
        type: 'state.set',
        path: `view.${name}`,
        value: a.value,
      };
    }
    case 'setGlobalState': {
      const name = String(a.variableName ?? a.name ?? '');
      return {
        type: 'state.set',
        path: `view.${name}`,
        value: a.value,
      };
    }
    case 'setEnvironmentState': {
      // RFC §4.2：非本 RFC 范围，此处就近映射为 state.set，path 前缀 projectState.view.*
      const name = String(a.variableName ?? a.name ?? '');
      return {
        type: 'state.set',
        path: `projectState.view.${name}`,
        value: a.value,
      };
    }
    case 'apiRequest': {
      const dataSourceId = String(a.dataSourceId ?? a.apiId ?? '');
      const onSuccessRaw = Array.isArray(a.onSuccess) ? (a.onSuccess as unknown[]) : [];
      const onErrorRaw = Array.isArray(a.onError) ? (a.onError as unknown[]) : [];
      return {
        type: 'effect.fetch',
        dataSourceId,
        params: a.params as Record<string, unknown> | undefined,
        onSuccess: onSuccessRaw.map(migrateAction).filter(Boolean) as Action[],
        onError: onErrorRaw.map(migrateAction).filter(Boolean) as Action[],
      };
    }
    case 'setState': {
      // v1 语义是"改节点视觉态"
      return {
        type: 'node.setVisualState',
        nodeId: typeof a.nodeId === 'string' ? a.nodeId : undefined,
        state: String(a.state ?? a.stateName ?? 'default'),
        autoRevertMs: typeof a.autoRevertMs === 'number' ? a.autoRevertMs : undefined,
      };
    }
    case 'toggleVisible': {
      const flag = String(a.variableName ?? a.flag ?? '');
      return {
        type: 'state.toggle',
        path: `view.${flag}`,
      };
    }
    case 'navigate':
    case 'nav.go': {
      return {
        type: 'nav.go',
        targetScreenId: String(a.targetScreenId ?? a.screenId ?? ''),
        animation: a.animation as Action extends { animation?: infer T } ? T : undefined,
      };
    }
    case 'navigateBack':
    case 'nav.back': {
      return { type: 'nav.back' };
    }
    case 'showToast': {
      return {
        type: 'ui.showToast',
        toastType: (a.toastType as 'success' | 'error' | 'warning' | 'info') ?? 'info',
        message: String(a.message ?? ''),
        duration: typeof a.duration === 'number' ? a.duration : undefined,
        position: a.position as 'top-center' | 'bottom-center' | 'top-right' | undefined,
      };
    }
    case 'openUrl': {
      return {
        type: 'ui.openUrl',
        url: String(a.url ?? ''),
        openInNewTab: typeof a.openInNewTab === 'boolean' ? a.openInNewTab : undefined,
      };
    }
    case 'delay': {
      return {
        type: 'ui.delay',
        duration: typeof a.duration === 'number' ? a.duration : 0,
      };
    }
    case 'switchDataSourcePhase':
    case 'switchDataScenario':
    case 'addDomainState':
    case 'addEnvironmentState':
      // RFC §4.2：phase 现在是派生态，scenario 切换走 MCP 工具；
      // addDomainState/addEnvironmentState 是操作（op）而非运行时 action，
      // 出现在 action 链里视为无意义，丢弃。
      return null;
    default:
      return null;
  }
}
