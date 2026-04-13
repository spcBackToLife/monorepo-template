import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { MaterialSlotsService } from './material-slots.service';

/**
 * 素材槽位 API — 管理节点与素材工程的多对多关联
 *
 * POST   /api/projects/:projectId/material-slots                       创建槽位
 * GET    /api/projects/:projectId/material-slots/by-node/:nodeId       查询节点的所有槽位
 * GET    /api/projects/:projectId/material-slots/by-node/:nodeId/:slotName  查询节点指定槽位
 * PUT    /api/projects/:projectId/material-slots/:slotId               更新槽位
 * DELETE /api/projects/:projectId/material-slots/:slotId               删除槽位
 */
@Controller('api/projects/:projectId/material-slots')
export class MaterialSlotsController {
  constructor(private readonly service: MaterialSlotsService) {}

  /** 创建槽位 */
  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() body: {
      nodeId: string;
      slotName?: string;
      materialProjectId: string;
      sortOrder?: number;
      cssTarget?: string;
      isActive?: boolean;
    },
  ) {
    return this.service.create(projectId, body);
  }

  /** 查询节点的所有槽位（含素材工程摘要） */
  @Get('by-node/:nodeId')
  async findByNode(
    @Param('projectId') projectId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.service.findByNode(projectId, nodeId);
  }

  /** 查询节点指定槽位 */
  @Get('by-node/:nodeId/:slotName')
  async findSlot(
    @Param('projectId') projectId: string,
    @Param('nodeId') nodeId: string,
    @Param('slotName') slotName: string,
  ) {
    const slot = await this.service.findSlot(projectId, nodeId, slotName);
    return slot ?? { found: false };
  }

  /** 更新槽位 */
  @Put(':slotId')
  async update(
    @Param('projectId') projectId: string,
    @Param('slotId') slotId: string,
    @Body() body: {
      slotName?: string;
      materialProjectId?: string;
      sortOrder?: number;
      cssTarget?: string;
      isActive?: boolean;
    },
  ) {
    return this.service.update(projectId, slotId, body);
  }

  /** 删除槽位 */
  @Delete(':slotId')
  async remove(
    @Param('projectId') projectId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.service.remove(projectId, slotId);
  }
}
