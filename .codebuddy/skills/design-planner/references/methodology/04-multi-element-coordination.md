# 04 — 多元素协同视觉

> 必读时机：执行 `D-X-G<N>-decompose` / `D-X-G<N>-craft` 任务时,涉及多元素协同（即所有 craft 任务）。
> 任务目的：解释"一个视觉效果需要几个元素一起协作"——这是用户提出的 Q4 反问的直接答案。

---

## 1. 核心信念

```
视觉效果 ≠ 单元素的 css 调整
视觉效果 = 多元素的协同合奏

例：
  ❌ "按钮浮起感" = 给 SubmitBtn 加个 box-shadow
  ✅ "按钮浮起感" = SubmitBtn 自身阴影加深 + 父容器留白 + 兄弟元素 opacity 微降 + 共用 transition
```

不理解协同 = 永远做不出真正的视觉效果,只能做出"看起来对但感觉不对"的字段值。

---

## 2. 4 角色框架（每个协同效果都有 4 角色）

### 2.1 4 角色定义

| 角色 | 任务 | 数量 |
|---|---|---|
| **主体** | 视觉效果作用的主对象（按钮 / 卡片 / 图标）| 1 |
| **邻居** | 与主体并列存在,需要配合主体的元素（同级兄弟）| 0-3 |
| **父容器** | 主体所在的容器,提供视觉舞台 / 留白 | 0-1 |
| **装饰** | 强化效果的辅助元素（背景光斑 / 角落溢出）| 0-2 |

### 2.2 4 角色协同的关键

```
主体: 自己做主要视觉变化（如颜色 / 尺寸 / shadow）
邻居: 弱化或避让,不抢戏（如降饱和 / 缩字 / 减权重）
父容器: 提供舞台 / 留白节奏 / 不动声色
装饰: 强化主题氛围 / 不和主体抢视觉重量
```

---

## 3. 7 种典型协同模式

每个 designGoal.impactMode 对应 1 种典型协同模式。具体改动按本节展开。

---

### 3.1 mood-conveyance（氛围传递）

**典型场景**：登录页 / Onboarding / 首页 hero 区氛围

**协同元素**：屏底 + Logo + 装饰群 + FormCard 等大块容器（≥ 4 元素）

**协同手段**：

```
主体: 屏底 (screen.backgroundColor)
  - 暖调走 #F8F4EE 偏黄米 / 冷调走 #F5F7FA 偏蓝灰
  - 与 #FFFFFF 距离 ≥ 5pt（避免接近不可见）

主角: Logo / Hero 元素 (BrandLogo)
  - 主色或暖色填充
  - 占首屏面积 ≥ 5%

邻居: FormCard / 主内容容器
  - 阴影偏暖（warmSoft）/ 偏冷（coolSoft）
  - 卡片色相不与主体冲突

父容器: Root / Body
  - 上方 padding 给 Logo 视觉呼吸（spacing.2xl 起）

装饰群: BgBlob / Texture / Pattern (2 处对角配重)
  - 透明度 ≥ 20% 避免接近不可见
  - 装饰系统单一族（soft-glow / illustration / 任选 1）
```

**反例**：
```
❌ 屏底 #FCFCFD（与白几乎一样）+ 装饰 12% alpha（接近不可见） + 0 个具象元素
   → "技术上满足约束,视觉上接近不存在" → 走 SaaS prior
```

---

### 3.2 cta-clarity（CTA 主角化）

**典型场景**：登录 / 提交 / 支付 / 关键决策按钮

**协同元素**：CTA + 邻居按钮 + 链接 + 父容器（3-5 元素）

**协同手段**：

```
主体: SubmitBtn (CTA)
  - 主色填充 + 大字号 (≥ body-lg) + ≥ 48px 高
  - 5 态视觉差异（default / hover / pressed / loading / disabled）
  - hover scale 1.02 / pressed scale 0.98

邻居弱化: 同区其他按钮 / 链接 (GetCodeBtn / RegisterLink / ForgotLink)
  - 字色弱化（textSecondary / textTertiary）
  - 字号缩小 1 档（caption / body）
  - 字重不抢戏（400-500）

父容器: FormCard
  - CTA 上方留白 ≥ spacing.md
  - 不与 CTA 形成视觉同等地位

装饰: 通常无 / 或 hover 时 ring 光晕 1 处
```

**关键判据**：
- SubmitBtn 与最近邻居 weight 差 ≥ 4
- SubmitBtn 字号 / 邻居字号 ≥ 1.2

---

### 3.3 trust-signal（信任传递 / 降焦虑）

**典型场景**：协议勾选 / 错误提示 / 隐私说明 / 锁定态

**协同元素**：主体控件 + 错误态文案 + 微动效（2-4 元素）

**协同手段**：

```
主体: 关键控件 (Checkbox / Input with error / LockedIcon)
  - 圆角柔和 (≥ radius.md / 8px)
  - 错误态字色软化（warmRed 而非 #DD0000）

邻居: 关联文案 (PolicyText / ErrorMessage / LockedHint)
  - 字号 caption 12px（不暴击）
  - 字色 textSecondary（不刺眼）

微动效: 状态切换 transition
  - 200-250ms ease-out
  - 不用 ease-in（突然 = 紧迫感）
```

**关键判据**：
- 错误态色与 #FF0000 距离 ≥ 30pt（不暴击）
- 状态切换有 ≥ 200ms transition

---

### 3.4 hierarchy（信息层级清晰）

**典型场景**：标题 + 副标 + 正文 + 注释（信息密集屏）

**协同元素**：标题 + 副标 + body + caption + footer 等（3-5 元素）

**协同手段**：

