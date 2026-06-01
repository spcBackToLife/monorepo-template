#!/usr/bin/env node
/**
 * 独立 puppeteer 截图脚本（事前预防方案 §3.1 P0 临时实现）
 *
 * 它解决了什么：
 *   1. 现有 apps/design-api SnapshotsService 走 /preview/<projectId>?screen=<id>，
 *      但 design_front 没实现 /preview 路由 → 落到 "*" 重定向到 / → PrivateRoute
 *      把未登录请求踢到 /login → 截到的是 design_front 自己的 5 元素登录页
 *      （title=H5 Mobile, body="登录 邮箱 密码 登录 没有账号？去注册"）。
 *      ★ 这就是 self-review.md 行 11 报"snapshot 服务持续返回 5 元素简化登录页"的真正根因。
 *      不是 puppeteer 的问题，是没登录态的问题。
 *
 *   2. 本脚本自动跑「注册截图机器人 → 登录拿 JWT → 注入 localStorage → 访问 /editor/:id
 *      → 等 SchemaRenderer 渲染 → 重置 editor 缩放 → 截 [data-screen-id] 区域 → 写盘」
 *      端到端流程，让 AI 每次能 Read 真实的设计渲染图。
 *
 * 用法：
 *   node scripts/screenshot-screen.mjs <projectId> [screenId] [outputPath] [--mode=preview|editor]
 *
 *   示例：
 *     node scripts/screenshot-screen.mjs d84c140e-0437-4c80-a786-c1f389bcbb02
 *     node scripts/screenshot-screen.mjs d84c140e-... --mode=editor    # 想看编辑画布
 *
 *   --mode=preview（默认）：进入 editor 后切 previewMode=true，
 *                         截 [data-preview-root] 容器 — 纯 schema 渲染，
 *                         没有任何编辑器工具栏 / 浮动 dock / 选中框。
 *   --mode=editor：保留编辑画布样式（设备 frame + 工具栏在画面外）。
 *
 *   不传 screenId → 截当前 active 屏（editor 默认显示 active 屏）
 *   不传 outputPath → 保存到 .tica-tmps/snapshots/<projectId>-<timestamp>.png
 *   stdout 最后一行是绝对路径 — 调用方可以管道捕获 (X=$(node ... | tail -1))
 *
 * 环境变量：
 *   CHROME_PATH         覆盖 Chrome 可执行文件路径
 *   DESIGN_FRONT_URL    默认 http://localhost:5174
 *   DESIGN_API_URL      默认 http://localhost:3001
 *   SCREENSHOT_BOT_EMAIL/SCREENSHOT_BOT_PASSWORD 覆盖默认 bot 账号
 *
 * 依赖：
 *   - puppeteer-core（hoist 在根 node_modules）
 *   - 系统 Chrome
 *   - design-api:3001 + design_front:5174 在跑
 *
 * 退出码：
 *   0 = 成功（绝对路径打到 stdout 末尾）
 *   1 = 失败
 */

import puppeteer from 'puppeteer-core';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROJECT_ID = process.argv[2];
// 解析 [screenId] [outputPath] [--mode=preview|editor]
let SCREEN_ID;
let OUTPUT_ARG;
let MODE = 'preview'; // 默认 preview，纯 schema 渲染

for (const a of process.argv.slice(3)) {
  if (a.startsWith('--mode=')) {
    const v = a.slice('--mode='.length);
    if (v !== 'preview' && v !== 'editor') {
      console.error(`[error] --mode 只能是 preview 或 editor，收到 ${v}`);
      process.exit(1);
    }
    MODE = v;
  } else if (!SCREEN_ID && !a.includes('/') && !a.includes('.')) {
    SCREEN_ID = a;
  } else {
    OUTPUT_ARG = a;
  }
}

if (!PROJECT_ID) {
  console.error('Usage: node scripts/screenshot-screen.mjs <projectId> [screenId] [outputPath] [--mode=preview|editor]');
  process.exit(1);
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error(`[error] Chrome 未找到。设置 CHROME_PATH 环境变量。`);
  process.exit(1);
}

const FRONT_BASE = process.env.DESIGN_FRONT_URL || 'http://localhost:5174';
const API_BASE = process.env.DESIGN_API_URL || 'http://localhost:3001';
const BOT_EMAIL = process.env.SCREENSHOT_BOT_EMAIL || 'screenshot-bot@local.dev';
const BOT_PASSWORD = process.env.SCREENSHOT_BOT_PASSWORD || 'screenshotbot123';
const TOKEN_CACHE = resolve(ROOT, '.tica-tmps/.screenshot-bot-token');

