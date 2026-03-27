import type { ComponentNode } from '../types/node';
import type { Screen } from '../types/screen';
import type { DesignProject } from '../types/project';

/**
 * Deep clone a value using structured clone.
 * Works for all Schema types (plain objects, arrays, primitives).
 */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
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
  return JSON.parse(json) as DesignProject;
}

/** Serialize a ComponentNode tree to JSON string */
export function nodeToJSON(node: ComponentNode): string {
  return JSON.stringify(node, null, 2);
}

/** Deserialize a JSON string to a ComponentNode */
export function nodeFromJSON(json: string): ComponentNode {
  return JSON.parse(json) as ComponentNode;
}

/** Serialize a Screen to JSON string */
export function screenToJSON(screen: Screen): string {
  return JSON.stringify(screen, null, 2);
}

/** Deserialize a JSON string to a Screen */
export function screenFromJSON(json: string): Screen {
  return JSON.parse(json) as Screen;
}
