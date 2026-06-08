# 09 — 按目标自审（Phase G）

> 必读时机：执行 `D-X-G<N>-craft` 自审段 / `D-X-self-review-by-goals` 任务时。
> 输入：所有 craft-G<N>.md + 当前整屏 schema。
> 输出：craft md 末尾自审段（每 craft 内）/ `self-review-by-goals.md`（整屏对账）。
>
> 任务目的：用具体可视判据 + 截图客观对账,杜绝抽象评分蒙混。

---

## 1. 自审为什么必须用具体可视判据

抽象评分（"识别 / 平衡 / 一致 / 契合 / 情绪"每维 0-5 分）的失败路径：

```
1. 5 维度抽象,AI 可以蒙混打 4/5
2. 没有具体可视判据,无法机器对账
3. 评分门槛是 AI 自填,不是机器校验

实际后果:
  截图服务挂掉 → 用户没提供截图 → 5 维评分模板全是 "__/5"
  任务标 done → 流程通过 → 视觉仍是 SaaS
```

正确做法：**具体可视判据 + 截图逐条核对**,失效路径被堵：

```
1. 每个 designGoal 自带 ≥ 3 条 successCriteria（具体可视）
2. 每个 craft 任务必跑截图（screenshot-screen.mjs）
3. 自审段必须对每条 successCriteria 给"像素级观察 + pass/fail"
4. 任一 fail → 不能 done,必须重做
5. 3 轮仍不达 → 强制 UpstreamChallenge
```

---

## 2. 自审的两个层次

### 2.1 层次 1：craft 内自审（每 craft 任务必做）

在 `D-X-G<N>-craft` 任务的 Step 6 执行。详见 `methodology/07-craft-execution.md` §4。

判据：本 goal 的 successCriteria 逐条 + forbiddenSignals 全检。

### 2.2 层次 2：整屏对账（D-X-self-review-by-goals 任务）

所有 craft 任务 done 后,跑整屏对账：

```
1. 跑整屏截图 (mode: frame, 长图)
2. 对每个 designGoal 重新核对 successCriteria 一遍
3. 验证跨 goal 协调度 (元素权重金字塔成立 / 装饰系统单一族 / 60-30-10 比例)
4. allGoalsCriteriaMet >= 0.8 (80% 阈值)
```

---

## 3. successCriteria 逐条核对的标尺

### 3.1 三类可视判据 + 核对方法

#### 类别 1：色彩判据

```
example: "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt"

核对方法:
  1. 截图后 Read 看图
  2. 在屏底中心点附近取像素采样 (avg of 5x5 patch)
  3. 计算 RGB 距离 √((R-255)² + (G-255)² + (B-255)²)
  4. 与阈值比较 → pass / fail

像素级观察示例:
  "取屏底中心 (x=375, y=600) 像素 RGB ≈ (248, 244, 238),
   距 #FFFFFF 各通道差 7/11/17 → 距离 21pt > 5pt → ✅ pass"
```

#### 类别 2：尺寸 / 占比判据

```
example: "BrandLogo 占首屏面积 ≥ 5%"

核对方法:
  1. 截图后 Read 看图
  2. 估算 BrandLogo 视觉边界 (左上 x1,y1; 右下 x2,y2)
  3. 计算 (x2-x1) × (y2-y1) / (viewportWidth × viewportHeight) × 100
  4. 与阈值比较

像素级观察示例:
  "BrandLogo 边界约 (315, 80) - (435, 200),尺寸 120×120,
   首屏 viewport 750×1334, 面积占比 14400/750000 ≈ 1.9% < 5% → ❌ fail
   决策: 重新调 BrandLogo 尺寸 ≥ 200×200 或调首屏视觉框架"
```

#### 类别 3：视觉权重判据

