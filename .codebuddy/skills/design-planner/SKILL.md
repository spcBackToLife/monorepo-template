---
name: design-planner
description: 应用设计全流程规划技能。当用户要求设计一个完整的应用（或多页面功能模块）时触发。生成覆盖视觉风格落地、素材清单、组件体系、接口设计、状态管理、Mock 场景、页面结构的完整设计计划，并持久化为可跨会话继续执行的任务文档。触发词包括："帮我设计一个 app"、"设计一个xx功能"、"规划页面"、"做一个完整设计"等涉及多页面/多维度系统性设计的请求。
---

# design-planner

产出可执行的设计工程计划文档，按任务逐步执行，支持跨会话继续。

---

## 触发条件

- 涉及 3+ 页面的设计请求
- 用户要求"规划"、"设计一个 app"、"系统性设计"
- 对已有设计不满意要求重新规划

## 不触发

- 单页样式调整 → `design-from-reference`
- 单个素材绘制 → `design-from-screenshot`
- 纯主题 Token → `theme-generator`

---

## 工作流

### Phase 0: 需求理解 & 主题门禁

1. 从用户描述提取结构化信息（应用名/类型/目标用户/核心功能/页面清单/风格方向）
2. `theme / check` → customized=false 则先触发 `theme-generator`
3. `theme / get` → 读取完整 ThemeConfig
4. **风格语言转化**：将 decorationRules 转为具体 CSS 模式清单（参考 `references/decoration-patterns.md`）

输出：`## 风格语言清单`（装饰手法 / 动效语言 / 装饰性元素列表）

### Phase 0b: 视觉策略设计（每个页面的视觉决策）

**核心**：在规划具体素材/组件之前，先为每个页面做视觉层面的设计思考。

#### 输入
- product-analyst 的 PRD（了解每个页面的功能定位）
- interaction-designer 的交互规格（了解状态和反馈需求）
- ThemeConfig（风格约束）

#### 每个页面的视觉策略包含

```markdown
### [页面名] 视觉策略

#### 情感目标
- 这个页面要传递什么感觉？（安全/活力/专业/温暖/...）
- 用户的情绪上下文是什么？（焦虑等待/轻松浏览/专注操作/...）

#### 视觉重心
- 用户注意力应该首先落在哪里？（CTA按钮/内容区/搜索框/...）
- 如何引导视觉流向？（大小对比/色彩对比/留白引导/...）

#### 视觉层次（从前景到背景）
- L1 前景交互层: 按钮/输入框/操作元素 → 最高对比度 + 最强视觉重量
- L2 内容层: 文字/图片/卡片 → 中等对比度
- L3 结构层: 分割线/容器边界 → 低对比度
- L4 氛围层: 背景装饰/光效/纹理 → 最低对比度（不抢注意力但营造情绪）

#### 装饰策略
- 背景处理: 纯色/渐变/图案/模糊图/粒子/几何装饰
- 按钮装饰: 纯色填充/渐变/外发光/内阴影/悬浮感
- 卡片装饰: 边框/阴影/毛玻璃/渐变底/微光边
- 氛围元素: 光晕/光斑/波纹/几何线条/渐变色块
- 分隔方式: 线/间距/色差/阴影

#### 视觉节奏
- 疏密交替: 密集信息区 ↔ 留白呼吸区 的节奏
- 大小对比: 标题/正文/辅助信息 的层级感
- 色彩节奏: 主色点缀频率（不过多不过少）
```

#### 产出

```
.design-workspaces/<task>/design-plan/visual-strategy.md
```

包含每个页面的视觉策略 + 全局视觉节奏说明。

### Phase 1: 素材清单（视觉表现力体系）

素材不只是图标，而是构成**完整视觉表现力**的所有元素。按类型分为 4 类：

#### 1.1 功能性素材（Icon）— 传递信息、辅助操作

| 字段 | 说明 |
|------|------|
| 编号 | I-01, I-02... |
| 名称 | 首页图标 |
| 用途 | BottomTab inactive/active |
| 尺寸 | 从 iconSpec + 目标容器推导 |
| 风格 | 从 iconSpec.style 读取 |
| 颜色 | 从 iconSpec.colors 读取（Token 引用） |

#### 1.2 装饰性素材（Decoration）— 营造氛围、增强视觉层次

| 字段 | 说明 |
|------|------|
| 编号 | D-01, D-02... |
| 名称 | 登录页背景光晕 |
| 用途 | 登录页右上角氛围装饰 |
| 类型 | 光晕/光斑/几何线条/波纹/粒子/渐变色块/纹理 |
| 尺寸 | 根据视觉策略的"氛围层"设计确定 |
| 视觉作用 | 营造科技感/增加空间深度/引导视觉流向/... |
| 颜色 | primary 20%透明度 / secondary gradient / ... |
| 模糊度 | 是否需要 blur（背景装饰通常需要柔化边缘） |

#### 1.3 品牌性素材（Brand）— 建立品牌识别

| 字段 | 说明 |
|------|------|
| 编号 | B-01, B-02... |
| 名称 | App Logo |
| 用途 | 启动页/登录页/侧边栏 |
| 变体 | 全彩/单色/带文字/纯图形 |
| 尺寸 | 多尺寸适配（32/64/128） |

#### 1.4 情感性素材（Illustration）— 传递情感、引导操作

| 字段 | 说明 |
|------|------|
| 编号 | IL-01, IL-02... |
| 名称 | 空状态插画 |
| 用途 | Feed 列表无数据时的空态展示 |
| 情感 | 鼓励/安慰/引导 |
| 风格 | 与整体 iconStyle 一致（线描/填充/扁平/...） |
| 尺寸 | 通常较大（120×120 ~ 200×200） |

