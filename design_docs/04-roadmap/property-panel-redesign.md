# 右侧面板重构 —— 代码调整规划

> 本文档对应产品方案：[属性面板信息架构重组](../02-product/editor/03-property-panel/redesign.md)
>
> 核心变化：6 个平铺 Tab → 状态驱动的统一编辑面板

---

## 一、重构总览

### 1.1 当前代码结构

```
apps/design_front/src/
  stores/editor/index.ts
    └── RightTabType = 'styles' | 'events' | 'states' | 'props' | 'data' | 'code'
    └── activeRightTab, setActiveRightTab, focusRightPanelTab

  views/editor/panels/
    PropertyPanel/index.tsx          ← 6 Tab 容器 (152行)
    tabs/
      StylesTab/index.tsx            ← CSS 八组编辑 (731行)
      PropsTab/index.tsx             ← 元素属性编辑 (912行)
      StatesTab/index.tsx            ← 状态管理 (834行)
      InteractionsTab/index.tsx      ← 事件编辑 (802行)
      DataTab/index.tsx              ← 数据集管理 (779行)
      CodeTab/index.tsx              ← 代码预览 (137行)
    LeftPanel/index.tsx              ← 左侧面板容器
```

### 1.2 目标代码结构

```
apps/design_front/src/
  stores/editor/index.ts
    └── 废弃 RightTabType, activeRightTab
    └── 新增 stateContext: {
          interactionState: 'default'|'hover'|'active'|'focus'|'disabled',
          businessState: string,
          dataScenario: string | null,
          globalStates: Record<string, string>
        }
    └── 新增 setStateContext, switchInteractionState, switchBusinessState
    └── 新增 collapsedSections: Set<string>  (折叠记忆)

  views/editor/panels/
    RightPanel/
      index.tsx                      ← 新的统一面板容器
      StateContextBar.tsx            ← 状态上下文栏（固定顶部）
      sections/
        PropsSection.tsx             ← 属性区（从 PropsTab 提取）
        StylesSection.tsx            ← 样式区（从 StylesTab 改造）
        ChildrenVisibility.tsx       ← 子元素可见性区（新增）
        InteractionSection.tsx       ← 交互行为区（从 InteractionsTab 改造）
        CodePreviewSection.tsx       ← 代码预览区（从 CodeTab 简化）
    LeftPanel/
      index.tsx                      ← 左侧面板（增加数据入口）
      DataPanel.tsx                  ← 数据面板（从 DataTab 迁移）
```

---

## 二、分阶段实施计划

### Phase 1：状态上下文栏 + 样式/属性合并

> 最小改动，最大收益。核心骨架搭建。

#### P1.1 Store 层改造

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.1.1 | 新增 `stateContext` 状态 | `stores/editor/index.ts` | 包含 interactionState, businessState, dataScenario, globalStates 四个字段 |
| 1.1.2 | 新增状态切换 actions | `stores/editor/index.ts` | `setInteractionState(s)`, `setBusinessState(s)`, `setDataScenario(id)` |
| 1.1.3 | 保留 `activeRightTab` 兼容 | `stores/editor/index.ts` | 过渡期保留，标记 @deprecated |
| 1.1.4 | 新增 `collapsedSections` | `stores/editor/index.ts` | `Set<string>`，持久化各 section 折叠状态 |

#### P1.2 状态上下文栏组件

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.2.1 | 创建 StateContextBar | `panels/RightPanel/StateContextBar.tsx` | 交互态 radio + 业务态 select + 数据场景 select + 全局状态 select |
| 1.2.2 | 交互态切换器 | StateContextBar 内部 | 5 个 radio: default/hover/active/focus/disabled |
| 1.2.3 | 业务态切换器 | StateContextBar 内部 | 下拉框 + [+添加] 按钮，读取 node.states |
| 1.2.4 | 数据场景切换器 | StateContextBar 内部 | 下拉框，读取 screen.dataSets，自适应隐藏 |
| 1.2.5 | 全局状态切换器 | StateContextBar 内部 | 每个全局变量一个下拉，自适应隐藏 |

#### P1.3 统一面板容器

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.3.1 | 创建 RightPanel | `panels/RightPanel/index.tsx` | 替代 PropertyPanel，布局：元素信息条 + StateContextBar(固定) + 滚动内容区 |
| 1.3.2 | 迁移元素信息条 | RightPanel | 从 PropertyPanel 提取，保持不变 |
| 1.3.3 | 接入 PropsSection | RightPanel 滚动区 | 直接复用 PropsTab 内容，包裹为 CollapsibleSection |
| 1.3.4 | 接入 StylesSection | RightPanel 滚动区 | 直接复用 StylesTab 内容，包裹为 CollapsibleSection |
| 1.3.5 | 替换 PropertyPanel 挂载 | `views/editor/index.tsx` | `<PropertyPanel />` → `<RightPanel />` |

