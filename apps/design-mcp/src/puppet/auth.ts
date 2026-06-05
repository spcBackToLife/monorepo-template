/**
 * Puppet 模块：截图 bot 认证 — 复用 scripts/screenshot-screen.mjs 的逻辑。
 *
 * 流程：缓存 token → /api/auth/me 验证 → 失败则 login → 失败则 register。
 * 缓存写入仓库根的 .tica-tmps/.screenshot-bot-token，与 mjs 共享。
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const API_BASE = process.env.DESIGN_API_URL ?? 'http://localhost:3001';
const BOT_EMAIL = process.env.SCREENSHOT_BOT_EMAIL ?? 'screenshot-bot@local.dev';
const BOT_PASSWORD = process.env.SCREENSHOT_BOT_PASSWORD ?? 'screenshotbot123';

/**
 * 解析仓库根目录。
 * design-mcp 的 dist 在 apps/design-mcp/dist，所以从 cwd 向上找带 pnpm-workspace.yaml 的目录最稳。
 * 退化方案：用 process.cwd() 当根（IDE 一般在 monorepo 根启动 MCP）。
 */
export function resolveRepoRoot(): string {
  // 简单起见：直接用 cwd（IDE 启动 MCP 一般在 workspace 根）
  // 如果未来在子目录运行，再加查找 pnpm-workspace.yaml 的逻辑
  return process.cwd();
}

const TOKEN_CACHE = resolve(resolveRepoRoot(), '.tica-tmps/.screenshot-bot-token');

/**
 * 拿到一个有效的 JWT token。
 * 优先用缓存（验证有效），失败则 login，再失败则 register。
 */
export async function ensureToken(): Promise<string> {
  // 1. 缓存验证
  if (existsSync(TOKEN_CACHE)) {
    try {
      const cached = (await readFile(TOKEN_CACHE, 'utf8')).trim();
      if (cached) {
        const ok = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${cached}` },
        }).then((r) => r.ok).catch(() => false);
        if (ok) return cached;
      }
    } catch {
      /* 读缓存失败，继续登录流程 */
    }
  }

  // 2. login
  let token: string | null = null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: BOT_EMAIL, password: BOT_PASSWORD }),
    });
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string };
      token = data.access_token ?? null;
    }
  } catch {
    /* login 网络错误，继续 register */
  }

  // 3. register（首次）
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
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) throw new Error('register 返回缺少 access_token');
    token = data.access_token;
  }

  // 4. 写缓存
  await mkdir(dirname(TOKEN_CACHE), { recursive: true });
  await writeFile(TOKEN_CACHE, token, 'utf8');
  return token;
}
