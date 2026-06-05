/**
 * Puppet 操作模块 — 在 preview 页面里寻址 nodeId 并执行交互。
 *
 * 寻址：[data-node-id="<nodeId>"]（PreviewRenderer 渲染时已注入此 attribute）。
 * 在 preview 模式下还要限制在 [data-preview-root] 子树里，避免误中编辑器画布。
 */

import type { Page } from 'puppeteer-core';
import { getSession } from './session.js';

/**
 * 构造 preview 模式下针对 nodeId 的 selector。
 * 普通选择器：`[data-preview-root] [data-node-id="..."]`
 * editor 模式：`[data-node-id="..."]`（直接全 doc 找）
 */
function nodeSelector(inPreview: boolean, nodeId: string): string {
  // 转义 nodeId 里的 css 特殊字符（uuid 一般不含，但稳妥）
  const safe = nodeId.replace(/"/g, '\\"');
  return inPreview
    ? `[data-preview-root] [data-node-id="${safe}"]`
    : `[data-node-id="${safe}"]`;
}

/**
 * 等待 nodeId 可见。timeout 默认 5s（节点应该已经在画布上）。
 */
async function waitForNode(page: Page, inPreview: boolean, nodeId: string, timeout = 5000): Promise<void> {
  await page.waitForSelector(nodeSelector(inPreview, nodeId), { timeout, visible: true });
}

/**
 * 等 React 渲染稳定 + 字体 + 已发起的图片就绪 + 一段固定 settle。
 * 主要在 click/type 后调用，让随后的 snapshot/inspect 看到的是稳定态。
 */
export async function waitForIdle(page: Page, settleMs = 250): Promise<void> {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? null
          : new Promise<void>((res) => {
              const done = (): void => res();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
              setTimeout(done, 1500);
            }),
      ),
    );
  });
  await new Promise((r) => setTimeout(r, settleMs));
}

export async function actClick(sessionId: string, nodeId: string): Promise<void> {
  const s = getSession(sessionId);
  await waitForNode(s.page, s.inPreview, nodeId);
  const sel = nodeSelector(s.inPreview, nodeId);
  await s.page.click(sel);
  await waitForIdle(s.page);
}

/**
 * 在节点上输入文字。
 * - 默认会先 click 让节点 focus
 * - clear=true 会先 select-all + delete 清空已有内容
 * - 适用于 input / textarea / contenteditable
 */
export async function actType(
  sessionId: string,
  nodeId: string,
  text: string,
  opts: { clear?: boolean; delay?: number } = {},
): Promise<void> {
  const s = getSession(sessionId);
  await waitForNode(s.page, s.inPreview, nodeId);
  const sel = nodeSelector(s.inPreview, nodeId);

  // 直接拿 elementHandle，input/textarea 用 .type()，其他用 .focus()+keyboard.type
  const handle = await s.page.$(sel);
  if (!handle) throw new Error(`node ${nodeId} 找不到`);

  await handle.click();
  if (opts.clear) {
    // 选中全部后用 keyboard 清空，兼容 input/textarea/contenteditable
    await s.page.keyboard.down(process.platform === 'darwin' ? 'Meta' : 'Control');
    await s.page.keyboard.press('A');
    await s.page.keyboard.up(process.platform === 'darwin' ? 'Meta' : 'Control');
    await s.page.keyboard.press('Delete');
  }
  await s.page.keyboard.type(text, { delay: opts.delay ?? 0 });
  await waitForIdle(s.page);
}

/**
 * 让节点失焦（触发 onBlur 校验等场景）。
 * 实现：把焦点切到 body，因为没有"反向 focus"原语。
 */
export async function actBlur(sessionId: string, nodeId: string): Promise<void> {
  const s = getSession(sessionId);
  await waitForNode(s.page, s.inPreview, nodeId);
  const sel = nodeSelector(s.inPreview, nodeId);
  await s.page.evaluate((selector) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && typeof el.blur === 'function') el.blur();
    // 兜底：把焦点丢到 body
    if (document.body && typeof document.body.focus === 'function') document.body.focus();
  }, sel);
  await waitForIdle(s.page);
}

export async function actHover(sessionId: string, nodeId: string): Promise<void> {
  const s = getSession(sessionId);
  await waitForNode(s.page, s.inPreview, nodeId);
  const sel = nodeSelector(s.inPreview, nodeId);
  await s.page.hover(sel);
  await waitForIdle(s.page);
}

export async function actScroll(
  sessionId: string,
  nodeId: string | undefined,
  opts: { x?: number; y?: number; intoView?: boolean },
): Promise<void> {
  const s = getSession(sessionId);
  if (nodeId) {
    await waitForNode(s.page, s.inPreview, nodeId);
    const sel = nodeSelector(s.inPreview, nodeId);
    if (opts.intoView) {
      await s.page.evaluate((selector) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
      }, sel);
    } else {
      await s.page.evaluate(
        (selector, x, y) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (el) el.scrollBy({ left: x ?? 0, top: y ?? 0, behavior: 'instant' as ScrollBehavior });
        },
        sel,
        opts.x ?? 0,
        opts.y ?? 0,
      );
    }
  } else {
    await s.page.evaluate(
      (x, y) => window.scrollBy({ left: x ?? 0, top: y ?? 0, behavior: 'instant' as ScrollBehavior }),
      opts.x ?? 0,
      opts.y ?? 0,
    );
  }
  await waitForIdle(s.page);
}

export async function actWait(sessionId: string, ms: number): Promise<void> {
  const s = getSession(sessionId);
  await new Promise((r) => setTimeout(r, ms));
  // 不主动 waitForIdle —— 用户自己指定 ms 就是显式等待
  void s;
}

/**
 * 按下键盘组合键（不针对节点）。常见：Tab、Escape、Enter。
 */
export async function actKeyboard(sessionId: string, key: string): Promise<void> {
  const s = getSession(sessionId);
  await s.page.keyboard.press(key);
  await waitForIdle(s.page);
}
