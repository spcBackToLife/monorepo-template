# .design-workspaces — AI 技能工作空间

AI 技能执行过程中的**持久化工作产物**统一存储目录。放在项目根目录下，用户可直接查看和编辑。

---

## 核心原则

1. **按任务（需求）隔离** — 每个任务是一个完整的工作单元
2. **每个任务包含所有技能产物** — 从产品分析到代码生成的全链路
3. **STATUS.md 是续接入口** — 新会话第一件事：读目标任务的 STATUS.md
4. **跨技能可引用** — 下游技能直接 read_file 读取上游产物
5. **同一项目可多次迭代** — 每次迭代/需求是独立的 task 目录

---

## 目录结构

```
.design-workspaces/
├── README.md                                  ← 本文件（结构说明）
│
└── <task-name>/                               ← 一个任务 = 一个完整工作流
    │
    ├── STATUS.md                              ← 【核心】任务状态 + 新会话续接入口
    │
    ├── product-analysis/                      ← product-analyst 技能产物
    │   ├── overview.md                        ← Phase 1: 全局框架分析
    │   ├── modules/                           ← Phase 2: 逐模块深入
    │   │   ├── 01-user-system.md
    │   │   ├── 02-content-system.md
    │   │   └── ...
    │   ├── analysis/                          ← 专项分析
    │   │   ├── user-persona.md
    │   │   ├── competitor.md
    │   │   └── info-architecture.md
    │   └── PRD.md                             ← Phase 3: 完整 PRD
    │
    ├── interaction-design/                    ← interaction-designer 技能产物
    │   ├── overview.md                        ← 全局交互规范（反馈层级/加载/转场）
    │   ├── pages/                             ← 逐页面交互规格
    │   │   ├── login.md
    │   │   ├── register.md
    │   │   ├── home-feed.md
    │   │   └── ...
    │   └── components/                        ← 通用组件交互规格
    │       ├── form-input.md
    │       └── action-button.md
    │
    ├── design-plan/                           ← design-planner 技能产物
    │   ├── plan.md                            ← 设计规划总文档
    │   ├── component-system.md                ← 组件体系
    │   ├── data-architecture.md               ← 数据 & API 架构
    │   └── task-list.md                       ← 执行任务清单
    │
    ├── theme/                                 ← theme-generator 技能产物
    │   ├── theme-config.json                  ← ThemeConfig 快照
    │   └── style-guide.md                     ← 风格说明
    │
    ├── ui-design/                             ← design-from-reference 技能产物
    │   ├── screen-map.md                      ← 页面清单 & 节点 ID
    │   ├── interaction-log.md                 ← 交互事件记录
    │   └── data-binding-log.md                ← 数据绑定记录
    │
    ├── material/                              ← design-from-screenshot 技能产物
    │   ├── material-registry.md               ← 素材清单（ID + 用途 + 节点）
    │   └── icon-spec.md                       ← 图标规格快照
    │
    └── codegen/                               ← design-codegen 技能产物（未来）
        ├── schema-snapshot.json
        └── output-log.md
```

---

## STATUS.md 规范

每个任务的 `STATUS.md` 是**新会话续接的唯一入口**。AI 进入新会话时：
1. 用户告知要继续哪个任务
2. AI 读取该任务的 `STATUS.md`
3. 了解当前进度、待办事项、阻塞点
4. 从断点处继续执行

### 格式模板

```markdown
# {任务名} — 设计状态

## 基本信息
- 创建时间: YYYY-MM-DD
- 最后更新: YYYY-MM-DD
- 关联项目 ID: （设计软件中的 projectId）

## 阶段进度
- [x] product-analysis: 已完成
- [ ] design-plan: 进行中
- [ ] theme: 未开始
- [ ] ui-design: 未开始
- [ ] material: 未开始
- [ ] codegen: 未开始

## 当前焦点
阶段: design-plan
状态: Phase 2 执行中，已完成 3/8 个任务
下一步: T-04 创建主页 Feed 列表组件

## 待确认事项
- [ ] 社交体系是否需要群聊功能？（等待用户回复）
- [ ] 推荐算法用简单时间排序还是热度排序？

## 已知阻塞
- 无

## 关键产物索引
- PRD: ./product-analysis/PRD.md
- 设计计划: ./design-plan/plan.md
- 任务清单: ./design-plan/task-list.md
```

---

## 任务命名规范

```
<项目简称>-<版本或特性>

示例:
  campus-link-mvp          ← 校园社交 MVP 版本
  campus-link-v2-social    ← V2 社交功能升级
  todo-app-demo            ← 简单示例应用
  crm-enterprise           ← 企业 CRM 系统
```

---

## 各技能的存储约定

| 技能 | 写入目录 | 触发写入时机 |
|------|---------|------------|
| product-analyst | `<task>/product-analysis/` | Phase 1 完成写 overview.md；Phase 2 每完成一个模块写对应 md |
| interaction-designer | `<task>/interaction-design/` | 先写 overview.md；逐页面写 pages/*.md |
| design-planner | `<task>/design-plan/` | 规划完成后写入 |
| theme-generator | `<task>/theme/` | 主题生成后导出快照 |
| design-from-reference | `<task>/ui-design/` | 每完成一个页面更新 screen-map.md |
| design-from-screenshot | `<task>/material/` | 每完成一批素材更新 registry |
| design-codegen | `<task>/codegen/` | 代码生成时写入 |

**每次写入产物后，必须同步更新 STATUS.md。**

---

## 跨任务引用

如果一个任务需要引用另一个任务的产出（如 V2 引用 V1 的 PRD）：

```markdown
<!-- 在 STATUS.md 或具体文档中 -->
基于: ../<campus-link-mvp>/product-analysis/PRD.md
变更点: 新增社团管理模块、升级推荐算法
```

---

## .gitignore 建议

```gitignore
# 如果不想提交到 git（视团队偏好）:
# .design-workspaces/

# 如果想提交（推荐，作为设计资产留档）:
# 不加 ignore，正常提交
```
