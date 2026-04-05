import type { ComponentNode, ComponentTemplate, Screen } from '@globallink/design-schema';
import { isComponentInstanceType } from '@globallink/design-schema';
import { resolveComponentInstance } from '../assets/resolveInstance';
import { resolveNodeStyles } from '../styles/resolveStyles';
import { resolveNodeProps } from '../styles/resolveProps';
import type { DataContext } from '../data/resolveExpression';
import { hasExpression } from '../data/resolveExpression';
import type { CoordinateMap, CoordinateMapEntry, NodeRect } from './coordinateMap';

export type SchemaLayoutInteractionPreview = { nodeId: string; state: string } | null;

export interface BuildSchemaLayoutMapOptions {
  viewportWidth: number;
  viewportHeight: number;
  globalStates: Record<string, string>;
  assets: ComponentTemplate[];
  interactionPreview?: SchemaLayoutInteractionPreview;
  /** 与 SchemaRenderer 一致：样式中的 `{{data.*}}` 需在布局估算前解析 */
  dataContext?: DataContext;
}

function resolveInteractionForNode(
  nodeId: string,
  interactionPreview: SchemaLayoutInteractionPreview | undefined,
): string | null {
  if (!interactionPreview || interactionPreview.nodeId !== nodeId) return null;
  const s = interactionPreview.state;
  if (!s || s === 'default' || s === 'normal') return null;
  return s;
}

/** 解析 left/top/width/height 等为 px（百分比相对 ref） */
export function parseLengthPx(value: unknown, ref: number): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const s = value.trim();
    if (s === '' || s === 'auto') return null;
    if (s.endsWith('%')) {
      const n = parseFloat(s);
      if (!Number.isFinite(n)) return null;
      return (n / 100) * ref;
    }
    if (s.endsWith('px')) {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

/**
 * 设备框 + margin 的裁剪矩形（与 buildCoordinateMap 同一容器坐标系：editor-canvas-stack 局部像素）
 */
export function expandCullRect(
  viewportWidth: number,
  viewportHeight: number,
  marginPx: number,
): { x: number; y: number; width: number; height: number } {
  const m = Math.max(0, marginPx);
  return {
    x: -m,
    y: -m,
    width: viewportWidth + 2 * m,
    height: viewportHeight + 2 * m,
  };
}

export function nodeRectIntersectsCull(
  rect: NodeRect,
  cull: { x: number; y: number; width: number; height: number },
): boolean {
  return rectsIntersect(rect, cull);
}

/**
 * 从 Schema 推导与 DOM 同坐标系的包围盒（仅适用于绝对/相对定位 + 可解析的 px/% 尺寸）。
 * 用于 W7-025：DOM 未挂载时与 mergeCoordinateMaps 合并，保证 hitTest / 对齐线与 Schema 一致。
 */
export function buildSchemaLayoutMap(screen: Screen, options: BuildSchemaLayoutMapOptions): CoordinateMap {
  const out = new Map<string, CoordinateMapEntry>();
  const vp = {
    x: 0,
    y: 0,
    width: Math.max(1, options.viewportWidth),
    height: Math.max(1, options.viewportHeight),
  };

  function walk(
    node: ComponentNode,
    offsetParentRect: { x: number; y: number; width: number; height: number },
    isRoot: boolean,
  ): void {
    const resolved = isComponentInstanceType(node.type)
      ? resolveComponentInstance(node, options.assets)
      : node;

    const interactionForNode = resolveInteractionForNode(resolved.id, options.interactionPreview ?? null);

    if (hasExpression(resolved.props.__listData)) {
      for (const child of resolved.children ?? []) {
        walk(child, offsetParentRect, false);
      }
      return;
    }

    const { visible } = resolveNodeProps(resolved, options.globalStates, interactionForNode);
    if (visible === false) return;

    const styles = resolveNodeStyles(
      resolved,
      options.globalStates,
      interactionForNode,
      options.dataContext,
    );
    const pos = ((styles.position as string | undefined) ?? 'static') as string;

    if (isRoot) {
      const box: NodeRect = { x: 0, y: 0, width: vp.width, height: vp.height };
      out.set(resolved.id, { nodeId: resolved.id, rect: box });
      for (const child of resolved.children ?? []) {
        walk(child, box, false);
      }
      return;
    }

    if (pos === 'absolute' || pos === 'fixed') {
      const left = parseLengthPx(styles.left, offsetParentRect.width) ?? 0;
      const top = parseLengthPx(styles.top, offsetParentRect.height) ?? 0;
      const width = parseLengthPx(styles.width, offsetParentRect.width);
      const height = parseLengthPx(styles.height, offsetParentRect.height);
      const w = width ?? 0;
      const h = height ?? 0;
      const box: NodeRect = {
        x: offsetParentRect.x + left,
        y: offsetParentRect.y + top,
        width: Math.max(w, 1),
        height: Math.max(h, 1),
      };
      out.set(resolved.id, { nodeId: resolved.id, rect: box });
      for (const child of resolved.children ?? []) {
        walk(child, box, false);
      }
      return;
    }

    if (pos === 'relative') {
      const w =
        parseLengthPx(styles.width, offsetParentRect.width) ?? offsetParentRect.width;
      const h =
        parseLengthPx(styles.height, offsetParentRect.height) ?? offsetParentRect.height;
      const left = parseLengthPx(styles.left, offsetParentRect.width) ?? 0;
      const top = parseLengthPx(styles.top, offsetParentRect.height) ?? 0;
      const box: NodeRect = {
        x: offsetParentRect.x + left,
        y: offsetParentRect.y + top,
        width: Math.max(w, 1),
        height: Math.max(h, 1),
      };
      out.set(resolved.id, { nodeId: resolved.id, rect: box });
      for (const child of resolved.children ?? []) {
        walk(child, box, false);
      }
      return;
    }

    for (const child of resolved.children ?? []) {
      walk(child, offsetParentRect, false);
    }
  }

  walk(screen.rootNode, vp, true);
  return out;
}
