/**
 * SchemaAnalyzer — 从 DesignProject Schema 生成产品语言的分析结果。
 *
 * 核心原则：输出的每一段文字都是「产品经理写的」，不是「JSON 字段的翻译」。
 */
import type {
  DesignProject,
  Screen,
  ComponentNode,
  ComponentState,
  EventAction,
  EventTrigger,
  CSSProperties,
} from '@globallink/design-schema';
import { walkTree } from '@globallink/design-operations';
import type {
  BlueprintAnalysis,
  ProjectOverview,
  GlobalsAnalysis,
  EnvStateAnalysis,
  TemplateAnalysis,
  ScreenAnalysis,
  ModuleSpec,
  ElementSpec,
  FeatureRow,
  StateVarAnalysis,
  StateWriter,
  StateReader,
  NavEdge,
  EventSummaryEntry,
  BlueprintIndices,
  FlowGraphData,
  FlowNode,
  FlowEdge,
} from './types';

// ==================== Main Entry ====================

export function analyzeProject(project: DesignProject): BlueprintAnalysis {
  const safeScreens = project.screens ?? [];
  const screenMap = new Map(safeScreens.map((s) => [s.id, s]));

  const screens = safeScreens.map((screen) =>
    analyzeScreen(screen, project, screenMap),
  );
  const overview = buildOverview(project, screens);
  const globals = buildGlobals(project);
  const indices = buildIndices(screens, project);

  return { overview, globals, screens, indices };
}

// ==================== Flow Graph Builder ====================

export function buildFlowGraph(
  analysis: BlueprintAnalysis,
  project: DesignProject,
): FlowGraphData {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const edgeSet = new Set<string>();

  // Screen nodes
  for (const sa of analysis.screens) {
    nodes.push({
      id: sa.screen.id,
      type: 'screen',
      label: sa.screen.name,
      metadata: { eventCount: sa.eventCount, nodeCount: sa.nodeCount },
    });
  }

  // Navigation edges with product language labels
  for (const sa of analysis.screens) {
    for (const nav of sa.outgoingNavs) {
      if (!edgeSet.has(nav.edgeId)) {
        edgeSet.add(nav.edgeId);
        edges.push({
          id: nav.edgeId,
          source: nav.fromScreenId,
          target: nav.toScreenId,
          type: 'navigation',
          label: nav.label,
          trigger: nav.trigger,
          metadata: { triggerNodeName: nav.triggerNodeName },
        });
      }
    }
  }

  // Domain state nodes + edges
  for (const sa of analysis.screens) {
    for (const sv of sa.stateAnalysis) {
      const sid = `ds:${sa.screen.id}:${sv.variable.name}`;
      if (!nodes.find((n) => n.id === sid)) {
        nodes.push({
          id: sid,
          type: 'domainState',
          label: sv.variable.label || sv.variable.name,
          screenId: sa.screen.id,
          metadata: { values: sv.variable.values.map((v) => v.label) },
        });
      }
      for (const w of sv.writers) {
        const eid = `sw:${w.nodeId}:${sv.variable.name}:${w.value}`;
        if (!edgeSet.has(eid)) {
          edgeSet.add(eid);
          edges.push({ id: eid, source: sa.screen.id, target: sid, type: 'state-write', label: `${sv.variable.label}="${w.value}"`, trigger: w.trigger, metadata: {} });
        }
      }
      for (const r of sv.readers) {
        const eid = `sr:${r.nodeId}:${sv.variable.name}:${r.value}`;
        if (!edgeSet.has(eid)) {
          edgeSet.add(eid);
          edges.push({ id: eid, source: sid, target: sa.screen.id, type: 'state-read', label: `${r.value} → ${r.effect}`, metadata: {} });
        }
      }
    }
  }

  // API nodes + edges
  for (const sa of analysis.screens) {
    for (const ep of sa.screen.apiEndpoints ?? []) {
      const aid = `api:${sa.screen.id}:${ep.definition.id}`;
      if (!nodes.find((n) => n.id === aid)) {
        nodes.push({ id: aid, type: 'api', label: ep.definition.name, screenId: sa.screen.id, metadata: { method: ep.definition.method, path: ep.definition.path } });
      }
      walkTree(sa.screen.rootNode, (node) => {
        for (const event of node.events ?? []) {
          walkActions(event.actions, (a) => {
            if (a.type === 'apiRequest' && a.requestId === ep.definition.id) {
              const eid = `ac:${node.id}:${ep.definition.id}`;
              if (!edgeSet.has(eid)) {
                edgeSet.add(eid);
                edges.push({ id: eid, source: sa.screen.id, target: aid, type: 'api-call', label: `调用 ${ep.definition.name}`, trigger: event.trigger, metadata: {} });
              }
            }
          });
        }
      });
    }
  }

  return { nodes, edges };
}

