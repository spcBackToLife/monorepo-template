# schema-spec：VisualState 完整字段

> 适用任务：`D-X-states`、`D-global-overlay-states`

## 1. VisualState 完整字段

```typescript
interface VisualState {
  /** 状态名（必填） */
  name: string;                // "default" | "hover" | "pressed" | "focus" | "disabled" | "loading" | "error" | "<custom>"

  /** 该状态下的 styles 覆写（与 default 的差异） */
  styles?: Partial<NodeStyles>;

  /** 自动激活表达式（不需要 events 触发） */
  activeWhen?: string;          // "{{!!state.view.errors.phone}}"

  /** 子节点状态联动 */
  childrenStates?: Record<string, string>;
                                // { "phoneInput": "disabled", "submitBtn": "loading" }

  /** 子节点显隐联动 */
  childrenVisibility?: Record<string, boolean>;
                                // { "submitSpinner": true, "submitText": false }

  /** 此状态禁用的事件 */
  disabledEvents?: string[];    // ["click", "change"]

  /** 状态切换过渡 */
  transition?: {
    duration: number;            // ms
    easing: string;              // "ease-out" | "spring" | "cubic-bezier(...)"
  };
}
```

**MCP**：
```jsonc
visual_state/add {
  projectId, nodeId,
  name: "hover",
  styles: { ... },
  transition: { duration: 150, easing: "ease-out" }
}

visual_state/update {
  projectId, nodeId, name,
  patch: { styles: { ... } }
}

visual_state/reset_style {        // 删除某属性
  projectId, nodeId, name,
  properties: ["backgroundColor"]
}
```

## 2. 标准 visualStates 示例

### 按钮 6 态（最低门槛 ≥ 4）

```jsonc
n9 (SubmitBtn).states = [
  {
    name: "default",
    styles: {},                          // default 不需要重复，留空
    transition: { duration: 200, easing: "spring" }
  },
  {
    name: "hover",
    styles: {
      backgroundColor: "$token:colors.primaryHover",
      boxShadow: "$token:shadows.md",
      transform: "translateY(-1px)"
    },
    transition: { duration: 150, easing: "ease-out" }
  },
  {
    name: "pressed",
    styles: {
      backgroundColor: "$token:colors.primaryActive",
      boxShadow: "$token:shadows.xs",
      transform: "translateY(0)"
    },
    transition: { duration: 80, easing: "ease-in" }
  },
  {
    name: "focus",
    styles: {
      boxShadow: "0 0 0 3px $token:colors.primaryLight"
    },
    transition: { duration: 150, easing: "ease-out" }
  },
  {
    name: "disabled",
    styles: {
      backgroundColor: "$token:colors.gray400",
      boxShadow: "none",
      cursor: "not-allowed",
      opacity: 0.6
    },
    disabledEvents: ["click"]            // ★ 此态禁用 click
  },
  {
    name: "loading",
    styles: {
      backgroundColor: "$token:colors.primary",
      cursor: "wait",
      opacity: 0.9
    },
    childrenVisibility: {                // ★ 显示 Spinner、隐藏 text
      "submitSpinner": true,
      "submitText":    false
    },
    disabledEvents: ["click"]
  },
  // ★ 自动激活（loginMode 切换时按钮文案变）
  {
    name: "code-mode",
    activeWhen: "{{state.view.loginMode === 'code'}}",
    styles: {}                            // 文案差异由 props.textContent 表达式驱动
  }
]
```

### 输入框 5 态（最低门槛 ≥ 3）

```jsonc
n6 (PhoneInput).states = [
  { name: "default", styles: {} },
  { name: "hover",   styles: { borderColor: "$token:colors.borderStrong" } },
  {
    name: "focus",
    styles: {
      borderColor: "$token:colors.primary",
      boxShadow: "0 0 0 3px $token:colors.primaryLight"
    },
    transition: { duration: 150, easing: "ease-out" }
  },
  {
    name: "error",
    activeWhen: "{{!!state.view.errors.phone}}",     // 自动激活
    styles: {
      borderColor: "$token:colors.error",
      backgroundColor: "rgba(237,90,90,0.05)"
    }
  },
  {
    name: "disabled",
    styles: { opacity: 0.5, cursor: "not-allowed" },
    disabledEvents: ["change","focus"]
  }
]
```