```
字号梯度: display 32 → h2 22 → body-lg 16 → body 14 → caption 12
  - 每档比上一档 ≥ 1.3×
  - 不超过 5 档（避免眼花）

字重梯度: 600 (主标) → 500 (副标 / label) → 400 (正文)
  - 主标与正文字重差 ≥ 200

色彩梯度: textPrimary (0.88α) → textSecondary (0.65α) → textTertiary (0.45α)
  - 每档 alpha 差 ≥ 0.2

留白梯度: 主标距上 spacing.xl → 副标距上 spacing.md → 正文距上 spacing.sm
```

**关键判据**：
- 信息层级 3-4 层金字塔成立
- 每层节点数比上层多 ≥ 1.5×

---

### 3.5 state-feedback（状态可见）

**典型场景**：tab 切换 / loginMode 切换 / 锁定态 / loading 态

**协同元素**：触发元素 + 联动元素 + transition（2-5 元素）

**协同手段**：

```
触发元素: tab / 按钮 / state.view 字段
  - 自身 active 视觉（字色 / 字重 / 下划线）

联动元素: 受触发影响的多元素
  - 内容容器视觉切换（NormalView ↔ LockedView）
  - 输入框旁边按钮可见性切换（ShowPwd / GetCode）
  - 主操作禁用切换

transition: 平滑过渡
  - 250-400ms cubic-bezier
  - 切换前后像素差 ≥ 3%（避免无感切换）
```

**关键判据**：
- 状态切换前后截图像素差 ≥ 3%（loginMode 切换）/ ≥ 50%（lockedView 切换）

---

### 3.6 brand-recognition（品牌识别）

**典型场景**：登录页 / 启动页 / 详情页顶部

**协同元素**：Logo + 主色应用 + 品牌字 / 装饰呼应（3-5 元素）

**协同手段**：

```
主体: BrandLogo
  - 真画 (非占位虚线) - 调 material-painter
  - 占首屏 ≥ 5%
  - 在 safe-area 内

邻居: BrandSlogan / 品牌副标
  - 字号 ≥ body-lg / 字重 600 / 字色 textPrimary

主色应用: SubmitBtn / link / accent 散点
  - primary 色出现 4-6 处（不超量）

装饰呼应: 角落装饰用主色淡染 (primaryLight + alpha)
  - 与 Logo 主色形成色相一致性
```

**关键判据**：
- Logo 真画 + 占面积 ≥ 5%
- 主色应用点 4-6 处（≤ 6 不超量,≥ 4 有存在感）

---

### 3.7 decoration-storytelling（装饰承载故事）

**典型场景**：营销 / 节日 / 内容主屏装饰

**协同元素**：装饰群 ≥ 2 + 主屏元素呼应（3-6 元素）

**协同手段**：

```
装饰群: ≥ 2 处装饰对角配重
  - 装饰系统单一族（soft-glow / illustration / texture / 任选 1）
  - 透明度 ≥ 20% 可见
  - 呼应概念 mood 关键词（如"校园清晨" → 教室窗格 / 跑道 / 笔记本 任选）

主屏呼应: 主元素引用装饰元素或色相
  - 卡片色相与装饰色相同源
  - 字色与装饰主色一致

留白节奏: 装饰间留白 ≥ spacing.xl
  - 避免装饰挤压主内容
```

**关键判据**：
- ≥ 2 处装饰呼应 mood 关键词
- 装饰系统单一族（不混杂）

---

## 4. 反例（典型协同失败）

### 4.1 单元素思维（典型反例）

❌ 错：
```
G1 = "校园温度",仅改 screen.backgroundColor: #FCFCFD
后果: 屏底色看不见 + Logo 占位虚线 + 装饰 12% alpha 接近不可见
     = 没有任何元素真传递"校园温度"
```

✅ 对：
```
G1 = "校园温度",涉及 screen + BrandLogo + HeaderArea + FormCard + 2 个 BgBlob
     共 6 元素协同 → 屏底偏暖 + Logo 主色填充字标 + 卡片暖阴影 + 2 装饰对角配重
     = "温度"在像素层面是 6 元素合奏的产物
```

### 4.2 角色冲突（双主角）

❌ 错：
```
G2 cta-clarity 把 SubmitBtn + GetCodeBtn 都标主角
后果: 两按钮视觉权重相近,用户视线分散,CTA 不够清晰
```

✅ 对：
```
G2 cta-clarity 只 SubmitBtn 主角 (weight 9)
GetCodeBtn 标邻居 (weight 3,字色弱化)
后果: 视觉主从分明
```

### 4.3 装饰抢戏

❌ 错：
```
G7 decoration-storytelling 装饰 weight=6 与配角持平
后果: 装饰反喧宾夺主
```

✅ 对：
```
装饰最高 weight ≤ 3
配角 weight 4-6
主角 weight 8-9
```

---

## 5. 与 Phase C 的对接

Phase C `goalElementMap[goalId].coordination` 字段就是本文的 4 角色实例化：

```jsonc
coordination: {
  主体: "screen",
  主角: "BrandLogo",
  邻居: ["FormCard", "BrandSlogan"],
  父容器: "Root",
  装饰: ["BgBlobTopRight", "BgBlobBottomLeft"]
}
```

填这个字段时,**必须能从本文 §3 的 7 种模式找到对应模式**——找不到说明 goal 提取得不对,回 Phase B 重做。

---

## 6. 一句话总结

> **任何视觉效果都是 3-6 个元素的协同合奏。Phase C 拆解时必须列清 4 角色（主体/邻居/父容器/装饰）+ 引用 7 种典型协同模式之一。Phase F craft 落库时所有涉及元素的改动必须在同一任务内完成,不许拆。**
