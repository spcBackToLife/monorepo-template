# 06 - 组件 Props 系统

> **根本问题：如何标准化组件的可配置能力？**
>
> ← [返回总纲](../README.md)
>
> 相关文档：
> - [03-右侧属性面板](../03-property-panel/README.md) — 属性 Tab 中 Props 的渲染 UI
> - [04-状态管理系统](../04-state-system/README.md) — 状态下的 Props 覆盖
> - [05-数据驱动系统](../05-data-driven/README.md) — 数据绑定到 Props
> - [07-资产管理系统](../07-asset-management/README.md) — 保存为资产时定义 Props
> - [design-schema](../../../03-tech/design-schema.md) — ComponentNode / ComponentTemplate 类型定义

---

## 一、第一性原理：Props 系统解决什么根本问题？

### 1.1 本质推导

```
组件的可配置性问题：

一个 LoginForm 组件被团队中 10 个人使用 →
  设计师 A 想改标题文字
  设计师 B 想改主题色
  设计师 C 想隐藏"记住密码"
  设计师 D 想加一个自定义按钮文案

如果没有 Props 系统 → 每个人都要进入组件内部修改子节点
  问题 1: 改错了怎么办？（破坏组件结构）
  问题 2: 哪些能改哪些不能改？（没有边界）
  问题 3: 模板更新了怎么同步？（引用模式下无法区分"刻意修改"和"基础样式"）
  问题 4: AI 怎么知道改什么？（没有结构化描述）

Props 系统的本质 = 组件创建者与使用者之间的"配置契约"

  创建者定义: "这个组件有哪些旋钮可以拧"
  使用者操作: "只拧暴露的旋钮，其他不碰"
  AI 理解:    "读取 propDefinitions 就知道能做什么"
```

### 1.2 两层 Props 的概念

```
Props 系统涉及两个完全不同的层次：

层次 1: 原子元素的 HTML 属性
  · img 的 src / alt / loading
  · input 的 type / placeholder / maxLength / disabled
  · button 的 type / disabled
  · a 的 href / target
  这些是 HTML 标准定义的，系统内置，用户不可扩展

层次 2: 组件资产的自定义 Props
  · LoginForm 的 title / showRemember / maxRetry / themeColor
  · NavBar 的 logo / links / activeIndex
  · UserCard 的 avatar / name / role / showBadge
  这些由组件创建者定义（propDefinitions），使用者可配置

层次 1 是基础设施（所有 HTML 元素天然有的）
层次 2 是设计系统的核心价值（组件复用的标准化配置能力）
```

### 1.3 设计原则

```
1. 创建者主权 → 组件创建者决定暴露什么，使用者不能突破边界
2. 类型安全 → 每个 Prop 有明确类型，输入控件与类型匹配
3. 可发现性 → 所有可配置项在属性面板中一目了然，不需要查文档
4. AI 友好 → propDefinitions 是结构化的，AI 读取后可精确操作
5. 状态协同 → Props 可以被状态覆盖（不同状态展示不同 Props 值）
6. 数据可绑 → Props 值可以绑定到数据表达式（不只是硬编码值）
```

---

## 二、原子元素的 HTML 属性（层次 1）

### 2.1 属性注册表

系统为每种原子元素内置一份属性定义，用于在属性 Tab 中动态渲染编辑控件。

```typescript
// 原子元素属性注册表
interface HTMLElementPropRegistry {
  [elementType: string]: ElementPropDefinition[];
}

interface ElementPropDefinition {
  key: string;            // HTML 属性名: "src" / "placeholder" / "href"
  type: PropType;         // 控件类型
  label: string;          // 中文标签
  defaultValue?: any;     // 默认值
  description?: string;   // 描述/提示
  options?: { value: string; label: string }[];  // enum 类型的选项
  required?: boolean;     // 是否必填
}

type PropType =
  | "string"    // 文本输入框
  | "number"    // 数字输入框
  | "boolean"   // 复选框/开关
  | "enum"      // 下拉选择框
  | "color"     // 颜色选择器
  | "image"     // 图片选择器（文件上传/素材库选择）
  | "url"       // URL 输入框（带格式校验）
  | "action"    // 动作配置器（跳转/状态切换等）
  | "textarea"  // 多行文本输入
  | "options"   // 选项列表编辑器（用于 select 的 option 列表）
  ;
```

### 2.2 各元素的属性清单

