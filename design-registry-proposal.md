# Design Registry Schema — 最终定稿 v5

> 核心架构：**文件系统 = 树结构 = Schema**
> 每个节点一个小文件，目录层级就是父子关系，脚本遍历目录即遍历全树。
> Schema 是索引+摘要+ref，md 是完整详情，两者通过 ref 链接，不可能丢失信息。

---

## 1. 设计原则

```
文件系统即数据库：
  - 目录结构 = 树的父子关系
  - 单个 JSON 文件 = 一个节点的完整信息（15-40行）
  - _index.json / _page.json / _block.json = 目录级元数据
  - 文件名 = 节点ID，可直接搜索定位

Schema + md 分工：
  - Schema(JSON) = 结构骨架 + 各层摘要 + ref引用 + 实施状态
  - md文档 = 完整详情（精确px值/推理过程/绘制指令/变体规格）
  - ref 连接两者：节点告诉你"在哪找详情"，md 给你"精确怎么做"

生长规则：
  - 每个阶段遍历目录 → 分析 → 产出md → 往节点文件追加本层字段
  - 下游可新增子节点文件（越分析越细，目录自然生长）
  - ref为空 = 上游未覆盖 = 遗漏告警

AI读写模式：
  - 读: _index.json(50行) → pages/_index.json(20行) → 目标节点文件(30行) → ref指向的md
  - 写: 只改一个节点文件（replace_in_file 局部更新）
  - 每次操作总读取量: 100-200行，AI上下文零压力
```

---

## 2. 目录结构

```
.design-workspaces/<task>/
├── design-registry/                       ← ★ 统一Schema（文件系统即树）
│   ├── _index.json                        ← 全局元数据（~60行）
│   ├── pages/
│   │   ├── _index.json                    ← 页面列表摘要（~30行）
│   │   ├── 01-home-map/
│   │   │   ├── _page.json                 ← 页面级信息（~80行）
│   │   │   ├── _materials.json            ← 该页面素材索引（~40行）
│   │   │   ├── nav-bar/
│   │   │   │   ├── _block.json            ← 区块自身信息（~25行）
│   │   │   │   ├── avatar-btn.json        ← 叶子节点（~30行）
│   │   │   │   ├── nav-title.json
│   │   │   │   └── toggle-btn/
│   │   │   │       ├── _block.json
│   │   │   │       └── toggle-icon.json
│   │   │   ├── map-container/
│   │   │   │   ├── _block.json
│   │   │   │   ├── ambient-glow.json
│   │   │   │   └── ...
│   │   │   └── tab-bar/
│   │   │       └── ...
│   │   ├── 02-publish-moment/
│   │   │   ├── _page.json
│   │   │   ├── _materials.json
│   │   │   ├── nav-bar/
│   │   │   ├── map-preview/
│   │   │   ├── editor-section/
│   │   │   │   ├── _block.json
│   │   │   │   ├── textarea.json
│   │   │   │   ├── char-count.json
│   │   │   │   ├── image-grid/
│   │   │   │   │   ├── _block.json
│   │   │   │   │   ├── image-thumb.json
│   │   │   │   │   └── add-image-btn.json
│   │   │   │   └── visibility-row/
│   │   │   │       ├── _block.json
│   │   │   │       ├── vis-icon.json
│   │   │   │       ├── vis-label.json
│   │   │   │       └── chevron.json
│   │   │   ├── visibility-sheet/          ← 组件 = 一个目录
│   │   │   │   ├── _block.json
│   │   │   │   ├── option-public.json
│   │   │   │   ├── option-targeted.json
│   │   │   │   ├── option-timed.json
│   │   │   │   └── confirm-btn.json
│   │   │   └── location-fail-overlay/
│   │   │       ├── _block.json
│   │   │       ├── fail-icon.json
│   │   │       ├── fail-text.json
│   │   │       └── retry-btn.json
│   │   └── 03-fishing/
│   │       └── ...
│   └── scripts/
│       ├── validate.ts                    ← 完整性校验
│       ├── query.ts                       ← 灵活查询
│       ├── task-gen.ts                    ← 任务列表生成
│       └── stats.ts                       ← 进度统计
│
├── product-analysis/                      ← md详情（产品层）
├── interaction-design/                    ← md详情（交互层）
└── design-plan/                           ← md详情（设计层）
```

