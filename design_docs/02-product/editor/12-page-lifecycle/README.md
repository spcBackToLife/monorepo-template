# 页面生命周期事件系统 — 产品设计方案

> **根本问题：如何让设计师在设计阶段完整描述"页面在不同生命阶段应该做什么"？**
>
> ← [返回交互与事件系统](../09-interaction-bindding/README.md)
>
> 相关文档：
> - [09-交互与事件系统](../09-interaction-bindding/README.md) — 现有事件模型
> - [10-预览与测试](../10-preview-mode/README.md) — 预览执行引擎
> - [05-数据驱动系统](../05-data-driven/README.md) — DataSource 与数据绑定
> - [01-第一性原理](../../../01-vision/first-principles.md) — 核心设计哲学

---

## 一、第一性原理：为什么需要页面生命周期？

### 1.1 从真实产品推导

```
一个真实的 App 页面在运行时会经历什么？

  ┌──────────────────────────────────────────────────────────┐
  │  1. 页面创建 (mount)                                      │
  │     · 获取用户信息                                        │
  │     · 加载列表数据                                        │
  │     · 初始化权限检查                                      │
  │     · 上报 PV 统计                                        │
  │                                                          │
  │  2. 页面存活期间                                           │
  │     · 用户操作（click/hover/input — 已有能力）              │
  │     · 页面滚动到底部 → 加载下一页                          │
  │     · 定时刷新数据（轮询）                                 │
  │                                                          │
  │  3. 页面离开 (unmount)                                    │
  │     · 取消未完成的请求                                     │
  │     · 保存草稿                                            │
  │     · 清理定时器                                          │
  │     · 上报停留时长                                        │
  │                                                          │
  │  4. 页面可见性变化                                         │
  │     · 切到后台 → 暂停视频/动画                             │
  │     · 回到前台 → 恢复播放/刷新数据                         │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

当前事件系统能表达的：
  ✅ 用户操作：click / hover / focus / blur / longPress
  ✅ 页面进入：screenEnter（刚实现）
  ❌ 页面离开、滚动、可见性变化、定时器 — 全部缺失

这些不是"锦上添花"——没有它们，设计出来的原型是不完整的：
  · 不能描述"列表加载更多"
  · 不能描述"离开表单页时保存草稿"
  · 不能描述"切换 Tab 时暂停视频"
  · 不能描述"返回上一页时需要确认弹窗"
```

### 1.2 跨框架的共性抽象

```
React / Vue / Flutter / SwiftUI 的生命周期虽然 API 不同，
但抽象出来只有 5 种时机：

  ┌──────────────┬──────────────────────────────────────────┐
  │  时机          │  框架对应                                 │
  ├──────────────┼──────────────────────────────────────────┤
  │  进入页面      │  React: useEffect(,[])                   │
  │              │  Vue: onMounted()                        │
  │              │  Flutter: initState()                    │
  │              │  SwiftUI: onAppear {}                    │
  ├──────────────┼──────────────────────────────────────────┤
  │  离开页面      │  React: useEffect cleanup                │
  │              │  Vue: onUnmounted()                      │
  │              │  Flutter: dispose()                      │
  │              │  SwiftUI: onDisappear {}                 │
  ├──────────────┼──────────────────────────────────────────┤
  │  可见性变化    │  React: document.visibilitychange        │
  │              │  Vue: visibilitychange listener          │
  │              │  Flutter: WidgetsBindingObserver         │
  │              │  SwiftUI: scenePhase                     │
  ├──────────────┼──────────────────────────────────────────┤
  │  滚动事件      │  React: onScroll / IntersectionObserver  │
  │              │  Vue: @scroll / IntersectionObserver     │
  │              │  Flutter: ScrollController               │
  │              │  SwiftUI: ScrollViewReader               │
  ├──────────────┼──────────────────────────────────────────┤
  │  返回导航      │  React: popstate / beforeunload          │
  │              │  Vue: beforeRouteLeave()                 │
  │              │  Flutter: WillPopScope / PopScope        │
  │              │  SwiftUI: NavigationStack interception   │
  └──────────────┴──────────────────────────────────────────┘

所有框架都有这 5 种。
这是前端开发的"最大公约数"——我们的 Schema 应该都能表达。
```

### 1.3 核心洞察