```typescript
const htmlPropRegistry: HTMLElementPropRegistry = {

  // ===== img =====
  img: [
    { key: "src",       type: "image",   label: "图片源",    required: true,
      description: "图片 URL 或项目素材路径" },
    { key: "alt",       type: "string",  label: "替代文本",
      description: "图片无法加载时显示的文字，也用于无障碍" },
    { key: "loading",   type: "enum",    label: "加载方式",   defaultValue: "lazy",
      options: [
        { value: "lazy", label: "懒加载 (lazy)" },
        { value: "eager", label: "立即加载 (eager)" },
      ] },
    { key: "objectFit", type: "enum",    label: "填充方式",   defaultValue: "cover",
      options: [
        { value: "fill", label: "拉伸 (fill)" },
        { value: "contain", label: "包含 (contain)" },
        { value: "cover", label: "覆盖 (cover)" },
        { value: "none", label: "原始 (none)" },
      ] },
  ],

  // ===== input =====
  input: [
    { key: "type",        type: "enum",    label: "输入类型",   defaultValue: "text",
      options: [
        { value: "text", label: "文本" },
        { value: "password", label: "密码" },
        { value: "email", label: "邮箱" },
        { value: "number", label: "数字" },
        { value: "tel", label: "电话" },
        { value: "url", label: "网址" },
        { value: "search", label: "搜索" },
        { value: "date", label: "日期" },
      ] },
    { key: "placeholder", type: "string",  label: "占位文本",
      description: "输入框为空时显示的提示文字" },
    { key: "value",       type: "string",  label: "默认值" },
    { key: "maxLength",   type: "number",  label: "最大长度" },
    { key: "disabled",    type: "boolean", label: "禁用",      defaultValue: false },
    { key: "required",    type: "boolean", label: "必填",      defaultValue: false },
    { key: "readonly",    type: "boolean", label: "只读",      defaultValue: false },
  ],

  // ===== textarea =====
  textarea: [
    { key: "placeholder", type: "string",  label: "占位文本" },
    { key: "rows",        type: "number",  label: "行数",      defaultValue: 4 },
    { key: "maxLength",   type: "number",  label: "最大长度" },
    { key: "disabled",    type: "boolean", label: "禁用",      defaultValue: false },
    { key: "readonly",    type: "boolean", label: "只读",      defaultValue: false },
  ],

  // ===== button =====
  button: [
    { key: "type",     type: "enum",    label: "按钮类型", defaultValue: "button",
      options: [
        { value: "button", label: "普通按钮" },
        { value: "submit", label: "提交按钮" },
        { value: "reset", label: "重置按钮" },
      ] },
    { key: "disabled", type: "boolean", label: "禁用",    defaultValue: false },
  ],

  // ===== a =====
  a: [
    { key: "href",   type: "url",    label: "链接地址",  required: true },
    { key: "target", type: "enum",   label: "打开方式",  defaultValue: "_self",
      options: [
        { value: "_self", label: "当前窗口" },
        { value: "_blank", label: "新窗口" },
      ] },
  ],

  // ===== select =====
  select: [
    { key: "options",  type: "options", label: "选项列表",
      description: "下拉框的可选值列表" },
    { key: "disabled", type: "boolean", label: "禁用", defaultValue: false },
  ],

  // ===== video =====
  video: [
    { key: "src",      type: "url",     label: "视频源" },
    { key: "poster",   type: "image",   label: "封面图" },
    { key: "controls", type: "boolean", label: "显示控件", defaultValue: true },
    { key: "autoplay", type: "boolean", label: "自动播放", defaultValue: false },
    { key: "loop",     type: "boolean", label: "循环播放", defaultValue: false },
    { key: "muted",    type: "boolean", label: "静音",     defaultValue: false },
  ],

  // ===== 容器类元素（div/section/nav/header/footer/main）=====
  // 无特殊 HTML 属性，属性 Tab 显示 "无元素属性"
  div: [],
  section: [],
  nav: [],
  header: [],
  footer: [],
  main: [],

  // ===== 文本类元素（p/h1/h2/h3/span）=====
  // 文本内容通过 node.props.children 或 textContent 编辑
  // 不在属性 Tab 中显示（在画布上直接编辑文本）
  p: [],
  h1: [],
  h2: [],
  h3: [],
  span: [],

  // ===== 列表元素 =====
  ul: [],
  ol: [
    { key: "start", type: "number", label: "起始序号", defaultValue: 1 },
  ],
  li: [],
};
```

