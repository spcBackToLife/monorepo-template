> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-<screenId>-view-auth
> 对应 schema 字段：rootNode.children 追加权限态节点 + visibleWhen + meta.interaction

# Step I-view-auth: <屏名> — 权限/身份态视图

> 详细方法见 `methodology/07-derivative-views.md` 类 4。
> 详细 schema 见 `schema-spec/derivative-views.md` §4。

## 推理过程

### 1. 适用性判定

| 身份场景 | 是否需要 | 节点 name | visibleWhen |
|---------|---------|----------|-------------|
| 未登录占位 | ✅/❌ | NotLoggedInPlaceholder | `{{ globalView.session.status === 'anonymous' \|\| !globalView.session.user }}` |
| 游客横幅 | ✅/❌ | GuestModeBanner | `{{ globalView.session.user?.isGuest }}` |
| VIP 升级提示 | ✅/❌ | VipUpgradePrompt | `{{ !globalView.session.user?.isVip && state.data.contentType === 'premium' }}` |
| 实名认证提示 | ✅/❌ | RealNameRequiredView | `{{ !globalView.session.user?.realNameVerified }}` |

### 2. 节点设计要点

- **保留页面信息架构**（如 nav-bar / 标题），仅核心内容区替换为"登录引导"
- **不要全屏遮罩**（用户会迷失）
- **CTA 行为**：点击 → 写 globalView.nav.authRedirectTo（保留来源）→ nav.go 登录页

### 3. 候选方案与否决

- 候选 A：未登录直接跳登录页 → 否决：用户从分享链接进来会被强制弹走，体验差
- 候选 B：未登录全屏遮罩 → 否决：用户看不到本页内容
- ...

---

## ★ 沉淀到 schema 的结论

```jsonc
element/insert_subtree {
  projectId, parentId: <screen.rootNode.id>,
  subtree: {
    id: "notLoggedInPlaceholder", type: "div", name: "NotLoggedInPlaceholder",
    visibleWhen: "{{ globalView.session.status === 'anonymous' || !globalView.session.user }}",
    styles: {}, props: {},
    children: [
      { id: "loginIcon",  type: "div",    name: "LoginIllustration",
        styles: {}, props: {}, children: [], states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "loginTitle", type: "div",    name: "LoginPromptTitle",
        styles: {}, props: { textContent: "登录后查看你的动态" }, children: [],
        states: [], events: [], activeState: "default", locked: false, visible: true },
      { id: "loginCta",   type: "button", name: "GoLoginButton",
        styles: {}, props: { textContent: "去登录" },
        events: [{
          trigger: "click",
          description: "跳登录页（保留来源）",
          actions: [
            { type: "state.set", path: "globalView.nav.authRedirectTo",
              value: "{{state.view.currentScreenId}}" },
            { type: "nav.go", targetScreenId: "00-login" }
          ]
        }],
        children: [], states: [], activeState: "default", locked: false, visible: true }
    ],
    states: [], events: [], activeState: "default", locked: false, visible: true
  }
}

meta/set_node {
  projectId, nodeId: "notLoggedInPlaceholder",
  patch: {
    interaction: {
      summary: "未登录占位 + 引导登录 CTA + 保留来源",
      states: ["showing","hidden"]
    }
  }
}
```

> 如本屏不依赖登录状态（如登录页 / 公开内容页），本任务可 skipped。
