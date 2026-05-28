#!/usr/bin/env ts-node
/**
 * plan-gen.ts — 生成节点级 PLAN.md
 *
 * 用法:
 *   npx ts-node scripts/plan-gen.ts \
 *     --registry <registry-root> \
 *     --workspace <workspace-root> \
 *     --stage design [--page <id>]
 *
 * 设计要点:
 *   - 输出 design-plan/PLAN.md（设计阶段）或 interaction-design/PLAN.md（交互阶段）
 *   - 按"页面 → 节点 → 素材"分组，每行一个 markdown checkbox
 *   - 已存在 PLAN.md 时智能合并：保留已打勾的项（识别相同 path），追加新增项
 *   - AI 每完成一项必须打勾（编辑 PLAN.md 把 [ ] 改成 [x]）
 *
 * 与 stage-gate.ts 的关系:
 *   - stage-gate 是"全局完成度校验"，plan-gen 是"逐项任务清单"
 *   - 工作流: stage-gate 入门 → plan-gen 出清单 → 逐项做 + 打勾 → stage-gate 出门
 */

import * as fs from 'fs';
import * as path from 'path';

type Stage = 'interaction' | 'design';

interface TaskRow {
  path: string;
  desc: string;
  hint?: string;
}

function parseArgs(argv: string[]): {
  registry: string;
  workspace: string;
  stage: Stage;
  page: string;
} {
  let registry = '';
  let workspace = '';
  let stage: Stage = 'design';
  let page = '';
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
      case '--page':
        page = argv[++i];
        break;
    }
  }
  if (!registry) {
    console.error('❌ 必须指定 --registry');
    process.exit(1);
  }
  if (!workspace) workspace = path.resolve(registry, '..');
  if (stage !== 'interaction' && stage !== 'design') {
    console.error('❌ --stage 仅支持 interaction|design');
    process.exit(1);
  }
  return { registry, workspace, stage, page };
}

function readJson(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function findJsonFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJsonFiles(f));
    else if (e.isFile() && e.name.endsWith('.json')) out.push(f);
  }
  return out;
}

// ---------- 任务收集 ----------

interface PagePlan {
  id: string;
  name: string;
  pre: TaskRow[];     // 视觉/系统先行
  nodes: TaskRow[];   // 节点级任务
  materials: TaskRow[];
  post: TaskRow[];    // 汇总/校验
}

function collectInteractionPlan(registry: string, pageIds: string[]): PagePlan[] {
  const plans: PagePlan[] = [];
  for (const pid of pageIds) {
    const pageJson = readJson(path.join(registry, 'pages', pid, '_page.json'));
    if (!pageJson) continue;
    const name = (pageJson['name'] as string) || pid;
    const product = pageJson['product'] as Record<string, unknown> | undefined;
    if (!product) continue;

    const plan: PagePlan = { id: pid, name, pre: [], nodes: [], materials: [], post: [] };

    plan.pre.push({
      path: `interaction-design/pages/${pid}.md`,
      desc: '写交互规格 md（状态机/操作清单/加载/错误/边界）',
    });

    plan.pre.push({
      path: `pages/${pid}/_page.json#interaction`,
      desc: 'write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）',
      hint: 'operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组',
    });

    plan.nodes.push({
      path: `pages/${pid}/<component>/<element>.json`,
      desc: '从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）',
      hint: '每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录',
    });

    plan.post.push({
      path: `stage-gate.ts --stage interaction --mode exit`,
      desc: '运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段',
    });
    plans.push(plan);
  }
  return plans;
}

/**
 * 组件占用索引：组件名 → 出现在哪些页面（按 PageId 排序）
 * 用于：
 *   1. 跨页面同名 ≥2 次 → 视为通用组件，深钻任务只挂在首次出现页面；后续页面挂"引用核对"轻任务
 *   2. 单页出现 → 任务挂在当前页面（路径按 SKILL「三步走」由 AI 判定通用/专属）
 */
