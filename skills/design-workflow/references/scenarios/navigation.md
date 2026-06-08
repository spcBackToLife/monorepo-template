# 场景：页面跳转设计

## 何时使用

需要页面跳转、返回、传参等场景。

## 核心概念

- **`event.add_navigation`**：添加页面跳转事件（等价于 add_event + nav.go）
- **`nav.go`**：跳转到指定页面
- **`nav.back`**：返回上一页

## 操作步骤

### 步骤 1：添加跳转事件

```javascript
// 方式 A：使用 add_navigation（推荐）
event / add_navigation → {
  projectId: "xxx",
  nodeId: "<button-id>",
  targetScreenId: "<target-screen-id>"
}

// 方式 B：使用 add_event + nav.go
event / add_event → {
  projectId: "xxx",
  nodeId: "<button-id>",
  trigger: "click",
  actions: [
    { type: "nav.go", screenId: "<target-screen-id>" }
  ]
}
```

### 步骤 2：添加返回事件

```javascript
event / add_event → {
  projectId: "xxx",
  nodeId: "<back-button-id>",
  trigger: "click",
  actions: [
    { type: "nav.back" }
  ]
}
```

## 常见问题

### 问题 1：跳转不生效

**原因**：
- targetScreenId 错误
- 事件未正确绑定

**解决**：
1. 检查 targetScreenId 是否正确
2. 检查事件是否正确绑定

## 示例代码

完整示例见 `references/examples/login-page.md`（跳转部分）。
