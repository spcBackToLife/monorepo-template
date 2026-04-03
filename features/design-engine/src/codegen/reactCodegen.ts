import type { Screen, ComponentNode, ComponentEvent, EventAction } from '@globallink/design-schema';

export interface CodegenOptions {
  format?: 'react-tsx' | 'html';
  includeStyles?: boolean;
  includeEvents?: boolean;
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

  const textContent = (node.props as Record<string, unknown>)?.textContent;

  const children = node.children ?? [];
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (children.length === 0 && (textContent === undefined || textContent === null || textContent === '')) {
    return `${pad}<${tag}${attrStr} />`;
  }

  const childLines = children
    .filter((c) => c.type !== 'annotation')
    .map((c) => renderNode(c, indent + 2, includeStyles, includeEvents, _stateNodes))
    .filter(Boolean);

  const textStr =
    textContent !== undefined && textContent !== null && textContent !== ''
      ? String(textContent)
      : '';

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

  const textContent = (node.props as Record<string, unknown>)?.textContent;
  const children = node.children ?? [];
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  const hasText =
    textContent !== undefined && textContent !== null && String(textContent).length > 0;

  if (children.length === 0 && !hasText) {
    const selfClosing = ['img', 'input', 'br', 'hr'].includes(tag);
    return selfClosing ? `${pad}<${tag}${attrStr} />` : `${pad}<${tag}${attrStr}></${tag}>`;
  }

  const childLines = children
    .filter((c) => c.type !== 'annotation')
    .map((c) => renderHTMLNode(c, indent + 2, includeStyles))
    .filter(Boolean);

  const textStr = hasText ? escapeHtmlText(String(textContent)) : '';

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
      case 'navigate':
        parts.push(`/* navigate to ${action.targetScreenId} */`);
        break;
      case 'setState': {
        const hookBase = idToHookBase(action.targetId);
        if (stateNodes.has(action.targetId)) {
          parts.push(`set${toPascalCase(hookBase)}State('${action.state}')`);
        } else {
          parts.push(`/* setState: ${action.targetId}.${action.state} */`);
        }
        break;
      }
      case 'setGlobalState':
        parts.push(`/* setGlobalState: ${action.variableName} = ${action.value} */`);
        break;
      case 'openUrl':
        parts.push(`window.open('${action.url ?? ''}', '_blank')`);
        break;
      case 'toggleVisible':
        parts.push(`/* toggleVisible: ${action.targetId} */`);
        break;
      case 'delay':
        parts.push(`/* delay: ${action.duration ?? 0}ms */`);
        break;
      case 'custom':
        parts.push(`/* custom: ${action.handler ?? ''} */`);
        break;
    }
  }
  return parts.join('; ') || `/* ${formatEventSummary(evt)} */`;
}

function actionSummary(a: EventAction): string {
  switch (a.type) {
    case 'navigate':
      return `navigate:${a.targetScreenId}`;
    case 'setState':
      return `setState:${a.targetId}.${a.state}`;
    case 'openUrl':
      return `openUrl:${a.url}`;
    case 'setGlobalState':
      return `setGlobalState:${a.variableName}=${a.value}`;
    case 'toggleVisible':
      return `toggleVisible:${a.targetId}`;
    case 'delay':
      return `delay:${a.duration}ms`;
    case 'custom':
      return `custom:${a.handler}`;
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
