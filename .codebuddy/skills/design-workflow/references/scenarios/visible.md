# 场景：条件显示/隐藏设计

## 何时使用

需要根据条件显示/隐藏元素的场景（如权限控制、状态切换、空状态等）。

## 核心概念

- **`element.set_visible_when`**：表达式驱动的可见性，运行时求值得 boolean
- **表达式作用域**：支持 `state` / `item` / `index` / `parent` / `$last` / `$`

## 操作步骤

### 步骤 1：添加元素

```javascript
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<parent-id>",
  type: "div",
  name: "VIPBadge",
  label: "VIP 标识",
  props: { textContent: "VIP" },
  styles: {
    backgroundColor: "$token:colors.secondary",
    color: "$token:colors.onPrimary",
    padding: "$token:spacing.xs $token:spacing.sm",
    borderRadius: "$token:radius.sm"
  }
}
```

### 步骤 2：设置条件显示

```javascript
// 根据 state 条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<VIPBadge-id>",
  visibleWhen: "{{ state.view.isVIP }}"
}

// 根据 item 条件显示（在列表 template 中）
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<badge-in-template-id>",
  visibleWhen: "{{ item.role === 'admin' }}"
}

// 根据组合条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<element-id>",
  visibleWhen: "{{ state.view.isLogin && state.view.userLevel > 3 }}"
}
```

## 常见问题

### 问题 1：条件显示不生效

**原因**：
- 表达式语法错误
- state 未初始化

**解决**：
1. 检查表达式语法（使用 `{{ }}` 包裹）
2. 确保 state 有默认值

### 问题 2：列表中条件显示不生效

**原因**：
- 在 template 中使用了错误的变量名
- 未使用 item/index/parent

**解决**：
1. 在 template 中使用 `item.xxx` 而非 `state.xxx`
2. 检查变量名是否正确

## 示例代码

完整示例见 `references/examples/list-page.md`（条件显示部分）。
