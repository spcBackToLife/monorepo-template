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

/**
 * 产物指纹（artifact check）—— PlanTask 标 done 时的机器对账依据。
 *
 * 设计理由（Schema-First 第一性原理）：
 *   - "AI 自报任务完成"不可信；唯一可信的是 schema 真相
 *   - 让任务自己声明"我做完了之后，schema 哪些路径必须满足什么条件"
 *   - service 端在 status: 'done' 时强制校验，校验不过直接拒绝，杜绝假完成
 *
 * `path` 是 dot/bracket 风格的相对路径，从 DesignProject 根开始：
 *   - 普通字段：`globalOverlays` / `meta.globalConcerns.session`
 *   - 数组成员：`screens[0].rootNode.children[0]`
 *   - 通配符：`screens[*].rootNode.children` 表示对每屏分别取
 *
 * 4 类校验器覆盖绝大多数产物形态。要更复杂的检查请加新 kind，不要把表达式塞进 path。
 */
export type ArtifactCheck =
  /** path 处必须非 null/undefined；数组非 [] / 对象非 {} / 字符串非 "" */
  | { kind: 'nonEmpty'; path: string; message?: string }
  /** path 处必须是数组且长度 ≥ min */
  | { kind: 'arrayMin'; path: string; min: number; message?: string }
  /** path 处必须是对象且包含全部 keys（值非空） */
  | { kind: 'hasKeys'; path: string; keys: string[]; message?: string }
  /** path 处必须是数组，对每个元素跑 check（check.path 相对 item，写 "$" 表示 item 自身） */
  | { kind: 'eachItem'; path: string; check: ArtifactCheck; message?: string }
  /**
   * path 处的节点子树（含自身）内必须存在至少 `min` 个节点满足 `events[i].actions.length > 0`
   * （即真正落地的交互——任何合法 EventTrigger 配齐 actions 都算）。
   *
   * 取代旧的 R-EVENTS-01 关键词启发式：用结构判断回答「该屏/该子树有没有真交互」，
   * 零误判、不依赖 meta.summary 自然语言。
   *
   * 典型用法：
   *   - 屏的 `I-X-events` 任务：`{ kind: 'anyNodeHasEvents', path: 'rootNode', min: 1 }`
   *   - 子组件的"必须有点击"：`{ kind: 'anyNodeHasEvents', path: '...SubmitBtn', min: 1 }`
   */
  | { kind: 'anyNodeHasEvents'; path: string; min?: number; message?: string }
  /**
   * 翻译契约（Decision-to-Artifact Mapping）的精确产物指纹（v2.5 ★）。
   *
   * 校验：节点子树（path 起，深度优先）必须存在 id === nodeId 的节点，且：
   *   - events 数组中至少 `min`（默认 1）个 event 满足 actions.length > 0
   *   - 若指定 `trigger`，则要求至少 1 个匹配 trigger 的 event 有非空 actions
   *
   * 设计动机：
   *   - 上游 5 份分析 md（statemachine/operations/loading/errors/boundaries 等）的"翻译契约"段
   *     声明的"决策 → 节点产物"映射，需要 service 端机器对账，避免 AI 在 events 落库时漏译
   *   - 比基于 path 的精确指纹（脆弱，节点位置一变就失效）稳定
   *   - 比 anyNodeHasEvents（粗，只能保证子树有交互）精确
   *
   * 典型用法（写在 events 落库任务的 expectedArtifacts 里）：
   *   - 决策"SubmitBtn 失败时调 ds-login.fetch"
   *     → `{ kind: 'nodeHasEvent', nodeId: 'nd_5a15...', trigger: 'click' }`
   *   - 决策"PhoneInput 失焦校验手机号"
   *     → `{ kind: 'nodeHasEvent', nodeId: 'nd_083c...', trigger: 'blur' }`
   */
  | { kind: 'nodeHasEvent'; nodeId: string; trigger?: string; min?: number; path?: string; message?: string };

/**
 * UpstreamChallenge —— 跨阶段回流挑战的元数据（v2.3 新增 ★）。
 *
 * 设计动机：
 *   - 五角色流水线下游（interaction/design/executor）有时会发现上游产物的某个具体决策
 *     不利于本阶段最佳实现——但旧规则把这种情况一律变成"⛔ 退回上游"硬终止，没有协议、
 *     没有留痕、没有续做路径。
 *   - UpstreamChallenge 把"挑战上游"变成 schema 上的一等公民产物：
 *     1. 下游写 challenge md（强模板要求 ≥3 候选方案 + 影响面声明）
 *     2. 调用 meta.raiseUpstreamChallenge → service 原子地：
 *        a. 在 project.meta.plan 末尾追加一条 stage='product' 的 P-revise-* 任务（含 ref）
 *        b. 把触发任务（raisedBy）置 status='blocked' + blockedReason
 *     3. 上游 SKILL（Phase 0 门禁扫到 open challenge）接管 → 写 decision md → 改 schema
 *     4. 调用 meta.resolveUpstreamChallenge → service 原子地：
 *        a. 标 challenge task 为 done
 *        b. 解 raisedBy 的 blocked → 恢复 pending（如 accepted）
 *        c. 重跑受影响 expectedArtifacts（R-CHALLENGE-03）
 *
 * 详细协议：UPSTREAM-FEEDBACK-PROPOSAL.md / STAGE-CONTRACT.md §0.1.9。
 */
