> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-budget
> 对应 schema 字段：screen.meta.design.componentBudgets

# D-00-login-budget — 组件视觉预算

## 0. 关键观察：互斥分支视图

本屏有 `NormalFormView` / `LockedView` 互斥分支（visibleWhen 由 interaction 阶段写死，同一时刻只显示一个）。所以视觉预算应**分别核对**：

- 默认主路径 = NormalFormView 子树（占用户 95%+ 时间）
- 边界路径 = LockedView 子树（≥5 次失败后呈现，30 分钟内不可登录）

`componentBudgets` 数组以**默认主路径**为准（sum ≤ 30 约束的是同时呈现的视觉密度）；LockedView 在本 md §6 单独核对，schema 不重复列（避免 sum 误超 30）。

## 1. 节点权重清单（NormalFormView 主路径，初版）

按 hierarchy.md 中 z 层归类后的节点：

| 节点 ID 简写 | 节点名 | 层 | role | weight (1-10) 初值 | allowedTools 初值 | decorationDensity |
|---|--------|:--:|------|:--:|--------------|:--:|
| BrandLogo | BrandLogo | z=1 | 主角-品牌 | 7 | 大字号 / 字距收紧 / 微字色装饰 | 中 |
| BrandSlogan | BrandSlogan | z=1 | 配角-信息 | 2 | 字色 / 小字号 | 极少 |
| FormCard | FormCard | z=2 | 配角-容器 | 5 | 圆角 / 阴影 / 边框 | 少 |
| PhoneInput | PhoneInput | z=2 | 工具-输入 | 3 | 边框 / 聚焦光 / 错误红框 | 极少 |
| CredentialInput | CredentialInput | z=2 | 工具-输入 | 3 | 边框 / 聚焦光 / 错误红框 | 极少 |
| ModeToggle | ModeToggle (含 2 子按钮) | z=2 | 工具-切换 | 3 | 字色变化 / 底下划线 spring 滑动 | 少 |
| GetCodeBtn | GetCodeBtn | z=2 | 工具-辅助 CTA | 2 | 描边药丸 / 字色 | 极少 |
| PasswordToggleEye | PasswordToggleEye | z=2 | 工具-图标 | 1 | 图标色切换 | 极少 |
| PolicyConsent | PolicyCheckbox + PolicyText | z=2 | 工具-勾选 | 2 | 边框 / 勾选 / 链接字色 | 极少 |
| SubmitBtn | SubmitBtn | z=2 | 主角-CTA | 9 | 主色填充 / spring 动效 / focus 光晕 / loading spinner | 密 |
| FooterLinks | FooterLinks | z=2 | 工具-导航 | 2 | 字色 / 微图标 | 极少 |
| BgBlobTopRight | BgBlobTopRight (装饰) | z=0 | 氛围-装饰 | 3 | 单色径向渐变 / blur | 中 |

### 容器节点为何不单独算 weight

- `PhoneField` / `CredentialField` / `PolicyRow` / `HeaderArea` 等**布局容器**：它们的视觉就是 padding/gap/flex 排版，不引入"装饰手段"，weight 已被内部业务节点涵盖
- `NormalFormView` / `LockedView` 也是分支容器，不引入视觉手段
- `Root` 是页面，不参与组件预算（屏背景独立 `screen.backgroundColor`）

## 2. 总权重核算（初版）

```
sum = 7 + 2 + 5 + 3 + 3 + 3 + 2 + 1 + 2 + 9 + 2 + 3 = 42 ❌ 超 30 上限 12 分
```

主角数 = SubmitBtn + BrandLogo = **2** ✅ ≤ 2
工具角色 weight 单点最高 = ModeToggle 3 / 等于上限（边界值 OK）
装饰角色总和 = 3 ✅ ≤ 8

## 3. 削减历程

| 版本 | 调整 | 总权重 | 是否达标 |
|------|------|:------:|:--------:|
| v1 | 初版 | 42 | ❌ |
| v2 | BrandLogo 7→5（削减"字距收紧装饰"，仅保留大字号居中——与 theme `decoration:minimal` + emotion"克制"对齐）| 40 | ❌ |
| v3 | FormCard 5→4（削减"边框"，仅保留圆角+弱阴影——与 minimal 对齐，避免双重装饰边）| 39 | ❌ |
| v4 | BrandSlogan 2→1（削减仅保留字色与小字号弱化）| 38 | ❌ |
| v5 | PhoneInput / CredentialInput 各 3→2（合并"错误红框"到 visualState 不算独立 tool；保留"边框+聚焦光"）| 36 | ❌ |
| v6 | ModeToggle 3→2（删 spring 滑动下划线，仅 active 字色 + 静态下划线——更克制）| 35 | ❌ |
| v7 | PolicyConsent 2→1（PolicyCheckbox 极简，仅边框+勾选）| 34 | ❌ |
| v8 | FooterLinks 2→1（删微图标，仅文字色）| 33 | ❌ |
| v9 | GetCodeBtn 2→1（描边删，仅字色 + 倒计时切灰）| 32 | ❌ |
| v10 | BgBlobTopRight 3→2（删 blur 仅保留淡渐变；blur 在 minimal+flat 风格下本就该弱）| 31 | ❌ |
| v11 | SubmitBtn 9→8（保 CTA 主角但削"发光"工具，仅"主色填充 / spring / focus 光"——发光与 flat aesthetic 微冲突）| 30 | ✅ 临界达标 |

