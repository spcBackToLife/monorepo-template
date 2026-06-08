# 方法论 1：素材绘制管线（Asset Pipeline）

> 适用任务：`E-X-inventory`、`E-X-mat-*`、`E-X-svg-*`、`E-global-mat-*`、`E-global-inventory`

## 1. 素材清单识别（每屏 inventory 任务）

### 扫描方法

```
query/screen_schema { projectId, screenId } → 拿到完整节点树 + screen.overlays

遍历 rootNode 子树 + screen.overlays[*].rootNode 子树：
  对每个节点，检查 meta.design.materialSpec：
    - 不存在 / 为空 → 跳过（无素材需求）
    - 存在 → 按 materialSpec.renderHint 分类
```

### 分流规则（按 renderHint）

| renderHint | 处理方式 | 任务类型 |
|-----------|---------|---------|
| `png` | 调 material-painter 画 + 上传 + 应用到节点 | E-X-mat-\<node\> |
| `svg` | 内联 SVG（按 layers 翻译为 svg 字符串）| E-X-svg-\<node\> |
| `css-gradient` | design 已在 styles 写好，executor 跳过素材绘制 | 任务 status:skipped |
| `css-only` | 同上 | 任务 status:skipped |

**红线**：
- ❌ renderHint=png 但 design 没写 layers → 退回 design-planner
- ❌ renderHint=svg 但 layers > 5 段（路径太复杂）→ 改 png
- ❌ renderHint=css-gradient 但 styles.background 实际为空 → 退回 design-planner

### 输出（落到 inventory.md）

```markdown
本屏素材清单：

| 节点 | kind | renderHint | 任务 | 处理 |
|------|------|-----------|------|------|
| BrandLogo | brand | png | E-00-mat-BrandLogo | material-painter |
| MintLeafDeco | decoration | png | E-00-mat-MintLeafDeco | material-painter |
| PinkCircleDeco | decoration | css-gradient | E-00-mat-PinkCircleDeco | skipped（design styles 已表达）|
| OrnamentSeparator | decoration | svg | E-00-svg-OrnamentSep | 内联 SVG |
| SubmitIcon | icon | svg | E-00-svg-SubmitIcon | 内联 SVG |
```

## 2. PNG 素材任务（E-X-mat-\<node\>）

### 执行流程

```
1. query/screen_schema → 拿当前节点 schema
2. 读 node.meta.design.materialSpec 完整规格：
   - kind / referenceFrame / background
   - styleAnalysis（4 维度）
   - colorStrategy（必须 token 化）
   - lineStyle（描边类必填）
   - composition（构图描述）
   - layers（自上而下，给 material-painter 直接照画）
   - variants（如有）
   - qualityChecklist（验收标准）
3. theme/get → 解析 colorStrategy 中的 $token: 引用为真实色值
4. Skill("material-painter") + 上下文：
   - projectId / screenId / nodeId
   - 完整 materialSpec（带解析后的色值）
   - 节点尺寸（从 styles 读 width / height，与 referenceFrame 对照）
5. material-painter 内部完成：
   - canvas/create 创建素材工程
   - 按 layers 自上而下逐层画
   - canvas/export_and_apply：
     · PNG 上传
     · node.styles.backgroundImage 写入 URL
     · node.materialProjectId 绑定
     · node_material_slots 槽位建立
6. 截图节点核对（按 qualityChecklist 逐条勾）
7. 不通过 → 调整 canvas 重画 → 再核对
8. 通过 → 在 md「沉淀」段记录 materialProjectId + 应用结果
```

### qualityChecklist 核对方法

每条都要**可验证**——不是"看起来不错"：

```
✅ "64×64 参考框内居中" → 像素测量
✅ "气泡造型清晰可辨" → 截图能识别形状
✅ "内部连接符号该尺寸下可读" → 不糊不丢失细节
✅ "透明通道正确（背景全透明）" → 检查 alpha 通道
✅ "色彩与 token 一致（误差 < 5%）" → 对照解析后色值
✅ "线条圆头圆角" → 端点形状正确
```

任一条不通过 → material-painter 调整 canvas 重画。

### variants 处理

如 materialSpec 有 variants（如 dark / small / active）：
- **MVP 阶段**：只画 default variant（不画 variants）
- 用户验收后再决定是否需要补 variants
- 如果某 variant 在当前 colorScheme 必须用（如已切到 dark theme）→ 必须画该 variant

## 3. SVG 素材任务（E-X-svg-\<node\>）

### 何时用 SVG（替代 PNG）
- 路径短（layers ≤ 5 段）
- 单色 / 双色简单填充
- 矢量精度优先（如分割线 / 简单图标）