```
页面生命周期不是"新系统"——它是事件系统的自然延伸。

当前事件系统的模型：
  trigger: 时机   → actions: 做什么
  click          → navigate / setState / apiRequest / ...
  hover          → setState / toggleVisible / ...

生命周期事件完全复用这个模型：
  screenEnter    → apiRequest / setDomainState / switchDataSourcePhase / ...
  screenExit     → cancelApiRequest / setDomainState / ...
  scrollReach    → apiRequest (加载更多) / setDomainState (显示回顶按钮) / ...

不需要新的 action 系统、不需要新的执行引擎。
只需要新的 trigger 类型 + 预览引擎中对应的触发入口。

设计原则：
  1. 复用已有的 EventAction 体系（零新概念）
  2. 每个 trigger 都能在预览模式中真实执行
  3. 每个 trigger 都能直接导出为对应框架代码
  4. 80/20 法则——先做覆盖 90% 场景的核心 trigger
```

---

## 二、生命周期事件体系设计

### 2.1 完整的 Trigger 体系

```
按照"时机"维度，重新组织所有 trigger：

┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  第一类：用户交互触发（已有）                                      │
│  ─────────────────────                                           │
│  click      → 点击                                               │
│  hover      → 鼠标悬停                                           │
│  focus      → 获得焦点                                           │
│  blur       → 失去焦点                                           │
│  longPress  → 长按                                               │
│                                                                  │
│  第二类：页面生命周期触发（新增）                                   │
│  ─────────────────────────                                       │
│  screenEnter       → 页面进入（已实现）                            │
│  screenExit        → 页面离开 ← NEW                               │
│  screenVisible     → 页面从后台回到前台 ← NEW                      │
│  screenHidden      → 页面进入后台 ← NEW                           │
│                                                                  │
│  第三类：滚动触发（新增）                                          │
│  ─────────────────────                                           │
│  scrollReachBottom → 滚动到底部 ← NEW                              │
│  scrollReachTop    → 滚动回到顶部 ← NEW                            │
│                                                                  │
│  第四类：导航触发（新增）                                          │
│  ─────────────────────                                           │
│  navigateBack      → 用户按返回键 ← NEW                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 每个 Trigger 的详细定义

```
━━━ screenEnter（已实现）━━━━━━━━━━━━━━━━━━━━━━━━━━━

  触发时机: 页面首次渲染完成 / 从其他页面跳转进入
  绑定位置: Screen 的 rootNode
  典型 actions:
    · apiRequest → 获取页面初始数据
    · setDomainState → 初始化页面状态
    · switchDataSourcePhase → 设置 loading 阶段
  预览实现: useEffect on screen.id change
  代码导出: useEffect(() => { ... }, [])


━━━ screenExit（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  触发时机: 从当前页面跳转到其他页面（navigate action 执行前）
  绑定位置: Screen 的 rootNode
  典型 actions:
    · setDomainState → 重置页面状态
    · switchDataSourcePhase → 清理数据源
    · showToast → "草稿已自动保存"
  预览实现: navigate action 执行前触发当前页面的 screenExit
  代码导出:
    React: useEffect(() => { return () => { cleanup() } }, [])
    Vue:   onUnmounted(() => { cleanup() })

  设计价值:
    · 描述"离开表单页时保存草稿"
    · 描述"离开视频页时暂停播放"
    · 代码导出时直接生成 cleanup 逻辑


━━━ screenVisible / screenHidden（新增）━━━━━━━━━━━━━

  触发时机:
    screenVisible: 浏览器 tab 重新获得焦点 / App 从后台回到前台
    screenHidden:  浏览器 tab 失去焦点 / App 进入后台
  绑定位置: Screen 的 rootNode
  典型 actions:
    screenHidden:
      · setState → 暂停视频/动画
    screenVisible:
      · apiRequest → 重新获取最新数据（可能离开了很久）
      · setState → 恢复视频/动画
  预览实现: document.addEventListener('visibilitychange', ...)
  代码导出:
    React: useEffect(() => { document.addEventListener('visibilitychange', handler) }, [])

  设计价值:
    · 描述"切换 Tab 后暂停视频"
    · 描述"回到 App 时刷新数据"


