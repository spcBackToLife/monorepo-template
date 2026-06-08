# 场景：素材绘制

## 何时使用

需要绘制图标、装饰性背景、品牌素材、插画等视觉资产。

## 核心概念

- **`material-painter` 技能**：使用 MCP canvas 工具绘制矢量图形
- **`export_and_apply`**：导出为 PNG 并应用到设计节点
- **素材槽位**：必须在 `node_material_slots` 上建立绑定

## 操作步骤

### 步骤 1：创建素材工程

```javascript
canvas / material_project / create → {
  projectId: "xxx",
  name: "LoginIcon"
}
```

### 步骤 2：获取画布信息

```javascript
canvas / get_canvas_info → {
  projectId: "xxx",
  materialId: "<material-id>"
}
```

### 步骤 3：绘制图形（使用画布绝对坐标）

```javascript
// 计算坐标：targetX = referenceFrameX + localX
canvas / add_object → {
  projectId: "xxx",
  materialId: "<material-id>",
  type: "rect",
  x: 276,  // 画布绝对坐标
  y: 176,
  width: 100,
  height: 100,
  fill: "$token:colors.primary"
}
```

### 步骤 4：导出并应用

```javascript
canvas / export_and_apply → {
  projectId: "xxx",
  materialId: "<material-id>",
  nodeId: "<target-node-id>"
}
```

## 关键规则

### 坐标系

- `add_object` / `update_object` 的 x/y 是**画布绝对坐标**
- 必须先调用 `get_canvas_info` 获取 `referenceFrameX/Y`
- 计算目标位置：`targetX = referenceFrameX + localX`

### export_and_apply 坑点

1. **不能直接应用到装饰容器**：会覆盖容器的 border/backdropFilter/backgroundColor/borderRadius
   - **正确做法**：在容器内创建一个纯净的 icon 子 div（只有 width/height），对子 div 执行 export_and_apply

2. **必须先 reset 再 update**：applyMaterialDesign 是追加模式不是替换模式
   ```javascript
   // 必须先 reset
   style / reset → {
     nodeId: "<target-node-id>",
     properties: ["background", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat", "backgroundOrigin", "backgroundClip", "boxShadow"]
   }
   // 再 update
   style / update → {
     nodeId: "<target-node-id>",
     styles: {
       backgroundColor: "#1a1a22",
       backgroundImage: "url(新PNG)",
       backgroundSize: "contain"
     }
   }
   ```

3. **children 和 textContent 是两个独立属性**
   ```javascript
   component_prop / update_props → {
     nodeId: "<target-node-id>",
     props: { children: "", textContent: "" }
   }
   ```

## 常见问题

### 问题 1：素材不显示

**原因**：
- 坐标错误
- 未正确应用

**解决**：
1. 检查坐标是否为画布绝对坐标
2. 确保 export_and_apply 成功执行

### 问题 2：样式被覆盖

**原因**：
- applyMaterialDesign 追加模式
- 未先 reset

**解决**：
1. 先 reset 相关样式属性
2. 再 update 新样式

## 示例代码

完整示例见 `references/examples/login-page.md`（素材绘制部分）。
