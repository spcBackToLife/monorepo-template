# 模板：D-X-meta（meta.design 叙事）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/meta.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-meta
> 对应 schema 字段：screen.meta.design + 每节点 meta.design

## 1. 屏级 meta.design

### summary（≤ 60 字）
"暖白底 + 顶部粉色渐变氛围 + 角落装饰 + 居中品牌 + 表单卡 + 药丸 CTA"

### palette（用到的 token 名）
```jsonc
palette: [
  "colors.primary",        // 草莓粉 - CTA / 品牌
  "colors.primaryLight",   // 浅粉 - 装饰光晕
  "colors.secondary",      // 薄荷绿 - 装饰点缀
  "colors.bgPage",         // 暖白底
  "colors.bgCard",         // 卡片底
  "colors.textPrimary",
  "colors.textSecondary",
  "colors.error"
]
```

### layers（已在 D-X-hierarchy 写，此处确认）
[沿用 D-X-hierarchy 的 layers 结构]

### componentBudgets（已在 D-X-budget 写，此处确认）
[沿用 D-X-budget 的 componentBudgets 结构]

## 2. 每节点 meta.design

### n9 - SubmitBtn

```jsonc
meta/set_node {
  projectId, nodeId: "n9",
  patch: {
    design: {
      summary: "主 CTA 按钮：药丸 / 草莓粉 / 白字 / spring hover 抬升 / 6 态完备",
      rationale: "登录页核心 CTA，视觉权重最高（budget weight=9）。圆角 full 呼应 organic 主题，spring 动效呼应 playful 情感。6 态完备保证清晰交互反馈。",
      visualSpec: { weight: "Heaviest", zIndex: 2, role: "主角-CTA" }
      // materialSpec 不填（按钮本身用 CSS 实现）
    }
  }
}
```

### n2 - BrandLogo

```jsonc
meta/set_node {
  projectId, nodeId: "n2",
  patch: {
    design: {
      summary: "品牌锚点 / 第一视觉焦点 / 粉色地图气泡 + 白连接弧 + 薄荷点",
      rationale: "登录页第一视觉接触点，需高识别度。地理符号呼应'校园社交'定位，气泡造型呼应 playful，60×60 在 360 宽设计稿上占视觉重量约 7（与 budget 一致）。",
      visualSpec: { weight: "Heavy", zIndex: 1, role: "主角-品牌" },
      materialSpec: { /* 见 D-X-materials */ }
    }
  }
}
```

### n4 - FormCard

```jsonc
meta/set_node {
  projectId, nodeId: "n4",
  patch: {
    design: {
      summary: "登录表单卡：暖白底 / 圆角 lg / 内部 md 间距 / 边框淡色",
      rationale: "配角-容器（budget weight=4）。圆角 lg 呼应 organic + playful。内部 md 间距让表单不拥挤。淡边框替代阴影，呼应预算削减后的克制视觉。",
      visualSpec: { weight: "Medium", zIndex: 2, role: "配角-容器" }
    }
  }
}
```

### n6 - PhoneInput

```jsonc
meta/set_node {
  projectId, nodeId: "n6",
  patch: {
    design: {
      summary: "手机号输入框：标准边框 / 焦点品牌色 + 光晕 / error 红边",
      rationale: "工具-输入（budget weight=2）。标准 atom 风格，仅在 visualState focus / error 时强化视觉。",
      visualSpec: { weight: "Light", zIndex: 2, role: "工具-输入" }
    }
  }
}
```

### n14 - PinkCircleDeco

```jsonc
meta/set_node {
  projectId, nodeId: "n14",
  patch: {
    design: {
      summary: "右上角粉色光晕：CSS radial-gradient / 12% 透明度 / 180×180 / blur 高度模糊",
      rationale: "对照视觉预算 weight=3 / 氛围-装饰 / 允许渐变。CSS 实现避免 PNG 资产开销。引导视线从 HeaderArea 流向 FormCard 顶部。",
      visualSpec: { weight: "Light", zIndex: 0, role: "氛围-装饰" },
      materialSpec: { /* 见 D-X-materials */ }
    }
  }
}
```

[继续每个重要节点...]

## 3. summary / rationale 撰写规范回顾

每节点 summary：
- ≤ 60 字
- 含核心视觉特征 + 主要手段
- 不能是空话（"漂亮"/"现代"）

每节点 rationale：
- ≥ 30 字
- 回答"为什么"
- 引用 budget weight + 主题 + 情感目标

## 4. ★ 沉淀到 schema 的结论

```jsonc
// 1. 屏级
meta/set_screen {
  projectId, screenId,
  patch: {
    design: {
      summary: "...",
      palette: [...],
      // layers / componentBudgets 已在前置任务写
    },
    status: { phase: "designed" }
  }
}

// 2. 每节点（清单）
[
  meta/set_node { nodeId: "n9", patch: { design: { summary, rationale, visualSpec } } },
  meta/set_node { nodeId: "n2", patch: { design: { summary, rationale, visualSpec, materialSpec } } },
  meta/set_node { nodeId: "n4", patch: { design: { summary, rationale, visualSpec } } },
  // ...
]
```

⚠️ **expectedArtifacts 验收**：
```jsonc
{ kind: 'nonEmpty', path: 'meta.design.summary' }
{ kind: 'nonEmpty', path: 'meta.design.palette' }
```

⚠️ **status.phase 推进**：
本任务完成后 screen.meta.status.phase 标 "designed"——但 D-X-coverage / D-X-integrity 仍要做完才算屏 design 完整。
```
