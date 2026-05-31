#!/usr/bin/env bun
/**
 * audit-expressions.ts —— 审计现有 schema 中的表达式 lint 命中数。
 *
 * 在切 ops 层 strict 门禁前，先跑此脚本扫一遍仓库内已有的 schema JSON：
 *   - 文件参数 / glob：扫指定文件（默认扫常见落点）
 *   - stdin 模式：从管道读 DesignProject JSON
 *
 * 用法：
 *   bun run scripts/audit-expressions.ts                          # 默认扫常见 schema 落点
 *   bun run scripts/audit-expressions.ts <glob1> [glob2] ...       # 显式 glob
 *   cat project.json | bun run scripts/audit-expressions.ts --stdin
 *
 * 输出：
 *   - stdout：人读 markdown 报告
 *   - exit 0：0 个 error 级 issue
 *   - exit 1：≥1 error；CI / 预检脚本可借此判断是否应当切 strict
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { walkExpressionsInProject, type ExpressionFieldRef } from '../src/expression/walker';
import type { DesignProject } from '@globallink/design-schema';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ===== 默认扫描位置 =====
const DEFAULT_TARGETS = [
  'apps/design-api/snapshots',     // 后端快照
  'apps/design-api/uploads',       // 上传产物（一般不含 project）
  'apps/design-api/database',      // db 初始化产物
  'features/design-schema/src/__fixtures__',
  'features/design-engine/src/__fixtures__',
  'features/design-operations/src/__fixtures__',
];

// ===== 入参 =====
interface CliArgs {
  fromStdin: boolean;
  globs: string[];
  errorOnly: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { fromStdin: false, globs: [], errorOnly: false };
  for (const a of argv) {
    if (a === '--stdin') args.fromStdin = true;
    else if (a === '--error-only') args.errorOnly = true;
    else if (!a.startsWith('--')) args.globs.push(a);
  }
  return args;
}

// ===== JSON 文件枚举 =====
function listJsonFiles(targets: string[]): string[] {
  const out: string[] = [];
  for (const t of targets) {
    const abs = resolve(REPO_ROOT, t);
    try {
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        out.push(...recurseDir(abs));
      } else if (stat.isFile() && abs.endsWith('.json')) {
        out.push(abs);
      }
    } catch {
      // 路径不存在：跳过
    }
  }
  return Array.from(new Set(out));
}

function recurseDir(dir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...recurseDir(p));
    else if (e.isFile() && e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

// ===== 判定一个 JSON 是否像 DesignProject =====
function looksLikeDesignProject(obj: unknown): obj is DesignProject {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return Array.isArray(o.screens);
}

// ===== 主流程 =====
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const allRefs: Array<{ source: string; refs: ExpressionFieldRef[] }> = [];

  if (args.fromStdin) {
    const stdin = await readAllStdin();
    if (!stdin.trim()) {
      console.error('error: --stdin 模式但未读到输入');
      process.exit(2);
    }
    try {
      const obj = JSON.parse(stdin);
      if (looksLikeDesignProject(obj)) {
        const refs = walkExpressionsInProject(obj, { errorOnly: args.errorOnly });
        if (refs.length) allRefs.push({ source: '<stdin>', refs });
      } else {
        console.error('warn: stdin 不像 DesignProject（缺 screens 字段）');
      }
    } catch (err) {
      console.error(`error: stdin JSON 解析失败 — ${(err as Error).message}`);
      process.exit(2);
    }
  } else {
    const targets = args.globs.length ? args.globs : DEFAULT_TARGETS;
    const files = listJsonFiles(targets);
    if (!files.length) {
      console.log('audit-expressions: 没找到任何 JSON 文件可扫');
      console.log('  默认目标：');
      for (const t of DEFAULT_TARGETS) console.log(`    - ${t}`);
      console.log('  扫描结果：0 个 DesignProject，0 个 issue');
      console.log('');
      console.log('结论：仓库内没有内嵌 schema 数据可审计。可放心切 ops strict 门禁。');
      process.exit(0);
    }

    for (const f of files) {
      let obj: unknown;
      try {
        obj = JSON.parse(readFileSync(f, 'utf-8'));
      } catch {
        continue; // 不是 JSON 就跳过
      }
      if (looksLikeDesignProject(obj)) {
        const refs = walkExpressionsInProject(obj, { errorOnly: args.errorOnly });
        if (refs.length) allRefs.push({ source: relative(REPO_ROOT, f), refs });
      }
    }
  }

  // ===== 报告 =====
  printReport(allRefs);
  const errorCount = countErrors(allRefs);
  process.exit(errorCount === 0 ? 0 : 1);
}

function countErrors(all: Array<{ source: string; refs: ExpressionFieldRef[] }>): number {
  let n = 0;
  for (const { refs } of all) {
    for (const r of refs) {
      n += r.issues.filter((i) => i.level === 'error').length;
    }
  }
  return n;
}

function printReport(all: Array<{ source: string; refs: ExpressionFieldRef[] }>): void {
  console.log('# audit-expressions report');
  console.log('');
  console.log(`生成时间: ${new Date().toISOString()}`);
  console.log(`扫描数据源: ${all.length}`);
  if (all.length === 0) {
    console.log('');
    console.log('✅ 无问题。仓库现存 schema 全部通过 lint，可切 ops strict 门禁。');
    return;
  }

  let totalErr = 0;
  let totalWarn = 0;
  for (const { refs } of all) {
    for (const r of refs) {
      for (const i of r.issues) {
        if (i.level === 'error') totalErr++;
        else totalWarn++;
      }
    }
  }
  console.log(`总计: ${totalErr} errors, ${totalWarn} warnings`);
  console.log('');

  for (const { source, refs } of all) {
    console.log(`## ${source}`);
    console.log('');
    for (const r of refs) {
      console.log(
        `- **${r.fieldPath}** (${r.nodeId ?? '?'}${r.screenId ? ` @ ${r.screenId}` : ''})`,
      );
      console.log(`  - 原值: \`${r.rawValue}\``);
      for (const i of r.issues) {
        console.log(`  - [${i.code}] ${i.message}`);
        if (i.hint) console.log(`    hint: ${i.hint}`);
        if (i.suggestedFix) console.log(`    suggestedFix: ${i.suggestedFix}`);
        if (i.specRef) console.log(`    spec: ${i.specRef}`);
      }
    }
    console.log('');
  }

  console.log('---');
  if (totalErr === 0) {
    console.log('✅ 仅有 warning，无 error。可切 ops strict 门禁。');
  } else {
    console.log(`❌ 命中 ${totalErr} 个 error，必须先修复历史数据再切 strict。`);
    console.log(`   修复策略：(1) 修历史数据 (2) 临时加 warn-only 灰度开关`);
  }
}

async function readAllStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

await main().catch((err) => {
  console.error('audit-expressions: fatal', err);
  process.exit(2);
});
