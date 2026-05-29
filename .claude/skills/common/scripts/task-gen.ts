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
  hasMaterials?: boolean;  // 节点自身有 materials 数组依赖
  boundNodes?: string[];   // 素材任务绑定的目标节点
}

function parseArgs(argv: string[]) {
  let registry = '';
  let forSkill = '';
  let page = '';
  let workspace = '';
  let output = '';

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
      case '--workspace':
        workspace = argv[++i];
        break;
      case '--output':
        output = argv[++i];
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

  return { registry, forSkill, page, workspace, output };
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
  const { registry, forSkill, page, workspace, output } = parseArgs(process.argv);

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
      // 找未完成(pending 或无 implementation 层)且有 design 层的节点
      const implStatus = implementation?.['status'] as string | undefined;
      const isNotDone = !implStatus || implStatus === 'pending';
      if (isNotDone && design) {
        const nodeMaterials = data['materials'] as unknown[] | undefined;
        tasks.push({
          path: relPath,
          id: data['id'] as string,
          type: data['type'] as string,
          name: data['name'] as string,
          summary: (design['summary'] as string) || '',
          refs: collectRefs(data),
          depth,
          hasMaterials: Array.isArray(nodeMaterials) && nodeMaterials.length > 0,
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

  // ═══ executor 模式：扫描 _materials.json 生成独立素材任务 ═══
  if (forSkill === 'executor') {
    // 重新扫描目录找 _materials.json（主循环跳过了它）
    const allFiles = findJsonFiles(scanDir);
    for (const file of allFiles) {
      if (path.basename(file) !== '_materials.json') continue;

      const matData = readJson(file);
      if (!matData) continue;

      const materials = matData['materials'] as Record<string, Record<string, unknown>> | undefined;
      if (!materials) continue;

      const pageDir = path.relative(path.join(registry, 'pages'), path.dirname(file));

      for (const [matId, matInfo] of Object.entries(materials)) {
        const status = matInfo['status'] as string;
        if (status !== 'pending') continue; // 已完成的素材不再生成任务

        const matRef = matInfo['ref'] as string || '';
        const boundNodes = matInfo['boundNodes'] as string[] || [];
        const matName = matInfo['name'] as string || matId;
        const matType = matInfo['type'] as string || 'unknown';
        const size = matInfo['size'] as string || '';

        tasks.push({
          path: `${pageDir}/_materials/${matId}`,
          id: matId,
          type: 'material',
          name: `${matName} (${matType} ${size})`,
          summary: `绘制素材 ${matName} → 应用到 ${boundNodes.join(', ')}`,
          refs: matRef ? [matRef] : [],
          depth: 100, // 素材排在所有节点之后（先有节点才能 apply）
          boundNodes,
        });
      }
    }
  }

  // 排序：按深度（父先于子），同深度按路径字母序
  tasks.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));

  // ═══ 控制台输出（始终打印）═══
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

  // ═══ 写文件（executor 模式必须生成 EXECUTOR-PLAN.md）═══
  const outputPath = output
    || (workspace && forSkill === 'executor'
      ? path.join(workspace, 'design-plan', 'EXECUTOR-PLAN.md')
      : '');

  if (outputPath && forSkill === 'executor') {
    const lines: string[] = [];
    lines.push('# Executor 任务计划');
    lines.push('');
    lines.push(`> 生成时间: ${new Date().toISOString()}`);
    lines.push(`> 总任务数: ${tasks.length}`);
    lines.push(`> 范围: ${page || '全部页面'}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // 按页面分组
    const pageGroups: Record<string, TaskItem[]> = {};
    for (const task of tasks) {
      const pageId = task.path.split('/')[0] || task.path;
      if (!pageGroups[pageId]) pageGroups[pageId] = [];
      pageGroups[pageId].push(task);
    }

    for (const [pageId, pageTasks] of Object.entries(pageGroups)) {
      lines.push(`## ${pageId}（${pageTasks.length} 个节点）`);
      lines.push('');

      for (const task of pageTasks) {
        lines.push(`### ${task.path}`);
        lines.push(`- **名称**: ${task.name}`);
        lines.push(`- **类型**: ${task.type}`);
        lines.push(`- **摘要**: ${task.summary}`);
        lines.push('');

        // checklist — 根据类型不同
        if (task.type === 'material') {
          lines.push('- [ ] 读取素材规格文档 (§6 绘制要求)');
          lines.push('- [ ] 调用 material-painter 绘制');
          lines.push('- [ ] export_and_apply 到目标节点');
          lines.push('- [ ] 建立素材槽位');
          lines.push('- [ ] 验证视觉效果');
          if (task.boundNodes && task.boundNodes.length > 0) {
            lines.push(`- **绑定节点**: ${task.boundNodes.join(', ')}`);
          }
        } else {
          lines.push('- [ ] 读取节点 JSON + 所有 ref 文档');
          lines.push('- [ ] 结构搭建 (page-builder)');
          lines.push('- [ ] 样式设置');
          lines.push('- [ ] 事件/交互绑定');
          if (task.hasMaterials) {
            lines.push('- [ ] 素材绘制 (material-painter) ⚠️ 节点有 materials 依赖');
          }
          lines.push('- [ ] 验证 checklist');
          lines.push('- [ ] 回写 implementation');
        }
        lines.push('');

        // ref 文件列表
        if (task.refs.length > 0) {
          lines.push('📖 需读文档:');
          task.refs.forEach(ref => lines.push(`  - ${ref}`));
          lines.push('');
        }
      }
    }

    // 确保输出目录存在
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    console.log(`\n✅ 任务计划已写入: ${outputPath}`);
  }
}

main();
