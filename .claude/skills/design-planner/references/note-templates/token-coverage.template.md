# 模板：D-token-coverage（$token: 引用率核查）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/system/token-coverage.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-token-coverage
> 对应 schema 字段：核对类；发现硬编码 → 立刻修

## 1. 扫描所有 styles

可写脚本扫所有 schema 节点的 styles + states[*].styles + materialSpec.colorStrategy 中的 value 字段：

```typescript
// 伪代码
for each node in projectSchema:
  for each prop in node.styles:
    if value contains "$token:" → counted as ✅
    elif value matches CSS keyword (auto/0/transparent/none/inherit/...) → counted as N/A (例外)
    elif value matches env(safe-area-inset-*) → counted as N/A
    elif value matches v2.5 minimal-debug 兜底色 (and node 标记为派生展示节点 + 已在 design 阶段升级) → ⚠️ 升级
    else → ❌ 硬编码
  
  for each state in node.states:
    for each prop in state.styles:
      [同上]
  
  for materialSpec in node.meta.design:
    for each role in colorStrategy:
      if value contains "$token:" → ✅
      elif value in {"#FFFFFF","#000000","transparent"} → N/A
      else → ❌ 硬编码
```

## 2. 引用率统计

| 屏 | 总样式属性数 | $token: 引用数 | 例外（关键字/safe-area）| 硬编码 | 引用率 |
|----|:------------:|:--------------:|:-----------------------:|:------:|:------:|
| 00-login | 142 | 138 | 3 | 1 | 97.9% |
| 01-register | 128 | 126 | 2 | 0 | 100% |
| 02-forgot | 95 | 92 | 2 | 1 | 97.9% |
| 03-home | 220 | 215 | 4 | 1 | 97.7% |
| 04-settings | 86 | 85 | 1 | 0 | 100% |

整体：___%

## 3. 硬编码点清单

| 屏 | 节点 | 属性 | 硬编码值 | 处理 |
|----|------|------|----------|------|
| 00-login | n5-PhoneError | letterSpacing | 0.01em | ✅ 接受（CSS 关键字范畴）|
| 02-forgot | n_back-arrow | width | "16px" | ❌ 修：改 `$token:spacing.md` |
| 03-home | n_card-bg | backgroundImage | url(...) | ✅ 接受（executor 写）|

## 4. minimal-debug 升级核查（v2.5 ★）

派生展示节点的 7 属性 minimal-debug styles：
- color / fontSize / lineHeight / marginTop / marginBottom / minHeight / padding

design 阶段必须升级为 token 引用：

| 屏 | 派生节点 | 升级前 | 升级后 | 状态 |
|----|---------|--------|--------|------|
| 00-login | PhoneError | color: #ef4444 | color: $token:colors.error | ✅ |
| 00-login | CredentialError | color: #ef4444 | color: $token:colors.error | ✅ |
| 03-home | InlineSuccess | color: #16a34a | color: $token:colors.success | ✅ |

## 5. 缺 token 退回 theme-generator 清单

发现需要的 token 但 themeConfig 没有：
- [ ] 无
- [ ] 缺 ___________ → 退回 theme-generator 补

## 6. 修复操作

```jsonc
// 修复 02-forgot 的硬编码 width
style/update {
  projectId, nodeId: "<02-forgot back-arrow>",
  styles: { width: "$token:spacing.md", height: "$token:spacing.md" }
}
```

## 7. 修复后引用率

整体：___%

✅ ≥ 95% / ❌ < 95% 继续修

## 8. ★ 沉淀到 schema 的结论

```jsonc
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      tokenCoverage: {
        overallRate: 0.97,
        byScreen: {
          "00-login": 0.979,
          "01-register": 1.00,
          ...
        },
        passedAt: "<ISO>",
        threshold: 0.95
      }
    }
  }
}
```

⚠️ **后续任务约束**：
- D-handover：本任务 ≥ 95% 才能 handover
- 之后用户改 ThemeConfig，所有 styles 自动跟变（不需要重新跑 token-coverage）
```
