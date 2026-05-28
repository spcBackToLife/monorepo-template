#!/usr/bin/env ts-node
/**
 * write-node.ts — 安全追加/更新节点文件的某个层或字段
 *
 * 用法:
 *   # 追加整层
 *   npx ts-node scripts/write-node.ts \
 *     --registry <registry-root> \
 *     --path pages/<page>/<block>/<element> \
 *     --layer interaction \
 *     --data '{ "summary": "...", "ref": "...", "states": [...] }'
 *
 *   # 更新单个字段
 *   npx ts-node scripts/write-node.ts \
 *     --registry <registry-root> \
 *     --path pages/<page>/_page \
 *     --field status \
 *     --value ready
 *
 *   # 追加到数组型层（如 _materials.json）
 *   npx ts-node scripts/write-node.ts \
 *     --registry <registry-root> \
 *     --path pages/<page>/_materials \
 *     --layer materials \
 *     --data '{ "id": "I-07", "name": "vis-public", ... }' \
 *     --mode append
 *
 * 规则:
 *   - 只更新指定层/字段，其他内容保持不变
 *   - --layer 模式: 整个对象合并到节点的该 key 下
 *   - --field + --value 模式: 设置顶层单个字段
 *   - 文件不存在则报错（应先用 create-node.ts 创建）
 */

import * as fs from 'fs';
import * as path from 'path';

function parseArgs(argv: string[]) {
  let registry = '';
  let nodePath = '';
  let layer = '';
  let data = '';
  let field = '';
  let value = '';
  let mode = 'merge'; // merge | append

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--registry':
        registry = argv[++i];
        break;
      case '--path':
        nodePath = argv[++i];
        break;
      case '--layer':
        layer = argv[++i];
        break;
      case '--data':
        data = argv[++i];
        break;
      case '--field':
        field = argv[++i];
        break;
      case '--value':
        value = argv[++i];
        break;
      case '--mode':
        mode = argv[++i];
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

  if (!nodePath) {
    console.error('❌ 必须指定 --path');
    process.exit(1);
  }

  if (!layer && !field) {
    console.error('❌ 必须指定 --layer 或 --field');
    process.exit(1);
  }

  return { registry, nodePath, layer, data, field, value, mode };
}

function resolveFilePath(registry: string, nodePath: string): string {
  const lastSegment = path.basename(nodePath);
  if (lastSegment.startsWith('_')) {
    return path.join(registry, path.dirname(nodePath), `${lastSegment}.json`);
  }
  return path.join(registry, `${nodePath}.json`);
}

function main() {
  const { registry, nodePath, layer, data, field, value, mode } = parseArgs(process.argv);

  const filePath = resolveFilePath(registry, nodePath);

  // 文件必须存在
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    console.error('   请先使用 create-node.ts 创建节点');
    process.exit(1);
  }

  // 读取现有内容
  const raw = fs.readFileSync(filePath, 'utf-8');
  let nodeData: Record<string, unknown>;
  try {
    nodeData = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ 文件内容不是合法 JSON: ${filePath}`);
    process.exit(1);
  }

  // --field + --value 模式
  if (field) {
    let parsedValue: unknown = value;
    // 尝试解析为 JSON
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // 保持原始字符串
    }
    nodeData[field] = parsedValue;
    console.log(`✅ 更新字段: ${field} = ${JSON.stringify(parsedValue)}`);
  }

  // --layer + --data 模式
  if (layer && data) {
    let layerData: unknown;
    try {
      layerData = JSON.parse(data);
    } catch (err) {
      console.error('❌ --data 不是合法 JSON:', (err as Error).message);
      process.exit(1);
    }

    if (mode === 'append' && Array.isArray(nodeData[layer])) {
      // 追加模式（用于 _materials.json 的 materials 数组）
      (nodeData[layer] as unknown[]).push(layerData);
      console.log(`✅ 追加到 ${layer} 数组（现有 ${(nodeData[layer] as unknown[]).length} 条）`);
    } else if (mode === 'append' && !nodeData[layer]) {
      // 初始化为数组
      nodeData[layer] = [layerData];
      console.log(`✅ 初始化 ${layer} 数组并追加 1 条`);
    } else {
      // 合并模式（整层替换/写入）
      nodeData[layer] = layerData;
      console.log(`✅ 写入层: ${layer}`);
    }
  }

  // 更新时间戳
  nodeData['_updatedAt'] = new Date().toISOString();

  // 写回文件
  const content = JSON.stringify(nodeData, null, 2) + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`   文件: ${path.relative(registry, filePath)}`);
}

main();
