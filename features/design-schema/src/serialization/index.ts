import type { ComponentNode } from '../types/node';
import type { Screen } from '../types/screen';
import type { DesignProject } from '../types/project';

/**
 * Deep clone a value.
 * Uses JSON round-trip to ensure compatibility with MobX observable proxies
 * and other non-structuredClone-safe objects.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Ensure all required fields on a ComponentNode have sensible defaults.
 * Walks the tree recursively so every descendant is also normalized.
 * This guards against incomplete data from older schema versions, manual
 * JSON edits, or API responses that omit empty arrays/objects.
 */
export function normalizeNode(node: ComponentNode): ComponentNode {
  if (!node.styles) node.styles = {};
  if (!node.props) node.props = {};
  if (!node.states) node.states = [];
  if (!node.events) node.events = [];
  if (node.activeState === undefined) node.activeState = 'default';
  if (node.locked === undefined) node.locked = false;
  if (node.visible === undefined) node.visible = true;

  if (node.children) {
    for (const child of node.children) {
      normalizeNode(child);
    }
  }
  return node;
}

/** Normalize all nodes in a Screen */
function normalizeScreen(screen: Screen): Screen {
  if (screen.rootNode) {
    normalizeNode(screen.rootNode);
  }
  return screen;
}

/** Normalize all nodes in a DesignProject */
function normalizeProject(project: DesignProject): DesignProject {
  if (project.screens) {
    for (const screen of project.screens) {
      normalizeScreen(screen);
    }
  }
  if (project.componentAssets) {
    for (const asset of project.componentAssets) {
      if (asset.schema) {
        normalizeNode(asset.schema);
      }
    }
  }
  return project;
}

/**
 * Serialize a DesignProject to a JSON string.
 * Produces stable, pretty-printed output.
 */
export function toJSON(project: DesignProject): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Deserialize a JSON string to a DesignProject.
 * Throws if the JSON is malformed.
 */
export function fromJSON(json: string): DesignProject {
  const project = JSON.parse(json) as DesignProject;
  return normalizeProject(project);
}

/** Serialize a ComponentNode tree to JSON string */
export function nodeToJSON(node: ComponentNode): string {
  return JSON.stringify(node, null, 2);
}

/** Deserialize a JSON string to a ComponentNode */
export function nodeFromJSON(json: string): ComponentNode {
  const node = JSON.parse(json) as ComponentNode;
  return normalizeNode(node);
}

/** Serialize a Screen to JSON string */
export function screenToJSON(screen: Screen): string {
  return JSON.stringify(screen, null, 2);
}

/** Deserialize a JSON string to a Screen */
export function screenFromJSON(json: string): Screen {
  const screen = JSON.parse(json) as Screen;
  return normalizeScreen(screen);
}
