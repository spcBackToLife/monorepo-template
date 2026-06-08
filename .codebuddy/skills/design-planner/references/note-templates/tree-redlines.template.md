# 模板：D-X-tree-redlines（节点结构 4 红线核对）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/tree-redlines.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-tree-redlines
> 对应 schema 字段：核对类任务，无具体写入字段；产出问题清单 + 修复操作

## 1. 红线 1：组件内联展开

| 节点 | 类型 | children 展开？ | 说明 |
|------|------|:--------------:|------|
| FormCard | molecule（已 instantiate）| ✅ | 引用 tpl_formCard，children 自动展开 |
| BrandLogo | atom 节点 | N/A | 单节点 |
| PhoneInput | molecule（已 instantiate）| ✅ | 引用 tpl_phoneInput |
| ... | | | |

发现问题：
- [ ] 无问题
- [ ] ___________ 节点未展开 → 修复操作：___________

## 2. 红线 2：状态-节点对应

| 节点 | 状态 | 对应节点 | 节点是否存在 |
|------|------|---------|:-----------:|
| PhoneInput | error | PhoneError (n5) | ✅ |
| CredentialInput | error | CredentialError (n7) | ✅ |
| SubmitBtn | loading | SubmitSpinner (n9-spinner) | ✅ |
| FormCard | locked | LockedSheet (overlay-locked) | ✅ |
| OrderCard | refunding | RefundingView | ❌ 缺！|

发现问题：
- [ ] 无问题
- [ ] ___________ 状态缺对应节点 → 修复操作：UpstreamChallenge 让 interaction 阶段补节点

## 3. 红线 3：完整样式

| 节点 | 布局 | 尺寸 | 颜色 | 排版 | 间距 | 阴影 | 过渡 |
|------|:----:|:----:|:----:|:----:|:----:|:----:|:----:|
| HeaderArea | ✅ | ✅ | ✅ | N/A | ✅ | N/A | N/A |
| BrandLogo | N/A | ✅ | N/A | N/A | ✅ | N/A | N/A |
| FormCard | ✅ | ✅ | ✅ | N/A | ✅ | ❌ | N/A |  ← 阴影预算削减后省，OK
| PhoneInput | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| SubmitBtn | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ... | | | | | | | |

发现问题：
- [ ] 无问题
- [ ] ___________ 节点缺关键样式维度 → 修复操作：补 style/update

## 4. 红线 4：叶子节点必须有内容

| 叶子节点 | 类型 | 内容 | 是否完整 |
|---------|------|------|:--------:|
| FormTitle (n5) | div + textContent | "欢迎回来" | ✅ |
| BrandLogo (n2) | div + backgroundImage + materialSpec | png 待 executor 写 | ✅ |
| SubmitText (n9-text) | span + textContent 表达式 | `{{state.view.submitting ? '登录中...' : '登录'}}` | ✅ |
| LoadingSpinner | div + materialSpec | png 待 executor 写 | ✅ |
| EmptyDiv | div | 空 | ❌ 缺内容 |

发现问题：
- [ ] 无问题
- [ ] ___________ 叶子节点空内容 → 修复操作：__________________

## 5. 综合不一致项 + 修复操作

### P0（阻塞 D-X-integrity）
- ___________

### P1（影响视觉但不阻塞）
- ___________

### 修复操作记录
```jsonc
// 操作 1：补 SubmitText 节点的 textContent
[实际 MCP 调用]

// 操作 2：UpstreamChallenge 让 interaction 补 OrderRefundingView
[meta/raise_upstream_challenge 调用]
```

## 6. 修复后再核对

[再跑红线 1-4 → 全部 ✅]

## 7. ★ 沉淀到 schema 的结论

本任务以核对为主，没有直接 schema 写入产物。但：
- 发现的不一致项 → 立刻通过对应 MCP 修
- 涉及上游字段问题 → UpstreamChallenge

修复完成后 update_plan_task done + notes "已核对 4 红线 + 修复 N 项不一致"。

⚠️ **后续任务约束**：
- D-X-integrity：本任务通过后才能跑 integrity 自检
- 本任务通过 = D-X-coverage 红线 2 部分内容已经核对完成
```
