# 状态全景视图 V2 — 技术方案与实施路线

> **一句话定位：全景重做为独立路由页面 + 右侧面板增加状态缩略图预览条，让设计师在编辑态快速浏览、在全景页深度走查。**
>
> 相关文档：
> - [13-全景视图产品设计](../02-product/editor/13-panorama-view/README.md) -- 产品交互方案
> - [04-状态管理系统](../02-product/editor/04-state-system/README.md) -- 三层状态模型
> - [05-数据驱动系统](../02-product/editor/05-data-driven/README.md) -- 全景截图矩阵概念

---

## 一、V1 问题分析

```
V1 实现：
  · panoramaMode 为 MobX observable，在 editorStore 中
  · Canvas/index.tsx 第 584 行: editorStore.panoramaMode ? <PanoramaView /> : <Canvas />
  · 全景直接替换画布区域，左右面板和工具栏仍在
  · 不是独立页面/路由，无法分享 URL
  · 编辑态无法快速预览状态，必须进入全景模式

V2 核心变更：
  1. 全景 → 独立嵌套路由 /editor/:id/panorama
  2. 新增缩略图预览条 → 右侧面板 StateContextBar 下方
  3. 废弃 V1 的 inline 替换模式
```

---

## 二、架构设计

### 2.1 路由结构变更

```
V1 路由：
  /editor/:id              → EditorPage（内含 panoramaMode 切换）

V2 路由（嵌套路由）：
  /editor/:id              → EditorShell（加载+共享状态）
    /                      → EditorWorkspace（画布+面板，即当前编辑器）
    /panorama              → PanoramaPage（全屏全景，页面模式）
    /panorama?node=<id>    → PanoramaPage（全屏全景，组件模式）
```

**关键设计**: EditorShell 负责 `useEditorLoader` 和 MobX store 初始化，渲染 `<Outlet />`。EditorWorkspace 和 PanoramaPage 作为子路由共享同一个 editorStore 单例。

### 2.2 EditorShell 拆分策略

```
当前 EditorPage 的职责拆分：

  EditorShell（新建）:
    ├─ useParams() 获取 id
    ├─ useEditorLoader(id)  → 加载项目、初始化 store
    ├─ useEffect() → 页面退出时 flush 持久化
    ├─ useEffect() → 加载失败时导航回首页
    ├─ Loading spinner / 错误处理
    └─ <Outlet />  → 渲染子路由

  EditorWorkspace（由 EditorPage 改名/提取）:
    ├─ useKeyboardShortcuts()
    ├─ <Toolbar />
    ├─ <PreviewBar />  (when previewMode)
    ├─ <LeftPanel /> + <PanelResizer />
    ├─ <Canvas /> + <BottomToolbar />
    ├─ <RightPanel /> + <PanelResizer />
    ├─ <CodeSplitPane /> (when codeSplitView)
    └─ <AiOperationToast />

  PanoramaPage（新建）:
    ├─ useSearchParams() 获取 ?node=xxx
    ├─ useNavigate() 用于返回
    ├─ useEffect(Esc 键关闭)
    ├─ <PanoramaTopBar />
    └─ <PanoramaGrid />
```

### 2.3 路由配置变更

```typescript
// views/app/index.tsx — V2 路由

import { EditorShell } from '@/views/editor/EditorShell';
import { EditorWorkspace } from '@/views/editor/EditorWorkspace';
import { PanoramaPage } from '@/views/editor/Panorama/PanoramaPage';

<Route
  path="/editor/:id"
  element={
    <PrivateRoute>
      <EditorShell />
    </PrivateRoute>
  }
>
  <Route index element={<EditorWorkspace />} />
  <Route path="panorama" element={<PanoramaPage />} />
</Route>
```

### 2.4 全局架构图

