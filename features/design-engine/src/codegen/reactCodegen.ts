import type { Screen, ComponentNode, ComponentEvent, Action } from '@globallink/design-schema';

export interface CodegenOptions {
  format?: 'react-tsx' | 'html';
  includeStyles?: boolean;
  includeEvents?: boolean;
}

/** 与 PrimitiveRenderer 一致：textContent / text / props.children（字符串） */
function pickInlinePropText(props: Record<string, unknown> | undefined): string | undefined {
  if (!props) return undefined;
  const a = props.textContent ?? props.text;
  if (typeof a === 'string' || typeof a === 'number') return String(a);
  const c = props.children;
  if (typeof c === 'string' || typeof c === 'number') return String(c);
  return undefined;
}

export function generateReactCode(screen: Screen, options: CodegenOptions = {}): string {
  const { format = 'react-tsx', includeStyles = true, includeEvents = true } = options;

  if (format === 'html') {
    return generateHTML(screen, includeStyles);
  }
  return generateReactTSX(screen, includeStyles, includeEvents);
}

function generateReactTSX(screen: Screen, includeStyles: boolean, includeEvents: boolean): string {
  const componentName = toPascalCase(screen.name || 'Screen');
  const lines: string[] = [];

  lines.push(`import React, { useState } from 'react';`);
  lines.push('');

  const stateNodes = collectStatesNodes(screen.rootNode);

  lines.push(`export function ${componentName}() {`);

  for (const nodeId of stateNodes.keys()) {
    const base = idToHookBase(nodeId);
    lines.push(
      `  const [${base}State, set${toPascalCase(base)}State] = useState('default');`,
    );
  }
  if (stateNodes.size > 0) lines.push('');

  lines.push(`  return (`);
  lines.push(renderNode(screen.rootNode, 4, includeStyles, includeEvents, stateNodes));
  lines.push(`  );`);
  lines.push(`}`);

  return lines.join('\n');
}

function generateHTML(screen: Screen, includeStyles: boolean): string {
  const lines: string[] = [];
  lines.push('<!DOCTYPE html>');
  lines.push('<html lang="zh">');
  lines.push('<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">');
  lines.push(`<title>${escapeHtmlText(screen.name || 'Page')}</title>`);
  if (includeStyles) {
    lines.push('<style>');
    lines.push(collectCSS(screen.rootNode));
    lines.push('</style>');
  }
  lines.push('</head>');
  lines.push('<body>');
  lines.push(renderHTMLNode(screen.rootNode, 2, includeStyles));
  lines.push('</body>');
  lines.push('</html>');
  return lines.join('\n');
}

function renderNode(
  node: ComponentNode,
  indent: number,
  includeStyles: boolean,
  includeEvents: boolean,
  _stateNodes: Map<string, string[]>,
): string {
  const pad = ' '.repeat(indent);
  const tag = node.type.startsWith('component:') ? 'div' : node.type;
  if (tag === 'annotation') return '';

  const attrs: string[] = [];

  if (includeStyles && node.styles && Object.keys(node.styles).length > 0) {
    const styleObj = Object.entries(node.styles as Record<string, string | number | undefined>)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
      .join(', ');
    if (styleObj) attrs.push(`style={{ ${styleObj} }}`);
  }

  if (includeEvents && node.events?.length) {
    for (const evt of node.events) {
      if (evt.disabled) continue;
      const trigger = evt.trigger;
      const body = generateEventHandlerBody(evt, _stateNodes);
      const triggerMap: Record<string, string> = {
        click: 'onClick',
        hover: 'onMouseEnter',
        focus: 'onFocus',
        blur: 'onBlur',
        longPress: 'onPointerDown',
        doubleClick: 'onDoubleClick',
      };
      const reactProp = triggerMap[trigger];
      if (reactProp) {
        attrs.push(`${reactProp}={() => { ${body} }}`);
      }
    }
  }

  const inlineText = pickInlinePropText(node.props as Record<string, unknown> | undefined);

  const children = node.children ?? [];
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (children.length === 0 && (inlineText === undefined || inlineText === '')) {
    return `${pad}<${tag}${attrStr} />`;
  }

  const childLines = children
    .filter((c) => c.type !== 'annotation')
    .map((c) => renderNode(c, indent + 2, includeStyles, includeEvents, _stateNodes))
    .filter(Boolean);

  const textStr = inlineText !== undefined && inlineText !== '' ? inlineText : '';

  if (textStr && childLines.length === 0) {
    return `${pad}<${tag}${attrStr}>${escapeJsxText(textStr)}</${tag}>`;
  }

  return [
    `${pad}<${tag}${attrStr}>`,
    ...(textStr ? [`${pad}  ${escapeJsxText(textStr)}`] : []),
    ...childLines,
    `${pad}</${tag}>`,
  ].join('\n');
}