---

## 3. 全局索引文件

### _index.json（项目级，~60行）

```jsonc
{
  "$schema": "design-registry/v5",
  "version": 1,
  "updatedAt": "2026-05-27T22:00:00Z",

  "project": {
    "name": "校园足迹MVP",
    "platform": "mobile",
    "viewport": { "width": 393, "height": 852 },
    "designSystemRef": "design-plan/design-system.md",
    "interactionSystemRef": "interaction-design/overview.md",
    "projectId": "f77b323b-8fa7-43d1-b6d1-5eb3f8fade00",

    "targetUser": {
      "summary": "18-24岁大学生，社交活跃，追求潮流，夜生活丰富",
      "ref": "product-analysis/overview.md#目标用户"
    },
    "coreScenarios": [
      { "summary": "深夜在宿舍无聊想认识人", "ref": "product-analysis/overview.md#核心场景" },
      { "summary": "走到某个地方看别人留了什么", "ref": "product-analysis/overview.md#核心场景" }
    ],
    "styleDirection": {
      "summary": "午夜校园发光派对 — 暗色+荧光，沉浸+神秘",
      "ref": "product-analysis/overview.md#视觉风格建议"
    }
  },

  "navigation": {
    "ref": "product-analysis/overview.md#信息架构",
    "tabBar": ["01-home-map", "03-fishing", "08-message-list", "profile"],
    "flows": [
      { "from": "01-home-map", "to": "02-publish-moment", "trigger": "FAB click", "transition": "push" },
      { "from": "02-publish-moment", "to": "01-home-map", "trigger": "发布成功/取消", "transition": "pop" },
      { "from": "01-home-map", "to": "03-fishing", "trigger": "Tab切换", "transition": "fade" },
      { "from": "03-fishing", "to": "07-chat", "trigger": "打招呼成功", "transition": "push" },
      { "from": "03-fishing", "to": "09-shop", "trigger": "商店/次数用完", "transition": "push" }
    ]
  },

  "globalState": {
    "ref": "design-plan/design-system.md#全局状态",
    "variables": [
      { "key": "isLoggedIn", "type": "boolean", "purpose": "登录态" },
      { "key": "currentUser", "type": "object", "purpose": "当前用户信息" },
      { "key": "activeTab", "type": "enum", "purpose": "当前底部Tab" },
      { "key": "campusId", "type": "string", "purpose": "当前校园ID" }
    ]
  },

  "modules": {
    "location-moment": { "name": "位置动态体系", "ref": "product-analysis/modules/01-location-moment.md", "priority": "P0" },
    "fishing-social": { "name": "捞人社交体系", "ref": "product-analysis/modules/02-fishing-social.md", "priority": "P0" },
    "user-system": { "name": "用户体系", "ref": "product-analysis/modules/03-user-system.md", "priority": "P0" }
  }
}
```

### pages/_index.json（页面列表摘要，~30行）

```jsonc
{
  "pages": [
    { "id": "01-home-map", "name": "首页地图", "status": "completed", "nodeCount": 32, "materialCount": 9 },
    { "id": "02-publish-moment", "name": "发布动态", "status": "in-progress", "nodeCount": 26, "materialCount": 4 },
    { "id": "03-fishing", "name": "捞人", "status": "pending", "nodeCount": 48, "materialCount": 3 }
  ]
}
```

---

## 4. 页面级文件

### _page.json（页面自身信息，~80行）

