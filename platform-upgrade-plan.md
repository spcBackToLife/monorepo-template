# 平台能力改造方案

> **目标**: 补齐设计编辑器缺失的交互能力，使 design-executor 能完整实现企业级页面设计
> **触发**: 登录页实现测试暴露的能力缺口（analysis.md）
> **日期**: 2026-05-29

---

## 一、改造全景

### 已完成的修复（本次会话）

| # | 修复项 | 状态 | 文件 |
|---|--------|:----:|------|
| P0-1 | input/textarea/select 默认白色背景 | ✅ | `features/design-engine/src/styles/resolveStyles.ts` |
| P0-2 | export_and_apply 支持 `targetState` 参数 | ✅ | `design-operations` + `design-mcp` |
| P1-a | autoVisualState (`activeWhen` 表达式) | ✅ | `design-schema` + `design-engine` |
| P1-b | 发现并文档化已有能力: 样式表达式 `{{ }}` | ✅ | 技能文档更新 |
| P1-c | 发现并文档化已有能力: textContent 插值 | ✅ | 技能文档更新 |

### 待实现的新能力

| # | 能力 | 优先级 | 解决的用户场景 |
|---|------|:------:|--------------|
| P2-1 | **定时器 actions** (`ui.startTimer` / `ui.stopTimer`) | P0 | 验证码 60s 倒计时、延迟跳转、Toast 自动消失 |
| P2-2 | **条件判断 actions** (`logic.if` / `logic.switch`) | P0 | 表单校验分支、不同错误码路由、条件导航 |
| P2-3 | **delay action** (`ui.delay`) | P1 | 按顺序执行动画：先变色→等300ms→再跳转 |
| P2-4 | **复合表单组件** (OTP input) | P2 | 验证码 6 格自动跳焦点 |

---

## 二、P2-1: 定时器 Actions

### 需求场景

```
用户点击"获取验证码":
  1. 按钮文案变为 "60s"
  2. 每秒递减: 59s → 58s → ... → 0s
  3. 到 0 时恢复为 "获取验证码" 并解除 disabled
```

### 设计方案

#### 新增 Action 类型

```typescript
// 启动定时器
interface TimerStartAction {
  type: 'ui.startTimer';
  timerId: string;           // 定时器唯一标识（用于 stop）
  interval: number;          // 间隔毫秒（如 1000）
  count?: number;            // 执行次数（如 60），达到后自动停止。不传则无限循环直到手动 stop
  onTick: ActionDef[];       // 每次 tick 执行的 actions
  onComplete?: ActionDef[];  // count 达到后执行的 actions
}

// 停止定时器
interface TimerStopAction {
  type: 'ui.stopTimer';
  timerId: string;
}
```

#### 使用示例（验证码倒计时）

```json
{
  "trigger": "click",
  "actions": [
    { "type": "state.set", "path": "view.countdown", "value": 60 },
    { "type": "state.set", "path": "view.codeSending", "value": true },
    { "type": "node.setVisualState", "stateName": "disabled" },
    {
      "type": "ui.startTimer",
      "timerId": "countdown-timer",
      "interval": 1000,
      "count": 60,
      "onTick": [
        { "type": "state.set", "path": "view.countdown", "expression": "{{ state.view.countdown - 1 }}" }
      ],
      "onComplete": [
        { "type": "state.set", "path": "view.codeSending", "value": false },
        { "type": "state.set", "path": "view.countdown", "value": 0 },
        { "type": "node.setVisualState", "stateName": "default" },
        { "type": "ui.stopTimer", "timerId": "countdown-timer" }
      ]
    }
  ]
}
```

配合 textContent 插值: `textContent: "{{ state.view.codeSending ? state.view.countdown + 's' : '获取验证码' }}"`

#### 实现要点

```
1. ActionRunner（运行时 action 执行器）中新增 timer 分支
2. 维护 timerRegistry: Map<string, NodeJS.Timeout>
3. 页面卸载(screenExit)时自动清理所有 timer
4. onTick 中的 actions 递归调用 ActionRunner
5. count 为 0 时触发 onComplete 并从 registry 中清除
```

---

## 三、P2-2: 条件判断 Actions

### 需求场景

```
用户点击"登录"按钮:
  if 手机号为空 → 显示"请输入手机号"错误
  else if 手机号格式错 → 显示"手机号格式不正确"
  else if 验证码为空 → 显示"请输入验证码"
  else → 发起登录请求
```

### 设计方案

#### 新增 Action 类型

```typescript
// 条件分支
interface LogicIfAction {
  type: 'logic.if';
  condition: string;          // {{ }} 表达式，求值为 truthy/falsy
  then: ActionDef[];          // 条件为真时执行
  else?: ActionDef[];         // 条件为假时执行（可选）
}

// 多分支（语法糖，等价于嵌套 if-else）
interface LogicSwitchAction {
  type: 'logic.switch';
  cases: Array<{
    when: string;             // {{ }} 表达式
    actions: ActionDef[];
  }>;
  default?: ActionDef[];      // 所有 case 不满足时执行
}
```

