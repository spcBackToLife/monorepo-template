# 发布动态 — 页面设计

> 样式来源: visual.md | 交互来源: interaction-design/pages/02-publish-moment.md

---

## 1. 页面定位与情感

| 维度 | 定义 | 推导依据 |
|------|------|---------|
| 用户心理 | 主动创作欲——想把此刻留在某个位置 | 用户主动点击FAB进入 |
| 情绪目标 | 期待→专注→掌控→满足 | 定位→编辑→选可见性→发布成功 |
| 视觉优先级 | 文字输入 > 发布按钮 > 地图预览 > 可见性 | 创作内容最核心 |
| 上下游关系 | 从01-home-map的FAB进入 / 发布成功后返回地图 | 需要位置连续性(地图预览) |
| 设计挑战 | 表单页如何不无聊但又不干扰创作 | 地图预览区+成功粒子动效提供仪式感 |

---

## 2. 整体视觉氛围

### 2.1 色调策略

- 主导: Layer0暗色100%面积 — 深夜安静写日记的感觉
- 亮色: 仅发布按钮(渐变)+文字输入光标
- 极克制装饰 — 表单页不需要视觉冲击,需要专注

### 2.2 装饰策略

| 装饰 | 类型 | 位置 | 色彩 | 动效 | 作用 |
|------|------|------|------|------|------|
| 定位脉冲环 | 光效/扩散 | 地图区中心(仅locating态) | primary at 15%→0% | 1.5s循环 | 暗示"搜索位置中" |

装饰总数: 1个(功能性) — 表单页最低配

### 2.3 氛围总结

> 像在深夜安静的宿舍里，打开手机写一段只有走到这个地方才能看到的秘密。光标闪烁着等你倾诉，地图上的Pin标记着你此刻的坐标。

---

## 3. 结构层次设计

### 3.1 宏观布局

```
┌─────────────────────────────────┐ 375×812
│ ← 取消      发布动态      [发布] │ NavBar h:44+status
├─────────────────────────────────┤
│                                 │
│    [地图预览区]  h:30vh          │ 暗色地图+大头针
│    📍 图书馆附近                 │ 位置名标签
│                                 │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ 编辑区顶部radius-xl
│                                 │
│  说点什么，留在这里...           │ 文字输入(flex:1)
│                                 │
│  [img][img][img][ + ]           │ 图片网格
│                                 │
├─────────────────────────────────┤
│  👁️ 可见性: 公开       ▶       │ 可见性选择行
└─────────────────────────────────┘
```

### 3.2 空间分配

| 区块 | 高度 | 定位 | layoutHint |
|------|------|------|------------|
| NavBar | 44px+status | sticky top | sticky-header |
| 地图预览 | 30vh(约240px) | 默认流 | — |
| 编辑区 | flex:1(剩余空间) | 默认流,可滚动 | scroll-child |
| 可见性行 | 56px | 编辑区底部 | — |

---

## 4. 区块详细设计

### 4.1 NavBar

| 元素 | 样式 | 内容 |
|------|------|------|
| cancel-btn | body-md, text-secondary | "取消" |
| title | body-md 500, text-primary | "发布动态" |
| publish-btn | body-md 500, 渐变底(激活)/灰底(禁用), radius-sm | "发布" |

容器: 毛玻璃(标准参数)

### 4.2 地图预览区

| 元素 | 样式 | 说明 |
|------|------|------|
| map-view | height:30vh, overflow:hidden | 暗色地图SDK |
| pin-marker | position:absolute, center | I-06 大头针素材 |
| pulse-ring | absolute, center, 仅locating态 | CSS扩散环动画 |
| location-label | absolute, bottom:12px, center | body-sm, text-secondary, bg:Layer2+radius-full, padding:4px 12px |

### 4.3 编辑区

**容器**: background:Layer1, border-radius:24px 24px 0 0, padding:20px, flex:1

| 元素 | 标签 | 样式 | 说明 |
|------|------|------|------|
| textarea | textarea | body-lg, text-primary, min-height:120px, bg:transparent | 多行输入 |
| char-count | span | caption, text-tertiary(正常)/warning(>450)/error(500) | "42/500" |
| image-grid | div | display:grid, grid-template-columns:repeat(3,1fr), gap:8px | 图片容器 |
| image-thumb | img | aspect-ratio:1, radius-sm, object-fit:cover | 缩略图 |
| add-btn | div | aspect-ratio:1, border:1px dashed rgba(255,255,255,0.15), radius-sm, 居中加号 | 添加图片 |
| delete-badge | div | absolute, top:-4px, right:-4px, 18×18, bg:error, radius-full, 白色× | 删除角标 |

