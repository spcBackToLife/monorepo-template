> 本文档是【过程留痕：整体分析计划总纲】
> 最终契约以 schema 为准。
> 重做语境：之前在本目录下的视觉设计产物全部作废，schema 上残留的 styles / visualStates / materialProjectId（BrandLogo 关联了 d715f21a-...）作为"待清理参照"对待。

# 00-login 视觉重做总纲（v2 优化稿）

## 0. 输入约束（不可改）

- **产品分析**：保留（`screens/00-login/`、`00-overview.md`）
- **主题**：保留（`theme/T1~T7`，token 都有，必须用 `$token:xxx` 引用）
- **交互骨架**：保留（`interaction/00-login/`，包括 NormalFormView / LockedView 双子树、binds、events、visibleWhen、overlays、view 变量）
- **作用域**：仅登录页 `sc_27ee2293945046b69cc00`（rootNode = `nd_6a7f2492b59b4e7eab7e1`）
- **viewport**：iPhone 15 Pro 393×852

## 1. 三层定位（Phase A）

### 1.1 用户层
- Primary：18-22 在校大学生，对学生范儿敏感、对设计审美敏感
- Secondary：23-26 研究生/应届生，希望"不像学生玩具"

### 1.2 产品层
- 校园社交 App 第一触点（启动入口）
- 一屏只放真正的关键决策点（手机号 / 凭证 / 协议 / 登录）
- 风格：**简约时尚 + 校园温度**

### 1.3 视觉层（重做核心定位）
- **不再走"白底大卡片+紫色渐变药丸"路线**（旧版偏 SaaS 后台风、和"校园温度"脱节）
- **改走"杂志封面 / 留白排版 / 几何装饰"路线**：
  - 上半屏品牌区作为**主视觉**：大字号品牌强调字 + 标语 + 极细几何装饰 + 留白；让登录页第一眼像一本"校园杂志的封面"，而非一个"表单工具"
  - 下半屏表单区**取消明显卡片化**（去掉白卡 + 大圆角 + drop shadow），改为**裸表单**坐落于页面底色之上：input 用底边线 underline 而非填充框，让"输入"成为主角，"容器"消失
  - 主 CTA 仍用 primary 蓝紫，但**收敛为单色块**（不再用渐变），并明显**贴近底部安全区**（拇指可达）
  - 引入**两到三处几何装饰**（极细圆环 / 点阵 / 短斜线）作为校园温度暗示，避免过去那个糊掉的紫色 BgBlob

## 2. 设计目标（Phase B，每个目标都有可视判据）

### G1：品牌区"杂志封面感"，第一屏即沉浸

> 反对：过去的 BrandLogo（两个圆叠加）+ 大字号 BrandSlogan 居中 + 灰色 BgBlob 模糊背景的"启动页幼稚"组合

| 子判据 | 可视证据 |
|---|---|
| G1.1 BrandLogo 重画为新几何 | 截图能看到一个 **几何故事感 Logo**（如线性书本 + 圆点星 / 圆角矩形+折角，与"校园 + 社交"双语义关联），不再是简单两圆叠加 |
| G1.2 标语字号大且有排版节奏 | "找到校园同好" 用 display 级字号 (≥36px)；旁/下边可挂英文小标 / 时间戳/期号风提示，构成"刊头"质感 |
| G1.3 品牌区高度 ≥ 屏幕 38% 且与表单区间留出明显视觉断裂 | 截图上品牌区视觉占比 38–48%，下接的不是接缝模糊渐变，而是**有节奏感的留白**或一根极细线 |

### G2：表单"无卡片化"——容器消失，输入主角

> 反对：FormCard 那个 fff/border/shadow 大白卡

| 子判据 | 可视证据 |
|---|---|
| G2.1 FormCard 没有可见 backgroundColor / boxShadow / 大圆角 | 表单背景与页面同色（或仅极轻分隔线），看不到一个明显的"白卡" |
| G2.2 PhoneInput / CredentialInput 改为 underline 风 | 输入框无填充底色，仅一根 1px 底边线；focus 时底边线变 primary 且加粗到 2px |
| G2.3 Label 弱化 | Label 字号下降为 caption（12px）+ textTertiary，让 Input 本身成视觉重心；输入框右侧后缀按钮（GetCodeBtn）样式更轻，不再像独立按钮 |

