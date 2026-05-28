#!/usr/bin/env ts-node
/**
 * stats.ts — 输出项目整体进度
 *
 * 用法:
 *   npx ts-node scripts/stats.ts --registry <registry-root>
 */

import * as fs from 'fs';
import * as path from 'path';

interface PageStats {
  id: string;
  name: string;
  totalNodes: number;
  completedNodes: number;
  pendingNodes: number;
  totalMaterials: number;
  completedMaterials: number;
  missingInteraction: number;
  missingDesign: number;
}

function parseArgs(argv: string[]) {
  let registry = '';
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--registry') registry = argv[++i];
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
  return { registry };
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

function main() {
  const { registry } = parseArgs(process.argv);

  // 读取项目信息
  const indexPath = path.join(registry, '_index.json');
  const indexData = readJson(indexPath);
  const projectName = (indexData?.['project'] as Record<string, unknown>)?.['name'] || '未命名项目';

  // 读取页面列表
  const pagesDir = path.join(registry, 'pages');
  if (!fs.existsSync(pagesDir)) {
    console.error('❌ pages/ 目录不存在');
    process.exit(1);
  }

  const pageDirs = fs.readdirSync(pagesDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  const pageStatsList: PageStats[] = [];

  for (const pageId of pageDirs) {
    const pageDir = path.join(pagesDir, pageId);
    const pageJson = readJson(path.join(pageDir, '_page.json'));
    const materialsJson = readJson(path.join(pageDir, '_materials.json'));

    const stats: PageStats = {
      id: pageId,
      name: (pageJson?.['name'] as string) || pageId,
      totalNodes: 0,
      completedNodes: 0,
      pendingNodes: 0,
      totalMaterials: 0,
      completedMaterials: 0,
      missingInteraction: 0,
      missingDesign: 0,
    };

    // 统计节点
    const nodeFiles = findJsonFiles(pageDir).filter(f => {
      const bn = path.basename(f);
      return bn !== '_index.json' && bn !== '_materials.json';
    });

    for (const file of nodeFiles) {
      const data = readJson(file);
      if (!data || !data['id']) continue;

      stats.totalNodes++;
      const impl = data['implementation'] as Record<string, unknown> | undefined;
      if (impl?.['status'] === 'completed') {
        stats.completedNodes++;
      } else {
        stats.pendingNodes++;
      }

      if (data['product'] && !data['interaction']) stats.missingInteraction++;
      if (data['interaction'] && !data['design']) stats.missingDesign++;
    }

    // 统计素材
    if (materialsJson?.['materials'] && Array.isArray(materialsJson['materials'])) {
      const mats = materialsJson['materials'] as Array<Record<string, unknown>>;
      stats.totalMaterials = mats.length;
      stats.completedMaterials = mats.filter(m =>
        (m['implementation'] as Record<string, unknown>)?.['status'] === 'completed'
      ).length;
    }

    pageStatsList.push(stats);
  }

  // 输出报告
  console.log(`\n═══ ${projectName} 进度报告 ═══\n`);
  console.log(`页面进度:`);

  for (const p of pageStatsList) {
    const pct = p.totalNodes > 0 ? Math.round((p.completedNodes / p.totalNodes) * 100) : 0;
    const icon = pct === 100 ? '✅' : pct > 0 ? '🔄' : '⬜';
    console.log(
      `  ${icon} ${p.id.padEnd(20)} ${String(p.completedNodes).padStart(3)}/${String(p.totalNodes).padStart(3)} 节点 (${String(pct).padStart(3)}%)  ${p.completedMaterials}/${p.totalMaterials} 素材`
    );
  }

  // 待处理统计
  const totalPending = pageStatsList.reduce((s, p) => s + p.pendingNodes, 0);
  const totalMissingInteraction = pageStatsList.reduce((s, p) => s + p.missingInteraction, 0);
  const totalMissingDesign = pageStatsList.reduce((s, p) => s + p.missingDesign, 0);
  const totalMissingMaterials = pageStatsList.reduce((s, p) => s + (p.totalMaterials - p.completedMaterials), 0);

  console.log(`\n待处理:`);
  if (totalPending > 0) console.log(`  - ${totalPending} 个节点待实施`);
  if (totalMissingInteraction > 0) console.log(`  - ${totalMissingInteraction} 个节点缺交互层`);
  if (totalMissingDesign > 0) console.log(`  - ${totalMissingDesign} 个节点缺设计层`);
  if (totalMissingMaterials > 0) console.log(`  - ${totalMissingMaterials} 个素材待绘制`);

  if (totalPending === 0 && totalMissingInteraction === 0 && totalMissingDesign === 0 && totalMissingMaterials === 0) {
    console.log(`  ✅ 全部完成！`);
  }

  // 下一步建议
  console.log(`\n下一步建议:`);
  if (totalMissingInteraction > 0) {
    const p = pageStatsList.find(p => p.missingInteraction > 0);
    console.log(`  → 运行 interaction-designer: ${p?.id} (${p?.missingInteraction} 个节点缺交互)`);
  } else if (totalMissingDesign > 0) {
    const p = pageStatsList.find(p => p.missingDesign > 0);
    console.log(`  → 运行 design-planner: ${p?.id} (${p?.missingDesign} 个节点缺设计)`);
  } else if (totalPending > 0) {
    const p = pageStatsList.find(p => p.pendingNodes > 0);
    console.log(`  → 运行 design-executor: ${p?.id} (${p?.pendingNodes} 个节点待实施)`);
  }
}

main();
