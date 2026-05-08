import type { ComponentNode } from '../types/node';
import type { Screen } from '../types/screen';
import type { DesignProject } from '../types/project';
import type { Action, ComponentEvent } from '../types/action';
import { normalizeExpression } from '../types/expression';

/**
 * Deep clone a value.
 * Uses JSON round-trip to ensure compatibility with MobX observable proxies
 * and other non-structuredClone-safe objects.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 规范化 Action 链中"按 schema 必须是 Expression"的字段（裸字符串补 `{{ }}`）。
 *
 * 注意：仅处理强 Expression 字段（如 StateRemoveAction.predicate）。
 *   `value` / `params.*` / `message` / `url` 等 `Expression | unknown` 字段不动 ——
 *   它们允许字面量（"hello" / 42 / true）。
 *
 * 递归处理 effect.fetch.onSuccess / onError 子链。
 */
function normalizeActionChain(actions: Action[] | undefined): void {
  if (!Array.isArray(actions)) return;
  for (const a of actions) {
    if (a.type === 'state.remove' && typeof a.predicate === 'string') {
      a.predicate = normalizeExpression(a.predicate);
    } else if (a.type === 'effect.fetch') {
      normalizeActionChain(a.onSuccess);
      normalizeActionChain(a.onError);
    }
  }
}

/** 规范化 ComponentEvent.condition.when（必须是 Expression<boolean>） */
function normalizeEvents(events: ComponentEvent[] | undefined): void {
  if (!Array.isArray(events)) return;
  for (const ev of events) {
    if (ev.condition && typeof ev.condition.when === 'string') {
      ev.condition.when = normalizeExpression(ev.condition.when);
    }
    normalizeActionChain(ev.actions);
  }
}

/**
 * Ensure all required fields on a ComponentNode have sensible defaults.
 * Walks the tree recursively so every descendant is also normalized.
 * This guards against incomplete data from older schema versions, manual
 * JSON edits, or API responses that omit empty arrays/objects.
 *
 * 同时把"按 schema 必须是 Expression<X>"的字段统一规范化（裸字符串自动补 `{{ }}`）：
 *   - node.visibleWhen
 *   - node.repeat
 *   - events[].condition.when
 *   - actions[].predicate（state.remove）
 *
 * 这样所有写入路径（前端 initProject、后端 migrateV1toV2、screen/template 反序列化）
 * 都能在落地前自动得到合法的表达式形态，避免 ListRenderer / Evaluator 把裸字符串
 * 误判为字面量、导致 `repeat: "state.data.messages"` 这类静默失败。
 */
export function normalizeNode(node: ComponentNode): ComponentNode {
  if (!node.styles) node.styles = {};
  if (!node.props) node.props = {};
  if (!node.states) node.states = [];
  if (!node.events) node.events = [];
  if (node.activeState === undefined) node.activeState = 'default';
  if (node.locked === undefined) node.locked = false;
  if (node.visible === undefined) node.visible = true;

  // ---- v2 强 Expression 字段规范化 ----
  if (typeof node.visibleWhen === 'string') {
    node.visibleWhen = normalizeExpression(node.visibleWhen);
  }
  if (typeof node.repeat === 'string') {
    node.repeat = normalizeExpression(node.repeat);
  }
  normalizeEvents(node.events);

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
