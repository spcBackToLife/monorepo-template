# 模板：E-integrity（全项目终验）★

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/integrity.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-integrity
> 对应 schema 字段：核对类

## 1. 全项目 integrity 检查

```jsonc
query/integrity { projectId } → integrityReport
```

期望：**0 error**

## 2. 报告解析

| R-* | 数量 | 详情 | 修复路径 |
|-----|:----:|------|---------|
| R-EVENTS-02 | 0 | - | - |
| R-EVENTS-03 | 0 | - | - |
| R-STATUS-01 | 0 | - | - |
| R-STATUS-02 | 0 | - | - |
| R-STATUS-03 | 0 | - | - |
| R-PHASE-01 | 0 | - | - |
| R-PLAN-01 | 0 | - | - |
| R-THEME-* | 0 | - | - |
| R-STRUCTURE-02 | 0 | - | - |
| R-MATERIAL-01/02 | 0 | - | - |
| R-VISUALSTATE-01 | 0 | - | - |
| R-BUDGET-01/02 | 0 | - | - |
| R-VIEW-DESIGN-01 | 0 | - | - |
| R-GLOBAL-OVERLAY-02 | 0 | - | - |
| R-TOKEN-COVERAGE | 0 | - | - |

## 3. 有 R-* 错误的处理（按 methodology/03-issue-routing.md）

如有任意 R-* 错误：

```
1. 按 issue-routing.md 路由表确定责任方
2. 在本 md 详细写明：
   - 错误编号 + 触发条件
   - 涉及节点 / 字段
   - 责任方
   - 期望修复
3. 提示用户切到对应 SKILL 修
4. 本任务标 status:'pending'，等用户切回 executor 重跑 integrity
```

## 4. 通过验收

如所有 R-* = 0：
```
✅ 全项目 integrity 0 error
✅ 所有屏 phase = "verified"
✅ 所有 plan 任务 status ∈ {done, skipped}
```

→ 进入 E-snapshots / E-handover。

## 5. ★ 沉淀到 schema 的结论

```jsonc
// 终验通过，写入项目 meta
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      finalIntegrity: {
        passed: true,
        passedAt: "<ISO>",
        rZeroAt: "<ISO>",
        notes: "全项目 integrity 0 error，所有 R-* 红线通过"
      }
    }
  }
}
```

⚠️ **后续约束**：
- E-snapshots：本任务通过后生成全屏完整截图集
- E-handover：本任务 + snapshots 都过 → 才能交付
```
