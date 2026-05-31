# 方法论 1（v3）：取景 (Briefing) — 读懂产品 + 主题 + 交互骨架

> 适用任务：`D-X-briefing`（每屏第一棒，强制）
>
> **核心**：设计前必先读懂上下文。直接看 schema 字段写 styles = 字段填写员；先读懂"用户是谁、想做什么、什么场景、上游怎么搭骨架"再设计 = 设计师。

---

## 1. 取景的 4 个维度

每屏进入设计前必读：

### 1.1 产品维度 (Product)

read 字段：
- `project.meta.targetUser` — 目标用户画像
- `project.meta.coreScenarios` — 核心场景列表
- `project.meta.styleDirection` — 项目风格方向
- `project.meta.constraints` — 业务/合规约束
- `screen.meta.product.summary` — 本屏产品定位
- `screen.meta.product.userJourney` — 本屏在用户旅程中的位置（开头 / 转折 / 高潮 / 结尾）
- `screen.meta.product.emotionPoint` — 本屏情绪锚点

**问 4 个问题**：
- 用户来到这屏带着什么期望/情绪？
- 这屏要解决用户的什么具体问题？
- 用户用完这屏要去哪里、做什么？
- 这屏在产品体验链中是怎样的"角色"（招呼 / 转化 / 留存 / 安抚）？

### 1.2 主题维度 (Theme)

read 字段：
- `theme.intent` — 主题语言（minimal / playful / premium / trustworthy / warm 等）
- `theme.tokens.colors` — 调色板全集
- `theme.tokens.typography` — 字号 / 字重 / 行高梯度
- `theme.tokens.radius` — 圆角梯度
- `theme.tokens.shadows` — 阴影梯度
- `theme.tokens.transitions` — 缓动 / 时长
- `theme.decorationRules` — 装饰用量上限
- `theme.iconSpec` — 图标规范

**问 3 个问题**：
- 主题 intent 是什么（一个枚举词）？对应的视觉词典在 `recipes/theme-element-dict/<intent>.md`
- token 池是否足够支撑本屏？哪些 token 缺（缺则走 UpstreamChallenge）？
- decorationRules 给的装饰上限是多少？本屏要在这上限内分配装饰节点

### 1.3 交互维度 (Interaction)

read 字段：
- `screen.stateInit.view` — 本屏所有 view 字段（boolean / enum / number / string）
- `screen.dataSources` — 数据源 schema + mock scenarios
- `screen.rootNode` 已建节点骨架（含衍生视图节点 7 类）
- `screen.overlays` — 屏级浮层
- `project.globalOverlays` — 项目级浮层
- 每节点 `events` / `bind` / `repeat` / `visibleWhen`

**问 4 个问题**：
- 本屏有哪些业务态（state.view 字段）？每个字段哪些节点该有视觉表达？
- 衍生视图节点（loading / empty / error / auth / business / feedback / overlays）哪些已建？哪些还需要 design 阶段补视觉？
- 节点骨架够不够？需要 element/add 视觉容器吗（如 wrapper-label / TabIndicator / HeroFrame）？
- mock scenarios 都是什么？设计 loading / empty / error 态时要照对应 scenario

### 1.4 上下文维度 (Context)

read 之前已完成屏的 design：
- 同种组件在其他屏的视觉规格（跨屏一致性的输入）
- `project.componentAssets` — 已沉淀的通用模板

---

## 2. briefing.md 强制结构

按 `note-templates/briefing.template.md` 格式写：

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-X-briefing
> 对应 schema 字段：screen.meta.design.briefing（v3 新增）

## 1. 产品维度
- 目标用户：xxx
- 核心场景：xxx
- 用户来时心理：xxx
- 用户去向：xxx
- 本屏角色：xxx

## 2. 主题维度
- theme.intent：xxx
- 关键 token 清单：xxx
- 装饰上限：xxx
- 缺什么 token（如有）：xxx → UpstreamChallenge

## 3. 交互维度
- state.view 字段表（含类型 + 业务含义）：[列表]
- 衍生视图节点已建：[列表]
- 节点骨架是否够：xxx
- mock scenarios：[列表]

## 4. 上下文维度
- 同种组件在其他屏：xxx
- 可复用的 componentAssets：[列表]

## 5. ★ 沉淀到 schema 的结论
[填 screen.meta.design.briefing 字段，含 4 个维度浓缩版]

例：
{
  "userIntent": "校园用户登录回到主页",
  "userMood": "焦虑(怕被推销) → 期望简洁",
  "themeIntent": "minimal-warm",
  "stateViewSummary": "活跃模式 / 政策同意 / 倒计时 / 提交中 等 5 字段",
  "missingTokens": [],
  "skeletonGaps": []
}
```

---

## 3. 取景的"判停"红线

briefing 阶段必须答全 4 维度。任一维度未答 → **停下来 read 上游 schema** 而不是猜。

如果发现上游缺东西：
- 缺 token → UpstreamChallenge theme-generator
- 缺 state.view 字段 → UpstreamChallenge interaction-designer
- 缺衍生视图节点 → UpstreamChallenge interaction-designer
- 缺业务字段定义 → UpstreamChallenge interaction-designer

不要在 design 阶段补这些——补了 = 推翻业务设计。

---

## 4. 出场契约

D-X-briefing 任务标 done 之前：
- ✅ briefing.md 4 维度全有内容
- ✅ 末尾「★ 沉淀到 schema 的结论」段含 `screen.meta.design.briefing` 字段
- ✅ MCP 调 `meta/set_node` 写入 `screen.meta.design.briefing`

不达标 → 不能进 D-X-concept。

---

## 5. 红线

- ❌ 跳过 briefing 直接写 concept → R-PHASE-FUNNEL-01（漏斗顺序）
- ❌ briefing 4 维度有任一为空 → R-BRIEFING-01
- ❌ 发现上游缺字段不挂 challenge 反而当场补 → R-BOUNDARY-01
- ❌ briefing.md 写得像产品文档（长篇大论）→ 应该是浓缩"我接下来设计要参考什么"，不是"产品需求复述"
