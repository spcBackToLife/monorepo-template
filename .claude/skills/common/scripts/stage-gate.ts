#!/usr/bin/env ts-node
/**
 * stage-gate.ts — 阶段门禁校验
 *
 * 用法:
 *   npx ts-node scripts/stage-gate.ts \
 *     --registry <registry-root> \
 *     --workspace <workspace-root> \
 *     --stage product|interaction|design|implementation \
 *     --mode entry|exit
 *
 * 语义:
 *   --mode entry: 进入该 stage 的前置条件 (= 上一 stage 的 exit)
 *   --mode exit:  该 stage 完成的验收条件
 *
 * 退出码:
 *   0: 全部通过
 *   1: 有一项以上 ❌（缺关键产物）
 *   2: 仅 ⚠️（建议修复但不阻断）
 *
 * 设计要点:
 *   - 一票否决: 任何 ❌ 都会 exit 1，AI/CI 看到非零退出必须停下来修
 *   - 输出对人友好: 每条检查都有具体的修复指引
 *   - 与 validate.ts 互补: validate 检查节点级一致性，本脚本检查阶段级完整性
 */

import * as fs from 'fs';
import * as path from 'path';

type Stage = 'product' | 'interaction' | 'design' | 'implementation';
type Mode = 'entry' | 'exit';
type Severity = '✅' | '❌' | '⚠️';

interface CheckResult {
  severity: Severity;
  rule: string;
  detail?: string;
  fix?: string;
}

