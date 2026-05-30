> 这是【对挑战的官方决策】md。
> 详细协议：`STAGE-CONTRACT.md` §0.1.9。

# D-C-INT-00-login-001: 接受 wrap Root 三节点为 NormalFormView 容器

**本表元数据**：

| 字段 | 值 |
|------|---|
| 对应 challenge | C-INT-00-login-001 |
| 决策状态 | **accepted** |
| 决策 SKILL | product-analyst |
| 决策时间 | 2026-05-30T22:30:00 |

---

## 1. 决策

**accepted**

按下游推荐方案 B：执行 `element/wrap [HeaderArea, FormCard, FooterLinks] → NormalFormView` 容器；LockedView 子树由 interaction-designer 在续做时落库（不在本次 product 改动范围）。

---

## 2. 理由（产品视角，多角度论证）

### 2.1 业务规则一致性视角

product rules 第 3 条已显式定义账号锁定状态机：「连续 ≥5 触发 view.lockedUntil = now()+30min 进入锁定」——这是 product 阶段就承认的**业务对象状态机**（属于 methodology/07 类 5 业务状态分支视图的标准触发条件）。

但当时 M1-skeleton 任务只关注"正常态"业务节点骨架，**没有预见**业务状态机会要求"整表单 → LockedView 互斥切换"——这不是产品决策错误，而是**产品决策不完整**。本 challenge 是把这个不完整的"容器划分"决策补上，与已有 rules 完全一致，不是引入新设计。

### 2.2 用户体验视角

锁定中用户看到**专属布局**（图示 + 倒计时 + 提示 + 重置密码出口）是"暂时被惩罚"的安抚 UX，**不是**"功能不可用"的报错 UX。这种心理差异要求两套独立子树——把表单"灰色蒙版化"会让用户产生"是不是按错了哪里"的困惑。

### 2.3 设计契约稳定性视角

现有 M1-skeleton 任务的产物指纹声明（无显式 expectedArtifacts，老任务）+ 已 done 的 12 个下游任务全部不引用"Root.children 的具体扁平排列方式"——只引用节点名 / nodeId。`element/wrap` 不改 nodeId，下游引用全部稳定。

### 2.4 可维护性视角

DRY：unlocked 表达式只需写一处（NormalFormView.visibleWhen）。后续业务规则演进（如加"账号被风控"、"账号待激活"）只需扩展 enum + 增加视图节点，不需要在 N 个节点间散挂同一条表达式。

### 2.5 跨阶段协同视角

interaction / design / executor 三阶段都将受益：
- interaction：visibleWhen 表达式集中
- design：visualState 锁定到独立子树，避免散在多个节点
- executor：素材应用范围明确

### 2.6 风险评估

| 风险 | 评估 |
|------|------|
| element/wrap 是否破坏下游 events | ❌ 不会，节点 ID 不变 |
| 是否破坏现有 expectedArtifacts | ❌ 不会，详见 §3.3 |
| 用户感知断裂 | ❌ 容器是不可见 div；DOM 多一层 wrapper，CSS 影响可控（design 阶段处理） |
| 决策是否可逆 | ✓ element/unwrap 可恢复 |

---

## 3. 实施

### 3.1 改的 schema（MCP 调用清单）

product-analyst 阶段的允许 MCP 中，`element/wrap` 是骨架级操作，正好属本阶段权限。

| # | MCP 调用 | 参数 | 影响 |
|---|---------|------|-----|
| 1 | `element/wrap` | parentId=`nd_6a7f2492b59b4e7eab7e1` (Root), ids=[`nd_451ec7c1336d478a810d9` (HeaderArea), `nd_e60fb832933f4b86a6638` (FormCard), `nd_c04451d9d8f243489f1c1` (FooterLinks)], wrapperName="NormalFormView", wrapperLabel="正常表单子树" | 新增 NormalFormView 容器，原三节点变为其 children |
| 2 | `meta/set_node` | nodeId=`<NormalFormView 新生成的 id>`, patch={ product: { summary: "正常态业务子树（账号未锁定时可见）；包含品牌/表单/底部链接三段；与 LockedView 互斥；visibleWhen 由 interaction 阶段挂", fromModules: ["M1"] } } | 补 product.summary 让节点叙事完整 |

⚠️ NormalFormView 的 `visibleWhen` 表达式 + LockedView 子树由 interaction-designer 在续做时建（不在本 product 改动范围）。

### 3.2 同步更新的上游 task notes

| taskId | 补丁说明 |
|--------|---------|
| M1-skeleton | "(2026-05-30 challenge C-INT-00-login-001 accepted) Root.children 结构补充：原 [HeaderArea, FormCard, FooterLinks] 三节点已包入 NormalFormView 容器（element/wrap）；LockedView 兄弟节点由 I-M1-view-business 续做时建。变更动机：账号锁定状态机要求"整表单 ↔ LockedView 互斥切换"，本次补足业务状态分支视图的容器划分。详见 challenge md 与 decision md。" |

### 3.3 expectedArtifacts 影响