### 执行流程

```
1. 读 materialSpec.layers
2. 翻译为 SVG 字符串：
   <svg width="..." height="..." viewBox="0 0 W H" fill="none">
     <!-- 每个 layer 对应一个 <path> / <rect> / <circle> / <ellipse> -->
     <path d="..." fill="..." stroke="..." stroke-width="..." stroke-linecap="round" stroke-linejoin="round"/>
     ...
   </svg>
3. 写入 node.props.svgContent 或 node.props.children（按节点 type 决定）
4. 截图核对
```

**红线**：
- ❌ SVG 用 stroke-width 不与 lineStyle.width 一致
- ❌ SVG 颜色硬编码而 colorStrategy 用 token（必须解析 token 后写入）
- ❌ SVG layers > 5 段 → 退回 design-planner 改 renderHint=png

## 4. css-gradient / css-only 任务（skipped）

```
status: skipped
notes: "renderHint=css-gradient/css-only，design 阶段 styles.background 已表达全部，本任务无需绘制"
```

但**仍要在截图核对（E-X-snapshot）中验证**：实际渲染是否符合 materialSpec.composition 描述。

## 5. 槽位建立（material-painter 自动处理）

每个 PNG 素材应用后会自动建立槽位（node_material_slots）——让编辑器可识别 / 可替换：

```
node_material_slots:
  - nodeId: <节点 ID>
  - slotId: default | hover | decoration | <自定义>
  - materialProjectId: <canvas 工程 ID>
  - cssTarget: backgroundImage | src | <自定义>
  - isActive: true
```

executor **不直接操作槽位**——material-painter 内部已做。但要核对：
- 应用后 node.materialProjectId 已写入
- 应用后 node.styles.backgroundImage 或 props.src 已写入
- 槽位记录存在（编辑器右键"设计素材..."能打开）

## 6. variants 与 colorScheme

ThemeConfig 支持多 colorScheme（light / dark / high-contrast）。如项目当前激活 colorScheme 不是 default，且素材有对应 variant（如 dark variant）：

```
1. theme/get → 看 activeColorSchemeId
2. 如不是 light（默认）→ 选 materialSpec.variants 中匹配的 variant
3. material-painter 用该 variant 的 colorStrategy（覆盖 default）
```

## 7. 失败 / 重画路径

```
材料质量不通过 qualityChecklist：
  ↓
分析失败原因：
  ├── PNG 输出色值偏差大 → material-painter 调整
  ├── 形状不准 → material-painter 重画 layers
  ├── 透明通道有问题 → material-painter 设置 background:transparent
  └── 与 referenceFrame 比例不符 → 检查 design 写的尺寸是否合理
       ├── design 写错 → 退回 design-planner 修
       └── design 写对，画的不准 → material-painter 调整
  
重画 ≤ 3 次还不通过：
  ↓
退回 design-planner：可能 materialSpec 本身有问题
  （如 colorStrategy 中两个色对比度不够，画出来必然糊）
```

## 8. md 落地（mat 任务）

```markdown
## 1. 节点 materialSpec 摘要
[复述 kind / referenceFrame / colorStrategy / composition 关键信息]

## 2. token 解析
| token 引用 | 解析后色值 |
|-----------|-----------|
| $token:colors.primary | #FF6F91 |
| $token:colors.secondary | #4ECDC4 |

## 3. material-painter 调用
[Skill("material-painter") 调用 + 上下文]

## 4. canvas 操作清单
[material-painter 内部操作的简短列举]

## 5. qualityChecklist 核对
- [x] 64×64 参考框内居中
- [x] 气泡造型清晰可辨
- [ ] 色彩误差 → 重画一次后通过

## 6. 重画历史（如有）
- v1: 粉色饱和度偏淡 5% → v2 加深 → 通过

## 7. ★ 沉淀到 schema 的结论
node.styles.backgroundImage = "https://cdn.../mat-xyz.png"
node.materialProjectId = "mat_xyz"
expectedArtifacts: { kind: 'nonEmpty', path: 'rootNode...<nodeId>...materialProjectId' }
```

## 9. 红线

- ❌ 不读 materialSpec 直接调 material-painter（让它"猜"）
- ❌ 不解析 token（让 material-painter 拿到 `$token:colors.primary` 字符串）
- ❌ 跳过 qualityChecklist 核对就标 done
- ❌ 重画 > 3 次仍不通过却不退回 design-planner
- ❌ SVG layers > 5 段（应改 png）
- ❌ css-gradient 任务做 png 绘制（重复劳动）
- ❌ "顺便"改非素材 styles → 越权