// ---------- 工具 ----------

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function findJsonFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'scripts') {
      out.push(...findJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function listPageDirs(registry: string): string[] {
  const pagesDir = path.join(registry, 'pages');
  if (!fs.existsSync(pagesDir)) return [];
  return fs
    .readdirSync(pagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function refExists(workspace: string, ref: unknown): boolean {
  if (typeof ref !== 'string' || !ref) return false;
  const p = ref.split('#')[0];
  if (!p) return false;
  return fs.existsSync(path.join(workspace, p));
}

function get<T = unknown>(obj: unknown, p: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = p.split('.');
  let cur: unknown = obj;
  for (const key of parts) {
    if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur as T;
}

// ---------- Stage 1: Product Exit ----------

function checkProductExit(registry: string, workspace: string): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. _index.json 必须存在且字段齐全
  const indexPath = path.join(registry, '_index.json');
  const idx = readJson(indexPath);
  if (!idx) {
    results.push({
      severity: '❌',
      rule: 'design-registry/_index.json 必须存在',
      fix: '运行 product-analyst 创建项目级骨架',
    });
    return results;
  }

  const requiredProjectFields: [string, string][] = [
    ['project.name', '项目名'],
    ['project.platform', '平台 (mobile/desktop/web)'],
    ['project.viewport', '视口尺寸'],
    ['project.targetUser.summary', '目标用户摘要'],
    ['project.targetUser.ref', '目标用户 ref → product-analysis md'],
    ['project.styleDirection.summary', '视觉方向摘要'],
    ['project.styleDirection.ref', '视觉方向 ref'],
  ];
  for (const [p, desc] of requiredProjectFields) {
    if (!get(idx, p)) {
      results.push({
        severity: '❌',
        rule: `_index.json 必填: ${p}`,
        detail: desc,
        fix: 'product-analyst Phase 3.2 必须写完整的项目级骨架',
      });
    }
  }
  const scenarios = get<unknown[]>(idx, 'project.coreScenarios');
  if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
    results.push({
      severity: '❌',
      rule: '_index.json: project.coreScenarios[] 至少 1 项',
    });
  }
  const tabBar = get<unknown[]>(idx, 'navigation.tabBar');
  if (!tabBar || !Array.isArray(tabBar) || tabBar.length === 0) {
    results.push({
      severity: '⚠️',
      rule: '_index.json: navigation.tabBar 为空',
      detail: '若产品确无 tab 导航可忽略，否则补充',
    });
  }
  const flows = get<unknown[]>(idx, 'navigation.flows');
  if (!flows || !Array.isArray(flows) || flows.length === 0) {
    results.push({
      severity: '⚠️',
      rule: '_index.json: navigation.flows[] 建议至少 1 条页面流转',
    });
  }
  const modules = get<Record<string, unknown>>(idx, 'modules');
  if (!modules || Object.keys(modules).length === 0) {
    results.push({
      severity: '❌',
      rule: '_index.json: modules{} 至少 1 个模块',
      fix: '把 product-analysis/modules/*.md 全部登记到 modules 字段',
    });
  }

  // 2. pages/_index.json 必须存在且至少 1 页
  const pagesIndexPath = path.join(registry, 'pages', '_index.json');
  const pagesIdx = readJson(pagesIndexPath);
  if (!pagesIdx) {
    results.push({
      severity: '❌',
      rule: 'pages/_index.json 必须存在',
      fix: '把信息架构 md 中的所有页面登记到 pages/_index.json',
    });
    return results;
  }
  const pages = (pagesIdx['pages'] as Array<Record<string, unknown>>) || [];
  if (pages.length === 0) {
    results.push({ severity: '❌', rule: 'pages/_index.json: pages[] 为空' });
    return results;
  }

  // 3. 每个 page 必须有对应目录 + _page.json + product 层
  for (const p of pages) {
    const pid = p['id'] as string;
    if (!pid) {
      results.push({ severity: '❌', rule: 'pages/_index.json 某项缺 id' });
      continue;
    }
    const pageJsonPath = path.join(registry, 'pages', pid, '_page.json');
    const pageJson = readJson(pageJsonPath);
    if (!pageJson) {
      results.push({
        severity: '❌',
        rule: `pages/${pid}/_page.json 缺失`,
        fix: '为 pages/_index.json 中每个页面创建 _page.json',
      });
      continue;
    }

    const product = pageJson['product'] as Record<string, unknown> | undefined;
    if (!product) {
      results.push({
        severity: '❌',
        rule: `pages/${pid}/_page.json: 缺 product 层`,
      });
      continue;
    }
    // 必填强约束（缺则 ❌）
    for (const f of ['summary', 'ref', 'rules']) {
      const v = product[f];
      const empty =
        v == null ||
        (typeof v === 'string' && v.trim() === '') ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        results.push({
          severity: '❌',
          rule: `pages/${pid}/_page.json: product.${f} 缺失/为空`,
          fix:
            f === 'summary'
              ? '一句话页面定位'
              : f === 'ref'
              ? '指向产品分析模块 md（如 product-analysis/modules/xx.md#章节）'
              : '关键业务规则数组（不可为空，业务规则是产品的灵魂）',
        });
      }
    }
    // 软约束（缺则 ⚠️：系统页/工具页可能没有所属业务模块）
    if (!product['fromModules'] || (Array.isArray(product['fromModules']) && (product['fromModules'] as unknown[]).length === 0)) {
      results.push({
        severity: '⚠️',
        rule: `pages/${pid}/_page.json: product.fromModules 为空`,
        detail: '系统页（splash/onboarding 等）可空；业务页必须填，否则说明漏了模块归属',
      });
    }

    // ref 文件存在性
    if (typeof product['ref'] === 'string' && !refExists(workspace, product['ref'])) {
      results.push({
        severity: '⚠️',
        rule: `pages/${pid}/_page.json: product.ref 文件不存在`,
        detail: product['ref'] as string,
      });
    }
  }

  // 4. 全局 ref 文件存在性
  for (const refPath of [
    'project.targetUser.ref',
    'project.styleDirection.ref',
    'navigation.ref',
    'globalState.ref',
  ]) {
    const v = get<string>(idx, refPath);
    if (typeof v === 'string' && !refExists(workspace, v)) {
      results.push({
        severity: '⚠️',
        rule: `_index.json: ${refPath} 指向的文件不存在`,
        detail: v,
      });
    }
  }
  if (modules) {
    for (const [mid, m] of Object.entries(modules)) {
      const r = (m as Record<string, unknown>)['ref'] as string | undefined;
      if (r && !refExists(workspace, r)) {
        results.push({
          severity: '⚠️',
          rule: `_index.json modules.${mid}.ref 文件不存在`,
          detail: r,
        });
      }
    }
  }

  return results;
}

// ---------- Stage 2: Interaction Exit ----------

function checkInteractionExit(registry: string, workspace: string): CheckResult[] {
  const results: CheckResult[] = [];

  // 必须先通过 product exit
  const productResults = checkProductExit(registry, workspace);
  if (productResults.some((r) => r.severity === '❌')) {
    results.push({
      severity: '❌',
      rule: '上游 product stage 未通过',
      fix: '先跑 stage-gate --stage product --mode exit 修完所有 ❌',
    });
    return results;
  }

  const pageDirs = listPageDirs(registry);
  for (const pid of pageDirs) {
    const pageJsonPath = path.join(registry, 'pages', pid, '_page.json');
    const pageJson = readJson(pageJsonPath);
    if (!pageJson) continue;

    const interaction = pageJson['interaction'] as Record<string, unknown> | undefined;
    if (!interaction) {
      results.push({
        severity: '❌',
        rule: `pages/${pid}/_page.json: 缺 interaction 层`,
        fix: `interaction-designer 必须写入 interaction 层（summary/ref/states/operations）`,
      });
      continue;
    }

    // interaction 层四个必填字段
    for (const f of ['summary', 'ref', 'states', 'operations']) {
      const v = interaction[f];
      const empty =
        v == null ||
        (typeof v === 'string' && v.trim() === '') ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        results.push({
          severity: '❌',
          rule: `pages/${pid}/_page.json: interaction.${f} 缺失/为空`,
        });
      }
    }

    // ref 文件存在性
    if (typeof interaction['ref'] === 'string' && !refExists(workspace, interaction['ref'])) {
      results.push({
        severity: '⚠️',
        rule: `pages/${pid}/_page.json: interaction.ref 文件不存在`,
        detail: interaction['ref'] as string,
      });
    }

    // operations 必须是结构化对象数组（不能是字符串）
    const ops = interaction['operations'];
    if (Array.isArray(ops)) {
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        if (typeof op === 'string') {
          results.push({
            severity: '❌',
            rule: `pages/${pid}/_page.json: interaction.operations[${i}] 是字符串而非对象`,
            detail: `value: ${op}`,
            fix: `应为 { "op": "...", "triggerNodePath": "<block>/<element>" }，triggerNodePath 必须对应到真实节点文件`,
          });
        } else if (op && typeof op === 'object') {
          const triggerPath = (op as Record<string, unknown>)['triggerNodePath'];
          if (!triggerPath || typeof triggerPath !== 'string') {
            results.push({
              severity: '❌',
              rule: `pages/${pid}/_page.json: interaction.operations[${i}] 缺 triggerNodePath`,
            });
          } else {
            // 校验节点存在
            const lastSeg = path.basename(triggerPath as string);
            const fp = lastSeg.startsWith('_')
              ? path.join(registry, 'pages', pid, path.dirname(triggerPath as string), `${lastSeg}.json`)
              : path.join(registry, 'pages', pid, `${triggerPath}.json`);
            if (!fs.existsSync(fp)) {
              results.push({
                severity: '❌',
                rule: `pages/${pid}: operation 引用的节点文件不存在`,
                detail: `triggerNodePath: ${triggerPath}`,
                fix: `运行 create-node.ts 创建该节点骨架（写 interaction 层）`,
              });
            }
          }
        }
      }
    }

    // 关键: 至少要有一个子节点（不能只有 _page.json）
    const subFiles = findJsonFiles(path.join(registry, 'pages', pid)).filter(
      (f) => path.basename(f) !== '_page.json' && path.basename(f) !== '_materials.json',
    );
    if (subFiles.length === 0) {
      results.push({
        severity: '❌',
        rule: `pages/${pid}/: 没有任何子节点文件`,
        fix: `interaction-designer 必须根据 interaction-design md 「操作清单」逐行 create-node.ts 创建触发元素与状态节点`,
      });
    }
  }

  // 校验所有节点文件: 有 trigger 必有 flows（success/error 至少一项）
  const allNodes = findJsonFiles(path.join(registry, 'pages'));
  for (const file of allNodes) {
    const bn = path.basename(file);
    if (bn === '_index.json' || bn === '_materials.json' || bn === '_page.json') continue;
    const data = readJson(file);
    if (!data) continue;
    const ix = data['interaction'] as Record<string, unknown> | undefined;
    if (!ix) continue;
    if (ix['trigger']) {
      const flows = ix['flows'] as Record<string, unknown> | undefined;
      if (!flows || (!flows['success'] && !flows['error'])) {
        const rel = path.relative(registry, file);
        results.push({
          severity: '⚠️',
          rule: `${rel}: 有 interaction.trigger 但缺 flows.success/error`,
        });
      }
    }
  }

  return results;
}

