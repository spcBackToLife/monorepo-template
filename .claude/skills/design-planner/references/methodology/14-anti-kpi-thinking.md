# 14 — 反 KPI 思维（装饰数量 / 改动数量 / SC 数量都是结果，非输入）

> 必读时机：Phase B successCriteria 阈值定法时、Phase C 装饰拆解时、Phase F craft 落库时。
> 任务目的：消除"≥N 处装饰 / ≥M 字段改动 / ≥K 条 SC"等 KPI 思维，回归设计师真实推导路径。
>
> ★ **这是 AI 设计师最容易陷入的另一类陷阱**——和"v3 baseline"并列必看。

---

## 1. 心智陷阱：把数量当输入

### 1.1 AI 的典型 KPI 思维

```
"v8.1 应该有 ≥4 处装饰节点"
"craft 改动应该 ≥10 个字段"
"successCriteria 应该 ≥3 条"
"装饰透明度应该 ≥20%"
"覆盖率应该 ≥95%"
```

这些数字看起来"合规 / 客观 / 可对账"——但本质是**用 KPI 替代了设计判断**。

### 1.2 为什么这是错的

真正的设计师**永远不会先定数量**，而是：

```
设计师真实推导:
  Step 1: 这个屏要让用户感受到什么? (校园温度 / 安全 / 活力 / ...)
  Step 2: 用什么视觉手段最能传达? (色彩 / 装饰 / 字号 / 留白 / illustration / 动画 / ...)
  Step 3: 这些手段需要哪些元素自然支撑?
       — 可能 1 张大幅 illustration + 整屏调色就够
       — 可能 5 处装饰 + 顶部 hero 区 + 底部留白
       — 可能完全不用装饰,只靠字号+色彩+留白就成立
  Step 4: 数量是结果,不是预设
```

```
AI 错误推导:
  Step 1: SKILL 说"装饰 ≥2 处" / 我自己觉得 "≥4 处更丰富"
  Step 2: 那我就加 4 个 BgBlob / 装饰 div
  Step 3: 加完之后视觉是否和谐? 不知道,反正满足 ≥4 这个 KPI 了
  
后果: 装饰可能完全不服务设计目标,只是凑数
```

---

## 2. 真正的设计师推导链

### 2.1 装饰数量的推导链

```
不是: "我需要 ≥N 处装饰"

而是: 
  Phase B 提目标 G1 (校园温度氛围)
    ↓
  Phase C 拆 G1: 用什么传达?
    候选: 屏底色温 / 装饰光斑 / 校园 illustration / typography 装饰 / 留白节奏
    ↓
  Phase D 决策: 取哪些?
    — 如果选大幅 illustration (晨光教室) 当主载体, 装饰光斑可以省 / 装饰可以仅 1 处
    — 如果不用 illustration, 主要靠色温 + 装饰光斑, 装饰需要 2-3 处对角配重
    — 如果用顶部 hero 区 (BrandLogo + 装饰带 + Slogan), 装饰可能集中在顶部 1 个区域内含 2-3 个子元素
  ↓
  数量 = Phase D 决策的自然产物
```

### 2.2 改动数量的推导链

```
不是: "重做语境改动应该 ≥10 字段"

而是:
  G<N>.successCriteria 4 条
    ↓
  每条 SC 当前 schema 状态是什么?
    — 已达标的不动 (但要警惕 §1.3 的"现状合理化"陷阱)
    — 未达标的列改动需要
    ↓
  G<N>.changes 跨 5 维(styles/structure/materials/visualStates/layout)
    每维度改动按"协同元素 ≥2"推
    ↓
  改动数量 = SC 未达标项 × 每项涉及的协同元素 × 5 维
  
真实结果可能是: 一个 craft 涉及 3 字段就够 (大改动结构) / 涉及 30 字段 (调整全屏色彩)
```

### 2.3 successCriteria 数量推导链

```
不是: "SC ≥3 条"

而是:
  从 designGoal.statement 反推:
    — "让用户 0.5 秒感受到 X" → 需要从"色彩 / 装饰 / 视线 / 反例"4 个角度对账
    — "让 SubmitBtn 主角化" → 需要从"权重差 / 尺寸 / 多态 / 留白"4 个角度对账
    — "让品牌识别度成立" → 需要从"真画 / 占比 / 主色对比 / 圆角"4 个角度对账
  ↓
  SC 数量 = 该目标真实需要核对的角度数
  
3-5 条是常见结果 (不是写死的 ≥3)
1-2 条说明目标提取不全 → 回 Phase B
≥6 条说明目标过宽 → 拆成 2 个目标
```

---

## 3. 现状合理化陷阱（KPI 的孪生兄弟）

### 3.1 典型表现

```
SC 写: "装饰 alpha 8-15% 节制不喧宾"
现实: schema 残留装饰 alpha = 12% (恰好在范围内)
判定: "✅ pass"

但用户截图: 装饰几乎不可见,屏顶看起来纯白

根因: SC 阈值是"为现状自然达标设计的",而不是"为达成 mood-conveyance 真正需要"设计的
```

### 3.2 阈值定法 — 上一个台阶原则

✅ 对的阈值定法：

