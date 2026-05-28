# Canvas 服务端渲染详解

## 渲染能力边界

| 对象类型 | 服务端渲染支持 | 关键字段 | 备注 |
|---------|:------------:|---------|------|
| rect | ✅ | width, height, rx, ry, fill, stroke | 含圆角 |
| ellipse | ✅ | width, height, fill, stroke | |
| path | ✅ | **pathData**（不是 path 字段！） | 见下方坐标系说明 |
| line | ✅ | x1, y1, x2, y2 | |
| polygon | ✅ | sides | |
| star | ✅ | points, innerRatio | |
| textbox | ⚠️ 不稳定 | text, fontSize, fontFamily | 依赖系统字体 |
| image | ✅ | src (URL) | 需可访问 |
| group | ❌ 不展开 | — | 导出为空！永远不用 |
| profiledStroke | ✅ | 专用参数 | 见 MCP 工具描述 |

## path 对象的坐标系（关键！）

### pathData 支持的 SVG 命令

服务端 cairo 渲染器只支持以下 path 命令：

| 命令 | 支持 | 说明 |
|------|:----:|------|
| M/m (moveTo) | ✅ | |
| L/l (lineTo) | ✅ | |
| H/h (水平线) | ✅ | |
| V/v (垂直线) | ✅ | |
| C/c (三次贝塞尔) | ✅ | |
| Z/z (闭合) | ✅ | |
| A/a (弧线) | ✅ | |
| Q/q (二次贝塞尔) | ❌ 不渲染！ | 导出为空白 |
| S/s (平滑三次) | ⚠️ 未验证 | 建议转为 C |
| T/t (平滑二次) | ❌ | 基于 Q，同样不支持 |

**格式要求**：
- 命令与坐标之间用**空格**分隔：`M 3 10.5 L 12 3`
- 不要用紧凑写法：~~`M3 10.5L12 3`~~（可能不被正确解析）

**参考成功案例格式**：
```
"M 3 10.5 L 12 3 L 21 10.5 M 5.5 9.5 L 5.5 19.5 C 5.5 20.05 5.95 20.5 6.5 20.5 ..."
```

### 规则

path 对象有两套坐标：

1. **对象位置** (x, y) — 画布绝对坐标，决定对象左上角在画布中的位置
2. **pathData 内部坐标** — 相对于对象自身的 viewBox(0, 0, width, height)

```
示例：在参考框内绘制一个 18×18 的书本图标
- rfx=291, rfy=191 (get_canvas_info 返回)
- 对象: x=291, y=191, width=18, height=18
- pathData: "M2 3 L2 15 L9 15 L9 3 Z M9 3 L16 3 L16 15 L9 15"
  → pathData 中的坐标范围是 0~18（对象的 width/height 范围内）
  → 不需要加 rfx/rfy 偏移！
```

### 验证方法

- 导出后 PNG > 200B → 有内容
- 导出后 PNG < 150B → 空白，检查：
  1. pathData 坐标是否超出 0~width/0~height 范围
  2. 画布背景是否 transparent
  3. default 框是否已隐藏
  4. stroke 颜色是否与背景同色

### 常见错误

| 错误 | 表现 | 修复 |
|------|------|------|
| pathData 用了画布绝对坐标 | PNG 空白（点在 viewBox 外） | pathData 坐标应在 0~width 范围 |
| pathData 用了 `path` 字段而非 `pathData` | 服务端不读取 | 改用 pathData |
| 描边色与背景同色 | PNG 看似空白 | 检查 stroke vs backgroundColor |
| 未设 transparent 背景 | 白底覆盖描边 | set_background_color("transparent") |

## 画布坐标系总结

```
画布绝对坐标系:
  (0,0) ─────────────────── (canvasWidth, 0)
    │                              │
    │   (rfx, rfy) ┐               │
    │              │ refW × refH    │    ← 参考框（导出裁剪区域）
    │              └───────┘        │
    │                              │
  (0, canvasHeight) ────── (canvasWidth, canvasHeight)

add_object:
  x = rfx + localX  (localX 是在参考框内的水平偏移)
  y = rfy + localY

pathData 内部:
  坐标范围 (0,0) ~ (width, height)
  对象的 x/y 把这个 viewBox 放到画布上
```

## 默认框处理

每个新建素材工程都有一个 default 框：
- ID 格式: `default_{materialId}`
- 尺寸: 与参考框相同
- 位置: 与参考框重合
- fill: #ffffff（白色）
- **必须隐藏**: `set_visibility(objectId, visible=false)`

## 踩坑案例

### 案例 #1: 图标飞到画布左上角 (2026-04-24)

**现象**: path 内容在编辑器中跑到参考框外面
**根因**: 跳过 get_canvas_info，不知道 rfx/rfy 的值就开始画
**修复**: 严格按 Step 3 获取坐标后再绘制

### 案例 #3: 编辑器预览偏移但 PNG 正确

**现象**: 素材编辑器中参考框虚线位置与绘制内容不重合
**结论**: 前端编辑器显示 bug，不影响实际导出
**验证**: 用 read_file 看 PNG 文件，或看文件大小（>200B = 有内容）

### 案例 #4: QuickGrid 图标全是白方块 (2026-05-26)

**现象**: 4个图标导出 103~137B，显示为白色方块
**根因链**:
1. 未设 `set_background_color("transparent")` → 白底
2. 描边 #f0f0f8 在白底上不可见 → 导出看似空白
3. 设透明后导出 103B → pathData 坐标可能有问题
4. rect 测试导出 509B → 渲染管线正常，问题在 path
**最终根因**: 需确认 pathData 坐标是否在 viewBox 范围内正确渲染

### 图层顺序

- add_object 调用顺序 = 图层堆叠顺序
- 先添加 = 底层，后添加 = 顶层
- 调整: `reorder_object`（参数是 newIndex 数字）
