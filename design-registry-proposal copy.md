# Design Registry Schema — 最终方案 v5

> 核心：一棵不断生长的树，Schema 是索引+摘要+引用，md 是完整详情，通过 ref 链接。
> 每个节点自包含所有维度信息：产品逻辑、交互流程、视觉设计、业务规则、数据绑定、素材需求。

---

## 1. 设计原则

```
Schema = 结构骨架 + 摘要（便于遍历/校验/生成任务） + ref 引用（指向完整详情）
md文档 = 完整详情（精确值/推理过程/绘制指令/变体规格）

两者关系：
  - Schema 告诉你"有什么、在哪里、什么状态、各维度摘要"
  - md 告诉你"精确怎么做"
  - ref 连接两者，保证不丢

生长规则：
  - 每个阶段遍历树 → 分析 → 产出 md 文档 → 往节点追加本层(summary + ref)
  - 下游阶段可以新增子节点（越分析越细）
  - ref 为空 = 上游未覆盖 = 遗漏告警

完整性保证：
  - 每个节点的 product/interaction/design/logic/materials 任何一个该有但为空 → 告警
  - 脚本可遍历全树自动检查
```

---

## 1.5 项目级全局字段

```jsonc
{
  "$schema": "design-registry/v5",
  
  // ═══ 项目元数据 ═══
  "project": {
    "name": "校园足迹MVP",
    "platform": "mobile",
    "viewport": { "width": 393, "height": 852 },
    "designSystemRef": "design-plan/design-system.md",
    "projectId": "f77b323b-8fa7-43d1-b6d1-5eb3f8fade00",
    
    // 用户画像 + 核心场景（影响所有设计决策的根基）
    "targetUser": {
      "summary": "18-24岁大学生，社交活跃，追求潮流，夜生活丰富",
      "ref": "product-analysis/overview.md#目标用户"
    },
    "coreScenarios": [
      { "summary": "深夜在宿舍无聊想认识人", "ref": "product-analysis/overview.md#核心场景" },
      { "summary": "走到某个地方看别人留了什么", "ref": "product-analysis/overview.md#核心场景" },
      { "summary": "在TA必经的路上留一条只有TA能看到的消息", "ref": "product-analysis/overview.md#核心场景" }
    ],
    "styleDirection": {
      "summary": "午夜校园发光派对 — 暗色+荧光，沉浸+神秘",
      "ref": "product-analysis/overview.md#视觉风格建议"
    }
  },

  // ═══ 页面间导航关系 ═══
  "navigation": {
    "ref": "product-analysis/overview.md#信息架构",
    "tabBar": ["01-home-map", "03-fishing", "08-message-list", "profile"],
    "flows": [
      { "from": "01-home-map", "to": "02-publish-moment", "trigger": "FAB click", "transition": "push" },
      { "from": "02-publish-moment", "to": "01-home-map", "trigger": "发布成功/取消", "transition": "pop" },
      { "from": "01-home-map", "to": "03-fishing", "trigger": "Tab切换", "transition": "fade" },
      { "from": "03-fishing", "to": "07-chat", "trigger": "打招呼成功", "transition": "push" },
      { "from": "03-fishing", "to": "09-shop", "trigger": "商店按钮/次数用完", "transition": "push" }
    ]
  },

  // ═══ 全局共享状态（跨页面）═══
  "globalState": {
    "ref": "design-plan/design-system.md#全局状态",
    "variables": [
      { "key": "isLoggedIn", "type": "boolean", "purpose": "登录态" },
      { "key": "currentUser", "type": "object", "purpose": "当前用户信息(id/nickname/avatar)" },
      { "key": "activeTab", "type": "enum", "values": ["map","fishing","message","profile"], "purpose": "当前底部Tab" },
      { "key": "campusId", "type": "string", "purpose": "当前校园ID" }
    ]
  },

  // ═══ 模块索引 ═══
  "modules": { /* ... */ },
  
  // ═══ 页面树 ═══
  "pages": [ /* ... */ ],
  
  // ═══ 素材总索引 ═══
  "materials": { /* ... */ }
}
```

## 2. 节点统一结构

