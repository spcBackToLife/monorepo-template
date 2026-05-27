# DesignUI 全链路产品化战略

> 从用户想法到企业级产品上线的完整路径设计
> 
> 创建时间: 2026-05-26
> 状态: 方案设计阶段

---

## 一、第一性原理回溯

### 核心命题

**一个用户有了产品想法，如何用最短路径变成一个可上线的企业级应用？**

传统路径：
```
想法 → PRD文档 → UI设计稿 → 前端开发 → 后端开发 → 联调 → 测试 → 上线
        ↑ 断裂       ↑ 断裂      ↑ 断裂      ↑ 断裂
      (自然语言)   (像素图片)   (手写代码)   (手写代码)
```

每个 `→` 都是一次**信息有损翻译**，每次翻译都有理解偏差和效率损失。

**我们的命题**：消除所有翻译环节，让 Schema 成为唯一真相源（Single Source of Truth）。

```
想法 → Schema（结构化的完整产品描述）→ 渲染/代码/文档/测试 全部自动派生
       ↑                              ↑
   AI + 人类协作构建              Adapter 层自动转换
```

### 推导：完整的 Schema 需要描述什么？

一个企业级应用由什么组成？

| 维度 | 具体内容 | 当前 Schema 覆盖 |
|------|---------|:---------------:|
| **页面结构** | 组件树、布局、样式 | ✅ 已有 |
| **交互逻辑** | 事件、跳转、状态切换 | ✅ 已有 |
| **数据流** | API 定义、请求/响应、数据绑定 | ⚠️ 部分（只有前端消费侧） |
| **状态管理** | 全局/页面/组件状态、状态机 | ✅ 已有 |
| **视觉规范** | 主题 Token、图标规格、动效 | ✅ 刚完善 |
| **数据模型** | 实体定义、字段类型、关系 | ❌ 缺失 |
| **API 契约** | RESTful/GraphQL 接口规范 | ❌ 缺失（只有 mock path） |
| **业务规则** | 校验、权限、流程编排 | ❌ 缺失 |
| **部署架构** | 服务拆分、中间件、环境 | ❌ 缺失 |

**结论**：当前 Schema 只覆盖了"前端 UI 层"，要真正做到"想法→产品"还需要补齐**数据模型、API 契约、业务规则**三大块。

---

## 二、完整产品化架构

### 2.1 全景图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          用户想法层                                    │
│  "我要做一个校园社交 App，有动态、社团、私信功能"                      │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │   AI Product Designer              │
                    │   (design-planner skill)           │
                    │   需求分析 → 功能拆解 → 信息架构    │
                    └─────────────────┬─────────────────┘
                                      │
        ┌─────────────────────────────▼─────────────────────────────┐
        │                    DesignUI Schema                          │
        │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
        │  │ UI Schema │ │Data Model│ │API Schema│ │Biz Rules │     │
        │  │ 页面/组件 │ │ 实体/关系│ │ 接口契约 │ │ 校验/流程│     │
        │  │ 样式/交互 │ │ 字段/类型│ │ 请求/响应│ │ 权限/状态│     │
        │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
        └───────────┬──────────┬──────────┬──────────┬──────────────┘
                    │          │          │          │
        ┌───────────▼──────────▼──────────▼──────────▼──────────────┐
        │                   Codegen Adapter 层                        │
        │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
        │  │React/Vue│  │ Nest.js │  │  Go API │  │ Python  │     │
        │  │Flutter  │  │  Java   │  │Postgres │  │  文档   │     │
        │  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
        └───────────────────────────────────────────────────────────┘
```

### 2.2 Schema 四大模块定义

#### Module 1: UI Schema（已有，继续完善）
```typescript
// 已有的 ComponentNode + Screen + DataSource + State 等
```

#### Module 2: Data Model Schema（新增）
```typescript
interface DataModelSchema {
  entities: Entity[];          // 实体列表（User, Post, Club...）
  relations: Relation[];       // 实体间关系（1:N, N:M）
  enums: EnumDef[];           // 枚举定义
}

interface Entity {
  id: string;
  name: string;               // PascalCase: "User", "FeedPost"
  tableName: string;          // snake_case: "users", "feed_posts"
  description: string;
  fields: Field[];
  indexes: Index[];
  timestamps: boolean;        // created_at, updated_at
  softDelete: boolean;        // deleted_at
}

