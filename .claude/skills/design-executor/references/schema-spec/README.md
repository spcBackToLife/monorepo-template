# design-executor schema-spec/

本目录是 executor 阶段"写 schema 时的字段精确清单"——告诉 AI **写什么字段、写到哪、必填哪些、红线是什么**。

> ⚠️ **v3 ★ 重大变化**：v3 起 executor 允许写的字段**大幅收窄**——只剩 `meta.status.{phase, ready, notes}`。其他全部归 design。

> ★ = 高频；★★ = v3 升级/新增。

| 文件 | v3 状态 | 内容 | 强制加载时机 |
|------|:---:|------|-------------|
| `material-application.md` | ⚠️ **v3 废弃** | v2 素材应用字段精确清单（backgroundImage / props.src / materialProjectId）；v3 全归 design | 不加载 |
| `material-application-readonly.md` ★★ | ✅ **v3 新增** | 素材应用字段**只读核对**版本（v3：仅核对，不写）| `E-X-handover-check` 时 |
| `node-status.md` ★ | ✅ v2+v3 共用 | node.meta.status 完整字段 + phase=verified 推进规则（ready 由 integrity 自动核验）| `E-X-verified` / `E-integrity` 落 schema 前 |
| `forbidden-fields-executor.md` ★★ | ✅ **v3 重写** | v3 边界全部收紧：styles 任何字段 / materialProjectId / props.src / svgContent / Skill('material-painter') 全禁；白名单仅 `meta.status.*` | `E-X-verified` / `E-integrity` 时；任何时刻发现想写非法字段 |

## v3 加载策略

- 入场启动 → 必读 `forbidden-fields-executor.md`（v3 重写，建立"我能写什么"心智）
- `E-X-handover-check` → 必读 `material-application-readonly.md`（核对清单）
- `E-X-verified` / `E-integrity` → 必读 `node-status.md` + `forbidden-fields-executor.md`
- ⚠️ 不要加载 `material-application.md`（v2 写入版）——会触发"想写 backgroundImage"的错误冲动
