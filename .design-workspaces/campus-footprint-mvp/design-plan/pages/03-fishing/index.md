# 捞人主页 — 页面完整设计

---

## 1. 页面定位与情感

| 维度 | 定义 | 推导依据 |
|------|------|---------|
| 用户心理 | 无聊/好奇/想社交 — "看看能捞到谁" | 从首页Tab切换来，带着低压社交期待 |
| 情绪目标 | 好奇(水面氛围) → 兴奋(撒网) → 惊喜(结果) → 满足(打招呼) | 交互状态机: idle→casting→result→greeting |
| 视觉优先级 | 撒网FAB > 水面氛围 > 次数指示 > 模式切换 > 导航 | FAB是唯一核心操作 |
| 上下游关系 | 从首页TabBar切换进入；可跳转到商店页/聊天页 | Tab切换无转场动效,内容即时切换 |
| 设计挑战 | 如何在暗色静态页面中制造"水面活着"的氛围感,同时不干扰核心操作(撒网按钮) | 装饰与功能的平衡 |

---

## 2. 整体视觉氛围

### 2.1 色调策略

- 本页主导色: secondary紫(#7C5CFC) — 区别于首页的primary蓝,暗示社交/神秘/午夜
- 底色比全局更深(#08081A) — 营造"深海"沉浸感
- primary蓝作为次要色用于次数指示和精准模式

### 2.2 光影与层次

- 光源暗示: 从中心FAB向四周扩散（按钮是光源中心）
- 深度: 水面波纹(中层) → FAB按钮(前层,悬浮) → 底部Tab(沉底)
- 角落光晕营造"海底荧光"的空间感

### 2.3 装饰策略

| 装饰 | 类型 | 位置 | 尺寸 | 色彩/透明度 | 动效 | 作用 |
|------|------|------|------|-----------|------|------|
| 水面波纹 | 有机/波浪 | 中上部 | 全宽×120px | secondary at 6-10% | 水平移动2.5s | 建立水面隐喻 |
| 右上光晕 | 光效 | 右上角溢出 | 200×200 | secondary at 12% | 静止 | 深度+框架 |
| 左下光晕 | 光效 | 左下角溢出 | 160×160 | primary at 8% | 静止 | 对角平衡 |
| 微光点×5 | 有机/光斑 | 散布水面 | 3-6px | secondary at 8-12% | 呼吸3s | 荧光生物 |
| 涟漪环×3 | 有机/圆环 | FAB为中心 | 100-220px | secondary递减 | 扩散2s | 引导点击 |
| 弧线分隔 | 裁剪 | 模式区顶部 | 全宽 | primary at 5% | 静止 | 自然分区 |

### 2.4 质感与肌理

- 毛玻璃: NavBar(`blur:20px, saturate:1.2, bg:rgba(8,8,26,0.75)`)、结果卡片、打招呼Sheet
- 噪点纹理: 全局底层 `opacity:0.02` — 水中微粒感
- 底部模式区: Layer1底色 + 1px border rgba(255,255,255,0.06)

### 2.5 氛围总结

> 深夜在发光的海面旁，手持一张网，等待未知的相遇。

---

## 3. 结构层次设计

### 3.1 宏观布局

```
375px × 812px (iPhone标准)
┌─────────────────────────────────┐ ← 0px
│ NavBar (h:44+safe)              │ sticky-header, 毛玻璃
├─────────────────────────────────┤ ← ~88px
│                                 │
│    ~~~ 水面波纹区域 ~~~         │ 40vh, 氛围层
│                                 │
│         [涟漪环 3圈]            │
│         ┌──────────┐            │
│         │  撒网FAB  │           │ 80×80, 居中
│         │  (80px)  │            │
│         └──────────┘            │
│         ●●●○○ (次数)           │ 8px dots
│                                 │
├─────────────────────────────────┤ ← 弧线分隔
│ [基础🎣] [炸弹💣] [精准🎯]     │ 底部模式切换, h:80px
└─────────────────────────────────┘
```

### 3.2 空间分配

| 区块 | 高度/占比 | 定位方式 | layoutHint |
|------|---------|---------|------------|
| NavBar | 44px + safeArea | sticky | sticky-header |
| 主内容区(水面+FAB+次数) | flex:1 | flow | fill-parent |
| 底部模式切换 | 80px + safeArea | sticky bottom | sticky-footer |

### 3.3 视觉流向

进入页面 → 中央深色水面包裹(沉浸) → FAB发光脉冲吸引到中心 → 按钮下方次数指示器确认可操作 → 底部模式切换提供选择

### 3.4 层叠关系

| 层级 | 包含元素 | z-index策略 |
|------|---------|------------|
| 最底层 | 深海渐变底+噪点+角落光晕 | z-0 |
| 氛围层 | 水面波纹+微光点 | z-5 |
| 内容层 | FAB+涟漪+次数+模式切换 | z-10 |
| 浮动层 | 结果卡片(出现时) | z-20 |
| 遮罩层 | GreetingSheet/引导浮层 | z-30 |

---

## 4. 区块详细设计

### 4.1 NavBar

**尺寸与位置**: 全宽×44px, position:sticky, top:0

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容 |
|------|------|------|------|------|
| 标题 | span | auto | heading-md, text-primary, font-weight:600 | "捞人" |
| 商店按钮 | button | 20×20 | — | [素材I-商店, 通用] |
| 历史按钮 | button | 20×20 | — | [素材I-历史, 通用] |

**微交互**: 按钮press→scale(0.9)+100ms

### 4.2 水面氛围区

**尺寸与位置**: 全宽, flex:1, position:relative, overflow:hidden

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容 |
|------|------|------|------|------|
| 波纹线×3 | svg path | 全宽×40px each | stroke:rgba(124,92,252,0.08), strokeWidth:1.5, fill:none | 正弦波path |
| 右上光晕 | div | 200×200 | radial-gradient(secondary 12%→transparent), position:abs, top:-60,right:-60, blur:40px | — |
| 左下光晕 | div | 160×160 | radial-gradient(primary 8%→transparent), position:abs, bottom:-40,left:-40, blur:40px | — |
| 微光点×5 | div | 3-6px | bg:rgba(124,92,252,0.1), border-radius:50%, animation:twinkle | — |

### 4.3 撒网FAB按钮

**尺寸与位置**: 80×80px, 水平居中, 垂直居中偏下(60%)

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容 |
|------|------|------|------|------|
| 按钮容器 | button | 80×80 | bg:linear-gradient(135deg,#7C5CFC,#4F8CFF), radius-full, shadow:glow-secondary 40px | — |
| 网图标 | div(icon) | 32×32 | [素材I-08 fishing-net] | — |
| 按钮文字 | span | auto | caption, text-primary, mt:4px | "撒网" |

**涟漪环(3个)**: 围绕FAB, border:1.5px solid rgba(124,92,252,0.1→0.05→0.02), 尺寸100→160→220px, animation:ripple-expand 2s infinite stagger:0.6s

**微交互**: press→scale(0.9)+heavyHaptic, 撒网中→文字变"收网中..."

### 4.4 次数指示器

**尺寸与位置**: auto, FAB下方16px, 水平居中

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容 |
|------|------|------|------|------|
| 点容器 | div | auto | display:flex, gap:6px, align:center | — |
| 可用点 | div | 8×8 | bg:#4F8CFF, radius-full | repeat by remainingCount |
| 已用点 | div | 8×8 | bg:#252540, radius-full | repeat by usedCount |
| 文字 | span | auto | caption, text-tertiary | "今日剩余 {{remaining}}/{{total}}" |

### 4.5 底部模式切换

**尺寸与位置**: 全宽×80px + safeArea, position:sticky, bottom:0

**内部元素**:

| 元素 | 标签 | 尺寸 | 样式 | 内容 |
|------|------|------|------|------|
| 容器 | div | 全宽 | bg:Layer1, border-top:弧线, padding:12px 20px, display:flex, gap:12px, justify:center | — |
| 基础Tab | button | auto | padding:12px 20px, radius-full, bg:选中→secondary at 15% | [图标+文字"基础"] |
| 炸弹Tab | button | auto | 同上, 无库存→text-tertiary | [素材I-09+文字"炸弹"] |
| 精准Tab | button | auto | 同上 | [素材I-10+文字"精准"] |

**微交互**: Tab切换→背景色300ms ease-default过渡

---

## 5. 组件设计

### 5.1 通用组件引用

| 组件名 | 在本页位置 | props | 期望效果 |
|--------|---------|-------|---------|
| NavBar | 顶部 | {title:"捞人", rightIcons:[shop,history]} | 毛玻璃导航 |
| GlowButton | 卡片内"打招呼" | {variant:"primary", size:"sm"} | 小发光按钮 |

### 5.2 页面级组件索引

| 组件名 | 文件路径 | 职责 | 为什么不抽为通用 |
|--------|---------|------|----------------|
| FishingCard | `components/fishing-card.md` | 展示捞到的用户卡片+操作(打招呼/感兴趣/跳过) | 仅本页使用,含独特的浮出动效和滑动操作 |
| GreetingSheet | `components/greeting-sheet.md` | 打招呼底部面板(模板选择+自定义输入+发送) | 仅本页使用,深度耦合撒网流程 |

---

## 6. 素材清单

### 素材索引表

| 素材ID | 名称 | 类型 | 文件路径 | 用途 |
|--------|------|------|---------|------|
| I-08 | fishing-net | Icon | `materials/I-08-fishing-net.md` | FAB按钮内撒网图标 |
| I-09 | bomb | Icon | `materials/I-09-bomb.md` | 模式切换炸弹Tab图标 |
| I-10 | precision-target | Icon | `materials/I-10-precision-target.md` | 模式切换精准Tab图标 |

---

## 7. 状态完整矩阵

### 7.1 页面状态视觉快照

| 状态 | 视觉描述 | 与idle的差异 | 所需特殊素材 |
|------|---------|-------------|------------|
| idle | 水面波纹+FAB脉冲发光+次数显示+底部模式Tab | 基准 | — |
| onboarding | idle基础上叠加半透明遮罩(rgba(0,0,0,0.6))+3步引导高亮 | +遮罩层+指引浮层 | — |
| casting | FAB文字→"收网中..."+波纹加剧+冒泡动效+次数-1(即时) | FAB禁用+氛围动效增强 | — |
| result | 1-3张FishingCard从底部浮入+FAB隐藏+波纹减弱 | +卡片层,FAB隐藏 | — |
| empty_result | 空网收回动效+"附近暂时没人"文案居中+安慰插画(简化) | FAB恢复,中央显示空态 | — |
| exhausted | FAB灰色+文字"已用完"+底部提示Sheet弹出 | FAB禁用变灰 | — |
| greeting | GreetingSheet从底部弹出(覆盖在卡片之上) | +Sheet覆盖层 | — |
| no_location | 中央提示"需要位置权限"+跳转设置按钮 | FAB替换为提示 | — |
| out_of_campus | 中央提示"不在校园范围"+地图指引 | 同上 | — |

### 7.2 状态转换动效

| 从 → 到 | 变化元素 | 动画属性 | 时长 | 缓动 | 延迟 |
|---------|---------|---------|------|------|------|
| idle→casting | FAB text, 波纹速度, 冒泡出现 | text:crossfade, wave:speed×2 | 300ms | ease-default | — |
| casting→result | FAB:fadeOut, Cards:floatIn | opacity+translateY+scale | 400ms | spring | cards:stagger 200ms |
| casting→empty_result | 网图:收回+缩小 | translateY(-100)+scale(0.5)+opacity(0) | 500ms | ease-in | — |
| result→idle | Cards:fadeOut, FAB:fadeIn | opacity+scale | 300ms | ease-out | — |
| idle→exhausted | FAB:渐变→灰色 | background(300ms), Sheet弹出 | 300ms | ease-default | Sheet:200ms delay |
| idle→greeting | Sheet translateY(100%→0) | transform | 300ms | spring | — |
| greeting→result | Sheet translateY(0→100%) | transform | 200ms | ease-in | — |

---

## 8. 数据与交互设计

### 8.1 数据源定义

#### DS-fishing-stats (用户今日捞人统计)

| 字段 | 值 |
|------|------|
| 类型 | api |
| 方法 | GET |
| 路径 | /api/fishing/stats |
| autoFetchOnEnter | true |

**响应结构**:
```typescript
{
  code: number,
  data: {
    freeRemaining: number,   // 剩余免费次数
    freeTotal: number,       // 每日免费总量
    bombCount: number,       // 炸弹库存
    precisionCount: number,  // 精准网库存
    todayGreetCount: number, // 今日已打招呼数
    greetLimit: number       // 打招呼上限
  }
}
```

**Mock 场景**:
| 场景 | statusCode | delay | responseBody要点 |
|------|-----------|-------|----------------|
| 有次数 | 200 | 300ms | freeRemaining:3, bombCount:1, precisionCount:0 |
| 次数用完 | 200 | 300ms | freeRemaining:0, bombCount:0, precisionCount:0 |
| 错误 | 500 | 1000ms | {code:-1, message:"服务异常"} |

#### DS-fishing-cast (撒网请求)

| 字段 | 值 |
|------|------|
| 类型 | api |
| 方法 | POST |
| 路径 | /api/fishing/cast |
| autoFetchOnEnter | false |

**请求参数**:
| 参数 | 类型 | 必填 | 来源 | 说明 |
|------|------|:----:|------|------|
| type | enum | ✅ | state.view.currentMode | BASIC/BOMB/PRECISION |
| lat | number | ✅ | GPS | 纬度 |
| lng | number | ✅ | GPS | 经度 |

**响应结构**:
```typescript
{
  code: number,
  data: {
    sessionId: string,
    matchedUsers: Array<{
      id: string,
      nickname: string,
      avatar: string,
      signature: string,
      department: string,
      grade: string,
      tags: string[],
      distance: number  // 模糊距离(米)
    }>,
    remaining: number  // 更新后剩余次数
  }
}
```

**Mock 场景**:
| 场景 | statusCode | delay | responseBody要点 |
|------|-----------|-------|----------------|
| 捞到3人 | 200 | 2000ms | matchedUsers:3条, remaining:2 |
| 捞到0人 | 200 | 2000ms | matchedUsers:[], remaining:2 |
| 次数不足 | 403 | 300ms | {code:40301, message:"次数不足"} |

#### DS-fishing-greet (打招呼)

| 字段 | 值 |
|------|------|
| 类型 | api |
| 方法 | POST |
| 路径 | /api/fishing/greet |
| autoFetchOnEnter | false |

**请求参数**:
| 参数 | 类型 | 必填 | 来源 | 说明 |
|------|------|:----:|------|------|
| toUserId | string | ✅ | 当前卡片user.id | 目标用户 |
| sessionId | string | ✅ | state.data.castResult.sessionId | 会话ID |
| messageType | enum | ✅ | Sheet选择 | TEMPLATE/CUSTOM |
| content | string | ✅ | Sheet内容 | 消息文本 |

**响应结构**:
```typescript
{
  code: number,
  data: { greetingId: string, status: "SENT" }
}
```

**Mock 场景**:
| 场景 | statusCode | delay | responseBody要点 |
|------|-----------|-------|----------------|
| 成功 | 200 | 500ms | status:"SENT" |
| 达到上限 | 403 | 300ms | {code:40302, message:"今日打招呼上限"} |
| 失败 | 500 | 1000ms | {code:-1, message:"发送失败"} |

### 8.2 状态管理

#### stateInit.data

| key | 类型 | 初始值 | 写入方式 | 说明 |
|-----|------|--------|---------|------|
| stats | Object/null | null | effect.fetch(DS-fishing-stats) onSuccess → state.set | 今日统计 |
| castResult | Object/null | null | effect.fetch(DS-fishing-cast) onSuccess → state.set | 撒网结果 |
| currentCards | Array | [] | 从castResult.matchedUsers映射 | 当前展示的卡片列表 |

#### stateInit.view

| key | 类型 | 初始值 | 变更触发 | UI影响 |
|-----|------|--------|---------|--------|
| pageState | enum | "idle" | 状态机转换 | 控制所有UI分支(idle/casting/result/...) |
| currentMode | enum | "BASIC" | 底部Tab点击 | 切换FAB样式+背景氛围 |
| currentCardIndex | number | 0 | 卡片滑动操作 | 当前展示第几张卡片 |
| isGreetingOpen | boolean | false | 点击打招呼/关闭Sheet | 控制GreetingSheet显隐 |
| greetTarget | Object/null | null | 点击某卡片打招呼 | Sheet内显示目标用户信息 |
| isOnboarding | boolean | false | 首次进入检测 | 引导浮层显隐 |

### 8.3 交互事件流

| # | 用户操作 | 触发节点 | trigger | condition | actions 序列 | UI 响应 |
|---|---------|---------|---------|-----------|-------------|--------|
| 1 | 进入页面 | root | screenEnter | — | [effect.fetch('DS-fishing-stats')] | 加载统计 |
| 2 | 点击撒网 | cast-btn | click | {{state.data.stats.freeRemaining > 0}} | [state.set({pageState:'casting'}), effect.fetch('DS-fishing-cast',{type:currentMode,lat,lng})] | FAB→收网中+动效 |
| 3 | 撒网成功(有人) | — | fetch.success | matchedUsers.length>0 | [state.set({pageState:'result', castResult:data, currentCards:data.matchedUsers})] | 卡片浮出 |
| 4 | 撒网成功(无人) | — | fetch.success | matchedUsers.length===0 | [state.set({pageState:'empty_result'})] | 空网收回 |
| 5 | 左滑跳过 | fishing-card | swipeLeft | — | [state.set({currentCardIndex:+1})] | 卡片滑出+下张浮入 |
| 6 | 右滑感兴趣 | fishing-card | swipeRight | — | [state.set({currentCardIndex:+1}), effect.fetch('DS-interest')] | 卡片飞+❤️ |
| 7 | 点击打招呼 | greet-btn | click | — | [state.set({isGreetingOpen:true, greetTarget:currentUser})] | Sheet弹出 |
| 8 | 发送打招呼 | send-btn | click | content非空 | [effect.fetch('DS-fishing-greet',{...})] | 信封飞出+Toast |
| 9 | 切换模式 | mode-tab | click | — | [state.set({currentMode:tabValue})] | Tab高亮+氛围变 |
| 10 | 次数=0时点撒网 | cast-btn | click | {{state.data.stats.freeRemaining===0}} | [state.set({pageState:'exhausted'})] | FAB灰+提示Sheet |
| 11 | 所有卡片操作完 | — | auto | currentCardIndex>=cards.length | [state.set({pageState:'idle'}), effect.fetch('DS-fishing-stats')] | 回到idle+刷新统计 |

### 8.4 绑定关系

| 节点路径 | 绑定类型 | 表达式 | 说明 |
|---------|---------|--------|------|
| cast-btn | visibleWhen | `{{state.view.pageState === 'idle' \|\| state.view.pageState === 'exhausted'}}` | 仅idle/exhausted时显示FAB |
| fishing-card-container | visibleWhen | `{{state.view.pageState === 'result'}}` | 结果态显示卡片 |
| greeting-sheet | visibleWhen | `{{state.view.isGreetingOpen}}` | 打招呼Sheet |
| count-dots | repeat | `{{state.data.stats}}` | 次数点渲染 |
| empty-state | visibleWhen | `{{state.view.pageState === 'empty_result'}}` | 空结果态 |
| exhausted-sheet | visibleWhen | `{{state.view.pageState === 'exhausted'}}` | 次数用完提示 |
| onboarding-overlay | visibleWhen | `{{state.view.isOnboarding}}` | 引导浮层 |
| mode-tab-basic | class:active | `{{state.view.currentMode === 'BASIC'}}` | 基础Tab选中 |
| mode-tab-bomb | class:active | `{{state.view.currentMode === 'BOMB'}}` | 炸弹Tab选中 |
| mode-tab-precision | class:active | `{{state.view.currentMode === 'PRECISION'}}` | 精准Tab选中 |

---

## 9. 节点结构树

```
root (flex-col, h:100%, bg:linear-gradient(180deg,#08081A,#0D0D14))
├── nav-bar [layoutHint: sticky-header] [组件: NavBar, props:{title:"捞人", right:[shop,history]}]
│   backdrop-filter:blur(20px), bg:rgba(8,8,26,0.75)
│
├── main-content (flex:1, position:relative, overflow:hidden) [layoutHint: fill-parent]
│   ├── atmosphere-layer (position:abs, inset:0, pointer-events:none, z:0)
│   │   ├── wave-1 (svg, animation:wave-move-1)
│   │   ├── wave-2 (svg, animation:wave-move-2, delay:0.3s)
│   │   ├── wave-3 (svg, animation:wave-move-3, delay:0.6s)
│   │   ├── glow-tr (200×200, abs, top:-60,right:-60, radial-gradient, blur:40px)
│   │   ├── glow-bl (160×160, abs, bottom:-40,left:-40, radial-gradient, blur:40px)
│   │   ├── sparkle-1 (4px, abs, top:30%,left:20%, animation:twinkle 3s)
│   │   ├── sparkle-2 (3px, abs, top:45%,right:25%, animation:twinkle 3s delay:0.5s)
│   │   ├── sparkle-3 (6px, abs, top:25%,right:40%, animation:twinkle 3s delay:1s)
│   │   ├── sparkle-4 (4px, abs, top:55%,left:35%, animation:twinkle 3s delay:1.5s)
│   │   └── sparkle-5 (3px, abs, top:60%,right:15%, animation:twinkle 3s delay:2s)
│   │
│   ├── fab-area (position:abs, left:50%, top:60%, transform:translate(-50%,-50%), z:10)
│   │   ├── ripple-ring-1 (100×100, abs, centered, border:1.5px secondary at 10%, radius-full, animation:ripple 2s)
│   │   ├── ripple-ring-2 (160×160, abs, centered, border:1.5px secondary at 5%, animation:ripple 2s delay:0.6s)
│   │   ├── ripple-ring-3 (220×220, abs, centered, border:1.5px secondary at 2%, animation:ripple 2s delay:1.2s)
│   │   ├── cast-btn (80×80, radius-full, bg:gradient, shadow:glow-secondary, animation:pulse 3s)
│   │   │   ├── icon-net (32×32) [素材: I-08]
│   │   │   └── btn-label (caption, text-primary) "撒网"
│   │   │   [event: click → 撒网逻辑(#2)]
│   │   └── count-indicator (mt:16, flex, gap:6, align:center)
│   │       ├── dots-container (flex, gap:6)
│   │       │   ├── dot-available (8×8, bg:primary, radius-full) [repeat: remainingCount]
│   │       │   └── dot-used (8×8, bg:Layer3, radius-full) [repeat: usedCount]
│   │       └── count-text (caption, text-tertiary) "今日剩余 {{remaining}}/{{total}}"
│   │
│   ├── result-area (position:abs, inset:0, flex, justify:center, align:center, z:20)
│   │   [visibleWhen: pageState==='result']
│   │   └── fishing-card [组件: FishingCard, props:{user:currentCards[currentCardIndex]}]
│   │       [event: swipeLeft→跳过(#5), swipeRight→感兴趣(#6)]
│   │
│   └── empty-state (position:abs, inset:0, flex-col, justify:center, align:center, z:20)
│       [visibleWhen: pageState==='empty_result']
│       ├── empty-text (heading-md, text-secondary) "附近暂时没有人"
│       └── empty-hint (body-sm, text-tertiary, mt:8) "换个时间再来，晚上8-10点最热闹 🌙"
│
├── mode-tabs (sticky-footer, bg:Layer1, border-radius:24px 24px 0 0, padding:12px 20px, flex, gap:12, justify:center)
│   [layoutHint: sticky-footer]
│   ├── tab-basic (padding:12px 20px, radius-full, flex, gap:8, align:center)
│   │   ├── tab-icon (20×20) 🎣(临时,后续替换)
│   │   └── tab-label (body-sm) "基础"
│   │   [event: click → state.set({currentMode:'BASIC'})]
│   ├── tab-bomb (同上)
│   │   ├── bomb-icon (24×24) [素材: I-09]
│   │   └── tab-label "炸弹"
│   │   [event: click → state.set({currentMode:'BOMB'})]
│   └── tab-precision (同上)
│       ├── target-icon (24×24) [素材: I-10]
│       └── tab-label "精准"
│       [event: click → state.set({currentMode:'PRECISION'})]
│
├── greeting-sheet [组件: GreetingSheet, props:{target:greetTarget}]
│   [visibleWhen: isGreetingOpen]
│
└── exhausted-sheet (Sheet, bg:Layer3, radius-xl top)
    [visibleWhen: pageState==='exhausted']
    ├── title (heading-md) "今日免费次数已用完"
    ├── buy-btn [组件: GlowButton, {variant:"gold",label:"购买额外撒网 ¥1"}]
    ├── item-btn [组件: GlowButton, {variant:"secondary",label:"使用道具"}]
    └── hint (body-sm, text-tertiary) "明天00:00刷新免费次数"
```

**事件清单**:
| # | 节点路径 | trigger | condition | actions |
|---|---------|---------|-----------|---------|
| 1 | root | screenEnter | — | [effect.fetch('DS-fishing-stats')] |
| 2 | cast-btn | click | remaining>0 | [state.set({pageState:'casting'}), effect.fetch('DS-fishing-cast')] |
| 3 | cast-btn | click | remaining===0 | [state.set({pageState:'exhausted'})] |
| 4 | tab-basic | click | — | [state.set({currentMode:'BASIC'})] |
| 5 | tab-bomb | click | — | [state.set({currentMode:'BOMB'})] |
| 6 | tab-precision | click | — | [state.set({currentMode:'PRECISION'})] |
| 7 | fishing-card | swipeLeft | — | [state.set({currentCardIndex:+1})] |
| 8 | fishing-card | swipeRight | — | [state.set({currentCardIndex:+1}), effect.fetch('DS-interest')] |
| 9 | greet-btn(card内) | click | — | [state.set({isGreetingOpen:true, greetTarget:user})] |
| 10 | send-greet-btn | click | content!=='' | [effect.fetch('DS-fishing-greet'), state.set({isGreetingOpen:false}), ui.showToast('打招呼已发送')] |
| 11 | buy-btn | click | — | [nav.go('09-shop')] |

**节点总数估算**: ~45个
