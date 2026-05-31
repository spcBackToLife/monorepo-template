> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-materials
> 对应 schema 字段：node.meta.design.materialSpec

# D-00-login-materials — 素材规格

## 1. 需要 materialSpec 的节点清单

按 budget §7 后续任务约束 + tree 结构核对，本屏需要 materialSpec 的节点：

| 节点 | kind | renderHint | 优先级 | 已写 |
|------|------|-----------|:------:|:----:|
| BgBlobTopRight (装饰) | decoration | css-gradient | P0 | ✅ 已在 D-decorations 任务写入 |
| BrandLogo | brand | png | P1 | ⏳ 本任务 |
| LockedIcon | icon | svg | P1 | ⏳ 本任务 |
| SubmitSpinner | icon | css-only | P2 | ⏳ 本任务 |

**不需要 materialSpec 的节点**（论证）：
- PhoneInput / CredentialInput / PolicyCheckbox 等 input 元素 → 浏览器原生渲染，无需自定义素材
- 所有文字节点（BrandSlogan / Labels / Errors / Footer 链接 / LockedTitle 等）→ 字体由 theme.typography 决定，非"素材"
- ModeToggle / GetCodeBtn / RegisterLink / ForgotLink / LockedForgotLink 等按钮 → 纯 CSS（背景 / 字 / border）无 image
- PasswordToggleEye → 本期用 textTertiary 字色 + 字符 (隐式 ▽ 或 emoji) 占位；executor 阶段决定是否补 PNG/SVG（暂不写 materialSpec，归 D-coverage 自检覆盖）

## 2. BrandLogo materialSpec（kind=brand）

**风格论证**：theme intent `minimal+flat / decoration:minimal / seedColor #5B6CFF` + emotion 三角"简洁/友好/可信" + budget allowedTools `["大字号居中"]`

候选风格对比：
- 方案 A：纯文字 LOGO（单字 "C" 大字号或 "Campus" 字标）→ minimal 极致 → ✅ 与 theme 1:1 对齐
- 方案 B：图形 + 文字组合（如气泡/帽子 icon + 文字）→ ❌ 偏 playful，违反 decoration:minimal
- 方案 C：单图形 logo（如圆形蓝紫 blob 含字母）→ 候选

→ **采用方案 A 字标 logo**，简洁就是品牌；如本期未上传 PNG，executor 阶段可以直接渲染成 div 文字版（kind=brand 但 renderHint 取决于实施）

```jsonc
node.meta.design.materialSpec = {
  kind: "brand",
  renderHint: "png",                          // 推荐画 PNG；如未画则 executor 阶段降级为文字 div（fallback 路径）
  referenceFrame: { width: 240, height: 240 }, // 实际显示 120×120 但 PNG 用 2x 以保证 retina 清晰
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "简洁",
    geometricToOrganic: "几何为主",
    flatTo3D: "平面",
    orderlyToCasual: "规整偏中"
  },
  colorStrategy: {
    primary: { value: "$token:colors.primary", role: "字标主体" }
  },
  lineStyle: { width: "0", cap: "round", join: "round" },  // 字标无描边
  composition: "字母 'C' 居中粗体（fontWeight 700-900），letterSpacing -0.04em（极致紧凑），下方可选 'Campus' 小字（caption 字号，分散布局，secondary 色，可省略）。整体 240×240 内字母 C 占 ~70% 高度，居中。",
  safeZone: "四周 24px（10% padding）",
  layers: [
    { name: "字标主体", shape: "字母 C（无衬线粗体）", fill: "$token:colors.primary", stroke: "none", position: "居中", size: "168×168" }
  ],
  variants: [
    { name: "dark", scenario: "暗色主题（colorScheme=dark）切换时使用", diff: "primary → primaryDark（dark scheme 下 #7B89FF）" },
    { name: "small", scenario: "App 图标 / 小尺寸 64×64 内呈现", diff: "省略 letterSpacing 收紧，字号自动缩放" }
  ],
  qualityChecklist: [
    "240×240 参考框内 'C' 字居中",
    "字母 C 圆润但不软（圆角 0.15× 字宽，避免 sans-serif 直角）",
    "primary 色与 #5B6CFF 误差 < 5%",
    "透明通道正确（背景全透明）",
    "在 light/dark 主题下都不失辨识度",
    "100% 1x 显示 → 32px 时 'C' 仍可读"
  ],
  notes: "本期若 executor 不画 PNG，可用 div 文字版降级：BrandLogo 由 type=img 改为 'C' 字符 textContent + fontSize 96 + fontWeight 800 + letterSpacing -0.04em + color primary。但走 png 路径是首选——保证 retina 清晰 + 主题切换时可换 dark variant。"
}
```

## 3. LockedIcon materialSpec（kind=icon）

**风格论证**：lock 图标 + warning 暗示。theme.iconSpec `outline + simple + uniformStrokeWidth + geometricOnly + linecap:round + linejoin:round + width:1.5px`。

