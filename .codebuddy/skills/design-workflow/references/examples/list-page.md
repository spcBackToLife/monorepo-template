# 示例：列表页面完整设计

## 需求描述

设计一个消息列表页面，包含：
- 消息列表（使用 repeat 绑定）
- 空状态
- 下拉刷新
- 加载更多
- 消息项点击跳转详情

## 设计计划

```markdown
# 设计计划 — 消息列表页面

## 任务清单
- [ ] T1: 主题检查与配置 → 验证: theme/check → customized=true
- [ ] T2: 创建页面结构 → 验证: 截图确认布局
- [ ] T3: 配置 API 数据源 → 验证: data_source/list 确认数据源
- [ ] T4: 配置列表绑定 → 验证: 列表数据正确显示
- [ ] T5: 配置空状态 → 验证: 空数据时显示空状态
- [ ] T6: 配置下拉刷新 → 验证: 下拉触发刷新
- [ ] T7: 配置加载更多 → 验证: 滚动到底部触发加载
- [ ] T8: 配置消息项点击 → 验证: 点击跳转详情页
- [ ] T9: 截图验证 → 验证: 所有状态截图正常

## 当前进度
- 已完成: 
- 进行中: T1
- 待开始: T2-T9
```

## 实施步骤

### T1: 主题检查与配置

```javascript
theme / check → {
  projectId: "xxx"
}

// 如果 customized=false，调用 theme-generator 技能
// 如果 customized=true，继续
```

### T2: 创建页面结构

```javascript
// 创建页面
screen / add → {
  projectId: "xxx",
  screenId: "message-list",
  name: "消息列表"
}

// 创建列表容器
element / add → {
  projectId: "xxx",
  screenId: "message-list",
  parentId: "<page-root>",
  type: "div",
  name: "MessageList",
  label: "消息列表",
  styles: {
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md",
    padding: "$token:spacing.md",
    overflow: "auto"
  }
}

// 创建列表项模板
element / add → {
  projectId: "xxx",
  screenId: "message-list",
  parentId: "<MessageList-id>",
  type: "div",
  name: "MessageItem",
  label: "消息项",
  styles: {
    display: "flex",
    flexDirection: "column",
    padding: "$token:spacing.md",
    backgroundColor: "$token:colors.surface",
    borderRadius: "$token:radius.md",
    cursor: "pointer"
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
    },
    {
      type: "div",
      name: "MessageTime",
      label: "消息时间",
      props: { textContent: "{{ item.time }}" },
      styles: {
        fontSize: "$token:font.caption.fontSize",
        color: "$token:colors.textSecondary",
        marginTop: "$token:spacing.sm"
      }
    }
  ]
}

// 创建空状态
element / add → {
  projectId: "xxx",
  screenId: "message-list",
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
```

### T3: 配置 API 数据源

```javascript
data_source / add → {
  projectId: "xxx",
  screenId: "message-list",
  id: "messages",
  name: "消息列表",
  type: "api",
  endpoint: {
    method: "GET",
    path: "/api/messages",
    headers: {
      "Content-Type": "application/json"
    }
  },
  mockScenarios: [
    {
      id: "success",
      name: "成功",
      statusCode: 200,
      delay: 300,
      responseBody: {
        data: [
          { id: 1, title: "消息1", content: "内容1", time: "2024-01-01" },
          { id: 2, title: "消息2", content: "内容2", time: "2024-01-02" }
        ]
      }
    },
    {
      id: "empty",
      name: "空数据",
      statusCode: 200,
      delay: 300,
      responseBody: {
        data: []
      }
    }
  ],
  autoFetchOnEnter: true,
  typeDef: {
    typeName: "Message",
    isArray: true,
    fields: [
      { name: "id", type: "number" },
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "time", type: "string" }
    ]
  }
}
```

### T4: 配置列表绑定

```javascript
element / set_repeat → {
  projectId: "xxx",
  nodeId: "<MessageList-id>",
  repeat: {
    expression: "{{ state.data.messages }}"
    // template 自动使用 children[0]（MessageItem）
  }
}
```

### T5: 配置空状态

```javascript
// 设置空状态的条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<EmptyState-id>",
  visibleWhen: "{{ state.data.messages.length === 0 }}"
}
```

### T6: 配置下拉刷新

```javascript
// 添加刷新按钮（实际项目中可用下拉手势）
element / add → {
  projectId: "xxx",
  screenId: "message-list",
  parentId: "<page-root>",
  type: "button",
  name: "RefreshButton",
  label: "刷新按钮",
  props: { textContent: "刷新" },
  styles: {
    padding: "$token:spacing.md",
    backgroundColor: "$token:colors.primary",
    color: "$token:colors.onPrimary",
    borderRadius: "$token:radius.md",
    border: "none",
    marginBottom: "$token:spacing.md"
  }
}

// 配置刷新事件
event / add_event → {
  projectId: "xxx",
  nodeId: "<RefreshButton-id>",
  trigger: "click",
  actions: [
    {
      type: "effect.fetch",
      dataSourceId: "messages"
    }
  ]
}
```

### T7: 配置加载更多

```javascript
// 添加加载更多按钮
element / add → {
  projectId: "xxx",
  screenId: "message-list",
  parentId: "<page-root>",
  type: "button",
  name: "LoadMoreButton",
  label: "加载更多按钮",
  props: { textContent: "加载更多" },
  styles: {
    padding: "$token:spacing.md",
    backgroundColor: "$token:colors.surface",
    color: "$token:colors.textPrimary",
    borderRadius: "$token:radius.md",
    border: "1px solid $token:colors.border",
    marginTop: "$token:spacing.md"
  }
}

// 配置加载更多事件
event / add_event → {
  projectId: "xxx",
  nodeId: "<LoadMoreButton-id>",
  trigger: "click",
  actions: [
    {
      type: "effect.fetch",
      dataSourceId: "messages",
      params: {
        page: "{{ state.view.page + 1 }}"
      }
    },
    {
      type: "state.set",
      path: "view.page",
      value: "{{ state.view.page + 1 }}"
    }
  ]
}
```

### T8: 配置消息项点击

```javascript
// 为列表项添加点击事件
event / add_event → {
  projectId: "xxx",
  nodeId: "<MessageItem-id>",
  trigger: "click",
  actions: [
    {
      type: "nav.go",
      screenId: "message-detail",
      params: {
        id: "{{ item.id }}"
      }
    }
  ]
}
```

### T9: 截图验证

```javascript
// 生成截图
generate_snapshots → {
  projectId: "xxx",
  screenId: "message-list",
  mode: "multi-viewport"
}

// 完整性检查
query / integrity → {
  projectId: "xxx",
  screenId: "message-list"
}
```

## 验证清单

- [ ] 主题已配置
- [ ] 列表数据正确显示
- [ ] 空状态显示正常
- [ ] 下拉刷新正常
- [ ] 加载更多正常
- [ ] 消息项点击跳转正常
- [ ] 截图验证通过
