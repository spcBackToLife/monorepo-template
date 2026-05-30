/**
 * Meta 操作工具（Schema-First 架构）。
 *
 * 写入"设计意图 / 溯源 / 完成度"到 schema 的 meta 命名空间——这是 product-analyst /
 * interaction-designer / design-planner / design-executor 四个技能记录"为什么这么设计"
 * 的标准入口，替代旧 design-registry 的 product/interaction/design 层。
 *
 * 详见 SCHEMA-FIRST-REFACTOR.md。
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

const ModeSchema = z.enum(['merge', 'replace']).optional()
  .describe('写入模式：merge=深合并（默认，未提供字段保留）；replace=整体替换');

export function registerMetaTools(server: McpServer): void {
  registerDomainTool(server, 'meta',
    '设计意图 / 溯源 / 完成度（B 类信息，渲染契约不读）。' +
    '取代旧 design-registry 的 product/interaction/design 层。',
    {
      set_node: defineAction({
        description:
          '更新节点的 meta（NodeMeta：product / interaction / design / extremeCases / status）。' +
          '默认深合并；mode=replace 整体替换；patch=null 清空整个 meta。' +
          '⚠️ 注意：actions（"点了要做什么"）属 A 类一等字段，应走 event/add，不要塞 meta。',
        schema: z.object({
          projectId: z.string(),
          nodeId: z.string(),
          patch: z.record(z.string(), z.unknown()).nullable()
            .describe('NodeMeta 的 patch（部分字段也可），传 null 清空整个 meta'),
          mode: ModeSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setNode',
            params: { nodeId: p.nodeId, patch: p.patch as never, mode: p.mode },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_node_status: defineAction({
        description:
          '便捷更新节点完成度（NodeStatus：phase + ready{structure/styles/events/visualStates/materials}）。' +
          'phase: analyzed | interaction-defined | designed | built | verified。' +
          '⚠️ ready.* 的真实值会被 integrity checker 直接对账真实 schema，不接受自报。',
        schema: z.object({
          projectId: z.string(),
          nodeId: z.string(),
          status: z.object({
            phase: z.enum(['analyzed', 'interaction-defined', 'designed', 'built', 'verified']),
            ready: z.object({
              structure: z.boolean().optional(),
              styles: z.boolean().optional(),
              events: z.boolean().optional(),
              visualStates: z.boolean().optional(),
              materials: z.boolean().optional(),
            }).optional(),
            notes: z.string().optional(),
          }).nullable(),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setNodeStatus',
            params: { nodeId: p.nodeId, status: p.status as never },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_screen: defineAction({
        description:
          '更新屏幕级 meta（ScreenMeta：product/interaction/design/status）。' +
          '取代旧 design-registry _page.json。',
        schema: z.object({
          projectId: z.string(),
          screenId: z.string(),
          patch: z.record(z.string(), z.unknown()).nullable(),
          mode: ModeSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setScreen',
            params: { screenId: p.screenId, patch: p.patch as never, mode: p.mode },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_project: defineAction({
        description:
          '更新项目级 meta（ProjectMeta：targetUser/coreScenarios/styleDirection/' +
          'constraints/modules/navigation/globalConcerns/plan）。取代旧 design-registry _index.json。\n\n' +
          '⚠️ 严禁在 patch 中传顶层一等字段（globalOverlays / globalStateInit / ' +
          'themeConfig / screens 等）——service 端会拒绝。这些字段渲染契约会读，' +
          '与 meta（B 类）严格分离，请走对应专门 op：\n' +
          '  · globalOverlays  → meta/set_global_overlays\n' +
          '  · globalStateInit → state/global_view_add 等\n' +
          '  · themeConfig     → theme/* 系列',
        schema: z.object({
          projectId: z.string(),
          patch: z.record(z.string(), z.unknown()).nullable(),
          mode: ModeSchema,
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.setProject',
            params: { patch: p.patch as never, mode: p.mode },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      set_global_overlays: defineAction({
        description:
          '设置项目级 globalOverlays（跨屏共享覆盖层节点骨架），整体替换写入 ' +
          '`DesignProject.globalOverlays` 顶层字段（A 类一等字段，渲染契约会读）。\n\n' +
          '与 `Screen.overlays`（屏级）的区别：\n' +
          '  · 屏级：随屏切换销毁\n' +
          '  · 项目级：跨屏共享，持续存在\n\n' +
          '每个 overlay 必须含 id / type / showWhen / rootNode 四个核心字段。' +
          '传 overlays=null 清空整组。\n\n' +
          '⚠️ 严禁通过 meta/set_project 写 globalOverlays——会被拒绝（v2.2 改造）。',
        schema: z.object({
          projectId: z.string(),
          overlays: z.array(z.unknown()).nullable()
            .describe('OverlayNode[] 整组替换值；null 清空'),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'project.setGlobalOverlays',
            params: { overlays: p.overlays as never },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      add_plan_tasks: defineAction({
        description:
          '向计划清单追加任务（不会覆盖已有任务）。' +
          'scope=project 写入 project.meta.plan；scope=screen 写入指定 screen 的 meta.plan。' +
          '每个任务必须含 id（如 T1）/ title / stage / status。可挂 subtasks 实现层级拆解。' +
          '⚠️ 任务 ID 必须唯一；若与已有任务 ID 冲突会拒绝写入。\n\n' +
          '★ expectedArtifacts（产物指纹，强烈推荐声明）：' +
          '任务标 done 时由 service 端机器对账校验。结构：\n' +
          '  [{ kind: "nonEmpty", path: "globalOverlays" }]\n' +
          '  [{ kind: "arrayMin", path: "globalOverlays", min: 1 }]\n' +
          '  [{ kind: "hasKeys", path: "meta.globalConcerns", keys: ["session","network","preferences","navigation","fallback"] }]\n' +
          '  [{ kind: "eachItem", path: "globalOverlays", check: { kind: "hasKeys", path: "$", keys: ["id","type","showWhen","rootNode"] } }]\n' +
          'path 相对根：scope=project → DesignProject 根；scope=screen → Screen 根。\n' +
          '不声明则任务可被自由标 done（旧行为兼容），但失去机器对账保护。',
        schema: z.object({
          projectId: z.string(),
          scope: z.enum(['project', 'screen']),
          screenId: z.string().optional().describe('scope=screen 时必填'),
          tasks: z.array(z.object({
            id: z.string(),
            title: z.string(),
            stage: z.enum(['product', 'theme', 'interaction', 'design', 'executor']),
            status: z.enum(['pending', 'doing', 'done', 'blocked', 'skipped']),
            blockedReason: z.string().optional(),
            refs: z.array(z.string()).optional(),
            subtasks: z.array(z.unknown()).optional(),
            notes: z.string().optional(),
            expectedArtifacts: z.array(z.unknown()).optional()
              .describe('产物指纹数组（ArtifactCheck[]），任务标 done 时机器对账'),
          })).describe('任务列表，每条 PlanTask 结构'),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.addPlanTasks',
            params: {
              scope: p.scope,
              screenId: p.screenId,
              tasks: p.tasks as never,
            },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      update_plan_task: defineAction({
        description:
          '更新单条任务（按 taskId 定位，支持嵌套 subtasks 内的任务）。' +
          '常用：标 done（patch={status:"done"}）、标 blocked（patch={status:"blocked",blockedReason:"..."}）、' +
          '加备注（patch={notes:"..."}）、追加子任务（patch={subtasks:[...]}）。\n\n' +
          '★ 产物指纹机器对账（Schema-First）：' +
          '当 patch.status="done" 时，service 端会对该任务的 expectedArtifacts 跑校验；' +
          '未通过则拒绝写入并返回详细原因。这意味着 AI 不能"自报完成"——schema 必须真有产物。\n' +
          '若任务无需做，改为 status:"skipped" 并在 notes 里写否决理由。',
        schema: z.object({
          projectId: z.string(),
          scope: z.enum(['project', 'screen']),
          screenId: z.string().optional().describe('scope=screen 时必填'),
          taskId: z.string(),
          patch: z.record(z.string(), z.unknown()).describe('部分字段更新；id 不可变'),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.updatePlanTask',
            params: {
              scope: p.scope,
              screenId: p.screenId,
              taskId: p.taskId,
              patch: p.patch as never,
            },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      raise_upstream_challenge: defineAction({
        description:
          '★ 跨阶段回流挑战（v2.3 ★）。下游 SKILL（interaction/design/executor）发现上游产物的某个具体决策' +
          '不利于本阶段最佳实现时使用——把"⛔ 退回上游"硬终止变成"系统协议自驱"的双向反馈环。\n\n' +
          '⚠️ 调用前**必须**先写 challenge md（强模板见 .codebuddy/skills/common/references/challenge.template.md）：\n' +
          '  - 现状（上游产物快照 + 节点 ID/字段值 + 引用上游决策 ID）\n' +
          '  - 问题（红线证据 + ≥3 候选方案对比，含"维持现状"作对照）\n' +
          '  - 影响面声明（targetTaskIds：受影响的上游已 done 任务）\n' +
          '  - 推荐方案 + 产品级理由（多角度论证）\n' +
          '  - 回流后下游续做计划（resumeTaskId）\n\n' +
          'service 端原子动作：\n' +
          '  1. 校验 raisedBy 任务存在 + 当前不 blocked\n' +
          '  2. 校验同一 raisedBy 没有并存 open challenge（R-CHALLENGE-04）\n' +
          '  3. 在 project.meta.plan 末尾追加 stage="product" 的 P-revise-* 任务（含 challenge ref）\n' +
          '  4. 把 raisedBy 任务置 blocked + 写 challenge ref\n\n' +
          '调用成功后：提示用户切到 targetStage 对应 SKILL 接管处理。详见 STAGE-CONTRACT.md §0.1.9。',
        schema: z.object({
          projectId: z.string(),
          challenge: z.object({
            challengeId: z.string()
              .describe('约定：C-<下游阶段简写>-<screenId 简写>-<NN>，如 "C-INT-00-login-001"'),
            challengeMd: z.string()
              .describe('challenge md 相对路径（必须 .md 结尾），如 "analysis-notes/<projectId>/challenges/<challengeId>.md"'),
            raisedBy: z.string().describe('触发本 challenge 的下游任务 ID（如 "I-M1-view-business"）'),
            raisedByScope: z.enum(['project', 'screen']),
            raisedByScreenId: z.string().optional().describe('raisedByScope="screen" 时必填'),
            targetStage: z.enum(['product', 'theme', 'interaction', 'design']),
            targetTaskIds: z.array(z.object({
              taskId: z.string(),
              scope: z.enum(['project', 'screen']),
              screenId: z.string().optional(),
            })).describe('受影响的上游已 done 任务列表（accepted 后会重对账其 expectedArtifacts）'),
          }),
          reviseTaskTitle: z.string()
            .describe('自动追加的 P-revise-* 任务标题，建议格式："[challenge] <一句话产品级标题>"'),
          reviseTaskId: z.string()
            .describe('自动追加的任务 ID，必须以 "P-revise-" 开头；约定 = `P-revise-${challengeId}`'),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.raiseUpstreamChallenge',
            params: {
              challenge: p.challenge as never,
              reviseTaskTitle: p.reviseTaskTitle,
              reviseTaskId: p.reviseTaskId,
            },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
      resolve_upstream_challenge: defineAction({
        description:
          '★ 关闭一个 open challenge（v2.3 ★）。仅由 targetStage 对应的上游 SKILL 调用。\n\n' +
          '⚠️ 调用前**必须**先写 decision md（强模板见 .codebuddy/skills/common/references/decision.template.md）：\n' +
          '  - 决策（accepted / partially / rejected）\n' +
          '  - 理由（产品视角，不能空话）\n' +
          '  - 实施清单（accepted 时：改了哪些 schema 的 MCP 调用清单 + 同步更新的上游 task notes）\n' +
          '  - expectedArtifacts 影响（受影响的产物指纹清单）\n' +
          '  - 给下游的实现指南（accepted: 新结构怎么用 / rejected: 等效不改路径）\n\n' +
          'service 端原子动作：\n' +
          '  1. 标 P-revise-* 任务为 done（accepted）或 skipped（rejected）\n' +
          '  2. unblock raisedBy 任务（恢复 pending；保留 challenge ref 用于追溯）\n' +
          '  3. accepted 时重跑受影响 targetTaskIds 的 expectedArtifacts（R-CHALLENGE-03）\n' +
          '     —— 不通过会拒绝 resolve，要求上游 SKILL 把受影响产物补到位\n' +
          '  4. 所有引用本 challenge 的 task 同步更新 phase/decision/decisionMd\n\n' +
          '调用成功后：提示用户切回原下游 SKILL 续做（raisedBy 任务已恢复 pending）。',
        schema: z.object({
          projectId: z.string(),
          challengeId: z.string(),
          accepted: z.boolean().describe('true=接受改动；false=拒绝（需在 decision md 给等效不改路径）'),
          rationale: z.string().min(10).describe('决策理由（≥10 字符）'),
          decisionMd: z.string().describe('decision md 相对路径（必须 .md 结尾）'),
        }),
        handler: async (p) => {
          const result = await apiClient.executeOperation(p.projectId, {
            type: 'meta.resolveUpstreamChallenge',
            params: {
              challengeId: p.challengeId,
              accepted: p.accepted,
              rationale: p.rationale,
              decisionMd: p.decisionMd,
            },
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
      }),
    },
  );
}
