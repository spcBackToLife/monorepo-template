# 严禁本阶段写的字段（边界表）

每条字段都明确"留给哪个下游"。AI 在落 schema 时若动了这些字段 → 失败。

## 节点级（写到 styles 任何属性都是错）

| 字段 | 留给 | 原因 |
|------|-----|------|
| `node.styles.*` | design | 所有视觉属性 |
| `node.states[]`（VisualState）| design | hover/pressed/focus 等视觉态 |
| `node.animation` | design | CSS / 外部动画配置 |
| `node.materialProjectId` | executor | 素材绑定产物 |
| `node.editorMetadata` | design | 编辑期角色提示 |
| `node.constraints` | design | 布局约束 |
| `node.templateRef` | design | 模板引用 |
| `node.componentBoundary` | design | 组件边界标记 |
| `node.meta.design.*` | design | 视觉决策 |
| `node.meta.design.materialSpec` | design / executor | 素材规格 |

## 屏级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `screen.backgroundColor` | design | 视觉决策 |
| `screen.stateInit.view.*.previewValue` | design | 编辑期预览值 |
| `screen.meta.design.*` | design | 视觉决策（layers / componentBudgets / palette / summary）|

## 项目级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `project.theme` / `project.themeConfig` | theme-generator | 全部 token / decoration |
| `project.componentAssets` | design | 通用组件模板 |

## 重组上游骨架

| 操作 | 是否允许 |
|------|:-------:|
| 在已有屏追加节点（衍生视图 / overlay 占位）| ✅ |
| 修改自己刚建的节点 | ✅ |
| 移动 / 删除 / 包裹 product 阶段已建的业务骨架节点 | ❌（如发现真有问题，退回 product-analyst 修）|
| 修改 product 阶段已写的 `meta.product.*` | ❌（这是产品契约，不可改）|
| 修改 product 阶段已声明的 dataSource.endpoint / typeDef | ❌（如发现接口契约错，退回 product-analyst 修）|

## 静态文案 vs 动态文案

**静态文案**（不变） → ✅ 由 product 阶段写在 `props.textContent`：
```jsonc
{ type: "button", name: "SubmitBtn", props: { textContent: "登录" } }
```

**动态文案**（依赖 state） → ✅ **interaction 阶段写**（product 阶段不写）：
```jsonc
{ type: "div", props: { textContent: "{{state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}" } }
```

```jsonc
// MCP
component_prop/update_props {
  projectId, nodeId,
  props: {
    placeholder: "{{state.view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}"
  }
}
```

## 装饰节点

| 类型 | 例子 | 是否本阶段建 |
|------|------|:------:|
| 业务骨架节点 | FormCard / SubmitBtn / PhoneInput | ❌ product 已建 |
| 衍生视图节点 | LoadingOverlay / EmptyState / ErrorBanner / OrderPendingPaymentView | ✅ interaction 建 |
| 装饰节点 | PinkCircleDeco / GradientGlow / CornerBlob / OrnamentSeparator | ❌ design 建 |

## 自检（落 schema 前 mental check）

写一行 schema 前问自己：

1. 这个字段是不是 styles / visualStates / animation？→ 如果是，停。
2. 这个节点是不是装饰节点（无业务/无运行时显隐含义）？→ 如果是，停。
3. 这个改动是不是动了 product 已建的节点（move/wrap/remove）→ 如果是，停。
4. 这个 dataSource 是不是 product 没建的（要 add 新 ds）→ 如果是，停，退回 product。
5. 这个 endpoint / typeDef 是不是要改 → 如果是，停，退回 product。

任何一个"停" → 不写。在 md 中说明退回上游的原因。
