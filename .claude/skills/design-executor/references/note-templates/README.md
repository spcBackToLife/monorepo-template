# design-executor note-templates/

每个 plan 任务都有对应的 md 模板——告诉 AI **md 该填什么子段**。

> ⚠️ **v3 ★ 任务清单变化**：v3 删除了素材绘制相关任务（inventory / mat-* / svg-* / global-inventory / global-mat-*）；新增 `handover-check` / `qa-diff`。下表标注 v3 状态。

> ★ = 高频；★★ = v3 新增/重写。

## v3 实际加载（保留）

| 模板 | v3 状态 | 对应任务 | 路径模板 |
|------|:---:|---------|---------|
| `handover-check.template.md` ★★ | ✅ **v3 新增** | `E-X-handover-check` | `analysis-notes/<projectId>/executor/<screenId>/handover-check.md` |
| `snapshot.template.md` ★ | ✅ v2+v3 共用 | `E-X-snapshot` | `analysis-notes/<projectId>/executor/<screenId>/snapshot.md` |
| `qa-diff.template.md` ★★ | ✅ **v3 新增** | `E-X-qa-diff` | `analysis-notes/<projectId>/executor/<screenId>/qa-diff.md` |
| `verified.template.md` | ✅ v2+v3 共用 | `E-X-verified` | `analysis-notes/<projectId>/executor/<screenId>/verified.md` |
| `global-snapshot.template.md` | ✅ v2+v3 共用 | `E-global-overlay-snapshot` | `analysis-notes/<projectId>/executor/global/snapshot.md` |
| `cross-screen-snapshot.template.md` | ✅ v2+v3 共用 | `E-cross-screen-snapshot` | `analysis-notes/<projectId>/executor/global/cross-screen.md` |
| `integrity.template.md` ★ | ✅ v2+v3 共用 | `E-integrity` | `analysis-notes/<projectId>/executor/global/integrity.md` |
| `snapshots.template.md` | ✅ v2+v3 共用 | `E-snapshots` | `analysis-notes/<projectId>/executor/global/snapshots.md` |
| `handover.template.md` ★ | ✅ v2+v3 共用 | `E-snapshots`（v3 合并 handover）| `analysis-notes/<projectId>/executor/global/handover.md` |

## v3 已废弃（不再加载）

| 模板 | v3 状态 | 原因 |
|------|:---:|------|
| `inventory.template.md` | ⚠️ **v3 废弃** | 素材清单识别归 design |
| `mat.template.md` | ⚠️ **v3 废弃** | mat-* 任务删除 |
| `svg.template.md` | ⚠️ **v3 废弃** | svg-* 任务删除 |
| `global-inventory.template.md` | ⚠️ **v3 废弃** | global-inventory 删除 |
| `global-mat.template.md` | ⚠️ **v3 废弃** | global-mat-* 删除 |

## 每份 md 通用结构

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<X>-<task>
> 对应 schema 字段：<相对路径>

## 1. 执行 / 核对过程
[本任务的 md 主体]

## ★ 沉淀到 schema 的结论
[与本任务 MCP 调用 1:1 对应 + jsonc 代码块]
```

## v3 加载策略

- 第一次执行某类任务 → 必须 read 对应模板
- 写完 md 前回查模板，确认每个子段都填了
- 模板只是骨架，**不为了形式裁剪推理深度**

## v3 8 个核心任务流程

```
E-X-handover-check  →  核对 design 移交（含 9 项 background-* / materialProjectId / self-review.md）
   ↓ 全通过
E-X-snapshot        →  跑各 viewport / Frame 长图 / 各 visualState 截图
   ↓
E-X-qa-diff         →  截图与 design self-review.md / handover.md 5 维度逐项对账
   ↓ 全通过 / 仅小差异
E-X-verified        →  标 phase=verified
   ↓
（项目级）E-cross-screen-snapshot → E-integrity → E-snapshots（含 handover）
```

完整跑一遍样板见 `../examples/login-executor-v3.md`。