#### P1.4 样式编辑的状态感知

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.4.1 | StylesSection 读取 stateContext | `sections/StylesSection.tsx` | 当前状态非 default → 读取状态覆盖值 |
| 1.4.2 | 覆盖值蓝色标记 | StylesSection | 非 default 态 + 该属性有覆盖 → 显示 🔵 |
| 1.4.3 | 继承值灰色显示 | StylesSection | 非 default 态 + 该属性无覆盖 → 值显示灰色 |
| 1.4.4 | handleChange 状态感知 | StylesSection | default → `updateStyle`, 非 default → `updateState` |
| 1.4.5 | 删除覆盖 | StylesSection | 点击蓝色标记 → 移除当前状态下的覆盖 |

#### P1.5 属性编辑的状态感知

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.5.1 | PropsSection 读取 stateContext | `sections/PropsSection.tsx` | 当前状态非 default → 读取状态下的属性覆盖 |
| 1.5.2 | 文本/属性覆盖编辑 | PropsSection | 在 loading 态下改 text → 写入 loading 态的 props 覆盖 |
| 1.5.3 | 覆盖视觉标记 | PropsSection | 与样式区一致的蓝色标记 🔵 |

**Phase 1 交付验证：**
```
✓ 右侧面板是一个统一的滚动面板（无 Tab 切换）
✓ 顶部状态上下文栏可切换交互态/业务态
✓ 切换状态 → 样式区/属性区显示对应值
✓ 被覆盖的值有蓝色标记
✓ 在非 default 态下编辑 → 自动写入状态覆盖
✓ 画布实时预览当前选中的状态
```

---

### Phase 2：子元素可见性区 + 交互行为区

#### P2.1 子元素可见性区

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.1.1 | 创建 ChildrenVisibility | `sections/ChildrenVisibility.tsx` | 列出直接子元素，每个有 checkbox |
| 2.1.2 | 状态感知的可见性切换 | ChildrenVisibility | default → setNodeVisible, 非 default → 写入条件 visible |
| 2.1.3 | 只对容器元素显示 | RightPanel | node.children?.length > 0 时渲染 |
| 2.1.4 | 覆盖标记 | ChildrenVisibility | 可见性与 default 不同 → 蓝色标记 |

#### P2.2 交互行为区改造

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.2.1 | InteractionSection 状态感知 | `sections/InteractionSection.tsx` | 根据当前状态上下文过滤/标记事件 |
| 2.2.2 | 事件条件模型 | `design-schema` | EventDefinition 增加 `disabledInStates?: string[]` |
| 2.2.3 | 事件卡片状态标记 | InteractionSection | 当前状态下被禁用的事件显示删除线 |
| 2.2.4 | 添加事件带状态上下文 | InteractionSection | 添加事件时自动关联当前状态（可选） |

#### P2.3 Schema 扩展

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 2.3.1 | 状态覆盖模型扩展 | `design-schema` | State 增加 `propsOverrides: Record<string, unknown>` |
| 2.3.2 | 状态覆盖模型扩展 | `design-schema` | State 增加 `childrenVisibility: Record<nodeId, boolean>` |
| 2.3.3 | 事件条件字段 | `design-schema` | Event 增加 `disabledInStates?: string[]` |
| 2.3.4 | Operation 扩展 | `design-operations` | `updateStatePropsOverride`, `updateStateChildVisibility` |

**Phase 2 交付验证：**
```
✓ 选中容器 → 可看到子元素可见性列表
✓ 切换到 loading 状态 → 勾选 spinner 可见、取消 text 可见
✓ 画布实时更新子元素的显示/隐藏
✓ 交互行为区显示当前状态下的事件列表（含禁用标记）
```

---

### Phase 3：数据面板独立 + 数据场景联动

#### P3.1 数据面板迁移

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.1.1 | 创建 DataPanel | `panels/LeftPanel/DataPanel.tsx` | 从 DataTab 提取，内容不变 |
| 3.1.2 | LeftPanel 增加数据入口 | `panels/LeftPanel/index.tsx` | 底部增加 [数据] tab 按钮 |
| 3.1.3 | 废弃 DataTab | `panels/tabs/DataTab/` | 标记 @deprecated，迁移完成后删除 |
| 3.1.4 | StateContextBar 数据场景联动 | StateContextBar | 数据场景切换 → editorStore.switchDataSet |

#### P3.2 清理旧代码

| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.2.1 | 废弃 PropertyPanel | `panels/PropertyPanel/` | 完全由 RightPanel 替代 |
| 3.2.2 | 废弃 RightTabType | `stores/editor/index.ts` | 移除 activeRightTab 相关逻辑 |
| 3.2.3 | 更新所有 focusRightPanelTab 调用 | 全局搜索 | 底部工具栏等调用方适配新 API |
| 3.2.4 | 废弃 tabs/ 目录中已迁移的组件 | `panels/tabs/` | StylesTab, PropsTab, StatesTab, CodeTab → 删除或标记 |

