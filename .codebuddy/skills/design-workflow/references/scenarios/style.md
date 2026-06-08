# 场景：样式设计

## 何时使用

需要设置元素样式、使用主题变量等场景。

## 核心概念

- **`style.update`**：合并样式更新（部分 patch）
- **`style.reset`**：删除指定 CSS 属性
- **`style.batch_update`**：批量更新多个节点
- **`$token:`**：引用主题变量

## 操作步骤

### 步骤 1：更新单个节点样式

```javascript
style / update → {
  projectId: "xxx",
  nodeId: "<node-id>",
  styles: {
    backgroundColor: "$token:colors.primary",
    color: "$token:colors.onPrimary",
    padding: "$token:spacing.md",
    borderRadius: "$token:radius.md"
  }
}
```

### 步骤 2：批量更新多个节点

```javascript
style / batch_update → {
  projectId: "xxx",
  updates: [
    {
      nodeId: "<node-1-id>",
      styles: { color: "$token:colors.primary" }
    },
    {
      nodeId: "<node-2-id>",
      styles: { color: "$token:colors.primary" }
    }
  ]
}
```

### 步骤 3：重置样式

```javascript
style / reset → {
  projectId: "xxx",
  nodeId: "<node-id>",
  properties: ["backgroundColor", "boxShadow"]
}
```

## 主题变量使用

```javascript
// ✅ 合法
{ paddingTop: "$token:spacing.3xl" }
{ color: "$token:colors.primary" }

// ❌ 非法（token 解析器不递归扫描复合表达式内部）
{ paddingTop: "calc(env(safe-area-inset-top) + $token:spacing.2xl)" }
```

## 常见问题

### 问题 1：样式不生效

**原因**：
- 属性名错误
- 值格式错误

**解决**：
1. 使用 camelCase 属性名（如 `backgroundColor`）
2. 检查值格式是否正确

### 问题 2：token 不生效

**原因**：
- token 路径错误
- theme 未配置

**解决**：
1. 检查 token 路径（如 `$token:colors.primary`）
2. 确保 theme 已正确配置

## 示例代码

完整示例见 `references/examples/login-page.md`（样式设计部分）。
