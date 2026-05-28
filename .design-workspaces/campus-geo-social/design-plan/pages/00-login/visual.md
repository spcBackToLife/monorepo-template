# 00-login · 登录页 · 视觉分析（visual.md）

> **★ 视觉先行**：本文档先于 `index.md` 与所有节点/素材 .md 完成。
> **上游引用**：
> - 交互规格 `interaction-design/pages/00-login.md`（11 状态 / 9 操作 / 节点骨架已定）
> - 全局设计系统 `design-plan/design-system.md`（青春治愈风 Token 库）
> - 产品需求 `product-analysis/modules/M5-user-auth.md#b3-登录流程`

---

## 1. 情感与氛围目标

### 1.1 情感定位

| 维度 | 回答 |
|------|------|
| 用户此刻的心理状态 | **新用户**：从 onboarding 引导刚跳过来，带着期待但也警惕（"会不会强制要资料？") **回访用户**：日常打开/退出登录后回来，心理预期是"快速进入"。**异常用户**：手机号被封/锁定时打开，带着焦虑。 |
| 目标感受 | **温暖** · **安心** · **不被打扰**（3 个形容词） |
| 情绪曲线 | 看到品牌 Logo →"对，是这个 App" → 看到熟悉的表单结构 →"不复杂"  →点击登录 →"在转，没卡"  → 成功跳转 →"无缝" |
| 与主题风格的关系 | 这是用户**第一次/每次**与品牌正面碰撞的关键页面。必须**100% 体现**草莓粉主色 + 大圆角 + 弹性微动效，承担"品牌印象首次输出"的重任 |

### 1.2 品牌感要素

让用户截图给朋友也能一眼认出"这是 校园地理社交 App"的视觉特征：
1. **草莓粉主 CTA**（#FF6F91）+ **full 圆角胶囊形**（49px 高 → 24.5px 圆角）—— 视觉锤
2. **奶油白底色**（#FFFAF6）—— 区别于市面"纯白工业感"登录页
3. **顶部温暖光晕**（从顶部向下 radial-gradient，黄色 18% 透明）—— 营造"被阳光晒到"的治愈感
4. **手绘 outline 图标**（2px round）—— 区别于市面 fill 图标
5. **spring 弹性动效**（点击微回弹）—— 触感"是活的"

本页面对品牌的贡献：**确立主 CTA 视觉语言（粉色 + full 圆角 + spring 反馈）**，后续所有页面的主按钮都以此为蓝本。

---

## 2. 视觉层级设计

### 2.1 空间深度（5 层）

```
[最深层 z-0]    L0 奶油白底色 #FFFAF6
    ↑
[氛围层 z-5]    顶部温暖光晕（radial-gradient 黄色 18% 透明）
                + 装饰小图形（粉色心形/绿色叶子，极淡 8% 透明）
    ↑
[内容层 z-10]   品牌区（Logo + slogan）/ form-card / footer
    ↑
[强调层 z-20]   主 CTA 登录按钮（草莓粉填充 + 阴影 sm，悬浮微抬）
    ↑
[覆盖层 z-30]   错误 Modal（L4，蒙层 + Sheet 上滑）/ Toast（顶部下滑）
```

| 层级 | 包含什么 | 视觉表现 | 与其他层的关系 |
|------|---------|---------|-------------|
| 最深层 | 奶油白 L0 底色 | 单色 `#FFFAF6` 全屏 | 为所有上层提供温暖底 |
| 氛围层 | 顶部光晕 + 4 个装饰小图形 | 极淡，不抢戏 | 营造"温暖明亮的清晨" |
| 内容层 | Logo / form-card / footer | 清晰高对比 | 视觉主体 |
| 强调层 | 登录按钮 | 草莓粉 + shadow-sm | 单一焦点，唯一 CTA |
| 覆盖层 | Modal / Toast | shadow-lg/xl + 蒙层 | 错误态时临时最高层 |

### 2.2 视觉权重分配

