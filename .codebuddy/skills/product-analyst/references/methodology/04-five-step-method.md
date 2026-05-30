# 五步分析法（每个模块必做）

每个 P0 / P1 模块通过 5 个子任务（A-E）逐项推进。**雷打不动**：每步先写 md 推理 → 再 MCP 落 schema。

| Step | 子任务 ID | 内容 | 关键 |
|------|---------|------|------|
| **A. 用户故事** | `<M>-stories` | "作为 X，我希望 Y，以便 Z" | 穷举核心 / 扩展 / 异常三类 |
| **B. 核心流程** | `<M>-flows` | 主线 Happy Path + 异常分支树 | 每节点问"失败 / 空数据 / 权限不足 怎么办" |
| **C. 业务规则 ★** | `<M>-rules` | **数据 / 业务 / 安全 / 边界 四类** | **不允许空——产品的灵魂在规则里** |
| **D. 数据模型** | `<M>-data` | 实体（字段）+ 接口（method/path/body）+ TypeScript typeDef | 给 dataSources 声明输入 |
| **E. 信息架构 → 节点骨架** | `<M>-skeleton` | 屏幕清单 + 跳转关系 + 每屏建出业务骨架 | 决定项目有多少屏 + 每屏的稳态业务节点 |

---

## Step A：用户故事穷举

### 标准格式
```
作为 [角色]，我希望 [功能 / 行为]，以便 [获得的价值 / 目的]
```

### 必做：穷举三类故事

| 类型 | 说明 | 示例 |
|------|------|------|
| **核心故事** | 模块存在的理由，缺少则模块无意义 | "作为用户，我希望能用手机号注册，以便创建账号" |
| **扩展故事** | 提升体验但不致命 | "作为用户，我希望能修改昵称，以便表达个性" |
| **异常故事** | 错误 / 边界 / 异常场景的处理 | "作为用户，如果手机号已被注册，我希望得到明确提示" |

### 编写原则（INVEST）
- **I**ndependent — 故事间尽量独立
- **N**egotiable — 细节可协商
- **V**aluable — 对用户有价值
- **E**stimable — 可估算工作量
- **S**mall — 足够小可在一个迭代完成
- **T**estable — 有明确验收条件

### 沉淀
- md：完整三类故事列表（schema 装不下）
- schema：核心结论浓缩进 `screen.meta.product.summary`

---

## Step B：核心流程 + 异常分支

### 主线（Happy Path）
按时序列出 N 步操作 / 屏幕跳转，每一步标注用户期望的下一步。

### 异常分支树
对主线**每一步**问 4 个问题：
1. 失败（API 返回错）怎么办？
2. 数据为空怎么办？
3. 权限不足怎么办？
4. 网络中断怎么办？

### 树状图模板
```
主线：[Step 1] → [Step 2] → [Step 3] → 成功
异常：
├── Step 1: 输入格式错      → 行内提示 + 阻断推进
├── Step 1: 触发风控        → 引导验证
├── Step 2: API 返回 401    → 跳登录
├── Step 2: API 超时        → Toast + 重试按钮
├── Step 3: 服务端 5xx      → 兜底页 + 客服入口
└── Step 3: 数据被删        → 友好提示返回
```

### 沉淀
- md：完整流程图 + 异常分支树
- schema：主线浓缩进 summary；异常处理策略全部落 Step C 的 rules

---

## Step C：业务规则（4 类，不允许空）★

### 4 类规则（不可缺一）

```
数据规则：字段长度 / 格式 / 枚举 / 必填 / 默认值
业务规则：流程约束 / 状态转换 / 权限 / 计费
安全规则：防滥用 / 合规 / 隐私 / 审核 / 限流
边界 Case：网络断 / 服务挂 / 数据空 / 并发冲突 / 重复提交
```

### 红线 R-PRODUCT-01
每屏 `meta.product.rules` 必须 ≥ 4 条，且四类各至少 1 条。

### 红线 R-PRODUCT-03
如果本屏承载有状态业务对象（订单 / 任务 / 工单 / 审批 / 账户 / 会话），**必须**在 `rules[]` 中显式写清状态字段 + 枚举值：
```
"业务规则: 订单状态字段 order.status ∈ {pending_payment, awaiting_shipment, shipping, completed, cancelled, refunding}"
```

### 推理留痕（md 必含）
- **候选规则池**：先穷举 N 条候选，再筛选
- **多角度验证**：见 `05-multi-angle-validation.md`
- **替代方案与否决**：每条被砍掉的规则必须说明理由
- **竞品对照**：行业标准是什么？为什么取这个值？

### 沉淀
- md：含上面"推理留痕"的全部内容
- schema：`screen.meta.product.rules[]`（4 类齐）

---

## Step D：数据模型 + API 契约

### 必做
1. 列出涉及的实体（含字段）
2. 列出涉及的 API（method / path / body / response 结构）
3. 写 TypeScript typeDef（PascalCase 类型名）

### 红线
- 每个 API 必须建 `dataSource` 含**完整 typeDef**（responseFields + paramsFields）
- typeDef 是产品阶段就该明确的"接口契约"——不能拖到 interaction 才补
- mock 场景 / autoFetchOnEnter / defaultParams **不在本阶段写**（留给 interaction）

### 沉淀
- md：实体定义 + 接口推理 + typeDef 设计依据
- schema：`data_source/add` + `data_source/set_endpoint` + `state/data_set_init`
- 详见 `../schema-spec/state-and-datasource.md`

---

## Step E：屏幕落库 + 节点骨架

### 必做
1. 用 `screen/add` 创建屏幕（如未创建）
2. 用 `element/add` 或 `element/insert_subtree` 建出业务节点骨架
3. 用 `meta/set_node` 给每个业务节点写 `meta.product.summary`
4. 用 `state/view_add` 声明已知 view 变量
5. 用 `state/data_set_init` 给每个 API 留 data 占位

### 红线
- 每屏 `rootNode.children` ≥ 1（违 R-STRUCTURE-01）
- 业务节点 `meta.product.summary` 非空（违 R-PRODUCT-02）
- **不建**装饰节点（PinkCircle / GradientGlow）—— 留给 design
- **不建**运行时显隐节点（LoadingOverlay / EmptyState / ErrorView / 状态机分支视图）—— 留给 interaction

### 命名 + primitive 规范
详见 `../schema-spec/node-skeleton.md`。

### 沉淀
- md：节点骨架取舍论证（为什么这棵结构，为什么这些命名，为什么这些 primitive）
- schema：完整骨架 + meta.product

---

## 五步法的额外约束：模块间关联分析

每个模块走完 A-E 后，必须标注：
- **依赖谁**：本模块用到哪些其他模块的能力（如"内容发布依赖用户认证"）
- **被谁依赖**：哪些模块会消费本模块的产出
- **关联流转**：跨模块的页面跳转（落到 `navigation.flows`）

这部分在 `modules/<M>/README.md`（模块索引）写清，作为该模块的最终汇总。
