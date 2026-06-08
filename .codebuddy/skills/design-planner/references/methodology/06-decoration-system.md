# 06 — 装饰系统单一族（按 goal 推导）

> 必读时机：执行 `D-X-cross-goal-strategy` 任务时（Phase D 选定装饰族）;`D-X-G<N>-craft` 涉及装饰节点时（Phase F）。
> 关键约束：装饰族**从 goal 频次推导**,不是屏级独立配额。

---

## 1. 装饰角色的本质定位

```
装饰是某个 designGoal 的实现手段
→ goal.changes.structure 含装饰节点添加
→ 装饰节点挂 meta.design.servingGoals: ["G<N>"]
→ Phase D 跨目标统筹时按 goal 频次选定单一族
→ 装饰透明度 / 数量 / 位置都为 goal.successCriteria 服务
```

错误做法（必须拒绝）：
```
按屏级配额 "登录页归节制 1-2 处"
→ 凑数加 1-2 个装饰节点
→ 装饰不挂在某个目标下,仅是"凑数补预算"
→ 后果: 装饰透明度 12% (技术上满足,视觉上接近不存在)
```

---

## 2. 5 大装饰族

| 族 | 视觉特征 | 适合 mood | 兼容 theme.aesthetics |
|---|---|---|---|
| `soft-glow` | 径向渐变 + blur | 温度 / 治愈 / 校园 / 安静 | minimal+flat / pastel |
| `geometric-line` | 直线 / 网格 / 几何 | 科技 / 工具 / 数据 / 严肃 | minimal+flat / cyberpunk |
| `illustration` | 具象插画 | 活力 / 玩乐 / 教育 / 故事 | playful / organic |
| `texture` | 噪点 / 纸纹 / 颗粒 | 复古 / 自然 / 高级感 | luxury / natural |
| `organic-curve` | 自由曲线 / 泡泡 | 艺术 / 个性 / 治愈 | organic / pastel |

---

## 3. 装饰族选定 4 步

### Step 1: 统计各 goal 装饰需求

读 `goalElementMap[*].changes.structure` + `goalElementMap[*].changes.materials`,统计每个 goal 涉及的装饰族需求。

```
G1 mood-warmth: 需 soft-glow (BgBlob 光斑)
G5 brand-recognition: 需 illustration (BrandLogo 图标级别小插画)
G7 decoration-storytelling (如果有): 需 illustration (校园场景元素)

→ 频次统计:
  soft-glow: 1
  illustration: 2
  其他: 0
```

### Step 2: 频次最高 + theme 兼容度

```
按频次排序: illustration (2) > soft-glow (1)

theme 兼容度检查:
  theme.aesthetics: ["minimal", "flat"]
  theme.decoration: "minimal"
  
  illustration vs minimal+flat: 冲突 (插画过重,不够极简)
  soft-glow vs minimal+flat: 兼容 (光斑系是 minimal 的延伸)
```

### Step 3: 决策

```
A. 频次第一族与 theme 冲突 → 选频次第二族 (soft-glow)
B. 强行需要频次第一族 → UpstreamChallenge 让 theme 升装饰族
C. 双族共存 → 不允许 (R-DECORATION-MULTI-FAMILY 拒)
```

实践中通常选 A（不违反 theme）。

### Step 4: 装饰系统单一族落库

```jsonc
// screen.meta.design.visualStrategy.decorationSystem
{
  family: "soft-glow",
  density: "节制",
  derivedFromGoals: ["G1", "G5", "G7"],
  rationale: "G1 频次 1 + G5 频次 1 + G7 频次 1 = soft-glow 累计可承载所有 goal 需求,与 theme.minimal+flat 兼容"
}
```

⚠️ family 单选,**不允许多族混杂**。

---

## 4. 装饰密度档位

| density | 节点数上限 | 典型场景 |
|---|---|---|
| 极少 | 0-1 | 严肃工具屏 / 表单页 |
| 节制 | 2-3 | 登录页 / 详情页 |
| 中等 | 4-6 | 首页 / Onboarding |
| 丰富 | 7+ | 营销页 / 节日活动页 |

约束：density 由 `theme.decoration` 决定上限,**装饰节点数实际由 goal 数 + 每 goal 装饰需求决定**。

---

## 5. 装饰节点强制规则

### 5.1 必挂字段

```jsonc
// element/add 装饰节点
{
  parent: "screen | Root",
  node: {
    name: "BgBlobTopRight",
    type: "div",
    meta: {
      design: {
        kind: "decoration",            // ★ 必挂
        servingGoals: ["G1"],          // ★ 必挂
        summary: "服务 G1 校园温度的右上角光斑装饰"
      }
    }
  }
}
```

### 5.2 红线

| 红线 | 触发 |
|---|---|
| **R-ORPHAN-DECORATION** | 装饰节点 servingGoals 空 |
| **R-INVALID-KIND** | 装饰节点未挂 kind=decoration |
| **R-DECORATION-MULTI-FAMILY** | 一屏内出现 ≥ 2 装饰族 |

---

## 6. 装饰透明度强约束

```
透明度 ≥ 20% (默认装饰)
透明度 ≥ 30% (装饰需作为 goal 的可视判据时)

例外:
  - 装饰底色与屏底反差极大 (如深色装饰 vs 白底): 可降至 15%
  - 装饰仅作"光效"非"形状载体": 可降至 12% (但需在 goal.successCriteria 标明)
```

低于 20% 的装饰在白底接近不可见,等于无效装饰。

forbiddenSignals 推荐写：
```
"装饰 alpha < 20% (接近不可见)"
```

---

## 7. 装饰位置 4 类

| 类 | 典型 | z-index |
|---|---|---|
| 背景氛围 | 大块径向渐变 / 半透明 pattern | 0-1 |
| 角落溢出 | BgBlobTopRight / BgBlobBottomLeft | 0-1 |
| 分割装饰 | divider / line | 1 |
| 品牌点缀 | hero 边角呼应主色的小元素 | 1-2 |

⚠️ 装饰节点必须 `position: absolute` + `pointerEvents: none` + 低 z-index,不能抢占内容布局。

---

## 8. 自检（每加装饰节点前）

- [ ] 装饰节点服务于哪个 goal? (servingGoals 非空)
- [ ] 装饰族与 visualStrategy.decorationSystem.family 一致 (单一族)
- [ ] 透明度 ≥ 20% (避免接近不可见)
- [ ] 节点数总和 ≤ visualStrategy.decorationSystem.density 上限
- [ ] kind=decoration 已挂
- [ ] position: absolute + pointerEvents: none + z-index 低

任一未通过 → 装饰加错位置,重做。

---

## 9. 一句话总结

> **装饰 = 某个设计目标的实现手段,不是屏级独立配额。Phase D 按 goal 频次选定单一族,Phase F craft 时挂 servingGoals,透明度 ≥ 20% 避免接近不可见。**
