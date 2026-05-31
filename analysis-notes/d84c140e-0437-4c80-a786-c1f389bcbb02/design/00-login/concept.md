> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-concept
> 对应 schema 字段：screen.meta.design.visualConcept（v3 新增）
> 必读方法论：references/methodology/02-visual-concept.md

---

# D-00-login-concept — 视觉概念 (Visual Concept)

## 0. 与 v2 emotion.md 的对接

v2 emotion.md 已定调"克制温度风"——3 形容词「简洁/友好/可信」、情绪曲线「好奇略防备 → 信任顺手 → 期待」、最终方案 C（A 温暖治愈 / B 极简 SaaS 否决）。

v3 concept 不是推翻 v2 emotion，而是**把它浓缩成一句"灵魂句"+ 3 个风格关键词 + mood board**，让后续 strategy/craft 有更可操作的方向把手。同时**回应 v2 实际落库后用户截图暴露的视觉问题**（Logo 占位虚线 / 装饰失效 / Tab 缺指示线 / Checkbox native 黑块 / FooterLinks 断裂 / 错误色尖锐）——这些问题源于 v2 视觉概念过于宽泛，没把"温度"具象化成可执行手段。

---

## 1. 候选风格方向（3 个）

| 候选 | 灵魂句（10-25 字）| 风格关键词 3（色/形/饰）| mood board（生活场景词 4 个）| 选 / 否决 |
|---|---|---|---|---|
| **A** 校园清晨 | 像清晨教室的光，温暖但不打扰 | 暖白米 / 大圆角柔和 / 单色光斑节制 | 晨光透过教室窗格 / 木桌上的笔记本 / 操场跑道的弧线 / 公告板上的便签 | ✅ **选定** |
| **B** 公文专业 | 严肃可靠的工具感，传递安全 | 冷白 / 直角理性 / 0 装饰 | 银行柜台 / 玻璃栏杆 / 网格底纹 / 收据纸张 | ❌ 否决 |
| **C** 校园活力 | 校园的多彩活力，让用户兴奋 | 多色 / 超大圆角 / 插画装饰 | 涂鸦墙 / 社团招新海报 / 彩色气球 / 校园集市 | ❌ 否决 |

---

## 2. 选定方向

| 维度 | 内容 |
|---|---|
| **灵魂句** | 像清晨教室的光，温暖但不打扰 |
| **风格关键词** | 暖白米（color）/ 大圆角柔和（shape）/ 单色光斑节制（decoration）|
| **mood board** | 晨光透过教室窗格 / 木桌上的笔记本 / 操场跑道的弧线 / 公告板上的便签 |

**情绪核心**：温度（warmth）—— 不是冷峻的科技温度，也不是甜腻的浪漫温度，而是「校园清晨」这种日常、可亲、可被信任的温度。

---

## 3. 选定理由（产品 + 主题 + 交互三向论证）

### 3.1 与产品的契合

| 产品要素 | 视觉概念回应 |
|---|---|
| 目标用户「大学生」 | "教室"、"操场"、"公告板"是大学生日常场景 → 视觉气氛即时唤起亲近感 |
| 用户来时心理「好奇略防备」 | "清晨的光" = 不刺眼、不审视 → 视觉直接降焦虑 |
| 本屏角色「招呼+工具+安抚」 | 招呼 = 暖意；工具 = 圆角柔和不锐利；安抚 = 单色光斑节制不喧宾夺主 |
| product rules「失败 5 次锁 30min」 | locked 态需要"被理解"而非"被惩罚"——清晨光的概念让 LockedView 也保留温度（即使在锁定中也不冷漠）|

### 3.2 与主题的契合

| theme.intent 字段 | 概念契合点 |
|---|---|
| aesthetics=minimal+flat | "节制装饰"直接对应；不超出 decorationRules 上限 |
| brightness=both | 暖白米=light（默认），dark scheme 下气氛仍温暖（textPrimary alpha 0.92 + 主色 #7B89FF 偏柔）|
| decoration=minimal | "单色光斑节制" 1-2 处 ≤ minimal 上限 |
| seedColors=#5B6CFF | 蓝紫=偏冷的温度，正好平衡暖白米底，避免过甜腻 → 蓝紫主色作为"单色温度"中的"温度调控点"|
| colorTemperature=neutral | 暖白米（带极少黄相）+ 蓝紫主色 → 视觉中性偏暖 |

### 3.3 与交互的契合

| state.view 字段 | 视觉概念支持 |
|---|---|
| loginMode（code/password 切换）| 大圆角柔和 → tab 切换用滑动指示线（TabIndicator），非"硬切" → 体现"温度连续性"|
| form.policy（必勾才能提交）| 单色光斑节制 → checkbox 用 1.5px 边框 + 主色对勾 → 不像"被强制点击"，是"主动同意"|
| submitting（提交中）| 暖白米 → SubmitBtn loading 时主色保持饱和度 + 加内嵌 spinner，不变灰禁用样 → 保持"被关心"的视觉感 |
| lockedUntil（账号锁定）| LockedView 用 warning 暖黄锁图标 + textSecondary 倒计时 → 不刺眼，"等等就好"|
| errors.{phone, credential}（字段错误）| 错误文字用稍微软化的红（讨论 errorSoft #E66565 候选）→ 不打回到防备，保留信任 |