interface Field {
  name: string;
  type: FieldType;            // string, int, float, boolean, datetime, json, uuid, enum, relation
  required: boolean;
  unique: boolean;
  default?: unknown;
  validation?: ValidationRule[];
  description: string;
  // 关系字段
  relationType?: '1:1' | '1:N' | 'N:1' | 'N:M';
  relatedEntity?: string;
  foreignKey?: string;
}
```

#### Module 3: API Schema（新增）
```typescript
interface ApiSchema {
  baseUrl: string;
  version: string;
  auth: AuthConfig;
  endpoints: Endpoint[];
}

interface Endpoint {
  id: string;
  name: string;               // "创建动态"
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;               // "/api/v1/posts"
  description: string;
  tags: string[];             // ["Feed", "Post"]
  // 请求
  params?: ParamDef[];        // URL 参数
  query?: ParamDef[];         // Query 参数
  headers?: ParamDef[];       // 请求头
  body?: TypeRef;             // 请求体（引用 DataModel 或内联定义）
  // 响应
  responses: ResponseDef[];
  // 业务
  auth: 'public' | 'user' | 'admin';
  rateLimit?: { max: number; window: string };
  // 关联
  relatedEntity?: string;     // 关联的数据实体
  relatedScreen?: string;     // 使用此 API 的页面
}
```

#### Module 4: Business Rules Schema（新增）
```typescript
interface BusinessRulesSchema {
  validations: ValidationRule[];    // 字段/表单校验规则
  workflows: Workflow[];            // 业务流程（审批、状态机）
  permissions: PermissionRule[];    // 权限控制
  notifications: NotificationRule[]; // 通知触发规则
}
```

---

## 三、产品建设路线图

### 3.1 设计软件本身（apps/）需要建设

| 优先级 | 模块 | 描述 | 当前状态 |
|:------:|------|------|---------|
| P0 | **数据模型设计器** | 可视化设计实体、字段、关系（类似 dbdiagram.io） | ❌ 无 |
| P0 | **API 设计器** | 可视化定义 endpoints、关联数据模型、生成 Mock | ❌ 无 |
| P1 | **Codegen 面板** | 选择目标框架 → 预览生成代码 → 导出 | ❌ 无 |
| P1 | **需求文档生成** | 从 Schema 自动生成 PRD（含交互流程图） | ❌ 无 |
| P2 | **业务流程编辑器** | 可视化编排状态机、审批流 | ❌ 无 |
| P2 | **自动化测试面板** | 基于 Mock 场景自动生成 E2E 测试 | ❌ 无 |

### 3.2 Skills 需要建设

| 优先级 | 技能 | 职责 | 当前状态 |
|:------:|------|------|---------|
| **P0** | **`product-analyst`** | **用户想法→专业需求分析→PRD** | ❌ 最关键缺失 |
| P0 | `design-planner` | PRD→设计规划→执行计划 | ⚠️ 需升级（要基于PRD） |
| P0 | `theme-generator` | 主题风格 + Token + IconSpec | ✅ 已有 |
| P0 | `design-from-reference` | 页面结构 + 数据驱动 + 交互 | ✅ 已有 |
| P0 | `design-from-screenshot` | 素材绘制 + 导出应用 | ✅ 已有 |
| P1 | **`data-model-designer`** | 实体/关系设计 → DataModelSchema | ❌ 新增 |
| P1 | **`api-designer`** | API 契约设计 → ApiSchema + Mock | ❌ 新增 |
| P2 | **`design-codegen`** | Schema → 前端/后端/数据库代码 | ❌ 新增 |
| P2 | **`biz-rule-designer`** | 业务规则/权限/流程设计 | ❌ 新增 |

**关键认知**：`product-analyst` 是整条链路的**源头**。它的输出质量直接决定后续所有环节的质量。如果需求分析不到位，后面的设计再精美也是在解决错误的问题。

### 3.3 Codegen Adapter 层建设

```
design-codegen/
├── adapters/
│   ├── frontend/
│   │   ├── react-adapter/          # Schema → React + TypeScript
│   │   ├── vue-adapter/            # Schema → Vue 3 + Composition API
│   │   ├── flutter-adapter/        # Schema → Dart/Flutter
│   │   └── html-adapter/          # Schema → 原生 HTML/CSS/JS
│   ├── backend/
│   │   ├── nestjs-adapter/        # API Schema → NestJS controllers + services
│   │   ├── go-adapter/            # API Schema → Go gin/echo handlers
│   │   ├── python-adapter/        # API Schema → FastAPI/Django
│   │   └── java-adapter/         # API Schema → Spring Boot
│   ├── database/
│   │   ├── postgres-adapter/      # DataModel → PostgreSQL DDL + migrations
│   │   ├── mysql-adapter/         # DataModel → MySQL DDL
│   │   └── prisma-adapter/        # DataModel → Prisma schema
│   └── docs/
│       ├── prd-adapter/           # Schema → 产品需求文档
│       ├── api-docs-adapter/      # API Schema → OpenAPI/Swagger
│       └── test-adapter/          # Schema → E2E 测试用例
├── templates/                      # 可定制的代码模板
│   ├── react/
│   ├── nestjs/
│   └── ...
└── core/
    ├── schema-reader.ts           # 读取完整 Schema
    ├── diff-engine.ts             # Schema 变更检测（增量 codegen）
    └── adapter-registry.ts        # Adapter 注册/发现
