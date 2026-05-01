import type { ComponentNode, ComponentTemplate } from '@globallink/design-schema';
import {
  instantiateTemplate,
  isComponentInstanceType,
} from '@globallink/design-schema';

/**
 * 把组件实例节点解析为可渲染子树。
 *
 * **新架构（2026-04-30 起）**：reference 模式实例的子树**已物化在 Schema 里**
 * （由 `executeInstantiateTemplate` 在 op 写入时通过 `_nodeIds` 预生成 ID 写入），
 * 因此本函数对正常 reference 实例**直接返回 node 自身**，不再触发 ID 重生。
 *
 * 旧持久化数据中存在"轻量 reference 实例"（root + templateRef、`children` 为空）。
 * 这类节点在 `apps/design-api/.../projects.service.ts:findOne` 的迁移层会被一次性
 * 物化；本函数同时保留前端兜底：
 *
 * - 如果检测到"轻量旧实例 + 模板可用"，用**确定性派生 ID**（基于实例 root id + DFS index）
 *   现场展开。这种 ID 在所有渲染帧之间稳定，但与 DB schema 不一致——仅作"过渡期可见性"
 *   保障，不允许用户在它上面执行编辑 op（前端选区会跳到 instance 根）。
 *
 * Detached 实例：直接返回 node。
 *
 * 决策与迁移细节见
 * `design_docs/02-product/editor/07-asset-management/component-instance-id-stability.md`
 * 与 `design_docs/03-tech/editor/component-instance-id-stability.md`。
 */
export function resolveComponentInstance(
  node: ComponentNode,
  assets: ComponentTemplate[],
): ComponentNode {
  if (!isComponentInstanceType(node.type)) {
    return node;
  }
  if (!node.templateRef || node.templateRef.mode === 'detached') {
    return node;
  }

  // 新版 reference 实例：子树已经物化，直接返回。
  const hasMaterializedChildren = (node.children?.length ?? 0) > 0;
  if (hasMaterializedChildren) {
    return node;
  }

  // ===== 仅过渡期：旧轻量实例的前端兜底 =====
  const template = assets.find((t) => t.id === node.templateRef?.templateId);
  if (!template) {
    return node;
  }

  let counter = 0;
  const idGen = () => {
    if (counter === 0) {
      counter += 1;
      return node.id; // 保持实例 root id
    }
    const id = `${node.id}__legacy_${counter}`;
    counter += 1;
    return id;
  };

  const resolved = instantiateTemplate(template, { idGen });

  // 保留实例自身的 overrides（与历史行为一致）
  if (node.styles && Object.keys(node.styles).length > 0) {
    resolved.styles = { ...resolved.styles, ...node.styles };
  }
  if (node.states && node.states.length > 0) {
    resolved.states = node.states;
  }
  if (node.activeState !== 'default') {
    resolved.activeState = node.activeState;
  }
  if (node.events && node.events.length > 0) {
    resolved.events = [...(resolved.events ?? []), ...node.events];
  }
  return resolved;
}
