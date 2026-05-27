# 足迹地图（主页）— 页面设计

> 样式规格来源: visual.md | 交互规格来源: interaction-design/pages/01-home-map.md

---

## 1. 页面定位与情感

| 维度 | 定义 | 推导依据 |
|------|------|---------|
| 用户心理 | 探索好奇——"看看附近有什么有趣的" | App首页，每次打开的第一眼 |
| 情绪目标 | 好奇→发现→惊喜→行动 | 对应idle→bubble_preview→detail→发布 |
| 视觉优先级 | 气泡群 > FAB > 预览卡片 > NavBar | 内容发现>创建引导>详情>导航 |
| 上下游关系 | 登录后首屏 / 从其他Tab切换回来 | 需要立刻传达"这是有趣的地方" |
| 设计挑战 | 暗色地图底上的可发现性 + 多气泡不凌乱 | 视觉层级控制是核心 |

---

## 2. 整体视觉氛围

### 2.1 色调策略

- 主导色调: Layer0(#0D0D14)暗色占95%面积——地图是深邃的背景
- 亮色仅出现在: 气泡(Primary/Gold), FAB(渐变), 文字
- 与全局关系: 最强体现"午夜"主题——整个页面是暗夜，气泡是星光

### 2.2 光影与层次

- 光源方向: 无明确光源——气泡自发光(glow)
- 深度层级: 地图(最底)→氛围光晕(中)→气泡(前)→FAB(最前)→Sheet(覆盖)
- 前景-中景-背景: 气泡&FAB / 地图 / 角落装饰

### 2.3 装饰策略

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 |
|------|------|------|------|-----------|------|------|
| 角落光晕 | 渐变光晕 | 左下角溢出 | r≈120px | primary at 12% | 静止 | 空间深度+填充 |
| 微光点×3 | 光斑 | 地图空白散布 | 3-5px | primary at 8-10% | 3s明灭循环 | "活着"的呼吸 |

### 2.4 质感与肌理

- 毛玻璃: NavBar + TabBar + PreviewCard (blur:20px, saturate:1.2)
- 地图线条: 极低对比度(rgba白6%道路,3%建筑)

### 2.5 氛围总结

> 像走进午夜的校园广场——周围是安静的深色建筑剪影，地面上散落着大大小小的发光气泡，每个都是同学留下的故事碎片，等你走近去发现。

---

## 3. 结构层次设计

### 3.1 宏观布局

```
┌─────────────────────────────────┐ ← 375×812 (iPhone标准)
│  [NavBar] h:44+statusBar        │ sticky-header, 毛玻璃
│  ┌─────────────────────────────┐│
│  │                             ││
│  │        [MapView]            ││ flex:1, 全屏地图
│  │    (气泡漂浮在地图上)        ││
│  │                             ││
│  │         ⊕ ⊕                ││ ← 气泡(position:absolute)
│  │     ⊕       ⊕              ││
│  │                      [Locate]│ ← 右侧定位按钮
│  │                      [FAB]  ││ ← 右下角发布按钮
│  └─────────────────────────────┘│
│  [TabBar] h:49+safeArea         │ sticky-footer, 毛玻璃
└─────────────────────────────────┘

点击气泡后:
┌─────────────────────────────────┐
│  [NavBar]                       │
│  ┌─────────────────────────────┐│
│  │     (地图暗化到60%)         ││
│  │                             ││
│  ├─────────────────────────────┤│ ← 30%高度分界
│  │  [PreviewCard]              ││ Sheet从底部弹出
│  │   头像 用户名     2分钟前   ││
│  │   "今天在图书馆..."         ││
│  │   ❤️12 💬3     [查看详情→]  ││
│  └─────────────────────────────┘│
│  [TabBar]                       │
└─────────────────────────────────┘
```

### 3.2 空间分配

| 区块 | 高度/占比 | 定位方式 | layoutHint |
|------|---------|---------|------------|
| NavBar | 44px + statusBar | sticky top:0 | sticky-header |
| MapView | flex:1 (填满剩余) | 默认流 | scroll-child |
| FAB | 56px | position:fixed, bottom:90px, right:20px | — |
| LocateBtn | 36px | position:fixed, bottom:158px, right:20px | — |
| TabBar | 49px + safeArea | sticky bottom:0 | sticky-footer |
| PreviewCard | 30%-60% vh | position:fixed, bottom:TabBar上方 | — |

### 3.3 视觉流向

进入页面 → 中心气泡群(多个发光点最吸引) → FAB(右下角呼吸glow) → 如果好奇点击气泡 → 底部PreviewCard

### 3.4 层叠关系

| 层级 | 包含元素 | z-index策略 |
|------|---------|------------|
| 最底层 | 地图底图+角落光晕+微光点 | 默认流(0) |
| 内容层 | 气泡(由地图SDK管理层级) | 地图marker层 |
| 浮动层 | FAB + LocateBtn | fixed, z:100 |
| 覆盖层 | NavBar + TabBar + PreviewCard | fixed, z:200/300 |

---

## 4. 区块详细设计

### 4.1 NavBar

**尺寸与位置**: width:100%, height:44px+statusBar, position:sticky top:0

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容 |
|------|------|------|------|------|
| avatar-btn | img | 32×32 | border-radius:999px | 用户头像(点击→个人中心) |
| page-title | span | auto | body-md 500, text-primary | "足迹" |
| view-toggle-btn | div | 32×32 | — | I-02图标(点击切换视图) |

**容器样式**: backdrop-filter:blur(20px) saturate(1.2), background:rgba(13,13,20,0.75), border-bottom:1px solid rgba(255,255,255,0.06)

### 4.2 MapView（地图区域）

**尺寸与位置**: width:100%, flex:1, overflow:hidden

**内部元素**:

| 元素 | 标签 | 样式 | 内容 |
|------|------|------|------|
| map-container | div | width:100%,height:100%,bg:#0D0D14 | 地图SDK渲染区 |
| ambient-glow | div | position:absolute,inset:0,pointer-events:none | radial-gradient(角落光晕) |
| light-dots | div×3 | position:absolute,各自坐标 | 4px圆点+明灭动画 |

### 4.3 气泡（MapBubble实例）

见 `components/map-bubble.md` — 由地图SDK在坐标位置渲染

### 4.4 FAB发布按钮

**尺寸与位置**: 56×56px, position:fixed, bottom:90px, right:20px

**样式**:
| CSS属性 | 值 |
|---------|------|
| width/height | 56px |
| border-radius | 999px |
| background | linear-gradient(135deg, #4F8CFF, #7C5CFC) |
| box-shadow | 0 0 20px rgba(79,140,255,0.4), 0 4px 16px rgba(0,0,0,0.5) |
| animation | glow-pulse 3s ease-in-out infinite |

**内容**: I-03 publish-plus 图标(24×24, 白色)居中

### 4.5 定位回位按钮

**尺寸与位置**: 36×36px, position:fixed, FAB上方12px

**样式**:
| CSS属性 | 值 |
|---------|------|
| width/height | 36px |
| border-radius | 999px |
| background | #1C1C2E (Layer2) |
| box-shadow | 0 2px 8px rgba(0,0,0,0.4) |

**内容**: I-01 locate-pulse 图标(20×20)居中

### 4.6 PreviewCard（条件显示）

见 `components/preview-card.md` — 点击气泡后底部弹出

---

## 5. 组件清单

### 5.1 通用组件引用

| 组件名 | 位置 | props | 效果 |
|--------|------|-------|------|
| NavBar | 顶部 | {leftAvatar:true, title:"足迹", rightIcon:"view-toggle"} | 毛玻璃导航 |
| TabBar | 底部 | {activeTab:"footprint"} | 毛玻璃Tab栏 |

### 5.2 页面级组件索引

| 组件名 | 文件路径 | 职责 | 为什么不通用 |
|--------|---------|------|------------|
| MapBubble | `components/map-bubble.md` | 地图动态气泡标识 | 与地图SDK坐标深度耦合 |
| PreviewCard | `components/preview-card.md` | 底部预览面板 | 展示内容&交互特殊于地图页 |

---

## 6. 素材清单

| 素材ID | 名称 | 类型 | 文件路径 | 用途 |
|--------|------|------|---------|------|
| I-01 | locate-pulse | Icon | `materials/I-01-locate-pulse.md` | 定位回位按钮 |
| I-02 | view-toggle | Icon | `materials/I-02-view-toggle.md` | 地图⟷列表切换 |
| I-03 | publish-plus | Icon | `materials/I-03-publish-plus.md` | FAB发布按钮内图标 |
| I-04 | bubble-arrow | Icon | `materials/I-04-bubble-arrow.md` | 预览卡查看详情箭头 |
| I-05 | empty-footprint | Illustration | `materials/I-05-empty-footprint.md` | 空状态引导插画 |

---

## 7. 状态完整矩阵

### 7.1 页面状态视觉快照

| 状态 | 视觉描述 | 与idle差异 | 特殊素材 |
|------|---------|-----------|---------|
| loading | 地图区灰色骨架+脉冲动画，NavBar/TabBar正常 | 无气泡/无FAB呼吸 | — |
| idle | 暗色地图+气泡群浮动+FAB呼吸+角落光晕 | (基准) | — |
| bubble_preview | idle+被选气泡放大+底部PreviewCard弹出+地图微暗化 | +PreviewCard,地图opacity:0.7 | — |
| empty | 地图正常但无气泡,中心显示I-05插画+文字+CTA | 替代气泡区域 | I-05 |
| no_location | 全屏引导覆盖层(半透明底+居中文字+CTA按钮) | 全屏覆盖 | — |
| out_of_campus | idle+顶部warning横幅(金色底) | +顶部横幅 | — |
| offline | 显示缓存旧数据+顶部红色横幅"网络已断开" | +红色横幅 | — |

### 7.2 状态转换动效

| 从 → 到 | 变化元素 | 动画属性 | 时长 | 缓动 |
|---------|---------|---------|------|------|
| loading → idle | 骨架→气泡 | opacity(骨架fade-out)+气泡spring入场(stagger:50ms) | 300ms+400ms | ease-out+spring |
| idle → bubble_preview | 气泡scale+PreviewCard弹出+地图暗化 | transform+translateY+opacity | 200ms+300ms | ease-out |
| bubble_preview → idle | PreviewCard收回+气泡恢复+地图恢复 | translateY+transform+opacity | 250ms | ease-in |
| idle → empty | 无变化(进入时直接判断) | — | — | — |

---

## 8. 数据与交互设计

### 8.1 数据源定义

#### DS-nearby-moments

| 字段 | 值 |
|------|------|
| 类型 | api |
| 描述 | 获取附近10米内的位置动态 |
| 方法 | GET |
| 路径 | /api/v1/moments/nearby |
| autoFetchOnEnter | true |
| 触发方式 | screenEnter / pullRefresh / 位置变化(节流500ms) |

**请求参数**:
| 参数 | 类型 | 必填 | 来源 | 说明 |
|------|------|:-:|------|------|
| lat | number | ✅ | GPS | 纬度 |
| lng | number | ✅ | GPS | 经度 |
| radius | number | ❌ | 固定10 | 搜索半径(米) |
| page | number | ❌ | state.view.page | 分页 |

**默认参数**: `{ "radius": 10, "page": 1, "pageSize": 50 }`

**响应结构**:
```typescript
{
  code: number,
  data: {
    moments: Array<{
      id: string,
      userId: string,
      nickname: string,
      avatar: string,
      content: string,
      images: string[],
      lat: number,
      lng: number,
      likeCount: number,
      commentCount: number,
      isLiked: boolean,
      isRead: boolean,
      type: 'public' | 'targeted',
      createdAt: string
    }>,
    total: number
  }
}
```

**Mock 场景**:
| 场景名 | statusCode | delay | responseBody要点 |
|--------|-----------|-------|----------------|
| 正常有数据 | 200 | 500ms | moments:5条,type混合 |
| 空数据 | 200 | 300ms | moments:[],total:0 |
| 服务器错误 | 500 | 1000ms | {code:-1,message:"服务繁忙"} |

#### DS-like

| 字段 | 值 |
|------|------|
| 类型 | api |
| 方法 | POST |
| 路径 | /api/v1/moments/:id/like |
| autoFetchOnEnter | false |
| 触发方式 | 点击点赞按钮 |

### 8.2 状态管理

#### stateInit.data

| key | 类型 | 初始值 | 写入方式 | 说明 |
|-----|------|--------|---------|------|
| moments | Array | [] | effect.fetch('DS-nearby-moments') → state.set | 附近动态列表 |

#### stateInit.view

| key | 类型 | 初始值 | 变更触发 | UI影响 |
|-----|------|--------|---------|--------|
| selectedBubbleId | string\|null | null | 点击气泡 | 控制PreviewCard显示 |
| previewVisible | boolean | false | 点击气泡/关闭 | PreviewCard可见性 |
| previewExpanded | boolean | false | 上滑/下滑 | PreviewCard高度 |
| viewMode | 'map'\|'list' | 'map' | 点击视图切换 | 地图/列表视图 |
| isRefreshing | boolean | false | 下拉刷新 | 刷新指示器 |

### 8.3 交互事件流

| # | 用户操作 | 触发节点 | trigger | actions | UI响应 |
|---|---------|---------|---------|---------|--------|
| 1 | 进入页面 | root | screenEnter | [effect.fetch('DS-nearby-moments')] | 骨架→气泡入场 |
| 2 | 点击气泡 | bubble-item | click | [state.set({selectedBubbleId:item.id, previewVisible:true})] | 气泡放大+PreviewCard弹出 |
| 3 | 关闭预览 | map-overlay | click | [state.set({previewVisible:false, selectedBubbleId:null})] | PreviewCard收回 |
| 4 | 查看详情 | detail-btn | click | [nav.go('moment-detail',{id:state.view.selectedBubbleId})] | Push详情页 |
| 5 | 点赞 | like-btn | click | [effect.fetch('DS-like'),state.set乐观更新] | 心跳动画+数字+1 |
| 6 | 点击FAB | fab-btn | click | [nav.go('publish-moment')] | Push发布页 |
| 7 | 定位回位 | locate-btn | click | [地图SDK.centerToUser()] | 地图平滑移动 |
| 8 | 切换视图 | toggle-btn | click | [state.toggle('viewMode')] | 交叉淡入淡出200ms |
| 9 | 下拉刷新 | map-container | pullRefresh | [state.set({isRefreshing:true}),effect.fetch,state.set({isRefreshing:false})] | 指示器→更新 |

### 8.4 绑定关系

| 节点路径 | 绑定类型 | 表达式 |
|---------|---------|--------|
| bubble-list | repeat | `{{state.data.moments}}` |
| preview-card | visibleWhen | `{{state.view.previewVisible}}` |
| empty-state | visibleWhen | `{{state.data.moments.length === 0 && !state.view.isRefreshing}}` |
| map-view | visibleWhen | `{{state.view.viewMode === 'map'}}` |
| list-view | visibleWhen | `{{state.view.viewMode === 'list'}}` |

---

## 9. 节点结构树

```
root (flex-col, h:100%, bg:#0D0D14)
├── nav-bar (h:44+status, backdrop-filter:blur(20px)) [layoutHint:sticky-header]
│   ├── avatar-btn (32×32, radius-full) [event:click→nav.go('profile')]
│   ├── title (body-md 500, text-primary) "足迹"
│   └── toggle-btn (32×32) [event:click→state.toggle('viewMode')]
│       └── icon-div (20×20) [素材:I-02]
├── map-container (flex:1, position:relative, overflow:hidden) [layoutHint:scroll-child]
│   ├── map-sdk-view (w:100%, h:100%) — 地图SDK渲染
│   ├── ambient-glow (absolute, inset:0, pointer-events:none)
│   │   — radial-gradient(circle at 20% 80%, rgba(79,140,255,0.12), transparent 70%)
│   ├── light-dot-1 (absolute, 4×4, left:15%, top:30%) [animation:fade-blink 3s]
│   ├── light-dot-2 (absolute, 3×3, left:60%, top:20%) [animation:fade-blink 3s 1s]
│   ├── light-dot-3 (absolute, 5×5, left:80%, top:65%) [animation:fade-blink 3s 2s]
│   ├── bubble-layer [repeat:{{state.data.moments}}]
│   │   └── [MapBubble] (position:absolute, left/top由坐标转换)
│   └── empty-state (absolute, center) [visibleWhen:moments空]
│       ├── illustration-div (120×120) [素材:I-05]
│       ├── empty-text (body-md, text-secondary) "这里还没有人留下足迹"
│       └── cta-btn [组件:GlowButton, props:{label:"发布第一条",size:"md"}]
├── locate-btn (fixed, right:20px, bottom:158px, 36×36) [event:click→centerToUser]
│   └── icon-div (20×20) [素材:I-01]
├── fab-btn (fixed, right:20px, bottom:90px, 56×56) [event:click→nav.go('publish')]
│   └── icon-div (24×24) [素材:I-03]
├── preview-card [visibleWhen:previewVisible] [组件:PreviewCard]
└── tab-bar [layoutHint:sticky-footer] [组件:TabBar, props:{active:'footprint'}]
```

**节点总数估算**: ~25个（适合单次搭建任务）

**事件清单**:
| # | 节点路径 | trigger | actions |
|---|---------|---------|---------|
| 1 | root | screenEnter | [effect.fetch('DS-nearby-moments')] |
| 2 | avatar-btn | click | [nav.go('profile')] |
| 3 | toggle-btn | click | [state.toggle('viewMode')] |
| 4 | bubble-item | click | [state.set({selectedBubbleId,previewVisible:true})] |
| 5 | locate-btn | click | [地图centerToUser] |
| 6 | fab-btn | click | [nav.go('publish-moment')] |
| 7 | map-container | pullRefresh | [refresh sequence] |
