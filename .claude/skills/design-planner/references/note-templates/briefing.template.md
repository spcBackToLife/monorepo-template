> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{X}-briefing（每屏 Phase A 必做）
> 对应 schema 字段：screen.meta.design.briefing（v3 新增）
> 必读方法论：`references/methodology/01-briefing.md`

---

# {taskId} — 取景 (Briefing)

## 1. 产品维度

> 必读 `screen.meta.product` + `project.meta.{targetUser, coreScenarios, styleDirection, constraints}`

| 维度 | 内容 |
|---|---|
| 目标用户画像 | （来自 project.meta.targetUser） |
| 核心场景 | （来自 project.meta.coreScenarios，与本屏相关的列出） |
| 本屏在用户旅程中位置 | 开头 / 转折 / 高潮 / 结尾 |
| 用户来时心理 | （焦虑 / 期待 / 平静 / 兴奋 / 困惑 / 着急 ...） |
| 本屏要解决的问题 | （具体问题，如"快速登录"、"完成支付"、"查看进度"） |
| 用户用完去向 | （下一屏 + 期待状态） |
| 本屏角色 | 招呼 / 转化 / 留存 / 安抚 / 引导 / 工具 |
| 业务约束 | （来自 project.meta.constraints） |

---

## 2. 主题维度

> 必读 `theme.intent / tokens / decorationRules / iconSpec`

| 维度 | 内容 |
|---|---|
| theme.intent | （枚举：minimal / playful / premium / trustworthy / warm / clean / bold / natural） |
| 主调色板（colors） | primary / primaryHover / primaryActive / primaryLight / secondary / accent / background / surface / textPrimary / textSecondary / textTertiary / border / borderLight / error / warning / success |
| 字号梯度 | display / h1-h4 / body-lg / body / caption |
| 圆角梯度 | sm / md / lg / xl / full |
| 阴影梯度 | sm / md / lg / xl |
| 缓动梯度 | fast / normal / slow |
| 装饰用量上限（decorationRules） | 极少 / 节制 / 丰富 |
| 图标规范（iconSpec） | 线条粗细 / 风格（线性/填充/双色）/ 默认尺寸 |
| 缺哪些 token（如有）| （走 UpstreamChallenge theme-generator）|

---

## 3. 交互维度

> 必读 `screen.stateInit.view / dataSources / rootNode 已建节点 / overlays`

### 3.1 state.view 字段表

| 字段名 | 类型 | 业务含义 | 涉及哪些节点的视觉态 |
|---|---|---|---|
| activeMode | "code" \| "password" | 登录方式切换 | CodeModeBtn.active / PasswordModeBtn.active / TabIndicator |
| policyAccepted | bool | 是否同意协议 | PolicyCheckVisual.checked |
| codeCountdown | number | 验证码倒计时 | GetCodeBtn.counting / .text |
| submitting | bool | 登录中 | SubmitBtn.loading / FormCard.disabled |
| submitAttempted | bool | 是否点过提交 | PolicyCheckVisual.error |

### 3.2 衍生视图节点已建

- ✅ loadingView / errorView / emptyView / overlays / ...
- ❌ 缺：xxx → UpstreamChallenge interaction-designer

### 3.3 节点骨架够不够（v3 ★）

design 阶段允许 element/add/wrap/move 视觉容器，但**业务节点不动**。本屏发现需要：
- ✅ 加 wrapper-label 包 PolicyCheckbox（design 自加）
- ✅ 加 TabIndicator 移动指示条（design 自加）
- ❌ 缺业务节点 xxx → UpstreamChallenge

### 3.4 mock scenarios

| scenario | 用途 | 影响哪些设计 |
|---|---|---|
| code-success | 验证码登录成功 | submitting → 成功跳转 |
| code-error | 验证码错误 | error 态视觉 |
| ... | ... | ... |

---

## 4. 上下文维度

| 维度 | 内容 |
|---|---|
| 同种组件在其他屏 | 列出（如 SubmitBtn 在注册页 / 设置页 / 支付页都出现，跨屏需一致）|
| 可复用 componentAssets | 列出（如已有 PrimaryButton 模板可直接 instantiate）|
| 跨屏一致性约束 | 本屏哪些组件不允许偏离统一规格 |

---

## 5. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_node
{
  nodeId: "screen.meta.design",
  patch: {
    briefing: {
      userIntent: "...",                        // 用户想做什么
      userMood: "焦虑→期待→信任",                // 情绪曲线
      screenRole: "招呼+工具",
      themeIntent: "warm-minimal",
      missingTokens: [],                        // 缺哪些 token；非空则 UpstreamChallenge
      stateViewFields: ["activeMode","policyAccepted","codeCountdown","submitting","submitAttempted"],
      skeletonGaps: [],                         // 缺哪些业务节点；非空则 UpstreamChallenge
      crossScreenComponents: ["SubmitBtn","FormCard","PrimaryButton(模板)"]
    }
  }
}
```

---

## 6. 自检

- [ ] 4 维度全有内容
- [ ] state.view 字段表覆盖所有 view 字段
- [ ] missingTokens / skeletonGaps 处理：空 → 进 D-X-concept；非空 → 立刻挂 UpstreamChallenge
- [ ] schema 字段已写入

任一未通过 → 任务不能 done。
