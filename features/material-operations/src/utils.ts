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
