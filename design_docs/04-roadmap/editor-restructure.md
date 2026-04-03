# 编辑器整体重构 —— 代码调整规划

> 本文档对应产品方案：[编辑器总纲](../02-product/editor/README.md)（重写版）
>
> 核心变化：从「Figma-like 画图工具」到「产品构建器」
>
> 包含三大重构块：
> 1. 右侧面板重组（详见 [property-panel-redesign.md](./property-panel-redesign.md)）
> 2. 左侧产品导航器重构（本文档）
> 3. 画布上下文感知增强（本文档）

---

## 一、总体分阶段规划

```
Phase 1：右侧面板重组                   → 4-7 周（已有详细规划）
Phase 2：左侧产品导航器                  → 3-5 周
Phase 3：画布上下文感知 + 元素树增强       → 2-3 周
Phase 4：页面流程图 + 跨页面导航可视化     → 2-3 周
Phase 5：预览模式增强                     → 1-2 周
                                    总计  → 12-20 周
```

各 Phase 可并行推进——右侧面板、左侧面板、画布是独立的 UI 区域。

---

## 二、Phase 2：左侧产品导航器

### 2.1 当前代码结构

```
apps/design_front/src/views/editor/
  panels/
    LeftPanel/index.tsx            ← 左侧面板容器
    NodeTree/index.tsx             ← 元素树（组件树）
    PageList/index.tsx             ← 页面列表
```

### 2.2 目标代码结构

```
apps/design_front/src/views/editor/
  panels/
    LeftPanel/
      index.tsx                    ← 三视图容器（页面/元素/数据）
      PageView/
        index.tsx                  ← 页面列表 + 导航关系
        NavigationGraph.tsx        ← 迷你导航关系图
      ElementView/
        index.tsx                  ← 元素树（增强版，带行为指示器）
      DataView/
        index.tsx                  ← 数据面板（从右侧 DataTab 迁移）
        DataSetSelector.tsx        ← 数据集选择/切换
        GlobalStateManager.tsx     ← 全局状态变量管理
        JsonEditor.tsx             ← JSON 编辑器
```

### 2.3 任务分解

#### P2.1 左侧面板三视图容器

| # | 任务 | 说明 |
|---|------|------|
| 2.1.1 | LeftPanel 改造为三视图容器 | 底部三个 tab 图标：📄页面 / 🌳元素 / 📊数据 |
| 2.1.2 | 视图切换 store | `editorStore.leftPanelView: 'pages' \| 'elements' \| 'data'` |
| 2.1.3 | 快捷键绑定 | 可选：Alt+1/2/3 快速切换左侧视图 |

#### P2.2 页面视图增强

| # | 任务 | 说明 |
|---|------|------|
| 2.2.1 | 页面列表重构 | 每个页面项显示名称 + 跳转目标（来自 navigate 事件） |
| 2.2.2 | 跳转关系提取 | 遍历 screen 所有节点的 events，提取 navigate 目标 |
| 2.2.3 | 迷你导航关系图 | 可折叠的底部区域，用简单的节点+连线图展示页面关系 |
| 2.2.4 | 页面缩略图 | 各页面旁显示小预览图（可选，远期） |

#### P2.3 数据视图（从右侧迁移）

| # | 任务 | 说明 |
|---|------|------|
| 2.3.1 | 迁移 DataTab 内容 | 数据集选择器、JSON 编辑器、预设模板 → 左侧 DataView |
| 2.3.2 | 全局状态管理 | 从 StatesTab 的 GlobalStateVariableManager 迁移 |
| 2.3.3 | 数据集切换联动 | 切换数据集 → 画布实时更新 + 右侧状态上下文栏同步 |
| 2.3.4 | 全局状态切换联动 | 修改全局状态 → 画布实时更新 + 右侧状态上下文栏同步 |

---

## 三、Phase 3：画布上下文感知 + 元素树增强

