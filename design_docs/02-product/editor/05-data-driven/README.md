# 05 - 数据驱动系统

> **根本问题：如何让数据驱动 UI 变化成为设计阶段的一等公民？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [03-右侧属性面板](../03-property-panel/README.md) — 数据 Tab 的 UI 设计
> - [04-状态管理系统](../04-state-system/README.md) — 全局状态变量定义在数据层
> - [06-组件 Props 系统](../06-component-props/README.md) — Props 与数据绑定的结合
> - [02-工具栏系统](../02-toolbar/README.md) — 顶部工具栏的数据集快速切换
> - [design-schema](../../../03-tech/design-schema.md) — Screen / ComponentNode 类型定义

---

## 一、第一性原理：数据驱动解决什么根本问题？

### 1.1 真实 UI 的本质

```
所有真实产品的 UI 都由数据驱动：

  一个用户列表:
    · 数据 0 条 → 显示空状态引导 "暂无用户"
    · 数据 1 条 → 单条卡片，无滚动
    · 数据 5 条 → 5 张卡片，轻微滚动
    · 数据 100 条 → 虚拟滚动，性能问题暴露
    · 数据加载中 → 骨架屏
    · 数据加载失败 → 错误提示 + 重试按钮

  一个用户名显示:
    · "张三" → 正常显示
    · "Alexander Hamilton III" → 截断？换行？缩小字号？
    · "" (空) → 显示占位符 "未命名用户"
    · null → 显示默认头像 + 占位符

这些场景在 Figma 中 → 每个场景手动画一份 → 体力劳动
在我们的系统中 → 定义数据集，切换即可预览 → 一份 Schema 覆盖所有
```

### 1.2 本质推导

```
数据驱动 = 让 Schema 的内容不是硬编码的，而是来自数据

  Schema 中: <span>{{data.user.name}}</span>
  数据集 A (默认): { user: { name: "张三" } }    → 显示 "张三"
  数据集 B (空):   { user: { name: "" } }        → 显示 "" → 触发空状态逻辑
  数据集 C (长名): { user: { name: "Alexandr..." } } → 显示截断效果

三个价值层次：
  1. 预览价值 → 设计师可以看到 UI 在各种数据下的表现
  2. 测试价值 → 用不同数据集验证 UI 是否 hold 住各种场景
  3. 交付价值 → 导出代码时数据绑定直接可用（不是假文本）

这是我们与 Figma 的根本差异之一 —— Figma 的元素内容是"装饰性文本"，
我们的元素内容是"数据驱动的表达式"。
```

### 1.3 与全局状态系统的关系

```
数据驱动系统和状态系统是正交的两个维度：

状态系统（04-state-system）:
  · 控制 UI "以什么形态呈现"
  · 同一数据下，按钮是 loading 还是 success？
  · 全局状态变量 = 离散的枚举值（pending / done / cancelled）

数据驱动系统（本文档）:
  · 控制 UI "呈现什么内容"
  · 同一形态下，列表有几条？用户名是什么？头像有没有？
  · 数据集 = 结构化的 Mock 数据（JSON 对象）

两者组合 → 全景覆盖:
  数据集 × 全局状态 × 视口 = 所有可能的 UI 表现
```

---

## 二、数据结构定义

### 2.1 数据集 (DataSet)

```typescript
interface DataSet {
  id: string;
  name: string;              // "默认数据" / "空数据" / "满数据" / "异常数据"
  description?: string;      // "正常场景，列表 5 条，用户名正常长度"
  data: Record<string, any>; // 实际的 Mock 数据 JSON
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 数据绑定 (DataBinding)

```typescript
// 数据绑定存储在节点的 props 值中
// 约定：以 "{{" 开头 "}}" 结尾的字符串为数据绑定表达式

// 简单绑定
node.props.children = "{{data.user.name}}";
node.props.src = "{{data.user.avatar}}";

// 带默认值的绑定（表达式解析失败时使用）
node.props.children = "{{data.user.name | 未命名用户}}";

// 模板字符串（混合静态文本和绑定）
node.props.children = "欢迎回来, {{data.user.name}}!";

// 列表绑定（数组数据 → 重复渲染子节点）
node.props.__listData = "{{data.taskList}}";
// 子节点中的绑定相对于数组项
// child.props.children = "{{item.title}}"
```

### 2.3 Schema 扩展：Screen 级别

```typescript
interface Screen {
  // ...已有字段...

  // 新增：数据集管理
  dataSets: DataSet[];                  // 所有数据集
  activeDataSetId: string;              // 当前活跃的数据集 ID

