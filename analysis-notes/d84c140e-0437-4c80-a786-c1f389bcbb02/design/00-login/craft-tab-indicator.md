> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-craft-tab-indicator
> 必读 recipes：recipes/compositions/tab-segment.md（已知）
> 必读方法论：methodology/06-visualstates-completeness.md §7（业务态映射）+ 10-state-visual-mapping.md

---

# D-00-login-craft-tab-indicator — Craft（创作执行）

## 1. 视觉目标

让 ModeToggle 的 active tab 在视觉上有明确的下划指示线（解决 ISSUE-5）+ 切换时通过 transition 平滑滑动（200ms ease-out）。

## 2. 实施决策（v3 vs strategy）

### 2.1 strategy.md 原方案（element/add 独立 TabIndicator）

strategy 5 维曾建议加独立的 TabIndicator 视觉容器（2px 高线条 + 主色填充 + radius.full），靠 transform translateX 在 tab 间滑动。

### 2.2 v3 实操调整：用 visualState `active.borderBottom` 直接落

发现 v2 已在 CodeModeBtn / PasswordModeBtn 的 `active` visualState 中写了 `borderBottom 2px solid primary`——结构上已是"tab 自带下划线"模式，**不需要独立 TabIndicator 容器**。

但 v2 漏了 2 件事导致下划线没出现：

| 漏 | 修复 |
|---|---|
| 1. **active state 没绑 activeWhen** → 这 state 永远不触发 | v3 补 `activeWhen: {{ state.view.loginMode === 'code'\|'password' }}` |
| 2. `borderBottom: "2px solid $token:colors.primary"` 字符串内嵌 token 不渲染（同 ISSUE-3 根因）| v3 拆为 borderBottomWidth + borderBottomStyle + borderBottomColor 三个独立属性，单值 token 引用可解析 |

放弃独立 TabIndicator 节点的理由：
- ✅ borderBottom 已有 → 节省一个节点 + 减少结构复杂度
- ✅ marginBottom: -1px 让 active 边线与 ModeToggle.borderBottom (1px borderLight) 重叠覆盖，视觉上是一根 2px 主色线压在 1px 灰线上，过渡顺滑
- ✅ transition 时长 200ms ease-out 已在 v2 visualState 写好，切换会自动滑动
- ❌ 独立 TabIndicator 需要 transform: translateX 算 left 偏移，复杂且对 tab 文本宽度敏感

## 3. 修改清单

| 节点 | 改动 |
|---|---|
| CodeModeBtn (nd_fea83ab543584619ab847) | active state：补 activeWhen + borderBottom 拆三属性 |
| PasswordModeBtn (nd_fc9f672d68824795b92cd) | active state：补 activeWhen + borderBottom 拆三属性 |

## 4. minSignals 核查

| 节点 | role | minSignals 阈值 | 实际信号数（active 态）|
|---|---|---:|---:|
| ModeToggle Tab active | 工具-切换 | ≥ 2 | 3（color primary + fontWeight 600 + borderBottom 2px primary）✅ |

## 5. ★ 沉淀到 schema 的结论

```jsonc
// visual_state/update CodeModeBtn.active
{
  activeWhen: "{{ state.view.loginMode === 'code' }}",
  styles: {
    color: "$token:colors.primary",
    fontWeight: "600",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: "$token:colors.primary",
    marginBottom: "-1px"
  }
}

// visual_state/update PasswordModeBtn.active
{
  activeWhen: "{{ state.view.loginMode === 'password' }}",
  styles: { /* 同上 */ }
}
```

## 6. 自检

- [x] 视觉目标清晰：active tab 显示主色下划线 + 主色字 + 600 字重
- [x] 找到 v2 漏洞（缺 activeWhen + 字符串内嵌 token）并修复
- [x] 装饰系统单一族：tab 下划线属于"形状语言"（线条），与 soft-glow 装饰系统不冲突（不是装饰节点）
- [x] minSignals 3/2 ✅
- [ ] 等用户截图验证 active 态视觉是否到位
