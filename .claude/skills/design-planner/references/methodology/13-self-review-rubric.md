# 方法论 13：自审评分标尺（5 维度）（v3 新增）

> 适用任务：所有 `D-X-craft-*` 落 schema 后、`D-X-self-review` 任务
>
> **核心**：写完 styles 不是任务终点。**用户实际看到的画面**才是。每个 craft 任务标 done 之前，必须**调 `scripts/screenshot-screen.mjs` 截图**（`mcp/generate_snapshots` 当前有 bug，详见 `../../../common/references/screenshot-tool.md`）→ Read 截图 → 按本标尺 5 维度自评分 → 任一维 < 4/5 必须回 Step 5 重做。
>
> **目标**：让 AI 在 craft 任务的 8 步循环里**看到自己写的实际画面**，把"事后审稿"变成"逐任务自校"。

---

## 1. 5 维度判分细则

### 维度 1：识别度（Recognition）

> 用户在 0.5 秒内能否识别出本屏的功能？

| 分 | 判定 |
|:---:|---|
| 5 | 一眼看懂这是什么页（登录页 / 列表页 / 详情页）+ 主要功能 |
| 4 | 看一眼能识别功能，但需要 1 秒确认主操作位置 |
| 3 | 需要扫描 2-3 秒才能定位主功能 |
| 2 | 元素堆砌，找不到重点 |
| 1 | 完全看不懂这是什么页 |

**自评提示**：
- 主 CTA 是否一眼可见（占据视觉重心，颜色/尺寸突出）？
- 品牌 / Logo 是否真画出来了（不是占位虚线框）？
- 文字层级是否清晰（标题 / 正文 / 辅助分明）？

---

### 维度 2：优先级层次（Hierarchy）

> 视觉权重金字塔是否成立？

| 分 | 判定 |
|:---:|---|
| 5 | 主角 / 配角 / 工具 / 装饰 4 层分明，视觉流向自然 |
| 4 | 4 层分明但某 1-2 节点权重偏离（如装饰过强或 Logo 过弱）|
| 3 | 主角与配角差异不明显，需要主动搜索才能定位主操作 |
| 2 | 平铺式无层次（所有元素权重相近）|
| 1 | 完全无层次或层次倒置（装饰盖过主角）|

**自评提示**：
- 截图眯眼看（模糊化视觉）→ 主角是否仍突出？
- query/visual_weight_audit 实测 weight 与声明 weight 偏差 ≤ 1？

---

### 维度 3：状态可见性（State Visibility）

> 当前状态用户能否看出来？

| 分 | 判定 |
|:---:|---|
| 5 | 所有 active/checked/selected/loading/disabled 态视觉显著（≥3 信号区分）|
| 4 | 主要业务态可见但 1-2 个态信号弱（如仅字色变化）|
| 3 | 部分业务态完全无视觉表达（如 Tab active = inactive）|
| 2 | 多个业务态缺失 |
| 1 | 业务态视觉完全缺失（用户分不清当前选中什么）|

**自评提示**：
- 切换 setVisualState 看每个态截图——是否每个都跟 default 有 distinct 差异？
- 业务态（state.view 字段触发的）有没有对应 visualState？
- query/visual_state_distinctness 报告每个态 distinct override 数 ≥ 2？

---

### 维度 4：主题契合（Theme Fit）

> 本屏视觉是否表达出了 theme.intent 的气质？

| 分 | 判定 |
|:---:|---|
| 5 | 完全符合 theme.intent；整页色彩 / 形状 / 装饰 / 间距均在主题语言内 |
| 4 | 大体符合，1-2 个细节偏离（如某节点圆角与主题不一致）|
| 3 | 部分元素游离主题（如主题"温暖"但全屏冷灰）|
| 2 | 多数元素游离主题，theme.intent 只在 token 层存在 |
| 1 | 完全无主题表达，视觉与 theme.intent 矛盾 |

**自评提示**：
- 与 `recipes/theme-element-dict/<theme.intent>.md` 词典对照 → 本屏 button/input/card 等是否符合？
- 60-30-10 调色比例是否落地？（query/color_ratio_audit）
- 装饰系统是否单一族（不混杂光斑+几何+插画）？

---

### 维度 5：情绪传达（Emotion）

> 本屏给用户的情绪是否符合 visualConcept 设定？

