/**
 * Reducer — 处理所有 `state.*` 动词：
 *   - state.set / state.append / state.remove / state.merge / state.toggle
 *
 * 语义与 schema `Action` 联合对齐。路径用 dot/bracket 表示，
 * 与 Parser 的路径语法兼容（例如 "view.inputDraft" / "data.messages[2].text"）。
 *
 * 单元设计目标：
 *   - 纯函数：给老 state + action → 返回新 state（不可变）
 *   - 不处理 effect.*（那是 Dispatcher 的事）
 *   - 遇到不可解析的 action.type 抛错（上层 Dispatcher 捕获）
 */

import type {
  ScreenState,
  StateSetAction,
  StateAppendAction,
  StateRemoveAction,
  StateMergeAction,
  StateToggleAction,
} from '@globallink/design-schema';

export type StateMutationAction =
  | StateSetAction
  | StateAppendAction
  | StateRemoveAction
  | StateMergeAction
  | StateToggleAction;

// ===== 路径工具 =====

/** 把 "a.b[0].c" 拆成 ['a', 'b', 0, 'c']；数组下标保持 number 类型 */
export function parsePath(path: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) out.push(m[1]);
    else out.push(Number(m[2]));
  }
  return out;
}

/** 只读导航：路径不存在返回 undefined，不抛 */
export function getByPath(obj: unknown, path: string): unknown {
  const segs = parsePath(path);
  let cur: unknown = obj;
  for (const s of segs) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[s];
  }
  return cur;
}

/**
 * 不可变写入：返回 obj 的新副本，其 path 位置替换为 value。
 * 路径中缺失的中间层会被自动补全（object 或 array 由下一段推断）。
 */
export function setByPath(obj: unknown, path: string, value: unknown): unknown {
  const segs = parsePath(path);
  if (segs.length === 0) return value;
  return setSegs(obj, segs, 0, value);
}

function setSegs(obj: unknown, segs: (string | number)[], i: number, value: unknown): unknown {
  const key = segs[i];
  if (i === segs.length - 1) {
    return cloneAndSet(obj, key, value);
  }
  const cur =
    obj && typeof obj === 'object'
      ? (obj as Record<string | number, unknown>)[key]
      : undefined;
  const nextExpectsArray = typeof segs[i + 1] === 'number';
  const child = cur !== undefined ? cur : nextExpectsArray ? [] : {};
  return cloneAndSet(obj, key, setSegs(child, segs, i + 1, value));
}

function cloneAndSet(obj: unknown, key: string | number, value: unknown): unknown {
  if (typeof key === 'number' || Array.isArray(obj)) {
    const arr = Array.isArray(obj) ? obj.slice() : [];
    arr[key as number] = value;
    return arr;
  }
  const base = obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : {};
  return { ...base, [String(key)]: value };
}

// ===== Reducers =====

export function reduceStateSet(s: ScreenState, a: StateSetAction): ScreenState {
  return setByPath(s, a.path, a.value) as ScreenState;
}

export function reduceStateMerge(s: ScreenState, a: StateMergeAction): ScreenState {
  const current = getByPath(s, a.path);
  const base = current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : {};
  const incoming = (a.value ?? {}) as Record<string, unknown>;
  return setByPath(s, a.path, { ...base, ...incoming }) as ScreenState;
}

export function reduceStateToggle(s: ScreenState, a: StateToggleAction): ScreenState {
  const current = getByPath(s, a.path);
  return setByPath(s, a.path, !current) as ScreenState;
}

export function reduceStateAppend(s: ScreenState, a: StateAppendAction): ScreenState {
  const current = getByPath(s, a.path);
  const arr = Array.isArray(current) ? current.slice() : [];
  arr.push(a.value);
  return setByPath(s, a.path, arr) as ScreenState;
}

/**
 * state.remove：按 index 删；predicate 需要表达式求值，
 * 由 Dispatcher 预先转换为 index 再调用本函数（schema 层 predicate 保留字符串）。
 */
export function reduceStateRemove(
  s: ScreenState,
  a: StateRemoveAction,
  resolvedIndex?: number,
): ScreenState {
  const current = getByPath(s, a.path);
  if (!Array.isArray(current)) return s;
  const arr = current.slice();
  const idxRaw = resolvedIndex ?? a.index;
  if (idxRaw === undefined) return s;
  const idx = idxRaw < 0 ? arr.length + idxRaw : idxRaw;
  if (idx < 0 || idx >= arr.length) return s;
  arr.splice(idx, 1);
  return setByPath(s, a.path, arr) as ScreenState;
}

// ===== 分派入口 =====

/**
 * 纯函数派发 state.* 动作。effect.* 不走这里。
 *
 * `predicateResolver` 用于 state.remove 的 predicate：
 *   上层 Dispatcher 在调用前用 expression 引擎把 predicate 解成数字 index。
 */
export function reduceStateAction(
  s: ScreenState,
  action: StateMutationAction,
  predicateResolver?: (predicate: string, items: unknown[]) => number | undefined,
): ScreenState {
  switch (action.type) {
    case 'state.set':
      return reduceStateSet(s, action);
    case 'state.append':
      return reduceStateAppend(s, action);
    case 'state.remove': {
      if (action.predicate !== undefined && predicateResolver) {
        const current = getByPath(s, action.path);
        if (Array.isArray(current)) {
          const idx = predicateResolver(action.predicate, current);
          return reduceStateRemove(s, action, idx);
        }
        return s;
      }
      return reduceStateRemove(s, action);
    }
    case 'state.merge':
      return reduceStateMerge(s, action);
    case 'state.toggle':
      return reduceStateToggle(s, action);
  }
}
