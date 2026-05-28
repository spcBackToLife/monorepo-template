#!/usr/bin/env ts-node
/**
 * validate.ts — 遍历 design-registry 目录，校验每个节点的完整性
 *
 * 用法:
 *   npx ts-node scripts/validate.ts --registry <registry-root> [--page <page-id>]
 *
 * 检查规则:
 *   1. 层级完整性: interaction有trigger但无design → ⚠️
 *   2. 内容完整性: 叶子节点无content且无materials → ❌
 *   3. 交互完整性: 有trigger但无flows.success/error → ⚠️
 *   4. 引用完整性: 所有 ref 字段指向的文件是否存在
 *   5. 实施验收: status=completed但checklist有false → ⚠️
 *   6. 组件独立文档存在性（★ 新增）: 每个 _component.json 必须有对应的
 *      <name>.visual.md + <name>.md（在 design-plan/components/<name>/ 或
 *      design-plan/pages/<pid>/components/<name>/ 任一处）
 */

import * as fs from 'fs';
import * as path from 'path';

interface Issue {
  level: '❌' | '⚠️' | '📋' | '🎨';
  path: string;
  message: string;
}

function parseArgs(argv: string[]) {
  let registry = '';
  let page = '';

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--registry':
        registry = argv[++i];
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

  return { registry, page };
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

function checkNode(filePath: string, registry: string, workspaceRoot: string): Issue[] {
  const issues: Issue[] = [];
  const relPath = path.relative(registry, filePath);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    issues.push({ level: '❌', path: relPath, message: '文件不是合法 JSON' });
    return issues;
  }

  // 跳过 _index.json 和 pages/_index.json（它们是列表不是节点）
  const basename = path.basename(filePath);
  if (basename === '_index.json') return issues;

  const interaction = data['interaction'] as Record<string, unknown> | undefined;
  const design = data['design'] as Record<string, unknown> | undefined;
  const implementation = data['implementation'] as Record<string, unknown> | undefined;
  const content = data['content'] as Record<string, unknown> | undefined;
  const materials = data['materials'] as unknown[] | null | undefined;
  const logic = data['logic'] as Record<string, unknown> | undefined;

  // 1. 层级完整性
  if (interaction?.['trigger'] && !design) {
    issues.push({ level: '⚠️', path: relPath, message: '有交互trigger但缺少design层' });
  }
  if (design && implementation?.['status'] === 'pending') {
    issues.push({ level: '📋', path: relPath, message: '设计已完成，待实施' });
  }
  if (interaction?.['states'] && (interaction['states'] as string[]).length > 1 && !design?.['visualStates']) {
    issues.push({ level: '⚠️', path: relPath, message: '有多状态但缺少visualStates定义' });
  }

  // 2. 内容完整性（仅叶子节点）
  const dir = path.dirname(filePath);
  const hasSubDirs = fs.readdirSync(dir, { withFileTypes: true }).some(e => e.isDirectory());
  const isLeaf = !hasSubDirs || basename !== '_component.json';

  if (isLeaf && basename !== '_page.json' && basename !== '_materials.json') {
    if (content?.['type'] === 'none' && (materials === null || materials === undefined)) {
      issues.push({ level: '❌', path: relPath, message: '叶子节点无内容且无素材(空壳)' });
    }
  }

  // 3. 交互完整性
  if (interaction?.['trigger'] && interaction['flows']) {
    const flows = interaction['flows'] as Record<string, unknown>;
    if (!flows['success'] && !flows['error']) {
      issues.push({ level: '⚠️', path: relPath, message: '有trigger但flows缺少success/error' });
    }
  }

  // 4. 引用完整性
  const checkRef = (refValue: unknown, fieldName: string) => {
    if (typeof refValue !== 'string' || !refValue) return;
    // 提取文件路径（去掉 #anchor）
    const refPath = (refValue as string).split('#')[0];
    if (!refPath) return;
    // 在 workspace root 查找
    const fullRef = path.join(workspaceRoot, refPath);
    if (!fs.existsSync(fullRef)) {
      issues.push({ level: '⚠️', path: relPath, message: `ref 文件不存在: ${fieldName} → ${refPath}` });
    }
  };

  if (data['product'] && typeof data['product'] === 'object') {
    checkRef((data['product'] as Record<string, unknown>)['ref'], 'product.ref');
  }
  if (interaction) {
    checkRef(interaction['ref'], 'interaction.ref');
  }
  if (design) {
    checkRef(design['ref'], 'design.ref');
    checkRef(design['visualRef'], 'design.visualRef');
  }

  // 5. 实施验收
  if (implementation?.['status'] === 'completed' && implementation['checklist']) {
    const checklist = implementation['checklist'] as Record<string, boolean>;
    const incomplete = Object.entries(checklist).filter(([, v]) => v === false);
    if (incomplete.length > 0) {
      issues.push({
        level: '⚠️',
        path: relPath,
        message: `status=completed 但 checklist 未通过: ${incomplete.map(([k]) => k).join(', ')}`,
      });
    }
  }

  // 6. 组件独立文档存在性（仅检查 _component.json 节点）
  //    每个组件必须有 <name>.visual.md + <name>.md，路径在
  //    design-plan/components/<name>/ 或 design-plan/pages/<pid>/components/<name>/ 任一处。
  //    要求两份文件都存在；都缺则 ❌；只缺其一则 ⚠️；两处都存在则 ⚠️（路径冲突）。
  if (basename === '_component.json') {
    // 从 registry 路径推断 pageId 和组件名
    // relPath 形如: pages/<pid>/<comp-dir-or-nested>/_component.json
    const segments = relPath.split(path.sep);
    if (segments.length >= 4 && segments[0] === 'pages') {
      const pid = segments[1];
      const compName = segments[segments.length - 2]; // 父目录名

      const universalDir = path.join(workspaceRoot, 'design-plan', 'components', compName);
      const pageScopedDir = path.join(workspaceRoot, 'design-plan', 'pages', pid, 'components', compName);

      const checkPair = (dir: string) => {
        const hasVisual = fs.existsSync(path.join(dir, `${compName}.visual.md`));
        const hasMain = fs.existsSync(path.join(dir, `${compName}.md`));
        return { hasVisual, hasMain, exists: hasVisual || hasMain, complete: hasVisual && hasMain };
      };

      const u = checkPair(universalDir);
      const p = checkPair(pageScopedDir);

      if (!u.exists && !p.exists) {
        issues.push({
          level: '❌',
          path: relPath,
          message: `组件 ${compName} 缺独立文档：应在 design-plan/components/${compName}/ 或 design-plan/pages/${pid}/components/${compName}/ 任一处放 ${compName}.visual.md + ${compName}.md`,
        });
      } else if (u.exists && p.exists) {
        issues.push({
          level: '⚠️',
          path: relPath,
          message: `组件 ${compName} 在通用目录和页面专属目录两处都有文档，路径冲突，需决定唯一来源`,
        });
      } else {
        const target = u.exists ? u : p;
        const dirHint = u.exists
          ? `design-plan/components/${compName}/`
          : `design-plan/pages/${pid}/components/${compName}/`;
        if (!target.hasVisual) {
          issues.push({
            level: '⚠️',
            path: relPath,
            message: `组件 ${compName} 缺 visual.md：${dirHint}${compName}.visual.md`,
          });
        }
        if (!target.hasMain) {
          issues.push({
            level: '⚠️',
            path: relPath,
            message: `组件 ${compName} 缺结构文档：${dirHint}${compName}.md`,
          });
        }
      }
    }
  }

  return issues;
}

