# 场景：列表/表格设计

## 何时使用

需要展示列表数据、表格数据、卡片列表等场景。

## 核心概念

平台使用 **v2.1 三层模型** `{ expression, template }`：

- **容器节点**：承载 `repeat` 字段，自身正常渲染
- **静态 children**：作为"静态装饰"（如空状态占位）
- **template**：每 item 的根节点子树，可读 `item` / `index` / `parent`

**顺序**：先渲染静态 children，再渲染 N 份 template。

## 操作步骤

### 步骤 1：准备数据源

```javascript
// 方式 A：Static 数据源（常量数据）
data_source / add → {
  projectId: "xxx",
  screenId: "xxx",
  id: "messages",
  name: "消息列表",
  type: "static",
  initial: [
    { id: 1, title: "消息1", content: "内容1" },
    { id: 2, title: "消息2", content: "内容2" }
  ]
}

// 方式 B：API 数据源（真实接口 + Mock）
data_source / add → {
  projectId: "xxx",
  screenId: "xxx",
  id: "messages",
  name: "消息列表",
  type: "api",
  endpoint: {
    method: "GET",
    path: "/api/messages"
  },
  mockScenarios: [{
    id: "success",
    name: "成功",
    statusCode: 200,
    delay: 300,
    responseBody: {
      data: [
        { id: 1, title: "消息1", content: "内容1" },
        { id: 2, title: "消息2", content: "内容2" }
      ]
    }
  }],
  autoFetchOnEnter: true
}
```

### 步骤 2：创建列表容器

```javascript
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<page-root>",
  type: "div",
  name: "MessageList",
  label: "消息列表",
  styles: {
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md",
    padding: "$token:spacing.md"
  }
}
```

### 步骤 3：添加列表项模板

```javascript
// 先添加一个子节点作为 template
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<MessageList-id>",
  type: "div",
  name: "MessageItem",
  label: "消息项",
  styles: {
    display: "flex",
    flexDirection: "column",
    padding: "$token:spacing.md",
    backgroundColor: "$token:colors.surface",
    borderRadius: "$token:radius.md"
  },
  children: [
    {
      type: "div",
      name: "MessageTitle",
      label: "消息标题",
      props: { textContent: "{{ item.title }}" },
      styles: {
        fontSize: "$token:font.h2.fontSize",
        fontWeight: 600,
        color: "$token:colors.textPrimary"
      }
    },
    {
      type: "div",
      name: "MessageContent",
      label: "消息内容",
      props: { textContent: "{{ item.content }}" },
      styles: {
        fontSize: "$token:font.body.fontSize",
        color: "$token:colors.textSecondary",
        marginTop: "$token:spacing.sm"
      }
    }
  ]
}
```

### 步骤 4：绑定列表数据

```javascript
// 便利形式：只传 expression，自动把 children[0] 提升为 template
element / set_repeat → {
  projectId: "xxx",
  nodeId: "<MessageList-id>",
  repeat: {
    expression: "{{ state.data.messages }}"
    // template 自动使用 children[0]
  }
}

// 完整形式：显式指定 template
element / set_repeat → {
  projectId: "xxx",
  nodeId: "<MessageList-id>",
  repeat: {
    expression: "{{ state.data.messages }}",
    template: {
      type: "div",
      name: "MessageItem",
      label: "消息项",
      // ... template 内容
    }
  }
}
```

### 步骤 5：配置空状态（可选）

```javascript
// 在列表容器中添加空状态节点（作为静态 children）
element / add → {
  projectId: "xxx",
  screenId: "xxx",
  parentId: "<MessageList-id>",
  type: "div",
  name: "EmptyState",
  label: "空状态",
  props: { textContent: "暂无消息" },
  styles: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "$token:spacing.xl",
    color: "$token:colors.textSecondary"
  }
}

// 设置空状态的条件显示（有数据时隐藏）
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<EmptyState-id>",
  visibleWhen: "{{ state.data.messages.length === 0 }}"
}
```

## 常见问题

### 问题 1：repeat 不生效

**原因**：
- expression 路径错误
- template 为空
- 数据源未正确初始化

**解决**：
1. 检查 expression 路径是否正确（如 `state.data.messages`）
2. 检查数据源是否已正确配置
3. 检查 template 是否为完整 ComponentNode

### 问题 2：空状态不显示

**原因**：
- visibleWhen 表达式错误
- 空状态节点被 template 覆盖

**解决**：
1. 检查 visibleWhen 表达式语法
2. 确保空状态节点在 children 中（不是 template 中）

### 问题 3：列表项样式不一致

**原因**：
- template 中使用了固定值而非 token
- 未统一使用设计系统变量

**解决**：
1. 使用 `$token:` 引用设计系统变量
2. 确保 theme 已正确配置

## 示例代码

完整示例见 `references/examples/list-page.md`。