```jsonc
{
  "id": "string",                    // 当前层级唯一标识
  "type": "page | block | element | component | material",
  "name": "人类可读名称",

  // ═══ 产品层（product-analyst 写入）═══
  "product": {
    "summary": "一句话：这个东西的业务含义",
    "ref": "product-analysis/modules/xx.md#章节",
    "rules": ["关键业务规则1", "规则2"]
  },

  // ═══ 交互层（interaction-designer 写入）═══
  "interaction": {
    "summary": "操作→响应 的一句话描述",
    "ref": "interaction-design/pages/xx.md#具体位置",
    "trigger": "click | change | drag | screenEnter | ...",
    "condition": "{{ 触发前置条件 }}",
    "flows": {
      "success": { "summary": "成功后的反馈描述", "ref": "..." },
      "error": { "summary": "失败后的反馈描述", "ref": "..." },
      "timeout": { "summary": "超时处理", "ref": "..." },
      "boundary": { "summary": "边界情况处理", "ref": "..." }
    },
    "states": ["该节点涉及的业务状态列表"],
    "visibleWhen": "{{ 条件显示表达式 }}"
  },

  // ═══ 设计层（design-planner 写入）═══
  "design": {
    "summary": "tag + 关键样式 + 内容摘要",
    "ref": "design-plan/pages/xx/index.md#§N:元素名",
    "visualRef": "design-plan/pages/xx/visual.md#§6:对应行",
    "componentRef": "design-plan/pages/xx/components/name.md",  // 组件才有
    
    // 业务视觉状态（通过 state 变量驱动，如 disabled/active/loading）
    "visualStates": {
      "disabled": { "summary": "样式差异描述", "ref": "..." },
      "active": { "summary": "样式差异描述", "ref": "..." },
      "loading": { "summary": "样式差异描述", "ref": "..." }
    },
    
    // CSS 交互状态（hover/pressed/focus，通过 visual_state 工具实现）
    "interactionStates": {
      "hover": { "summary": "hover效果", "ref": "..." },
      "pressed": { "summary": "按下效果", "ref": "..." },
      "focus": { "summary": "聚焦效果", "ref": "..." }
    }
  },

  // ═══ 业务逻辑层（聚合产品+交互中的判断逻辑）═══
  "logic": {
    "displayCondition": "{{ 什么时候展示 }}",
    "enableCondition": "{{ 什么时候可用 }}",
    "dataBinding": "{{ 数据来源表达式 }}",
    "repeat": "{{ 列表绑定表达式 }}",
    "businessRules": [
      { "rule": "规则描述", "ref": "来源文档#位置" }
    ]
  },

  // ═══ 极端情况处理（内容溢出/空状态/异常数据）═══
  "extremeCases": [
    { "case": "描述极端场景", "handling": "处理方式", "ref": "来源文档" }
  ],

  // ═══ 素材/内容（该节点的视觉内容从哪来）═══
  "content": {
    "type": "text | css-decoration | dynamic | none",
    "value": "静态文字内容",
    "binding": "{{ 动态绑定表达式 }}"
  },
  "materials": [
    {
      "id": "I-xx",
      "name": "素材名",
      "type": "icon | decoration | illustration",
      "refSize": [20, 20],
      "summary": "一句话描述素材视觉",
      "ref": "design-plan/pages/xx/materials/I-xx-name.md",
      "condition": "{{ 条件切换表达式(多素材切换时) }}"
    }
  ],

  // ═══ 实施层（design-executor 写入）═══
  "implementation": {
    "nodeId": "nd_xxx",
    "materialId": "uuid",
    "status": "pending | completed",
    "events": [{ "trigger": "click", "bound": true }],
    
    // 验收清单：每个维度是否已完成
    "checklist": {
      "structure": false,      // 节点已创建
      "styles": false,         // 样式已设置（对照 design.ref）
      "events": false,         // 事件已绑定（对照 interaction）
      "materials": false,      // 素材已绘制+应用
      "visualStates": false,   // 业务视觉状态已添加
      "interactionStates": false, // CSS交互状态(hover/pressed)已添加
      "dataBinding": false,    // bind/repeat/visibleWhen 已设置
      "extremeCases": false    // 溢出/空态等极端情况已处理
    }
  },

  // ═══ 子节点 ═══
  "children": [ /* 递归同结构 */ ]
}
```

