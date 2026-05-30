/**
 * 严格 ID 契约断言（Schema-First v2.3 ★）。
 *
 * 不变量：
 *   所有创建节点 / 屏幕的 reducer 禁止内部生成 id；id 必须由 `ensureDeterministicIds`
 *   在写路径前置中间件预生成并写入 op.params。reducer 执行时若发现某个应当存在的
 *   id 字段缺失，**立即抛错**——这是 ensureDeterministicIds 漏 case 的硬性证据，
 *   绝不能静默 fallback 到 generateNodeId（会污染 op 日志，导致重放产生新 id）。
 *
 * 唯一合法的 id 生成位置：
 *   `apps/design-api/src/operations/operations.service.ts` 中的 `ensureDeterministicIds`
 *   函数（被 OperationsService.execute / executeBatch 在 op 入 DB 前调用一次）。
 *
 * 详见 design_docs/03-tech/editor/component-instance-id-stability.md。
 */

/**
 * 断言一个 id 字段已被 ensureDeterministicIds 预生成。
 *
 * @param id    op.params 中的 id 字段值
 * @param opType  op.type，错误信息用，便于定位
 * @param field   字段名，错误信息用
 * @throws 当 id 为 undefined / null / 空串时抛错（指引修 ensureDeterministicIds）
 */
export function assertPregeneratedId(
  id: string | undefined | null,
  opType: string,
  field: string,
): asserts id is string {
  if (typeof id === 'string' && id.length > 0) return;
  throw new Error(
    `[Schema-First v2.3] ID contract violation: op "${opType}" missing pregenerated "${field}". ` +
      `Fix: add a case in apps/design-api/src/operations/operations.service.ts → ensureDeterministicIds() ` +
      `to pre-generate this id before op execution. ` +
      `See design_docs/03-tech/editor/component-instance-id-stability.md.`,
  );
}

/**
 * 断言一个 id 数组已被 ensureDeterministicIds 预填满指定长度。
 *
 * @param ids       op.params 中的 id 数组（可能 undefined）
 * @param required  必须的最少长度
 * @param opType    op.type
 * @param field     字段名
 */
export function assertPregeneratedIdArray(
  ids: string[] | undefined | null,
  required: number,
  opType: string,
  field: string,
): asserts ids is string[] {
  if (Array.isArray(ids) && ids.length >= required) {
    for (let i = 0; i < required; i += 1) {
      const v = ids[i];
      if (typeof v !== 'string' || v.length === 0) {
        throw new Error(
          `[Schema-First v2.3] ID contract violation: op "${opType}" "${field}[${i}]" is not a valid pregenerated id. ` +
            `Fix: ensureDeterministicIds must populate all entries up to length ${required}.`,
        );
      }
    }
    return;
  }
  throw new Error(
    `[Schema-First v2.3] ID contract violation: op "${opType}" missing pregenerated "${field}" ` +
      `(required length ${required}, got ${ids?.length ?? 0}). ` +
      `Fix: add / extend a case in apps/design-api/src/operations/operations.service.ts → ensureDeterministicIds() ` +
      `to pre-generate this id array before op execution.`,
  );
}
