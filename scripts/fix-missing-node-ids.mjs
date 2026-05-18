#!/usr/bin/env node
/**
 * 一次性修复脚本：为 project snapshot 中缺失 id 的节点补上 ID
 *
 * 原因：History / Profile 屏幕的子节点在创建时漏掉了 node.id，
 *       导致渲染器 interactionPreview?.nodeId === node.id (undefined === undefined)
 *       → 访问 null.state → TypeError 崩溃。
 *
 * 方案：直接连数据库，读取 snapshot JSON，遍历树补 ID，写回 snapshot。
 *
 * 用法：
 *   node scripts/fix-missing-node-ids.mjs
 *   node scripts/fix-missing-node-ids.mjs --dry   # 试跑（不写回）
 */

import pg from 'pg';
const { Pool } = pg;

const PROJECT_ID = '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';
const DRY_RUN = process.argv.includes('--dry');

// 与 design-schema generateNodeId 格式一致
function generateNodeId() {
  const chars = 'abcdef0123456789';
  let id = 'nd_';
  for (let i = 0; i < 21; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** DFS 遍历节点树，给缺失 id 的节点补上 ID */
function fixNodeIds(node, path = 'root', stats = { fixed: 0, total: 0 }) {
  stats.total++;
  if (!node.id) {
    const newId = generateNodeId();
    console.log(`  [FIX] ${path} (type=${node.type}, name=${node.name || '-'}) → ${newId}`);
    node.id = newId;
    stats.fixed++;
  }
  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i++) {
      fixNodeIds(node.children[i], `${path}.children[${i}]`, stats);
    }
  }
  if (node.repeat && typeof node.repeat === 'object' && node.repeat.template) {
    fixNodeIds(node.repeat.template, `${path}.repeat.template`, stats);
  }
  return stats;
}

async function main() {
  console.log(`\n=== fix-missing-node-ids (直连 DB) ===`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (不写回)' : '⚠️  LIVE (会写回数据库)'}\n`);

  const pool = new Pool({
    connectionString: 'postgresql://root:pk139482@127.0.0.1:5432/design_db',
  });

  try {
    // 1. 读取所有 snapshots（按版本倒序，只改最新的）
    const snapResult = await pool.query(
      `SELECT id, version, schema FROM design_snapshots
       WHERE project_id = $1
       ORDER BY version DESC`,
      [PROJECT_ID],
    );

    if (snapResult.rows.length === 0) {
      console.error('未找到该项目的 snapshot');
      return;
    }

    console.log(`找到 ${snapResult.rows.length} 个 snapshot\n`);

    // 只修最新的 snapshot
    const latest = snapResult.rows[0];
    console.log(`处理最新 snapshot: version=${latest.version}, id=${latest.id}`);

    const schema = typeof latest.schema === 'string' ? JSON.parse(latest.schema) : latest.schema;
    let totalFixed = 0;

    for (const screen of schema.screens || []) {
      console.log(`\n  Screen: "${screen.name}" (${screen.id})`);
      const stats = fixNodeIds(screen.rootNode, 'rootNode');
      console.log(`    → 共 ${stats.total} 个节点，修复 ${stats.fixed} 个缺失 ID`);
      totalFixed += stats.fixed;
    }

    for (const asset of schema.componentAssets || []) {
      if (asset.schema) {
        console.log(`\n  Asset: "${asset.name}" (${asset.id})`);
        const stats = fixNodeIds(asset.schema, 'schema');
        console.log(`    → 共 ${stats.total} 个节点，修复 ${stats.fixed} 个缺失 ID`);
        totalFixed += stats.fixed;
      }
    }

    console.log(`\n总计修复: ${totalFixed} 个节点`);

    if (totalFixed === 0) {
      console.log('✅ 无需修复');
      return;
    }

    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN 完成。去掉 --dry 参数执行真实写入。');
      return;
    }

    // 2. 写回 snapshot
    console.log('\n正在写回 snapshot...');
    await pool.query(
      `UPDATE design_snapshots SET schema = $1 WHERE id = $2`,
      [JSON.stringify(schema), latest.id],
    );
    console.log('✅ Snapshot 已更新');

    // 3. 同时检查有无 operation 日志里的 insertSubtree 也带了无 ID 节点
    //    （这些 op 在重放时也会导致问题）
    const opsResult = await pool.query(
      `SELECT id, seq, operation FROM design_operations
       WHERE project_id = $1 AND seq > $2
       ORDER BY seq ASC`,
      [PROJECT_ID, latest.version],
    );

    let opsFixed = 0;
    for (const row of opsResult.rows) {
      const op = typeof row.operation === 'string' ? JSON.parse(row.operation) : row.operation;
      if (op.type === 'element.insertSubtree' && op.params?.subtree) {
        const stats = { fixed: 0, total: 0 };
        fixNodeIds(op.params.subtree, `op[seq=${row.seq}].subtree`, stats);
        if (stats.fixed > 0) {
          await pool.query(
            `UPDATE design_operations SET operation = $1 WHERE id = $2`,
            [JSON.stringify(op), row.id],
          );
          opsFixed += stats.fixed;
          console.log(`  修复 operation seq=${row.seq}: ${stats.fixed} 个节点`);
        }
      }
    }

    if (opsFixed > 0) {
      console.log(`✅ 修复了 ${opsFixed} 个 operation 中的节点 ID`);
    }

    console.log('\n✅ 全部完成！刷新编辑器页面即可生效。');

  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
