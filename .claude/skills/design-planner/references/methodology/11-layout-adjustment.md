# 方法论 11：布局调整权 (Layout Adjustment)

> 适用任务：所有 `D-X-craft-*`、`D-X-decorations`
>
> **核心**：design 阶段**允许调整布局**——但仅限"视觉容器"类节点。**业务节点不动**——动了 = 推翻业务设计。

---

## 1. 为什么 design 阶段需要布局调整权

资深视觉设计师拿到节点骨架后，常常需要：

1. **包一层视觉容器**：interaction 给的 PolicyRow = `<div>` + Checkbox + Text 平铺；design 为了"勾选 + 文字 + 整行可点击"需要包一层 `<label htmlFor>` 容器
2. **加视觉容器**：为 hero 区加一个 `<HeroFrame>` 容纳 Logo + Slogan + 背景渐变；为 ModeToggle 加 `<TabIndicator>` 移动指示条
3. **加装饰节点**：右上 `<BgBlobTopRight>` 光斑装饰
4. **画素材**：BrandLogo 从 type=img 空 src → 调 material-painter 画 + applyMaterialDesign 写入 materialProjectId

**这些不是"重组业务结构"——是给业务结构补视觉外壳**。

---

## 2. ✅ 允许的布局调整

### 2.1 element/add — 加视觉容器节点

```jsonc
// 例：包 PolicyCheckbox 的 wrapper-label
element/add {
  parentId: "n_PolicyRow",
  index: 0,                                           // 替换 PolicyRow 第一个 child
  node: {
    type: "label",
    name: "PolicyCheckLabel",
    label: "协议勾选行",
    props: { htmlFor: "policy-check" },
    styles: { display: "flex", ... },
    meta: { design: { kind: "visual-container" } },  // ★ 必挂
    children: [/* 移过来的 PolicyCheckbox + 新建的 Visual + Text */]
  }
}

// 例：加 TabIndicator 移动指示条
element/add {
  parentId: "n_ModeToggle",
  node: {
    type: "div",
    name: "TabIndicator",
    styles: { position: "absolute", bottom: "-1px", height: "2px", ... },
    meta: { design: { kind: "visual-container" } }
  }
}
```

### 2.2 element/wrap — 包裹现有兄弟

```jsonc
element/wrap {
  childIds: ["n_PolicyCheckbox", "n_PolicyText"],
  newParent: {
    type: "label",
    name: "PolicyCheckLabel",
    props: { htmlFor: "policy-check" },
    styles: { display: "flex", ... },
    meta: { design: { kind: "visual-container" } }
  }
}
```

### 2.3 element/move — 同父级内移动节点

```jsonc
element/move {
  nodeId: "n_PolicyText",
  newParentId: "n_PolicyCheckLabel",                  // 移到 wrapper 内
  index: 2
}
```

### 2.4 装饰节点 element/add（4 类）

```jsonc
// 详见 schema-spec/decoration-nodes.md
element/add {
  parentId: "rootNode",
  node: {
    type: "div",
    name: "BgBlobTopRight",
    styles: { position: "absolute", top: "-40px", right: "-60px", ... },
    meta: { design: { kind: "decoration" } }         // ★ 装饰节点
  }
}
```

### 2.5 调用 material-painter 画素材 + applyMaterialDesign

```jsonc
// 详见 methodology/12-material-painting-flow.md
// design 阶段直接调子技能画 + 写入 node.materialProjectId
```

### 2.6 屏级 overlays 加视觉 overlay（如 backdrop / loading mask）

```jsonc
// 例：登录提交时全屏 dim
// design 阶段允许在 screen.overlays 新增 backdrop（不动 interaction 已建的业务 overlay）
```

---

## 3. ❌ 禁止的"布局调整"