interface ComponentOccurrence {
  name: string;
  pages: string[];      // 已按 pageIds 顺序排序
  firstPage: string;
}

function buildComponentIndex(registry: string, pageIds: string[]): Map<string, ComponentOccurrence> {
  const map = new Map<string, ComponentOccurrence>();
  for (const pid of pageIds) {
    const pageDir = path.join(registry, 'pages', pid);
    if (!fs.existsSync(pageDir)) continue;
    const allFiles = findJsonFiles(pageDir);
    for (const file of allFiles) {
      if (path.basename(file) !== '_component.json') continue;
      const name = path.basename(path.dirname(file));
      if (!map.has(name)) {
        map.set(name, { name, pages: [], firstPage: pid });
      }
      const occ = map.get(name)!;
      if (!occ.pages.includes(pid)) occ.pages.push(pid);
    }
  }
  return map;
}

function collectDesignPlan(registry: string, workspace: string, pageIds: string[]): PagePlan[] {
  const plans: PagePlan[] = [];

  // ★ 先全局构建组件索引（跨页面统计）
  const componentIndex = buildComponentIndex(registry, pageIds);

  for (const pid of pageIds) {
    const pageJson = readJson(path.join(registry, 'pages', pid, '_page.json'));
    if (!pageJson) continue;
    const name = (pageJson['name'] as string) || pid;
    const interaction = pageJson['interaction'] as Record<string, unknown> | undefined;
    if (!interaction) continue;

    const plan: PagePlan = { id: pid, name, pre: [], nodes: [], materials: [], post: [] };

    // 视觉先行
    plan.pre.push({
      path: `design-plan/pages/${pid}/visual.md`,
      desc: '★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）',
      hint: '必须先于 index.md 与所有组件/素材文档',
    });

    // 节点级任务（按目录深度排序）
    const allNodes = findJsonFiles(path.join(registry, 'pages', pid));
    const items = allNodes
      .map((file) => {
        const data = readJson(file);
        if (!data) return null;
        const bn = path.basename(file);
        if (bn === '_materials.json') return null;
        const rel = path.relative(path.join(registry, 'pages'), file);
        const depth = rel.split(path.sep).length;
        return { file, data, rel, depth, bn };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.depth - b.depth || a.rel.localeCompare(b.rel));

    for (const it of items) {
      const interaction = it.data['interaction'] as Record<string, unknown> | undefined;
      const design = it.data['design'] as Record<string, unknown> | undefined;
      if (design) continue; // 已完成跳过
      if (!interaction && it.bn !== '_page.json') continue;

      const refRel = it.rel.replace(/\.json$/, '');

      if (it.bn === '_page.json') {
        plan.nodes.push({
          path: `pages/${pid}/_page.json#design`,
          desc: `页面级 design 层 + 写 design-plan/pages/${pid}/index.md`,
          hint: 'index.md 必须最后写，是对所有组件/素材的汇总+节点结构树',
        });
      } else if (it.bn === '_component.json') {
        const compName = path.basename(path.dirname(it.rel));
        const occ = componentIndex.get(compName);
        const reusedCount = occ ? occ.pages.length : 1;

        if (reusedCount >= 2 && occ && occ.firstPage !== pid) {
          // 跨页面复用 + 非首次出现 → 引用核对轻任务
          plan.nodes.push({
            path: `pages/${pid}/${refRel}#design`,
            desc: `${compName}: 引用核对（首次深钻在 ${occ.firstPage}）→ write-node.ts 追加 design 层`,
            hint: `核对 design-plan/components/${compName}/ 是否已覆盖本页面所需 variant；缺则补到组件文档并标注引用页面`,
          });
        } else {
          // 首次出现或单页出现 → 完整深钻任务
          const statHint =
            reusedCount >= 2
              ? `跨页面同名出现 ${reusedCount} 次：${occ!.pages.join(', ')} → 倾向通用组件 (design-plan/components/${compName}/)`
              : `仅本页面出现 → 按 SKILL「组件文档放哪？三步走」判定路径（通用/专属）`;
          plan.nodes.push({
            path: `pages/${pid}/${refRel}#design`,
            desc: `${compName}: 写独立 visual.md + .md → write-node.ts 追加 design 层`,
            hint: `${statHint}；visual.md 必须先于结构文档`,
          });
        }
      } else {
        plan.nodes.push({
          path: `pages/${pid}/${refRel}#design`,
          desc: `[元素] ${it.data['name']}: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）`,
        });
      }
    }

    // 素材：从已写的 _materials.json 中读出素材清单
    const matsJson = readJson(path.join(registry, 'pages', pid, '_materials.json'));
    if (matsJson && Array.isArray(matsJson['materials'])) {
      for (const m of matsJson['materials'] as Array<Record<string, unknown>>) {
        const mid = m['id'] as string;
        const mname = m['name'] as string;
        plan.materials.push({
          path: `design-plan/pages/${pid}/materials/${mid}-${mname}.md`,
          desc: `[素材] ${mid} ${mname}: 6 节模板（意图/风格/构图/变体/应用/绘制）`,
        });
      }
    } else {
      plan.materials.push({
        path: `pages/${pid}/_materials.json`,
        desc: '从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md',
      });
    }

    // 收尾
    plan.post.push({
      path: `design-plan/pages/${pid}/index.md`,
      desc: '汇总：写页面 index.md（组件清单 + 素材清单 + 节点结构树，引用前面已写的组件/素材，不再发明新东西）',
      hint: '必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）',
    });
    plan.post.push({
      path: `validate.ts --page ${pid}`,
      desc: '运行节点完整性校验',
    });
    plan.post.push({
      path: `stage-gate.ts --stage design --mode exit (整体)`,
      desc: '所有页面完成后运行设计阶段出门校验',
    });

    plans.push(plan);
  }
  return plans;
}

// ---------- 渲染 PLAN.md ----------

interface ExistingChecks {
  // path -> isChecked
  [key: string]: boolean;
}

function parseExistingPlan(content: string): ExistingChecks {
  const map: ExistingChecks = {};
  // 形如: - [x] `<path>` — desc  或  - [ ] `<path>`
  const re = /^\s*-\s*\[([ xX])\]\s*`([^`]+)`/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const checked = m[1].toLowerCase() === 'x';
    map[m[2]] = checked;
  }
  return map;
}

/**
 * 文件存在性校正：path 指向具体 .md / .json 文件时，
 * 若文件已不存在，则强制把打勾状态降为未完成（防止 AI 误以为已完成而跳过）。
 * 仅校正"产物文件"类任务（路径形如 design-plan/.../*.md 或 pages/.../*.json）；
 * 节点设计层任务（path 形如 `pages/<x>/...#design`）不在此校正范围。
 */