---

## 3. 页面级特有字段

页面节点（type=page）除了通用字段外，还有：

```jsonc
{
  "id": "02-publish-moment",
  "type": "page",
  "name": "发布动态",

  // ...通用字段(product/interaction/design/implementation)...

  // ═══ 数据层（页面级 API + 状态管理）═══
  "dataLayer": {
    "ref": "design-plan/pages/02-publish-moment/index.md#§7-8",

    // API 数据源
    "dataSources": [
      {
        "id": "ds-publish-moment",
        "name": "发布动态接口",
        "type": "api",
        "method": "POST",
        "path": "/api/v1/moments",
        "autoFetchOnEnter": false,
        "triggerBy": "publish-btn click",
        "mockScenarios": ["发布成功(200)", "审核失败(400)", "服务错误(500)"],
        "ref": "design-plan/pages/02-publish-moment/index.md#§8.1"
      }
    ],

    // 前端状态变量（view = UI临时态）
    "stateView": [
      { "key": "content", "type": "string", "default": "", "purpose": "文字内容", "boundTo": "textarea" },
      { "key": "images", "type": "string[]", "default": "[]", "purpose": "已上传图片URLs", "boundTo": "image-grid" },
      { "key": "visibilityMode", "type": "enum", "default": "public", "purpose": "可见性模式" },
      { "key": "isPublishing", "type": "boolean", "default": false, "purpose": "发布loading态" },
      { "key": "locationReady", "type": "boolean", "default": false, "purpose": "GPS定位完成" },
      { "key": "sheetVisible", "type": "boolean", "default": false, "purpose": "Sheet面板显隐" },
      { "key": "pinLat", "type": "number", "default": null, "purpose": "大头针纬度" },
      { "key": "pinLng", "type": "number", "default": null, "purpose": "大头针经度" }
    ],

    // 前端状态（data = 服务端数据缓存）
    "stateData": [
      { "key": "publishResult", "source": "ds-publish-moment.onSuccess", "purpose": "发布结果" }
    ]
  },

  "children": [...]
}
```

---

## 4. 完整示例节点（含所有字段）

以 `publish-btn` 为例，展示一个节点的完整信息：