```

---

## 四、完整的用户旅程

### 从想法到上线的核心阶段

```
Phase 1: 产品需求分析        ← 做什么（What）— 逐模块深入分析
Phase 2: 交互设计            ← 怎么交互（How it feels）— 逐模块精细化
Phase 3: 设计规划            ← 怎么做（How to build）— 视觉策略 + 素材/组件/任务规划
Phase 4: 视觉风格定义        ← 长什么样（Look）— Token + IconSpec + 装饰规则
Phase 5: UI 搭建 + 素材绘制  ← 实现（Build）— 节点/样式/事件/素材
Phase 6: 验证 & 迭代
Phase 7: 代码生成
Phase 8: 部署上线
```

**关键认知**：Phase 1-3 是"思考"阶段，Phase 4-5 是"执行"阶段。思考越充分，执行越顺畅。

**技能映射**：
| Phase | 技能 | 产出 |
|-------|------|------|
| 1 | product-analyst | PRD + 逐模块业务分析 |
| 2 | interaction-designer | 交互规格表（状态机/反馈/加载/错误） |
| 3 | design-planner | 视觉策略 + 素材清单(含装饰) + 组件 + 任务计划 |
| 4 | theme-generator | ThemeConfig (Token + IconSpec + DecorationRules) |
| 5 | design-from-reference + design-from-screenshot | 完整 UI 实现 |

---

### Phase 1: 产品需求分析（product-analyst skill）

**这是整个链路中最关键的一步。** 没有深度的产品分析，后面一切都是空中楼阁。

#### 1.1 分析路径（必须逐步完成）

```
Step 1: 用户画像 & 场景分析
  - 目标用户是谁？（年龄/职业/技术水平/使用场景）
  - 核心痛点是什么？（现在怎么解决的？为什么不够好？）
  - 使用场景有哪些？（何时/何地/何种状态下使用？）
  - 用户的核心诉求优先级排序

Step 2: 竞品分析 & 差异化
  - 市场上有哪些竞品/替代方案？
  - 它们的核心功能和不足是什么？
  - 我们的差异化价值主张是什么？
  - 什么是我们必须做得比竞品好的？

Step 3: 功能模块梳理
  - 从用户核心场景推导出需要哪些功能模块
  - 每个模块的核心价值是什么？
  - 模块间的依赖关系是什么？
  - 功能优先级矩阵（重要性 × 紧急度）

Step 4: MVP 范围界定
  - 哪些是 Day 1 必须有的？（无此功能产品不可用）
  - 哪些是 V1.1 的？（有则更好，无不致命）
  - 哪些是长期愿景？（画饼但不现在做）
  - MVP 的验收标准是什么？

Step 5: 核心业务流程设计
  - 用户的主线流程是什么？（注册→核心价值→留存循环）
  - 每个流程的完整步骤（含异常分支、边界情况）
  - 数据流：每一步产生/消费什么数据？
  - 状态流：系统在每一步处于什么状态？

Step 6: 信息架构
  - 功能如何组织为页面/模块？
  - 导航结构（Tab/Drawer/Stack）
  - 页面间的跳转关系（导航图）
  - 全局 vs 局部功能的划分