```
┌───────────────────────────────────────────────────────┐
│  EditorShell (/editor/:id)                             │
│  ├─ useEditorLoader(id)                                │
│  ├─ editorStore (MobX singleton, shared by children)   │
│  └─ <Outlet />                                         │
│       │                                                │
│       ├── EditorWorkspace (index route)                 │
│       │   ├─ Toolbar (全景按钮 → navigate('panorama')) │
│       │   ├─ Canvas (不再有 panoramaMode 条件渲染)     │
│       │   ├─ RightPanel                                │
│       │   │   └─ StateContextBar                       │
│       │   │       └─ StatePreviewStrip (NEW)           │
│       │   │           ├─ StatePreviewThumbnail × N     │
│       │   │           └─ "↗ 全景对比" link             │
│       │   └─ ...其他面板                               │
│       │                                                │
│       └── PanoramaPage (/panorama)                     │
│           ├─ PanoramaTopBar                            │
│           │   ├─ BackButton → navigate(-1)             │
│           │   ├─ Title + StateCount                    │
│           │   ├─ FilterSegmented (全部/交互/自定义)    │
│           │   └─ ZoomSlider                            │
│           └─ PanoramaGrid                              │
│               └─ PanoramaCell × N (reused from V1)    │
│                   └─ SchemaRenderer                    │
│                                                        │
└───────────────────────────────────────────────────────┘
```

---

## 三、核心组件设计

### 3.1 EditorShell

```typescript
// views/editor/EditorShell.tsx

export const EditorShell = observer(function EditorShell() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loading = useEditorLoader(id);
  const { message } = AntdApp.useApp();

  // 页面退出时持久化
  useEffect(() => {
    const handlePageExit = () => editorStore.flushPersistOnPageExit();
    const handleVisChange = () => {
      if (document.visibilityState === 'hidden') editorStore.flushPersistOnPageExit();
    };
    window.addEventListener('beforeunload', handlePageExit);
    window.addEventListener('pagehide', handlePageExit);
    document.addEventListener('visibilitychange', handleVisChange);
    return () => {
      window.removeEventListener('beforeunload', handlePageExit);
      window.removeEventListener('pagehide', handlePageExit);
      document.removeEventListener('visibilitychange', handleVisChange);
      editorStore.dispose();
      syncStore.stopSync();
      projectStore.clearCurrent();
    };
  }, []);

  useEffect(() => {
    if (!loading && !editorStore.project) {
      message.error('项目加载失败');
      navigate('/');
    }
  }, [loading, message, navigate]);

  if (loading) return <FullPageSpin />;
  if (!editorStore.project) return null;

  return <Outlet />;
});
```

### 3.2 PanoramaPage

```typescript
// views/editor/Panorama/PanoramaPage.tsx

export const PanoramaPage = observer(function PanoramaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetNodeId = searchParams.get('node');

  const screen = editorStore.activeScreen;
  const project = editorStore.project;
  const viewport = editorStore.currentViewport;

  // 本地 UI 状态
  const [scale, setScale] = useState(targetNodeId ? 1.0 : 0.35);
  const [filter, setFilter] = useState<'all' | 'interaction' | 'custom'>('all');

  // 计算组合
  const combinations = usePanoramaCombinations(screen, targetNodeId, editorStore.currentGlobalStates);

  // 筛选
  const filtered = useMemo(() => {
    if (filter === 'all') return combinations;
    if (filter === 'interaction') return combinations.filter(c => c.category === 'interaction');
    return combinations.filter(c => c.category === 'custom');
  }, [combinations, filter]);

  // Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleCellClick = (combo: PanoramaCombination) => {
    // 应用状态后返回
    if (combo.interactionPreview) {
      editorStore.setPreviewInteractionState(combo.interactionPreview.state);
    } else {
      for (const [key, value] of Object.entries(combo.globalStates)) {
        editorStore.setCurrentGlobalState(key, value);
      }
    }
    navigate(-1);
  };

  // ...render PanoramaTopBar + PanoramaGrid
});
```

### 3.3 PanoramaTopBar