#### 使用示例（表单校验）

```json
{
  "trigger": "click",
  "actions": [
    {
      "type": "logic.switch",
      "cases": [
        {
          "when": "{{ state.view.phone === '' }}",
          "actions": [
            { "type": "state.set", "path": "view.errorMsg", "value": "请输入手机号" }
          ]
        },
        {
          "when": "{{ state.view.phone.length !== 11 }}",
          "actions": [
            { "type": "state.set", "path": "view.errorMsg", "value": "请输入正确的手机号" }
          ]
        },
        {
          "when": "{{ state.view.loginMode === 'code' && state.view.code === '' }}",
          "actions": [
            { "type": "state.set", "path": "view.errorMsg", "value": "请输入验证码" }
          ]
        }
      ],
      "default": [
        { "type": "state.set", "path": "view.errorMsg", "value": "" },
        { "type": "state.set", "path": "view.submitState", "value": "submitting" },
        { "type": "node.setVisualState", "stateName": "loading" }
      ]
    }
  ]
}
```

#### 实现要点

```
1. ActionRunner 中新增 logic.if / logic.switch 分支
2. 复用已有的 compileExpression / resolveExpression 求值
3. then/else/actions 中的 actions 递归调用 ActionRunner
4. 嵌套深度建议限制在 3 层以内（防止无限递归）
```

---

## 四、P2-3: Delay Action

### 需求场景

```
登录成功后:
  1. 按钮变绿 + 显示 ✓（立即）
  2. 等 500ms
  3. 跳转到首页
```

### 设计方案

```typescript
interface DelayAction {
  type: 'ui.delay';
  duration: number;       // 毫秒
  then: ActionDef[];      // 延迟结束后执行
}
```

#### 使用示例

```json
{
  "trigger": "click",
  "actions": [
    { "type": "state.set", "path": "view.submitState", "value": "success" },
    { "type": "node.setVisualState", "stateName": "success" },
    {
      "type": "ui.delay",
      "duration": 500,
      "then": [
        { "type": "nav.go", "target": "01-home-map" }
      ]
    }
  ]
}
```

#### 实现要点

```
同 timer 一样:
  - setTimeout 包装
  - 页面卸载时清理
  - then 中的 actions 递归执行
```

---

## 五、P2-4: state.set 支持表达式（增强）

### 需求场景

```
定时器 onTick 中需要: countdown = countdown - 1
当前 state.set 只支持固定 value，不支持基于当前值计算
```

### 设计方案

扩展 `state.set` action 的 value 字段：

```typescript
interface StateSetAction {
  type: 'state.set';
  path: string;
  value?: unknown;           // 固定值（现有行为）
  expression?: string;       // {{ }} 表达式，求值后作为新值（新增）
}
```

当 `expression` 存在时，忽略 `value`，用表达式求值结果作为新值：

```json
{ "type": "state.set", "path": "view.countdown", "expression": "{{ state.view.countdown - 1 }}" }
```

#### 实现要点

```
在 ActionRunner 的 state.set 分支中:
  if (action.expression) {
    const newValue = resolveExpression(action.expression, currentDataContext);
    setState(action.path, newValue);
  } else {
    setState(action.path, action.value);
  }
```

---

## 六、实现路线图

### 第一批（1-2 天）— 解决最高频场景

```
[P2-2] logic.if / logic.switch → 表单校验、条件导航
[P2-5] state.set expression → 计算型状态更新
```

**理由**: 条件判断是最基本的交互能力，几乎所有页面都需要。且实现最简单（同步递归调用 ActionRunner）。

### 第二批（2-3 天）— 解决时间相关场景

```
[P2-1] ui.startTimer / ui.stopTimer → 倒计时
[P2-3] ui.delay → 延迟跳转、动画序列
```

**理由**: 需要异步机制（setTimeout/setInterval）和页面生命周期管理（清理 timer），稍复杂。

### 第三批（可选，1 周）— 高级组件

```
[P2-4] OTP input 复合组件 → 验证码输入
```

**理由**: 需要组件系统支持，工作量最大。可用 6 个 input + 表达式 workaround 临时替代。

---

## 七、技术架构影响

### ActionRunner 改造

当前 ActionRunner 是同步顺序执行 actions 数组：

```typescript
// 伪代码 - 当前
function runActions(actions: ActionDef[], ctx: DataContext) {
  for (const action of actions) {
    switch (action.type) {
      case 'state.set': handleStateSet(action, ctx); break;
      case 'nav.go': handleNavGo(action); break;
      case 'node.setVisualState': handleSetVisualState(action); break;
      // ...
    }
  }
}
```

改造后需要支持：
1. **递归执行**: logic.if/switch 的 then/else 中的 actions 需要递归调用 runActions
2. **异步执行**: timer/delay 的 callback 需要在 setTimeout/setInterval 中调用 runActions
3. **生命周期管理**: timer 注册到 screen 级别的 cleanup 集合

