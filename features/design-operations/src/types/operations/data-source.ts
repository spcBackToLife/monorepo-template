/**
 * DataSource 操作 op 类型（endpoint + mock 共存模型）。
 *
 * Mock scenario: statusCode + delay + responseBody，不再有 phase 概念。
 * endpoint 直接挂在 ApiDataSource 下。
 */

import type {
  StaticDataSource,
  ApiDataSource,
  ApiEndpoint,
  NetworkPolicy,
  MockScenario,
  Expression,
  DataSourceTypeDef,
} from '@globallink/design-schema';

/**
 * 创建数据源（联合 static / api）。
 *
 * 调用方负责完整提供数据，executor 不在内部产生随机值，保证重放确定性。
 */
export interface DataSourceAddOp {
  type: 'dataSource.add';
  params: {
    screenId: string;
    dataSource: StaticDataSource | ApiDataSource;
  };
}

export interface DataSourceRemoveOp {
  type: 'dataSource.remove';
  params: {
    screenId: string;
    dataSourceId: string;
  };
}

/** 改 name / description */
export interface DataSourceUpdateOp {
  type: 'dataSource.update';
  params: {
    screenId: string;
    dataSourceId: string;
    name?: string;
    description?: string;
    /** api 数据源专属：是否在 screenEnter 时自动 fetch */
    autoFetchOnEnter?: boolean;
    /** api 数据源专属：类型定义元数据 */
    typeDef?: DataSourceTypeDef;
  };
}

/** 改 api 数据源的 endpoint 配置（method/path/headers/query/body/responseSchema/networkPolicy） */
export interface DataSourceSetEndpointOp {
  type: 'dataSource.setEndpoint';
  params: {
    screenId: string;
    dataSourceId: string;
    endpoint: ApiEndpoint;
  };
}

/**
 * 改 api 数据源的网络层策略（v2.6 ★）。
 * 粒度细于 setEndpoint，只动 networkPolicy 子结构，避免误重置 method/path/body。
 */
export interface DataSourceSetNetworkPolicyOp {
  type: 'dataSource.setNetworkPolicy';
  params: {
    screenId: string;
    dataSourceId: string;
    /** 传 null 清空策略 */
    networkPolicy: NetworkPolicy | null;
  };
}

/** 改 api 数据源的 defaultParams */
export interface DataSourceSetDefaultParamsOp {
  type: 'dataSource.setDefaultParams';
  params: {
    screenId: string;
    dataSourceId: string;
    /** 传 null 清空 */
    defaultParams: Record<string, Expression | unknown> | null;
  };
}

/** 改 static 数据源的 initial */
export interface DataSourceSetStaticInitialOp {
  type: 'dataSource.setStaticInitial';
  params: {
    screenId: string;
    dataSourceId: string;
    initial: unknown;
  };
}

// ===== Mock scenario CRUD（仅 api 数据源；写入 dataSource.mock） =====

export interface DataSourceAddMockScenarioOp {
  type: 'dataSource.addMockScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenario: MockScenario;
  };
}

export interface DataSourceUpdateMockScenarioOp {
  type: 'dataSource.updateMockScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenarioId: string;
    changes: Partial<MockScenario>;
  };
}

export interface DataSourceRemoveMockScenarioOp {
  type: 'dataSource.removeMockScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenarioId: string;
  };
}

export interface DataSourceSwitchMockScenarioOp {
  type: 'dataSource.switchMockScenario';
  params: {
    screenId: string;
    dataSourceId: string;
    scenarioId: string;
  };
}

export type DataSourceOperation =
  | DataSourceAddOp
  | DataSourceRemoveOp
  | DataSourceUpdateOp
  | DataSourceSetEndpointOp
  | DataSourceSetNetworkPolicyOp
  | DataSourceSetDefaultParamsOp
  | DataSourceSetStaticInitialOp
  | DataSourceAddMockScenarioOp
  | DataSourceUpdateMockScenarioOp
  | DataSourceRemoveMockScenarioOp
  | DataSourceSwitchMockScenarioOp;
