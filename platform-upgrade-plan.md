# 设计平台能力全景与系统性改造方案

> **目的**: 从第一性原理出发，系统性审视平台的完整能力图谱，识别真正的结构性缺口
> **方法**: 源码验证 + 架构分析 + 用户场景反推
> **日期**: 2026-05-29

---

## 一、第一性原理：设计平台要解决的核心问题

### 本质定义

一个"设计到交互原型"平台，本质上是一个 **声明式 UI 运行时**：

```
输入: Schema（结构 + 样式 + 状态 + 事件 + 数据）
输出: 可交互的视觉产出（编辑器预览 / 导出代码 / 发布原型）
```

从用户场景倒推，这个运行时需要 **六个能力域**：

| # | 能力域 | 核心问题 | 类比 |
|---|--------|---------|------|
| 1 | **渲染** (Rendering) | "节点长什么样" | CSS + DOM |
| 2 | **状态** (State) | "数据存在哪里，怎么变化" | Redux/Zustand |
| 3 | **事件** (Event) | "用户做了什么，系统怎么响应" | Event handlers |
| 4 | **副作用** (Effect) | "与外部世界的交互" | API 调用、定时器 |
| 5 | **组件** (Component) | "可复用的结构单元" | React Components |
| 6 | **导出** (Output) | "设计如何变成真实产品" | Codegen |

---

## 二、六大能力域：当前状态完整审计

### 域 1: 渲染系统 (Rendering)

**核心文件**: `features/design-engine/src/styles/resolveStyles.ts`, `PrimitiveRenderer.tsx`

| 能力 | 状态 | 实现位置 | 说明 |
|------|:----:|---------|------|
| 组件树递归渲染 | ✅ | SchemaRenderer.tsx | 完整递归 + context 传递 |
| 样式 4 层合并 | ✅ | resolveStyles.ts | base → business state → interaction → 表单默认 |
| Token 引用解析 ($token:xxx) | ✅ | resolveTokens.ts | 主题色/间距/圆角/阴影 |
| 表达式样式 `{{ }}` | ✅ | resolveStyles.ts L66-78 | **响应式条件样式已支持** |
| Visual State 切换 | ✅ | resolveNodeStyles Layer 2-3 | activeState + interactionState |
| autoVisualState (activeWhen) | ✅ | resolveStyles.ts Layer 1.5 | **本次新增** — 条件自动激活 |
| 表单元素默认背景色 | ✅ | resolveStyles.ts Layer 4 | **本次修复** — input 默认白色 |
| Transition 动画 | ✅ | VisualState.transition | duration/easing/properties |
| CSS 伪类 (:hover/:focus) | ⚠️ 部分 | CSSPseudoInjector | hover 通过事件模拟，focus 未完整支持 |
| CSS Keyframes 动画 | ❌ 缺失 | — | shake、fadeIn、bounce 等无法实现 |
| SVG 内联渲染 | ❌ 缺失 | — | 图标只能走 PNG 素材，不能内联 SVG path |
| 响应式布局 (媒体查询) | ❌ 缺失 | — | 单视口渲染，无断点适配 |

**结构性缺口**:
- **CSS 动画**: 无法表达"表单 shake"、"success ✓ scale 弹跳"等需要 keyframes 的效果
- **SVG 内联**: 图标必须走素材导出 PNG 再 background-image，路径复杂且有白底问题；内联 SVG 更高效

---

### 域 2: 状态系统 (State)

**核心文件**: `features/design-engine/src/state/Store.ts`, `Reducer.ts`

| 能力 | 状态 | 实现位置 | 说明 |
|------|:----:|---------|------|
| View State (UI 临时态) | ✅ | Store → state.view | inputDraft, activeTab, etc |
| Data State (数据态) | ✅ | Store → state.data | API 返回数据 |
| Effect Status (请求态) | ✅ | Store → state.effects | pending/success/error |
| 路径式状态操作 | ✅ | Reducer.ts | dot.path + bracket[index] |
| 表达式求值 | ✅ | compileExpression / resolveExpression | 支持完整 JS 表达式 |
| state.set (固定值) | ✅ | Dispatcher → Reducer | — |
| state.set (表达式) | ✅ | action.value 支持 Expression | `value: "{{ state.view.count + 1 }}"` |
| state.append / remove / merge / toggle | ✅ | Reducer.ts | 完整 CRUD |
| 双向绑定 (set_bind) | ✅ | PreviewRenderer | input value ↔ state path |
| visibleWhen | ✅ | resolveProps.ts | 条件显隐 |
| textContent 插值 | ✅ | resolvePropsForRender | `{{ state.view.xxx }}` |
| 全局状态 (跨屏幕) | ⚠️ 部分 | GlobalState in project | stateInit.global 定义，但跨屏幕持久化待验证 |
| 计算属性 (derived state) | ❌ 缺失 | — | 无 computed/selector 概念 |
| 状态持久化 (localStorage) | ❌ 缺失 | — | 刷新/重进页面状态丢失 |

