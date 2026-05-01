# Frame / Viewport / Canvas 三层解耦 — 技术实现规划

> 产品方案：[Frame / Viewport / Canvas 三层解耦 — 产品方案](../../02-product/editor/01-canvas/frame-viewport-canvas-redesign.md)
>
> 决策索引：[decision-log.md #17](../../05-decisions/decision-log.md)
>
> 状态：**实施中**
> 日期：2026-04-30

---

## 一、改动总览

| 层 | 文件 | 改动类型 |
|---|---|---|
| **design-schema** | `types/screen.ts` | 新增 `frame` + `defaultViewport` 字段 |
| **design-schema** | `types/node.ts` | 新增 `role` 字段 |
| **design-schema** | `types/index.ts` | 导出 `NodeRole` |
| **design-engine** | `viewport/ViewportContainer.tsx` | 接受 `frame` + `viewportWindows`，Frame 高度自适应 |
| **design-engine** | `renderer/SchemaRenderer.tsx` | 根节点 minHeight 取自 frame，sticky 节点按 role 附加定位 |
| **design-engine** | `preview/PreviewRenderer.tsx` | embedded 模式 overflow 改 auto |
| **design-engine** | `migration/frameMigration.ts`（新文件）| Screen 读时回填 frame |
| **design-mcp** | `tools/domain/screen.ts` 或 generate_snapshots | 加 `mode` 参数 |
| **design_front** | `views/editor/Canvas/index.tsx` | 传 frame 给 ViewportContainer，画布工具栏配套 |
| **design_front** | `views/editor/panels/RightPanel/...` | 节点 role 选项 |

---

## 二、Schema 字段定义

### 2.1 `Screen.frame`（新增，可选，运行时回填）

```typescript
// features/design-schema/src/types/screen.ts
export interface ScreenFrame {
  /** 设计基准宽（px），如 375 / 414 / 1280 */
  width: number;
  /**
   * Frame 内容最小撑开高度（px），可选。
   * 用于内容稀少时避免 Frame 塌缩。
   * 不写 = 不约束最小高度，由内容自然撑开。
   */
  minHeight?: number;
}

export interface Screen {
  // ... 既有字段
  /**
   * 这个 Screen 的物理舞台尺寸。Schema 内容自适应高度。
   * 与 Project 的 viewport 无关 —— viewport 只是观察窗口。
   *
   * 兼容性：未填写时由 design-engine 在读取时按 project.currentViewport.width 回填。
   */
  frame?: ScreenFrame;

  /**
   * 默认观察 viewport 偏好（不影响 Schema 渲染，只影响编辑器/预览的初始取景框）。
   * 不写 = 用 project.currentViewport
   */
  defaultViewport?: Viewport;
}
```

**为什么 frame 是可选**：兼容存量数据。design-engine 在读 Screen 时若发现 `frame == null`，自动按 `{ width: project.currentViewport.width }` 回填（不修改持久化数据，仅运行时合成）。后续随 op 触达再持久化。

### 2.2 `ComponentNode.role`（新增，可选）

```typescript
// features/design-schema/src/types/node.ts
export type NodeRole =
  | 'scroll-container'  // 这个节点是滚动容器（运行时 overflow: auto）
  | 'sticky-bottom'     // 锚定到激活 viewport 底部
  | 'sticky-top';       // 锚定到激活 viewport 顶部

export interface ComponentNode {
  // ... 既有字段
  /**
   * 显式语义角色。与 styles.position/overflow 互不冲突——
   * role 是"产品意图"，CSS 是"渲染指令"。导出代码时 role → CSS。
   */
  role?: NodeRole;
}
```

**第一阶段先支持 sticky-bottom**（覆盖最常见的 tab bar 场景），其他 role 字段定义但渲染层先 noop，避免范围蔓延。

### 2.3 `Viewport`（不变）

`features/design-schema/src/types/viewport.ts` 不动。Viewport 仍然是简单的 `{ name, width, height, dpr, platform }` 数据结构。

---

## 三、design-engine 改造

### 3.1 ViewportContainer 重构

**API 变化**：

```typescript
// 旧
interface ViewportContainerProps {
  viewport: Viewport;
  scale?: number;
  backgroundColor?: string;
  children: React.ReactNode;
  className?: string;
  clipDeviceFrame?: boolean;  // 默认 true
}

// 新
interface ViewportContainerProps {
  /** Frame 物理舞台（必填）。宽固定，高自适应内容（受 minHeight 约束） */
  frame: ScreenFrame;
  /** 当前激活的"取景框"（决定 sticky 锚定 + 编辑器辅助绘制）。可选，无则不显示取景框 */
  activeViewport?: Viewport;
  /** 副取景框列表（远期多 viewport 并存预留，第一阶段不渲染）*/
  extraViewports?: Viewport[];
  scale?: number;
  backgroundColor?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * 编辑器/MCP frame 模式：true = 完整内容铺开（默认）；false = 老行为，按 viewport 高度裁剪。
   * 默认 true。
   */
  unfoldFrame?: boolean;
}
```

**渲染逻辑**：

```
外层 .viewport-container（占满画布区域，padding:24，overflow:auto）
  内层 .viewport-frame:
    width  = frame.width
    height = unfoldFrame ? auto : (activeViewport?.height ?? frame.minHeight ?? 0)
    minHeight = frame.minHeight ?? activeViewport?.height ?? 0
    overflow = unfoldFrame ? 'visible' : 'hidden'
    boxShadow / backgroundColor 不变
    {children}
    {activeViewport && unfoldFrame && (
      <div className="viewport-cutout-overlay" style={{
        position:'absolute', left:0, top:0,
        width: activeViewport.width, height: activeViewport.height,
        border: '1px dashed rgba(13,153,255,0.6)',
        pointerEvents: 'none',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.05)',  // 取景框外淡灰 cutout
      }}/>
    )}
```

第一阶段固定 `unfoldFrame=true`（编辑模式默认展开），预览模式由 PreviewRenderer 控制不显示 viewport-cutout。

### 3.2 SchemaRenderer 根节点适配

`features/design-engine/src/renderer/SchemaRenderer.tsx` 第 152-163 行：

```typescript
// 旧
style={{
  width: '100%',
  minHeight: '100%',
  height: '100%',
  ...
}}

// 新（接受 frame 参数）
style={{
  width: frame ? `${frame.width}px` : '100%',
  minHeight: frame?.minHeight ?? '100%',
  // 不写 height —— 让内容自然撑开
  ...
}}
```

`SchemaRenderer` 的 `Props` 增加 `frame?: ScreenFrame`，Canvas 调用方传入。

第 291-303 行的根节点 `reactStyles` 同步处理：`height: baseStyles.height ?? '100%'` → `height: baseStyles.height` (不再强制 100%)。

### 3.3 sticky 节点定位

新增工具函数 `applyStickyRoleStyles(styles, role, activeViewport)`：

```typescript
function applyStickyRoleStyles(
  styles: React.CSSProperties,
  role: NodeRole | undefined,
  activeViewport: Viewport | undefined,
): React.CSSProperties {
  if (!role || !activeViewport) return styles;
  if (role === 'sticky-bottom') {
    return {
      ...styles,
      position: 'absolute',
      // 锚到激活 viewport 取景框底部 —— 取景框从 top:0 开始，所以底是 activeViewport.height
      top: `${activeViewport.height - (Number(styles.height) || 60)}px`,
      left: 0,
      right: 0,
    };
  }
  if (role === 'sticky-top') {
    return { ...styles, position: 'absolute', top: 0, left: 0, right: 0 };
  }
  return styles;
}
```

调用点：`NodeRenderer` 在 reactStyles 计算之后追加一次。

> ⚠️ 这是**编辑器视图层**的特殊定位，不进 Schema。导出代码时按 `role` → `position: sticky; bottom: 0` 翻译。

### 3.4 一次性 migration（运行时回填，零数据破坏）

新文件 `features/design-engine/src/migration/frameMigration.ts`：

```typescript
import type { Screen, ScreenFrame, Viewport } from '@globallink/design-schema';

/**
 * 给一个 Screen 回填 frame（不修改原对象）。
 *
 * 优先级：
 *   1. screen.frame 已存在 → 原样返回
 *   2. screen.defaultViewport.width → 用它做 width
 *   3. fallbackViewport.width（通常是 project.currentViewport）
 *   4. 都没有 → 默认 375
 */
export function ensureScreenFrame(
  screen: Screen,
  fallbackViewport?: Viewport,
): Screen {
  if (screen.frame) return screen;
  const width =
    screen.defaultViewport?.width ?? fallbackViewport?.width ?? 375;
  const minHeight =
    screen.defaultViewport?.height ?? fallbackViewport?.height;
  const frame: ScreenFrame = minHeight ? { width, minHeight } : { width };
  return { ...screen, frame };
}
```

`SchemaRenderer` 入口处先调用 `ensureScreenFrame`，确保下游永远拿到 `screen.frame`。

---

## 四、MCP `generate_snapshots` 升级

### 4.1 参数扩展

```typescript
// 旧
interface GenerateSnapshotsArgs {
  projectId: string;
  screenIds: string[];
  viewportIds?: string[];
  format?: 'png' | 'jpeg' | 'webp';
}

// 新
interface GenerateSnapshotsArgs {
  projectId: string;
  screenIds: string[];
  viewportIds?: string[];
  format?: 'png' | 'jpeg' | 'webp';
  /**
   * 截图模式：
   *   - 'viewport'（默认，向后兼容）：按 viewport 尺寸截首屏（老行为）
   *   - 'frame'：按 Frame 完整高度截，看长内容全貌
   *   - 'multi-viewport'：同 Screen 跨多个 viewport 并排截
   */
  mode?: 'viewport' | 'frame' | 'multi-viewport';
}
```

### 4.2 实现

第一阶段最小落地：复用现有截图链路，只在 mode='frame' 时把传给截图器的高度从 `viewport.height` 改为 `screen.rootNode` 的实际渲染高度。具体取值：

- 编辑器/MCP 调用方先在 puppeteer/playwright 加载 schema 后等待渲染稳定
- 取 `document.querySelector('[data-screen-id]')` 的 `scrollHeight` 作为 frame 高度
- viewport 的宽不变（按 frame.width 或 viewport.width）

`multi-viewport` 模式留作 P1，第一阶段先 throw `Error('multi-viewport mode not yet implemented')`。

---

## 五、design_front 编辑器配套

### 5.1 Canvas 调用 ViewportContainer 改造

`apps/design_front/src/views/editor/Canvas/index.tsx` 第 606 行：

```tsx
// 旧
<ViewportContainer viewport={viewport} backgroundColor="transparent">

// 新
<ViewportContainer
  frame={ensureScreenFrame(screen, viewport).frame!}
  activeViewport={viewport}
  backgroundColor="transparent"
  unfoldFrame={!editorStore.previewMode}  // 预览模式不展开
>
```

### 5.2 工具栏提示

顶部 viewport 切换按钮旁加一个小图标 + tooltip："Viewport 是观察窗口，不裁剪 Schema 内容"，让设计师明确知道行为变化。

第一阶段不做"添加 / 删除多个 viewport 取景框"的复杂 UI，先让单一取景框工作起来。

### 5.3 节点 role 编辑入口

右侧属性面板"通用属性"区加一行：

```
角色：[ 无 ▼ ]
       └─ 无 / 滚动容器 / 底部固定 / 顶部固定
```

调用 `setNodeRole(nodeId, role)` op。第一阶段只支持 sticky-bottom 的渲染特殊处理，其他选项写入 schema 但渲染不变，等 P1 完善。

### 5.4 design-operations 新 op

`features/design-operations/src/operations/element.ts` 加：

```typescript
export interface SetNodeRoleParams {
  nodeId: string;
  role: NodeRole | null;  // null = 清除
}
```

`features/design-operations/src/operations/screen.ts` 加：

```typescript
export interface UpdateScreenFrameParams {
  screenId: string;
  frame: Partial<ScreenFrame>;  // patch 式更新
}
```

---

## 六、预览模式适配

`features/design-engine/src/preview/PreviewRenderer.tsx` 第 316-329 行的 `embedded` 路径：

```typescript
// 旧
overflow: embedded ? 'hidden' : 'auto',

// 新：embedded 模式按 activeViewport 滚动（让设计师在编辑器里能用预览态滚长内容）
overflow: 'auto',
height: embedded && activeViewport
  ? `${activeViewport.height}px`
  : (fillViewport ? '100%' : undefined),
```

PreviewRenderer 增加可选 `activeViewport` prop，由调用方（Canvas）传入。

---

## 七、文档同步

实施完成后需修订：

1. `02-product/editor/01-canvas/README.md` §九「视口适配」 → 引用本方案，删除"视口=画布物理边界"的旧措辞
2. `02-product/editor/10-preview-mode/README.md` §六「预览视口与设备模拟」 → 引用本方案，更新 embedded 滚动行为
3. `decision-log.md` #17 索引行（已加）

---

## 八、实施顺序与依赖

```
[1] Schema 字段        ─┐
                        ├─→ [3] design-engine 改造 ─→ [5] design_front 接入
[2] design-operations 新 op ─┘                          │
                                                        │
[4] migration 工具 ───────────────────────────────────→[5]
                                                        │
                                                        ▼
                                                  [6] MCP 截图 mode
                                                        │
                                                        ▼
                                                  [7] 端到端验证
                                                        │
                                                        ▼
                                                  [8] 文档同步
```

---

## 九、验证清单

### 单元 / 类型
- [ ] `ScreenFrame` / `NodeRole` 类型导出可用
- [ ] `ensureScreenFrame` 在 `screen.frame == null` 时正确回填
- [ ] `applyStickyRoleStyles` 在 `role='sticky-bottom'` + 有 activeViewport 时输出 absolute + top 计算正确

### 集成（手测）
- [ ] 打开 Music AI Hub 项目 Home 页，能看到 Popular Promt 区（之前被裁）
- [ ] 顶部切换 iPhone 15 → iPad Air，Frame 内容不变，只是取景框换
- [ ] 给浮动 tab bar 节点设 `role: 'sticky-bottom'`，它正确出现在取景框底部
- [ ] 旧项目（schema 无 frame 字段）打开零异常，视觉与之前一致（width 兜底逻辑生效）
- [ ] 预览模式进入后，长内容能滚动浏览

### MCP
- [ ] `generate_snapshots mode='viewport'` 与之前行为完全一致（向后兼容）
- [ ] `generate_snapshots mode='frame'` 拿到完整长截图（高度 > viewport.height）
- [ ] `generate_snapshots mode='multi-viewport'` 报 `not yet implemented`（明确占位）

---

## 十、本期不做（明确推后）

| 项 | 原因 | 计划 |
|---|---|---|
| 多 Viewport 取景框可拖动并存 UI | 交互复杂，先把单 viewport 跑通 | P1 |
| `viewport-scroll` 模式（指定 scrollY 截图）| 需要前端配合发滚动事件给 puppeteer | P1 |
| sticky-top / sticky 嵌套滚动容器 | 优先覆盖 sticky-bottom 这一最常见 case | P1 |
| Frame width 在编辑器右侧面板可改 | 现在通过 viewport 切换间接改即可 | P2 |
| 一次性 SQL migration（持久化 frame 字段）| 运行时回填已能解决 100% 兼容问题 | 可选 |