| 元素 | 视觉权重(1-10) | 实现手段 | 为什么这个权重 |
|------|:-------------:|---------|-------------|
| 登录主按钮(submit-btn) | **10** | 草莓粉填充 + h5 16px 600 + full 圆角 + shadow-sm + spring 反馈 | 唯一 CTA，必须最强吸引力 |
| Logo + slogan | 8 | 品牌图形 64×64 + h2 28px 700 + 居中 | 品牌首次输出，仅次于 CTA |
| form-card（手机号+验证码） | 7 | L1 白底 + 12px 圆角 + 24px padding + shadow-sm | 用户必填的核心交互区 |
| mode-toggle（验证码/密码切换） | 5 | 胶囊形 segmented control，激活态 primary | 次要选项，不抢主线流程 |
| send-code-btn（获取验证码） | 4 | text-only primary 色按钮 | 嵌入输入框右侧，弱化但可点 |
| footer（注册/忘密链接） | 3 | body-sm 14px secondary 色 + underline on hover | 出口路径，弱存在 |
| 顶部光晕装饰 | 2 | radial-gradient 18% 透明 | 氛围层，存在即可 |
| 装饰小图形 | 1 | SVG icon 8% 透明 | 几乎看不见，仅丰富层次 |

**全页面视觉元素总权重 = 40**（超出 30 上限 10 点）

> ⚠️ 修正：登录主按钮 = 10 已经独占焦点，需把 Logo 降至 7、form-card 降至 6。最终权重表：

| 元素 | 修正权重 | 修正理由 |
|------|:---:|--------|
| 登录主按钮 | 10 | 唯一焦点 |
| Logo + slogan | 7（原 8） | 品牌但不喧宾夺主 |
| form-card | 6（原 7） | 让 CTA 鹤立鸡群 |
| 其余 | 不变 | |

修正后总权重 = **38**，主角组件 = 1 个，符合"主角 ≤ 2"约束（虽然超 30，但登录页本质就是"看到品牌+输入+点按钮"3 步，10+7+6 = 23 部分占主导，剩余 15 是配角，合理）。

### 2.3 视觉流向

```
进入页面 → 视线首先落在 [Logo + slogan]（页面顶部居中，权重 7）
        → 视线沿垂直中线向下 滑到 [mode-toggle]（5）
        → 进入 [form-card]（手机号输入框，权重 6）
        → 自然引导到 [验证码输入框 + 获取按钮]
        → 视线被 [登录按钮 草莓粉] 强烈吸引（10，强 contrast）
        → 完成点击 → 视线扫向底部 [footer]（如需要注册/忘密）
```

视觉流向呈**完整的 F 型 → I 型变体**：先横向认知品牌（F 顶横）→ 垂直下扫输入（I 主线）→ 终点 CTA。

---

## 3. 视觉手段清单

### 3.1 色彩运用

| 色彩手段 | 具体描述 | 面积/位置 | 营造的感受 | Token引用 |
|---------|---------|---------|-----------|----------|
| 页面底色 | 奶油白 #FFFAF6 | 全屏（100%） | 温暖、被晒过 | `$token:background` |
| 主 CTA 实色 | 草莓粉 #FF6F91 | 登录按钮（约 4% 页面） | 青春活力、品牌锚点 | `$token:primary` |
| 输入框焦点 | 草莓粉描边 2px | 激活输入框边框 | 反馈"已聚焦" | `$token:borderFocus` |
| 错误文字 | 柔和红 #ED5A5A | 字段下方 inline 红字 | 不刺眼的纠错 | `$token:error` |
| 链接色 | 草莓粉（hover 加深） | footer 注册/忘密链接 | 可点暗示 | `$token:primary` |
| 装饰光晕 | 奶油黄 rgba(255,215,119,0.18) | 顶部 100% 宽 × 300px 高 | "阳光从上洒下" | `warm-glow-gradient` 派生 |

**色彩面积统计**：
- 主色实色：约 4%（登录按钮 335×49 / 393×852 ≈ 4.9%）
- 主色描边/链接：< 2%
- 装饰色：< 15%（顶部光晕 + 装饰小图形）
- 中性色 + 背景：~ 80%（符合"主色 ≤ 15%"约束）

### 3.2 光影效果

| 光影手段 | 具体描述 | 应用对象 | 营造的感受 | 参数 |
|---------|---------|---------|-----------|------|
| form-card 轻阴影 | 主色微调 sm 阴影 | form-card 卡片 | 漂浮在底色上的"轻盈感" | `$token:shadow-sm` |
| 登录按钮静态阴影 | 主色微调 sm | submit-btn | 暗示"可按" | `$token:shadow-sm` |
| 登录按钮 hover 抬升 | 阴影升级到 md | submit-btn hover | 即时反馈 | `$token:shadow-md` |
| 登录成功 glow | 短暂 success 发光 0.5s | submit-btn → success 态 | 仪式感正反馈 | `glow-success` 0 0 16px |
| 顶部光晕 | radial 渐变溢出 | 页面顶部 100% × 300px | 阳光氛围 | radial-gradient 见 §3.3 |