---

## 三、组件资产的自定义 Props（层次 2）

### 3.1 ComponentPropDefinition 完整类型

```typescript
interface ComponentPropDefinition {
  key: string;              // prop 名（驼峰命名）: "title" / "showAvatar" / "maxRetry"
  type: PropType;           // 控件类型
  label: string;            // 中文标签: "标题" / "显示头像" / "最大重试次数"
  defaultValue: any;        // 默认值
  description?: string;     // 描述说明（hover 时显示 tooltip）
  required?: boolean;       // 是否必填（true 时值不可为空）
  group?: string;           // 分组名（同 group 的 props 在一个折叠组内）

  // type = "enum" 时的配置
  options?: { value: string; label: string }[];

  // type = "number" 时的配置
  min?: number;
  max?: number;
  step?: number;

  // type = "string" / "textarea" 时的配置
  maxLength?: number;
  placeholder?: string;

  // type = "action" 时的配置（可选行为类型）
  actionTypes?: ("navigate" | "setState" | "openUrl" | "custom")[];

  // type = "image" 时的配置
  accept?: string;          // 文件类型: "image/png,image/jpeg"
  maxSize?: number;         // 最大文件大小 (bytes)
}
```

### 3.2 PropDefinitions 存储位置

```typescript
// propDefinitions 存储在 ComponentTemplate 中

interface ComponentTemplate {
  id: string;
  name: string;
  // ...其他已有字段...

  // 新增：Props 定义数组
  propDefinitions: ComponentPropDefinition[];

  // 新增：Props 与内部节点的映射关系
  propBindings: PropBinding[];
}

// PropBinding: 定义一个外部 Prop 如何作用于组件内部的节点
interface PropBinding {
  propKey: string;          // 外部 Prop 名: "title"
  targetNodePath: string;   // 内部节点路径: "root.children[0].children[1]"
  targetField: string;      // 目标字段: "props.children" / "styles.color" / "props.src"
}
```

### 3.3 Prop 到内部节点的映射示例

```
组件 LoginForm 的 propDefinitions + propBindings:

  Props:
    title (string)      → "用户登录"
    themeColor (color)  → "#0D99FF"
    showRemember (bool) → true
    submitText (string) → "登录"

  内部结构:
    📦 div.loginForm
      📝 h2.title       ← title prop 映射到这里的 textContent
      📦 div.form
        📥 input.username
        📥 input.password
        📦 div.remember  ← showRemember = false 时 visible = false
          ☑️ checkbox
          📝 span "记住密码"
        🔘 button.submit ← submitText 映射到这里的 textContent
                          ← themeColor 映射到这里的 background

  propBindings:
    { propKey: "title",        targetNodePath: "root.children[0]",
      targetField: "props.children" }
    { propKey: "themeColor",   targetNodePath: "root.children[1].children[2]",
      targetField: "styles.background" }
    { propKey: "showRemember", targetNodePath: "root.children[1].children[1]",
      targetField: "visible" }
    { propKey: "submitText",   targetNodePath: "root.children[1].children[2].children[0]",
      targetField: "props.children" }
```

---

## 四、保存为组件资产时的 Props 定义流程

### 4.1 完整流程

```
用户在画布上选中一组元素 → 右键 "保存为组件资产":

  Step 1: 基本信息
  ┌──────────────────────────────────────┐
  │  保存为组件资产                        │
  │                                      │
  │  名称: [LoginForm          ]         │
  │  分类: [表单 ▾]                      │
  │  标签: [登录] [表单] [+]             │
  │  类型: (●) 骨架组件  ( ) 风格组件     │
  │  范围: (●) 项目  ( ) 团队             │
  │                                      │
  │                       [下一步 →]      │
  └──────────────────────────────────────┘

  Step 2: 定义可配置 Props
  ┌──────────────────────────────────────┐
  │  定义组件 Props                       │
  │                                      │
  │  组件预览:                            │
  │  ┌──────────────────────────────┐    │
  │  │  📦 LoginForm                │    │
  │  │    📝 h2 "用户登录"          │    │
  │  │    📥 input.username         │    │
  │  │    📥 input.password         │    │
  │  │    ☑️ "记住密码"             │    │
  │  │    🔘 button "登录"          │    │
  │  └──────────────────────────────┘    │
  │                                      │
  │  已定义的 Props:                      │
  │  ┌──────────────────────────────┐    │
  │  │ title     string  "用户登录"  │    │
  │  │   → h2.textContent           │    │
  │  │ themeColor color  "#0D99FF"  │    │
  │  │   → button.background        │    │
  │  │ showRemember bool  true      │    │
  │  │   → div.remember.visible     │    │
  │  │ submitText string "登录"     │    │
  │  │   → button > span.textContent│    │
  │  └──────────────────────────────┘    │
  │                                      │
  │  [+ 添加 Prop]                       │
  │                                      │
  │              [← 上一步]  [保存]       │
  └──────────────────────────────────────┘
```