| 操作 | 为什么禁 |
|---|---|
| `element/remove` 业务节点（product/interaction 已建）| 推翻业务设计；走 UpstreamChallenge |
| 改 `node.events` / `bind` / `repeat` / `visibleWhen` | interaction 已写 |
| 改 `node.props.textContent` 含 `{{state.x}}` 部分 | interaction 已写动态文案 |
| `element/move` 业务节点跨父级 | 改变了节点树结构语义；走 UpstreamChallenge |
| 改 `screen.dataSources` / `stateInit.view/data` 字段定义 | interaction 已写 |
| 改 `screen.overlays` 业务 overlay 的 showWhen / events | interaction 已写 |
| 改 `project.themeConfig.tokens` | theme-generator 写 |

---

## 4. 判定流程：能不能加这个节点？

```
我想加 / wrap / move 一个节点 X：
  Q1. X 是装饰、视觉容器、material-frame 之一？
       → 是 → 进 Q2
       → 否（业务节点）→ ❌ 走 UpstreamChallenge

  Q2. X.meta.design.kind 已挂 ∈ ['decoration', 'visual-container', 'material-frame']？
       → 是 → ✅ 允许
       → 否 → ❌ 必须挂 kind 才允许

  Q3. 是否动了已有业务节点的 events / bind / 数据？
       → 是 → ❌ 即使是"移动"也禁
       → 否 → ✅ 允许
```

---

## 5. 视觉容器的命名规范

新增视觉容器节点 `name` 应明确**视觉职能**，便于跨屏审计：

| 职能 | 命名前缀 | 例 |
|---|---|---|
| 包 native 控件 | `<...>Label` / `<...>Wrapper` | PolicyCheckLabel / FileUploadWrapper |
| 包品牌区 | `<...>Frame` | HeroFrame / BrandFrame |
| 视觉指示 | `<...>Indicator` / `<...>Marker` | TabIndicator / StepMarker |
| 视觉效果容器 | `<...>Effect` | RippleEffect / GlowEffect |
| 装饰背景 | `Bg<位置>` / `Decoration<...>` | BgBlobTopRight / DecorationLine |
| 自绘外观 | `<...>Visual` / `<...>Track` / `<...>Thumb` | PolicyCheckVisual / SwitchTrack / SwitchThumb |

**禁止**：`Wrapper1` / `DivX` / `Container` 等无语义名。

---

## 6. 与 D-X-tree-redlines 的关系

design 阶段加节点后，仍要符合 `methodology/08-node-tree-redlines.md` 的 4 红线：

1. 组件内联展开（不能引用未定义的 ref）
2. 状态-节点对应（visualState 命中节点存在）
3. 完整样式（必有 styles）
4. 叶子有内容（textContent 或 children 至少其一）

这 4 红线 D-X-tree-redlines 任务会兜底核对。

---

## 7. md 落地（在 D-X-craft-* 任务中）

```markdown
## 布局调整清单

### 加 / wrap / move 操作
| 操作 | 节点 | meta.design.kind | 用途 |
|---|---|---|---|
| element/wrap | PolicyCheckbox + PolicyText → PolicyCheckLabel | visual-container | 整行可点 + native checkbox 隐藏 |
| element/add | TabIndicator | visual-container | ModeToggle 移动指示条 |
| element/add | BgBlobTopRight | decoration | 右上角光斑装饰 |
| element/add | overlay LoadingBackdrop | visual-container | submit 时全屏 dim |

### MCP 调用清单
[每个调用 jsonc 详细参数]
```

---

## 8. 红线

- ❌ 加新节点不挂 `meta.design.kind` → service 端拒
- ❌ remove / move 业务节点（product/interaction 已建）→ 必须走 UpstreamChallenge
- ❌ 改业务节点的 events / bind / repeat / visibleWhen / 动态 textContent → §5.4 阶段边界违反
- ❌ 视觉容器命名无语义（Wrapper1 / DivX）
- ❌ 加节点后未在 D-X-tree-redlines 任务核对 4 红线
