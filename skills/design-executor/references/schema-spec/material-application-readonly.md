# schema-spec：素材应用字段（v3 只读核对版）

> 适用任务：`E-X-handover-check`、`E-X-qa-diff`、`E-X-verified`
>
> ⚠️ **v3 ★ 重大变化**：v2 起 executor 写这些字段；v3 起 **design-planner 写**，executor **只读核对**。本文档是 v3 的核对清单；写入字段段已废止（见 design-planner 的 `material-spec.md` §12）。

---

## 1. v3 字段归属变化

| 字段 | v2 写入方 | v3 写入方 | executor v3 操作 |
|------|----------|----------|------------------|
| `node.materialProjectId` | executor | **design-planner** | 只读核对：非空 |
| `node.styles.backgroundImage` | executor (material-painter) | **design-planner** (material-painter via applyMaterialDesign) | 只读核对：非空 |
| `node.styles.backgroundSize` | executor (补默认) | **design-planner** | 只读核对：与 spec 一致 |
| `node.styles.backgroundPosition` | executor (补默认) | **design-planner** | 只读核对 |
| `node.styles.backgroundRepeat` | executor (补默认) | **design-planner** | 只读核对（通常 no-repeat）|
| `node.styles.backgroundColor` | executor | **design-planner** | 只读核对（透明素材通常 transparent）|
| `node.styles.backgroundOrigin` | executor | **design-planner** | 只读核对 |
| `node.styles.backgroundClip` | executor | **design-planner** | 只读核对 |
| `node.styles.backgroundAttachment` | executor | **design-planner** | 只读核对 |
| `node.styles.imageRendering` | executor | **design-planner** | 只读核对（icon→crisp-edges，普通→auto）|
| `node.props.src` | executor (img) | **design-planner** | 只读核对：非空 |
| `node.props.svgContent` | executor (svg) | **design-planner** | 只读核对：非空 |

⚠️ executor v3 写以上任一字段 → 越权红线，立刻停。

---

## 2. 核对清单（按 renderHint 分流）

### 2.1 renderHint = 'png'

```jsonc
对每个 materialSpec.renderHint='png' 的节点 N：
  必须满足：
    ✅ N.materialProjectId 已绑定（mat_xxx 形式的字符串，非空）
    ✅ N.styles.backgroundImage 包含 url(...) 形式（指向 CDN PNG）
    ✅ N.styles.backgroundSize 与 spec 期望一致（contain / cover / 具体 px）
    ✅ N.styles.backgroundPosition 与 spec 期望一致（center / top left / 具体值）
    ✅ N.styles.backgroundRepeat = 'no-repeat'
    ✅ N.styles.backgroundColor = 'transparent'（透明 PNG）/ 与 spec 一致
    ✅ N.styles.backgroundOrigin = 'padding-box'
    ✅ N.styles.backgroundClip = 'border-box'
    ✅ N.styles.backgroundAttachment = 'scroll'
    ✅ N.styles.imageRendering 与 spec 一致（kind=icon → 'crisp-edges'，否则 'auto'）

任一不满足 → 退回 design-planner（D-<X>-fix-<node>-bg9）
```

### 2.2 renderHint = 'svg'

```jsonc
对每个 materialSpec.renderHint='svg' 的节点 N：
  必须满足：
    ✅ N.props.svgContent 非空（含 <svg> 标签 + viewBox）
    ✅ N.styles 中无 backgroundImage（svg 走 props 路径，不需要 backgroundImage）

任一不满足 → 退回 design-planner（D-<X>-fix-<node>-svg）
```

### 2.3 renderHint = 'css-gradient'

```jsonc
对每个 materialSpec.renderHint='css-gradient' 的节点 N：
  必须满足：
    ✅ N.styles.backgroundImage 是 linear-gradient(...) 或 radial-gradient(...) 或 conic-gradient(...)
    ✅ 渐变中颜色已解析（v3 ★ 不能再有 $token: 字符串内嵌；走 GradientDef 或裸色）
    ✅ N.materialProjectId 通常为空（除非 design 把渐变也存了素材工程，极少见）

任一不满足 → 退回 design-planner
```

### 2.4 renderHint = 'css-only'

```jsonc
对每个 materialSpec.renderHint='css-only' 的节点 N：
  必须满足：
    ✅ N.styles 充分表达视觉（按 spec 的 layers 描述对照）
    ✅ N.materialProjectId 通常为空
    ✅ 无 backgroundImage（纯 CSS 实现）
```

---

## 3. img 节点（type='img'）

```jsonc
对每个 type='img' 的节点 N：
  必须满足：
    ✅ N.props.src 非空（v3：design 写）
    ✅ src 是合法 URL（http(s) 或 data: URI）
    ✅ N.props.alt 非空（无障碍）
    ✅ 如关联素材：N.materialProjectId 已绑

任一不满足 → 退回 design-planner
```

---

## 4. img 节点 vs div+backgroundImage 选择

| 选择 | 何时用 | 谁写 |
|------|--------|------|
| `<img src>` | 内容图片（用户上传 / 业务图）| design |
| `<div backgroundImage>` | 装饰图片（icon / 背景纹理 / 品牌素材）| design |

executor v3 不参与选择——design 已在 v3 阶段决定。如果发现选择错误（如 logo 用了 img 但应该用 div backgroundImage 以便嵌入 visualState）→ 退回 design-planner 调整。

---

## 5. 核对工具（推荐 MCP 调用）

```
1. query/screen_schema { projectId, screenId } → 拿全屏快照
2. 遍历 rootNode 子树 + screen.overlays，对每个 meta.design.materialSpec 非空的节点跑上面 §2 / §3 核对清单
3. 用 generate_snapshots 截图视觉核对（spec 的 composition / qualityChecklist）
4. 任一项不通过 → meta/add_plan_tasks 创建 D-X-fix-* 任务退回
```

---

## 6. 红线（v3 ★）

- ❌ executor 写 background-* 任一项 → 越权（v3 ★）
- ❌ executor 写 materialProjectId → 越权（v3 ★）
- ❌ executor 写 props.src / svgContent → 越权（v3 ★）
- ❌ 看到 9 项不齐自己补 → 越权
- ❌ 不核对就跳到 verified → 漏验证
- ❌ 退回时没写清"哪个节点 / 缺哪项 / spec 期望什么" → design 不知道修什么