### 4.2 添加 Prop 的交互

```
点击 [+ 添加 Prop]:

  ┌──────────────────────────────────────┐
  │  添加 Prop                            │
  │                                      │
  │  Prop 名:   [title            ]      │
  │  中文标签:  [标题              ]      │
  │  类型:      [string ▾]               │
  │  默认值:    [用户登录           ]      │
  │  描述:      [登录页顶部标题     ]      │
  │  必填:      [✓]                      │
  │  分组:      [基本信息 ▾]             │
  │                                      │
  │  ── 映射到内部节点 ──                  │
  │                                      │
  │  点击组件预览中的节点选择目标:         │
  │  目标节点: [📝 h2 "用户登录" ▾]      │
  │  目标字段: [文本内容 ▾]              │
  │    文本内容 / 样式属性... / 属性...   │
  │    可见性                             │
  │                                      │
  │               [取消]  [添加]          │
  └──────────────────────────────────────┘

"映射到内部节点" 的交互:
  · 点击组件预览中的树节点 → 选中为目标节点
  · 选择目标字段:
    - 文本内容 → targetField = "props.children"
    - 样式属性 → 展开可选样式列表 (color / background / fontSize / ...)
    - 属性 → 展开该节点类型的属性列表 (src / placeholder / disabled / ...)
    - 可见性 → targetField = "visible"
```

### 4.3 AI 辅助定义 Props（远期）

```
保存组件时，AI 可以自动分析组件结构并建议 Props:

  AI 分析:
    "这个组件包含一个 h2 标题、两个 input、一个 checkbox 和一个按钮。"
    "建议暴露以下 Props:"
    · title (string) → h2 的文本内容
    · showRemember (boolean) → checkbox 区域的可见性
    · submitText (string) → 按钮文案
    · themeColor (color) → 按钮背景色

  设计师可以接受/修改/添加/删除 AI 的建议。
```

---

## 五、组件实例的 Props 配置面板

### 5.1 配置面板 UI

当选中一个组件实例时，属性 Tab 中渲染 Props 配置面板：

```
┌──────────────────────────────────────┐
│  属性                                 │
├──────────────────────────────────────┤
│                                      │
│  元素类型  [component:LoginForm]      │
│  📦 LoginForm (引用模式)             │
│  [分离实例]  [重新同步]               │
│                                      │
│  ── 基本信息 ────────────────────── │
│                                      │
│  标题        [欢迎回来        ]  str  │
│  * 必填                              │
│                                      │
│  提交按钮文案 [立即登录        ]  str  │
│                                      │
│  ── 外观 ────────────────────────── │
│                                      │
│  主题色      [🎨 #FF6B00]     color  │
│                                      │
│  ── 功能 ────────────────────────── │
│                                      │
│  显示记住密码 [✓]              bool  │
│                                      │
│  最大重试次数 [5]              num   │
│                                      │
│  登录成功动作 [→ 跳转首页 ▾]  action │
│                                      │
│  ℹ️ Props 由组件模板 "LoginForm"      │
│     定义，不可增删。                   │
│     [查看组件模板 →]                  │
│                                      │
└──────────────────────────────────────┘

· Props 按 group 分组显示，可折叠
· 必填 Props 标记 * 号
· 每个 Prop 右侧显示类型缩写 (str/num/bool/color/...)
· hover Prop 标签 → 显示 description tooltip
· 修改任何 Prop → 立即触发 updateProps Operation → 画布重渲染
```

### 5.2 各 PropType 的渲染控件

