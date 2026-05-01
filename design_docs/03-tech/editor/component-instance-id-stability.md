# 技术 ADR · 组件实例稳定 ID 与子树物化

> 配套产品决策：[02-product/editor/07-asset-management/component-instance-id-stability.md](../../02-product/editor/07-asset-management/component-instance-id-stability.md)
> 决策日志：[#19](../../05-decisions/decision-log.md)

---

## 一、问题与目标

**Bug**：组件实例（reference 模式）的子节点 ID 由 `resolveComponentInstance()` → `instantiateTemplate()` → `regenerateIds()` 在每次渲染时新生成，UI 选中的 ID 在持久态 Schema 里根本不存在 → 任何针对实例子节点的 op 报"Element not found"。

**目标**：

1. 渲染期**绝不**生成节点 ID。
2. `generateNodeId` 调用收敛到三类合法入口：
   - **A** 用户/Agent 创建新实体（前端交互、MCP 工具）
   - **B** 服务端 `ensureDeterministicIds` 兜底（DB 写入前一次性）
   - **C** Operation executor 内部按 op.params 已就绪的 ID 复用（不再新生成）
3. 任何"涉及子树展开"的 op（`instantiateTemplate` / `duplicateElement` / `insertSubtree`）的子节点 ID 全部在 op 写入 DB 前就**预生成并写回 op.params**，确保事件溯源严格幂等。
4. 历史数据零损失迁移。

---

## 二、ID 生成调用点全图（修改前 → 修改后）

| 调用点 | 旧行为 | 新行为 |
|---|---|---|
| `features/design-schema/src/utils/id.ts` | `generateNodeId()` 唯一实现 | **不变** |
| `features/design-schema/src/assets/index.ts:regenerateIds` | 私有函数，遍历整树调 `generateNodeId` | **接受可选 `idGen` 参数**；默认仍为 `generateNodeId`；导出供 op executor 使用确定性生成器 |
| `features/design-schema/src/assets/index.ts:instantiateTemplate` | 内部 `regenerateIds(template.schema)` | **签名加 `options?: { idGen?: () => string }`**；默认仍随机；op executor 显式传入预生成 map |
| **`features/design-engine/src/assets/resolveInstance.ts`** | reference 模式调 `instantiateTemplate(template)` 重生 ID | **reference 模式直接返回 `node`**（子树已经常驻 Schema，由 op 物化）；template 不再被读 |
| **`features/design-operations/src/operations/asset.ts:executeInstantiateTemplate`** | 调 `instantiateTemplate(template)` 写入 schema | 改为：从 `params._childIdMap`（path → id 字典）按确定性顺序为子节点分配 ID，写入完整子树 |
| **`features/design-operations/src/operations/element.ts:executeDuplicateElement`** | 子节点用 `generateNodeId()` 现场生成（不写回 params） | 改为：从 `params._childIdMap` 取 ID，executor 不再调 `generateNodeId` |
| `features/design-operations/src/operations/element.ts:executeInsertSubtree` | caller 责任：subtree 内 ID 已确定 | **不变**（前端 paste、MCP `insertSubtree` 都已经预 walkTree 重写 ID） |
| **`apps/design-api/src/operations/operations.service.ts:ensureDeterministicIds`** | 仅处理 root ID | 增加：`instantiateTemplate` / `duplicateElement` 在调用前 **预 walk template/source 子树**，给每个子节点 path 生成 ID，存入 `params._childIdMap` |
| 前端各 `executeAddElement` 入口 | 不变 | 不变 |

> **关键不变量**：op 写入 DB 时，op.params 必须包含执行该 op 所需的全部 ID。executor 不允许在 deterministic 路径上调用 `generateNodeId()`。

---

## 三、改动详细规格

### 3.1 `regenerateIds` / `instantiateTemplate` 接受确定性 ID 生成器

```ts
// features/design-schema/src/assets/index.ts

export interface InstantiateOptions {
  /**
   * 确定性 ID 生成器：按 walkTree 的 DFS 顺序被调用。
   * 不传则默认用随机的 generateNodeId（仅用于"轻量 demo / 测试 / 老路径"）。
   *
   * 生产路径必须由 op executor 传入预生成的 ID 序列，确保重放幂等。
   */
  idGen?: () => string;
}

function regenerateIds(node: ComponentNode, options?: InstantiateOptions): ComponentNode {
  const cloned = deepClone(node);
  const gen = options?.idGen ?? generateNodeId;
  walkTree(cloned, (n) => { n.id = gen(); });
  return cloned;
}

export function instantiateTemplate(
  template: ComponentTemplate,
  options?: InstantiateOptions,
): ComponentNode {
  const instance = regenerateIds(template.schema, options);
  instance.templateRef = { templateId: template.id, mode: 'reference' };
  instance.type = `component:${template.name}`;
  return instance;
}
```

### 3.2 `executeInstantiateTemplate` 用 params 里的 ID 序列

`InstantiateTemplateOp.params` 增加可选字段：

```ts
// features/design-operations/src/types.ts
export interface InstantiateTemplateOp {
  type: 'instantiateTemplate';
  params: {
    templateId: string;
    parentId: string;
    position?: number;
    mode?: 'reference' | 'detached';

    /** 由 ensureDeterministicIds 预生成：DFS 顺序的 ID 序列（含 root） */
    _nodeIds?: string[];
  };
}
```

executor:

```ts
const ids = params._nodeIds ?? [];
let i = 0;
const idGen = () => ids[i++] ?? generateNodeId(); // fallback 仅用于直接 in-memory 调用未走 ensureDeterministicIds 的场景
const instance = instantiateTemplate(template, { idGen });
```

### 3.3 `executeDuplicateElement` 同理

```ts
export interface DuplicateElementOp {
  type: 'duplicateElement';
  params: {
    elementId: string;
    newElementId?: string;
    /** DFS 顺序的子节点 ID 序列（不含 root，root 用 newElementId） */
    _childIds?: string[];
  };
}
```

executor:

```ts
let i = 0;
const childIds = params._childIds ?? [];
let isFirst = true;
walkTree(cloned, (n) => {
  if (isFirst) { n.id = params.newElementId!; isFirst = false; }
  else { n.id = childIds[i++] ?? generateNodeId(); }
});
```

### 3.4 `ensureDeterministicIds` 预生成子节点 ID

服务端在 op 入 DB 前需要"预跑一遍 schema"才能拿到子树形状。为此 `ensureDeterministicIds` 升级签名：

```ts
function ensureDeterministicIds(operation: Operation, project: DesignProject): void {
  // 已有 case 不变 ...

  case 'instantiateTemplate': {
    const tpl = project.componentAssets.find(t => t.id === p.templateId);
    if (tpl && !p._nodeIds) {
      const ids: string[] = [];
      walkTree(tpl.schema, () => ids.push(generateNodeId()));
      p._nodeIds = ids;
    }
    break;
  }

  case 'duplicateElement': {
    if (!p.newElementId) p.newElementId = generateNodeId();
    if (!p._childIds) {
      const node = findNodeInProject(project, p.elementId as string);
      if (node) {
        const ids: string[] = [];
        let first = true;
        walkTree(node, () => { if (first) first = false; else ids.push(generateNodeId()); });
        p._childIds = ids;
      }
    }
    break;
  }
}
```

调用点：`OperationsService.execute()` 把 `await this.projects.findOne(projectId)` 提到 `ensureDeterministicIds` 之前。

### 3.5 `resolveComponentInstance` 简化

```ts
// features/design-engine/src/assets/resolveInstance.ts
export function resolveComponentInstance(
  node: ComponentNode,
  _assets: ComponentTemplate[], // 保留参数仅为兼容，不再使用
): ComponentNode {
  return node; // reference 实例的子树已经物化在 Schema 里
}
```

（保留函数本身和调用点，避免大面积 import 变化；后续可标 `@deprecated` 并最终移除调用。）

---

## 四、迁移：旧"轻量 reference 实例" → 新"完整子树"

### 4.1 检测

任意 `node` 满足：

- `isComponentInstanceType(node.type)`
- `node.templateRef?.mode === 'reference'`
- `(node.children?.length ?? 0) === 0`
- 对应 template 的 `template.schema.children?.length > 0`

→ 该节点属于"旧轻量实例"，需要迁移。

### 4.2 时机

**惰性迁移 + 一次性 patch**：

- 后端 `ProjectsService.findOne` 返回项目快照前，对每个 screen `walkTree` 一遍：
  - 命中"旧轻量实例" → 调 `instantiateTemplate(template)` 把展开后的子树 splice 进当前节点
  - 同步发起一条 `_migrateInstantiate` 内部 op 入库（含 `_nodeIds`），让历史 op 链一致
- 前端拿到的项目自然是"已物化"版本，无感知

如果不愿意改后端，**前端 fallback** 也可：`resolveComponentInstance` 在检测到"旧轻量实例 + 有 template + 无 children" 时仍跑一次 `instantiateTemplate`，但**ID 用稳定 hash**（`templateChildIndex` + `instance.id`），而非 `generateNodeId()`。这种 ID 在所有渲染帧之间稳定，但与 DB schema 不同步，操作子节点仍会失败。

→ **强烈建议走后端惰性迁移路径**，这是真正"改一次以后再不管"的方案。

### 4.3 数据安全

- 所有迁移在 `ProjectsService.findOne` 的快照构建阶段做，**不直接修改 DB 表**
- 同步的 `_migrateInstantiate` op 写入 `design_operations` 表，version + 1
- 失败时回滚（事务），不影响读
- 老 op 链的 `instantiateTemplate(无 _nodeIds)` 在 executor 中触发 fallback `generateNodeId`，但仅在历史快照重建期间执行，结果立即被 `_migrateInstantiate` 覆盖

---

## 五、改动文件清单

| # | 文件 | 修改 |
|---|---|---|
| 1 | `features/design-schema/src/assets/index.ts` | `regenerateIds` / `instantiateTemplate` 加 `InstantiateOptions` |
| 2 | `features/design-schema/src/index.ts` | 导出 `InstantiateOptions` |
| 3 | `features/design-operations/src/types.ts` | `InstantiateTemplateOp.params._nodeIds`、`DuplicateElementOp.params._childIds` |
| 4 | `features/design-operations/src/operations/asset.ts` | `executeInstantiateTemplate` 用 `_nodeIds` |
| 5 | `features/design-operations/src/operations/element.ts` | `executeDuplicateElement` 用 `_childIds` |
| 6 | `features/design-engine/src/assets/resolveInstance.ts` | reference 直接返回 node，加迁移说明注释 |
| 7 | `apps/design-api/src/operations/operations.service.ts` | `ensureDeterministicIds(op, project)` 升级签名；预生成子节点 ID |
| 8 | `apps/design-api/src/projects/projects.service.ts` | `findOne` 调 `migrateLegacyInstances(project)`，必要时写入 `_migrateInstantiate` op |
| 9 | `features/design-operations/src/operations/asset.ts`（新） | `_migrateInstantiate` 内部 op：等价 `executeInstantiateTemplate` 但允许 `parentId/position` 指向已有子树位置 |

---

## 六、验证

1. **现有项目**：删除组件实例的子节点 → 成功（不再 "Element not found"）
2. **新建组件实例**：拖入模板 → 子节点 ID 与 op.params._nodeIds 完全一致；刷新页面后子节点 ID 不变
3. **重放**：从快照前一段 op 重放整个项目 → 最终 schema 与活动 schema 完全一致（包含所有子节点 ID）
4. **同步模板**：手动 `syncInstance` → 实例子树被替换为最新模板（这是预期行为；新子树用新随机 ID 即可，因为这是一次显式的"重新实例化"）
5. **复制节点 / 粘贴节点**：子节点 ID 全部稳定、可重放
6. **MCP 链路**：`instantiateTemplate` MCP tool → 后端 ensureDeterministicIds 自动补 `_nodeIds`，前端读到的子节点 ID 即可直接用作后续 op

---

## 七、后续可选（不在本次范围）

- 标 `resolveComponentInstance` 为 `@deprecated`，逐步移除调用点
- 引入 `_migrateInstantiate` 的反向 op，支持迁移本身可被 undo（实际可不做：迁移结果是确定性的）
- 模板更新时弹窗"X 个引用实例可同步"