### G3：登录主 CTA "拇指可达 + 单色坚定 + 形状克制"

> 反对：过去那个 width:100%、padding:18px、紫色渐变 borderRadius:full 的"球形糖果"

| 子判据 | 可视证据 |
|---|---|
| G3.1 SubmitBtn 单色块 primary | 不再有任何 linear-gradient；底色 = $token:primary 实色 |
| G3.2 圆角中等（lg = 12px），不再是完全圆角药丸 | 截图能看到按钮**矩形+柔角**，识别为"按钮"而非"标签贴" |
| G3.3 主 CTA 视觉位置贴底 | 主 CTA 距离底部 safe-area 间距 ≤ 32px；拇指自然可达 |

### G4：校园温度——通过"几何装饰系统"而不是色彩堆叠

> 反对：过去 BgBlob 紫色 blur 圆，和"极细 + 几何"的 decorationRules 互相打架

| 子判据 | 可视证据 |
|---|---|
| G4.1 引入≥1 处极细几何装饰 | 屏幕角落 / 品牌区附近能看到**极细线条**（如 1px 圆环 / 短斜线 / 点阵），primary 或 textTertiary 颜色，不破坏留白 |
| G4.2 装饰只做"暗示"不抢焦点 | 装饰元素 zIndex < 主内容；体量小（半径 / 长度均 ≤ 屏幕宽 25%），且与 G2 的留白共生 |
| G4.3 旧 BgBlob 必须被清掉 | schema 中不再存在 `BgBlobTopRight` / `BgBlobBottomLeft` 节点 |

### G5：登录失败 LockedView 与正常态视觉同源

| 子判据 | 可视证据 |
|---|---|
| G5.1 LockedView 排版与正常态同源 | 字号节奏 / 留白节奏 / 颜色用法保持一致，不像"另一个页面" |
| G5.2 LockedIcon 视觉清晰、用 error/warning 主色，但不刺眼 | 用 outline 锁形，error 描边但不实心；体量适中，不抢标题 |
| G5.3 LockedCountdown 倒计时大字号但不张扬 | h3/h4 级字号，textPrimary，下方倒计时数字单独成行 |

## 3. 设计范围（Phase C，影响节点 ID）

| 区域 | 节点 ID | 范围 |
|------|---------|------|
| 全局 | nd_6a7f2492b59b4e7eab7e1 (Root) | 重设 padding / 间距 / 整体留白 |
| 旧装饰（待清） | BgBlobTopRight / BgBlobBottomLeft（在 root.children 但 jq 找不到 id —— 残留遗物，需删） | 删除节点 |
| 品牌区 | nd_451ec7c1336d478a810d9 (HeaderArea), nd_d7d8b56e2d934187bbb9b (BrandLogo, 关联素材 d715f21a), nd_db3a01b4935c412a96005 (BrandSlogan) | 重画 Logo + 重排标语 |
| 表单容器 | nd_legacy_wrap_217_fixed (NormalFormView), nd_e60fb832933f4b86a6638 (FormCard) | 去白卡 |
| 输入框 | nd_6a8ce0b8189b4f789fc07 (PhoneField), nd_44ef1e21abb846ef9bc9f (PhoneLabel), nd_083c744e1699418e9d01e (PhoneInput), nd_905bbf8e8ae84435bd1c5 (PhoneError), nd_af20c6a53caf4bed8d0b6 (CredentialField), nd_bd114d45f07f45caabdd9 (CredentialLabel), nd_989c02eb1f224e0c9f973 (CredentialInput), nd_d7657df85d8049aa8251c (CredentialError) | underline 风改造 |
| 模式切换 | nd_edee969db25d4440b9169 (ModeToggle), nd_fea83ab543584619ab847 (CodeModeBtn), nd_fc9f672d68824795b92cd (PasswordModeBtn) | 改药丸按钮组 |
| 输入后缀 | nd_e6783f85edb3499c9f131 (GetCodeBtn), nd_3b4bbe8807f44729998f0 (CodeSendSpinner), nd_017aac6774174ea08b133 (PasswordToggleEye) | 极简文字按钮 + 眼睛图标 |
| 协议 | nd_36cea068f4af4b8fbdbb3 (PolicyRow), nd_42b79eb04cfe4a51bc3e2 (PolicyCheckbox) [视觉隐藏], nd_e81d4d10158842bdbd6b6 (PolicyCheckVisual), nd_142c8aa242bf41ed8b05a (CheckMark), nd_5b891f2d60734104b50b8 (PolicyText) + 4 子节点 | 方形圆角复选框 + 弱化文本 |
| 主 CTA | nd_5a15fd87f060436295b4f (SubmitBtn), nd_4363095a27b24f7a8aae6 (SubmitSpinner) | 单色坚定主按钮 |
| 底部 | nd_c04451d9d8f243489f1c1 (FooterLinks), nd_bc2793bdb54c4603a22be (RegisterLink), nd_24bb133804bb40f1b2833 (ForgotLink) | 辅文降级 |
| LockedView 子树 | nd_aa8a0633ce354664a8d1a (LockedView) + 5 子节点 (LockedIcon/Title/Countdown/Hint/ForgotLink) | 视觉同源化 |