```jsonc
{
  "id": "02-publish-moment",
  "type": "page",
  "name": "发布动态",

  "product": {
    "summary": "用户在当前位置发布图文动态，可选公开/定向/定时可见性",
    "ref": "product-analysis/modules/01-location-moment.md#2.1发布位置动态",
    "fromModules": ["location-moment"],
    "rules": [
      "校园围栏内才可发布",
      "文字1-500字，图片1-9张",
      "三种可见性：公开/定向/定时定向",
      "同一位置每小时最多1条，每日上限20条"
    ]
  },

  "interaction": {
    "summary": "定位→编辑→选可见性→发布，含11个状态",
    "ref": "interaction-design/pages/02-publish-moment.md",
    "states": [
      "init", "locating", "editing", "selecting_vis",
      "selecting_user", "setting_time", "previewing",
      "submitting", "success", "error", "location_fail"
    ],
    "operations": [
      "拖动大头针", "输入文字", "添加图片", "删除图片",
      "选择可见性", "点击发布", "取消发布"
    ]
  },

  "design": {
    "summary": "暗色表单页，极少装饰(仅1个定位脉冲)，视觉焦点在内容输入",
    "ref": "design-plan/pages/02-publish-moment/index.md",
    "visualRef": "design-plan/pages/02-publish-moment/visual.md"
  },

  "dataLayer": {
    "ref": "design-plan/pages/02-publish-moment/index.md#§7-8",
    "dataSources": [
      {
        "id": "ds-publish-moment",
        "name": "发布动态接口",
        "type": "api",
        "method": "POST",
        "path": "/api/v1/moments",
        "autoFetchOnEnter": false,
        "triggerBy": "publish-btn click",
        "mockScenarios": ["发布成功(200,1500ms)", "审核失败(400,800ms)", "服务错误(500,1000ms)"],
        "ref": "design-plan/pages/02-publish-moment/index.md#§8.1"
      }
    ],
    "stateView": [
      { "key": "content", "type": "string", "default": "", "purpose": "文字内容", "boundTo": "textarea" },
      { "key": "images", "type": "string[]", "default": "[]", "purpose": "已上传图片URLs" },
      { "key": "visibilityMode", "type": "enum", "default": "public", "purpose": "可见性模式" },
      { "key": "isPublishing", "type": "boolean", "default": false, "purpose": "发布loading态" },
      { "key": "locationReady", "type": "boolean", "default": false, "purpose": "GPS定位完成" },
      { "key": "sheetVisible", "type": "boolean", "default": false, "purpose": "Sheet面板显隐" },
      { "key": "pinLat", "type": "number", "default": null, "purpose": "大头针纬度" },
      { "key": "pinLng", "type": "number", "default": null, "purpose": "大头针经度" }
    ],
    "stateData": [
      { "key": "publishResult", "source": "ds-publish-moment.onSuccess", "purpose": "发布结果" }
    ]
  },

  "implementation": {
    "screenId": "sc_d18a35ab6c4845d1ad386",
    "rootNodeId": "nd_662e3c41a8504284b249f",
    "status": "in-progress"
  }
}
```

### _materials.json（页面素材索引，~40行）

```jsonc
{
  "materials": [
    {
      "id": "I-06",
      "name": "location-pin",
      "type": "icon",
      "refSize": [24, 32],
      "summary": "水滴形大头针，primary填充+白色内圆",
      "ref": "design-plan/pages/02-publish-moment/materials/I-06-location-pin.md",
      "usedBy": ["map-preview/pin-marker"],
      "implementation": { "materialId": null, "status": "pending" }
    },
    {
      "id": "I-07",
      "name": "vis-public",
      "type": "icon",
      "refSize": [20, 20],
      "summary": "地球图标，线性1.5px #A8A8B3",
      "ref": "design-plan/pages/02-publish-moment/materials/I-07-vis-public.md",
      "usedBy": ["editor-section/visibility-row/vis-icon", "visibility-sheet/option-public"],
      "implementation": { "materialId": "d39abf84-7046-4b6d-ac18-cada767d6c4b", "status": "completed" }
    }
  ]
}
```

---

## 5. 节点文件格式（完整）

### 叶子节点（~30-40行）

