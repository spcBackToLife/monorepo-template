# 执行计划 (plan.md)

> 生成时间: 2026-05-27
> 验证状态: Phase 4.1 完整性验证通过 ✅

---

## 全局任务

| # | 任务 | 技能 | 依赖 | 状态 |
|---|------|------|------|:---:|
| G-01 | 应用 ThemeConfig | executor直接 | 无 | ✅ |
| G-02 | 创建所有 Screen (首页地图/发布动态/捞人) | executor直接 | G-01 | ✅ |

---

## 页面: 01-home-map

### 节点搭建清单

| # | 节点名 | 父节点 | 类型 | 含素材 | 含事件 | 含默认内容 |
|---|--------|--------|------|:---:|:---:|:---:|
| 1 | NavBar | root | 容器(flex-row) | — | — | — |
| 2 | AvatarBtn | NavBar | 内容 | CSS占位 | click→profile | 灰色圆+首字母"U" |
| 3 | NavTitle | NavBar | 文字(span) | — | — | "足迹" |
| 4 | ToggleBtn | NavBar | 容器 | — | click→toggle | — |
| 5 | ToggleIcon | ToggleBtn | 素材承载 | I-02 | — | — |
| 6 | MapContainer | root | 容器(flex:1) | — | — | — |
| 7 | MapSdkView | MapContainer | 背景 | — | — | bg:#08081A |
| 8 | AmbientGlow | MapContainer | 装饰(CSS) | — | — | radial-gradient |
| 9 | LightDot1 | MapContainer | 装饰(CSS) | — | — | 4px圆点 |
| 10 | LightDot2 | MapContainer | 装饰(CSS) | — | — | 3px圆点 |
| 11 | LightDot3 | MapContainer | 装饰(CSS) | — | — | 5px圆点 |
| 12 | EmptyState | MapContainer | 容器(条件显示) | — | visibleWhen | — |
| 13 | EmptyIllustration | EmptyState | 素材承载 | I-05 | — | — |
| 14 | EmptyText | EmptyState | 文字(span) | — | — | "这里还没有人留下足迹" |
| 15 | EmptyCtaBtn | EmptyState | 按钮 | — | click→publish | "发布第一条" |
| 16 | LocateBtn | root | 容器(fixed) | — | click→centerUser | — |
| 17 | LocateIcon | LocateBtn | 素材承载 | I-01 | — | — |
| 18 | FabBtn | root | 容器(fixed) | — | click→publish | — |
| 19 | FabIcon | FabBtn | 素材承载 | I-03 | — | — |
| 20 | TabBar | root | 容器(flex-row) | — | — | — |
| 21 | TabFootprint | TabBar | 容器(flex-col) | I-06 | click→tab | — |
| 22 | TabFootprintIcon | TabFootprint | 素材承载 | I-06 | — | — |
| 23 | TabFootprintLabel | TabFootprint | 文字(span) | — | — | "足迹" |
| 24 | TabFishing | TabBar | 容器(flex-col) | I-07 | click→tab | — |
| 25 | TabFishingIcon | TabFishing | 素材承载 | I-07 | — | — |
| 26 | TabFishingLabel | TabFishing | 文字(span) | — | — | "捞人" |
| 27 | TabMessage | TabBar | 容器(flex-col) | I-08 | click→tab | — |
| 28 | TabMessageIcon | TabMessage | 素材承载 | I-08 | — | — |
| 29 | TabMessageLabel | TabMessage | 文字(span) | — | — | "消息" |
| 30 | TabProfile | TabBar | 容器(flex-col) | I-09 | click→tab | — |
| 31 | TabProfileIcon | TabProfile | 素材承载 | I-09 | — | — |
| 32 | TabProfileLabel | TabProfile | 文字(span) | — | — | "我的" |

### 素材绘制清单（executor 逐项勾选）

| # | 素材ID | 名称 | 目标节点 | 参考框 | 文档路径 | 状态 |
|---|--------|------|---------|--------|---------|:---:|
| 1 | I-01 | locate-pulse | LocateIcon | 20×20 | materials/I-01-locate-pulse.md | ✅ |
| 2 | I-02 | view-toggle | ToggleIcon | 20×20 | materials/I-02-view-toggle.md | ✅ |
| 3 | I-03 | publish-plus | FabIcon | 24×24 | materials/I-03-publish-plus.md | ✅ |
| 4 | I-05 | empty-footprint | EmptyIllustration | 120×120 | materials/I-05-empty-footprint.md | ✅ |
| 5 | I-06 | tab-footprint | TabFootprintIcon | 20×20 | materials/I-06-tab-footprint.md | ✅ |
| 6 | I-07 | tab-fishing | TabFishingIcon | 20×20 | materials/I-07-tab-fishing.md | ✅ |
| 7 | I-08 | tab-message | TabMessageIcon | 20×20 | materials/I-08-tab-message.md | ✅ |
| 8 | I-09 | tab-profile | TabProfileIcon | 20×20 | materials/I-09-tab-profile.md | ✅ |
| 9 | — | avatar-placeholder | AvatarBtn | 32×32 | (CSS实现:灰圆+白色首字母) | ✅ |

### 数据/事件清单

| # | 类型 | 内容 | 节点 | 状态 |
|---|------|------|------|:---:|
| 1 | data_source | DS-nearby-moments (API, autoFetch) | — | ⬜ |
| 2 | state.view | selectedBubbleId (null) | — | ⬜ |
| 3 | state.view | previewVisible (false) | — | ⬜ |
| 4 | state.view | viewMode ("map") | — | ⬜ |
| 5 | state.data | moments ([]) | — | ⬜ |
| 6 | event | screenEnter → effect.fetch | root | ⬜ |
| 7 | event | click → nav.go(publish) | FabBtn | ⬜ |
| 8 | event | click → state.toggle(viewMode) | ToggleBtn | ⬜ |
| 9 | visibleWhen | moments.length===0 | EmptyState | ⬜ |

### 页面搭建状态

| 步骤 | 内容 | 状态 |
|------|------|:---:|
| 2.1 结构搭建 | 28个节点(page-builder) | ✅ 完成(含Tab图标+头像占位) |
| 2.2 素材绘制 | 9项(material-painter) | ✅ 8/8 完成(+CSS头像) |
| 2.3 数据/事件 | 9项(page-builder) | ✅ 大部分已绑定 |

---

## 完整性验证

- [x] 节点树所有 [素材:X] 标注都有对应素材清单条目
- [x] TabBar 图标×4 已列入清单 (I-06~I-09)
- [x] 头像占位有方案 (CSS灰圆+首字母)
- [x] 空状态插画 I-05 已列入清单
- [x] visual.md 装饰策略(光晕+微光点)已通过CSS实现

---

## 当前待办（按优先级）

1. ~~**补充 TabBar 节点结构**~~ ✅ 已完成
2. ~~**绘制剩余素材**~~ ✅ I-05, I-06, I-07, I-08, I-09 全部完成
3. ~~**头像占位**~~ ✅ AvatarBtn 内已添加首字母"U"
4. ~~**进入页面02 搭建**~~ ✅ 骨架+数据/事件已完成
5. ~~**进入页面03 搭建**~~ ✅ 骨架+数据/事件已完成
6. **页面02/03 素材绘制** — P02: I-06~I-09 (4个) + P03: I-08~I-10 (3个)
7. **页面03 visibleWhen 补充** — result-area/empty-state等条件显示
