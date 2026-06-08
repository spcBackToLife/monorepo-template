# 严禁本阶段写的字段（边界表）

每条字段都明确"留给哪个下游"。AI 在落 schema 时若动了这些字段 → 失败。

## 节点级（写到 styles 任何属性都是错）

| 字段 | 留给 | 原因 |
|------|-----|------|
| `node.styles.*` | design | 所有视觉属性 |
| `node.states[]`（VisualState） | design | hover/pressed/focus 等视觉态 |
| `node.events[]` | interaction | 触发器 + actions |
| `node.bind` | interaction | 受控双向绑定 |
| `node.repeat` | interaction | 列表绑定 |
| `node.visibleWhen` | interaction | 动态显隐表达式 |
| `node.props.textContent`（含 `{{state.x}}` 表达式部分）| interaction | 状态驱动文案 |
| `node.animation` | design | CSS / 外部动画 |
| `node.materialProjectId` | executor | 素材绑定产物 |
| `node.editorMetadata` | design | 编辑期角色提示 |
| `node.constraints` | design | 布局约束 |
| `node.templateRef` | design | 模板引用 |
| `node.componentBoundary` | design | 组件边界标记 |

## 屏级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `screen.backgroundColor` | design | 视觉决策 |
| `screen.overlays` | interaction | 运行时显隐（屏级 Modal/Sheet/Drawer/Toast）|
| `screen.stateInit.view.*.previewValue` | design | 编辑期预览值 |
| `screen.stateInit.view` 中的派生态（errors / canSubmit / 等）| interaction | 派生态是交互行为 |

## 数据源

| 字段 | 留给 | 原因 |
|------|-----|------|
| `dataSources[*].mock` | interaction | mock 场景设计 |
| `dataSources[*].defaultParams` | interaction | 默认参数 |
| `dataSources[*].autoFetchOnEnter` | interaction | 自动 fetch 策略 |

## 项目级

| 字段 | 留给 | 原因 |
|------|-----|------|
| `project.theme` / `project.themeConfig` | theme-generator | 全部 token / decoration |
| `project.componentAssets` | design | 通用组件模板 |

## 文案的特殊规则

**静态文案**（不变） → ✅ 写在 `props.textContent`：
```jsonc
{ type: "button", name: "SubmitBtn", props: { textContent: "登录" } }
```

**动态文案**（依赖 state） → ❌ 不写，留给 interaction：
```jsonc
// ❌ 本阶段不要写：
{ type: "div", props: { textContent: "{{view.loginMode === 'code' ? '请输入验证码' : '请输入密码'}}" } }
```

## 重组上游骨架

| 操作 | 是否允许 |
|------|:-------:|
| 在已有屏追加节点 | ✅ |
| 修改自己刚建的节点 | ✅ |
| 移动 / 删除上游屏的节点 | ❌（这是流水线起点，没有"上游"，但禁止反复重组）|