```jsonc
node.meta.design.materialSpec = {
  kind: "icon",
  renderHint: "svg",                         // 简单几何路径 → 内联 SVG
  referenceFrame: { width: 64, height: 64 },
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "简洁",
    geometricToOrganic: "几何为主",
    flatTo3D: "平面",
    orderlyToCasual: "规整"
  },
  colorStrategy: {
    primary: { value: "$token:colors.warning", role: "锁主体描边" }
  },
  lineStyle: { width: "2px", cap: "round", join: "round" },  // theme iconSpec 1.5px，但 64px 大尺寸下 2px 视觉更稳
  composition: "锁形图标——上半部 U 形挂环（约 24×20）+ 下半部矩形锁体（约 32×26 圆角矩形 radius 4），外层包一圈淡 warning 色圆形底圆 64×64（与父节点 LockedIcon 的 backgroundColor:warning + opacity:0.18 配合，外圆已由父节点提供，本素材只需画里层锁）",
  safeZone: "四周 8px padding（实际锁形 ~48×48）",
  layers: [
    { name: "挂环", shape: "U 形圆头线（180° 弧 + 两条直线）", fill: "none", stroke: "$token:colors.warning 2px round", position: "顶部居中", size: "24×20" },
    { name: "锁体", shape: "圆角矩形（radius 4）", fill: "none", stroke: "$token:colors.warning 2px round", position: "中下", size: "32×26" },
    { name: "钥匙孔", shape: "小圆 + 短线", fill: "$token:colors.warning", stroke: "none", position: "锁体中央", size: "4×6" }
  ],
  variants: [],
  qualityChecklist: [
    "64×64 参考框内锁形居中",
    "U 形挂环开口朝下，与锁体上沿对齐",
    "钥匙孔在锁体几何中心",
    "stroke 粗细一致 2px，圆头圆角连接（无锐角）",
    "warning 色 #FBBE2E 误差 < 5%",
    "透明背景"
  ],
  notes: "图标在 LockedIcon 节点内显示（其父节点已通过 backgroundColor:warning + opacity:0.18 提供淡色背景圆 + 64×64 容器）；本素材只画图标本身。renderHint=svg 时 executor 可以直接把 layers 翻译为 inline SVG path 写到 props.svgContent 或注入到 LockedIcon 子 div 内。"
}
```

## 4. SubmitSpinner materialSpec（kind=icon, css-only）

**论证**：CSS spinner 已通过 styles.animation: "spin 0.8s linear infinite" + border 实现。无需 PNG/SVG，但仍写 materialSpec 以满足 R-MATERIAL 检查。

```jsonc
node.meta.design.materialSpec = {
  kind: "icon",
  renderHint: "css-only",
  referenceFrame: { width: 16, height: 16 },
  background: "transparent",
  styleAnalysis: {
    simpleToRich: "简洁",
    geometricToOrganic: "几何",
    flatTo3D: "平面",
    orderlyToCasual: "规整"
  },
  colorStrategy: {
    primary: { value: "$token:colors.textInverse", role: "活动弧" },
    neutral: { value: "rgba(255,255,255,0.35)", role: "背景圆环" }
  },
  composition: "圆环 spinner——背景半透明白圆环 + 顶部白色活动弧。CSS animation @keyframes spin 实现 0deg→360deg 旋转，duration 0.8s linear 无限循环。",
  layers: [
    { name: "圆环", shape: "圆形 border 2px", fill: "transparent", stroke: "rgba(255,255,255,0.35) 2px", position: "居中", size: "16×16" },
    { name: "活动弧", shape: "圆形 border-top 2px（其他三边继承环色）", fill: "transparent", stroke: "$token:colors.textInverse 2px (top only)", position: "顶部", size: "16×16" }
  ],
  qualityChecklist: [
    "16×16 居中",
    "动画流畅 0.8s linear 一圈",
    "活动弧与环底色对比足够（白 vs 35% 白）",
    "loading 视觉态切换显示，default/其他态隐藏"
  ],
  notes: "全 CSS 实现：styles.border + borderTopColor + animation 已表达。renderHint=css-only 时 executor 跳过素材绘制，仅做截图核对 spinner 在 SubmitBtn loading 态显示。需要 executor 阶段在全局或 SubmitSpinner 父节点注入 @keyframes spin {to {transform: rotate(360deg)}} 一次（platform.injectKeyframes custom action 或直接全局 CSS）。"
}
```

## 5. ★ 沉淀到 schema 的结论

```jsonc
// MCP step 1: BrandLogo
meta/set_node {
  projectId, nodeId: "nd_d7d8b56e2d934187bbb9b",
  patch: { design: { materialSpec: {...§2 结构...} } }
}

// MCP step 2: LockedIcon
meta/set_node {
  projectId, nodeId: "nd_8b4253353f804cc89e563",
  patch: { design: { materialSpec: {...§3 结构...} } }
}

// MCP step 3: SubmitSpinner
meta/set_node {
  projectId, nodeId: "nd_4363095a27b24f7a8aae6",
  patch: { design: { materialSpec: {...§4 结构...} } }
}
```

**自检**：
- ✅ kind 仅 2 类（brand / icon），decoration 已在 D-decorations 写过；无 illustration/background（不需要）
- ✅ 所有 colorStrategy.value 用 token，例外仅白色 + rgba 白半透明
- ✅ composition 不空话，每条都精确到尺寸/位置/构图意图
- ✅ qualityChecklist 都是可验证条目（无"好看"主观词）
- ✅ renderHint 与实施路径一致（BrandLogo png / LockedIcon svg / SubmitSpinner css-only / BgBlobTopRight css-gradient）
