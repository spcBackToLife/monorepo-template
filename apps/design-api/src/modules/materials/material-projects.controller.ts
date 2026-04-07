import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { MaterialProjectsService } from './material-projects.service';

/**
 * 素材编辑器工程文件 API
 *
 * POST   /api/projects/:projectId/material-projects        保存工程
 * GET    /api/projects/:projectId/material-projects/:id    获取工程
 * PUT    /api/projects/:projectId/material-projects/:id    更新工程
 * DELETE /api/projects/:projectId/material-projects/:id    删除工程
 */
@Controller('api/projects/:projectId/material-projects')
export class MaterialProjectsController {
  constructor(private readonly service: MaterialProjectsService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() body: {
      name: string;
      canvasWidth: number;
      canvasHeight: number;
      layers: unknown[];
      shadows?: unknown[];
      filters?: unknown[];
    },
  ) {
    return this.service.create(projectId, body);
  }

  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(projectId, id);
  }

  @Put(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      layers?: unknown[];
      shadows?: unknown[];
      filters?: unknown[];
    },
  ) {
    return this.service.update(projectId, id, body);
  }

  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(projectId, id);
  }
}
