# W4 Issue 列表（组件 Props + 资产 MVP + 拖入）

> 对应 `editor-product-full-implementation-plan.md` **W4**；依赖 W3。

**状态**：`open` | `done`

---

## Epic W4-A — 06 组件 Props MVP

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W4-001 | HTML 属性注册表 + 属性 Tab 动态表单 | 06 MVP | `design-schema` `element-props`、`PropsTab` | done（既有） |
| W4-002 | `changeElementType` + 面板入口 | 06 MVP | `design-operations`、`PropsTab`「节点类型」 | done |
| W4-003 | 组件实例 `updateComponentProps` + Prop 控件 | 06 MVP | `PropsTab`、`design-operations` | done（既有） |

---

## Epic W4-B — 07 资产 MVP + 拖入

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W4-010 | `saveAsTemplate` / 保存为资产 | 07 MVP | `SaveTemplateButton`、`design-operations` | done（既有） |
| W4-011 | 资产库面板 + 实例化 | 07 MVP | `ComponentLibrary`、`instantiateTemplate` | done（既有） |
| W4-012 | **画布拖入**组件模板实例化 | 07 MVP | `ComponentLibrary` draggable + `Canvas` drop | done |
| W4-013 | 引用 / 脱离（detach）+ 同步（sync） | 07 MVP | `PropsTab` `TemplateRefActions` | done |
| W4-014 | 静态资源 `asset://` 解析 | 07 MVP | `design-engine` `resolveAssetUrl`、`PrimitiveRenderer` | done |
| W4-015 | 素材列表面板（上传 + 复制引用） | 07 MVP | `MediaMaterialsPanel`、上传 API | done |
| W4-016 | **保存为组件**入口在主编辑流程可见（底部工具栏 + 嵌入态组件库） | 07 MVP | `SaveTemplateToolbarButton`、`ComponentLibrary` `embedded` | done |

---

## Epic W4-C — MCP 与 operations 对齐

| ID | 标题 | 验收 | 主要位置 | 状态 |
|----|------|------|----------|------|
| W4-020 | `instantiate_template` / `save_as_template` / `get_available_assets` | 总纲 | `design-mcp` `asset.ts` | done（既有） |
| W4-021 | `detach_instance` / `sync_instance` / `change_element_type` | 总纲 | `design-mcp` `asset.ts` | done |

---

## 维护

- 前端 dev：`vite` 已代理 `/uploads` → API，便于 `asset://uploads/...` 加载。
- 改 `design-engine` 后：`pnpm --filter @globallink/design-engine build`。
