# export_and_apply 桥梁层详解

## applyMaterialDesign 写入的 9 个属性

当 `export_and_apply` 内部调用 `applyMaterialDesign` 时，会向目标节点写入以下样式：

```
1. backgroundImage: url("导出的PNG路径")
2. backgroundSize: contain
3. backgroundPosition: center center
4. backgroundRepeat: no-repeat
5. backgroundOrigin: border-box
6. backgroundClip: border-box
7. border: none
8. boxSizing: border-box
9. borderWidth: 0
```

**关键问题**: border/borderWidth 被强制设为 none/0 → 容器的边框装饰会丢失！

## 追加模式（非替换）

applyMaterialDesign 对 `backgroundImage` 是**追加**而非替换：

```
节点已有: backgroundImage: "linear-gradient(135deg, #667eea, #764ba2)"
应用后:   backgroundImage: "url(new.png), linear-gradient(135deg, #667eea, #764ba2)"
                           ↑ 追加到前面，逗号分隔
```

这导致 CSS 多值叠加，渲染结果不可预测。

## CSS background 属性原子性

- `background` 简写会重置**所有** `background-*` 子属性
- `backgroundImage` 是独立长形式属性
- 两者同时存在时行为不可预测
- **唯一安全做法：先 reset 全部再设新值**

## 完整清理流程（Step 7）

### 7a. 重置所有背景属性

```
style / reset
  nodeId: 目标节点
  properties: [
    "background",
    "backgroundImage",
    "backgroundSize",
    "backgroundPosition",
    "backgroundRepeat",
    "backgroundOrigin",
    "backgroundClip",
    "boxShadow"
  ]
```

### 7b. 设置干净的单值

```
style / update
  nodeId: 目标节点
  styles: {
    backgroundImage: "url(/uploads/materials/.../xxx.png)",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  }
```

### 7c. 清除文字残留

```
component_prop / update_props
  nodeId: 目标节点
  props: { textContent: "", children: "" }
```

**必须同时清两个！** textContent 和 children 独立存储。

## 何时需要 Step 7

| 场景 | 需要完整 Step 7? | 原因 |
|------|:---------------:|------|
| 节点之前有 background/gradient 样式 | ✅ 必须 | 追加模式会叠加 |
| 节点是新建的纯净 div（无旧样式） | ❌ 不需要 | 无旧值可追加 |
| 节点有 emoji/文字内容 | ✅ 7c 必须 | 文字会覆盖在图标上 |
| 重复 export_and_apply 同一节点 | ✅ 必须 | 每次都追加 |

## 踩坑案例

### 案例 #2: Hero 区域"乱七八糟的背景" (2026-04-24)

**现象**: 
- 刷新后出现多层背景叠加
- emoji 文字覆盖在图标上
**根因**:
1. `background`(简写) + `backgroundImage`(长形式) 同时存在
2. applyMaterialDesign 追加 → `url(PNG), linear-gradient(old)`
3. 只清了 textContent 没清 children → emoji 残留
**修复**: 完整执行 Step 7a → 7b → 7c

### 案例 #5: 铃铛图标模糊 + 容器装饰丢失 (2026-05-26)

**现象**: NotifyBtn 变成一张模糊拉伸的图片，圆形边框和毛玻璃效果消失
**根因**: 直接 export_and_apply 到容器节点（有 border + backdrop-filter）
  → I-10 写入 border:none 覆盖了原有边框
  → 图标 PNG 被 contain 拉伸到 34×34 容器
**修复**: 在容器内创建 IconDiv 子节点，应用到子节点

## 节点职责判定速查

检查节点是否有以下任何样式：
- `border` / `borderWidth`
- `backdropFilter`
- `backgroundColor`（非 transparent）
- `boxShadow`
- `borderRadius`（配合上述任一属性）

**有 → 容器节点 → 不可直接应用 → 创建子 IconDiv**
**无 → 内容节点 → 可直接应用**
