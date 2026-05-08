import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';
import { OperationsService } from '../../operations/operations.service';
import type { Operation } from '@globallink/design-operations';
import type { DataSource } from '@globallink/design-schema';

/**
 * DataSource REST 适配层 —— v2 形态。
 *
 * 仅保留 list/get 纯查询路由，写入路径全部走 op（v2 dot-namespace 动词）。
 * v1 阶段的 `scenarios` / `phase` 系列接口已删除（参见 RFC §4.2）；
 * 编辑器面板将在 D.3 阶段重写为 mock + endpoint 共存模型。
 */
@Injectable()
export class DatasourcesService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly operations: OperationsService,
  ) {}

  // ===== 查询 =====

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

  // ===== 写入（走 v2 op）=====

  async addDataSource(
    projectId: string,
    screenId: string,
    dataSource: DataSource,
    author?: string,
  ) {
    const op: Operation = {
      type: 'dataSource.add',
      params: { screenId, dataSource },
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
      type: 'dataSource.update',
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
      type: 'dataSource.remove',
      params: { screenId, dataSourceId },
    };
    return this.operations.execute(projectId, op, author);
  }
}