### 4.4 可见性行

| 元素 | 样式 | 说明 |
|------|------|------|
| icon-div | 20×20 | 当前选中模式图标(I-07/08/09) |
| label | body-md, text-primary | "公开" / "定向给TA" / "定时定向" |
| desc | body-sm, text-tertiary | "任何人走到这里..." |
| chevron | 16×16, text-tertiary | 右指箭头(暗示可点击) |

容器: padding:16px 20px, border-top:1px solid rgba(255,255,255,0.06)

---

## 5. 组件清单

### 5.1 通用组件引用

| 组件 | 位置 | props |
|------|------|-------|
| NavBar | 顶部 | {left:"cancel", title:"发布动态", right:"publish-btn"} |
| GlowButton | NavBar内(发布按钮) | {variant:disabled→primary, size:"sm", label:"发布"} |

### 5.2 页面级组件

| 组件 | 文件 | 职责 | 为什么不通用 |
|------|------|------|------------|
| VisibilitySheet | `components/visibility-sheet.md` | 选择动态可见性 | 仅发布页使用,含定向/定时子流程 |

---

## 6. 素材清单

| 素材ID | 名称 | 类型 | 文件路径 | 用途 |
|--------|------|------|---------|------|
| I-06 | location-pin | Icon | `materials/I-06-location-pin.md` | 地图大头针标识 |
| I-07 | vis-public | Icon | `materials/I-07-vis-public.md` | 公开模式图标 |
| I-08 | vis-targeted | Icon | `materials/I-08-vis-targeted.md` | 定向模式图标 |
| I-09 | vis-timed | Icon | `materials/I-09-vis-timed.md` | 定时模式图标 |

---

## 7. 状态完整矩阵

### 7.1 页面状态视觉快照

| 状态 | 视觉描述 | 与editing差异 | 特殊素材 |
|------|---------|-------------|---------|
| locating | 地图区脉冲动画+Pin半透明+输入区正常 | +脉冲环, Pin淡 | — |
| editing | 地图定格+Pin实色落地+编辑区可用+发布按钮禁用/激活 | (基准) | — |
| selecting_vis | editing+底部VisibilitySheet弹出+背景暗化 | +Sheet, bg遮罩 | — |
| submitting | 发布按钮spinner+表单禁用(opacity:0.7) | 按钮loading | — |
| success | 内容缩小+粒子飘向Pin+1秒后自动返回 | 全屏动效 | — |
| location_fail | 全屏提示覆盖层(图标+文案+重试) | 覆盖地图区 | — |

### 7.2 状态转换动效

| 从 → 到 | 变化 | 时长 | 缓动 |
|---------|------|------|------|
| locating → editing | 脉冲停止+Pin落下弹跳+脉冲fadeout | 500ms | spring |
| editing → selecting_vis | Sheet从底弹出+背景暗化 | 300ms | spring |
| editing → submitting | 按钮text→spinner | 200ms | ease-default |
| submitting → success | 按钮spinner→✓+内容缩小+粒子飘散 | 1000ms | ease-in |

---

## 8. 数据与交互设计

### 8.1 数据源定义

#### DS-publish-moment

| 字段 | 值 |
|------|------|
| 类型 | api |
| 方法 | POST |
| 路径 | /api/v1/moments |
| autoFetchOnEnter | false |
| 触发方式 | 点击发布按钮 |

**请求参数**:
| 参数 | 类型 | 必填 | 来源 |
|------|------|:-:|------|
| content | string | ❌ | state.view.content |
| images | string[] | ❌ | state.view.images(已上传的URLs) |
| lat | number | ✅ | state.view.pinLat |
| lng | number | ✅ | state.view.pinLng |
| visibility | enum | ✅ | state.view.visibilityMode |
| targetUserIds | string[] | 条件 | state.view.targetUsers |
| timeWindow | object | 条件 | state.view.timeWindow |