```typescript
// views/editor/Panorama/PanoramaTopBar.tsx

interface PanoramaTopBarProps {
  title: string;
  count: number;
  filter: 'all' | 'interaction' | 'custom';
  onFilterChange: (f: 'all' | 'interaction' | 'custom') => void;
  scale: number;
  onScaleChange: (s: number) => void;
  isComponentMode: boolean;
  onBack: () => void;
}

// 布局：
// [← 返回编辑器]  [🔲 组件/页面全景: Name]  [N个状态]  [全部|交互|自定义]  [缩放slider]
```

### 3.4 usePanoramaCombinations V2

```typescript
// views/editor/Panorama/useCombinations.ts — 增强版

export interface PanoramaCombination {
  id: string;
  label: string;
  /** 'interaction' | 'custom' — 用于筛选和分组 */
  category: 'interaction' | 'custom';
  globalStates: Record<string, string>;
  interactionPreview?: { nodeId: string; state: string };
}

const INTERACTION_STATES = ['default', 'hover', 'pressed', 'focus', 'disabled'];

export function usePanoramaCombinations(
  screen: Screen | undefined,
  targetNodeId: string | null,
  currentGlobalStates: Record<string, string>,
): PanoramaCombination[] {
  return useMemo(() => {
    if (!screen) return [];

    // ===== 组件全景 =====
    if (targetNodeId) {
      const node = findNode(screen.rootNode, targetNodeId);
      if (!node) return [];

      const result: PanoramaCombination[] = [];

      // 交互态
      for (const state of INTERACTION_STATES) {
        result.push({
          id: `interaction-${state}`,
          label: STATE_LABELS[state] ?? state,
          category: 'interaction',
          globalStates: { ...currentGlobalStates },
          interactionPreview: { nodeId: targetNodeId, state },
        });
      }

      // 自定义业务态
      const customStates = (node.states ?? [])
        .filter(s => s.name !== 'default' && !INTERACTION_STATES.includes(s.name));
      for (const s of customStates) {
        result.push({
          id: `custom-${s.name}`,
          label: s.name,
          category: 'custom',
          globalStates: { ...currentGlobalStates },
          interactionPreview: { nodeId: targetNodeId, state: s.name },
        });
      }

      return result;
    }

    // ===== 页面全景 =====
    const domainStates = screen.domainStates ?? [];
    if (domainStates.length === 0) {
      return [{
        id: 'page-default',
        label: '当前状态',
        category: 'custom',
        globalStates: { ...currentGlobalStates },
      }];
    }

    // 多领域态笛卡尔积
    const cartesian = cartesianProduct(
      domainStates.map(ds => ds.values.map(v => ({ varName: ds.name, value: v.value, label: v.label })))
    );

    // 上限 50 组合
    const capped = cartesian.slice(0, 50);

    return capped.map((combo, i) => ({
      id: `page-${i}`,
      label: combo.map(c => c.label || c.value).join(' · '),
      category: 'custom' as const,
      globalStates: {
        ...currentGlobalStates,
        ...Object.fromEntries(combo.map(c => [c.varName, c.value])),
      },
    }));
  }, [screen, targetNodeId, currentGlobalStates]);
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(item => [...combo, item])),
    [[]],
  );
}
```

### 3.5 StatePreviewStrip（右侧面板缩略图条）

