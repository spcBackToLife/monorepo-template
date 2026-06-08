# 示例：登录页面完整设计

## 需求描述

设计一个登录页面，包含：
- 验证码登录 / 密码登录 Tab 切换
- 手机号输入框
- 验证码输入框 / 密码输入框
- 登录按钮
- 用户协议勾选
- 登录成功/失败提示

## 设计计划

```markdown
# 设计计划 — 登录页面

## 任务清单
- [ ] T1: 主题检查与配置 → 验证: theme/check → customized=true
- [ ] T2: 创建页面结构（Tab 栏 + 内容区） → 验证: 截图确认布局
- [ ] T3: 配置状态管理（loginMode + form 数据） → 验证: state/list 确认变量
- [ ] T4: 配置 Tab 切换交互 → 验证: 点击 Tab 切换内容
- [ ] T5: 配置表单输入与绑定 → 验证: 输入后 state 更新
- [ ] T6: 配置登录按钮与事件 → 验证: 点击触发 API 请求
- [ ] T7: 配置视觉状态（hover/active/disabled） → 验证: 截图确认状态
- [ ] T8: 截图验证 → 验证: 所有状态截图正常

## 当前进度
- 已完成: 
- 进行中: T1
- 待开始: T2-T8
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
  screenId: "login",
  name: "登录页"
}

// 创建 Tab 栏
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<page-root>",
  type: "div",
  name: "TabBar",
  label: "Tab 栏",
  styles: {
    display: "flex",
    flexDirection: "row",
    gap: "$token:spacing.md",
    borderBottom: "1px solid $token:colors.border",
    marginBottom: "$token:spacing.lg"
  }
}

// 创建验证码 Tab
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<TabBar-id>",
  type: "div",
  name: "CodeTab",
  label: "验证码 Tab",
  props: { textContent: "验证码登录" },
  styles: {
    padding: "$token:spacing.md",
    cursor: "pointer",
    borderBottom: "2px solid transparent"
  }
}

// 创建密码 Tab
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<TabBar-id>",
  type: "div",
  name: "PasswordTab",
  label: "密码 Tab",
  props: { textContent: "密码登录" },
  styles: {
    padding: "$token:spacing.md",
    cursor: "pointer",
    borderBottom: "2px solid transparent"
  }
}

// 创建内容区
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<page-root>",
  type: "div",
  name: "ContentArea",
  label: "内容区",
  styles: {
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md"
  }
}

// 创建验证码内容
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<ContentArea-id>",
  type: "div",
  name: "CodeContent",
  label: "验证码内容",
  styles: {
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md"
  }
}

// 创建密码内容
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<ContentArea-id>",
  type: "div",
  name: "PasswordContent",
  label: "密码内容",
  styles: {
    display: "flex",
    flexDirection: "column",
    gap: "$token:spacing.md"
  }
}
```

### T3: 配置状态管理

```javascript
// 添加 view 变量
state / view_add → {
  projectId: "xxx",
  screenId: "login",
  name: "loginMode",
  defaultValue: "code",
  enum: [
    { value: "code", label: "验证码" },
    { value: "password", label: "密码" }
  ]
}

state / view_add → {
  projectId: "xxx",
  screenId: "login",
  name: "form",
  defaultValue: { phone: "", code: "", password: "" }
}

state / view_add → {
  projectId: "xxx",
  screenId: "login",
  name: "formError",
  defaultValue: ""
}

// 添加 API 数据源
data_source / add → {
  projectId: "xxx",
  screenId: "login",
  id: "login",
  name: "登录接口",
  type: "api",
  endpoint: {
    method: "POST",
    path: "/api/login"
  },
  mockScenarios: [
    {
      id: "success",
      name: "成功",
      statusCode: 200,
      delay: 300,
      responseBody: { token: "xxx", user: { id: 1, name: "用户" } }
    },
    {
      id: "error",
      name: "错误",
      statusCode: 400,
      delay: 300,
      responseBody: { error: "手机号或密码错误" }
    }
  ],
  autoFetchOnEnter: false
}
```

### T4: 配置 Tab 切换交互

```javascript
// 配置 CodeTab 视觉状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<CodeTab-id>",
  stateName: "active",
  styles: {
    borderBottom: "2px solid $token:colors.primary",
    color: "$token:colors.primary"
  },
  activeWhen: "{{ state.view.loginMode === 'code' }}"
}

// 配置 PasswordTab 视觉状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<PasswordTab-id>",
  stateName: "active",
  styles: {
    borderBottom: "2px solid $token:colors.primary",
    color: "$token:colors.primary"
  },
  activeWhen: "{{ state.view.loginMode === 'password' }}"
}

// 配置 CodeTab 点击事件
event / add_event → {
  projectId: "xxx",
  nodeId: "<CodeTab-id>",
  trigger: "click",
  actions: [
    { type: "state.set", path: "view.loginMode", value: "code" }
  ]
}

// 配置 PasswordTab 点击事件
event / add_event → {
  projectId: "xxx",
  nodeId: "<PasswordTab-id>",
  trigger: "click",
  actions: [
    { type: "state.set", path: "view.loginMode", value: "password" }
  ]
}

// 配置内容区条件显示
element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<CodeContent-id>",
  visibleWhen: "{{ state.view.loginMode === 'code' }}"
}

element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<PasswordContent-id>",
  visibleWhen: "{{ state.view.loginMode === 'password' }}"
}
```

