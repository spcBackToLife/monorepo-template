# 常见问题排查指南

## 问题 1: export_and_apply 后样式混乱

**现象**: 导出应用后节点样式"乱七八糟"，背景色、边框等显示异常

**原因**: 
- applyMaterialDesign 是**追加模式**不是替换模式
- 原有样式（如 backgroundColor）与新样式冲突

**解决**:
```javascript
// Step 1: 先 reset 全部 background 相关属性
style / reset → {
  nodeId: "<target-node-id>",
  properties: [
    "background", "backgroundImage", "backgroundSize", 
    "backgroundPosition", "backgroundRepeat", 
    "backgroundOrigin", "backgroundClip", "boxShadow"
  ]
}

// Step 2: 再设置新样式
style / update → {
  nodeId: "<target-node-id>",
  styles: {
    backgroundColor: "#1a1a22",
    backgroundImage: "url(新PNG)",
    backgroundSize: "contain"
  }
}

// Step 3: 清空 children 和 textContent
component_prop / update_props → {
  nodeId: "<target-node-id>",
  props: { children: "", textContent: "" }
}
```

---

## 问题 2: 事件不触发

**现象**: 点击按钮、输入框等没有反应

**原因**: 
- trigger 与元素类型不匹配
- 事件未正确绑定到元素

**解决**:
```javascript
// ✅ 正确匹配
trigger = "click" → type = "button" 或 "div"（有 cursor:pointer）
trigger = "change" → type = "input" / "textarea" / "select"
trigger = "submit" → type = "button"
trigger = "input" → type = "input" / "textarea"

// ❌ 错误匹配
trigger = "click" → type = "input"（不会触发）
trigger = "change" → type = "div"（不会触发）
```

---

## 问题 3: 视觉状态不激活

**现象**: hover、active 等状态不生效

**原因**: 
- activeWhen 表达式错误
- state 未初始化或值不正确
- 多个状态的 activeWhen 同时为 true

**解决**:
1. 检查 activeWhen 表达式语法（使用 `{{ }}` 包裹）
2. 确保 state 有默认值
3. 检查是否有多个状态的 activeWhen 同时为 true（取 states 数组中的第一个匹配）

```javascript
// ✅ 正确的 activeWhen
activeWhen: "{{ state.view.loginMode === 'code' }}"

// ❌ 错误的 activeWhen（缺少 {{ }}）
activeWhen: "state.view.loginMode === 'code'"
```

---

## 问题 4: 列表 repeat 不生效

**现象**: 列表数据已配置，但页面不显示列表项

**原因**: 
- expression 路径错误
- template 为空或不完整
- 数据源未正确初始化

**解决**:
1. 检查 expression 路径（如 `state.data.messages`）
2. 确保 template 是完整的 ComponentNode
3. 检查数据源是否已正确配置

```javascript
// ✅ 正确的 expression
expression: "{{ state.data.messages }}"

// ❌ 错误的 expression（缺少 data 层级）
expression: "{{ state.messages }}"
```

---

## 问题 5: 条件显示不生效

**现象**: 设置了 visibleWhen，但元素始终显示或隐藏

**原因**: 
- visibleWhen 表达式错误
- state 未初始化
- 表达式使用了错误的变量名

**解决**:
1. 检查表达式语法（使用 `{{ }}` 包裹）
2. 确保 state 有默认值
3. 在列表 template 中使用 `item.xxx` 而非 `state.xxx`

```javascript
// ✅ 正确的 visibleWhen（state 条件）
visibleWhen: "{{ state.view.showModal }}"

// ✅ 正确的 visibleWhen（列表 item 条件）
visibleWhen: "{{ item.role === 'admin' }}"

// ❌ 错误的 visibleWhen（缺少 {{ }}）
visibleWhen: "state.view.showModal"
```

---

## 问题 6: 表单输入不绑定

**现象**: 输入框输入后，state 没有更新

**原因**: 
- 元素类型不是 input/textarea/select
- bind 路径错误
- 未调用 set_bind

