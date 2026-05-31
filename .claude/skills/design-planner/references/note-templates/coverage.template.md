# 模板：D-X-coverage（覆盖核对）★

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/coverage.md`
> 三大维度核对：衍生视图视觉规格 + visualStates 矩阵 + 视觉预算

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-coverage
> 对应 schema 字段：核对类任务；发现问题 → 立刻补对应字段

## 1. 维度 1：7 类衍生视图视觉规格

| 类型 | 节点 ID | styles 完整 | meta.design 完整 | materialSpec | 备注 |
|------|---------|:----------:|:---------------:|:------------:|------|
| **类 1 加载态** | | | | | |
| FeedSkeleton | (interaction 已建) | ✅ | ✅ | N/A | shimmer 1.5s ease-in-out |
| LoadingOverlay | (interaction 已建) | ✅ | ✅ | N/A | 半透明 + 居中 spinner |
| **类 2 空态** | | | | | |
| EmptyFeedState | (interaction 已建) | ✅ | ✅ | ✅ kind=illustration | 含插图+标题+描述+按钮 |
| **类 3 错误态** | | | | | |
| ServerErrorPage | (interaction 已建) | ✅ | ✅ | ✅ kind=illustration | 含错误图示+重试按钮 |
| PhoneError | (interaction 已建) | ✅ minimal-debug 已升级 | ✅ | N/A | inline-error |
| CredentialError | (interaction 已建) | ✅ | ✅ | N/A | inline-error |
| **类 4 权限态** | | | | | |
| (本屏无) | | N/A | N/A | N/A | |
| **类 5 业务态** | | | | | |
| (本屏无业务对象状态机) | | N/A | N/A | N/A | |
| **类 6 反馈** | | | | | |
| (用 ui.showToast，无节点) | | N/A | N/A | N/A | |
| **类 7 屏级 overlays** | | | | | |
| LockedSheet | (interaction 已建) | ✅ | ✅ | N/A | BottomSheet 规格 |

矩阵覆盖度：✅ / ❌

发现问题：
- [ ] 无
- [ ] ___________ 节点 styles 缺失 / meta.design 缺失 / materialSpec 缺失 → 立刻补

## 2. 维度 2：visualStates 矩阵核对

| 节点 | 类型 | states 已写 | 最低门槛 | 是否过 |
|------|------|------------|:--------:|:------:|
| SubmitBtn | Button primary | default,hover,pressed,focus,disabled,loading,code-mode | 4 | ✅ |
| ModeToggle | Custom | default,active,hover,disabled | 4 | ✅ |
| PhoneInput | Input | default,hover,focus,error,disabled | 3 | ✅ |
| CredentialInput | Input | default,focus,error,disabled | 3 | ✅ |
| FormCard | Card container | default,loading | 2 | ✅（容器无需 hover）|
| RegisterLink | Link | default,hover,disabled | 3 | ✅ |
| ForgotLink | Link | default,hover,disabled | 3 | ✅ |

发现问题：
- [ ] 无
- [ ] ___________ 缺必要状态 → 立刻补 visual_state/add

## 3. 维度 3：视觉预算上限核对

```
componentBudgets 总权重 = 9 + 6 + 4 + 2 + 2 + 4 + 3 + 3 = 33
```

❌ **超 30** → 必须削减 1 个 weight。

调整：
- 方案 A：BrandLogo 6 → 5 → 32 ❌
- 方案 B：合并 RegisterLink + ForgotLink + 旁边的小帮助文字 = FooterArea (weight=3)，原合计 weight=8 → 节省 5 → 30 ✅

→ 选 B，调整 componentBudgets

主角数核算：
- 主角-CTA + 主角-品牌 = 2 个 ✅

工具角色 weight 上限核查：
- PhoneInput (2) ✅
- CredentialInput (2) ✅
- ForgotLink (3) ✅
- ...

装饰总和 weight：
- PinkCircleDeco (3) = 3 ✅ ≤ 8

## 4. 修复操作清单

### 修视觉预算
```jsonc
// 合并 RegisterLink + ForgotLink 为 FooterLinks（如未在 D-X-budget 阶段处理）
// 实际此处通常是回头修 budget
meta/set_screen {
  projectId, screenId,
  patch: {
    design: {
      componentBudgets: [
        // 调整后的清单
        ...
      ]
    }
  }
}
```

### 修衍生视图缺漏
```jsonc
// 如果发现某类衍生视图节点缺 styles → 立刻 style/update
// 如果发现 materialSpec 缺 → 立刻 meta/set_node 补
```

### 修 visualStates 缺漏
```jsonc
visual_state/add { ... }
```

## 5. 跨屏对照（同种衍生视图初步对照）

如本屏的 EmptyState 与其他屏的 EmptyState 配色 / 布局 / 行动按钮结构是否一致？
- ___________

如不一致 → 在 D-audit 阶段统一处理。

## 6. ★ 沉淀到 schema 的结论

```jsonc
// 1. 修补操作的 MCP 调用清单
[...]

// 2. 核对通过后写 expectedArtifacts 补声明（如有需要）
update_plan_task {
  taskId: "D-<screenId>-coverage",
  patch: {
    status: "done",
    notes: "md: design/<screenId>/coverage.md ; 修复 N 项",
    expectedArtifacts: [
      // 可选：补具体衍生视图节点的 nonEmpty 检查
      { kind: 'nonEmpty', path: 'rootNode.children[?<某衍生节点>].styles' }
    ]
  }
}
```

⚠️ **后续任务约束**：
- D-X-integrity：本任务通过后才能跑（确保 0 个 R-VIEW-* / R-VISUALSTATE-* / R-BUDGET-*）
- D-audit：本屏 coverage 通过后参与跨屏 audit
```