// ==================== Screen Analysis ====================

function analyzeScreen(
  screen: Screen,
  project: DesignProject,
  screenMap: Map<string, Screen>,
): ScreenAnalysis {
  let nodeCount = 0;
  let eventCount = 0;

  walkTree(screen.rootNode, (node) => {
    nodeCount++;
    eventCount += (node.events ?? []).length;
  });

  const modules = partitionIntoModules(screen.rootNode, screen, project, screenMap);
  const stateAnalysis = analyzeStates(screen);
  const outgoingNavs = collectAllNavigations(screen, screenMap);
  const incomingNavs = collectIncomingNavigations(screen, project, screenMap);

  // Event summary in product language
  const eventSummary: EventSummaryEntry[] = [];
  walkTree(screen.rootNode, (node) => {
    for (const event of node.events ?? []) {
      eventSummary.push({
        nodeName: node.name || inferElementName(node),
        nodeId: node.id,
        trigger: event.trigger,
        description: describeEventFlow(event, project, screenMap),
        edgeId: `ev:${screen.id}:${node.id}:${event.trigger}`,
      });
    }
  });

  return { screen, modules, stateAnalysis, eventSummary, incomingNavs, outgoingNavs, nodeCount, eventCount };
}

// ==================== Module Partitioning ====================

function partitionIntoModules(
  rootNode: ComponentNode,
  screen: Screen,
  project: DesignProject,
  screenMap: Map<string, Screen>,
): ModuleSpec[] {
  const children = rootNode.children ?? [];
  if (children.length === 0) {
    return [{ name: screen.name, rootNode, elements: analyzeModuleElements(rootNode, screen, project, screenMap) }];
  }

  return children.map((child, i) => {
    const name = child.name || inferModuleName(child, i, children.length);
    const elements = analyzeModuleElements(child, screen, project, screenMap);
    return { name, rootNode: child, elements };
  });
}

function inferModuleName(node: ComponentNode, index: number, total: number): string {
  const type = node.type.toLowerCase();
  const name = (node.name || '').toLowerCase();
  const childTypes = (node.children ?? []).map((c) => c.type);

  if (type === 'header' || type === 'nav' || name.includes('header') || name.includes('top') || name.includes('nav'))
    return '顶部区域';
  if (type === 'footer' || name.includes('footer') || name.includes('bottom'))
    return '底部区域';
  if (name.includes('form') || childTypes.some((t) => t === 'input' || t === 'textarea' || t === 'select'))
    return '表单区域';
  if (childTypes.some((t) => t === 'button') || name.includes('action') || name.includes('submit'))
    return '操作区域';
  if (name.includes('list') || name.includes('card'))
    return '列表区域';
  if (name.includes('sidebar') || name.includes('side'))
    return '侧边栏';

  // Positional fallback
  if (index === 0 && total > 2) return '顶部区域';
  if (index === total - 1 && total > 2) return '底部区域';
  return `区域 ${index + 1}`;
}

// ==================== Element Analysis (Product Language) ====================

