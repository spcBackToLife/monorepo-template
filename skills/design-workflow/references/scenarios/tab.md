# 场景：Tab 切换设计

## 何时使用

需要 Tab 切换、选项卡切换等场景。

## 核心概念

- **`visual_state`**：定义 Tab 的不同视觉状态（default/active）
- **`activeWhen`**：自动激活条件（如 `state.view.activeTab === 'code'`）
- **`state`**：存储当前激活的 Tab

## 操作步骤

### 步骤 1：创建 Tab 容器

```javascript
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<page-root>",
  type: "div",
  name: "TabBar",
  label: "Tab 栏",
  styles: {
    display: "flex",
    flexDirection: "row",
    gap: "$token:spacing.md",
    borderBottom: "1px solid $token:colors.border"
  }
}
```

### 步骤 2：添加 Tab 项

```javascript
// Tab 1
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<TabBar-id>",
  type: "div",
  name: "CodeTab",
  label: "验证码 Tab",
  props: { textContent: "验证码登录" },
  styles: {
    padding: "$token:spacing.md",
    cursor: "pointer",
    borderBottom: "2px solid transparent"
  }
}

// Tab 2
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<TabBar-id>",
  type: "div",
  name: "PasswordTab",
  label: "密码 Tab",
  props: { textContent: "密码登录" },
  styles: {
    padding: "$token:spacing.md",
    cursor: "pointer",
    borderBottom: "2px solid transparent"
  }
}
```

### 步骤 3：配置视觉状态

```javascript
// 为 CodeTab 添加 active 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<CodeTab-id>",
  stateName: "active",
  styles: {
    borderBottom: "2px solid $token:colors.primary",
    color: "$token:colors.primary"
  },
  activeWhen: "{{ state.view.loginMode === 'code' }}"
}

// 为 PasswordTab 添加 active 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<PasswordTab-id>",
  stateName: "active",
  styles: {
    borderBottom: "2px solid $token:colors.primary",
    color: "$token:colors.primary"
  },
  activeWhen: "{{ state.view.loginMode === 'password' }}"
}
```

### 步骤 4：配置切换事件

```javascript
// CodeTab 点击
event / add_event → {
  projectId: "xxx",
  nodeId: "<CodeTab-id>",
  trigger: "click",
  actions: [
    { type: "state.set", path: "view.loginMode", value: "code" }
  ]
}

// PasswordTab 点击
event / add_event → {
  projectId: "xxx",
  nodeId: "<PasswordTab-id>",
  trigger: "click",
  actions: [
    { type: "state.set", path: "view.loginMode", value: "password" }
  ]
}
```

### 步骤 5：配置内容区显示

```javascript
// 验证码登录内容
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<page-root>",
  type: "div",
  name: "CodeContent",
  label: "验证码内容",
  // ... 内容
}

// 设置条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<CodeContent-id>",
  visibleWhen: "{{ state.view.loginMode === 'code' }}"
}

// 密码登录内容
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<page-root>",
  type: "div",
  name: "PasswordContent",
  label: "密码内容",
  // ... 内容
}

// 设置条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<PasswordContent-id>",
  visibleWhen: "{{ state.view.loginMode === 'password' }}"
}
```

## 常见问题

### 问题 1：Tab 切换不生效

**原因**：
- state 未正确设置
- activeWhen 表达式错误

**解决**：
1. 检查 state.set 是否正确执行
2. 检查 activeWhen 表达式语法

### 问题 2：内容区不切换

**原因**：
- visibleWhen 表达式错误
- 内容区节点未正确配置

**解决**：
1. 检查 visibleWhen 表达式
2. 确保内容区节点已正确添加

## 示例代码

完整示例见 `references/examples/login-page.md`（Tab 切换部分）。
