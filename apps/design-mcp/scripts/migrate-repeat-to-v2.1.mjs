#!/usr/bin/env node
/**
 * 一次性迁移脚本：把项目里 v2.0 时代的 `node.repeat: Expression<unknown[]> | string`
 * 升级成 v2.1 的 `{ expression: string; template: ComponentNode }` 三层模型。
 *
 * 规则：
 *   - 旧字段是 string（含 `{{ }}` 表达式） → 作为 new `repeat.expression`
 *   - 取 node.children[0] 作为 new `repeat.template`
 *     - 没有 children 时 → 警告并跳过
 *   - 写回：直接 PATCH project 的 full snapshot（本仓库没有 "element.setRepeatRaw"，
 *     此脚本用 PUT /api/projects/:id 做一次整体覆盖）
 *
 * 用法：
 *   cd apps/design-mcp
 *   node scripts/migrate-repeat-to-v2.1.mjs                 # 干跑
 *   node scripts/migrate-repeat-to-v2.1.mjs --apply         # 真正写回
 *   PROJECT_ID=xxx node scripts/migrate-repeat-to-v2.1.mjs --apply
 */

const API_BASE = process.env.DESIGN_API_URL || 'http://127.0.0.1:3001';
const PROJECT_ID = process.env.PROJECT_ID || '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';
const APPLY = process.argv.includes('--apply');

/** 遍历 node（含 children 和 repeat.template 子树） */
function walkNodes(node, visit) {
  if (!node) return;
  visit(node);
  (node.children ?? []).forEach((c) => walkNodes(c, visit));
  if (node.repeat && typeof node.repeat === 'object' && node.repeat.template) {
    walkNodes(node.repeat.template, visit);
  }
}

function isLegacyRepeat(r) {
  return typeof r === 'string' && r.trim() !== '';
}

function migrateNode(node, ctxName) {
  if (!isLegacyRepeat(node.repeat)) return false;

  const expression = node.repeat;
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) {
    console.warn(
      `[repeat-migrate] SKIP ${ctxName} / ${node.id} (${node.type}): repeat="${expression}" but no children — ` +
        `cannot derive template automatically; please set manually.`,
    );
    return false;
  }

  const template = children[0];
  const remaining = children.slice(1);

  node.repeat = { expression, template };
  node.children = remaining;

  console.log(
    `[repeat-migrate] ${ctxName} / ${node.id} (${node.type}): ` +
      `expression="${expression}", template=${template.id} (${template.type}), ` +
      `remaining static children=${remaining.length}`,
  );
  return true;
}

async function fetchProject() {
  const r = await fetch(`${API_BASE}/api/projects/${PROJECT_ID}`);
  if (!r.ok) throw new Error(`GET project failed: ${r.status} ${r.statusText}`);
  return r.json();
}

async function putProject(project) {
  const r = await fetch(`${API_BASE}/api/projects/${PROJECT_ID}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PUT project failed: ${r.status} ${text}`);
  }
  return r.json();
}

async function main() {
  console.log(`[repeat-migrate] mode=${APPLY ? 'APPLY' : 'dry-run'} project=${PROJECT_ID}`);
  const project = await fetchProject();
  const screens = project.screens ?? [];
  console.log(`[repeat-migrate] ${screens.length} screen(s)`);

  let touched = 0;

  for (const scr of screens) {
    if (!scr.rootNode) continue;
    walkNodes(scr.rootNode, (node) => {
      if (migrateNode(node, scr.name ?? scr.id)) touched += 1;
    });
  }

  // ComponentTemplate.schema 里也可能有 repeat
  for (const asset of project.componentAssets ?? []) {
    if (!asset.schema) continue;
    walkNodes(asset.schema, (node) => {
      if (migrateNode(node, `template:${asset.name ?? asset.id}`)) touched += 1;
    });
  }

  console.log(`[repeat-migrate] nodes migrated=${touched}`);
  if (!APPLY) {
    console.log('[repeat-migrate] dry-run; pass --apply to write back.');
    return;
  }
  if (touched === 0) {
    console.log('[repeat-migrate] nothing to do.');
    return;
  }
  await putProject(project);
  console.log('[repeat-migrate] project updated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
