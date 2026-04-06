# 页面生命周期事件 — 技术方案与实施路线

> **一句话定位：让预览引擎能在"页面进入/离开/滚动/可见性变化/返回"等时机自动执行事件链，使设计原型的交互完整度接近真实产品。**
>
> 相关文档：
> - [12-页面生命周期产品设计](../02-product/editor/12-page-lifecycle/README.md) — 产品交互方案
> - [09-交互与事件系统](../02-product/editor/09-interaction-bindding/README.md) — 现有事件模型
> - [API 请求绑定 + Toast + 跳转](./api-request-toast-navigation.md) — apiRequest 技术方案
> - [design-schema event.ts](../03-tech/design-schema.md) — EventTrigger 类型定义

---

## 一、现状与目标

### 现状

```
EventTrigger = 'click' | 'hover' | 'focus' | 'blur' | 'longPress' | 'screenEnter'

已实现：
  ✅ 5 种用户交互触发器（click/hover/focus/blur/longPress）
  ✅ screenEnter（页面进入时自动执行 — 刚实现）
  ✅ 预览引擎 EventExecutionEngine 完整的 action 执行框架
  ✅ MockExecutor 模拟 API 请求
  ✅ 领域态/环境态/数据源阶段切换

缺失：
  ❌ screenExit — 页面离开时清理
  ❌ screenVisible / screenHidden — 可见性变化
  ❌ scrollReachBottom / scrollReachTop — 滚动触发
  ❌ navigateBack — 返回键拦截
  ❌ cancelApiRequest action — 取消请求
```

### 目标

```
EventTrigger = 
  | 'click' | 'hover' | 'focus' | 'blur' | 'longPress'   // 用户交互
  | 'screenEnter' | 'screenExit'                           // 页面进出
  | 'screenVisible' | 'screenHidden'                       // 可见性
  | 'scrollReachBottom' | 'scrollReachTop'                  // 滚动
  | 'navigateBack'                                         // 返回键
```

---

## 二、架构总览

```
涉及修改/新增的模块：

  features/design-schema
    └─ types/event.ts
        → EventTrigger 联合类型扩展（6 个新值）
        → 新增 CancelApiRequestAction
        → ComponentEvent 新增 scrollConfig 可选字段

  features/design-engine
    ├─ preview/EventExecutionEngine.ts
    │   → triggerToDomEvent() 映射新 trigger 返回 null
    │   → executeActionsAsync() 已有，复用
    │   → 新增 cancelPendingRequests() 方法
    │
    ├─ preview/PreviewRenderer.tsx
    │   → screenEnter useEffect（已实现）
    │   → screenExit: navigate 前拦截 + 执行
    │   → screenVisible/Hidden: visibilitychange listener
    │   → scrollReachBottom/Top: scroll + IntersectionObserver
    │   → navigateBack: 拦截后退按钮
    │
    └─ preview/MockExecutor.ts
        → 新增 cancel(requestId) + cancelAll() 方法

  apps/design_front
    └─ views/editor/Canvas/index.tsx
        → onNavigate 增加 screenExit 拦截逻辑
        → 预览控制条 [← 后退] 增加 navigateBack 拦截
```

---

## 三、分阶段实施路线

### Phase 6A: screenExit + cancelApiRequest（预计 2d）

**目标**：页面离开时能执行清理逻辑

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 6A.1 | EventTrigger 添加 'screenExit' | design-schema | types/event.ts | 0.25h |
| 6A.2 | 新增 CancelApiRequestAction 类型 | design-schema | types/event.ts | 0.25h |
| 6A.3 | MockExecutor 支持 cancel | design-engine | cancel(id) + cancelAll() | 1h |
| 6A.4 | EventExecutionEngine 支持 cancelApiRequest | design-engine | executeAction 新增 case | 0.5h |
| 6A.5 | PreviewRenderer: navigate 前执行 screenExit | design-engine | onNavigate 回调中拦截 | 2h |
| 6A.6 | PreviewRenderer: screenExit ref 管理 | design-engine | 确保不重复触发 | 1h |
| 6A.7 | 端到端验证 | 全链路 | 页面跳转时验证 screenExit 触发 | 1h |

**Phase 6A 交付物**：进入预览，从主页点跳转 → 主页的 screenExit 事件执行（如取消进行中的请求）

---

### Phase 6B: screenVisible / screenHidden（预计 1.5d）

**目标**：Tab 切换时能暂停/恢复

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 6B.1 | EventTrigger 添加 'screenVisible' / 'screenHidden' | design-schema | types/event.ts | 0.25h |
| 6B.2 | PreviewRenderer: visibilitychange listener | design-engine | useEffect + document.addEventListener | 2h |
| 6B.3 | 扫描 rootNode events 执行对应 actions | design-engine | 复用 executeActionsAsync | 1h |
| 6B.4 | 端到端验证 | 全链路 | 切换浏览器 Tab 验证触发 | 0.5h |

**Phase 6B 交付物**：预览中切换到其他 Tab → screenHidden 触发；切回来 → screenVisible 触发

---

### Phase 6C: scrollReachBottom / scrollReachTop（预计 3d）