**结构性缺口**:
- **计算属性**: 无法声明 `totalPrice = items.reduce(...)` 这样的派生值
- **状态持久化**: 登录 token 等需要跨会话保持的数据无处存放

---

### 域 3: 事件系统 (Event)

**核心文件**: `features/design-engine/src/state/Dispatcher.ts`, `PreviewRenderer.tsx`

| 能力 | 状态 | 实现位置 | 说明 |
|------|:----:|---------|------|
| 用户交互事件 (click/change/submit) | ✅ | PreviewRenderer | 完整绑定 |
| 生命周期事件 (screenEnter/Exit) | ✅ | PreviewRenderer | 页面进入/离开 |
| 滚动事件 (scrollReachBottom/Top) | ✅ | PreviewRenderer | 触底加载 |
| 事件条件 (condition.when) | ✅ | PreviewRenderer | **已实现** — commit de5a2e9 |
| 条件分支 (logic.if / logic.switch) | ✅ | Dispatcher | **已实现** — commit 5dce84a |
| 导航 (nav.go / nav.back) | ✅ | Dispatcher → HostAdapters | — |
| Toast / URL | ✅ | Dispatcher → HostAdapters | — |
| 视觉状态切换 (node.setVisualState) | ✅ | Dispatcher → HostAdapters | 支持跨节点 + autoRevert |
| 自定义 action (custom) | ✅ | Dispatcher → HostAdapters | 扩展点 |
| focus 事件 | ⚠️ 部分 | PreviewRenderer | schema 定义了但绑定可能不完整 |
| longPress 事件 | ⚠️ 部分 | — | schema 定义了，运行时待验证 |
| 手势事件 (swipe/pinch) | ❌ 缺失 | — | 移动端手势不支持 |
| 键盘快捷键事件 | ❌ 缺失 | — | 无 keydown/keyup 绑定 |

**结构性缺口**:
- **手势系统**: 移动端设计原型缺少 swipe/pinch/drag 等手势
- **键盘事件**: 桌面端应用原型需要 hotkey 支持

---

### 域 4: 副作用系统 (Effect)

**核心文件**: `features/design-engine/src/state/EffectExecutor.ts`, `Dispatcher.ts`

| 能力 | 状态 | 实现位置 | 说明 |
|------|:----:|---------|------|
| API 调用 (effect.fetch) | ✅ | EffectExecutor | HTTP + Mock 双驱动 |
| 请求取消 (effect.cancel) | ✅ | EffectExecutor | AbortController |
| Mock 场景管理 | ✅ | MockDriver | 多 scenario + statusCode + delay |
| onSuccess/onError 链式 actions | ✅ | Dispatcher | $last 上下文传递 |
| 定时器 (ui.startTimer) | ✅ | TimerManager | **已实现** — commit 6e6a78e |
| 停止定时器 (ui.stopTimer) | ✅ | TimerManager | — |
| 重置定时器 (ui.resetTimer) | ✅ | TimerManager | — |
| 延迟 (ui.delay) | ✅ | Dispatcher | — |
| 定时器生命周期清理 | ✅ | TimerManager | 页面卸载自动清理 |
| WebSocket / 实时通信 | ❌ 缺失 | — | 无长连接支持 |
| 文件上传/下载 | ❌ 缺失 | — | effect.fetch 不支持 multipart |
| 本地存储读写 | ❌ 缺失 | — | 无 localStorage/sessionStorage action |

**结构性缺口**:
- **实时通信**: 聊天、通知等场景需要 WebSocket
- **文件操作**: 头像上传、文件下载等常见需求

---

### 域 5: 组件系统 (Component)

**核心文件**: `features/design-schema/src/types/node.ts`, `template.ts`