// ---------- Stage 3: Design Exit ----------

function checkDesignExit(registry: string, workspace: string): CheckResult[] {
  const results: CheckResult[] = [];

  // 上游门禁
  const upstream = checkInteractionExit(registry, workspace);
  if (upstream.some((r) => r.severity === '❌')) {
    results.push({
      severity: '❌',
      rule: '上游 interaction stage 未通过',
      fix: '先跑 stage-gate --stage interaction --mode exit 修完所有 ❌',
    });
    return results;
  }

  // design-system.md 必须存在
  const dsPath = path.join(workspace, 'design-plan', 'design-system.md');
  if (!fs.existsSync(dsPath)) {
    results.push({
      severity: '❌',
      rule: 'design-plan/design-system.md 缺失',
      fix: 'design-planner Phase 1 产出',
    });
  }

  const pageDirs = listPageDirs(registry);
  for (const pid of pageDirs) {
    // 每页必须有 visual.md 和 index.md
    const visualMd = path.join(workspace, 'design-plan', 'pages', pid, 'visual.md');
    const indexMd = path.join(workspace, 'design-plan', 'pages', pid, 'index.md');
    if (!fs.existsSync(visualMd)) {
      results.push({
        severity: '❌',
        rule: `design-plan/pages/${pid}/visual.md 缺失`,
        fix: '视觉先行红线：必须先于 index.md',
      });
    }
    if (!fs.existsSync(indexMd)) {
      results.push({ severity: '❌', rule: `design-plan/pages/${pid}/index.md 缺失` });
    }

    // 节点级 design 层覆盖
    const allNodes = findJsonFiles(path.join(registry, 'pages', pid));
    for (const file of allNodes) {
      const bn = path.basename(file);
      if (bn === '_materials.json') continue;
      const data = readJson(file);
      if (!data) continue;
      const interaction = data['interaction'] as Record<string, unknown> | undefined;
      const design = data['design'] as Record<string, unknown> | undefined;
      const rel = path.relative(registry, file);

      if (interaction && !design) {
        results.push({
          severity: '❌',
          rule: `${rel}: 有 interaction 缺 design`,
          fix: 'design-planner 用 write-node.ts --layer design 追加',
        });
        continue;
      }
      if (design) {
        for (const f of ['summary', 'ref']) {
          if (!design[f]) {
            results.push({ severity: '❌', rule: `${rel}: design.${f} 缺失` });
          }
        }
        if (typeof design['ref'] === 'string' && !refExists(workspace, design['ref'])) {
          results.push({
            severity: '⚠️',
            rule: `${rel}: design.ref 文件不存在`,
            detail: design['ref'] as string,
          });
        }
        // 多状态必有 visualStates
        const states = interaction?.['states'] as string[] | undefined;
        if (states && states.length > 1 && !design['visualStates']) {
          results.push({
            severity: '⚠️',
            rule: `${rel}: 有多状态但缺 design.visualStates`,
          });
        }
      }
    }

    // _materials.json 中每个素材都要有 .md
    const matsPath = path.join(registry, 'pages', pid, '_materials.json');
    const mats = readJson(matsPath);
    if (mats && Array.isArray(mats['materials'])) {
      for (const m of mats['materials'] as Array<Record<string, unknown>>) {
        const r = m['ref'] as string | undefined;
        if (!r) {
          results.push({
            severity: '❌',
            rule: `pages/${pid}/_materials.json: 素材 ${m['id']} 缺 ref`,
          });
        } else if (!refExists(workspace, r)) {
          results.push({
            severity: '❌',
            rule: `pages/${pid}/_materials.json: 素材 ${m['id']} 的 md 不存在`,
            detail: r,
            fix: `创建 ${r}`,
          });
        }
      }
    }
  }

  return results;
}

