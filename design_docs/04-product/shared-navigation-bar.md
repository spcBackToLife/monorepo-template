# 组件实例化与跨页面复用设计方案

> 状态：RFC  
> 创建：2026-05-22  
> 核心命题：设计稿中的「节点 → 组件沉淀 → 多页面实例化」全链路

---

## 一、问题本质

底栏跨页面复用只是冰山一角。本质问题是：

> **设计师在一个页面设计了一组节点，想在其他页面也用，且保持联动更新。**

这和代码世界的「组件」是同一回事：
- React 里写一个 `<BottomTabBar activeTab="home" />`，到处引用
- 改了组件源码，所有引用处自动更新
- 不同使用处只是 props 不同

设计编辑器需要**原生支持这个工作流**。

---

## 二、概念模型

```
┌─────────────────────────────────────────────────────┐
│                  Component Asset                     │
│  (组件资产：设计师沉淀的可复用组件)                    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  rootNode (组件的设计结构)                    │    │
│  │  propDefinitions (组件暴露的 props)          │    │
│  │    - activeTab: enum ["home","history"...]   │    │
│  │    - onTabClick: event                       │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │Instance 1│         │Instance 2│         │Instance 3│
   │Home 页面 │         │History页面│         │Profile页面│
   │activeTab │         │activeTab │         │activeTab │
   │= "home" │         │="history"│         │="profile"│
   └─────────┘         └─────────┘         └─────────┘
```

**这就是全部。** 不需要 Layout、不需要 Slot、不需要新概念。

---

## 三、核心工作流

### 3.1 沉淀组件

```
设计师在 Home 页面设计好了底栏
→ 选中底栏节点
→ 右键菜单「保存为组件」（或拖到左侧组件面板）
→ 弹出对话框：

┌──────────────────────────────────────┐
│ 保存为组件                            │
│                                      │
│ 名称: [ BottomTabBar            ]    │
│                                      │
│ 检测到可变内容（建议暴露为 Props）：    │
│                                      │
│ ☑️ activeTab                          │
│    当前值: "home"                     │
│    类型: ["home","chat","history",    │
│           "profile"]                  │
│                                      │
│ ☑️ 导航目标（4 个 tab 的跳转）         │
│    自动绑定: 根据 tab 名匹配页面       │
│                                      │
│              [保存]                    │
└──────────────────────────────────────┘
```

**智能检测可变部分：**
- 编辑器扫描节点树，找到「在不同页面中这个区域可能不同的值」
- 比如：某个 tab 有高亮样式（opacity: 1 vs 0.55）→ 推断这是 activeTab 驱动的
- 导航事件中的 targetScreenId → 自动作为组件的内置能力

### 3.2 在其他页面使用

```
设计师编辑 History 页面
→ 从左侧「组件」面板拖入 BottomTabBar
→ 组件以实例形式出现在画布中
→ 右侧属性面板显示该实例的 Props：

┌──────────────────────────────────────┐
│ BottomTabBar (实例)                   │
│                                      │
│ 属性                                  │
│ ─────────────────────────────────── │
│ activeTab: [ history ▼ ]             │
│                                      │
│ 同步状态: 🟢 跟随源组件               │
│ [脱离源组件]                          │
└──────────────────────────────────────┘
```

**实例行为：**
- 结构/样式/事件全部继承自源组件 → 源组件改了，所有实例自动更新
- Props 值是实例独有的（每个页面的 activeTab 不同）
- 不可在实例上修改结构（除非「脱离」）

### 3.3 编辑源组件

```
双击任何一个实例 → 进入组件编辑模式
（或从左侧组件面板点击编辑）

画布切换为组件的独立编辑空间：
- 修改结构/样式 → 保存后所有实例同步
- 修改 prop 定义 → 各实例保留已有 prop 值，新 prop 用默认值
```

---

## 四、和「布局」的关系

**Layout 只是组件实例化的一个使用模式：**