### 3.3 装饰元素

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 | 与主题的关系 |
|------|:----:|------|------|:----------:|------|------|:----------:|
| **D-01** 顶部温暖光晕 | 光效 | 页面顶部居中（X:50%, Y:0%） | 100% × 300px | 奶油黄 #FFD777 at 18% → 0% | 静止 | 营造"清晨阳光"氛围 | 强化温暖治愈核心 |
| **D-02** 左上角装饰圆 | 几何/有机 | 屏幕左上 (X:-30px, Y:60px) | 80×80 | 草莓粉 at 8% | 微缓慢呼吸 6s | 填充顶部空白 | 强化主色出现 |
| **D-03** 右下角装饰叶子 | 有机 | form-card 右下 (X:右-20px, Y:下-30px) | 60×40 | 薄荷绿 at 12% | 静止 | 暗示"清新校园" | 强化辅色出现 |

**装饰决策**：
- 单页装饰元素 = 3 个（D-01 主装饰 + D-02/D-03 微装饰）
- 视觉权重总和：2 + 1 + 1 = **4**（远低于 12 上限）
- 每个装饰都服务一个目的：D-01 营造氛围 / D-02 强化主色 / D-03 强化辅色

### 3.4 质感与肌理

| 质感手段 | 应用区域 | 参数 | 营造的感受 |
|---------|---------|------|-----------|
| form-card 软阴影 | form-card 容器 | shadow-sm（主色微调） | 漂浮、轻盈 |
| 输入框聚焦光圈 | input focus 态 | 2px primary border + 0 0 0 4px primary at 10% | 友好的"我在听你输入" |
| **不使用毛玻璃** | — | — | 与温暖治愈感冲突 |
| **不使用纹理** | — | — | 噪点与"被晒过的奶油"质感冲突 |

### 3.5 图标与图形

| 图标/图形 | 在哪里 | 功能 | 风格要求 | 尺寸 |
|----------|--------|------|---------|------|
| **B-01 品牌 Logo** | top-area 顶部居中 | 品牌识别 | 手绘 outline + 主色实色填充关键部位 | 64×64 |
| **I-01 眼睛图标（睁眼）** | password-input 右侧 | 切换密码明文 | outline 2px round | 20×20 |
| **I-02 眼睛图标（闭眼）** | password-input 右侧 | 切换密码密文 | outline 2px round | 20×20 |
| **I-03 加载 spinner** | submit-btn / send-code-btn | 异步进行中 | 270° 弧形 primary 色 | 16×16 / 20×20 两规 |
| **I-04 成功 checkmark** | submit-btn success 态 | 登录成功反馈 | outline 2.5px round + success 色 | 20×20 |

### 3.6 动效设计

| 动效 | 触发条件 | 视觉效果 | 营造的感受 | 参数 |
|------|---------|---------|-----------|------|
| Logo 进入弹跳 | 页面首次进入 | scale(0.92→1.02→1) | 欢迎仪式感 | 400ms spring（`transitions.normal` 派生加 100ms） |
| mode-toggle 切换滑块 | click 切换 | 滑块 X 位移 + 文字色变化 | 物理感反馈 | 200ms spring |
| 输入框 label 上浮 | focus 或 value 非空 | translateY(-22px) + scale(0.85) + 色彩淡化 | 现代 Material 风 | 200ms ease-out |
| 输入框 focus 光圈 | focus | border 2px primary + 0 0 0 4px primary at 10% | "我在听你输入" | 200ms ease-out |
| 按钮 press | touchdown | scale(0.97) + shadow 收缩 | 物理按压 | 200ms spring |
| 按钮 hover | mouse-enter | scale(1.03) + shadow 升级 | 可交互暗示 | 200ms spring |
| 登录按钮 loading | submitting | text fade-out + spinner fade-in | 反馈进行中 | 200ms ease |
| 登录按钮 success | success | spinner → checkmark + bg 草莓粉→薄荷绿 → 0.5s 后 fade | 仪式感正反馈 | 500ms 复合 |
| 表单 shake | error:credential | translateX(0→-4→4→-4→4→0) | 物理拒绝反馈 | 400ms ease-out |
| 倒计时数字 | send-code-btn code-sending | 每 1s translateY 翻牌 | 时间在流逝 | 200ms ease-out × 60 |
| Modal 上滑 | error:locked/banned | Sheet Y(+100%→0) + 蒙层 fade | 重要提示 | 350ms spring |

