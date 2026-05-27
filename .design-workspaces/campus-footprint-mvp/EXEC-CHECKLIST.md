# 执行清单

> 生成时间: 2026-05-27 18:05
> 更新时间: 2026-05-27 19:50
> 设计文档: design-plan/pages/
> 项目: f77b323b-8fa7-43d1-b6d1-5eb3f8fade00

## 项目信息
- projectId: f77b323b-8fa7-43d1-b6d1-5eb3f8fade00

---

## 页面: 01-home-map (首页地图) — ✅ 已完成

- screenId: sc_c0de31a2abe849178be8e
- rootNodeId: nd_39d0099bc1af406b81c27
- 状态: 结构✅ + 素材✅ + 事件✅

---

## 页面: 02-publish-moment (发布动态)

- screenId: sc_d18a35ab6c4845d1ad386
- rootNodeId: nd_662e3c41a8504284b249f

### 阶段 A: 骨架结构（串行）

| # | 任务描述 | 设计来源 | 子技能 | 依赖 | 状态 | 验证标准 |
|---|---------|---------|--------|------|:---:|---------|
| A-01 | root 样式(h:100%, bg:#0D0D14, flex-col) | index§3.1 | page-builder | - | ✅ | root bg+height+flexDirection |
| A-02 | NavBar 区块(sticky-header, 毛玻璃, cancel+title+publish-btn) | index§4.1 | page-builder | A-01 | ✅ | 3子元素+毛玻璃+flex-row |
| A-03 | 地图预览区(h:30vh, relative, pin+pulse+label) | index§4.2 | page-builder | A-01 | ✅ | h:30vh+暗色底+Pin+脉冲环+位置标签 |
| A-04 | 编辑区(flex:1, bg:Layer1, radius:24px 24px 0 0, textarea+char-count+image-grid+visibility-row) | index§4.3-4.4 | page-builder | A-01 | ✅ | 圆角+输入框+字数+图片网格+可见性行 |

### 阶段 B: 素材绘制（可并行 ‖）四级90bi j t 6
  - M《P「R吧v
| # | 任务描述 | 素材文档 | 子技能 | 目标节点 | 参考框 | 依赖 | 状态 |
|---|---------|---------|--------|---------|--------|------|:---:|
| B-01 | 绘制 I-06 location-pin | materials/I-06-location-pin.md | material-painter | (pin-marker) | 24×32 | A-03 | ⏭️ CSS已实现 |
| B-02 | 绘制 I-07 vis-public | materials/I-07-vis-public.md | material-painter | nd_ff6a6a889c5c4b26bcab6 | 20×20 | A-04 | ✅ |
| B-03 | 绘制 I-08 vis-targeted | materials/I-08-vis-targeted.md | material-painter | (icon-div备用) | 20×20 | A-04 | ⬜ |
| B-04 | 绘制 I-09 vis-timed | materials/I-09-vis-timed.md | material-painter | (icon-div备用) | 20×20 | A-04 | ⬜ |

### 阶段 C: 数据与事件

| # | 任务描述 | 设计来源 | 子技能 | 依赖 | 状态 |
|---|---------|---------|--------|------|:---:|
| C-01 | 创建数据源 DS-publish-moment (API+mock) | index§8.1 | page-builder | A全+B全 | ✅ |
| C-02 | 添加 state.view 变量 (content/images/pinLat/pinLng/visibilityMode/isPublishing/locationReady) | index§8.2 | page-builder | C-01 | ✅ |
| C-03 | 绑定事件(screenEnter/change/click等) | index§8.3 | page-builder | C-02 | ✅ |
| C-04 | 设置 visibleWhen(pulse-ring) | index§8.3 | page-builder | C-03 | ✅ |

### 阶段 D: 验证

| # | 任务描述 | 状态 |
|---|---------|:---:|
| D-01 | generate_snapshots 截图 | ⬜ |
| D-02 | 对照 index.md 样式规格逐项核对 | ⬜ |
| D-03 | 修复问题 | ⬜ |

---

## 页面: 03-fishing (捞人)

- screenId: sc_9fe976f3d6f048e7b2e62
- rootNodeId: nd_38529ec02a714468a988b

### 阶段 A: 骨架结构（串行）

| # | 任务描述 | 设计来源 | 子技能 | 依赖 | 状态 | 验证标准 |
|---|---------|---------|--------|------|:---:|---------|
| A-01 | root 样式(h:100%, bg:gradient, flex-col) | index§3.1 | page-builder | - | ✅ | root 渐变bg+height+flexDirection |
| A-02 | NavBar 区块(sticky-header, 毛玻璃, title+shop+history) | index§4.1 | page-builder | A-01 | ✅ | 标题+2按钮+毛玻璃 |
| A-03 | 主内容区(flex:1, relative, 氛围层+FAB区+结果区+空状态) | index§4.2-4.3 | page-builder | A-01 | ✅ | flex:1+氛围装饰+FAB居中 |
| A-04 | 氛围层(abs, inset:0, 光晕+微光点) | index§4.2 | page-builder | A-03 | ✅ | 2光晕+5微光点 |
| A-05 | FAB区(abs居中, 80×80按钮+涟漪环+次数指示器) | index§4.3-4.4 | page-builder | A-03 | ✅ | 按钮+3涟漪+次数显示 |
| A-06 | 底部模式切换(sticky-footer, 3 Tab) | index§4.5 | page-builder | A-01 | ✅ | 3Tab+图标+文字+底色 |

### 阶段 B: 素材绘制（可并行 ‖）

| # | 任务描述 | 素材文档 | 子技能 | 目标节点 | 参考框 | 依赖 | 状态 |
|---|---------|---------|--------|---------|--------|------|:---:|
| B-01 | 绘制 I-08 fishing-net | materials/I-08-fishing-net.md | material-painter | nd_42741520a9a94cd89b617 | 32×32 | A-05 | ✅ |
| B-02 | 绘制 I-09 bomb | materials/I-09-bomb.md | material-painter | nd_c9096aea29a149348b87e | 24×24 | A-06 | ✅ |
| B-03 | 绘制 I-10 precision-target | materials/I-10-precision-target.md | material-painter | nd_062554b56597495ab03cc | 24×24 | A-06 | ✅ |

### 阶段 C: 数据与事件

| # | 任务描述 | 设计来源 | 子技能 | 依赖 | 状态 |
|---|---------|---------|--------|------|:---:|
| C-01 | 创建数据源 DS-fishing-stats + DS-fishing-cast + DS-fishing-greet | index§8.1 | page-builder | A全+B全 | ✅ |
| C-02 | 添加 state.view/data 变量 | index§8.2 | page-builder | C-01 | ✅ |
| C-03 | 绑定事件(screenEnter/click/mode-switch等) | index§8.3 | page-builder | C-02 | ✅ |
| C-04 | 设置 visibleWhen(result-area/empty-state/exhausted-sheet等) | index§8.4 | page-builder | C-03 | ⬜ |

### 阶段 D: 验证

| # | 任务描述 | 状态 |
|---|---------|:---:|
| D-01 | generate_snapshots 截图 | ⬜ |
| D-02 | 对照 index.md 样式规格逐项核对 | ⬜ |
| D-03 | 修复问题 | ⬜ |
