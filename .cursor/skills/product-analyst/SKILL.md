---
name: product-analyst
description: 专业的产品需求分析技能。当用户描述一个产品想法、需求或功能时触发。通过系统化的多维度分析（用户画像、竞品、业务流程、信息架构），逐模块深入产出完整的产品需求文档（PRD）。适用场景包括：用户说"帮我做一个xx应用"、"分析这个需求"、"我要做一个xx功能"等涉及产品规划和需求分析的请求。
---

# 产品需求分析 Skill

将用户的产品想法转化为专业的、可执行的产品需求文档。通过系统化的多维度分析，逐步深入每个功能模块，确保需求的完整性和可落地性。

## 核心原则

### 产品分析不是一次性输出，而是一个分层深入的过程

```
错误：用户说完想法 → 一口气输出完整 PRD → 用户看完觉得"差不多" → 开始设计
正确：用户说完想法 → 全局框架分析 → 确认方向 → 逐模块深入 → 每个模块详细设计 → 汇总 PRD
```

### 分析的深度决定设计的质量

没有深度产品分析就开始 UI 设计 = 解决错误的问题。每个"显而易见"的功能背后都有大量隐藏的业务逻辑和边界情况。

### 多角度验证

每个产品决策都从至少 3 个角度验证：
- **用户角度**：用户真的需要吗？使用频率？替代方案？
- **商业角度**：对留存/转化/营收的贡献？ROI？
- **技术角度**：实现成本？技术风险？架构影响？
- **竞品角度**：竞品怎么做的？我们做得更好吗？差异化在哪？

---

## 工作流（三阶段）

### Phase 1: 全局框架分析

从用户描述中快速建立产品全貌，**不深入细节**，目的是与用户对齐大方向。

#### 1.1 产品定位提炼

```
- 一句话定位：这个产品是什么？为谁解决什么问题？
- 核心价值：用户为什么要用这个而不是现有方案？
- 目标用户：primary user + secondary user
- 使用场景：什么时候/什么地方/什么状态下使用？
```

#### 1.2 功能模块速览

从用户描述中识别所有隐含的功能模块（不遗漏），按领域分组：

```
用户说"校园社交App" → 至少包含：
├── 用户体系（注册/登录/个人资料/账号安全）
├── 内容体系（发布/浏览/互动/推荐）
├── 社交体系（关注/私信/好友/群组）
├── 社团体系（创建/加入/管理/活动）
├── 通知体系（系统通知/消息提醒/推送）
├── 搜索体系（内容搜索/用户搜索/社团搜索）
├── 安全体系（内容审核/举报/封禁）
└── 设置体系（偏好/隐私/通知设置）
```

#### 1.3 MVP 范围建议

基于功能模块，给出优先级建议：

| 优先级 | 模块 | 理由 |
|:------:|------|------|
| P0 必做 | 用户体系/内容体系 | 没有这些产品无法运行 |
| P1 重要 | 社交体系/通知 | 核心差异化价值 |
| P2 增强 | 社团/搜索 | 提升留存但非刚需 |
| P3 后续 | 安全/高级设置 | 规模化后再完善 |

#### 1.4 产出：全局分析文档

```markdown
# [产品名] 产品需求概览
## 一、产品定位
## 二、目标用户 & 核心场景
## 三、功能模块全景（含优先级）
## 四、MVP 范围建议
## 五、待深入分析的模块清单（作为 Phase 2 的输入）
```

**Phase 1 完成后必须与用户确认方向，再进入 Phase 2。**

---

### Phase 2: 逐模块深入分析

按优先级逐个模块进行深度分析。**每次只分析一个模块**，分析完与用户确认后再进入下一个。

#### 2.1 模块分析标准流程（每个模块都走一遍）

五步分析法（详细示例见 `references/module-analysis-example.md`）:

| Step | 内容 | 产出 |
|------|------|------|
| A: 用户故事 | "作为[角色]，我希望[功能]，以便[价值]" — 穷举核心/扩展/异常故事 | 用户故事列表 |
| B: 核心流程 | 主线流程(Happy Path) + 所有异常分支（树状结构） | 流程图 |
| C: 业务规则 | 数据规则/业务规则/安全规则/边界Case | 规则清单 |
| D: 数据模型 | 涉及实体(字段列表) + 涉及接口(method/path) | 数据概要 |
| E: 交互要点 | 关键交互行为提炼（给 interaction-designer 的线索） | 交互要点 |

#### 2.2 模块间关联分析

每个模块分析完后，标注依赖/被依赖/关联关系。

---

### Phase 3: 汇总 & 设计规划衔接

所有 P0/P1 模块分析完成后：