```

#### 1.2 产出物

```
📄 产品需求文档（PRD）
├── 一、产品定位 & 价值主张
├── 二、用户画像 & 场景
├── 三、竞品分析 & 差异化
├── 四、功能模块清单（含优先级）
├── 五、MVP 范围 & 验收标准
├── 六、核心业务流程（含流程图）
│   ├── 主线流程
│   ├── 各模块子流程
│   └── 异常/边界处理
├── 七、信息架构 & 导航设计
├── 八、数据模型概要（实体关系）
└── 九、非功能需求（性能/安全/兼容）
```

#### 1.3 分析方法论

**多角度验证**：每个结论都要从至少 2 个角度验证：
- 用户视角：这个功能用户真的需要吗？使用频率？
- 商业视角：这个功能对留存/转化/营收的贡献？
- 技术视角：实现成本 vs 价值比？
- 竞品视角：竞品有没有？有的话我们做得更好吗？

**逐步深入**：不是一次性输出完整 PRD，而是：
1. 先输出框架性的分析（全局观）
2. 针对每个模块逐个深入分析
3. 每个模块的分析可能反过来影响全局规划
4. 迭代至一致和完整

**与用户对齐**：
- 每完成一个 Step 都与用户确认方向
- 不确定的地方明确提出选项（A/B/C 方案对比）
- 避免替用户做决策，但提供专业建议

---

### Phase 2: 产品设计规划（design-planner skill 升级）

**在 Phase 1 的 PRD 基础上**，将需求转化为可执行的设计规划：

```
Step 1: 页面清单（从信息架构推导）
  - 每个页面的职责
  - 页面间的跳转关系
  - 页面内的模块组成

Step 2: 组件体系规划
  - 哪些 UI 模式需要复用？
  - 组件的 Props/状态/变体定义
  - 组件层级（原子→分子→有机体）

Step 3: 数据架构设计
  - 实体定义 & 关系（从 PRD 第八章细化）
  - API 接口定义
  - 前端状态管理方案
  - Mock 数据设计

Step 4: 视觉风格方向
  - 品牌调性分析
  - 配色/字体/图标风格建议
  - 参考设计收集

Step 5: 执行计划
  - 按优先级排列的任务清单
  - 依赖关系 & 并行度
  - 每个任务的验收标准
```

---

## 五、数据模型 & API 设计的详细方案

### 5.1 设计软件中的数据模型设计器

**核心交互**：
```
左侧: 实体列表（可拖拽排序）
中间: ER 图可视化（实体卡片 + 关系连线）
右侧: 选中实体的字段编辑面板
```

**AI 辅助**：
- 用户描述业务 → AI 推荐实体划分和字段
- 选中 API endpoint → AI 推荐关联实体和返回结构
- 选中 UI 组件 → AI 推荐需要的数据字段

**与 UI Schema 的联动**：
- DataModel.Entity 的字段 → 自动生成 UI 中 DataSource 的 typeDef
- DataModel.Relation → 影响 API 的嵌套返回结构
- UI DataSource 的 mock data → 自动符合 DataModel 的字段类型

### 5.2 API 设计器

**核心交互**：
```
左侧: API 分组（按 Tag/Module）
中间: Endpoint 详情（方法、路径、参数、响应）
右侧: 关联信息（数据模型、Mock 场景、使用页面）
```

**自动化**：
- 从 DataModel 自动生成 CRUD endpoints（一键创建整套 REST）
- 从 UI DataSource 反向推导需要的 API（发现未定义的接口）
- Mock 场景与 UI DataSource 的 mock 同步

### 5.3 Codegen 的核心设计

**原则**：Adapter 模式 + 模板引擎 + 增量生成

```typescript
interface CodegenAdapter {
  name: string;                    // "react", "nestjs", "postgres"
  target: 'frontend' | 'backend' | 'database' | 'docs';
  
  // 从 Schema 生成代码
  generate(schema: FullSchema, options: AdapterOptions): GeneratedFiles[];
  
  // 增量更新（基于 Schema diff）
  patch(diff: SchemaDiff, existingCode: string): PatchResult;
  
  // 自定义模板支持
  templates: Template[];
}
```

**生成示例（后端 NestJS）**：

从 DataModel + API Schema 生成：
```
output/
├── src/
│   ├── modules/
│   │   ├── user/
│   │   │   ├── user.entity.ts        # ← DataModel.Entity
│   │   │   ├── user.dto.ts           # ← API.Endpoint.body/response
│   │   │   ├── user.controller.ts    # ← API.Endpoint (路由+参数)
│   │   │   ├── user.service.ts       # ← 业务逻辑骨架
│   │   │   └── user.module.ts        # ← 模块注册
│   │   ├── post/
│   │   │   └── ...
│   ├── common/
│   │   ├── dto/base.dto.ts           # ← 通用分页/响应结构
│   │   ├── guards/auth.guard.ts      # ← API.auth 配置
│   │   └── filters/...
│   └── prisma/
│       └── schema.prisma             # ← DataModel → Prisma
├── prisma/
│   └── migrations/                   # ← DDL 迁移脚本
└── package.json
```

---

## 六、MCP 工具扩展

### 6.1 新增 MCP 工具

| 工具名 | 职责 | 对应 Schema 模块 |
|--------|------|-----------------|
| `data_model` | 实体/字段/关系 CRUD | DataModelSchema |
| `api_design` | Endpoint CRUD + Mock 联动 | ApiSchema |
| `biz_rules` | 校验规则/权限/流程编排 | BusinessRulesSchema |
| `codegen` | 选择 adapter → 生成代码 → 导出 | 所有模块 |
| `doc_gen` | 生成 PRD/API文档/测试用例 | 所有模块 |

### 6.2 工具间协作

```
data_model / add_entity "User"
    ↓ 自动触发