// ─── 1. 拿 token（先读缓存 → 验证 → 失败再 login → 失败再 register）─────────
async function ensureToken() {
  // 1.1 缓存
  if (existsSync(TOKEN_CACHE)) {
    try {
      const cached = (await readFile(TOKEN_CACHE, 'utf8')).trim();
      if (cached) {
        // 用 /api/auth/me 验证
        const ok = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${cached}` },
        }).then((r) => r.ok);
        if (ok) {
          console.error('[auth] token 缓存有效');
          return cached;
        }
      }
    } catch {}
  }

  // 1.2 login
  let token = null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: BOT_EMAIL, password: BOT_PASSWORD }),
    });
    if (res.ok) {
      const data = await res.json();
      token = data.access_token;
      console.error('[auth] 登录成功');
    }
  } catch {}

  // 1.3 register（首次）
  if (!token) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: BOT_EMAIL, password: BOT_PASSWORD }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`auth 失败：login 不通过 + register 也失败：${errText}`);
    }
    const data = await res.json();
    token = data.access_token;
    console.error('[auth] 首次注册截图 bot 账号');
  }

  // 1.4 写缓存
  await mkdir(dirname(TOKEN_CACHE), { recursive: true });
  await writeFile(TOKEN_CACHE, token, 'utf8');
  return token;
}

const token = await ensureToken();

// ─── 2. 启动 puppeteer ────────────────────────────────────────────────────
console.error(`[1/6] 启动 Chrome (${chromePath.split('/').pop()})`);
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const defaultOutput = resolve(
  ROOT,
  '.tica-tmps/snapshots',
  `${PROJECT_ID}${SCREEN_ID ? `-${SCREEN_ID}` : ''}-${timestamp}.png`,
);
const outputAbs = OUTPUT_ARG ? resolve(OUTPUT_ARG) : defaultOutput;

try {
  const page = await browser.newPage();
  // 大画布给 editor 完整展开（避免设备 frame 被工具栏挤窄）
  await page.setViewport({ width: 1800, height: 1400, deviceScaleFactor: 2 });

  // 透传 console.error / pageerror 方便排查
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error') {
      const txt = msg.text();
      // 过滤已知的无害 404（vite 偶尔的 chunk 探测）
      if (!txt.includes('404')) console.error(`[browser ${t}] ${txt}`);
    }
  });
  page.on('pageerror', (err) => console.error(`[browser pageerror] ${err.message}`));

  // 2.1 先访问根域，建立 origin 才能 setItem
  console.error(`[2/6] 注入 JWT 到 localStorage (origin=${FRONT_BASE})`);
  await page.goto(FRONT_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate((t) => {
    localStorage.setItem('design_auth_token', t);
  }, token);

  // 2.2 访问 editor
  const editorUrl = `${FRONT_BASE}/editor/${PROJECT_ID}`;
  console.error(`[3/6] 访问 ${editorUrl}`);
  await page.goto(editorUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // 2.3 等 SchemaRenderer 渲染（[data-screen-id] 是 SchemaRenderer 注入的标记）
  console.error('[4/6] 等待 SchemaRenderer 出现...');
  const screenSelector = SCREEN_ID ? `[data-screen-id="${SCREEN_ID}"]` : '[data-screen-id]';
  await page.waitForSelector(screenSelector, { timeout: 20000, visible: true });

  // 2.4 模式分叉
  let captureSelector;
  if (MODE === 'preview') {
    // 切到预览模式 → 编辑器 chrome 退场，画布换成 PreviewRenderer
    console.error('[4.5/6] 切换到预览模式...');
    // 点击预览按钮（Toolbar/index.tsx 行 308 的 antd Button，title="预览（同画布，可点按、悬停）"）
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button[title^="预览"]');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!clicked) throw new Error('未找到预览按钮');

    // 等 PreviewRenderer 的 [data-preview-root] 出现
    await page.waitForSelector('[data-preview-root]', { timeout: 15000, visible: true });
    // PreviewRenderer 内部也会注入 [data-screen-id]，等到当前屏渲染稳定
    await page.waitForSelector(`[data-preview-root] [data-screen-id]`, { timeout: 10000, visible: true });
    captureSelector = SCREEN_ID
      ? `[data-preview-root] [data-screen-id="${SCREEN_ID}"]`
      : `[data-preview-root] [data-screen-id]`;
  } else {
    // 编辑模式：重置缩放 + 隐藏 overlay handles，截 editor 内的 [data-screen-id]
    await page.addStyleTag({
      content: `
        .editor-canvas-transform { transform: none !important; }
        .editor-canvas-area     { overflow: visible !important; }
        [data-canvas-overlay-handle], .editor-canvas-overlay,
        .editor-canvas-overlay-selection { display: none !important; }
      `,
    });
    captureSelector = screenSelector;
  }

  // 2.5 等字体 + 已发起的图片
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) =>
        img.complete && img.naturalWidth > 0
          ? null
          : new Promise((res) => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
              setTimeout(res, 3000);
            }),
      ),
    );
  });

  // 给布局多 1.2s 稳定（visualState autoActivated + dataContext 求值 + 预览模式切换动画）
  await new Promise((r) => setTimeout(r, 1500));

  console.error(`[5/6] 截图（mode=${MODE}）— 选择器：${captureSelector}`);
  const handle = await page.$(captureSelector);
  if (!handle) throw new Error(`元素 ${captureSelector} 未找到`);
  await handle.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));

  await mkdir(dirname(outputAbs), { recursive: true });
  await handle.screenshot({ path: outputAbs, type: 'png', omitBackground: false });

  const debugInfo = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      bgColor: getComputedStyle(el).backgroundColor,
      childrenCount: el.querySelectorAll('[data-node-id]').length,
    };
  }, captureSelector);

  console.error(`[6/6] 完成 — ${JSON.stringify(debugInfo)}`);
  console.error('');
  process.stdout.write(outputAbs + '\n');
} catch (err) {
  console.error(`[error] ${err.message}`);
  process.exit(1);
} finally {
  await browser.close();
}
