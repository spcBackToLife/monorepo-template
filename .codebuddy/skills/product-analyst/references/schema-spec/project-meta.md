# 项目级 Schema 字段规范（DesignProject / ProjectMeta）

## 字段总览

```jsonc
project = {
  id, name, platform,
  meta: {
    targetUser:     { summary },                    // §1
    coreScenarios:  [{ id, summary }],              // §1
    styleDirection: { summary },                    // §1
    constraints: {
      decisions: [{ id, summary }]                  // §2
    },
    modules: {                                      // §3
      M1: { name, priority: "P0|P1|P2|P3", summary }
    },
    navigation: {                                   // §4
      tabBar: ["screenId1", "screenId2", ...],
      flows:  [{ from, to, trigger, transition }]
    },
    globalConcerns: {                               // §5 ★
      session?:     { summary, ref? },
      network?:     { summary, ref? },
      preferences?: { summary, ref? },
      navigation?:  { summary, ref? },
      fallback?:    { summary, ref? }
    },
    plan: PlanTask[]                                // §6
  },
  globalStateInit: {                                // §7 ★
    view: Record<string, ViewVariableDef>
  },
  globalOverlays: OverlayNode[],                    // §8 ★ 详见 global-concerns.md
  screens: Screen[]                                 // 通过 screen/add 创建
}
```

## §1. 用户 / 场景 / 风格方向

```jsonc
// MCP: meta/set_project
meta/set_project {
  projectId,
  patch: {
    targetUser:    { summary: "Primary 用户分层 + Secondary 用户分层（年龄/职业/场景/痛点）" },
    coreScenarios: [
      { id: "S1", summary: "高频场景：通勤路上刷信息流，弱网环境..." },
      { id: "S2", summary: "中频场景：晚上睡前发动态，Wi-Fi 环境..." }
    ],
    styleDirection: { summary: "青春治愈 + 学院温暖（草莓粉 / 薄荷绿 / 奶油黄）" }
  }
}
```

**红线**：`styleDirection.summary` 必须非空（喂给 theme-generator）。

## §2. 关键决策

```jsonc
constraints: {
  decisions: [
    { id: "D1", summary: "本期不做第三方授权——理由：覆盖率不够 + 多一步获取手机号" },
    { id: "D2", summary: "登录方式做手机号免密 + 密码两种，覆盖 90%+ 场景" }
  ]
}
```

每个关键决策对应一份 md：`analysis-notes/<projectId>/decisions/<Dx>-*.md`。

## §3. 模块清单

```jsonc
modules: {
  M1: { name: "用户认证",   priority: "P0", summary: "..." },
  M2: { name: "内容浏览",   priority: "P0", summary: "..." },
  M3: { name: "通知中心",   priority: "P1", summary: "(主动挖掘) 社交类必有..." }
}
```

**红线**：所有 P0 / P1 模块必须列出，含 AI 主动挖掘的隐含模块。

## §4. 导航

```jsonc
navigation: {
  tabBar: ["01-home", "02-discover", "10-profile-self"],   // 一级导航
  flows: [
    { from: "00-login", to: "01-home",            trigger: "登录成功", transition: "fade" },
    { from: "00-login", to: "00-register",        trigger: "点击注册", transition: "push" },
    { from: "00-login", to: "00-forgot-password", trigger: "点击忘记", transition: "push" }
  ]
}
```

## §5. globalConcerns（5 类全局态叙事）★

详见 `global-concerns.md`。

**红线 R-PRODUCT-04**：缺 `meta.globalConcerns` 5 类齐声 → 失败。

## §6. plan 任务清单

```jsonc
// MCP: meta/add_plan_tasks { scope: 'project', tasks: [...] }
{
  id: "M1-stories",        // 任务 ID（唯一）
  title: "...",
  stage: "product",
  status: "pending",       // pending | doing | done | blocked | skipped
  refs: ["module:M1"],     // 关联资源
  subtasks: [...]          // 嵌套子任务
}
```

## §7. globalStateInit.view（跨屏共享变量）

详见 `global-concerns.md` + `state-and-datasource.md`。

**红线 R-PRODUCT-05**：缺必要的 `globalStateInit.view.session/network` 等 → 失败。

## §8. globalOverlays（项目级覆盖层骨架）★

详见 `global-concerns.md`。

## screenId 命名规范

`<二级前缀>-<功能英文短名>`：
- `00-splash` / `00-onboarding` / `00-login` / `00-register` / `00-forgot-password`
- `01-home-map` / `02-fishing-cast` / `06-conversation-list` / `10-profile-self`

前缀 `00` 是无 tab 状态前的入口流，`01-09` 是 tabBar 内屏，`10+` 是个人 / 设置流。

## deep-merge 行为

- **对象字段（如 modules）真 merge**：加新 module 不覆盖旧的
- **数组字段整体替换**：追加 coreScenarios 时要把已有的一起带上
