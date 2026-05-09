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
} from '../core/types';

/**
 * FrameworkAdapter — one implementation per target language/framework.
 *
 * The Adapter only outputs code strings. It does NOT:
 * - Read config files
 * - Decide file paths
 * - Decide what to split into separate files
 *
 * Those are Pipeline/Splitter responsibilities.
 */
export interface FrameworkAdapter {
  readonly name: string;

  // ═══ Element rendering ═══

  /** Render a single element to markup (JSX / template / widget) */
  renderElement(node: NodeIR, indent: number): string;

  /** Render a full node tree recursively */
  renderTree(node: NodeIR, indent: number): string;

  // ═══ State ═══

  /** Emit state variable declaration */
  emitStateDeclaration(state: ViewStateIR | DataStateIR): string;

  /** Emit a state update expression (for use inside handlers) */
  emitStateSet(variable: string, setter: string, value: string): string;
  emitStateAppend(variable: string, setter: string, value: string): string;
  emitStateToggle(variable: string, setter: string): string;

  // ═══ Events ═══

  /** Emit the event binding attribute on an element */
  emitEventAttribute(trigger: string, handlerName: string): string;

  /** Emit a complete event handler function */
  emitHandler(handler: HandlerIR): string;

  // ═══ List rendering ═══

  /** Emit repeat/list rendering (wraps the template) */
  emitRepeat(repeat: RepeatIR, indent: number): string;

  // ═══ Conditional rendering ═══

  /** Emit conditional rendering */
  emitConditional(condition: ExpressionIR, content: string): string;

  // ═══ Binding ═══

  /** Emit two-way binding attributes */
  emitBind(bind: BindIR, tag: string): string;

  // ═══ Lifecycle ═══

  /** Emit on-mount / page-enter effect */
  emitOnMount(handler: HandlerIR): string;

  // ═══ Navigation ═══

  /** Emit navigation setup (hook declaration) */
  emitNavigationSetup(): string;

  /** Emit navigate call */
  emitNavigate(path: string): string;
  emitNavigateBack(): string;

  // ═══ Styles ═══

  /** Emit style import statement */
  emitStyleImport(relativePath: string): string;

  /** Emit className attribute (CSS Modules) */
  emitClassName(name: string): string;

  /** Emit inline style object for dynamic styles */
  emitDynamicStyle(styles: DynamicStyleIR[]): string;

  // ═══ Data Source / Service ═══

  /** Emit a service function declaration */
  emitServiceFunction(ds: DataSourceIR): string;

  // ═══ Imports ═══

  /** Get framework-specific imports needed (React hooks, router, etc.) */
  getFrameworkImports(needs: FrameworkImportNeeds): string[];
}

export interface FrameworkImportNeeds {
  hasState: boolean;
  hasEffect: boolean;
  hasNavigation: boolean;
  hasMemo?: boolean;
  hasCallback?: boolean;
}
