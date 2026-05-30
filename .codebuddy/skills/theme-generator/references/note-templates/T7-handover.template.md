> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：T7-handover
> 对应 schema 字段：（无新写入，仅 theme/get 自检 + 标 plan done）

# T7：自检 + 移交 — <项目名>

## 1. 出场门禁全检（强制）

| # | 红线 | 检查方式 | 结果 |
|:-:|------|---------|:----:|
| 1 | R-THEME-01：customized = true | theme/get 看 customized 字段 | ✓/✗ |
| 2 | R-THEME-02：必备语义色齐 | tokens.colors 列出 13 项必备名 | ✓/✗ |
| 3 | R-THEME-03：APCA 全部达标 | T2/T6 实测表回顾 | ✓/✗ |
| 4 | R-THEME-04：spacing 严格 8 网格 | tokens.spacing 列出值检查 | ✓/✗ |
| 5 | R-THEME-05：fontSize 严格 modular scale | T3 偏离表回顾 | ✓/✗ |
| 6 | R-THEME-06：themes ≥ 2 套 | tokens.themes.length | ✓/✗ |
| 7 | R-THEME-07：decorationRules / iconSpec / stateSpec 全非空 | 三处字段非空对象 | ✓/✗ |

## 2. 任务 plan 完成度

| 任务 | md 路径 | schema 落库 |
|------|--------|----------|
| T1-intent | analysis-notes/<projectId>/theme/T1-intent.md | theme/set_intent ✓ |
| T2-colors | T2-colors.md | theme/update_tokens (colors) ✓ |
| T3-typo-spacing | T3-typo-spacing.md | theme/update_tokens (rest) ✓ |
| T4-decoration | T4-decoration.md | theme/set_decoration ✓ |
| T5-icon-state | T5-icon-state.md | theme/update (iconSpec+stateSpec) ✓ |
| T6-variants | T6-variants.md | theme/update (themes[]) ✓ |
| T7-handover | T7-handover.md | （仅自检）|

## 3. 配色板可视化（参考）

```
亮色变体：
  bgPage     ████ #FFFFFF
  bgCard     ████ #F8F9FB
  primary    ████ #FF6F91   secondary  ████ #6FFFAA
  textP      ████ rgba(0,0,0,.88)

暗色变体：
  bgPage     ████ #1A0F12
  bgCard     ████ #21181B
  primary    ████ #FF8FA8   secondary  ████ #6FFFAA
  textP      ████ #F7F7F7
```

## 4. 已知问题与待办

[列出本阶段做出的妥协 / 留给下游优化的点]

- [ ] 例：dark 变体的 secondary 暂保持 base 值，待 design-planner 实测时若发现暗底反差不够再调
- [ ] 例：未生成 high-contrast 变体（用户未明确要求，可后续追加）

## 5. 移交说明（给 interaction-designer）

[简短列出 theme 阶段的关键决策，让下游知道"哪些是 token 已定的、不能再改的"]

- 主色为草莓粉 #FF6F91 / 暗模式提亮至 #FF8FA8——下游写主按钮一律 `$token:primary`
- 圆角风格 pill——下游所有圆角必须从 radii.{none,sm,md,lg,xl,full} 取，不能写裸数字
- iconSpec.style = duotone——design-executor 画图标时统一双色调
- stateSpec.hover.scale = 1.05——下游写 visualState 时 hover 用此缩放比例

---

## ★ 沉淀到 schema 的结论

```
（本任务无新写入。仅 theme/get 自检 + meta/update_plan_task 标 T7-handover done）

通知用户：
"主题阶段完成。intent/tokens/decorationRules/iconSpec/stateSpec/themes 全部落库；
 customized=true，所有 R-THEME-* 红线 0 错误。
 接下来可以触发 interaction-designer 进入交互阶段。"
```
