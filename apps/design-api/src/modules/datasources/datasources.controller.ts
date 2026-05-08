import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DatasourcesService } from './datasources.service';
import type { DataSource } from '@globallink/design-schema';

/**
 * DataSource REST（/datasources）—— v2 形态。
 *
 * 仅保留：
 *   - GET                     列表
 *   - GET   :dataSourceId     单个
 *   - POST                    新增（body: { dataSource: DataSource, author? }）
 *   - PUT   :dataSourceId     更新名称/描述
 *   - DELETE :dataSourceId    删除
 *
 * v1 的 `:dataSourceId/scenarios/*` 与 `:dataSourceId/phase` 已下架；
 * mock 场景管理改走 `dataSource.{addMockScenario,updateMockScenario,...}` op，
 * 由编辑器面板（D.3）/ MCP 工具（E.1）调 `/operations` 走通用 op 接口。
 */
@Controller('api/projects/:projectId/screens/:screenId/datasources')
export class DatasourcesController {
  constructor(private readonly datasources: DatasourcesService) {}

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
  ) {
    return this.datasources.listDataSources(projectId, screenId);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Body()
    body: { dataSource: DataSource; author?: string },
  ) {
    return this.datasources.addDataSource(
      projectId,
      screenId,
      body.dataSource,
      body.author,
    );
  }

  @Get(':dataSourceId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
  ) {
    return this.datasources.getDataSource(projectId, screenId, dataSourceId);
  }

  @Put(':dataSourceId')
  update(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Body() body: { name?: string; description?: string; author?: string },
  ) {
    const { author, ...patch } = body;
    return this.datasources.updateDataSource(
      projectId,
      screenId,
      dataSourceId,
      patch,
      author,
    );
  }

  @Delete(':dataSourceId')
  remove(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Body() body?: { author?: string },
  ) {
    return this.datasources.removeDataSource(
      projectId,
      screenId,
      dataSourceId,
      body?.author,
    );
  }
}