  // 已有（04-state-system 定义）：
  globalStates: GlobalStateVariable[];  // 全局状态变量
}
```

### 2.4 完整的数据层次关系

```
Screen
  ├── dataSets[]                         ← 数据集列表
  │     ├── { id: "ds-1", name: "默认数据",
  │     │     data: {
  │     │       user: { name: "张三", avatar: "https://..." },
  │     │       taskList: [ { title: "任务A" }, { title: "任务B" } ],
  │     │       notification: { count: 3 }
  │     │     } }
  │     ├── { id: "ds-2", name: "空数据",
  │     │     data: {
  │     │       user: { name: "", avatar: null },
  │     │       taskList: [],
  │     │       notification: { count: 0 }
  │     │     } }
  │     └── { id: "ds-3", name: "满数据",
  │           data: {
  │             user: { name: "Alexander Hamilton III", avatar: "https://..." },
  │             taskList: [ ...100 items ],
  │             notification: { count: 999 }
  │           } }
  │
  ├── activeDataSetId: "ds-1"            ← 当前使用 "默认数据"
  │
  ├── globalStates[]                     ← 全局状态变量（来自 04-state-system）
  │
  └── rootNode: ComponentNode
        └── children
              ├── span → props.children = "{{data.user.name}}"
              ├── img  → props.src = "{{data.user.avatar}}"
              └── div  → props.__listData = "{{data.taskList}}"
                    └── child template...
```

---

## 三、数据绑定语法规范

### 3.1 表达式语法

```
数据绑定表达式的完整语法：

基本路径:
  {{data.user.name}}          → 解析 currentDataSet.data.user.name
  {{data.taskList}}           → 解析 currentDataSet.data.taskList (数组)
  {{data.taskList[0].title}}  → 解析数组第一项的 title
  {{data.notification.count}} → 解析数字值