```
example: "SubmitBtn 与 GetCodeBtn 视觉权重差 ≥ 4"

核对方法:
  1. 估算两元素的视觉权重 = f(色对比 + 尺寸比 + 字重 + 装饰 + 动效)
     - SubmitBtn: 主色填充 + 全宽 + 字重 600 + ring 光晕 → weight ≈ 9
     - GetCodeBtn: 透明底 + 小尺寸 + 字重 500 + 无装饰 → weight ≈ 3
  2. 差值 = 9 - 3 = 6 ≥ 4 → ✅ pass

像素级观察示例:
  "SubmitBtn 全宽 327×48,主色 #5B6CFF 填充,白字 16px 600;
   GetCodeBtn 32×32,透明底,主色字 12px 500,位置在 input 内嵌右侧。
   两者面积比 327×48 / 32×32 ≈ 15:1,色对比 SubmitBtn 主色满饱和 vs GetCodeBtn 字色仅占小面积。
   weight 差 ≈ 6 ≥ 4 → ✅ pass"
```

### 3.2 forbiddenSignals 核对

每条 forbidden 也用上述三类方法核对,但反过来：触发 = ❌ fail,未触发 = ✅ ok。

---

## 4. 整屏对账 (D-X-self-review-by-goals)

### 4.1 执行流程

```
Step 1: 跑整屏长图
  Bash: SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
  注: 当前 screenshot-screen.mjs 是 viewport 模式,
      若需要 mode=frame 长图需在 mcp/generate_snapshots 修复后切换

Step 2: 对每个 designGoal,重新核对 successCriteria 一遍
  - 取本 goal 的 successCriteria
  - 逐条像素级观察 + pass/fail
  - 每条记到 self-review-by-goals.md

Step 3: 跨 goal 协调度核查
  - weightPyramid 实测 (元素视觉权重排序) vs 声明 (visualStrategy.weightPyramid)
  - decorationSystem 单一族 (无混杂)
  - colorRatio 60-30-10 实测占比 (粗略估算)
  - accentUsage 出现位置数量 ≤ 6

Step 4: 计算 allGoalsCriteriaMet 比例
  totalCriteria = sum(goal.successCriteria.length for goal in designGoals)
  passedCriteria = sum 各 goal 通过条数
  ratio = passedCriteria / totalCriteria
  
  ratio ≥ 0.8 → 整屏通过
  ratio < 0.8 → 标识不达 goal,回对应 craft 任务重做

Step 5: 写 self-review-by-goals.md
  - 每 goal 一段 (含 successCriteria 逐条 pass/fail)
  - 跨 goal 协调度核查段
  - 总评 + 通过率
```

### 4.2 整屏对账判据

```
allGoalsCriteriaMet 阈值 0.8 (80%)
  - 不要求 100% (避免追求完美陷入死循环)
  - 但 P0 goal 必须 100% pass (P0 不达则整屏不通过)

跨 goal 协调度阈值:
  - weightPyramid 实测 vs 声明: 元素权重偏差 ≤ 2 (允许一定误差)
  - decorationSystem 单一族: 100% (不可混杂)
  - colorRatio: 60% / 30% / 10% 各允许 ±10% 偏差
  - accentUsage: ≤ 6 处 (硬约束)
```

---

## 5. self-review-by-goals.md 模板

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-X-self-review-by-goals
> 截图: /Users/.../.tica-tmps/snapshots/<projectId>-<timestamp>.png

# D-X-self-review-by-goals — 整屏按目标对账

## 1. 整屏截图证据

[贴截图路径,Read 后人工 / AI 看图]

## 2. 逐 goal 对账

### Goal G1 (P0): mood-conveyance — 校园温度

**statement**: 让用户进登录页 0.5 秒感受到清晨教室般的温度

**successCriteria 核对**:
- ✅ Criteria 1: ... (像素级观察)
- ✅ Criteria 2: ... 
- ❌ Criteria 3: ... (失败 + 重做计划)
- ✅ Criteria 4: ...

**forbiddenSignals 核对**:
- ✅ Forbidden 1: 未触发
- ✅ Forbidden 2: 未触发
- ✅ Forbidden 3: 未触发

**G1 通过率**: 3/4 = 75%
**判定**: P0 未 100% pass → 不通过 → 回 craft-G1 重做 Criteria 3