function analyzeModuleElements(
  moduleRoot: ComponentNode,
  screen: Screen,
  project: DesignProject,
  screenMap: Map<string, Screen>,
): ElementSpec[] {
  const elements: ElementSpec[] = [];

  walkTree(moduleRoot, (node) => {
    // Skip pure layout containers with no behavior
    if (node.type === 'div' && !hasBehavior(node) && (node.children?.length ?? 0) > 0) return;

    const features: FeatureRow[] = [];
    const name = node.name || inferElementName(node);
    const description = describeElementBrief(node);
    const isDetailed = hasBehavior(node);

    // === Common features ===
    if (typeof node.props.children === 'string' && node.props.children)
      features.push({ label: '文案', value: `"${node.props.children}"` });
    if (typeof node.props.placeholder === 'string')
      features.push({ label: '占位文字', value: `"${node.props.placeholder}"` });
    if (typeof node.props.src === 'string')
      features.push({ label: '图片地址', value: node.props.src as string });
    if (typeof node.props.href === 'string')
      features.push({ label: '链接地址', value: node.props.href as string });

    // === Input-specific features ===
    if (node.type === 'input' || node.type === 'textarea' || node.type === 'select') {
      if (node.props.type) features.push({ label: '输入类型', value: String(node.props.type) });
      if (node.props.maxLength) features.push({ label: '最大长度', value: String(node.props.maxLength) });
      if (node.props.required) features.push({ label: '必填', value: '是' });
      if (node.props.disabled) features.push({ label: '禁用', value: '是' });
    }

    // === Style-derived features ===
    const s = node.styles ?? {};
    if (s.width && s.height && node.type === 'img')
      features.push({ label: '尺寸', value: `${s.width} × ${s.height}` });
    if (s.fontSize)
      features.push({ label: '字号', value: String(s.fontSize) });
    if (s.color)
      features.push({ label: '文字颜色', value: String(s.color) });
    if (s.backgroundColor && node.type !== 'div')
      features.push({ label: '背景色', value: String(s.backgroundColor) });
    if (s.borderRadius)
      features.push({ label: '圆角', value: String(s.borderRadius) });

    // === Data bindings ===
    const bindings = extractDataBindings(node);
    for (const b of bindings) {
      features.push({ label: `数据绑定(${b.prop})`, value: b.expression });
    }

    // === Conditional logic ===
    if (node.visibilityWhen) {
      features.push({
        label: '显示条件',
        value: `当 ${node.visibilityWhen.variableName} = "${node.visibilityWhen.equals}" 时显示`,
      });
    }
    for (const b of node.domainStateBindings ?? []) {
      features.push({
        label: `条件逻辑(${b.variableName}=${b.value})`,
        value: b.visible === false ? '隐藏此元素' : b.styles ? describeStyleChange(b.styles) : '属性变化',
      });
    }
    for (const b of node.environmentBindings ?? []) {
      features.push({
        label: `环境响应(${b.variableName}=${b.value})`,
        value: b.visible === false ? '隐藏此元素' : b.styles ? describeStyleChange(b.styles) : '属性变化',
      });
    }

    // === States ===
    const stateDescriptions = (node.states ?? []).map((state) => ({
      name: state.name,
      description: describeStateInProductLanguage(state, node.styles),
    }));

    // === Interaction flow ===
    let interactionFlow: string | null = null;
    if ((node.events ?? []).length > 0) {
      const flows = (node.events ?? []).map((ev) => describeEventFlow(ev, project, screenMap));
      interactionFlow = flows.join('\n');
      // Also add as features
      for (const ev of node.events ?? []) {
        features.push({
          label: `${triggerLabel(ev.trigger)}交互`,
          value: describeEventFlow(ev, project, screenMap),
        });
      }
      if ((node.events ?? []).some((e) => e.condition)) {
        for (const ev of node.events ?? []) {
          if (ev.condition) {
            features.push({
              label: '执行条件',
              value: `仅在 ${ev.condition.variableName} = "${ev.condition.value}" 时可触发`,
            });
          }
        }
      }
    }

    elements.push({
      nodeId: node.id,
      name,
      type: node.type,
      node,
      description,
      features,
      stateDescriptions,
      interactionFlow,
      isDetailed,
    });
  });

  return elements;
}

