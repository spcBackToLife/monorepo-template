/**
 * 查询工具 — 合并原 3 个工具为 1 个
 * 原：get_project_info / get_screen_schema / list_screens
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

export function registerQueryTools(server: McpServer): void {
  registerDomainTool(server, 'query', '项目信息查询、屏幕列表、屏幕 Schema 获取', {
    project_info: defineAction({
      description: '获取设计项目的基本信息（名称、平台、屏幕列表、视口、资产数量）',
      schema: z.object({ projectId: z.string() }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        return { content: [{ type:'text', text: JSON.stringify({
          id: prj.id, name: prj.name, platform: prj.platform,
          currentViewport: prj.currentViewport, screenCount: prj.screens.length,
          screens: prj.screens.map(s=>({id:s.id,name:s.name})),
          componentAssetsCount: prj.componentAssets.length,
        }, null, 2) }] };
      },
    }),
    create_project: defineAction({
      description: '创建一个新的设计项目，返回 projectId',
      schema: z.object({ name: z.string(), platform: z.string().optional().default('mobile') }),
      handler: async (p) => {
        const result = await apiClient.createProject({ name: p.name, platform: p.platform });
        return { content: [{ type:'text', text: JSON.stringify(result, null, 2) }] };
      },
    }),
    list_projects: defineAction({
      description: '列出所有设计项目',
      schema: z.object({}),
      handler: async () => {
        const result = await apiClient.listProjects();
        return { content: [{ type:'text', text: JSON.stringify(result, null, 2) }] };
      },
    }),
    screen_schema: defineAction({
      description: '获取指定屏幕的完整 Schema（组件树、样式、交互、状态）',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        const scr = prj.screens.find(s => s.id === p.screenId);
        if (!scr) return { content: [{ type:'text' as const, text: JSON.stringify({ status:'error', error:{ code:'NOT_FOUND', message:`屏幕 ${p.screenId} 不存在`, toolName:'query', action:'screen_schema' } }, null, 2) }], isError: false };
        return { content: [{ type:'text', text: JSON.stringify(scr, null, 2) }] };
      },
    }),
    list_screens: defineAction({
      description: '列出项目的所有屏幕（ID、名称）',
      schema: z.object({ projectId: z.string() }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        return { content: [{ type:'text', text: JSON.stringify(prj.screens.map(s=>({id:s.id,name:s.name})), null, 2) }] };
      },
    }),
    integrity: defineAction({
      description:
        '完成度对账（Schema-First）：基于真实 schema 检查"声明 vs 产物"是否一致。' +
        '规则：R-EVENTS-02（event 写了 trigger 但 actions=[] —— 空壳事件）、' +
        'R-EVENTS-03（effect.fetch 缺 onSuccess/onError —— 沉默失败）、' +
        'R-STATUS-01（ready.events=true 但无任何带 actions 的事件—假完成）、' +
        'R-STATUS-02/03（ready.styles/visualStates=true 但实际为空）、' +
        'R-PHASE-01（phase=verified 但 ready 仍有 false）、' +
        'R-PLAN-01（已 done 任务的 expectedArtifacts 当前不再满足—回归检测）。' +
        '不指定 screenId 则校验整个项目。' +
        '⚠️「该屏有没有真交互」由各 plan 任务的 expectedArtifacts 守（如 anyNodeHasEvents），不在 checker 兜底。',
      schema: z.object({
        projectId: z.string(),
        screenId: z.string().optional().describe('可选：仅校验此屏'),
      }),
      handler: async (p) => {
        const result = await apiClient.getProjectIntegrity(p.projectId, p.screenId);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    }),
    plan: defineAction({
      description:
        '查看任务清单（meta.plan）。scope=project 看项目级总清单；scope=screen 看屏级清单。' +
        '可按 status 过滤（pending/doing/done/blocked/skipped），filter 不传则返回全部。' +
        '返回的任务列表是 schema 内 PlanTask[] 的当前快照，是 AI 推进任务的真理之源。',
      schema: z.object({
        projectId: z.string(),
        scope: z.enum(['project', 'screen']),
        screenId: z.string().optional().describe('scope=screen 时必填'),
        filter: z.enum(['pending', 'doing', 'done', 'blocked', 'skipped', 'all']).optional()
          .describe('按状态过滤；默认 all'),
      }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        let plan: unknown[] = [];
        if (p.scope === 'project') {
          plan = prj.meta?.plan ?? [];
        } else {
          const scr = prj.screens.find(s => s.id === p.screenId);
          if (!scr) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({
              status: 'error',
              error: { code: 'NOT_FOUND', message: `屏幕 ${p.screenId} 不存在`, toolName: 'query', action: 'plan' },
            }, null, 2) }], isError: false };
          }
          plan = scr.meta?.plan ?? [];
        }
        // 过滤
        const filtered = (p.filter && p.filter !== 'all')
          ? filterTasksByStatus(plan as Array<Record<string, unknown>>, p.filter)
          : plan;
        return { content: [{ type: 'text', text: JSON.stringify({
          scope: p.scope,
          screenId: p.screenId,
          total: countTasks(plan as Array<Record<string, unknown>>),
          filtered: countTasks(filtered as Array<Record<string, unknown>>),
          tasks: filtered,
        }, null, 2) }] };
      },
    }),
    next_pending_task: defineAction({
      description:
        '获取下一个待办任务（status=pending 且未被 blocked）。' +
        '深度优先遍历：优先返回最深层未完成的子任务，确保按"由细到粗"推进。' +
        'scope=project 优先项目级；scope=screen 仅看指定屏；不传 scope 时按 project → 各 screen 顺序找第一个。',
      schema: z.object({
        projectId: z.string(),
        scope: z.enum(['project', 'screen', 'auto']).optional().default('auto'),
        screenId: z.string().optional(),
      }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        const scope = p.scope ?? 'auto';

        const findFirst = (tasks: Array<Record<string, unknown>> | undefined): Record<string, unknown> | null => {
          if (!tasks || tasks.length === 0) return null;
          for (const t of tasks) {
            if (t['status'] === 'pending') return t;
            const sub = t['subtasks'] as Array<Record<string, unknown>> | undefined;
            if (sub && sub.length > 0) {
              const found = findFirst(sub);
              if (found) return found;
            }
          }
          return null;
        };

        if (scope === 'screen') {
          const scr = prj.screens.find(s => s.id === p.screenId);
          if (!scr) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({
              status: 'error', error: { code: 'NOT_FOUND', message: `屏幕 ${p.screenId} 不存在` },
            }, null, 2) }], isError: false };
          }
          const next = findFirst(scr.meta?.plan as Array<Record<string, unknown>> | undefined);
          return { content: [{ type: 'text', text: JSON.stringify({
            scope: 'screen', screenId: p.screenId, next: next ?? null,
          }, null, 2) }] };
        }

        if (scope === 'project') {
          const next = findFirst(prj.meta?.plan as Array<Record<string, unknown>> | undefined);
          return { content: [{ type: 'text', text: JSON.stringify({
            scope: 'project', next: next ?? null,
          }, null, 2) }] };
        }

        // auto: 先项目级，再各屏
        const projectNext = findFirst(prj.meta?.plan as Array<Record<string, unknown>> | undefined);
        if (projectNext) {
          return { content: [{ type: 'text', text: JSON.stringify({
            scope: 'project', next: projectNext,
          }, null, 2) }] };
        }
        for (const scr of prj.screens) {
          const screenNext = findFirst(scr.meta?.plan as Array<Record<string, unknown>> | undefined);
          if (screenNext) {
            return { content: [{ type: 'text', text: JSON.stringify({
              scope: 'screen', screenId: scr.id, screenName: scr.name, next: screenNext,
            }, null, 2) }] };
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify({
          scope: 'auto', next: null, message: '所有任务均已完成或无可执行的 pending 任务',
        }, null, 2) }] };
      },
    }),
    list_open_challenges: defineAction({
      description:
        '★ 列出所有未关闭的跨阶段回流挑战（v2.3 ★）。' +
        '上游 SKILL（product/theme/interaction/design）Phase 0 入场门禁必须扫这一项——' +
        '有 phase="open" 且 targetStage 匹配本 SKILL 阶段的 challenge 时，优先级最高，必须接管处理。\n\n' +
        '可选 targetStage 过滤；不传则返回所有 open + accepted-pending 状态的 challenge。\n\n' +
        '返回字段：challengeId / phase / raisedBy / targetStage / targetTaskIds / challengeMd / decisionMd / reviseTaskId。',
      schema: z.object({
        projectId: z.string(),
        targetStage: z.enum(['product', 'theme', 'interaction', 'design']).optional(),
      }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        const all: Array<Record<string, unknown>> = [];
        const seen = new Set<string>();

        const collect = (tasks: Array<Record<string, unknown>> | undefined, _scope: string) => {
          if (!tasks) return;
          for (const t of tasks) {
            const ref = t['upstreamChallenge'] as Record<string, unknown> | undefined;
            if (ref && (ref['phase'] === 'open' || ref['phase'] === 'accepted')) {
              const id = ref['challengeId'] as string;
              if (!seen.has(id)) {
                seen.add(id);
                all.push({
                  challengeId: id,
                  phase: ref['phase'],
                  raisedBy: ref['raisedBy'],
                  raisedByScope: ref['raisedByScope'],
                  raisedByScreenId: ref['raisedByScreenId'],
                  targetStage: ref['targetStage'],
                  targetTaskIds: ref['targetTaskIds'],
                  challengeMd: ref['challengeMd'],
                  decisionMd: ref['decisionMd'],
                  decision: ref['decision'],
                  reviseTaskId: t['id'], // 当前 task 是 P-revise-* 时这就是 revise 任务 id
                });
              }
            }
            const sub = t['subtasks'] as Array<Record<string, unknown>> | undefined;
            if (sub && sub.length > 0) collect(sub, _scope);
          }
        };

        collect(prj.meta?.plan as Array<Record<string, unknown>> | undefined, 'project');
        for (const scr of prj.screens) {
          collect(scr.meta?.plan as Array<Record<string, unknown>> | undefined, `screen:${scr.id}`);
        }

        const filtered = p.targetStage
          ? all.filter((c) => c['targetStage'] === p.targetStage)
          : all;

        return { content: [{ type: 'text', text: JSON.stringify({
          targetStageFilter: p.targetStage ?? null,
          total: all.length,
          filtered: filtered.length,
          challenges: filtered,
        }, null, 2) }] };
      },
    }),
    blocked_tasks: defineAction({
      description:
        '★ 列出所有 status="blocked" 的任务（v2.3 ★）。' +
        '新会话续接 / 任意时刻排查"卡住的任务"时使用。' +
        '返回字段：taskId / scope / screenId / blockedReason / upstreamChallenge（如有）。',
      schema: z.object({
        projectId: z.string(),
      }),
      handler: async (p) => {
        const prj = await apiClient.getProject(p.projectId);
        const all: Array<Record<string, unknown>> = [];

        const collect = (tasks: Array<Record<string, unknown>> | undefined, scope: string, screenId?: string) => {
          if (!tasks) return;
          for (const t of tasks) {
            if (t['status'] === 'blocked') {
              all.push({
                taskId: t['id'],
                title: t['title'],
                stage: t['stage'],
                scope,
                screenId,
                blockedReason: t['blockedReason'],
                upstreamChallenge: t['upstreamChallenge'],
              });
            }
            const sub = t['subtasks'] as Array<Record<string, unknown>> | undefined;
            if (sub && sub.length > 0) collect(sub, scope, screenId);
          }
        };

        collect(prj.meta?.plan as Array<Record<string, unknown>> | undefined, 'project');
        for (const scr of prj.screens) {
          collect(scr.meta?.plan as Array<Record<string, unknown>> | undefined, 'screen', scr.id);
        }

        return { content: [{ type: 'text', text: JSON.stringify({
          total: all.length,
          tasks: all,
        }, null, 2) }] };
      },
    }),
  });
}

// ===== 内部辅助函数 =====

function filterTasksByStatus(
  tasks: Array<Record<string, unknown>>,
  status: string,
): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];
  for (const t of tasks) {
    const matched = t['status'] === status;
    const sub = t['subtasks'] as Array<Record<string, unknown>> | undefined;
    const filteredSub = sub && sub.length > 0 ? filterTasksByStatus(sub, status) : [];
    if (matched || filteredSub.length > 0) {
      result.push({ ...t, subtasks: filteredSub.length > 0 ? filteredSub : undefined });
    }
  }
  return result;
}

function countTasks(tasks: Array<Record<string, unknown>>): number {
  let count = 0;
  for (const t of tasks) {
    count += 1;
    const sub = t['subtasks'] as Array<Record<string, unknown>> | undefined;
    if (sub && sub.length > 0) count += countTasks(sub);
  }
  return count;
}
