/**
 * 数据源（v2 endpoint+mock 共存模型）
 *
 * 与 design-operations 的 dataSource.* op 一一对应。
 * 与 v1 区别：
 *   - 不再有 phase / scenarios 顶层概念，mock 场景挂在 ApiDataSource.mock.scenarios 下
 *   - endpoint 直接挂在 ApiDataSource 下，不分 design/develop/production
 *   - StaticDataSource 用 initial 字段表示常量数据
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  ApiDataSource,
  StaticDataSource,
  ApiEndpoint,
  NetworkPolicy,
  MockScenario,
  Expression,
  DataSourceTypeDef,
} from '@globallink/design-schema';
import { registerDomainTool, defineAction } from '../helpers/registerDomainTool.js';
import { apiClient } from '../../api-client.js';

const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);

// 标准化错误码（NetworkPolicy.retryOn 用）
const ErrorCodeSchema = z.enum(['TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR']);

// 网络层策略（v2.6）：超时 / 重试
const NetworkPolicySchema = z.object({
  timeout: z.number().int().positive().optional()
    .describe('整个请求超时（毫秒）；触发后 status=error + error.code=TIMEOUT'),
  retryCount: z.number().int().nonnegative().max(10).optional()
    .describe('重试次数（不含首次）；默认 0'),
  retryDelay: z.number().int().nonnegative().optional()
    .describe('重试间隔基数（毫秒），指数退避：实际间隔 = retryDelay * 2^attempt；默认 1000ms'),
  retryOn: z.array(ErrorCodeSchema).optional()
    .describe('哪些错误码触发重试；默认 [TIMEOUT, NETWORK_ERROR]（不重试业务错）'),
});

const EndpointSchema = z.object({
  method: HttpMethodSchema,
  path: z.string().describe('如 "/api/chat/list" 或 "{{state.view.host}}/foo"'),
  headers: z.record(z.string(), z.string()).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  body: z.record(z.string(), z.unknown()).optional().describe('对象或表达式字符串；GET 不填'),
  responseSchema: z.record(z.string(), z.unknown()).optional(),
  networkPolicy: NetworkPolicySchema.optional().describe('网络层策略（v2.6）：超时/重试；undefined = 沿用平台默认'),
});

const MockScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  statusCode: z.number().int().describe('HTTP 状态码，如 200/404/500'),
  delay: z.number().int().nonnegative().describe('模拟网络延迟 ms'),
  isTimeout: z.boolean().optional(),
  responseBody: z.unknown(),
});

const TypeFieldSchema = z.object({
  name: z.string(),
  type: z.string().describe('TypeScript 类型，如 "string", "number", "\'user\' | \'assistant\'", "Message[]"'),
  optional: z.boolean().optional(),
  description: z.string().optional(),
});

const TypeDefSchema = z.object({
  responseName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/)
    .describe('响应类型名，PascalCase。如 "Message", "UserProfile", "ChatSendResponse"'),
  responseShape: z.enum(['array', 'object']),
  responseFields: z.array(TypeFieldSchema),
  paramsName: z.string().regex(/^[A-Z][a-zA-Z0-9]*$/).optional()
    .describe('请求参数类型名（POST/PUT 时有 body 的情况），如 "ChatSendParams"'),
  paramsFields: z.array(TypeFieldSchema).optional(),
});

export function registerDataSourceTools(server: McpServer): void {
  registerDomainTool(server, 'data_source', '数据源（static / api endpoint+mock 共存）的 CRUD、Mock 场景管理与配置', {
    list: defineAction({
      description: '列出指定屏幕的所有数据源（含 endpoint 与 mock.scenarios，活动 mock 场景由 mock.activeScenarioId 标识）',
      schema: z.object({ projectId: z.string(), screenId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.listDataSources(p.projectId, p.screenId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    add: defineAction({
      description:
        '创建数据源。type=static → 提供 initial（常量数据）。type=api → 同时提供 endpoint（真实接口配置）与至少一个 mock 场景（编辑期可用）。' +
        'autoFetchOnEnter 控制是否在 screenEnter 时自动 fetch（默认 false）。',
      schema: z.object({
        projectId: z.string(),
        screenId: z.string(),
        id: z.string().describe('数据源 ID（屏幕内唯一），表达式中以 state.effects.<id>.* 引用'),
        name: z.string(),
        type: z.enum(['static', 'api']),
        description: z.string().optional(),
        // static
        initial: z.unknown().optional().describe('static 类型必填'),
        // api
        endpoint: EndpointSchema.optional().describe('api 类型必填'),
        autoFetchOnEnter: z.boolean().optional(),
        defaultParams: z.record(z.string(), z.unknown()).optional(),
        mockScenarios: z.array(MockScenarioSchema).optional().describe('api 类型至少 1 条；首条作为初始 active'),
        activeMockScenarioId: z.string().optional(),
        typeDef: TypeDefSchema.optional().describe('类型定义。api 类型必填，AI 必须根据接口设计提供完整的 TypeScript 类型信息'),
      }),
      handler: async (p) => {
        let dataSource: StaticDataSource | ApiDataSource;
        if (p.type === 'static') {
          dataSource = {
            id: p.id,
            name: p.name,
            type: 'static',
            description: p.description,
            initial: p.initial ?? null,
          };
        } else {
          if (!p.endpoint) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'api type requires endpoint' }) }] };
          }
          // p.endpoint 来自 zod，body 是 Record<string, unknown> 与 ApiEndpoint.body 兼容
          const endpoint = p.endpoint as unknown as ApiEndpoint;
          const scenarios: MockScenario[] = (p.mockScenarios ?? []) as unknown as MockScenario[];
          const activeId = p.activeMockScenarioId ?? scenarios[0]?.id ?? '';
          const apiDs: ApiDataSource = {
            id: p.id,
            name: p.name,
            type: 'api',
            description: p.description,
            endpoint,
            autoFetchOnEnter: p.autoFetchOnEnter ?? false,
          };
          if (p.defaultParams) {
            apiDs.defaultParams = p.defaultParams as Record<string, Expression | unknown>;
          }
          if (scenarios.length > 0) {
            apiDs.mock = { scenarios, activeScenarioId: activeId };
          }
          if (p.typeDef) {
            apiDs.typeDef = p.typeDef as unknown as DataSourceTypeDef;
          }
          dataSource = apiDs;
        }
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.add',
          params: { screenId: p.screenId, dataSource },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    remove: defineAction({
      description: '删除数据源',
      schema: z.object({ projectId: z.string(), screenId: z.string(), dataSourceId: z.string() }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.remove',
          params: { screenId: p.screenId, dataSourceId: p.dataSourceId },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    update: defineAction({
      description: '更新数据源元信息（name / description / autoFetchOnEnter / typeDef）',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        autoFetchOnEnter: z.boolean().optional().describe('仅 api 类型生效'),
        typeDef: TypeDefSchema.optional().describe('类型定义（仅 api 类型生效）'),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.update',
          params: {
            screenId: p.screenId,
            dataSourceId: p.dataSourceId,
            name: p.name,
            description: p.description,
            autoFetchOnEnter: p.autoFetchOnEnter,
            typeDef: p.typeDef as unknown as DataSourceTypeDef | undefined,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    set_endpoint: defineAction({
      description: '设置/替换 api 数据源的 endpoint（method/path/headers/query/body/responseSchema/networkPolicy）',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(),
        endpoint: EndpointSchema,
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.setEndpoint',
          params: { screenId: p.screenId, dataSourceId: p.dataSourceId, endpoint: p.endpoint as unknown as ApiEndpoint },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    set_network_policy: defineAction({
      description:
        '设置/清空 api 数据源的网络层策略（v2.6 ★：timeout / retryCount / retryDelay / retryOn）。' +
        '粒度细于 set_endpoint —— 只动 endpoint.networkPolicy 子结构，避免误重置 method/path/body。' +
        '运行时 EffectExecutor 会按此策略：timeout 触发自动 abort + error.code="TIMEOUT"；retryCount + 指数退避重试。' +
        '传 null 清空策略（恢复"无超时无重试"默认）。',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(),
        networkPolicy: NetworkPolicySchema.nullable()
          .describe('null 清空；对象设置：{ timeout?, retryCount?, retryDelay?, retryOn? }'),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.setNetworkPolicy',
          params: {
            screenId: p.screenId,
            dataSourceId: p.dataSourceId,
            networkPolicy: p.networkPolicy as NetworkPolicy | null,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    set_default_params: defineAction({
      description: '设置 api 数据源的默认 params（effect.fetch 不传 params 时使用）；传 null 清空',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(),
        defaultParams: z.record(z.string(), z.unknown()).nullable(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.setDefaultParams',
          params: {
            screenId: p.screenId,
            dataSourceId: p.dataSourceId,
            defaultParams: p.defaultParams as Record<string, Expression | unknown> | null,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    set_static_initial: defineAction({
      description: '更新 static 数据源的 initial 常量数据',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(),
        initial: z.unknown(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.setStaticInitial',
          params: { screenId: p.screenId, dataSourceId: p.dataSourceId, initial: p.initial },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    add_mock_scenario: defineAction({
      description: '为 api 数据源添加一个 Mock 场景（statusCode / delay / responseBody / 可选 isTimeout）',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(),
        scenario: MockScenarioSchema,
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.addMockScenario',
          params: { screenId: p.screenId, dataSourceId: p.dataSourceId, scenario: p.scenario as unknown as MockScenario },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    update_mock_scenario: defineAction({
      description: '局部更新 Mock 场景（仅传需要改的字段）',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), scenarioId: z.string(),
        changes: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          statusCode: z.number().int().optional(),
          delay: z.number().int().nonnegative().optional().describe('网络延迟 ms'),
          isTimeout: z.boolean().optional(),
          responseBody: z.unknown().optional(),
        }),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.updateMockScenario',
          params: {
            screenId: p.screenId,
            dataSourceId: p.dataSourceId,
            scenarioId: p.scenarioId,
            changes: p.changes as Partial<MockScenario>,
          },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    remove_mock_scenario: defineAction({
      description: '删除某个 Mock 场景（如果删的是 active，会自动切到剩余首个）',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), scenarioId: z.string(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.removeMockScenario',
          params: { screenId: p.screenId, dataSourceId: p.dataSourceId, scenarioId: p.scenarioId },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),

    switch_mock_scenario: defineAction({
      description: '切换 api 数据源当前激活的 Mock 场景（编辑期 / 预览 mock 模式生效）',
      schema: z.object({
        projectId: z.string(), screenId: z.string(), dataSourceId: z.string(), scenarioId: z.string(),
      }),
      handler: async (p) => {
        const result = await apiClient.executeOperation(p.projectId, {
          type: 'dataSource.switchMockScenario',
          params: { screenId: p.screenId, dataSourceId: p.dataSourceId, scenarioId: p.scenarioId },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    }),
  });
}