function renderHTMLNode(node: ComponentNode, indent: number, includeStyles: boolean): string {
  const pad = ' '.repeat(indent);
  const tag = node.type.startsWith('component:') ? 'div' : node.type;
  if (tag === 'annotation') return '';

  const attrs: string[] = [];
  attrs.push(`id="${escapeHtmlAttr(node.id)}"`);

  if (includeStyles && node.styles && Object.keys(node.styles).length > 0) {
    const styleStr = Object.entries(node.styles as Record<string, string | number | undefined>)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${camelToKebab(k)}: ${String(v)}`)
      .join('; ');
    if (styleStr) attrs.push(`style="${escapeHtmlAttr(styleStr)}"`);
  }

  const inlineText = pickInlinePropText(node.props as Record<string, unknown> | undefined);
  const children = node.children ?? [];
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  const hasText = inlineText !== undefined && inlineText.length > 0;

  if (children.length === 0 && !hasText) {
    const selfClosing = ['img', 'input', 'br', 'hr'].includes(tag);
    return selfClosing ? `${pad}<${tag}${attrStr} />` : `${pad}<${tag}${attrStr}></${tag}>`;
  }

  const childLines = children
    .filter((c) => c.type !== 'annotation')
    .map((c) => renderHTMLNode(c, indent + 2, includeStyles))
    .filter(Boolean);

  const textStr = hasText ? escapeHtmlText(String(inlineText)) : '';

  return [
    `${pad}<${tag}${attrStr}>`,
    ...(textStr ? [`${pad}  ${textStr}`] : []),
    ...childLines,
    `${pad}</${tag}>`,
  ].join('\n');
}

function collectCSS(node: ComponentNode): string {
  const rules: string[] = [];
  function walk(n: ComponentNode) {
    if (n.styles && Object.keys(n.styles).length > 0) {
      const props = Object.entries(n.styles as Record<string, string | number | undefined>)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `  ${camelToKebab(k)}: ${String(v)};`)
        .join('\n');
      if (props) rules.push(`#${escapeCssSelectorId(n.id)} {\n${props}\n}`);
    }
    for (const c of n.children ?? []) walk(c);
  }
  walk(node);
  return rules.join('\n\n');
}

