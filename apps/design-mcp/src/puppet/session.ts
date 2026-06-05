/**
 * Puppet 会话管理 — 长期常驻 puppeteer 会话池。
 *
 * 设计要点：
 * 1. 一个 design-mcp 进程内可以并发存在多个会话（不同项目/不同屏）
 * 2. 会话超过 SESSION_TTL_MS 未活动自动 close（防泄漏）
 * 3. begin 进入预览模式，等到 [data-preview-root data-screen-id] 就绪后才返回
 * 4. session 元信息存内存 Map；进程重启后会话丢失，让 AI 重新 begin（成本 ~4s）
 */

import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { ensureToken } from './auth.js';

const FRONT_BASE = process.env.DESIGN_FRONT_URL ?? 'http://localhost:5174';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 分钟无活动自动回收

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
].filter((p): p is string => Boolean(p));

function findChrome(): string {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      `未找到 Chrome 可执行文件。已尝试：${CHROME_CANDIDATES.join(', ')}。请设置 CHROME_PATH 环境变量。`,
    );
  }
  return found;
}

export interface PuppetSession {
  id: string;
  projectId: string;
  /** 用户 begin 时指定的 screenId；不指定就跟 active 屏 */
  screenId?: string;
  browser: Browser;
  page: Page;
  /** 当前是否在 preview 模式（begin 后默认是 true） */
  inPreview: boolean;
  createdAt: number;
  lastUsedAt: number;
}

const sessions = new Map<string, PuppetSession>();
let gcTimer: NodeJS.Timeout | null = null;

function startGcIfNeeded(): void {
  if (gcTimer) return;
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions.entries()) {
      if (now - s.lastUsedAt > SESSION_TTL_MS) {
        s.browser.close().catch(() => undefined);
        sessions.delete(id);
      }
    }
    if (sessions.size === 0 && gcTimer) {
      clearInterval(gcTimer);
      gcTimer = null;
    }
  }, 60_000).unref();
}

/**
 * 找到 session 并刷新活跃时间。找不到抛错。
 */
export function getSession(id: string): PuppetSession {
  const s = sessions.get(id);
  if (!s) {
    throw new Error(
      `puppet session "${id}" 不存在或已被 GC。请重新 puppet/begin。当前活跃会话数：${sessions.size}`,
    );
  }
  s.lastUsedAt = Date.now();
  return s;
}

export function listSessions(): Array<{
  id: string;
  projectId: string;
  screenId: string | undefined;
  inPreview: boolean;
  createdAt: number;
  lastUsedAt: number;
  ageSec: number;
  idleSec: number;
}> {
  const now = Date.now();
  return Array.from(sessions.values()).map((s) => ({
    id: s.id,
    projectId: s.projectId,
    screenId: s.screenId,
    inPreview: s.inPreview,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    ageSec: Math.round((now - s.createdAt) / 1000),
    idleSec: Math.round((now - s.lastUsedAt) / 1000),
  }));
}

/**
 * 启动新会话：
 *   1. 启动 Chrome
 *   2. 注入 token 到 localStorage
 *   3. 进入 /editor/<projectId>，等待 [data-screen-id]
 *   4. 切预览模式，等待 [data-preview-root data-screen-id]
 */
export async function beginSession(opts: {
  projectId: string;
  screenId?: string;
  /** 默认 preview。设为 'editor' 时不切预览模式（一般不需要） */
  mode?: 'preview' | 'editor';
  /** viewport 尺寸，默认 1800x1400 deviceScaleFactor=2 */
  viewport?: { width: number; height: number; deviceScaleFactor?: number };
}): Promise<PuppetSession> {
  const mode = opts.mode ?? 'preview';
  const chromePath = findChrome();
  const token = await ensureToken();

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    const vp = opts.viewport ?? { width: 1800, height: 1400, deviceScaleFactor: 2 };
    await page.setViewport(vp);

    // 透传错误日志（puppet 调用方在 mcp 工具里看不到这些，但能在 mcp server 进程 stderr 里查）
    page.on('pageerror', (err) => {
      console.error(`[puppet ${opts.projectId}] pageerror:`, err.message);
    });

    // 1. 注入 JWT
    await page.goto(FRONT_BASE, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.evaluate((t) => {
      localStorage.setItem('design_auth_token', t);
    }, token);

    // 2. 进入 editor
    const editorUrl = `${FRONT_BASE}/editor/${opts.projectId}`;
    await page.goto(editorUrl, { waitUntil: 'networkidle0', timeout: 30_000 });

    // 3. 等 SchemaRenderer 出现
    const screenSelector = opts.screenId
      ? `[data-screen-id="${opts.screenId}"]`
      : '[data-screen-id]';
    await page.waitForSelector(screenSelector, { timeout: 20_000, visible: true });

    // 4. 切预览模式
    let inPreview = false;
    if (mode === 'preview') {
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector<HTMLButtonElement>('button[title^="预览"]');
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!clicked) {
        throw new Error(
          '进入 preview 模式失败：找不到 button[title^="预览"]。可能是 design_front 版本变化或未登录。',
        );
      }
      await page.waitForSelector('[data-preview-root]', { timeout: 15_000, visible: true });
      const previewScreenSelector = opts.screenId
        ? `[data-preview-root] [data-screen-id="${opts.screenId}"]`
        : `[data-preview-root] [data-screen-id]`;
      await page.waitForSelector(previewScreenSelector, { timeout: 10_000, visible: true });
      inPreview = true;
    }

    const id = randomUUID();
    const now = Date.now();
    const session: PuppetSession = {
      id,
      projectId: opts.projectId,
      screenId: opts.screenId,
      browser,
      page,
      inPreview,
      createdAt: now,
      lastUsedAt: now,
    };
    sessions.set(id, session);
    startGcIfNeeded();
    return session;
  } catch (err) {
    await browser.close().catch(() => undefined);
    throw err;
  }
}

/**
 * 关闭一个会话。幂等（不存在直接 no-op）。
 */
export async function endSession(id: string): Promise<void> {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  await s.browser.close().catch(() => undefined);
}

/**
 * 重置会话到"刚 begin 的状态"——重新进入 /editor + 切 preview。
 * 不重启浏览器，省 ~3s。
 */
export async function resetSession(id: string): Promise<void> {
  const s = getSession(id);
  const editorUrl = `${FRONT_BASE}/editor/${s.projectId}`;
  await s.page.goto(editorUrl, { waitUntil: 'networkidle0', timeout: 30_000 });
  const screenSelector = s.screenId ? `[data-screen-id="${s.screenId}"]` : '[data-screen-id]';
  await s.page.waitForSelector(screenSelector, { timeout: 20_000, visible: true });

  // 重新切 preview（reset 之前可能已经是 preview，但页面 reload 后 store 会重置）
  if (s.inPreview) {
    const clicked = await s.page.evaluate(() => {
      const btn = document.querySelector<HTMLButtonElement>('button[title^="预览"]');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) throw new Error('reset 后进入 preview 模式失败：找不到预览按钮');
    await s.page.waitForSelector('[data-preview-root]', { timeout: 15_000, visible: true });
    const previewScreenSelector = s.screenId
      ? `[data-preview-root] [data-screen-id="${s.screenId}"]`
      : `[data-preview-root] [data-screen-id]`;
    await s.page.waitForSelector(previewScreenSelector, { timeout: 10_000, visible: true });
  }
}