---

## 4. 候选否决理由

### 候选 B（公文专业）否决

校园社交的目标用户是 95-00 后大学生，他们是"在小红书 / B 站 / 抖音长大的一代"，对**冷峻官僚**视觉天然抗拒。冷白+直角+网格的银行 / 政务级专业感会让用户觉得"被审视"而非"被欢迎"，降低注册转化率。

更关键的是**与 product 决策冲突**：失败锁定后的 LockedView 在公文风下会显得像"违规处罚通知"，加重用户挫败感；而清晨教室光风下，LockedView 是"等等就好"的温和提示。

### 候选 C（校园活力）否决

校园活力风的视觉语言（多色 / 超大圆角 / 插画装饰）有 2 个问题：

1. **降低安全可信度**：登录页涉及账号安全，多色+插画的视觉会让用户觉得"不像正经登录界面"。如**支付宝 / 微信** 登录页都是克制单色，从未走活泼路线，这是行业心智。

2. **与 theme.decoration=minimal 冲突**：theme 已经定调"装饰极少"，活泼风需要丰富装饰才能成立 → 概念与主题冲突 → 走 UpstreamChallenge 改 theme 不合理（theme 阶段已沉淀完整），不如换概念。

3. **校园活力风的视觉留给主屏 / Feed / 个人主页装扮**——登录页是"工具入口"，让活力出现在用户登录后的核心内容页。

---

## 5. 视觉概念 → strategy 5 维传递（预判）

| strategy 维度 | 本概念决定的方向 | 具体落处 |
|---|---|---|
| **色 (color)** | 60-30-10：60 暖白米 background + 30 surfaceElevated 卡片 / textSecondary 0.80α + 10 主色 #5B6CFF 强调 | 含 errorSoft 候选评估 |
| **字 (typography)** | 极简克制：display 28（BrandSlogan）/ h4 20（FormCard 标题）/ body-lg 16（输入框）/ body 14（label）/ caption 12（错误/链接），字重 600（标题）/500（按钮）/400（正文）| 数字等宽字体留给 LockedCountdown |
| **形 (shape)** | 大圆角柔和：FormCard radius lg 12 / SubmitBtn radius md 8 / Input radius md 8 / TabIndicator 2px 线条 / BrandLogo 圆形或圆角 240×240 | radius.full=药丸形不用 |
| **饰 (decoration)** | **装饰系统单一族 = soft-glow** 光斑系 → BgBlobTopRight 主色径向渐变 + 候选第二个左下小光斑 | 不混用插画 / 几何线条 / 纹理 |
| **律 (rhythm)** | 呼吸型间距：xs 4 / sm 8 / md 16 / lg 24 / xl 32 / 2xl 48；动效律：fast 150ms（hover/focus）/ normal 250ms（state 切换）/ slow 400ms（不用，登录页不需要长动画）| 缓动统一 cubic-bezier(0.4,0,0.2,1)|

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  "design": {
    "visualConcept": {
      "soulSentence": "像清晨教室的光，温暖但不打扰",
      "styleKeywords": ["暖白米", "大圆角柔和", "单色光斑节制"],
      "moodBoard": [
        "晨光透过教室窗格",
        "木桌上的笔记本",
        "操场跑道的弧线",
        "公告板上的便签"
      ],
      "emotionCore": "温度（warmth）—— 校园清晨日常感",
      "candidatesEvaluated": 3,
      "selectedCandidate": "A 校园清晨",
      "rejectionReasons": [
        { "candidate": "B 公文专业", "reason": "目标用户 95-00 后对冷峻官僚视觉抗拒；LockedView 在公文风下变处罚通知" },
        { "candidate": "C 校园活力", "reason": "登录页活泼降低安全可信度；与 theme.decoration=minimal 冲突" }
      ],
      "v2Continuity": "继承 v2 emotion.md 克制温度风方向，浓缩为可操作的灵魂句 + 关键词 3 + mood board，并预判 strategy 5 维"
    }
  }
}
```

---

## 7. 自检

- [x] 候选 3 个，全部给齐三件套
- [x] 灵魂句「像清晨教室的光，温暖但不打扰」含情绪核心（温度）+ 不空话
- [x] 风格关键词「暖白米 / 大圆角柔和 / 单色光斑节制」可视化、互不冲突
- [x] mood board 全是具体场景物（教室窗 / 笔记本 / 跑道 / 公告板），无品牌名
- [x] 选定理由含产品 + 主题 + 交互三向论证
- [x] 候选 B/C 否决理由具体（用户群心智 + 与 theme.decoration 冲突）
- [x] 即将调 meta/set_screen 写入 visualConcept
