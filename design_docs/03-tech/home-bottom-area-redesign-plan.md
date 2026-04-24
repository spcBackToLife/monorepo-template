# Home 底部红框区域重构方案

> 项目: Music AI Hub (833478e8-17c5-4f1f-b2d2-9ae17012cbcc)
> 屏幕: Home - Music AI Hub (sc_3867ab8645d14c649abc2)
> 聚焦区域: Feature Grid + Popular Prompts（参考图红框标注区）
> 日期: 2026-04-24
> 状态: 方案阶段

---

## 一、现状分析

### 1.1 红框区域当前结构

```
nd_f59b... (主内容区, overflowY:auto)
 └─ nd_90f1... (Hero 圆圈) ← 红框外
 └─ nd_home_feat_grid (Feature Grid 容器) ⬅️ 红框内
 │   ├─ nd_home_fc_0 (Tile 1 — Beat new craft)
 │   │   ├─ nd_home_fc_0_ic (图标: emoji 🎛 + CSS渐变圆底)
 │   │   ├─ nd_home_fc_0_t (标题: {{data.featureTiles[0].title}})
 │   │   ├─ nd_home_fc_0_s (副标题: {{data.featureTiles[0].subtitle}})
 │   │   └─ nd_home_fc_0_ar (箭头 ›)
 │   ├─ nd_home_fc_1 (Tile 2 — Lyric composer) [同构]
 │   ├─ nd_home_fc_2 (Tile 3 — Stem splitter) [同构]
 │   └─ nd_home_fc_3 (Tile 4 — Mix assistant) [同构]
 └─ nd_home_popular_block (Popular Prompts 区块) ⬅️ 红框内
     ├─ nd_home_popular_head (标题行)
     │   ├─ nd_home_popular_h3 ("Popular Promt")
     │   └─ nd_home_popular_see ("See All")
     └─ nd_home_popular_scroll (横向滚动容器, overflowX:auto)
         ├─ nd_home_pop_card0 (卡片1 — 地球🌍)
         │   ├─ icon (emoji + 渐变圆底)
         │   ├─ title text
         │   └─ arrow
         └─ nd_home_pop_card1 (卡片2 — 耳机🎧) [同构]
```

### 1.2 数据源现状

已有数据源 `页面数据` (id: 2008c68fe67140ce91b71)，static 类型：

```json
{
  "hero": { "cta": "Tap to talk", "greeting": "Hi, Dimas 👋" },
  "user": { "avatarUrl": "...", "displayName": "Dimas Slebew" },
  "featureTiles": [
    { "title": "Beat new craft", "subtitle": "Shape drums & grooves" },
    { "title": "Lyric composer", "subtitle": "From line to chorus" },
    { "title": "Stem splitter", "subtitle": "Isolate vocals & beds" },
    { "title": "Mix assistant", "subtitle": "Glue the master bus" }
  ],
  "popularPrompts": [
    { "emoji": "🌍", "title": "The most musical idea explorations made this week!" },
    { "emoji": "🎧", "title": "Lo-fi Sunday mood pack" }
  ]
}
```

### 1.3 组件资产现状
- 无已保存的组件模板（asset list 调用失败或为空）
- Hero 圆圈有素材工程 (materialId: 3c31e7a7...)
- 波形图有素材工程 (materialId: d6dba93b...)

---

## 二、参考图分析（红框区域）

### 2.1 区域组成

红框包含 **两个独立区块**，上下排列：

#### 区块 A: Feature Grid（功能入口网格）