**解决**:
1. 确保元素类型是 input/textarea/select
2. 检查 bind 路径（如 `view.form.phone`）
3. 确保已调用 set_bind

```javascript
// ✅ 正确的绑定
element / add → {
  type: "input",
  // ...
}
element / set_bind → {
  nodeId: "<input-id>",
  path: "view.form.phone"
}

// ❌ 错误的绑定（类型不对）
element / add → {
  type: "div",  // div 不支持 bind
  // ...
}
```

---

## 问题 7: API 请求不触发

**现象**: 页面进入后，API 数据没有加载

**原因**: 
- autoFetchOnEnter 未设置
- 数据源 ID 错误
- Mock 场景未激活

**解决**:
1. 设置 autoFetchOnEnter: true
2. 检查数据源 ID 是否正确
3. 检查 activeScenarioId 是否正确

```javascript
// ✅ 正确的配置
data_source / add → {
  type: "api",
  autoFetchOnEnter: true,
  // ...
}

// ❌ 错误的配置（缺少 autoFetchOnEnter）
data_source / add → {
  type: "api",
  // autoFetchOnEnter 默认为 false
}
```

---

## 问题 8: 主题变量不生效

**现象**: 使用了 $token: 变量，但样式显示异常

**原因**: 
- theme 未配置
- token 路径错误
- 在复合表达式中使用 token

**解决**:
1. 先调用 theme/check 检查
2. 检查 token 路径是否正确
3. 不要在复合表达式中使用 token

```javascript
// ✅ 正确的使用
{ color: "$token:colors.primary" }

// ❌ 错误的使用（复合表达式）
{ paddingTop: "calc(10px + $token:spacing.sm)" }
```

---

## 问题 9: 弹窗/抽屉不显示

**现象**: 点击打开弹窗，但弹窗没有显示

**原因**: 
- overlayId 错误
- showOverlay/hideOverlay 未正确调用
- 未配置 showWhen 或条件不满足

**解决**:
1. 检查 overlayId 是否正确
2. 检查事件是否正确绑定
3. 检查 showWhen 条件是否满足

```javascript
// ✅ 正确的配置
{
  id: "loginModal",
  type: "modal",
  showWhen: "{{ state.view.showLoginModal }}"
}

// 触发显示
event / add_event → {
  trigger: "click",
  actions: [
    { type: "state.set", path: "view.showLoginModal", value: true }
  ]
}
```

---

## 问题 10: 素材绘制坐标偏移

**现象**: 素材绘制后位置不对，或导出后显示异常

**原因**: 
- 使用了局部坐标而非画布绝对坐标
- 未先调用 get_canvas_info
- 参考框尺寸与节点尺寸不一致

**解决**:
1. 先调用 get_canvas_info 获取 referenceFrameX/Y
2. 计算画布绝对坐标：`targetX = referenceFrameX + localX`
3. 确保参考框尺寸与节点尺寸一致

```javascript
// ✅ 正确的坐标计算
canvas / get_canvas_info → { projectId, materialId }
// 返回: referenceFrameX=276, referenceFrameY=176
// 目标局部坐标: localX=0, localY=0
// 画布绝对坐标: x=276+0=276, y=176+0=176

canvas / add_object → {
  x: 276,  // 画布绝对坐标
  y: 176,
  // ...
}

// ❌ 错误的坐标（使用局部坐标）
canvas / add_object → {
  x: 0,  // 这会飞到左上角！
  y: 0,
  // ...
}
```

---

## 通用排查步骤

1. **检查元素类型**：确保 type 与 trigger 匹配
2. **检查表达式**：确保使用 `{{ }}` 包裹，变量路径正确
3. **检查 state**：确保有默认值，路径正确
4. **检查数据源**：确保 ID 正确，autoFetchOnEnter 设置正确
5. **检查主题**：确保 theme 已配置，token 路径正确
6. **检查事件**：确保 trigger 与元素类型匹配，actions 正确
7. **检查视觉状态**：确保 activeWhen 表达式正确，state 已设置
8. **检查素材**：确保坐标正确，先 reset 再 update
