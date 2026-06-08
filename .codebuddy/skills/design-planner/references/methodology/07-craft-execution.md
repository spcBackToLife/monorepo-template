# 07 — craft 任务执行流（Phase F 核心）

> 必读时机：执行 `D-X-G<N>-craft` 任务时。
> 输入：goalElementMap[goalId] + visualStrategy + 当前 screen_schema。
> 输出：`craft-G<N>.md` + 多元素 schema 改动 + 截图 + 自审段。
>
> 任务目的：把 Phase C 的"目标元素改动方案"翻译成真正的 schema 改动 + 截图对账。视觉真正落地的环节。

---

## 1. 7 步执行流（雷打不动）

```
Step 1: 读 G<N>.md 拿 goalElementMap[G<N>] (改动方案)
Step 2: 读最新 screen_schema (确认涉及节点状态)
Step 3: 写 craft-G<N>.md 推理段
   - 重述 G<N>.statement + successCriteria
   - 列每涉及元素的"当前状态 vs 目标状态"
   - 列改动方案 (与 goalElementMap.changes 1:1)
   - 预期截图视觉效果描述

Step 4: 落库 (一次任务内完成所有维度,不拆任务)
   Step 4.1: layout / structure 改动 → element/add / wrap / move
   Step 4.2: styles 改动 → style/update / batch_update (仅本目标涉及节点)
   Step 4.3: visualStates 改动 → visual_state/add / update
   Step 4.4: materials 改动 → 调 material-painter (brief 只给目标 + 概念) + applyMaterialDesign
   ⚠️ 顺序按 layout → styles → states → materials,但全部在同一任务内
   ⚠️ 禁止"先做 styles 再标 done,再开新任务做 states" → 等同按字段类别拆任务,失去多元素协同的整体性

Step 5: 截图 (强制)
   Bash: SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
   Read: file_path = SCREENSHOT_PATH
   详见 ../common/references/screenshot-tool.md

Step 6: 对账 successCriteria 逐条
   对照 G<N>.successCriteria 每条 (≥ 3 条),从截图判断 pass/fail
   对照 G<N>.measure.forbiddenSignals 每条,检查是否触发
   写入 craft md 的「自审段」(像素级具体观察,非"4/5"模板)

Step 7: 判定
   - 全 pass + 0 forbidden → 标 done
   - 任一 fail / forbidden → 回 Step 4 改方案重做 (最多 3 轮)
   - 3 轮仍不达 → meta/raise_upstream_challenge
```

---

## 2. Step 4 落库 — 一次性多维度协同

### 2.1 推荐顺序（同一任务内）

```
1. layout / structure (element/add / wrap / move)
   - 装饰节点 element/add  
   - 容器 wrap
   - 节点 move
   - 新建节点必挂 meta.design.kind + servingGoals

2. styles (style/update / batch_update)
   - 仅涉及节点 (在 goalElementMap[goalId].involvedElements 内)
   - 不能误改其他节点 (其他 goal 涉及 / 兜底涉及 / 业务节点)

3. visualStates (visual_state/add / update)
   - 涉及节点的状态改动
   - 状态切换前后视觉差异 ≥ 显著

4. materials (调 material-painter)
   - brief 仅给目标 + 概念 + 节点尺寸 + token 池 + 失败案例
   - 禁止施工图 (pathData / 坐标 / hex / 构图层数)
   - 等 painter 完成后调 applyMaterialDesign
```

### 2.2 反例（按字段类别拆任务,禁止）

❌ 错：
```
1. D-X-styles 任务: 一次性写所有节点 styles → 标 done
2. D-X-states 任务: 一次性写所有 visualStates → 标 done
3. D-X-materials 任务: 一次性给所有素材节点写 spec → 标 done
4. D-X-decorations 任务: 加装饰节点 → 标 done
5. D-X-self-review 任务: 自评 5 维 → 标 done

后果: 每个任务的"改动"都没溯源到设计目标,字段被填满但视觉没达成
```

✅ 对（按 goal 拆 craft）：
```
1. D-X-G1-craft: 一次性改动 G1 涉及的 7 元素的 styles + structure + materials + layout
   (但仅这 7 元素,不动其他)
2. 截图对账 G1 successCriteria
3. 全过 → 标 done

4. D-X-G2-craft: 类似
...
```

---

## 3. Step 5 截图 — 强制流程

