#!/usr/bin/env ts-node
/**
 * task-gen.ts — 为指定技能生成有序任务列表
 *
 * 用法:
 *   npx ts-node scripts/task-gen.ts --registry <registry-root> --for executor [--page <page-id>]
 *   npx ts-node scripts/task-gen.ts --registry <registry-root> --for planner
 *   npx ts-node scripts/task-gen.ts --registry <registry-root> --for interaction
 *
 * 模式:
 *   executor: 找所有 implementation.status=pending 且有 design 层的节点（按深度排序，父先于子）
 *   planner: 找所有有 interaction 但无 design 的节点
 *   interaction: 找所有有 product 但无 interaction 的页面
 */

import * as fs from 'fs';
import * as path from 'path';

interface TaskItem {
  path: string;
  id: string;
  type: string;
  name: string;
  summary: string;
  refs: string[];
  depth: number;
}

function parseArgs(argv: string[]) {
  let registry = '';
  let forSkill = '';
  let page = '';

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--registry':
        registry = argv[++i];
        break;
      case '--for':
        forSkill = argv[++i];
        break;
      case '--page':
        page = argv[++i];
        break;
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

  if (!forSkill) {
    console.error('❌ 必须指定 --for (executor|planner|interaction)');
    process.exit(1);
  }

  if (!['executor', 'planner', 'interaction'].includes(forSkill)) {
    console.error('❌ --for 必须是 executor, planner 或 interaction');
    process.exit(1);
  }

  return { registry, forSkill, page };
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

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function collectRefs(data: Record<string, unknown>): string[] {
  const refs: string[] = [];
  const walk = (obj: unknown) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key === 'ref' && typeof val === 'string' && val) {
        refs.push(val.split('#')[0]);
      }
      walk(val);
    }
  };
  walk(data);
  return [...new Set(refs)];
}

function main() {
  const { registry, forSkill, page } = parseArgs(process.argv);

  let scanDir = path.join(registry, 'pages');
  if (page) {
    scanDir = path.join(registry, 'pages', page);
  }

  const files = findJsonFiles(scanDir);
  const tasks: TaskItem[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    // 跳过索引文件
    if (basename === '_index.json' || basename === '_materials.json') continue;

    const data = readJson(file);
    if (!data || !data['id']) continue;

    const relPath = path.relative(path.join(registry, 'pages'), file).replace(/\.json$/, '');
    const depth = relPath.split(path.sep).length;
    const implementation = data['implementation'] as Record<string, unknown> | undefined;
    const interaction = data['interaction'] as Record<string, unknown> | undefined;
    const design = data['design'] as Record<string, unknown> | undefined;
    const product = data['product'] as Record<string, unknown> | undefined;

    if (forSkill === 'executor') {
      // 找 status=pending 且有 design 层的节点
      if (implementation?.['status'] === 'pending' && design) {
        tasks.push({
          path: relPath,
          id: data['id'] as string,
          type: data['type'] as string,
          name: data['name'] as string,
          summary: (design['summary'] as string) || '',
          refs: collectRefs(data),
          depth,
        });
      }
    } else if (forSkill === 'planner') {
      // 找有 interaction 但无 design 的节点
      if (interaction && !design) {
        tasks.push({
          path: relPath,
          id: data['id'] as string,
          type: data['type'] as string,
          name: data['name'] as string,
          summary: (interaction['summary'] as string) || '',
          refs: collectRefs(data),
          depth,
        });
      }
    } else if (forSkill === 'interaction') {
      // 找有 product 但无 interaction 的页面(_page.json)
      if (basename === '_page.json' && product && !interaction) {
        tasks.push({
          path: relPath.replace('/_page', ''),
          id: data['id'] as string,
          type: 'page',
          name: data['name'] as string,
          summary: (product['summary'] as string) || '',
          refs: collectRefs(data),
          depth,
        });
      }
    }
  }

  // 排序：按深度（父先于子），同深度按路径字母序
  tasks.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));

  // 输出
  console.log(`\n═══ 任务列表 (--for ${forSkill}) ═══\n`);

  if (tasks.length === 0) {
    console.log('✅ 无待处理任务');
    return;
  }

  console.log(`共 ${tasks.length} 个任务:\n`);
  console.log(`${'#'.padStart(3)} | ${'path'.padEnd(50)} | ${'type'.padEnd(10)} | summary`);
  console.log(`${'─'.repeat(3)} | ${'─'.repeat(50)} | ${'─'.repeat(10)} | ${'─'.repeat(40)}`);

  tasks.forEach((task, idx) => {
    console.log(`${String(idx + 1).padStart(3)} | ${task.path.padEnd(50)} | ${task.type.padEnd(10)} | ${task.summary.slice(0, 40)}`);
  });

  if (tasks.length > 0 && tasks[0].refs.length > 0) {
    console.log(`\n📖 第一个任务需要读取的 ref 文件:`);
    tasks[0].refs.forEach(ref => console.log(`   - ${ref}`));
  }
}

main();
