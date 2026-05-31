# 模板：D-X-decorations（装饰决策）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/decorations.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-decorations
> 对应 schema 字段：装饰节点（element/add 4 类）+ 每节点 meta.design.materialSpec

## 1. 主题风格匹配

theme.intent: ___________（如 "playful + organic + minimal"）
本屏情感目标（来自 D-X-emotion）: ___________

推荐主装饰类（参考 04-decoration-categories.md）:
- 主：___________ + ___________
- 辅：___________

## 2. 装饰用量决策树

| Q | 答 |
|---|----|
| Q1 核心内容是什么？ | ___________（简单/丰富）|
| Q2 情感需求？ | ___________（功能/品牌/情绪/庆典）|
| Q3 主次关系？ | 1 主 + N 辅 + N 微 |
| Q4 删去任何 1 个，氛围有损？ | ___________ |

→ 推荐用量：**___ 个装饰**（少 2-4 / 中 4-8 / 密 8-15）

## 3. 候选装饰对比

### 方案 A
| 装饰节点 | 类别 | 位置 | 透明度 | 视觉重量 | weight |
|---------|------|------|--------|---------|:------:|
| ___________ | ___________ | ___________ | __% | 主 | __ |
| ___________ | ___________ | ___________ | __% | 次 | __ |
| ___________ | ___________ | ___________ | __% | 微 | __ |

总 weight: ___ → 是否符合剩余预算？___（剩余 = 30 - 业务节点 weight）

### 方案 B
- ...

### 方案 C
- ...

→ **采用方案 ___**，理由：___________

## 4. 与视觉预算的关系

剩余预算（来自 D-X-budget）：30 - 业务节点 weight = ___
装饰节点总和 weight = ___
✅ 在预算内 / ❌ 超预算 → 削减到 ___

## 5. 配色与层次

| 装饰 | 主色 | 透明度 | 视觉手段 | 颜色与内容的关系 |
|------|------|:------:|----------|----------------|
| ___________ | $token:colors.primaryLight | 12% | 渐变光晕 + blur | 比内容淡 |
| ___________ | $token:colors.secondary | 8% | 有机叶片 PNG | 比内容淡 |

## 6. 装饰节点结构（每个一段）

### PinkCircleDeco（背景氛围）
- type: div
- position: absolute, top: -40px, right: -60px
- size: 180×180
- background: radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)
- pointerEvents: none
- z-index: 0
- renderHint: css-gradient（CSS 实现，executor 跳过素材绘制）

### MintLeafDeco（角落溢出）
- type: div
- position: absolute, bottom: 10%, left: -20px
- size: 120×120
- backgroundImage: 待 executor 写 PNG URL
- pointerEvents: none
- z-index: 0
- renderHint: png（需 material-painter 画）

[更多...]

## 7. ★ 沉淀到 schema 的结论

```jsonc
// MCP: element/add 装饰节点 + meta/set_node 写 design 字段

// 1. 创建 PinkCircleDeco
element/add {
  projectId,
  parentId: "<screen-rootNode-id>",
  name: "PinkCircleDeco",
  label: "粉色光晕装饰",
  type: "div",
  styles: {
    position: "absolute",
    top: "-40px",
    right: "-60px",
    width: "180px",
    height: "180px",
    borderRadius: "$token:radius.full",
    background: "radial-gradient(circle, $token:colors.primaryLight 0%, transparent 70%)",
    zIndex: 0,
    pointerEvents: "none"
  },
  props: {}
}

meta/set_node {
  projectId,
  nodeId: "<新建的 PinkCircleDeco id>",
  patch: {
    design: {
      summary: "右上角粉色光晕，营造温暖氛围",
      rationale: "对照视觉预算 weight=4 / 氛围-装饰 / 允许渐变+blur。引导视线流向 FormCard 顶部。",
      visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
      materialSpec: {
        kind: "decoration",
        renderHint: "css-gradient",
        referenceFrame: { width: 180, height: 180 },
        background: "transparent",
        composition: "径向渐变圆，中心 primaryLight 50% 到边缘 0%",
        notes: "renderHint=css-gradient 时 styles.background 已表达全部"
      }
    }
  }
}

// 2. 创建 MintLeafDeco
[同上结构，PNG renderHint]
```

⚠️ **expectedArtifacts 验收（update_plan_task 时补声明）**：
```jsonc
{ kind: 'arrayMin', path: 'rootNode.children', min: <现有节点数 + 装饰节点数> }
```

## 8. 不需要装饰的特例论证（如适用）

如本屏判定不需要装饰节点 → status: skipped + notes：
```
"本屏为纯文本输入页（如长文本编辑器），情感目标'专注'。装饰会干扰输入。仅保留 minimal 背景色。"
```
```
