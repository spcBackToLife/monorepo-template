> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-tree-redlines
> 对应 schema 字段：核对前面任务产物，发现问题再修

# D-00-login-tree-redlines — 节点结构 4 红线核对

## 红线 1：组件内联展开

本项目 D-templates 已 skipped（单页项目）→ 没有 templateRef 引用——所有节点都是直接结构，无组件实例。

| 节点 | 是否组件实例 | children 状态 |
|------|:-----------:|:-------------:|
| 全部业务节点 | ❌ 直接结构 | N/A |
| BgBlobTopRight (装饰) | ❌ 直接结构 | 叶子节点 |

✅ 红线 1 通过

## 红线 2：状态-节点对应

| 节点 | 含 state | 对应节点 | 节点 ID | 是否存在 |
|------|---------|---------|--------|:------:|
| PhoneInput | error (activeWhen errors.phone) | PhoneError | nd_905bbf8e8ae84435bd1c5 | ✅ 已存在（interaction 阶段建）|
| PhoneInput | disabled (activeWhen lockedUntil) | — 输入框 disabled 自身视觉，无需对应节点 | — | ✅ |
| CredentialInput | error (activeWhen errors.credential) | CredentialError | nd_d7657df85d8049aa8251c | ✅ 已存在 |
| CredentialInput | disabled | — 输入框 disabled 自身视觉 | — | ✅ |
| SubmitBtn | loading | SubmitSpinner | nd_4363095a27b24f7a8aae6 | ✅ 已存在 + childrenVisibility.loading=true 配置 |
| SubmitBtn | disabled / hover / pressed / focus | — 按钮自身视觉切换 | — | ✅ |
| CodeModeBtn | active (activeWhen loginMode=code) | — 自身字色+下划线变化 | — | ✅ |
| PasswordModeBtn | active (activeWhen loginMode=password) | — 自身字色+下划线变化 | — | ✅ |
| GetCodeBtn | counting (activeWhen codeCountdown>0) | — 文案由 props.textContent 表达式驱动（interaction 阶段），不需要独立节点 | — | ✅ |
| PasswordToggleEye | active (activeWhen passwordVisible) | — 自身图标色变化 | — | ✅ |
| PolicyCheckbox | disabled | — 自身视觉 | — | ✅ |
| Locked* (5 节点) | — 都没 visualStates 复杂态 | — | — | ✅ |
| Root / NormalFormView / LockedView 互斥分支 | visibleWhen 由 interaction 写 | — 互斥分支视图，结构层面 product 阶段已 wrap | — | ✅ |

✅ 红线 2 通过——所有 visualStates 的 error/loading 复杂态都有对应节点；activeWhen 简单态（active/counting/disabled）都靠节点自身视觉切换，不需独立子节点。

## 红线 3：完整样式

