/**
 * @globallink/material-operations — 工具函数
 */

/** 深拷贝（structuredClone 兼容回退） */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

/** 生成唯一对象 ID */
export function generateObjectId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `mo_${ts}_${rand}`;
}

/** 在对象列表中查找指定 ID 的对象（不递归 group 子对象） */
export function findObjectById(
  objects: { id: string; children?: { id: string }[] }[],
  id: string,
): { id: string; children?: { id: string }[] } | undefined {
  for (const obj of objects) {
    if (obj.id === id) return obj;
    if (obj.children) {
      const found = findObjectById(obj.children as typeof objects, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** 在对象列表中查找指定 ID 的顶层索引 */
export function findObjectIndex(
  objects: { id: string }[],
  id: string,
): number {
  return objects.findIndex((o) => o.id === id);
}

/** 从数组中移除指定索引并返回被移除的元素 */
export function removeAt<T>(arr: T[], index: number): T | undefined {
  if (index < 0 || index >= arr.length) return undefined;
  return arr.splice(index, 1)[0];
}

/**
 * 运行时校验：判断未知值是否符合 MaterialOperation 的最小契约（{ type: string, params?: object }）。
 *
 * 注意：本守卫仅做 **结构性** 校验（type 是非空字符串、params 若存在则为对象），
 * 不验证 type 是否属于 30+ 联合成员之一，也不校验 params 内部字段。
 * 真正的语义校验由 MaterialOperationExecutor.execute() 在执行时完成（找不到对应 handler 即报错）。
 *
 * 使用此守卫的目的是 **替代 Controller / Service 层散落的 `as MaterialOperation` 断言**，
 * 让 unknown → MaterialOperation 的收窄通过 TS 类型系统验证，而不是强转。
 *
 * ⚠️ 守卫返回类型故意使用 `MaterialOperation` 而非 `{ type: string; params?: unknown }`，
 * 是为了让调用方在 if (isMaterialOperationLike(x)) 之后无需再做 `as MaterialOperation`。
 * 这样设计的合规性依据：本函数本质上是 JSON 反序列化入口的运行时校验
 * （AGENTS.md §1.2 明确列为 `as` 的合法例外场景），后续的 Executor.dispatch
 * 会在 type 不属于联合成员时抛错——属于"运行时是真相来源"的契约。
 */
export function isMaterialOperationLike(value: unknown): value is import('./types').MaterialOperation {
  if (value == null || typeof value !== 'object') return false;
  if (!('type' in value)) return false;
  const t = (value as { type: unknown }).type;
  if (typeof t !== 'string' || t.length === 0) return false;
  if ('params' in value) {
    const p = (value as { params: unknown }).params;
    if (p !== undefined && (typeof p !== 'object' || p === null)) return false;
  }
  return true;
}