function main() {
  const { registry, page } = parseArgs(process.argv);

  // 确定 workspace root（registry 的上一级 = .design-workspaces/<task>/）
  // 例如 registry=.design-workspaces/campus-geo-social/design-registry
  //      workspaceRoot=.design-workspaces/campus-geo-social
  const workspaceRoot = path.resolve(registry, '..');

  // 确定扫描范围
  let scanDir = path.join(registry, 'pages');
  if (page) {
    scanDir = path.join(registry, 'pages', page);
    if (!fs.existsSync(scanDir)) {
      console.error(`❌ 页面目录不存在: ${scanDir}`);
      process.exit(1);
    }
  }

  const files = findJsonFiles(scanDir);
  const allIssues: Issue[] = [];

  for (const file of files) {
    allIssues.push(...checkNode(file, registry, workspaceRoot));
  }

  // 输出结果
  console.log(`\n═══ Design Registry 校验报告 ═══\n`);
  console.log(`扫描范围: ${path.relative(registry, scanDir)}`);
  console.log(`文件数量: ${files.length}`);
  console.log('');

  if (allIssues.length === 0) {
    console.log('✅ 全部通过，无问题！');
  } else {
    // 按级别分组
    const grouped: Record<string, Issue[]> = {};
    for (const issue of allIssues) {
      if (!grouped[issue.level]) grouped[issue.level] = [];
      grouped[issue.level].push(issue);
    }

    for (const [level, issues] of Object.entries(grouped)) {
      console.log(`${level} (${issues.length} 项):`);
      for (const issue of issues) {
        console.log(`  ${issue.path}: ${issue.message}`);
      }
      console.log('');
    }
  }

  console.log(`总计: ${allIssues.length} 个问题`);

  // 如果有❌级别的问题，退出码非0
  if (allIssues.some(i => i.level === '❌')) {
    process.exit(1);
  }
}

main();
