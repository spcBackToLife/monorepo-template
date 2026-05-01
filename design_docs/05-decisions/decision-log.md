# 关键设计决策记录

> 每次做出重要的架构/产品决策时，追加一条记录。格式：决策 + 选择 + 理由 + 日期。

---

## 决策记录

| # | 决策 | 选择 | 理由 | 日期 |
|---|------|------|------|------|
| 1 | Schema 样式用什么规范？ | CSS Properties | 不发明新语法，前端开发者零学习成本，导出代码 1:1 对应，且 CSS 是所有 UI 框架的"最大公约数" | 2026-03-27 |
| 2 | 画布渲染方式？ | 双层：React DOM + Canvas | DOM 层渲染内容（CSS 1:1 所见即所得），Canvas 层做编辑交互（选区/拖拽/对齐线）。不用纯 Canvas 是因为 Schema 本质就是 DOM+CSS，浏览器天然能渲染 | 2026-03-27 |
| 3 | AI 集成方式？ | MCP Server | 操作层 = MCP Tools，前期 Cursor/Claude Code 零成本接入，后期自建 Client 无缝切换。核心竞争力是 Schema+渲染+操作，不是"AI 对话 UI" | 2026-03-27 |
| 4 | 数据存储模型？ | Event Sourcing + 周期快照 | Operation 天然就是事件日志，增量存储、精确版本、undo/redo、审计日志四合一。不需要 CRDT/OT | 2026-03-27 |
| 5 | 能否跨平台导出？ | 能，插件化 Codegen | CSS 属性是跨平台的"最大公约数"，每个平台有明确映射；Codegen 做翻译插件 | 2026-03-27 |
| 6 | 元素添加方式？ | 双层：原子元素 + 组件资产 | 原子元素（HTML 标签）给灵活性，组件资产（Schema 片段）给效率和复用 | 2026-03-27 |
| 7 | 组件资产模式？ | 引用 + 脱离两种 | 引用模式同步更新，脱离模式独立修改；满足不同场景需求 | 2026-03-27 |
| 8 | 屏幕选择后能切换？ | 能，初始视口 ≠ 锁死 | Schema 不变，切换视口只改画布宽高，天然验证响应式适配 | 2026-03-27 |
| 9 | 新页面如何产生？ | 通过交互操作触发创建 | 核心产品理念——屏幕间跳转天然形成交互关系图 | 2026-03-27 |
| 10 | 包数量？ | 4 SDK + 1 MCP Server | schema + engine + operations + codegen + mcp，各司其职 | 2026-03-27 |
| 11 | SDK 放 features 还是 packages？ | features | 当前仅内部使用，避免发布管理成本。未来可迁移到 packages | 2026-03-27 |
| 12 | 内部 SDK 模块导出策略？ | ESM + CJS 双格式导出，且 `exports` 同时提供 `import/require/types` | `design-api`（NestJS）在 Node 侧存在 CJS 消费路径；仅 ESM 导出会触发 `ERR_PACKAGE_PATH_NOT_EXPORTED`。双入口可兼容前后端 | 2026-03-27 |
| 13 | CJS 路径可否直接用 ESM-only 依赖？ | 不可，默认禁止 | CJS 产物 `require()` ESM-only 包会触发 `ERR_REQUIRE_ESM`。优先用内置实现或确保依赖在 CJS 路径不会被 require | 2026-03-27 |
| 14 | 新建 `div` 默认尺寸策略？ | 默认 `200px x 50px`（非 root） | 避免默认 100% 宽导致新增元素“不可辨识/像背景层”，提升首触达可见性与可操作性 | 2026-03-27 |
| 15 | 编辑操作是否逐条同步保存？ | 否，采用 Local-first + 异步批量持久化 | 逐条同步会把网络延迟暴露为编辑卡顿。批量上报 + 重试可兼顾流畅性与可靠性 | 2026-03-27 |
| 16 | 拖拽落点坐标如何持久化？ | 存父容器局部坐标（local x/y） | 屏幕绝对坐标在缩放/响应式下语义不稳定；局部坐标更可解释、可导出、可迁移 | 2026-03-27 |
| 17 | 画布与设备视口的关系？ | Frame / Viewport / Canvas 三层解耦：编辑画布通过 `ViewportContainer.unfoldFrame=true` 在视图层把 Frame 拉长展示长内容；预览/导出按 `viewport` 严格裁剪。**关键修订（2026-04-30 晚）**：原方案把 `Screen.frame` / `Screen.defaultViewport` / `ComponentNode.role` 写进 schema 污染了渲染契约，改为**全部移出 schema**——viewport 由调用方显式传入 ViewportContainer，`role` 下沉到 `node.editorMetadata.role`（仅编辑器 UI 读取，渲染契约不读）。MCP `generate_snapshots` 仍提供 `mode` 参数 | 现状把"设备框"等同于"画布物理边界"，导致长滚动页内容被裁、Agent 截图只能拿首屏，违反 first-principles.md Q3 "屏幕选择 = 选择初始视口"。但**绝不能让"编辑期辅助字段"污染 schema**——schema 必须等于真实设计产物。详见 [产品方案 §10](../02-product/editor/01-canvas/frame-viewport-canvas-redesign.md) + [技术实现](../03-tech/editor/frame-viewport-canvas-redesign.md) | 2026-04-30 |
| 18 | 素材渐变填充的几何公式？ | 前端 SVG 渲染（GradientDefs.tsx）和后端 cairo 渲染（resolveGradientDef）共用 `objectBoundingBox` 等价的同一公式 | 之前后端只支持 CSS 字符串渐变（且与前端公式略有出入），导致 MCP 写入与画布所见不一致；统一后"画布所见 = 导出 PNG = 设计稿展示"成立 | 2026-04-30 |
| 19 | 组件实例（reference 模式）的"子节点身份"如何处理？ | 实例化时一次性把子树物化进 Schema，子节点 ID 在 op.params 预生成；渲染期 `resolveComponentInstance` 不再调 `instantiateTemplate`，直接返回 node；模板更新由用户主动 `syncInstance` 触发 | 旧实现每次渲染都 `regenerateIds` 给子节点新 ID，UI 选中的"瞬时 ID"在持久态 Schema 不存在 → 选中/删除/改样式全部失败。物化后 ID 收敛到三类合法入口（用户行为、DB 兜底、executor 复用），事件溯源严格幂等，删除/选中/改样式与普通节点一致。详见 [产品 ADR](../02-product/editor/07-asset-management/component-instance-id-stability.md) + [技术 ADR](../03-tech/editor/component-instance-id-stability.md) | 2026-04-30 |

---

## 如何追加新决策

在表格末尾添加新行，格式：

```
| N+1 | 问题描述 | 你的选择 | 为什么这么选 | YYYY-MM-DD |
```

建议每次追加前先问自己：
1. 这个决策是否有多个合理选项？（如果只有一个显然的答案，可能不值得记录）
2. 未来回看这个决策时，理由是否充分说明了"为什么不选其他方案"？
