import type { ComponentNode } from './node';

/** A single screen/page in the design project */
export interface Screen {
  /** Unique screen identifier */
  id: string;
  /** Screen name, e.g., "Home", "Login", "Profile" */
  name: string;
  /** Root node of the component tree for this screen */
  rootNode: ComponentNode;
  /** Background color (CSS color value) */
  backgroundColor?: string;
}