| 场景 | 本质 | 表达方式 |
|------|------|---------|
| 底栏跨页面 | BottomTabBar 组件 × N 个实例 | 各页面底部放一个实例，activeTab 不同 |
| 顶栏跨页面 | Header 组件 × N 个实例 | 各页面顶部放一个实例，title 不同 |
| 通用按钮 | Button 组件 × 到处用 | text/onClick prop 不同 |
| 用户卡片 | UserCard 组件 | user prop 不同 |

**如果设计师发现每个页面都要手动拖入底栏实例很烦**，可以提供一个快捷方式：

```
新建页面 → 选择「包含 BottomTabBar」
→ 新页面自动预填一个 BottomTabBar 实例在底部
→ activeTab 根据页面名自动匹配
```

这不是 Layout 系统，只是**新建页面时的预设模板**（scaffold），用不用完全可选。

---

## 五、数据模型

```typescript
interface DesignProject {
  screens: Screen[];
  componentAssets: ComponentAsset[];   // 已有，沉淀的组件资产
}

interface ComponentAsset {
  id: string;
  name: string;                        // "BottomTabBar"
  rootNode: ComponentNode;             // 组件的设计结构
  propDefinitions: PropDefinition[];   // 组件暴露的 props
  navigation?: NavigationConfig;       // 导航能力（针对 TabBar 类组件）
}

interface PropDefinition {
  name: string;                        // "activeTab"
  type: 'string' | 'enum' | 'boolean' | 'number' | 'event';
  enumValues?: string[];               // ["home", "chat", "history", "profile"]
  defaultValue?: unknown;
  description?: string;
}

/** 页面中的组件实例节点 */
interface ComponentNode {
  id: string;
  type: string;                        // "component:BottomTabBar" (引用 asset)
  // 当 type 以 "component:" 开头时，以下字段生效：
  componentAssetId?: string;           // 指向 ComponentAsset.id
  propBindings?: PropBinding[];        // 实例的 prop 值覆盖
  isDetached?: boolean;                // 是否已脱离源组件（脱离后变成普通节点）
  // ...其他标准字段
}

interface PropBinding {
  propName: string;                    // "activeTab"
  value: unknown;                      // "history"（静态值）
  expression?: string;                 // "{{ state.view.currentTab }}"（动态绑定）
}
```

---

## 六、codegen 行为

### 6.1 识别组件实例

```
遍历所有 Screen 的节点树：
  - type 以 "component:" 开头
  - 有 componentAssetId
→ 这是一个组件实例
→ 只生成一份组件代码，各页面 import + 传 props
```

### 6.2 生成结果

```
src/
├── components/                       ← 共享组件（从 componentAssets 生成）
│   └── BottomTabBar/
│       ├── index.tsx                 ← 组件代码（唯一一份）
│       └── index.module.less
├── pages/
│   ├── Home/
│   │   └── index.tsx                 ← import { BottomTabBar } + <BottomTabBar activeTab="home" />
│   ├── History/
│   │   └── index.tsx                 ← <BottomTabBar activeTab="history" />
│   └── Profile/
│       └── index.tsx                 ← <BottomTabBar activeTab="profile" />
```

### 6.3 导航能力

如果组件有 `navigation` 配置（TabBar 类组件特有）：

```tsx
// 生成的 BottomTabBar/index.tsx
interface BottomTabBarProps {
  activeTab: 'home' | 'chat' | 'history' | 'profile';
}

export function BottomTabBar({ activeTab }: BottomTabBarProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.bottomTabBar}>
      <div
        className={styles.homeTab}
        style={{ opacity: activeTab === 'home' ? 1 : 0.55 }}
        onClick={() => navigate('/home')}
      >
        ...
      </div>
      {/* 其他 tabs */}
    </div>
  );
}
```

**导航目标（路由路径）由 codegen 从 navigation config 推断，不需要每个实例重复绑定。**

---

## 七、编辑器实现要点

### 7.1 实例渲染

页面画布中，组件实例的渲染：