```typescript
// panels/RightPanel/StatePreviewStrip.tsx

interface StatePreviewStripProps {
  nodeId: string;
  screen: Screen;
  assets: ComponentTemplate[];
  globalStates: Record<string, string>;
  allStates: Array<{ name: string; label: string }>;
  currentState: string;
  onStateSelect: (stateName: string) => void;
}

export const StatePreviewStrip = observer(function StatePreviewStrip({
  nodeId, screen, assets, globalStates, allStates, currentState, onStateSelect,
}: StatePreviewStripProps) {
  const navigate = useNavigate();
  const expanded = editorStore.statePreviewStripExpanded;
  const MAX_THUMBNAILS = 8;

  const visible = allStates.slice(0, MAX_THUMBNAILS);
  const overflow = allStates.length - MAX_THUMBNAILS;

  return (
    <div className="border-t border-gray-100">
      {/* Header */}
      <div
        className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-gray-50"
        onClick={() => editorStore.toggleStatePreviewStrip()}
      >
        <span className="text-[10px] text-gray-400">
          {expanded ? '▾' : '▸'} 状态预览
        </span>
        <span className="flex-1" />
        <button
          className="text-[10px] text-blue-500 hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`panorama?node=${nodeId}`);
          }}
        >
          ↗ 全景对比
        </button>
      </div>

      {/* Thumbnails */}
      {expanded && (
        <div className="flex gap-2 px-2 pb-2 overflow-x-auto">
          {visible.map(state => (
            <StatePreviewThumbnail
              key={state.name}
              screen={screen}
              assets={assets}
              nodeId={nodeId}
              stateName={state.name}
              label={state.label}
              globalStates={globalStates}
              isActive={currentState === state.name}
              onClick={() => onStateSelect(state.name)}
            />
          ))}
          {overflow > 0 && (
            <button
              className="flex-shrink-0 w-[80px] h-[60px] rounded border border-dashed flex items-center justify-center text-[10px] text-gray-400 hover:text-blue-500 hover:border-blue-400"
              onClick={() => navigate(`panorama?node=${nodeId}`)}
            >
              +{overflow} 更多
            </button>
          )}
        </div>
      )}
    </div>
  );
});
```

### 3.6 StatePreviewThumbnail

```typescript
// panels/RightPanel/StatePreviewThumbnail.tsx

const THUMB_W = 80;
const THUMB_H = 60;
const THUMB_SCALE = 0.1;

export const StatePreviewThumbnail = React.memo(function StatePreviewThumbnail({
  screen, assets, nodeId, stateName, label, globalStates, isActive, onClick,
}: {
  screen: Screen;
  assets: ComponentTemplate[];
  nodeId: string;
  stateName: string;
  label: string;
  globalStates: Record<string, string>;
  isActive: boolean;
  onClick: () => void;
}) {
  const viewport = editorStore.currentViewport;

  return (
    <div
      className="flex-shrink-0 cursor-pointer"
      style={{ width: THUMB_W }}
      onClick={onClick}
    >
      <div
        style={{
          width: THUMB_W,
          height: THUMB_H,
          overflow: 'hidden',
          borderRadius: 6,
          border: isActive ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.08)',
          background: '#fff',
        }}
      >
        <div
          style={{
            width: viewport?.width ?? 375,
            height: viewport?.height ?? 667,
            transform: `scale(${THUMB_SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <SchemaRenderer
            screen={screen}
            assets={assets}
            globalStates={globalStates}
            interactionPreview={{ nodeId, state: stateName }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 10,
          color: isActive ? '#3b82f6' : '#94a3b8',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
    </div>
  );
});
```

---

## 四、Store 变更

### 4.1 editorStore 变更

```typescript
// stores/editor/index.ts — 变更摘要

class EditorStore {
  // ===== 删除 =====
  // panoramaMode = false;               ← 删除，由路由替代
  // panoramaTargetNodeId: string | null  ← 删除，由 URL query param 替代

  // ===== 新增 =====
  /** 状态预览缩略图条是否展开（持久化到 localStorage） */
  statePreviewStripExpanded = true;

  // ===== 删除的方法 =====
  // setPanoramaMode(enabled, targetNodeId) ← 删除

  // ===== 新增方法 =====
  toggleStatePreviewStrip(): void {
    this.statePreviewStripExpanded = !this.statePreviewStripExpanded;
    localStorage.setItem('statePreviewStripExpanded', String(this.statePreviewStripExpanded));
  }

