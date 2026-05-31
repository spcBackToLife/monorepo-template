> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-{X}-concept（每屏 Phase B 必做）
> 对应 schema 字段：screen.meta.design.visualConcept（v3 新增）
> 必读方法论：`references/methodology/02-visual-concept.md`

---

# {taskId} — 视觉概念 (Visual Concept)

## 1. 候选风格方向（≥2 个，最多 4 个）

| 候选 | 灵魂句（10-25 字）| 风格关键词 3（色/形/饰）| mood board（生活场景词 3-5 个）| 选 / 否决 + 理由 |
|---|---|---|---|---|
| **A** 温暖治愈 | 清新校园温度，不浮夸不冷漠 | 暖白 / 极简 / 单色温度 | 晨光透过窗 / 笔记本上的便签 / 球场围栏的剪影 / 学校公告板 | ✅ 选定 — 与 theme.intent=warm-minimal 完全契合 + 与目标用户"95-00 后大学生"的轻焦虑情绪匹配 + 不冷漠也不浮夸支持登录页"工具入口"角色 |
| **B** 冷静专业 | 严肃可靠的工具感，传递安全 | 冷白 / 直角 / 极简 | 银行柜台 / 玻璃栏杆 / 网格底纹 / 收据纸张 | ❌ 否决 — 与产品「校园社交」气质冲突，过于冷漠让大学生用户不亲近 |
| **C** 活泼俏皮 | 校园的活力色，让用户兴奋 | 多色 / 大圆角 / 丰富装饰 | 学校画廊 / 涂鸦墙 / 气球 / 彩虹 | ❌ 否决 — 登录页是工具入口，活泼会让用户觉得不专业；活泼留给首页 / Feed |

---

## 2. 选定方向

| 维度 | 内容 |
|---|---|
| **灵魂句** | 清新校园温度，不浮夸不冷漠 |
| **风格关键词** | 暖白（color）/ 极简（shape+decoration）/ 单色温度（color refinement）|
| **mood board** | 晨光透过窗 / 笔记本上的便签 / 球场围栏的剪影 / 学校公告板 |

---

## 3. 选定理由（产品 + 主题 + 交互三向论证）

### 3.1 与产品的契合
- 目标用户「95-00 后大学生」+ 用户来时心理「轻焦虑、怕被推销」+ 本屏角色「招呼+工具」 → 需要"温暖但克制"的视觉语言：温暖让用户感到被欢迎，克制不会让用户警觉营销

### 3.2 与主题的契合
- theme.intent = warm-minimal → 直接对应「暖白 / 极简」两个风格关键词
- theme.tokens.primary = #5B6CFF（蓝紫）→ 作为「单色温度」的强调色：蓝紫=偏冷的温度，正好平衡暖白底，避免过于甜腻

### 3.3 与交互的契合
- interaction 已建：state.view.{activeMode, policyAccepted, codeCountdown, submitting, submitAttempted}
- 本视觉概念支持的设计动作：tab active 用主色 + 字重区分（极简）/ checkbox checked 用主色填充（单色温度）/ 装饰用单色径向光斑（暖白 + 极简）/ submit 用主色填充（不渐变，符合"克制"）

---

## 4. 候选否决理由（每个否决候选一段）

### 候选 B（冷静专业）否决
本屏定位虽是"工具入口"但产品是「校园社交」——目标用户是有情感连接需求的年轻人。冷白+直角+网格的银行级专业感会让用户觉得"被审视"而非"被欢迎"。本屏更适合**温和的工具感**而非**冷漠的专业感**。

### 候选 C（活泼俏皮）否决
本屏是登录页——用户期望"快速完成"而非"被娱乐"。大圆角+多色+插画装饰会让用户觉得不像正经登录界面（涉及账号安全），降低信任度。活泼的视觉语言留给：首页 Feed / 兴趣社区 / 个人主页装扮。

---

## 5. 视觉概念 → strategy 5 维传递（预判，详细落 D-X-strategy）

| strategy 维度 | 本概念决定的方向 |
|---|---|
| 色 (color) | 暖白底（#FCFCFD）+ 蓝紫强调（#5B6CFF）+ 60-30-10：60 背景 / 30 表面 + 文字 / 10 强调 |
| 字 (typography) | 极简：display 28 / h2 22 / body 14-16 / caption 12，字重克制（500 而非 700）|
| 形 (shape) | 大圆角柔和：card 12-16px / button 8px / input 8px |
| 饰 (decoration) | 装饰系统单一族 = soft-glow（光斑系），密度=节制（1-2 处）|
| 律 (rhythm) | 呼吸型间距：4-8-16-24-32 / 缓动 normal 200ms ease-out |

---

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_node
{
  nodeId: "screen.meta.design",
  patch: {
    visualConcept: {
      soulSentence: "清新校园温度，不浮夸不冷漠",
      styleKeywords: ["暖白", "极简", "单色温度"],
      moodBoard: ["晨光透过窗", "笔记本上的便签", "球场围栏的剪影", "学校公告板"],
      candidatesEvaluated: 3,                  // 评估了几个候选
      selectedCandidate: "A",                  // 选了哪个
      rejectionReasons: [                       // 否决理由摘要（机器对账用）
        { candidate: "B", reason: "与产品「校园社交」气质冲突" },
        { candidate: "C", reason: "登录页活泼降低信任度" }
      ]
    }
  }
}
```

---

## 7. 自检

- [ ] 候选 ≥ 2 个，全部给齐三件套（灵魂句 + 关键词 3 + mood board）
- [ ] 灵魂句不空话，含一个情绪核心
- [ ] 风格关键词 3 个互不冲突
- [ ] mood board 是具体场景物，不是品牌名
- [ ] 选定理由含产品 + 主题 + 交互三向论证
- [ ] 否决理由具体不空话
- [ ] schema 字段 visualConcept 已写入

任一未通过 → 不能进 D-X-strategy。
