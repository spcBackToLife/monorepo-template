#!/usr/bin/env node
/*
 Minimal zero-deps project generator for this monorepo.
 Features:
 - Interactive prompts via stdin (no external deps)
 - Copy templates from generators/templates/** to apps|packages|features
 - Filters out node_modules, dist, lockfiles
 - Rewrites package.json name and version (version default 0.0.0)
*/

const fs = require('fs');
const path = require('path');
const { Select, AutoComplete, Input, Confirm } = require('enquirer');

/** @typedef {"apps"|"packages"|"features"} WorkspaceKind */

const repoRoot = findRepoRoot();
const templatesRoot = path.join(repoRoot, 'generators', 'templates');

/**
 * Find repo root by walking up until package.json with private:true.
 */
function findRepoRoot() {
  let dir = process.cwd();
  while (true) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (json && json.private) return dir;
      } catch (_) {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function readDirSafe(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function isLockFile(name) {
  return name === 'pnpm-lock.yaml' || name === 'package-lock.json' || name === 'yarn.lock';
}

function shouldSkip(entryName) {
  return entryName === 'node_modules' || entryName === 'dist' || isLockFile(entryName);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = readDirSafe(src);
  for (const ent of entries) {
    if (shouldSkip(ent.name)) continue;
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      copyDir(s, d);
    } else if (ent.isSymbolicLink()) {
      // skip symlinks in templates
      continue;
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Ensure root-level Husky pre-commit exists and includes workspace checks.
 * Idempotent: merges commands if file already exists.
 */
function ensureRootHuskyPreCommit(rootDir) {
  const gitDir = path.join(rootDir, '.git');
  if (!fs.existsSync(gitDir)) {
    // Not a git repo root; skip silently
    return;
  }

  const huskyDir = path.join(rootDir, '.husky');
  ensureDir(huskyDir);

  const preCommitPath = path.join(huskyDir, 'pre-commit');
  const header = '#!/usr/bin/env sh\n. "$(dirname "$0")/_/husky.sh"\n\n';
  const requiredLines = ['pnpm -r lint', 'pnpm -r typecheck'];

  let content = '';
  if (fs.existsSync(preCommitPath)) {
    try {
      content = fs.readFileSync(preCommitPath, 'utf8');
    } catch (_) {
      content = '';
    }
  } else {
    content = header;
  }

  let changed = false;
  if (!content.startsWith('#!/')) {
    content = header + content;
    changed = true;
  } else if (!content.includes('husky.sh')) {
    // ensure husky header present for consistency
    content = header + content;
    changed = true;
  }

  for (const line of requiredLines) {
    const hasLine = content.split(/\r?\n/).some((l) => l.trim() === line);
    if (!hasLine) {
      content += (content.endsWith('\n') ? '' : '\n') + line + '\n';
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(preCommitPath, content, 'utf8');
    try {
      fs.chmodSync(preCommitPath, 0o755);
    } catch (_) {}
    console.log('已更新根级 .husky/pre-commit 钩子');
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeJsonPretty(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

/**
 * 根据环境写入 eslint.config.cjs（flat）
 * @param {string} destDir 目标目录
 * @param {('browser'|'node')} env
 */
function writeEslintConfigForEnv(destDir, env) {
  const file =
    `// ESLint v9 flat config for TypeScript library\n` +
    `const tseslint = require('@typescript-eslint/eslint-plugin');\n` +
    `const tsparser = require('@typescript-eslint/parser');\n` +
    `const js = require('@eslint/js');\n` +
    `const globals = require('globals');\n\n` +
    `module.exports = [\n` +
    `  js.configs.recommended,\n` +
    `  {\n` +
    `    files: ['src/**/*.ts'],\n` +
    `    languageOptions: {\n` +
    `      parser: tsparser,\n` +
    `      ecmaVersion: 'latest',\n` +
    `      sourceType: 'module',\n` +
    `      globals: { ...(globals.${env}) },\n` +
    `    },\n` +
    `    plugins: { '@typescript-eslint': tseslint },\n` +
    `    rules: {\n` +
    `      'no-unused-vars': 'off',\n` +
    `      'no-undef': 'off',\n` +
    `      '@typescript-eslint/no-explicit-any': 'error',\n` +
    `      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],\n` +
    `    },\n` +
    `  },\n` +
    `  { ignores: ['dist', 'node_modules'] },\n` +
    `];\n`;
  fs.writeFileSync(path.join(destDir, 'eslint.config.cjs'), file, 'utf8');
}

/**
 * 根据环境覆写 tsconfig.json 的 lib（browser: 含 DOM，node: 不含 DOM）
 * @param {string} destDir
 * @param {('browser'|'node')} env
 */
function rewriteTsconfigLibForEnv(destDir, env) {
  const tsconfigPath = path.join(destDir, 'tsconfig.json');
  const data = readJsonSafe(tsconfigPath);
  if (!data) return;
  data.compilerOptions = data.compilerOptions || {};
  if (env === 'browser') {
    data.compilerOptions.lib = ['ES2021', 'DOM', 'DOM.Iterable'];
  } else {
    data.compilerOptions.lib = ['ES2021'];
  }
  // 保留其他现有设置
  writeJsonPretty(tsconfigPath, data);
}

function isDirEmpty(dir) {
  const list = readDirSafe(dir).filter((x) => !shouldSkip(x.name));
  return list.length === 0;
}

function rewritePackageJson(destDir, pkgName, desiredPrivate) {
  const pkgPath = path.join(destDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  try {
    const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkgName) data.name = pkgName;
    if (!data.version) data.version = '0.0.0';
    if (typeof desiredPrivate === 'boolean') {
      if (desiredPrivate) {
        data.private = true;
      } else {
        if (data.private) delete data.private;
      }
    }
    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.error('Failed to rewrite package.json:', e.message);
  }
}

function listKinds() {
  return /** @type {WorkspaceKind[]} */ (['apps', 'packages', 'features']);
}

/**
 * 固定可选模板集合为 6 个：
 * apps: h5-mobile, h5-pc
 * packages: lib-sdk, ui-sdk
 * features: lib-sdk, ui-sdk
 */
const ALLOWED_TEMPLATES = {
  apps: new Set(['h5-mobile', 'h5-pc']),
  packages: new Set(['lib-sdk', 'ui-sdk']),
  features: new Set(['lib-sdk', 'ui-sdk']),
};

function listTemplates(kind) {
  const base = path.join(templatesRoot, kind);
  const allowed = ALLOWED_TEMPLATES[kind] || new Set();
  return readDirSafe(base)
    .filter((x) => x.isDirectory() && allowed.has(x.name))
    .map((x) => x.name)
    .sort();
}

async function askSelect(message, choices) {
  const prompt = new Select({ message, choices });
  return await prompt.run();
}

async function askAutoComplete(message, choices) {
  const prompt = new AutoComplete({ message, choices, limit: 8, initial: 0 });
  return await prompt.run();
}

async function askInput(message) {
  const prompt = new Input({ message });
  return await prompt.run();
}

async function askConfirm(message) {
  const prompt = new Confirm({ message, initial: false });
  return await prompt.run();
}

function resolveDest(kind, name) {
  if (kind === 'apps') return path.join(repoRoot, 'apps', name);
  if (kind === 'packages') return path.join(repoRoot, 'packages', name);
  if (kind === 'features') return path.join(repoRoot, 'features', name);
  throw new Error('Unknown kind: ' + kind);
}

async function main() {
  if (!fs.existsSync(templatesRoot) || isDirEmpty(templatesRoot)) {
    console.error('未找到模板目录，请先在 generators/templates 下准备模板。');
    process.exit(1);
  }

  const kinds = listKinds();
  const kindChoices = [
    { name: 'apps', message: 'apps — 应用（可运行的前端项目）', hint: '模板：h5-mobile / h5-pc' },
    {
      name: 'packages',
      message: 'packages — 可发布的 SDK（lib-sdk / ui-sdk）',
      hint: '会发到注册表',
    },
    {
      name: 'features',
      message: 'features — 私有 SDK（lib-sdk / ui-sdk）',
      hint: '仅工作区内复用，不发布',
    },
  ];
  const kind = await askSelect('请选择分类', kindChoices);
  if (!kinds.includes(kind)) {
    console.error('无效分类:', kind);
    process.exit(1);
  }

  const templates = listTemplates(kind);
  if (templates.length === 0) {
    console.error('分类下无模板，请检查 generators/templates 是否正确: ', kind);
    process.exit(1);
  }
  const tpl = await askAutoComplete('请选择模板', templates);
  // 选项来自允许列表，无需再做 includes 校验

  const targetName = await askInput('输入新项目目录名');
  if (!/^[a-zA-Z0-9-_]+$/.test(targetName)) {
    console.error('目录名仅允许字母、数字、连字符与下划线');
    process.exit(1);
  }

  // 仅收集信息，不创建任何文件，直到用户确认全部选项
  const destDir = resolveDest(kind, targetName);
  if (fs.existsSync(destDir)) {
    const confirm = await askConfirm(`目录已存在: ${destDir}，是否覆盖?`);
    if (!confirm) {
      console.log('已取消');
      process.exit(0);
    }
  }

  // 若为 lib-sdk，先询问运行环境，但不落盘
  let libEnv = null;
  if (tpl === 'lib-sdk') {
    libEnv = await askSelect('选择运行环境（lib-sdk）', [
      { name: 'browser', message: 'browser — 浏览器环境（含 DOM）' },
      { name: 'node', message: 'node — Node.js 环境' },
    ]);
  }

  // 到此为止仍未写入任何文件，下面一次性创建
  const srcDir = path.join(templatesRoot, kind, tpl);
  ensureDir(destDir);
  copyDir(srcDir, destDir);

  // Guess package name based on kind
  let pkgName = '';
  let desiredPrivate = true; // 默认私有
  if (kind === 'apps') {
    pkgName = `@globallink/${targetName}`;
    desiredPrivate = true;
  } else if (kind === 'packages') {
    // SDK 包命名: 交由用户后续自行调整组织名，这里先用 @sass/
    pkgName = `@sass/${targetName}`;
    desiredPrivate = false; // packages 默认可发布
  } else if (kind === 'features') {
    pkgName = `@globallink/${targetName}`;
    desiredPrivate = true; // features 默认不发布
  }
  rewritePackageJson(destDir, pkgName, desiredPrivate);

  // 若为 lib-sdk，询问运行环境并应用对应的 ESLint/TSConfig
  if (tpl === 'lib-sdk') {
    try {
      const env = await askSelect('选择运行环境（lib-sdk）', [
        { name: 'browser', message: 'browser — 浏览器环境（含 DOM）' },
        { name: 'node', message: 'node — Node.js 环境' },
      ]);
      writeEslintConfigForEnv(destDir, env);
      rewriteTsconfigLibForEnv(destDir, env);
      console.log('已应用 lib-sdk 环境配置：', env);
    } catch (e) {
      console.warn('应用 lib-sdk 环境配置失败（已跳过）：', e && e.message);
    }
  }

  // 若为 lib-sdk，应用环境配置（此时目录已创建）
  if (tpl === 'lib-sdk' && libEnv) {
    try {
      writeEslintConfigForEnv(destDir, libEnv);
      rewriteTsconfigLibForEnv(destDir, libEnv);
      console.log('已应用 lib-sdk 环境配置：', libEnv);
    } catch (e) {
      console.warn('应用 lib-sdk 环境配置失败（已跳过）：', e && e.message);
    }
  }

  // 初始化/合并仓库根级 Husky pre-commit（monorepo 顶层）——放在创建成功之后
  try {
    ensureRootHuskyPreCommit(repoRoot);
  } catch (e) {
    console.warn('初始化 Husky pre-commit 失败（已跳过）：', e && e.message);
  }

  console.log('创建完成于:', destDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