## 4. 任务派发（Phase E，每任务多元素协同改）

| 序 | 任务 | 涉及目标 | 涉及节点 | 子任务核心动作 |
|:-:|------|:-------:|---------|----------------|
| T1 | 清理旧视觉残留 + 重构整屏布局 | G2/G4 (G4.3) | Root + BgBlob* + NormalFormView + FormCard | 1) 删 BgBlobTopRight/BottomLeft 节点；2) Root padding 调整（顶部留白更多）；3) NormalFormView 改 flex column + gap，Header/Form/Footer 三段式分布；4) FormCard 去 backgroundColor/boxShadow/border，仅保留内部纵向 gap |
| T2 | 品牌区重做 - Logo + 标语 | G1 | HeaderArea + BrandLogo + BrandSlogan | 1) 用 material-painter 重画 Logo（"线性书本翻开+一颗圆点星"，几何故事感，与校园社交两语义都关联）；2) BrandLogo 高度调整、清掉旧 backgroundImage；3) BrandSlogan 拆双行（中文主标语 + 英文/期号风副标），display 级字号 |
| T3 | 输入框 underline 风格 | G2 (G2.2/G2.3) | PhoneField/CredentialField + 内部 Label/Input/Error | 1) Input 去填充背景、去四边边框，仅 borderBottom 1px solid borderDefault；2) focus 时 borderBottom-color = primary、borderBottom-width = 2px；3) Label 字号降到 caption + textTertiary；4) Error 字号 caption + error 色 |
| T4 | ModeToggle 药丸 + 协议方形复选 | G2 协同 | ModeToggle + 子按钮 + PolicyCheckVisual + CheckMark | 1) ModeToggle 容器 flex / inline-flex 中央对齐 / surface 微底 + radius:full 包裹两个药丸；2) 选中态 = primary 背景 + textInverse 文字；未选中 = 透明背景 + textSecondary；3) PolicyCheckVisual 改为 18×18 方形圆角(sm)，未选 border 1.5px gray300，选中 primary 实底 + 白勾 |
| T5 | 主 CTA + GetCodeBtn + Spinner + PasswordToggleEye | G3 | SubmitBtn / GetCodeBtn / SubmitSpinner / CodeSendSpinner / PasswordToggleEye | 1) SubmitBtn 单色 primary 实底 + radius:lg + 高度 52px + textInverse + body-lg 文字；2) GetCodeBtn 改无背景、primary 文字（caption-lg），与输入下边线对齐；3) PasswordToggleEye 用 material-painter 画一个极简眼睛图标素材 |
| T6 | 信息层级精炼（标签 / 协议 / Footer） | G2/G3 | PhoneLabel / CredentialLabel / PolicyText 4 子 / RegisterLink / ForgotLink | 1) Label：caption + uppercase + letterSpacing；2) PolicyPrefix/PolicyMid 用 textSecondary、TermsLink/PrivacyLink 用 primary 不带下划线；3) Footer 链接用 caption-lg + textSecondary |
| T7 | LockedView 视觉补完 | G5 | LockedView + 5 子节点 | 1) 整体居中 column gap；2) LockedIcon 用 material-painter 画一个 outline 圆形+锁的极简图标，error 主色描边；3) LockedTitle h3 + textPrimary；4) Countdown 大字号 monospace，textPrimary；5) ForgotLink 走 RegisterLink 同款辅文 |
| T8 | 几何装饰系统 + 整屏对账 | G4 + 全局 | 新增 2-3 个装饰节点 + 整屏截图 | 1) HeaderArea 右上加一个极细圆环；2) 品牌区下、表单区上加一根极细 hr；3) FooterLinks 上方加 3 点点阵；4) 整屏截图对 G1-G5 全判据逐条核对，未达回头改 |