**目标**：支持无限滚动加载等滚动驱动交互

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 6C.1 | EventTrigger 添加 scroll 相关 | design-schema | types/event.ts | 0.25h |
| 6C.2 | ComponentEvent 添加 scrollConfig | design-schema | threshold + debounce 配置 | 0.5h |
| 6C.3 | PreviewRenderer: scroll sentinel + IntersectionObserver | design-engine | 在滚动容器底部插入不可见哨兵元素 | 3h |
| 6C.4 | 支持非 rootNode 的可滚动容器 | design-engine | 遍历有 overflow:auto/scroll 的节点 | 2h |
| 6C.5 | EventExecutionEngine: triggerToDomEvent 映射 | design-engine | scroll triggers 返回 null（自定义处理） | 0.5h |
| 6C.6 | 事件编辑 UI: scrollConfig 配置 | design_front | threshold/debounce 输入框 | 2h |
| 6C.7 | 端到端验证 | 全链路 | 列表滚动到底 → 加载更多 | 1h |

**Phase 6C 交付物**：列表滚动到底部 → scrollReachBottom 触发 → apiRequest 加载下一页

---

### Phase 6D: navigateBack（预计 1.5d）

**目标**：返回键可触发确认弹窗等逻辑

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 6D.1 | EventTrigger 添加 'navigateBack' | design-schema | types/event.ts | 0.25h |
| 6D.2 | PreviewRenderer: 拦截后退按钮 | design-engine | onNavigateBack 回调 | 2h |
| 6D.3 | 前端 PreviewBar: 后退前检查 navigateBack events | design_front | 执行后如果有 navigate action 则继续后退，否则阻止 | 2h |
| 6D.4 | 端到端验证 | 全链路 | 表单页点返回 → 弹出确认弹窗 | 1h |

**Phase 6D 交付物**：表单页预览中点返回 → navigateBack 事件触发 → 显示确认弹窗

---

### Phase 6E: 事件执行日志 + 编辑器 UI（预计 2d）

**目标**：让设计师看到预览中事件的执行过程

| # | 任务 | 模块 | 说明 | 预估 |
|---|------|------|------|------|
| 6E.1 | EventExecutionEngine: 事件日志回调 | design-engine | PreviewContext.onLog?.(entry) | 1h |
| 6E.2 | PreviewRenderer: 收集日志状态 | design-engine | useState<LogEntry[]> | 1h |
| 6E.3 | PreviewBar: 事件日志面板 UI | design_front | Popover 浮层显示时间线日志 | 3h |
| 6E.4 | 事件面板: 生命周期事件分组 UI | design_front | "页面生命周期"和"用户交互"两个区域 | 2h |

**Phase 6E 交付物**：预览模式控制条显示事件执行日志；事件面板分组展示生命周期 + 用户交互

---

## 四、里程碑总览

```
Phase 6A (2d)     Phase 6B (1.5d)    Phase 6C (3d)      Phase 6D (1.5d)    Phase 6E (2d)
   │                  │                  │                  │                  │
   ▼                  ▼                  ▼                  ▼                  ▼
┌──────────┐   ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│ screenExit│   │ 可见性变化    │  │ 滚动触发      │  │ 返回键拦截   │  │ 日志 + UI    │
│ + cancel │───→│ visible/     │──→│ scrollReach  │──→│ navigateBack│──→│ 事件面板分组 │
│ 可清理    │   │ hidden       │  │ 可加载更多    │  │ 可弹窗确认  │  │ 可调试      │
└──────────┘   └──────────────┘  └───────────────┘  └──────────────┘  └──────────────┘

总计: ~10d（约 2 周）

每个 Phase 独立可交付，互不依赖。
推荐优先级: 6A → 6C → 6B → 6D → 6E
  · 6A(screenExit) 是核心——与 screenEnter 配对
  · 6C(scroll) 价值最高——无限滚动是产品核心交互
  · 6B(visible) 相对独立，优先级可调
  · 6D(navigateBack) 依赖导航系统完善
  · 6E(日志) 是辅助工具，最后做
```

---

## 五、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| screenExit 中的异步 action 阻塞跳转 | 中 | 设置最大等待时间 2s；超时强制跳转 |
| scrollReachBottom 频繁触发导致性能问题 | 中 | debounce 300ms + condition 判断防重复 |
| 多个 DataSource 的 screenEnter 请求并行冲突 | 低 | 各 DataSource 独立管理 phase；请求互不干扰 |
| navigateBack 阻止返回导致用户困惑 | 中 | 限制只能显示确认弹窗，不能无条件阻止 |
| cancelApiRequest 在 Mock 模式下无实际意义 | 低 | Mock 中的 cancel = resolve 一个 cancelled 响应；代码导出时生成真实的 AbortController |

---

## 六、与代码导出的映射

| Trigger | React 导出 | Vue 导出 |
|---------|-----------|---------|
| screenEnter | `useEffect(() => { ... }, [])` | `onMounted(() => { ... })` |
| screenExit | `useEffect(() => { return () => { ... } }, [])` | `onUnmounted(() => { ... })` |
| screenVisible | `useEffect(() => { document.addEventListener('visibilitychange', ...) }, [])` | `onMounted(() => { document.addEventListener(...) })` |
| scrollReachBottom | `IntersectionObserver` + sentinel element | `@scroll` + threshold check |
| navigateBack | `useBlocker()` (react-router) | `beforeRouteLeave()` |
| cancelApiRequest | `AbortController.abort()` | `axios.CancelToken.cancel()` |
