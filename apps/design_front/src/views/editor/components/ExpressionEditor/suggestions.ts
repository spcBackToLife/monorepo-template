/**
 * 表达式自动补全 — 按当前光标位置下文的 `.` 链前缀匹配候选。
 *
 * 能识别的顶级标识符：
 *   state / item / index / parent / $last / $ / true / false / null / undefined
 * 以及用户自定义 view 变量（通过 scope 传入）。
 */

export interface ExprScope {
  /** 屏幕级 state.view 已定义变量名（含作用域: 设计器 editorStore.activeScreen.stateInit.view） */
  stateViewVars: string[];
  /** state.data 里已有的 key（来自 dataSources 或 stateInit.data） */
  stateDataKeys: string[];
  /** 所有 api 数据源 id（即 state.effects[<id>].data 可用性） */
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

const BUILTIN_FNS: Suggestion[] = [
  { label: '$.length', insertText: 'length(', kind: 'fn', detail: '数组/字符串长度' },
  { label: '$.upper', insertText: 'upper(', kind: 'fn', detail: '字符串转大写' },
  { label: '$.lower', insertText: 'lower(', kind: 'fn', detail: '字符串转小写' },
  { label: '$.format', insertText: 'format(', kind: 'fn', detail: '模板字符串插值' },
  { label: '$.includes', insertText: 'includes(', kind: 'fn', detail: '数组/字符串包含' },
  { label: '$.first', insertText: 'first(', kind: 'fn', detail: '取首元素' },
  { label: '$.last', insertText: 'last(', kind: 'fn', detail: '取末元素' },
  { label: '$.isEmpty', insertText: 'isEmpty(', kind: 'fn', detail: '是否空数组/空字符串' },
  { label: '$.not', insertText: 'not(', kind: 'fn', detail: '布尔取反' },
  { label: '$.defaultTo', insertText: 'defaultTo(', kind: 'fn', detail: 'null/undefined 取兜底' },
];

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

/**
 * 根据前缀字符串得出候选项。遵循从左到右匹配：
 *   ""          → 顶级 (state / item / index / parent / $last / $ / keywords)
 *   "state"     → 顶级同上过滤
 *   "state."    → [view, data, effects]
 *   "state.view."  → stateViewVars
 *   "state.data."  → stateDataKeys
 *   "state.effects." → stateEffectIds
 *   "state.effects.<id>."  → status / data / error / startedAt / finishedAt
 *   "$."        → builtin fns
 *   "item."     → 返回空（item 是任意对象，前端不做字段推断）
 */
export function getSuggestions(prefix: string, scope: ExprScope): Suggestion[] {
  const parts = prefix.split('.');
  const firstLevel = parts[0];

  // 顶级补全
  if (parts.length === 1) {
    const items: Suggestion[] = [
      { label: 'state', insertText: 'state', kind: 'var', detail: '屏幕级运行时状态' },
    ];
    if (scope.allowItem) {
      items.push({ label: 'item', insertText: 'item', kind: 'var', detail: '列表项' });
      items.push({ label: 'index', insertText: 'index', kind: 'var', detail: '列表索引' });
      items.push({ label: 'parent', insertText: 'parent', kind: 'var', detail: '父列表项' });
    }
    if (scope.allowLast) {
      items.push({ label: '$last', insertText: '$last', kind: 'var', detail: '上一步 effect 的结果' });
    }
    items.push({ label: '$', insertText: '$', kind: 'var', detail: '内置函数命名空间' });
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

  // $.*
  if (firstLevel === '$' && parts.length === 2) {
    return filterByPrefix(
      BUILTIN_FNS.map((f) => ({ ...f, label: f.label.slice(2) })),
      parts[1] ?? '',
    );
  }

  // $last.*
  if (firstLevel === '$last' && parts.length === 2) {
    return filterByPrefix(
      [
        { label: 'status', insertText: 'status', kind: 'path' },
        { label: 'data', insertText: 'data', kind: 'path' },
        { label: 'error', insertText: 'error', kind: 'path' },
      ],
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