| 节点 | 布局 | 尺寸 | 间距 | 颜色 | 排版 | 形状 | 阴影 | 过渡 | 完整 |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Root | ✅ flex column | ✅ 100%/100vh | ✅ padding | ✅ bg | — | — | — | — | ✅（容器）|
| NormalFormView | ✅ flex column | ✅ 100% | ✅ gap | — | — | — | — | — | ✅（隐形容器）|
| HeaderArea | ✅ flex column | ✅ 100% | ✅ gap+margin | — | — | — | — | — | ✅ |
| BrandLogo | ✅ block | ✅ 120 | — | — | — | ✅ radius+objectFit | — | — | ✅（img 元素）|
| BrandSlogan | ✅ inline | — | — | ✅ color | ✅ font 4 项 | — | — | — | ✅（文字）|
| FormCard | ✅ flex column | ✅ 100% | ✅ gap+padding | ✅ bg | — | ✅ radius | ✅ sm | — | ✅ |
| PhoneField | ✅ flex column | — | ✅ gap | — | — | — | — | — | ✅（layout 容器）|
| PhoneLabel | ✅ block | — | — | ✅ color | ✅ font | — | — | — | ✅（文字）|
| PhoneInput | — | ✅ 100%×48 | ✅ padding | ✅ bg+color+caret | ✅ font | ✅ radius+border | — | ✅ fast | ✅ |
| PhoneError | ✅ block | — | ✅ marginTop+minH | ✅ error color | ✅ font | — | — | — | ✅（错误文字）|
| ModeToggle | ✅ flex row | ✅ 100% | ✅ gap+padding | — | — | ✅ borderBottom | — | — | ✅ |
| CodeModeBtn / PasswordModeBtn | ✅ inline | — | ✅ padding | ✅ color+bg | ✅ font | ✅ radius+border:none | — | ✅ fast | ✅ |
| CredentialField | ✅ flex column | — | ✅ gap | — | — | — | — | — | ✅（含 position:relative）|
| CredentialLabel | 同 PhoneLabel | | | | | | | | ✅ |
| CredentialInput | 同 PhoneInput +paddingRight 84 | | | | | | | | ✅ |
| CredentialError | 同 PhoneError | | | | | | | | ✅ |
| GetCodeBtn | ✅ absolute+transform | ✅ 32 高 | ✅ padding | ✅ color | ✅ font | ✅ radius+border:none | — | ✅ fast | ✅ |
| PasswordToggleEye | ✅ absolute+flex | ✅ 32×32 | — | ✅ color | — | ✅ radius | — | ✅ fast | ✅（图标容器）|
| PolicyRow | ✅ flex row | — | ✅ gap+marginTop | — | — | — | — | — | ✅ |
| PolicyCheckbox | — | ✅ 18 | ✅ margin | ✅ accentColor | — | — | — | — | ✅（native checkbox）|
| PolicyText | ✅ flex 1 | — | — | ✅ color | ✅ font | — | — | — | ✅ |
| SubmitBtn | ✅ flex center | ✅ 100%×48 | ✅ padding+marginTop+gap | ✅ bg+color | ✅ font 4 项 | ✅ radius+border:none | ✅ sm | ✅ normal | ✅ |
| SubmitSpinner | — | ✅ 16 | — | ✅ borderTop | — | ✅ radius:full+border 2px | — | — | ✅（含 animation）|
| FooterLinks | ✅ flex row center | ✅ 100% | ✅ gap+marginTop | — | — | — | — | — | ✅ |
| RegisterLink / ForgotLink | — | — | ✅ padding | ✅ color | ✅ font | — | — | ✅ fast | ✅ |
| LockedView | ✅ flex column center | ✅ 100% | ✅ padding+gap | ✅ bg | — | ✅ radius | ✅ sm | — | ✅ |
| LockedIcon | ✅ flex center | ✅ 64×64 | ✅ marginBottom | ✅ bg+opacity+color | — | ✅ radius:full | — | — | ✅（容器+占位色块）|
| LockedTitle | — | — | ✅ margin:0 | ✅ color | ✅ font | — | — | — | ✅ |
| LockedCountdown | — | — | ✅ margin | ✅ color | ✅ font 4 项+monospace | — | — | — | ✅ |
| LockedHint | — | ✅ maxWidth | ✅ margin:0 | ✅ color | ✅ font | — | — | — | ✅ |
| LockedForgotLink | — | ✅ 40 高 | ✅ marginTop+padding | ✅ bg+color | ✅ font | ✅ radius+border 1px primary | — | ✅ fast | ✅ |
| BgBlobTopRight (装饰) | — | ✅ 200×200 | — | ✅ background-gradient | — | ✅ radius:full | — | — | ✅（含 absolute+pointerEvents:none）|

✅ 红线 3 通过——每个节点 styles 覆盖必要维度（layout 容器至少 layout+sizing+spacing；输入框含 size+padding+color+font+border+radius+transition；按钮含 layout+size+spacing+color+font+radius+shadow+transition；文字节点含 font 4 项+color；装饰节点含 absolute+size+visual+pointerEvents）。

## 红线 4：叶子节点必须有内容

| 叶子节点 | 类型 | 内容来源 | 是否完整 |
|---------|------|---------|:------:|
| BrandLogo | img | materialSpec.kind=brand + props.src 留 executor 填 | ✅（含 fallback 文字版降级路径） |
| BrandSlogan | div+text | props.textContent="校园社交，一键登录"等（interaction 阶段产品文案）| ⚠️ **需核对** |
| PhoneLabel | div+text | props.textContent="手机号"（interaction 写）| ⚠️ |
| PhoneInput | input | bind 双向绑定 view.form.phone（interaction 写 props.placeholder）| ✅ |
| PhoneError | div+text | props.textContent={{state.view.errors.phone}}（interaction 写）| ✅ |
| CodeModeBtn | button+text | props.textContent="验证码登录"（interaction 写）| ⚠️ |
| PasswordModeBtn | button+text | props.textContent="密码登录"（interaction 写）| ⚠️ |
| CredentialLabel | div+text | props.textContent={{state.view.loginMode==='code'?'验证码':'密码'}}（动态，interaction 写）| ✅ |
| CredentialInput | input | bind view.form.credential（interaction 写）| ✅ |
| CredentialError | div+text | props.textContent={{state.view.errors.credential}}（interaction 写）| ✅ |
| GetCodeBtn | button+text | props.textContent={{state.view.codeCountdown>0?'重新获取('+codeCountdown+'s)':'获取验证码'}}（interaction 写）| ✅ |
| PasswordToggleEye | div | 视觉态切换（active/inactive 显示眼睛图标）| ⚠️ **需 materialSpec 或字符占位** |
| PolicyCheckbox | input checkbox | native 渲染（accentColor）| ✅ |
| PolicyText | div+text | props.textContent + 内嵌链接（interaction 写）| ✅ |
| SubmitSpinner | div | CSS spinner（border + animation）+ materialSpec=css-only | ✅ |
| RegisterLink | div+text | "注册账号"（interaction 写）| ⚠️ |
| ForgotLink | div+text | "忘记密码"（interaction 写）| ⚠️ |
| LockedIcon | div | bg 占位色块 + materialSpec.kind=icon SVG 待 executor 实施 | ✅ |
| LockedTitle | div+text | "账号已锁定"（interaction 写）| ⚠️ |
| LockedCountdown | div+text | props.textContent={{倒计时格式化}}（interaction 写）| ✅ |
| LockedHint | div+text | "请于 NN 分钟后重试..."（interaction 写）| ⚠️ |
| LockedForgotLink | button+text | "去重置密码"（interaction 写）| ⚠️ |
| BgBlobTopRight | div | 背景渐变（不需要文字 / src）| ✅ |