#### 3.1 汇总为完整 PRD

整合所有模块分析，形成结构化的 PRD 文档：

```markdown
# [产品名] 产品需求文档 V1.0

## 一、产品概述
### 1.1 产品定位
### 1.2 目标用户
### 1.3 核心价值
### 1.4 竞品对标

## 二、功能设计
### 2.1 功能全景图
### 2.2 [模块A] 详细设计
  - 用户故事
  - 核心流程
  - 业务规则 & 边界 Case
  - 数据模型
  - 交互要点
### 2.3 [模块B] 详细设计
  ...

## 三、信息架构
### 3.1 页面结构图
### 3.2 导航设计
### 3.3 页面间流转关系

## 四、数据架构概要
### 4.1 实体关系图
### 4.2 核心接口清单

## 五、非功能需求
### 5.1 性能要求
### 5.2 安全要求
### 5.3 兼容性要求

## 六、MVP 范围 & 里程碑
### 6.1 V1.0 范围
### 6.2 V1.1 规划
### 6.3 长期愿景
```

#### 3.2 创建 Design Registry 骨架（★ 关键步骤）

PRD 完成后，创建 `design-registry/` 目录结构，作为全链路的结构化数据源。

**创建流程：**

```
# 1. 创建目录结构
mkdir -p design-registry/pages

# 2. 创建全局索引 _index.json（通过 write_to_file）
# 3. 创建页面列表 pages/_index.json
# 4. 为每个页面创建目录 + _page.json
```

**脚本位置：** 所有 registry 操作脚本统一放在 `.cursor/skills/common/scripts/`，各技能共用。
调用方式：`npx ts-node --project .cursor/skills/common/scripts/tsconfig.json .cursor/skills/common/scripts/<script>.ts --registry <registry-path> [options]`

**目录结构：**

```
design-registry/
├── _index.json         ← 项目级信息（全局数据源）
├── pages/
│   ├── _index.json     ← 页面列表摘要
│   └── <page-id>/
│       └── _page.json  ← 每页的 product 层信息
```

**_index.json 内容：**

```jsonc
{
  "$schema": "design-registry/v5",
  "project": {
    "name": "项目名",
    "platform": "mobile",
    "viewport": { "width": 393, "height": 852 },
    "targetUser": { "summary": "用户画像摘要", "ref": "product-analysis/overview.md#目标用户" },
    "coreScenarios": [ { "summary": "场景描述", "ref": "..." } ],
    "styleDirection": { "summary": "视觉方向建议", "ref": "product-analysis/overview.md#视觉风格" }
  },
  "navigation": {
    "ref": "product-analysis/overview.md#信息架构",
    "tabBar": ["页面ID列表"],
    "flows": [ { "from": "...", "to": "...", "trigger": "...", "transition": "push|pop|fade" } ]
  },
  "globalState": {
    "ref": "product-analysis/overview.md#全局状态",
    "variables": [ { "key": "...", "type": "...", "purpose": "..." } ]
  },
  "modules": {
    "<module-id>": { "name": "...", "ref": "product-analysis/modules/xx.md", "priority": "P0" }
  }
}
```

**pages/_index.json 内容：**

```jsonc
{
  "pages": [
    { "id": "01-home-map", "name": "首页地图", "status": "pending", "nodeCount": 0 },
    { "id": "02-publish-moment", "name": "发布动态", "status": "pending", "nodeCount": 0 },
    { "id": "03-fishing", "name": "捞人", "status": "pending", "nodeCount": 0 }
  ]
}
```

**每个 _page.json 写入 product 层：**

```jsonc
{
  "id": "02-publish-moment",
  "type": "page",
  "name": "发布动态",
  "product": {
    "summary": "一句话页面定位",
    "ref": "product-analysis/modules/01-location-moment.md#2.1",
    "fromModules": ["location-moment"],
    "rules": ["关键业务规则摘要1", "关键业务规则摘要2"]
  }
}
```

**页面列表来源：** 从信息架构分析中推导出的所有页面。

**⚠️ 注意：** 此阶段只创建骨架（project级 + 页面级 product 层），不创建区块/元素节点文件。
后续技能（interaction-designer/design-planner）会逐步通过脚本追加节点。

---

## 文档存储规范

所有产出物存储在 `.design-workspaces/<task-name>/product-analysis/` 下：