```jsonc
// design-registry/pages/02-publish-moment/nav-bar/publish-btn.json
{
  "id": "publish-btn",
  "type": "element",
  "name": "发布按钮",

  "product": {
    "summary": "提交发布位置动态",
    "ref": "product-analysis/modules/01-location-moment.md#3.2",
    "rules": ["内容为空时禁用", "每日上限20条"]
  },

  "interaction": {
    "summary": "click(条件)→loading→success(粒子飘落)/error(Toast)",
    "ref": "interaction-design/pages/02-publish-moment.md#操作清单:点击发布",
    "trigger": "click",
    "condition": "{{ content || images.length > 0 }}",
    "flows": {
      "success": { "summary": "✓+粒子飘落+1s后nav.back", "ref": "同上#Effects→success" },
      "error": { "summary": "恢复+Toast+表单可编辑", "ref": "同上#Effects→error" },
      "timeout": { "summary": "15s超时→恢复+Toast", "ref": "同上#边界情况" },
      "boundary": { "summary": "重复点击忽略", "ref": "同上#边界情况" }
    },
    "states": ["disabled", "active", "loading"]
  },

  "design": {
    "summary": "div, '发布', radius-sm, padding:6px 16px, 双态渐变/灰底",
    "ref": "design-plan/pages/02-publish-moment/index.md#§4.1:publish-btn",
    "visualRef": "design-plan/pages/02-publish-moment/visual.md#§6:发布按钮",
    "visualStates": {
      "disabled": { "summary": "bg:#252540, color:text-disabled", "ref": "visual.md#§6" },
      "active": { "summary": "bg:gradient(#4F8CFF→#7C5CFC), glow, color:#F2F2F7", "ref": "visual.md#§6" }
    },
    "interactionStates": {
      "hover": { "summary": "scale(1.02)", "ref": "interaction-design/overview.md#微交互" },
      "pressed": { "summary": "scale(0.97)", "ref": "interaction-design/overview.md#微交互" }
    }
  },

  "logic": {
    "enableCondition": "{{ state.view.content !== '' || state.view.images.length > 0 }}",
    "businessRules": [
      { "rule": "仅空格/换行视为空→禁用", "ref": "interaction-design/pages/02-publish-moment.md#发布按钮状态" }
    ]
  },

  "extremeCases": [
    { "case": "每日发布达上限(20条)", "handling": "按钮可点但弹Toast提示", "ref": "product-analysis/modules/01-location-moment.md#3.2" }
  ],

  "content": { "type": "text", "value": "发布" },
  "materials": null,

  "implementation": {
    "nodeId": "nd_87ac9e057a354da1aa054",
    "status": "completed",
    "checklist": {
      "structure": true,
      "styles": true,
      "events": true,
      "materials": true,
      "visualStates": true,
      "interactionStates": true,
      "dataBinding": true,
      "extremeCases": true
    }
  }
}
```

### 区块目录的 _block.json（~25行）

```jsonc
// design-registry/pages/02-publish-moment/nav-bar/_block.json
{
  "id": "nav-bar",
  "type": "block",
  "name": "导航栏",

  "interaction": {
    "summary": "固定顶部，含取消/标题/发布三个操作",
    "ref": "interaction-design/pages/02-publish-moment.md#页面布局"
  },

  "design": {
    "summary": "sticky-header, 毛玻璃, flex-row, space-between, padding:12px 16px",
    "ref": "design-plan/pages/02-publish-moment/index.md#§4.1",
    "layoutHint": "sticky-header"
  },

  "implementation": {
    "nodeId": "nd_892b648450624af8af5d8",
    "status": "completed"
  }
}
```

### 有素材切换的节点

```jsonc
// design-registry/pages/02-publish-moment/editor-section/visibility-row/vis-icon.json
{
  "id": "vis-icon",
  "type": "element",
  "name": "可见性模式图标",

  "interaction": {
    "summary": "随visibilityMode切换显示不同图标",
    "ref": "interaction-design/pages/02-publish-moment.md#可见性选择器"
  },

  "design": {
    "summary": "div, 20×20, 根据mode切换三种素材",
    "ref": "design-plan/pages/02-publish-moment/index.md#§4.4:icon-div"
  },

  "logic": {
    "dataBinding": "{{ state.view.visibilityMode }}",
    "businessRules": [
      { "rule": "public→I-07, targeted→I-08, timed→I-09", "ref": "index.md#§4.4" }
    ]
  },

  "content": { "type": "none" },
  "materials": [
    { "id": "I-07", "summary": "地球(公开)", "ref": "materials/I-07-vis-public.md", "condition": "{{ mode === 'public' }}" },
    { "id": "I-08", "summary": "靶心(定向)", "ref": "materials/I-08-vis-targeted.md", "condition": "{{ mode === 'targeted' }}" },
    { "id": "I-09", "summary": "时钟(定时)", "ref": "materials/I-09-vis-timed.md", "condition": "{{ mode === 'timed' }}" }
  ],

  "implementation": {
    "nodeId": "nd_ff6a6a889c5c4b26bcab6",
    "status": "completed",
    "checklist": { "structure": true, "styles": true, "materials": true, "dataBinding": true }
  }
}
```