```jsonc
{
  "id": "publish-btn",
  "type": "element",
  "name": "发布按钮",

  "product": {
    "summary": "提交发布位置动态",
    "ref": "product-analysis/modules/01-location-moment.md#3.2内容规则",
    "rules": [
      "内容为空(仅空格/换行)时不可点击",
      "每日发布上限20条",
      "提交后内容审核(异步秒级)"
    ]
  },

  "interaction": {
    "summary": "click(条件) → loading → success(粒子飘落+返回) / error(Toast+恢复)",
    "ref": "interaction-design/pages/02-publish-moment.md#操作清单:点击发布",
    "trigger": "click",
    "condition": "{{ state.view.content !== '' || state.view.images.length > 0 }}",
    "flows": {
      "success": {
        "summary": "按钮✓ → 内容缩小 → 粒子飘落到Pin位置 → 1s后nav.back()",
        "ref": "interaction-design/pages/02-publish-moment.md#状态机:Effects→success"
      },
      "error": {
        "summary": "按钮恢复 → Toast显示错误信息 → 表单恢复可编辑",
        "ref": "interaction-design/pages/02-publish-moment.md#状态机:Effects→error"
      },
      "timeout": {
        "summary": "15s无响应 → 自动恢复按钮 → Toast'请求超时，请重试'",
        "ref": "interaction-design/pages/02-publish-moment.md#边界情况"
      },
      "boundary": {
        "summary": "重复点击: 第一次后立即禁用不响应后续",
        "ref": "interaction-design/pages/02-publish-moment.md#边界情况"
      }
    },
    "states": ["disabled", "active", "loading", "success"]
  },

  "design": {
    "summary": "div, '发布', body-md 500, radius-sm, padding:6px 16px, 双态(禁用灰/激活渐变+glow)",
    "ref": "design-plan/pages/02-publish-moment/index.md#§4.1:publish-btn",
    "visualRef": "design-plan/pages/02-publish-moment/visual.md#§6:发布按钮",

    "visualStates": {
      "disabled": {
        "summary": "bg:#252540(Layer3), color:rgba(255,255,255,0.35)",
        "ref": "design-plan/pages/02-publish-moment/visual.md#§6:发布按钮(禁用)"
      },
      "active": {
        "summary": "bg:linear-gradient(135deg,#4F8CFF,#7C5CFC), glow:0 0 12px primary@30%, color:#F2F2F7",
        "ref": "design-plan/pages/02-publish-moment/visual.md#§6:发布按钮(激活)"
      },
      "loading": {
        "summary": "保持active底色, 文字→spinner, 禁用点击",
        "ref": "interaction-design/pages/02-publish-moment.md#状态机:Effects→submitting"
      }
    },

    "interactionStates": {
      "hover": {
        "summary": "scale(1.02) + shadow升级",
        "ref": "interaction-design/overview.md#组件微交互:按钮hover"
      },
      "pressed": {
        "summary": "scale(0.97) + shadow降级",
        "ref": "interaction-design/overview.md#组件微交互:按钮press"
      }
    }
  },

  "logic": {
    "displayCondition": null,
    "enableCondition": "{{ state.view.content !== '' || state.view.images.length > 0 }}",
    "dataBinding": null,
    "repeat": null,
    "businessRules": [
      {
        "rule": "仅空格/换行视为空 → 按钮保持禁用",
        "ref": "interaction-design/pages/02-publish-moment.md#核心交互详解:2:发布按钮状态"
      },
      {
        "rule": "每日上限20条 → 超限时点击弹Toast而非禁用",
        "ref": "product-analysis/modules/01-location-moment.md#3.2:每日发布上限"
      }
    ]
  },

  "content": {
    "type": "text",
    "value": "发布"
  },
  "materials": null,

  "implementation": {
    "nodeId": "nd_87ac9e057a354da1aa054",
    "status": "completed",
    "events": [{ "trigger": "click", "bound": true }],
    "visualStatesApplied": ["disabled", "active"]
  }
}
```

---

## 5. 另一个示例：有素材+条件切换的节点

```jsonc
{
  "id": "vis-icon",
  "type": "element",
  "name": "可见性模式图标",

  "product": {
    "summary": "显示当前选中的可见性模式图标",
    "ref": "product-analysis/modules/01-location-moment.md#3.3:可见性规则详解"
  },

  "interaction": {
    "summary": "随 visibilityMode 状态切换显示不同图标",
    "ref": "interaction-design/pages/02-publish-moment.md#核心交互详解:3:可见性选择器"
  },

  "design": {
    "summary": "div, 20×20, 切换三种图标素材",
    "ref": "design-plan/pages/02-publish-moment/index.md#§4.4:icon-div"
  },

  "logic": {
    "displayCondition": null,
    "enableCondition": null,
    "dataBinding": "{{ state.view.visibilityMode }}",
    "businessRules": [
      { "rule": "public→地球, targeted→靶心, timed→时钟", "ref": "design-plan/pages/02-publish-moment/index.md#§4.4" }
    ]
  },

  "content": { "type": "none" },
  "materials": [
    {
      "id": "I-07",
      "name": "vis-public",
      "type": "icon",
      "refSize": [20, 20],
      "summary": "地球图标，线性1.5px #A8A8B3，表达'所有人可见'",
      "ref": "design-plan/pages/02-publish-moment/materials/I-07-vis-public.md",
      "condition": "{{ state.view.visibilityMode === 'public' }}"
    },
    {
      "id": "I-08",
      "name": "vis-targeted",
      "type": "icon",
      "refSize": [20, 20],
      "summary": "靶心图标，同心圆1.5px #A8A8B3，表达'精准定向'",
      "ref": "design-plan/pages/02-publish-moment/materials/I-08-vis-targeted.md",
      "condition": "{{ state.view.visibilityMode === 'targeted' }}"
    },
    {
      "id": "I-09",
      "name": "vis-timed",
      "type": "icon",
      "refSize": [20, 20],
      "summary": "时钟图标，圆+L形指针1.5px #A8A8B3，表达'定时触发'",
      "ref": "design-plan/pages/02-publish-moment/materials/I-09-vis-timed.md",
      "condition": "{{ state.view.visibilityMode === 'timed' }}"
    }
  ],

  "implementation": {
    "nodeId": "nd_ff6a6a889c5c4b26bcab6",
    "status": "completed",
    "materialId": "d39abf84-7046-4b6d-ac18-cada767d6c4b"
  }
}
```

