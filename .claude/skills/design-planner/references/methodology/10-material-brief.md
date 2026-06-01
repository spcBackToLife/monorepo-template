# 10 — material brief 边界（painter brief）

> 必读时机：执行 `D-X-G<N>-craft` 任务涉及素材时（调 material-painter 子技能）。
> 任务目的：精确定义"design 给 painter 的 brief 应该写什么 / 不能写什么"。
>
> 核心契约：design-planner 是**艺术总监**,material-painter 是**专业画家**。

---

## 1. 角色边界（绝对红线）

```
艺术总监 (design-planner): 定品牌方向、视觉概念、视觉策略、节点视觉权重、素材的"目标"
专业画家 (material-painter): 拿到目标 brief 后,自己跑「设计思考三步 + 7 步绘制工作流」
                              自己决定构图、笔触、坐标、颜色

绝对红线: design-planner 调 material-painter 时,brief 只能给目标 + 概念 + 约束
          不能给施工图
```

如果 design 在 brief 里写 pathData / 坐标 / hex / 构图层数 → painter 退化成"按图施工的画板代笔",跳过设计思考三步,设计价值归零。

---

## 2. brief 必填项 ✅

| 项 | 内容 | 来源 |
|---|---|---|
| **视觉目标（一句话）** | "服务 G<N>: 让校园用户进登录页一眼感受到清新温度" | designGoal.statement 衍生 |
| **概念关键词 3** | "暖白米 / 大圆角柔和 / 单色光斑节制" | visualStrategy 累积 |
| **mood board 关键词** | "晨光 / 笔记本 / 跑道 / 公告板" | positioning + designGoal |
| **theme.intent** | "minimal+flat+neutral" | theme/get |
| **装饰系统单一族** | "soft-glow" | visualStrategy.decorationSystem.family |
| **60-30-10 调色定位** | "10% 强调 / 30% 次要 / 60% 主导" | visualStrategy.colorRatio + 该素材角色 |
| **节点尺寸** | "120 × 120" | screen_schema 节点 width/height |
| **节点上下文** | "屏顶 safe-area 内,屏底偏暖,不能与屏底融合" | screen_schema + 推理 |
| **可用 token 池（引用名）** | ["primary", "primaryLight", "background", "textInverse"] | theme.tokens 摘要 |
| **失败案例（如有）** | "1.5px 边框在 #FCFCFD 屏底几乎不可见 → 请避免" | 上一轮自审记录 |
| **应用约束** | "targetState: default" / "checked" / ... | node.states |
| **painter 自己决定的清单** | ["概念隐喻","构成规划","笔触/safe-zone/构图层数","如何避免与屏底融合"] | 强制 ≥ 3 项 |

---

## 3. brief 禁止项 ❌

| 项 | 为什么禁 |
|---|---|
| **pathData 字符串**（如 `M 180 120 C ...`）| painter 的"画笔轨迹",design 越界 |
| **具体坐标**（如圆心 (120, 120) 半径 60）| 同上 |
| **strokeWidth 像素值**（如 18px）| 笔触粗细是构图决策,painter Step 0b 决定 |
| **hex 色值**（如 #5B6CFF）| 必须用 token 引用名,让 painter 自己 theme/get 解析 |
| **构图层数 / 形状清单**（"3 层:底层圆角矩形 + 中层 C 弧线 + 顶层..."）| painter 设计三步的"构成规划",design 越界 |
| **safe-zone 像素值**（如 24px padding）| painter 按 iconSpec.sizing.minPadding 推导 |
| **rect/path/ellipse 选型**（"用 rect + path"）| painter 自己决定图形原语 |

---

## 4. brief 模板

每个 craft 任务调 material-painter 时,brief 按这个结构：

```markdown
# Material Brief — <nodeName>

## 视觉目标

服务 <goalId> <goal.statement 简化版>

## 概念

- 灵魂句: "<最贴近 goal 的 mood 表达>"
- 风格关键词: ["<keyword1>", "<keyword2>", "<keyword3>"]
- mood board: ["<场景词1>", "<场景词2>", "<场景词3>", "<场景词4>"]

## 主题约束

- theme.intent: <minimal+flat / playful / ...>
- 装饰系统单一族: <soft-glow / illustration / ...>
- 60-30-10 角色: <10% 强调 / 30% 次要 / 60% 主导>

## 节点信息

- 节点 ID: <nodeId>
- 尺寸: <width × height>
- 位置上下文: <"屏顶 safe-area 内 / 屏底偏暖 / 不能与屏底融合">

## 可用 Token 池

仅可用 token 引用名（painter 自己 theme/get 解析）：
- primary
- primaryLight
- background
- ...

## 应用约束

- targetState: <default / hover / checked / ...>

## 失败案例（如有）

- v<N> 失败: <什么改动 + 为什么失败>
- 请避免: <具体反模式>

## 你需要自己决定的（≥ 3 项）

1. 概念隐喻（字标 vs 图形 vs 抽象）
2. 构成规划（要不要边框 / 阴影 / 光晕）
3. 风格适配（笔触 / 色比 / 留白）
4. 尺寸（参考框 / stroke / safe-zone）
5. 如何避免与屏底融合
```