### 容器（FormCard）父态联动子态

```jsonc
n4 (FormCard).states = [
  { name: "default", styles: {} },
  {
    name: "loading",
    activeWhen: "{{state.view.submitting}}",
    styles: { opacity: 0.7, pointerEvents: "none" },
    childrenStates: {
      "phoneInput":      "disabled",
      "credentialInput": "disabled",
      "modeToggle":      "disabled",
      "submitBtn":       "loading"
    }
  }
]
```

## 3. node.activeState（默认激活态）

```jsonc
n9.activeState = "default"      // 默认显示哪个态（编辑画布 + 运行时初始）
```

通常写 `"default"`；运行时由 `node.setVisualState` action 切换；自动态由 `activeWhen` 驱动。

## 4. activeWhen 表达式规范

```jsonc
// ✅ 正确
activeWhen: "{{!!state.view.errors.phone}}"
activeWhen: "{{state.view.loginMode === 'code'}}"
activeWhen: "{{state.view.failureCount >= 5}}"
activeWhen: "{{state.data.order.status === 'pending_payment'}}"

// ❌ 错误（语法不合规）
activeWhen: "errors.phone is truthy"           // 自然语言不可
activeWhen: "{{ Date.now() > x }}"              // ★ Expression Lang v1.0：用 $.now() 不用 Date.now()
activeWhen: "{{ /\\d+/.test(phone) }}"         // 正则需按 spec.json 支持的语法
```

详见 `../../common/references/expression-language-cheatsheet.md`。

## 5. childrenStates / childrenVisibility 用法

### childrenStates：子节点切到指定态
```jsonc
// 父 FormCard.loading → 子输入框全 disabled, 子按钮 loading
{
  name: "loading",
  childrenStates: {
    "<phoneInput-id>":      "disabled",
    "<credentialInput-id>": "disabled",
    "<submitBtn-id>":       "loading"
  }
}
```

### childrenVisibility：子节点显隐
```jsonc
// 父按钮.loading → 显示 spinner 子，隐藏 text 子
{
  name: "loading",
  childrenVisibility: {
    "<submitSpinner-id>": true,
    "<submitText-id>":    false
  }
}
```

**注意**：键是子节点的 `id`，不是 name；建议在 md 中加注释说明对应哪个节点。

## 6. disabledEvents

```jsonc
{
  name: "disabled",
  disabledEvents: ["click", "change", "focus"]
}

{
  name: "loading",
  disabledEvents: ["click"]    // 防重复提交
}
```

**用途**：避免在 disabled / loading 时仍触发副作用。

## 7. transition 时长 / 缓动决策

| 切换 | duration | easing | 理由 |
|------|---------|--------|------|
| default → hover | 150ms / `$token:transitions.fast` | ease-out / `` | 快速友好 |
| hover → pressed | 80ms / `$token:transitions.fast` | ease-in / `` | 按下要快 |
| → focus | 150ms / `$token:transitions.fast` | ease-out | 与 hover 一致 |
| → disabled | 200ms / `$token:transitions.normal` | ease-in-out | 平滑灰化 |
| → loading | 200ms / `$token:transitions.normal` | ease-out | 启动动画 |
| 业务态 / 自动激活态 | 250-400ms / `$token:transitions.normal~slow` | spring / ease-out | 较大变化要平滑 |

**红线**：transition 缺失 → 状态切换"瞬间跳变"，体验生硬

## 8. 红线

- ❌ 按钮缺 disabled 或 pressed → R-VISUALSTATE-01
- ❌ 输入框缺 focus 或 error → R-VISUALSTATE-01
- ❌ "hover 留给 executor 补" → 一次到位
- ❌ disabled 态没 disabledEvents → 用户仍可触发逻辑
- ❌ loading 态没 childrenVisibility 切换 spinner/text
- ❌ activeWhen 语法不合 expression-language v1.0 spec
- ❌ visualState styles 用硬编码值（必须 token 引用，遵循 node-styles 规则）
- ❌ transition 缺失 / 时长不合理（< 50ms 或 > 800ms）
- ❌ childrenStates 引用的子节点不存在 → 运行时报错