---

## 6. 各阶段操作规则

### Phase 1: product-analyst
```
产出: md文档
写入 Schema:
  - 创建 project + modules（ref 指向 md）
  - 创建 pages[] 骨架: id + name + product层
  - 不创建 children（等交互层）
```

### Phase 2: interaction-designer
```
产出: md文档
写入 Schema:
  - 往 pages[].interaction 追加（summary + ref + states + operations）
  - 构建 children 骨架：
    - 从"操作清单"推导出触发元素节点（每个操作=一个有trigger的节点）
    - 从"状态机"推导出条件显示节点（每个非基准状态的独立UI）
    - 识别组件（复杂交互=独立组件节点）
  - 每个节点写入 interaction 层 + 初步 logic 层
  - 页面 dataLayer 初步构建（从操作分析中识别的 API 和状态变量）
```

### Phase 3: design-planner
```
产出: md文档
写入 Schema:
  - 往每个节点追加 design 层（summary + ref + visualStates + interactionStates）
  - 往每个节点追加/完善 content 字段
  - 展开组件内部子节点（从 components/*.md 读取结构追加 children）
  - 新增装饰节点（交互层不关心但视觉需要的）
  - 追加 materials（素材需求）
  - 完善 logic 层（displayCondition/repeat/dataBinding）
  - 完善页面 dataLayer（mock场景、state详细定义）
```

### Phase 4: design-executor
```
消费: Schema 遍历 + ref 指向的 md 读取精确值
写入 Schema:
  - 往每个节点追加 implementation 层
  - 逐节点深度遍历，对每个 pending 节点：
    1. 读节点全部字段（product/interaction/design/logic/materials）
    2. 读 ref 指向的 md 获取精确样式值/事件参数
    3. 调用 MCP 实施（page-builder / material-painter）
    4. 写回 implementation
```

---

## 7. 完整性校验规则

```typescript
function validate(schema) {
  const issues = [];
  
  function walk(node, path) {
    const p = `${path}/${node.id}`;
    
    // ── 层级完整性 ──
    // 有交互但无设计 → UI设计遗漏
    if (node.interaction?.trigger && !node.design?.ref) {
      issues.push(`[设计缺失] ${p}: 有交互定义但无设计`);
    }
    // 有设计但无实施 → 未实施
    if (node.design?.ref && node.implementation?.status !== 'completed') {
      issues.push(`[未实施] ${p}: 设计完成但未实施`);
    }
    
    // ── 内容完整性 ──
    // 叶子节点必须有内容来源
    if (!node.children?.length) {
      const hasContent = node.content?.type && node.content.type !== 'none';
      const hasMaterial = node.materials?.length > 0;
      if (!hasContent && !hasMaterial) {
        issues.push(`[空壳节点] ${p}: 无内容也无素材`);
      }
    }
    
    // ── 素材完整性 ──
    if (node.materials) {
      for (const mat of node.materials) {
        if (!mat.ref) issues.push(`[素材无文档] ${p}: 素材${mat.id}缺少设计文档`);
        // 检查总索引中状态
        const globalMat = schema.materials?.[mat.id];
        if (globalMat && globalMat.implementation?.status !== 'completed') {
          issues.push(`[素材未绘制] ${p}: 素材${mat.id}未实施`);
        }
      }
    }
    
    // ── 交互流完整性 ──
    if (node.interaction?.trigger) {
      if (!node.interaction.flows?.success && !node.interaction.flows?.error) {
        issues.push(`[交互不完整] ${p}: 有trigger但无success/error flow`);
      }
    }
    
    // ── 视觉状态完整性 ──
    if (node.interaction?.states?.length > 1) {
      if (!node.design?.visualStates || Object.keys(node.design.visualStates).length === 0) {
        issues.push(`[状态无样式] ${p}: 有${node.interaction.states.length}个状态但无visualStates`);
      }
    }
    
    // ── 业务逻辑完整性 ──
    if (node.logic?.businessRules) {
      for (const rule of node.logic.businessRules) {
        if (!rule.ref) issues.push(`[规则无溯源] ${p}: 规则"${rule.rule}"缺少ref`);
      }
    }
    
    // ── 递归 ──
    for (const child of node.children || []) walk(child, p);
  }
  
  // 页面级检查
  for (const page of schema.pages) {
    // 状态覆盖检查
    if (page.interaction?.states) {
      for (const state of page.interaction.states) {
        // 找 children 中是否有 visibleWhen 或 logic.displayCondition 引用该状态
        const covered = findStateNode(page.children, state);
        if (!covered && state !== page.interaction.states[0]) { // 非基准态
          issues.push(`[状态无节点] ${page.id}: 状态"${state}"无对应UI结构`);
        }
      }
    }
    
    // dataLayer 检查
    if (page.dataLayer) {
      for (const ds of page.dataLayer.dataSources || []) {
        if (!ds.ref) issues.push(`[数据源无文档] ${page.id}: ${ds.id}缺少ref`);
      }
      for (const sv of page.dataLayer.stateView || []) {
        if (!sv.purpose) issues.push(`[变量无说明] ${page.id}: ${sv.key}缺少purpose`);
      }
    }
    
    // 递归所有 children
    for (const child of page.children || []) walk(child, page.id);
  }
  
  return issues;
}
```