- **M1-skeleton 现状**：无显式 expectedArtifacts（v2.2 之前的老任务）
- **本次 accept 后**：建议追加产物指纹 `{ kind: 'arrayMin', path: 'rootNode.children', min: 2 }`（弱版本，仅校 children 至少有正常子树占位 + 锁定子树占位）——但 LockedView 由 interaction 建，故不能在本 resolve 时强校 min:2。
- **决策**：本次**不改 expectedArtifacts**——R-CHALLENGE-03 重对账：M1-skeleton 无指纹声明 → 自动通过；其他下游 task 的指纹（`stateInit.view`、`dataSources`、`globalStateInit.view`、`globalOverlays`）改动均不涉及，全部通过。
- **未来工作**：等 LockedView 落库后，可单独发起一个产物指纹补声明任务（不属本 challenge 范围）。

---

## 4. 给下游的实现指南（accepted）

### 4.1 新结构（resolve 后）

```
Root (nd_6a7f2492b59b4e7eab7e1)
└ NormalFormView <新增容器，nodeId 由 wrap 生成>
    ├ HeaderArea (nd_451ec7c1336d478a810d9)
    ├ FormCard (nd_e60fb832933f4b86a6638)
    └ FooterLinks (nd_c04451d9d8f243489f1c1)
（LockedView 由 I-M1-view-business 续做时新建）
```

### 4.2 续做实施清单

interaction-designer 续做 I-M1-view-business 时按以下顺序：

```
0. read_file 本 decision md + challenge md
1. query/screen_schema 拿到 NormalFormView 的实际 nodeId
2. element/set_visible_when {
     nodeId: <NormalFormView nodeId>,
     visibleWhen: "{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}"
   }
3. element/insert_subtree 给 Root 末尾插入 LockedView 子树（锁定态视图）
   {
     name: "LockedView", label: "锁定态视图",
     visibleWhen: "{{ state.view.lockedUntil && state.view.lockedUntil > Date.now() }}",
     children: [
       LockedIcon (div, name + label),
       LockedTitle (div, props.textContent: "账号已锁定"),
       LockedCountdown (div, props.textContent: "{{ Math.floor(state.view.lockedCountdown/60) }}:{{ String(state.view.lockedCountdown%60).padStart(2,'0') }} 后可重试"),
       LockedHint (div, props.textContent: "为保障账号安全，连续 5 次密码错误后锁定 30 分钟"),
       LockedForgotLink (button, props.textContent: "去重置密码", events: [{ trigger: "click", actions: [{ type: "nav.go", targetScreenId: "00-forgot-password" }] }])
     ]
   }
4. meta/set_node 补 LockedView 及其子节点的 meta.interaction.summary
5. （可选）给 NormalFormView 也 meta/set_node 补 interaction.summary "正常态可交互；locked 时由 visibleWhen 自动隐藏"
6. update_plan_task I-M1-view-business → done
   建议 expectedArtifacts: [{ kind: 'arrayMin', path: 'rootNode.children', min: 2 }]
```

### 4.3 与下游已 done 任务的协同

| 下游已 done 任务 | 是否影响 | 说明 |
|---------------|--------|------|
| I-M1-events | ❌ 不影响 | events 内 `ui.animate.nodeId=nd_e60fb832933f4b86a6638`（FormCard）仍然指向同一节点（wrap 不改 nodeId） |
| I-M1-view-loading | ❌ 不影响 | SubmitSpinner / CodeSendSpinner 仍是 SubmitBtn / GetCodeBtn 子节点 |
| I-M1-view-error | ❌ 不影响 | PhoneError / CredentialError nodeId 不变 |
| 其他 | ❌ 不影响 | 不引用 Root.children 排列方式 |

---

## 5. 验收标准

resolve 通过后，下游标 done 时应满足：

- [ ] NormalFormView 容器存在，含 3 个 children（HeaderArea + FormCard + FooterLinks）
- [ ] NormalFormView 挂 visibleWhen（unlocked 表达式）
- [ ] LockedView 子树存在，挂 visibleWhen（locked 表达式）
- [ ] LockedView 含图示 / 标题 / 倒计时 / 提示 / 重置密码 5 子节点
- [ ] 所有节点 meta.interaction.summary 非空
- [ ] R-CHALLENGE-03 重对账：受影响 targetTaskIds (M1-skeleton) 通过

---

## 6. 写完后下一步

调用 `meta/resolve_upstream_challenge`：

```
projectId, challengeId: "C-INT-00-login-001",
accepted: true,
rationale: "[本 md §2 摘要] 业务规则一致性 + UX 心理差异要求双子树 + 设计契约稳定（节点 ID 不变）+ DRY 维护性 + 跨阶段协同 + 风险可逆",
decisionMd: "analysis-notes/d84c140e-0437-4c80-a786-c1f389bcbb02/challenges/C-INT-00-login-001-decision.md"
```

service 端会原子完成：
- P-revise-C-INT-00-login-001 → done
- I-M1-view-business → unblock 回 pending
- 重对账受影响 task expectedArtifacts（R-CHALLENGE-03 通过）
- 同步所有 ref 的 phase=accepted + decision + decisionMd

成功后：通知用户切回 interaction-designer 续做。
