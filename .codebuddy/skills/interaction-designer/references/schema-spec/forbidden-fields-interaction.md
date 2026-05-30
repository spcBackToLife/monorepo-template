# 严禁本阶段写的字段（边界表）

每条字段都明确"留给哪个下游"。AI 在落 schema 时若动了这些字段 → 失败。

## 节点级（写到 styles 任何属性都是错——但派生展示节点有窄白名单，见末尾）

| 字段 | 留给 | 原因 |
|------|-----|------|
| `node.styles.*` | design | 所有视觉属性（**例外见末尾 §派生展示节点 minimal-debug styles 白名单**）|
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
| 移动 / 删除 / 包裹 product 阶段已建的业务骨架节点 | ❌（如发现真有问题，**优先走 SKILL §5.5 UpstreamChallenge 协议**；只有 typo 级真错误走旧式口头退回 product-analyst）|
| 修改 product 阶段已写的 `meta.product.*` | ❌（这是产品契约，不可改）|
| 修改 product 阶段已声明的 dataSource.endpoint / typeDef | ❌（如发现接口契约错，优先走 UpstreamChallenge 协议）|
| 写 dataSource.endpoint.networkPolicy（v2.6 ★：timeout/retry）| ✅（interaction 阶段职责，由 datasources 任务通过 `data_source/set_network_policy` 落）|

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
3. 这个改动是不是动了 product 已建的节点（move/wrap/remove）→ 如果是，停。**优先走 SKILL §5.5 UpstreamChallenge 协议**（写 challenge md → raise）；典型场景：业务状态分支视图需要 wrap 已建子树。
4. 这个 dataSource 是不是 product 没建的（要 add 新 ds）→ 如果是，停。优先走 UpstreamChallenge 协议；只有上游漏建是显然失误才走旧式退回。
5. 这个 endpoint / typeDef 是不是要改 → 如果是，停。优先走 UpstreamChallenge 协议（接口契约改动影响面大，必须留痕）。

任何一个"停" → 不写。**优先**走 UpstreamChallenge 协议（带留痕的双向回流），**只有**上游 typo 级真错误才走旧式口头退回。

---

## 派生展示节点 minimal-debug styles 白名单（v2.5 ★）

### 背景

interaction 阶段建的"派生展示节点"（PhoneError / CredentialError / 各类 InlineFieldError / Toast 文案位 / 倒计时位 等）一旦 styles 完全空：

- 节点会被默认渲染成黑色小字 / 高度塌成 0 / 没有间距
- 用户预览时**看不到错误反馈**，但 schema 又确实落了 `state.set view.errors.*` + `visibleWhen` 全部正确
- AI 自审"翻译契约 todo 全勾完"，但用户实操**根本没看到**——闭环被打破

第一性原理：interaction 阶段的"决策翻译完成"必须能被立即预览验证，不能等到 design 阶段才出现视觉。否则两个阶段之间出现"事前看不到 + 事后才发现漏" 的盲区。

### 白名单（仅限派生展示节点）

满足以下条件的节点允许写一组**最小调试 styles**：
1. 节点是 interaction 阶段建的（不是 product 已建的业务骨架节点）
2. 节点的本质是"派生显示文案 / icon / 提示位"（无业务交互、无业务数据载体）
3. 满足以下 meta.interaction.kind 之一（或写入 meta.interaction.summary 含明确角色描述）：
   - `inline-error`（行内错误提示位）
   - `inline-hint`（行内辅助提示位）
   - `inline-success`（成功提示位）
   - `countdown-text`（倒计时文案位）
   - `spinner`（按钮内/区域内 spinner）
   - `toast-text`（屏内 Toast 文案位——若不走 ui.showToast 而是建节点）

允许写入的 styles 属性（**仅这 7 个**）：

| 属性 | 用途 | 推荐取值 |
|------|------|---------|
| `color` | 文字色 | `#ef4444` / `#16a34a` / `#6b7280`（错误/成功/提示）|
| `fontSize` | 字号 | `12px` / `13px`（小号辅助文字）|
| `lineHeight` | 行高 | `1.4` / `1.5` |
| `marginTop` | 上间距 | `4px` / `6px` |
| `marginBottom` | 下间距 | `4px` |
| `minHeight` | 最小高度（防空内容塌陷）| `16px` / `20px` |
| `padding` | 内边距 | `2px 4px` |

**严禁**写白名单外的 styles 属性（如 `backgroundColor / border / boxShadow / fontWeight / textAlign`）——这些是 design 阶段视觉决策。

### 设计自由度边界

minimal-debug styles 不是"interaction 做了一半视觉"，而是**让逻辑层产物可被验证**。design 阶段会用主题 token 完整覆盖（color 用 `$token:colors.error`、字号用 `$token:typography.body-sm` 等），不会冲突。

任何超出 7 属性 / 超出 6 类派生节点角色的 styles 写入 → 视为越界 → 退回不允许。

### MCP 写入示例

```jsonc
// PhoneError 节点（meta.interaction.summary 含 "inline-error"）
style/update {
  projectId, nodeId: "nd_905bbf8e...",
  styles: {
    color: "#ef4444",
    fontSize: "12px",
    lineHeight: "1.4",
    marginTop: "4px",
    minHeight: "16px"
  }
}
```

### 红线（design 阶段也读这条边界）

design 阶段执行 `style/update` 等改写 styles 时：
- 若节点已有 minimal-debug styles，直接深合并覆盖（color / fontSize 等可覆盖到 token 引用）
- 不要因为"看到 styles 已经有内容"就跳过——design 必须把 token 化补完整
- design 阶段产出后 minimal-debug styles 应转为 token 引用（如 `color: '$token:colors.error'`）