| 状态 | 渲染方式 | 可编辑 |
|------|---------|--------|
| 正常 | 完全展开渲染（和普通节点视觉一致） | ❌ 结构不可改 |
| 选中 | 显示蓝色边框 + 「组件实例」标签 | ✅ 只能改 Props |
| 双击 | 进入源组件编辑模式 | ✅ 改源组件 |
| 脱离 | 变成普通节点（展开为完整子树） | ✅ 任意修改 |

### 7.2 Prop 驱动样式差异

`activeTab` 如何影响渲染？组件内部节点的样式可以绑定 prop：

```json
{
  "name": "HomeTab",
  "styles": {
    "opacity": "{{ props.activeTab === 'home' ? 1 : 0.55 }}"
  }
}
```

编辑器在组件编辑模式中：
- 右侧面板可切换 prop 预览值（activeTab = home / history / ...）
- 画布实时显示不同 prop 值下的样子
- 设计师可以为每个 prop 值状态调整样式

### 7.3 智能检测「应该沉淀为组件」

当设计师在多个页面放置了结构相似的节点（如底栏）：

```
编辑器检测到：
  Home/BottomTabBar 和 History/BottomTabBar 结构 95% 相似

弹出提示：
  "检测到多个页面存在相似区域，是否合并为共享组件？"
  [合并为组件]  [忽略]
```

合并后自动：
1. 以 Home 的版本为基准创建 ComponentAsset
2. 各页面的副本替换为实例引用
3. 差异部分提取为 props

---

## 八、与现有能力的融合

当前项目已有 `componentAssets` 字段和 `asset` 工具。方案完全复用现有体系：

| 现有能力 | 本方案扩展 |
|---------|-----------|
| `componentAssets[]` | 不变，底栏也沉淀在这里 |
| `type: "component:xxx"` | 不变，实例节点 type 标识 |
| `propDefinitions[]` | 已有，完善 enum/event 类型 |
| `propBindings[]` | 已有，实例覆盖 prop 值 |
| `asset/instantiate` | 已有，在页面中放置实例 |
| `asset/sync_instance` | 已有，源组件变化后同步 |
| `asset/detach_instance` | 已有，脱离后变为普通节点 |

**不需要引入 Layout/Slot 新概念。** 需要增强的只有：

1. **编辑器 UX**：组件编辑模式 + prop 面板 + 实例锁定渲染
2. **Navigation 配置**：TabBar 类组件的导航声明
3. **codegen**：识别 component 实例 → 生成单一组件文件 + props 透传

---

## 九、回到底栏问题

正确的设计师工作流应该是：

```
1. 在 Home 页面设计好底栏
2. 选中底栏 → 「保存为组件」→ 命名 BottomTabBar
3. 定义 props: activeTab (enum: home/chat/history/profile)
4. 配置导航: 每个 tab 的 targetScreen
5. 在 History 页面拖入 BottomTabBar 实例，设 activeTab = "history"
6. 在 Profile 页面拖入 BottomTabBar 实例，设 activeTab = "profile"
7. 以后改底栏样式 → 改源组件 → 3 个页面全部同步更新
```

codegen 生成：
- `src/components/BottomTabBar/` — 唯一一份组件代码
- 各页面 import 并传 `activeTab` prop
- 导航跳转逻辑在组件内部，各页面无需关心

---

## 十、总结

| 问题 | 答案 |
|------|------|
| 底栏跨页面复用是什么问题？ | **组件实例化问题**，不是布局问题 |
| 需要引入 Layout 概念吗？ | **不需要**，组件 + props 就够了 |
| 不同页面只是 props 不同？ | **是**，activeTab / title 等 |
| codegen 怎么处理？ | 识别 component 实例 → 单一组件文件 + props 透传 |
| 和现有系统的关系？ | 完全复用 componentAssets 体系，零新概念 |
| 编辑器需要什么？ | 组件编辑模式 + 实例 prop 面板 + 锁定渲染 |
