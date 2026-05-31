/**
 * 表达式自动补全（EXPR-E-2：升级为 spec-driven）。
 *
 * 一切顶级标识符 / globals 成员 / builtin 函数 / 实例方法 都从
 * design-schema 的 expression-lang barrel 派生，**不再硬编码**。
 *
 * 真相源：features/design-schema/src/expression-lang/spec.json
 *
 * 触发逻辑（按光标前缀）：
 *   ""                    → contextual + globals + $ + keywords
 *   "state"               → 同上前缀过滤
 *   "state."              → [view, data, effects]
 *   "state.view."         → stateViewVars (来自 ExprScope)
 *   "state.data."         → stateDataKeys
 *   "state.effects.<id>." → status / data / error / startedAt / finishedAt
 *   "Date." / "Math." 等  → 该 global namespace 允许的成员（spec 派生）
 *   "$."                  → builtin 函数（spec 派生）
 *   "$last."              → status / data / error / startedAt / finishedAt
 *   "globalView."         → 不在 scope 内做字段补全（项目级配置自由形态）
 */

import {
  listContextualIdentifiers,
  listAllowedGlobals,
  listGlobalMembers,
  listBuiltinFunctions,
  EXPR_LANG_SPEC,
} from '@globallink/design-schema';

export interface ExprScope {
  /** 屏幕级 state.view 已定义变量名 */
  stateViewVars: string[];
  /** state.data 里已有的 key */
  stateDataKeys: string[];
  /** 所有 api 数据源 id */
  stateEffectIds: string[];
  /** 当前编辑上下文是否处于列表项：决定是否提示 item / index / parent */
  allowItem?: boolean;
  /** 是否处于 effect.onSuccess/onError 链内（可用 $last） */
  allowLast?: boolean;
}

export interface Suggestion {
  /** 显示文本 */
  label: string;
  /** 插入到编辑框的实际字符串（替换 prefix 部分） */
  insertText: string;
  /** 类型标签（供右侧说明） */
  kind: 'var' | 'path' | 'fn' | 'keyword';
  /** 悬浮提示 */
  detail?: string;
}

const TOP_KEYWORDS: Suggestion[] = [
  { label: 'true', insertText: 'true', kind: 'keyword' },
  { label: 'false', insertText: 'false', kind: 'keyword' },
  { label: 'null', insertText: 'null', kind: 'keyword' },
  { label: 'undefined', insertText: 'undefined', kind: 'keyword' },
];

/** 从光标向前抓取一段标识符链（a.b.c / a.b / a）并返回其位置 */
export function getTokenPrefix(src: string, cursor: number): { prefix: string; start: number } {
  let i = cursor;
  while (i > 0) {
    const ch = src[i - 1];
    if (/[A-Za-z0-9_$.]/.test(ch)) {
      i -= 1;
    } else {
      break;
    }
  }
  return { prefix: src.slice(i, cursor), start: i };
}

/**
 * 光标是否处于 `{{ ... }}` 内部。template 模式下补全仅在插值段启用；
 * expression 模式下始终启用。
 */
export function isInsideInterpolation(src: string, cursor: number): boolean {
  const before = src.slice(0, cursor);
  const lastOpen = before.lastIndexOf('{{');
  if (lastOpen < 0) return false;
  const closedBetween = before.slice(lastOpen + 2).indexOf('}}');
  return closedBetween < 0;
}

// ===== 描述渲染辅助 =====

function getContextualDescription(name: string): string {
  const c = EXPR_LANG_SPEC.scope.contextual?.[name];
  return c?.description ?? '';
}

function getGlobalDescription(name: string): string {
  const g = EXPR_LANG_SPEC.scope.globals?.[name];
  return g?.description ?? `全局命名空间 ${name}`;
}

function getBuiltinFnDescription(ns: string, fn: string): string {
  const namespace = EXPR_LANG_SPEC.scope.builtins?.[ns];
  if (!namespace) return '';
  const def = namespace[fn];
  if (!def || typeof def === 'string') return '';
  const args = Array.isArray(def.args) ? def.args.join(', ') : '';
  const ret = String(def.returns ?? '');
  const desc = (def as { description?: string }).description ?? '';
  return `(${args}) → ${ret}${desc ? ` · ${desc}` : ''}`;
}

function getGlobalMemberDescription(ns: string, member: string): string {
  const g = EXPR_LANG_SPEC.scope.globals?.[ns];
  if (!g) return '';
  const m = g.members[member];
  if (!m || typeof m !== 'object') return '';
  const obj = m as Record<string, unknown>;
  if (obj.kind === 'constant') return `(常量) type: ${String(obj.type)}`;
  const args = Array.isArray(obj.args) ? (obj.args as string[]).join(', ') : '';
  const ret = String(obj.returns ?? '');
  const desc = (obj.description as string | undefined) ?? '';
  return `(${args}) → ${ret}${desc ? ` · ${desc}` : ''}`;
}

/**
 * 根据前缀字符串得出候选项。
 */