**Mock 场景**:
| 场景 | statusCode | delay | responseBody |
|------|-----------|-------|--------------|
| 发布成功 | 200 | 1500ms | {code:0, data:{momentId:"m001"}} |
| 内容审核失败 | 400 | 800ms | {code:4001, message:"内容包含敏感信息"} |
| 服务错误 | 500 | 1000ms | {code:-1, message:"服务繁忙"} |

### 8.2 状态管理

#### stateInit.view

| key | 类型 | 初始值 | 变更触发 | UI影响 |
|-----|------|--------|---------|--------|
| content | string | "" | 文字输入 | 字数+发布按钮激活 |
| images | string[] | [] | 选择/删除图片 | 网格更新 |
| pinLat/pinLng | number | GPS值 | 拖动Pin | 位置标签更新 |
| visibilityMode | enum | 'public' | Sheet选择 | 可见性行更新 |
| targetUsers | string[] | [] | 定向选人 | — |
| isPublishing | boolean | false | 点击发布 | 按钮loading |
| locationReady | boolean | false | GPS成功 | locating→editing |

### 8.3 交互事件流

| # | 操作 | 节点 | trigger | actions |
|---|------|------|---------|---------|
| 1 | 进入页面 | root | screenEnter | [GPS定位→state.set({locationReady:true, pinLat, pinLng})] |
| 2 | 输入文字 | textarea | change | [state.set({content:value})] |
| 3 | 添加图片 | add-btn | click | [系统相册→上传→state.append({images:url})] |
| 4 | 删除图片 | delete-badge | click | [state.remove({images:index})] |
| 5 | 点击可见性 | visibility-row | click | [state.set({sheetVisible:true})] |
| 6 | 点击发布 | publish-btn | click | {{content\|\|images.length>0}} → [state.set({isPublishing:true}), effect.fetch('DS-publish')] |
| 7 | 发布成功 | — | fetch.onSuccess | [成功动效→delay(1000)→nav.back()] |
| 8 | 取消 | cancel-btn | click | {{content\|\|images.length>0}} → [确认弹窗] / else → [nav.back()] |

---

## 9. 节点结构树

```
root (flex-col, h:100%, bg:#0D0D14)
├── nav-bar [layoutHint:sticky-header]
│   ├── cancel-btn (body-md, text-secondary) [event:click→cancel逻辑]
│   ├── title "发布动态"
│   └── publish-btn [组件:GlowButton sm] [event:click→发布]
├── map-preview (h:30vh, position:relative, overflow:hidden)
│   ├── map-sdk-view (w:100%, h:100%)
│   ├── pulse-ring (absolute, center) [visibleWhen:!locationReady] [animation:pulse]
│   ├── pin-marker (absolute, center) [素材:I-06]
│   └── location-label (absolute, bottom:12px) "📍 图书馆附近"
├── editor-section (flex:1, bg:Layer1, radius:24px 24px 0 0, padding:20px) [layoutHint:scroll-child]
│   ├── textarea (body-lg, min-h:120px) [bind:state.view.content]
│   ├── char-count (caption, absolute right) "{{content.length}}/500"
│   ├── image-grid (grid 3col, gap:8px) [visibleWhen:images.length>0 || true]
│   │   ├── image-thumb×N [repeat:{{state.view.images}}]
│   │   │   └── delete-badge [event:click→删除]
│   │   └── add-btn [visibleWhen:images.length<9] [event:click→添加]
│   └── visibility-row (padding:16px 20px, border-top) [event:click→打开Sheet]
│       ├── icon-div (20×20) [素材:I-07/08/09 根据mode]
│       ├── label+desc
│       └── chevron (16×16)
└── visibility-sheet [visibleWhen:sheetVisible] [组件:VisibilitySheet]
```

**节点总数估算**: ~22个

**事件清单**:
| # | 节点 | trigger | actions |
|---|------|---------|---------|
| 1 | root | screenEnter | [GPS定位] |
| 2 | cancel-btn | click | [条件确认→nav.back] |
| 3 | publish-btn | click | [condition→effect.fetch] |
| 4 | textarea | change | [state.set content] |
| 5 | add-btn | click | [系统相册→上传] |
| 6 | delete-badge | click | [state.remove image] |
| 7 | visibility-row | click | [state.set sheetVisible] |