### 3.1 截图调用

```bash
# 标准用法
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)

# 不传 screenId 截 active 屏
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> 2>/dev/null | tail -1)

# 自定义路径
node scripts/screenshot-screen.mjs <projectId> <screenId> /tmp/before.png
node scripts/screenshot-screen.mjs <projectId> <screenId> /tmp/after.png
```

### 3.2 多次截图对比（before / after）

涉及大改动时,推荐改前先截 before,改后截 after：

```bash
# 改 schema 前
BEFORE=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)

# 跑 MCP 改 styles / states / structure
# ...

# 改 schema 后
AFTER=$(node scripts/screenshot-screen.mjs <projectId> <screenId> 2>/dev/null | tail -1)
```

AI 用 Read 分别看 BEFORE / AFTER 比对视觉变化。

### 3.3 失败排查

详见 `../common/references/screenshot-tool.md` §3.2。常见：
- design-api / design_front 没在跑
- 项目 ID 不对
- token 过期（删 .tica-tmps/.screenshot-bot-token 重试）

---

## 4. Step 6 对账 successCriteria — 像素级具体

### 4.1 自审段写法（在 craft-G<N>.md 末尾追加）

```markdown
## 自审段（截图对账）

### 截图路径
- /Users/.../.tica-tmps/snapshots/<projectId>-2026-06-01T12-34-56.png

### successCriteria 逐条核对

#### Criteria 1: "首屏视线热点落在 BrandLogo + 屏底偏暖区,而非 SubmitBtn 主色块"
- **判定**: ✅ pass
- **像素级观察**: 截图首屏 (顶部 700px) 内 BrandLogo 在屏顶居中,
  尺寸约 120×120,主色字标"C"清晰；屏底从顶到底有可见的米黄偏色 
  (RGB 大致 248,244,238) → 与 #FFFFFF 距离约 8pt,符合温度感传递。
  SubmitBtn 主色块虽显眼但居于折线下方,未抢首屏视觉焦点。

#### Criteria 2: "屏底色 RGB 与 #FFFFFF 距离 ≥ 5 pt"
- **判定**: ✅ pass
- **像素级观察**: 取屏底中心点像素 (avg sample),RGB ≈ (248, 244, 238),
  与 #FFFFFF (255,255,255) 各通道差 7/11/17 → 距离 ≥ 5pt。

#### Criteria 3: "出现 ≥ 2 个具象校园元素表征"
- **判定**: ❌ fail
- **像素级观察**: BrandLogo 字标"C"是品牌符号,不算具象校园元素。
  右上 BgBlobTopRight 是抽象色斑,不直接关联校园场景。
  左下 BgBlobBottomLeft 同样抽象。
  → 0 个具象校园元素表征,未达 ≥ 2 阈值。
- **决策**: Step 7 判定 fail,回 Step 4 重做。
  - 候选改动: 把 BgBlobTopRight 改成"教室窗格"线条形装饰
  - 候选改动: BrandLogo 字标内嵌"书本"或"跑道"小图

### forbiddenSignals 检查

#### Forbidden 1: "屏底 #FFFFFF 或与之差 ≤ 1pt"
- **触发**: ❌ no
- 屏底 RGB (248,244,238),距 #FFFFFF 远超 1pt。

#### Forbidden 2: "灰阶占比 > 40%"
- **触发**: ❌ no
- 截图主色为暖白米 + 主色蓝紫 + textPrimary 字色,灰阶占比目测 < 30%。

#### Forbidden 3: "出现任何直角元素 (border-radius < 4px)"
- **触发**: ❌ no
- BrandLogo radius 16px / FormCard 16px / SubmitBtn 12px / Input 8px / 
  Checkbox 4px,全部 ≥ 4px。

### 总判定

- **本轮结果**: 1 fail (Criteria 3) → 不能 done
- **重做计划**: 第 2 轮,改动 BgBlobTopRight + BgBlobBottomLeft 为教室元素表征
- **当前轮次**: 1/3
```

### 4.2 自审段的强制规则

- **像素级具体观察**：禁用模板套话"识别度 4/5"。必须像上面那样写"取屏底中心点像素 RGB ≈ (248,244,238)"
- **逐条核对**：≥ 3 条 successCriteria,每条独立判定 pass/fail
- **forbiddenSignals 全检**：每条独立判定 trigger / no
- **fail 时给改动候选**：不能只说"fail",必须列具体改动方案

