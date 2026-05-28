# MCP 工具与设计任务映射速查

## 设计任务 → MCP 工具链

| 设计任务 | MCP 工具 | 关键参数 | 注意事项 |
|---------|----------|---------|---------|
| 新建页面 | screen/add | name | 创建后需 activate |
| 搭建页面骨架 | element/insert_subtree | parentId, subtree | 一次性插入完整子树，减少调用次数 |
| 绘制图标/素材 | canvas/add_object | materialId, type, 坐标 | 先 get_canvas_info 获取参考框 |
| 导出素材到节点 | canvas/export_and_apply | projectId, materialId, nodeId | 之后必须 style/reset + style/update 清理 |
| 创建数据源(static) | data_source/add | type="static", initial=数据 | 用于固定配置数据 |
| 创建数据源(api) | data_source/add | type="api", endpoint+mock | 必须同时提供 mock 场景 |
| 列表绑定 | element/set_repeat | expression, template | template 是完整 ComponentNode 子树 |
| 双向绑定输入框 | element/set_bind | path (如 "view.phone") | 需先 state/view_add 创建变量 |
| 设置状态变量 | state/view_add | screenId, name, defaultValue | view 变量用于 UI 临时状态 |
| 设置数据初始值 | state/data_set_init | screenId, key, value | data 用于业务数据 |
| 添加页面跳转 | event/add_navigation | trigger, targetScreenId | trigger 通常是 "click" |
| 添加复杂事件 | event/add_event | trigger, actions[] | actions 用 v2 动词 |
| 保存为组件模板 | asset/save_as_template | nodeId, name | 模板化后可复用 |
| 实例化组件 | asset/instantiate | templateId, parentId | 创建引用实例 |
| 添加视觉状态 | visual_state/add | nodeId, stateName, styles | hover/pressed/disabled |
| 设置条件可见 | element/set_visible_when | expression | 表达式求值得 boolean |

## 页面搭建标准流程

```
1. screen/add → 创建空白页
2. style/update → 设置 root 背景色和布局
3. state/view_add → 创建需要的 view 状态变量
4. state/data_set_init → 设置 data 初始值
5. data_source/add → 创建 api/static 数据源
6. element/insert_subtree → 搭建页面骨架
7. element/set_repeat → 为列表绑定数据
8. element/set_bind → 为表单绑定双向数据
9. event/add_event → 添加交互事件
10. visual_state/add → 添加 hover/pressed 等视觉态
11. generate_snapshots → 截图验证
```

## 数据源 + 列表 + 状态管理组合模式

```yaml
# 标准列表加载模式
setup:
  1. data_source/add:
       type: api
       name: feedList
       endpoint: { method: GET, path: "/api/feed" }
       mock: { scenarios: [正常/空/错误], activeScenarioId: "success" }
       autoFetchOnEnter: true
  
  2. state/data_set_init:
       key: feedList
       value: []
  
  3. state/view_add:
       name: isLoadingMore
       defaultValue: false

bindToUI:
  4. element/set_repeat:
       nodeId: <列表容器>
       expression: "{{ state.data.feedList }}"
       template: { ... FeedCard 子树 ... }

interaction:
  5. event/add_event:
       nodeId: <列表容器>
       trigger: scrollReachBottom
       actions:
         - type: state.set
           path: "view.isLoadingMore"
           value: true
         - type: effect.fetch
           dataSourceId: feedList
           params: { page: "{{ state.view.currentPage + 1 }}" }
           onSuccess:
             - type: state.append
               path: "data.feedList"
               value: "{{ $last.data.list }}"
             - type: state.set
               path: "view.currentPage"
               value: "{{ state.view.currentPage + 1 }}"
             - type: state.set
               path: "view.isLoadingMore"
               value: false
```

## effect.fetch 的 onSuccess/onError 链

```yaml
effect.fetch:
  dataSourceId: "loginApi"
  params:
    phone: "{{ state.view.phone }}"
    password: "{{ state.view.password }}"
  onSuccess:
    - type: state.set
      path: "data.userToken"
      value: "{{ $last.data.token }}"
    - type: ui.showToast
      toastType: success
      message: "登录成功"
    - type: nav.go
      targetScreenId: "sc_xxx"
  onError:
    - type: state.set
      path: "view.errorMessage"
      value: "{{ $last.error.message }}"
    - type: ui.showToast
      toastType: error
      message: "{{ $last.error.message }}"
```