---

## 5. 工作流（craft 任务内）

### Step 1: 写 brief（按 §4 模板）

放在 craft-G<N>.md 的 §2.4 materials 段落。

### Step 2: 调 material-painter SKILL

```
任务委托: 用 material-painter 子技能画 <nodeName>,brief 见 craft-G<N>.md §2.4
```

painter 跑完 7 步绘制工作流（详见 material-painter SKILL.md）后会返回 materialProjectId。

### Step 3: applyMaterialDesign

```jsonc
applyMaterialDesign {
  projectId: "<projectId>",
  nodeId: "<nodeName>",
  materialProjectId: "<painter 给的 ID>"
}
```

### Step 4: 截图自审

跑 `node scripts/screenshot-screen.mjs` + Read 看图,对照本 craft 的 successCriteria 核对。

### Step 5: 不达 → painter 重画

如果素材输出与目标偏差,**不能 design 自己改坐标"修一下"**。必须回 painter 重画并附"上一版失败原因"：

```markdown
brief v2:
  ... (同上)
  
## 失败案例（重要）
- v1 失败: 主色 1.5px 边框 + 字标 C 居中
  问题: 1.5px 边框在 #FCFCFD 屏底几乎不可见 + C 开口朝右导致视觉重心偏左
  请避免: 重新设计构成,可考虑「主色填充 + 白字 C」或「微弱阴影 + 暖白底 + 主色字 C」
```

---

## 6. 反模式案例

### 反模式 1: brief 含施工图

❌ 错（含施工图的 brief）：
```
brief:
  - 整张 240×240 圆角矩形（rx=ry=16）
  - 主色 1.5px 描边
  - 中心字母 C，圆心 (120, 120)，弧半径 60，stroke=18
  - safe-zone 24px padding
```

后果: painter 退化为画板代笔,构图选择被 design 抢光,视觉问题归 painter 但实际上 design 越界。

✅ 对（craft-G5-craft 服务 brand-recognition 的 brief）：
```
视觉目标: 服务 G5 让用户感受到"清新校园温度",品牌识别度成立
概念: 「像清晨教室的光,温暖但不打扰」/ 暖白米/大圆角柔和/单色光斑节制
节点尺寸: 120×120
屏底: #FCFCFD（暖白米）→ logo 不能与屏底融合到看不见
装饰系统: soft-glow

painter 你需要自己决定的:
  1. 概念隐喻（字标 vs 图形）
  2. 构成规划（要不要边框 / 阴影 / 光晕）
  3. 风格适配（笔触 / 色比 / 留白）
  4. 尺寸（参考框 / stroke / safe-zone）
  5. 如何避免与屏底融合

失败案例 v1: [带 1.5px 边框的版本],请避免
```

painter 收到后**自己跑设计三步** —— 可能选「主色填充背景 + 白字 C」（避免融合）/「微弱阴影 + 暖白底」/「primaryLight 渐变底 + 主色字」——这些选择由 painter 的专业判断做。

### 反模式 2: hex 色值

❌ 错：
```
brief: 使用 #5B6CFF 主色
```

✅ 对：
```
可用 token 池: ["primary", "primaryLight", ...]
```

painter 自己 theme/get 解析 `colors.primary` → #5B6CFF。

---

## 7. 自检（调 material-painter 前必看）

- [ ] brief 中没有 pathData / 坐标 / 像素 strokeWidth / hex 色值
- [ ] brief 中没有"用 rect + path 画 X 层"这种构图清单
- [ ] brief 给了视觉目标 + 概念 + 节点尺寸 + token 池引用名
- [ ] brief 列出了"painter 需要自己决定的"清单（≥ 3 项）
- [ ] 失败重画时附了"上一版为什么失败"
- [ ] brief 服务的 goalId 在 designGoals 里存在

任一未通过 → brief 还是施工图,重写后再发。

---

## 8. 红线（设计阶段强制）

- ❌ brief 含 pathData 字符串 → 整版 brief 退回重写
- ❌ brief 含具体坐标（如 "圆心 (x, y)" / "起点 (a, b)"）→ 退回
- ❌ brief 直接展开 hex 色（不是 `$token:` 引用名）→ 退回
- ❌ painter 输出后 design 不做"目标对账"（截图核对 successCriteria）,直接接受 → 失去 painter 的设计价值
- ❌ painter 输出与目标偏差时,design 自己改坐标"修一下" → 应该回 painter 重画并附"上一版失败原因"

---

## 9. 一句话总结

> **brief 给目标 + 概念 + 约束,painter 决定怎么画。design 越界写 pathData = brief 不合规,必退。**