  // constructor 中：
  // this.statePreviewStripExpanded = localStorage.getItem('statePreviewStripExpanded') !== 'false';
}
```

---

## 五、文件变更清单

### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `views/editor/EditorShell.tsx` | 从 EditorPage 提取的 Shell 组件 |
| `views/editor/Panorama/PanoramaPage.tsx` | 全屏全景路由页 |
| `views/editor/Panorama/PanoramaTopBar.tsx` | 全景顶栏（返回/标题/筛选/缩放） |
| `views/editor/Panorama/PanoramaGrid.tsx` | 全景网格布局 |
| `panels/RightPanel/StatePreviewStrip.tsx` | 状态缩略图预览条 |
| `panels/RightPanel/StatePreviewThumbnail.tsx` | 单个状态缩略图 |

### 修改文件

| 文件路径 | 变更 |
|----------|------|
| `views/app/index.tsx` | `/editor/:id` 改为嵌套路由，添加 `/panorama` 子路由 |
| `views/editor/index.tsx` | 重命名为 EditorWorkspace，移除 Shell 职责（useEditorLoader 等） |
| `stores/editor/index.ts` | 删除 `panoramaMode`/`panoramaTargetNodeId`，新增 `statePreviewStripExpanded` |
| `views/editor/Canvas/index.tsx` | 删除 `editorStore.panoramaMode ? <PanoramaView />` 条件渲染 |
| `views/editor/Toolbar/index.tsx` | 全景按钮改为 `navigate('panorama?node=...')` |
| `views/editor/Panorama/useCombinations.ts` | 增加 `category` 字段，支持多领域态笛卡尔积 |
| `views/editor/Panorama/PanoramaCell.tsx` | 小幅增强（分类支持） |
| `panels/RightPanel/StateContextBar.tsx` | 底部添加 `<StatePreviewStrip />` |

### 废弃文件

| 文件路径 | 说明 |
|----------|------|
| `views/editor/Panorama/PanoramaView.tsx` | 被 PanoramaPage 替代，可删除或标记 deprecated |

---

## 六、性能策略

### 6.1 缩略图条（8 个 SchemaRenderer @ scale=0.1）

```
每个缩略图：
  · SchemaRenderer 在 scale=0.1 渲染（375×667 视口 → 37.5×66.7 实际像素）
  · pointerEvents: none — 不附加事件监听器
  · React.memo — 用 (nodeId + stateName + schemaVersion) 作为比较键
  · Schema 变更后 300ms debounce 重渲染（避免拖拽时频繁更新）
  · 最多 8 个缩略图 — 超出用 "+N 更多" badge

性能预算：
  · 初始渲染（8 个缩略图）: < 200ms
  · Schema 变更后更新: < 100ms
  · 内存增量: < 10MB
```

### 6.2 全景页（5-50 个 SchemaRenderer）

```
组件全景（5-20 个格子，scale=1.0）：
  · 组件通常很小（100-300px），DOM 量少
  · 直接全部渲染，无需虚拟化

页面全景（3-50 个格子，scale=0.35）：
  · 每个格子是完整页面渲染
  · > 12 个格子时启用 IntersectionObserver 虚拟化
  · 首屏渲染 6 个，滚动时按需加载
  · content-visibility: auto 给不可见格子

性能预算：
  · 全景页打开（路由切换 + 首屏渲染）: < 300ms
  · 5 个状态格子全部渲染: < 500ms
  · 50 个状态格子首屏渲染: < 800ms
  · 返回编辑器: < 100ms
```

---

## 七、分步实施路线

### Step 1: EditorShell 拆分 + 路由重构 (1d)

```
任务：
  1. 创建 EditorShell.tsx，从 EditorPage 提取 Shell 逻辑
  2. 将 EditorPage 重命名为 EditorWorkspace.tsx
  3. 修改 views/app/index.tsx 路由配置
  4. 验证编辑器正常工作（路由变更不影响功能）
  5. 预留 /panorama 路由（先放空白页面）

验证：
  · /editor/:id 编辑器正常加载和使用
  · /editor/:id/panorama 显示空白占位
  · 浏览器前进后退正常