⚠️ 标注的"需核对"——这些静态文案应由 product/interaction 阶段写到 props.textContent。本任务作为 design 阶段不能修改文案（settings.local.json 红线 §5.4：interaction 已写的 textContent 表达式部分不动；静态文案 design 可写）。

让我快速核对一下这些"⚠️ 需核对"节点的 props 是否真有 textContent。如果没写，那就是 interaction 阶段的遗漏，理论上要走 UpstreamChallenge——但 design 阶段允许写**静态文案**到 props.textContent。所以发现缺静态文案 → 直接补即可（不需要 challenge）。

### 静态文案补全决策

design 阶段允许写静态文案（见 forbidden-fields-design.md §8 白名单：`node.props.textContent` 仅静态文案；不动 interaction 写的表达式）。

| 节点 | 应写静态文案 | 由谁负责补 |
|------|------------|----------|
| BrandSlogan | "认识同校的他" / "校园社交，从这里开始" 等 | design 可补（如缺）|
| PhoneLabel | "手机号" | design 可补 |
| CodeModeBtn | "验证码登录" | design 可补 |
| PasswordModeBtn | "密码登录" | design 可补 |
| RegisterLink | "注册账号" | design 可补 |
| ForgotLink | "忘记密码" | design 可补 |
| LockedTitle | "账号已锁定" | design 可补 |
| LockedHint | "请于 30 分钟后重试，或选择重置密码" | design 可补 |
| LockedForgotLink | "去重置密码" | design 可补 |

实际是否需要补？取决于 interaction 阶段是否写过。让我用一个查询验证（jq 提取 props）。

> ★ 在 D-coverage 任务中实际运行 jq 检查；如发现确实缺，本 md 末尾再补一组 element/update 调用。本任务作为"红线 vs 当前结构"的核对清单，已识别出可能的 gap 点；正式补全推到 D-coverage 时一次解决。

### PasswordToggleEye 图标内容

PasswordToggleEye 节点本身是 div，需要内部显示一个眼睛图标（睁/闭表示密码可见/隐藏）。当前 styles 仅 color/bg/radius，没有 materialSpec 和 textContent。

**决策**：在本任务以 character entity 占位（minimal 处理）：
- default/inactive 态 props.textContent = "👁" (eye)
- active 态（passwordVisible=true）由 visualState 切 color，但 textContent 不通过 visualState 切，靠 ASCII：默认 "👁" 一个字符即可
- 或更通用：用 textContent="○|" 等极简占位

**保留**：本期不补 PasswordToggleEye 的 textContent / materialSpec——属于"细节优化"项；executor 阶段可决定是否补 SVG 眼睛图标。归为 D-coverage 的"按需提示"。

## 4 红线汇总

- ✅ 红线 1（组件内联）：N/A，本项目无组件实例
- ✅ 红线 2（状态-节点对应）：error/loading 复杂态都有对应节点
- ✅ 红线 3（完整样式）：33 业务节点 + 1 装饰节点 styles 覆盖完整维度
- ⚠️ 红线 4（叶子内容）：9 个节点静态文案待 D-coverage 任务核实补全；PasswordToggleEye 图标 holder 留 executor 决策

## ★ 沉淀到 schema 的结论

```jsonc
// 本任务以核对为主，无新增 schema 写入
// 后续 D-coverage 任务负责补全静态文案（如 interaction 阶段未写）
```