// ==================== Product Language Generators ====================

function inferElementName(node: ComponentNode): string {
  if (node.name) return node.name;
  const typeMap: Record<string, string> = {
    img: '图片', button: '按钮', input: '输入框', textarea: '文本域',
    select: '选择器', a: '链接', h1: '主标题', h2: '副标题', h3: '小标题',
    p: '段落', span: '文本', nav: '导航', header: '页眉', footer: '页脚',
    ul: '列表', ol: '有序列表', li: '列表项', section: '区块', main: '主区域',
  };
  const base = typeMap[node.type] || node.type;
  const text = typeof node.props.children === 'string' ? node.props.children : '';
  if (text && text.length <= 8) return `${base}「${text}」`;
  return base;
}

function describeElementBrief(node: ComponentNode): string {
  const parts: string[] = [];
  const typeMap: Record<string, string> = {
    img: '图片元素', button: '按钮', input: '输入框', textarea: '文本域',
    select: '下拉选择', a: '超链接', h1: '一级标题', h2: '二级标题', h3: '三级标题',
    p: '段落文本', span: '行内文本', div: '容器', nav: '导航容器', header: '头部容器',
    footer: '底部容器', section: '区块容器', main: '主内容区',
  };
  parts.push(typeMap[node.type] || node.type);

  const text = typeof node.props.children === 'string' ? node.props.children : '';
  if (text && text.length <= 30) parts.push(`"${text}"`);

  const s = node.styles ?? {};
  if (s.fontSize) parts.push(`${s.fontSize} 字号`);
  if (s.fontWeight && Number(s.fontWeight) >= 600) parts.push('加粗');
  if (s.width && s.height && node.type === 'img') parts.push(`${s.width}×${s.height}`);

  return parts.join('，');
}

function describeStateInProductLanguage(state: ComponentState, baseStyles: CSSProperties): string {
  if (state.name === 'default') return '默认外观';

  const changes: string[] = [];
  const s = state.styles ?? {};

  if (s.backgroundColor) {
    const base = baseStyles?.backgroundColor;
    changes.push(base ? `背景色从 ${base} 变为 ${s.backgroundColor}` : `背景色为 ${s.backgroundColor}`);
  }
  if (s.color) changes.push(`文字颜色变为 ${s.color}`);
  if (s.opacity !== undefined) changes.push(`透明度变为 ${Number(s.opacity) * 100}%`);
  if (s.transform) changes.push(`添加变换效果 ${s.transform}`);
  if (s.borderColor) changes.push(`边框颜色变为 ${s.borderColor}`);
  if (s.cursor === 'not-allowed') changes.push('鼠标显示为禁止');
  if (s.cursor === 'pointer') changes.push('鼠标显示为手型');
  if (s.pointerEvents === 'none') changes.push('禁止点击');

  if (state.props?.children && typeof state.props.children === 'string')
    changes.push(`文案变为 "${state.props.children}"`);
  if (state.childrenVisibility) {
    const hidden = Object.values(state.childrenVisibility).filter((v) => !v).length;
    const shown = Object.values(state.childrenVisibility).filter((v) => v).length;
    if (hidden > 0) changes.push(`隐藏 ${hidden} 个子元素`);
    if (shown > 0) changes.push(`显示 ${shown} 个子元素`);
  }
  if (state.disabledEvents?.length) changes.push(`禁用 ${state.disabledEvents.length} 个交互事件`);

  return changes.length > 0 ? changes.join('；') : '样式微调';
}

function describeEventFlow(
  event: ComponentEvent,
  project: DesignProject,
  screenMap: Map<string, Screen>,
): string {
  const parts: string[] = [];
  let step = 1;

  if (event.condition) {
    parts.push(`前提：${event.condition.variableName} = "${event.condition.value}"`);
  }

  for (const action of event.actions) {
    parts.push(`${circledNum(step)} ${describeActionProductLang(action, project, screenMap)}`);
    step++;

    if (action.type === 'apiRequest') {
      if (action.onSuccess?.length) {
        const successParts = action.onSuccess.map((a) => describeActionProductLang(a, project, screenMap));
        parts.push(`   ✓ 成功：${successParts.join(' → ')}`);
      }
      if (action.onFailure?.length) {
        const failParts = action.onFailure.map((a) => describeActionProductLang(a, project, screenMap));
        parts.push(`   ✗ 失败：${failParts.join(' → ')}`);
      }
    }
  }

  return parts.join(' → ');
}

