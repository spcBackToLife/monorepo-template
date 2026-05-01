import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialProjectsService } from './material-projects.service';
import type { CanvasJSON } from '../../shared/types';

/**
 * 素材编辑器工程文件 API
 *
 * 素材工程 = 可编辑源文件（类似 PSD），保存在数据库中。
 * 导出的 PNG/SVG 等成品素材通过 StorageProvider 存储。
 *
 * POST   /api/projects/:projectId/material-projects                   创建工程
 * GET    /api/projects/:projectId/material-projects                   获取工程列表（摘要）
 * GET    /api/projects/:projectId/material-projects/:id               获取工程详情（含 canvasJSON）
 * GET    /api/projects/:projectId/material-projects/by-node/:nodeId   按关联节点查找工程
 * PUT    /api/projects/:projectId/material-projects/:id               更新工程
 * DELETE /api/projects/:projectId/material-projects/:id               删除工程
 * POST   /api/projects/:projectId/material-projects/:id/export        上传导出素材
 * POST   /api/projects/:projectId/material-projects/:id/thumbnail     上传缩略图
 */
@Controller('api/projects/:projectId/material-projects')
export class MaterialProjectsController {
  constructor(private readonly service: MaterialProjectsService) {}

  /** 创建工程 */
  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() body: {
      name: string;
      targetNodeId?: string;
      canvasWidth: number;
      canvasHeight: number;
      canvasJSON: CanvasJSON;
      backgroundColor?: string;
      referenceFrameWidth?: number;
      referenceFrameHeight?: number;
      tags?: string[];
    },
  ) {
    return this.service.create(projectId, body);
  }

  /** 获取工程列表（摘要，不含 canvasJSON） */
  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Query('targetNodeId') targetNodeId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(projectId, { targetNodeId, search });
  }

  /** 按关联节点查找工程（返回最近一个，向后兼容） */
  @Get('by-node/:nodeId')
  async findByNode(
    @Param('projectId') projectId: string,
    @Param('nodeId') nodeId: string,
  ) {
    const record = await this.service.findByTargetNode(projectId, nodeId);
    return record ?? { found: false };
  }

  /** 按关联节点查找所有工程（一对多） */
  @Get('all-by-node/:nodeId')
  async findAllByNode(
    @Param('projectId') projectId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.service.findAllByTargetNode(projectId, nodeId);
  }

  /** 获取工程详情（含完整 canvasJSON） */
  @Get(':id')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(projectId, id);
  }

  /** 更新工程 */
  @Put(':id')
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      targetNodeId?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      canvasJSON?: CanvasJSON;
      backgroundColor?: string;
      referenceFrameWidth?: number;
      referenceFrameHeight?: number;
      thumbnailUrl?: string;
      exportedMaterialId?: string;
      tags?: string[];
    },
  ) {
    return this.service.update(projectId, id, body);
  }

  /** 删除工程 */
  @Delete(':id')
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(projectId, id);
  }

  /**
   * 上传导出的素材文件（PNG/SVG/WebP）
   *
   * 将素材编辑器导出的成品文件上传到后端存储。
   * 当前阶段存储在本地 uploads/ 目录，后续迁移 S3 只需切换 StorageProvider。
   */
  @Post(':id/export')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExport(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }
    return this.service.uploadExportedAsset(projectId, id, file.buffer, {
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }

  /**
   * 上传缩略图
   */
  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('file'))
  async uploadThumbnail(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }
    const url = await this.service.uploadThumbnail(projectId, id, file.buffer);
    return { thumbnailUrl: url };
  }
}