// ---------- Stage 4: Implementation Exit ----------

function checkImplementationExit(registry: string, workspace: string): CheckResult[] {
  const results: CheckResult[] = [];

  const upstream = checkDesignExit(registry, workspace);
  if (upstream.some((r) => r.severity === '❌')) {
    results.push({
      severity: '❌',
      rule: '上游 design stage 未通过',
      fix: '先跑 stage-gate --stage design --mode exit',
    });
    return results;
  }

  const allNodes = findJsonFiles(path.join(registry, 'pages'));
  for (const file of allNodes) {
    const bn = path.basename(file);
    if (bn === '_index.json' || bn === '_materials.json') continue;
    const data = readJson(file);
    if (!data) continue;
    const impl = data['implementation'] as Record<string, unknown> | undefined;
    const rel = path.relative(registry, file);
    if (!impl || impl['status'] !== 'completed') {
      results.push({
        severity: '❌',
        rule: `${rel}: implementation.status !== completed`,
      });
      continue;
    }
    const cl = impl['checklist'] as Record<string, boolean> | undefined;
    if (cl) {
      const missing = Object.entries(cl)
        .filter(([, v]) => v === false)
        .map(([k]) => k);
      if (missing.length > 0) {
        results.push({
          severity: '❌',
          rule: `${rel}: checklist 未通过: ${missing.join(', ')}`,
        });
      }
    }
  }
  return results;
}