---

## 6. 脚本能力

> 所有脚本统一存放在 `.codebuddy/skills/common/scripts/`，各技能共用。
> 调用方式：`npx ts-node .codebuddy/skills/common/scripts/<script>.ts --registry <registry-path> [options]`

### validate.ts — 完整性校验

```typescript
#!/usr/bin/env ts-node
/**
 * 遍历 design-registry 目录，校验每个节点的完整性
 * 用法: npx ts-node scripts/validate.ts [--page 02-publish-moment]
 * 输出: 问题列表 + 统计
 */

检查规则:
  1. 层级完整性:
     - 有 interaction.trigger 但无 design → "⚠️ 设计缺失"
     - 有 design 但 implementation.status=pending → "📋 待实施"
     - 有 interaction.states.length>1 但无 design.visualStates → "⚠️ 状态样式缺失"

  2. 内容完整性:
     - 叶子节点(无子目录) content.type=none 且 materials=null → "❌ 空壳节点"
     - materials 有条目但 _materials.json 中该素材 status=pending → "🎨 素材未绘制"

  3. 交互完整性:
     - 有 interaction.trigger 但无 flows.success 或 flows.error → "⚠️ 交互流不完整"
     - _page.json interaction.states 中每个非首个状态 →
       在子节点中找 visibleWhen 或 logic.displayCondition 引用该状态 →
       找不到 → "❌ 状态无UI结构"

  4. 引用完整性:
     - 所有 ref 字段 → 检查指向的文件是否存在

  5. 实施验收:
     - implementation.status=completed 但 checklist 有 false 项 → "⚠️ 验收不完整"
```

### query.ts — 灵活查询

```typescript
/**
 * 按条件查询节点
 * 用法:
 *   npx ts-node scripts/query.ts --status pending
 *   npx ts-node scripts/query.ts --type component
 *   npx ts-node scripts/query.ts --has-materials --status pending
 *   npx ts-node scripts/query.ts --missing design --page 03-fishing
 *   npx ts-node scripts/query.ts --trigger click --page 02-publish-moment
 */

支持过滤:
  --status pending|completed        implementation.status
  --type element|block|component    节点类型
  --has-materials                   有素材需求的
  --missing product|interaction|design  缺少某层的
  --trigger click|change|...        有特定触发器的
  --page <id>                       限定页面范围
  --checklist-incomplete            checklist 有 false 的

输出格式:
  path                          | type      | status    | summary
  02-publish-moment/visibility-sheet/option-public | element | pending | 公开选项，click→选中
  02-publish-moment/location-fail-overlay/retry-btn | element | pending | 重试定位
```

### task-gen.ts — 任务列表生成

```typescript
/**
 * 为指定技能生成有序任务列表
 * 用法:
 *   npx ts-node scripts/task-gen.ts --for executor --page 02-publish-moment
 *   npx ts-node scripts/task-gen.ts --for planner
 *   npx ts-node scripts/task-gen.ts --for interaction
 */

executor 模式:
  1. 找所有 implementation.status=pending 的节点
  2. 按目录深度排序（父先于子）
  3. 检查依赖（父节点 completed 才能做子节点）
  4. 输出有序任务列表:
     [1] 02-publish-moment/visibility-sheet/_block → 搭建Sheet容器
     [2] 02-publish-moment/visibility-sheet/option-public → 搭建公开选项
     [3] 02-publish-moment/visibility-sheet/option-targeted → 搭建定向选项
     ...
  5. 每个任务附带: 节点的 design.summary + 需要读的 ref 列表

planner 模式:
  1. 找所有有 interaction 但无 design 的节点
  2. 输出待设计清单

interaction 模式:
  1. 找所有有 product 但无 interaction 的页面
  2. 输出待分析页面清单
```

### stats.ts — 进度统计

