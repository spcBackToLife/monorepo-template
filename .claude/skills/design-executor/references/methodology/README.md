# design-executor methodology/

本目录是 executor 阶段的"思维框架"——告诉 AI **怎么想问题**。schema-spec 告诉 AI **写什么字段**；note-templates 告诉 AI **md 怎么填**。三者分工明确。

> ⚠️ **v3 ★ 重大变化**：v3 起 executor 退化为 **QA 摄影师**——不画素材、不写 styles、不调 material-painter。本目录 `01-asset-pipeline.md` 已废弃；其余 3 份文档已 v3 升级。

executor v3 只关注 3 个核心问题：

1. 怎么核对截图与 design 意图一致？（5 维度对账）
2. 发现不一致怎么处理？（**v3 ★ 全部退回 design**，不亲自补）
3. 跨屏一致性怎么验证？

## 文件清单

| 文件 | 状态 | 内容 | 强制加载时机 |
|------|:---:|------|-------------|
| `01-asset-pipeline.md` | ⚠️ **v3 废弃** | 素材绘制管线（v2：material-painter 调度）；v3 已断绝 | 不加载 |
| `02-snapshot-verification.md` ★ | ✅ v2+v3 共用 | 截图核对维度（整体氛围 / palette / 主角突出 / 装饰平衡 / 衍生视图态）| 执行 `E-X-snapshot` / `E-X-qa-diff` / `E-global-overlay-snapshot` |
| `03-issue-routing.md` ★★ | ✅ **v3 升级** | 路由表 v3 重写：素材问题全部退回 design | 执行 `E-X-handover-check` / `E-X-qa-diff` / `E-integrity` |
| `04-cross-screen-verification.md` | ✅ v2+v3 共用 | 跨屏一致性核对（同种组件 / 视觉密度 / 全局 overlays 风格）| 执行 `E-cross-screen-snapshot` |

## v3 加载策略

- 入场启动 → 必读 `02-snapshot-verification.md` + `03-issue-routing.md`（v3 核心）
- 第一次执行 `E-X-handover-check` → 必读 `03-issue-routing.md`（路由表）
- 第一次执行 `E-X-qa-diff` → 必读 `02-snapshot-verification.md`（5 维度）+ `03-issue-routing.md`（差异退回流程）
- ⚠️ 不要加载 `01-asset-pipeline.md`——v3 已废，加载会触发"想画素材"的错误冲动