function reconcileExistingWithFs(
  existing: ExistingChecks,
  workspace: string,
  registry: string,
): void {
  for (const p of Object.keys(existing)) {
    if (!existing[p]) continue; // 只校正已打勾项
    let absPath: string | null = null;
    if (p.startsWith('design-plan/') && p.endsWith('.md')) {
      absPath = path.join(workspace, p);
    } else if (p.startsWith('pages/') && p.endsWith('.json')) {
      absPath = path.join(registry, p);
    }
    if (absPath && !fs.existsSync(absPath)) {
      existing[p] = false; // 文件已删 → 视为未完成
    }
  }
}

function renderRow(t: TaskRow, existing: ExistingChecks): string {
  const checked = existing[t.path] ? 'x' : ' ';
  let line = `- [${checked}] \`${t.path}\` — ${t.desc}`;
  if (t.hint) line += `\n      ↳ ${t.hint}`;
  return line;
}

function renderPlan(stage: Stage, plans: PagePlan[], existing: ExistingChecks): string {
  const lines: string[] = [];
  const stageName = stage === 'interaction' ? '交互设计' : '设计规划';
  lines.push(`# ${stageName} · 任务清单（PLAN）`);
  lines.push('');
  lines.push(`> 由 \`plan-gen.ts\` 自动生成。每完成一项必须把 \`[ ]\` 改成 \`[x]\`。`);
  lines.push(`> 重新运行 \`plan-gen.ts\` 会保留已打勾的项，并追加新出现的任务。`);
  lines.push('');

  // 总进度
  const allTasks = plans.flatMap((p) => [...p.pre, ...p.nodes, ...p.materials, ...p.post]);
  const done = allTasks.filter((t) => existing[t.path]).length;
  lines.push(`**总进度**: ${done}/${allTasks.length} (${allTasks.length > 0 ? Math.round((done / allTasks.length) * 100) : 0}%)`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const plan of plans) {
    const all = [...plan.pre, ...plan.nodes, ...plan.materials, ...plan.post];
    const pageDone = all.filter((t) => existing[t.path]).length;
    const icon = pageDone === all.length && all.length > 0 ? '✅' : pageDone > 0 ? '🔄' : '⬜';
    lines.push(`## ${icon} ${plan.id} · ${plan.name}  (${pageDone}/${all.length})`);
    lines.push('');

    if (plan.pre.length > 0) {
      lines.push('### 视觉先行');
      lines.push('');
      for (const t of plan.pre) lines.push(renderRow(t, existing));
      lines.push('');
    }
    if (plan.nodes.length > 0) {
      lines.push('### 组件深钻 + 节点级任务（按目录深度排序，父先于子）');
      lines.push('');
      for (const t of plan.nodes) lines.push(renderRow(t, existing));
      lines.push('');
    }
    if (plan.materials.length > 0) {
      lines.push('### 素材');
      lines.push('');
      for (const t of plan.materials) lines.push(renderRow(t, existing));
      lines.push('');
    }
    if (plan.post.length > 0) {
      lines.push('### 收尾');
      lines.push('');
      for (const t of plan.post) lines.push(renderRow(t, existing));
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------- 主流程 ----------

function main() {
  const { registry, workspace, stage, page } = parseArgs(process.argv);

  // 收集页面
  const pagesIdx = readJson(path.join(registry, 'pages', '_index.json'));
  if (!pagesIdx) {
    console.error('❌ pages/_index.json 不存在，请先完成 product 阶段');
    process.exit(1);
  }
  let pageIds = ((pagesIdx['pages'] as Array<Record<string, unknown>>) || []).map(
    (p) => p['id'] as string,
  );
  if (page) pageIds = pageIds.filter((id) => id === page);

  // 选择产物路径
  const planPath =
    stage === 'interaction'
      ? path.join(workspace, 'interaction-design', 'PLAN.md')
      : path.join(workspace, 'design-plan', 'PLAN.md');

  // 读已有 PLAN.md（合并打勾状态）
  let existing: ExistingChecks = {};
  if (fs.existsSync(planPath)) {
    const old = fs.readFileSync(planPath, 'utf-8');
    existing = parseExistingPlan(old);
    reconcileExistingWithFs(existing, workspace, registry);
  }

  // 生成任务
  const plans =
    stage === 'interaction'
      ? collectInteractionPlan(registry, pageIds)
      : collectDesignPlan(registry, workspace, pageIds);

  const content = renderPlan(stage, plans, existing);

  // 写入
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, content, 'utf-8');

  const total = plans.flatMap((p) => [...p.pre, ...p.nodes, ...p.materials, ...p.post]).length;
  const done = Object.values(existing).filter((v) => v).length;

  console.log(`\n✅ 已生成: ${path.relative(workspace, planPath)}`);
  console.log(`   阶段: ${stage}`);
  console.log(`   页面: ${plans.length} 个`);
  console.log(`   任务: ${total} 项 (已完成 ${done})`);
  if (page) console.log(`   过滤: --page ${page}`);
}

main();
