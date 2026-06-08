> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-overlays
> 对应 schema 字段：屏级 overlays（当前阶段用 visibleWhen 节点 + view 变量替代实现）

# Step I-overlays: <屏名> — 屏级 overlays

> 详细方法见 `methodology/07-derivative-views.md` 类 7。
> 详细 schema 见 `schema-spec/overlays.md`。

## 推理过程

### 1. 适用性判定

| overlay 类型 | 是否需要 | 实现方式 | 控制变量 |
|------------|---------|---------|---------|
| modal（如忘记密码 / 确认对话框）| ✅/❌ | visibleWhen 节点 | view.forgotModalOpen |
| bottomSheet（如锁定提示 / 操作菜单）| ✅/❌ | visibleWhen 节点 | view.lockedSheetOpen / 或 showWhen 表达式 |
| drawer（如侧边导航 / 筛选抽屉）| ✅/❌ | visibleWhen 节点 | view.drawerOpen |

### 2. 实现方式选择（当前阶段统一用 visibleWhen 节点）

> ⚠️ schema 类型层有 `Screen.overlays[]`，但当前 op 链路待完善。当前阶段用 visibleWhen 节点替代屏级 overlays。

```
1. state/view_add 注册控制变量：view.<xxxOpen>
2. element/insert_subtree 创建 modal 容器（fixed 定位 + 蒙层）
3. element/set_visible_when 绑定可见
4. 触发开关：state.set view.<xxxOpen> = true/false
5. 蒙层节点 click 关闭：state.set view.<xxxOpen> = false
```

### 3. 候选方案与否决

- 候选 A：用 ui.showOverlay / hideOverlay action（命令式）→ 当前 op 待实装，否决
- 候选 B：让用户自己叉关闭 → 否决：必须支持"点蒙层关闭"
- ...

### 4. 模态本身的 events 设计（关闭路径）

| 触发节点 | 关闭方式 |
|---------|---------|
| 关闭 X 按钮 | event.click → state.set view.<xxxOpen> = false |
| 蒙层（容器外）| event.click → state.set view.<xxxOpen> = false |
| 取消按钮 | event.click → state.set view.<xxxOpen> = false |
| 确认按钮 | event.click → 业务 actions + state.set view.<xxxOpen> = false |

---

## ★ 沉淀到 schema 的结论

```jsonc
// 例：忘记密码 modal

// 1) 注册控制变量
state/view_add {
  projectId, screenId,
  variable: { name: "forgotModalOpen", label: "忘记密码 modal 开关", defaultValue: false }
}

// 2) 创建 modal 容器
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "forgotPasswordModal", type: "div", name: "ForgotPasswordModal",
    styles: {}, props: {},
    children: [
      { id: "fpBackdrop", type: "div", name: "ForgotModalBackdrop",
        events: [{
          trigger: "click",
          description: "点蒙层关闭",
          actions: [{ type: "state.set", path: "view.forgotModalOpen", value: false }]
        }],
        styles: {}, props: {}, children: [],
        states: [], activeState: "default", locked: false, visible: true },
      { id: "fpContent", type: "div", name: "ForgotModalContent",
        styles: {}, props: {},
        children: [
          { id: "fpTitle", type: "div", name: "ForgotModalTitle",
            styles: {}, props: { textContent: "找回密码" }, children: [],
            states: [], events: [], activeState: "default", locked: false, visible: true },
          { id: "fpInput", type: "input", name: "ForgotPhoneInput",
            styles: {}, props: { placeholder: "请输入注册时的手机号" },
            bind: { path: "view.forgotPhone" },
            children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
          { id: "fpSubmit", type: "button", name: "ForgotSubmitBtn",
            styles: {}, props: { textContent: "发送找回链接" },
            events: [{
              trigger: "click",
              description: "提交找回密码请求",
              actions: [
                { type: "effect.fetch", dataSourceId: "ds-forgot",
                  params: { phone: "{{view.forgotPhone}}" },
                  onSuccess: [
                    { type: "ui.showToast", toastType: "success", message: "找回链接已发送" },
                    { type: "state.set", path: "view.forgotModalOpen", value: false }
                  ],
                  onError: [
                    { type: "ui.showToast", toastType: "error", message: "{{$last.error.message}}" }
                  ]
                }
              ]
            }],
            children: [], states: [], activeState: "default", locked: false, visible: true },
          { id: "fpClose", type: "button", name: "ForgotCloseBtn",
            styles: {}, props: { textContent: "取消" },
            events: [{
              trigger: "click",
              description: "关闭 modal",
              actions: [{ type: "state.set", path: "view.forgotModalOpen", value: false }]
            }],
            children: [], states: [], activeState: "default", locked: false, visible: true }
        ],
        states: [], events: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

// 3) 绑定 visibleWhen
element/set_visible_when {
  projectId, nodeId: "forgotPasswordModal",
  visibleWhen: "{{ state.view.forgotModalOpen }}"
}

// 4) meta
meta/set_node {
  projectId, nodeId: "forgotPasswordModal",
  patch: {
    interaction: {
      summary: "忘记密码 modal：输入手机号 + 发送找回链接",
      states: ["showing","hidden"]
    }
  }
}
```

> 如本屏无 modal/sheet/drawer 需求，本任务可 skipped。
