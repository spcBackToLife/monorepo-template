# 执行清单模板

> 生成 EXEC-CHECKLIST.md 时参考此模板。根据实际设计文档调整任务数量和内容。

---

## 清单生成规则

### 1. 阶段划分

```
阶段 G: 全局初始化 (theme + screens)
阶段 A: 页面骨架结构 (节点树 + 布局 + 样式)
阶段 B: 素材绘制 (canvas 绘图 + export_and_apply)
阶段 C: 数据与事件 (data_source + state + event)
阶段 D: 验证与修复
```

### 2. 区块拆分原则

从 index.md 的"节点结构树"中，按以下规则拆分区块：

```
一个区块 = 一个有明确视觉边界的容器 + 其直接子元素

示例（从节点树中识别区块）:
  root
  ├── nav-bar ← 区块1: NavBar
  │   ├── avatar-btn
  │   ├── title
  │   └── toggle-btn
  ├── map-container ← 区块2: MapContainer + 装饰
  │   ├── ambient-glow
  │   ├── light-dot-1/2/3
  │   └── empty-state ← 区块3: EmptyState
  ├── locate-btn ← 区块4: 浮动按钮组（可与FAB合并）
  ├── fab-btn
  └── tab-bar ← 区块5: TabBar
```

### 3. 任务描述格式

每个任务必须包含：
- **做什么**: 简短描述（创建哪些节点 + 设置什么样式）
- **设计来源**: 引用 index.md 的哪个章节/段落
- **验证标准**: 完成后如何判断是否正确

### 4. 依赖标注

```
无依赖: "-"
有依赖: "A-01" 或 "A-01, A-02"
```

---

## 模板

```markdown
# 执行清单

> 生成时间: YYYY-MM-DD HH:MM
> 设计文档: design-plan/pages/[NN]-[name]/
> 项目: [projectId]

## 页面: [NN]-[page-name] (screenId: [sc_xxx])

### 阶段 A: 骨架结构

| # | 任务描述 | 设计来源 | 子技能 | 依赖 | 状态 | 验证标准 |
|---|---------|---------|--------|------|:---:|---------|
| A-01 | 创建 root 容器(flex-col, h:100%, bg:Layer0) | index§3.1 | page-builder | - | ⬜ | root 节点 flex-col |
| A-02 | 搭建 NavBar(sticky-header, 毛玻璃, 3子元素) | index§4.1 | page-builder | A-01 | ⬜ | 见 ref/NavBar验证 |
| A-03 | 搭建 MapContainer(flex:1, relative) + 装饰层(光晕+3微光点) | index§4.2 + visual§3.3 | page-builder | A-01 | ⬜ | 光晕可见+点可见 |
| A-04 | 搭建 EmptyState(absolute居中, visibleWhen) | index§节点树 | page-builder | A-03 | ⬜ | 居中+条件显示 |
| A-05 | 搭建 FAB(56×56) + LocateBtn(36×36), fixed定位 | index§4.4-4.5 | page-builder | A-01 | ⬜ | 圆形+渐变+阴影 |
| A-06 | 搭建 TabBar(sticky-footer, 毛玻璃, 4Tab) | index§5.1 | page-builder | A-01 | ⬜ | 4Tab可见+图标占位 |

### 阶段 A 验证
| # | 检查项 | 状态 |
|---|--------|:---:|
| AV-01 | generate_snapshots 截图 | ⬜ |
| AV-02 | 对照样式审计检查表逐区块核对 | ⬜ |
| AV-03 | 修复发现的问题 | ⬜ |

### 阶段 B: 素材绘制（可并行 ‖）

| # | 任务描述 | 素材文档 | 子技能 | 目标节点 | 参考框 | 依赖 | 状态 |
|---|---------|---------|--------|---------|--------|------|:---:|
| B-01 | 绘制 I-01 locate-pulse | materials/I-01.md | material-painter | [nodeId] | 20×20 | A-05 | ⬜ |
| B-02 | 绘制 I-02 view-toggle | materials/I-02.md | material-painter | [nodeId] | 20×20 | A-02 | ⬜ |
| ... | | | | | | | |

### 阶段 C: 数据与事件

| # | 任务描述 | 设计来源 | 子技能 | 依赖 | 状态 |
|---|---------|---------|--------|------|:---:|
| C-01 | 创建数据源 DS-nearby-moments (API+mock) | index§8.1 | page-builder | A全+B全 | ⬜ |
| C-02 | 添加 view 状态变量 (selectedBubbleId等) | index§8.2 | page-builder | C-01 | ⬜ |
| C-03 | 绑定事件 (screenEnter/click等) | index§8.3 | page-builder | C-02 | ⬜ |
| C-04 | 设置条件显示 (visibleWhen) | index§8.4 | page-builder | C-02 | ⬜ |

### 阶段 D: 最终验证

| # | 检查项 | 状态 |
|---|--------|:---:|
| D-01 | generate_snapshots 全页面截图 | ⬜ |
| D-02 | 对照 index.md§3 宏观布局图 | ⬜ |
| D-03 | 对照 visual.md§3 装饰策略 | ⬜ |
| D-04 | 对照 index.md§6 样式规格清单逐项核对 | ⬜ |
| D-05 | 修复所有问题 | ⬜ |
| D-06 | 二次截图确认 | ⬜ |
```

---

## 状态标记说明

| 标记 | 含义 | 下一步 |
|:---:|------|--------|
| ⬜ | 待执行 | 按依赖顺序取出执行 |
| 🔄 | 执行中 | 当前对话正在处理 |
| ✅ | 完成并验证通过 | 不再触碰 |
| ⚠️ | 完成但有问题 | 在验证阶段修复 |
| ⏭️ | 跳过 | 记录原因，后续补 |
| 🔁 | 需要返工 | 验证发现问题，需重做 |
