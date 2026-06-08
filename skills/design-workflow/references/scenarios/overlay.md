# 场景：弹窗/抽屉设计

## 何时使用

需要弹窗（Modal）、底部弹出层（BottomSheet）、抽屉（Drawer）等覆盖层场景。

## 核心概念

- **OverlayNode**：全局覆盖层节点，脱离正常文档流渲染在页面最顶层
- **`ui.showOverlay`** / **`ui.hideOverlay`**：控制覆盖层显隐
- **`showWhen`**：条件显示表达式（自动控制显隐，无需手动 showOverlay）

## 操作步骤

### 步骤 1：添加覆盖层

```javascript
screen / add → {
  projectId: "xxx",
  // 覆盖层作为特殊屏幕添加
  type: "overlay",
  name: "LoginModal",
  label: "登录弹窗"
}
```

### 步骤 2：配置覆盖层内容

```javascript
// 在覆盖层中添加内容节点
element / add → {
  projectId: "xxx",
  screenId: "<overlay-screen-id>",
  parentId: "<overlay-root>",
  type: "div",
  name: "ModalContent",
  label: "弹窗内容",
  styles: {
    backgroundColor: "$token:colors.surface",
    borderRadius: "$token:radius.lg",
    padding: "$token:spacing.lg",
    width: "80%",
    maxWidth: "400px"
  }
}
```

### 步骤 3：配置显示/隐藏控制

**方式 A：手动控制（事件触发）**

```javascript
// 打开弹窗
event / add_event → {
  projectId: "xxx",
  nodeId: "<open-button-id>",
  trigger: "click",
  actions: [
    { type: "ui.showOverlay", overlayId: "<overlay-id>" }
  ]
}

// 关闭弹窗
event / add_event → {
  projectId: "xxx",
  nodeId: "<close-button-id>",
  trigger: "click",
  actions: [
    { type: "ui.hideOverlay", overlayId: "<overlay-id>" }
  ]
}
```

**方式 B：条件控制（state 驱动）**

```javascript
// 配置 showWhen（自动控制显隐）
// 在 overlay 配置中设置
{
  showWhen: "{{ state.view.showLoginModal }}"
}

// 切换状态
event / add_event → {
  projectId: "xxx",
  nodeId: "<open-button-id>",
  trigger: "click",
  actions: [
    { type: "state.set", path: "view.showLoginModal", value: true }
  ]
}
```

## 常见问题

### 问题 1：弹窗不显示

**原因**：
- overlayId 错误
- showOverlay/hideOverlay 未正确调用

**解决**：
1. 检查 overlayId 是否正确
2. 检查事件是否正确绑定

### 问题 2：弹窗遮罩层不生效

**原因**：
- 未配置 backdrop
- backdrop 颜色透明

**解决**：
1. 配置 backdrop 属性
2. 确保 backdrop 颜色不透明

## 示例代码

完整示例见 `references/examples/login-page.md`（登录弹窗部分）。