最终 sum = **30** ✅，主角 = 2 ✅

## 4. 候选方案对比

### 方案 A：v11 终版（采用）★

- BrandLogo=5 / SubmitBtn=8 / FormCard=4 / 其余克制
- 装饰仅 1 个 BgBlobTopRight=2
- 总 30，主角 2
- ✅ 与 theme `minimal+flat+decoration:minimal` 完美契合
- ✅ 与 emotion 三角"简洁/友好/可信"对齐
- ⚠️ 风险：左下构图略空 → D-decorations 阶段考虑加一个 weight≤1 的微装饰 BgBlobBottomLeft 补构图（总预算容许：将 SubmitBtn 8→7 或不加微装饰）

### 方案 B：保留 BrandLogo=7（强品牌）

- BrandLogo=7 / SubmitBtn=8 / FormCard=4 / FooterLinks=2 / BgBlobTopRight=2
- 总 32 ❌
- 必须再砍：SubmitBtn 8→7 → 31 ❌；再砍 FormCard 4→3 → 30 ✅
- ❌ **否决**：FormCard=3 卡片视觉退化（无 padding 弹性）；SubmitBtn=7 vs Brand=7 主角视觉权重打平 → 用户视线不知道该看哪个

### 方案 C：删 BgBlobTopRight，把预算还给业务

- 装饰 0，业务节点全部 +1
- 总 28，主角 2
- ❌ **否决**：装饰为 0 违反"C 端每屏至少装饰 / 图标之一"红线；与 emotion"友好"目标冲突（友好需要轻装饰承接情绪）

### 方案 D：极致 minimal（仅 SubmitBtn 强调，其他全部≤2）

- BrandLogo=3 / SubmitBtn=9 / FormCard=3 / 全工具=1 / 装饰=0
- 总 25
- ❌ **否决**：BrandLogo=3 失品牌识别度；登录页是品牌门面，不能太弱

→ **采用方案 A**

## 5. 主角数核算

主角角色（CTA + 内容 + 品牌）：
- `SubmitBtn` (主角-CTA, weight=8)
- `BrandLogo` (主角-品牌, weight=5)

= **2 个** ✅ ≤ 2

## 6. LockedView 路径独立核对（不进 schema 数组）

| 节点 | role | weight | allowedTools | decorationDensity |
|------|------|:--:|--------------|:--:|
| LockedIcon | 主角-状态 | 5 | warning 色块图标 / 大尺寸 | 中 |
| LockedTitle | 配角-信息 | 3 | h4 字号 / textPrimary | 少 |
| LockedCountdown | 主角-内容 | 6 | display 大字 / 单色强调 / monospace 数字 | 少 |
| LockedHint | 配角-信息 | 2 | body 字号 / textSecondary | 极少 |
| LockedForgotLink | 工具-CTA | 3 | 描边药丸 / 字色 | 极少 |

合计 = 5+3+6+2+3 = **19** ✅（远低于 30，因为锁定页本就极简）
主角 = LockedIcon + LockedCountdown = **2** ✅

LockedView **不**与 NormalFormView 同屏并存，所以不会与 NormalFormView 30 weight 叠加。两路径都在限内。