### Goal G2 (P0): cta-clarity — SubmitBtn 主角化

[同上结构]

[... 各 goal 同上 ...]

## 3. 跨 goal 协调度核查

### weightPyramid 实测 vs 声明

| 元素 | 声明 weight | 实测 weight | 偏差 |
|---|---|---|---|
| BrandLogo | 9 | 8 | -1 ✅ |
| SubmitBtn | 9 | 9 | 0 ✅ |
| ... |

### decorationSystem 单一族

- 声明: soft-glow
- 实测: BgBlobTopRight + BgBlobBottomLeft 都是 radial-gradient → ✅ 单一族
- 是否混入其他族 (illustration / line / texture): 无 → ✅

### colorRatio 60-30-10 实测

- 60% backgroundColor 实测占比 ≈ 58% (允许 ±10%) → ✅
- 30% surfaceElevated 实测占比 ≈ 28% → ✅
- 10% accent 实测占比 ≈ 11% → ✅

### accentUsage 数量

- 声明 6 处: SubmitBtn / Tab / Checkbox / Input.focus / Links / BgBlob
- 实测 6 处 ✅

## 4. 总评

- 总 successCriteria 条数: 18 (G1 4 + G2 4 + G3 3 + G4 4 + G5 3)
- 总通过条数: 14
- allGoalsCriteriaMet 比例: 14/18 = 78%
- **判定**: 78% < 80% 阈值 → 整屏不通过

## 5. 不达 goal 列表 + 重做计划

| Goal | 不达 Criteria | 重做计划 |
|---|---|---|
| G1 (P0) | Criteria 3: 校园元素 | 改 BgBlob 为校园元素装饰 |
| G3 (P1) | Criteria 2: 微动效 | 加 200ms transition |

回对应 craft 任务 (D-X-G1-craft / D-X-G3-craft) 重做。
```

---

## 6. ★ 沉淀到 schema 的结论

self-review-by-goals 任务 done 时,service 端跑 expectedArtifacts: `{ kind: 'allGoalsCriteriaMet', screenId: '$', minScoreRatio: 0.8 }` 校验。

校验逻辑（service 端）：

```typescript
function validateAllGoalsCriteriaMet(screenId, minScoreRatio): ValidationResult {
  const screen = readScreen(screenId)
  const goals = screen.meta.design.designGoals
  
  // 读 self-review-by-goals.md 找逐 goal 的通过率
  // 或通过 craft 任务的 expectedArtifacts.goalSuccessCriteriaMet 历史汇总
  
  const totalCriteria = goals.reduce((sum, g) => sum + g.successCriteria.length, 0)
  const passedCriteria = computePassedFromMd(...)  // 从 md 解析或从历史 expectedArtifacts 读
  
  const ratio = passedCriteria / totalCriteria
  
  return {
    pass: ratio >= minScoreRatio,
    ratio,
    failures: getFailures(...)  // 列出不达 goal
  }
}
```

⚠️ 校验逻辑的具体实现是 P1 范围（apps/design-mcp 改造）。**SKILL 当前依赖 AI 在 md 中真实记录通过率,service 端读 md 文件 grep 通过率字段。**

---

## 7. 自检（任务 done 前）

- [ ] 截图已跑 + Read 看过
- [ ] 每 goal 的 successCriteria 全部逐条核对（无遗漏）
- [ ] 每条都有"像素级观察"（非"4/5"模板）
- [ ] forbiddenSignals 全检
- [ ] 跨 goal 协调度（weightPyramid / decorationSystem / colorRatio / accentUsage）全核
- [ ] 通过率计算正确
- [ ] 不达 goal 列出重做计划
- [ ] P0 goal 100% pass（否则整屏不通过）

任一未通过 → 整屏不通过,继续重做。

---

## 8. 一句话总结

> **按目标自审 = 每 goal 的 ≥3 条 successCriteria 在截图上逐条像素级核对,通过率 ≥ 80% + P0 100% 才通过。任何"4/5"模板套话被禁止,任何不达 goal 必须重做或 challenge。**