```
.design-workspaces/<task-name>/
├── STATUS.md                          ← 任务状态（每次写入产物后同步更新）
└── product-analysis/
    ├── overview.md                    ← Phase 1: 全局框架分析
    ├── modules/
    │   ├── 01-user-system.md          ← 用户体系详细分析
    │   ├── 02-content-system.md       ← 内容体系详细分析
    │   ├── 03-social-system.md        ← 社交体系详细分析
    │   └── ...
    ├── analysis/
    │   ├── user-persona.md            ← 用户画像
    │   ├── competitor.md              ← 竞品分析
    │   └── info-architecture.md       ← 信息架构
    └── PRD.md                         ← Phase 3: 完整 PRD
```

### 任务命名
- 首次执行时，根据用户描述的需求自动生成 task-name（如 `campus-link-mvp`）
- 命名格式：`<项目简称>-<版本或特性>`

### 新会话续接
- AI 进入新会话时，先读 `.design-workspaces/<task>/STATUS.md` 了解进度
- 从 STATUS.md 中的"当前焦点"和"下一步"继续执行

---

## 执行节奏

1. **Phase 1 输出后暂停** — 等待用户确认大方向
2. **Phase 2 每个模块输出后暂停** — 等待用户反馈
3. **不要一口气全部输出** — 逐步深入，保持对话协作
4. **允许回溯** — Phase 2 的分析可能推翻 Phase 1 的某些假设，及时修正

---

## 与其他技能的衔接

| 当前技能产出 | 下游技能 | 消费方式 |
|------------|---------|---------|
| PRD + 信息架构 | design-planner | 作为设计规划的输入 |
| 数据模型概要 | data-model-designer | 细化为 DataModelSchema |
| API 清单 | api-designer | 细化为 ApiSchema |
| 视觉风格建议 | theme-generator | 作为风格参考 |
| 交互要点 | design-from-reference | 指导页面搭建 |

---

## 阶段门禁（★ 必须执行，不可跳过）

### 收尾门禁：完成产品分析 → 移交 interaction-designer 之前

```bash
SCRIPTS=".cursor/skills/common/scripts"
REGISTRY=".design-workspaces/<task>/design-registry"
WORKSPACE=".design-workspaces/<task>"

npx ts-node --project $SCRIPTS/tsconfig.json $SCRIPTS/stage-gate.ts \
  --registry $REGISTRY --workspace $WORKSPACE \
  --stage product --mode exit
```

**判定规则**：

| 退出码 | 含义 | 允许进入下一阶段？ |
|:------:|------|:------:|
| 0 | 全部通过 | ✅ |
| 1 | 有 ❌ 阻断项 | ❌ 必须修完所有 ❌ |
| 2 | 仅 ⚠️ 警告 | ✅ 但建议修 |

### 必须满足的最小契约（阻断项）

| 检查项 | 修复路径 |
|--------|---------|
| `_index.json` 存在且 `project.{name, platform, viewport, targetUser, styleDirection}` 齐全 | 重写 `_index.json` |
| `project.coreScenarios[]` ≥ 1 项 | 补核心场景 |
| `_index.json.modules{}` ≥ 1 个 | 把 `product-analysis/modules/*.md` 全部登记 |
| `pages/_index.json` ≥ 1 个页面 | 把信息架构 md 中所有页面登记 |
| **每个** `pages/<id>/_page.json` 存在 | 为 `pages/_index.json` 中每页创建 `_page.json` |
| **每个** `_page.json` 的 `product.{summary, ref, rules}` 都非空 | 业务规则不能为空数组——产品的灵魂在规则里 |

### 软约束（仅警告）

| 检查项 | 何时可忽略 |
|--------|-----------|
| `product.fromModules[]` 非空 | 系统页（splash/onboarding/error）可空，业务页必填 |
| `navigation.tabBar/flows` 非空 | 单页应用可忽略 |
| 全局 ref 文件存在 | 临时缺文件可后补 |

### ⚠️ 红线

- **绝不允许"差不多了就交给下游"**：跑 stage-gate 退出码 1 时，必须停下来补，否则下游 interaction-designer 会因上游门禁拒绝启动。
- **product 阶段就要把所有页面登记到 `pages/_index.json`**：信息架构 md 中识别出的页面必须 1:1 落到 schema，不能漏。
- **rules[] 是产品规则的容器，不可为空**：哪怕只有一条"无特殊规则"也要写出来强制思考。

---

## 详细参考（按需加载）

- `references/module-analysis-example.md` — ★ 模块分析五步法完整示例（注册模块）
- `references/user-story-method.md` — 用户故事编写方法论 + 验收标准格式
- `references/biz-logic-analysis.md` — 业务逻辑分析模板 + 常见边界 Case 清单
- `references/info-architecture.md` — 信息架构设计方法 + 导航模式选择
- `references/prd-template.md` — 完整 PRD 模板（可直接填充）
- `../common/references/stage-gate.md` — 全链路阶段门禁规范