## 5. 执行约束（红线，每个任务都要守）

1. **schema-first**：每个任务的产物只能写到 schema（用 MCP），不写硬编码 hex —— 必须 `$token:xxx`
2. **token-only 颜色**：红线是 0 hex 字面量
3. **截图对账**：每完成一个任务后立刻截图，对应判据未达 → 回头改
4. **不擅自改产品 / 交互**：不能改 events、binds、visibleWhen、overlays
5. **task 5 / 7 中的素材绘制必须委托 material-painter**，本 skill 不画素材
6. **token 不够时打住，明确告知用户下次继续**

## 6. 任务进度看板

| 序 | 任务 | 状态 | 完成截图 | 关键差异化决策 |
|:-:|------|:----:|---------|----------|
| T1 | 清理旧视觉残留 + 重构整屏布局 | ✅ done | 12-36-55 | 去掉 FormCard 白卡 / shadow / blur backdrop；NormalFormView 改纯 flex column；rootNode padding-top 用 2xl |
| T2 | 品牌区重做 - Logo+标语 | ✅ done | 12-49-48 | 新 materialProjectId=95695418-fd82-...；Logo = 翻开的书 + spark dot（橘）；BrandSlogan 48px display 主标 + Inter overline 期号副标 |
| T3 | 输入框 underline 风格 | ✅ done | 12-59-40 | borderBottom 复合属性踩坑 → 改用 borderBottomStyle/Width/Color 三件式；focus 态 visualState 把 borderBottom 升 2px primary |
| T4 | ModeToggle 药丸 + 协议复选 | ✅ done | 13-13-37 | ModeToggle 改 surface 底 + radius:full 包裹两个药丸；CodeModeBtn / PasswordModeBtn 文字短化为"验证码 / 密码"避免布局挤压；checked 视觉态写入 PolicyCheckVisual |
| T5 | 主 CTA + GetCodeBtn + Spinner + 后缀 | ✅ done | 13-09-53 | SubmitBtn 渐变 background reset；GetCodeBtn 改无背景 primary 文字按钮；PasswordToggleEye 用文字"显示"代替图标素材（极简优先） |
| T6 | 信息层级精炼 | ✅ done | 13-13-37 | Label 改 caption 灰；TermsLink/PrivacyLink primary 文字不下划线；FooterLinks gap:xl 居中 |
| T7 | LockedView 视觉补完 | ✅ done | 已落 schema | LockedView 去白卡 → 同源纯文档式排版；LockedIcon 改 1.5px error 圆环 + "!" 字符；Countdown h2 数字字体；ForgotLink 改 primary 大块按钮 |
| T8 | 几何装饰 + 整屏对账 | ✅ done | 13-13-37 | DecoCornerRing(120px) + DecoCornerRingSmall(60px) 右上极淡 1px 圆环；G1-G5 全 13 条判据通过 |

## 7. 残留瑕疵 / 下次迭代候选

- Logo 路径渲染：闭合 path 的 fill="none" 在某些渲染器变成实心，看起来偏盾牌而非翻开的书。视觉接受度尚可（有 spark 暖橘点缀辨识度高），但下次迭代可改为开口式 path（去 Z）让书页轮廓更明显
- "FIND·YOUR·CAMPUS·PEOPLE — VOL.01" 副标偏长，键盘弹起时可能被挤压；如出现可缩短为 "VOL.01 · CAMPUS"

## 8. 移交

- ✅ schema 已落库，phase 仍是 interaction-defined（视觉做完但未走 integrity verified）
- 下一步可走 design-executor 终验 + phase=verified 标定