```
┌──────────────────────────────────────────────────────┐
│  PropType   │  渲染控件               │  交互          │
├─────────────┼─────────────────────────┼────────────────┤
│  string     │  单行文本输入框          │  blur/Enter    │
│  textarea   │  多行文本输入框 (3行高)  │  blur          │
│  number     │  数字输入框 + 步进按钮   │  blur/Enter/↑↓ │
│  boolean    │  开关 (Switch)          │  点击即提交    │
│  enum       │  下拉选择框              │  选择即提交    │
│  color      │  颜色块 + HEX 输入      │  颜色选择器    │
│  image      │  缩略图 + [选择] 按钮    │  文件/素材库   │
│  url        │  URL 输入框 + 🔗 图标   │  blur/Enter    │
│  action     │  动作描述 + [编辑] 按钮  │  弹出配置面板  │
│  options    │  选项列表 + 增删排序     │  内联编辑      │
└─────────────┴─────────────────────────┴────────────────┘

number 输入框的额外配置:
  · min / max → 限制范围
  · step → 步进值（默认 1）
  · 输入框右侧显示 [▲][▼] 步进按钮

image 选择器:
  · 当前值: 显示缩略图（64×64）+ 文件名
  · [选择] → 打开选择面板:
    ┌──────────────────────────┐
    │  [上传新图片]  [素材库]   │
    │                          │
    │  最近使用:                │
    │  🖼 🖼 🖼 🖼             │
    └──────────────────────────┘
  · [×] → 清除当前值

action 配置器:
  · 展示当前配置: "→ 跳转到: 首页"
  · [编辑] → 弹出事件行为配置面板（同交互 Tab 的行为配置）
  · 可选行为由 actionTypes 限定
```

### 5.3 引用模式 vs 脱离模式

```
组件实例有两种模式，影响 Props 的行为:

引用模式 (reference):
  · 📦 LoginForm (引用模式)
  · Props 定义来自模板（不可增删 Props 条目）
  · Props 值在实例上独立（每个实例可以有不同的值）
  · 模板更新 propDefinitions → 所有引用实例自动同步新定义
  · [重新同步] → 将实例的 Props 值重置为模板默认值

脱离模式 (detached):
  · 📦 LoginForm (已脱离)
  · 实例变为独立副本，不再跟随模板更新
  · Props 定义可自由修改（增删 Prop 条目）
  · 等同于普通节点子树
  · [分离实例] 按钮触发 detachInstance Operation

引用→脱离 是单向操作:
  · 一旦脱离，无法重新关联到模板
  · 脱离前给出确认提示: "脱离后将不再跟随模板更新，确认？"
```

---

## 六、状态下的 Props 覆盖

### 6.1 设计理念

```
与样式覆盖一样，Props 也可以被状态覆盖：

  default 状态: text = "提交"
  loading 状态: text = "加载中...", disabled = true
  success 状态: text = "成功 ✓", disabled = true
  error   状态: text = "失败，重试"

Props 覆盖存储在 ComponentState.props 中（已有数据结构）。
```

### 6.2 Props 覆盖的编辑流程

```
1. 用户在状态 Tab 选中 "loading" 业务状态
2. 切换到属性 Tab → 顶部出现蓝色横幅: "正在编辑 loading 状态的属性覆盖"
3. Props 的显示规则变化:
   · 有覆盖值的 Prop → 显示覆盖值 + 蓝色圆点
   · 无覆盖值的 Prop → 显示基础值（灰色 + "继承" 标签）
4. 修改某个 Prop → 写入 loading 状态的 props 覆盖
5. 右键 Prop → "移除此状态覆盖"

这与样式 Tab 的状态覆盖编辑流程完全一致（见 04-state-system 第九节）。
```

### 6.3 Props 覆盖的解析

```typescript
// 最终 Props 的计算（遵循状态叠加规则）
function resolveNodeProps(
  node: ComponentNode,
  globalStates: Record<string, string>,
  interactionState: string
): Record<string, any> {
  // 第 0 层：基础 Props
  let props = { ...node.props };

  // 第 3 层：全局状态绑定的 Props 覆盖
  if (node.globalStateBindings) {
    for (const binding of node.globalStateBindings) {
      if (globalStates[binding.variableName] === binding.value) {
        if (binding.props) props = { ...props, ...binding.props };
      }
    }
  }

  // 第 2 层：业务状态的 Props 覆盖
  const businessState = node.states.find(s => s.name === node.activeState);
  if (businessState?.props) props = { ...props, ...businessState.props };

  // 第 1 层：交互状态的 Props 覆盖
  if (interactionState !== "normal") {
    const interState = node.states.find(s => s.name === interactionState);
    if (interState?.props) props = { ...props, ...interState.props };
  }

  return props;
}
```