| 分 | 判定 |
|:---:|---|
| 5 | 截图给人的情绪与 concept.md 灵魂句一致（如"温暖治愈"→ 暖色 / 大留白 / 柔光斑）|
| 4 | 大体匹配，但某些元素冲突（如 concept "活泼" 但 button 太严肃）|
| 3 | 情绪模糊，看不出特定调性 |
| 2 | 情绪与 concept 部分相反 |
| 1 | 情绪完全相反或无情绪表达（典型政务感）|

**自评提示**：
- 拿 concept.md 的 3 个风格关键词，问"截图能让我想到这 3 个词吗"？
- 截图给陌生人看 → 1 句话评价 → 是否包含 concept 关键词？

---

## 2. 出场标尺（Exit Threshold）

```
任一维度 < 4 → 任务不能 done，回 Step 5 重做并在 review.md 记录"哪一维不达标 + 重做方向"

全部 5 维 ≥ 4 → 任务可标 done

平均 ≥ 4.5 → 优秀（D-handover 时进 examples 候选）
```

---

## 3. 与 B2 工具集的关联

5 维度评分由 AI 主观判（看截图），但**强烈推荐**先跑机器对账，过了再人评：

| 维度 | 机器对账先决条件 |
|---|---|
| 识别度 | query/canvas_render_status 0 个 broken-image / token-fail |
| 层次   | query/visual_weight_audit 金字塔成立 + weight 偏差 ≤ 1 |
| 状态   | query/visual_state_distinctness 业务态全有 ≥ 2 distinct override |
| 契合   | query/color_ratio_audit 60-30-10 落在 ±10% / decoration_system_audit 单一族 |
| 情绪   | （主观，无机器对账）|

**B2 工具未实施时**：AI 用肉眼判 + 写论证 + 列截图问题清单。

---

## 4. 自审循环（Step 6.5 详解）

```
craft 任务 Step 6 落 schema 完成 → 进入 Step 6.5：

Step 6.5.1 Bash: node scripts/screenshot-screen.mjs <projectId> [screenId]
            → stdout 末尾 = PNG 绝对路径
            ⚠️ 不要用 mcp/generate_snapshots —— 必读 ../../../common/references/screenshot-tool.md
Step 6.5.2 Read 截图（PNG 绝对路径）
            → 必须真用 Read 工具看图，不允许凭印象填评分

Step 6.5.3 写 review 段落（在 craft 任务 md 末尾追加）：
            ## 自审（5 维度）
            | 维度 | 分 | 判据 |
            | 识别度 | X/5 | 描述 |
            | 层次   | X/5 | 描述 |
            | 状态   | X/5 | 描述 |
            | 契合   | X/5 | 描述 |
            | 情绪   | X/5 | 描述 |
            
            （任一 <4 → 列重做项）

Step 6.5.4 判定：
            - 全 ≥4 → 进 Step 7 update_plan_task done
            - 任一 <4 → 不进 Step 7，回 Step 5 重做
                       重做后再走 Step 6 → Step 6.5（最多重做 3 轮，仍 <4 → 挂 challenge）
```

**新会话续接时**：从 review 段落能快速定位"上次重做到第几轮、当前评分多少"，不丢上下文。

---

## 5. 跨屏汇总（D-X-self-review 任务用）

每屏 craft 任务全部 done 后，挂屏级 D-X-self-review：

```jsonc
{
  id: "D-00-login-self-review",
  title: "登录屏整体自审",
  expectedArtifacts: [
    { kind: "selfReviewAllPassed", screenId: "00-login", minScore: 4 }
  ]
}
```

任务流程：
1. Bash 调 `scripts/screenshot-screen.mjs <projectId> <screenId>` 整屏完整截图（必读 `../../../common/references/screenshot-tool.md`）
2. 用 5 维度对**整屏整体**评分（不只是单个 craft 任务）
3. 写 `analysis-notes/<projectId>/design/<screenId>/self-review.md` 留全屏评分快照
4. 任一 < 4 → 创建 D-00-login-fix-<dim> 任务，回到 craft 阶段

---

## 6. 红线

- ❌ craft 任务 done 之前没截图自审 → R-REVIEW-01
- ❌ 5 维度某项 <4 仍标 done → R-REVIEW-02
- ❌ review 段落空洞（如"看起来不错"）无判据 → R-REVIEW-03
- ❌ 重做 ≥ 3 轮仍 <4 → 不要硬撑，挂 UpstreamChallenge（可能上游 theme 缺 token / interaction 缺字段）
- ❌ 屏级 self-review 时只看局部 craft 评分汇总，不看整屏截图 → 失去"整体感"判定
