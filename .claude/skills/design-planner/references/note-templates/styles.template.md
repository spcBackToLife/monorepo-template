# 模板：D-X-styles（全量样式落库）★

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/styles.md`
> 这是 design 阶段最长的 md，逐节点写完整样式。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-styles
> 对应 schema 字段：每节点 styles + screen.backgroundColor

## 1. 屏背景

```jsonc
// MCP: screen/update
screen.backgroundColor = "$token:colors.bgPage"
```

理由：___________（与情感目标和主题色的关系）

## 2. 每节点全量样式（按视觉权重从高到低）

> 每节点必须覆盖：布局 + 尺寸 + 颜色 + 排版 + 间距 + 阴影 + 过渡 等关键维度。
> 所有值必须 `$token:` 引用（除 CSS 关键字 / safe-area / 0 / auto / 派生节点 minimal-debug 升级）。
> 若发现某 token 不存在 → 退回 theme-generator 补 token，不当场硬编码。

### n9 - SubmitBtn（主角-CTA, weight=9）

视觉手段（参考 D-X-budget 中的 allowedTools）：渐变 / 发光 / spring 动效

```jsonc
style/update {
  projectId,
  nodeId: "n9",
  styles: {
    // 尺寸
    width: "100%",
    height: "48px",
    // 色
    backgroundColor: "$token:colors.primary",
    color: "$token:colors.textInverse",
    // 字（统一用 body 预设的 3 个子属性；想要更粗 → theme-generator 打 button 预设）
    fontSize: "$token:typography.body.fontSize",
    fontWeight: "$token:typography.body.fontWeight",
    lineHeight: "$token:typography.body.lineHeight",
    letterSpacing: "0.02em",
    // 形
    borderRadius: "$token:radius.full",
    border: "none",
    // 影
    boxShadow: "$token:shadows.sm",
    // 局
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "$token:spacing.xs",
    // 距
    marginTop: "$token:spacing.lg",
    // 动
    transition: "$token:transitions.normal",
    cursor: "pointer",
    userSelect: "none"
  }
}
```

理由：___________

### n2 - BrandLogo（主角-品牌, weight=7）

视觉手段：单色品牌色 + 微点缀（双色削减）

```jsonc
style/update {
  projectId, nodeId: "n2",
  styles: {
    width: "64px",
    height: "64px",
    // 此节点用 backgroundImage（待 executor 写 PNG URL）
    backgroundImage: "<待 executor 写入 PNG URL>",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    margin: "0 auto $token:spacing.md auto"
  }
}
```

理由：___________

### n4 - FormCard（配角-容器, weight=4）

视觉手段：仅圆角（削减阴影）

```jsonc
style/update {
  projectId, nodeId: "n4",
  styles: {
    width: "100%",
    padding: "$token:spacing.lg",
    backgroundColor: "$token:colors.bgCard",
    borderRadius: "$token:radius.lg",
    border: "1px solid $token:colors.borderLight",
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md"
    // 注：本来想加 boxShadow:md 但 budget 削减后只允许圆角，故省略
  }
}
```

理由：___________

### n6 - PhoneInput（工具-输入, weight=2）

视觉手段：仅边框（削减聚焦光）

```jsonc
style/update {
  projectId, nodeId: "n6",
  styles: {
    width: "100%",
    height: "44px",
    padding: "$token:spacing.sm $token:spacing.md",
    border: "1px solid $token:colors.borderDefault",
    borderRadius: "$token:radius.md",
    fontSize: "$token:typography.body.fontSize",
    color: "$token:colors.textPrimary",
    backgroundColor: "$token:colors.bgCard",
    transition: "$token:transitions.fast",
    outline: "none"
  }
}
// 注：聚焦光放到 visualState focus 中，不在 default styles 写
```

[继续每个节点 ...]

### n5 - PhoneError（派生展示节点，minimal-debug 升级）

interaction 阶段写了 minimal-debug：
```jsonc
{ color: "#ef4444", fontSize: "12px", marginTop: "4px", minHeight: "16px" }
```

design 阶段升级：
```jsonc
style/update {
  projectId, nodeId: "n5",
  styles: {
    color: "$token:colors.error",
    fontSize: "$token:typography.body-sm.fontSize",
    lineHeight: "$token:typography.body-sm.lineHeight",
    fontWeight: "$token:typography.body-sm.fontWeight",
    marginTop: "$token:spacing.xs",
    minHeight: "$token:spacing.md",        // 防塌陷
    letterSpacing: "0.01em"
  }
}
```

理由：把 v2.5 minimal-debug 7 属性升级为 token 引用 + 补完整 fontWeight / letterSpacing。

## 3. Token 引用核查（每节点）

| 节点 | 硬编码点 | 解决 |
|------|---------|------|
| n9 SubmitBtn | letterSpacing: "0.02em" | 接受（CSS 关键字范畴）|
| n2 BrandLogo | backgroundImage URL | executor 写入 |
| n5 PhoneError | letterSpacing: "0.01em" | 接受 |
| ... | | |

整屏 token 引用率估算：___ / ___ = ___%

## 4. 候选方案对比（如有取舍）

### FormCard 的圆角选择
- 方案 A：12px（$token:radius.md）→ 中性
- 方案 B：16px（$token:radius.lg）→ 与 organic 主题契合 ✅
- 方案 C：24px（$token:radius.xl）→ 过软，失去结构感

→ 采用 B

### 按钮 transition 的 easing
- ease-out：平稳响应
- spring（cubic-bezier(0.34, 1.56, 0.64, 1)）：弹性自然，呼应 playful ✅
- linear：机械感

→ 采用 spring

## 5. ★ 沉淀到 schema 的结论

汇总每个节点的 style/update 调用清单：

```jsonc
[
  { nodeId: "n9", styles: {...} },
  { nodeId: "n2", styles: {...} },
  ...
]
```

⚠️ **expectedArtifacts 验收**：
```jsonc
{ kind: 'nonEmpty', path: 'rootNode.styles' }
```

⚠️ **后续任务约束**：
- D-X-states：基于本任务的 default styles 写差异化 visualState 覆写
- D-X-coverage：核对每节点 styles 是否完整 + token 引用率
- D-X-tree-redlines：核对叶子节点是否有 textContent / src / materialSpec
```
