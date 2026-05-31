#!/usr/bin/env bun
/**
 * gen-expression-cheatsheet.ts —— 从 spec.json 派生 expression-language-cheatsheet.md。
 *
 * 单一真相源：features/design-schema/src/expression-lang/spec.json
 * 输出：.claude/skills/common/references/expression-language-cheatsheet.md
 *
 * 用法：
 *   bun run scripts/gen-expression-cheatsheet.ts          # 生成 / 覆盖
 *   bun run scripts/gen-expression-cheatsheet.ts --check  # 检查是否漂移（CI 用，diff 不一致 exit 1）
 *
 * 设计原则：
 *   - 输出文件头部带 AUTO-GENERATED 标记 + 时间戳 + 源文件 hash
 *   - 任何手工编辑此 .md 都会在下次 gen 时被覆盖
 *   - --check 模式让 CI 抓住"AI 改了 cheatsheet 没改 spec"或"改了 spec 没跑 gen"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const SPEC_PATH = resolve(REPO_ROOT, 'features/design-schema/src/expression-lang/spec.json');
const OUTPUT_PATH = resolve(REPO_ROOT, '.claude/skills/common/references/expression-language-cheatsheet.md');

interface Spec {
  version: string;
  name: string;
  description: string;
  syntax: {
    literals: Record<string, { supported: boolean; form?: string; flags?: string[]; values?: string[]; delimiters?: string[] }>;
    operators: { binary: string[]; unary: string[]; ternary: boolean };
    memberAccess: { dot: boolean; bracket: boolean; optionalChain: boolean; _note?: string };
    callForm: { supported: boolean; _note?: string };
    forbidden: string[];
  };
  scope: {
    contextual: Record<string, { type: string; scope: string; description: string; shape?: string }>;
    globals: Record<string, {
      kind: 'namespace';
      callable: boolean;
      callDescription?: string;
      members: Record<string, unknown>;
      description?: string;
    }>;
    builtins: Record<string, Record<string, unknown>>;
    instanceMethods: Record<string, Record<string, unknown>>;
  };
  errorCodes: Record<string, {
    summary: string;
    description: string;
    level: 'error' | 'warning';
    examples?: string[];
    hintTemplate?: string;
    blockedList?: string[];
  }>;
  knownMigrations: Record<string, string>;
}

// ===== 主入口 =====
function main(): void {
  const checkMode = process.argv.includes('--check');

  const specRaw = readFileSync(SPEC_PATH, 'utf-8');
  const spec = JSON.parse(specRaw) as Spec;
  const md = renderCheatsheet(spec, specRaw);

  if (checkMode) {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(`❌ ${OUTPUT_PATH} 不存在；请运行 \`pnpm gen:cheatsheet\``);
      process.exit(1);
    }
    const current = readFileSync(OUTPUT_PATH, 'utf-8');
    if (current.trim() !== md.trim()) {
      console.error(`❌ ${OUTPUT_PATH} 与 spec.json 不一致；请运行 \`pnpm gen:cheatsheet\``);
      process.exit(1);
    }
    console.log(`✅ ${OUTPUT_PATH} 与 spec v${spec.version} 一致`);
    process.exit(0);
  }

  writeFileSync(OUTPUT_PATH, md, 'utf-8');
  console.log(`✅ 已生成 ${OUTPUT_PATH} (spec v${spec.version}, ${md.length} chars)`);
}

// ===== 渲染 =====
function renderCheatsheet(spec: Spec, specRaw: string): string {
  const hash = createHash('sha1').update(specRaw).digest('hex').slice(0, 8);
  const sections: string[] = [];

  // 头部
  sections.push(`<!-- AUTO-GENERATED FROM features/design-schema/src/expression-lang/spec.json -->`);
  sections.push(`<!-- spec hash: ${hash} -->`);
  sections.push(`<!-- DO NOT EDIT MANUALLY: any change here will be overwritten by \`pnpm gen:cheatsheet\` -->`);
  sections.push('');
  sections.push(`# Expression Language v${spec.version} 速查表`);
  sections.push('');
  sections.push(`> ${spec.description}`);
  sections.push('');
  sections.push(`**真相源**：\`features/design-schema/src/expression-lang/spec.json\` · **人读规约**：\`features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md\``);
  sections.push('');
  sections.push(`**版本**：${spec.version} · **规约名**：${spec.name}`);
  sections.push('');

  // 1. 语法
  sections.push(renderSyntax(spec.syntax));

  // 2. contextual identifiers
  sections.push(renderContextualIdentifiers(spec.scope.contextual));

  // 3. globals
  sections.push(renderGlobals(spec.scope.globals));

  // 4. builtins
  sections.push(renderBuiltins(spec.scope.builtins));

  // 5. instanceMethods
  sections.push(renderInstanceMethods(spec.scope.instanceMethods));

  // 6. errorCodes
  sections.push(renderErrorCodes(spec.errorCodes));

  // 7. knownMigrations
  sections.push(renderMigrations(spec.knownMigrations));

  // 8. 常见错误样例
  sections.push(renderCommonMistakes());

  return sections.join('\n');
}

// ===== 各章节渲染器 =====

function renderSyntax(s: Spec['syntax']): string {
  const lines: string[] = [];
  lines.push('## 1. 允许语法');
  lines.push('');
  lines.push('### 1.1 字面量');
  lines.push('');
  lines.push('| 类型 | 支持 | 形式 |');
  lines.push('|------|------|------|');
  for (const [name, def] of Object.entries(s.literals)) {
    const ok = def.supported ? '✅' : '❌';
    const form = def.form ?? def.values?.join(' / ') ?? def.delimiters?.map((d) => `${d}...${d}`).join(' / ') ?? '-';
    lines.push(`| \`${name}\` | ${ok} | \`${form}\` |`);
  }
  lines.push('');

  lines.push('### 1.2 操作符');
  lines.push('');
  lines.push(`- **二元**：${s.operators.binary.map((o) => `\`${o}\``).join(' ')}`);
  lines.push(`- **一元**：${s.operators.unary.map((o) => `\`${o}\``).join(' ')}`);
  lines.push(`- **三元**：${s.operators.ternary ? '✅ `cond ? a : b`' : '❌'}`);
  lines.push('');

  lines.push('### 1.3 成员访问 / 调用');
  lines.push('');
  lines.push(`- 点访问 \`a.b\`：${s.memberAccess.dot ? '✅' : '❌'}`);
  lines.push(`- 方括号 \`a['b']\` / \`arr[0]\`：${s.memberAccess.bracket ? '✅' : '❌'}`);
  lines.push(`- 可选链 \`a?.b\` / \`a?.['b']\` / \`f?.()\`：${s.memberAccess.optionalChain ? '✅' : '❌'}`);
  if (s.memberAccess._note) lines.push(`- ${s.memberAccess._note}`);
  lines.push(`- 函数调用：${s.callForm.supported ? '✅' : '❌'}${s.callForm._note ? ` — ${s.callForm._note}` : ''}`);
  lines.push('');

  lines.push('### 1.4 禁用语法');
  lines.push('');
  for (const f of s.forbidden) lines.push(`- ❌ ${f}`);
  lines.push('');

  return lines.join('\n');
}

function renderContextualIdentifiers(c: Spec['scope']['contextual']): string {
  const lines: string[] = [];
  lines.push('## 2. Contextual Identifiers（运行期由宿主注入）');
  lines.push('');
  lines.push('| 名称 | 类型 | 作用域 | 说明 |');
  lines.push('|------|------|--------|------|');
  for (const [name, def] of Object.entries(c)) {
    lines.push(
      `| \`${name}\` | \`${def.type}\` | ${def.scope} | ${def.description.replace(/\|/g, '\\|')} |`,
    );
  }
  lines.push('');
  for (const [name, def] of Object.entries(c)) {
    if (def.shape) {
      lines.push(`**${name} shape**：\`${def.shape}\``);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderGlobals(g: Spec['scope']['globals']): string {
  const lines: string[] = [];
  lines.push('## 3. Globals（受限静态命名空间）');
  lines.push('');
  lines.push('> 仅以下 7 个全局可用；其他全局（`window` / `eval` / `Function` / `process` / `document` / `fetch` / `localStorage` 等）**全部禁止**（见 §6 E007）。');
  lines.push('');
  for (const [name, def] of Object.entries(g)) {
    const callable = def.callable ? `**callable**${def.callDescription ? `：${def.callDescription}` : ''}` : '不可直接调用';
    lines.push(`### 3.${getGlobalIndex(name, g)} \`${name}\` (${callable})`);
    lines.push('');
    if (def.description) {
      lines.push(`> ${def.description}`);
      lines.push('');
    }
    if (Object.keys(def.members).length === 0) {
      lines.push('_（无成员）_');
      lines.push('');
      continue;
    }
    lines.push('| 成员 | 签名 | 说明 |');
    lines.push('|------|------|------|');
    for (const [m, raw] of Object.entries(def.members)) {
      const member = raw as Record<string, unknown>;
      if (member.kind === 'constant') {
        lines.push(`| \`${m}\` | (常量) | type: \`${String(member.type)}\` |`);
      } else {
        const args = Array.isArray(member.args) ? (member.args as string[]).join(', ') : '';
        const ret = String(member.returns ?? 'unknown');
        const desc = (member.description as string | undefined) ?? '';
        lines.push(`| \`${name}.${m}\` | \`(${args}) → ${ret}\` | ${desc.replace(/\|/g, '\\|')} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function getGlobalIndex(name: string, g: Spec['scope']['globals']): number {
  return Object.keys(g).indexOf(name) + 1;
}

function renderBuiltins(b: Spec['scope']['builtins']): string {
  const lines: string[] = [];
  lines.push('## 4. Builtins（平台内置纯函数命名空间）');
  lines.push('');
  for (const [ns, members] of Object.entries(b)) {
    const desc = members._description as string | undefined;
    lines.push(`### \`${ns}\` 命名空间`);
    lines.push('');
    if (desc) {
      lines.push(`> ${desc}`);
      lines.push('');
    }
    lines.push('| 函数 | 签名 | 说明 |');
    lines.push('|------|------|------|');
    for (const [name, raw] of Object.entries(members)) {
      if (name.startsWith('_')) continue;
      const fn = raw as Record<string, unknown>;
      const args = Array.isArray(fn.args) ? (fn.args as string[]).join(', ') : '';
      const ret = String(fn.returns ?? 'unknown');
      const desc = (fn.description as string | undefined) ?? '';
      lines.push(`| \`${ns}.${name}\` | \`(${args}) → ${ret}\` | ${desc.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderInstanceMethods(im: Spec['scope']['instanceMethods']): string {
  const lines: string[] = [];
  lines.push('## 5. Instance Methods（按运行时类型查白名单）');
  lines.push('');
  const desc = im._description as unknown as string | undefined;
  if (desc) {
    lines.push(`> ${desc}`);
    lines.push('');
  }
  for (const [type, members] of Object.entries(im)) {
    if (type.startsWith('_')) continue;
    lines.push(`### \`${type}\` 实例方法/属性`);
    lines.push('');
    lines.push('| 成员 | 签名 | 说明 |');
    lines.push('|------|------|------|');
    for (const [name, raw] of Object.entries(members as Record<string, unknown>)) {
      if (name.startsWith('_')) continue;
      const m = raw as Record<string, unknown>;
      if (m.kind === 'property') {
        lines.push(`| \`.${name}\` | (属性) | type: \`${String(m.type)}\` |`);
      } else {
        const args = Array.isArray(m.args) ? (m.args as string[]).join(', ') : '';
        const ret = String(m.returns ?? 'unknown');
        const warn = m._warning ? ` ⚠️ ${String(m._warning)}` : '';
        const dsc = (m.description as string | undefined) ?? '';
        lines.push(`| \`.${name}()\` | \`(${args}) → ${ret}\` | ${dsc.replace(/\|/g, '\\|')}${warn.replace(/\|/g, '\\|')} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderErrorCodes(ec: Spec['errorCodes']): string {
  const lines: string[] = [];
  lines.push('## 6. Error Codes');
  lines.push('');
  lines.push('| 错误码 | 级别 | 摘要 | 说明 |');
  lines.push('|--------|------|------|------|');
  for (const [code, def] of Object.entries(ec)) {
    lines.push(`| **${code}** | ${def.level} | ${def.summary} | ${def.description.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');

  // E007 black list
  const e007 = ec.E007;
  if (e007?.blockedList?.length) {
    lines.push('### E007 黑名单（forbidden globals）');
    lines.push('');
    lines.push(e007.blockedList.map((g) => `\`${g}\``).join(' · '));
    lines.push('');
  }
  return lines.join('\n');
}

function renderMigrations(km: Spec['knownMigrations']): string {
  const lines: string[] = [];
  lines.push('## 7. Known Migrations（旧写法 → 推荐写法）');
  lines.push('');
  lines.push('> Lint 工具会在 issue 中带 `suggestedFix`，编辑器可一键应用。');
  lines.push('');
  lines.push('| 旧写法 | 推荐写法 |');
  lines.push('|--------|----------|');
  for (const [from, to] of Object.entries(km)) {
    if (from.startsWith('_')) continue;
    lines.push(`| \`${from.replace(/\|/g, '\\|')}\` | ${to.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderCommonMistakes(): string {
  return `## 8. 常见错误样例

| ❌ 写法 | ✅ 正确 | 错码 |
|---------|---------|------|
| \`{{ Date.fooNotExist() }}\` | \`{{ Date.now() }}\` 或 \`{{ $.now() }}\` | E003 |
| \`{{ window.alert('x') }}\` | （删除，Web 全局禁用） | E007 |
| \`{{ unknownVar }}\` | \`{{ state.view.unknownVar }}\` | E002 |
| \`state.view.x\` | \`{{ state.view.x }}\`（必须 \`{{ }}\` 包裹） | E001 |
| \`{{ "hello".notExist() }}\` | \`{{ "hello".toUpperCase() }}\` | E004 |
| \`{{ new Date() }}\` | \`{{ Date.now() }}\`（无 \`new\`） | E005 |
| \`{{ arr.map(x => x.foo) }}\` | （函数参数当前不支持，重新设计 schema） | E005 |

---

## 速查链接

- **完整 spec**：[../../../features/design-schema/src/expression-lang/spec.json](../../../features/design-schema/src/expression-lang/spec.json)
- **人读规约**：[../../../features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md](../../../features/design-schema/src/expression-lang/EXPR-LANG-SPEC.md)
- **STAGE-CONTRACT v2.7**：[../../../STAGE-CONTRACT.md](../../../STAGE-CONTRACT.md) §0.1.12
- **根因分析（如何走到第二 DSL）**：[../../../PLATFORM-ROOT-CAUSE-ANALYSIS.md](../../../PLATFORM-ROOT-CAUSE-ANALYSIS.md)
`;
}

main();