export function getSuggestions(prefix: string, scope: ExprScope): Suggestion[] {
  const parts = prefix.split('.');
  const firstLevel = parts[0];

  // 顶级补全
  if (parts.length === 1) {
    const items: Suggestion[] = [];

    // 1. contextual identifiers (state / item / index / parent / $last / globalView)
    for (const name of listContextualIdentifiers()) {
      // item / index / parent 仅在列表内提示
      if ((name === 'item' || name === 'index' || name === 'parent') && !scope.allowItem) continue;
      // $last 仅在 effect 链内提示
      if (name === '$last' && !scope.allowLast) continue;
      items.push({
        label: name,
        insertText: name,
        kind: 'var',
        detail: getContextualDescription(name),
      });
    }

    // 2. globals (Date / Math / Number / String / Boolean / JSON / Object / Array)
    for (const name of listAllowedGlobals()) {
      items.push({
        label: name,
        insertText: name,
        kind: 'var',
        detail: getGlobalDescription(name),
      });
    }

    // 3. builtin namespace `$`
    items.push({ label: '$', insertText: '$', kind: 'var', detail: '内置函数命名空间' });

    // 4. keywords
    items.push(...TOP_KEYWORDS);

    return filterByPrefix(items, firstLevel ?? '');
  }

  // state.*
  if (firstLevel === 'state') {
    if (parts.length === 2) {
      return filterByPrefix(
        [
          { label: 'view', insertText: 'view', kind: 'path', detail: 'UI 临时态' },
          { label: 'data', insertText: 'data', kind: 'path', detail: '业务数据' },
          { label: 'effects', insertText: 'effects', kind: 'path', detail: '副作用运行时' },
        ],
        parts[1] ?? '',
      );
    }
    if (parts.length === 3) {
      if (parts[1] === 'view') {
        return filterByPrefix(
          scope.stateViewVars.map((v) => ({
            label: v,
            insertText: v,
            kind: 'var' as const,
            detail: 'view 变量',
          })),
          parts[2] ?? '',
        );
      }
      if (parts[1] === 'data') {
        return filterByPrefix(
          scope.stateDataKeys.map((v) => ({
            label: v,
            insertText: v,
            kind: 'path' as const,
            detail: 'data 字段',
          })),
          parts[2] ?? '',
        );
      }
      if (parts[1] === 'effects') {
        return filterByPrefix(
          scope.stateEffectIds.map((v) => ({
            label: v,
            insertText: v,
            kind: 'path' as const,
            detail: '数据源 id',
          })),
          parts[2] ?? '',
        );
      }
    }
    if (parts.length === 4 && parts[1] === 'effects') {
      return filterByPrefix(
        [
          { label: 'status', insertText: 'status', kind: 'path', detail: "'idle'|'pending'|'success'|'error'" },
          { label: 'data', insertText: 'data', kind: 'path', detail: '响应数据' },
          { label: 'error', insertText: 'error', kind: 'path', detail: '错误对象' },
          { label: 'startedAt', insertText: 'startedAt', kind: 'path' },
          { label: 'finishedAt', insertText: 'finishedAt', kind: 'path' },
        ],
        parts[3] ?? '',
      );
    }
  }

  // $.* — builtin 函数（spec 派生）
  if (firstLevel === '$' && parts.length === 2) {
    return filterByPrefix(
      listBuiltinFunctions('$').map((fn) => ({
        label: fn,
        insertText: `${fn}(`,
        kind: 'fn' as const,
        detail: getBuiltinFnDescription('$', fn),
      })),
      parts[1] ?? '',
    );
  }

  // $last.*
  if (firstLevel === '$last' && parts.length === 2) {
    return filterByPrefix(
      [
        { label: 'status', insertText: 'status', kind: 'path' },
        { label: 'response', insertText: 'response', kind: 'path' },
        { label: 'error', insertText: 'error', kind: 'path' },
        { label: 'startedAt', insertText: 'startedAt', kind: 'path' },
        { label: 'finishedAt', insertText: 'finishedAt', kind: 'path' },
      ],
      parts[1] ?? '',
    );
  }

  // Date.* / Math.* / Number.* 等 globals 二级补全（spec 派生）
  if (firstLevel && parts.length === 2 && listAllowedGlobals().includes(firstLevel)) {
    return filterByPrefix(
      listGlobalMembers(firstLevel).map((m) => {
        const memberSpec = EXPR_LANG_SPEC.scope.globals[firstLevel]?.members[m];
        const isConst =
          memberSpec && typeof memberSpec === 'object' && (memberSpec as { kind?: string }).kind === 'constant';
        return {
          label: m,
          insertText: isConst ? m : `${m}(`,
          kind: isConst ? ('var' as const) : ('fn' as const),
          detail: getGlobalMemberDescription(firstLevel, m),
        };
      }),
      parts[1] ?? '',
    );
  }

  return [];
}

function filterByPrefix(list: Suggestion[], prefix: string): Suggestion[] {
  if (!prefix) return list;
  const p = prefix.toLowerCase();
  return list.filter((s) => s.label.toLowerCase().startsWith(p));
}
