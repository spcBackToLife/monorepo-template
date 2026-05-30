# 屏幕级 Schema 字段规范（Screen / ScreenMeta）

## 字段总览

```jsonc
screen = {
  id,                                  // 通过 screen/add 创建
  name,                                // 中文名
  // ⛔ backgroundColor 留给 design
  rootNode: ComponentNode,             // 业务骨架（详见 node-skeleton.md）
  // ⛔ overlays 留给 interaction（screen 级）
  stateInit: {                         // 详见 state-and-datasource.md
    view: Record<string, ViewVariableDef>,
    data: Record<string, unknown>,
    dataTypes: Record<string, TypeDef>
  },
  dataSources: DataSource[],           // 详见 state-and-datasource.md
  meta: {
    product: {                         // §1 本阶段写
      summary, fromModules[], rules[]
    },
    // ⛔ interaction / design / status 留给下游
    plan: PlanTask[],                  // §2 屏级任务清单
    status: { phase: "analyzed" }      // §3 阶段收尾打
  }
}
```

## §1. ScreenMeta.product

```jsonc
// MCP: meta/set_screen
meta/set_screen {
  projectId, screenId,
  patch: {
    product: {
      summary: "...该屏一句话定位（含主线流程浓缩）...",
      fromModules: ["M1", "M5"],         // 哪些模块汇聚到本屏
      rules: [                           // ★ 必须 ≥ 4 条（4 类齐）
        "数据规则: 手机号 11 位中国大陆号段；验证码 6 位数字；密码 6-20 位含字母+数字；协议必勾",
        "业务规则: 失败状态机——view.failureCount 累加；≥ 5 触发 view.lockedUntil = now()+30min",
        "安全规则: 验证码同号 60s 冷却，当日 ≤ 10 次；密码错 ≥ 5 次锁定 30 分钟",
        "边界 Case: 提交 800ms 防抖；view.submitting 守卫；screenExit 时 cancel fetch"
      ]
    }
  }
}
```

## §2. 屏级 plan

```jsonc
// MCP: meta/add_plan_tasks { scope: 'screen', screenId, tasks: [...] }
[
  { id: "M1-stories",     title: "...", stage: "product", status: "pending" },
  { id: "M1-flows",       ... },
  { id: "M1-rules",       ... },
  { id: "M1-data",        ... },
  { id: "M1-skeleton",    ... },
  { id: "M1-state-shape", ... },
  { id: "M1-coverage",    ... },
  { id: "M1-integrity",   ... }
]
```

## §3. 阶段收尾

跑完该屏所有任务、coverage 三轴通过、integrity 0 错后：

```jsonc
meta/set_screen {
  projectId, screenId,
  patch: { status: { phase: "analyzed" } }
}
```

## 红线汇总

| 红线 | 触发条件 |
|------|---------|
| **R-PRODUCT-01** | `meta.product.rules` < 4 条或四类未齐 |
| **R-PRODUCT-02** | 任一节点 `meta.product.summary` 缺失 |
| **R-PRODUCT-03** | 屏识别了业务状态机但 rules 没显式枚举状态字段 + 值 |
| **R-STRUCTURE-01** | 屏 phase ≥ interaction-defined 但 `rootNode.children` ≤ 1 |