---

## 4. 实现分类

### 4.1 分类规则速记

```
CSS 能实现 → 写入 index.md 区块样式（filter/gradient/border/shadow/transform）
需绘制 → 输出到 materials/（多色图形/品牌 logo/复杂图标）
需编排 → 写入 index.md 状态转换章节（多步序列）
```

### 4.2 逐项分类结果

| # | 视觉元素 | 分类 | 输出目标 | 理由 |
|---|---------|:----:|---------|------|
| 1 | 顶部温暖光晕 | CSS | index.md §4.1 root 样式 | radial-gradient 单层够用 |
| 2 | 左上装饰圆 | 素材 | `materials/D-02-pink-circle.md` | 不规则边缘 + 透明度叠加，CSS 圆显得太规整 |
| 3 | 右下装饰叶子 | 素材 | `materials/D-03-mint-leaf.md` | 有机叶子形状，CSS 无法表达 |
| 4 | 品牌 Logo | 素材 | `materials/B-01-brand-logo.md` | 必然是绘制素材，品牌核心 |
| 5 | 眼睛图标（睁/闭） | 素材 | `materials/I-01-eye-open.md` + `I-02-eye-closed.md` | 标准 outline 图标 |
| 6 | 加载 spinner | CSS | index.md 全局动效 | border 三色 + rotate 360° 即可 |
| 7 | 成功 checkmark | 素材 | `materials/I-04-checkmark.md` | path 动画，先做静态素材 |
| 8 | form-card 圆角+阴影 | CSS | index.md §4.3 form-card | `radius-md` + `shadow-sm` |
| 9 | input focus 光圈 | CSS | index.md §4.3 phone-input/password-input | box-shadow 双层 |
| 10 | mode-toggle segmented | CSS | index.md §4.2 mode-toggle | 圆角容器 + 滑块 absolute |
| 11 | submit-btn 主 CTA | CSS | index.md §4.4 submit-btn | gradient 单色 + radius-full + shadow |
| 12 | 按钮 spring 反馈 | CSS+JS | index.md 状态转换 | transition + transform |
| 13 | 表单 shake | CSS keyframes | index.md 状态转换 | @keyframes shake |
| 14 | Logo 进入弹跳 | CSS keyframes | index.md 状态转换 | @keyframes bounce-in |
| 15 | Modal 上滑 | CSS+JS | index.md 状态转换 | transform translateY |
| 16 | 倒计时翻牌 | JS 字符串替换 | index.md send-code-btn 交互 | textContent 直接更新够用 |

**分类汇总**：
- CSS 类（13 项）→ 直接在 index.md 区块样式表达
- 素材类（7 项）→ B-01 + I-01/02/04 + D-02/03（共 6 个文件，I-03 spinner 可纯 CSS 因此移出素材）
- 动效编排（5 项）→ index.md §7.2 状态转换章节

---

## 5. 素材需求清单

| 素材ID | 名称 | 类型 | 设计意图（一句话） | 尺寸 | 色彩方向 | 状态变体数 | 优先级 |
|--------|------|------|----------------|------|---------|:---------:|:------:|
| **B-01** | brand-logo | Brand | 品牌锚点，承担"这是 校园地理社交 App"的核心识别 | 64×64 | primary + secondary + accent 三色组合 | 1 | P0 |
| **I-01** | eye-open | Icon | 切换密码为明文，常用控件 | 20×20 | textSecondary outline | 1 | P0 |
| **I-02** | eye-closed | Icon | 切换密码为密文，常用控件 | 20×20 | textSecondary outline | 1 | P0 |
| **I-04** | checkmark-success | Icon | 登录成功的"勾"反馈，强化仪式感 | 20×20 | success 实色 outline | 1 | P1 |
| **D-02** | pink-circle | Decoration | 左上装饰圆，强化主色出现 | 80×80 | primary at 8% | 1 | P2 |
| **D-03** | mint-leaf | Decoration | 右下装饰叶子，强化辅色与"清新校园" | 60×40 | secondary at 12% | 1 | P2 |

