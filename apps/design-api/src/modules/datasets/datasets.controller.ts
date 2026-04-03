import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DatasetsService } from './datasets.service';

/**
 * Task 3.5 — Datasets Controller
 *
 * Convenience REST endpoints for dataset CRUD.
 * These wrap the generic operation system for easier direct access.
 */
@Controller('api/projects/:projectId/screens/:screenId/datasets')
export class DatasetsController {
  constructor(private readonly datasets: DatasetsService) {}

  /** GET /api/projects/:projectId/screens/:screenId/datasets */
  @Get()
  list(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
  ) {
    return this.datasets.listDataSets(projectId, screenId);
  }

  /** GET /api/projects/:projectId/screens/:screenId/datasets/:dataSetId */
  @Get(':dataSetId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSetId') dataSetId: string,
  ) {
    return this.datasets.getDataSet(projectId, screenId, dataSetId);
  }

  /** POST /api/projects/:projectId/screens/:screenId/datasets */
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
    return this.datasets.addDataSet(projectId, screenId, body.dataSource, body.author);
  }

  /** POST /api/projects/:projectId/screens/:screenId/datasets/:dataSetId/update */
  @Post(':dataSetId/update')
  update(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSetId') dataSetId: string,
    @Body()
    body: {
      scenarioId: string;
      data?: Record<string, unknown>;
      name?: string;
      description?: string;
      author?: string;
    },
  ) {
    const { author, ...patch } = body;
    return this.datasets.updateDataSet(projectId, screenId, dataSetId, patch, author);
  }

  /** POST /api/projects/:projectId/screens/:screenId/datasets/:dataSetId/switch */
  @Post(':dataSetId/switch')
  switchActive(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSetId') dataSetId: string,
    @Body() body: { scenarioId: string; author?: string },
  ) {
    return this.datasets.switchDataSet(
      projectId,
      screenId,
      dataSetId,
      body.scenarioId,
      body.author,
    );
  }

  /** DELETE /api/projects/:projectId/screens/:screenId/datasets/:dataSetId */
  @Delete(':dataSetId')
  remove(
    @Param('projectId') projectId: string,
    @Param('screenId') screenId: string,
    @Param('dataSetId') dataSetId: string,
    @Body() body?: { author?: string },
  ) {
    return this.datasets.removeDataSet(projectId, screenId, dataSetId, body?.author);
  }
}