api_design / generate_crud "User"  (生成 5 个标准 CRUD endpoint)
    ↓ 自动触发
data_source / add (在 UI Schema 中添加对应 dataSource + mock)
```

---

## 七、实施优先级

### Phase A: 产品分析闭环（最高优先级）

> 目标：用户描述想法 → 专业的产品需求分析 → 完整 PRD → 基于 PRD 的设计规划

1. **创建 `product-analyst` skill** — 包含完整的产品分析方法论
   - 用户画像分析框架
   - 竞品分析模板
   - 功能优先级矩阵
   - 业务流程设计方法
   - 信息架构设计原则
2. **升级 `design-planner` skill** — 必须以 PRD 为输入（不再接受裸想法）
3. **建立 PRD 模板** — 标准化的产出格式

### Phase B: 数据架构闭环

> 目标：PRD 中的数据需求 → 完整的数据模型 + API 设计 → Mock 联动

4. 新增 DataModelSchema 类型定义
5. 新增 data_model MCP 工具
6. 新增 ApiSchema + api_design MCP 工具
7. DataModel ↔ UI DataSource 自动关联

### Phase C: 代码生成闭环

> 目标：完整 Schema → 多语言多框架代码

8. 前端 codegen adapters（React/Vue/Flutter）
9. 后端 codegen adapters（NestJS/Go/Python/Java）
10. 数据库 codegen adapters（PostgreSQL/Prisma）
11. 增量 codegen（Schema diff → 代码 patch）

### Phase D: 企业级完善

12. 业务规则编辑器
13. 自动化测试生成
14. CI/CD + 部署集成

---

## 八、与当前 design_docs 的关系

### 建议的文档重组

```
design_docs/
├── 01-vision/
│   ├── first-principles.md          # 已有
│   └── product-strategy.md          # ← 本文档
├── 02-product/
│   ├── overview.md                  # 已有
│   ├── editor/                      # 已有 (UI 编辑器)
│   ├── data-model-designer/         # ← 新增
│   │   └── README.md               # 数据模型设计器产品方案
│   ├── api-designer/                # ← 新增
│   │   └── README.md               # API 设计器产品方案
│   └── codegen/                     # ← 新增
│       └── README.md               # 代码生成产品方案
├── 03-tech/
│   ├── schema/
│   │   ├── ui-schema.md             # 已有
│   │   ├── data-model-schema.md     # ← 新增
│   │   ├── api-schema.md            # ← 新增
│   │   └── biz-rules-schema.md      # ← 新增
│   ├── codegen/
│   │   ├── architecture.md          # Adapter 架构
│   │   ├── react-adapter.md         # React 适配器详设
│   │   ├── nestjs-adapter.md        # NestJS 适配器详设
│   │   └── ...
│   └── ...（已有的技术文档）
├── 04-roadmap/
│   └── ...
└── 05-skills/                       # ← 新增（技能设计规范）
    ├── design-planner.md            # planner 技能的产品设计
    ├── data-model-designer.md       # 数据模型技能的产品设计
    ├── api-designer.md              # API 设计技能的产品设计
    └── design-codegen.md            # Codegen 技能的产品设计
```

---

## 九、总结：与竞品的本质差异

| | Figma | v0/bolt | 我们 |
|--|-------|---------|------|
| 输出物 | 静态像素图 | 一次性前端代码 | 活的 Schema（持续派生一切） |
| 后端 | ❌ | ❌ | ✅ 同一份 Schema 生成后端 |
| 数据模型 | ❌ | ❌ | ✅ 可视化设计 + 自动关联 |
| 增量修改 | ✅(手动) | ❌(每次重来) | ✅(Schema diff + 增量patch) |
| AI 能力 | 辅助对齐 | 从0生成 | 一步步增量构建 + 可撤销 |
| 企业级 | ❌ | ❌ | ✅ 权限/流程/测试/部署 |

**我们的护城河**：不是"AI 生成代码"（人人能做），而是**结构化 Schema 作为 Single Source of Truth + Adapter 层确定性转换**。AI 只负责"理解意图→操作 Schema"，不负责"直接生成最终代码"。