// ---------- 入口 ----------

function parseArgs(argv: string[]): {
  registry: string;
  workspace: string;
  stage: Stage;
  mode: Mode;
} {
  let registry = '';
  let workspace = '';
  let stage: Stage = 'product';
  let mode: Mode = 'exit';
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--registry':
        registry = argv[++i];
        break;
      case '--workspace':
        workspace = argv[++i];
        break;
      case '--stage':
        stage = argv[++i] as Stage;
        break;
      case '--mode':
        mode = argv[++i] as Mode;
        break;
    }
  }

  if (!registry) {
    console.error('❌ 必须指定 --registry');
    process.exit(1);
  }
  if (!workspace) {
    workspace = path.resolve(registry, '..');
  }
  const validStages: Stage[] = ['product', 'interaction', 'design', 'implementation'];
  if (!validStages.includes(stage)) {
    console.error(`❌ --stage 必须是 ${validStages.join('|')}`);
    process.exit(1);
  }
  if (mode !== 'entry' && mode !== 'exit') {
    console.error('❌ --mode 必须是 entry|exit');
    process.exit(1);
  }
  return { registry, workspace, stage, mode };
}

function main() {
  const { registry, workspace, stage, mode } = parseArgs(process.argv);

  // entry mode 等价于上一 stage 的 exit
  let effectiveStage: Stage = stage;
  let effectiveMode: Mode = mode;
  if (mode === 'entry') {
    const upstream: Record<Stage, Stage | null> = {
      product: null,
      interaction: 'product',
      design: 'interaction',
      implementation: 'design',
    };
    const prev = upstream[stage];
    if (prev === null) {
      console.log(`✅ ${stage} 是起点阶段，无 entry gate 需要校验。`);
      process.exit(0);
    }
    effectiveStage = prev;
    effectiveMode = 'exit';
  }

  let results: CheckResult[];
  switch (effectiveStage) {
    case 'product':
      results = checkProductExit(registry, workspace);
      break;
    case 'interaction':
      results = checkInteractionExit(registry, workspace);
      break;
    case 'design':
      results = checkDesignExit(registry, workspace);
      break;
    case 'implementation':
      results = checkImplementationExit(registry, workspace);
      break;
  }

  console.log(`\n═══ Stage Gate: ${stage} (${mode} → ${effectiveStage} exit) ═══\n`);

  const errors = results.filter((r) => r.severity === '❌');
  const warnings = results.filter((r) => r.severity === '⚠️');

  if (results.length === 0) {
    console.log('✅ 全部通过！可以进入下一阶段。');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`❌ 阻断项 (${errors.length}):\n`);
    for (const r of errors) {
      console.log(`  ❌ ${r.rule}`);
      if (r.detail) console.log(`     详情: ${r.detail}`);
      if (r.fix) console.log(`     修复: ${r.fix}`);
      console.log('');
    }
  }
  if (warnings.length > 0) {
    console.log(`⚠️  警告项 (${warnings.length}):\n`);
    for (const r of warnings) {
      console.log(`  ⚠️  ${r.rule}`);
      if (r.detail) console.log(`     详情: ${r.detail}`);
      if (r.fix) console.log(`     建议: ${r.fix}`);
      console.log('');
    }
  }

  console.log(
    `统计: ${errors.length} 个 ❌ 阻断 + ${warnings.length} 个 ⚠️ 警告`,
  );

  if (errors.length > 0) {
    console.log(`\n→ 不允许进入下一阶段。请修复 ❌ 后重新运行本脚本。`);
    process.exit(1);
  }
  console.log(`\n→ 无阻断项，可以进入下一阶段（建议同时修复 ⚠️）。`);
  process.exit(2);
}

main();