| 能力 | 状态 | 实现位置 | 说明 |
|------|:----:|---------|------|
| 原子 HTML 元素 | ✅ | PrimitiveRenderer | div/input/button/img/... |
| 组件模板 (Asset) | ✅ | asset 工具 | save_as_template / instantiate |
| 属性定义 (propDefinitions) | ✅ | component_prop 工具 | 组件参数化 |
| 列表渲染 (repeat) | ✅ | SchemaRenderer | set_repeat 三层模型 |
| 插槽 (slot) | ❌ 缺失 | — | 组件无法定义内容插槽 |
| 高级表单组件 (OTP/DatePicker) | ❌ 缺失 | — | 需用原子元素模拟 |
| 弹窗/抽屉/Toast 全局层 | ⚠️ 部分 | ui.showToast | Toast 有，Modal/Drawer 无节点载体 |
| Tab/Accordion 复合组件 | ❌ 缺失 | — | 需手动拼接 + 状态管理 |

**结构性缺口**:
- **全局覆盖层**: Modal/BottomSheet/Drawer 需要脱离 DOM 树的渲染位置
- **复合交互组件**: OTP 输入、日期选择器、轮播等高频组件缺少

---

### 域 6: 导出系统 (Output)

**核心文件**: `features/design-codegen/`, `features/codegen-template-react/`

| 能力 | 状态 | 实现位置 | 说明 |
|------|:----:|---------|------|
| React 代码生成 | ✅ | reactCodegen.ts | 含事件处理 |
| HTML 代码生成 | ✅ | — | 静态导出 |
| 设计稿截图 | ✅ | generate_snapshots | viewport/frame 模式 |
| 素材导出 PNG | ✅ | canvas export_and_apply | 含 targetState |
| 可交互原型发布 | ❌ 缺失 | — | 无独立部署能力 |
| 设计规格文档导出 | ❌ 缺失 | — | 无 redline/标注导出 |

---

## 三、能力完整度评分

| 域 | 完整度 | 关键缺口 |
|----|:------:|---------|
| 渲染 | **85%** | CSS 动画、SVG 内联 |
| 状态 | **90%** | 计算属性、持久化 |
| 事件 | **92%** | 手势、键盘事件 |
| 副作用 | **88%** | WebSocket、文件操作 |
| 组件 | **65%** | 全局层、复合组件、插槽 |
| 导出 | **60%** | 原型发布、规格文档 |

**综合评分: 80%** — 足以构建中等复杂度的交互原型，但对企业级产品设计仍有关键缺口。

---

## 四、从用户场景反推的优先级排序

### 场景 A: 登录页（本次测试）

| 需要的能力 | 平台状态 | 差距 |
|-----------|:--------:|------|
| 表单输入 + 校验 | ✅ 有 | 无（logic.if + visibleWhen + textContent 插值） |
| 倒计时 | ✅ 有 | 无（ui.startTimer + state.set expression） |
| Tab 切换高亮 | ✅ 有 | 无（{{ }} 样式表达式 或 activeWhen） |
| 成功后延迟跳转 | ✅ 有 | 无（ui.delay + nav.go） |
| 表单 shake 动画 | ❌ 缺 | **需要 CSS animation** |
| 错误 Modal/Sheet | ⚠️ 部分 | 需要全局覆盖层组件 |

### 场景 B: 首页地图+Feed

| 需要的能力 | 平台状态 | 差距 |
|-----------|:--------:|------|
| 滚动加载更多 | ✅ 有 | scrollReachBottom + effect.fetch |
| 地图/复杂图形 | ❌ 缺 | 无 Map 组件（超出平台范围） |
| 下拉刷新 | ❌ 缺 | 需手势事件 + 动画 |
| 骨架屏 loading | ⚠️ 部分 | 可用 visualState + visibleWhen 模拟 |

### 场景 C: 聊天/消息

| 需要的能力 | 平台状态 | 差距 |
|-----------|:--------:|------|
| 消息列表渲染 | ✅ 有 | repeat + 数据源 |
| 实时更新 | ❌ 缺 | 需要 WebSocket |
| 键盘弹起适配 | ❌ 缺 | 需要键盘事件 + 布局调整 |
| 图片/语音消息 | ⚠️ 部分 | img 支持，audio 不支持 |

---

## 五、系统性改造方案

### 改造原则