━━━ scrollReachBottom / scrollReachTop（新增）━━━━━━━

  触发时机:
    scrollReachBottom: 页面滚动到距底部 N px 以内（默认 100px）
    scrollReachTop:    页面滚动到顶部（scrollTop === 0）
  绑定位置: 可滚动的容器节点 或 Screen rootNode
  额外参数:
    threshold: number  // 触发阈值（px），默认 100
    debounce: number   // 防抖间隔（ms），默认 300
  典型 actions:
    scrollReachBottom:
      · apiRequest → 加载下一页数据
      · setDomainState → 显示"加载更多"指示器
    scrollReachTop:
      · setDomainState → 隐藏"回到顶部"按钮
  预览实现: IntersectionObserver 或 scroll event listener + debounce
  代码导出:
    React: useEffect(() => { const observer = new IntersectionObserver(...) }, [])

  设计价值:
    · 描述"无限滚动加载"
    · 描述"滚动到顶部隐藏浮动按钮"
    · 这是移动端和 Feed 类产品的核心交互


━━━ navigateBack（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━

  触发时机: 用户按浏览器/手机返回键、或预览中点击 [← 后退]
  绑定位置: Screen 的 rootNode
  典型 actions:
    · showToast → "确定要离开吗？未保存的内容将丢失"
    · 远期可支持 condition 判断是否有未保存修改
  预览实现: 拦截预览控制条的 [← 后退] 按钮
  代码导出:
    React: beforeunload / react-router useBlocker
    Vue:   beforeRouteLeave guard
    Flutter: PopScope / WillPopScope

  设计价值:
    · 描述"离开编辑页面时确认弹窗"
    · 防止用户误操作丢失数据
```

### 2.3 生命周期事件在 Schema 中的位置

```
生命周期事件绑定在 Screen 的 rootNode 的 events 数组中：

  screen.rootNode.events = [
    // 用户交互事件（已有）
    { trigger: "click", actions: [...] },
    { trigger: "hover", actions: [...] },

    // 生命周期事件（新增）
    { trigger: "screenEnter", actions: [...] },
    { trigger: "screenExit", actions: [...] },
    { trigger: "scrollReachBottom", actions: [...] },
    ...
  ]

为什么放在 rootNode 而不是 Screen 顶层？
  · 复用现有的 ComponentEvent 数据结构，零新概念
  · rootNode 的 events 已经被预览引擎扫描和执行
  · addEvent / removeEvent / updateEvent 操作完全兼容
  · MCP 工具无需新增——用已有的 add_event 即可
```

### 2.4 新增 Action 类型

```
为了完整支持生命周期，需要一个新的 Action：

  cancelApiRequest — 取消未完成的 API 请求
  ─────────────────

  interface CancelApiRequestAction {
    type: 'cancelApiRequest';
    requestId?: string;   // 指定取消哪个请求；不填则取消所有
  }

  使用场景:
    screenExit → cancelApiRequest  (离开页面时取消正在进行的请求)

  预览实现:
    MockExecutor 维护进行中的请求 → cancelApiRequest 中断它们

  代码导出:
    AbortController.abort() / axios CancelToken
```

---

## 三、编辑器交互设计

### 3.1 事件面板中的生命周期事件

```
选中 Screen 的 rootNode → 右侧属性面板 → 行为 Tab

┌──────────────────────────────────────┐
│  行为                                 │
├──────────────────────────────────────┤
│                                      │
│  ── 页面生命周期 ──────────────────── │   ← 新增分组
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ● 页面进入 (screenEnter) [⋮]  │  │
│  │  ① → 设置领域态: pagePhase=loading │
│  │  ② → 切换数据源: loading         │
│  │  ③ → 发送请求: 获取用户信息       │
│  │      ✅ 成功: 切换数据源 loaded   │
│  │      ❌ 失败: 设置领域态 error    │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ● 页面离开 (screenExit) [⋮]   │  │
│  │  ① → 取消请求: 获取用户信息      │
│  └────────────────────────────────┘  │
│                                      │
│  [+ 添加生命周期事件]                  │
│    · 页面进入                         │
│    · 页面离开                         │
│    · 页面可见                         │
│    · 页面隐藏                         │
│    · 滚动到底部                       │
│    · 滚动到顶部                       │
│    · 返回键                           │
│                                      │
│  ── 用户交互 ──────────────────────  │   ← 已有
│                                      │
│  ┌────────────────────────────────┐  │
│  │  ● 点击 (click)          [⋮]   │  │
│  │  ① → 跳转: 详情页              │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ 添加交互事件]                     │
│                                      │
└──────────────────────────────────────┘

事件面板分为两个区域：
  · 页面生命周期区 — screenEnter/Exit/Visible/Hidden/scroll/navigateBack
  · 用户交互区 — click/hover/focus/blur/longPress（已有）

两个区域使用相同的事件卡片 UI，只是触发器类型不同。
```

### 3.2 预览控制条的增强

```
预览模式下，控制条增加"页面事件日志"指示器：

