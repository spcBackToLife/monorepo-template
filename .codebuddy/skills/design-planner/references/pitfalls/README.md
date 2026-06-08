# design-planner pitfalls/

避坑清单——告诉 AI **哪里会翻车**。methodology 告诉怎么想；pitfalls 告诉哪里别想错。

## 文件清单

| 文件 | 内容 | 何时必须加载 |
|------|------|-------------|
| `web-rendering.md` ★★ | native HTML 控件清单（checkbox/radio/select/file/range 等）+ 不可设计属性清单 + workaround 模式：<br>· wrapper-label：自定义 checkbox/radio 用 `<label>` 包 input + 视觉标识<br>· combobox：自定义下拉用 input + 弹层<br>· label-button：用 button 替代受限 input | `D-X-budget` 扫到 native 控件；`D-X-styles` / `D-X-craft-form` 涉及 native input |
| `composite-patterns.md` ★★ | 业务复合控件 10 类（tab/segment/stepper/accordion/pagination/switch 等）必备视觉态清单 + 节点结构 + activeWhen 表达式 | `D-X-budget` 扫到复合控件；`D-X-states` / `D-X-craft-*` 涉及复合控件 |

## 核心信念

Web 不是设计稿。Form 控件、复合 UI 模式有大量"能这么写但渲染不出来"的陷阱。本目录把这些**可机械识别的陷阱**沉淀为清单，让 AI **写之前查表**而非写完才发现。

## 加载策略

- 入场扫一遍 schema → 看到 `<input type="checkbox">` 等 native 控件 → 立刻加载 `web-rendering.md`
- 看到 tab/segment/stepper 等复合控件 → 立刻加载 `composite-patterns.md`
- 不确定"这个控件能不能这么设计" → 先来这里查表
