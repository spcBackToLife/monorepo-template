# schema-spec：素材应用字段精确清单

> 适用任务：`E-X-mat-*`、`E-X-svg-*`、`E-global-mat-*`

## 1. 素材应用 schema 字段（A 类一等字段）

### div / 容器节点（用 backgroundImage）

```jsonc
node.styles.backgroundImage:    "url('https://cdn.example.com/materials/abc-123.png')"
node.styles.backgroundSize:     "contain"      // design 已写则保留；漏写则补默认值
node.styles.backgroundPosition: "center"
node.styles.backgroundRepeat:   "no-repeat"

node.materialProjectId:         "mat_xyz"      // canvas 工程 ID（material-painter 自动写入）
```

### img 节点（用 props.src）

```jsonc
node.props.src:                 "https://cdn.example.com/materials/abc-123.png"
node.props.alt:                 "<accessibility 描述，从 design summary 派生>"

node.materialProjectId:         "mat_xyz"
```

### svg 节点（内联 SVG）

```jsonc
node.props.svgContent:          "<svg ...><path d='...' fill='...' .../></svg>"
// 或某些节点用 children 数组承载 svg 元素（按节点实现）
```

## 2. backgroundSize / backgroundPosition / backgroundRepeat 默认值

如 design 阶段已写 → executor 保留不动。
如 design 漏写 → executor 补默认值，并在 notes 记录：

```jsonc
node.meta.status.notes = "executor 补默认 backgroundSize:contain / position:center / repeat:no-repeat（design 漏写）"
```

| 场景 | 默认值 |
|------|-------|
| 装饰素材（透明 PNG） | size:contain, position:center, repeat:no-repeat |
| 全屏背景图 | size:cover, position:center, repeat:no-repeat |
| 重复纹理（如噪点）| size:auto, position:0 0, repeat:repeat |

**红线**：若 design 阶段写了一组值（如 size:cover）→ executor **不允许擅自改**，按 design 给的执行。

## 3. materialProjectId 绑定

```jsonc
node.materialProjectId: "mat_xyz"
```

由 material-painter 通过 `canvas/export_and_apply` **自动写入**——executor 不直接调 `meta/set_node` 写。

material-painter 内部完成：
1. canvas/create 创建素材工程
2. 按 layers 绘制
3. 上传 PNG 到 CDN
4. 自动写入 node.styles.backgroundImage 或 props.src
5. 自动写入 node.materialProjectId
6. 自动建立 node_material_slots 槽位（编辑器可识别 / 可替换）

executor 只需调度 material-painter，不直接写 schema 这些字段。

## 4. SVG 内联（按需，executor 写）

```jsonc
// 翻译 layers 为 SVG
const svgString = `
  <svg width="${rf.width}" height="${rf.height}" viewBox="0 0 ${rf.width} ${rf.height}" fill="none">
    ${layers.map(layer => layerToSvgElement(layer, resolvedColors)).join('\n')}
  </svg>
`;

// 写入节点
component_prop/update_props {
  projectId, nodeId,
  props: { svgContent: svgString }
}
```

**注意**：SVG 字符串中的 fill / stroke 必须**已解析为真实色值**——不能保留 `$token:` 引用（因为 SVG 是静态字符串，不参与表达式求值）。

```jsonc
// ❌ 错
fill="$token:colors.primary"

// ✅ 对（theme/get 后解析）
fill="#FF6F91"
```

## 5. 完整素材应用流程示例

### 场景 A：BrandLogo PNG

```
1. query/screen_schema → 拿当前 BrandLogo 节点 schema
2. theme/get → 解析 colorStrategy 中的 token
3. Skill("material-painter") + 上下文：
   {
     projectId, screenId, nodeId: "n2-BrandLogo",
     materialSpec: { 完整规格，已解析 token },
     applyMode: "export_and_apply"
   }
4. material-painter 内部：
   - canvas/create
   - 绘制 layers
   - canvas/export_and_apply → 自动写入：
     · node.styles.backgroundImage = "https://cdn.../mat-xyz.png"
     · node.materialProjectId = "mat_xyz"
     · node_material_slots 槽位建立
5. 截图核对（按 qualityChecklist）
6. 通过 → md 记录 + 标 done
```

### 场景 B：OrnamentSeparator SVG

```
1. query/screen_schema → 拿当前节点
2. theme/get → 解析 colorStrategy
3. 翻译 materialSpec.layers 为 SVG 字符串：
   <svg width="60" height="12" viewBox="0 0 60 12" fill="none">
     <circle cx="30" cy="6" r="2" fill="#FF6F91"/>
     <path d="M0 6 Q15 2 30 6" stroke="#FF6F91" stroke-width="1" stroke-linecap="round" fill="none"/>
     <path d="M30 6 Q45 10 60 6" stroke="#FF6F91" stroke-width="1" stroke-linecap="round" fill="none"/>
   </svg>
4. component_prop/update_props { props: { svgContent: <上面的字符串> } }
5. 截图核对
6. md 记录 + 标 done
```

### 场景 C：PinkCircleDeco（CSS-gradient，跳过）

```
1. design 阶段已写 styles.background = "radial-gradient(...)"
2. executor 任务标 status: skipped
   notes: "renderHint=css-gradient，design 阶段 styles.background 已表达全部"
3. 仅在 E-X-snapshot 任务中验证实际渲染效果
```

## 6. MCP 调用清单

| 字段 | MCP 工具 | 谁写 |
|------|---------|------|
| node.styles.backgroundImage | canvas/export_and_apply（自动）| material-painter |
| node.styles.backgroundSize/Position/Repeat（补默认）| style/update | executor（仅当 design 漏写）|
| node.props.src | canvas/export_and_apply（自动）| material-painter |
| node.materialProjectId | canvas/export_and_apply（自动）| material-painter |
| node.props.svgContent | component_prop/update_props | executor |

## 7. expectedArtifacts 验收

每个 mat-* 任务在 update_plan_task done 时声明：

```jsonc
// PNG 素材任务
{ kind: 'nonEmpty', path: 'rootNode...<nodeId>...materialProjectId' }
// 或更直接
{ kind: 'nonEmpty', path: 'rootNode...<nodeId>...styles.backgroundImage' }

// SVG 素材任务
{ kind: 'nonEmpty', path: 'rootNode...<nodeId>...props.svgContent' }
```

由于路径需要按节点 ID 精确指定，建议在 `update_plan_task done` 时把 expectedArtifacts 一并传入 patch（service 端取 patch.expectedArtifacts 优先）。

## 8. 红线

- ❌ executor 直接写 styles.backgroundImage（应该走 material-painter 自动写）
- ❌ executor 写 materialProjectId（material-painter 自动写）
- ❌ SVG 字符串保留 `$token:` 未解析
- ❌ 改 design 已写的 backgroundSize/Position/Repeat（除补默认值外）
- ❌ 在素材应用时"顺便"改非素材 styles（color / padding 等）→ 越权
- ❌ 应用 PNG 后没在 material-painter 内部建立槽位 → 编辑器无法识别 / 替换