**Phase 3 交付验证：**
```
✓ 数据面板在左侧可访问
✓ 右侧面板不再有「数据」Tab
✓ 状态上下文栏的数据场景切换与左侧数据面板联动
✓ 切换数据场景 → 画布实时更新 + 属性区绑定值更新
✓ 所有旧 Tab 引用已清理
```

---

### Phase 4：精打细磨

| # | 任务 | 说明 |
|---|------|------|
| 4.1 | 覆盖链 tooltip | 悬停属性 → 显示各层状态的覆盖值来源链 |
| 4.2 | 子元素快速属性编辑 | 可见性区展开子元素 → 内联编辑文本/颜色 |
| 4.3 | 状态组合预览矩阵 | 笛卡尔矩阵：交互态 × 业务态 × 数据场景 |
| 4.4 | 代码预览状态感知 | 生成当前状态下的代码片段 |
| 4.5 | 切换状态的动画过渡 | 蓝色标记/灰色继承值的平滑过渡 |
| 4.6 | 键盘快捷键 | 1-9 快速切换业务状态 |

---

## 三、影响范围与风险

### 3.1 影响的文件清单

| 文件 | 变化类型 | Phase |
|------|---------|-------|
| `stores/editor/index.ts` | 新增 stateContext 状态和 actions | P1 |
| `panels/PropertyPanel/index.tsx` | 废弃，由 RightPanel 替代 | P1→P3 |
| `panels/tabs/StylesTab/index.tsx` | 迁移为 sections/StylesSection | P1 |
| `panels/tabs/PropsTab/index.tsx` | 迁移为 sections/PropsSection | P1 |
| `panels/tabs/StatesTab/index.tsx` | 拆解到 StateContextBar + 各 Section | P1→P2 |
| `panels/tabs/InteractionsTab/index.tsx` | 迁移为 sections/InteractionSection | P2 |
| `panels/tabs/DataTab/index.tsx` | 迁移为 LeftPanel/DataPanel | P3 |
| `panels/tabs/CodeTab/index.tsx` | 简化为 sections/CodePreviewSection | P1 |
| `panels/LeftPanel/index.tsx` | 增加数据 tab 入口 | P3 |
| `views/editor/index.tsx` | PropertyPanel → RightPanel | P1 |
| `views/editor/BottomToolbar/index.tsx` | focusRightPanelTab 调用适配 | P3 |
| `design-schema` (State 类型) | 增加 propsOverrides, childrenVisibility | P2 |
| `design-operations` | 增加状态覆盖相关 Operations | P2 |

### 3.2 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 统一面板过长导致滚动疲劳 | 用户找不到目标区域 | Section 折叠 + 记忆 + 快捷键跳转 |
| 状态上下文栏占用过多垂直空间 | 编辑区变小 | 自适应收起无内容的行，极简元素只显示交互态一行 |
| 旧 Tab 代码大量迁移的回归风险 | 功能损失 | 渐进式迁移，保持 PropertyPanel 可回退 |
| Schema 扩展的向后兼容 | 旧项目打不开 | propsOverrides/childrenVisibility 设为 optional |
| 子元素可见性的状态覆盖与 visibleWhen 冲突 | 用户困惑 | 明确优先级：visibleWhen > 父元素状态覆盖 |

### 3.3 时间估算

| Phase | 核心工作量 | 预估周期 |
|-------|----------|---------|
| Phase 1 | Store + StateContextBar + 面板合并 + 状态感知 | 1-2 周 |
| Phase 2 | 子元素可见性 + Schema 扩展 + 交互区改造 | 1-2 周 |
| Phase 3 | 数据面板迁移 + 旧代码清理 | 1 周 |
| Phase 4 | 精打细磨（tooltip、动画、矩阵等） | 1-2 周 |
| **总计** | | **4-7 周** |

---

## 四、与其他系统的衔接

| 系统 | 衔接点 | 影响 |
|------|--------|------|
| **MCP Tools** | 状态相关 tool 需感知新的覆盖模型 | `updateStatePropsOverride` 等新 Operation 需注册为 MCP tool |
| **PreviewRenderer** | 预览模式需渲染状态组合的最终效果 | 状态叠加算法（交互>业务>全局>数据>default）需在渲染器中实现 |
| **CodeGen** | 代码导出需映射状态覆盖为条件渲染 | 状态覆盖 → `{isLoading && <Spinner />}` 式的代码生成 |
| **Canvas/EditorOverlay** | 画布需实时预览当前状态上下文 | 状态切换 → Schema 临时应用覆盖 → 渲染器更新 |
| **SyncManager** | 新 Operations 需同步 | 标准 Operation 流，无特殊处理 |
