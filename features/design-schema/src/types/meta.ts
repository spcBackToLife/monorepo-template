/**
 * 设计意图 / 溯源 / 完成度 —— B 类信息命名空间（Schema-First 架构）
 *
 * 关联：SCHEMA-FIRST-REFACTOR.md §4
 *
 * 设计原则：
 *   - 渲染契约（SchemaRenderer / PreviewRenderer / codegen）**一律不读** meta。
 *   - meta 承载"为什么这么设计"（产品需求 / 交互叙事 / 视觉理由 / 完成度），
 *     而"是什么"（events.actions / styles / stateInit 等运行时产物）走 schema 一等字段。
 *   - 取代旧的 design-registry 三层（_index / _page / 节点 JSON 的 product/interaction/design 层）。
 */

/** 单条任务（计划单元） */
export interface PlanTask {
  /** 任务 ID（如 "T1" / "P0-001"） */
  id: string;
  /** 任务标题（人话） */
  title: string;
  /** 哪个阶段产生（product/theme/interaction/design/executor） */
  stage: 'product' | 'theme' | 'interaction' | 'design' | 'executor';
  /** 任务状态 */
  status: 'pending' | 'doing' | 'done' | 'blocked' | 'skipped';
  /** 阻塞原因（status = blocked 时填） */
  blockedReason?: string;
  /** 关联的产物（如 schema 路径 / 节点 ID / module ID） */
  refs?: string[];
  /** 子任务（递归，用于"模块 → 屏 → 组件"层级拆解） */
  subtasks?: PlanTask[];
  /** 任务备注（思考过程 / 决策记录） */
  notes?: string;
}

/** 节点/屏幕的实现完成度阶段 */
export type DesignPhase =
  | 'analyzed'              // 产品分析完成
  | 'interaction-defined'  // 交互（events/state）已结构化
  | 'designed'             // 视觉（styles/visualStates）已完成
  | 'built'                // 已搭建到 schema
  | 'verified';            // 已校验通过

/**
 * 完成度追踪（取代 registry 的 implementation.checklist）。
 *
 * ⚠️ `ready` 各维度由 **schema 校验器自动核验**（读真实 schema 算账），
 * 不再由 LLM 人工自报——杜绝"假完成"。
 */
export interface NodeStatus {
  phase: DesignPhase;
  ready?: {
    structure?: boolean;
    styles?: boolean;
    events?: boolean;
    visualStates?: boolean;
    materials?: boolean;
  };
  notes?: string;
}

/** 单条边界场景分析 */
export interface ExtremeCase {
  scenario: string;
  handling: string;
}

/** 节点级设计意图 / 溯源（B 类，渲染不读） */
export interface NodeMeta {
  /** 产品层：该节点承担的需求、来源模块、业务规则 */
  product?: {
    summary?: string;
    fromModules?: string[];
    rules?: string[];
    ref?: string;
  };
  /**
   * 交互层：状态机叙事、流程说明（结论性）。
   * ⚠️ 具体"做什么"（actions）已在 node.events 里结构化，这里只放"为什么/流程描述"。
   */
  interaction?: {
    summary?: string;
    states?: string[];
    flows?: Record<string, string>;
    ref?: string;
  };
  /** 视觉层：设计理由、配色意图、素材说明 */
  design?: {
    summary?: string;
    rationale?: string;
    ref?: string;
  };
  /** 边界场景分析 */
  extremeCases?: ExtremeCase[];
  /** 完成度 */
  status?: NodeStatus;
}

/** 屏幕级设计意图 / 溯源（对应旧 registry _page.json 的 product/interaction/design 层） */
export interface ScreenMeta {
  product?: {
    summary?: string;
    fromModules?: string[];
    rules?: string[];
    ref?: string;
  };
  interaction?: {
    summary?: string;
    states?: string[];
    /** 操作 → 触发节点路径（叙事用；真实事件在节点 events 上） */
    operations?: { op: string; triggerNodePath: string }[];
    ref?: string;
  };
  design?: {
    summary?: string;
    palette?: string[];
    ref?: string;
  };
  /**
   * 屏幕级任务清单（精细化追踪本屏每个阶段的待办）。
   * 由各阶段 SKILL 在分析时填写，做完一项标 done，AI 每轮可读出"还剩什么"。
   * 取代旧的 PLAN.md 文件，作为本屏进度的真理之源。
   */
  plan?: PlanTask[];
  status?: NodeStatus;
}

/** 项目级设计意图 / 溯源（对应旧 registry _index.json） */
export interface ProjectMeta {
  targetUser?: { summary: string; ref?: string };
  coreScenarios?: { id: string; summary: string; ref?: string }[];
  styleDirection?: { summary: string; ref?: string };
  constraints?: {
    decisions: { id: string; summary: string; ref?: string }[];
  };
  modules?: Record<
    string,
    { name: string; priority: string; summary: string; ref?: string }
  >;
  /**
   * 导航流转图（A 类导航的溯源补充）。
   * 每条 flow 对应一个 nav.go action；此处保留人类可读的流转全貌。
   */
  navigation?: {
    tabBar: string[];
    flows: { from: string; to: string; trigger: string; transition: string }[];
  };
  /**
   * 项目级任务清单（跨屏 / 跨模块的整体计划）。
   * - product 阶段：列出"分析哪些模块、规划哪些屏"
   * - design 阶段：列出"建立 ThemeConfig、抽通用组件模板"等项目级任务
   * 单屏内的细化任务挂在 ScreenMeta.plan，本字段只放跨屏粒度的事项。
   */
  plan?: PlanTask[];
}
