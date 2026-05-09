#!/usr/bin/env node
/**
 * 一次性修复 833478e8 项目里所有 v1 时代的表达式语法残留：
 *   1) `{{ x | "fallback" }}` → `{{ x || "fallback" }}`
 *   2) `{{ data.xxx }}` → `{{ state.data.xxx }}`（裸 `data.` 加 state. 前缀；
 *      已带 state. / item. / parent. / $last. / $. 的不动）
 *   3) **强 Expression 字段裸字符串补 `{{ }}`**（v0.3.1 新增）：
 *      `node.repeat` / `node.visibleWhen` / `events[].condition.when` /
 *      `actions[].predicate` 这些按 schema 必须是 Expression<X> 的字段，
 *      若是裸字符串（没有 `{{ }}`）则自动包装成 `{{ <trimmed> }}`。
 *      这是 ListRenderer 把 `repeat: "state.data.messages"` 当字面量、
 *      导致列表静默不渲染的根因之一。
 *
 * 这是 C.2 迁移层应该做但漏掉的字符串字段子语法升级。
 * 本脚本把现存项目修干净；C.2 迁移脚本里也应同步加这两条规则（F.2 收尾时一并补）。
 *
 * 执行：
 *   cd apps/design-mcp
 *   node scripts/fix-v1-expressions.mjs           # 干跑（dry-run）
 *   node scripts/fix-v1-expressions.mjs --apply   # 真正应用
 */

const API_BASE = process.env.DESIGN_API_URL || 'http://127.0.0.1:3001';
const PROJECT_ID = process.env.PROJECT_ID || '833478e8-17c5-4f1f-b2d2-9ae17012cbcc';
const APPLY = process.argv.includes('--apply');

// ===== 表达式重写规则 =====

/**
 * 把 `{{ ... | y }}` 中**作为分隔符的单 `|`** 替成 `||`。
 *
 * 仅匹配：单 `|` 两侧各有一个字符（避免 `||` 已是 v2 写法的情况二次替换）。
 * 不匹配：`||` 已是 v2 写法。
 *
 * 实现：对 `{{ ... }}` 内部做处理，把 `(\S)\s*\|\s*(\S)` 中 `|` 不是 `||` 一部分时替换。
 * 简化策略：只在 `{{ }}` 内做替换，全局匹配 `(?<![|])\|(?![|])`（前后都不是 `|` 的孤立 `|`）。
 */
function upgradeFallbackPipe(exprInner) {
  // 仅当出现孤立 `|` 才替；保留字符串字面量内的 `|`（不太可能含但保险用 token-level 不必要复杂，先不深入）
  return exprInner.replace(/(?<!\|)\|(?!\|)/g, '||');
}

/**
 * 把 `data.xxx` 加 `state.` 前缀。
 *
 * 规则：在表达式 inner 中，找出"作为标识符根"的裸 `data` —— 即 `data` 前面是
 *   - 字符串开头 / 空白 / `(` / `,` / `?` / `:` / 二元运算符 / `!`
 * 且 `data` 后面紧跟 `.` 或 `[`（确保 data 是被访问的对象）。
 *
 * 不替换：
 *   - `state.data.xxx` 已带 state. 前缀
 *   - `item.data.xxx` 等其它 root 下的 data
 *   - 字符串字面量里的 "data."（如 `'data.user'`）
 */