function describeActionProductLang(
  action: EventAction,
  project: DesignProject,
  screenMap: Map<string, Screen>,
): string {
  switch (action.type) {
    case 'navigate': {
      const name = screenMap.get(action.targetScreenId)?.name ?? '未知页面';
      const anim = action.animation ? `(${animationLabel(action.animation.type)})` : '';
      return `跳转到「${name}」${anim}`;
    }
    case 'setState':
      return `切换至${action.state}状态${action.autoRevertMs ? `(${action.autoRevertMs}ms后恢复)` : ''}`;
    case 'setDomainState':
      return `设置${action.variableName}为"${action.value}"`;
    case 'setEnvironmentState':
      return `设置全局${action.variableName}为"${action.value}"`;
    case 'apiRequest': {
      let name = action.requestId;
      for (const s of project.screens ?? []) {
        const ep = (s.apiEndpoints ?? []).find((e) => e.definition.id === action.requestId);
        if (ep) { name = `${ep.definition.name}(${ep.definition.method} ${ep.definition.path})`; break; }
      }
      return `调用接口「${name}」`;
    }
    case 'showToast': {
      const t: Record<string, string> = { success: '成功', error: '错误', warning: '警告', info: '信息' };
      return `显示${t[action.toastType] ?? ''}提示"${action.message}"`;
    }
    case 'toggleVisible': return '切换元素可见性';
    case 'openUrl': return `打开链接 ${action.url}`;
    case 'delay': return `等待${action.duration}ms`;
    case 'cancelApiRequest': return '取消待处理的API请求';
    case 'custom': return `执行自定义逻辑`;
    default: return '未知操作';
  }
}

function describeStyleChange(styles: Partial<CSSProperties>): string {
  const parts: string[] = [];
  if (styles.backgroundColor) parts.push(`背景色 ${styles.backgroundColor}`);
  if (styles.color) parts.push(`文字色 ${styles.color}`);
  if (styles.opacity !== undefined) parts.push(`透明度 ${styles.opacity}`);
  if (styles.display === 'none') parts.push('隐藏');
  return parts.length > 0 ? parts.join('，') : '样式变化';
}

// ==================== Navigation Collection ====================

function collectAllNavigations(screen: Screen, screenMap: Map<string, Screen>): NavEdge[] {
  const navs: NavEdge[] = [];
  walkTree(screen.rootNode, (node) => {
    for (const event of node.events ?? []) {
      walkActions(event.actions, (action) => {
        if (action.type === 'navigate') {
          const target = screenMap.get(action.targetScreenId);
          const nodeName = node.name || inferElementName(node);
          navs.push({
            fromScreenId: screen.id,
            fromScreenName: screen.name,
            toScreenId: action.targetScreenId,
            toScreenName: target?.name ?? '未知页面',
            triggerNodeId: node.id,
            triggerNodeName: nodeName,
            trigger: event.trigger,
            label: `${triggerLabel(event.trigger)}${nodeName} → ${target?.name ?? '未知页面'}`,
            edgeId: `nav:${screen.id}:${node.id}:${action.targetScreenId}`,
          });
        }
      });
    }
  });
  return navs;
}

