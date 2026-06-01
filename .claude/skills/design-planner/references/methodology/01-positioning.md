# 01 — 三层定位（Phase A）

> 必读时机：执行 `D-X-positioning` 任务时。
> 输入：product.meta + theme.tokens + interaction 屏骨架。
> 输出：`positioning.md` + `screen.meta.design.positioning`。
>
> 任务目的：给后续 Phase B 设计目标提取**强约束输入**——不是空泛的"了解一下",而是把"产品定位 / 页面价值 / 用户场景"凝练成可被设计目标 5 字段引用的事实。

---

## 1. 三层定位结构

```
Layer 1 - 产品定位（来自 project.meta）
   核心价值主张 + 视觉差异化机会 + 用户视觉期待
        ↓
Layer 2 - 页面定位（来自 screen.meta + interaction）
   屏在用户旅程的位置 + 屏对用户的核心收益 + 屏对产品的核心目标 + visualTiming 三档
        ↓
Layer 3 - 用户场景（来自 product.coreScenarios + interaction.state.view）
   用户进屏心理 + 用户离屏心理 + 紧迫度 + 0.5/5/30 秒视觉时机
```

每层强制 read 上游产物,不得凭印象。

---

## 2. Layer 1 — 产品定位

### 2.1 必填三问

| 问题 | 答案规模 | 来源 |
|---|---|---|
| 这个产品的核心价值主张是什么？给谁？ | ≤ 60 字 | `project.meta.coreValue` / `targetUser` |
| 视觉差异化机会在哪？（≥ 2 个真实竞品的视觉特征对照）| 表格 | `targetUser.dailyApps` + 推理 |
| 用户对它的视觉期待 = 什么调性？ | ≤ 30 字 | `project.meta.styleDirection` |

### 2.2 强制段：竞品视觉对照（≥ 2 个）

```jsonc
competitorVisualReferences: [
  {
    product: "即刻",
    visualTraits: ["白底 + 黄黑配色", "圆角卡片 + 大字", "标签云 + 表情包文化"]
  },
  {
    product: "小红书",
    visualTraits: ["米白底 + 多色点缀", "插画装饰 + 手写体", "瀑布流 + 高饱和图"]
  }
]
```

**如果上游 `targetUser.dailyApps` 字段缺位 → 立即发 UpstreamChallenge 退回 product-analyst 补**。不允许凭印象写竞品对照。

### 2.3 视觉差异化机会陈述

基于竞品对照,**列出本产品在视觉上能站什么位**：

```
错（不允许）：
  "和大家一样安全可靠"     ← 不是差异化,是合规

对（要求）：
  "在校园社交品类里走'清晨教室温度风',
   比即刻更克制（不靠多色 + 表情包）,比小红书更工具感（不靠插画 + 多图）,
   差异化点 = 暖白米 + 蓝紫单色 + 单一温度装饰族"
```

---

## 3. Layer 2 — 页面定位

### 3.1 必填四问

| 问题 | 答案规模 | 来源 |
|---|---|---|
| 屏在用户旅程的哪一步？从哪来,到哪去？ | ≤ 50 字 | interaction.entryPoints + nav.go destinations |
| 屏对用户的核心收益（≤30 字）| 1 句话 | 推理 |
| 屏对产品的核心目标（≤30 字）| 1 句话 | 推理 + product.coreScenarios |
| visualTiming 三档（0.5/5/30 秒）| 3 句话 | 推理 |

### 3.2 visualTiming 三档（强制）

```jsonc
visualTiming: {
  zeroPointFiveSec: "用户进屏 0.5 秒应该看到什么",
  fiveSec: "用户 5 秒能理解什么",
  thirtySec: "用户 30 秒能完成什么决策"
}
```

例（登录页）：
```
zeroPointFiveSec: "BrandLogo 在屏顶 + 屏底偏暖,无视觉噪音,'这是个轻量入口屏'"
fiveSec: "看清主操作 = 输入手机号 + 验证码登录,辅助操作 = 切换密码登录 / 注册 / 忘记密码"
thirtySec: "决策按下 SubmitBtn → 0.5s 见到 spinner → 进主屏"
```

例（信息列表页）：
```
zeroPointFiveSec: "顶部品牌区 + 第一条卡片 + 列表纵向延伸,'这是内容主屏'"
fiveSec: "判断卡片类型（图文 / 长文 / 视频）+ 主操作（点赞 / 评论 / 收藏）"
thirtySec: "完成滑动 / 决策点击进入详情"
```