/** HTML id in CSS selector — escape for simple id safety */
function escapeCssSelectorId(id: string): string {
  return id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function collectStatesNodes(node: ComponentNode): Map<string, string[]> {
  const map = new Map<string, string[]>();
  function walk(n: ComponentNode) {
    const customStates = (n.states ?? []).filter((s) => s.name !== 'default');
    if (customStates.length > 0) {
      map.set(n.id, customStates.map((s) => s.name));
    }
    for (const c of n.children ?? []) walk(c);
  }
  walk(node);
  return map;
}

function generateEventHandlerBody(evt: ComponentEvent, stateNodes: Map<string, string[]>): string {
  const parts: string[] = [];
  for (const action of evt.actions ?? []) {
    switch (action.type) {
      case 'nav.go':
        parts.push(`/* nav.go to ${action.targetScreenId} */`);
        break;
      case 'nav.back':
        parts.push(`/* nav.back */`);
        break;
      case 'node.setVisualState': {
        const targetId = action.nodeId;
        if (targetId && stateNodes.has(targetId)) {
          const hookBase = idToHookBase(targetId);
          parts.push(`set${toPascalCase(hookBase)}State('${action.state}')`);
        } else {
          parts.push(`/* node.setVisualState: ${targetId ?? '(host)'}.${action.state} */`);
        }
        break;
      }
      case 'state.set':
        parts.push(`/* state.set: ${action.path} = ${JSON.stringify(action.value)} */`);
        break;
      case 'state.append':
        parts.push(`/* state.append: ${action.path} << ${JSON.stringify(action.value)} */`);
        break;
      case 'state.remove':
        parts.push(`/* state.remove: ${action.path} [${action.index ?? action.predicate ?? '?'}] */`);
        break;
      case 'state.merge':
        parts.push(`/* state.merge: ${action.path} += ${JSON.stringify(action.value)} */`);
        break;
      case 'state.toggle':
        parts.push(`/* state.toggle: ${action.path} */`);
        break;
      case 'effect.fetch':
        parts.push(`/* effect.fetch: ${action.dataSourceId} */`);
        break;
      case 'effect.cancel':
        parts.push(`/* effect.cancel: ${action.dataSourceId ?? 'all'} */`);
        break;
      case 'ui.openUrl':
        parts.push(`window.open('${typeof action.url === 'string' ? action.url : ''}', '_blank')`);
        break;
      case 'ui.showToast':
        parts.push(`/* ui.showToast: ${action.toastType} "${typeof action.message === 'string' ? action.message : ''}" */`);
        break;
      case 'ui.delay':
        parts.push(`/* ui.delay: ${action.duration}ms */`);
        break;
      case 'custom':
        parts.push(`/* custom: ${action.handler} */`);
        break;
      default: {
        const _exhaustive: never = action;
        void _exhaustive;
      }
    }
  }
  return parts.join('; ') || `/* ${formatEventSummary(evt)} */`;
}

function actionSummary(a: Action): string {
  switch (a.type) {
    case 'nav.go':
      return `nav.go:${a.targetScreenId}`;
    case 'nav.back':
      return `nav.back`;
    case 'node.setVisualState':
      return `node.setVisualState:${a.nodeId ?? '(host)'}.${a.state}`;
    case 'state.set':
      return `state.set:${a.path}`;
    case 'state.append':
      return `state.append:${a.path}`;
    case 'state.remove':
      return `state.remove:${a.path}`;
    case 'state.merge':
      return `state.merge:${a.path}`;
    case 'state.toggle':
      return `state.toggle:${a.path}`;
    case 'effect.fetch':
      return `effect.fetch:${a.dataSourceId}`;
    case 'effect.cancel':
      return `effect.cancel:${a.dataSourceId ?? 'all'}`;
    case 'ui.openUrl':
      return `ui.openUrl:${typeof a.url === 'string' ? a.url : ''}`;
    case 'ui.showToast':
      return `ui.showToast:${a.toastType}`;
    case 'ui.delay':
      return `ui.delay:${a.duration}ms`;
    case 'custom':
      return `custom:${a.handler}`;
    default:
      return `unknown`;
  }
}

function formatEventSummary(evt: ComponentEvent): string {
  const actions = evt.actions ?? [];
  return actions.map((a) => actionSummary(a)).join(' → ');
}

function toPascalCase(s: string): string {
  const t = s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) =>
    c.toUpperCase(),
  );
  return /^[0-9]/.test(t) ? `N${t}` : t || 'Component';
}

function camelCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, (c) => c.toLowerCase());
}

function idToHookBase(nodeId: string): string {
  const base = camelCase(`n-${nodeId}`);
  return /^[0-9]/.test(base) ? `_${base}` : base;
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s: string): string {
  return escapeHtmlText(s);
}

function escapeJsxText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/[{}<>]/g, (ch) => {
      if (ch === '{') return '&#123;';
      if (ch === '}') return '&#125;';
      if (ch === '<') return '&lt;';
      return '&gt;';
    });
}
