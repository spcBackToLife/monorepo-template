import type { ComponentNode } from '@globallink/design-schema';

/**
 * CSSPseudoInjector converts interaction states (hover, pressed, focus)
 * from the ComponentNode tree into CSS pseudo-class rules and injects
 * them via a dynamically created `<style>` element.
 *
 * This allows preview mode to use real CSS :hover, :active, and :focus
 * pseudo-classes instead of JavaScript-driven state changes.
 */
export class CSSPseudoInjector {
  private styleElement: HTMLStyleElement | null = null;

  /**
   * Walk the node tree, generate CSS pseudo-class rules for all nodes
   * that have hover/active/focus states, and inject them into the document.
   */
  inject(rootNode: ComponentNode): void {
    // Clear any previously injected styles
    this.clear();

    const rules: string[] = [];
    this.walkAndGenerateRules(rootNode, rules);

    if (rules.length === 0) return;

    this.styleElement = document.createElement('style');
    this.styleElement.setAttribute('data-preview-pseudo-styles', 'true');
    this.styleElement.textContent = rules.join('\n');
    document.head.appendChild(this.styleElement);
  }

  /**
   * Remove the injected style element from the document.
   */
  clear(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  /**
   * Walk the component tree and generate CSS rules for each node with
   * interaction states.
   */
  private walkAndGenerateRules(node: ComponentNode, rules: string[]): void {
    // State name → CSS pseudo-class mapping
    const pseudoMap: Record<string, string> = {
      hover: ':hover',
      pressed: ':active',
      active: ':active',
      focus: ':focus',
      'focus-visible': ':focus-visible',
    };

    for (const state of node.states) {
      const pseudo = pseudoMap[state.name];
      if (!pseudo) continue;

      const cssProperties = this.stylesToCSS(state.styles);
      if (!cssProperties) continue;

      rules.push(
        `[data-node-id="${node.id}"]${pseudo} { ${cssProperties} }`,
      );
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        this.walkAndGenerateRules(child, rules);
      }
    }
  }

  /**
   * Convert a styles object (React CSSProperties-like) into a CSS declaration string.
   * e.g., { backgroundColor: '#ff0000', opacity: '0.5' } -> 'background-color: #ff0000; opacity: 0.5'
   */
  private stylesToCSS(styles: Record<string, unknown>): string | null {
    const entries = Object.entries(styles);
    if (entries.length === 0) return null;

    const declarations: string[] = [];
    for (const [key, value] of entries) {
      if (value === undefined || value === null) continue;
      const cssKey = this.camelToKebab(key);
      declarations.push(`${cssKey}: ${value} !important`);
    }

    return declarations.length > 0 ? declarations.join('; ') : null;
  }

  /**
   * Convert camelCase to kebab-case.
   * e.g., 'backgroundColor' -> 'background-color'
   */
  private camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  }
}
