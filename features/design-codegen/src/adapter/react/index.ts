import type {
  NodeIR,
  HandlerIR,
  ExpressionIR,
  ViewStateIR,
  DataStateIR,
  DataSourceIR,
  RepeatIR,
  BindIR,
  DynamicStyleIR,
  TextContentIR,
} from '../../core/types';
import type { FrameworkAdapter, FrameworkImportNeeds } from '../interface';
import type {
  TypesFileContext,
  ServiceFileContext,
  HookFileContext,
  PageFileContext,
  ComponentFileContext,
} from '../../emit/types';
import { emitHandlerBody } from './emit-handler';
import { buildAttributes } from './emit-element';
import * as emitPlanFns from './emit-plan';

/**
 * Map design event triggers to React event attributes.
 */
const TRIGGER_TO_REACT_ATTR: Record<string, string> = {
  click: 'onClick',
  doubleClick: 'onDoubleClick',
  hover: 'onMouseEnter',
  focus: 'onFocus',
  blur: 'onBlur',
  change: 'onChange',
  submit: 'onSubmit',
  keyDown: 'onKeyDown',
  keyUp: 'onKeyUp',
  keyPress: 'onKeyPress',
  scroll: 'onScroll',
  longPress: 'onMouseDown', // approximation
};

/** Tags that are self-closing in JSX */
const SELF_CLOSING_TAGS = new Set([
  'img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base',
  'col', 'embed', 'source', 'track', 'wbr',
]);

/**
 * ReactAdapter — generates idiomatic React + TypeScript code.
 *
 * Outputs JSX with hooks (useState, useEffect, useNavigate).
 */
export class ReactAdapter implements FrameworkAdapter {
  readonly name = 'react';

  // ═══════════════════════════════════════════════════════════════════════════
  // Element rendering
  // ═══════════════════════════════════════════════════════════════════════════

  renderElement(node: NodeIR, indent: number): string {
    return this.renderNodeShallow(node, indent);
  }