```
Step 1: read 当前 schema 状态 (作为 lower bound)
        e.g. 装饰 alpha 12%, 屏底距 #FFFFFF 4.6pt

Step 2: 思考"达成目标真正需要的状态"是什么 (作为 target)
        e.g. 校园温度 → 装饰必须可见,alpha ≥ 20%
              暖白米感 → 屏底距 #FFFFFF ≥ 15pt 才有暖度

Step 3: 阈值 = max(target, current + 显著台阶)
        e.g. SC: "装饰 alpha 20-35% 可见有氛围"
              SC: "屏底装饰区 RGB 距 #FFFFFF ≥ 15pt"
```

❌ 错的阈值定法：

```
read schema → 装饰 alpha 12% → SC 写 "alpha 8-15% 节制" 
后果: 现状自动达标,改动空间为零,设计目标实际未达成
```

详细见 `schema-spec/goal-success-criteria.md` §阈值定法。

### 3.3 阈值定法的反向自检（Phase B 写完 SC 后必跑）

```
对每条 SC 自问:
  "如果当前 schema 残留状态 X 自动达标这条 SC,我满意这个视觉吗?"
  
  ✅ 满意 → 阈值合理
  ❌ 不满意 → 阈值定低了,提升一档台阶
  
连续多条都不满意 → 整组 SC 都被现状合理化,Phase B 重做
```

---

## 4. 改动幅度自检（Phase F craft 落库后必跑）

### 4.1 触发条件

任一命中：
- craft 改动字段数 < 5
- 截图与 craft 前对比无肉眼可见差异
- 自审段写 "v 几 已落,verify 维持" ≥ 3 处
- 改动只涉及 1 维度（如全 styles，无 structure / materials / visualStates）

### 4.2 自检追问

```
1. 我的 craft 改动真服务于 G<N>.successCriteria 了吗?
   还是只在补 v 几 漏掉的 metadata 字段?

2. 截图与 craft 前对比,普通用户能看出区别吗?
   能看出 → 真改动
   看不出 → 假改动 → §4.3 处理

3. 我有没有"现状合理化"成"verify 维持"?
   把"残留刚好达标"理解成"无需改" 是 §3.1 陷阱

4. 六项创作权我用了几项?
   只用 1-2 项 (styles 调色 / 改 marginTop) → 创作权未充分使用
   ≥ 4 项 (含 element/add 装饰 / wrap / move / material-painter / visualState) → 真创作
```

### 4.3 假改动判定后的处理

```
不要标 done. 回到 Phase F Step 4 重做:
  - 重新 read goalElementMap[G<N>].changes
  - 重新审视六项创作权: 哪些没用?
  - 大胆增加 element/add 装饰节点 / 调用 material-painter / wrap 重组
  - 改动量翻倍以上
  - 再截图对比 reset 前 → 显著差异
  - 才 mark done
```

---

## 5. 反例与对照

### 5.1 装饰数量

❌ 错（KPI 思维）：
```
"v8.1 应有 ≥4 处装饰节点"
→ 加 4 个 BgBlob (右上 / 左下 / 中央 / 底部) 
→ 装饰彼此不协调,无设计语言
```

✅ 对（设计推导）：
```
G1 = 校园温度氛围
推导: 用大幅 illustration (晨光教室) 当主载体 + 1 处装饰光斑做配重
落地: element/add Illustration "晨光教室一角" 占顶部 1/4 + 1 处 BgBlob 暖光
数量: 2 处 — 但是合目的的 2 处,不是凑数的
```

### 5.2 改动数量

❌ 错：
```
"重做应改 ≥10 字段" → 强行改 10 个无关字段凑数
```

✅ 对：
```
craft G1 真正需要改的:
  1. screen.backgroundColor: 加 fixed 顶部渐变层 (1 element/add)
  2. element/add Illustration 节点 + 调 material-painter 画 (1 add + 1 painter)
  3. element/wrap (BrandLogo+Slogan+装饰) → HeroSection (1 wrap)
  4. styles 全屏 padding / margin 节奏调整 (5 batch_update)
  5. 顶部装饰带 visual-container (1 add + 1 painter)
合计: 11 改动 — 但每一改动都服务 G1 校园温度,不凑数
```

### 5.3 successCriteria 数量

❌ 错：
```
SC 写 6 条都是色彩判据 (凑数)
```

✅ 对：
```
SC 4 条覆盖 4 维度:
  1. 色彩 (屏底距白 ≥15pt)
  2. 装饰可见性 (alpha ≥20%)
  3. 视线热点 (saliency 落在 BrandLogo+FormCard)
  4. 反例 (灰阶 ≤35%)
4 条但每条覆盖独立维度,不重叠
```

---

## 6. SKILL 内置反 KPI 提醒

design-planner Phase B / C / F 都内置反 KPI 自检：
- Phase B SC 写完 → 跑反向自检（§3.3）
- Phase C 装饰拆解 → 不写"≥N 处"，写"为达 G<N> 自然需要哪些元素"
- Phase F craft 完 → 跑改动幅度自检（§4）

任一未通过 → 回上一步重做。

---

## 7. 一句话总结

> **数量是结果,不是输入. 装饰多少 / 改多少字段 / SC 几条 — 都是"为达成目标自然需要"的产物. AI 一旦先定数量,就退化成 KPI 完成员,失去设计判断.**
