#!/usr/bin/env ts-node
/**
 * create-node.ts — 在 design-registry 中创建新的节点文件
 *
 * 用法:
 *   npx ts-node scripts/create-node.ts \
 *     --registry <registry-root> \
 *     --path pages/<page>/<block>/<element> \
 *     --data '{ "id": "...", "type": "element", ... }'
 *
 * 规则:
 *   - 如果路径中间的目录不存在，自动创建
 *   - 如果目标文件已存在，报错退出（不覆盖）
 *   - data 必须是合法 JSON
 *   - 自动补充 implementation 字段（如未提供）
 */

import * as fs from 'fs';
import * as path from 'path';

interface NodeData {
  id: string;
  type: 'page' | 'block' | 'element' | 'component';
  name: string;
  product?: Record<string, unknown>;
  interaction?: Record<string, unknown>;
  design?: Record<string, unknown>;
  logic?: Record<string, unknown>;
  extremeCases?: Array<Record<string, unknown>>;
  content?: Record<string, unknown>;
  materials?: Array<Record<string, unknown>> | null;
  implementation?: Record<string, unknown>;
  [key: string]: unknown;
}

function parseArgs(argv: string[]): { registry: string; nodePath: string; data: string } {
  let registry = '';
  let nodePath = '';
  let data = '';

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--registry':
        registry = argv[++i];
        break;
      case '--path':
        nodePath = argv[++i];
        break;
      case '--data':
        data = argv[++i];
        break;
    }
  }

  if (!registry) {
    // 默认查找当前目录下的 design-registry
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, 'design-registry'),
      // 向上查找 .design-workspaces/*/design-registry
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        registry = c;
        break;
      }
    }
    if (!registry) {
      console.error('❌ 找不到 design-registry 目录，请使用 --registry 指定');
      process.exit(1);
    }
  }

  if (!nodePath) {
    console.error('❌ 必须指定 --path（如 pages/02-publish-moment/nav-bar/publish-btn）');
    process.exit(1);
  }

  if (!data) {
    console.error('❌ 必须指定 --data（JSON 字符串）');
    process.exit(1);
  }

  return { registry, nodePath, data };
}

function main() {
  const { registry, nodePath, data } = parseArgs(process.argv);

  // 解析 JSON
  let nodeData: NodeData;
  try {
    nodeData = JSON.parse(data);
  } catch (err) {
    console.error('❌ --data 不是合法 JSON:', (err as Error).message);
    process.exit(1);
  }

  // 验证必填字段
  if (!nodeData.id || !nodeData.type || !nodeData.name) {
    console.error('❌ 节点数据必须包含 id, type, name 字段');
    process.exit(1);
  }

  // 自动补充 implementation（如未提供）
  if (!nodeData.implementation) {
    nodeData.implementation = {
      nodeId: null,
      status: 'pending',
    };
  }

  // 确定文件路径
  // 如果路径以 _block 结尾 → 写入 _block.json
  // 如果路径以 _page 结尾 → 写入 _page.json
  // 否则 → 写入 <last-segment>.json
  let filePath: string;
  const lastSegment = path.basename(nodePath);

  if (lastSegment.startsWith('_')) {
    // _block, _page 等特殊文件
    const dirPath = path.join(registry, path.dirname(nodePath));
    filePath = path.join(dirPath, `${lastSegment}.json`);
  } else {
    // 普通节点文件
    filePath = path.join(registry, `${nodePath}.json`);
  }

  // 检查是否已存在
  if (fs.existsSync(filePath)) {
    console.error(`❌ 文件已存在: ${filePath}`);
    console.error('   如需更新请使用 write-node.ts');
    process.exit(1);
  }

  // 创建目录
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  // 写入文件
  const content = JSON.stringify(nodeData, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`✅ 创建节点: ${path.relative(registry, filePath)}`);
  console.log(`   ID: ${nodeData.id}`);
  console.log(`   Type: ${nodeData.type}`);
  console.log(`   Name: ${nodeData.name}`);
}

main();
