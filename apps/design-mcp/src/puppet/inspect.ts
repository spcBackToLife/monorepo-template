/**
 * Puppet 截图与 DOM 探测 —— 「机器对账」的真正基石。
 *
 * snapshot：截 [data-preview-root] 内的指定屏，写盘到 .tica-tmps/snapshots/。
 * inspect ：读节点的 computedStyles、boundingRect、textContent、classList，
 *           AI 看图肉眼判不出"色到底是 #C7 还是 #C8"，这里直接给出精确值。
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve, isAbsolute } from 'node:path';
import { resolveRepoRoot } from './auth.js';
import { getSession } from './session.js';
import { waitForIdle } from './actions.js';

export interface SnapshotResult {
  /** PNG 绝对路径 */
  path: string;
  width: number;
  height: number;
  /** 当前 preview 屏内可见的 [data-node-id] 数量（粗略代理"是否还在渲染"） */
  visibleNodeCount: number;
  /** 调用方传的 label（会被嵌进文件名） */
  label: string;
}

/**
 * 截图指定 session 的当前画面。
 *
 * - 在 preview 模式下截 [data-preview-root data-screen-id="..."]
 * - 在 editor 模式下截 [data-screen-id="..."]
 *
 * 输出路径：.tica-tmps/snapshots/<projectId>-<screenId?>-<label>-<timestamp>.png
 * label 会做 slug 处理（小写化 + 非字母数字转 -），避免奇怪文件名。
 */
export async function takeSnapshot(
  sessionId: string,
  opts: { label: string; outputPath?: string } = { label: 'shot' },
): Promise<SnapshotResult> {
  const s = getSession(sessionId);

  // 等渲染稳定（schema 改完 ws 推过来 + react patch + 字体 + 图）
  await waitForIdle(s.page, 400);

  const screenSel = s.screenId
    ? `[data-screen-id="${s.screenId}"]`
    : '[data-screen-id]';
  const captureSel = s.inPreview ? `[data-preview-root] ${screenSel}` : screenSel;
  const handle = await s.page.$(captureSel);
  if (!handle) throw new Error(`截图失败：找不到 ${captureSel}（页面状态可能已损坏）`);

  await handle.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));

  const slugLabel = opts.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shot';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const defaultPath = resolve(
    resolveRepoRoot(),
    '.tica-tmps/snapshots',
    `${s.projectId}${s.screenId ? `-${s.screenId}` : ''}-${slugLabel}-${timestamp}.png`,
  );
  const outAbs = opts.outputPath
    ? (isAbsolute(opts.outputPath) ? opts.outputPath : resolve(resolveRepoRoot(), opts.outputPath))
    : defaultPath;

  await mkdir(dirname(outAbs), { recursive: true });
  await handle.screenshot({ path: outAbs, type: 'png', omitBackground: false });

  // 读尺寸 + 节点数
  const meta = await s.page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      nodeCount: el.querySelectorAll('[data-node-id]').length,
    };
  }, captureSel);

  return {
    path: outAbs,
    width: meta?.width ?? 0,
    height: meta?.height ?? 0,
    visibleNodeCount: meta?.nodeCount ?? 0,
    label: opts.label,
  };
}

export interface InspectResult {
  nodeId: string;
  found: boolean;
  rect?: { x: number; y: number; width: number; height: number };
  /** 关键 computed CSS 属性。AI 自己挑想看的传 propsList 限定 */
  computedStyles?: Record<string, string>;
  textContent?: string;
  classList?: string[];
  /** 该节点下子 [data-node-id] 数量 */
  childNodeCount?: number;
}

/**
 * 默认的 computed style 关注集 —— 视觉对账最常关心的那些。
 * 调用方可以传 propsList 覆盖。
 */
const DEFAULT_STYLE_PROPS = [
  'color',
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'borderColor',
  'borderWidth',
  'borderStyle',
  'borderRadius',
  'opacity',
  'display',
  'visibility',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'padding',
  'margin',
  'boxShadow',
  'transform',
  'cursor',
  'pointerEvents',
];

export async function inspectNode(
  sessionId: string,
  nodeId: string,
  opts: { stylePropsList?: string[] } = {},
): Promise<InspectResult> {
  const s = getSession(sessionId);
  const sel = s.inPreview
    ? `[data-preview-root] [data-node-id="${nodeId.replace(/"/g, '\\"')}"]`
    : `[data-node-id="${nodeId.replace(/"/g, '\\"')}"]`;

  const propsList = opts.stylePropsList ?? DEFAULT_STYLE_PROPS;

  const result = await s.page.evaluate(
    (selector, props) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return { found: false as const };
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const styles: Record<string, string> = {};
      for (const p of props) styles[p] = cs.getPropertyValue(p) || (cs[p as keyof CSSStyleDeclaration] as string) || '';
      return {
        found: true as const,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        styles,
        textContent: (el.textContent ?? '').trim().slice(0, 500),
        classList: Array.from(el.classList),
        childCount: el.querySelectorAll('[data-node-id]').length,
      };
    },
    sel,
    propsList,
  );

  if (!result.found) return { nodeId, found: false };
  return {
    nodeId,
    found: true,
    rect: result.rect,
    computedStyles: result.styles,
    textContent: result.textContent,
    classList: result.classList,
    childNodeCount: result.childCount,
  };
}
