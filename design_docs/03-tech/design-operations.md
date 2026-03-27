# design-operations — 操作集合

> **包名：** `@globallink/design-operations` · **模板：** `features/lib-sdk` · **运行环境：** browser
>
> **核心理念：设计工具的所有动作，统一为标准化的 Operation。AI 和人类使用同一套操作。**
>
> 相关文档：[整体架构](./architecture.md) | [design-schema](./design-schema.md) | [design-engine](./design-engine.md) | [design-codegen](./design-codegen.md)

---

## Operation 定义

```typescript
// ===== Operation 定义 =====
interface Operation {
  type: string;
  params: Record<string, any>;
  description: string;           // 人类可读描述（也给 AI 理解）
}
```

---

## 操作分类

```typescript
// 原子元素操作
type PrimitiveOps =
  | { type: "addElement"; params: { parentId: string; tag: string; styles?: CSSProperties; props?: any; position?: number } }
  | { type: "removeElement"; params: { elementId: string } }
  | { type: "moveElement"; params: { elementId: string; newParentId: string; position?: number } }
  | { type: "duplicateElement"; params: { elementId: string } }

// 组件资产操作
type AssetOps =
  | { type: "instantiateTemplate"; params: { templateId: string; parentId: string; position?: number; mode?: "reference" | "detached" } }
  | { type: "saveAsTemplate"; params: { nodeId: string; name: string; category: string; scope: "project" | "team" } }
  | { type: "detachInstance"; params: { nodeId: string } }  // 从引用模式变为脱离模式
  | { type: "syncInstance"; params: { nodeId: string } }    // 重新同步到最新模板

// 样式操作
type StyleOps =
  | { type: "updateStyle"; params: { nodeId: string; styles: Partial<CSSProperties> } }
  | { type: "resetStyle"; params: { nodeId: string; properties: string[] } }

// 状态操作
type StateOps =
  | { type: "addState"; params: { nodeId: string; stateName: string; styles?: any } }
  | { type: "removeState"; params: { nodeId: string; stateName: string } }
  | { type: "updateState"; params: { nodeId: string; stateName: string; styles: any } }
  | { type: "setActiveState"; params: { nodeId: string; stateName: string } }

// 交互操作
type InteractionOps =
  | { type: "addEvent"; params: { nodeId: string; event: ComponentEvent } }
  | { type: "removeEvent"; params: { nodeId: string; eventIndex: number } }
  | { type: "addNavigation"; params: { nodeId: string; trigger: string; targetScreenId: string } }

// 屏幕操作
type ScreenOps =
  | { type: "addScreen"; params: { name: string } }
  | { type: "removeScreen"; params: { screenId: string } }
  | { type: "setActiveScreen"; params: { screenId: string } }

// 视口操作
type ViewportOps =
  | { type: "switchViewport"; params: { viewport: Viewport } }
  | { type: "addViewportPreset"; params: { viewport: Viewport } }
```

---

## 操作执行器

```typescript
class OperationExecutor {
  constructor(project: DesignProject);

  // 执行操作，返回新的 project（不可变更新）
  execute(op: Operation): DesignProject;

  // 批量执行
  executeBatch(ops: Operation[]): DesignProject;

  // 撤销/重做
  undo(): DesignProject;
  redo(): DesignProject;

  // 获取所有可用操作的描述（给 AI 用）
  getAvailableOperations(): OperationDescription[];
}
```

---

## AI 集成关键点

- `getAvailableOperations()` 返回所有操作的结构化描述，作为 AI 的 function calling tools
- AI 可以同时使用原子元素操作（"加一个 div"）和组件资产操作（"用 LoginForm 组件"）
- AI 输出 Operation JSON → `execute()` 执行 → Schema 更新 → 引擎重新渲染
- 所有操作都是原子化的，支持 undo/redo
