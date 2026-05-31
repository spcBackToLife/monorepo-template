> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-emotion
> 对应 schema 字段：screen.meta.design.summary（≤60 字浓缩）+ 本 md 全文（论证）

# D-00-login-emotion — 登录页情感与氛围

## 1. 用户心理状态

| 维度 | 回答 |
|------|------|
| 用户从哪来？ | 三入口：① 应用商店首次下载 → 启动直跳；② 朋友/同学分享链接拉起 → 路由守卫拦截到登录；③ session 过期被 global-session-expired Modal 踢回 |
| 带着什么期望/情绪？ | **好奇**（这个校园社交是什么）+ **略防备**（为什么要手机号+协议必勾）+ **急迫想跳过**（"快让我看到内容！"）|
| 此屏对用户的"价值"是什么？ | **安心**（隐私可信）> **效率**（5 步进主屏）> **第一印象**（这个 App 看起来靠不靠谱）|

**关键观察**：登录页是品牌的"门面"——用户对应用的第一秒判断很大程度发生在这里。但同时它**不是终点**——必须让用户感觉"这只是个简单步骤，马上就能见到主菜"。

## 2. 目标感受（3 个形容词）

进入此屏 0.5 秒内，用户应**立即感受到**：

1. **简洁**（screenful 一眼看清结构 / 没有视觉噪音 / 用户秒懂"这是登录"）
2. **友好**（不冰冷 / 不学术 / 圆角与暖底化解"必填表单"的压迫感）
3. **可信**（不花哨 / 不 hype / 留白与克制传递"我们靠谱不会乱来"）

候选词对照（被否决的）：
- ❌ "温暖" → 太浓 → 与 theme `minimal` 冲突；用户期待是产品力不是情感按摩
- ❌ "时尚" → 太轻浮 → 校园用户对花哨的应用反而不信任
- ❌ "专业" → 太冷 → 沦为 SaaS 工具感；缺校园温度
- ❌ "高效" → 太工具 → 登录是过路屏，不需要强调"高效"作为情感词
- ✅ "简洁" "友好" "可信" → 三者构成"克制+温度+诚意"三角，与 theme intent 完美对齐

## 3. 情绪曲线

```
进入此屏  → A: 好奇 ＋ 略防备
   ↓                ("是个什么 App / 怎么登"，眼睛第一秒扫品牌名 + 卡片轮廓)
中段      → B: 信任 ＋ 顺手
   ↓                (输手机号→选模式→输验证码→勾协议，每一步都"刚好够用"
                     圆角和留白让"必填"不像负担)
完成离开  → C: 期待
                    (按下登录→0.5s 内见到 ✓ 或 spinner→已加入校园圈层的预感)
```

**情绪转换的视觉钩子**：
- 进入 → 中段：靠 BrandLogo + 卡片"承接式"的视觉（卡片像把表单"递"给用户而不是逼用户填写）
- 中段 → 完成：靠 SubmitBtn 的视觉权重 + 提交后 0.5s 的 ✓ 反馈（success visualState）传递"被接收"

## 4. 与主题（theme intent）的关系

theme.intent: `simple + flat / minimal decoration / neutral colorTemperature / both brightness / seedColor #5B6CFF（蓝紫）`
theme summary: "简约时尚 + 校园温度（极简留白 + 单一蓝紫强调色）"

本屏视觉如何**1:1 契合 theme**：
- ✅ **极简留白**：rootNode gap=`spacing.xl`(32) 让品牌区/卡片区/页脚区三段呼吸感强；FormCard 内部 gap=`md`(16) 让字段不挤
- ✅ **单一蓝紫强调色**：CTA / focus ring / link / checkbox checked 全部 `colors.primary`（#5B6CFF）；不引入 secondary 紫，避免"双色 carnival"
- ✅ **校园温度**：12px 圆角（`radius.lg`）替代 4px 直角 SaaS 感；`shadows.sm` 弱化阴影替代深 elevation
- ✅ **flat + minimal decoration**：装饰节点最多 1-2 个、透明度 ≤ 12%，绝不喧宾夺主

本屏**不需要**做的（避免与 theme 冲突）：
- ❌ 渐变 hero 背景 → playful 风险，theme 是 flat
- ❌ 卡通插画品牌 logo → minimal decoration 边界冲突
- ❌ 多色装饰光斑 → 与 single seedColor 冲突
- ❌ 暗色按钮黑底白字 → theme 是 light scheme 优先

## 5. 候选氛围方案对比

### 方案 A：温暖治愈风
- 视觉手段：粉色暖白 + 大圆形渐变光斑（角落溢出）+ 有机叶片装饰 + 药丸 CTA
- 情感表达：温暖、亲切、放松
- 适合人群：偏年轻女性向 / 美妆 / 治愈系产品
- ❌ **否决**：与 theme `aesthetics:[minimal,flat] + decoration:minimal + seedColor:#5B6CFF（冷色蓝紫）`完全冲突；视觉手段全是 organic + glow，违反 minimal+flat；色相方向（粉色）与 seedColor 不符

### 方案 B：极简专业风（纯白 SaaS）
- 视觉手段：纯白底 + 0 装饰 + 灰阶为主 + 直角输入框 + 蓝色 CTA
- 情感表达：专业、克制、可信
- 适合人群：B 端工具 / 后台管理 / 财务系统
- ❌ **否决**：缺"校园温度"；过度 SaaS 让校园用户觉得"这是个工具不是社交"；与 theme `cornerStyle: rounded` 不符；情感曲线缺转折点

### 方案 C：克制温度风（采用）★
- **视觉手段**：暖白底（`colors.background` `#FCFCFD` 微暖）+ 蓝紫单色（primary）作 CTA/focus/link + 12px 圆角软化锐利 + 1-2 个低饱和装饰（透明度 ≤12% 角落溢出 blob）+ shadow:sm 弱化卡片浮起
- **情感表达**：简洁（留白）、友好（圆角+微装饰）、可信（不花哨）
- **适合人群**：校园社交目标用户（18-25 学生 / 新生入学 / 毕业生求职）
- ✅ **采用**：与 theme intent 100% 对齐；情感三角"简洁/友好/可信"全部命中；视觉手段全部能落到现有 token；剩余视觉预算可承载装饰但不被装饰主导

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId: "sc_27ee2293945046b69cc00",
  patch: {
    design: {
      summary: "暖白底 + 蓝紫单色强调 + 12px 圆角软化 + 卡片承载表单 + 极简装饰 + 留白呼吸"
    }
  }
}
```

落到 schema 的字符数：约 36 字，符合 ≤ 60 字约束。

**自检**：
- ✅ summary 包含色调（暖白 + 蓝紫单色）+ 装饰类型（极简装饰）+ 主要组件视觉特征（圆角 / 卡片 / 留白）
- ✅ 不含"漂亮 / 现代 / 美观"等空话
- ✅ 3 形容词在推理段已论证
- ✅ 候选方案 ≥ 2 个 + 否决理由
- ✅ 与 theme intent 关系明确
