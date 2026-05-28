#!/usr/bin/env ts-node
/**
 * query.ts — 按条件查询 design-registry 节点
 *
 * 用法:
 *   npx ts-node scripts/query.ts --registry <path> --status pending
 *   npx ts-node scripts/query.ts --registry <path> --type element
 *   npx ts-node scripts/query.ts --registry <path> --has-materials --status pending
 *   npx ts-node scripts/query.ts --registry <path> --missing design --page 03-fishing
 *   npx ts-node scripts/query.ts --registry <path> --trigger click --page 02-publish-moment
 *   npx ts-node scripts/query.ts --registry <path> --checklist-incomplete
 */

import * as fs from 'fs';
import * as path from 'path';

interface QueryResult {
  path: string;
  type: string;
  status: string;
  summary: string;
}

function parseArgs(argv: string[]) {
  let registry = '';
  let status = '';
  let type = '';
  let hasMaterials = false;
  let missing = '';
  let trigger = '';
  let page = '';
  let checklistIncomplete = false;

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--registry': registry = argv[++i]; break;
      case '--status': status = argv[++i]; break;
      case '--type': type = argv[++i]; break;
      case '--has-materials': hasMaterials = true; break;
      case '--missing': missing = argv[++i]; break;
      case '--trigger': trigger = argv[++i]; break;
      case '--page': page = argv[++i]; break;
      case '--checklist-incomplete': checklistIncomplete = true; break;
    }
  }

  if (!registry) {
    const cwd = process.cwd();
    const candidate = path.join(cwd, 'design-registry');
    if (fs.existsSync(candidate)) {
      registry = candidate;
    } else {
      console.error('❌ 找不到 design-registry 目录，请使用 --registry 指定');
      process.exit(1);
    }
  }

  return { registry, status, type, hasMaterials, missing, trigger, page, checklistIncomplete };
}

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'scripts') {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const args = parseArgs(process.argv);

  let scanDir = path.join(args.registry, 'pages');
  if (args.page) {
    scanDir = path.join(args.registry, 'pages', args.page);
  }

  const files = findJsonFiles(scanDir);
  const results: QueryResult[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    if (basename === '_index.json' || basename === '_materials.json') continue;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
      continue;
    }

    if (!data['id']) continue;

    const impl = data['implementation'] as Record<string, unknown> | undefined;
    const nodeStatus = (impl?.['status'] as string) || 'no-impl';
    const nodeType = (data['type'] as string) || 'unknown';
    const interaction = data['interaction'] as Record<string, unknown> | undefined;
    const design = data['design'] as Record<string, unknown> | undefined;
    const materials = data['materials'] as unknown[] | null | undefined;

    // 过滤
    if (args.status && nodeStatus !== args.status) continue;
    if (args.type && nodeType !== args.type) continue;
    if (args.hasMaterials && (!materials || materials.length === 0)) continue;
    if (args.missing === 'design' && design) continue;
    if (args.missing === 'interaction' && interaction) continue;
    if (args.missing === 'product' && data['product']) continue;
    if (args.trigger && interaction?.['trigger'] !== args.trigger) continue;
    if (args.checklistIncomplete) {
      if (!impl?.['checklist']) continue;
      const cl = impl['checklist'] as Record<string, boolean>;
      if (!Object.values(cl).some(v => v === false)) continue;
    }

    const relPath = path.relative(path.join(args.registry, 'pages'), file).replace(/\.json$/, '');
    const summary = (design?.['summary'] as string)
      || (interaction?.['summary'] as string)
      || (data['product'] as Record<string, unknown>)?.['summary'] as string
      || '';

    results.push({ path: relPath, type: nodeType, status: nodeStatus, summary: summary.slice(0, 50) });
  }

  // 输出
  console.log(`\n═══ 查询结果 ═══\n`);
  console.log(`条件: ${JSON.stringify(Object.fromEntries(Object.entries(args).filter(([k, v]) => k !== 'registry' && v)))}`);
  console.log(`匹配: ${results.length} 个节点\n`);

  if (results.length === 0) {
    console.log('(无匹配结果)');
    return;
  }

  console.log(`${'path'.padEnd(55)} | ${'type'.padEnd(10)} | ${'status'.padEnd(10)} | summary`);
  console.log(`${'─'.repeat(55)} | ${'─'.repeat(10)} | ${'─'.repeat(10)} | ${'─'.repeat(40)}`);

  for (const r of results) {
    console.log(`${r.path.padEnd(55)} | ${r.type.padEnd(10)} | ${r.status.padEnd(10)} | ${r.summary}`);
  }
}

main();
