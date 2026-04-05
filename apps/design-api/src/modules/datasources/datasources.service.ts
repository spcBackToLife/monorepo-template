import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';
import { OperationsService } from '../../operations/operations.service';
import type { Operation } from '@globallink/design-operations';
import { generateId } from '@globallink/design-schema';
import type { DataScenario, DataSource } from '@globallink/design-schema';

@Injectable()
export class DatasourcesService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly operations: OperationsService,
  ) {}

  async listDataSources(projectId: string, screenId: string): Promise<DataSource[]> {
    const project = await this.projects.findOne(projectId);
    const screen = project.screens.find((s) => s.id === screenId);
    return screen?.dataSources ?? [];
  }

  async getDataSource(
    projectId: string,
    screenId: string,
    dataSourceId: string,
  ): Promise<DataSource | null> {
    const list = await this.listDataSources(projectId, screenId);
    return list.find((ds) => ds.id === dataSourceId) ?? null;
  }

  async addDataSource(
    projectId: string,
    screenId: string,
    dataSource: {
      id: string;
      name: string;
      lifecycle: 'api' | 'static';
      description?: string;
    },
    author?: string,
  ) {
    const scenarioId = generateId();
    const op: Operation = {
      type: 'addDataSource',
      params: {
        screenId,
        dataSource: {
          ...dataSource,
          scenarios: [{ id: scenarioId, name: '默认', data: {}, isDefault: true }],
          activeScenarioId: scenarioId,
        },
      },
    };
    return this.operations.execute(projectId, op, author);
  }

  async updateDataSource(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    patch: { name?: string; description?: string },
    author?: string,
  ) {
    const op: Operation = {
      type: 'updateDataSource',
      params: { screenId, dataSourceId, ...patch },
    };
    return this.operations.execute(projectId, op, author);
  }

  async removeDataSource(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    author?: string,
  ) {
    const op: Operation = {
      type: 'removeDataSource',
      params: { screenId, dataSourceId },
    };
    return this.operations.execute(projectId, op, author);
  }

  async switchPhase(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    phase: string,
    author?: string,
  ) {
    const op: Operation = {
      type: 'switchDataSourcePhase',
      params: { screenId, dataSourceId, phase },
    };
    return this.operations.execute(projectId, op, author);
  }

  async listScenarios(
    projectId: string,
    screenId: string,
    dataSourceId: string,
  ): Promise<DataScenario[]> {
    const ds = await this.getDataSource(projectId, screenId, dataSourceId);
    return ds?.scenarios ?? [];
  }

  async getScenario(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    scenarioId: string,
  ): Promise<DataScenario | null> {
    const scenarios = await this.listScenarios(projectId, screenId, dataSourceId);
    return scenarios.find((s) => s.id === scenarioId) ?? null;
  }

  async addScenario(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    scenario: {
      id: string;
      name: string;
      data: Record<string, unknown>;
      description?: string;
      isDefault?: boolean;
    },
    author?: string,
  ) {
    const op: Operation = {
      type: 'addDataScenario',
      params: { screenId, dataSourceId, scenario },
    };
    return this.operations.execute(projectId, op, author);
  }

  async updateScenario(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    scenarioId: string,
    patch: {
      data?: Record<string, unknown>;
      name?: string;
      description?: string;
    },
    author?: string,
  ) {
    const op: Operation = {
      type: 'updateDataScenario',
      params: { screenId, dataSourceId, scenarioId, ...patch },
    };
    return this.operations.execute(projectId, op, author);
  }

  async removeScenario(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    scenarioId: string,
    author?: string,
  ) {
    const op: Operation = {
      type: 'removeDataScenario',
      params: { screenId, dataSourceId, scenarioId },
    };
    return this.operations.execute(projectId, op, author);
  }

  async switchScenario(
    projectId: string,
    screenId: string,
    dataSourceId: string,
    scenarioId: string,
    author?: string,
  ) {
    const op: Operation = {
      type: 'switchDataScenario',
      params: { screenId, dataSourceId, scenarioId },
    };
    return this.operations.execute(projectId, op, author);
  }
}
