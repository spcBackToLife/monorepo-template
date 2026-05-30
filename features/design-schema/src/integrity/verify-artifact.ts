/**
 * 产物指纹校验器（Schema-First 第一性原理：plan 任务 done 必须有真实产物）。
 *
 * 设计原则：
 *   - 纯函数，零副作用
 *   - 任务标 done 时由 service 端调用，校验不通过直接拒绝
 *   - 校验对象是相对根（DesignProject 或 Screen）的 schema 真值
 *   - 不会把"AI 自报"当真——schema 里没写的就是没做
 *
 * Path 语法（轻量 jsonpath，故意不引重型库）：
 *   - 普通字段：`globalOverlays`
 *   - 嵌套字段：`meta.globalConcerns.session`
 *   - 数组下标：`screens[0].rootNode.children[0]`
 *   - 数组通配：`screens[*].rootNode.children`（返回打平后的数组：所有屏的 children 拼起来）
 *   - 自身引用：`$`（仅 eachItem.check 内部使用，表示"item 自身"）
 *
 * 不支持：递归通配（`..`）、过滤表达式（`?(@.x)`）、函数。如需要，加 ArtifactCheck.kind。
 */

import type { ArtifactCheck } from '../types/meta';

// ===== 公共 API =====

export interface ArtifactVerifyResult {
  ok: boolean;
  /** 失败时的人类可读原因（含 path + 实际值摘要） */
  detail?: string;
  /** 失败的 path（便于 UI 高亮） */
  failedPath?: string;
}

/**
 * 校验单条 ArtifactCheck。
 *
 * @param root  根对象（DesignProject 或 Screen，由调用方决定）
 * @param check 任务声明的产物指纹
 */
export function verifyArtifact(root: unknown, check: ArtifactCheck): ArtifactVerifyResult {
  return runCheck(root, check);
}

/**
 * 批量校验。
 *
 * 全部通过 → ok:true / 任一失败 → ok:false 且 failures 含所有失败原因
 * （不短路：一次性把所有问题暴露出来，避免来回返工）。
 */
export function verifyArtifacts(
  root: unknown,
  checks: ArtifactCheck[],
): { ok: boolean; failures: ArtifactVerifyResult[] } {
  const failures: ArtifactVerifyResult[] = [];
  for (const check of checks) {
    const r = runCheck(root, check);
    if (!r.ok) failures.push(r);
  }
  return { ok: failures.length === 0, failures };
}

// ===== 内部实现 =====

function runCheck(root: unknown, check: ArtifactCheck): ArtifactVerifyResult {
  switch (check.kind) {
    case 'nonEmpty':
      return checkNonEmpty(root, check.path, check.message);
    case 'arrayMin':
      return checkArrayMin(root, check.path, check.min, check.message);
    case 'hasKeys':
      return checkHasKeys(root, check.path, check.keys, check.message);
    case 'eachItem':
      return checkEachItem(root, check.path, check.check, check.message);
    case 'anyNodeHasEvents':
      return checkAnyNodeHasEvents(root, check.path, check.min ?? 1, check.message);
    case 'nodeHasEvent':
      return checkNodeHasEvent(
        root,
        check.nodeId,
        check.trigger,
        check.min ?? 1,
        check.path,
        check.message,
      );
    default: {
      // exhaustive
      const _exhaust: never = check;
      void _exhaust;
      return { ok: false, detail: `Unknown ArtifactCheck kind` };
    }
  }
}

function checkNonEmpty(root: unknown, path: string, message?: string): ArtifactVerifyResult {
  const values = resolvePath(root, path);
  // 通配符可能返回多个；都必须非空
  if (values.length === 0) {
    return { ok: false, failedPath: path, detail: message ?? `path "${path}" 未取到任何值` };
  }
  for (const v of values) {
    if (isEmpty(v)) {
      return {
        ok: false,
        failedPath: path,
        detail: message ?? `path "${path}" 为空（${describeValue(v)}）`,
      };
    }
  }
  return { ok: true };
}