---

## 5. Step 7 判定 — 3 轮迭代上限

### 5.1 三种判定结果

| 结果 | 判定 | 后续 |
|---|---|---|
| 全 pass + 0 forbidden | done | meta/update_plan_task done |
| 任一 fail / forbidden | redo | 回 Step 4 (轮次 +1,最多 3 轮) |
| 3 轮仍不达 | challenge | meta/raise_upstream_challenge |

### 5.2 UpstreamChallenge 触发场景

```
情况 1: theme.tokens 不够 (如缺 warmCanvas / warmSoft)
  → challenge theme-generator 补 token

情况 2: interaction 骨架不支持 (如缺 EmptyState 节点)
  → challenge interaction-designer

情况 3: Phase D 策略冲突 (装饰族不够 / 60-30-10 比例无法落地)
  → 回 Phase D 重做 (本阶段内,不算 challenge)

情况 4: Phase B goal 提取错 (successCriteria 不可达)
  → 回 Phase B 重做 goal (本阶段内)
```

---

## 6. ★ 沉淀到 schema 的结论（craft 任务）

每个 craft 任务的 schema 落库不集中在某个字段,而是**多个 MCP 调用的合集**：

```jsonc
// 多个 MCP 调用,在同一 craft 任务内全部完成

// 1. layout / structure
element/add { parent: "screen", node: { name: "BgBlobBottomLeft", ..., meta: { design: { kind: "decoration", servingGoals: ["G1"] } } } }

// 2. styles
style/batch_update {
  updates: [
    { nodeId: "screen", styles: { backgroundColor: "$token:colors.warmCanvas" } },
    { nodeId: "FormCard", styles: { boxShadow: "$token:shadows.warmSoft" } },
    { nodeId: "BrandLogo", styles: { width: "120px", ... } },
    // 仅 G1 涉及的 7 元素
  ]
}

// 3. visualStates (本 craft 不涉及)

// 4. materials
// 调 material-painter SKILL,brief 见 §changes.materials
applyMaterialDesign { nodeId: "BrandLogo", materialProjectId: "<painter 完成后给的 ID>" }

// 5. meta 更新
meta/set_node {
  nodeId: "BrandLogo",
  patch: {
    design: {
      summary: "服务 G1 校园温度的品牌识别主角",
      servingGoals: ["G1", "G5"],
      ...
    }
  }
}
```

最后:
```jsonc
meta/update_plan_task {
  taskId: "D-X-G1-craft",
  patch: {
    status: "done",
    notes: "md: design/X/craft-G1.md  截图: <path>  自审通过 4/4 successCriteria"
  }
  // service 端跑 expectedArtifacts: { kind: 'goalSuccessCriteriaMet', goalId: 'G1' } 校验
}
```

---

## 7. 反例

### 7.1 跨目标改动

❌ 错（craft-G1 改了 G2 涉及节点）：
```
craft-G1: G1 涉及 [screen, BrandLogo, BgBlob×2, FormCard, HeaderArea, Root]
但 craft 时改了 SubmitBtn (G2 涉及) 的 styles.backgroundColor
后果: 跨 goal 改动,违反 R-GOAL-COVERAGE
```

✅ 对：
```
craft-G1 仅改 G1 涉及的 7 节点
SubmitBtn 留给 craft-G2
```

### 7.2 拆任务做（按维度）

❌ 错：
```
craft-G1-styles: 改 G1 涉及节点的 styles → done
craft-G1-states: 改 G1 涉及节点的 states → done
craft-G1-materials: 调 painter → done
后果: 按字段类别拆任务,失去多元素协同的整体性
```

✅ 对：
```
craft-G1: 一次性改 G1 涉及节点的 styles + structure + materials + visualStates
所有维度在同一任务内完成
```

### 7.3 自审走过场

❌ 错：
```
self-review 段:
  Criteria 1: 4/5 ✅
  Criteria 2: 4/5 ✅
  Criteria 3: 4/5 ✅
后果: 模板套话,没像素级观察 → AI 可以蒙混过关
```

✅ 对（见 §4.1 示例）。

---

## 8. 一句话总结

> **craft 任务 = "为达成 G<N>,在同一任务内一次性改完所有涉及元素的多维度,然后截图逐条对账 successCriteria。任一不达回头改,3 轮仍不达发 challenge。"**
