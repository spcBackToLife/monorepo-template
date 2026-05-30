> 这是【跨阶段回流挑战】md 强模板。下游 SKILL（interaction/design/executor）发现上游产物的某个具体决策不利于本阶段最佳实现时，必须先按本模板写 challenge md，再调 `meta/raise_upstream_challenge`。
> 详细协议：`STAGE-CONTRACT.md` §0.1.9 + `UPSTREAM-FEEDBACK-PROPOSAL.md`。

# C-<阶段简写>-<screenId 简写>-<NN>: <一句话标题>

> challengeId 命名约定：
> - 阶段简写：INT（interaction）/ DSN（design）/ EXEC（executor）
> - 例：C-INT-00-login-001 / C-DSN-02-feed-003 / C-EXEC-04-profile-001

**本表元数据**（与 MCP 调用参数 1:1 对应）：

| 字段 | 值 |
|------|---|
| challengeId | <填> |
| raisedBy | <下游任务 ID，如 I-M1-view-business> |
| raisedByScope | project / screen |
| raisedByScreenId | <仅 scope=screen 时填> |
| targetStage | product / theme / interaction / design |
| 当前 phase | open（首次写时；resolved 后由 service 自动更新） |

---

## 1. 现状（上游产物快照）

> 列出本 challenge 关心的上游产物当前形态。要含**具体的 schema 路径 + 节点 ID + 当前字段值**——不能空话"现状不合理"。

- **节点 / 字段**：
  - `screen.rootNode.children` = [HeaderArea(nd_xxx), FormCard(nd_yyy), FooterLinks(nd_zzz)]
  - 节点 X 的 props.textContent = "..."
- **来自上游决策**（必须能追溯到上游 md / meta）：
  - 上游 md 路径：`analysis-notes/<projectId>/screens/<screenId>/skeleton.md`
  - 上游决策 ID：D6 / D-B9 / 等
  - 决策原文摘抄：「...」

---

## 2. 问题

### 2.1 红线证据（为什么必须挑战才能干净实现？）

- **想要的实现**（具体到 MCP 调用 / 节点结构）：
  ```
  element/wrap [HeaderArea, FormCard, FooterLinks] → NormalFormView 容器
  + 新建 LockedView 兄弟节点
  ```
- **触发哪条 forbidden 红线**：
  - 引用：`forbidden-fields-<阶段>.md` §"重组上游骨架" → "移动 / 删除 / 包裹 product 阶段已建的业务骨架节点 ❌"
- **不绕红线的代价**（次优实现的描述 + 具体损失）：
  - 候选 A 描述...
  - 维护性损失：N 处同表达式重复
  - 可读性损失：业务态分支语义被分散到多个节点的 visibleWhen
  - 延伸风险：design 阶段 visualState 必须维护"双节点同步"

### 2.2 候选方案 ≥3（必须含"维持现状"对照）

> ⚠️ 强制 ≥3 候选方案。不允许只列 1-2 条然后说"显然 X 最优"。

| 方案 | 改动面（具体 MCP 调用清单） | 优势 | 劣势 |
|------|---------------------------|------|------|
| **A. 维持现状（不挑战）** | 无 | 上游不动；最小入侵 | 下游次优实现 X（描述具体损失） |
| **B. <推荐方案>** | element/wrap [...] / element/insert_subtree {...} / ... | 干净表达业务态分支；DRY；维护性高 | 触发上游红线 → 必须走 challenge 协议 |
| **C. <折中方案>** | element/setVisibleWhen 给已有节点散挂表达式 | 不动结构；红线安全 | 表达式重复；语义分散 |
| **D（可选）. 其他候选** | ... | ... | ... |

---

## 3. 影响面声明（必须填——决定 accepted 后要重对账哪些任务）

### 3.1 受影响的上游已 done 任务（targetTaskIds）

> 改动后这些任务的 expectedArtifacts 会被 service 端在 resolve accepted 时重跑（R-CHALLENGE-03）；不通过则拒绝 resolve。

| taskId | scope | screenId | 受影响原因 | 上游 task 是否需要补声明 expectedArtifacts |
|--------|-------|----------|-----------|------------------------------------------|
| M1-skeleton | screen | sc_xxx | 节点结构改变（多了 NormalFormView 容器） | 不变（既有产物指纹仍满足） |
| ... | ... | ... | ... | ... |

### 3.2 受影响的下游已 done 任务（如有）

> 本 challenge 提出方"自己阶段"已 done 的任务可能也需要修订。

| taskId | 影响描述 | 续做时是否需要更新 md / 重落 schema |
|--------|---------|------------------------------------|
| I-M1-events | events.md 已落库的 SubmitBtn 节点引用未变 → 不影响 | 否 |
| ... | ... | ... |

### 3.3 expectedArtifacts 是否会被破坏

- 受影响清单：[...]
- 是 / 否 / 部分
- 若是：写明哪条 check 会被破坏 + 上游 SKILL 在改 schema 时如何同步补回

---

## 4. 推荐方案 + 产品级理由

> ⚠️ 不能只说"交互更顺"。必须从**多角度论证**：用户体验 / 性能 / 可维护性 / 业务对齐 / 风险。

- **推荐**：方案 B（wrap 为 NormalFormView 容器）
- **理由**：
  1. **业务语义对齐**：账号锁定状态机的两个 enum 值（unlocked / locked）一一映射独立子树——这是 `methodology/07-derivative-views.md` 类 5「业务状态分支视图」的标准模式
  2. **DRY 维护性**：散挂 visibleWhen 方案让 unlocked 表达式在 N 处重复（FormCard / FooterLinks / 子节点状态切换……）；wrap 后只需一处
  3. **下游协同**：design 阶段对 NormalFormView/LockedView 各自做 visualState 比"散在各节点的表达式 + visualState"清晰得多
  4. **风险评估**：上游 wrap 操作幂等且可 inverse；不影响 product rules（rules 是文本，不是节点引用）；不影响 dataSources

---

## 5. 回流后下游续做计划（必填）

- **resumeTaskId**：raisedBy（即本下游任务 ID）
- **续做时需要的额外步骤**（按顺序）：
  1. read challenge md + decision md
  2. 在 NormalFormView 上挂 visibleWhen `{{ !state.view.lockedUntil || state.view.lockedUntil <= Date.now() }}`
  3. element/insert_subtree LockedView（含 LockedIcon / LockedTitle / LockedCountdown / LockedHint 子节点）+ visibleWhen
  4. meta/set_node 给 LockedView 子树补 interaction summary
  5. 落 schema → done
- **是否影响下游已 done 任务的 md**：
  - 否 / 是（列出哪些 md 需要追加补丁说明）

---

## 6. （可选）写完后下一步

- 调用 `meta/raise_upstream_challenge` 把本 md 的元数据 + targetTaskIds 落 schema
- 提示用户切到 targetStage 对应 SKILL 接管
- 续做时本任务自动 unblock（resolve 后）