```typescript
// 伪代码 - 改造后
function runActions(actions: ActionDef[], ctx: DataContext, cleanup: CleanupSet) {
  for (const action of actions) {
    switch (action.type) {
      case 'state.set': {
        const value = action.expression 
          ? resolveExpression(action.expression, ctx) 
          : action.value;
        handleStateSet(action.path, value, ctx);
        break;
      }
      case 'logic.if': {
        const result = resolveExpression(action.condition, ctx);
        if (result) {
          runActions(action.then, ctx, cleanup);
        } else if (action.else) {
          runActions(action.else, ctx, cleanup);
        }
        break;
      }
      case 'logic.switch': {
        let matched = false;
        for (const c of action.cases) {
          if (resolveExpression(c.when, ctx)) {
            runActions(c.actions, ctx, cleanup);
            matched = true;
            break;
          }
        }
        if (!matched && action.default) {
          runActions(action.default, ctx, cleanup);
        }
        break;
      }
      case 'ui.delay': {
        const id = setTimeout(() => runActions(action.then, ctx, cleanup), action.duration);
        cleanup.add(() => clearTimeout(id));
        break;
      }
      case 'ui.startTimer': {
        let count = 0;
        const id = setInterval(() => {
          runActions(action.onTick, ctx, cleanup);
          count++;
          if (action.count && count >= action.count) {
            clearInterval(id);
            cleanup.delete(clearFn);
            if (action.onComplete) runActions(action.onComplete, ctx, cleanup);
          }
        }, action.interval);
        const clearFn = () => clearInterval(id);
        cleanup.add(clearFn);
        break;
      }
      case 'ui.stopTimer': {
        // 通过 timerId 查找并清理
        timerRegistry.get(action.timerId)?.();
        break;
      }
      // ... 其他 action 类型保持不变
    }
  }
}
```

### Schema 类型扩展

在 `design-schema` 的 action 类型定义中新增：

```typescript
// features/design-schema/src/types/action.ts

export type ActionDef =
  | StateSetAction
  | StateAppendAction
  | StateRemoveAction
  | StateMergeAction
  | StateToggleAction
  | EffectFetchAction
  | EffectCancelAction
  | NavGoAction
  | NavBackAction
  | NodeSetVisualStateAction
  | UiShowToastAction
  | UiOpenUrlAction
  | UiDelayAction          // 新增
  | UiStartTimerAction     // 新增
  | UiStopTimerAction      // 新增
  | LogicIfAction          // 新增
  | LogicSwitchAction      // 新增
  | CustomAction;

// 新增的 action interfaces
export interface UiDelayAction {
  type: 'ui.delay';
  duration: number;
  then: ActionDef[];
}

export interface UiStartTimerAction {
  type: 'ui.startTimer';
  timerId: string;
  interval: number;
  count?: number;
  onTick: ActionDef[];
  onComplete?: ActionDef[];
}

export interface UiStopTimerAction {
  type: 'ui.stopTimer';
  timerId: string;
}

export interface LogicIfAction {
  type: 'logic.if';
  condition: string;
  then: ActionDef[];
  else?: ActionDef[];
}

export interface LogicSwitchAction {
  type: 'logic.switch';
  cases: Array<{ when: string; actions: ActionDef[] }>;
  default?: ActionDef[];
}

// state.set 扩展
export interface StateSetAction {
  type: 'state.set';
  path: string;
  value?: unknown;
  expression?: string;  // 新增：表达式求值后作为新值
}
```

### MCP 工具层适配

`event/add_event` 的 schema 需要支持新的 action types。当前 MCP 层可能对 actions 做了 validate：
- 需确认是否有 action type 白名单
- 如有，增加新类型到白名单

---

## 八、验收标准

### P2-2 (logic.if/switch) 验收

```
场景: 登录按钮点击
  输入为空 → errorMsg 显示"请输入手机号"
  输入 5 位 → errorMsg 显示"请输入正确的手机号"
  输入 11 位 → errorMsg 清空 + submitState 变 "submitting"
```

### P2-1 (timer) 验收

```
场景: 获取验证码按钮点击
  点击后: 按钮 disabled + 文案变 "60s"
  每秒: 文案 59s → 58s → ... → 1s
  60s 后: 按钮恢复 default + 文案变 "获取验证码"
  中途切页: timer 自动停止，无内存泄漏
```

### P2-3 (delay) 验收

```
场景: 登录成功
  立即: 按钮变绿 + 显示 ✓
  500ms 后: 自动跳转到 home 页
```

---

## 九、风险与注意事项

| 风险 | 应对 |
|------|------|
| Timer 内存泄漏 | 页面 exit 时强制 cleanup 所有 timer |
| 递归 actions 无限循环 | 设置最大递归深度（3层）+ 单次 event 最大 action 数量（50） |
| 表达式求值错误 | try-catch 包裹 resolveExpression，错误时跳过该 action 并 console.warn |
| 异步 action 中 state 过期 | timer callback 中重新获取最新 dataContext（不缓存旧引用） |
| MCP 层 action 白名单 | 检查并更新 event/add_event 的 validation 逻辑 |