| 属性 | 值 |
|------|-----|
| 布局 | CSS Grid, 2列等宽 |
| 列数 | 2 |
| 行数 | 2+ (可滚动扩展) |
| 间距 | ~14px |
| 每个 Tile | 圆角卡片 (~20px radius), 深色背景 (#1a1a22), 细边框 |

**单个 Tile 结构**：
```
┌──────────────────────────────┐
│  ┌──────┐                    │
│  │ ICON │  Title             │
│  │(渐变)│  Subtitle     ›    │
│  └──────┘                    │
└──────────────────────────────┘
```
- **图标**: 48×48 圆形，**线性渐变底色** (135°, #f472b6 → #fb923c)，中心是 **白色矢量图标**
- **标题**: 白色，15px，semibold
- **副标题**: 灰色 45%透明，12px
- **箭头**: 右下角绝对定位，› 符号
- **交互**: 点击跳转目标屏幕

**4 个 Tile 的图标内容**（从参考图识别）：

| # | 功能 | 图标描述 | 现状(错误) | 目标(正确) |
|---|------|---------|-----------|-----------|
| 1 | Beat new craft | 音频波形/均衡器图标 | 🎛 emoji | 矢量波形图 |
| 2 | Lyric composer | 音乐音符图标 | 🎵 emoji | 矢量音符 |
| 3 | (被截断) | 剪刀/编辑图标 | ✂️ emoji | 矢量剪刀 |
| 4 | (被截断) | 混音滑块图标 | 🎚 emoji | 矢量滑块 |

#### 区块 B: Popular Prompts（热门提示区块）

| 属性 | 值 |
|------|-----|
| 布局 | Flex column（纵向列表） |
| 标题行 | 左 "Popular Promt" + 右 "See All" 链接 |
| 卡片方向 | 横向排列 (icon + text + arrow) |
| 滚动 | 整个主内容区 overflowY:auto 承担 |

**单张 Prompt 卡片结构**：
```
┌──────────────────────────────────────────────┐
│ ┌────┐  The most musical idea explorations  ›│
│ │ICON│  made this week!                      │
│ └────┘                                       │
└──────────────────────────────────────────────┘
```
- **图标**: 44×44 圆形，同样渐变底色，矢量图标居中
- **文字**: 白色 14px medium，可换行
- **箭头**: 右侧 ›

### 2.2 关键设计差异（现状 vs 参考）

| 维度 | 现状 | 参考 | 改动类型 |
|------|------|------|---------|
| Feature 图标 | emoji 字符 + CSS gradient | **矢量图标素材 + 渐变圆底** | **重做图标（委托 canvas）** |
| Popular 图标 | emoji 字符 | 同上 | **重做图标（委托 canvas）** |
| Popular 布局 | 横向滚动 (overflowX:auto) | **纵向列表**（随页面滚动） | **改布局方向** |
| 组件复用 | 4份硬编码重复代码 | **1模板+多实例** | 重构优化 |
| 数据驱动 | 已有数据绑定 ✅ | 保持 | 无改动 |

---

## 三、组件拆分方案

### 3.1 组件层次

```
HomeScreen
 ├── Header (已有，不动)
 ├── HeroCircle (已有，不动)
 ├── FeatureGridSection          ← 红框区块 A
 │   ├── SectionContainer        ← div, grid 2列布局
 │   └─ FeatureTile[] × N       ← 可复用组件模板
 │       ├── FeatureIcon         ← 素材组件 (canvas绘制PNG/SVG)
 │       ├── Title               ← p, 数据绑定
 │       ├── Subtitle            ← p, 数据绑定
 │       └── Arrow               ← div ›
 └── PopularPromptsSection      ← 红框区块 B
     ├── SectionHeader           ← div (标题 + See All)
     └─ PromptCard[] × N        ← 可复用组件模板
         ├── PromptIcon          ← 素材组件 (canvas绘制PNG/SVG)
         ├── TitleText           ← p, 数据绑定
         └── Arrow               ← div ›
```

### 3.2 各组件定义

#### C1: FeatureIcon（素材图标）⭐ 需 canvas 绘制

| 属性 | 规格 |
|------|------|
| 尺寸 | 48×48 px |
| 形状 | 正圆 (borderRadius: 50%) |
| 背景 | linear-gradient(135deg, #f472b6, #fb923c) |
| 图标 | 白色矢量图形，居中，~22px |
| 输出 | PNG (@2x = 96×96) 或 SVG |
| 应用方式 | background-image (background-size: contain) |

**需要绘制的图标清单（共 6 个）**：

| ID | 名称 | 图标描述 | 用途 | 对应节点 |
|----|------|---------|------|---------|
| FI-01 | audio-wave | 音频波形/频率均衡器 | Beat new craft | fc_0_ic |
| FI-02 | music-note | 八分音符/乐谱 | Lyric composer | fc_1_ic |
| FI-03 | scissors-edit | 分离/剪切符号 | Stem splitter | fc_2_ic |
| FI-04 | mix-sliders | 调音台推子 | Mix assistant | fc_3_ic |
| FI-05 | globe-earth | 地球/网络 | Popular #1 | pop_card0_ic |
| FI-06 | headphone | 头戴耳机 | Popular #2 | pop_card1_ic |

**绘制方式**：使用 `design-from-screenshot` 技能，通过 MCP `canvas` 工具在素材画布中绘制每个图标。

#### C2: FeatureTile（功能卡片）— 页面级组件模板

**建议模板化**: 是，4 个 Tile 结构完全相同

| 属性定义 (propDefinitions) | 类型 | 默认值 | 说明 |
|--------------------------|------|--------|------|
| iconSrc | string | "" | FeatureIcon 素材 URL |
| title | string | "" | 标题文字 |
| subtitle | string | "" | 副标题文字 |
| targetScreenId | string | "" | 点击跳转目标 |

**内部结构保持不变**：icon(48×48) + title(p) + subtitle(p) + arrow(div)

#### C3: PromptCard（提示卡片）— 页面级组件模板

**建议模板化**: 是，结构相同

| 属性定义 | 类型 | 默认值 | 说明 |
|---------|------|--------|------|
| iconSrc | string | "" | PromptIcon 素材 URL |
| title | string | "" | 提示文字 |

#### C4: FeatureGridContainer / PopularPromptsSection — 布局容器

不需要模板化，作为普通 div 容器管理子元素排列即可。

---

## 四、实施任务拆分

### 任务依赖关系图

```
Task 1: 绘制 6 个 FeatureIcon 素材 ──────┐
  (委托 design-from-screenshot)          │
                                         ▼
Task 2: 将 FeatureTile 保存为组件模板 ◄──┤ (可并行)
Task 3: 将 PromptCard 保存为组件模板 ◄──┤ (可并行)
                                         │
Task 4: 替换 Feature Grid 的图标 ────────┤ (依赖 Task 1)
      (删除旧 emoji，应用新素材)          │
                                         │
Task 5: 重构 Popular Prompts 布局 ───────┤ (依赖 Task 1)
      (横向滚动 → 纵向列表 + 应用新素材)  │
                                         │
Task 6: FeatureGrid 模板化实例替换 ──────┤ (依赖 Task 2+4)
      (删除硬编码 fc_1~3，实例化模板)      │
                                         │
Task 7: PopularPrompts 模板化实例替换 ────┤ (依赖 Task 3+5)
                                         │
Task 8: 截图验证 + 微调 ◄────────────────┘ (依赖全部)
```

---

### Task 1: 绘制 6 个 Feature/Prompt 图标素材

- **依赖**: 无
- **工具**: `canvas` (add_object / add_profiled_stroke) → `export_and_apply`
- **技能**: 委托 `design-from-screenshot` 执行
- **操作**:
  1. 为每个图标创建独立素材工程（或共用一个工程多次导出）
  2. 在 48×48 参考框中绘制：
     - 底层：圆形填充 `linear-gradient(135deg, #f472b6, #fb923c)`
     - 上层：白色矢量图标路径（path 或组合图形）
  3. export_and_apply 到对应节点（或先导出获取 URL 再绑定）
- **图标详情**:

| 素材名 | 尺寸 | 图标形状 | 颜色 | 导出目标 |
|--------|------|---------|------|---------|
| icon-audio-wave | 48×48 | 3-4 条垂直竖线(波形) | white #fff | nd_home_fc_0_ic |
| icon-music-note | 48×48 | 八分音符 | white #fff | nd_home_fc_1_ic |
| icon-scissors | 48×48 | 剪刀轮廓 | white #fff | nd_home_fc_2_ic |
| icon-sliders | 48×48 | 3-4 个水平滑块 | white #fff | nd_home_fc_3_ic |
| icon-globe | 44×44 | 地球经纬线网格 | white #fff | nd_home_pop_card0_ic |
| icon-headphone | 44×44 | 头戴耳机轮廓 | white #fff | nd_home_pop_card1_ic |

- **预估**: 6 个素材，每个需 3-5 次 canvas 调用
- **验收**: 每个图标节点显示矢量图形替代 emoji

### Task 2: 保存 FeatureTile 为组件模板

- **依赖**: 无（可与 Task 1 并行）
- **工具**: `asset / save_as_template`
- **操作**:
  ```
  asset / save_as_template {
    projectId,
    nodeId: "nd_home_fc_0",
    name: "FeatureTile",
    category: "Cards",
    propDefinitions: [
      { name: "iconSrc", type: "string", defaultValue: "" },
      { name: "title", type: "string", defaultValue: "" },
      { name: "subtitle", type: "string", defaultValue: "" },
      { name: "targetScreenId", type: "string", defaultValue: "" }
    ]
  }
  ```
- **预估**: 1 次 MCP 调用
- **验收**: `asset / list` 中出现 FeatureTile 模板

### Task 3: 保存 PromptCard 为组件模板

- **依赖**: 无（可与 Task 1 并行）
- **工具**: `asset / save_as_template`
- **操作**:
  ```
  asset / save_as_template {
    projectId,
    nodeId: "nd_home_pop_card0",
    name: "PromptCard",
    category: "Cards",
    propDefinitions: [
      { name: "iconSrc", type: "string", defaultValue: "" },
      { name: "title", type: "string", defaultValue: "" }
    ]
  }
  ```
- **预估**: 1 次 MCP 调用
- **验收**: `asset / list` 中出现 PromptCard 模板

### Task 4: 替换 Feature Grid 图标

- **依赖**: Task 1（素材就绪）
- **工具**: `style / update` 或 `component_prop / update_props`
- **操作**:
  1. 对 nd_home_fc_0_ic ~ nd_home_fc_3_ic:
     - 移除 `props.children` (emoji 文字)
     - 更新 `styles.backgroundImage` = 新素材 URL
     - 保持 `styles.background` (gradient) 或合并为 backgroundImage
  2. 确保 fontSize 和 children 不再显示 emoji
- **预估**: 4 次 style update（或 batch_update 一次搞定）
- **验收**: 4 个 Tile 显示新矢量图标

### Task 5: 重构 Popular Prompts 布局

- **依赖**: Task 1（素材就绪）
- **工具**: `element` + `style`
- **操作**:
  1. 修改 nd_home_popular_scroll:
     - 移除 `overflowX: auto`, `flexDirection: row`
     - 改为 `flexDirection: column`, gap: 12
  2. 对 nd_home_pop_card0_ic, nd_home_pop_card1_ic:
     - 同 Task 4 替换图标
  3. 调整卡片宽度为 `width: 100%`（不再限制 maxWidth/minWidth）
- **预估**: 2-3 次 style update
- **验收**: Popular Prompts 变成纵向列表，随页面滚动

### Task 6: FeatureGrid 模板化实例替换

- **依赖**: Task 2 + Task 4
- **工具**: `element / remove` + `asset / instantiate` + `component_prop / update_props`
- **操作**:
  1. 删除 nd_home_fc_1, nd_home_fc_2, nd_home_fc_3（保留 fc_0 作为原型）
  2. `asset / instantiate` 创建 3 个新实例到 nd_home_feat_grid 下
  3. 给每个 instance `component_prop / update_props` 设置不同属性
  4. （可选）将 fc_0 也改为实例
- **预估**: 1 + 3 + 3 ≈ 7 次 MCP 调用
- **验收**: 4 个 Tile 都是同一模板的不同实例，各显示不同内容

### Task 7: PopularPrompts 模板化实例替换

- **依赖**: Task 3 + Task 5
- **操作**: 同 Task 6 逻辑
- **预估**: ~5 次 MCP 调用

### Task 8: 截图验证 & 微调

- **依赖**: 全部前置任务
- **工具**: `generate_snapshots` + `style / update`
- **操作**:
  1. 生成截图对照参考图
  2. 逐项检查验证清单
  3. 差异处微调
- **预估**: 1-3 轮迭代
- **验收**: 截图效果与参考图一致

---

## 五、风险与注意事项

### 5.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Canvas 绘制矢量图标复杂度高 | 图标质量不达预期 | 先绘最简单的(audio wave)验证流程，再批量 |
| emoji 清理不干净 | 新图标上层仍透出 emoji | 同时移除 props.children + 设 fontSize:0 |
| Popular 布局改动影响其他屏幕 | 联动问题 | 只修改 Home 屏幕，不影响其他 |

### 5.2 操作安全

- **删除前确认**: remove element 不可逆，执行前二次检查 nodeId
- **保留原型**: 模板化时至少保留 1 个原始节点直到实例验证成功
- **增量操作**: 每步完成后截图验证再继续下一步

### 5.3 性能考量

- 6 个素材图标总大小应 < 50KB（每个 PNG < 8KB）
- 如图标复用场景多，考虑 SVG 格式（矢量无损缩放）

---

## 六、验收标准

### 功能验收
- [ ] 6 个 Feature/Prompt 图标均为矢量素材（非 emoji）
- [ ] Feature Grid 仍为 2列 grid 布局，4 个 Tile 内容正确
- [ ] Popular Prompts 为纵向列表，非横向滚动
- [ ] 所有数据绑定 {{data.*}} 正确渲染
- [ ] 点击 Tile 仍有 navigate 事件

### 视觉验收
- [ ] 图标渐变色与参考图接近（#f472b6 → #fb923c）
- [ ] 图标白色矢量图形清晰可见
- [ ] 卡片间距、圆角、边框与参考图一致
- [ ] 整体无多余光晕/阴影

### 工程验收
- [ ] FeatureTile 已保存为组件模板
- [ ] PromptCard 已保存为组件模板
- [ ] 无硬编码重复代码（Tile/Card 均为模板实例）
- [ ] 本方案文档已落地 design_docs
