import { z } from 'zod';

// ===== DataSource v2 Validators =====

// HTTP 方法
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

// 真实接口配置
export const ApiEndpointSchema = z.object({
  method: HttpMethodSchema,
  path: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  body: z.unknown().optional(),
  responseSchema: z.record(z.string(), z.unknown()).optional(),
});

// Mock 场景
export const MockScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  statusCode: z.number().int().min(100).max(599),
  delay: z.number().nonnegative(),
  isTimeout: z.boolean().optional(),
  responseBody: z.unknown(),
});

// Mock 配置
export const MockConfigSchema = z.object({
  scenarios: z.array(MockScenarioSchema).default([]),
  activeScenarioId: z.string().default(''),
});

// Static 数据源
export const StaticDataSourceSchema = z.object({
  id: z.string().min(1),
  type: z.literal('static'),
  name: z.string().min(1),
  description: z.string().optional(),
  initial: z.unknown(),
});

// Api 数据源
export const ApiDataSourceSchema = z.object({
  id: z.string().min(1),
  type: z.literal('api'),
  name: z.string().min(1),
  description: z.string().optional(),
  endpoint: ApiEndpointSchema,
  mock: MockConfigSchema.optional(),
  autoFetchOnEnter: z.boolean().optional(),
  defaultParams: z.record(z.string(), z.unknown()).optional(),
});

// 联合
export const DataSourceSchema = z.discriminatedUnion('type', [
  StaticDataSourceSchema,
  ApiDataSourceSchema,
]);