---

## 8. 文件位置

```
.design-workspaces/<task>/
├── design-registry.json              ← ★ 统一 Schema（全链路单一结构化数据源）
├── product-analysis/                  ← 详细 md（product-analyst 产出）
│   ├── overview.md
│   ├── modules/*.md
│   └── PRD.md
├── interaction-design/                ← 详细 md（interaction-designer 产出）
│   ├── overview.md
│   └── pages/*.md
└── design-plan/                       ← 详细 md（design-planner 产出）
    ├── design-system.md
    └── pages/*/
        ├── index.md
        ├── visual.md
        ├── components/*.md
        └── materials/*.md
```

---

## 9. 回答审阅问题

| # | 问题 | Schema 如何保证 |
|---|------|----------------|
| 1 | 交互细节（成功/失败各状态） | `interaction.flows`(success/error/timeout/boundary) + ref |
| 2 | 组件实现时的完整信息 | 节点有 product+interaction+design+logic+materials 全维度 + ref |
| 3 | API设计+状态管理 | 页面级 `dataLayer`(dataSources+stateView+stateData) + ref |
| 4 | 业务逻辑表达 | 节点级 `logic`(displayCondition+enableCondition+businessRules含ref) |
| 5 | 组件多状态(hover/pressed等) | `design.visualStates`(业务态) + `design.interactionStates`(CSS交互态) |
| 6 | 页面间导航关系 | 顶层 `navigation.flows`(from/to/trigger/transition) |
| 7 | 全局共享状态 | 顶层 `globalState.variables` |
| 8 | 用户画像/设计方向 | `project.targetUser` + `coreScenarios` + `styleDirection` |
| 9 | 内容极端情况 | 节点级 `extremeCases`(case/handling/ref) |
| 10 | 实施验收标准 | `implementation.checklist`(8项逐一勾选) |

**executor 遍历到任何节点时：**
- 看 `product` → 知道业务含义和规则
- 看 `interaction` → 知道操作后怎么响应，成功/失败/超时/边界各怎么办
- 看 `design` → 知道样式+所有状态变体(业务态+CSS交互态)
- 看 `logic` → 知道什么时候展示、数据从哪来、判断条件是什么
- 看 `extremeCases` → 知道异常数据时怎么处理
- 看 `materials` → 知道需要什么素材+设计文档在哪
- 看 `navigation`(页面级) → 知道跳转目标
- 读 `ref` → 拿到精确到 px 的实施规格
- 写 `implementation.checklist` → 逐项验收确认完成

**不可能遗漏任何信息。**