  renderTree(node: NodeIR, indent: number): string {
    // Conditional rendering wraps the element
    if (node.visibleWhen) {
      const content = this.renderNodeDeep(node, indent + 1);
      return this.emitConditional(node.visibleWhen, content);
    }

    // Repeat rendering — render the container node with the map expression inside
    if (node.repeat) {
      const pad = makeIndent(indent);
      const tag = node.tag;
      const attrs = buildAttributes(node, this);
      const repeatContent = this.emitRepeat(node.repeat, indent + 1);
      // Also render static children (before repeat items)
      const staticChildren = node.children.map(c => this.renderTree(c, indent + 1)).join('\n');
      const inner = staticChildren ? `${staticChildren}\n${repeatContent}` : repeatContent;
      return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`;
    }

    const rendered = this.renderNodeDeep(node, indent);

    // Guarantee a single root element: if the output would produce multiple
    // sibling lines at the top level (rare, e.g., conditional + element),
    // wrap in a React fragment.
    return rendered;
  }

  /**
   * Render a tree guaranteeing a single root JSX element.
   * If the node tree would produce a non-element (like a map expression or conditional),
   * wraps it in a React Fragment (<>...</>).
   */
  renderTreeWithRoot(node: NodeIR, indent: number): string {
    const rendered = this.renderTree(node, indent);

    // Check if result already has a single root JSX element
    const trimmed = rendered.trim();
    if (trimmed.startsWith('<')) {
      return rendered;
    }

    // Expression-only (e.g., {data.map(...)}) or conditional needs fragment wrapping
    const pad = makeIndent(indent);
    return `${pad}<>\n${rendered}\n${pad}</>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════════════════

  emitStateDeclaration(state: ViewStateIR | DataStateIR): string {
    const { name, pascalName, type, defaultValue } = state;
    const isReadonly = 'isReadonly' in state && state.isReadonly;
    const setter = `set${pascalName}`;

    // Readonly state: no setter needed — use const [name] destructuring
    if (isReadonly) {
      if (type && type !== 'any' && type !== 'unknown') {
        return `const [${name}] = useState<${type}>(${defaultValue});`;
      }
      return `const [${name}] = useState(${defaultValue});`;
    }

    if (type && type !== 'any') {
      return `const [${name}, ${setter}] = useState<${type}>(${defaultValue});`;
    }
    return `const [${name}, ${setter}] = useState(${defaultValue});`;
  }

  emitStateSet(_variable: string, setter: string, value: string): string {
    return `${setter}(${value});`;
  }

  emitStateAppend(_variable: string, setter: string, value: string): string {
    return `${setter}(prev => [...prev, ${value}]);`;
  }

  emitStateToggle(_variable: string, setter: string): string {
    return `${setter}(prev => !prev);`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitEventAttribute(trigger: string, handlerName: string): string {
    const reactAttr = TRIGGER_TO_REACT_ATTR[trigger] || `on${capitalize(trigger)}`;
    return `${reactAttr}={${handlerName}}`;
  }

  emitHandler(handler: HandlerIR): string {
    const { name, isAsync, steps, guard } = handler;
    const asyncPrefix = isAsync ? 'async ' : '';
    const lines: string[] = [];

    lines.push(`const ${name} = ${asyncPrefix}() => {`);

    if (guard) {
      lines.push(`  if (!(${guard.compiled})) return;`);
    }

    lines.push(...emitHandlerBody(steps, 1));

    lines.push(`};`);

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // List rendering
  // ═══════════════════════════════════════════════════════════════════════════

  emitRepeat(repeat: RepeatIR, indent: number): string {
    const pad = makeIndent(indent);
    const { dataExpression, itemName, indexName, template } = repeat;

    // If the repeat template was split into its own component, emit a component
    // reference instead of inlining the entire subtree (which would lack styles
    // since plan-style.ts skips split-component nodes from the page .less).
    let templateStr: string;
    if (template.splitAs === 'component' && template.splitComponentName) {
      const innerPad = makeIndent(indent + 2);
      const componentName = template.splitComponentName;
      // Pass item and index as props to the split component
      templateStr = `${innerPad}<${componentName} ${itemName}={${itemName}} ${indexName}={${indexName}} />`;
    } else {
      templateStr = this.renderNodeDeep(template, indent + 2);
    }

    // Determine key expression: use item.id if exists, fallback to index
    const keyAttr = ` key={${itemName}.id ?? ${indexName}}`;

    const lines = [
      `${pad}{${dataExpression.compiled}.map((${itemName}, ${indexName}) => (`,
      injectKeyToFirstTag(templateStr, keyAttr),
      `${pad}))}`,
    ];

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Conditional rendering
  // ═══════════════════════════════════════════════════════════════════════════

  emitConditional(condition: ExpressionIR, content: string): string {
    return `{${condition.compiled} && (\n${content}\n)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Binding
  // ═══════════════════════════════════════════════════════════════════════════

  emitBind(bind: BindIR, tag: string): string {
    const { variable, setter } = bind;
    const valuePart = `value={${variable}}`;

    if (tag === 'input' || tag === 'textarea') {
      return `${valuePart} onChange={e => ${setter}(e.target.value)}`;
    }
    if (tag === 'select') {
      return `${valuePart} onChange={e => ${setter}(e.target.value)}`;
    }
    // Checkbox-like
    return `checked={${variable}} onChange={e => ${setter}(e.target.checked)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  emitOnMount(handler: HandlerIR): string {
    const { isAsync, steps } = handler;
    const lines: string[] = [];

    if (isAsync) {
      lines.push(`useEffect(() => {`);
      lines.push(`  const init = async () => {`);
      lines.push(...emitHandlerBody(steps, 2));
      lines.push(`  };`);
      lines.push(`  init();`);
      lines.push(`}, []);`);
    } else {
      lines.push(`useEffect(() => {`);
      lines.push(...emitHandlerBody(steps, 1));
      lines.push(`}, []);`);
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════════════════════════════════════

  emitNavigationSetup(): string {
    return `const navigate = useNavigate();`;
  }

  emitNavigate(path: string): string {
    return `navigate('${path}');`;
  }

  emitNavigateBack(): string {
    return `navigate(-1);`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Styles
  // ═══════════════════════════════════════════════════════════════════════════

  emitStyleImport(relativePath: string): string {
    return `import styles from '${relativePath}';`;
  }

  emitClassName(name: string): string {
    if (isValidIdentifier(name)) {
      return `className={styles.${name}}`;
    }
    return `className={styles['${name}']}`;
  }

  emitDynamicStyle(dynamicStyles: DynamicStyleIR[]): string {
    if (dynamicStyles.length === 0) return '';

    const entries = dynamicStyles
      .map(s => `${s.property}: ${s.expression.compiled}`)
      .join(', ');

    return `style={{ ${entries} }}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Data Source / Service
  // ═══════════════════════════════════════════════════════════════════════════

  emitServiceFunction(ds: DataSourceIR): string {
    const { functionName, method, path, params, responseType } = ds;
    const returnType = responseType || 'any';
    const lines: string[] = [];

    if (params && params.length > 0) {
      const paramsList = params.map(p => `${p.name}: ${p.type}`).join(', ');
      lines.push(`export async function ${functionName}(params: { ${paramsList} }): Promise<${returnType}> {`);
    } else {
      lines.push(`export async function ${functionName}(): Promise<${returnType}> {`);
    }

    if (method === 'GET') {
      lines.push(`  const response = await request.get('${path}');`);
    } else {
      lines.push(`  const response = await request.${method.toLowerCase()}('${path}', params);`);
    }

    lines.push(`  return response.data;`);
    lines.push(`}`);

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Imports
  // ═══════════════════════════════════════════════════════════════════════════

  getFrameworkImports(needs: FrameworkImportNeeds): string[] {
    const imports: string[] = [];

    // React hooks
    const reactHooks: string[] = [];
    if (needs.hasState) reactHooks.push('useState');
    if (needs.hasEffect) reactHooks.push('useEffect');
    if (needs.hasMemo) reactHooks.push('useMemo');
    if (needs.hasCallback) reactHooks.push('useCallback');

    if (reactHooks.length > 0) {
      imports.push(`import { ${reactHooks.join(', ')} } from 'react';`);
    }

    // React Router
    if (needs.hasNavigation) {
      imports.push(`import { useNavigate } from 'react-router-dom';`);
    }

    return imports;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private: node rendering
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Render a single node without recursing into children (for renderElement).
   */
  private renderNodeShallow(node: NodeIR, indent: number): string {
    const pad = makeIndent(indent);
    const tag = node.tag;
    const attrs = buildAttributes(node, this);
    const isSelfClosing = SELF_CLOSING_TAGS.has(tag);

    if (isSelfClosing) {
      return `${pad}<${tag}${attrs} />`;
    }

    if (node.textContent) {
      const text = renderTextContent(node.textContent);
      return `${pad}<${tag}${attrs}>${text}</${tag}>`;
    }

    if (node.children.length === 0) {
      return `${pad}<${tag}${attrs} />`;
    }

    // Shallow: show children as placeholder
    return `${pad}<${tag}${attrs}>...</${tag}>`;
  }

  /**
   * Render a node and all its children recursively.
   */
  private renderNodeDeep(node: NodeIR, indent: number): string {
    const pad = makeIndent(indent);
    const tag = node.tag;
    const attrs = buildAttributes(node, this);
    const isSelfClosing = SELF_CLOSING_TAGS.has(tag);

    if (isSelfClosing) {
      return `${pad}<${tag}${attrs} />`;
    }

    // Text content only (no nested children)
    if (node.textContent && node.children.length === 0) {
      const text = renderTextContent(node.textContent);
      return `${pad}<${tag}${attrs}>${text}</${tag}>`;
    }

    // No children and no text
    if (node.children.length === 0 && !node.textContent) {
      return `${pad}<${tag}${attrs} />`;
    }

    // Recursive children
    const childrenLines: string[] = [];

    // If there's text content alongside children, emit text first
    if (node.textContent) {
      const text = renderTextContent(node.textContent);
      childrenLines.push(`${makeIndent(indent + 1)}${text}`);
    }

    for (const child of node.children) {
      // Bug D4 fix: If child is marked as a split component, emit a component
      // reference instead of recursing into its subtree (which would duplicate HTML).
      if (child.splitAs === 'component' && child.splitComponentName) {
        childrenLines.push(this.emitComponentReference(child, indent + 1));
      } else {
        childrenLines.push(this.renderTree(child, indent + 1));
      }
    }

    return [
      `${pad}<${tag}${attrs}>`,
      ...childrenLines,
      `${pad}</${tag}>`,
    ].join('\n');
  }

  /**
   * Emit a component reference (e.g., <FeatureList onClick={handleClick} />)
   * instead of rendering the subtree inline.
   */
  private emitComponentReference(node: NodeIR, indent: number): string {
    const pad = makeIndent(indent);
    const componentName = node.splitComponentName!;
    const props = node.splitProps || [];

    if (props.length === 0) {
      return `${pad}<${componentName} />`;
    }

    // Build prop assignments
    const propEntries = props.map(p => `${p.name}={${p.name}}`);

    // If short enough, render on one line
    const inlineProps = propEntries.join(' ');
    if (inlineProps.length <= 60) {
      return `${pad}<${componentName} ${inlineProps} />`;
    }

    // Multi-line props
    const propLines = propEntries.map(p => `${makeIndent(indent + 1)}${p}`);
    return [
      `${pad}<${componentName}`,
      ...propLines,
      `${pad}/>`,
    ].join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EmitPlan: file content generation (delegates to emit-plan.ts)
  // ═══════════════════════════════════════════════════════════════════════════

  buildTypesTemplateData(ctx: TypesFileContext): Record<string, unknown> {
    return emitPlanFns.buildTypesTemplateData(ctx);
  }

  buildServiceTemplateData(ctx: ServiceFileContext): Record<string, unknown> {
    return emitPlanFns.buildServiceTemplateData(ctx);
  }

  buildHookTemplateData(ctx: HookFileContext): Record<string, unknown> | null {
    return emitPlanFns.buildHookTemplateData(ctx, this);
  }

  buildPageTemplateData(ctx: PageFileContext): Record<string, unknown> {
    return emitPlanFns.buildPageTemplateData(ctx, this);
  }

  buildComponentTemplateData(ctx: ComponentFileContext): Record<string, unknown> {
    return emitPlanFns.buildComponentTemplateData(ctx, this);
  }

  renderSharedComponent(opts: import('../interface').SharedComponentRenderOpts): string {
    const { componentName, node, hasStyle, styleFile, handlers } = opts;
    const lines: string[] = [];

    // Determine if navigate is needed
    const hasNavigation = handlers.some(h =>
      h.steps.some(s => s.kind === 'navigate' || s.kind === 'navigate-back'),
    );

    // Imports
    lines.push("import React from 'react';");
    if (hasNavigation) {
      lines.push("import { useNavigate } from 'react-router-dom';");
    }
    if (hasStyle) {
      lines.push(`import styles from './${styleFile}';`);
    }
    lines.push('');

    // Component function
    lines.push(`export function ${componentName}() {`);

    // Navigation hook
    if (hasNavigation) {
      lines.push('  const navigate = useNavigate();');
      lines.push('');
    }

    // Handler functions (from HandlerIR)
    for (const handler of handlers) {
      const bodyLines = emitHandlerBody(handler.steps, 2);
      const asyncPrefix = handler.isAsync ? 'async ' : '';
      lines.push(`  const ${handler.name} = ${asyncPrefix}() => {`);
      for (const line of bodyLines) {
        lines.push(`    ${line}`);
      }
      lines.push('  };');
      lines.push('');
    }

    // Render JSX
    const jsx = this.renderTree(node, 2);
    lines.push('  return (');
    lines.push(jsx);
    lines.push('  );');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Module-level utility functions
// ═══════════════════════════════════════════════════════════════════════════════

export function makeIndent(level: number): string {
  return '  '.repeat(level);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isValidIdentifier(s: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(s);
}

function renderTextContent(text: TextContentIR): string {
  if (!text.isExpression) {
    // Escape newlines in plain text for JSX
    return text.compiled.replace(/\n/g, '\\n');
  }
  // Escape newlines inside expression strings for valid JS
  const escaped = text.compiled.replace(/\n/g, '\\n');
  return `{${escaped}}`;
}

/**
 * Inject a key attribute into the first opening tag of a rendered template string.
 */
function injectKeyToFirstTag(rendered: string, keyAttr: string): string {
  if (!keyAttr) return rendered;
  return rendered.replace(/(<\w+)/, `$1${keyAttr}`);
}