function collectIncomingNavigations(screen: Screen, project: DesignProject, screenMap: Map<string, Screen>): NavEdge[] {
  const navs: NavEdge[] = [];
  for (const other of project.screens ?? []) {
    if (other.id === screen.id) continue;
    walkTree(other.rootNode, (node) => {
      for (const event of node.events ?? []) {
        walkActions(event.actions, (action) => {
          if (action.type === 'navigate' && action.targetScreenId === screen.id) {
            const nodeName = node.name || inferElementName(node);
            navs.push({
              fromScreenId: other.id, fromScreenName: other.name,
              toScreenId: screen.id, toScreenName: screen.name,
              triggerNodeId: node.id, triggerNodeName: nodeName,
              trigger: event.trigger,
              label: `从「${other.name}」${triggerLabel(event.trigger)}${nodeName}`,
              edgeId: `nav:${other.id}:${node.id}:${screen.id}`,
            });
          }
        });
      }
    });
  }
  return navs;
}

// ==================== State Analysis ====================

function analyzeStates(screen: Screen): StateVarAnalysis[] {
  return (screen.domainStates ?? []).map((variable) => {
    const writers: StateWriter[] = [];
    const readers: StateReader[] = [];
    walkTree(screen.rootNode, (node) => {
      for (const event of node.events ?? []) {
        walkActions(event.actions, (a) => {
          if (a.type === 'setDomainState' && a.variableName === variable.name) {
            writers.push({ nodeName: node.name || inferElementName(node), nodeId: node.id, trigger: event.trigger, value: a.value });
          }
        });
      }
      for (const b of node.domainStateBindings ?? []) {
        if (b.variableName === variable.name) {
          readers.push({
            nodeName: node.name || inferElementName(node), nodeId: node.id, value: b.value,
            effect: b.visible === false ? '隐藏' : b.styles ? describeStyleChange(b.styles) : '属性响应',
          });
        }
      }
    });
    return { variable, writers, readers };
  });
}

// ==================== Overview & Globals ====================

function buildOverview(project: DesignProject, screens: ScreenAnalysis[]): ProjectOverview {
  let componentCount = 0, eventCount = 0, apiCount = 0, dsCount = 0;
  let stateVarCount = (project.environmentStates ?? []).length;
  for (const sa of screens) {
    componentCount += sa.nodeCount; eventCount += sa.eventCount;
    stateVarCount += (sa.screen.domainStates ?? []).length;
    apiCount += (sa.screen.apiEndpoints ?? []).length;
    dsCount += (sa.screen.dataSources ?? []).length;
  }
  return {
    name: project.name, platform: project.platform,
    viewport: { width: project.currentViewport?.width ?? 375, height: project.currentViewport?.height ?? 812 },
    stats: {
      screenCount: (project.screens ?? []).length, componentCount, eventCount, stateVarCount,
      apiCount, dataSourceCount: dsCount,
      envStateCount: (project.environmentStates ?? []).length,
      templateCount: (project.componentAssets ?? []).length,
    },
  };
}

function buildGlobals(project: DesignProject): GlobalsAnalysis {
  const envStates: EnvStateAnalysis[] = (project.environmentStates ?? []).map((ev) => {
    const consumersByScreen: { screenName: string; nodeNames: string[] }[] = [];
    let consumerCount = 0;
    for (const screen of project.screens ?? []) {
      const names: string[] = [];
      walkTree(screen.rootNode, (node) => {
        if ((node.environmentBindings ?? []).some((b) => b.variableName === ev.name)) {
          names.push(node.name || inferElementName(node)); consumerCount++;
        }
      });
      if (names.length > 0) consumersByScreen.push({ screenName: screen.name, nodeNames: names });
    }
    return { variable: ev, consumerCount, consumersByScreen };
  });

  const templates: TemplateAnalysis[] = (project.componentAssets ?? []).map((tpl) => {
    let usageCount = 0; const usedInScreens: string[] = [];
    for (const screen of project.screens ?? []) {
      let found = false;
      walkTree(screen.rootNode, (node) => { if (node.templateRef?.templateId === tpl.id) { usageCount++; found = true; } });
      if (found) usedInScreens.push(screen.name);
    }
    return { template: tpl, usageCount, usedInScreens };
  });

  return { envStates, templates };
}

// ==================== Indices ====================