---

## 七、Props 与数据绑定的结合

### 7.1 设计理念

```
Props 的值可以是硬编码的，也可以绑定到数据表达式：

硬编码:    title = "用户登录"
数据绑定:  title = "{{data.pageTitle}}"

当 Prop 值是数据绑定表达式（以 {{ 开头）时：
  · 属性面板中显示绑定图标 🔗 + 表达式
  · 画布渲染时从当前数据集中解析值
  · 数据集切换 → Props 值跟着变 → UI 跟着变
```

### 7.2 Props 绑定交互

```
在属性 Tab 中，每个 Prop 输入框右侧有一个 [🔗] 按钮:

  标题    [用户登录            ]  [🔗]

  点击 [🔗] → 切换为数据绑定模式:

  标题    [🔗 data.pageTitle    ]  [✕]
           ↑ 绑定表达式输入框       ↑ 取消绑定

  绑定模式下:
    · 输入框变为绿色边框（区别于硬编码输入）
    · 输入框内容为数据路径表达式
    · 支持自动补全（根据当前数据集结构）
    · [✕] 取消绑定 → 恢复为硬编码值

  Schema 中的存储:
    硬编码: node.props.title = "用户登录"
    绑定:   node.props.title = "{{data.pageTitle}}"
```

### 7.3 绑定值的解析优先级

```
Props 值的解析流程:

  1. 读取 Prop 值
  2. 如果是 "{{...}}" 格式 → 数据绑定表达式 → 从当前数据集解析
  3. 状态覆盖后的值也可以是数据绑定表达式
  4. 如果数据路径不存在 → 保持显示原始表达式 "{{data.xxx}}"

示例:
  基础 Props: { title: "{{data.pageTitle}}" }
  当前数据集: { pageTitle: "欢迎回来" }
  → 解析后: title = "欢迎回来"

  切换到"空数据"数据集: { pageTitle: "" }
  → 解析后: title = ""
```

---

## 八、Schema 扩展

### 8.1 新增到 ComponentTemplate

```typescript
interface ComponentTemplate {
  // ...已有字段...

  // 新增
  propDefinitions: ComponentPropDefinition[];  // 暴露的可配置项定义
  propBindings: PropBinding[];                 // Props 到内部节点的映射
}
```

### 8.2 新增 Operations

```typescript
// 组件实例 Props 修改
{ type: "updateComponentProps",
  params: { nodeId: string; props: Record<string, any> } }

// 组件模板 Props 定义管理
{ type: "addPropDefinition",
  params: { templateId: string; propDef: ComponentPropDefinition } }
{ type: "removePropDefinition",
  params: { templateId: string; propKey: string } }
{ type: "updatePropDefinition",
  params: { templateId: string; propKey: string; propDef: Partial<ComponentPropDefinition> } }
{ type: "reorderPropDefinitions",
  params: { templateId: string; newOrder: string[] } }

// Props 绑定映射
{ type: "addPropBinding",
  params: { templateId: string; binding: PropBinding } }
{ type: "removePropBinding",
  params: { templateId: string; propKey: string } }

// 元素类型切换（含 Props 自动清理/填充）
{ type: "changeElementType",
  params: { nodeId: string; newType: NodeType } }
```

---

## 九、AI 集成

### 9.1 AI 如何理解 Props

```
AI（通过 MCP）读取组件模板的 propDefinitions:

  MCP Tool: get_component_template("LoginForm")
  → 返回:
    {
      name: "LoginForm",
      propDefinitions: [
        { key: "title", type: "string", label: "标题", defaultValue: "用户登录" },
        { key: "themeColor", type: "color", label: "主题色", defaultValue: "#0D99FF" },
        { key: "showRemember", type: "boolean", label: "显示记住密码", defaultValue: true },
        ...
      ]
    }

  AI 看到这些 → 精确知道可以修改什么 → 生成正确的 Operation:
    "把登录表单的标题改成'欢迎回来'，主题色改成红色"
    →
    {
      type: "updateComponentProps",
      params: {
        nodeId: "xxx",
        props: { title: "欢迎回来", themeColor: "#FF0000" }
      }
    }

AI 不会做的事（因为 propDefinitions 没有暴露）:
  · 不会修改表单的内部布局
  · 不会改变输入框的数量
  · 不会修改提交逻辑
  → 组件创建者的意图被尊重
```

### 9.2 MCP Tools

