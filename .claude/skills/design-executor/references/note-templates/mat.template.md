# 模板：E-X-mat-\<node\>（PNG 素材绘制）★

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/<screenId>/mat-<nodeName>.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-mat-<nodeName>
> 对应 schema 字段：node.styles.backgroundImage / props.src + node.materialProjectId

## 1. 节点 materialSpec 摘要

```jsonc
nodeId: "<n2-BrandLogo>"
materialSpec:
  kind: "brand"
  renderHint: "png"
  referenceFrame: { width: 64, height: 64 }
  background: "transparent"
  styleAnalysis: { simpleToRich: "简洁偏中", geometricToOrganic: "有机为主", flatTo3D: "平面", orderlyToCasual: "略随意 playful" }
  colorStrategy:
    primary:   { value: "$token:colors.primary",   role: "主体气泡" }
    secondary: { value: "$token:colors.secondary", role: "右上装饰点" }
    neutral:   { value: "#FFFFFF",                  role: "内部白色弧线" }
  lineStyle: { width: "2.5-3px", cap: "round", join: "round" }
  composition: "粉色地图气泡（底部尖角圆润，居中，40×48px）+ 内部两段白色相连弧（120°，20×16px，居中偏上）+ 右上角薄荷绿小实心圆点（8px）"
  layers: [...]
  qualityChecklist: [...]
```

## 2. token 解析

```jsonc
theme/get { projectId } → ThemeConfig
解析 colorStrategy 中的 token 引用为真实色值：

| token 引用 | 解析后色值 |
|-----------|-----------|
| $token:colors.primary | #FF6F91 |
| $token:colors.secondary | #4ECDC4 |
| #FFFFFF | #FFFFFF（已是色值）|
```

## 3. material-painter 调用

```jsonc
Skill("material-painter")
上下文（传给子技能的信息）：
- projectId: <projectId>
- screenId: <screenId>
- nodeId: "n2"
- materialSpec: <上面的完整规格，token 已解析>
- referenceFrame: { width: 64, height: 64 }
- background: "transparent"
- 应用方式: export_and_apply
```

material-painter 内部完成：
1. canvas/create 创建素材工程 mat_xyz
2. 按 layers 自上而下绘制
3. canvas/export_and_apply：
   - PNG 上传到 CDN
   - node.styles.backgroundImage 写入 URL
   - node.materialProjectId 绑定 mat_xyz
   - node_material_slots 槽位建立

## 4. canvas 操作清单（material-painter 内部）

```
执行的 canvas action 简短列表：
1. canvas/add_object { type: "ellipse", ... } - 主体气泡
2. canvas/add_object { type: "path", pathData: "...", stroke: "#FFFFFF 3px round" } - 内部弧线 1
3. canvas/add_object { type: "path", pathData: "...", stroke: "#FFFFFF 3px round" } - 内部弧线 2
4. canvas/add_object { type: "ellipse", fill: "#4ECDC4", ... } - 右上装饰点
5. canvas/export_and_apply { ... }
```

（详细 canvas 操作由 material-painter 主导，这里仅记录概要）

## 5. qualityChecklist 核对

| 条目 | 通过？ | 备注 |
|------|:------:|------|
| 64×64 参考框内居中 | ✅ | 像素测量 |
| 气泡造型清晰可辨 | ✅ | 截图能识别 |
| 内部连接符号该尺寸下可读 | ✅ | 不糊不丢失 |
| 透明通道正确（背景全透明）| ✅ | alpha 通道检查 |
| 色彩与 token 一致（误差 < 5%）| ✅ | 对照 #FF6F91 / #4ECDC4 |
| 线条圆头圆角 | ✅ | round cap/join |

## 6. 重画历史（如有）

| 版本 | 问题 | 调整 | 通过？ |
|------|------|------|:------:|
| v1 | 粉色饱和度偏淡 5% | 加深主色饱和度 | ✅ |

如重画 ≥ 3 次仍不通过 → 退回 design-planner（materialSpec 可能有问题）

## 7. ★ 沉淀到 schema 的结论

由 material-painter 通过 canvas/export_and_apply 自动写入：

```jsonc
node.styles.backgroundImage = "url('https://cdn.example.com/materials/mat-xyz.png')"
node.styles.backgroundSize = "contain"
node.styles.backgroundPosition = "center"
node.styles.backgroundRepeat = "no-repeat"
node.materialProjectId = "mat_xyz"
node_material_slots: [{ nodeId: "n2", slotId: "default", materialProjectId: "mat_xyz", cssTarget: "backgroundImage", isActive: true }]
```

⚠️ **expectedArtifacts 验收**（update_plan_task done 时传入）：
```jsonc
{ kind: 'nonEmpty', path: 'rootNode...<n2>...materialProjectId' }
```

## 8. 后续约束

- E-X-snapshot 任务会再次截图核对实际渲染效果
- E-X-verified 任务标节点 phase=verified
```