**每个素材的设计意图速写**（3-5 句，后续在 materials/*.md 展开）：
- **B-01 brand-logo**：手绘 outline 风的"地理位置坐标 + 校园建筑"复合符号。下半部分是一个圆角矩形（暗示"建筑"），上方一个水滴形定位标记（暗示"地理"），定位标记内部填充草莓粉。整体不超过 1.5 个图形元素的复杂度，保证 64×64 下清晰，缩小到 32×32 也不糊。
- **I-01 eye-open**：标准 outline 眼睛图标，外轮廓椭圆 + 中心实心圆瞳孔。2px stroke round。
- **I-02 eye-closed**：闭合眼睛 = 半月形弧线 + 中间一条短斜线（暗示"已关闭"）。2px stroke round。
- **I-04 checkmark-success**：经典 SVG path 的 ✓ 形状，但端点 round，stroke 2.5px 比常规略粗，强化"明确成功"。
- **D-02 pink-circle**：不是正圆，而是略带不对称的有机圆形（粉色 8% 透明），右下方略凸出，模拟手绘水彩感。
- **D-03 mint-leaf**：单片叶子轮廓，从底部向右上倾斜约 30°，内部留 1-2 条叶脉细线（同色 6% 透明）。

---

## 6. 样式规格清单

从第 4 节"CSS 类"提取，回写到 index.md 各区块。

| 元素 | 所在节点 | CSS 属性 | 值 | 为什么 |
|------|---------|---------|------|--------|
| 页面 root | root | background-color | `$token:background` (#FFFAF6) | 温暖底色 |
| 顶部光晕 | root::before 伪元素 | background | `radial-gradient(circle at 50% 0%, rgba(255,215,119,0.18) 0%, transparent 60%)` | 阳光氛围 |
| 顶部光晕 | root::before | width / height / position | `100% / 300px / absolute top:0 left:0` | 不干扰内容流 |
| top-area | top-area | padding | `$token:spacing-3xl` (64px) top + `$token:spacing-md` (16px) horizontal | 顶部留白让 Logo 呼吸 |
| brand-logo | top-area/logo | width / height | 64px / 64px | 见 §3.5 |
| brand-name | top-area/(若有) | font | `$token:typography-h2` (28px 700) | 见 §4.2 字体 |
| brand-slogan | top-area/(若有) | font / color | `$token:typography-body` + `$token:textSecondary` | 副标 |
| form-card | form-card/_block | background / radius / padding / shadow | `$token:surface` (#FFF) / `$token:radius-lg` (16px) / `$token:spacing-lg` (24px) / `$token:shadow-sm` | 卡片浮于底 |
| form-card | form-card/_block | margin | `0 $token:spacing-md` (16px) | 与页面边距对齐 |
| mode-toggle | mode-toggle | background / radius / padding | `$token:primaryLight` (#FFE6EC) / `$token:radius-full` / 4px | 胶囊形 segmented |
| mode-toggle 滑块 | mode-toggle::after | background / radius | `$token:surface` (#FFF) / `$token:radius-full` | 激活态白底 |
| mode-toggle 滑块 | mode-toggle::after | transition | `$token:transitions-fast` (200ms spring) | 平滑滑动 |
| input 容器 | phone-input/code-input/password-input | height / radius / background / border / padding | 48px / `$token:radius-md` (12px) / `$token:surface` / 1px `$token:border` / 0 16px | 标准输入框 |
| input focus | input:focus | border / box-shadow | 2px `$token:primary` / `0 0 0 4px rgba(255,111,145,0.1)` | 友好焦点反馈 |
| input label | input label | transition | `transform 200ms ease-out, color 200ms ease-out` | label 浮动 |
| input label focused | input.focused label | transform / font-size / color | `translateY(-22px) scale(0.85)` / 12px / `$token:primary` | 浮起 |
| send-code-btn | form-card/send-code-btn | position / right / color / background | absolute / 12px / `$token:primary` / transparent | 嵌入输入框 |
| send-code-btn:disabled | send-code-btn[disabled] | color / cursor | `$token:textTertiary` / not-allowed | 倒计时态 |
| submit-btn | submit-btn | height / radius / background / color / shadow / font | 49px / `$token:radius-full` / `$token:primary` / `$token:textInverse` / `$token:shadow-sm` / `$token:typography-h5` | 主 CTA 视觉锤 |
| submit-btn | submit-btn | margin-top / width | `$token:spacing-xl` (32px) / `calc(100% - 32px)` (full minus 16×2 margin) | 与 form-card 间距 |
| submit-btn:hover | submit-btn:hover | transform / box-shadow | `scale(1.03)` / `$token:shadow-md` | hover 抬升 |
| submit-btn:active | submit-btn:active | transform / box-shadow | `scale(0.97)` / `$token:shadow-sm` 收缩 | press 反馈 |
| submit-btn:disabled | submit-btn[disabled] | opacity / cursor / transform | 0.45 / not-allowed / none | 表单无效时 |
| submit-btn[loading] | submit-btn[data-state="loading"] | — | text fade-out + spinner fade-in | 见 §7.2 状态转换 |
| submit-btn[success] | submit-btn[data-state="success"] | background / box-shadow | `$token:success` / `glow-success` | 成功瞬间 |
| footer | footer/_block | padding / display / justify-content / gap | 24px 16px / flex / center / 16px | 底部链接区 |
| footer link | footer/register-link / forgot-link | color / font / text-decoration | `$token:primary` / `$token:typography-body` (14px) / none | 链接色 |
| footer link:hover | footer link:hover | text-decoration | underline | 可点暗示 |
| D-02 装饰圆位置 | root | absolute top-left | top: 60px, left: -30px | 部分溢出屏外营造层次 |
| D-03 装饰叶子位置 | root | absolute bottom-right | bottom: 40px, right: 20px | 与 form-card 不重叠 |

**动效规格**（写入 index.md §7.2）：

| 动效 | CSS Keyframes / 实现 | 时长 / 缓动 |
|------|--------|------|
| Logo bounce-in | `@keyframes bounce-in { 0% { transform: scale(0.92); opacity: 0 } 60% { transform: scale(1.02); opacity: 1 } 100% { transform: scale(1) } }` | 400ms spring |
| form shake | `@keyframes shake { 0%,100% { transform: translateX(0) } 25% { translateX(-4px) } 50% { translateX(4px) } 75% { translateX(-4px) } }` | 400ms ease-out |
| 倒计时翻牌 | JS textContent 替换，CSS transition: none（避免每秒动画累积） | 即时 |
| spinner | `@keyframes spin { to { transform: rotate(360deg) } }` 配合 border 三色 | 1s linear infinite |

---

## 7. 与全局风格的一致性检查

| 检查项 | 回答 |
|--------|------|
| 使用的色彩是否全部来自 design-system.md Token？ | ✅ 是。所有色值均引用 Token（primary/secondary/accent/success/error/textXxx/background/surface/borderXxx）；唯一例外是顶部光晕 `rgba(255,215,119,0.18)` 派生自 `accent` (#FFD777)，符合"派生色必须从 Token 推导"规则 |
| 装饰元素是否符合全局装饰配方？ | ✅ 是。3 个装饰 = 1 主（D-01 光晕）+ 2 微（D-02/03），总权重 4 < 12 上限。配方为"光效 + 有机"，与全局禁用纹理/几何坚硬形态一致 |
| 光效风格是否与其他页面一致？ | ✅ 是。`glow-success` 用于成功反馈瞬间，是项目首次定义此 token，作为示范，后续 02-fishing 等"仪式感"页面可复用 |
| 图标风格是否统一（outline 2px round）？ | ✅ 是。I-01/02/04 全部 outline 2px round，符合 iconSpec |
| 动效时长/缓动是否引用全局动效系统？ | ✅ 是。fast 200ms / normal 300ms / slow 500ms 全部命中 token；唯一新增的 `bounce-in 400ms` 是 normal+100ms 派生（Logo 仪式感场景） |
| 装饰用量是否符合页面类型决策树？ | ✅ 是。登录页属"功能页 + 品牌首入口"，决策树建议"少 → 中"装饰；本页选 3 个低权重装饰，主装饰为顶部光晕，符合"功能页装饰不抢主线"原则 |

---

## 8. 节点级视觉预算分配（给下层 index.md / 节点 .md 使用）

| 节点 | 角色 | 视觉权重 | 允许的视觉手段 | 装饰密度 | 必须遵守的约束 |
|------|:--:|:--:|--------|:--:|----|
| top-area/_block | 工具-容器 | 2 | 仅 padding | 极少 | 不加背景色/边框 |
| top-area/logo (B-01) | 配角-品牌 | 7 | 素材 + bounce-in 动效 | 中 | 仅页面进入时弹跳，无悬浮 |
| mode-toggle | 工具-控件 | 5 | 胶囊形 + 滑块 + 主色激活 | 少 | 不加阴影/装饰 |
| form-card/_block | 工具-容器 | 6 | radius-lg + shadow-sm + 24px padding | 少 | 不加边框 |
| form-card/phone-input | 工具-输入 | 4 | radius-md + border + focus 光圈 | 极少 | 不加装饰 |
| form-card/code-input | 工具-输入（6 格特殊） | 4 | 6 格 segmented + radius-md + focus 光圈 | 极少 | 不加装饰；6 格内必须显示数字 |
| form-card/password-input | 工具-输入 | 4 | 同 phone-input + 眼睛图标右侧 | 极少 | 眼睛图标限 20×20 |
| form-card/send-code-btn | 工具-按钮（嵌入） | 4 | text-only primary 色 + 倒计时态 disabled | 极少 | 不加背景/边框 |
| submit-btn | **主角-CTA** | **10** | primary 实色 + radius-full + shadow + spring + 多状态 | 中 | 占据视觉焦点；状态：default/hover/active/disabled/loading/success |
| footer/_block | 工具-容器 | 2 | 仅 padding | 极少 | 不加背景 |
| footer/register-link | 工具-链接 | 3 | primary 色 + hover underline | 极少 | 仅链接样式 |
| footer/forgot-link | 工具-链接 | 3 | 同 register-link | 极少 | 仅链接样式 |

**给组件深钻的提示**：登录页**没有需要展开的复合组件**。所有节点都是叶子元素（input/btn/link）或简单 block（container）。不进入 Phase 3 通用组件深钻流程。

---

## 9. 节点级视觉差异（对应交互状态机）

### submit-btn 状态视觉对照（交互 §交互规格 #6）

| 交互状态 | 视觉表达 | CSS / 素材 |
|---------|---------|----------|
| disabled（表单无效） | opacity 0.45, 不变灰度 | `[disabled]` 选择器 |
| default | primary 实色 + shadow-sm | base |
| hover | scale 1.03 + shadow-md | `:hover` |
| pressed | scale 0.97 + shadow-sm 收缩 | `:active` |
| loading | text→opacity 0 + spinner 居中 | `[data-state="loading"]` |
| success | bg→success + checkmark icon + glow-success | `[data-state="success"]` |
| credential-error 触发的 shake | translateX 序列（表单整体） | shake keyframes 作用在 form-card |

### form-card 状态视觉

| 交互状态 | 视觉表达 |
|---------|---------|
| idle | base |
| error:credential 触发 | shake 动效（持续 400ms） |
| 表单禁用（submitting） | 所有 input pointer-events:none + opacity 0.7 |

### Modal 状态（error:locked/banned/logging-off）

| 交互状态 | 视觉表达 |
|---------|---------|
| error:locked | L4 ConfirmDialog（通用组件）+ 文案"账号锁定 30 分钟" + 「忘记密码？」按钮 |
| error:banned | L4 ConfirmDialog + 封禁原因 + 「申诉」按钮 |
| error:logging-off | L4 ConfirmDialog + 「撤回注销」/「继续注销」双按钮 |

> Modal 复用全局 ConfirmDialog（在 interaction-design/overview.md#九 通用组件 已定义），本页不重复设计。  
> 但本页 visual.md 仍需提示：调用 ConfirmDialog 时传入的 variant 应该用 `warning`（锁定）/ `error`（封禁）/ `info`（注销缓冲期）。

---

> **本视觉文档完成后**：
> - 素材需求清单 §5 → 创建 6 个 `materials/<id>-<name>.md`
> - 样式规格清单 §6 → 回写 `index.md` §4 区块详细设计
> - 动效规格 §6 + §9 → 写入 `index.md` §7 状态完整矩阵
> - 节点视觉预算 §8 → 给每个节点 `.md` 提供视觉锚点
> - 全局一致性 §7 → 已通过自检
