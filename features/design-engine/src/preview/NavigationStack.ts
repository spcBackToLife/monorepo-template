/**
 * NavigationStack manages a stack of screen IDs for preview mode navigation.
 *
 * Supports push (navigate forward), back (go to previous screen),
 * and provides history inspection utilities.
 */
export class NavigationStack {
  private stack: string[];

  constructor(initialScreenId: string) {
    this.stack = [initialScreenId];
  }

  /** The currently active screen ID */
  get currentScreenId(): string {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Navigate to a new screen by pushing it onto the stack.
   */
  push(screenId: string): void {
    this.stack.push(screenId);
  }

  /**
   * Go back to the previous screen.
   * Returns the screen ID we navigated back to, or null if we can't go back.
   */
  back(): string | null {
    if (!this.canGoBack()) return null;
    this.stack.pop();
    return this.currentScreenId;
  }

  /**
   * Whether there is a previous screen to go back to.
   */
  canGoBack(): boolean {
    return this.stack.length > 1;
  }

  /**
   * Get a copy of the full navigation history.
   */
  getHistory(): string[] {
    return [...this.stack];
  }

  /**
   * Reset the navigation stack to a single screen.
   */
  reset(screenId: string): void {
    this.stack = [screenId];
  }
}