function buildIndices(screens: ScreenAnalysis[], project: DesignProject): BlueprintIndices {
  const events: EventSummaryEntry[] = [];
  const stateVars: BlueprintIndices['stateVars'] = [];
  const apis: BlueprintIndices['apis'] = [];
  const dataBindings: BlueprintIndices['dataBindings'] = [];

  for (const sa of screens) {
    events.push(...sa.eventSummary);
    for (const sv of sa.stateAnalysis) {
      stateVars.push({ name: sv.variable.name, label: sv.variable.label, scope: sa.screen.name, values: sv.variable.values.map((v) => v.label), writerCount: sv.writers.length, readerCount: sv.readers.length });
    }
    for (const ep of sa.screen.apiEndpoints ?? []) {
      const callers: string[] = [];
      walkTree(sa.screen.rootNode, (node) => {
        for (const ev of node.events ?? []) {
          walkActions(ev.actions, (a) => { if (a.type === 'apiRequest' && a.requestId === ep.definition.id) callers.push(node.name || inferElementName(node)); });
        }
      });
      apis.push({ screenName: sa.screen.name, name: ep.definition.name, method: ep.definition.method, path: ep.definition.path, callerNodes: callers });
    }
    for (const mod of sa.modules) {
      for (const el of mod.elements) {
        for (const b of extractDataBindings(el.node)) {
          dataBindings.push({ screenName: sa.screen.name, nodeName: el.name, propKey: b.prop, expression: b.expression });
        }
      }
    }
  }

  for (const ev of project.environmentStates ?? []) {
    stateVars.push({ name: ev.name, label: ev.label, scope: '全局', values: ev.values.map((v) => v.label), writerCount: 0, readerCount: 0 });
  }

  return { events, stateVars, apis, dataBindings };
}

// ==================== Utilities ====================

function hasBehavior(node: ComponentNode): boolean {
  return (node.events ?? []).length > 0 || (node.states ?? []).length > 1 ||
    hasDataBindingsRaw(node) || (node.domainStateBindings?.length ?? 0) > 0 ||
    (node.environmentBindings?.length ?? 0) > 0 || !!node.visibilityWhen;
}

function hasDataBindingsRaw(node: ComponentNode): boolean {
  return Object.values(node.props ?? {}).some((v) => typeof v === 'string' && /\{\{data\./.test(v));
}

function extractDataBindings(node: ComponentNode): { prop: string; expression: string }[] {
  const result: { prop: string; expression: string }[] = [];
  const re = /\{\{data\.[^}]+\}\}/g;
  for (const [key, val] of Object.entries(node.props ?? {})) {
    if (typeof val === 'string') {
      const matches = val.match(re);
      if (matches) for (const m of matches) result.push({ prop: key, expression: m });
    }
  }
  return result;
}

function walkActions(actions: EventAction[], cb: (a: EventAction) => void) {
  for (const a of actions ?? []) {
    cb(a);
    if (a.type === 'apiRequest') {
      if (a.onSuccess) walkActions(a.onSuccess, cb);
      if (a.onFailure) walkActions(a.onFailure, cb);
    }
  }
}

function triggerLabel(trigger: EventTrigger): string {
  const map: Record<string, string> = {
    click: '点击', hover: '悬停', focus: '聚焦', blur: '失焦', longPress: '长按',
    screenEnter: '页面进入时', screenExit: '页面离开时',
    screenVisible: '页面可见时', screenHidden: '页面隐藏时',
    scrollReachBottom: '滚动到底部时', scrollReachTop: '滚动到顶部时',
    navigateBack: '返回时',
  };
  return map[trigger] || trigger;
}

function animationLabel(type: string): string {
  const map: Record<string, string> = {
    'slide-left': '左滑', 'slide-right': '右滑', 'slide-up': '上滑', 'slide-down': '下滑',
    fade: '渐显', none: '无动画',
  };
  return map[type] || type;
}

function circledNum(n: number): string {
  const nums = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return nums[n] || `(${n})`;
}

type ComponentEvent = { trigger: EventTrigger; actions: EventAction[]; condition?: { type: string; variableName: string; value: string }; description?: string; disabled?: boolean };