function checkArrayMin(
  root: unknown,
  path: string,
  min: number,
  message?: string,
): ArtifactVerifyResult {
  const values = resolvePath(root, path);
  if (values.length === 0) {
    return { ok: false, failedPath: path, detail: message ?? `path "${path}" 未取到任何值` };
  }
  for (const v of values) {
    if (!Array.isArray(v)) {
      return {
        ok: false,
        failedPath: path,
        detail: message ?? `path "${path}" 不是数组（实际为 ${describeValue(v)}）`,
      };
    }
    if (v.length < min) {
      return {
        ok: false,
        failedPath: path,
        detail: message ?? `path "${path}" 数组长度 ${v.length} < 期望 ${min}`,
      };
    }
  }
  return { ok: true };
}

function checkHasKeys(
  root: unknown,
  path: string,
  keys: string[],
  message?: string,
): ArtifactVerifyResult {
  const values = resolvePath(root, path);
  if (values.length === 0) {
    return { ok: false, failedPath: path, detail: message ?? `path "${path}" 未取到任何值` };
  }
  for (const v of values) {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      return {
        ok: false,
        failedPath: path,
        detail: message ?? `path "${path}" 不是对象（实际为 ${describeValue(v)}）`,
      };
    }
    const obj = v as Record<string, unknown>;
    const missing = keys.filter((k) => isEmpty(obj[k]));
    if (missing.length > 0) {
      return {
        ok: false,
        failedPath: path,
        detail:
          message ?? `path "${path}" 缺少非空键: [${missing.join(', ')}]`,
      };
    }
  }
  return { ok: true };
}