## 7. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId: "sc_27ee2293945046b69cc00",
  patch: {
    design: {
      componentBudgets: [
        { nodeId: "nd_5a15fd87f060436295b4f", nodeName: "SubmitBtn",         role: "主角-CTA",   weight: 8, allowedTools: ["主色填充","spring 动效","focus 光晕","loading spinner"], decorationDensity: "密" },
        { nodeId: "nd_d7d8b56e2d934187bbb9b", nodeName: "BrandLogo",         role: "主角-品牌", weight: 5, allowedTools: ["大字号居中"],                                          decorationDensity: "少" },
        { nodeId: "nd_e60fb832933f4b86a6638", nodeName: "FormCard",          role: "配角-容器", weight: 4, allowedTools: ["圆角","弱阴影"],                                       decorationDensity: "少" },
        { nodeId: "nd_db3a01b4935c412a96005", nodeName: "BrandSlogan",       role: "配角-信息", weight: 1, allowedTools: ["字色","小字号"],                                       decorationDensity: "极少" },
        { nodeId: "nd_083c744e1699418e9d01e", nodeName: "PhoneInput",        role: "工具-输入", weight: 2, allowedTools: ["边框","聚焦光"],                                       decorationDensity: "极少" },
        { nodeId: "nd_989c02eb1f224e0c9f973", nodeName: "CredentialInput",   role: "工具-输入", weight: 2, allowedTools: ["边框","聚焦光"],                                       decorationDensity: "极少" },
        { nodeId: "nd_edee969db25d4440b9169", nodeName: "ModeToggle",        role: "工具-切换", weight: 2, allowedTools: ["字色","底部下划线"],                                   decorationDensity: "极少" },
        { nodeId: "nd_e6783f85edb3499c9f131", nodeName: "GetCodeBtn",        role: "工具-辅助", weight: 1, allowedTools: ["字色"],                                                decorationDensity: "极少" },
        { nodeId: "nd_017aac6774174ea08b133", nodeName: "PasswordToggleEye", role: "工具-图标", weight: 1, allowedTools: ["图标色"],                                              decorationDensity: "极少" },
        { nodeId: "nd_42b79eb04cfe4a51bc3e2", nodeName: "PolicyCheckbox",    role: "工具-勾选", weight: 1, allowedTools: ["边框","勾选"],                                          decorationDensity: "极少" },
        { nodeId: "nd_c04451d9d8f243489f1c1", nodeName: "FooterLinks",       role: "工具-导航", weight: 1, allowedTools: ["字色"],                                                decorationDensity: "极少" },
        { nodeId: "<待 D-decorations 建>", nodeName: "BgBlobTopRight",        role: "氛围-装饰", weight: 2, allowedTools: ["单色径向渐变"],                                        decorationDensity: "中" }
      ]
    }
  }
}
// 总 weight = 8+5+4+1+2+2+2+1+1+1+1+2 = 30 ✅
// 主角数 = 2 (SubmitBtn + BrandLogo) ✅
// 装饰角色总和 = 2 ✅ ≤ 8
// 工具角色单点最高 = 2 ✅ ≤ 3
```

⚠️ `BgBlobTopRight` 的 nodeId 在 D-00-login-decorations 任务执行 `element/add` 后才会确定；本任务先用占位字符串。该任务执行时同步把真实 id 替换进 componentBudgets。

## 8. 后续任务约束（给下游 D-X-* 的合同）

- **D-00-login-decorations**：装饰节点总权重必须 ≤ 2（剩余预算）；建 1 个 BgBlobTopRight 即可，不再加 BgBlobBottomLeft
- **D-00-login-styles**：每节点 styles 必须**不超出 allowedTools**：
  - SubmitBtn 写出 8 weight 的样式（主色 + spring + focus 光晕，不上发光阴影）
  - BrandLogo 仅大字号居中，不引入双色装饰
  - FormCard 圆角 + sm 阴影，不引入边框双重描边
  - PhoneInput / CredentialInput 仅边框 + focus 光晕，错误态归 visualState
  - ModeToggle 仅字色 + 底部下划线，不做 spring 滑动条
  - GetCodeBtn 仅字色，不上描边药丸（基线规格的"描边"在此屏被预算否决 → 在 styles 任务中说明此偏差）
  - 装饰节点仅单色径向渐变，无 blur
- **D-00-login-materials**：高权重节点（≥ 7）应有 materialSpec：
  - SubmitBtn weight=8 → 仅按钮 spinner 图标需要素材（kind=icon，但小尺寸可以纯 CSS spinner，无需 materialSpec）
  - BrandLogo weight=5 → 是文字 logo（type=img 但本期用文字 div 承载即可），无需 PNG（可在 materialSpec 留 `kind=brand` 但 renderHint=text，详见 materials.md）
  - LockedIcon weight=5 → 需要 materialSpec（kind=icon，警告锁定图标）
  - BgBlobTopRight weight=2 → renderHint=css-gradient 即可，无需 PNG

**自检**：
- ✅ 总 weight 30 ≤ 30
- ✅ 主角 2 ≤ 2
- ✅ 工具角色单点 ≤ 3
- ✅ 装饰角色总和 ≤ 8
- ✅ 削减历程 v1→v11 完整记录
- ✅ 候选方案 ≥ 3 个 + 否决理由
- ✅ LockedView 边界路径独立核对（19 ≤ 30）