### T5: 配置表单输入与绑定

```javascript
// 添加手机号输入框
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<CodeContent-id>",
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

element / set_bind → {
  projectId: "xxx",
  nodeId: "<PhoneInput-id>",
  path: "view.form.phone"
}

// 添加验证码输入框
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<CodeContent-id>",
  type: "input",
  name: "CodeInput",
  label: "验证码输入框",
  props: {
    placeholder: "请输入验证码",
    type: "text"
  },
  styles: {
    padding: "$token:spacing.md",
    borderRadius: "$token:radius.md",
    border: "1px solid $token:colors.border"
  }
}

element / set_bind → {
  projectId: "xxx",
  nodeId: "<CodeInput-id>",
  path: "view.form.code"
}

// 添加密码输入框
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<PasswordContent-id>",
  type: "input",
  name: "PasswordInput",
  label: "密码输入框",
  props: {
    placeholder: "请输入密码",
    type: "password"
  },
  styles: {
    padding: "$token:spacing.md",
    borderRadius: "$token:radius.md",
    border: "1px solid $token:colors.border"
  }
}

element / set_bind → {
  projectId: "xxx",
  nodeId: "<PasswordInput-id>",
  path: "view.form.password"
}
```

### T6: 配置登录按钮与事件

```javascript
// 添加登录按钮
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<page-root>",
  type: "button",
  name: "LoginButton",
  label: "登录按钮",
  props: { textContent: "登录" },
  styles: {
    padding: "$token:spacing.md",
    backgroundColor: "$token:colors.primary",
    color: "$token:colors.onPrimary",
    borderRadius: "$token:radius.md",
    border: "none",
    marginTop: "$token:spacing.lg"
  }
}

// 配置点击事件
event / add_event → {
  projectId: "xxx",
  nodeId: "<LoginButton-id>",
  trigger: "click",
  actions: [
    // 1. 清除错误
    { type: "state.set", path: "view.formError", value: "" },
    // 2. 调用登录 API
    {
      type: "effect.fetch",
      dataSourceId: "login",
      params: {
        phone: "{{ state.view.form.phone }}",
        code: "{{ state.view.form.code }}",
        password: "{{ state.view.form.password }}"
      }
    }
  ]
}

// 添加错误提示
element / add → {
  projectId: "xxx",
  screenId: "login",
  parentId: "<page-root>",
  type: "div",
  name: "ErrorMessage",
  label: "错误提示",
  props: { textContent: "{{ state.view.formError }}" },
  styles: {
    color: "$token:colors.error",
    fontSize: "$token:font.caption.fontSize",
    marginTop: "$token:spacing.sm"
  }
}

element / set_visible_when → {
  projectId: "xxx",
  nodeId: "<ErrorMessage-id>",
  visibleWhen: "{{ state.view.formError !== '' }}"
}
```

### T7: 配置视觉状态

```javascript
// 配置按钮 hover 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<LoginButton-id>",
  stateName: "hover",
  styles: {
    backgroundColor: "$token:colors.secondary",
    transform: "scale(1.02)"
  },
  transition: {
    duration: 200,
    easing: "ease"
  }
}

// 配置按钮 active 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<LoginButton-id>",
  stateName: "active",
  styles: {
    opacity: 0.8
  }
}

// 配置按钮 disabled 状态
visual_state / add → {
  projectId: "xxx",
  nodeId: "<LoginButton-id>",
  stateName: "disabled",
  styles: {
    backgroundColor: "$token:colors.border",
    cursor: "not-allowed"
  },
  activeWhen: "{{ state.view.form.phone === '' }}"
}
```

### T8: 截图验证

```javascript
// 生成截图
generate_snapshots → {
  projectId: "xxx",
  screenId: "login",
  mode: "multi-viewport"
}

// 完整性检查
query / integrity → {
  projectId: "xxx",
  screenId: "login"
}
```

## 验证清单

- [ ] 主题已配置
- [ ] Tab 切换正常
- [ ] 表单输入绑定正常
- [ ] 登录按钮点击触发 API
- [ ] 错误提示显示正常
- [ ] 按钮视觉状态正常
- [ ] 截图验证通过
