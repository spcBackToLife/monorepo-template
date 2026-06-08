# 场景：API 数据源设计

## 何时使用

需要对接后端 API、使用 Mock 数据等场景。

## 核心概念

- **v2 模型**：endpoint + mock 共存，编辑器/Storybook 用 mock，生产 codegen 用 endpoint
- **StaticDataSource**：常量数据，启动时同步注入到 state.data
- **ApiDataSource**：真实接口 + Mock 场景

## 操作步骤

### 步骤 1：添加 Static 数据源

```javascript
data_source / add → {
  projectId: "xxx",
  screenId: "xxx",
  id: "categories",
  name: "分类数据",
  type: "static",
  initial: [
    { id: 1, name: "电子产品" },
    { id: 2, name: "服装" },
    { id: 3, name: "食品" }
  ]
}
```

### 步骤 2：添加 API 数据源

```javascript
data_source / add → {
  projectId: "xxx",
  screenId: "xxx",
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
          { id: 1, title: "消息1", content: "内容1" }
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
    },
    {
      id: "error",
      name: "错误",
      statusCode: 500,
      delay: 300,
      responseBody: {
        error: "服务器错误"
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
      { name: "content", type: "string" }
    ]
  }
}
```

### 步骤 3：切换 Mock 场景

```javascript
data_source / switch_mock_scenario → {
  projectId: "xxx",
  screenId: "xxx",
  dataSourceId: "messages",
  scenarioId: "empty"
}
```

### 步骤 4：手动触发请求

```javascript
event / add_event → {
  projectId: "xxx",
  nodeId: "<refresh-button-id>",
  trigger: "click",
  actions: [
    {
      type: "effect.fetch",
      dataSourceId: "messages"
    }
  ]
}
```

## 常见问题

### 问题 1：API 请求不触发

**原因**：
- autoFetchOnEnter 未设置
- 数据源 ID 错误

**解决**：
1. 设置 autoFetchOnEnter: true
2. 检查数据源 ID 是否正确

### 问题 2：Mock 数据不生效

**原因**：
- Mock 场景未激活
- 场景 ID 错误

**解决**：
1. 检查 activeScenarioId 是否正确
2. 使用 switch_mock_scenario 切换场景

## 示例代码

完整示例见 `references/examples/list-page.md`（API 数据源部分）。