export interface UpstreamChallengeRef {
  /** challenge 唯一 ID，如 "C-INT-00-login-001"（约定：C-<下游阶段简写>-<screenId>-<NN>） */
  challengeId: string;
  /** challenge md 相对路径，如 "analysis-notes/<projectId>/challenges/<challengeId>.md" */
  challengeMd: string;
  /** decision md 相对路径（resolve 时填） */
  decisionMd?: string;
  /** 协商生命周期 */
  phase: 'open' | 'accepted' | 'rejected' | 'resolved';
  /** 触发本 challenge 的下游任务 ID（如 "I-M1-view-business"） */
  raisedBy: string;
  /** 触发任务的 scope（用于 unblock 时定位） */
  raisedByScope: 'project' | 'screen';
  /** 触发任务所属 screen（raisedByScope='screen' 时必填） */
  raisedByScreenId?: string;
  /** 要回流到哪个上游阶段 */
  targetStage: 'product' | 'theme' | 'interaction' | 'design';
  /**
   * 受影响的上游已 done 任务 ID 列表（accepted 后会重跑这些任务的 expectedArtifacts）。
   * 数据形态：[{ taskId, scope, screenId? }]
   */
  targetTaskIds: Array<{
    taskId: string;
    scope: 'project' | 'screen';
    screenId?: string;
  }>;
  /** 决策记录（resolve 时填） */
  decision?: {
    accepted: boolean;
    rationale: string;
    /** ISO 时间戳 */
    appliedAt: string;
  };
}

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
  /**
   * 产物指纹（机器对账）。任务标 done 时由 service 端校验本数组中所有 check：
   *   - 全部通过 → 允许 status: 'done'
   *   - 任一不通过 → 拒绝写入并返回失败原因（AI 必须真把 schema 写到位才能标完成）
   *
   * 注意：跳过 / 阻塞（skipped / blocked）不校验。
   *
   * scope:
   *   - 顶级任务（写在 project.meta.plan）：path 相对 DesignProject 根
   *   - screen 级任务（写在 screen.meta.plan）：path 相对该 Screen 根
   * skipped 状态的任务不参与校验（必须在 notes 里写否决理由）。
   */
  expectedArtifacts?: ArtifactCheck[];
  /**
   * 上游回流挑战的关联引用（v2.3 新增）。
   *
   * 一个任务可能因为 challenge 被 block（raisedBy 任务），也可能本身就是
   * challenge 触发自动追加的 P-revise-* 任务——通过本字段双向连通：
   *   - 触发任务（raisedBy）：upstreamChallenge.phase='open'，本任务 status='blocked'
   *   - revise 任务（自动追加）：本任务 stage='product'，upstreamChallenge.phase 与之同步
   */
  upstreamChallenge?: UpstreamChallengeRef;
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
   * 全局态识别叙事（B 类，渲染不读）。
   * 由 product-analyst 在 P-global-concerns 任务里识别填写，作为后续
   *   - `project.globalStateInit.view.*` 占位
   *   - `project.globalOverlays[]` 节点骨架
   * 的设计依据。每类一段 summary：
   *   - session：认证 / 角色 / token 生命周期
   *   - network：在线 / 离线 / 重连策略
   *   - preferences：主题 / 字号 / 语言 / a11y
   *   - navigation：lastVisited / deepLink / authRedirect
   *   - fallback：全局错误兜底 / session 过期 / 版本升级
   */
  globalConcerns?: {
    session?: { summary: string; ref?: string };
    network?: { summary: string; ref?: string };
    preferences?: { summary: string; ref?: string };
    navigation?: { summary: string; ref?: string };
    fallback?: { summary: string; ref?: string };
  };
  /**
   * 项目级任务清单（跨屏 / 跨模块的整体计划）。
   * - product 阶段：列出"分析哪些模块、规划哪些屏"
   * - design 阶段：列出"建立 ThemeConfig、抽通用组件模板"等项目级任务
   * 单屏内的细化任务挂在 ScreenMeta.plan，本字段只放跨屏粒度的事项。
   */
  plan?: PlanTask[];
}
