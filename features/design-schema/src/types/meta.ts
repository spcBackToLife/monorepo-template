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
}
