# 模板：E-X-svg-\<node\>（SVG 素材内联）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/<screenId>/svg-<nodeName>.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-svg-<nodeName>
> 对应 schema 字段：node.props.svgContent

## 1. 节点 materialSpec 摘要

```jsonc
nodeId: "<n16-OrnamentSep>"
materialSpec:
  kind: "decoration"
  renderHint: "svg"
  referenceFrame: { width: 60, height: 12 }
  background: "transparent"
  colorStrategy:
    primary: { value: "$token:colors.primary", role: "图案色" }
  composition: "三个连接的有机点 + 居中圆点 + 两侧小弧"
  layers: [
    { name: "中心圆点", shape: "实心圆", fill: "$token:colors.primary", position: "中央", size: "4×4" },
    { name: "左弧",     shape: "贝塞尔曲线", stroke: "$token:colors.primary 1px round", position: "左侧", size: "20×8" },
    { name: "右弧",     shape: "贝塞尔曲线", stroke: "$token:colors.primary 1px round", position: "右侧", size: "20×8" }
  ]
  qualityChecklist: [...]
```

## 2. token 解析

```
$token:colors.primary → #FF6F91
```

## 3. SVG 翻译（执行）

按 layers 逐层翻译：

```svg
<svg width="60" height="12" viewBox="0 0 60 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- layer 1: 中心圆点 -->
  <circle cx="30" cy="6" r="2" fill="#FF6F91"/>
  <!-- layer 2: 左弧 -->
  <path d="M0 6 Q15 2 30 6" stroke="#FF6F91" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- layer 3: 右弧 -->
  <path d="M30 6 Q45 10 60 6" stroke="#FF6F91" stroke-width="1" stroke-linecap="round" fill="none"/>
</svg>
```

注意：
- fill / stroke 必须**已解析为真实色值**（SVG 是静态字符串）
- stroke-width 必须与 lineStyle.width 一致
- stroke-linecap / stroke-linejoin 必须与 lineStyle.cap / join 一致

## 4. 写入节点 props

```jsonc
component_prop/update_props {
  projectId, nodeId: "n16",
  props: {
    svgContent: "<svg width=\"60\" height=\"12\" ...>...</svg>"
  }
}
```

## 5. 截图核对

```
generate_snapshots { projectId, screenIds: [screenId] }
对照 qualityChecklist：
  □ 60×12 区域内显示
  □ 圆点居中清晰
  □ 两侧弧线对称
  □ 色彩与 token 一致
  □ 线条圆头（end-cap round）
```

## 6. 重画历史（如有）

| 版本 | 问题 | 调整 | 通过？ |
|------|------|------|:------:|
| v1 | 弧线过于陡峭 | 降低控制点 Q 值 | ✅ |

## 7. ★ 沉淀到 schema 的结论

```jsonc
component_prop/update_props {
  projectId, nodeId: "n16",
  props: {
    svgContent: "<svg width=\"60\" height=\"12\" ...>...</svg>"
  }
}
```

⚠️ **expectedArtifacts 验收**：
```jsonc
{ kind: 'nonEmpty', path: 'rootNode...<n16>...props.svgContent' }
```

## 8. 红线

- ❌ SVG 字符串保留 `$token:` 未解析 → 渲染器看不懂
- ❌ stroke-width 与 lineStyle 不一致 → 视觉偏差
- ❌ SVG layers > 5 段 → 应改 png（提交 challenge 让 design 改 renderHint）
```