#### 视觉表现力设计原则

```
装饰不是"好看"，而是有功能的：
├── 光晕/光斑    → 营造空间深度 + 引导视觉重心
├── 几何线条    → 增加现代感/科技感 + 分隔空间
├── 渐变色块    → 建立层次 + 传递品牌色
├── 纹理/噪点   → 增加质感 + 减少数字感
├── 模糊/毛玻璃 → 层次分离 + 优雅过渡
└── 微动画      → 暗示可交互 + 增加活力

❌ 没有功能的装饰 = 视觉噪音，必须删除
✅ 每个装饰元素都要能回答："它为什么在这里？去掉它页面会怎样？"
```

#### 装饰元素与视觉策略的关系

```
视觉策略(Phase 0b)            素材清单(Phase 1)
  │                              │
  ├── 情感目标: 科技感    →      D-01: 背景几何光线网格
  ├── 视觉重心: CTA按钮   →      D-02: 按钮外发光效果
  ├── 氛围层: 渐变光晕    →      D-03: 右上角主色光晕
  └── 视觉节奏: 留白+点缀 →      D-04: 间隔装饰线
```

### Phase 2: 组件体系

列出需沉淀为组件模板的元素：

| 字段 | 说明 |
|------|------|
| 组件名 | GlowButton |
| Props 定义 | label, variant(primary/secondary/ghost), size(sm/md/lg), icon?, loading? |
| 包含的素材依赖 | I-xx（关联素材编号） |
| 状态 | default/hover/pressed/disabled/loading |
| Token 使用 | primary, radius-md, shadow-sm, transition-fast |
| 沉淀级别 | 项目级 / 页面级 |
| 执行状态 | ❌/⏳/✅ |

### Phase 3: 接口 & Mock 设计

每个页面的数据源规划：

- 数据源 ID / 类型(static/api) / 接口定义(method+path)
- Mock 场景列表（正常/空/错误/超时/加载更多）
- TypeDef 定义（responseFields）
- autoFetchOnEnter 配置

### Phase 4: 状态管理

每个页面的 ScreenStateInit 设计：

- data 命名空间（业务数据 key + 类型 + 来源）
- view 命名空间（UI 临时状态 key + defaultValue）
- effects 关联（哪些 data key 由 effect.fetch 写入）
- 列表模式（repeat expression + scrollReachBottom 分页逻辑）

### Phase 5: 页面结构

每个页面的节点树骨架（缩进层级表示）：
- 标注布局方式（flex/grid/sticky）
- 标注 layoutHint（scroll-child/sticky-header/sticky-footer）
- 标注数据绑定点（repeat / bind / visibleWhen）
- 标注事件绑定点（click / screenEnter / scrollReachBottom）

### Phase 6: 输出计划文档

将 Phase 0-5 的结果持久化为：

```
.design-workspaces/<task-name>/design-plan/plan.md
```

同时更新 `.design-workspaces/<task-name>/STATUS.md`。

---

## 计划文档结构

    # {项目名} 设计计划
    > projectId: xxx
    > 创建时间: YYYY-MM-DD
    > 状态: 规划中 / 执行中 / 已完成
    
    ## 一、风格语言
    ## 二、素材清单（表格，含执行状态列）
    ## 三、组件清单（表格，含执行状态列）
    ## 四、接口 & Mock
    ## 五、状态管理
    ## 六、页面结构
    ## 七、执行计划
    ## 八、执行日志

执行计划中每个任务含：任务编号 / 依赖 / 执行技能 / 验收标准 / 状态(❌/⏳/✅)

执行日志：每次会话追加记录（日期 + 完成任务 + 问题）

---

## 执行顺序约束

```
主题(Phase 0) → 素材(逐个) → 基础组件(逐个) → 页面搭建(逐页)
                   ↓                ↓                ↓
            design-from-      design-from-     design-from-
            screenshot        reference        reference
```

每个任务独立执行，执行完更新计划文档状态，下次会话读取文档继续。

---

## 跨会话继续

新会话触发时：

1. 读取 `.design-workspaces/<task-name>/STATUS.md` 了解全局进度
2. 读取 `.design-workspaces/<task-name>/design-plan/plan.md`
3. 扫描所有任务状态，找到第一个 ❌ 任务
4. 检查其依赖是否全部 ✅
5. 执行该任务
6. 完成后标记 ✅，追加执行日志，更新 STATUS.md
6. 继续下一个或等待用户指令

---

## 约束

- 计划文档必须持久化到文件系统
- 每个素材/组件/页面是独立任务，逐个执行
- 素材颜色/风格必须引用主题 Token 和装饰规则
- 列表结构必须用 repeat + dataSource，禁止硬编码
- 状态管理先于页面搭建
- 禁止 emoji 替代图标素材

---

## 协作技能

| 阶段 | 调用技能 | 输入 |
|------|---------|------|
| 主题生成 | theme-generator | 用户风格描述 |
| 素材绘制 | design-from-screenshot | 素材清单中单个素材的规格 |
| 页面/组件搭建 | design-from-reference | 页面结构 + 状态设计 + 接口设计 |

---

## references/

- `references/decoration-patterns.md` — 装饰风格 CSS 实现模式速查
- `references/decoration-elements-guide.md` — 装饰元素完整分类体系 + 选择逻辑 + 组合规则 + 用量控制
- `references/mcp-tools-cheatsheet.md` — MCP 工具与设计任务映射表