1. **补渲染短板** > 加新功能 — 用户首先看到的是"视觉正确性"
2. **增强已有机制** > 引入新概念 — 扩展 visualState/expression 而非新建系统
3. **高频场景优先** — 登录/表单/列表/导航覆盖 80% 页面

### 改造清单

#### P0: 渲染层补全（影响视觉正确性）

##### P0-A: CSS Animation 支持

**问题**: 无法表达 shake、fadeIn、bounce、pulse 等动画效果

**方案**: 在 VisualState 中增加 `animation` 字段

```typescript
// features/design-schema/src/types/visualState.ts
export interface VisualState {
  // ... 现有字段
  animation?: {
    name: string;           // 预设动画名 或 自定义 keyframes 名
    duration?: number;      // ms
    easing?: string;
    iterationCount?: number | 'infinite';
    direction?: 'normal' | 'reverse' | 'alternate';
  };
}
```

**预置动画库**（解决 80% 场景）:
```typescript
const PRESET_ANIMATIONS = {
  'shake': '@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }',
  'fadeIn': '@keyframes fadeIn { from{opacity:0} to{opacity:1} }',
  'fadeOut': '@keyframes fadeOut { from{opacity:1} to{opacity:0} }',
  'scaleIn': '@keyframes scaleIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }',
  'slideUp': '@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }',
  'slideDown': '@keyframes slideDown { from{transform:translateY(-100%)} to{transform:translateY(0)} }',
  'bounce': '@keyframes bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }',
  'pulse': '@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }',
};
```

**实现**: SchemaRenderer 注入 `<style>` 标签包含预设 keyframes，节点样式通过 `animation` CSS 属性引用。

**新增 Action**: `ui.animate` — 触发节点动画

```typescript
interface UiAnimateAction {
  type: 'ui.animate';
  nodeId?: string;       // 不传则为触发事件的节点自身
  animation: string;     // 预设名 或 keyframes 定义
  duration?: number;
  onComplete?: Action[]; // 动画结束后执行的 actions
}
```

---

##### P0-B: SVG 内联渲染

**问题**: 图标只能走素材 PNG（路径长、有白底问题），无法内联 SVG

**方案**: 在节点 props 中支持 `svgContent` 或新增 `type: "svg"` 元素

```typescript
// 方案 1: 新增 svg 原子类型
// PrimitiveRenderer.tsx 新增 case
case 'svg':
  return (
    <svg
      {...commonProps}
      viewBox={resolvedProps.viewBox as string}
      dangerouslySetInnerHTML={{ __html: resolvedProps.svgContent as string }}
    />
  );

// 方案 2: 在现有 div/img 中支持 SVG data URI（更安全）
// 通过 backgroundImage: "url(data:image/svg+xml,...)" 实现（已支持）
```

**推荐方案 1**: 新增 `svg` 元素类型，更语义化且性能更好。

---

#### P1: 组件层补全（影响复杂页面构建效率）

##### P1-A: 全局覆盖层系统 (Modal / BottomSheet / Drawer)

**问题**: Modal/Sheet/Drawer 需要脱离正常文档流，覆盖全屏，目前无载体。

**方案**: 引入 `overlay` 节点概念

```typescript
// 在 Screen 级别新增 overlays 数组
interface Screen {
  rootNode: ComponentNode;
  overlays?: OverlayNode[];  // NEW
  // ...
}

interface OverlayNode {
  id: string;
  name: string;
  type: 'modal' | 'bottomSheet' | 'drawer' | 'toast';
  rootNode: ComponentNode;  // 覆盖层内容树
  showWhen?: string;        // {{ }} 表达式控制显示
  animation?: 'fade' | 'slideUp' | 'slideRight';
  backdrop?: {
    color?: string;         // 默认 rgba(0,0,0,0.5)
    dismissible?: boolean;  // 点击蒙层关闭
  };
}
```

**新增 Actions**:
```typescript
{ type: 'ui.showOverlay', overlayId: string }
{ type: 'ui.hideOverlay', overlayId: string }
```

---

##### P1-B: 表单增强

**问题**: OTP 输入、密码强度、实时校验等复杂表单模式难以实现

**方案**: 不新增复合组件，而是增强原子 input 的能力

```typescript
// input props 扩展
interface InputProps {
  // 现有
  type?: string;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  
  // 新增
  maxLength?: number;        // 最大输入长度
  pattern?: string;          // 正则校验（触发 error visualState）
  autoFocusNext?: string;    // 输入满后自动聚焦下一个节点 ID
  inputMode?: 'numeric' | 'tel' | 'email' | 'url';  // 移动端键盘类型
}
```

