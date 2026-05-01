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
import type { DataPayload } from '../../shared/types';

/**
 * Phase 6 — DataSource REST（/datasources），内部仍走 Operation 持久化。
 */
@Controller('api/projects/:projectId/screens/:screenId/datasources')
export class DatasourcesController {
  constructor(private readonly datasources: DatasourcesService) {}

  // --- 子资源：必须先于 :dataSourceId 单段路由注册 ---

  @Get(':dataSourceId/scenarios')
  listScenarios(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
  ) {
    return this.datasources.listScenarios(projectId, screenId, dataSourceId);
  }

  @Post(':dataSourceId/scenarios')
  addScenario(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Body()
    body: {
      scenario: {
        id: string;
        name: string;
        data: DataPayload;
        description?: string;
        isDefault?: boolean;
      };
      author?: string;
    },
  ) {
    return this.datasources.addScenario(
      projectId,
      screenId,
      dataSourceId,
      body.scenario,
      body.author,
    );
  }

  @Get(':dataSourceId/scenarios/:scenarioId')
  getScenario(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.datasources.getScenario(projectId, screenId, dataSourceId, scenarioId);
  }

  @Put(':dataSourceId/scenarios/:scenarioId')
  putScenario(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body()
    body: {
      data?: DataPayload;
      name?: string;
      description?: string;
      author?: string;
    },
  ) {
    const { author, ...patch } = body;
    return this.datasources.updateScenario(
      projectId,
      screenId,
      dataSourceId,
      scenarioId,
      patch,
      author,
    );
  }

  @Delete(':dataSourceId/scenarios/:scenarioId')
  removeScenario(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() body?: { author?: string },
  ) {
    return this.datasources.removeScenario(
      projectId,
      screenId,
      dataSourceId,
      scenarioId,
      body?.author,
    );
  }

  @Post(':dataSourceId/scenarios/:scenarioId/switch')
  switchScenario(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Param('scenarioId') scenarioId: string,
    @Body() body?: { author?: string },
  ) {
    return this.datasources.switchScenario(
      projectId,
      screenId,
      dataSourceId,
      scenarioId,
      body?.author,
    );
  }

  @Post(':dataSourceId/phase')
  switchPhase(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSourceId') dataSourceId: string,
    @Body() body: { phase: string; author?: string },
  ) {
    return this.datasources.switchPhase(
      projectId,
      screenId,
      dataSourceId,
      body.phase,
      body.author,
    );
  }

  // --- 数据源 CRUD ---

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
    body: {
      dataSource: {
        id: string;
        name: string;
        lifecycle: 'api' | 'static';
        description?: string;
      };
      author?: string;
    },
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
    @Body()
    body: {
      name?: string;
      description?: string;
      author?: string;
    },
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
