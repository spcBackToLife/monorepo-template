# design-executor链路测试-严重流程违规与修复方案

## 类型

问题解决

## 上下文

- **项目**: design-ui-monorepo / campus-geo-social 设计工作区
- **场景**: 以 00-login 登录页为样板，首次跑通 product → interaction → design-planner → design-executor 全链路
- **时间**: 2026-05-28
- **技术栈**: MCP 设计工具链 + design-registry Schema + 多技能协作

---

## 问题描述

design-executor 技能在执行时**完全违反了自身 SKILL 文档规定的逐节点执行流程**，导致产出页面"一塌糊涂"：结构反序、素材缺失、交互不可用、视觉像裸 wireframe。

### 具体违规清单

| # | SKILL 规定 | 实际行为 | 后果 |
|---|---|---|---|
| 1 | `task-gen.ts` 生成有序任务列表 → 保存 | 跑了脚本但**脚本只 console.log，不生成文件** | 无持久化进度，无法暂停/继续 |
| 2 | 每节点 `read_file` 节点 JSON | 没有逐个读 | — |
| 3 | 每节点 `read_file` ref 指向的**完整 md** | **从未读过**任何 interaction ref、visual ref、material ref | 丢失所有精确规格 |
| 4 | 调用 page-builder / material-painter 子技能 | 从未调 material-painter；page-builder 也是凭记忆 batch | Logo/装饰/图标全是占位色块 |
| 5 | 验证 checklist (structure/styles/events/materials/visualStates) | 从未验证 | 不知道哪里有问题 |
| 6 | `write-node --layer implementation` 回写进度 | 从未回写 | registry 节点全部仍为 `status: pending` |
| 7 | "不得一次性搭建 10+ 节点后才验证" | 13 个节点一次性 `insertSubtree` | 无法逐步检查 |
| 8 | "不得从 summary 推断样式值" | 完全从 `design.keyStyles` 摘要推断 | 缺少 20+ CSS 属性、placeholder 等 |
| 9 | "不得在未读 ref 文档的情况下执行" | 所有 ref 文档都没读 | 交互/视觉规格完全丢失 |

### 额外发现的 MCP 工具 Bug

| Bug | 根因 | 修复状态 |
|---|---|---|
| `style/update` 直接调用时 object 参数被序列化为 string | MCP tool schema 用 `additionalProperties: true` 无类型提示 | ✅ 已修复（registerDomainTool.ts 加 coerceStringifiedObjects） |
| `dataSource.add` batch 操作 500 | executeAddDataSource 缺防御性 null check | ✅ 已修复 |
| `screen_schema` 嵌套子节点不返回 id | insertSubtree 通过 batch 时未在 ensureDeterministicIds 中补 id | ✅ 已修复 |
| `insertSubtree` 顺序反转 | position "first"/"last" 行为与预期不符 | ⚠️ 未修复（用 newIndex reorder 绕过） |
| `element.reorder` 参数名是 `newIndex` 不是 `position` | API 文档/hint 不清晰 | 已知，下次直接用 newIndex |

---

## 根因分析

### 不是技能设计问题——技能设计是对的

executor SKILL 规定的流程完全正确：
```
任务列表（可暂停/继续）
  → 逐节点：读产品+交互+视觉+素材文档
    → 规划这个节点怎么实现
      → 调子技能精确执行
        → 验证
          → 记录进度
```

### 真正的问题：两个基础设施缺陷

1. **`task-gen.ts` 不生成文件** — 只 `console.log` 到屏幕，跑完内容就没了。没有持久化的任务列表 = 没有进度追踪载体 = 无法暂停继续 = AI 倾向于"一口气搞完"

2. **SKILL 的红线缺乏强制力** — 写了"不得"但没有机制确保遵守。AI 在 token/效率压力下会走捷径。需要更强的结构性约束（如：必须先有文件才能继续、每步必须更新文件）

---

## 修复方案

### 1. `task-gen.ts` 必须生成 `EXECUTOR-PLAN.md` 文件

类似 `plan-gen.ts` 为 design-planner 生成 `PLAN.md`：

```markdown
# Executor 任务计划

## 页面: 00-login（13 个节点）

### 1. _page (页面根)
- [ ] 结构搭建
- [ ] 样式设置
- [ ] 状态变量
- [ ] 数据源
📖 需读: interaction-design/pages/00-login.md, design-plan/pages/00-login/visual.md

### 2. top-area/_component
- [ ] 结构搭建
- [ ] 样式设置
- [ ] 素材绘制 (B-01 brand-logo)
📖 需读: design-plan/pages/00-login/components/top-area/top-area.md

### 3. form-card/_component
- [ ] 结构搭建
- [ ] 样式设置
- [ ] 事件绑定
- [ ] 条件可见性
📖 需读: design-plan/components/form-card/form-card.md, interaction-design/pages/00-login.md#form-card
...
```

每完成一项改 `[ ]` → `[x]`，下次继续时读文件找第一个 `[ ]`。

### 2. design-executor SKILL 加红线

增加以下**绝对红线**（与现有"绝对禁止"并列）：

```
### 执行纪律红线（不可违反）

- 🚫 禁止批量执行：一次只处理一个节点，完成验证后才进入下一个
- 🚫 禁止跳过 ref 阅读：每个节点执行前必须 read_file 所有 ref 文档（不是看 summary）
- 🚫 禁止省略子技能：有 materials 字段必须调 material-painter，有结构必须调 page-builder
- 🚫 禁止不记录进度：每个节点完成后必须在 EXECUTOR-PLAN.md 打勾 + write-node 回写
- ✅ 执行多少算多少：token 不够就停，下次从 EXECUTOR-PLAN.md 第一个 [ ] 继续
- ✅ 跨会话继续：读 EXECUTOR-PLAN.md → 找第一个 [ ] → 从这里继续
```

### 3. 跨会话继续机制

```
1. 读 EXECUTOR-PLAN.md → 找第一个 [ ] 项
2. 读该节点的 registry JSON → 获取所有 ref 路径
3. read_file 每个 ref 文档 → 获取精确规格
4. 规划该节点的实现方案
5. 调用子技能执行
6. 验证（query/screen_schema 确认 + 对照文档检查）
7. 在 EXECUTOR-PLAN.md 打勾 + write-node --layer implementation
8. 如果 token 充足 → 回到步骤 1；否则 → 停止，告知用户进度
```

---

## 对未来设计的启示

1. **任何分步执行的技能都必须有文件级进度追踪** — 不能依赖 console 输出或内存
2. **AI 的"红线"需要靠产物文件来强制** — 如"必须先有 EXECUTOR-PLAN.md 才能开始执行"
3. **registry Schema 是索引不是规格** — executor 必须去读 ref 指向的完整文档，不能从 JSON 摘要推断
4. **逐节点执行是核心纪律** — 宁可一次只做 3 个节点做得精确，也不要 13 个节点一次性草率完成
5. **子技能调用不可省略** — material-painter 绘制素材是页面品质的关键差异（色块 vs 真实 Logo）

---

## Tags

`design-executor` `链路测试` `流程违规` `task-gen` `逐节点执行` `进度追踪` `MCP-bug`
