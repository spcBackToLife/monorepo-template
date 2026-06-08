# 场景：视觉状态设计

## 何时使用

组件有多种视觉状态（如按钮 hover/active/disabled）或业务状态（如成功/失败提示）。

## 核心概念

- **`visual_state.add`**：添加视觉状态
- **`activeWhen`**：自动激活条件表达式
- **`childrenStates`**：父态进入时，强制子节点切换到指定状态
- **`childrenVisibility`**：父态进入时，强制显示/隐藏指定子节点

## 操作步骤

### 步骤 1：添加视觉状态

```javascript
// 添加 hover 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<button-id>",
  stateName: "hover",
  styles: {
    backgroundColor: "$token:colors.secondary",
    transform: "scale(1.05)"
  },
  transition: {
    duration: 200,
    easing: "ease"
  }
}

// 添加 active 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<button-id>",
  stateName: "active",
  styles: {
    backgroundColor: "$token:colors.primary",
    opacity: 0.8
  }
}

// 添加 disabled 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<button-id>",
  stateName: "disabled",
  styles: {
    backgroundColor: "$token:colors.border",
    cursor: "not-allowed"
  }
}
```

### 步骤 2：配置自动激活（activeWhen）

```javascript
// 根据业务状态自动激活
visual_state / add → {
  projectId: "xxx",
  nodeId: "<tab-id>",
  stateName: "active",
  styles: {
    borderBottom: "2px solid $token:colors.primary",
    color: "$token:colors.primary"
  },
  activeWhen: "{{ state.view.loginMode === 'code' }}"
}
```

### 步骤 3：配置子节点联动

```javascript
// 父态进入时，强制子节点切换状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<card-id>",
  stateName: "hover",
  styles: {
    boxShadow: "$token:shadow.lg"
  },
  childrenStates: {
    "<icon-id>": "hover",
    "<title-id>": "highlight"
  }
}

// 父态进入时，强制显示/隐藏子节点
visual_state / add → {
  projectId: "xxx",
  nodeId: "<form-id>",
  stateName: "error",
  styles: {
    border: "1px solid $token:colors.error"
  },
  childrenVisibility: {
    "<error-message-id>": true,
    "<success-message-id>": false
  }
}
```

## 常见问题

### 问题 1：视觉状态不激活

**原因**：
- activeWhen 表达式错误
- state 未正确设置

**解决**：
1. 检查 activeWhen 表达式语法
2. 确保 state 已正确设置

### 问题 2：子节点联动不生效

**原因**：
- childrenStates/childrenVisibility 配置错误
- 子节点 ID 错误

**解决**：
1. 检查子节点 ID 是否正确
2. 确保子节点已定义对应状态

## 示例代码

完整示例见 `references/examples/login-page.md`（视觉状态部分）。