带默认值（管道符 |）:
  {{data.user.name | 未命名}}  → 路径不存在或值为 null/undefined 时显示 "未命名"
  {{data.user.avatar | asset://default-avatar.png}}

模板字符串（混合静态文本）:
  "欢迎, {{data.user.name}}!"          → "欢迎, 张三!"
  "共 {{data.notification.count}} 条"  → "共 3 条"
  "{{data.user.name}} 的任务列表"       → "张三 的任务列表"

列表绑定（特殊语法，用于数组渲染）:
  节点属性: __listData = "{{data.taskList}}"
  子节点中: {{item.title}} / {{item.status}} / {{index}}
  · item = 当前数组项
  · index = 当前索引（0-based）
```

### 3.2 表达式解析算法

```typescript
function resolveExpression(
  expression: string,
  dataSet: Record<string, any>,
  listContext?: { item: any; index: number }  // 列表渲染上下文
): any {
  // 非绑定表达式 → 直接返回
  if (!expression.includes("{{")) return expression;

  // 纯绑定表达式（整个值都是一个表达式）
  const pureMatch = expression.match(/^\{\{(.+?)\}\}$/);
  if (pureMatch) {
    return resolvePath(pureMatch[1].trim(), dataSet, listContext);
  }

  // 模板字符串（混合静态文本和绑定）
  return expression.replace(/\{\{(.+?)\}\}/g, (_, path) => {
    const value = resolvePath(path.trim(), dataSet, listContext);
    return value != null ? String(value) : "";
  });
}

function resolvePath(
  pathExpr: string,
  dataSet: Record<string, any>,
  listContext?: { item: any; index: number }
): any {
  // 处理默认值: "data.user.name | 未命名"
  const [path, defaultValue] = pathExpr.split("|").map(s => s.trim());

  // 解析路径
  let value: any;
  if (path.startsWith("item.") && listContext) {
    value = getNestedValue(listContext.item, path.slice(5));
  } else if (path === "index" && listContext) {
    value = listContext.index;
  } else if (path.startsWith("data.")) {
    value = getNestedValue(dataSet, path.slice(5));
  }

  // null / undefined → 使用默认值
  if (value == null && defaultValue !== undefined) {
    return defaultValue;
  }
  return value;
}

function getNestedValue(obj: any, path: string): any {
  // "user.name" → obj.user.name
  // "taskList[0].title" → obj.taskList[0].title
  return path.split(/[.\[\]]/).filter(Boolean).reduce(
    (curr, key) => curr?.[key], obj
  );
}
```

### 3.3 绑定可应用的目标

```
数据绑定可以应用到 Schema 中的以下位置：

┌─────────────────────────────┬──────────────────────────────────────┐
│  目标                        │  示例                                │
├─────────────────────────────┼──────────────────────────────────────┤
│  文本内容 (props.children)  │  span → "{{data.user.name}}"        │
│  元素属性 (props.*)          │  img.src → "{{data.user.avatar}}"   │
│                              │  a.href → "{{data.profileUrl}}"     │
│                              │  input.placeholder → "搜索{{data.category}}" │
│  样式值 (styles.*)          │  div.styles.color → "{{data.themeColor}}"     │
│                              │  （高级，Phase 4）                  │
│  列表渲染 (__listData)      │  div.__listData → "{{data.taskList}}"│
│  条件可见性                  │  通过全局状态绑定实现（04-state）   │
│  组件 Props                  │  LoginForm.title → "{{data.pageTitle}}"      │
└─────────────────────────────┴──────────────────────────────────────┘
```

---

## 四、数据集管理

### 4.1 数据集 CRUD

```
创建数据集:
  入口 1: 数据 Tab → [+ 新建数据集]
  入口 2: 顶部工具栏 → 数据集下拉 → [+ 新建数据集]

  ┌──────────────────────────────────────┐
  │  新建数据集                            │
  │                                      │
  │  名称:   [满数据              ]       │
  │  描述:   [列表100条，测试极端情况]     │
  │                                      │
  │  初始数据:                            │
  │  (●) 从当前数据集复制                 │  ← 默认，基于已有数据修改
  │  ( ) 空 JSON {}                      │
  │  ( ) 从模板选择                       │  ← 预设场景模板
  │                                      │
  │  ── 预设场景模板 ──                    │
  │  [空数据集]  → { lists: [], count: 0 } │
  │  [满数据集]  → { lists: [...100], count: 999 } │
  │  [异常数据]  → { error: true, message: "..." } │
  │  [单条数据]  → { lists: [1 item] }    │
  │                                      │
  │               [取消]  [创建]          │
  └──────────────────────────────────────┘

编辑数据集:
  · 在数据 Tab 的 JSON/可视化编辑器中直接修改
  · 修改后 → updateDataSet Operation
  · 实时生效 → 画布立即重渲染

删除数据集:
  · 数据 Tab 中 hover 数据集标签 → 显示 [×]
  · 确认提示: "确认删除数据集 '满数据'？"
  · 至少保留 1 个数据集（最后一个不可删）
  · 删除当前活跃数据集 → 自动切换到第一个

重命名:
  · 双击数据集标签 → 进入编辑模式
```

### 4.2 数据集切换

```
切换方式:

  方式 1: 顶部工具栏 → [数据集: 默认 ▾] → 选择另一个
  方式 2: 数据 Tab → 点击数据集标签

切换行为:
  1. switchDataSet Operation → 更新 screen.activeDataSetId
  2. 渲染引擎重新解析所有数据绑定表达式
  3. 画布全页面重渲染（数据变了，UI 跟着变）
  4. 切换动作是即时的，无需额外确认

切换的视觉反馈:
  · 画布内容平滑过渡（300ms ease-out）
  · 如果数据变化导致布局大幅变动 → 可能感觉跳动（可接受）
```

### 4.3 预设数据集模板

```
系统内置的数据集模板，用户创建时可选择：

┌───────────────┬──────────────────────────────────────────┐
│  模板名        │  数据特征                                 │
├───────────────┼──────────────────────────────────────────┤
│  默认数据     │  各字段有合理值，列表 3-5 条，文本中等长   │
│  空数据       │  列表为空数组，文本为空字符串，数字为 0    │
│  满数据       │  列表 100 条，文本极长，数字极大           │
│  单条数据     │  列表仅 1 条（测试单条与多条的 UI 差异）   │
│  异常数据     │  包含 null / undefined / 错误信息字段      │
│  多语言数据   │  中日韩文/阿拉伯文/超长德语词（测试国际化）│
└───────────────┴──────────────────────────────────────────┘

这些模板只是起点——用户选择后可自由修改。
AI 也可以根据页面结构自动生成合适的多套数据集（远期）。
```

---

## 五、数据编辑器

### 5.1 双模式设计

数据 Tab 中提供两种编辑模式，通过 Tab 切换：

```
┌──────────────────────────────────────┐
│  当前数据集: [默认数据 ▾]             │
│                                      │
│  [JSON 编辑]  [可视化编辑]            │
│   ━━━━━━━━                           │  ← 当前选中的模式有下划线
├──────────────────────────────────────┤
│                                      │
│  （编辑器内容区）                     │
│                                      │
└──────────────────────────────────────┘
```

### 5.2 JSON 编辑模式

```
┌──────────────────────────────────────┐
│  [JSON 编辑]  可视化编辑              │
├──────────────────────────────────────┤
│ 1 │ {                                │
│ 2 │   "user": {                      │
│ 3 │     "name": "张三",              │
│ 4 │     "avatar": "https://...",     │
│ 5 │     "role": "admin"              │
│ 6 │   },                             │
│ 7 │   "taskList": [                  │
│ 8 │     {                            │
│ 9 │       "title": "完成登录页设计",  │
│10 │       "status": "done",          │
│11 │       "assignee": "张三"          │
│12 │     },                           │
│13 │     {                            │
│14 │       "title": "评审交互方案",    │
│15 │       "status": "inProgress",    │
│16 │       "assignee": "李四"          │
│17 │     }                            │
│18 │   ],                             │
│19 │   "notification": {              │
│20 │     "count": 3,                  │
│21 │     "hasNew": true               │
│22 │   }                              │
│23 │ }                                │
├──────────────────────────────────────┤
│  JSON 校验: ✅ 有效                   │
│  字段数: 3 个顶级字段, 共 12 个叶节点  │
│                     [格式化] [应用]   │
└──────────────────────────────────────┘

JSON 编辑器特性:
  · 使用轻量级代码编辑器（Monaco Editor 精简版 或 CodeMirror）
  · 语法高亮 + 行号
  · JSON 实时校验:
    - 有效 → ✅ 绿色提示
    - 无效 → ❌ 红色提示 + 定位到错误行（红色波浪线）
  · [格式化] → 自动缩进整理
  · [应用] → 提交修改 (updateDataSet Operation)
    - JSON 无效时 [应用] 按钮置灰
  · 大数据集时编辑器可纵向拉伸（拖拽底部边缘）
```

### 5.3 可视化编辑模式

```
┌──────────────────────────────────────┐
│  JSON 编辑  [可视化编辑]              │
├──────────────────────────────────────┤
│                                      │
│  ▾ user (object, 3 字段)             │
│    name      [张三           ] str   │
│    avatar    [https://...    ] str   │
│    role      [admin          ] str   │
│                                      │
│  ▾ taskList (array, 2 项)            │
│    ▾ [0] (object)                    │
│      title    [完成登录页设计 ] str   │
│      status   [done          ] str   │
│      assignee [张三          ] str   │
│    ▸ [1] (object)                    │
│      (折叠)                          │
│    [+ 添加项]                        │
│                                      │
│  ▾ notification (object, 2 字段)     │
│    count     [3              ] num   │
│    hasNew    [✓]              bool   │
│                                      │
│  ──────────────────────────────────  │
│  [+ 添加顶级字段]                    │
│                                      │
└──────────────────────────────────────┘

可视化编辑器特性:
  · 树形展示 JSON 结构
  · 每个叶子字段 → 内联编辑控件（根据值类型自动选择）
    - string → 文本输入框
    - number → 数字输入框
    - boolean → 复选框
    - null → 灰色标签 "null" + [设置值] 按钮
    - array → 折叠/展开 + 项数 + [添加项]
    - object → 折叠/展开 + 字段数
  · 值类型标签: str / num / bool / null / arr / obj
  · 修改即时提交（blur/Enter）
  · 可拖拽排序数组项
  · [+ 添加项] → 根据同级兄弟推断结构（智能模板）
  · [+ 添加顶级字段] → 输入字段名 + 选择类型
  · 右键字段 → 删除 / 修改类型 / 复制路径
```

### 5.4 "复制路径"快捷功能

```
在可视化编辑器中右键某个字段 → "复制绑定路径":

  右键 "name" 字段 → 复制 "data.user.name"
  右键 "taskList[0].title" → 复制 "data.taskList[0].title"

  复制到剪贴板后可以直接粘贴到属性面板的数据绑定输入框中:
    文本内容 ← [粘贴: data.user.name]

这大幅降低了数据绑定时手动输入路径的成本。
```

---

## 六、数据绑定交互

### 6.1 属性面板中的绑定操作

```
在属性 Tab 或数据 Tab 中为元素属性添加数据绑定：

方式 1: 属性 Tab 中每个 Prop 旁的 [🔗] 按钮（见 06-component-props 第七节）

  标题    [用户登录            ]  [🔗]
                                   ↑ 点击切换为绑定模式
  标题    [🔗 data.pageTitle    ]  [✕]
            ↑ 绑定表达式输入框       ↑ 取消绑定

方式 2: 数据 Tab 中的 "数据绑定" 区域

  ▸ 数据绑定（当前元素）
    文本内容 ← [data.user.name      ]
    头像 src ← [data.user.avatar    ]
    [+ 添加绑定]
```

### 6.2 添加绑定流程

```
数据 Tab 中 [+ 添加绑定]:

  ┌──────────────────────────────────────┐
  │  添加数据绑定                          │
  │                                      │
  │  绑定目标:  [文本内容 ▾]             │
  │    文本内容 / src / href /           │
  │    placeholder / disabled / ...      │
  │    (根据当前元素类型列出可绑定目标)   │
  │                                      │
  │  数据路径:  [data.                ]  │
  │                                      │
  │  自动补全:                            │
  │  ┌──────────────────────────────┐    │
  │  │ data.user                    │    │
  │  │ data.user.name              │    │
  │  │ data.user.avatar            │    │
  │  │ data.taskList               │    │
  │  │ data.notification           │    │
  │  │ data.notification.count     │    │
  │  └──────────────────────────────┘    │
  │  ↑ 根据当前数据集的 JSON 结构        │
  │    自动生成所有可用路径               │
  │                                      │
  │  预览: "张三"                        │
  │  ↑ 根据当前数据集实时解析预览值       │
  │                                      │
  │               [取消]  [绑定]          │
  └──────────────────────────────────────┘
```

### 6.3 自动补全的实现

```typescript
// 从数据集 JSON 中提取所有可用路径
function extractPaths(obj: any, prefix: string = "data"): string[] {
  const paths: string[] = [];

  if (obj == null) return paths;

  if (typeof obj === "object" && !Array.isArray(obj)) {
    paths.push(prefix);
    for (const key of Object.keys(obj)) {
      paths.push(...extractPaths(obj[key], `${prefix}.${key}`));
    }
  } else if (Array.isArray(obj)) {
    paths.push(prefix);  // 数组本身（用于列表绑定）
    if (obj.length > 0) {
      // 使用第一个元素推断数组项的结构
      paths.push(...extractPaths(obj[0], `${prefix}[0]`));
    }
  } else {
    paths.push(prefix);  // 叶子节点
  }

  return paths;
}

// 示例输出:
// extractPaths({ user: { name: "张三", avatar: "..." }, taskList: [{ title: "..." }] })
// → ["data", "data.user", "data.user.name", "data.user.avatar",
//    "data.taskList", "data.taskList[0]", "data.taskList[0].title"]
```

### 6.4 绑定状态的视觉标记

```
已绑定数据的元素在多处显示标记:

画布中:
  · 绑定了数据的元素 → 右上角小 🔗 图标（Canvas 覆盖层绘制）
  · hover 该图标 → tooltip 显示 "data.user.name"

组件树中:
  · 绑定了数据的节点 → 名称后方显示 🔗 小图标
  · 例: 📝 span "张三" 🔗

属性面板 Tab 栏:
  · 数据 Tab → 蓝色小圆点徽标（表示当前元素有数据绑定）

属性面板 Prop 行:
  · 已绑定的 Prop → 绿色边框 + 🔗 图标 + 绑定表达式
  · 未绑定的 Prop → 正常边框 + 硬编码值
```

---

## 七、列表渲染

### 7.1 设计理念

```
列表是数据驱动最典型的场景：

  一个任务列表 div 绑定了 data.taskList (数组)
  → 编辑器需要根据数组长度重复渲染子节点模板
  → 每个子节点中的绑定使用 {{item.xxx}} 访问数组项数据

这类似于 React 的 array.map() 或 Vue 的 v-for。
在设计阶段提供这个能力 → 设计师不需要手动复制粘贴卡片。
```

### 7.2 列表绑定的交互

```
Step 1: 设计师创建一个容器 div（作为列表容器）
Step 2: 在容器内设计一个子元素作为"列表项模板"
Step 3: 选中容器 → 数据 Tab → 设置列表数据绑定

  ▸ 列表绑定
    数据源: [data.taskList          ]
    ↑ 绑定到数组类型的数据路径

Step 4: 选中列表项模板内的元素 → 使用 {{item.xxx}} 绑定

  标题  ← [item.title    ]
  状态  ← [item.status   ]
  序号  ← [index         ]    ← 从 0 开始的索引

Step 5: 画布渲染效果
  · 根据当前数据集中 taskList 的长度渲染 N 个列表项
  · 切换到"空数据"集 → 列表容器内显示 0 个项（或显示空状态占位）
  · 切换到"满数据"集 → 列表容器内显示 100 个项
```

### 7.3 列表渲染的 Schema 表示

```typescript
// 列表容器节点
{
  id: "list-container",
  type: "div",
  styles: { display: "flex", flexDirection: "column", gap: "8px" },
  props: {
    __listData: "{{data.taskList}}"  // 特殊属性：列表数据源
  },
  children: [
    // 这个子节点是"模板"，会被重复渲染 N 次
    {
      id: "task-card-template",
      type: "div",
      styles: { padding: "12px", border: "1px solid #E5E5E5" },
      children: [
        {
          id: "task-title",
          type: "span",
          props: { children: "{{item.title}}" }   // item = 数组中的一项
        },
        {
          id: "task-status",
          type: "span",
          props: { children: "{{item.status}}" }
        }
      ]
    }
  ]
}

// 渲染时（data.taskList 有 3 项）→ 渲染 3 个 task-card，各自数据不同
```

### 7.4 编辑模式下的列表显示

```
编辑模式下，列表不按数据完全展开（避免 100 个重复卡片无法编辑）：

策略: 显示"模板 + 预览"

  ┌─────────────────────────────────────┐
  │  📦 div (列表容器, 🔗 data.taskList) │
  │                                     │
  │  ┌──────────────────────────────┐   │
  │  │  📦 任务卡片模板 (可编辑)    │   │  ← 模板项：可选中、编辑
  │  │  ┌────────────────────────┐  │   │     使用第一条数据渲染
  │  │  │ 完成登录页设计         │  │   │
  │  │  │ done                   │  │   │
  │  │  └────────────────────────┘  │   │
  │  └──────────────────────────────┘   │
  │  ┌──────────────────────────────┐   │
  │  │  (预览项 2)       灰色半透明  │   │  ← 只读预览，不可编辑
  │  └──────────────────────────────┘   │
  │  ┌──────────────────────────────┐   │
  │  │  (预览项 3)       灰色半透明  │   │
  │  └──────────────────────────────┘   │
  │  ... 共 5 项（当前数据集）          │
  │                                     │
  └─────────────────────────────────────┘

  · 第一项 = 可编辑的模板（选中后可修改样式/绑定）
  · 后续项 = 只读预览（灰色半透明，不可选中）
  · 预览项数 = min(当前数据集数组长度, 5) — 最多预览 5 项
  · 预览模式下 → 完全按数据展开渲染（真实效果）
```

---

## 八、全景截图矩阵

### 8.1 设计理念

```
设计走查的痛点：
  设计师完成一个页面后，需要逐个检查:
  · 默认数据 + 正常状态 + iPhone → 看一遍
  · 空数据 + 正常状态 + iPhone → 看一遍
  · 默认数据 + 已完成 + iPhone → 看一遍
  · 默认数据 + 正常状态 + iPad → 看一遍
  · ...

  3 个数据集 × 3 个全局状态 × 3 个视口 = 27 种组合
  手动切换 27 次 → 耗时、遗漏

全景截图矩阵 → 一键生成所有组合的截图 → 拼成网格 → 一目了然
```

### 8.2 配置面板

```
数据 Tab 底部 → [📸 生成全景截图...] → 弹出配置面板:

┌──────────────────────────────────────────────────┐
│  全景截图配置                                      │
│                                                  │
│  ── 数据集维度 ──                                 │
│  [✓] 默认数据                                    │
│  [✓] 空数据                                      │
│  [✓] 满数据                                      │
│  [ ] 异常数据                                    │
│                                                  │
│  ── 全局状态维度 ──                               │
│  任务状态:                                       │
│  [✓] 待处理  [✓] 进行中  [✓] 已完成  [ ] 已取消  │
│  用户角色:                                       │
│  [✓] 管理员  [ ] 成员  [ ] 访客                  │
│                                                  │
│  ── 视口维度 ──                                   │
│  [✓] iPhone 15 Pro (375×812)                     │
│  [✓] iPad Air (820×1180)                         │
│  [ ] Desktop (1920×1080)                         │
│                                                  │
│  ── 预览 ──                                       │
│  组合数: 3 × 3 × 1 × 2 = 18 张截图              │
│  预计耗时: ~30 秒                                 │
│                                                  │
│             [取消]  [生成截图]                     │
└──────────────────────────────────────────────────┘
```

### 8.3 截图生成流程

```
点击 [生成截图] 后:

1. 计算所有组合
   combinations = dataSets × globalStates × viewports

2. 逐个组合:
   a. 切换数据集
   b. 切换全局状态变量
   c. 切换视口
   d. 等待渲染稳定（requestAnimationFrame + setTimeout 100ms）
   e. 截取视口区域（html2canvas 或 原生 Canvas 截取）
   f. 标注元数据: { dataSet, globalStates, viewport }

3. 拼接为网格图:
   ┌───────────┬───────────┬───────────┐
   │ 默认+待处理│ 默认+进行中│ 默认+已完成│
   │ iPhone    │ iPhone    │ iPhone    │
   ├───────────┼───────────┼───────────┤
   │ 空数据+待处理│ 空+进行中│ 空+已完成 │
   │ iPhone    │ iPhone    │ iPhone    │
   ├───────────┼───────────┼───────────┤
   │ 满数据+待处理│ 满+进行中│ 满+已完成 │
   │ iPhone    │ iPhone    │ iPhone    │
   └───────────┴───────────┴───────────┘

4. 输出:
   · 网格大图（可下载 PNG）
   · 逐张截图（可单独查看/下载）
   · 截图浏览器（弹窗，左右切换查看）

5. 恢复编辑器的原始状态（数据集/状态/视口切回生成前的值）
```

### 8.4 截图浏览器

```
生成完成后弹出截图浏览器:

┌──────────────────────────────────────────────────┐
│  全景截图 (18 张)                        [×] [📥]│
│                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │      │ │      │ │  ●   │ │      │ │      │  │
│  │ 1/18 │ │ 2/18 │ │ 3/18 │ │ 4/18 │ │ 5/18 │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│                       ↑ 当前选中                  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │          当前截图大图预览                  │    │
│  │                                          │    │
│  │     数据集: 默认数据                      │    │
│  │     任务状态: 已完成                      │    │
│  │     用户角色: 管理员                      │    │
│  │     视口: iPhone 15 Pro (375×812)        │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ← 上一张  [3 / 18]  下一张 →                    │
│                                                  │
│  [📥 下载当前截图]  [📥 下载全部 (ZIP)]           │
│  [📋 复制到剪贴板]                                │
└──────────────────────────────────────────────────┘
```

---

## 九、与其他子系统的接口约定

### 9.1 数据系统 → 渲染引擎 (design-engine)

```typescript
// 渲染引擎在渲染节点时需要解析数据绑定
interface DataContext {
  dataSet: Record<string, any>;     // 当前数据集的 data
  listContext?: {                   // 列表渲染上下文（如果在列表内）
    item: any;
    index: number;
  };
}

// SchemaRenderer 在渲染每个节点时:
// 1. 检查 props 中是否有 "{{...}}" 格式的值
// 2. 调用 resolveExpression() 解析
// 3. 用解析后的值渲染 DOM
```

### 9.2 数据系统 → 状态系统 (04-state-system)

```typescript
// 全局状态变量定义在 Screen.globalStates（由状态系统消费）
// 数据集定义在 Screen.dataSets（由数据系统管理）
// 两者在 Screen 级别共存，独立管理

// 状态叠加算法 resolveNodeStyles() 中:
//   全局状态 → 影响样式/Props 覆盖
//   数据集 → 影响绑定值的解析

// 全景截图矩阵同时使用两个维度:
//   dataSets × globalStates × viewports
```

### 9.3 数据系统 → Operations

```typescript
// 数据集管理
executor.execute({
  type: "addDataSet",
  params: { name: "满数据", data: { ... } }
});

executor.execute({
  type: "updateDataSet",
  params: { dataSetId: "ds-1", data: { ... } }
});

executor.execute({
  type: "removeDataSet",
  params: { dataSetId: "ds-3" }
});

executor.execute({
  type: "switchDataSet",
  params: { dataSetId: "ds-2" }
});

// 数据绑定（通过 updateProps 实现）
executor.execute({
  type: "updateProps",
  params: {
    nodeId: "span-1",
    props: { children: "{{data.user.name}}" }
  }
});

// 列表绑定
executor.execute({
  type: "updateProps",
  params: {
    nodeId: "list-container",
    props: { __listData: "{{data.taskList}}" }
  }
});

// 全景截图
executor.execute({
  type: "generateSnapshots",
  params: {
    dataSetIds: ["ds-1", "ds-2", "ds-3"],
    globalStateConfigs: [
      { taskStatus: "pending" },
      { taskStatus: "inProgress" },
      { taskStatus: "done" }
    ],
    viewports: [
      { name: "iPhone 15 Pro", width: 375, height: 812 },
      { name: "iPad Air", width: 820, height: 1180 }
    ]
  }
});
```

### 9.4 数据系统 → MCP Tools

```
AI 可以通过 MCP 管理数据集:

  list_data_sets(screenId)
    → 返回所有数据集列表

  switch_data_set(screenId, dataSetId)
    → 切换当前数据集

  update_data_set(dataSetId, data)
    → 修改数据集内容

  bind_data(nodeId, propPath, expression)
    → 为节点属性设置数据绑定

  generate_snapshots(config)
    → 生成全景截图矩阵
```

---

## 十、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| 数据绑定路径不存在 | 显示原始表达式 `{{data.xxx}}`；绑定行标记 ⚠️ 警告 |
| 数据值为 null / undefined | 使用默认值（如有 `| 默认`）；否则渲染为空字符串 |
| 列表数据非数组 | 不重复渲染，显示警告 "数据源不是数组" |
| 列表数据为空数组 | 列表容器内为空（不渲染任何子项）；可在容器中放置一个空状态子元素 |
| 循环引用的 JSON | JSON 编辑器校验拒绝；可视化编辑器不存在此问题 |
| 超大数据集（JSON > 1MB）| 可视化编辑器限制展开深度；JSON 编辑器正常处理 |
| 数据集切换时画布跳动 | 可接受（数据变化 → 布局变化 → 视觉跳动是正确行为） |
| 全景截图组合数过多（> 100）| 给出警告 "预计生成 N 张截图，耗时约 X 秒，确认？" |
| 截图过程中用户操作编辑器 | 截图在后台 iframe 中执行，不影响主编辑器 |
| 模板字符串中嵌套 `{{` | 不支持嵌套表达式；第一层 `{{ }}` 匹配后停止 |
| 数据集之间结构不一致 | 允许（不同数据集可以有不同的 JSON 结构）；绑定路径在某数据集中不存在 → 返回 undefined |

---

## 十一、MVP 与后期功能分界

### MVP（Phase 3，紧随状态系统之后）

- [x] DataSet 数据结构 + Screen.dataSets 扩展 <!-- W3 -->
- [x] 数据集 CRUD（新建/编辑/删除） <!-- W3 -->
- [x] 数据集切换（switchDataSet Operation） <!-- W3 -->
- [x] JSON 编辑器（语法高亮 + 校验 + 格式化） <!-- W3 -->
- [x] 基本数据绑定语法（`{{data.xxx}}`） <!-- W3 -->
- [x] 表达式解析算法 (resolveExpression) <!-- W3 -->
- [x] 属性面板 🔗 绑定切换交互 <!-- W3 -->
- [x] 自动补全（从数据集 JSON 提取路径） <!-- W3 -->
- [x] 顶部工具栏数据集快速切换 <!-- W3 -->
- [x] 数据 Tab 基础 UI <!-- W3 -->

### Phase 4（增强数据能力）

- [ ] 可视化编辑器（树形 JSON 编辑）
- [ ] 带默认值的绑定（`{{data.xxx | 默认}}`）
- [ ] 模板字符串（`"欢迎, {{data.user.name}}!"`）
- [x] 列表绑定（`__listData` + `{{item.xxx}}`） <!-- W6 -->
- [x] 编辑模式下的列表"模板+预览"显示 <!-- W6 -->
- [ ] 预设数据集模板（空/满/异常等）
- [x] 绑定状态视觉标记（画布 🔗 图标 + 组件树标记） <!-- W6 画布 ≡ 角标 -->
- [ ] 复制数据路径快捷功能

### Phase 5（全景截图 + AI）

- [ ] 全景截图矩阵配置面板
- [ ] 截图生成引擎（逐组合渲染 + 截取）
- [ ] 截图浏览器（缩略图 + 大图 + 下载）
- [ ] AI 自动生成多套数据集（远期）
- [ ] 样式值的数据绑定（`styles.color = "{{data.themeColor}}"`）

---

## 十二、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 数据集定义在哪一级？ | Screen（页面级） | 每个页面有自己的数据结构；跨页面共享可通过复制实现 |
| 绑定语法？ | `{{data.xxx}}` 模板语法 | 简单直观；与前端模板引擎一致（Handlebars/Mustache 风格） |
| 列表绑定方式？ | 特殊属性 `__listData` + `{{item.xxx}}` | 区分列表容器和普通容器；item/index 是列表上下文的标准概念 |
| 编辑模式列表显示？ | 模板项可编辑 + 后续项只读预览 | 避免 100 项全展开无法编辑；模板项是设计的核心 |
| 数据编辑器？ | JSON + 可视化 双模式 | JSON 模式给专业用户最大控制力；可视化模式降低门槛 |
| 全景截图的组合维度？ | 数据集 × 全局状态 × 视口 | 这三个维度穷举了 UI 可能的所有变化因素 |
| 截图在哪里生成？ | 后台 iframe（不阻塞主编辑器） | 截图过程可能耗时，不应阻塞用户的编辑操作 |
| 空数据绑定的降级？ | 显示空字符串或原始表达式 | 不崩溃、不隐藏问题；⚠️ 警告帮助设计师发现绑定错误 |