function upgradeDataIdentifier(exprInner) {
  // 用一个简单的状态机：跳过字符串字面量，在外面才替换
  let out = '';
  let i = 0;
  const n = exprInner.length;

  // 边界字符（data 之前若是这些字符之一，则 data 为根标识符）
  const isBoundary = (c) =>
    c === undefined ||
    /\s/.test(c) ||
    '([{,?:+-*/%!=<>&|'.includes(c);

  while (i < n) {
    const c = exprInner[i];
    // 字符串：原样拷贝直到结束
    if (c === '"' || c === "'") {
      const quote = c;
      out += c;
      i += 1;
      while (i < n && exprInner[i] !== quote) {
        if (exprInner[i] === '\\' && i + 1 < n) {
          out += exprInner[i] + exprInner[i + 1];
          i += 2;
        } else {
          out += exprInner[i];
          i += 1;
        }
      }
      if (i < n) {
        out += exprInner[i];
        i += 1;
      }
      continue;
    }
    // 检测裸 `data` 标识符
    if (
      (c === 'd' || c === 'D') &&
      exprInner.slice(i, i + 4) === 'data' &&
      isBoundary(out[out.length - 1]) &&
      (exprInner[i + 4] === '.' || exprInner[i + 4] === '[')
    ) {
      out += 'state.data';
      i += 4;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

/**
 * 处理一个完整字段值（适用于 styles[K] / props[K]）：
 *   - 非字符串原样返回
 *   - 字符串里逐个 `{{ ... }}` 段做 inner 升级
 *   - **不补 `{{ }}`** —— 这类字段允许字面量（"hello" / "16px" 都合法）
 */
function upgradeStringValue(value) {
  if (typeof value !== 'string') return { changed: false, value };
  if (!value.includes('{{')) return { changed: false, value };

  let out = '';
  let i = 0;
  let changed = false;
  while (i < value.length) {
    const open = value.indexOf('{{', i);
    if (open < 0) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, open);
    const close = value.indexOf('}}', open + 2);
    if (close < 0) {
      // 未闭合：原样保留
      out += value.slice(open);
      break;
    }
    const inner = value.slice(open + 2, close);
    let upgraded = inner;
    upgraded = upgradeFallbackPipe(upgraded);
    upgraded = upgradeDataIdentifier(upgraded);
    if (upgraded !== inner) changed = true;
    out += '{{' + upgraded + '}}';
    i = close + 2;
  }
  return { changed, value: out };
}

/**
 * 处理强 Expression 字段（按 schema 必须是 Expression<X>）：
 *   - 非字符串 / null / 空字符串 → 不动
 *   - 已含 `{{ }}` → 仍走 inner 子语法升级（pipe / data.→state.data.）
 *   - 裸字符串 → 先 inner 升级，再整体包成 `{{ <trimmed> }}`
 *
 * 适用：node.repeat / node.visibleWhen / events[].condition.when /
 *      state.remove.predicate
 */
function upgradeStrictExpression(value) {
  if (typeof value !== 'string') return { changed: false, value };
  if (value === '') return { changed: false, value };

  // 已含 `{{ }}` → 走和 styles/props 一样的 inner 升级
  if (value.includes('{{')) {
    return upgradeStringValue(value);
  }

  // 裸字符串：先做 inner 升级再包 `{{ }}`
  let inner = value.trim();
  inner = upgradeFallbackPipe(inner);
  inner = upgradeDataIdentifier(inner);
  return { changed: true, value: `{{ ${inner} }}` };
}

// ===== 节点遍历 =====

function walkNodes(node, fn) {
  fn(node);
  if (Array.isArray(node.children)) {
    for (const c of node.children) walkNodes(c, fn);
  }
}

/**
 * 递归升级 actions 链中的强 Expression 字段：
 *   - state.remove.predicate
 *   - effect.fetch.onSuccess / onError 子链（递归）
 * 其他 value/params/message/url 等"字面量也合法"的字段保持原样。
 */
function upgradeActionsInPlace(actions) {
  if (!Array.isArray(actions)) return false;
  let changed = false;
  for (const a of actions) {
    if (!a || typeof a !== 'object') continue;
    if (a.type === 'state.remove' && typeof a.predicate === 'string') {
      const r = upgradeStrictExpression(a.predicate);
      if (r.changed) {
        a.predicate = r.value;
        changed = true;
      }
    } else if (a.type === 'effect.fetch') {
      if (upgradeActionsInPlace(a.onSuccess)) changed = true;
      if (upgradeActionsInPlace(a.onError)) changed = true;
    }
  }
  return changed;
}

/**
 * 扫一个节点：找出 props / styles / 强表达式字段 / events 里需要升级的内容。
 * 返回 patch 集合（含完整新值，便于 op 调用）。
 */
function inspectNode(node) {
  const propsPatch = {};
  const stylesPatch = {};
  let propsChanged = false;
  let stylesChanged = false;

  if (node.props && typeof node.props === 'object') {
    for (const [k, v] of Object.entries(node.props)) {
      const { changed, value } = upgradeStringValue(v);
      if (changed) {
        propsPatch[k] = value;
        propsChanged = true;
      }
    }
  }
  if (node.styles && typeof node.styles === 'object') {
    for (const [k, v] of Object.entries(node.styles)) {
      const { changed, value } = upgradeStringValue(v);
      if (changed) {
        stylesPatch[k] = value;
        stylesChanged = true;
      }
    }
  }

  // 强 Expression 字段 —— 裸字符串自动补 `{{ }}`
  const visibleWhenChange = node.visibleWhen
    ? upgradeStrictExpression(node.visibleWhen)
    : { changed: false };
  // repeat 在 v2.1 后是 { expression, template } 对象；本脚本不处理它。
  // 旧 string 版本请用 scripts/migrate-repeat-to-v2.1.mjs 做一次性升级。
  const repeatExprChange = node.repeat && typeof node.repeat === 'object'
    ? upgradeStrictExpression(node.repeat.expression)
    : { changed: false };

  // events[].condition.when + actions chain
  const eventPatches = [];
  if (Array.isArray(node.events)) {
    for (let idx = 0; idx < node.events.length; idx++) {
      const ev = node.events[idx];
      if (!ev) continue;
      const newEvent = JSON.parse(JSON.stringify(ev));
      let evChanged = false;

      if (newEvent.condition && typeof newEvent.condition.when === 'string') {
        const r = upgradeStrictExpression(newEvent.condition.when);
        if (r.changed) {
          newEvent.condition.when = r.value;
          evChanged = true;
        }
      }
      if (upgradeActionsInPlace(newEvent.actions)) {
        evChanged = true;
      }

      if (evChanged) {
        eventPatches.push({ index: idx, event: newEvent, original: ev });
      }
    }
  }

  return {
    propsPatch: propsChanged ? propsPatch : null,
    stylesPatch: stylesChanged ? stylesPatch : null,
    visibleWhenChange,
    repeatExprChange,
    eventPatches,
  };
}

// ===== 主流程 =====

async function fetchProject() {
  const r = await fetch(`${API_BASE}/api/projects/${PROJECT_ID}`);
  if (!r.ok) throw new Error(`GET project failed: ${r.status} ${r.statusText}`);
  return r.json();
}

async function applyBatch(ops) {
  const r = await fetch(`${API_BASE}/api/projects/${PROJECT_ID}/operations/batch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operations: ops, author: 'ai:fix-v1-expressions' }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`batch failed: ${r.status} ${text}`);
  }
  return r.json();
}

async function main() {
  console.log(`[fix-v1-expr] mode=${APPLY ? 'APPLY' : 'dry-run'} project=${PROJECT_ID}`);
  const project = await fetchProject();
  const screens = project.screens ?? [];
  console.log(`[fix-v1-expr] ${screens.length} screen(s)`);

  const ops = [];
  let inspected = 0;
  let touched = 0;

  for (const scr of screens) {
    if (!scr.rootNode) continue;
    walkNodes(scr.rootNode, (node) => {
      inspected += 1;
      const r = inspectNode(node);
      if (r.propsPatch) {
        touched += 1;
        ops.push({
          type: 'componentProps.update',
          params: { nodeId: node.id, props: r.propsPatch },
        });
        console.log(
          `  [props] ${scr.name} / ${node.id} (${node.type}) keys=${Object.keys(
            r.propsPatch,
          ).join(',')}`,
        );
      }
      if (r.stylesPatch) {
        touched += 1;
        ops.push({
          type: 'style.update',
          params: { nodeId: node.id, styles: r.stylesPatch },
        });
        console.log(
          `  [styles] ${scr.name} / ${node.id} (${node.type}) keys=${Object.keys(
            r.stylesPatch,
          ).join(',')}`,
        );
      }
      if (r.visibleWhenChange.changed) {
        touched += 1;
        ops.push({
          type: 'element.setVisibleWhen',
          params: { nodeId: node.id, visibleWhen: r.visibleWhenChange.value },
        });
        console.log(
          `  [visibleWhen] ${scr.name} / ${node.id}: "${node.visibleWhen}" → "${r.visibleWhenChange.value}"`,
        );
      }
      if (r.repeatExprChange.changed) {
        touched += 1;
        ops.push({
          type: 'element.setRepeat',
          params: {
            nodeId: node.id,
            // 只改表达式字符串，保留现有 template
            repeat: { expression: r.repeatExprChange.value },
          },
        });
        console.log(
          `  [repeat] ${scr.name} / ${node.id}: "${node.repeat?.expression}" → "${r.repeatExprChange.value}"`,
        );
      }
      for (const ep of r.eventPatches) {
        touched += 1;
        ops.push({
          type: 'event.update',
          params: { nodeId: node.id, eventIndex: ep.index, event: ep.event },
        });
        const desc = describeEventChange(ep.original, ep.event);
        console.log(
          `  [event#${ep.index}] ${scr.name} / ${node.id} (${ep.event.trigger}) ${desc}`,
        );
      }
    });
  }

  console.log(
    `\n[fix-v1-expr] inspected ${inspected} nodes; ${touched} field-group(s) need upgrade; ${ops.length} op(s) to send`,
  );

  if (!APPLY) {
    console.log(`\n[fix-v1-expr] dry-run only. Re-run with --apply to commit.`);
    return;
  }
  if (ops.length === 0) {
    console.log(`[fix-v1-expr] nothing to do, exit.`);
    return;
  }

  const result = await applyBatch(ops);
  console.log(`[fix-v1-expr] batch applied: ${JSON.stringify(result).slice(0, 200)}...`);
}

function describeEventChange(before, after) {
  const parts = [];
  if (before.condition?.when !== after.condition?.when) {
    parts.push(`when: "${before.condition?.when}" → "${after.condition?.when}"`);
  }
  // actions 改动太繁，只数变化条数
  const beforeActStr = JSON.stringify(before.actions ?? []);
  const afterActStr = JSON.stringify(after.actions ?? []);
  if (beforeActStr !== afterActStr) {
    parts.push('actions chain updated');
  }
  return parts.join('; ');
}

main().catch((e) => {
  console.error('[fix-v1-expr] FAILED:', e.message);
  process.exit(1);
});