```typescript
/**
 * 输出项目整体进度
 * 用法: npx ts-node scripts/stats.ts
 */

输出:
  ═══ 校园足迹MVP 进度报告 ═══

  页面进度:
    ✅ 01-home-map     32/32 节点 (100%)  9/9 素材
    🔄 02-publish-moment  15/26 节点 (58%)   1/4 素材
    ⬜ 03-fishing       0/48 节点 (0%)    0/3 素材

  待处理:
    - 11 个节点待实施 (02-publish-moment)
    - 48 个节点待实施 (03-fishing)
    - 6 个素材待绘制
    - 2 个节点交互流不完整

  下一步建议:
    → 继续 02-publish-moment: visibility-sheet 区块 (6个节点)
```

---

## 7. AI 技能读写模式

### 通用启动流程（所有技能）

```
1. read_file design-registry/_index.json          → 全局视图 (~60行)
2. read_file design-registry/pages/_index.json    → 页面列表+状态 (~30行)
3. 确定本次操作目标（哪个页面/哪些节点）
4. read_file design-registry/pages/<target>/_page.json  → 页面级信息
5. list_dir design-registry/pages/<target>/       → 看有哪些区块
6. read_file 需要操作的节点文件                    → 单个30行
```

### 写入模式（单节点更新）

```
场景: executor 完成了 publish-btn 的实施

操作:
  read_file  pages/02-publish-moment/nav-bar/publish-btn.json
  → 确认当前内容
  replace_in_file  更新 implementation 字段
  → { "nodeId": "nd_xxx", "status": "completed", "checklist": {...} }

不需要动其他文件（除非更新页面 _index 的 status）
```

### 新增节点（design-planner 展开组件）

```
场景: planner 分析 visibility-sheet 组件，需要展开子节点

操作:
  1. 创建目录: pages/02-publish-moment/visibility-sheet/
  2. write_to_file _block.json  (组件自身信息)
  3. write_to_file option-public.json
  4. write_to_file option-targeted.json
  5. write_to_file option-timed.json
  6. write_to_file confirm-btn.json
  7. 更新 pages/_index.json 的 nodeCount
```

---

## 8. 各阶段操作规则

| 阶段 | 读什么 | 写什么 | 可能新增什么 |
|------|-------|-------|------------|
| product-analyst | 无(从零创建) | _index.json + pages/_index.json + 每页 _page.json(product层) | 整个 design-registry/ 骨架 |
| interaction-designer | _index + _page | _page.json(interaction层) + 节点文件(interaction层) + _index.json(interactionSystemRef) | 新节点文件(操作元素/状态节点) |
| design-planner | _index + _page + 节点文件 | 节点文件(design层) + _materials.json | 新节点目录(组件展开/装饰元素) |
| design-executor | _index + _page + 节点文件 + ref→md | 节点文件(implementation层) | 无(不新增节点) |

---

## 9. 完整性保证总结

| 维度 | Schema 如何保证 | 校验脚本如何检查 |
|------|----------------|---------------|
| 产品逻辑不丢 | 每个节点 product.ref 指向 md | validate: ref 文件存在? |
| 交互细节不丢 | 每个节点 interaction.flows(success/error/timeout) + ref | validate: 有 trigger 必有 flows |
| 状态全覆盖 | _page.json states列表 + 子节点 visibleWhen | validate: 每个非基准态有对应节点 |
| 样式不丢 | design.ref + visualRef 指向精确位置 | validate: 有 design 必有 ref |
| 多状态不丢 | design.visualStates + interactionStates | validate: states>1 必有 visualStates |
| 素材不丢 | _materials.json + 节点 materials[] | validate: usedBy 的节点存在 |
| API/状态管理不丢 | _page.json dataLayer | validate: dataSources 和 stateView 不为空 |
| 业务规则不丢 | logic.businessRules[].ref | validate: 每条 rule 有 ref |
| 极端情况不丢 | extremeCases[] | validate: 叶子元素有内容处理 |
| 实施不遗漏 | implementation.checklist 8项 | validate: status=completed 时全部 true |
| 导航关系不丢 | _index.json navigation.flows | validate: from/to 页面都存在 |

**任何一项为空或不一致 → 脚本自动报告 → 对应技能必须补充。**