┌──────────────────────────────────────────────────────────────┐
│ [■ 退出] │ 📱 主页 │ [← 后退] │ [事件日志 ▾] │ [接口场景 ▾]  │
└──────────────────────────────────────────────────────────────┘

点击 [事件日志 ▾] 弹出浮层：

┌──────────────────────────────────────┐
│  事件执行日志                         │
├──────────────────────────────────────┤
│  00:00.000  screenEnter 触发          │
│  00:00.001  → setDomainState loading │
│  00:00.002  → switchPhase loading    │
│  00:00.003  → apiRequest 开始        │
│  00:00.803  → apiRequest 成功 (200)  │
│  00:00.804  → switchPhase loaded     │
│  00:00.805  → setDomainState loaded  │
│                                      │
│  [清空日志]                           │
└──────────────────────────────────────┘

设计价值：
  · 让设计师看到"预览背后发生了什么"
  · 调试事件链是否按预期执行
  · 验证时间线（Mock 延迟是否合理）
```

---

## 四、预览引擎实现策略

### 4.1 各 trigger 的预览实现方式

```
┌──────────────────┬────────────────────────────────────────────┐
│  Trigger          │  预览引擎实现                               │
├──────────────────┼────────────────────────────────────────────┤
│  screenEnter     │  useEffect([screen.id]) — 已实现            │
│                  │                                            │
│  screenExit      │  navigate action 执行前，先执行当前页面的    │
│                  │  screenExit events。在 onNavigate 回调中    │
│                  │  拦截，先 await screenExit actions，再跳转  │
│                  │                                            │
│  screenVisible   │  document.addEventListener('visibility-    │
│                  │  change', handler)                         │
│                  │  visibilityState === 'visible' 时触发       │
│                  │                                            │
│  screenHidden    │  同上，visibilityState === 'hidden' 时触发  │
│                  │                                            │
│  scrollReach-    │  在预览容器上监听 scroll event               │
│  Bottom/Top      │  检查 scrollHeight - scrollTop - clientH    │
│                  │  < threshold 时触发（debounced）             │
│                  │                                            │
│  navigateBack    │  拦截预览控制条的 [← 后退] 按钮              │
│                  │  先执行 navigateBack events，再真正后退      │
│                  │                                            │
└──────────────────┴────────────────────────────────────────────┘
```

### 4.2 代码导出映射

```typescript
// screenEnter → React
useEffect(() => {
  // actions...
  fetchUserInfo();
}, []);

// screenExit → React
useEffect(() => {
  return () => {
    // cleanup actions...
    abortController.abort();
  };
}, []);

// screenVisible / screenHidden → React
useEffect(() => {
  const handler = () => {
    if (document.visibilityState === 'visible') {
      // screenVisible actions
      refreshData();
    } else {
      // screenHidden actions
      pauseVideo();
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}, []);

// scrollReachBottom → React
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadNextPage();
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(sentinelRef.current);
  return () => observer.disconnect();
}, []);

// navigateBack → React (react-router v6)
const blocker = useBlocker(({ currentLocation, nextLocation }) => {
  if (hasUnsavedChanges) {
    return !window.confirm("确定要离开吗？");
  }
  return false;
});
```

---

## 五、与现有系统的关系

### 5.1 screenEnter + DataSource(api) 的完整链路

```
这是最常见的使用模式：

  设计师操作:
    1. 创建 API 数据源 "用户信息" (lifecycle: api)
    2. 创建 ApiEndpoint "GET /api/user/profile"
    3. 在 rootNode 上添加 screenEnter 事件:
       actions:
         ① setDomainState("pagePhase", "loading")
         ② switchDataSourcePhase("ds_user_info", "loading")
         ③ apiRequest("get-user-info")
              onSuccess → switchPhase("loaded") + setDomainState("loaded")
              onFailure → setDomainState("error")
    4. 用领域态绑定控制三套 UI 的可见性

  预览时的自动流程:
    进入页面 → screenEnter 触发 → loading 态 → 请求 → loaded/error

  导出的代码:
    useEffect(() => {
      setPagePhase("loading");
      try {
        const data = await fetch("/api/user/profile");
        setUserInfo(data);
        setPagePhase("loaded");
      } catch {
        setPagePhase("error");
      }
    }, []);
```

### 5.2 scrollReachBottom + 列表加载更多

```
无限滚动列表的设计:

  设计师操作:
    1. 创建列表容器，绑定 {{data.taskList}}
    2. 在列表容器上添加 scrollReachBottom 事件:
       actions:
         ① setDomainState("loadMoreState", "loading")
         ② apiRequest("get-next-page")
              onSuccess → setDomainState("loadMoreState", "idle")
              onFailure → setDomainState("loadMoreState", "error")
    3. 列表底部放一个"加载中"指示器，绑定 loadMoreState

  这是 Feed 类产品（微博、抖音、新闻列表）的核心交互。
```

### 5.3 navigateBack + 确认弹窗

```
表单页防止误退出:

  设计师操作:
    1. 在表单页 rootNode 上添加 navigateBack 事件:
       condition: { type: "domainState", variableName: "formDirty", value: "true" }
       actions:
         ① setState(Root, "confirmLeave")  → 显示确认弹窗
         （弹窗的"确认离开"按钮绑定 navigate action）
         （弹窗的"取消"按钮绑定 setState(Root, "default")）

  预览时:
    用户修改了表单 → formDirty = true
    点击返回 → 弹出确认弹窗
    点"取消" → 留在当前页
    点"确认" → 真正返回
```

---

## 六、Schema 扩展

### 6.1 EventTrigger 类型扩展

```typescript
export type EventTrigger =
  // 用户交互（已有）
  | 'click' | 'hover' | 'focus' | 'blur' | 'longPress'
  // 页面生命周期（新增）
  | 'screenEnter'        // 已实现
  | 'screenExit'         // 页面离开
  | 'screenVisible'      // 页面回到前台
  | 'screenHidden'       // 页面进入后台
  // 滚动触发（新增）
  | 'scrollReachBottom'  // 滚动到底部
  | 'scrollReachTop'     // 滚动回到顶部
  // 导航触发（新增）
  | 'navigateBack';      // 返回键
```

### 6.2 新增 EventAction

```typescript
/** 取消未完成的 API 请求 */
export interface CancelApiRequestAction {
  type: 'cancelApiRequest';
  /** 要取消的请求 ID；不填则取消当前页面所有进行中的请求 */
  requestId?: string;
}

// 更新 EventAction 联合类型
export type EventAction =
  | ... // 已有
  | CancelApiRequestAction;
```

### 6.3 滚动触发器的额外配置

```typescript
/** 滚动触发器可以在 ComponentEvent 上附加额外配置 */
interface ComponentEvent {
  trigger: EventTrigger;
  actions: EventAction[];
  condition?: EventCondition;
  description?: string;
  disabled?: boolean;
  /** 仅 scrollReachBottom/scrollReachTop 使用 */
  scrollConfig?: {
    threshold?: number;   // 触发阈值(px)，默认 100
    debounce?: number;    // 防抖间隔(ms)，默认 300
  };
}
```

---

## 七、设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 生命周期事件放在哪？ | rootNode.events[] | 复用已有的 ComponentEvent 结构，无需新概念 |
| 需要多少种 trigger？ | 7 种新增（含已有 screenEnter） | 覆盖 90% 的真实产品场景；80/20 法则 |
| scrollReach 绑在哪？ | 可滚动容器节点 or rootNode | 灵活——页面级滚动用 rootNode，局部滚动用容器 |
| screenExit 何时触发？ | navigate action 执行前 | 先 cleanup 再跳转，与真实产品行为一致 |
| navigateBack 能阻止返回吗？ | 通过 condition 间接实现 | 不改变导航栈模型；condition + 弹窗实现阻止 |
| 需要 cancelApiRequest action 吗？ | 是 | screenExit 的核心场景就是取消请求 |
| 可见性事件分两个还是一个？ | 分两个（visible/hidden） | 更清晰，actions 不同 |

---

## 八、边界情况

| 场景 | 预期行为 |
|------|---------|
| screenEnter 中的 apiRequest 还在进行，用户就跳走了 | screenExit 的 cancelApiRequest 取消它 |
| 页面没有 screenExit 事件，用户跳走 | 静默跳转，无 cleanup |
| scrollReachBottom 重复触发 | debounce 300ms；可通过 condition 判断"是否正在加载"来防重复 |
| screenVisible 在编辑模式下 | 不触发（编辑模式不执行事件） |
| navigateBack 时没有导航栈 | 事件不触发（无路可退） |
| 一个页面同时有 screenEnter + screenExit | 独立管理，互不干扰 |
| screenEnter 中 apiRequest 失败后页面切走再回来 | 重新触发 screenEnter（ref 重置） |
```
