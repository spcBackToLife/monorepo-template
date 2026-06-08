# 场景：表单设计

## 何时使用

需要用户输入、表单提交、表单验证等场景。

## 核心概念

- **`set_bind`**：input/textarea/select 的双向绑定，value 取自 path，onChange dispatch state.set
- **`state`**：view 变量存储表单数据
- **`event`**：提交事件 + 验证逻辑

## 操作步骤

### 步骤 1：创建表单容器

```javascript
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<page-root>",
  type: "div",
  name: "LoginForm",
  label: "登录表单",
  styles: {
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md",
    padding: "$token:spacing.lg"
  }
}
```

### 步骤 2：添加输入框并绑定

```javascript
// 添加输入框
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<LoginForm-id>",
  type: "input",
  name: "PhoneInput",
  label: "手机号输入框",
  props: {
    placeholder: "请输入手机号",
    type: "tel"
  },
  styles: {
    padding: "$token:spacing.md",
    borderRadius: "$token:radius.md",
    border: "1px solid $token:colors.border"
  }
}

// 绑定到 view 变量
element / set_bind → {
  projectId: "xxx",
  nodeId: "<PhoneInput-id>",
  path: "view.form.phone"
}
```

### 步骤 3：添加提交按钮

```javascript
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<LoginForm-id>",
  type: "button",
  name: "SubmitButton",
  label: "提交按钮",
  props: { textContent: "提交" },
  styles: {
    padding: "$token:spacing.md",
    backgroundColor: "$token:colors.primary",
    color: "$token:colors.onPrimary",
    borderRadius: "$token:radius.md",
    border: "none"
  }
}
```

### 步骤 4：配置提交事件

```javascript
event / add_event → {
  projectId: "xxx",
  nodeId: "<SubmitButton-id>",
  trigger: "click",
  actions: [
    // 1. 验证表单
    {
      type: "state.set",
      path: "view.formError",
      value: ""
    },
    // 2. 调用 API
    {
      type: "effect.fetch",
      dataSourceId: "login",
      params: {
        phone: "{{ state.view.form.phone }}"
      }
    }
  ]
}
```

### 步骤 5：配置错误提示（可选）

```javascript
// 添加错误提示节点
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<LoginForm-id>",
  type: "div",
  name: "ErrorMessage",
  label: "错误提示",
  props: { textContent: "{{ state.view.formError }}" },
  styles: {
    color: "$token:colors.error",
    fontSize: "$token:font.caption.fontSize"
  }
}

// 设置条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<ErrorMessage-id>",
  visibleWhen: "{{ state.view.formError !== '' }}"
}
```

## 常见问题

### 问题 1：输入框不绑定

**原因**：
- path 路径错误
- 元素类型不是 input/textarea/select

**解决**：
1. 检查 path 路径（如 `view.form.phone`）
2. 确保元素类型是 input/textarea/select

### 问题 2：提交事件不触发

**原因**：
- trigger 与元素类型不匹配
- 事件未正确绑定

**解决**：
1. 确保 trigger 是 "click" 且元素类型是 "button"
2. 检查 actions 是否正确配置

## 示例代码

完整示例见 `references/examples/login-page.md`。
