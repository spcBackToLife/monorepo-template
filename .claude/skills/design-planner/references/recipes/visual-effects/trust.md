# 视觉效果配方：信任感（Trust）

> 适用：登录 / 注册 / 支付 / 实名认证 / 个人信息表单 / 隐私敏感场景
>
> **核心**：信任 = 视觉克制 + 蓝色调 + 锚点 icon + 大留白 + 无干扰装饰。

---

## 1. 视觉目标

让用户感受到"这是正经的、可信的、不是营销陷阱、不会乱用我的信息"。

不是 visualState 范畴的"切换效果"，而是**整屏视觉策略**——影响色板 / 装饰 / 文字 / 间距等多维度。

---

## 2. 视觉准则（5 条）

### 2.1 色板偏冷
- primary 选择：偏蓝紫（#5B6CFF / #4F46E5 / #2563EB 等）— 不要橙红粉等暖色
- background 偏冷白（#FCFCFD / #F8FAFC）— 不要奶白米白
- 强调色仅在 CTA 出现一处，**不在装饰里铺满**
- 避免高饱和

### 2.2 大留白 + 紧凑表单
- screen padding ≥ spacing.lg（24+）
- 表单字段间距 ≥ spacing.md（16）
- 标题与表单卡间距 ≥ spacing.xl（32）
- 卡片内 padding ≥ spacing.lg

### 2.3 锚点 icon（专业 + 安全暗示）
表单字段用前缀 icon 增强信任：
- 手机号字段前 phone icon
- 密码字段前 lock icon
- 验证码字段前 message icon
- 身份证字段前 id-card icon
- 银行卡字段前 card icon

⚠️ icon 必须**线条风格** + **单色**（用 textTertiary）—— 不要彩色填充 icon（显轻浮）。

### 2.4 装饰极简或无装饰
- 不允许使用：插画、卡通、夸张渐变、多色光斑
- 允许：单色微渐变背景（极淡）/ 直线分割 / 蓝紫 + 透明的柔光斑（强度 ≤ primaryLight × 0.6）
- **登录页等高信任场景，装饰角色 weight 总和 ≤ 4**（比一般场景更克制）

### 2.5 文字克制
- 字号梯度收紧：display ≤ 28px / h2 ≤ 22px / body 14-16px
- 不要"惊喜"字（霓虹色 / 描边字 / 渐变字）
- 错误提示用珊瑚红（warm error #E16A6A）—— 不要纯红 #FF0000

---

## 3. CSS 配方示例（登录页）

```jsonc
// screen.backgroundColor
"$token:colors.background"   // #FCFCFD 暖白偏冷

// 装饰节点 BgBlobTopRight
{
  styles: {
    position: "absolute",
    top: "-40px", right: "-60px",
    width: "200px", height: "200px",
    backgroundColor: "$token:colors.primaryLight",      // ★ 拆字段写：单 token 主色淡
    backgroundImage: "radial-gradient(circle, currentColor, transparent 70%)",
    color: "$token:colors.primaryLight",                // currentColor 注入
    opacity: "0.4",                                     // ★ 信任场景再降低
    borderRadius: "9999px",
    pointerEvents: "none",
    zIndex: 0
  }
}

// PhoneInput 字段 + 前缀 icon
PhoneFieldWrapper (div, position relative)
├── PhoneIcon (div, absolute left, $token:colors.textTertiary, 线条 SVG)
└── PhoneInput (input, paddingLeft: spacing.xl 给 icon 让位)

// SubmitBtn (主 CTA)
{
  backgroundColor: "$token:colors.primary",
  color: "$token:colors.textInverse",
  borderRadius: "$token:radius.lg",                     // 大圆角软化"硬"感
  fontWeight: 600,                                      // 不要 700+（显严苛）
  letterSpacing: "0.02em",
  // 不要渐变填充——信任场景 CTA 用纯色
  boxShadow: "$token:shadows.sm",                       // 弱阴影（不要 lg 浮夸）
  transition: "$token:transitions.normal.value"
}
```

---

## 4. 装饰节点的"信任版"

```
✅ 允许：
  - 单色径向光斑（primaryLight × opacity 0.4-0.6，仅 1-2 处）
  - 极淡线性渐变背景（primary → 透明，2-3% 强度）
  - 直线分割（borderLight 1px，章节间）

❌ 禁止：
  - 多色拼接装饰（活泼感 ≠ 信任感）
  - 卡通插画（除非 empty 态明确需要"不那么严肃"）
  - 大面积品牌色铺满（让用户警觉营销）
  - 动态闪烁 / 跳动光效
```

---

## 5. 与其他配方的关系

- **可叠加**：focus（信任场景的 focus 应是"克制光晕"而不是"浮夸光环"——参 focus 配方 §3.1）
- **可叠加**：hover floating（但阴影深度选 sm 不要 lg / xl）
- **冲突**：紧迫感（urgency）配方与 trust 直接冲突——同一屏不能既要信任又要紧迫；选一个

---

## 6. md 落地

```markdown
## 信任感视觉策略（参考 recipes/visual-effects/trust.md）

### 适用判定
本屏类型：登录 / 支付 / 实名认证 / 隐私敏感
→ 应用 trust 配方

### 5 条准则核查
- 色板偏冷：primary = 蓝紫 ✅
- 大留白：screen padding = 24 / 字段间距 = 16 ✅
- 锚点 icon：PhoneInput 前 phone icon、CredentialInput 前 message icon → 待 D-X-material-paint 画
- 装饰极简：仅 BgBlobTopRight 1 处，opacity 0.4 ✅
- 文字克制：display=28 / h2=22 / body=14-16 / 错误用 #E16A6A ✅

### ★ 沉淀到 schema 的结论
[装饰节点 styles 调整 + 字段图标节点 add + materialSpec 写]
```

---

## 7. 自审重点

- 维度 4「主题契合」：本屏是否表达出 trust 气质？陌生人看截图是否会觉得"看着挺正经的"？
- 维度 5「情绪传达」：是否避免了"营销感 / 政务感 / 玩具感"三种 trust 反面？

---

## 8. 红线

- ❌ 信任场景用橙红粉等暖色作为 primary
- ❌ 装饰用插画 / 多色光斑
- ❌ CTA 用渐变填充（暗示营销）
- ❌ 字段无前缀 icon（缺锚点）
- ❌ 错误用纯红（情绪太冲）