### 3.1 画布上下文提示条

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.1.1 | 上下文提示条组件 | `Canvas/CanvasContextBar.tsx` | 显示当前数据集、全局状态值 |
| 3.1.2 | 快速切换入口 | CanvasContextBar | 点击各指示器 → 下拉切换 |
| 3.1.3 | 非 default 上下文高亮 | CanvasContextBar | 非 default 时显示醒目颜色 |
| 3.1.4 | 显示/隐藏设置 | editorStore | `showCanvasContextBar: boolean` |

### 3.2 元素树行为指示器

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.2.1 | 事件指示器 ⚡ | `ElementView/index.tsx` | 节点有 events.length > 0 → 显示闪电 |
| 3.2.2 | 数据绑定指示器 🔗 | ElementView | props 中含 `{{}}` 表达式 → 显示链接 |
| 3.2.3 | 状态指示器 🔵 | ElementView | 有非 default 状态定义 → 显示蓝点 |
| 3.2.4 | 可见性指示器 👁 | ElementView | 有 visibleWhen 条件 → 显示眼睛 |
| 3.2.5 | 指示器工具提示 | ElementView | hover 指示器 → 显示详情 tooltip |

---

## 四、Phase 4：页面流程图 + 跨页面导航可视化

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 导航关系数据模型 | 从所有 screen 的 events 中提取 navigate 目标，构建有向图 |
| 4.2 | 流程图渲染组件 | 简单的节点+有向边图（可用 React Flow 或手绘 Canvas） |
| 4.3 | 全屏流程图视图 | 可展开为全屏模态框查看完整产品流程图 |
| 4.4 | 流程图交互 | 点击节点 → 跳转到该页面；hover → 显示跳转条件 |
| 4.5 | 自动布局 | 节点按层级自动排列（BFS/DFS） |

---

## 五、Phase 5：预览模式增强

| # | 任务 | 说明 |
|---|------|------|
| 5.1 | 预览控制条增强 | 数据集切换 + 全局状态切换 + 重置 + 后退 |
| 5.2 | 交互事件覆盖率显示 | 预览后显示「已触发 / 未触发」的事件统计 |
| 5.3 | 预览录制 | 记录预览操作轨迹，可回放（远期） |

---

## 六、影响范围总表

| 文件/模块 | 变化 | Phase |
|-----------|------|-------|
| `stores/editor/index.ts` | 新增 leftPanelView, stateContext, canvasContextBar | P2,P3 |
| `panels/LeftPanel/index.tsx` | 重构为三视图容器 | P2 |
| `panels/NodeTree/index.tsx` | 改造为 ElementView + 行为指示器 | P3 |
| `panels/PageList/index.tsx` | 改造为 PageView + 导航关系 | P2 |
| `panels/tabs/DataTab/` | 迁移到左侧 DataView | P2 |
| `panels/tabs/StatesTab/` → GlobalStateVariableManager | 迁移到左侧 DataView | P2 |
| `Canvas/index.tsx` | 增加 CanvasContextBar | P3 |
| `panels/PropertyPanel/` | 由右侧面板重组替代 | P1（另一文档） |
| `design-schema` | Screen 增加 navigationGraph 缓存字段（可选） | P4 |

---

## 七、与右侧面板重构的依赖关系

```
Phase 1（右侧面板重组）和 Phase 2（左侧导航器）可以并行推进：
  · 右侧：PropertyPanel → RightPanel + StateContextBar + Sections
  · 左侧：LeftPanel → 三视图 + DataView 迁移

Phase 3（画布上下文 + 元素树）依赖 Phase 2：
  · 画布上下文条的数据集/全局状态切换 → 需要左侧 DataView 的 store 就绪
  · 元素树行为指示器 → 独立开发，不依赖其他

Phase 4（页面流程图）独立推进：
  · 只需读取 screens[].events 数据，不依赖面板重构

建议并行路径：
  ├── 路径 A：右侧面板重组（Phase 1）
  ├── 路径 B：左侧面板 + 数据迁移（Phase 2）
  └── 路径 C：元素树指示器 + 画布上下文（Phase 3 部分任务）
  
  汇合后推进 Phase 4 和 Phase 5
```