```
组件 Props 相关的 MCP Tools:

  get_component_template(templateId)
    → 返回模板信息 + propDefinitions

  update_component_props(nodeId, props)
    → 修改实例的 Props 值

  list_component_props(nodeId)
    → 返回当前实例的 Props 值 + 可修改范围
```

---

## 十、边界情况与异常处理

| 场景 | 预期行为 |
|------|---------|
| 模板新增了 Prop，引用实例未赋值 | 实例使用 defaultValue |
| 模板删除了 Prop，引用实例已有自定义值 | 该值被静默丢弃，下次渲染时无效 |
| Prop 值类型不匹配（如 number Prop 传入 "abc"）| 输入时校验，不允许提交非法值 |
| enum Prop 的选项变化（模板更新后选项减少）| 如果实例值不在新选项中 → 降级为 defaultValue |
| 数据绑定表达式解析失败 | 显示原始表达式 "{{...}}"，控制台警告 |
| 必填 Prop 值为空 | 属性面板 Prop 标签变红 + 组件树节点显示 ⚠️ |
| 脱离模式实例修改 propDefinitions | 允许（脱离后完全自治） |
| 组件嵌套（组件 A 内含组件 B 实例）| B 的 Props 在 A 内部配置，A 也可以把 B 的 Prop 暴露为 A 的 Prop |
| 超多 Props（> 30 个）| 分组折叠 + 搜索（在 Props 区域顶部添加搜索框） |
| 修改 propBindings 后内部节点路径失效 | 校验映射有效性 → 标记为 ⚠️ "映射目标不存在" |

---

## 十一、MVP 与后期功能分界

### MVP（Phase 2，与 04-state-system 同步交付）

- [x] HTML 属性注册表（img / input / button / a / textarea / select / video） <!-- W4 -->
- [x] 属性 Tab 根据 node.type 动态渲染 HTML 属性编辑控件 <!-- W4 -->
- [x] 元素类型切换（changeElementType Operation） <!-- W4 -->
- [x] 各 PropType 的渲染控件（string / number / boolean / enum / color） <!-- W4 -->
- [x] 组件实例的 Props 配置面板基础版（读取 propDefinitions 渲染控件） <!-- W4 -->
- [x] updateComponentProps Operation <!-- W4 -->

### Phase 3（保存为资产 + 定义 Props）

- [x] 保存为组件资产的 Props 定义流程（两步骤向导） <!-- W6 -->
- [x] propBindings 映射编辑（选择内部节点 + 目标字段） <!-- W6 PropBindingsEditorModal -->
- [x] 引用模式 vs 脱离模式的 Props 行为差异 <!-- W4/W6 -->
- [ ] image PropType 的完整控件（缩略图 + 上传 + 素材库）
- [ ] action PropType 的配置面板
- [ ] options PropType（select 的选项列表编辑器）

### Phase 4（高级功能）

- [ ] 状态下的 Props 覆盖编辑
- [ ] Props 的数据绑定（🔗 切换 + 表达式自动补全）
- [ ] AI 辅助定义 Props（自动分析组件结构建议 Props）
- [x] MCP Tools 集成（get_component_template / update_component_props） <!-- W4/W6 -->
- [ ] Props 分组折叠 + 搜索
- [ ] 组件嵌套的 Prop 穿透暴露

---

## 十二、核心设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| Props 系统分几层？ | 两层：HTML 属性（内置）+ 组件 Props（自定义） | HTML 属性是标准行为不可扩展；组件 Props 是设计系统的扩展点 |
| Props 定义存在哪？ | ComponentTemplate.propDefinitions | Props 是组件模板的能力声明，跟随模板而非实例 |
| Props 到内部节点如何映射？ | PropBinding (路径 + 字段) | 显式映射比命名约定更可靠，可映射到任意节点的任意字段 |
| 引用实例能否修改 Props 定义？ | 不能（只能改值） | 保证所有引用实例遵守同一套契约；改定义请用脱离模式 |
| PropType 体系？ | 10 种类型 | 覆盖 99% 的配置场景；每种有对应的最优渲染控件 |
| 类型校验严格度？ | 输入时校验，不允许提交非法值 | 防止 Schema 中出现脏数据 |
| Props 值能否绑定数据？ | 能（{{data.xxx}} 语法） | Props 值也是数据驱动的一部分 |
| AI 如何知道能改什么？ | 读取 propDefinitions | 结构化描述 → AI 精确操作，不会越界 |