```

### Step 2: PanoramaPage 全景路由页 (2d)

```
任务：
  1. 创建 PanoramaPage.tsx — 全屏全景页
  2. 创建 PanoramaTopBar.tsx — 顶栏
  3. 创建 PanoramaGrid.tsx — 网格布局
  4. 增强 useCombinations.ts — 添加 category 字段
  5. 增强 PanoramaCell.tsx — 支持分类分隔线
  6. 修改 Toolbar — 全景按钮改为 navigate
  7. 删除 Canvas 中的 panoramaMode 条件渲染
  8. 删除 editorStore 中的 panoramaMode/panoramaTargetNodeId
  9. Esc 关闭全景、Cmd+Shift+P 打开全景

验证：
  · 选中组件 → 点全景 → /panorama?node=xxx
  · 交互态和自定义态分区展示
  · 筛选器正常工作（全部/交互/自定义）
  · 缩放滑块正常工作
  · 点击格子 → 返回编辑器 + 状态切换
  · Esc / 浏览器后退正常关闭
  · 无选中 → 点全景 → 页面全景
```

### Step 3: StatePreviewStrip 缩略图条 (2d)

```
任务：
  1. 创建 StatePreviewStrip.tsx
  2. 创建 StatePreviewThumbnail.tsx
  3. 修改 StateContextBar.tsx — 添加缩略图条
  4. editorStore 新增 statePreviewStripExpanded
  5. 性能优化: debounce、React.memo、MAX_THUMBNAILS

验证：
  · 选中按钮 → 右侧面板出现缩略图条
  · 缩略图实时反映各状态视觉差异
  · 当前激活状态有高亮边框
  · 点击缩略图切换编辑状态
  · "↗ 全景对比" 跳转全景路由
  · 折叠/展开持久化
  · 不阻塞编辑操作
```

### Step 4: 增强组合与矩阵布局 (1d)

```
任务：
  1. useCombinations 支持多领域态笛卡尔积
  2. 组合上限 50 个 + 超出警告
  3. 页面全景优化（视觉分组/标签）

验证：
  · 页面有 2 个领域态变量 → 笛卡尔积正确
  · > 50 组合时显示警告
```

### Step 5: 清理 + 端到端验证 (0.5d)

```
任务：
  1. 删除废弃的 PanoramaView.tsx
  2. 更新现有的全景相关测试/引用
  3. 端到端验证所有场景
  4. 清理 console.log 等调试代码

验证：
  · 完整流程走通
  · 无控制台报错
  · 构建正常
```

---

## 八、里程碑总览

```
Step 1 (1d)       Step 2 (2d)       Step 3 (2d)       Step 4 (1d)
   │                 │                 │                 │
   ▼                 ▼                 ▼                 ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐
│ Shell    │  │ 全景路由页   │  │ 缩略图条     │  │ 增强组合 │
│ 拆分+路由│→│ 全屏+分类    │→│ 编辑态预览   │→│ 笛卡尔积 │
│          │  │ +筛选+缩放   │  │ +折叠+性能   │  │ +矩阵    │
└──────────┘  └──────────────┘  └──────────────┘  └──────────┘

总计: ~6.5d（约 1 周）

Step 1-2: 解决"全景不是独立页面"的核心体验问题
Step 3: 解决"编辑态看不到状态预览"的日常痛点
Step 4: 增强页面全景的多维度支持

建议 Step 2 和 Step 3 可以并行开发（无代码依赖）。
```

---

## 九、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| EditorShell 拆分可能引入回归 | 高 | Shell 只提取 loader/cleanup 逻辑，Workspace 保持原样；拆完立即验证 |
| 路由变更破坏深链接 | 中 | `/editor/:id` 仍然工作（index route = Workspace），只新增 `/panorama` 子路由 |
| 缩略图条 8 个 SchemaRenderer 卡顿 | 中 | scale=0.1 极小 DOM，debounce 300ms，React.memo |
| 页面全景 50 个格子内存占用 | 低 | IntersectionObserver 虚拟化 + content-visibility: auto |
| useEditorLoader 在子路由间共享状态丢失 | 高 | Shell 负责 loader，store 是 MobX 单例不会重建；子路由切换不触发 loader |