**作用**：visualTiming 是后续 Phase B 提炼 designGoals 的强制输入——0.5 秒判据通常对应 mood-conveyance + brand-recognition,5 秒判据通常对应 hierarchy + cta-clarity,30 秒判据对应 state-feedback。

---

## 4. Layer 3 — 用户场景

### 4.1 必填四问

| 问题 | 答案规模 | 来源 |
|---|---|---|
| 用户进屏时的心理状态 / 情绪 | ≤ 30 字 | product.coreScenarios + 推理 |
| 用户进屏时的紧迫度 | low / medium / high | 推理 |
| 用户离屏时的心理状态期望 | ≤ 30 字 | 推理 |
| 视觉关键时机（与 visualTiming 呼应）| 同 §3.2 |

### 4.2 紧迫度对设计目标的影响

```
紧迫度 high  →  目标偏向 cta-clarity / urgency
                视觉手段：高对比 + 大字 + 单色强焦点

紧迫度 medium → 目标偏向 hierarchy / state-feedback
                视觉手段：清晰金字塔 + 多态视觉差异

紧迫度 low   →  目标偏向 mood-conveyance / brand-recognition / decoration-storytelling
                视觉手段：氛围 + 装饰 + 大留白
```

例（登录页）：
```
进屏心理: "好奇 + 略防备 + 急迫想跳过"
紧迫度: medium
离屏心理: "已加入校园圈层的预感"
```

→ 提示 Phase B 提炼目标时可能含：mood-conveyance（降焦虑）+ cta-clarity（让用户快通过）+ trust-signal（合规但温和）+ state-feedback（锁定态温和）

---

## 5. ★ 沉淀到 schema 的结论（必填）

```jsonc
// MCP: meta/set_screen
{
  projectId: "<projectId>",
  screenId: "<screenId>",
  patch: {
    design: {
      positioning: {
        product: {
          coreValue: "...",
          differentiation: "...",
          visualExpectation: "...",
          competitorVisualReferences: [
            { product: "即刻", visualTraits: [...] },
            { product: "小红书", visualTraits: [...] }
          ]
        },
        page: {
          role: "登录页（用户旅程入口屏）",
          userBenefit: "5 步进主屏 + 安心隐私",
          productGoal: "降低注册流失 + 建立第一印象",
          visualTiming: {
            zeroPointFiveSec: "...",
            fiveSec: "...",
            thirtySec: "..."
          }
        },
        userScenario: {
          psychOnEnter: "好奇 + 略防备 + 急迫想跳过",
          emotion: "急切但带防备",
          urgency: "medium",
          psychOnExit: "已加入校园圈层的预感"
        }
      }
    }
  }
}
```

---

## 6. 自检（任务 done 前）

- [ ] product / theme / interaction 三个上游产物都已 read
- [ ] competitorVisualReferences ≥ 2 项,每项有 product 名 + ≥ 3 visualTraits
- [ ] 视觉差异化机会陈述含"比 X 更 Y"对照,不空泛
- [ ] page.userBenefit ≤ 30 字,page.productGoal ≤ 30 字
- [ ] visualTiming 三档全填,具体可视
- [ ] userScenario.urgency ∈ {low, medium, high}
- [ ] 末尾「★ 沉淀到 schema 的结论」段落与 MCP 调用 1:1 对应

任一未通过 → md 不达,任务不能 done。

---

## 7. 反例（禁止写成这样）

```
❌ Layer 1:
  product.coreValue: "校园社交"     ← 太短,不是价值主张
  differentiation: "做得更好"        ← 空话
  competitorVisualReferences: []     ← 空数组,触发 UpstreamChallenge

❌ Layer 2:
  page.role: "登录页"                ← 没说在用户旅程的位置
  page.userBenefit: "登录"           ← 不是收益,是动作
  visualTiming: { zeroPointFiveSec: "看到登录页" }  ← 没说看到什么具体元素

❌ Layer 3:
  userScenario.psychOnEnter: "正常"  ← 抽象
  urgency: "中等"                    ← 不在枚举内
```

---

## 8. 一句话总结

> **三层定位 = 给 Phase B 提炼设计目标的强制原料：产品给谁 / 页面在哪 / 用户怎么进。后续每个 designGoal 都必须能溯源到 positioning 里的某个具体段落。**