`autoFocusNext` 解决 OTP 问题: 每个 input maxLength=1，autoFocusNext 指向下一个格子。

---

#### P2: 导出层补全（影响产品交付）

##### P2-A: 可交互原型发布

**方案**: 将 PreviewRenderer + Dispatcher 打包为独立运行时，支持 URL 访问

```
设计稿 Schema JSON → 运行时 bundle → 静态 HTML 页面 → 部署到 CDN
                                    ↓
                               可分享链接，手机扫码即可交互
```

##### P2-B: 设计规格文档

**方案**: 从 Schema 自动生成标注文档（间距/颜色/字号/状态）

---

#### P3: 渲染增强（长期）

| 项目 | 场景 | 方案 |
|------|------|------|
| 手势事件 | 移动端滑动/缩放 | 增加 swipe/pinch trigger |
| 键盘事件 | 桌面端快捷键 | 增加 keydown trigger |
| 响应式断点 | 多端适配 | viewport 条件样式 |
| 音频/视频 | 媒体播放 | 新增 audio/video 原子类型 |

---

## 六、改造路线图

```
Week 1 (P0 — 视觉正确性):
├── P0-A: CSS Animation 系统（预置 8 个 + 自定义）
├── P0-B: SVG 内联渲染（新增 svg 元素类型）
└── 技能文档: 更新平台能力清单（去掉所有错误的"❌ 缺失"标记）

Week 2-3 (P1 — 组件能力):
├── P1-A: 全局覆盖层（Modal/Sheet/Drawer）
├── P1-B: 表单增强（maxLength/pattern/autoFocusNext）
└── 验证: 用登录页重新跑一遍 executor 验证全链路

Week 4+ (P2 — 产品交付):
├── P2-A: 原型发布（Schema → 运行时 → 静态部署）
└── P2-B: 规格文档自动生成
```

---

## 七、关键洞察总结

### 发现 1: 平台能力远超文档记录

| 能力 | 之前认为 | 实际状态 |
|------|---------|---------|
| 条件样式 | ❌ 不支持 | ✅ 已支持（`{{ }}` 表达式在 styles 中） |
| textContent 插值 | ❌ 不支持 | ✅ 已支持（resolvePropsForRender） |
| 定时器 | ❌ 不支持 | ✅ 已实现（TimerManager） |
| 条件逻辑 | ❌ 不支持 | ✅ 已实现（logic.if / logic.switch） |
| 事件条件 | ❌ 不支持 | ✅ 已实现（condition.when） |
| state.set 表达式 | ❌ 不支持 | ✅ 已支持（value 支持 Expression） |

**根因**: 开发和文档脱节。功能已实现但技能文档仍标注"缺失"，导致 executor 以为做不到。

### 发现 2: 真正的结构性缺口只有 3 个

1. **CSS 动画** — 影响视觉反馈（shake/fadeIn 等），这是视觉设计不可或缺的
2. **全局覆盖层** — 影响 Modal/Sheet 类 UI，企业级应用必需
3. **原型发布** — 影响设计成果的可分享性

其他"缺失"要么已经存在（只是没文档化），要么是低频边缘场景。

### 发现 3: 最大的问题不是平台能力，是信息断层

```
平台开发者 → 实现了 timer/logic/expression
         ↓（未同步）
技能文档 → 写着"❌ 缺失"
         ↓（错误认知）
Executor → 以为做不到 → 不尝试 → 用 workaround → 效果差
```

**最优先的"改造"不是加代码，而是把已有能力完整地传达到技能层。**

---

## 八、立即可执行的行动

### Action 1: 更新技能文档的平台能力表（已完成 ✅）

在 `execution-rules.md` 中将 6 个"❌ 缺失"改为"✅ 已支持"并附用法。

### Action 2: 实现 P0-A CSS Animation（本周）

最小可用：在 VisualState 中增加 `animation` 字段 + 预置 8 个动画 + `ui.animate` action。

### Action 3: 实现 P1-A 全局覆盖层（下周）

最小可用：Screen 增加 `overlays[]` + 渲染器支持 + `ui.showOverlay/hideOverlay` actions。

### Action 4: 登录页回归测试（改造后）

用修正后的 executor 技能（严格逐节点读文档）重新执行登录页，验证全链路正确性。
