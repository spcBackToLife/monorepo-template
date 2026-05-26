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

### Phase 1: 素材清单

逐个列出所有需要设计的视觉素材，每个包含：

| 字段 | 说明 |
|------|------|
| 编号 | I-01 / D-01 / B-01（Icon/Decoration/Brand） |
| 名称 | 首页图标 |
| 用途 | BottomTab inactive/active |
| 尺寸 | 24×24 |
| 风格 | 从 decorationRules.iconStyle 推导 |
| 颜色规格 | 使用 Token 引用，如 inactive=$token:textTertiary, active=gradient(primary→secondary) |
| 执行状态 | ❌/⏳/✅ |

**约束**：
- 禁止 emoji 替代图标
- 所有素材颜色必须引用主题 Token
- 规格必须足够清晰，可直接交给 `design-from-screenshot` 执行

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
design_docs/03-tech/{project-name}-design-plan.md
```

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

1. 读取 `design_docs/03-tech/{project}-design-plan.md`
2. 扫描所有任务状态，找到第一个 ❌ 任务
3. 检查其依赖是否全部 ✅
4. 执行该任务
5. 完成后标记 ✅，追加执行日志
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
- `references/mcp-tools-cheatsheet.md` — MCP 工具与设计任务映射表
