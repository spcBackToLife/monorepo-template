> 这是【对挑战的官方决策】md 强模板。上游 SKILL（product/theme/interaction/design）接管 challenge 时按本模板写。
> 详细协议：`STAGE-CONTRACT.md` §0.1.9 + `UPSTREAM-FEEDBACK-PROPOSAL.md`。

# D-<challengeId>: <一句话决策>

**本表元数据**：

| 字段 | 值 |
|------|---|
| 对应 challenge | <challengeId> |
| 决策状态 | accepted / partially-accepted / rejected |
| 决策 SKILL | product-analyst / theme-generator / interaction-designer / design-planner |
| 决策时间 | <ISO timestamp> |

---

## 1. 决策

> 三选一：accepted（完全接受，按下游推荐方案改）/ partially-accepted（部分接受，给折中方案）/ rejected（拒绝，给等效不改路径）

**accepted** / **partially** / **rejected**

---

## 2. 理由（产品视角，必须 ≥10 字符 + 多角度论证）

> ⚠️ service 端会校验 rationale 长度。但更重要的是不能空话——要写**为什么从 [本 SKILL 阶段] 视角看，这个改动是值得 / 不值得做的**。

- 用户体验视角：...
- 业务规则视角：...
- 可维护性视角：...
- 与已有决策的一致性：...

---

## 3. 实施

### 3.1 改了哪些 schema

> accepted / partially 时填：列出本次 resolve 前要执行的 MCP 调用清单。
> rejected 时跳过本节，跳到 §4。

| # | MCP 调用 | 参数概要 | 影响节点/字段 |
|---|---------|---------|--------------|
| 1 | element/wrap | parentId=root, ids=[HeaderArea, FormCard, FooterLinks], wrapperName=NormalFormView | 新增 NormalFormView 容器 |
| 2 | meta/set_node | nodeId=NormalFormView, patch={ product: { summary: "..." } } | 补 product.summary |
| ... | ... | ... | ... |

### 3.2 同步更新的上游 task notes

> 改完 schema 后必须同步把对应 product task 的 notes 加补丁说明，让人类回看时能理解为什么 done 任务的产物变了。

| taskId | 补丁说明 |
|--------|---------|
| M1-skeleton | "(2026-XX-XX challenge C-INT-00-login-001 接受) Root.children 重构：HeaderArea/FormCard/FooterLinks → 包入 NormalFormView 容器；新增 LockedView 兄弟节点结构留给 interaction 落具体子树。" |
| ... | ... |

### 3.3 expectedArtifacts 影响

- 受影响清单：
  - M1-skeleton 现有产物指纹：`[{kind:'arrayMin', path:'rootNode.children', min:3}]` → 改后仍 ≥ 3（NormalFormView + LockedView 占位 + 其他），通过 ✓
  - 若不通过：上游 SKILL 必须**在 resolve 前**先把受影响 task 的产物补回（如新增节点占位 / 改 expectedArtifacts 声明）
- 是否需要补声明 / 修改既有 expectedArtifacts：是 / 否

---

## 4. 给下游的实现指南（必填，无论 accepted 还是 rejected）

### 4.1 accepted / partially 场景

> 写"新结构怎么用"——下游续做时直接照本指南落 schema。

- 节点结构现已变为：
  ```
  Root
  ├ NormalFormView (新增容器)
  │   ├ HeaderArea
  │   ├ FormCard
  │   └ FooterLinks
  └ LockedView (待下游建)
  ```
- 下游应做：
  1. 给 NormalFormView 挂 visibleWhen（unlocked 表达式）
  2. element/insert_subtree LockedView 子树
  3. meta/set_node 补叙事

### 4.2 rejected 场景

> 写"等效不改路径"——下游不能 wrap，要怎么实现"业务状态分支"？要给具体实施清单，不是空话"自己想办法"。

- 推荐等效方案：
  - 方案 X：在 ... / 用 ... 表达 ...
- 实施清单：
  1. ...
  2. ...
- 接受劣势的理由：（为什么从产品视角，"维持现状"对维持产品契约稳定的价值 > 下游次优实现的代价）

---

## 5. 验收标准（resolve 通过后下游应满足）

> 本节用于人类 reviewer 在下游标 done 时核对：决策是否真的被遵守了。

- [ ] 下游 raisedBy 任务标 done 时 expectedArtifacts 通过
- [ ] 下游续做产物与本指南 §4 一致
- [ ] 受影响的上游 task notes 已加补丁说明（如改 accepted）
- [ ] schema 改动通过 R-CHALLENGE-03 重对账（service 自动核）

---

## 6. 写完后下一步

调用 `meta/resolve_upstream_challenge`：

```
meta/resolve_upstream_challenge {
  projectId: <...>,
  challengeId: <对应 challenge>,
  accepted: true | false,
  rationale: <§2 摘要 ≥10 字符>,
  decisionMd: "analysis-notes/<projectId>/challenges/<challengeId>-decision.md"
}
```

service 端会原子地：
- 标 P-revise-* 任务 done / skipped
- unblock raisedBy 任务（恢复 pending）
- accepted 时重跑受影响 expectedArtifacts
- 同步所有引用本 challenge 的 task

成功后：提示用户切回原下游 SKILL 续做。
