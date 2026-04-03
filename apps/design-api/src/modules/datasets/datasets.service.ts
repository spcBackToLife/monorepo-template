import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';
import { OperationsService } from '../../operations/operations.service';
import type { Operation } from '@globallink/design-operations';
import type { DataSource } from '@globallink/design-schema';

/**
 * Task 3.5 — Datasets Service
 *
 * Convenience service that wraps dataset operations.
 * All mutations go through the Operation system for history/undo support.
 */
@Injectable()
export class DatasetsService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly operations: OperationsService,
  ) {}

  /** List datasets for a specific screen */
  async listDataSets(
    projectId: string,
    screenId: string,
  ): Promise<DataSource[]> {
    const project = await this.projects.findOne(projectId);
    const screen = project.screens.find((s) => s.id === screenId);
    return screen?.dataSources ?? [];
  }

  /** Get a specific dataset */
  async getDataSet(
    projectId: string,
    screenId: string,
    dataSetId: string,
  ): Promise<DataSource | null> {
    const dataSets = await this.listDataSets(projectId, screenId);
    return dataSets.find((ds) => ds.id === dataSetId) ?? null;
  }

  /** Add a dataset (via operation) */
  async addDataSet(
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
    const op: Operation = {
      type: 'addDataSource',
      params: { screenId, dataSource },
    };
    return this.operations.execute(projectId, op, author);
  }

  /** Update a dataset's data and/or name/description (via operation) */
  async updateDataSet(
    projectId: string,
    screenId: string,
    dataSetId: string,
    patch: {
      scenarioId: string;
      data?: Record<string, unknown>;
      name?: string;
      description?: string;
    },
    author?: string,
  ) {
    const { scenarioId, ...rest } = patch;
    const op: Operation = {
      type: 'updateDataScenario',
      params: {
        screenId,
        dataSourceId: dataSetId,
        scenarioId,
        ...rest,
      },
    };
    return this.operations.execute(projectId, op, author);
  }

  /** Remove a dataset (via operation) */
  async removeDataSet(
    projectId: string,
    screenId: string,
    dataSetId: string,
    author?: string,
  ) {
    const op: Operation = {
      type: 'removeDataSource',
      params: { screenId, dataSourceId: dataSetId },
    };
    return this.operations.execute(projectId, op, author);
  }

  /** Switch active dataset (via operation) */
  async switchDataSet(
    projectId: string,
    screenId: string,
    dataSetId: string,
    scenarioId: string,
    author?: string,
  ) {
    const op: Operation = {
      type: 'switchDataScenario',
      params: {
        screenId,
        dataSourceId: dataSetId,
        scenarioId,
      },
    };
    return this.operations.execute(projectId, op, author);
  }
}