function checkEachItem(
  root: unknown,
  path: string,
  itemCheck: ArtifactCheck,
  message?: string,
): ArtifactVerifyResult {
  const values = resolvePath(root, path);
  if (values.length === 0) {
    return { ok: false, failedPath: path, detail: message ?? `path "${path}" 未取到任何值` };
  }
  for (const v of values) {
    if (!Array.isArray(v)) {
      return {
        ok: false,
        failedPath: path,
        detail: message ?? `path "${path}" 不是数组（实际为 ${describeValue(v)}）`,
      };
    }
    for (let i = 0; i < v.length; i++) {
      const item = v[i];
      // 把 itemCheck.path 中的 "$" 替换为绝对取值（直接对 item 走 check）
      const r = runCheckOnItem(item, itemCheck);
      if (!r.ok) {
        return {
          ok: false,
          failedPath: `${path}[${i}]${r.failedPath && r.failedPath !== '$' ? '.' + r.failedPath : ''}`,
          detail:
            message ??
            `path "${path}[${i}]" item 校验失败：${r.detail ?? ''}`,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * checkAnyNodeHasEvents —— 子树搜索式校验：从 path 起的节点子树（含自身、children、repeat.template）
 * 内必须至少有 `min` 个节点带"真交互"（events 中存在 trigger 合法且 actions.length>0 的项）。
 *
 * 与其他纯路径解析式 check 不同，本 check 主动遍历节点树。这是为了从结构上回答
 * 「这块界面有没有真正的交互」，取代旧的 R-EVENTS-01 关键词启发式。
 *
 * 节点判定规则（纯结构）：
 *   - 形如 ComponentNode：拥有 `events` 数组字段（数组）和 `children` / `repeat` 字段之一
 *   - 真交互 event：`event.actions` 是非空数组（不限制 trigger 类型，因为所有合法 EventTrigger
 *     都可携带 actions——blur/focus/screenEnter 等同样是真交互行为）
 */
function checkAnyNodeHasEvents(
  root: unknown,
  path: string,
  min: number,
  message?: string,
): ArtifactVerifyResult {
  const values = resolvePath(root, path);
  if (values.length === 0) {
    return { ok: false, failedPath: path, detail: message ?? `path "${path}" 未取到任何值` };
  }

  let totalCount = 0;
  for (const v of values) {
    totalCount += countNodesWithRealEvents(v);
    if (totalCount >= min) return { ok: true };
  }

  return {
    ok: false,
    failedPath: path,
    detail:
      message ??
      `path "${path}" 子树内仅找到 ${totalCount} 个带真交互的节点（events[i].actions 非空），期望 ≥ ${min}`,
  };
}

/** 递归遍历节点树，统计带"真交互"的节点数。任何形如节点的对象都进入；非节点对象忽略。 */
function countNodesWithRealEvents(node: unknown): number {
  if (node == null || typeof node !== 'object' || Array.isArray(node)) return 0;
  const obj = node as Record<string, unknown>;

  let count = 0;
  if (Array.isArray(obj.events)) {
    const hasReal = (obj.events as unknown[]).some((ev) => {
      if (ev == null || typeof ev !== 'object') return false;
      const actions = (ev as Record<string, unknown>).actions;
      return Array.isArray(actions) && actions.length > 0;
    });
    if (hasReal) count += 1;
  }

  if (Array.isArray(obj.children)) {
    for (const c of obj.children as unknown[]) count += countNodesWithRealEvents(c);
  }
  // repeat.template 也是节点子树
  const repeat = obj.repeat;
  if (repeat && typeof repeat === 'object') {
    const tpl = (repeat as Record<string, unknown>).template;
    if (tpl) count += countNodesWithRealEvents(tpl);
  }
  return count;
}

/**
 * checkNodeHasEvent —— 翻译契约（DAM）的精确指纹。
 *
 * 在 path 起的节点子树内深度优先查找 id===nodeId 的节点，校验其 events 满足条件：
 *   - actions 非空的 event 数 ≥ min（默认 1）
 *   - 若指定 trigger，则要求至少 1 个 event.trigger === trigger 且 actions 非空
 *
 * path 不传时缺省按 'rootNode'（最常用：屏级 events 翻译契约）。
 */
function checkNodeHasEvent(
  root: unknown,
  nodeId: string,
  trigger: string | undefined,
  min: number,
  path: string | undefined,
  message?: string,
): ArtifactVerifyResult {
  const searchRoot = path && path.length > 0 ? path : 'rootNode';
  const values = resolvePath(root, searchRoot);
  if (values.length === 0) {
    return { ok: false, failedPath: searchRoot, detail: message ?? `path "${searchRoot}" 未取到任何值` };
  }

  let target: Record<string, unknown> | null = null;
  for (const v of values) {
    target = findNodeById(v, nodeId);
    if (target) break;
  }
  if (!target) {
    return {
      ok: false,
      failedPath: `${searchRoot}#${nodeId}`,
      detail: message ?? `子树 "${searchRoot}" 中未找到 id="${nodeId}" 的节点`,
    };
  }

  const events = Array.isArray(target.events) ? (target.events as unknown[]) : [];
  let realCount = 0;
  let triggerHit = 0;
  for (const ev of events) {
    if (ev == null || typeof ev !== 'object') continue;
    const evObj = ev as Record<string, unknown>;
    const actions = evObj.actions;
    const hasRealActions = Array.isArray(actions) && actions.length > 0;
    if (!hasRealActions) continue;
    realCount += 1;
    if (trigger && evObj.trigger === trigger) triggerHit += 1;
  }

  if (trigger) {
    if (triggerHit < min) {
      return {
        ok: false,
        failedPath: `${searchRoot}#${nodeId}.events[trigger="${trigger}"]`,
        detail:
          message ??
          `节点 "${nodeId}" 期望 ≥ ${min} 个 trigger="${trigger}" 且 actions 非空的 event，实际 ${triggerHit} 个`,
      };
    }
  } else if (realCount < min) {
    return {
      ok: false,
      failedPath: `${searchRoot}#${nodeId}.events`,
      detail:
        message ??
        `节点 "${nodeId}" 期望 ≥ ${min} 个 actions 非空的 event，实际 ${realCount} 个`,
    };
  }
  return { ok: true };
}

/** 深度优先按 id 查节点（含 children 与 repeat.template） */
function findNodeById(node: unknown, nodeId: string): Record<string, unknown> | null {
  if (node == null || typeof node !== 'object' || Array.isArray(node)) return null;
  const obj = node as Record<string, unknown>;
  if (obj.id === nodeId) return obj;

  if (Array.isArray(obj.children)) {
    for (const c of obj.children as unknown[]) {
      const hit = findNodeById(c, nodeId);
      if (hit) return hit;
    }
  }
  const repeat = obj.repeat;
  if (repeat && typeof repeat === 'object') {
    const tpl = (repeat as Record<string, unknown>).template;
    if (tpl) {
      const hit = findNodeById(tpl, nodeId);
      if (hit) return hit;
    }
  }
  return null;
}

/** eachItem 内部把 item 当根；check.path === '$' 代表 item 自身 */
function runCheckOnItem(item: unknown, check: ArtifactCheck): ArtifactVerifyResult {
  if (check.path === '$') {
    // 直接对 item 跑同 kind 校验
    const lifted: ArtifactCheck = { ...check, path: '__self__' } as ArtifactCheck;
    const wrapped = { __self__: item };
    const r = runCheck(wrapped, lifted);
    if (!r.ok) {
      return { ...r, failedPath: '$' };
    }
    return r;
  }
  return runCheck(item, check);
}

// ===== Path resolver =====

/**
 * 解析 path 取值，返回数组（可能 0/1/N 个）。
 *
 * 0 个：path 走不到（中途 undefined）
 * 1 个：常规路径
 * N 个：含 `[*]` 通配
 */
export function resolvePath(root: unknown, path: string): unknown[] {
  if (path === '' || path === '$') return [root];

  const segments = parsePath(path);
  let current: unknown[] = [root];

  for (const seg of segments) {
    const next: unknown[] = [];
    for (const cur of current) {
      if (cur == null) continue;
      if (seg.kind === 'key') {
        if (typeof cur === 'object' && !Array.isArray(cur)) {
          next.push((cur as Record<string, unknown>)[seg.key]);
        }
      } else if (seg.kind === 'index') {
        if (Array.isArray(cur)) {
          next.push(cur[seg.index]);
        }
      } else if (seg.kind === 'wildcard') {
        if (Array.isArray(cur)) {
          for (const item of cur) next.push(item);
        }
      }
    }
    current = next;
  }

  return current.filter((v) => v !== undefined);
}

type PathSeg =
  | { kind: 'key'; key: string }
  | { kind: 'index'; index: number }
  | { kind: 'wildcard' };

function parsePath(path: string): PathSeg[] {
  const segs: PathSeg[] = [];
  let i = 0;
  let buf = '';

  const flushKey = () => {
    if (buf.length > 0) {
      segs.push({ kind: 'key', key: buf });
      buf = '';
    }
  };

  while (i < path.length) {
    const ch = path[i]!;
    if (ch === '.') {
      flushKey();
      i++;
    } else if (ch === '[') {
      flushKey();
      const end = path.indexOf(']', i);
      if (end < 0) throw new Error(`Invalid path "${path}": missing ]`);
      const inside = path.slice(i + 1, end).trim();
      if (inside === '*') {
        segs.push({ kind: 'wildcard' });
      } else {
        const n = Number(inside);
        if (!Number.isInteger(n)) {
          throw new Error(`Invalid path "${path}": bracket "${inside}" is not integer or *`);
        }
        segs.push({ kind: 'index', index: n });
      }
      i = end + 1;
    } else {
      buf += ch;
      i++;
    }
  }
  flushKey();
  return segs;
}

// ===== Helpers =====

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function describeValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return `array(len=${v.length})`;
  if (typeof v === 'object') return `object(keys=${Object.keys(v as object).length})`;
  if (typeof v === 'string') return `string("${v.slice(0, 30)}${v.length > 30 ? '…' : ''}")`;
  return String(v);
}
